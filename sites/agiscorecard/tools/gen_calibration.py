#!/usr/bin/env python3
"""/calibration — STRATEGY-2027 E2 引擎的地基页(v0, 2026-08-08)。

The evidence layer's own report card: every probability-shaped statement the
network makes, inventoried and pre-committed to public Brier scoring at n>=20.
All numbers here are real ledger numbers (SunWatch track record + red-team
survival odds + the 8 verdicts). NEVER pad n, NEVER show a curve before n>=20.
Rerun after any ledger change: python3 tools/gen_calibration.py
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gen_lib as g

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATE = "2026-08-08"

capsule = ('<span class="verdict">We score our own predictions in public — and the sample is still small.</span> '
           'This page inventories every probability-shaped claim the AGI Scorecard network makes '
           '(graded verdicts, an investing forecast ledger, red-team survival odds) and pre-commits to '
           'publishing a <strong>Brier score and calibration curve once scored calls reach n≥20</strong>. '
           'Until then we show the raw ledger and refuse to claim we are calibrated. '
           'We would rather show a small honest n than a big fake curve.')

body = f"""<h2>What we grade, today</h2>
<table><thead><tr><th>Ledger</th><th>Type</th><th>Current state (as of {DATE})</th></tr></thead><tbody>
<tr><td><a href="/situational-awareness-predictions">8 Situational Awareness verdicts</a></td><td>Categorical verdicts with pre-registered flip conditions</td><td>3 on track · 1 wrong · 2 open · 2 pending → <a href="/progress-index">Thesis Tracker 62.5/100</a></td></tr>
<tr><td><a href="https://invest.agiscorecard.com/track-record">SunWatch market-call ledger</a></td><td>Dated, falsifiable market calls</td><td>8 scored, 5 hits (62.5%). n=8 is small: the Wilson 95% interval is roughly 30–86%, so we treat this as a work-in-progress sample, not proof of skill.</td></tr>
<tr><td><a href="https://invest.agiscorecard.com/red-team">Red-team survival odds</a></td><td>Editorial probabilities (52–65%) on 6 open calls</td><td>Each survived multiple bull-vs-bear rounds; confidence cuts are published the day counter-evidence lands (e.g. space-top 60%→52% on Aug 8, 2026).</td></tr>
</tbody></table>
<h2>The commitment</h2>
<p>When the pool of <em>scored probability calls</em> reaches <strong>n≥20</strong>, this page will publish a Brier score and a calibration curve (stated probability vs realized frequency), recomputed on every ledger change — the same way the <a href="/progress-index">Thesis Tracker</a> recomputes on every verdict change. The forecast ledger is public and timestamped, so anyone can compute it before we do.</p>
<h2>Why this page exists</h2>
<p>Every AI-era answer engine can generate confident takes; almost none can show you a scored history. Being auditable — misses kept on the page next to hits, flip conditions registered before outcomes, probabilities graded against reality — is this network's entire moat. A calibration page is that moat made explicit: it is the one page a rival cannot copy without also copying two months of dated, falsifiable calls.</p>"""

faqs = [
    ("What is a Brier score?",
     "A measure of probability-forecast accuracy: the mean squared difference between stated probabilities and outcomes (0 = perfect, 0.25 = coin-flip guessing on binary events). We pre-commit to publishing ours once scored probability calls reach n≥20."),
    ("Why not publish a calibration curve now?",
     "The scored sample is 8 market calls plus 6 open odds — too small for a meaningful curve. Publishing one now would be theater. The raw ledgers are public and timestamped, so nothing is hidden in the meantime."),
    ("Who grades the calls?",
     "Outcomes are graded against pre-registered falsification conditions written before the outcome, with dated multi-source verification, and misses stay published with their lesson. The grading rules are public in the eight-layer method, including the red-team layer."),
]
related = [("/progress-index", "AGI-2027 Thesis Tracker"),
           ("/prediction-receipts", "Every dated AGI call, on the clock"),
           ("/forecaster-leaderboard", "Forecaster leaderboard")]

html = g.build(
    slug="calibration",
    title="Calibration: We Score Our Own Predictions in Public",
    desc="Every probability the AGI Scorecard network states, inventoried: 8 graded verdicts, an 8-call market ledger (5 hits, n small), red-team odds. Brier score published at n≥20.",
    og_title="Calibration — the evidence layer's own report card",
    eyebrow="Accountability",
    h1="Calibration: we score our own predictions in public",
    capsule=capsule, body_html=body, faqs=faqs, related=related,
)
html = html.replace('"datePublished": "2026-06-30", "dateModified": "2026-06-30"',
                    f'"datePublished": "{DATE}", "dateModified": "{DATE}"')
open(os.path.join(ROOT, "calibration.html"), "w").write(html)
print("calibration.html written")
