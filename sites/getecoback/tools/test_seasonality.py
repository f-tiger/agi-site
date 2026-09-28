#!/usr/bin/env python3
"""Offline test for the parts of fetch_seasonality.py that a monthly,
unattended refresh depends on. No network, no Trends.

Why each case exists:
  * rescale — once heizlüfter's autumn-2022 spike leaves the five-year window
    (autumn 2027), the anchor stops being the 100 in every batch. A batch whose
    own max is another term then comes back on a different scale. The test
    builds exactly that batch and requires the rescaled value to equal the
    true one; an identity "rescale" fails it.
  * zero anchor — a batch where the anchor rounds to 0 everywhere cannot be
    placed on the scale. It must be reported, not guessed at 1.0.
  * carry — a failed batch must not delete its terms from the file (the daily
    season calendar would read "no demand"), must not duplicate a term that
    was fetched, and must never invent a term the previous file did not have.
  * freshness — the workflow runs daily and must fetch on day 28, not day 27.

Run: python3 tools/test_seasonality.py   (needs pandas; exit 1 on failure)
"""
import os
import sys
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pandas as pd  # noqa: E402
import fetch_seasonality as fs  # noqa: E402

fails = []


def check(name, cond, detail=""):
    print(("ok   " if cond else "FAIL ") + name + (f" — {detail}" if detail and not cond else ""))
    if not cond:
        fails.append(name)


idx = pd.date_range("2024-01-07", periods=4, freq="W")
true_anchor = pd.Series([40.0, 60.0, 80.0, 100.0], index=idx)
true_big = pd.Series([50.0, 100.0, 150.0, 200.0], index=idx)  # peaks at 2x the anchor

# Batch 0: the anchor is the max, so Trends reports it as-is.
b0 = pd.DataFrame({"heizlüfter": true_anchor, "a": pd.Series([10.0, 20.0, 30.0, 40.0], index=idx)})
# Batch 1: "big" is the max, so Trends rescales the WHOLE batch by 100/200.
b1 = pd.DataFrame({"heizlüfter": true_anchor / 2, "big": true_big / 2, "isPartial": [False] * 4})
series, factors, errors = fs.rescale_batches([(["heizlüfter", "a"], b0), (["heizlüfter", "big"], b1)], "heizlüfter")
check("rescale restores the true level", abs(series["big"].max() - 200.0) < 1e-9, f"got {series['big'].max()}")
check("factor recorded", factors[1]["factor"] == 2.0, str(factors))
check("batch-0 terms untouched", series["a"].tolist() == [10.0, 20.0, 30.0, 40.0])
check("anchor kept from batch 0", series["heizlüfter"].tolist() == true_anchor.tolist())
check("isPartial is not a term", "isPartial" not in series)
check("no errors on a normal run", errors == [], str(errors))

bz = pd.DataFrame({"heizlüfter": [0.0] * 4, "huge": [25.0, 50.0, 75.0, 100.0]}, index=idx)
series, factors, errors = fs.rescale_batches([(["heizlüfter", "a"], b0), (["heizlüfter", "huge"], bz)], "heizlüfter")
check("zero anchor is reported", len(errors) == 1 and "huge" in errors[0]["terms"], str(errors))
check("zero anchor is not guessed", "huge" not in series)

prev = {"fetched": "2026-08-24", "terms": [
    {"term": "schimmel", "peak": 68.5, "peak_month": 1},
    {"term": "heizdecke", "peak": 12.1, "peak_month": 12},
    {"term": "luftentfeuchter", "peak": 30.0, "peak_month": 11}]}
rows = [{"term": "luftentfeuchter", "peak": 32.0, "peak_month": 11}]
out = fs.carry_forward(list(rows), prev, ["schimmel", "heizdecke", "luftentfeuchter", "never-measured"])
terms = [r["term"] for r in out]
check("failed terms are carried", "schimmel" in terms and "heizdecke" in terms, str(terms))
check("carried rows are marked", all(r.get("carried_from") == "2026-08-24" for r in out if r["term"] != "luftentfeuchter"))
check("a fetched term is not duplicated", terms.count("luftentfeuchter") == 1)
check("fresh value wins over the carried one", [r for r in out if r["term"] == "luftentfeuchter"][0]["peak"] == 32.0)
check("nothing is invented", "never-measured" not in terms)
twice = fs.carry_forward([], {"fetched": "2026-09-21", "terms": [dict(out[1])]}, [out[1]["term"]])
check("a carried row keeps its ORIGINAL date", twice[0]["carried_from"] == "2026-08-24", str(twice))

tmp = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".__seasonality_fresh_test.json")
try:
    open(tmp, "w").write('{"fetched": "2026-09-01"}')
    check("27 days old is fresh", fs.is_fresh(tmp, 28, today=date(2026, 9, 28)))
    check("28 days old is due", not fs.is_fresh(tmp, 28, today=date(2026, 9, 29)))
    check("a missing file is due", not fs.is_fresh(tmp + ".nope", 28))
finally:
    os.remove(tmp)

print(f"\n{len(fails)} failed" if fails else "\nseasonality: all checks passed")
sys.exit(1 if fails else 0)
