#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Which of this site's topics peak in which month — measured, not assumed.

Why this exists (2026-09-15). The site already had a rising-queries face
(fetch_trends_rising.py), and in September it is actively misleading about
winter: its window is `today 3-m`, which in mid-September still covers
mid-June to mid-September. Asked for winter demand, it answered with summer —
the `lüften` seed came back 153.950 "wie lüften bei hitze", 128.800 "richtig
lüften bei hitze", 107.050 "wann lüften bei hitze". All true, all summer, all
useless for deciding what to publish in October.

Rising is also a percentage on an unknown base, which is how `konvektorheizung`
showed up at 31.700 in the rising face and turned out to score 0-1 in absolute
terms here. A rising number alone cannot tell you whether a topic is worth a
page.

This asks the other question: over five years of weekly data, what is the
absolute level of each topic, in which month does it peak, and how much bigger
is winter than September (the month we plan in)? That is the number that says
what to build for the season that is coming.

Method notes that matter for reading the output:
  * Google Trends normalises WITHIN a comparison, so values from two separate
    requests are not comparable. Every batch therefore carries the same ANCHOR
    term, and all other terms are read relative to it. Do not compare a number
    from this file against a number from the rising file — different scales,
    different questions.
  * `win_over_sep` is mean(Nov,Dec,Jan,Feb) / mean(Sep). It says how much the
    season lifts a topic, which is what decides scheduling. A huge multiplier
    on a near-zero base (schimmel fensterrahmen, 69x) is a seasonal shape, not
    a volume; read `peak` for volume and the multiplier for timing.
  * A term that fails is recorded with its error and NOT silently dropped, and
    the previous file is kept if the run produces nothing (keep-last-good).

Quota: related_queries and interest_over_time have separate limits, and the
related-queries one is easy to exhaust (three of six seeds failed with "API
quota exceeded" on 2026-09-15). This tool only uses interest_over_time, sleeps
between batches, and is NOT on a schedule — it is run by hand when someone
needs to decide what a season should get. Adding it to a cron would spend
quota the daily rising fetch needs.

Run: python3 tools/fetch_seasonality.py [--out data/seasonality-de.json]
Needs: pip install trendspy pandas
"""
import json
import os
import sys
import time
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "seasonality-de.json")

GEO = "DE"
TIMEFRAME = "today 5-y"
GAP_S = 20

# Every batch repeats ANCHOR so the batches share a scale.
ANCHOR = "heizlüfter"
BATCHES = [
    ["infrarotheizung", "luftentfeuchter", "konvektorheizung"],
    ["heizdecke", "schimmel", "heizkosten sparen"],
    ["fenster abdichten", "zugluft", "richtig heizen"],
    ["luftfeuchtigkeit senken", "heizstrahler", "wandheizung"],
    ["wäsche trocknen wohnung", "fenster beschlagen", "heizung einstellen"],
    # The mould family, which the 2026-09-15 run found to be the largest winter
    # topic in this site's niche — and the one whose sub-questions the site had
    # least covered. Anchored on "schimmel wand" inside its own group, then tied
    # back to the global anchor through "schimmel" in batch 2.
    ["schimmel wand", "schimmel fenster", "schimmel schlafzimmer"],
    ["schimmel wand", "schwarzer schimmel", "schimmel tapete"],
]


def main():
    try:
        from trendspy import Trends
        import pandas as pd
    except ImportError:
        print("needs: pip install trendspy pandas", file=sys.stderr)
        return 1

    out = sys.argv[sys.argv.index("--out") + 1] if "--out" in sys.argv else OUT
    tr = Trends()
    series, errors = {}, []

    for i, batch in enumerate(BATCHES):
        if i:
            time.sleep(GAP_S)
        terms = [ANCHOR] + batch if ANCHOR not in batch else batch
        try:
            df = tr.interest_over_time(terms, geo=GEO, timeframe=TIMEFRAME)
            for c in df.columns:
                if c != "isPartial":
                    series[c] = df[c]
            print(f"batch {i}: ok ({', '.join(terms)})")
        except Exception as e:  # recorded, never silently dropped
            errors.append({"terms": terms, "error": str(e)[:200]})
            print(f"batch {i}: FAILED {str(e)[:120]}", file=sys.stderr)

    if not series:
        print("nothing fetched — keeping the previous file (keep-last-good)", file=sys.stderr)
        return 0

    df = pd.DataFrame(series)
    df.index = pd.to_datetime(df.index)
    df = df[~df.index.duplicated()]
    monthly = df.groupby(df.index.month).mean()

    rows = []
    for c in df.columns:
        s = monthly[c]
        sep = float(s.get(9, 0))
        winter = float(s.reindex([11, 12, 1, 2]).mean())
        rows.append({
            "term": c,
            "sep": round(sep, 1),
            "peak": round(float(s.max()), 1),
            "peak_month": int(s.idxmax()),
            "winter_mean": round(winter, 1),
            "win_over_sep": round(winter / sep, 2) if sep else None,
        })
    rows.sort(key=lambda r: -r["peak"])

    doc = {
        "fetched": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "geo": GEO,
        "timeframe": TIMEFRAME,
        "anchor": ANCHOR,
        "scale_note": ("Google Trends normalises within a comparison. Values here are "
                       "comparable to each other because every batch repeats the anchor; "
                       "they are NOT comparable to trends-rising.json, which reports "
                       "percentage growth on an unknown base."),
        "weeks": int(df.shape[0]),
        "terms": rows,
        "errors": errors,
    }
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, indent=1)
        f.write("\n")
    print(f"\nwrote {out}: {len(rows)} terms, {len(errors)} failed batches")
    for r in rows:
        print(f"  {r['term']:<28} peak {r['peak']:>5} (month {r['peak_month']:>2})  "
              f"sep {r['sep']:>5}  winter/sep {r['win_over_sep']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
