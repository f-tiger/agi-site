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
TICKERS = BENCH + BASKET
LOOKBACK_DAYS = 330            # keep enough history for SMA200 + LLM 60-day window
UA = {"User-Agent": "AGI Scorecard paper-ledger (https://agiscorecard.com/ai-trading-ledger)"}


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
    if not days:
        return {"status": "waiting_for_start", "equity": {}, "trades": 0, "turnover": 0}
    all_spy_days = sorted(prices.get("SPY", {}))
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
    elif name == "llm_agent":
        decs = ledger.get("llm_decisions", [])
        if not decs:
            return {"status": "not_started", "equity": {}, "trades": 0, "turnover": 0,
                    "note": "waiting for LEDGER_LLM_KEY (owner secret); no decisions recorded"}
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
    return {"status": status, "equity": eq, "trades": pf.trades, "turnover": round(pf.turnover, 2)}


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
    for name in ["spy_hold", "qqq_hold", "agi_basket", "tracker_mix", "sma200_spy", "llm_agent"]:
        res = run_arm(name, prices, days, ledger)
        if name == "spy_hold":
            bench_eq = res["equity"]
        res["metrics"] = metrics(res["equity"], bench_eq if name != "spy_hold" else {})
        arms[name] = res

    ledger.update({
        "version": 1, "start": START, "notional": NOTIONAL, "cost_bps": COST_BPS,
        "basket": BASKET, "benchmarks": BENCH,
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
