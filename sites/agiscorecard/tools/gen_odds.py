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

# The ledger ACCUMULATES. This generator used to rebuild the page from the single
# latest snapshot, which silently deleted every past issue — issue #2 (2026-08-31)
# survived only because it had been hand-written into the HTML. Readings now live in
# odds-history.json and every row below is rendered from it, so a run can no longer
# lose history. (Standing rule: 台账不删失误.)
HIST_PATH = os.path.join(ROOT, "odds-history.json")
HISTORY = json.load(open(HIST_PATH)) if os.path.exists(HIST_PATH) else []
if not any(h["date"] == REVIEW_DATE for h in HISTORY):
    HISTORY.append({"date": REVIEW_DATE, "fetched": _s["fetched"], "yes": round(_yes, 4),
                    "no": round(_no, 4), "volume": round(float(_s["volume"])),
                    "tracker": score, "verdict": "Open"})
    HISTORY.sort(key=lambda h: h["date"])
    json.dump(HISTORY, open(HIST_PATH, "w"), indent=2, ensure_ascii=False)
    open(HIST_PATH, "a").write("\n")
ISSUE = len(HISTORY)
PREV = HISTORY[-2] if len(HISTORY) > 1 else None
SNAPSHOT = {
    "market": _s["question"],
    "market_url": f"https://polymarket.com/event/{_s['slug']}",
    "no_pct": f"{_no*100:.0f}% No / {_yes*100:.0f}% Yes",
    "asof": f"machine-verified snapshot, {_s['fetched'][:19].replace('T',' ')} UTC · "
            f"${float(_s['volume']):,.0f} volume · market open",
}

def _pct(x): return f"{x*100:.0f}%"

if PREV:
    _dy = (HISTORY[-1]["yes"] - PREV["yes"]) * 100
    _dv = HISTORY[-1]["volume"] - PREV["volume"]
    _mult = (HISTORY[-1]["yes"] / PREV["yes"]) if PREV["yes"] else 0
    _dir = "toward Yes" if _dy > 0 else ("toward No" if _dy < 0 else "flat")
    MOVE_HTML = f"""<h2>What moved since {PREV['date']}</h2>
<table><thead><tr><th></th><th>{PREV['fetched'][:19].replace('T',' ')} UTC</th><th>{HISTORY[-1]['fetched'][:19].replace('T',' ')} UTC</th><th>Change</th></tr></thead><tbody>
<tr><td><strong>Market: Yes</strong></td><td>{_pct(PREV['yes'])}</td><td><strong>{_pct(HISTORY[-1]['yes'])}</strong></td><td class="v-open">{_dy:+.0f} pt{f' ({_mult:.1f}x)' if _mult else ''}</td></tr>
<tr><td><strong>Market: No</strong></td><td>{_pct(PREV['no'])}</td><td>{_pct(HISTORY[-1]['no'])}</td><td>{-_dy:+.0f} pt</td></tr>
<tr><td><strong>Volume</strong></td><td>${PREV['volume']:,.0f}</td><td>${HISTORY[-1]['volume']:,.0f}</td><td>{_dv:+,.0f}</td></tr>
<tr><td><strong>Thesis Tracker</strong></td><td>{PREV['tracker']}/100</td><td>{HISTORY[-1]['tracker']}/100</td><td>{'<strong>unchanged</strong>' if PREV['tracker'] == HISTORY[-1]['tracker'] else 'changed'}</td></tr>
<tr><td><strong>AGI-2027 verdict</strong></td><td>{PREV['verdict']}</td><td>{HISTORY[-1]['verdict']}</td><td>{'unchanged' if PREV['verdict'] == HISTORY[-1]['verdict'] else 'changed'}</td></tr>
</tbody></table>
<p><strong>What it does and does not tell you.</strong> The contract resolves on an <em>announcement</em>, so a move {_dir} is a repricing of how likely traders think a <em>label</em> is — not evidence about capability. The evidence side did not move: the tracker held at {HISTORY[-1]['tracker']}/100 and the AGI-2027 verdict stayed {HISTORY[-1]['verdict']}. That divergence is the whole point of running the two side by side.</p>
<p><strong>Honest limits.</strong> One week is one data point, and a single market with ${HISTORY[-1]['volume']:,.0f} of volume is thin enough to move on modest flow. We do not know who traded or why.</p>
"""
else:
    MOVE_HTML = ""

LOG_ROWS = "\n".join(
    f'<tr><td class="nowrap">{h["date"]}</td>'
    f'<td>{_pct(h["no"])} No / <strong>{_pct(h["yes"])} Yes</strong>, ${h["volume"]:,.0f} volume '
    f'({h["fetched"][:19].replace("T", " ")} UTC)</td>'
    f'<td>Verdict {h["verdict"]}; tracker {h["tracker"]}/100</td>'
    f'<td>{"Yes — issue #%d" % (n + 1) if n > 0 else "<strong>No</strong> — first machine-verified baseline, nothing to compare against yet"}</td></tr>'
    for n, h in reversed(list(enumerate(HISTORY))))

capsule = ('<span class="verdict">Prediction markets and this scorecard are measuring different things — and the difference is the insight.</span> '
           f'Polymarket prices an <em>announcement</em> event; the scorecard grades a <em>capability</em> claim against pre-registered criteria. '
           f'Issue #{ISSUE} of a running comparison: the market\'s AGI-by-2027 contract vs the Thesis Tracker\'s {score}/100 evidence read.')

body = f"""<h2>Issue #{ISSUE} — {REVIEW_DATE}</h2>
<table><thead><tr><th></th><th>Prediction market</th><th>Evidence layer (this site)</th></tr></thead><tbody>
<tr><td><strong>Instrument</strong></td><td><a href="{SNAPSHOT['market_url']}" rel="nofollow">"{SNAPSHOT['market']}"</a> (Polymarket)</td><td><a href="/will-agi-arrive-2027">AGI-2027 verdict</a> + <a href="/progress-index">Thesis Tracker</a></td></tr>
<tr><td><strong>Question actually asked</strong></td><td>Will OpenAI <em>announce</em> it has achieved AGI before 2027?</td><td>Do models <em>do the work of an AI researcher</em> by end-2027 (Aschenbrenner's own bar)?</td></tr>
<tr><td><strong>Reading</strong></td><td>{SNAPSHOT['no_pct']} — {SNAPSHOT['asof']}</td><td>Verdict <strong class="v-open">Open</strong>; thesis at <strong>{score}/100</strong> (not a probability — a mean of 8 graded verdicts)</td></tr>
<tr><td><strong>Resolves on</strong></td><td>An announcement (with or without the capability)</td><td>Pre-registered capability criteria, deadline 2028-01-01 (<a href="/agi-2027-resolution">resolution page</a>)</td></tr>
</tbody></table>
{MOVE_HTML}<h2>Why the two numbers must not be conflated</h2>
<p>A lab could announce "AGI" for a system that cannot do autonomous research — the market contract could pay out while the capability verdict stays Open or resolves Wrong. The reverse is also possible: genuine research autonomy demonstrated without anyone using the word AGI. <strong>Markets are excellent at pricing events and incentives; a graded evidence ledger is what tells you whether the substance happened.</strong> Traders on these markets are, in effect, this site's target reader: the resolution criteria they need are the ones we pre-registered.</p>
<h2>Review log</h2>
<table><thead><tr><th>Date</th><th>Market side</th><th>Evidence side</th><th>Issue published?</th></tr></thead><tbody>
{LOG_ROWS}
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
    # 2026-08-25 retitle on trend evidence (trends-rising bootstrap): live US
    # autocomplete carries "agi timeline prediction market / polymarket / metaculus";
    # the old title ("AGI Odds vs Evidence: Markets Price Announcements") had neither
    # "timeline" nor "prediction market" phrasing. 44 chars, ≤60 rule holds.
    title="AGI Timeline: Prediction Markets vs Evidence",
    desc=f"Polymarket's AGI-by-2027 contract vs the evidence: the market prices an announcement, the scorecard grades capability ({score}/100). Issue #{ISSUE} of a running comparison.",
    og_title="Odds vs evidence — what prediction markets and the scorecard each measure",
    eyebrow=f"Odds vs evidence · Issue #{ISSUE} · reviewed {REVIEW_DATE}",
    h1="AGI odds vs evidence: the market prices announcements, we grade capability",
    capsule=capsule, body_html=body, faqs=faqs, related=related,
)
html = html.replace('"datePublished": "2026-06-30", "dateModified": "2026-06-30"',
                    f'"datePublished": "{DATE}", "dateModified": "{REVIEW_DATE}"')
# 可见日期必须与 JSON-LD dateModified 同步换,否则 validate 的一致性检查会拦
import datetime as _dt
_visible = _dt.date.fromisoformat(REVIEW_DATE).strftime("%B %-d, %Y")
html = html.replace("Last updated: June 30, 2026", f"Last updated: {_visible}")
# guard: the page must carry one review-log row per recorded reading. If a future
# edit ever makes the generator drop history again, this fails loudly instead of
# quietly shipping a shorter ledger.
for _h in HISTORY:
    assert _h["date"] in html, f"review log lost the {_h['date']} reading"
assert html.count('<tr><td class="nowrap">') >= len(HISTORY), "ledger shrank"
open(os.path.join(ROOT, "agi-odds-vs-evidence.html"), "w").write(html)
print("agi-odds-vs-evidence.html written")
