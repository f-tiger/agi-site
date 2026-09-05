#!/usr/bin/env python3
"""
Personal mirror executor: make ONE Alpaca account (paper by default) look like one
arm of the public paper ledger at today's close. Owner-only; nothing here is a
product, a signal, or advice for anyone else.

Reads   : sites/agiscorecard/paper-ledger.json  (arms[ARM].target — public rule output)
Talks to: Alpaca Trading API (paper-api.alpaca.markets unless TRADER_LIVE=1)
Prints  : counts and status ONLY. Never balances, never positions, never dollar
          amounts — GitHub Actions logs on a public repo are public.

Guards (all pre-registered, see tools/trader/README.md):
  * TRADER_MAX_NOTIONAL  (default 1000) — never deploy more than this many USD
  * kill line            — if the mirrored arm's paper max drawdown <= -10 %, or a
                           file tools/trader/KILLED exists: liquidate to cash, exit 1
  * stale ledger         — target older than 3 sessions: do nothing, exit 1
  * market clock         — trade only while the market is open and within
                           TRADER_WINDOW_MIN (default 45) minutes of the close
  * dry-run              — TRADER_DRY_RUN=1 or --dry-run: compute, submit nothing
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[2]
LEDGER = ROOT / "sites" / "agiscorecard" / "paper-ledger.json"
KILLED = Path(__file__).resolve().parent / "KILLED"

ARMS = {"spy_hold", "qqq_hold", "agi_basket", "tracker_mix", "sma200_spy", "llm_agent"}
KILL_DD_PCT = -10.0
MIN_TRADE_USD = 5.0
BAND = 0.01           # ignore drifts smaller than 1 % of the deployed base


def env(name: str, default: str = "") -> str:
    return (os.getenv(name) or default).strip()


class Alpaca:
    def __init__(self, key: str, secret: str, live: bool, base_override: str = ""):
        self.base = base_override or ("https://api.alpaca.markets" if live else "https://paper-api.alpaca.markets")
        self.h = {"APCA-API-KEY-ID": key, "APCA-API-SECRET-KEY": secret, "Content-Type": "application/json"}

    def _req(self, method: str, path: str, **kw):
        r = requests.request(method, self.base + path, headers=self.h, timeout=30, **kw)
        if r.status_code >= 400:
            raise RuntimeError(f"alpaca {method} {path} -> HTTP {r.status_code}")
        return r.json() if r.text else {}

    def clock(self) -> dict:
        return self._req("GET", "/v2/clock")

    def account(self) -> dict:
        return self._req("GET", "/v2/account")

    def positions(self) -> list:
        return self._req("GET", "/v2/positions")

    def close_position(self, symbol: str) -> dict:
        return self._req("DELETE", f"/v2/positions/{symbol}")

    def close_all(self) -> None:
        self._req("DELETE", "/v2/positions", params={"cancel_orders": "true"})

    def order_notional(self, symbol: str, notional: float, side: str) -> dict:
        body = {"symbol": symbol, "notional": f"{abs(notional):.2f}", "side": side,
                "type": "market", "time_in_force": "day"}
        return self._req("POST", "/v2/orders", data=json.dumps(body))


def minutes_to_close(clock: dict) -> float:
    nc = datetime.fromisoformat(clock["next_close"].replace("Z", "+00:00"))
    return (nc - datetime.now(timezone.utc)).total_seconds() / 60.0


def sessions_between(a: str, b: str) -> int:
    """Weekday count between two ISO dates (stale-ledger guard)."""
    x, y = date.fromisoformat(a), date.fromisoformat(b)
    n = 0
    while x < y:
        x += timedelta(days=1)
        if x.weekday() < 5:
            n += 1
    return n


def plan(targets: dict, positions: list, equity: float, cap: float):
    """Return (sells, buys, base). Callers never log the amounts."""
    base = min(equity, cap)
    have = {p["symbol"]: float(p["market_value"]) for p in positions}
    want = {s: base * w for s, w in targets.items() if w > 0}
    sells, buys = [], []
    for s in set(have) | set(want):
        diff = want.get(s, 0.0) - have.get(s, 0.0)
        if abs(diff) < max(MIN_TRADE_USD, BAND * base):
            continue
        (buys if diff > 0 else sells).append((s, diff))
    return sells, buys, base


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--force", action="store_true", help="ignore the market-clock window (paper tests)")
    args = ap.parse_args()
    dry = args.dry_run or env("TRADER_DRY_RUN") == "1"

    key, secret = env("ALPACA_KEY_ID"), env("ALPACA_SECRET_KEY")
    if not key or not secret:
        print("no ALPACA keys — executor idle", file=sys.stderr)
        return 2
    arm = env("TRADER_ARM", "sma200_spy")
    if arm not in ARMS:
        print(f"unknown TRADER_ARM {arm}", file=sys.stderr)
        return 2
    live = env("TRADER_LIVE") == "1"
    cap = float(env("TRADER_MAX_NOTIONAL", "1000"))
    window = float(env("TRADER_WINDOW_MIN", "45"))
    api = Alpaca(key, secret, live, env("ALPACA_BASE_URL"))

    L = json.loads(LEDGER.read_text(encoding="utf-8"))
    A = (L.get("arms") or {}).get(arm) or {}
    tgt = A.get("target") or {}
    today = datetime.now(timezone.utc).date().isoformat()

    # ---- kill line (public metric only)
    dd = (A.get("metrics") or {}).get("max_drawdown_pct")
    if KILLED.exists() or (dd is not None and dd <= KILL_DD_PCT):
        print(f"KILL: arm={arm} reason={'file' if KILLED.exists() else 'paper drawdown line'} -> liquidating")
        if not dry:
            api.close_all()
        return 1

    if tgt.get("action") in (None, "wait") or not tgt.get("as_of"):
        print(f"arm={arm} status={A.get('status')} action=wait — nothing to mirror yet")
        return 0
    if sessions_between(tgt["as_of"], today) > 3:
        print(f"STALE ledger: target as_of={tgt['as_of']} today={today} — refusing to trade")
        return 1

    # ---- market window
    if not args.force:
        c = api.clock()
        if not c.get("is_open"):
            print("market closed — no action")
            return 0
        mtc = minutes_to_close(c)
        if mtc > window:
            print(f"{mtc:.0f} min to close > window {window:.0f} — not yet")
            return 0

    acct = api.account()
    equity = float(acct["equity"])
    positions = api.positions()
    sells, buys, base = plan(tgt.get("weights") or {}, positions, equity, cap)
    n_target = len([w for w in (tgt.get("weights") or {}).values() if w > 0])
    print(f"arm={arm} mode={'LIVE' if live else 'paper'} action={tgt.get('action')} "
          f"symbols_target={n_target} positions={len(positions)} sells={len(sells)} buys={len(buys)} dry_run={dry}")
    if dry:
        return 0
    ok = err = 0
    for s, d in sells:
        try:
            have = next((float(p["market_value"]) for p in positions if p["symbol"] == s), 0.0)
            if -d >= have * 0.98:
                api.close_position(s)
            else:
                api.order_notional(s, d, "sell")
            ok += 1
        except Exception as e:
            err += 1
            print(f"order error ({type(e).__name__}) on sell")
    for s, d in buys:
        try:
            api.order_notional(s, d, "buy")
            ok += 1
        except Exception as e:
            err += 1
            print(f"order error ({type(e).__name__}) on buy")
    print(f"submitted={ok} errors={err}")
    return 1 if err and not ok else 0


if __name__ == "__main__":
    sys.exit(main())
