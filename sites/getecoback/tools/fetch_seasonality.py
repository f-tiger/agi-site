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
between batches. Since 2026-09-24 the DEFAULT German basket (not --market,
not --countries) refreshes itself once a month: eco-trends.yml calls it daily
with `--if-older-than 28`, which exits in under a second unless the file is at
least 28 days old. No new cron, and it runs AFTER the rising fetch in the same
job so the daily rising quota is spent first. Cost: ~5 runner minutes a month.

Two things a monthly refresh needs that a hand run did not:
  * Batches are RESCALED onto batch 0 through the anchor (factor = sum of the
    anchor in batch 0 / sum of the anchor in batch i, over their common weeks).
    Until 2026-09 this was implicit: heizlüfter's autumn-2022 energy-crisis
    spike is the single highest week in every batch, so every batch happened
    to share a 100. That spike leaves the five-year window in autumn 2027, and
    from then on an un-rescaled file would silently mix scales. The factors are
    written to the output so a drift is visible, not inferred.
  * Keep-last-good per TERM: a batch that fails no longer drops its terms from
    the file. The previous row is carried with `carried_from: <date>`, because
    the season calendar in the daily digest reads this file and a missing term
    would read as "no demand" rather than "not measured this month".

Run: python3 tools/fetch_seasonality.py [--out data/seasonality-de.json] [--if-older-than 28]
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
    # Energy hardware, asked 2026-09-17 ("是不是热泵/充电桩也是德语区重点").
    # Measured rather than argued, and balkonkraftwerk is in the batch as a
    # CONTROL, not a candidate: the site already ranks for it — growatt-noah-2000-
    # probleme drew 26 real German readers with referrers in 28 days — so it says
    # what "big enough for this site" looks like on this scale. Without it,
    # wärmepumpe and wallbox are just two numbers with nothing to sit against.
    #
    # What the numbers cannot settle, so don't let them:
    #   · wärmepumpe — the installed Luft-Wasser kind is a €10-30k capital good
    #     bought through a Handwerker with BAFA/KfW paperwork, i.e. not an
    #     affiliate product at all; and its lead-gen form was killed 2026-08-28
    #     for needing Hauseigentümer while this site's readers are Mieter. The
    #     Amazon-buyable slice is Luft-Luft, which the site already covers at
    #     /guide/klimaanlage-mit-heizfunktion.html. A high number here would mean
    #     "more heating content", never "sell heat pumps".
    #   · wallbox — genuinely buyable on amazon.de and a far higher ticket than a
    #     dehumidifier, but skews Hauseigentümer, and its commission rate is in
    #     the Vergütungskatalog behind the Associates login. Nobody should quote
    #     that rate from memory into a money decision.
    ["wärmepumpe", "wallbox", "balkonkraftwerk"],
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
MARKET_ANCHOR = {"GB": "dehumidifier", "DE-STORAGE": "heizlüfter", "DE-UA": "heizlüfter", "DE-BLACKOUT": "heizlüfter",
                 "AT": "heizlüfter", "DE-QUEUE": "heizlüfter"}
# A market key is not always a geo. DE-STORAGE measures German storage demand
# against the SAME anchor as seasonality-de.json, so its levels are directly
# comparable to the rest of the German basket — which is the only way to answer
# "is storage actually bigger than what we already sell" rather than "is storage
# big on its own scale".
MARKET_GEO = {"DE-STORAGE": "DE", "DE-UA": "DE", "DE-BLACKOUT": "DE", "DE-QUEUE": "DE"}
MARKET_BATCHES = {
    # The expansion queue's own terms (2026-09-24, data/expansion-queue.json).
    # Pages get built from SERP + cannibalisation evidence when the term has no
    # Trends number yet; this basket gives each of them one afterwards, on the
    # same anchor and scale as seasonality-de.json. eco-trends.yml refreshes it
    # monthly with the German file. When the queue changes, change this list —
    # a queued term without a measurement is the gap this basket exists to close.
    "DE-QUEUE": [
        # Built 2026-09-24, tracked so their bets can be read against demand.
        # "beheizt" and "beheizbar" were both measured on the first run and
        # both sit at the floor (as do "elektrischer" and "heizwäscheständer",
        # own batch against "wäscheständer"): one spelling is enough to watch.
        ["beheizter wäscheständer", "infrarotheizung thermostat", "fenster beschlagen außen"],
        # Queued or rejected. "hygrometer kalibrieren" read 0,0 on the first
        # run; the reader's words are "luftfeuchtigkeit messen", which is what
        # the queued hygrometer item was retargeted to.
        ["luftfeuchtigkeit messen", "heizlüfter riecht", "heizkörper entlüften"],
    ],
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
    # Austria (2026-09-18). Third market by human page views (26/28d) and the
    # only non-German one that clicks amazon.de links at the German rate — every
    # one of those views landed on a German page, because the site has never
    # carried an Austrian page. Same anchor as the German basket; levels are
    # only comparable INSIDE this file (Trends normalises per geo), so read the
    # ranking and the peak month, never the absolute against seasonality-de.
    "AT": [
        # The shelf, in the words Austrians use. "Klimagerät" is the Austrian
        # retail term; if it outranks "Klimaanlage" here, the DE pages are
        # mis-titled for this market.
        ["klimaanlage", "klimagerät", "mobile klimaanlage"],
        ["schimmel", "luftentfeuchter", "infrarotheizung"],
        # What is specifically Austrian: the price is set by other rules
        # (E-Control, not EEX/Netzentgelte), heating subsidies are a Land
        # matter, and tenancy law is the MRG not the BGB.
        ["strompreis", "heizkostenzuschuss", "stromkosten"],
        ["klimaanlage mietwohnung", "balkonkraftwerk", "ölradiator"],
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
    Run: python3 tools/fetch_seasonality.py --market GB [--if-older-than 28]
    Same rescale and keep-last-good rules as the main German basket."""
    path = os.path.join(ROOT, "data", f"seasonality-{geo.lower()}.json")
    if "--if-older-than" in sys.argv:
        days = int(sys.argv[sys.argv.index("--if-older-than") + 1])
        if is_fresh(path, days):
            print(f"{os.path.relpath(path, ROOT)} is younger than {days} days — nothing to do")
            return 0
    from trendspy import Trends
    import pandas as pd
    anchor = MARKET_ANCHOR[geo]
    real_geo = MARKET_GEO.get(geo, geo)
    try:
        previous = json.load(open(path, encoding="utf-8"))
    except Exception:
        previous = None
    tr = Trends()
    frames, errors, failed_terms = [], [], []
    for i, batch in enumerate(MARKET_BATCHES[geo]):
        if i:
            time.sleep(GAP_S)
        terms = [anchor] + batch if anchor not in batch else batch
        try:
            df = tr.interest_over_time(terms, geo=real_geo, timeframe=TIMEFRAME)
            df.index = pd.to_datetime(df.index)
            df = df[~df.index.duplicated()]
            frames.append((terms, df))
            print(f"{geo} batch {i}: ok ({', '.join(terms)})")
        except Exception as e:
            errors.append({"terms": terms, "error": str(e)[:200]})
            failed_terms += [t for t in batch if t != anchor]
            print(f"{geo} batch {i}: FAILED {str(e)[:120]}", file=sys.stderr)
    if not frames:
        print("nothing fetched — keeping the previous file", file=sys.stderr)
        return 0
    series, factors, rs_errors = rescale_batches(frames, anchor)
    errors += rs_errors
    failed_terms += [t for e in rs_errors for t in e["terms"] if t != anchor]
    df = pd.DataFrame(series)
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
    rows = carry_forward(rows, previous, failed_terms)
    rows.sort(key=lambda r: -r["peak"])
    doc = {"fetched": datetime.now(timezone.utc).strftime("%Y-%m-%d"), "geo": real_geo,
           "basket": geo,
           "timeframe": TIMEFRAME, "anchor": anchor,
           "scale_note": ("One market, its own language, every batch repeating the anchor and "
                          "rescaled onto batch 0 through it (anchor_factors). A basket on the "
                          "heizlüfter anchor in geo DE shares the scale of seasonality-de.json; "
                          "any other geo or anchor does not. Never compare with a rising file."),
           "anchor_factors": factors,
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


def rescale_batches(frames, anchor):
    """Put every batch on batch 0's scale through the shared anchor.

    frames: list of (terms, DataFrame) in request order, each containing
    `anchor`. Returns (series: dict term -> Series, factors: list, errors:
    list). A batch whose anchor sums to zero over the common weeks cannot be
    placed on the scale and is reported as an error rather than guessed.
    Kept free of any network or Trends import so it can be tested offline.
    """
    series, factors, errors = {}, [], []
    ref = None
    for terms, df in frames:
        a = df[anchor].astype(float)
        if ref is None:
            ref, f = a, 1.0
        else:
            common = ref.index.intersection(a.index)
            denom = float(a.loc[common].sum())
            f = float(ref.loc[common].sum()) / denom if denom else None
        factors.append({"terms": terms, "factor": None if f is None else round(f, 4)})
        if f is None:
            errors.append({"terms": terms, "error": "anchor is zero in this batch — cannot rescale"})
            continue
        for c in df.columns:
            if c in ("isPartial", anchor):
                continue
            series[c] = df[c].astype(float) * f
    if ref is not None:
        series[anchor] = ref
    return series, factors, errors


def carry_forward(rows, previous, failed_terms):
    """Keep-last-good per term: terms of a failed batch keep last month's row."""
    have = {r["term"] for r in rows}
    prev_rows = {r["term"]: r for r in (previous or {}).get("terms", [])}
    when = (previous or {}).get("fetched")
    for t in failed_terms:
        if t in have or t not in prev_rows:
            continue
        r = dict(prev_rows[t])
        r["carried_from"] = r.get("carried_from") or when
        rows.append(r)
    return rows


def is_fresh(path, days, today=None):
    """True when `path` was fetched fewer than `days` days ago."""
    try:
        doc = json.load(open(path, encoding="utf-8"))
        fetched = datetime.strptime(doc["fetched"], "%Y-%m-%d").date()
    except Exception:
        return False
    today = today or datetime.now(timezone.utc).date()
    return (today - fetched).days < days


def main():
    if "--countries" in sys.argv:
        return countries()
    if "--market" in sys.argv:
        geo = sys.argv[sys.argv.index("--market") + 1].upper()
        if geo not in MARKET_BATCHES:
            print(f"no basket defined for {geo} — add one to MARKET_BATCHES", file=sys.stderr)
            return 1
        return market(geo)

    out = sys.argv[sys.argv.index("--out") + 1] if "--out" in sys.argv else OUT
    # The age check comes before the imports on purpose: on 27 days out of 28
    # the workflow step should cost a second, not a pandas import.
    if "--if-older-than" in sys.argv:
        days = int(sys.argv[sys.argv.index("--if-older-than") + 1])
        if is_fresh(out, days):
            print(f"{os.path.relpath(out, ROOT)} is younger than {days} days — nothing to do")
            return 0
    try:
        from trendspy import Trends
        import pandas as pd
    except ImportError:
        print("needs: pip install trendspy pandas", file=sys.stderr)
        return 1

    try:
        previous = json.load(open(out, encoding="utf-8"))
    except Exception:
        previous = None
    tr = Trends()
    frames, errors, failed_terms = [], [], []

    for i, batch in enumerate(BATCHES):
        if i:
            time.sleep(GAP_S)
        terms = [ANCHOR] + batch if ANCHOR not in batch else batch
        try:
            df = tr.interest_over_time(terms, geo=GEO, timeframe=TIMEFRAME)
            df.index = pd.to_datetime(df.index)
            df = df[~df.index.duplicated()]
            frames.append((terms, df))
            print(f"batch {i}: ok ({', '.join(terms)})")
        except Exception as e:  # recorded, never silently dropped
            errors.append({"terms": terms, "error": str(e)[:200]})
            failed_terms += [t for t in batch if t != ANCHOR]
            print(f"batch {i}: FAILED {str(e)[:120]}", file=sys.stderr)

    if not frames:
        print("nothing fetched — keeping the previous file (keep-last-good)", file=sys.stderr)
        return 0
    series, factors, rs_errors = rescale_batches(frames, ANCHOR)
    errors += rs_errors
    failed_terms += [t for e in rs_errors for t in e["terms"] if t != ANCHOR]

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
    rows = carry_forward(rows, previous, failed_terms)
    rows.sort(key=lambda r: -r["peak"])

    doc = {
        "fetched": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "geo": GEO,
        "timeframe": TIMEFRAME,
        "anchor": ANCHOR,
        "scale_note": ("Google Trends normalises within a comparison. Values here are "
                       "comparable to each other because every batch repeats the anchor "
                       "and is rescaled onto batch 0 through it (see anchor_factors); "
                       "they are NOT comparable to trends-rising.json, which reports "
                       "percentage growth on an unknown base."),
        "anchor_factors": factors,
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
