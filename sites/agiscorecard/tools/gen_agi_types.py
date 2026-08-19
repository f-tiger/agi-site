# -*- coding: utf-8 -*-
"""Generate /agi-type/<slug> (EN) and /zh/agi-type/<slug> (zh) result pages for the
"What's your AGI type?" game. Each is a SOCIAL SHARE landing page: its own og:image
(share/<slug>.png / share/zh-<slug>.png) so a shared link unfurls a branded card,
plus the archetype reveal, a data-backed case (real forecaster positions only — no
invented stats), the subscribe funnel, a native "Challenge a friend" re-share
(navigator.share → WhatsApp/WeChat/iMessage, X-intent fallback) to continue the
fission chain, and a loop back to the test. noindex,follow — share pages, not the
crawl surface (og scraping works regardless). Score read from data.json (no drift)."""
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
types = json.load(open(os.path.join(ROOT, "tools", "agi_types.json")))
SCORE = str(json.load(open(os.path.join(ROOT, "data.json")))["thesisTracker"]["score"])
GA = "G-FZXLMBB5QB"

CASE_EN = {
    "accelerationist": "You're betting AGI lands in 2025&ndash;26 &mdash; ahead of even Elon Musk's end-2026 call and Aschenbrenner's 2027 baseline. The case: compute is still scaling ~0.5 orders of magnitude a year, and agentic coding (SWE-Bench Pro ~80%) plus knowledge work (GDPval ~83%) are climbing fast. The risk: the last mile of reliable autonomy has repeatedly proven harder than benchmarks suggest.",
    "true-believer": "You land exactly on Leopold Aschenbrenner's <em>Situational Awareness</em> line: AGI by 2027, driven by \"counting the OOMs.\" Two years in, our scorecard has 3 predictions on track and 1 clearly wrong (open-source didn't fade) &mdash; the AGI-2027 Thesis Tracker sits at " + SCORE + "/100.",
    "realist": "You're with Demis Hassabis (~2030): AGI this decade, but past the 2027 focal point. The case: capability curves are real, but robustness, reasoning depth, and deployment lag stretch the timeline a few years beyond the most aggressive lab insiders.",
    "skeptic": "You're near Metaculus's community forecast (~2033) &mdash; more cautious than most frontier-lab leaders. The case: benchmark scores overstate real-world generality, and each past AI wave underdelivered on its boldest timelines. You expect the same discount here.",
    "contrarian": "You side with the broad academic survey (~2040+): AGI is far off, or not on the current trajectory at all. The case: today's systems still lack durable reasoning, agency, and grounding &mdash; and 15 OOMs of scaling haven't closed that gap. You're betting the trendlines break before they finish.",
}
CASE_ZH = {
    "accelerationist": "你押注 AGI 在 2025&ndash;26 年到来&mdash;&mdash;比马斯克的 2026 年底和 Aschenbrenner 的 2027 基线还早。论据：算力仍以每年约 0.5 个数量级扩张，智能体编码（SWE-Bench Pro ~80%）与知识工作（GDPval ~83%）都在快速攀升。风险：可靠自主性的“最后一公里”一再被证明比基准分数暗示的更难。",
    "true-believer": "你正好落在 Leopold Aschenbrenner《态势感知》的 2027 线上：AGI 2027 年，由“数数量级”驱动。两年过去，我们的记分牌有 3 项预测在轨、1 项明显错误（开源并未消退）&mdash;&mdash;AGI-2027 命题追踪指数为 " + SCORE + "/100。",
    "realist": "你与 Demis Hassabis（约 2030）一致：AGI 在这个十年内，但已过 2027 焦点。论据：能力曲线是真实的，但稳健性、推理深度和部署滞后，把时间线拉长到最激进的实验室内部人之外几年。",
    "skeptic": "你接近 Metaculus 社区预测（约 2033）&mdash;&mdash;比多数前沿实验室领导者更谨慎。论据：基准分数高估了真实世界的通用性，过去每一波 AI 浪潮都没兑现最大胆的时间线。你预期这次同样要打折。",
    "contrarian": "你站在广泛的学界调查一边（约 2040+）：AGI 还很遥远，或根本不在当前轨道上。论据：今天的系统仍缺乏持久推理、自主性与现实锚定&mdash;&mdash;15 个数量级的扩张也没弥合这个差距。你押注趋势线会在跑完之前中断。",
}

# Per-language UI strings + field pickers.
LANGS = {
    "en": {
        "dir": "agi-type", "cardpfx": "", "htmllang": "en", "test": "/agi-test",
        "name": lambda t: t["name"], "tl": lambda t: t["timeline"], "vs": lambda t: t["vs"],
        "case": CASE_EN, "utm": "agi_type_page", "subloc": "agi_type_page",
        "title": "{name} &mdash; What's your AGI type? | AGI Scorecard",
        "desc": "{name}: {tl}. {vsp} Take the AGI Test and see where you land vs Musk, Aschenbrenner, Hassabis and Metaculus.",
        "ogtitle": "I'm {name} {emoji} on AGI. What's your type?",
        "ogdesc": "{tl} &mdash; {vsp} Take the AGI Test.",
        "kicker": "Your AGI type", "cta_p": "Want to know if your call was right? We track it &mdash; the AGI-2027 Thesis Tracker is at {score}/100.",
        "cta_btn": "Get the next move &rarr;", "challenge": "🔥 Challenge a friend", "retake": "What's <em>your</em> AGI type? &rarr;",
        "score_link": "See the live AGI-2027 score &rarr;", "share_title": "What's your AGI type?",
        "share_text": "I'm {name} {emoji} on AGI. Think you can out-predict me? What's your AGI type?",
        "foot": "By the AGI Scorecard team &middot; <a href=\"/about\">methodology</a> &middot; <a href=\"/agi-questions\">all AGI questions</a> &middot; <a href=\"/\">agiscorecard.com</a><br>Grades the falsifiable predictions in Aschenbrenner's <em>Situational Awareness</em>. Not affiliated with any lab.",
        "altlabel": "中文", "alturl": "https://agiscorecard.com/zh/agi-type/{slug}",
    },
    "zh": {
        "dir": "zh/agi-type", "cardpfx": "zh-", "htmllang": "zh", "test": "/zh/agi-test",
        "name": lambda t: t["name_zh"], "tl": lambda t: t["timeline_zh"], "vs": lambda t: t["vs_zh"],
        "case": CASE_ZH, "utm": "zh_deep_page", "subloc": "zh_agi_type_page",
        "title": "{name} &mdash; 你是哪种 AGI 类型？| AGI 记分牌",
        "desc": "{name}：{tl}。{vsp} 来做 AGI 类型测试，看你和马斯克、Aschenbrenner、Hassabis、Metaculus 谁更接近。",
        "ogtitle": "我是{name}{emoji}。你是哪种 AGI 类型？",
        "ogdesc": "{tl} &mdash; {vsp} 来做 AGI 类型测试。",
        "kicker": "你的 AGI 类型", "cta_p": "想知道你判断得对不对？我们在追踪&mdash;&mdash;AGI-2027 命题追踪指数现为 {score}/100。",
        "cta_btn": "订阅，第一时间知道分数变动 &rarr;", "challenge": "🔥 挑战朋友", "retake": "你是哪种 AGI 类型？&rarr;",
        "score_link": "查看 AGI-2027 实时分数 &rarr;", "share_title": "你是哪种 AGI 类型？",
        "share_text": "我是{name}{emoji}。你能比我预测得更准吗？你是哪种 AGI 类型？",
        "foot": "AGI 记分牌团队 &middot; <a href=\"/about\">方法论</a> &middot; <a href=\"/agi-questions\">全部 AGI 问题</a> &middot; <a href=\"/\">agiscorecard.com</a><br>为 Aschenbrenner《态势感知》中的可证伪预测评分。与任何实验室无关联。",
        "altlabel": "English", "alturl": "https://agiscorecard.com/agi-type/{slug}",
    },
}

PAGE = """<!doctype html><html lang="{htmllang}"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="robots" content="noindex,follow">
<link rel="canonical" href="https://agiscorecard.com/{dir}/{slug}">
<meta property="og:type" content="website">
<meta property="og:url" content="https://agiscorecard.com/{dir}/{slug}">
<meta property="og:title" content="{ogtitle}">
<meta property="og:description" content="{ogdesc}">
<meta property="og:image" content="https://agiscorecard.com/share/{cardpfx}{slug}.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{ogtitle}">
<meta name="twitter:image" content="https://agiscorecard.com/share/{cardpfx}{slug}.png">
<style>
:root{{--bg:#0e0e14;--bg2:#16151f;--border:#26232f;--text:#f4f4f8;--muted:#a8a4c4;--accent:#7c6af5;--accent2:#4fc3a1}}
*{{margin:0;padding:0;box-sizing:border-box}}
body{{background:radial-gradient(900px 500px at 30% -5%,#1a1830,#0e0e14);color:var(--text);font:16px/1.6 -apple-system,'Segoe UI','Noto Sans CJK SC',Roboto,sans-serif;min-height:100vh}}
.wrap{{max-width:680px;margin:0 auto;padding:28px 20px 60px}}
a{{color:var(--accent)}}
header{{display:flex;justify-content:space-between;align-items:center;font-size:14px;margin-bottom:34px}}
header .brand{{font-weight:700;color:var(--text);text-decoration:none}}
.kicker{{font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}}
h1{{font-size:40px;line-height:1.05;margin:8px 0 10px;letter-spacing:-.02em}}
.tl{{font-size:20px;font-weight:600;color:{tint}}}
.vs{{color:var(--muted);margin-top:6px}}
.card{{width:100%;border-radius:14px;border:1px solid var(--border);margin:24px 0;display:block}}
.case{{background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:18px 20px;margin:20px 0}}
.cta{{background:linear-gradient(135deg,rgba(124,106,245,.14),rgba(79,195,161,.08));border:1px solid rgba(124,106,245,.3);border-radius:12px;padding:20px;margin:22px 0;text-align:center}}
.cta p{{margin:0 0 12px;font-weight:600}}
.btn{{display:inline-block;background:var(--accent);color:#fff;padding:11px 24px;border-radius:8px;font-weight:600;text-decoration:none}}
.btn.ghost{{background:transparent;border:1px solid var(--accent);color:var(--accent)}}
button.btn{{border:0;cursor:pointer;font-family:inherit;font-size:15px}}
.row{{display:flex;gap:10px;flex-wrap:wrap;justify-content:center}}
footer{{margin-top:40px;font-size:12px;color:var(--muted);text-align:center}}
footer a{{color:var(--muted)}}
</style></head>
<body><div class="wrap">
<header><a class="brand" href="/">◆ AGI Scorecard</a><span class="kicker"><a href="{alturl}" style="color:var(--muted)">{altlabel}</a></span></header>
<div class="kicker">{kicker}</div>
<h1>{emoji} {name}</h1>
<div class="tl">{tl}</div>
<div class="vs">{vs}</div>
<img class="card" src="/share/{cardpfx}{slug}.png" width="1200" height="630" alt="{name} — {tl}">
<div class="case">{case}</div>
<div class="cta">
  <p>{cta_p}</p>
  <a class="btn" href="https://agiscorecard.beehiiv.com/subscribe?utm_source=agiscorecard&amp;utm_medium={utm}" target="_blank" rel="noopener" onclick="gtag('event','subscribe_click',{{location:'{subloc}'}});">{cta_btn}</a>
</div>
<div class="row">
  <button class="btn" onclick="challengeFriend()">{challenge}</button>
  <a class="btn ghost" href="{test}" onclick="gtag('event','retake_test',{{label:'{slug}'}});">{retake}</a>
</div>
<p style="text-align:center;color:var(--muted);font-size:13px;margin-top:14px"><a href="/progress-index" onclick="gtag('event','index_click',{{location:'agi_type_{slug}'}});">{score_link}</a></p>
<footer>{foot}</footer>
</div>
<script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments)}}
function challengeFriend(){{
  var url="https://agiscorecard.com/{dir}/{slug}";
  var text="{share_text}";
  gtag('event','challenge_share',{{label:'{slug}'}});
  if(navigator.share){{navigator.share({{title:"{share_title}",text:text,url:url}}).catch(function(){{}});}}
  else{{window.open("https://twitter.com/intent/tweet?text="+encodeURIComponent(text+" 👇")+"&url="+encodeURIComponent(url),"_blank");}}
}}</script>
<script async src="https://www.googletagmanager.com/gtag/js?id={ga}"></script>
<script>gtag('js',new Date());gtag('config','{ga}')</script>
</body></html>"""

def plain(s):
    return s.replace("&mdash;", "—").replace("&ndash;", "–").replace("<em>", "").replace("</em>", "")

for lang, cfg in LANGS.items():
    os.makedirs(os.path.join(ROOT, cfg["dir"]), exist_ok=True)
    for t in types:
        name, tl, vs = cfg["name"](t), cfg["tl"](t), cfg["vs"](t)
        out = PAGE.format(
            htmllang=cfg["htmllang"], dir=cfg["dir"], cardpfx=cfg["cardpfx"], slug=t["slug"],
            emoji=t["emoji"], name=name, tl=tl, vs=vs, tint=t["tint"], score=SCORE, ga=GA,
            title=cfg["title"].format(name=name, tl=tl),
            desc=cfg["desc"].format(name=name, tl=tl, vsp=plain(vs)),
            ogtitle=cfg["ogtitle"].format(name=name, emoji=t["emoji"]),
            ogdesc=cfg["ogdesc"].format(tl=tl, vsp=plain(vs)),
            kicker=cfg["kicker"], cta_p=cfg["cta_p"].format(score=SCORE), cta_btn=cfg["cta_btn"],
            challenge=cfg["challenge"], retake=cfg["retake"], score_link=cfg["score_link"],
            case=cfg["case"][t["slug"]], utm=cfg["utm"], subloc=cfg["subloc"], test=cfg["test"],
            share_title=cfg["share_title"], share_text=cfg["share_text"].format(name=name, emoji=t["emoji"]),
            foot=cfg["foot"], altlabel=cfg["altlabel"], alturl=cfg["alturl"].format(slug=t["slug"]),
        )
        with open(os.path.join(ROOT, cfg["dir"], f"{t['slug']}.html"), "w") as f:
            f.write(out)
        print("wrote %s/%s.html" % (cfg["dir"], t["slug"]))
