#!/usr/bin/env python3
"""/agi-odds-vs-evidence — 「赔率 vs 证据」第一期 (STRATEGY-2027 E2 独家格式)。

Prediction markets price ANNOUNCEMENT events; this site grades CAPABILITY
claims. The gap between the two numbers is the content. Odds snapshots MUST
carry their as-of date and never be presented as live; the evidence side reads
from data.json. Update cadence: weekly via the daily run (edit SNAPSHOT below
with a freshly verified number + date, then rerun).
"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gen_lib as g

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATE = "2026-08-08"          # issue #1 的发布日,不随复核变动
d = json.load(open(os.path.join(ROOT, "data.json")))
score = d["thesisTracker"]["score"]

# 赔率不再手写。odds-snapshot.json 由 .github/workflows/odds.yml 每周在 runner 上抓
# (沙箱够不到 gamma-api.polymarket.com,实测 000),自带 fetched ISO 时间戳。
# 抓不到就没有文件 → 这里直接报错退出,**绝不回落到上一次的数字冒充新鲜**。
SNAP_PATH = os.path.join(ROOT, "odds-snapshot.json")
if not os.path.exists(SNAP_PATH):
    sys.exit("odds-snapshot.json 不存在:先跑 .github/workflows/odds.yml。不编数字。")
_s = json.load(open(SNAP_PATH))
_prices = _s["outcomePrices"]
_outcomes = json.loads(_s["outcomes"]) if isinstance(_s["outcomes"], str) else _s["outcomes"]
_yes = float(_prices[_outcomes.index("Yes")])
_no = float(_prices[_outcomes.index("No")])
REVIEW_DATE = _s["fetched"][:10]
SNAPSHOT = {
    "market": _s["question"],
    "market_url": f"https://polymarket.com/event/{_s['slug']}",
    "no_pct": f"{_no*100:.0f}% No / {_yes*100:.0f}% Yes",
    "asof": f"machine-verified snapshot, {_s['fetched'][:19].replace('T',' ')} UTC · "
            f"${float(_s['volume']):,.0f} volume · market open",
}

capsule = ('<span class="verdict">Prediction markets and this scorecard are measuring different things — and the difference is the insight.</span> '
           f'Polymarket prices an <em>announcement</em> event; the scorecard grades a <em>capability</em> claim against pre-registered criteria. '
           f'Issue #1 of a running comparison: the market\'s AGI-by-2027 contract vs the Thesis Tracker\'s {score}/100 evidence read.')

body = f"""<h2>Issue #1 — {DATE}</h2>
<table><thead><tr><th></th><th>Prediction market</th><th>Evidence layer (this site)</th></tr></thead><tbody>
<tr><td><strong>Instrument</strong></td><td><a href="{SNAPSHOT['market_url']}" rel="nofollow">"{SNAPSHOT['market']}"</a> (Polymarket)</td><td><a href="/will-agi-arrive-2027">AGI-2027 verdict</a> + <a href="/progress-index">Thesis Tracker</a></td></tr>
<tr><td><strong>Question actually asked</strong></td><td>Will OpenAI <em>announce</em> it has achieved AGI before 2027?</td><td>Do models <em>do the work of an AI researcher</em> by end-2027 (Aschenbrenner's own bar)?</td></tr>
<tr><td><strong>Reading</strong></td><td>{SNAPSHOT['no_pct']} — {SNAPSHOT['asof']}</td><td>Verdict <strong class="v-open">Open</strong>; thesis at <strong>{score}/100</strong> (not a probability — a mean of 8 graded verdicts)</td></tr>
<tr><td><strong>Resolves on</strong></td><td>An announcement (with or without the capability)</td><td>Pre-registered capability criteria, deadline 2028-01-01 (<a href="/agi-2027-resolution">resolution page</a>)</td></tr>
</tbody></table>
<h2>Why the two numbers must not be conflated</h2>
<p>A lab could announce "AGI" for a system that cannot do autonomous research — the market contract could pay out while the capability verdict stays Open or resolves Wrong. The reverse is also possible: genuine research autonomy demonstrated without anyone using the word AGI. <strong>Markets are excellent at pricing events and incentives; a graded evidence ledger is what tells you whether the substance happened.</strong> Traders on these markets are, in effect, this site's target reader: the resolution criteria they need are the ones we pre-registered.</p>
<h2>Review log</h2>
<table><thead><tr><th>Date</th><th>Market side</th><th>Evidence side</th><th>Issue published?</th></tr></thead><tbody>
<tr><td class="nowrap">{REVIEW_DATE}</td><td><strong>First machine-verified reading</strong>: {SNAPSHOT['no_pct']}, ${float(_s['volume']):,.0f} volume. Issue #1 recorded «≈11% Yes» from a hand-copied snapshot with no exact timestamp, so the ~2pt drift toward No is <em>indicative, not a measured move</em> — the baseline was not precise enough to claim one.</td><td>No verdict change; tracker held at {score}/100</td><td><strong>No</strong> — a drift inside the noise of a vague prior baseline is not news. What changed is the <em>method</em>: odds are now fetched weekly on a runner and carry an ISO timestamp, so the next comparison will be measured rather than indicative.</td></tr>
<tr><td class="nowrap">2026-08-10</td><td>No further movement found beyond the issue #1 snapshot (~11% Yes)</td><td>No verdict change; tracker held at {score}/100</td><td><strong>No</strong> — nothing moved, so there was nothing to say</td></tr>
<tr><td class="nowrap">2026-08-08</td><td>Issue #1 snapshot recorded</td><td>Verdict Open; tracker {score}/100</td><td>Yes — issue #1</td></tr>
</tbody></table>
<p><strong>This series updates when something moves, not on a calendar.</strong> A weekly slot that must be filled produces filler; an evidence layer that publishes noise to look busy is worth less than one that publishes nothing and says so. Reviews happen weekly and are logged above either way — including the weeks the answer is "neither side moved". When a verdict actually flips, subscribers hear the same day, <em>before</em> they would read it in the odds.</p>
<p style="font-size:13px;color:var(--muted);">Odds snapshots are third-party market data quoted with their as-of date; this site takes no positions and this is not trading advice.</p>"""

faqs = [
    ("Is the Thesis Tracker score a probability of AGI?",
     f"No. {score}/100 is the mean of 8 graded verdict weights — an auditable evidence composite, not a forecast. Prediction-market prices are crowd probabilities of specific contract wordings. The two answer different questions."),
    ("Why compare them at all?",
     "Because the gap is informative. An announcement-priced market and a capability-graded ledger diverging tells you the crowd expects labeling to run ahead of substance (or behind it). Traders need pre-registered resolution criteria; that is exactly what this site publishes."),
    ("How current are the odds shown?",
     f"Each issue quotes a dated snapshot with a link to the live market — never a 'current' price. Since {REVIEW_DATE} the odds are fetched automatically once a week and carry an exact UTC timestamp and the market's traded volume, so a reading can no longer drift into being quoted as if it were live. The series is reviewed weekly but only publishes a new issue when one side actually moves; every review, including the quiet ones, is logged on the page."),
]
related = [("/agi-2027-resolution", "AGI-2027 resolution criteria & countdown"),
           ("/progress-index", "AGI-2027 Thesis Tracker"),
           ("/prediction-receipts", "Every dated AGI call, on the clock"),
           ("/calibration", "How we score our own predictions")]

html = g.build(
    slug="agi-odds-vs-evidence",
    title="AGI Odds vs Evidence: Markets Price Announcements",
    desc=f"Polymarket's AGI-by-2027 contract vs the evidence: the market prices an announcement, the scorecard grades capability ({score}/100). Issue #1 of a running comparison.",
    og_title="Odds vs evidence — what prediction markets and the scorecard each measure",
    eyebrow=f"Odds vs evidence · Issue #1 · reviewed {REVIEW_DATE}",
    h1="AGI odds vs evidence: the market prices announcements, we grade capability",
    capsule=capsule, body_html=body, faqs=faqs, related=related,
)
html = html.replace('"datePublished": "2026-06-30", "dateModified": "2026-06-30"',
                    f'"datePublished": "{DATE}", "dateModified": "{REVIEW_DATE}"')
open(os.path.join(ROOT, "agi-odds-vs-evidence.html"), "w").write(html)
print("agi-odds-vs-evidence.html written")
