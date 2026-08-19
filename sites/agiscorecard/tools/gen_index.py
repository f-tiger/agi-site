# -*- coding: utf-8 -*-
"""AGI-2027 Thesis Tracker — a single 0-100 score of how much of Aschenbrenner's
Situational Awareness thesis is currently holding up, computed transparently from
the 8 graded verdicts in data.json. This is the site's flagship DIFFERENTIATOR:
no competitor publishes a single trackable index of the 2027 bet. Original data =
the #1 AI-citation magnet, and "get notified when the score moves" is a concrete
subscribe reason.

Run whenever a verdict changes (same trigger as widget/badges):
    python3 tools/gen_index.py <YYYY-MM-DD>
Maintains index-history.json (time series), updates data.json's thesisTracker,
and regenerates /progress-index.html. Honest by construction: a documented mean
of verdict weights, never invented precision.
"""
import json, os, sys, collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATE = sys.argv[1] if len(sys.argv) > 1 else "2026-07-12"

# verdict → weight: supportive=1, unresolved=0.5, refuted=0
WEIGHT = {"On track": 1.0, "Exceeded": 1.0, "Holding": 1.0,
          "Open": 0.5, "Pending": 0.5, "Wrong": 0.0}
LABEL = {1.0: ("Supporting", "v-ok"), 0.5: ("Unresolved", "v-open"), 0.0: ("Refuting", "v-wrong")}

d = json.load(open(os.path.join(ROOT, "data.json")), object_pairs_hook=collections.OrderedDict)
preds = d["predictions"]
contribs = []
for p in preds:
    w = WEIGHT.get(p["verdict"], 0.5)
    contribs.append((p, w))
raw = sum(w for _, w in contribs)
_val = raw / len(preds) * 100
score = int(_val) if _val == int(_val) else round(_val, 1)  # 62.5 stays 62.5; 75.0 -> 75

# --- history (time series) ---
hist_path = os.path.join(ROOT, "index-history.json")
if os.path.exists(hist_path):
    hist = json.load(open(hist_path))
else:
    # honest seed: same 3/1/2/2 tally since the two-year grading in June 2026
    hist = [{"date": "2026-06-30", "score": score}]
if not hist or hist[-1]["date"] != DATE:
    if not hist or hist[-1]["score"] != score:
        hist.append({"date": DATE, "score": score})
    else:
        # score unchanged; still stamp latest date so the series shows "as of"
        hist.append({"date": DATE, "score": score})
json.dump(hist, open(hist_path, "w"), ensure_ascii=False, indent=2)
open(hist_path, "a").write("\n")

# --- update data.json thesisTracker ---
tracker = collections.OrderedDict([
    ("name", "AGI-2027 Thesis Tracker"),
    ("score", score), ("of", 100), ("asOf", DATE),
    ("method", "Mean of the 8 verdict weights (supportive=1, unresolved/open/pending=0.5, refuted=0) x100. An editorial composite of the published verdicts, not a probability."),
    ("historyUrl", "https://agiscorecard.com/index-history.json"),
    ("pageUrl", "https://agiscorecard.com/progress-index"),
])
d["thesisTracker"] = tracker
d["dateModified"] = DATE
json.dump(d, open(os.path.join(ROOT, "data.json"), "w"), ensure_ascii=False, indent=2)
open(os.path.join(ROOT, "data.json"), "a").write("\n")

print(f"Thesis Tracker score = {score}/100 (raw {raw}/{len(preds)}); history points = {len(hist)}")

# --- generate /progress-index.html ---
import gen_lib as g

rows = ""
for p, w in contribs:
    lab, cls = LABEL[w]
    rows += (f'<tr><td>{p["prediction"]}</td>'
             f'<td class="nowrap"><span class="{("v-ok" if w==1 else "v-wrong" if w==0 else "v-open")}">{p["verdict"]}</span></td>'
             f'<td class="nowrap">{("+1.0" if w==1 else "0.0" if w==0 else "+0.5")}</td></tr>\n')

# sparkline from history (inline SVG, no deps)
pts = hist[-12:]
if len(pts) >= 2:
    xs = [i/(len(pts)-1) for i in range(len(pts))]
    ys = pts
    minv = min(h["score"] for h in ys); maxv = max(h["score"] for h in ys)
    rng = max(1, maxv - minv)
    coords = " ".join(f'{round(x*300,1)},{round(40-(h["score"]-minv)/rng*36,1)}' for x, h in zip(xs, ys))
    spark = (f'<svg viewBox="0 0 300 40" width="100%" height="60" preserveAspectRatio="none" '
             f'style="margin:.5rem 0;overflow:visible;"><polyline points="{coords}" fill="none" '
             f'stroke="#7c6af5" stroke-width="2"/></svg>')
else:
    spark = ""
hist_rows = "".join(f'<tr><td>{h["date"]}</td><td class="nowrap">{h["score"]}/100</td></tr>' for h in reversed(hist))

# --- "which verdict flips next" one-tap poll (backlog: which-verdict-flips-next) ---
# CRO shape: micro-commitment (one tap) -> instant payoff (their pick named back) ->
# consistency hook (location 'pred_flip' + label <id> lets the edge signup form make the
# per-prediction promise and store the topic). Zero fabrication: no fake tallies shown;
# vote_cast{progress_index_flip} lands in D1 and only ever reported as real counts.
FLIP_SHORT = {"agi-2027": ("AGI by 2027", "2027 年 AGI"),
              "the-project": ("US gov AGI project", "美国政府 AGI 工程"),
              "intelligence-explosion": ("Intelligence explosion", "智能爆炸"),
              "superintelligence": ("Superintelligence", "超级智能")}
open_preds = [(p["id"], p["verdict"]) for p, w in contribs if w == 0.5]
BTN_CSS = ('style="background:var(--bg2);border:1px solid var(--border);border-radius:8px;'
           'padding:8px 14px;color:var(--text);cursor:pointer;font-size:13.5px;font-family:inherit;"')
def _flip_poll(zh):
    btns = "".join(
        f'<button class="flip-opt" data-id="{pid}" data-name="{FLIP_SHORT.get(pid, (pid, pid))[1 if zh else 0]}" '
        f'onclick="flipPick(this)" {BTN_CSS}>{FLIP_SHORT.get(pid, (pid, pid))[1 if zh else 0]}'
        f' <span style="color:var(--muted);font-size:11px;">{"悬而未决" if zh and v == "Open" else "待定" if zh else v}</span></button>'
        for pid, v in open_preds)
    head = ("你的判断：四条未决预测，哪条先翻转？" if zh else
            "Your call: which unresolved prediction flips first?")
    sub = ("一键表态，无需账号。四条都带上表中预先登记的翻转条件。" if zh else
           "One tap, no account. All four carry the pre-registered flip conditions graded above.")
    picked = ("你押的是 <b>'+nm+'</b>。它的翻转条件已预先登记——真发生那天没有争辩空间。" if zh else
              "You picked <b>'+nm+'</b>. Its flip condition is pre-registered — nothing to argue about later. ")
    cta = ("它翻转当天，给我发一封邮件 →" if zh else "One email the day it flips →")
    utm = "zh_progress_index_flip" if zh else "progress_index_flip"
    return (
        '<div class="capsule" id="flip-poll" style="margin-top:1.5rem;">'
        f'<p style="margin:0 0 .5rem;font-weight:700;">{head}</p>'
        f'<p style="margin:0 0 .8rem;font-size:13px;color:var(--muted);">{sub}</p>'
        f'<div style="display:flex;flex-wrap:wrap;gap:8px;">{btns}</div>'
        '<div id="flip-result" style="display:none;margin-top:.9rem;font-size:14px;"></div></div>'
        '<script>function flipPick(b){var id=b.getAttribute("data-id"),nm=b.getAttribute("data-name");'
        'try{localStorage.setItem("flip_pick",id)}catch(e){}'
        "gtag('event','vote_cast',{location:'progress_index_flip',label:id});"
        'var x=document.getElementById("flip-result");'
        # worker's signup hook parses onclick with /location:'…'/ and /label:'…'/ —
        # MUST be single-quoted (escaped \' inside the JS string), never &quot;
        "x.innerHTML='" + picked + "'"
        "+'<a href=\"https://agiscorecard.beehiiv.com/subscribe?utm_source=agiscorecard&utm_medium=" + utm + "\" "
        "target=\"_blank\" rel=\"noopener\" onclick=\"gtag(\\'event\\',\\'subscribe_click\\',"
        "{location:\\'pred_flip\\',label:\\''+id+'\\'})\">" + cta + "</a>';"
        'x.style.display="block";'
        'document.querySelectorAll(".flip-opt").forEach(function(o){o.style.opacity=o===b?"1":"0.45";'
        'o.style.borderColor=o===b?"var(--accent)":"var(--border)"});}'
        '</script>')
poll_en = _flip_poll(False)
poll_zh = _flip_poll(True)

capsule = (f'<span class="verdict">The AGI-2027 thesis is currently tracking at <strong>{score}/100</strong>.</span> '
           'The Thesis Tracker is a single number for how much of Leopold Aschenbrenner’s '
           '<em>Situational Awareness</em> is holding up — a transparent mean of the 8 graded verdicts. '
           'It moves only when a verdict changes, and every verdict carries a pre-registered flip condition. '
           'No probability is claimed; it is an editorial composite you can audit line by line below.')

body = f"""<h2>The score right now: {score}/100</h2>
{spark}
<p>Each of the 8 predictions contributes to the score by its verdict: a <strong class="v-ok">supporting</strong> verdict (On track / Exceeded / Holding) adds 1.0, an <strong class="v-open">unresolved</strong> one (Open / Pending) adds 0.5, and a <strong class="v-wrong">refuting</strong> one (Wrong) adds 0.0. The mean, times 100, is the score.</p>
<table><thead><tr><th>Prediction</th><th>Verdict</th><th>Weight</th></tr></thead><tbody>
{rows}</tbody></table>
<p>Sum = {raw:.1f} across {len(preds)} predictions → <strong>{score}/100</strong>. This is deliberately simple and public: the <a href="/data.json">machine-readable dataset</a> and <a href="/index-history.json">score history</a> let anyone recompute or chart it.</p>
{poll_en}
<h2>Why a single number?</h2>
<p>Every other AGI tracker gives you either a vibe or a wall of takes. The Thesis Tracker gives you one auditable figure that changes only on evidence, with a pre-registered condition behind every move. It is not a probability of AGI by 2027 — it is a running score of how Aschenbrenner’s specific, falsifiable claims are grading. The headline claim resolves by <strong>January 1, 2028</strong>.</p>
<h2>Score history</h2>
<table><thead><tr><th>Date</th><th>Score</th></tr></thead><tbody>{hist_rows}</tbody></table>
<p>The score has held near {score} because the tally (3 on track, 1 wrong, 2 open, 2 pending) has been stable — exactly the kind of flat-until-it-isn’t signal worth watching as the 2028 deadline nears.</p>"""

faqs = [
    ("What is the AGI-2027 Thesis Tracker?",
     f"A single 0-100 score of how much of Aschenbrenner's Situational Awareness thesis is holding up, computed as the mean of the 8 graded verdict weights. As of {DATE} it is {score}/100. It is an editorial composite of published verdicts, not a probability of AGI."),
    ("How is the score calculated?",
     "Each of the 8 predictions contributes by verdict: supporting (On track/Exceeded/Holding) = 1.0, unresolved (Open/Pending) = 0.5, refuting (Wrong) = 0.0. The mean times 100 is the score. The full breakdown and machine-readable data are public."),
    ("When does the score change?",
     "Only when a verdict changes, and every verdict has a pre-registered flip condition. The headline 'AGI by 2027' claim resolves by January 1, 2028, which is the most likely near-term mover."),
    ("Can I use this data?",
     "Yes. The score, breakdown, and history are CC BY 4.0 at /data.json and /index-history.json. Cite the AGI Scorecard and link agiscorecard.com."),
]
related = [("/situational-awareness-predictions", "Every prediction, graded"),
           ("/will-agi-arrive-2027", "Will AGI arrive by 2027?"),
           ("/for-agents", "Machine-readable data for AI agents")]

html = g.build(
    slug="progress-index",
    title="AGI-2027 Thesis Tracker: One Score for the 2027 Bet",
    desc=f"A single auditable 0-100 score of how much of Aschenbrenner's Situational Awareness thesis is holding up. Currently {score}/100, from 8 graded verdicts. CC BY 4.0.",
    og_title="The AGI-2027 Thesis Tracker",
    eyebrow="Original index",
    h1="AGI-2027 Thesis Tracker: one score for the whole bet",
    capsule=capsule, body_html=body, faqs=faqs, related=related,
)
DATE_LONG = "July 12, 2026"
html = html.replace("Last updated: June 30, 2026", f"Last updated: {DATE_LONG}")
html = html.replace('"datePublished": "2026-06-30", "dateModified": "2026-06-30"',
                    f'"datePublished": "2026-07-12", "dateModified": "{DATE}"')
html = html.replace(
    f'<div class="updated">Last updated: {DATE_LONG} · Updated as verdicts change</div>',
    f'<div class="updated">Last updated: {DATE_LONG} · Updated as verdicts change</div>\n'
    '  <div class="byline" style="font-size:12px;color:var(--muted);margin:-0.9rem 0 1.5rem;">'
    'By the AGI Scorecard team · <a href="/about">methodology &amp; independence</a></div>')
crumb = ('<script type="application/ld+json">{"@context": "https://schema.org", "@type": "BreadcrumbList", '
         '"itemListElement": [{"@type": "ListItem", "position": 1, "name": "AGI Scorecard", "item": "https://agiscorecard.com/"}, '
         '{"@type": "ListItem", "position": 2, "name": "AGI questions, answered", "item": "https://agiscorecard.com/agi-questions"}, '
         '{"@type": "ListItem", "position": 3, "name": "AGI-2027 Thesis Tracker", "item": "https://agiscorecard.com/progress-index"}]}</script>\n')
i = html.index('<script type="application/ld+json">')
html = html[:i] + crumb + html[i:]
html = html.replace(
    '  </div>\n</article>',
    '''  </div>
  <div class="cta" style="margin-top:1rem; background:var(--bg2); border:1px solid var(--border);">
    <p style="margin:0;font-weight:600;">Get notified when the score moves</p>
    <p style="margin:6px 0 0;font-size:13px;color:var(--muted);">The Thesis Tracker changes only on real evidence. Subscribe to hear the moment a verdict flips — free, no hype.</p>
    <a href="https://agiscorecard.beehiiv.com/subscribe?utm_source=agiscorecard&utm_medium=progress_index" target="_blank" rel="noopener" onclick="gtag('event','subscribe_click',{location:'progress_index'});">Subscribe free &rarr;</a>
  </div>
</article>''')
html = html.replace(
    'Not affiliated with any lab</footer>',
    'Not affiliated with any lab · <a href="/about" style="color:var(--muted);">About</a> · '
    '<a href="/privacy" style="color:var(--muted);">Privacy</a> · '
    '<a href="/advertise" style="color:var(--muted);">Advertise</a></footer>')

# add reciprocal hreflang to the EN page
EN_URL = f"{g.SITE}/progress-index"
ZH_URL = f"{g.SITE}/zh/progress-index"
HREF = (f'<link rel="alternate" hreflang="en" href="{EN_URL}">\n'
        f'<link rel="alternate" hreflang="zh-Hans" href="{ZH_URL}">\n'
        f'<link rel="alternate" hreflang="x-default" href="{EN_URL}">')
html = html.replace(f'<link rel="canonical" href="{EN_URL}">',
                    f'<link rel="canonical" href="{EN_URL}">\n{HREF}')
open(os.path.join(ROOT, "progress-index.html"), "w").write(html)
print("progress-index.html written")

# --- zh/progress-index.html (localized flagship for the highest-engagement audience) ---
zh_rows = ""
for p, w in contribs:
    zh_rows += (f'<tr><td>{p["prediction"]}</td>'
                f'<td class="nowrap"><span class="{("v-ok" if w==1 else "v-wrong" if w==0 else "v-open")}">{p["verdict"]}</span></td>'
                f'<td class="nowrap">{("+1.0" if w==1 else "0.0" if w==0 else "+0.5")}</td></tr>\n')
zh_hist_rows = "".join(f'<tr><td>{h["date"]}</td><td class="nowrap">{h["score"]}/100</td></tr>' for h in reversed(hist))
zh_article = {"@context": "https://schema.org", "@type": "Article", "headline": "AGI-2027 命题追踪指数",
              "datePublished": "2026-07-12", "dateModified": DATE, "inLanguage": "zh-Hans",
              "author": {"@type": "Organization", "name": "The AGI Scorecard"},
              "publisher": {"@type": "Organization", "name": "The AGI Scorecard", "url": g.SITE + "/"},
              "description": f"用一个可审计的 0-100 分数（当前 {score}）追踪阿申布伦纳《态势感知》命题的成立程度，由 8 项判定透明算出。CC BY 4.0。"}
zh_faqs = [
    ("什么是 AGI-2027 命题追踪指数？", f"一个 0-100 的单一分数，衡量阿申布伦纳《态势感知》命题当前的成立程度，由 8 项判定的权重取平均算出。截至 {DATE} 为 {score}/100。它是已发布判定的编辑性合成，不是 AGI 发生的概率。"),
    ("分数怎么计算？", "8 项预测各按判定贡献分数：支持性（符合进度/超出/维持）=1.0，未决（悬而未决/待定）=0.5，被证伪（落空）=0.0。取平均再乘 100 即为分数。完整拆解与机器可读数据公开。"),
    ("分数什么时候会变？", "只有当某项判定变化时才变，且每项判定都带预先登记的翻转条件。头条的“2027 年 AGI”将于 2028 年 1 月 1 日前见分晓，是最可能的近期变量。"),
]
zh_ld = "\n".join('<script type="application/ld+json">' + json.dumps(x, ensure_ascii=False) + '</script>'
                  for x in (zh_article, {"@context": "https://schema.org", "@type": "FAQPage",
                  "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in zh_faqs]}))
zh_faq_html = "".join(f'<div class="faq-q">{q}</div><p>{a}</p>' for q, a in zh_faqs)
zh_html = f"""<!DOCTYPE html>
<html lang="zh-Hans">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
{g.GTAG}
{g.FAVICON}
<title>AGI-2027 命题追踪指数：一个分数看懂 2027 赌局</title>
<meta name="description" content="用一个可审计的 0-100 分数（当前 {score}）追踪阿申布伦纳《态势感知》命题的成立程度，由 8 项判定算出。CC BY 4.0。">
<link rel="canonical" href="{ZH_URL}">
{HREF}
<meta property="og:site_name" content="The AGI Scorecard">
<meta property="og:title" content="AGI-2027 命题追踪指数">
<meta property="og:description" content="一个可审计的 0-100 分数，追踪《态势感知》命题的成立程度。当前 {score}/100。">
<meta property="og:type" content="article">
<meta property="og:url" content="{ZH_URL}">
<meta property="og:image" content="{g.SITE}/scorecard-summary.png">
{zh_ld}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
{g.STYLE}
</style>
</head>
<body>
<header>
  <a href="/cn" class="logo"><span class="logo-dot"></span>AGI 记分牌</a>
  <a href="/progress-index" class="back-link">EN ↗</a>
</header>
<article>
  <div class="eyebrow">原创指数</div>
  <h1>AGI-2027 命题追踪指数：一个分数看懂整场赌局</h1>
  <div class="updated">最后更新：2026年7月12日 · 随判定变化更新</div>
  <div class="capsule"><span class="verdict">当前，AGI-2027 命题的追踪分数为 <strong>{score}/100</strong>。</span> 这个指数用一个数字表示阿申布伦纳《态势感知》当前的成立程度——8 项判定权重的透明平均值。它只在某项判定变化时移动，且每项判定都带预先登记的翻转条件。不声称任何概率；它是可逐行审计的编辑性合成。</div>
<h2>此刻的分数：{score}/100</h2>
{spark}
<p>8 项预测各按判定贡献分数：<strong class="v-ok">支持性</strong>判定（符合进度/超出/维持）加 1.0，<strong class="v-open">未决</strong>判定（悬而未决/待定）加 0.5，<strong class="v-wrong">被证伪</strong>判定（落空）加 0.0。取平均再乘 100 即为分数。</p>
<table><thead><tr><th>预测</th><th>判定</th><th>权重</th></tr></thead><tbody>
{zh_rows}</tbody></table>
<p>合计 = {raw:.1f}，共 {len(preds)} 项 → <strong>{score}/100</strong>。这一切都刻意保持简单和公开：<a href="/data.json">机器可读数据集</a>与<a href="/index-history.json">分数历史</a>让任何人都能重算或绘图。</p>
{poll_zh}
<h2>为什么用一个数字？</h2>
<p>别的 AGI 追踪要么给你一种感觉，要么给你一堆观点。命题追踪指数给你一个可审计的数字，只在证据变化时移动，每一次移动背后都有预先登记的条件。它不是“2027 年 AGI 的概率”，而是阿申布伦纳那些具体、可证伪断言当前评级的运行分数。头条断言将于 <strong>2028 年 1 月 1 日</strong>前见分晓。</p>
<h2>分数历史</h2>
<table><thead><tr><th>日期</th><th>分数</th></tr></thead><tbody>{zh_hist_rows}</tbody></table>
  <h2>常见问题</h2>
  {zh_faq_html}
  <div class="related">
    <h2>相关</h2>
    <a href="/zh/will-agi-arrive-2027">AGI 会在 2027 年到来吗？ →</a><a href="/zh/how-close-is-agi">AGI 还有多远？ →</a><a href="/cn">查看完整中文记分牌 →</a>
  </div>
  <div class="cta">
    <p style="margin:0;font-weight:600;">分数变动时第一时间通知你</p>
    <p style="margin:6px 0 0;font-size:13px;color:var(--muted);">指数只在真实证据出现时移动。订阅即可在判定翻转的那一刻收到提醒——免费、无炒作。</p>
    <a href="https://agiscorecard.beehiiv.com/subscribe?utm_source=agiscorecard&utm_medium=zh_progress_index" target="_blank" rel="noopener" onclick="gtag('event','subscribe_click',{{location:'zh_progress_index'}});">免费订阅 →</a>
  </div>
</article>
<footer>AGI 记分牌 · 独立追踪 <a href="https://situational-awareness.ai" style="color:var(--muted);">《态势感知》</a> · 不隶属于任何 AI 实验室 · <a href="/about" style="color:var(--muted);">About</a> · <a href="/privacy" style="color:var(--muted);">Privacy</a></footer>
</body>
</html>"""
os.makedirs(os.path.join(ROOT, "zh"), exist_ok=True)
open(os.path.join(ROOT, "zh", "progress-index.html"), "w").write(zh_html)
print("zh/progress-index.html written")
