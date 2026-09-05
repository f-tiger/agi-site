#!/usr/bin/env python3
"""
Personal mirror executor v2: make ONE Alpaca account (paper by default) look like
one arm of the public paper ledger at today's close. Owner-only; nothing here is
a product, a signal, or advice for anyone else.

Reads   : sites/agiscorecard/paper-ledger.json  (arms[ARM].target — public rule output)
Talks to: Alpaca Trading API (paper-api.alpaca.markets unless TRADER_LIVE=1)
          Alpaca Data API (IEX latest trades, for whole-share sizing)
          Telegram Bot API (optional private report; the ONLY place numbers go)
Prints  : counts and status ONLY. Never balances, never positions, never dollar
          amounts — GitHub Actions logs on a public repo are public.

Execution model (from the 2026-09-05 research brief):
  * whole shares go as market-on-close (`time_in_force=cls`) so the fill is the
    official close the paper ledger also uses; Alpaca rejects `cls` 15:50–19:00 ET
  * the fractional remainder goes as a notional `day` market order (the only
    form Alpaca allows for fractions)
  * GitHub cron can slip 15–60 min → four staggered crons + idempotency keyed
    on "orders already submitted today" (read from Alpaca, no repo state)
  * too late for `cls` (≤ 10 min to close) → skip and exit 1 (red = alert)

Guards (all pre-registered, see tools/trader/README.md):
  * TRADER_MAX_NOTIONAL  (default 1000) — never deploy more than this many USD
  * 2 % cash buffer so whole-share rounding never overdraws
  * kill line            — mirrored arm's paper max drawdown <= -10 %, or a file
                           tools/trader/KILLED exists: liquidate to cash, exit 1
  * stale ledger         — target older than 3 sessions, or the arm's symbols in
                           the ledger's fetch_errors: do nothing, exit 1
  * loop detector        — more than 30 orders planned: refuse, exit 1
  * dry-run              — TRADER_DRY_RUN=1 or --dry-run: compute, submit nothing
"""

from __future__ import annotations

import argparse
import json
import math
import os
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[2]
LEDGER = ROOT / "sites" / "agiscorecard" / "paper-ledger.json"
KILLED = Path(__file__).resolve().parent / "KILLED"

ARMS = {"spy_hold", "qqq_hold", "sixty_forty", "agi_basket", "tracker_mix", "sma200_spy", "llm_agent",
        "gem_dual_momentum", "gtaa5", "spy_voltarget", "basket_mom5"}
KILL_DD_PCT = -10.0
MIN_TRADE_USD = 5.0
BAND = 0.01            # ignore drifts smaller than 1 % of the deployed base
CASH_BUFFER = 0.02     # keep 2 % of the base in cash
MAX_ORDERS = 30        # loop detector
CLS_CUTOFF_MIN = 10    # Alpaca rejects `cls` from 15:50 ET; stop at 10 min to close


def env(name: str, default: str = "") -> str:
    return (os.getenv(name) or default).strip()


class Alpaca:
    def __init__(self, key: str, secret: str, live: bool, base_override: str = "", data_override: str = ""):
        self.base = base_override or ("https://api.alpaca.markets" if live else "https://paper-api.alpaca.markets")
        self.data = data_override or "https://data.alpaca.markets"
        self.h = {"APCA-API-KEY-ID": key, "APCA-API-SECRET-KEY": secret, "Content-Type": "application/json"}

    def _req(self, method: str, url: str, **kw):
        r = requests.request(method, url, headers=self.h, timeout=30, **kw)
        if r.status_code >= 400:
            raise RuntimeError(f"alpaca {method} {url.split('/v2/')[-1][:40]} -> HTTP {r.status_code}")
        return r.json() if r.text else {}

    def clock(self) -> dict:
        return self._req("GET", self.base + "/v2/clock")

    def account(self) -> dict:
        return self._req("GET", self.base + "/v2/account")

    def positions(self) -> list:
        return self._req("GET", self.base + "/v2/positions")

    def orders_today(self) -> list:
        after = datetime.now(timezone.utc).date().isoformat() + "T00:00:00Z"
        return self._req("GET", self.base + "/v2/orders", params={"status": "all", "after": after, "limit": 200})

    def latest_prices(self, symbols: list) -> dict:
        if not symbols:
            return {}
        j = self._req("GET", self.data + "/v2/stocks/trades/latest",
                      params={"symbols": ",".join(symbols), "feed": "iex"})
        return {s: float(t["p"]) for s, t in (j.get("trades") or {}).items() if t and t.get("p")}

    def close_position(self, symbol: str) -> dict:
        return self._req("DELETE", self.base + f"/v2/positions/{symbol}")

    def close_all(self) -> None:
        self._req("DELETE", self.base + "/v2/positions", params={"cancel_orders": "true"})

    def order(self, body: dict) -> dict:
        return self._req("POST", self.base + "/v2/orders", data=json.dumps(body))

    def order_qty_cls(self, symbol: str, qty: int, side: str) -> dict:
        return self.order({"symbol": symbol, "qty": str(qty), "side": side, "type": "market", "time_in_force": "cls"})

    def order_qty_day(self, symbol: str, qty: int, side: str) -> dict:
        return self.order({"symbol": symbol, "qty": str(qty), "side": side, "type": "market", "time_in_force": "day"})

    def order_notional_day(self, symbol: str, notional: float, side: str) -> dict:
        return self.order({"symbol": symbol, "notional": f"{abs(notional):.2f}", "side": side,
                           "type": "market", "time_in_force": "day"})


def minutes_to_close(clock: dict) -> float:
    nc = datetime.fromisoformat(clock["next_close"].replace("Z", "+00:00"))
    return (nc - datetime.now(timezone.utc)).total_seconds() / 60.0


def sessions_between(a: str, b: str) -> int:
    x, y = date.fromisoformat(a), date.fromisoformat(b)
    n = 0
    while x < y:
        x += timedelta(days=1)
        if x.weekday() < 5:
            n += 1
    return n


def plan(targets: dict, positions: list, equity: float, cap: float, prices: dict):
    """Return list of legs {symbol, delta_usd, qty, frac_usd, full_exit}. No amounts are ever logged."""
    base = min(equity, cap) * (1.0 - CASH_BUFFER)
    have = {p["symbol"]: float(p["market_value"]) for p in positions}
    want = {s: base * w for s, w in targets.items() if w > 0}
    legs = []
    for s in sorted(set(have) | set(want)):
        diff = want.get(s, 0.0) - have.get(s, 0.0)
        if abs(diff) < max(MIN_TRADE_USD, BAND * base):
            continue
        px = prices.get(s)
        if not px or px <= 0:
            continue
        full_exit = diff < 0 and want.get(s, 0.0) == 0.0
        qty = int(math.floor(abs(diff) / px))
        frac = abs(diff) - qty * px
        legs.append({"symbol": s, "delta_usd": diff, "qty": qty, "frac_usd": frac, "full_exit": full_exit})
    return legs, base


def telegram(text: str) -> None:
    tok, chat = env("TRADER_TG_TOKEN"), env("TRADER_TG_CHAT")
    if not tok or not chat:
        return
    try:
        requests.post(f"https://api.telegram.org/bot{tok}/sendMessage",
                      json={"chat_id": chat, "text": text[:4000]}, timeout=20)
    except Exception:
        pass


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--force", action="store_true", help="ignore the market-clock window and idempotency (paper tests)")
    args = ap.parse_args()
    dry = args.dry_run or env("TRADER_DRY_RUN") == "1"

    key, secret = env("ALPACA_KEY_ID"), env("ALPACA_SECRET_KEY")
    if not key or not secret:
        print("no ALPACA keys — executor idle", file=sys.stderr)
        return 2
    arm = env("TRADER_ARM", "gtaa5")
    if arm not in ARMS:
        print(f"unknown TRADER_ARM {arm}", file=sys.stderr)
        return 2
    live = env("TRADER_LIVE") == "1"
    cap = float(env("TRADER_MAX_NOTIONAL", "1000"))
    api = Alpaca(key, secret, live, env("ALPACA_BASE_URL"), env("ALPACA_DATA_URL"))
    mode = "LIVE" if live else "paper"

    L = json.loads(LEDGER.read_text(encoding="utf-8"))
    A = (L.get("arms") or {}).get(arm) or {}
    tgt = A.get("target") or {}
    today = datetime.now(timezone.utc).date().isoformat()

    # ---- kill line (public metric only)
    dd = (A.get("metrics") or {}).get("max_drawdown_pct")
    if KILLED.exists() or (dd is not None and dd <= KILL_DD_PCT):
        why = "file" if KILLED.exists() else "paper drawdown line"
        print(f"KILL: arm={arm} reason={why} -> liquidating")
        if not dry:
            api.close_all()
        telegram(f"[trader {mode}] KILL {arm}: {why}. All positions liquidated.")
        return 1

    if tgt.get("action") in (None, "wait") or not tgt.get("as_of"):
        print(f"arm={arm} status={A.get('status')} action=wait — nothing to mirror yet")
        return 0
    if sessions_between(tgt["as_of"], today) > 3:
        print(f"STALE ledger: target as_of={tgt['as_of']} today={today} — refusing to trade")
        telegram(f"[trader {mode}] stale ledger ({tgt['as_of']}), no trades.")
        return 1
    bad = set((L.get("fetch_errors") or {}).keys()) & set((tgt.get("weights") or {}).keys())
    if bad:
        print(f"ledger fetch_errors touch {len(bad)} target symbol(s) — refusing to trade")
        return 1

    # ---- market window & idempotency
    use_cls = True
    if not args.force:
        c = api.clock()
        if not c.get("is_open"):
            print("market closed — no action")
            return 0
        mtc = minutes_to_close(c)
        if mtc > 75:
            print(f"{mtc:.0f} min to close — too early, waiting for a later cron")
            return 0
        if mtc <= CLS_CUTOFF_MIN:
            print(f"{mtc:.0f} min to close — too late for market-on-close; skipped")
            telegram(f"[trader {mode}] cron arrived too late ({mtc:.0f} min to close); no trades today.")
            return 1
        done = [o for o in api.orders_today() if o.get("status") not in ("canceled", "rejected", "expired")]
        if done:
            print(f"already submitted {len(done)} order(s) today — idempotent no-op")
            return 0

    acct = api.account()
    equity = float(acct["equity"])
    positions = api.positions()
    symbols = sorted(set(tgt.get("weights") or {}) | {p["symbol"] for p in positions})
    prices = api.latest_prices(symbols)
    legs, base = plan(tgt.get("weights") or {}, positions, equity, cap, prices)
    sells = [l for l in legs if l["delta_usd"] < 0]
    buys = [l for l in legs if l["delta_usd"] > 0]
    n_target = len([w for w in (tgt.get("weights") or {}).values() if w > 0])
    print(f"arm={arm} mode={mode} action={tgt.get('action')} symbols_target={n_target} "
          f"positions={len(positions)} sells={len(sells)} buys={len(buys)} dry_run={dry} cls={use_cls}")
    if len(legs) > MAX_ORDERS:
        print("loop detector: too many orders planned — refusing")
        return 1
    if dry:
        return 0

    ok = err = 0
    for l in sells:
        try:
            if l["full_exit"]:
                api.close_position(l["symbol"])          # liquidates fractional too
            else:
                if l["qty"] >= 1:
                    (api.order_qty_cls if use_cls else api.order_qty_day)(l["symbol"], l["qty"], "sell")
                if l["frac_usd"] >= MIN_TRADE_USD:
                    api.order_notional_day(l["symbol"], l["frac_usd"], "sell")
            ok += 1
        except Exception as e:
            err += 1
            print(f"order error ({type(e).__name__}) on sell")
    for l in buys:
        try:
            if l["qty"] >= 1:
                (api.order_qty_cls if use_cls else api.order_qty_day)(l["symbol"], l["qty"], "buy")
            if l["frac_usd"] >= MIN_TRADE_USD:
                api.order_notional_day(l["symbol"], l["frac_usd"], "buy")
            ok += 1
        except Exception as e:
            err += 1
            print(f"order error ({type(e).__name__}) on buy")
    print(f"submitted={ok} errors={err}")

    # ---- private report (numbers go here and nowhere else)
    try:
        pnl_day = equity - float(acct.get("last_equity") or equity)
        pos_txt = ", ".join(f"{p['symbol']} {100*float(p['market_value'])/max(equity,1):.0f}%" for p in positions) or "cash"
        telegram(f"[trader {mode}] {today} arm={arm} action={tgt.get('action')}\n"
                 f"equity ${equity:,.0f} (day {pnl_day:+,.0f}) · base ${base:,.0f}\n"
                 f"before: {pos_txt}\norders: {ok} ok / {err} err")
    except Exception:
        pass
    return 1 if err and not ok else 0


if __name__ == "__main__":
    sys.exit(main())
