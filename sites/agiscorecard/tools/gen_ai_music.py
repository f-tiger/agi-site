# -*- coding: utf-8 -*-
"""判定页(2026-09-17,owner:「扩展一个音乐子站,agi 的 ai 音乐站点」)。

**为什么是一页而不是一个子站**:舰队三条铁律(独立技术形态 / 受众品牌完全不同 /
自带变现闭环)本方向 0/3,裁定与逐条理由见根仓 docs/ai-music-subdomain-2026-09-17.md。
第一方读数更直接:bpj 已有 16 个 audio 工具页(Suno/Udio/Mubert 全在),28 天真人访问
合计 6 次,Suno 与 Udio 各 0 次 —— 工具目录这条路舰队已经走过且没人看。

**这一页凭什么存在**:本站资产是判定题上的引用份额,而「AI 音乐到底行不行」正被
两种互斥的叙事占满(「AI 音乐要淹没一切」vs「AI 音乐都是垃圾」)。两边都不给数字。
可核的数字合起来指向第三个答案,而且是本站方法论的纯粹形态:
**质量关过了,需求关没过。** 这是迄今最干净的一例「能力到位而采用没到位」,
它直接压在本站核心争论上(能力提升是否等于社会变革)。

零编造边界:
- 全部 Deezer 数字取自 Deezer 自己的 newsroom(一手),逐条带发布日期。
- 97% 那条是 Deezer 与 Ipsos 的联合调查(9 000 人 / 8 国 / 听三首),注明调查方与样本。
- 唱片公司和解:WMG×Suno 2025-11-25 有确切日期;UMG×Udio 与 WMG×Udio 报道只给
  「上月 / 上周」,**所以正文只写月份不编具体日**。
- 「2026-05 UMG/Sony 动议把涉案录音从 560 扩到 61 026 条」只在二手摘要里见到,
  未取到一手文书,**本页不写这条**。Sony 未和解是多来源一致的,只写这一句。
"""
import gen_lib as g

DATE = "2026-09-17"
g.DATE = DATE

capsule = (
    '<span class="verdict">Yes on quality, no on demand — and the gap is the story.</span> '
    'In a blind test of 9,000 listeners across eight countries, <strong>97% could not tell fully AI-generated music '
    'from human-made music</strong> (Deezer/Ipsos, November 2025). AI tracks now make up <strong>more than half of '
    'everything uploaded to Deezer each day</strong> — about 90,000 tracks (Deezer, July 2026). And they account for '
    '<strong>1–3% of what people actually stream</strong>, of which up to 85% was fraudulent and paid nothing. '
    'The quality bar fell. The listening did not follow. That gap is the most precisely measured case anywhere of a '
    'capability arriving without the adoption everyone assumed would come with it.')

body = """<h2>The three numbers, side by side</h2>
<p>Each row is published by Deezer, the only large streaming service that runs and reports an AI-detection system on
every upload. Dates matter here, so every figure carries one.</p>
<table><thead><tr><th>What was measured</th><th>Reading</th><th>As of</th></tr></thead><tbody>
<tr><td>Listeners who could <em>not</em> identify fully AI-generated tracks in a blind test</td><td class="nowrap v-ok">97%</td><td class="nowrap">Nov 2025</td></tr>
<tr><td>Share of new daily uploads that are fully AI-generated</td><td class="nowrap v-ok">over 50% (~90,000/day)</td><td class="nowrap">Jul 2026</td></tr>
<tr><td>Share of total streams those tracks receive</td><td class="nowrap v-wrong">1–3%</td><td class="nowrap">Jul 2026</td></tr>
<tr><td>Of those streams, the share detected as fraudulent and demonetised</td><td class="nowrap v-wrong">up to 85%</td><td class="nowrap">2025 full year</td></tr>
</tbody></table>
<p>Read the second and third rows together. More than half of the supply, between one and three percent of the
demand. Whatever is limiting AI music, it is not that people can hear the difference — the first row settles that.</p>

<h2>How fast the supply side moved</h2>
<p>Deezer began tagging AI uploads in January 2025. The trajectory since, from its own releases:</p>
<table><thead><tr><th>Date</th><th>Fully AI-generated tracks uploaded per day</th><th>Share of daily uploads</th></tr></thead><tbody>
<tr><td>January 2025</td><td class="nowrap">~10,000</td><td class="nowrap">not reported</td></tr>
<tr><td>November 2025</td><td class="nowrap">~50,000</td><td class="nowrap">not reported</td></tr>
<tr><td>April 2026</td><td class="nowrap">~75,000</td><td class="nowrap">~44%</td></tr>
<tr><td>July 2026</td><td class="nowrap">~90,000</td><td class="nowrap">over 50%</td></tr>
</tbody></table>
<p>Nine-fold in eighteen months, on one platform, crossing the halfway line in July 2026. Deezer puts its detector at
99.8% accuracy with fewer than one false positive per 10,000 genuine tracks, so the count is a floor rather than an
estimate. No other major platform publishes a comparable figure, which is the single biggest hole in this page:
one company's uploads are not the whole market, and nobody else is showing their numbers.</p>

<h2>Why the gap is not explained by quality</h2>
<p>The obvious explanation — it still sounds wrong — is the one the evidence rules out. The Deezer/Ipsos survey put
9,000 people in eight countries (US, Canada, Brazil, UK, France, Netherlands, Germany, Japan) in front of three
tracks, two AI and one human, and asked which were fully machine-made. 97% got it wrong. Of those told the answer
afterwards, 71% were surprised and 52% said it made them uncomfortable; 80% said fully AI music should be labelled,
and 45% said they would like to filter it out of their streaming service entirely.</p>
<p>That last pair is the useful part. People cannot detect it and a large minority want it removed anyway. The
constraint is not audio fidelity. It is that music is chosen for reasons — who made it, what it signals, who else is
listening — that survive the audio being indistinguishable.</p>

<h2>What the labels did once it worked</h2>
<p>The industry's own behaviour is evidence of capability, separate from any benchmark. Having sued the two leading
generators in 2024, the major labels began settling and licensing once the output got good:</p>
<table><thead><tr><th>Party</th><th>Outcome</th><th>When</th></tr></thead><tbody>
<tr><td>Universal Music Group &times; Udio</td><td class="nowrap v-ok">Settled; licensed platform planned for 2026</td><td class="nowrap">October 2025</td></tr>
<tr><td>Warner Music Group &times; Udio</td><td class="nowrap v-ok">Settled; licensing deal</td><td class="nowrap">November 2025</td></tr>
<tr><td>Warner Music Group &times; Suno</td><td class="nowrap v-ok">Settled; licensed models in 2026, Suno acquires Songkick from WMG</td><td class="nowrap">25 November 2025</td></tr>
<tr><td>Sony Music</td><td class="nowrap v-open">Has not settled; litigation continues</td><td class="nowrap">as of Sep 2026</td></tr>
<tr><td>GEMA (Germany), Koda (Denmark), independent-artist class actions</td><td class="nowrap v-open">Claims ongoing</td><td class="nowrap">as of Sep 2026</td></tr>
</tbody></table>
<p>You do not license a technology you expect to fail. The settlements are a stronger signal about capability than any
listening test, because the people signing them have the catalogues at risk.</p>

<h2>What this bears on</h2>
<p>This site grades whether AI capability is arriving on the predicted schedule, and separately whether arrival
produces the predicted change. Music is the cleanest natural experiment available on the second question, because
both sides are counted: the capability is verified by blind test, and the adoption is verified by stream share on the
same platform in the same month. Almost nowhere else are both numbers published.</p>
<p>The answer, so far, is that they came apart. A capability can pass the human-indistinguishability bar and still
move a low single-digit share of behaviour eighteen months later. Anyone forecasting labour-market or economic effects
from benchmark scores alone should be able to explain why music is the exception — or accept it as the base rate. It
is the same question asked on <a href="/can-ai-replace-knowledge-workers">whether AI can replace knowledge workers</a>
and <a href="/ai-and-your-job">what it means for your job</a>, with the rare advantage of having both halves measured.</p>

<h2>What would change this verdict</h2>
<p>Pre-registered, so it can be checked rather than rationalised:</p>
<ul>
<li><strong>Stream share breaks 10% on any platform that publishes the number.</strong> That would turn "capability without adoption" into a transition in progress, and would be the single reading that matters.</li>
<li><strong>A second large platform publishes upload and stream shares.</strong> Today the entire quantitative picture rests on one company; a second source either corroborates it or collapses it.</li>
<li><strong>A fully AI-generated track charts on a major national chart on genuine, non-fraudulent streams.</strong> Demand, not supply, and audited.</li>
<li><strong>The fraud share falls sharply while stream share holds.</strong> That would mean the listening is becoming real rather than manufactured.</li>
</ul>
<p>None of the four has happened as of 17 September 2026. Until one does, the honest reading is that AI music won the
quality argument and has not yet won an audience.</p>
"""

faqs = [
    ("Is AI music good enough to pass for human-made?",
     "Yes. In a Deezer/Ipsos blind test of 9,000 listeners across eight countries published in November 2025, 97% could not correctly identify fully AI-generated tracks when played three songs, two of which were AI. Audio quality is no longer the limiting factor."),
    ("How much of streaming music is AI-generated?",
     "It depends on whether you count uploads or listening, and the two are wildly different. As of July 2026 more than 50% of tracks uploaded to Deezer each day — about 90,000 — are fully AI-generated, but those tracks receive only 1–3% of total streams."),
    ("Why do people not listen to AI music if they cannot tell the difference?",
     "The evidence rules out audio quality as the reason. In the same Deezer/Ipsos survey, 80% of respondents said fully AI-generated music should be clearly labelled and 45% said they would like to filter it out of their streaming service. Listeners appear to choose music partly for who made it, which survives the audio being indistinguishable."),
    ("Is AI music fraud a real problem?",
     "Deezer reports that up to 85% of the streams generated by fully AI-generated tracks in 2025 were fraudulent. Those streams are excluded from royalty payments, so the already small 1–3% stream share overstates how much genuine listening AI music receives."),
    ("Did the record labels win their lawsuits against Suno and Udio?",
     "Partly, and then they licensed instead. Universal settled with Udio in October 2025 and Warner settled with Udio in November 2025 and with Suno on 25 November 2025, in each case pairing the settlement with a licensing deal for platforms planned for 2026. Sony Music has not settled, and claims from GEMA in Germany, Koda in Denmark and independent-artist class actions remain live as of September 2026."),
    ("What would show that AI music is actually taking over?",
     "Stream share, not upload share. This page pre-registers four triggers: AI stream share passing 10% on any platform that publishes it, a second large platform publishing comparable figures, a fully AI track charting nationally on genuine streams, or the fraud share falling sharply while stream share holds. None had happened as of 17 September 2026."),
]

related = [
    ("/can-ai-replace-knowledge-workers", "Can AI replace knowledge workers?"),
    ("/ai-and-your-job", "What AI means for your job"),
    ("/ai-progress-2026-so-far", "AI progress in 2026 so far"),
    ("/progress-index", "The AGI-2027 Thesis Tracker"),
    ("/agi-questions", "Browse all AGI questions"),
]

html = g.build(
    slug="is-ai-music-good-enough",
    title="Is AI music good enough yet?",
    desc="97% of 9,000 blind-test listeners could not tell AI music from human. It is over half of Deezer's daily uploads and 1-3% of actual listening.",
    og_title="Is AI music good enough yet?",
    eyebrow="Capability vs adoption",
    h1="Is AI music good enough yet?",
    capsule=capsule,
    body_html=body,
    faqs=faqs,
    related=related,
)

import json as _json

html = html.replace("Last updated: June 30, 2026 · Updated as verdicts change",
                    "Last updated: September 17, 2026 · Updated as verdicts change")

html = html.replace('  <div class="capsule">',
    '  <div class="byline" style="font-size:12px;color:var(--muted);margin:-0.9rem 0 1.5rem;">'
    'By the AGI Scorecard team · <a href="/about">methodology &amp; independence</a></div>\n  <div class="capsule">', 1)

crumb = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
    {"@type": "ListItem", "position": 1, "name": "AGI Scorecard", "item": "https://agiscorecard.com/"},
    {"@type": "ListItem", "position": 2, "name": "AGI questions, answered", "item": "https://agiscorecard.com/agi-questions"},
    {"@type": "ListItem", "position": 3, "name": "Is AI music good enough yet?",
     "item": "https://agiscorecard.com/is-ai-music-good-enough"}]}
html = html.replace("</head>", '<script type="application/ld+json">'
                    + _json.dumps(crumb, ensure_ascii=False) + "</script>\n</head>", 1)

# 订阅 CTA。新 location `deep_aimusic_mid` —— 不复用 09-09/09-11 那两臂位置实验的名字
# (判定日 10-07),否则会把一条没有基线的新页混进去污染读数。
cta = ('<div style="margin:1.6rem 0;background:var(--bg2);border:1px solid var(--border2);'
       'border-left:3px solid var(--accent2);border-radius:0 12px 12px 0;padding:1.1rem 1.3rem;">'
       '<p style="margin:0 0 .45rem;font-weight:700;">Capability is easy to measure. Adoption is the one that '
       'settles arguments.</p>'
       '<p style="margin:0 0 .8rem;font-size:14px;color:var(--muted);">Eight predictions about AGI, each with a '
       'published flip condition. One email on the day one of them actually moves &mdash; nothing in between.</p>'
       '<a href="https://agiscorecard.beehiiv.com/subscribe?utm_source=agiscorecard&amp;utm_medium=deep_aimusic_mid" '
       'target="_blank" rel="noopener" onclick="gtag(\'event\',\'subscribe_click\',{location:\'deep_aimusic_mid\'});" '
       'style="display:inline-block;background:#6350d9;color:#fff;padding:9px 20px;border-radius:8px;'
       'font-size:14px;font-weight:600;">Tell me when a verdict flips &rarr;</a></div>\n')
html = html.replace("<h2>Why the gap is not explained by quality</h2>",
                    cta + "<h2>Why the gap is not explained by quality</h2>", 1)

src = ('<h2>Sources</h2>\n<p class="src">Upload counts, stream share, fraud share and detector accuracy: Deezer '
       'Newsroom, <a href="https://newsroom-deezer.com/2026/07/ai-music-exceeds-50-percent-daily-uploads-deezer/" '
       'target="_blank" rel="noopener">AI music tops 50% of daily uploads</a> (21 July 2026) and '
       '<a href="https://newsroom-deezer.com/2026/04/ai-generated-tracks-represent-44-of-new-uploaded-music/" '
       'target="_blank" rel="noopener">AI-generated tracks represent 44% of new uploaded music</a> (20 April 2026). '
       'Blind-test result and listener attitudes: <a href="https://newsroom-deezer.com/2025/11/deezer-ipsos-survey-ai-music/" '
       'target="_blank" rel="noopener">Deezer and Ipsos study</a> (November 2025), 9,000 respondents across eight '
       'countries. Settlement dates: Music Business Worldwide. Where reporting gave only a relative date '
       '(&ldquo;last month&rdquo;), this page states the month and no day. A pending motion to expand the recordings '
       'at issue in the remaining litigation is omitted here because no primary filing could be retrieved to verify '
       'it. Deezer is the only large platform publishing these figures, so every quantitative row above rests on one '
       'company&rsquo;s data.</p>\n')
html = html.replace('  <h2>Frequently asked questions</h2>', src + '  <h2>Frequently asked questions</h2>', 1)

open(g.OUT + "/is-ai-music-good-enough.html", "w").write(html)
print("wrote is-ai-music-good-enough.html", len(html), "bytes")
