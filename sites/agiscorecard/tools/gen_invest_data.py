# -*- coding: utf-8 -*-
"""Generate /invest-data.json — the machine-readable Invest dataset (PRD P5).

Why this file exists: original data is the site's strongest citation magnet
(data.json proved it). The Invest section holds three things nobody else
publishes together — the eight legends' AI stance as filed, a 17-ticker map from
each company to the eight graded predictions, and the filing-day-priced
copy-homework readings. Until now all three lived only inside HTML.

The zero-fabrication rule shapes the whole design: NOTHING here is typed in.
Every field is read out of an existing authoritative in-repo surface, and if a
source cannot be parsed the script EXITS NON-ZERO rather than emitting a stale
or guessed number. A dataset published to be cited must break loudly, not quietly
drift — a wrong number here would be repeated by machines.

Sources, in order of authority:
  data.json               -> the eight verdicts, their weights, the Tracker score
  tools/gen_agi_exposure  -> the 17-ticker editorial mapping (labelled editorial)
  invest/<slug>.html      -> the investors with line-by-line 13F holdings, read
                             from the LIVE pages and not from their generator:
                             tools/gen_invest_profiles.py still holds Q1 2026
                             data while the pages were hand-updated to Q2, so
                             importing it both rolls the pages back a quarter
                             (it writes on import) and would put stale holdings
                             in a file published to be cited. Discovered
                             2026-09-04 while building this script.
  invest.html             -> the 8-stance table and the copy-homework readings,
                             both of which are hand-authored there and carry the
                             quarterly 13F sync obligation recorded in CLAUDE.md

Run it in any commit that changes a verdict, alongside gen_index / gen_badges /
gen_agi_exposure — the same propagation chain. Adding it there is the point:
the paid tier is "get told the day the score moves", worth nothing if the
machine-readable copy still says the old thing.
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "tools"))

from gen_agi_exposure import TICKERS, VERDICT_WEIGHT, PRED_LABEL  # noqa: E402


def die(msg):
    sys.stderr.write("gen_invest_data: " + msg + "\n")
    sys.exit(1)


def read(path):
    with open(os.path.join(ROOT, path), encoding="utf-8") as f:
        return f.read()


html = read("invest.html")

# ---- the eight stances, parsed out of the table that carries the sync obligation
ROW = re.compile(
    r"<tr><td><strong>([^<]+)</strong></td>"
    r"<td>([^<]+)</td>"
    r'<td><span class="chip (\w+)">([^<]+)</span></td>'
    r"<td>(.*?)</td></tr>",
    re.S,
)
stances = []
for m in ROW.finditer(html):
    stances.append({
        "investor": m.group(1).strip(),
        "firm": m.group(2).replace("&amp;", "&").strip(),
        "stance": m.group(4).strip(),
        "note": re.sub(r"<[^>]+>", "", m.group(5)).replace("&amp;", "&").replace("&mdash;", "—").strip(),
    })
if len(stances) != 8:
    die("expected 8 stance rows in invest.html, parsed %d — refusing to publish a partial dataset" % len(stances))

FILED = re.search(r"Q2 2026 SEC 13F filings \(holdings as of ([^,]+), filed ([^)]+)\)", html)
if not FILED:
    die("could not find the 13F as-of/filed line in invest.html")

# ---- copy-homework readings: filing-day pricing, the section's one original backtest
CH = re.search(
    r"As of (\d{4}-\d{2}-\d{2}), over (\d+) rebalances since ([A-Z][a-z]+ \d{4}): "
    r"Druckenmiller <strong>\+([\d.]+)%</strong>, Cathie Wood \+([\d.]+)%, Tepper \+([\d.]+)%, "
    r"against QQQ \+([\d.]+)% over the same window &mdash; while Buffett's AI sleeve returned \+([\d.]+)%",
    html,
)
if not CH:
    die("could not parse the copy-homework readings in invest.html — they carry a quarterly sync obligation, so a parse failure means the shape changed and this script must be updated in the same run")

copy_homework = {
    "asOf": CH.group(1),
    "rebalances": int(CH.group(2)),
    "since": CH.group(3),
    "method": "Each basket is bought at the CLOSE OF ITS FILING DATE and held to the next filing — a 13F is public ~45 days late, so quarter-end pricing assumes a price nobody could have traded.",
    "scope": "AI-related holdings only, re-weighted as filed. Not these managers' whole-portfolio returns. 13F does not show shorts or option hedges; which names count as 'AI' is this site's editorial judgement.",
    "returns": [
        {"investor": "Stanley Druckenmiller", "pct": float(CH.group(3 + 1))},
        {"investor": "Cathie Wood", "pct": float(CH.group(5))},
        {"investor": "David Tepper", "pct": float(CH.group(6))},
        {"investor": "Warren Buffett", "pct": float(CH.group(8)), "note": "lagged the benchmark"},
    ],
    "benchmark": {"name": "QQQ", "pct": float(CH.group(7)), "window": "same window, per-leg compounded"},
    "source": "https://compass.agiscorecard.com/en/track-record",
}

# ---- verdicts and weights, straight from the published dataset
data = json.loads(read("data.json"))
preds = data.get("predictions") or []
if len(preds) != 8:
    die("data.json does not hold 8 predictions (found %d)" % len(preds))

predictions = []
for p in preds:
    v = p.get("verdict")
    if v not in VERDICT_WEIGHT:
        die("unknown verdict %r for prediction %r — weight table and data.json disagree" % (v, p.get("id")))
    predictions.append({
        "id": p.get("id"),
        "label": PRED_LABEL.get(p.get("id"), (p.get("id"), ""))[0],
        "verdict": v,
        "weight": VERDICT_WEIGHT[v],
        "sources": p.get("sources") or [],
    })

# ---- the ticker map: an ARGUMENT about what each valuation rides on, not a data claim
tickers = []
for t in TICKERS:
    tickers.append({
        "ticker": t["t"],
        "name": t["n"],
        "coverage": t["cov"],
        "rationale": t["en"],
        "links": [
            {"prediction": pid, "weight": w, "direction": "pays off if the prediction HOLDS" if d > 0 else "pays off if the prediction FAILS"}
            for (pid, w, d) in t["links"]
        ],
    })

# ---- investors with line-by-line filings, parsed from the LIVE pages
# NOT from tools/gen_invest_profiles.py: that generator is a quarter behind the
# pages (Q1 2026 vs the Q2 filing the pages now carry) and it writes on import,
# so touching it silently rolls both pages back. The pages are the truth here.
HOLD = re.compile(
    r'<tr><td class="tk">([A-Z.]+)</td><td>([^<]+)</td>'
    r'<td><span class="act (\w+)">([^<]+)</span></td><td>(.*?)</td></tr>',
    re.S,
)
UPDATED = re.compile(
    r'<div class="updated">Holdings as of (\d{4}-\d{2}-\d{2}) '
    r'\((Q\d \d{4}) 13F, filed (\d{4}-\d{2}-\d{2})\)'
)
H1 = re.compile(r"<h1>([^<:]+): the AI positioning</h1>")

profiles = []
for fn in sorted(os.listdir(os.path.join(ROOT, "invest"))):
    if not fn.endswith(".html"):
        continue
    page = read(os.path.join("invest", fn))
    slug = fn[:-5]
    nm, up = H1.search(page), UPDATED.search(page)
    if not nm or not up:
        die("invest/%s does not carry the expected <h1> / holdings-as-of line; a template change means this script must be updated in the same run" % fn)
    rows = [{"ticker": m.group(1), "name": m.group(2).strip(),
             "action": m.group(4).strip(),
             "note": re.sub(r"<[^>]+>", "", m.group(5)).replace("&amp;", "&").replace("&mdash;", "\u2014").strip()}
            for m in HOLD.finditer(page)]
    if not rows:
        die("invest/%s parsed zero holdings — refusing to publish an investor with an empty book" % fn)
    profiles.append({
        "slug": slug,
        "name": nm.group(1).strip(),
        "holdingsAsOf": up.group(1),
        "quarter": up.group(2),
        "filedOn": up.group(3),
        "url": "https://agiscorecard.com/invest/" + slug,
        "holdings": rows,
    })
if not profiles:
    die("no investor profile pages found under invest/")

out = {
    "name": "AGI Scorecard — Invest dataset",
    "url": "https://agiscorecard.com/invest-data.json",
    "license": "CC BY 4.0 — cite agiscorecard.com/invest",
    "dateModified": data.get("dateModified"),
    "about": "How the eight graded Situational Awareness predictions map onto listed AI equities, how eight well-known investors are actually positioned per their public SEC 13F filings, and what copying them would have returned when priced on the filing date rather than at quarter end.",
    "notInvestmentAdvice": "Educational information built from public SEC 13F filings and public statements. Holdings are quarterly snapshots and may not reflect current positions. Nothing here is a recommendation to buy or sell any security, and this site never judges whether a price is cheap or expensive.",
    "thesisTracker": {
        "score": (data.get("thesisTracker") or {}).get("score"),
        "scale": "0–100, the mean of the eight verdict weights below",
        "url": "https://agiscorecard.com/progress-index",
    },
    "predictions": predictions,
    "filings": {
        "quarter": "Q2 2026",
        "holdingsAsOf": FILED.group(1).strip(),
        "filedOn": FILED.group(2).strip(),
        "note": "Line-by-line positions come only from 13F filings. A manager's qualitative commentary is NEVER recorded as a holding.",
    },
    "investorStances": stances,
    "investorProfiles": profiles,
    "tickerMap": {
        "disclaimer": "The ticker-to-prediction mapping is editorial: it is an argument about what each company's AI valuation rides on, not a measured quantity. It is the part a reader should push back on. Weights sum to 1 within each ticker.",
        "tool": "https://agiscorecard.com/ai-stock-exposure",
        "tickers": tickers,
    },
    "copyHomework": copy_homework,
    "provenance": "Generated by tools/gen_invest_data.py from data.json, invest.html and the section's page generators. Nothing in this file is hand-typed; the generator exits non-zero rather than publish a number it could not read from a source.",
}

path = os.path.join(ROOT, "invest-data.json")
with open(path, "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, indent=1)
    f.write("\n")
print("wrote invest-data.json — %d predictions, %d stances, %d profiles, %d tickers" % (
    len(predictions), len(stances), len(profiles), len(tickers)))
