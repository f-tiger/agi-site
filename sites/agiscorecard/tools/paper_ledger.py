#!/usr/bin/env python3
"""
Pre-registered paper-trading ledger — the live evidence /do-ai-trading-agents-work
demands of vendors, produced by the site itself. Zero AI session in the loop.

Runs on the GitHub runner (the sandbox cannot reach query1.finance.yahoo.com):
fetch adjusted daily closes, recompute every arm deterministically from START,
write sites/agiscorecard/paper-ledger.json. Never fabricates: a ticker whose fetch
fails keeps its last-good cached series and is flagged; a run with no usable
prices at all exits non-zero (red run = the alarm).

Arms (all long-only, notional $10,000 paper, 5 bp cost per side, dividends via
adjusted close; signals computed at close T, executed at close T+1):
  spy_hold      SPY buy-and-hold                      (benchmark)
  qqq_hold      QQQ buy-and-hold                      (secondary benchmark)
  agi_basket    10 AI-exposed names from /ai-stock-exposure presets, equal weight,
                rebalanced first trading day of each month
  tracker_mix   w = Thesis-Tracker score/100 in the basket, (1-w) in SPY, monthly
  sma200_spy    Faber (2007) monthly trend rule: SPY if close > 200-day SMA else cash
  llm_agent     weekly LLM allocation (gated on LEDGER_LLM_KEY; otherwise not_started)

Nothing here is investment advice, sells a signal, or touches real money.
"""

from __future__ import annotations

import argparse
import json
import math
import os
import sys
import time
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
SITE = HERE.parent
LEDGER_PATH = SITE / "paper-ledger.json"
INDEX_HISTORY = SITE / "index-history.json"
LLMS_TXT = SITE / "llms.txt"

START = "2026-09-08"           # first trading day on/after this date; pre-registered
NOTIONAL = 10_000.0
COST_BPS = 5                   # per side, applied on traded notional
BASKET = ["NVDA", "AMD", "TSM", "AVGO", "MU", "MSFT", "GOOGL", "AMZN", "AAPL", "META"]
BENCH = ["SPY", "QQQ"]
# Multi-asset ETF universe for the published allocation rules (added 2026-09-05, before START):
# VEU ex-US equity · AGG US aggregate bonds · IEF 7-10y Treasuries · VNQ REITs · DBC commodities · BIL T-bills
ETFS = ["VEU", "AGG", "IEF", "VNQ", "DBC", "BIL"]
TICKERS = BENCH + BASKET + ETFS
LOOKBACK_DAYS = 430            # 12-1 momentum needs ~273 sessions; SMA200; LLM 60-day window
MONTHLY_ARMS = ("gem_dual_momentum", "gtaa5", "spy_voltarget", "basket_mom5", "sixty_forty")
ARM_ORDER = ["spy_hold", "qqq_hold", "sixty_forty", "agi_basket", "tracker_mix", "sma200_spy", "llm_agent",
             "gem_dual_momentum", "gtaa5", "spy_voltarget", "basket_mom5"]
UA = {"User-Agent": "AGI Scorecard paper-ledger (https://agiscorecard.com/ai-trading-ledger)"}
# NYSE full-day closures (2026-09 → 2027-12). Used only to name the next session for
# the published target; a wrong entry costs one early/late rebalance, never money.
NYSE_HOLIDAYS = {
    "2026-11-26", "2026-12-25",
    "2027-01-01", "2027-01-18", "2027-02-15", "2027-03-26", "2027-05-31", "2027-06-18",
    "2027-07-05", "2027-09-06", "2027-11-25", "2027-12-24",
}



def unlever(weights: dict) -> dict:
    """Guarantee sum(weights) <= 1.0 after per-ticker rounding.

    2026-09-11 run went red on `agi_basket: levered target`: cur_w is normalised to
    <= 1.0 *before* rounding, then ten weights are each rounded to 4 dp, and ten
    round-ups add back as much as +0.0005 — more than the 1.0001 the self-check (and
    the mirror executor) tolerate. It passed again on 09-12 by luck of the rounding,
    so it was latent, not fixed. Shave the excess off the largest weight so the dict
    still carries 4 dp and sums to exactly <= 1.0. This is a producer-side fix for a
    float artefact; the executor keeps its own refusal as a second line, on purpose.
    """
    w = {k: round(float(v), 4) for k, v in (weights or {}).items()}
    excess = round(sum(w.values()) - 1.0, 4)
    if excess > 0 and w:
        big = max(w, key=w.get)
        w[big] = round(w[big] - excess, 4)
    return w

def next_session(d: str) -> str:
    x = date.fromisoformat(d)
    while True:
        x += timedelta(days=1)
        if x.weekday() < 5 and x.isoformat() not in NYSE_HOLIDAYS:
            return x.isoformat()


# --------------------------------------------------------------------------- data
def fetch_yahoo(ticker: str) -> dict[str, float]:
    """Adjusted closes keyed by ISO date. Raises on any failure."""
    import requests

    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?range=2y&interval=1d"
    r = requests.get(url, headers=UA, timeout=20)
    r.raise_for_status()
    res = r.json()["chart"]["result"][0]
    ts = res["timestamp"]
    ind = res["indicators"]
    adj = (ind.get("adjclose") or [{}])[0].get("adjclose")
    close = ind["quote"][0]["close"]
    series = adj if adj and any(v is not None for v in adj) else close
    out = {}
    for t, v in zip(ts, series):
        if v is None:
            continue
        d = datetime.fromtimestamp(t, tz=timezone.utc).date().isoformat()
        out[d] = round(float(v), 6)
    if len(out) < 250:
        raise RuntimeError(f"{ticker}: only {len(out)} rows")
    return out


def fetch_stooq(ticker: str) -> dict[str, float]:
    """Fallback: Stooq daily CSV (close, not adjusted). Rejects HTML/JS-check pages."""
    import requests

    url = f"https://stooq.com/q/d/l/?s={ticker.lower()}.us&i=d"
    r = requests.get(url, headers=UA, timeout=20)
    r.raise_for_status()
    body = r.text.strip()
    if not body.startswith("Date,") or "<html" in body[:200].lower():
        raise RuntimeError(f"{ticker}: stooq returned non-CSV")
    out = {}
    for line in body.splitlines()[1:]:
        parts = line.split(",")
        if len(parts) >= 5 and parts[4] not in ("", "N/D"):
            out[parts[0]] = round(float(parts[4]), 6)
    if len(out) < 250:
        raise RuntimeError(f"{ticker}: stooq only {len(out)} rows")
    return out


def fetch_prices(ticker: str) -> tuple[dict[str, float], str]:
    try:
        return fetch_yahoo(ticker), "yahoo-adjclose"
    except Exception as e1:
        try:
            return fetch_stooq(ticker), "stooq-close"
        except Exception as e2:
            raise RuntimeError(f"yahoo: {str(e1)[:80]} | stooq: {str(e2)[:80]}")


def load_ledger() -> dict:
    if LEDGER_PATH.exists():
        return json.loads(LEDGER_PATH.read_text(encoding="utf-8"))
    return {"version": 1, "start": START, "notional": NOTIONAL, "cost_bps": COST_BPS,
            "prices": {}, "llm_decisions": [], "runs": []}


def refresh_prices(ledger: dict, offline: bool) -> dict:
    prices = ledger.setdefault("prices", {})
    errors = {}
    if not offline:
        for t in TICKERS:
            try:
                fresh, src = fetch_prices(t)
                prices[t] = {**prices.get(t, {}), **fresh}
                ledger.setdefault("sources", {})[t] = src
                time.sleep(0.4)
            except Exception as exc:  # keep-last-good, never fabricate
                errors[t] = str(exc)[:160]
    # trim history
    floor = (date.fromisoformat(START) - timedelta(days=LOOKBACK_DAYS)).isoformat()
    for t in list(prices):
        prices[t] = {d: v for d, v in sorted(prices[t].items()) if d >= floor}
    return errors


# ------------------------------------------------------------------------ helpers
def trading_days(prices: dict) -> list[str]:
    spy = prices.get("SPY", {})
    return sorted(d for d in spy if d >= START)


def first_trading_day_of_month(days: list[str]) -> set[str]:
    seen, out = set(), set()
    for d in days:
        ym = d[:7]
        if ym not in seen:
            seen.add(ym)
            out.add(d)
    return out


def last_trading_day_of_month(all_days: list[str]) -> set[str]:
    out = set()
    for i, d in enumerate(all_days):
        nxt = all_days[i + 1] if i + 1 < len(all_days) else None
        if nxt is None or nxt[:7] != d[:7]:
            out.add(d)
    return out


def sma(series: dict[str, float], upto: str, n: int) -> float | None:
    vals = [v for d, v in sorted(series.items()) if d <= upto][-n:]
    if len(vals) < n:
        return None
    return sum(vals) / n


def trailing_return(series: dict[str, float], upto: str, lag_sessions: int, skip_sessions: int = 0) -> float | None:
    """price(t - skip) / price(t - lag) - 1 over the ticker's own sessions."""
    ds = [d for d in sorted(series) if d <= upto]
    if len(ds) <= lag_sessions:
        return None
    end = series[ds[-1 - skip_sessions]] if skip_sessions < len(ds) else None
    start = series[ds[-1 - lag_sessions]]
    if end is None or start <= 0:
        return None
    return end / start - 1


def realized_vol(series: dict[str, float], upto: str, n: int = 21) -> float | None:
    """Annualised std of the last n daily log returns."""
    ds = [d for d in sorted(series) if d <= upto]
    if len(ds) < n + 1:
        return None
    px = [series[d] for d in ds[-(n + 1):]]
    rets = [math.log(px[i] / px[i - 1]) for i in range(1, len(px))]
    mu = sum(rets) / len(rets)
    var = sum((r - mu) ** 2 for r in rets) / (len(rets) - 1)
    return math.sqrt(var) * math.sqrt(252)


def signal_for(name: str, d: str, prices: dict) -> dict[str, float] | None:
    """Published allocation rules, evaluated at close d. None = insufficient history."""
    p = prices
    if name == "gem_dual_momentum":
        # Antonacci GEM: 12-month absolute momentum vs T-bills, relative momentum SPY vs ex-US.
        r = {t: trailing_return(p.get(t, {}), d, 252) for t in ("SPY", "VEU", "BIL")}
        if any(v is None for v in r.values()):
            return None
        if r["SPY"] > r["BIL"]:
            return {"SPY": 1.0} if r["SPY"] >= r["VEU"] else {"VEU": 1.0}
        return {"AGG": 1.0}
    if name == "gtaa5":
        # Faber GTAA-5: 20 % each of SPY, VEU, IEF, VNQ, DBC when above the 200-day average, else cash.
        out = {}
        for t in ("SPY", "VEU", "IEF", "VNQ", "DBC"):
            s = p.get(t, {})
            m = sma(s, d, 200)
            if m is None or d not in s:
                return None
            if s[d] > m:
                out[t] = 0.2
        return out
    if name == "spy_voltarget":
        # 10 % annualised volatility target on SPY from 21-day realised vol, capped at 100 % (no leverage).
        v = realized_vol(p.get("SPY", {}), d, 21)
        if v is None or v <= 0:
            return None
        return {"SPY": round(min(1.0, 0.10 / v), 4)}
    if name == "sixty_forty":
        # The static bar every timing rule must clear: 60 % SPY / 40 % AGG, rebalanced monthly.
        if d not in p.get("SPY", {}) or d not in p.get("AGG", {}):
            return None
        return {"SPY": 0.6, "AGG": 0.4}
    if name == "basket_mom5":
        # Jegadeesh-Titman 12-1 momentum inside the AGI basket: top 5 of 10, equal weight.
        scores = {t: trailing_return(p.get(t, {}), d, 252, 21) for t in BASKET}
        if any(v is None for v in scores.values()):
            return None
        top = sorted(scores, key=lambda t: scores[t], reverse=True)[:5]
        return {t: 0.2 for t in top}
    raise ValueError(name)


def tracker_score_asof(d: str) -> float:
    try:
        hist = json.loads(INDEX_HISTORY.read_text(encoding="utf-8"))
        best = None
        for row in hist:
            if row["date"] <= d and (best is None or row["date"] > best["date"]):
                best = row
        if best:
            return float(best["score"])
    except Exception:
        pass
    return 62.5  # the published score at pre-registration (2026-09-05)


# ------------------------------------------------------------------- simulation
class Portfolio:
    """Holdings in shares (fractional), cash in $. Costs on traded notional."""

    def __init__(self):
        self.cash = NOTIONAL
        self.shares: dict[str, float] = {}
        self.trades = 0
        self.turnover = 0.0

    def value(self, px: dict[str, float]) -> float:
        return self.cash + sum(n * px[t] for t, n in self.shares.items() if t in px)

    def rebalance(self, target: dict[str, float], px: dict[str, float]):
        """target: ticker -> weight (sum <= 1; remainder cash)."""
        total = self.value(px)
        if total <= 0:
            return
        for t in set(self.shares) | set(target):
            if t not in px:
                continue
            want_val = total * target.get(t, 0.0)
            have_val = self.shares.get(t, 0.0) * px[t]
            delta = want_val - have_val
            if abs(delta) < 1.0:
                continue
            cost = abs(delta) * COST_BPS / 10_000
            self.shares[t] = self.shares.get(t, 0.0) + delta / px[t]
            self.cash -= delta + cost
            self.trades += 1
            self.turnover += abs(delta)
            if abs(self.shares[t]) < 1e-9:
                del self.shares[t]


def px_on(prices: dict, d: str) -> dict[str, float]:
    return {t: s[d] for t, s in prices.items() if d in s}


def next_day(days: list[str], d: str) -> str | None:
    i = days.index(d)
    return days[i + 1] if i + 1 < len(days) else None


def run_arm(name: str, prices: dict, days: list[str], ledger: dict) -> dict:
    """Return {status, equity:{date:value}, trades, turnover, note}."""
    all_spy_days = sorted(prices.get("SPY", {}))
    if not days:
        return {"status": "waiting_for_start", "equity": {}, "trades": 0, "turnover": 0,
                "target": {"as_of": all_spy_days[-1] if all_spy_days else None, "execute_on": START,
                           "action": "wait", "weights": {}}}
    eq: dict[str, float] = {}
    pf = Portfolio()
    orders: dict[str, dict[str, float]] = {}   # execution day -> target weights
    first = days[0]
    ftd = first_trading_day_of_month(days)
    ltd = last_trading_day_of_month(all_spy_days)
    basket_eq = {t: 1.0 / len(BASKET) for t in BASKET}

    if name == "spy_hold":
        orders[first] = {"SPY": 1.0}
    elif name == "qqq_hold":
        orders[first] = {"QQQ": 1.0}
    elif name == "agi_basket":
        for d in days:
            if d == first or (d in ftd and d != first):
                orders[d] = basket_eq
    elif name == "tracker_mix":
        for d in days:
            if d == first or d in ftd:
                w = tracker_score_asof(d) / 100.0
                orders[d] = {**{t: w / len(BASKET) for t in BASKET}, "SPY": 1.0 - w}
    elif name == "sma200_spy":
        # signal at each month-end close (and at START), executed next trading day
        signal_days = [d for d in all_spy_days if d >= days[0]]
        for d in signal_days:
            if d == first or d in ltd:
                s = sma(prices["SPY"], d, 200)
                if s is None:
                    continue
                target = {"SPY": 1.0} if prices["SPY"][d] > s else {}
                ex = first if d == first else next_day(days, d)
                if ex:
                    orders[ex] = target
    elif name in MONTHLY_ARMS:
        # signal at the session before START and at each month-end close; executed next session
        prev = [d for d in all_spy_days if d < first]
        if prev:
            t0 = signal_for(name, prev[-1], prices)
            if t0 is not None:
                orders[first] = t0
        for d in [d for d in all_spy_days if d >= first and d in ltd]:
            ex = next_day(days, d)
            tgt = signal_for(name, d, prices)
            if ex and tgt is not None:
                orders[ex] = tgt
    elif name == "llm_agent":
        decs = ledger.get("llm_decisions", [])
        if not decs:
            return {"status": "not_started", "equity": {}, "trades": 0, "turnover": 0,
                    "note": "waiting for LEDGER_LLM_KEY (owner secret); no decisions recorded",
                    "target": {"as_of": days[-1], "execute_on": next_session(days[-1]), "action": "wait", "weights": {}}}
        for dec in decs:
            ex = dec.get("execute_on")
            if ex in days:
                orders[ex] = {k: float(v) for k, v in dec["weights"].items() if k != "CASH"}
    else:
        raise ValueError(name)

    # only execute if we actually hold anything or have an order; mark equity daily
    started = False
    for d in days:
        px = px_on(prices, d)
        if d in orders:
            tgt = orders[d]
            if all(t in px for t in tgt):
                pf.rebalance(tgt, px)
                started = True
        if started or d >= first:
            eq[d] = round(pf.value(px), 2)
    status = "live" if eq else "waiting_for_start"
    # --- target for the next session (what a mirror account should look like at its close)
    last = days[-1]
    px_last = px_on(prices, last)
    total = pf.value(px_last)
    cur_w = {t: n * px_last[t] / total for t, n in pf.shares.items() if t in px_last and total > 0}
    if sum(cur_w.values()) > 1.0:  # cost drag leaves paper cash slightly negative; a mirror must stay unlevered
        k = sum(cur_w.values())
        cur_w = {t: v / k for t, v in cur_w.items()}
    cur_w = {t: round(v, 4) for t, v in cur_w.items()}
    nxt = next_session(last)
    action, weights = "hold", cur_w
    if name in ("agi_basket", "tracker_mix") and nxt[:7] != last[:7]:
        action = "rebalance"
        if name == "agi_basket":
            weights = basket_eq
        else:
            w = tracker_score_asof(nxt) / 100.0
            weights = {**{t: round(w / len(BASKET), 4) for t in BASKET}, "SPY": round(1.0 - w, 4)}
    elif name == "sma200_spy" and nxt[:7] != last[:7]:
        s200 = sma(prices["SPY"], last, 200)
        if s200 is not None:
            action = "rebalance"
            weights = {"SPY": 1.0} if prices["SPY"][last] > s200 else {}
    elif name in MONTHLY_ARMS and nxt[:7] != last[:7]:
        sig = signal_for(name, last, prices)
        if sig is not None:
            action, weights = "rebalance", sig
    elif name == "llm_agent":
        pend = [d for d in ledger.get("llm_decisions", []) if d.get("execute_on") == nxt or d.get("execute_on") is None]
        if pend:
            action = "rebalance"
            weights = {k: float(v) for k, v in pend[-1]["weights"].items() if k != "CASH"}
    if not eq:  # first session ever: every arm enters at the first close
        action = "enter"
        if name == "spy_hold": weights = {"SPY": 1.0}
        elif name == "qqq_hold": weights = {"QQQ": 1.0}
        elif name == "agi_basket": weights = basket_eq
        elif name == "tracker_mix":
            w = tracker_score_asof(nxt) / 100.0
            weights = {**{t: round(w / len(BASKET), 4) for t in BASKET}, "SPY": round(1.0 - w, 4)}
        elif name == "sma200_spy":
            s200 = sma(prices["SPY"], last, 200)
            weights = {"SPY": 1.0} if (s200 is None or prices["SPY"][last] > s200) else {}
        elif name in MONTHLY_ARMS:
            weights = signal_for(name, last, prices) or {}
    target = {"as_of": last, "execute_on": nxt, "action": action, "weights": unlever(weights)}
    return {"status": status, "equity": eq, "trades": pf.trades, "turnover": round(pf.turnover, 2), "target": target}


def metrics(eq: dict[str, float], bench: dict[str, float]) -> dict:
    if not eq:
        return {}
    vals = [eq[d] for d in sorted(eq)]
    last = vals[-1]
    peak, mdd = vals[0], 0.0
    for v in vals:
        peak = max(peak, v)
        mdd = min(mdd, v / peak - 1)
    out = {"days": len(vals), "last": round(last, 2),
           "return_pct": round((last / NOTIONAL - 1) * 100, 2),
           "max_drawdown_pct": round(mdd * 100, 2)}
    if bench:
        bd = sorted(bench)[-1]
        out["excess_vs_spy_pct"] = round(((last / NOTIONAL) - (bench[bd] / NOTIONAL)) * 100, 2)
    return out


# ------------------------------------------------------------------- LLM arm
def maybe_llm_decision(ledger: dict, prices: dict, days: list[str], today: str) -> str | None:
    key = os.getenv("LEDGER_LLM_KEY", "").strip()
    if not key or not days:
        return None
    decs = ledger.setdefault("llm_decisions", [])
    last = decs[-1]["decided_on"] if decs else None
    # weekly cadence: decide on the first run of each ISO week
    wk = date.fromisoformat(today).isocalendar()[:2]
    if last and date.fromisoformat(last).isocalendar()[:2] == wk:
        return None
    import requests

    model = os.getenv("LEDGER_LLM_MODEL", "openai/gpt-4o-mini")
    d0 = days[-1]
    window = [d for d in sorted(prices["SPY"]) if d <= d0][-60:]
    table = []
    for t in TICKERS:
        s = prices.get(t, {})
        pts = [s[d] for d in window if d in s]
        if len(pts) >= 2:
            table.append(f"{t}: 60d {((pts[-1]/pts[0])-1)*100:+.1f}%, 5d {((pts[-1]/pts[max(0,len(pts)-6)])-1)*100:+.1f}%")
    house = ""
    try:
        house = LLMS_TXT.read_text(encoding="utf-8")[:3000]
    except Exception:
        pass
    prompt = (
        "You manage a long-only paper portfolio of US equities for one week. "
        f"Universe: {', '.join(TICKERS)} plus CASH. Today is {d0}. Costs 5bp per side. "
        "Return ONLY a JSON object of weights summing to 1.0 (two decimals), e.g. "
        '{"NVDA":0.2,"SPY":0.5,"CASH":0.3}, then a line starting with RATIONALE: (max 60 words).\n\n'
        f"Recent performance (adjusted close):\n" + "\n".join(table) +
        f"\n\nAGI-2027 Thesis Tracker score: {tracker_score_asof(d0)}/100.\n\nHouse scorecard excerpt:\n{house}"
    )
    r = requests.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        json={"model": model, "messages": [{"role": "user", "content": prompt}], "temperature": 0.2},
        timeout=60,
    )
    r.raise_for_status()
    text = r.json()["choices"][0]["message"]["content"]
    start, end = text.find("{"), text.find("}")
    weights = json.loads(text[start:end + 1])
    weights = {k.upper(): max(0.0, float(v)) for k, v in weights.items() if k.upper() in TICKERS + ["CASH"]}
    tot = sum(weights.values()) or 1.0
    weights = {k: round(v / tot, 4) for k, v in weights.items()}
    rat = text[text.find("RATIONALE:"):][:600].strip() if "RATIONALE:" in text else ""
    nxt = None  # executed on the next trading day after d0 (unknown yet) — resolved at run time
    decs.append({"decided_on": today, "as_of_close": d0, "execute_on": nxt, "weights": weights,
                 "model": model, "rationale": rat})
    return today


def resolve_llm_execution(ledger: dict, all_spy_days: list[str]):
    for dec in ledger.get("llm_decisions", []):
        if dec.get("execute_on"):
            continue
        later = [d for d in all_spy_days if d > dec["as_of_close"]]
        if later:
            dec["execute_on"] = later[0]


# ------------------------------------------------------------------------ main
def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--offline", action="store_true", help="use cached prices only")
    ap.add_argument("--dry-run", action="store_true", help="compute but do not write")
    ap.add_argument("--fixture", help="JSON file of prices for tests (implies offline)")
    ap.add_argument("--today", help="override run date (YYYY-MM-DD)")
    args = ap.parse_args()

    today = args.today or datetime.now(timezone.utc).date().isoformat()
    ledger = load_ledger()
    if args.fixture:
        ledger["prices"] = json.loads(Path(args.fixture).read_text())
        errors = {}
    else:
        errors = refresh_prices(ledger, args.offline)
    prices = ledger["prices"]
    if "SPY" not in prices or not prices["SPY"]:
        print("no usable SPY prices — refusing to write a ledger", file=sys.stderr)
        return 1

    all_spy_days = sorted(prices["SPY"])
    days = trading_days(prices)
    try:
        maybe_llm_decision(ledger, prices, days, today)
    except Exception as exc:
        errors["llm_agent"] = str(exc)[:160]
    resolve_llm_execution(ledger, all_spy_days)

    arms = {}
    bench_eq = None
    for name in ARM_ORDER:
        res = run_arm(name, prices, days, ledger)
        if name == "spy_hold":
            bench_eq = res["equity"]
        res["metrics"] = metrics(res["equity"], bench_eq if name != "spy_hold" else {})
        arms[name] = res

    ledger.update({
        "version": 1, "start": START, "notional": NOTIONAL, "cost_bps": COST_BPS,
        "basket": BASKET, "benchmarks": BENCH, "etf_universe": ETFS, "arm_order": ARM_ORDER,
        "generated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "last_price_date": all_spy_days[-1],
        "trading_days_since_start": len(days),
        "fetch_errors": errors,
        "arms": arms,
        "judgement": {
            "read_date": "2027-03-08",
            "rule": "6 months after START: each arm's return, max drawdown and excess vs SPY are published as-is; "
                    "no arm is promoted, sold, or connected to real money by this ledger. "
                    "Pipeline kill: >5 consecutive weekday runs without fresh SPY prices = red run until fixed.",
        },
    })
    runs = ledger.setdefault("runs", [])
    runs.append({"at": ledger["generated"], "price_date": all_spy_days[-1], "errors": len(errors)})
    ledger["runs"] = runs[-60:]

    summary = {k: v.get("metrics") or v.get("status") for k, v in arms.items()}
    print(json.dumps({"price_date": all_spy_days[-1], "days": len(days), "errors": errors, "arms": summary}, indent=1))
    if not args.dry_run:
        LEDGER_PATH.write_text(json.dumps(ledger, indent=0, separators=(",", ":")) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    sys.exit(main())
