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
# Levered sleeve (pre-registered 2026-09-09, owner: "股票板块子站点…要做到以年化100%为目标").
# A real 3x fund, not a simulated one: financing, expense ratio and daily-reset decay are
# already inside TQQQ's own adjusted closes, so nothing here has to be assumed. The point of
# these two arms is to measure what leverage actually costs, side by side, on the same
# instrument: one with a trend filter, one without.
LEVERED = ["TQQQ"]
TICKERS = BENCH + BASKET + ETFS + LEVERED
# 2026-09-09: raised from 430 to 1100 calendar days (~3 years of sessions) because the
# ml_ridge arm trains on completed monthly cross-sections, and 430 days leaves about eight
# of them after the 12-month feature window — a sample too small to fit five coefficients
# on. The cost is the price block in this file growing roughly 3x; that is the price of the
# model having anything to learn from, and it is bounded because history is still trimmed.
LOOKBACK_DAYS = 1100
MONTHLY_ARMS = ("gem_dual_momentum", "gtaa5", "spy_voltarget", "basket_mom5", "sixty_forty",
                "tqqq_trend", "ml_ridge", "ml_gbm")
ARM_ORDER = ["spy_hold", "qqq_hold", "sixty_forty", "agi_basket", "tracker_mix", "sma200_spy", "llm_agent",
             "gem_dual_momentum", "gtaa5", "spy_voltarget", "basket_mom5", "tqqq_trend", "tqqq_hold",
             "ml_ridge", "ml_gbm"]
# Arms registered after START run from their own first session. Backfilling them to START
# would hand them a look-ahead the older arms never had, however small, so they wait.
LEVERED_START = "2026-09-10"
ARM_START = {"tqqq_trend": LEVERED_START, "tqqq_hold": LEVERED_START,
             "ml_ridge": LEVERED_START, "ml_gbm": LEVERED_START}
# These two are paper-only by construction. tools/trader/alpaca_mirror.py keeps its own
# allowlist and does not contain them; that is deliberate and must stay that way.
PAPER_ONLY = frozenset(ARM_START)

# ---- the 100 %/yr target, stated as arithmetic rather than as a wish (2026-09-09) ----
# For a strategy with excess return mu and volatility sigma held at leverage L, the
# compound growth rate is  g(L) = L*mu - L^2*sigma^2/2.  Maximising over L gives the Kelly
# optimum g* = S^2/2, where S = mu/sigma is the Sharpe ratio.  So the highest CAGR ANY
# amount of leverage can produce is exp(S^2/2) - 1, and it depends on Sharpe alone.
# Doubling money every year therefore needs S >= sqrt(2*ln2) = 1.177 at full Kelly.
# This is why the target is not a leverage problem: with a Sharpe of 0.68 (the published
# out-of-sample figure for GTAA-5) the ceiling at ANY leverage is about 26 %/yr.
TARGET_CAGR = 1.00
LN_TARGET = math.log(1 + TARGET_CAGR)
MIN_SESSIONS = 60              # below this a Sharpe estimate is noise; report null, never a number
UA = {"User-Agent": "AGI Scorecard paper-ledger (https://agiscorecard.com/ai-trading-ledger)"}
# NYSE full-day closures (2026-09 → 2027-12). Used only to name the next session for
# the published target; a wrong entry costs one early/late rebalance, never money.
NYSE_HOLIDAYS = {
    "2026-11-26", "2026-12-25",
    "2027-01-01", "2027-01-18", "2027-02-15", "2027-03-26", "2027-05-31", "2027-06-18",
    "2027-07-05", "2027-09-06", "2027-11-25", "2027-12-24",
}


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

    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?range=5y&interval=1d"
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


# ------------------------------------------------------------------- ml_ridge model
# A cross-sectional ridge regression over the ten-name basket, pre-registered 2026-09-09
# (owner: "建一个股票预测模型…实现收益100%"). Standard library only, on purpose: this ledger
# runs on a bare GitHub runner, and a model nobody else can rerun is not evidence of anything.
#
# In one line: every month, rank the ten names with a linear model fitted on their own past
# monthly cross-sections, hold the top three, and sit in T-bills when it likes none of them.
#
# What it is NOT is an edge, and the honest place to say so is here rather than in the copy.
# The best published result of this exact shape — Gu, Kelly & Xiu, Review of Financial Studies
# 2020 — reaches a monthly out-of-sample R^2 of about 0.3-0.4 % using 900+ predictors across
# the whole US cross-section, and its headline Sharpe comes from a long-SHORT decile portfolio
# measured before trading costs. This arm has five predictors, ten stocks, long-only, three
# years of prices and pays 5 bp a side. It exists to be measured against that ceiling.
ML_FEATURES = ("mom_12_1", "mom_6_1", "rev_1", "vol_21", "sma200_gap")
ML_RIDGE_LAMBDA = 10.0   # standardised units; fixed before the start and never tuned on live data
ML_TOP_K = 3
ML_MIN_TRAIN = 120       # stock-months required before it may hold anything other than cash
ML_FWD = 21              # forward horizon in sessions, i.e. one month


def ml_row(t: str, d: str, prices: dict) -> list[float] | None:
    """The five features at close d, or None if any of them lacks history."""
    s = prices.get(t, {})
    m12 = trailing_return(s, d, 252, 21)     # 12-1 momentum, last month skipped
    m6 = trailing_return(s, d, 126, 21)      # 6-1 momentum
    r1 = trailing_return(s, d, 21)           # one-month reversal
    v = realized_vol(s, d, 21)
    a = sma(s, d, 200)
    if None in (m12, m6, r1, v, a) or d not in s or not a or a <= 0:
        return None
    return [m12, m6, r1, v, s[d] / a - 1.0]


def _zscore(rows: list[list[float]]) -> list[list[float]]:
    """Standardise column-wise ACROSS the names in one month.

    Cross-sectional rather than time-series on purpose: it makes the model a ranking of the
    ten names against each other in that month, so a market-wide move cannot masquerade as a
    signal. A column with no spread becomes zeros rather than a division by zero.
    """
    if not rows:
        return []
    n, k = len(rows), len(rows[0])
    out = [[0.0] * k for _ in range(n)]
    for j in range(k):
        col = [r[j] for r in rows]
        mu = sum(col) / n
        var = sum((c - mu) ** 2 for c in col) / (n - 1) if n > 1 else 0.0
        sd = var ** 0.5
        for i in range(n):
            out[i][j] = 0.0 if sd <= 1e-12 else (col[i] - mu) / sd
    return out


def _solve(A: list[list[float]], b: list[float]) -> list[float] | None:
    """Gaussian elimination with partial pivoting. Small, square, and only used on 5x5."""
    n = len(b)
    M = [row[:] + [b[i]] for i, row in enumerate(A)]
    for c in range(n):
        piv = max(range(c, n), key=lambda r: abs(M[r][c]))
        if abs(M[piv][c]) < 1e-12:
            return None
        M[c], M[piv] = M[piv], M[c]
        for r in range(c + 1, n):
            f = M[r][c] / M[c][c]
            for j in range(c, n + 1):
                M[r][j] -= f * M[c][j]
    x = [0.0] * n
    for r in range(n - 1, -1, -1):
        x[r] = (M[r][n] - sum(M[r][j] * x[j] for j in range(r + 1, n))) / M[r][r]
    return x


def ml_fit(X: list[list[float]], y: list[float], lam: float) -> list[float] | None:
    """Ridge: solve (X'X + lam*I) beta = X'y. No intercept — both sides are demeaned."""
    if not X:
        return None
    k = len(X[0])
    A = [[sum(X[i][a] * X[i][b] for i in range(len(X))) + (lam if a == b else 0.0)
          for b in range(k)] for a in range(k)]
    v = [sum(X[i][a] * y[i] for i in range(len(X))) for a in range(k)]
    return _solve(A, v)


def ml_training_set(d: str, prices: dict) -> tuple[list[list[float]], list[float]]:
    """Every completed monthly cross-section whose forward return is fully observed by d.

    The `spy_days[j + ML_FWD] > d` test is the whole look-ahead guard: a month-end only
    enters training once the month AFTER it has finished, so the model is never fitted on a
    return it would not have known.
    """
    spy = sorted(prices.get("SPY", {}))
    idx = {day: i for i, day in enumerate(spy)}
    X: list[list[float]] = []
    y: list[float] = []
    for m in sorted(last_trading_day_of_month(spy)):
        if m >= d:
            break
        j = idx.get(m)
        if j is None or j + ML_FWD >= len(spy) or spy[j + ML_FWD] > d:
            continue
        end = spy[j + ML_FWD]
        rows, fwd = {}, {}
        for t in BASKET:
            r = ml_row(t, m, prices)
            ser = prices.get(t, {})
            if r is None or m not in ser or end not in ser or ser[m] <= 0:
                continue
            rows[t], fwd[t] = r, ser[end] / ser[m] - 1.0
        if len(rows) < 5:
            continue
        keys = list(rows)
        Z = _zscore([rows[t] for t in keys])
        ys = [fwd[t] for t in keys]
        mu = sum(ys) / len(ys)
        for z, yi in zip(Z, ys):
            X.append(z)
            y.append(yi - mu)          # predict relative rank, not the market's direction
    return X, y


# ---- the non-linear counterpart, added 2026-09-09 after the algorithm survey ----------
# Gu, Kelly & Xiu attribute the gain of trees and neural networks over linear models to
# NONLINEAR INTERACTIONS between predictors, on the whole US cross-section with 900+ of them.
# Whether that carries down to ten names and five features is an empirical question nobody has
# answered for a book this size, so the ledger answers it: the same features, the same universe,
# the same monthly rule, one linear model and one that can express interactions. Depth-2 trees
# rather than stumps precisely because stumps are additive and could not express an interaction
# even in principle — a stump ensemble would test nothing.
GBM_ROUNDS = 50
GBM_LR = 0.05
GBM_DEPTH = 2
GBM_MIN_LEAF = 8
ML_MODELS = ("ridge", "gbm")


def _tree_fit(X: list[list[float]], y: list[float], depth: int, min_leaf: int):
    """Greedy regression tree. Returns ('leaf', value) or ('split', j, thr, left, right)."""
    n = len(y)
    mean = sum(y) / n if n else 0.0
    if depth <= 0 or n < 2 * min_leaf:
        return ("leaf", mean)
    sse = sum((v - mean) ** 2 for v in y)
    best = None
    for j in range(len(X[0])):
        order = sorted(range(n), key=lambda i: X[i][j])
        # candidate thresholds are midpoints between consecutive distinct values
        left_sum = left_n = 0.0
        total = sum(y)
        for k in range(n - 1):
            i = order[k]
            left_sum += y[i]
            left_n += 1
            if left_n < min_leaf or n - left_n < min_leaf:
                continue
            a, b = X[order[k]][j], X[order[k + 1]][j]
            if a == b:
                continue
            # SSE reduction for a mean-split is a closed form; no need to re-sum each side
            gain = left_sum ** 2 / left_n + (total - left_sum) ** 2 / (n - left_n) - total ** 2 / n
            if best is None or gain > best[0]:
                best = (gain, j, (a + b) / 2.0)
    if best is None or best[0] <= 1e-12 or sse <= 1e-12:
        return ("leaf", mean)
    _, j, thr = best
    li = [i for i in range(n) if X[i][j] <= thr]
    ri = [i for i in range(n) if X[i][j] > thr]
    if len(li) < min_leaf or len(ri) < min_leaf:
        return ("leaf", mean)
    return ("split", j, thr,
            _tree_fit([X[i] for i in li], [y[i] for i in li], depth - 1, min_leaf),
            _tree_fit([X[i] for i in ri], [y[i] for i in ri], depth - 1, min_leaf))


def _tree_predict(node, x: list[float]) -> float:
    while node[0] == "split":
        node = node[3] if x[node[1]] <= node[2] else node[4]
    return node[1]


def gbm_fit(X: list[list[float]], y: list[float]):
    """Least-squares gradient boosting. Hyper-parameters fixed before the start, never tuned."""
    base = sum(y) / len(y)
    resid = [v - base for v in y]
    trees = []
    for _ in range(GBM_ROUNDS):
        t = _tree_fit(X, resid, GBM_DEPTH, GBM_MIN_LEAF)
        trees.append(t)
        for i in range(len(resid)):
            resid[i] -= GBM_LR * _tree_predict(t, X[i])
    return (base, trees)


def gbm_predict(model, x: list[float]) -> float:
    base, trees = model
    return base + GBM_LR * sum(_tree_predict(t, x) for t in trees)


def ml_scores(d: str, prices: dict, model: str = "ridge") -> dict[str, float] | None:
    """Cross-sectional predictions at close d, or None when the model cannot be formed.

    One code path for both consumers: the trading arm and the scoreboard that grades it.
    If they diverged, the published score would stop describing the published portfolio.
    """
    X, y = ml_training_set(d, prices)
    if len(X) < ML_MIN_TRAIN:
        return None
    cur = {t: r for t in BASKET if (r := ml_row(t, d, prices)) is not None}
    if len(cur) < ML_TOP_K:
        return None
    keys = list(cur)
    Z = _zscore([cur[t] for t in keys])
    if model == "ridge":
        coef = ml_fit(X, y, ML_RIDGE_LAMBDA)
        if coef is None:
            return None
        return {t: sum(c * z for c, z in zip(coef, row)) for t, row in zip(keys, Z)}
    if model == "gbm":
        fitted = gbm_fit(X, y)
        return {t: gbm_predict(fitted, row) for t, row in zip(keys, Z)}
    raise ValueError(model)


def ml_signal(d: str, prices: dict, model: str = "ridge") -> dict[str, float] | None:
    """Monthly target weights. Cash while the sample is too small — never a guess."""
    X, _ = ml_training_set(d, prices)
    if len(X) < ML_MIN_TRAIN:
        return {"BIL": 1.0}
    pred = ml_scores(d, prices, model)
    if pred is None:
        return None
    top = [t for t in sorted(pred, key=lambda k: pred[k], reverse=True)[:ML_TOP_K] if pred[t] > 0]
    if not top:
        return {"BIL": 1.0}            # the model likes nothing this month; that is an answer
    w = round(1.0 / len(top), 4)
    return {t: w for t in top}


# ------------------------------------------------------- live model scoreboard
# Return-prediction papers report two numbers: monthly out-of-sample R^2 and rank IC. This
# ledger's models are graded in those same units so the comparison to the literature is a
# comparison and not a rhetorical flourish — Gu, Kelly & Xiu (2020) report 0.26 % monthly
# out-of-sample R^2 for penalised linear models and 0.33-0.40 % for trees and neural nets.
#
# Everything here is FORWARD-ONLY: a month is graded when the month after it has finished, and
# months before the arms' start date are never scored. There is no backtest in this file, and
# the reason is that a walk-forward curve computed today would be the one number in the ledger
# that nobody could check against a public execution date.
SCORE_MIN_MONTHS = 6
GKX_LINEAR_R2_PCT = 0.26
GKX_NONLINEAR_R2_PCT = 0.40


def spearman(x: list[float], y: list[float]) -> float | None:
    """Rank correlation with ties averaged. None below three points."""
    n = len(x)
    if n < 3 or n != len(y):
        return None

    def rank(v):
        order = sorted(range(n), key=lambda i: v[i])
        r = [0.0] * n
        i = 0
        while i < n:
            j = i
            while j + 1 < n and v[order[j + 1]] == v[order[i]]:
                j += 1
            avg = (i + j) / 2.0 + 1.0
            for k in range(i, j + 1):
                r[order[k]] = avg
            i = j + 1
        return r

    rx, ry = rank(x), rank(y)
    mx, my = sum(rx) / n, sum(ry) / n
    num = sum((a - mx) * (b - my) for a, b in zip(rx, ry))
    dx = math.sqrt(sum((a - mx) ** 2 for a in rx))
    dy = math.sqrt(sum((b - my) ** 2 for b in ry))
    return num / (dx * dy) if dx > 0 and dy > 0 else None


def model_scoreboard(prices: dict, since: str) -> dict:
    """Grade every model's monthly predictions once their forward month has completed."""
    spy = sorted(prices.get("SPY", {}))
    idx = {d: i for i, d in enumerate(spy)}
    out = {"benchmark": {"source": "Gu, Kelly & Xiu, Review of Financial Studies 2020",
                         "monthly_oos_r2_pct_linear": GKX_LINEAR_R2_PCT,
                         "monthly_oos_r2_pct_nonlinear": GKX_NONLINEAR_R2_PCT,
                         "caveat": "their universe is the whole US cross-section with 900+ predictors; "
                                   "this ledger has ten names and five features, so a smaller number here "
                                   "is the expected result, not a malfunction"},
           "scored_since": since, "min_months": SCORE_MIN_MONTHS, "models": {}}
    for model in ML_MODELS:
        rows, sse, sst, ics = [], 0.0, 0.0, []
        for m in sorted(last_trading_day_of_month(spy)):
            if m < since:
                continue
            j = idx.get(m)
            if j is None or j + ML_FWD >= len(spy):
                continue                                  # forward month not finished: not graded
            end = spy[j + ML_FWD]
            pred = ml_scores(m, prices, model)
            if not pred:
                continue
            real = {}
            for t in pred:
                ser = prices.get(t, {})
                if m in ser and end in ser and ser[m] > 0:
                    real[t] = ser[end] / ser[m] - 1.0
            keys = [t for t in pred if t in real]
            if len(keys) < 5:
                continue
            mu = sum(real[t] for t in keys) / len(keys)
            r = [real[t] - mu for t in keys]              # the model predicts relative rank
            q = [pred[t] for t in keys]
            sse += sum((a - b) ** 2 for a, b in zip(r, q))
            sst += sum(a * a for a in r)
            ic = spearman(q, r)
            if ic is not None:
                ics.append(ic)
            rows.append({"as_of": m, "scored_on": end, "names": len(keys),
                         "rank_ic": round(ic, 4) if ic is not None else None})
        summary = {"months": len(rows),
                   "status": "measured" if len(rows) >= SCORE_MIN_MONTHS else "insufficient_history"}
        if rows:
            summary["monthly_oos_r2_pct"] = round((1 - sse / sst) * 100, 3) if sst > 0 else None
            summary["mean_rank_ic"] = round(sum(ics) / len(ics), 4) if ics else None
        out["models"][model] = {"summary": summary, "recent": rows[-24:]}
    return out


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
    if name in ("ml_ridge", "ml_gbm"):
        if "BIL" not in p:
            return None
        return ml_signal(d, p, "ridge" if name == "ml_ridge" else "gbm")
    if name == "tqqq_trend":
        # The one widely-run retail route to a very high CAGR: hold a 3x fund only while the
        # underlying index is above its own 200-day average, sit in T-bills otherwise.
        # Signal is taken on QQQ, never on TQQQ — a 3x series crosses its own average at
        # different times than the index does, and the published rule is the index one.
        q = p.get("QQQ", {})
        m = sma(q, d, 200)
        if m is None or d not in q:
            return None
        if "TQQQ" not in p or "BIL" not in p:
            return None
        return {"TQQQ": 1.0} if q[d] > m else {"BIL": 1.0}
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
    arm_start = ARM_START.get(name, START)
    if arm_start != START:
        days = [d for d in days if d >= arm_start]
    if not days:
        return {"status": "waiting_for_start", "equity": {}, "trades": 0, "turnover": 0,
                "target": {"as_of": all_spy_days[-1] if all_spy_days else None, "execute_on": arm_start,
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
    elif name == "tqqq_hold":
        orders[first] = {"TQQQ": 1.0}
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
        elif name == "tqqq_hold": weights = {"TQQQ": 1.0}
        elif name == "agi_basket": weights = basket_eq
        elif name == "tracker_mix":
            w = tracker_score_asof(nxt) / 100.0
            weights = {**{t: round(w / len(BASKET), 4) for t in BASKET}, "SPY": round(1.0 - w, 4)}
        elif name == "sma200_spy":
            s200 = sma(prices["SPY"], last, 200)
            weights = {"SPY": 1.0} if (s200 is None or prices["SPY"][last] > s200) else {}
        elif name in MONTHLY_ARMS:
            weights = signal_for(name, last, prices) or {}
    target = {"as_of": last, "execute_on": nxt, "action": action, "weights": weights}
    return {"status": status, "equity": eq, "trades": pf.trades, "turnover": round(pf.turnover, 2), "target": target}


def metrics(eq: dict[str, float], bench: dict[str, float]) -> dict:
    if not eq:
        return {}
    days_sorted = sorted(eq)
    vals = [eq[d] for d in days_sorted]
    last = vals[-1]
    peak, mdd = vals[0], 0.0
    for v in vals:
        peak = max(peak, v)
        mdd = min(mdd, v / peak - 1)
    out = {"days": len(vals), "last": round(last, 2),
           "return_pct": round((last / NOTIONAL - 1) * 100, 2),
           "max_drawdown_pct": round(mdd * 100, 2)}
    if bench:
        # Rebase the benchmark to THIS arm's first session. Arms no longer all start on the
        # same day (llm_agent waits for a key, the levered sleeve was registered later), and
        # comparing an arm's whole return against the benchmark's whole return would have
        # credited or charged it for days it was not invested.
        bdays = [d for d in sorted(bench) if d >= days_sorted[0]]
        if bdays and bench[bdays[0]] > 0:
            out["excess_vs_spy_pct"] = round(((last / NOTIONAL) - (bench[bdays[-1]] / bench[bdays[0]])) * 100, 2)
    return out


def ann_stats(eq: dict[str, float]) -> dict | None:
    """Annualised arithmetic mean and volatility of daily returns. None below MIN_SESSIONS.

    Refusing to return a number for a short series is the whole point: a Sharpe ratio from
    ten sessions is noise with a decimal point on it, and this ledger feeds a target that
    only means anything if its inputs are real.
    """
    ds = sorted(eq)
    rets = [eq[b] / eq[a] - 1 for a, b in zip(ds, ds[1:]) if eq[a] > 0]
    if len(rets) < MIN_SESSIONS:
        return None
    n = len(rets)
    m = sum(rets) / n
    var = sum((r - m) ** 2 for r in rets) / (n - 1)
    return {"sessions": n, "ann_return_pct": round(m * 252 * 100, 2),
            "ann_vol_pct": round((var ** 0.5) * (252 ** 0.5) * 100, 2),
            "_mu": m * 252, "_sigma": (var ** 0.5) * (252 ** 0.5)}


def kelly_for_target(mu_excess: float, sigma: float, ln_target: float = LN_TARGET) -> dict | None:
    """What leverage would reach the target, and whether any leverage can.

    g(L) = L*mu - L^2*sigma^2/2 is a downward parabola in L, so it has a maximum, and above
    that maximum MORE leverage lowers the growth rate. The ceiling exp(S^2/2)-1 is therefore
    a hard one: if it sits below the target, the target is unreachable at every leverage,
    and the honest output is `reachable: false` rather than a bigger multiplier.
    """
    if sigma <= 0:
        return None
    s = mu_excess / sigma
    if mu_excess <= 0:
        # S^2 loses the sign, so a losing arm would otherwise advertise a large ceiling. For a
        # long-only book the best any leverage can do with a negative edge is to use none of it.
        return {"sharpe": round(s, 3), "max_cagr_any_leverage_pct": 0.0,
                "reachable": False, "leverage_for_target": None}
    ceiling = math.exp(s * s / 2) - 1
    disc = mu_excess * mu_excess - 2 * ln_target * sigma * sigma
    lev = (mu_excess - math.sqrt(disc)) / (sigma * sigma) if disc >= 0 else None
    return {"sharpe": round(s, 3),
            "max_cagr_any_leverage_pct": round(ceiling * 100, 1),
            "reachable": lev is not None,
            "leverage_for_target": round(lev, 2) if lev is not None else None}


def risk_free_annual(prices: dict, first: str, last: str) -> float | None:
    """Cash rate from the BIL series over the same window, so the Sharpe is a real excess."""
    s = prices.get("BIL", {})
    ds = [d for d in sorted(s) if first <= d <= last]
    rets = [s[b] / s[a] - 1 for a, b in zip(ds, ds[1:]) if s[a] > 0]
    if len(rets) < MIN_SESSIONS:
        return None
    return sum(rets) / len(rets) * 252


def target_100_for(eq: dict[str, float], prices: dict) -> dict:
    """Per-arm answer to 'how far is this from 100 %/yr, and what would close the gap'."""
    st = ann_stats(eq)
    if st is None:
        return {"status": "insufficient_history",
                "note": f"needs {MIN_SESSIONS} sessions of live equity; has {max(len(eq) - 1, 0)}"}
    ds = sorted(eq)
    rf = risk_free_annual(prices, ds[0], ds[-1])
    out = {"status": "measured", "sessions": st["sessions"],
           "ann_return_pct": st["ann_return_pct"], "ann_vol_pct": st["ann_vol_pct"],
           "risk_free_pct": round(rf * 100, 2) if rf is not None else None}
    k = kelly_for_target(st["_mu"] - (rf or 0.0), st["_sigma"])
    if k:
        out.update(k)
    if rf is None:
        out["caveat"] = "BIL history too short; Sharpe computed against a 0 % cash rate"
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
def selftest() -> int:
    """Offline checks on the arithmetic the 100 %/yr target rests on. Must be able to go red."""
    fails = []

    def check(cond, msg):
        if not cond:
            fails.append(msg)

    # The published requirement: doubling every year needs Sharpe sqrt(2 ln 2) at full Kelly.
    check(abs(math.sqrt(2 * LN_TARGET) - 1.1774) < 5e-4, "full-Kelly Sharpe requirement moved")
    check(abs(math.sqrt(LN_TARGET / 0.375) - 1.3596) < 5e-4, "half-Kelly Sharpe requirement moved")

    # Just above the requirement the target becomes reachable, and the leverage it names is
    # BELOW the Kelly optimum — the smaller of the two roots, i.e. the cheaper way to get there.
    sigma = 0.20
    k = kelly_for_target(math.sqrt(2 * LN_TARGET) * 1.0001 * sigma, sigma)
    check(k["reachable"], "a Sharpe just above the threshold must reach 100 %/yr")
    k13 = kelly_for_target(1.30 * sigma, sigma)
    check(k13["reachable"], "S = 1.30 must reach 100 %/yr")
    check(3.6 < k13["leverage_for_target"] < 3.9,
          f"S = 1.30 should need about 3.74x, got {k13['leverage_for_target']}")
    check(k13["leverage_for_target"] < 1.30 / sigma,
          "the target leverage must sit below the Kelly optimum, not above it")

    # Below the requirement the target is unreachable at EVERY leverage, and the ceiling says so.
    weak = kelly_for_target(0.68 * 0.15, 0.15)          # GTAA-5's published out-of-sample Sharpe
    check(weak["reachable"] is False, "S = 0.68 must be unreachable")
    check(weak["leverage_for_target"] is None, "unreachable must not report a leverage")
    check(24.0 < weak["max_cagr_any_leverage_pct"] < 28.0,
          f"S = 0.68 ceiling should be ~26 %, got {weak['max_cagr_any_leverage_pct']}")
    spyish = kelly_for_target(0.44 * 0.16, 0.16)        # SPY's own long-run Sharpe
    check(9.0 < spyish["max_cagr_any_leverage_pct"] < 11.5,
          f"S = 0.44 ceiling should be ~10 %, got {spyish['max_cagr_any_leverage_pct']}")

    # More leverage past the optimum LOWERS growth — the property that makes the ceiling hard.
    def g(L, mu, sg):
        return L * mu - L * L * sg * sg / 2
    mu2, sg2 = 0.10, 0.16
    opt = mu2 / (sg2 ** 2)
    check(g(opt, mu2, sg2) > g(opt * 2, mu2, sg2), "growth must fall above the Kelly optimum")
    check(g(opt * 2, mu2, sg2) <= 0.0 + 1e-12, "double-Kelly growth is zero or worse")

    # Short series must refuse to produce a Sharpe rather than produce a noisy one.
    check(ann_stats({f"2026-01-{i:02d}": 100.0 + i for i in range(1, 10)}) is None,
          "under MIN_SESSIONS ann_stats must return None")
    check(target_100_for({}, {})["status"] == "insufficient_history", "empty equity must not be measured")
    check(kelly_for_target(0.1, 0.0) is None, "zero volatility must not produce a Sharpe")

    # A losing arm must not advertise a ceiling: S^2 is positive for a negative Sharpe, and the
    # first version of this function reported 64 % max CAGR for a strategy losing 12 % a year.
    neg = kelly_for_target(-0.16, 0.16)
    check(neg["sharpe"] < 0, "negative edge must keep its sign in the Sharpe")
    check(neg["max_cagr_any_leverage_pct"] == 0.0,
          f"negative edge ceiling must be 0, got {neg['max_cagr_any_leverage_pct']}")
    check(neg["reachable"] is False and neg["leverage_for_target"] is None,
          "negative edge must not name a leverage")

    # Benchmark rebasing: an arm that starts late is not charged for the days it missed.
    bench = {"2026-09-08": 10000.0, "2026-09-09": 11000.0, "2026-09-10": 11000.0}
    late = {"2026-09-10": 10000.0, "2026-09-11": 10500.0}
    m = metrics(late, bench)
    check(m["excess_vs_spy_pct"] == 5.0,
          f"late arm should show +5 against a flat benchmark since its own start, got {m['excess_vs_spy_pct']}")

    # ---- ml_ridge: the linear algebra, the standardisation, and the look-ahead guard ----
    x = _solve([[2.0, 1.0], [1.0, 3.0]], [5.0, 10.0])          # exact answer: [1, 3]
    check(x and abs(x[0] - 1.0) < 1e-9 and abs(x[1] - 3.0) < 1e-9, f"_solve wrong: {x}")
    check(_solve([[1.0, 2.0], [2.0, 4.0]], [1.0, 2.0]) is None, "singular system must return None")

    z = _zscore([[1.0, 5.0], [2.0, 5.0], [3.0, 5.0]])
    check(abs(sum(r[0] for r in z)) < 1e-12, "z-scored column must have mean 0")
    check(all(abs(r[1]) < 1e-12 for r in z), "a column with no spread must become zeros, not NaN")

    # Ridge must shrink: with lambda > 0 the fitted slope is below the least-squares one.
    Xs = [[1.0], [2.0], [3.0], [4.0]]
    ys = [2.0, 4.0, 6.0, 8.0]                                   # exactly y = 2x
    b0 = ml_fit(Xs, ys, 0.0)
    b1 = ml_fit(Xs, ys, 10.0)
    check(abs(b0[0] - 2.0) < 1e-9, f"unregularised fit should recover 2.0, got {b0[0]}")
    check(0 < b1[0] < b0[0], f"ridge must shrink toward zero, got {b1[0]}")

    # Deterministic prices, no randomness: each name gets its own drift and a slow wave so the
    # five features actually vary across the cross-section.
    cal = []
    dd = date(2023, 1, 2)
    while len(cal) < 700:
        if dd.weekday() < 5:
            cal.append(dd.isoformat())
        dd += timedelta(days=1)
    px = {}
    for k, t in enumerate(BASKET + ["SPY", "BIL"]):
        base, out = 100.0, {}
        for i, day in enumerate(cal):
            out[day] = round(base * (1 + 0.0004 * (k + 1)) ** i
                             * (1 + 0.05 * math.sin((i + 11 * k) / 37.0)), 6)
        px[t] = out
    # Deliberately stand mid-month, so the previous month-end's forward window straddles the
    # cut-off. Picking a month-end here would make the test pass even with the guard removed,
    # which is exactly the vacuous test this one replaced.
    ends = sorted(last_trading_day_of_month(cal))
    anchor = [m for m in ends if cal.index(m) <= 500][-1]
    mid = cal[cal.index(anchor) + 10]
    check(cal.index(mid) - cal.index(anchor) < ML_FWD,
          "the look-ahead test needs a month-end whose forward window is still open at mid")
    full = ml_training_set(mid, px)
    check(len(full[0]) > 0, "the look-ahead test is vacuous if the training set is empty")
    # Poison every price after the cut-off. A training set that reads any of them changes.
    poisoned = {t: {d: (v * 10 if d > mid else v) for d, v in ser.items()} for t, ser in px.items()}
    check(full == ml_training_set(mid, poisoned),
          "look-ahead leak: training set moved when prices after the cut-off were altered")

    # Too little history must put the arm in cash, never into a guessed portfolio.
    thin = {t: {d: v for d, v in ser.items() if d <= cal[300]} for t, ser in px.items()}
    sig = ml_signal(cal[300], thin)
    check(sig == {"BIL": 1.0} or sum(sig.values()) <= 1.0 + 1e-9,
          "an under-trained model must hold cash or a valid long-only book")
    full_sig = ml_signal(mid, px)
    check(full_sig is not None and abs(sum(full_sig.values()) - 1.0) < 1e-3,
          f"weights must sum to 1, got {full_sig}")
    check(all(w >= 0 for w in full_sig.values()), "the model is long-only; no negative weights")
    check(len(full_sig) <= max(ML_TOP_K, 1), f"must hold at most {ML_TOP_K} names, got {full_sig}")

    # ---- the non-linear model and the scoreboard that grades both models ----
    # A depth-2 tree must express an interaction; a stump cannot, which is the entire reason
    # GBM_DEPTH is 2 and not 1. Note the honest limit of greedy fitting: on pure XOR neither
    # depth helps, because no first split reduces error and CART is greedy. So the test uses a
    # conditional effect a greedy learner CAN find, y = x0 + 2*x0*x1, and asks depth 2 to beat
    # depth 1 on it. Routing is checked separately on a hand-built tree.
    ix = [[i / 20.0, (i * 7 % 13) / 13.0] for i in range(200)]
    iy = [x[0] + 2 * x[0] * x[1] for x in ix]
    sse1 = sum((a - _tree_predict(_tree_fit(ix, iy, 1, 5), x)) ** 2 for a, x in zip(iy, ix))
    sse2 = sum((a - _tree_predict(_tree_fit(ix, iy, 2, 5), x)) ** 2 for a, x in zip(iy, ix))
    check(sse2 < sse1 * 0.75, f"depth 2 must beat depth 1 on an interaction: {sse2:.1f} vs {sse1:.1f}")
    hand = ("split", 0, 0.5, ("split", 1, 0.5, ("leaf", 1.0), ("leaf", 2.0)),
            ("split", 1, 0.5, ("leaf", 3.0), ("leaf", 4.0)))
    check([_tree_predict(hand, x) for x in ([0, 0], [0, 1], [1, 0], [1, 1])] == [1.0, 2.0, 3.0, 4.0],
          "depth-2 routing is wrong")
    check(GBM_DEPTH >= 2,
          "GBM_DEPTH below 2 makes the ensemble additive, and the arm would test nothing")

    # Boosting must reduce training error, and must not be a constant predictor.
    gx = [[float(i) / 10.0, float((i * 7) % 11) / 10.0] for i in range(120)]
    gy = [x[0] * x[1] * 4.0 for x in gx]                       # pure interaction, no main effect
    gm = gbm_fit(gx, gy)
    gp = [gbm_predict(gm, x) for x in gx]
    base = sum(gy) / len(gy)
    check(sum((a - b) ** 2 for a, b in zip(gy, gp)) < sum((a - base) ** 2 for a in gy),
          "boosting must fit better than the mean")
    check(max(gp) - min(gp) > 1e-6, "boosted model must not collapse to a constant")

    check(abs(spearman([1, 2, 3, 4], [1, 2, 3, 4]) - 1.0) < 1e-9, "identical ranking scores 1")
    check(abs(spearman([1, 2, 3, 4], [4, 3, 2, 1]) + 1.0) < 1e-9, "reversed ranking scores -1")
    check(abs(spearman([1, 2, 3, 4, 5], [1, 2, 2, 4, 5])) < 1.0, "ties must not score a perfect 1")
    check(spearman([1, 1, 1, 1], [1, 2, 3, 4]) is None, "no spread means no rank correlation")
    check(spearman([1, 2], [2, 1]) is None, "two points is not a rank correlation")

    # The scoreboard grades nothing before the arms started and nothing whose month is open.
    board = model_scoreboard(px, cal[-1])
    for mdl in ML_MODELS:
        check(board["models"][mdl]["summary"]["months"] == 0,
              f"{mdl}: nothing may be graded when the start date is the last session")
        check(board["models"][mdl]["summary"]["status"] == "insufficient_history",
              f"{mdl}: an empty scoreboard must say so rather than report a score")
    board2 = model_scoreboard(px, cal[300])
    check(board2["models"]["ridge"]["summary"]["months"] > 0,
          "the scoreboard test is vacuous if no month is ever graded")
    for row in board2["models"]["ridge"]["recent"]:
        check(row["scored_on"] <= cal[-1], "a month graded on a date beyond the data is a leak")
        check(row["scored_on"] > row["as_of"], "a month must be graded after it, never on itself")

    # The levered sleeve must stay out of the real-money executor's allowlist.
    mirror = (Path(__file__).resolve().parents[3] / "tools" / "trader" / "alpaca_mirror.py")
    if mirror.exists():
        body = mirror.read_text(encoding="utf-8")
        for arm in sorted(PAPER_ONLY):
            check(f'"{arm}"' not in body, f"{arm} must never appear in the mirror executor")

    for f in fails:
        print(f"FAIL: {f}")
    print(f"selftest: {'PASS' if not fails else str(len(fails)) + ' FAILED'}")
    return 1 if fails else 0


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--selftest", action="store_true", help="offline arithmetic checks, no network")
    ap.add_argument("--offline", action="store_true", help="use cached prices only")
    ap.add_argument("--dry-run", action="store_true", help="compute but do not write")
    ap.add_argument("--fixture", help="JSON file of prices for tests (implies offline)")
    ap.add_argument("--today", help="override run date (YYYY-MM-DD)")
    args = ap.parse_args()
    if args.selftest:
        return selftest()

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
        res["target_100"] = target_100_for(res["equity"], prices)
        res["paper_only"] = name in PAPER_ONLY
        arms[name] = res

    ledger.update({
        "version": 1, "start": START, "notional": NOTIONAL, "cost_bps": COST_BPS,
        "basket": BASKET, "benchmarks": BENCH, "etf_universe": ETFS, "levered": LEVERED,
        "arm_order": ARM_ORDER, "arm_start": ARM_START, "paper_only": sorted(PAPER_ONLY),
        "target_100": {
            "goal": "owner 2026-09-09: 年化 100 % / double the account every year",
            "target_cagr_pct": round(TARGET_CAGR * 100, 1),
            "required_sharpe_full_kelly": round(math.sqrt(2 * LN_TARGET), 3),
            "required_sharpe_half_kelly": round(math.sqrt(LN_TARGET / 0.375), 3),
            "min_sessions": MIN_SESSIONS,
            "rule": "Highest CAGR reachable at ANY leverage is exp(S^2/2)-1, where S is the "
                    "Sharpe ratio; more leverage past the Kelly optimum lowers growth. So 100 %/yr "
                    "needs a sustained Sharpe of at least 1.177, and no leverage setting substitutes "
                    "for it. Each arm reports its own measured Sharpe and whether the target is "
                    "reachable for it at all. Nothing here is a forecast or a recommendation.",
        },
        "generated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "last_price_date": all_spy_days[-1],
        "trading_days_since_start": len(days),
        "fetch_errors": errors,
        "arms": arms,
        "model_scores": model_scoreboard(prices, LEVERED_START),
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
