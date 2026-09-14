# -*- coding: utf-8 -*-
"""快反页(2026-09-14,站长指令:「Amodei最新的放缓ai研发文章作为热点加上」)。

选题依据不是猜的搜索需求,是**正在发生的新闻周期**:2026-09-12 Dario Amodei 发
《We Must Pace the Frontier》,同日 Sam Altman 在 X 上表态跟进。满屏都在报「CEO 说要放缓」,
所以复述新闻毫无价值——本站唯一能加的第三样东西是那个别人答不了的问题:
**这篇文章把八条判定里的哪一条动了?** 诚实的答案是「一条都没动」,而**说清楚为什么没动、
以及什么才算动了**,正是本站的资产。

零编造边界(这一页最关键的约束):
- 原文 darioamodei.com 与 CNN/Axios/NBC 今天在本沙箱**全部 EGRESS_BLOCKED**,
  两轮 WebSearch 摘要给出的核心句**措辞互相打架**(一个写 "We must slow the pace at which
  we improve the capabilities of AI models",另一个写 "We must slow down the pace at which
  we improve AI model capabilities")。**取不到原文就不印逐字引语**——本页一句直接引语都没有,
  只做转述并给出原文链接,让读者自己去核。这与 Metaculus 那页的处理一致。
- 只写多个独立来源一致的事实:标题、日期、三步结构、Anthropic 的单边承诺、Altman 同日跟进。
"""
import gen_lib as g

DATE = "2026-09-14"
g.DATE = DATE  # article/claimreview schema 的 datePublished/dateModified 都从这里取

capsule = (
    '<span class="verdict">No — as of September 14, 2026, none of the eight graded predictions moved.</span> '
    'On September 12 Anthropic CEO Dario Amodei published <em>We Must Pace the Frontier</em>, arguing the industry '
    'should deliberately slow how fast model capabilities advance; Sam Altman endorsed it the same day. '
    'This site grades <strong>evidence, not announcements</strong>. A stated intention to pace the frontier is not a '
    'measured change in the rate of capability gain, so the Thesis Tracker still reads <strong>62.5/100</strong>. '
    'What follows is the part the news coverage skips: exactly what would have to show up in the data for this to '
    'move a verdict.')

body = """<h2>What was actually proposed</h2>
<p>The essay is a three-part plan, and only the first part is something a single company can do alone. Summarised
rather than quoted — the full text is linked at the bottom, and you should read it there:</p>
<table><thead><tr><th>Step</th><th>Who has to act</th><th>Status as of 2026-09-14</th></tr></thead><tbody>
<tr><td>Give third-party evaluators permanent, employee-level access</td><td>One company, unilaterally</td><td class="nowrap v-ok">Committed — Anthropic, and OpenAI said it would match</td></tr>
<tr><td>Common safety standards and limits on unchecked capability gain among labs in democracies</td><td>Several companies together</td><td class="nowrap v-open">Proposed only</td></tr>
<tr><td>Narrow prohibitions agreed with authoritarian governments, starting with bioweapons</td><td>Governments</td><td class="nowrap v-open">Proposed only</td></tr>
</tbody></table>
<p>Step one is real and verifiable: an outside organisation with a badge and a laptop either has that access or it
does not. Steps two and three are, today, a proposal — and the honest way to record a proposal is as a proposal.</p>

<h2>Which of the eight predictions this bears on</h2>
<p>The scorecard grades eight claims from <em>Situational Awareness</em>. A deliberate industry slowdown would be the
first <em>endogenous</em> reason for the fast-timeline predictions to fail — every previous candidate was a technical
wall. Here is where it touches, and what would actually have to change:</p>
<table><thead><tr><th>Prediction</th><th>Verdict today</th><th>What a real slowdown would look like here</th></tr></thead><tbody>
<tr><td>Compute scales ~0.5 OOM/yr</td><td class="nowrap v-ok">On track</td><td>Effective compute growth falls below trend for consecutive quarters — not a pledge, a measured rate</td></tr>
<tr><td>AGI by 2027</td><td class="nowrap v-open">Open</td><td>Frontier releases are spaced further apart <em>and</em> capability benchmarks flatten with them</td></tr>
<tr><td>Intelligence explosion 2027–29</td><td class="nowrap v-pending">Pending</td><td>Recursive self-improvement is the essay's stated trigger; a limit that binds would show up as slower model-on-model gains</td></tr>
<tr><td>Trillion-dollar capex</td><td class="nowrap v-ok">Exceeded</td><td>Capex guidance cut, not merely capability pacing — no lab has signalled this</td></tr>
<tr><td>Outpace grads on knowledge work</td><td class="nowrap v-ok">On track</td><td>Unaffected: pacing future training does not retract deployed capability</td></tr>
<tr><td>Open source fades</td><td class="nowrap v-wrong">Wrong</td><td>Unaffected — and a pact among frontier labs does not bind open-weight releases, which is the gap in step two</td></tr>
</tbody></table>

<h2>The part worth arguing about</h2>
<p>A pacing agreement among a handful of labs in democracies has an obvious hole, and it is the same hole that already
made one of these eight predictions <a href="/did-open-source-ai-fade">go the other way</a>: open-weight models are
released by parties who are not at the table. If the frontier paces itself and open weights keep improving, the gap
narrows from below rather than the frontier stalling from above. That is not an argument against pacing — it is the
reason step two, on its own, cannot be scored as a slowdown.</p>

<h2>What would move a verdict</h2>
<p>Pre-registered, so it can be checked later rather than rationalised:</p>
<ul>
<li><strong>Evaluator access becomes observable</strong> — a third party publishes findings from that access. Verifies step one; changes no verdict by itself.</li>
<li><strong>Release cadence stretches</strong> — the interval between frontier releases grows and benchmark gains flatten with it, for two consecutive quarters. This is what would put <em>AGI by 2027</em> under pressure.</li>
<li><strong>A named capability limit is published and held</strong> by more than one lab. Without a number, step two is unscoreable.</li>
</ul>
<p>None of the three has happened. Until one does, this is a change in what the industry says about itself, which is
worth reading, and not yet a change in what the evidence says.</p>
"""

faqs = [
    ("Does Amodei's slowdown essay change the odds of AGI by 2027?",
     "Not yet. As of September 14, 2026 none of the eight graded predictions moved and the Thesis Tracker still reads 62.5/100. The essay states an intention to pace capability growth; the scorecard grades measured evidence, and no measured rate has changed."),
    ("What did Dario Amodei actually propose?",
     "A three-part plan published September 12, 2026: give third-party evaluators permanent employee-level access; agree common safety standards and limits on unchecked capability gain among labs in democracies; and negotiate narrow prohibitions with authoritarian governments, starting with bioweapons."),
    ("Did OpenAI agree?",
     "Sam Altman endorsed the essay the same day and said OpenAI would also give independent evaluators employee-like access. That matches step one, the unilateral part. Steps two and three remain proposals."),
    ("Is the AI industry actually slowing down?",
     "No measurement shows it. Compute is still scaling at roughly 0.5 orders of magnitude per year and capex has exceeded the original forecast. A slowdown would show as release cadence stretching and benchmark gains flattening together, for consecutive quarters — which has not happened."),
    ("Why doesn't an announcement move a verdict on this site?",
     "Because every verdict has a published flip condition tied to observable evidence. If statements of intent could move the score, the score would track press releases rather than capability, and its history would stop being auditable."),
]

related = [
    ("/dario-amodei-agi-prediction", "Dario Amodei's AGI prediction"),
    ("/how-fast-is-ai-improving", "How fast is AI actually improving?"),
    ("/did-open-source-ai-fade", "Did open source AI fade?"),
    ("/progress-index", "The AGI-2027 Thesis Tracker"),
    ("/agi-questions", "Browse all AGI questions"),
]

html = g.build(
    slug="does-ai-slowdown-change-agi-2027",
    title="Does Amodei's AI slowdown change the 2027 AGI odds?",
    desc="Amodei asked the industry to pace the frontier on Sept 12, 2026. Graded against the eight predictions: no verdict moved — and what would move one.",
    og_title="Does Amodei's AI slowdown change the 2027 AGI odds?",
    eyebrow="Rapid response",
    h1="Does Amodei's AI slowdown change the 2027 AGI odds?",
    capsule=capsule,
    body_html=body,
    faqs=faqs,
    related=related,
)

# ---- 模板补齐(gen_lib 的骨架缺这几件,而站规每一件都是硬要求) ----
import json as _json, re as _re

t = _json.load(open(g.OUT + "/data.json", encoding="utf-8"))
tracker = t["thesisTracker"]
score = str(int(tracker["score"])) if float(tracker["score"]) == int(tracker["score"]) else str(tracker["score"])
as_of = tracker["asOf"]
open_n = sum(1 for x in t["predictions"] if (x.get("verdict") or "") in ("Open", "Pending"))
# 页面正文里写死的那些判定,必须和 data.json 对得上,否则这页第一天就在说假话
for _id, _v in [("compute-scaling", "On track"), ("agi-2027", "Open"), ("capex", "Exceeded"),
                ("open-source-fades", "Wrong"), ("intelligence-explosion", "Pending"),
                ("knowledge-work", "On track")]:
    _got = next(x["verdict"] for x in t["predictions"] if x["id"] == _id)
    assert _got == _v, "%s: 正文写 %s,data.json 是 %s" % (_id, _v, _got)
assert score == "62.5", score

# 可见日期(模板把 2026-06-30 写死了)
html = html.replace("Last updated: June 30, 2026 · Updated as verdicts change",
                    "Last updated: September 14, 2026 · Updated as verdicts change")

# byline(E-E-A-T,站规要求每页都有)
html = html.replace('  <div class="capsule">',
    '  <div class="byline" style="font-size:12px;color:var(--muted);margin:-0.9rem 0 1.5rem;">'
    'By the AGI Scorecard team · <a href="/about">methodology &amp; independence</a></div>\n  <div class="capsule">', 1)

# BreadcrumbList
crumb = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
    {"@type": "ListItem", "position": 1, "name": "AGI Scorecard", "item": "https://agiscorecard.com/"},
    {"@type": "ListItem", "position": 2, "name": "AGI questions, answered", "item": "https://agiscorecard.com/agi-questions"},
    {"@type": "ListItem", "position": 3, "name": "Does Amodei's AI slowdown change the 2027 AGI odds?",
     "item": "https://agiscorecard.com/does-ai-slowdown-change-agi-2027"}]}
html = html.replace("</head>", '<script type="application/ld+json">'
                    + _json.dumps(crumb, ensure_ascii=False) + "</script>\n</head>", 1)

# 活数字钩(清单第 ⑥ 条)。数值由 tools/sync_live_hooks.py 统一同步,validate.py 有闸门。
hook = ('<div style="margin:0 0 1.6rem;background:var(--bg2);border:1px solid var(--border2);'
        'border-left:3px solid var(--accent);border-radius:0 12px 12px 0;padding:14px 18px;">\n'
        '  <div style="font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);">'
        'The number the announcement did not move</div>\n'
        '  <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:baseline;margin-top:6px;">\n'
        '    <a href="/progress-index" onclick="gtag(\'event\',\'index_click\',{location:\'pacing_live\'});" '
        'style="font-size:28px;font-weight:800;font-variant-numeric:tabular-nums;text-decoration:none;">'
        + score + '<span style="font-size:16px;color:var(--muted);">/100</span></a>\n'
        '    <span style="font-size:14px;color:var(--muted);">how much of the 2027 thesis is still standing '
        '&mdash; recomputed from eight graded predictions, as of <strong>' + as_of + '</strong></span>\n'
        '  </div>\n'
        '  <div style="margin-top:9px;font-size:14px;">\n'
        '    <a href="/progress-index" onclick="gtag(\'event\',\'index_click\',{location:\'pacing_live_link\'});" '
        'style="font-weight:600;">See all eight verdicts and what would flip them &rarr;</a>'
        '<span style="color:var(--muted);"> &middot; ' + str(open_n) + ' of the 8 are still open.</span>\n'
        '  </div>\n</div>\n')
html = html.replace("<h2>What was actually proposed</h2>", hook + "<h2>What was actually proposed</h2>", 1)

# 订阅 CTA。**新的 location 名 deep_pacing_mid**:09-09/09-11 那两臂在跑位置实验,
# 判定日 10-07,新页不能用它们的 location,否则会把一条没有基线的新页混进去污染读数。
cta = ('<div style="margin:1.6rem 0;background:var(--bg2);border:1px solid var(--border2);'
       'border-left:3px solid var(--accent2);border-radius:0 12px 12px 0;padding:1.1rem 1.3rem;">'
       '<p style="margin:0 0 .45rem;font-weight:700;">The industry now says it will slow down. '
       'The scorecard will say whether it did.</p>'
       '<p style="margin:0 0 .8rem;font-size:14px;color:var(--muted);">Eight predictions, each with a published flip '
       'condition. One email on the day one of them actually moves &mdash; nothing in between.</p>'
       '<a href="https://agiscorecard.beehiiv.com/subscribe?utm_source=agiscorecard&amp;utm_medium=deep_pacing_mid" '
       'target="_blank" rel="noopener" onclick="gtag(\'event\',\'subscribe_click\',{location:\'deep_pacing_mid\'});" '
       'style="display:inline-block;background:#6350d9;color:#fff;padding:9px 20px;border-radius:8px;'
       'font-size:14px;font-weight:600;">Tell me when a verdict flips &rarr;</a></div>\n')
html = html.replace("<h2>Which of the eight predictions this bears on</h2>",
                    cta + "<h2>Which of the eight predictions this bears on</h2>", 1)

# 一手源。**刻意不印逐字引语**:原文与主流报道今天在本沙箱全部 EGRESS_BLOCKED,
# 两轮检索给出的核心句措辞互相打架,核不到就不印——链接给读者自己核。
src = ('<h2>Sources</h2>\n<p class="src">Dario Amodei, <em>We Must Pace the Frontier</em>, published '
       'September 12, 2026 &mdash; <a href="https://darioamodei.com/post/we-must-pace-the-frontier" '
       'target="_blank" rel="noopener">read the essay in full</a>. Sam Altman\'s same-day endorsement was posted '
       'on X. This page deliberately paraphrases rather than quoting: go to the essay for his exact wording. '
       'Verdicts and the Thesis Tracker reading come from this site\'s own '
       '<a href="/data.json">machine-readable dataset</a> (CC BY 4.0).</p>\n')
html = html.replace('  <h2>Frequently asked questions</h2>', src + '  <h2>Frequently asked questions</h2>', 1)

open(g.OUT + "/does-ai-slowdown-change-agi-2027.html", "w").write(html)
print("wrote does-ai-slowdown-change-agi-2027.html", len(html), "bytes")
