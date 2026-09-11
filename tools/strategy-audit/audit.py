#!/usr/bin/env python3
"""Backtest Reality Check — grade a track record instead of producing one.

Why this exists (2026-09-11, owner: 「继续搞清楚这个方向,变成一个工具,并可以售卖」):
the three rounds of stock research in this repo all landed on the same place. Predicting
returns is a crowded, licensed, low-signal business where the best published monthly
out-of-sample R^2 is 0.26-0.40 % and the only long-running real-money AI equity fund lost
to its index by about 4.9 points a year. **Measuring** whether someone's track record means
anything is none of those things: it is arithmetic, it is not regulated advice, and almost
nobody sells it. Every backtesting platform helps you MAKE a backtest; this asks whether the
one you made survives contact with the multiple-testing problem.

What it answers, from a column of equity values or returns:

  1. Feasibility   Your target needs a Sharpe of at least X. Yours measures Y. The best any
                   leverage can do with Y is Z — because growth is L*mu - L^2*sigma^2/2,
                   which peaks at Kelly and falls above it, so the ceiling exp(S^2/2)-1
                   depends on the Sharpe alone.
  2. PSR           Probability the true Sharpe exceeds a benchmark, given sample length,
                   skew and kurtosis (Bailey & Lopez de Prado).
  3. DSR           The same probability after deflating for how many variants you tried.
                   Try enough parameter sets and the best one looks good by construction.
  4. MinTRL        How long a track record would have to be before this Sharpe is
                   distinguishable from luck at all.
  5. Cost haircut  What the Sharpe becomes once turnover pays a real spread.

It never says buy or sell anything, never names a security, and never sees your data unless
you send it: this is a local script over numbers you already have. That is deliberate —
a recommendation about a financial instrument is regulated in every jurisdiction this
project operates in; a statistic about a dataset is not.

Standard library only. No numpy, no pandas, no network.

    python3 audit.py --equity curve.csv --trials 200 --target 1.0
    python3 audit.py --returns daily.csv --periods-per-year 252 --json out.json
    python3 audit.py --selftest
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import sys
from pathlib import Path
from statistics import NormalDist

EULER = 0.5772156649015329
ND = NormalDist()

# Kept identical to sites/agiscorecard/tools/paper_ledger.py on purpose, and the selftest
# reads that file to prove they have not drifted. One number, one meaning, two places.
LN2 = math.log(2.0)


# ------------------------------------------------------------------ sample statistics

def moments(x: list[float]) -> dict:
    """Mean, sample sd, skewness and Pearson (non-excess) kurtosis."""
    n = len(x)
    if n < 3:
        raise ValueError("need at least 3 observations")
    m = sum(x) / n
    d = [v - m for v in x]
    var = sum(v * v for v in d) / (n - 1)
    sd = math.sqrt(var)
    if sd <= 0:
        raise ValueError("returns have zero variance — nothing to test")
    m3 = sum(v ** 3 for v in d) / n
    m4 = sum(v ** 4 for v in d) / n
    pop_sd = math.sqrt(sum(v * v for v in d) / n)
    return {"n": n, "mean": m, "sd": sd,
            "skew": m3 / pop_sd ** 3,
            "kurtosis": m4 / pop_sd ** 4}      # Pearson: 3.0 for a normal, not 0.0


def to_returns(equity: list[float]) -> list[float]:
    if len(equity) < 2:
        raise ValueError("need at least two equity points")
    out = []
    for a, b in zip(equity, equity[1:]):
        if a <= 0:
            raise ValueError("equity values must be positive")
        out.append(b / a - 1.0)
    return out


# ------------------------------------------------------------------ Sharpe machinery

def sharpe_per_period(mom: dict, rf_per_period: float = 0.0) -> float:
    return (mom["mean"] - rf_per_period) / mom["sd"]


def psr(sr: float, sr_star: float, n: int, skew: float, kurt: float) -> float | None:
    """Probabilistic Sharpe Ratio: P(true SR > sr_star), all in per-period units.

    The denominator is what makes this more than a t-test: negative skew and fat tails
    inflate the variance of the Sharpe estimator, so the same headline number is weaker
    evidence when the strategy's losses arrive in clusters.
    """
    if n < 2:
        return None
    var = 1.0 - skew * sr + (kurt - 1.0) / 4.0 * sr * sr
    if var <= 0:
        return None
    return ND.cdf((sr - sr_star) * math.sqrt(n - 1) / math.sqrt(var))


def expected_max_sharpe(n_trials: int, sr_trial_sd: float) -> float:
    """E[max of n_trials Sharpe ratios] under the null that none of them has an edge.

    This is the number that makes DSR bite. Search 200 parameter sets over noise and the
    best one is not zero — it is about this. A backtest only carries information if it
    clears the height that pure selection would have produced anyway.
    """
    if n_trials < 1:
        raise ValueError("n_trials must be >= 1")
    if n_trials == 1:
        return 0.0
    z1 = ND.inv_cdf(1.0 - 1.0 / n_trials)
    z2 = ND.inv_cdf(1.0 - 1.0 / (n_trials * math.e))
    return sr_trial_sd * ((1.0 - EULER) * z1 + EULER * z2)


def min_track_record_length(sr: float, sr_star: float, skew: float, kurt: float,
                            confidence: float = 0.95) -> float | None:
    """Observations needed before SR is distinguishable from sr_star at `confidence`."""
    if sr <= sr_star:
        return None
    var = 1.0 - skew * sr + (kurt - 1.0) / 4.0 * sr * sr
    if var <= 0:
        return None
    z = ND.inv_cdf(confidence)
    return 1.0 + var * (z / (sr - sr_star)) ** 2


# ------------------------------------------------------------------ the target question

def required_sharpe(target_annual: float, kelly_fraction: float = 1.0) -> float:
    """Annualised Sharpe needed to compound at `target_annual` at this Kelly fraction.

    g(c) = S^2 * (c - c^2/2) at leverage c * Kelly, so the requirement is
    S = sqrt(ln(1+target) / (c - c^2/2)). Full Kelly (c=1) gives sqrt(2 ln 2) = 1.177
    for a 100 % target; half Kelly needs 1.360, and anyone who has sat through a Kelly-sized
    drawdown sizes at half.
    """
    if not 0 < kelly_fraction <= 1:
        raise ValueError("kelly_fraction must be in (0, 1]")
    denom = kelly_fraction - kelly_fraction ** 2 / 2.0
    return math.sqrt(math.log(1.0 + target_annual) / denom)


# Above this, an annualised Sharpe is not a result, it is a units error. The usual cause is
# pasting an equity curve into the returns field: mean 98, standard deviation 1, Sharpe 1500.
# The parity test found it by crashing math.exp, which is the friendliest version of that bug.
IMPLAUSIBLE_SHARPE = 10.0


def kelly_ceiling(sharpe_annual: float) -> float | None:
    """Highest annual return ANY leverage can reach at this Sharpe.

    None rather than a number above the plausibility bound: exp(S^2/2) overflows a float at a
    Sharpe near 37, and every value on the way there is already fiction.
    """
    if sharpe_annual <= 0:
        return 0.0
    if sharpe_annual > IMPLAUSIBLE_SHARPE:
        return None
    return math.exp(sharpe_annual ** 2 / 2.0) - 1.0


def leverage_for_target(sharpe_annual: float, vol_annual: float, target_annual: float) -> float | None:
    """The cheaper of the two leverages that hit the target, or None if none does."""
    if vol_annual <= 0 or sharpe_annual <= 0:
        return None
    mu = sharpe_annual * vol_annual
    ln_t = math.log(1.0 + target_annual)
    disc = mu * mu - 2.0 * ln_t * vol_annual * vol_annual
    if disc < 0:
        return None
    return (mu - math.sqrt(disc)) / (vol_annual ** 2)


def cost_haircut(mu_annual: float, vol_annual: float, turnover_annual: float,
                 cost_bps_per_side: float) -> dict:
    """Sharpe before and after paying a real spread on the stated turnover.

    Turnover is one-way portfolio turnover per year: 12.0 means the book is replaced once a
    month. The drag is turnover * 2 sides * cost, which is where most retail backtests that
    look profitable stop looking profitable.
    """
    drag = turnover_annual * 2.0 * cost_bps_per_side / 10_000.0
    net = mu_annual - drag
    return {"annual_cost_drag_pct": round(drag * 100, 3),
            "gross_sharpe": round(mu_annual / vol_annual, 3) if vol_annual > 0 else None,
            "net_sharpe": round(net / vol_annual, 3) if vol_annual > 0 else None,
            "net_annual_return_pct": round(net * 100, 2)}


# ------------------------------------------------------------------ the report

def audit(returns: list[float], periods_per_year: int, trials: int,
          target_annual: float | None, rf_annual: float,
          turnover_annual: float | None, cost_bps: float,
          sr_trial_sd: float | None, confidence: float) -> dict:
    mom = moments(returns)
    n = mom["n"]
    rf_p = rf_annual / periods_per_year
    sr_p = sharpe_per_period(mom, rf_p)
    root = math.sqrt(periods_per_year)
    sr_a = sr_p * root
    mu_a = mom["mean"] * periods_per_year
    vol_a = mom["sd"] * root

    # Unknown spread of Sharpes across the trials is the common case. Under the null a
    # single Sharpe estimate has variance ~1/n in per-period units, so 1/sqrt(n) is the
    # conservative stand-in — and the report says so rather than hiding the assumption.
    trial_sd = sr_trial_sd if sr_trial_sd is not None else 1.0 / math.sqrt(n)
    sr0_p = expected_max_sharpe(trials, trial_sd)

    out = {
        "sample": {"observations": n, "periods_per_year": periods_per_year,
                   "annual_return_pct": round(mu_a * 100, 2),
                   "annual_vol_pct": round(vol_a * 100, 2),
                   "skew": round(mom["skew"], 3),
                   "kurtosis_pearson": round(mom["kurtosis"], 3),
                   "years": round(n / periods_per_year, 2)},
        "sharpe": {"annual": round(sr_a, 3), "per_period": round(sr_p, 5),
                   "risk_free_annual_pct": round(rf_annual * 100, 2)},
        "multiple_testing": {
            "trials_declared": trials,
            "trial_sharpe_sd_per_period": round(trial_sd, 5),
            "trial_sharpe_sd_source": "declared" if sr_trial_sd is not None else "null assumption 1/sqrt(n)",
            "expected_best_sharpe_annual": round(sr0_p * root, 3),
        },
    }

    p0 = psr(sr_p, 0.0, n, mom["skew"], mom["kurtosis"])
    dsr = psr(sr_p, sr0_p, n, mom["skew"], mom["kurtosis"])
    out["tests"] = {
        "psr_vs_zero": round(p0, 4) if p0 is not None else None,
        "deflated_sharpe_ratio": round(dsr, 4) if dsr is not None else None,
        "dsr_threshold": 0.95,
        "survives_multiple_testing": bool(dsr is not None and dsr > 0.95),
    }
    mtrl = min_track_record_length(sr_p, 0.0, mom["skew"], mom["kurtosis"], confidence)
    out["tests"]["min_track_record_obs"] = round(mtrl, 1) if mtrl is not None else None
    out["tests"]["min_track_record_years"] = round(mtrl / periods_per_year, 2) if mtrl else None
    out["tests"]["confidence"] = confidence

    if abs(sr_a) > IMPLAUSIBLE_SHARPE:
        # Stop here rather than print a confident report about a units error.
        out["implausible"] = True
        out["findings"] = [
            f"An annualised Sharpe of {round(sr_a, 1)} is not a result, it is almost certainly a "
            f"units problem — most often an equity curve pasted where period returns were "
            f"expected, or the wrong periods-per-year. Check the input and run it again; "
            f"no further statistics are reported for this series."]
        out["disclaimer"] = ("Statistics about a dataset. Not investment advice, not a "
                             "recommendation regarding any security, and no claim about future returns.")
        return out

    if target_annual is not None:
        req_full = required_sharpe(target_annual, 1.0)
        req_half = required_sharpe(target_annual, 0.5)
        lev = leverage_for_target(sr_a, vol_a, target_annual)
        out["target"] = {
            "target_annual_pct": round(target_annual * 100, 1),
            "required_sharpe_full_kelly": round(req_full, 3),
            "required_sharpe_half_kelly": round(req_half, 3),
            "measured_sharpe_annual": round(sr_a, 3),
            "max_cagr_any_leverage_pct": (lambda c: None if c is None else round(c * 100, 1))(kelly_ceiling(sr_a)),
            "reachable": lev is not None,
            "leverage_for_target": round(lev, 2) if lev is not None else None,
        }

    if turnover_annual is not None:
        out["costs"] = cost_haircut(mu_a, vol_a, turnover_annual, cost_bps)

    out["findings"] = findings(out)
    out["disclaimer"] = ("Statistics about a dataset. Not investment advice, not a "
                         "recommendation regarding any security, and no claim about future returns.")
    return out


def findings(r: dict) -> list[str]:
    """Plain sentences a reader can act on, ordered by how badly they bite."""
    out = []
    t = r["tests"]
    n = r["sample"]["observations"]
    sr = r["sharpe"]["annual"]
    if sr <= 0:
        out.append(f"The measured Sharpe is {sr}. Nothing below is a rescue: a negative edge "
                   f"has no leverage that improves it, and the ceiling on compound growth is zero.")
    if t["deflated_sharpe_ratio"] is not None and not t["survives_multiple_testing"]:
        out.append(f"Deflated Sharpe is {t['deflated_sharpe_ratio']}, under the 0.95 threshold. "
                   f"After allowing for {r['multiple_testing']['trials_declared']} trials, this "
                   f"track record is not distinguishable from the best of that many coin flips.")
    if t["min_track_record_obs"] and t["min_track_record_obs"] > n:
        out.append(f"The record is {n} observations and would need about "
                   f"{int(t['min_track_record_obs'])} "
                   f"({t['min_track_record_years']} years) before this Sharpe is separable from luck.")
    if r["sample"]["skew"] < -0.5:
        out.append(f"Skew is {r['sample']['skew']}: losses cluster. The Sharpe ratio flatters "
                   f"this shape, which is why the tests above widen the error bars rather than ignore it.")
    if r["sample"]["kurtosis_pearson"] > 6:
        out.append(f"Kurtosis is {r['sample']['kurtosis_pearson']} against 3 for a normal. "
                   f"Fat tails; the worst observation in the sample is unlikely to be the worst possible.")
    tg = r.get("target")
    if tg:
        if not tg["reachable"]:
            out.append(f"A {tg['target_annual_pct']}% annual target needs a Sharpe of at least "
                       f"{tg['required_sharpe_full_kelly']} at full Kelly. Measured is "
                       f"{tg['measured_sharpe_annual']}, whose ceiling at ANY leverage is "
                       f"{tg['max_cagr_any_leverage_pct']}%. More leverage lowers growth past Kelly, "
                       f"so the target is out of reach at every setting, not just at this one.")
        else:
            out.append(f"The target is reachable in principle at {tg['leverage_for_target']}x leverage, "
                       f"before borrowing costs, fees and taxes — and at a drawdown that scales with it.")
    c = r.get("costs")
    if c and c["net_sharpe"] is not None and c["gross_sharpe"] is not None:
        if c["gross_sharpe"] > 0 and c["net_sharpe"] <= 0:
            out.append(f"Costs alone erase the edge: Sharpe {c['gross_sharpe']} gross becomes "
                       f"{c['net_sharpe']} net at the stated turnover.")
        else:
            out.append(f"Costs take the Sharpe from {c['gross_sharpe']} to {c['net_sharpe']} "
                       f"({c['annual_cost_drag_pct']}% a year of drag).")
    if not out:
        out.append("No test in this report flags the record. That is not a recommendation, and "
                   "surviving these checks is necessary rather than sufficient.")
    return out


def render(r: dict) -> str:
    s = r["sample"]
    lines = [
        "BACKTEST REALITY CHECK",
        "=" * 60,
        f"Sample            {s['observations']} observations ({s['years']} years at "
        f"{s['periods_per_year']}/yr)",
        f"Return / vol      {s['annual_return_pct']}% / {s['annual_vol_pct']}% annualised",
        f"Shape             skew {s['skew']}, kurtosis {s['kurtosis_pearson']} (3.0 = normal)",
        f"Sharpe            {r['sharpe']['annual']} annualised",
        "",
        f"Trials declared   {r['multiple_testing']['trials_declared']} "
        f"(spread: {r['multiple_testing']['trial_sharpe_sd_source']})",
        f"Best by luck      {r['multiple_testing']['expected_best_sharpe_annual']} Sharpe would be "
        f"expected from that many trials with no edge at all",
        "",
        f"PSR vs zero       {r['tests']['psr_vs_zero']}",
        f"Deflated Sharpe   {r['tests']['deflated_sharpe_ratio']}  "
        f"({'survives' if r['tests']['survives_multiple_testing'] else 'does NOT survive'} "
        f"the 0.95 threshold)",
        f"Min track record  {r['tests']['min_track_record_obs']} observations "
        f"({r['tests']['min_track_record_years']} years)"
        if r["tests"]["min_track_record_obs"] else "Min track record  not applicable (Sharpe <= 0)",
    ]
    if "target" in r:
        t = r["target"]
        lines += ["",
                  f"Target            {t['target_annual_pct']}% a year",
                  f"Needs Sharpe      {t['required_sharpe_full_kelly']} at full Kelly, "
                  f"{t['required_sharpe_half_kelly']} at half",
                  f"Ceiling at yours  {t['max_cagr_any_leverage_pct']}% at any leverage"]
    if "costs" in r:
        c = r["costs"]
        lines += ["",
                  f"Costs             {c['annual_cost_drag_pct']}% a year of drag; "
                  f"Sharpe {c['gross_sharpe']} -> {c['net_sharpe']}"]
    lines += ["", "FINDINGS", "-" * 60]
    lines += [f"* {f}" for f in r["findings"]]
    lines += ["", r["disclaimer"]]
    return "\n".join(lines)


# ------------------------------------------------------------------ input

def read_series(path: str) -> list[float]:
    """One number per row, or a two-column date,value file. Header row optional."""
    raw = Path(path).read_text(encoding="utf-8").strip()
    if not raw:
        raise ValueError(f"{path} is empty")
    vals = []
    for row in csv.reader(raw.splitlines()):
        if not row:
            continue
        cell = row[-1].strip()
        try:
            vals.append(float(cell))
        except ValueError:
            continue                                 # header or comment line
    if len(vals) < 3:
        raise ValueError(f"{path}: found {len(vals)} numbers, need at least 3")
    return vals


# ------------------------------------------------------------------ selftest

def selftest() -> int:
    fails: list[str] = []

    def check(c, m):
        if not c:
            fails.append(m)

    # Moments against values computable by hand.
    m = moments([1.0, 2.0, 3.0, 4.0, 5.0])
    check(abs(m["mean"] - 3.0) < 1e-12, "mean")
    check(abs(m["sd"] - math.sqrt(2.5)) < 1e-12, f"sd {m['sd']}")
    check(abs(m["skew"]) < 1e-12, f"a symmetric sample has zero skew, got {m['skew']}")
    check(abs(m["kurtosis"] - 1.7) < 1e-9, f"uniform 1..5 Pearson kurtosis is 1.7, got {m['kurtosis']}")

    # Equity to returns, and the guard against a zero or negative equity point.
    r2 = to_returns([100.0, 110.0, 99.0])
    check(len(r2) == 2 and abs(r2[0] - 0.1) < 1e-12 and abs(r2[1] + 0.1) < 1e-12,
          f"equity to returns: {r2}")
    try:
        to_returns([100.0, 0.0, 50.0])
        fails.append("zero equity must raise")
    except ValueError:
        pass

    # PSR is a probability, monotone in the Sharpe, and 0.5 exactly at the benchmark.
    check(abs(psr(0.0, 0.0, 100, 0.0, 3.0) - 0.5) < 1e-12, "PSR at the benchmark is 0.5")
    check(psr(0.2, 0.0, 100, 0.0, 3.0) > psr(0.1, 0.0, 100, 0.0, 3.0), "PSR must rise with SR")
    check(psr(0.1, 0.0, 500, 0.0, 3.0) > psr(0.1, 0.0, 100, 0.0, 3.0),
          "the same Sharpe over a longer record is stronger evidence")
    # Negative skew and fat tails must WEAKEN the same headline Sharpe, not leave it alone.
    check(psr(0.1, 0.0, 250, -1.0, 8.0) < psr(0.1, 0.0, 250, 0.0, 3.0),
          "negative skew and fat tails must lower the PSR")

    # Expected maximum Sharpe: zero for a single trial, rising in the number of trials.
    check(expected_max_sharpe(1, 0.1) == 0.0, "one trial has nothing to deflate")
    e10, e100, e1000 = (expected_max_sharpe(k, 0.1) for k in (10, 100, 1000))
    check(e10 < e100 < e1000, f"E[max] must rise with trials: {e10:.3f} {e100:.3f} {e1000:.3f}")
    check(2.0 < e100 / 0.1 < 3.0,
          f"100 trials of unit-sd Sharpes should peak near 2-3 sd, got {e100 / 0.1:.2f}")

    # The headline behaviour: a mediocre record that survives one trial fails many.
    rets = [0.001 * ((i * 37) % 23 - 11) + 0.0006 for i in range(252)]
    mm = moments(rets)
    srp = sharpe_per_period(mm)
    one = psr(srp, expected_max_sharpe(1, 1 / math.sqrt(len(rets))), len(rets), mm["skew"], mm["kurtosis"])
    many = psr(srp, expected_max_sharpe(500, 1 / math.sqrt(len(rets))), len(rets), mm["skew"], mm["kurtosis"])
    check(many < one, "declaring more trials must lower the deflated Sharpe")

    # MinTRL: undefined when there is no edge, and shrinks as the edge grows.
    check(min_track_record_length(0.0, 0.0, 0.0, 3.0) is None, "no edge, no track-record length")
    check(min_track_record_length(0.05, 0.0, 0.0, 3.0) > min_track_record_length(0.15, 0.0, 0.0, 3.0),
          "a bigger edge needs a shorter record")

    # The target arithmetic, identical to the paper ledger's.
    check(abs(required_sharpe(1.0, 1.0) - 1.1774) < 5e-4, "100 %/yr at full Kelly needs 1.1774")
    check(abs(required_sharpe(1.0, 0.5) - 1.3596) < 5e-4, "100 %/yr at half Kelly needs 1.3596")
    check(abs(kelly_ceiling(1.0) - (math.exp(0.5) - 1)) < 1e-12, "ceiling formula")
    check(kelly_ceiling(-0.5) == 0.0, "a negative edge has a ceiling of zero, not a positive one")
    # The parity test found this by crashing math.exp: a Sharpe past the plausibility bound
    # must return None, not overflow and not a confident enormous number.
    check(kelly_ceiling(50.0) is None, "an implausible Sharpe must not be given a ceiling")
    check(kelly_ceiling(9.9) is not None, "a high but plausible Sharpe still gets a ceiling")
    mis = audit([98.0 + (i % 7) * 0.3 for i in range(60)], 252, 10, 1.0, 0.0, None, 5.0, None, 0.95)
    check(mis.get("implausible") is True, "equity pasted as returns must be caught, not reported on")
    check("target" not in mis, "no target arithmetic on an implausible series")
    check(any("units problem" in f for f in mis["findings"]), "the units warning must be stated")
    check(leverage_for_target(0.68, 0.15, 1.0) is None, "Sharpe 0.68 cannot reach 100 %/yr")
    lv = leverage_for_target(1.30, 0.20, 1.0)
    check(lv is not None and 3.6 < lv < 3.9, f"Sharpe 1.30 needs about 3.74x, got {lv}")

    # Cost haircut arithmetic, and the case that matters: costs erasing the whole edge.
    c = cost_haircut(0.08, 0.16, 12.0, 5.0)
    check(abs(c["annual_cost_drag_pct"] - 1.2) < 1e-9, f"drag {c['annual_cost_drag_pct']}")
    check(abs(c["net_sharpe"] - 0.425) < 1e-3, f"net sharpe {c['net_sharpe']}")
    killed = cost_haircut(0.01, 0.16, 50.0, 10.0)
    check(killed["net_sharpe"] < 0, "high turnover on a thin edge must go negative")

    # Constants must not drift from the ledger that publishes the same numbers.
    ledger = Path(__file__).resolve().parents[2] / "sites" / "agiscorecard" / "tools" / "paper_ledger.py"
    if ledger.exists():
        body = ledger.read_text(encoding="utf-8")
        check("math.sqrt(2 * LN_TARGET)" in body,
              "the ledger no longer derives the full-Kelly requirement the same way")
        check('"required_sharpe_half_kelly": round(math.sqrt(LN_TARGET / 0.375), 3)' in body,
              "the ledger's half-Kelly derivation changed; reconcile before shipping")

    # End to end. Two samples on purpose: one whose Sharpe clears the 100 %/yr threshold and
    # one that cannot, because a report that only ever prints one verdict tests nothing.
    rep = audit(rets, 252, 500, 1.0, 0.0, 12.0, 5.0, None, 0.95)
    check(rep["tests"]["deflated_sharpe_ratio"] is not None, "report must produce a DSR")
    check(rep["sharpe"]["annual"] > 1.177, f"this sample should clear the threshold, got {rep['sharpe']['annual']}")
    check(rep["target"]["reachable"] is True, "a Sharpe above 1.177 must be reachable")
    weak = [0.001 * ((i * 37) % 23 - 11) + 0.0002 for i in range(252)]
    rep_weak = audit(weak, 252, 500, 1.0, 0.0, None, 5.0, None, 0.95)
    check(rep_weak["target"]["reachable"] is False,
          f"a Sharpe of {rep_weak['sharpe']['annual']} must not reach 100 %/yr")
    check(any("out of reach" in f for f in rep_weak["findings"]),
          "an unreachable target must be stated in the findings")
    check("Not investment advice" in rep["disclaimer"], "the disclaimer must survive edits")
    check(len(render(rep).splitlines()) > 15, "the rendered report must not be empty")

    for f in fails:
        print(f"FAIL: {f}")
    print(f"selftest: {'PASS' if not fails else str(len(fails)) + ' FAILED'}")
    return 1 if fails else 0


# ------------------------------------------------------------------ main

def main() -> int:
    ap = argparse.ArgumentParser(description="Grade a track record: PSR, deflated Sharpe, "
                                             "minimum track record length, target feasibility.")
    ap.add_argument("--equity", help="CSV of equity values (one per row, or date,value)")
    ap.add_argument("--returns", help="CSV of period returns as decimals (0.01 = 1%%)")
    ap.add_argument("--periods-per-year", type=int, default=252)
    ap.add_argument("--trials", type=int, default=1,
                    help="how many variants were tried before this one was chosen; "
                         "1 means the very first thing you ran")
    ap.add_argument("--target", type=float, default=None,
                    help="claimed annual return as a decimal, e.g. 1.0 for 100%%")
    ap.add_argument("--risk-free", type=float, default=0.0, help="annual, decimal")
    ap.add_argument("--turnover", type=float, default=None,
                    help="one-way portfolio turnover per year, e.g. 12 for monthly")
    ap.add_argument("--cost-bps", type=float, default=5.0, help="per side, basis points")
    ap.add_argument("--trial-sharpe-sd", type=float, default=None,
                    help="per-period sd of Sharpe across your trials, if you measured it")
    ap.add_argument("--confidence", type=float, default=0.95)
    ap.add_argument("--json", help="write the full report here")
    ap.add_argument("--selftest", action="store_true")
    args = ap.parse_args()

    if args.selftest:
        return selftest()
    if bool(args.equity) == bool(args.returns):
        print("give exactly one of --equity or --returns", file=sys.stderr)
        return 2
    try:
        series = read_series(args.equity or args.returns)
        rets = to_returns(series) if args.equity else series
        rep = audit(rets, args.periods_per_year, args.trials, args.target, args.risk_free,
                    args.turnover, args.cost_bps, args.trial_sharpe_sd, args.confidence)
    except ValueError as exc:
        print(f"input problem: {exc}", file=sys.stderr)
        return 2
    print(render(rep))
    if args.json:
        Path(args.json).write_text(json.dumps(rep, indent=2) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
