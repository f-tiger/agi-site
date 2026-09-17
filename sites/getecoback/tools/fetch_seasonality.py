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
    # Candidate product categories, measured 2026-09-15 when asked "what other
    # hot products". Kept in the tool because the answer was mostly negative and
    # the next session should not have to re-derive it: saugwischer peaks at 3,2
    # — the Bodenpflege vertical was built on it and has 1 page view in 56 days.
    # matratze (76,3) and kaffeevollautomat (59,5) are genuinely large and
    # genuinely outside this site's subject.
    ["saugwischer", "saugroboter", "kaffeevollautomat"],
    ["matratze", "luftreiniger", "akku staubsauger"],
    ["luftbefeuchter", "heizkörper thermostat", "fussbodenheizung"],
]


# Per-country mode (--countries, 2026-09-16). The question "what is the key
# product in each market" cannot be answered from the German file: a term's
# level is normalised inside one comparison, so each country is measured in its
# own language against its own basket and the numbers are comparable ONLY
# within a country. Rank and peak month are what transfer, never the level.
GEO_PRODUCTS = {
    "DE": ["mobile klimaanlage", "luftentfeuchter", "heizlüfter", "schimmel"],
    "IT": ["condizionatore portatile", "deumidificatore", "stufa elettrica", "muffa"],
    "ES": ["aire acondicionado portatil", "deshumidificador", "calefactor", "humedad pared"],
    "FR": ["climatiseur mobile", "deshumidificateur", "chauffage d'appoint", "moisissure mur"],
    "GB": ["portable air conditioner", "dehumidifier", "electric heater", "mould"],
    "US": ["portable air conditioner", "dehumidifier", "space heater", "mold"],
}


# Market deep-dive (--market GB, 2026-09-17). The per-country mode above answers
# "which of OUR four categories leads in this market". That is the wrong question
# once a market is chosen: the four terms are a translation of the German shelf,
# so of course the answer looks German. This asks what the market itself buys in
# winter, including categories this site has never carried.
#
# GB is the first market to get one because it is the only one in GEO_PRODUCTS
# whose top two terms BOTH peak in November and both outrank its summer term —
# the opposite shape to Germany, where the site's whole structure came from.
MARKET_ANCHOR = {"GB": "dehumidifier", "DE-STORAGE": "heizlüfter", "DE-UA": "heizlüfter", "DE-BLACKOUT": "heizlüfter"}
# A market key is not always a geo. DE-STORAGE measures German storage demand
# against the SAME anchor as seasonality-de.json, so its levels are directly
# comparable to the rest of the German basket — which is the only way to answer
# "is storage actually bigger than what we already sell" rather than "is storage
# big on its own scale".
MARKET_GEO = {"DE-STORAGE": "DE", "DE-UA": "DE", "DE-BLACKOUT": "DE"}
MARKET_BATCHES = {
    "GB": [
        # Products a UK winter has and a German one does not. `heated airer`
        # and `electric blanket` are here because UK housing dries laundry
        # indoors and heats the person rather than the room; neither has a
        # German equivalent on this site.
        ["heated airer", "electric blanket", "oil filled radiator"],
        # The damp vocabulary. UK usage splits "damp" (the condition, a tenancy
        # and housing word) from "condensation" (the mechanism) from "mould"
        # (the result), and they are not synonyms the way Schimmel is one word.
        ["damp", "condensation on windows", "black mould"],
        ["drying clothes indoors", "damp proofing", "thermal curtains"],
        # Running cost. The site's calculators assume €0,30/kWh; the UK price is
        # set by the Ofgem cap and quoted in p/kWh, so cost content does not
        # transfer even when the appliance does.
        ["draught excluder", "electricity price cap", "condensation"],
    ],
    # German balcony storage (2026-09-17). The site has carried twelve
    # Balkonkraftwerk/Balkonspeicher pages since before the August downgrade and
    # has never once measured the category against its own shelf — there is not
    # a single balkon/speicher/solar term in seasonality-de.json. Anchored on
    # heizlüfter so these levels sit on the same scale as the thirty terms
    # already in that file, which is the only way to answer "is this bigger than
    # what we already sell".
    #
    # EcoFlow is deliberately absent. Owner instruction 2026-08-28, restated
    # 2026-09-17: the brand is never recommended here, so it is not measured as
    # a candidate either.
    # Ukrainian- and Russian-language demand INSIDE Germany (2026-09-17). Asked
    # to build for Ukraine, the first question is not what to write but whether
    # anyone we can reach and bill is asking. Readers inside Ukraine cannot be
    # monetised — there is no Amazon store for that market and our only tag is
    # amazon.de. Ukrainian speakers in Germany can: they live in German flats
    # with German mould and German heating bills, and they buy on amazon.de.
    # Anchored on heizlüfter so the answer is on the same scale as the German
    # basket rather than on its own.
    "DE-UA": [
        ["обігрівач", "цвіль", "осушувач повітря"],
        ["обогреватель", "плесень", "осушитель воздуха"],
    ],
    # Grid-outage preparedness in the market we can actually bill (2026-09-17).
    # Asked to build for Ukraine, the measurable answer was no on every gate.
    # This tests whether the same PRODUCT knowledge — power stations, heating
    # when the grid is down — has demand in Germany, where the tag pays and the
    # site already has readers. Same anchor as everything else German.
    "DE-BLACKOUT": [
        ["stromausfall", "notstromaggregat", "powerstation"],
        ["blackout vorsorge", "heizen ohne strom", "notvorrat"],
    ],
    "DE-STORAGE": [
        ["balkonkraftwerk", "balkonspeicher", "stromspeicher"],
        ["balkonkraftwerk speicher", "steckersolar", "solaranlage balkon"],
        # The tenancy angle: the owner's point is that the 2024 law made this a
        # renter's decision rather than a landlord's. If that is real demand it
        # shows up in these three.
        ["balkonkraftwerk mieter", "balkonkraftwerk erlaubnis", "balkonkraftwerk anmelden"],
        ["anker solix", "zendure", "marstek"],
    ],
}


def market(geo):
    """Write data/seasonality-<geo>.json for one market's own winter basket.
    Run: python3 tools/fetch_seasonality.py --market GB"""
    from trendspy import Trends
    import pandas as pd
    anchor = MARKET_ANCHOR[geo]
    real_geo = MARKET_GEO.get(geo, geo)
    tr = Trends()
    series, errors = {}, []
    for i, batch in enumerate(MARKET_BATCHES[geo]):
        if i:
            time.sleep(GAP_S)
        terms = [anchor] + batch if anchor not in batch else batch
        try:
            df = tr.interest_over_time(terms, geo=real_geo, timeframe=TIMEFRAME)
            for c in df.columns:
                if c != "isPartial":
                    series[c] = df[c]
            print(f"{geo} batch {i}: ok ({', '.join(terms)})")
        except Exception as e:
            errors.append({"terms": terms, "error": str(e)[:200]})
            print(f"{geo} batch {i}: FAILED {str(e)[:120]}", file=sys.stderr)
    if not series:
        print("nothing fetched — keeping the previous file", file=sys.stderr)
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
        rows.append({"term": c, "sep": round(sep, 1),
                     "peak": round(float(s.max()), 1), "peak_month": int(s.idxmax()),
                     "winter_mean": round(winter, 1),
                     "win_over_sep": round(winter / sep, 2) if sep else None})
    rows.sort(key=lambda r: -r["peak"])
    path = os.path.join(ROOT, "data", f"seasonality-{geo.lower()}.json")
    doc = {"fetched": datetime.now(timezone.utc).strftime("%Y-%m-%d"), "geo": real_geo,
           "basket": geo,
           "timeframe": TIMEFRAME, "anchor": anchor,
           "scale_note": ("One market, its own language, every batch repeating the anchor "
                          "so the levels are comparable to each other. NOT comparable to "
                          "seasonality-de.json (different anchor) or to any rising file."),
           "weeks": int(df.shape[0]), "terms": rows, "errors": errors}
    with open(path, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, indent=1)
        f.write("\n")
    print(f"wrote {path}: {len(rows)} terms, {len(errors)} failed")
    return 0


def countries():
    """Write data/seasonality-by-country.json: per market, which product leads
    and in which month. Run: python3 tools/fetch_seasonality.py --countries"""
    from trendspy import Trends
    import pandas as pd
    tr = Trends()
    out, errors = {}, []
    for i, (geo, terms) in enumerate(GEO_PRODUCTS.items()):
        if i:
            time.sleep(GAP_S)
        try:
            df = tr.interest_over_time(terms, geo=geo, timeframe=TIMEFRAME)
            df.index = pd.to_datetime(df.index)
            m = df.groupby(df.index.month).mean()
            rows = []
            for c in df.columns:
                if c == "isPartial":
                    continue
                sr = m[c]
                rows.append({"term": c, "peak": round(float(sr.max()), 1),
                             "peak_month": int(sr.idxmax()),
                             "sep": round(float(sr.get(9, 0)), 1),
                             "winter_mean": round(float(sr.reindex([11, 12, 1, 2]).mean()), 1)})
            rows.sort(key=lambda r: -r["peak"])
            out[geo] = rows
            print(f"{geo}: ok — leader {rows[0]['term']} (peak month {rows[0]['peak_month']})")
        except Exception as e:
            errors.append({"geo": geo, "error": str(e)[:200]})
            print(f"{geo}: FAILED {str(e)[:110]}", file=sys.stderr)
    if not out:
        print("nothing fetched — keeping the previous file", file=sys.stderr)
        return 0
    path = os.path.join(ROOT, "data", "seasonality-by-country.json")
    doc = {"fetched": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
           "timeframe": TIMEFRAME,
           "scale_note": ("Each country is normalised against its OWN basket, in its own "
                          "language. Compare rank and peak month across countries; never "
                          "compare levels between countries."),
           "countries": out, "errors": errors}
    with open(path, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, indent=1)
        f.write("\n")
    print(f"wrote {path}")
    return 0


def main():
    if "--countries" in sys.argv:
        return countries()
    if "--market" in sys.argv:
        geo = sys.argv[sys.argv.index("--market") + 1].upper()
        if geo not in MARKET_BATCHES:
            print(f"no basket defined for {geo} — add one to MARKET_BATCHES", file=sys.stderr)
            return 1
        return market(geo)

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
