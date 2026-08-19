# -*- coding: utf-8 -*-
"""Generate zh/what-is-agi.html + add hreflang pair to the EN page."""
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from gen_lib import STYLE, GTAG, FAVICON, SITE, OUT

URL = f"{SITE}/zh/what-is-agi"
EN_URL = f"{SITE}/what-is-agi"
PUB = "2026-07-10"

HREFLANG = f"""<link rel="alternate" hreflang="en" href="{EN_URL}">
<link rel="alternate" hreflang="zh-Hans" href="{URL}">
<link rel="alternate" hreflang="x-default" href="{EN_URL}">"""

TITLE = "什么是 AGI？定义、时间表与 2026 年现状"
DESC = "AGI（通用人工智能）指能完成熟练人类几乎所有认知任务的 AI。三种通行定义、为何定义之争决定了时间表之争，以及 2026 年年中的真实进展。"

faqs = [
    ("用最简单的话说，什么是 AGI？", "AGI（通用人工智能）是指能完成熟练人类专业人员几乎所有认知任务的 AI——不只是聊天或应试，而是跨领域完成真实工作。最严格的通行标准是：AI 能自主进行 AI 研究本身。"),
    ("AGI 和超级智能（ASI）有什么区别？", "AGI 在通用认知工作上达到熟练人类水平；ASI（超级智能）则在几乎所有方面远超最优秀的人类。多数预测中 AGI 先到来，并通过自动化 AI 研究加速通往 ASI。"),
    ("2026 年 AGI 存在吗？", "按最宽松的定义（限定任务上的基准能力），已接近——知识工作基准约 83%。但按严肃标准——可靠的即插即用员工、或自动化 AI 研究员——还没有。这个自主性缺口正是“2027 年 AGI”预测仍为悬而未决的原因。"),
    ("为什么各方 AGI 预测差这么多？", "主要是定义不同、以及对自主性缺口的权重不同。用能力标准的预测者给出 2026–2027；看重可靠性与自主性的落在 2030–2047。目前公开预测从马斯克的 2026 到学界调查中位数 2047 不等。"),
]

article = {"@context": "https://schema.org", "@type": "Article", "headline": "什么是 AGI？",
           "datePublished": PUB, "dateModified": PUB, "inLanguage": "zh-Hans",
           "author": {"@type": "Organization", "name": "The AGI Scorecard"},
           "publisher": {"@type": "Organization", "name": "The AGI Scorecard", "url": SITE + "/"},
           "description": DESC}
faq_ld = {"@context": "https://schema.org", "@type": "FAQPage",
          "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faqs]}
ld = "\n".join('<script type="application/ld+json">' + json.dumps(d, ensure_ascii=False) + '</script>' for d in (article, faq_ld))
faq_html = "".join(f'<div class="faq-q">{q}</div><p>{a}</p>' for q, a in faqs)

BODY = """<h2>三种通行定义，决定了三种答案</h2>
<table><thead><tr><th>定义（门槛）</th><th>要求</th><th>2026 年年中状态</th></tr></thead><tbody>
<tr><td><strong>基准能力级</strong></td><td>在限定专业任务上匹敌熟练人类</td><td class="nowrap v-ok">大体已达（GDPval 约 83%、SWE-Bench Pro 约 80%）</td></tr>
<tr><td><strong>即插即用员工级</strong></td><td>无监督、可靠地端到端完成一份真实工作</td><td class="nowrap v-open">未达——可靠性落后于基准分数</td></tr>
<tr><td><strong>自动化 AI 研究员级</strong>（阿申布伦纳标准）</td><td>自主开展 AI 研究本身</td><td class="nowrap v-open">未被证明</td></tr>
</tbody></table>
<p>几乎所有关于“AGI 何时到来”的公开争论，本质上都是在争哪一行才算数。按第一行，类似 AGI 的东西正在到来；按第三行——《态势感知》采用的标准，因为它会触发<a href="/zh/will-agi-arrive-2027">智能爆炸</a>——它还没有到来，这正是本站“2027 年 AGI”判定所追踪的对象。</p>
<h2>AGI 不是什么</h2>
<p>AGI 不等于超级智能（ASI）——后者指在几乎一切方面远超最优秀人类的 AI。在标准推演中，AGI 是扳机：一旦 AI 能做 AI 研究，数十万个自动化研究员将压缩十年进度，随后才是超级智能。AGI 也不等于一个很强的聊天机器人：流畅对话数年前就已实现，但严肃定义所要求的自主性至今缺席。</p>
<h2>2026 年我们离 AGI 有多近？</h2>
<p>能力上，很近：模型在限定知识工作和智能体编程上已接近熟练人类区间顶部。自主性上，决定性缺口仍在：还没有任何系统能在无人监督下可靠地跑完整个研究闭环或一份完整工作。这种“分裂判定”正是本站把能力预测评为<strong class="v-ok">符合进度</strong>、而把<a href="/zh/will-agi-arrive-2027">“2027 年 AGI”</a>评为<strong class="v-open">悬而未决</strong>的原因——该判定将于 2028 年 1 月 1 日前见分晓。</p>
<h2>各方预计何时到来？</h2>
<p>公开时间表横跨马斯克的 2026 年底、阿申布伦纳的 2027、哈萨比斯的“2030 年约 50%”、Metaculus 社区的“2033 年 50%”、卡帕西的“约十年”，直到学界调查中位数 2047——而专家中位数在约六年里从 ~2060 压缩到了 ~2033。完整对比见<a href="/zh/when-will-agi-arrive">《AGI 什么时候到来》</a>。</p>"""

html = f"""<!DOCTYPE html>
<html lang="zh-Hans">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
{GTAG}
{FAVICON}
<title>{TITLE}</title>
<meta name="description" content="{DESC}">
<link rel="canonical" href="{URL}">
{HREFLANG}
<meta property="og:site_name" content="The AGI Scorecard">
<meta property="og:title" content="什么是 AGI？">
<meta property="og:description" content="{DESC}">
<meta property="og:type" content="article">
<meta property="og:url" content="{URL}">
<meta property="og:image" content="{SITE}/scorecard-summary.png">
{ld}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
{STYLE}
</style>
</head>
<body>
<header>
  <a href="/cn" class="logo"><span class="logo-dot"></span>AGI 记分牌</a>
  <a href="/what-is-agi" class="back-link">EN ↗</a>
</header>
<article>
  <div class="eyebrow">概念解读</div>
  <h1>什么是 AGI？定义之争背后的时间表之争</h1>
  <div class="updated">最后更新：2026年7月10日 · 随判定变化更新</div>
  <div class="capsule"><span class="verdict">能完成熟练人类认知工作的 AI——而定义本身就是争论的一半。</span> AGI（通用人工智能）通常指能完成<strong>熟练人类专业人员几乎所有认知任务</strong>的 AI。但各方使用的门槛差异极大——从“即插即用的远程员工”到“自动化 AI 研究员”——这个定义分歧解释了为何公开预测横跨 <strong>2026 到 2047</strong>。</div>
{BODY}
  <h2>常见问题</h2>
  {faq_html}
  <div class="related">
    <h2>相关</h2>
    <a href="/zh/when-will-agi-arrive">AGI 什么时候到来？ →</a><a href="/zh/will-agi-arrive-2027">AGI 会在 2027 年到来吗？ →</a><a href="/zh/was-aschenbrenner-right">阿申布伦纳预测准吗？ →</a>
    <a href="/cn">查看完整中文记分牌 →</a>
  </div>
  <div class="cta">
    <p style="margin:0;font-weight:600;">记分牌随模型发布与判定变化实时更新。</p>
    <a href="/cn">查看实时记分牌 →</a>
  </div>
</article>
<footer>AGI 记分牌 · 独立追踪 <a href="https://situational-awareness.ai" style="color:var(--muted);">《态势感知》</a> · 不隶属于任何 AI 实验室 · <a href="/about" style="color:var(--muted);">About</a> · <a href="/privacy" style="color:var(--muted);">Privacy</a></footer>
</body>
</html>"""

os.makedirs(os.path.join(OUT, "zh"), exist_ok=True)
path = os.path.join(OUT, "zh", "what-is-agi.html")
with open(path, "w", encoding="utf-8") as f:
    f.write(html)
print(f"wrote zh/what-is-agi.html ({len(html)} b) title={len(TITLE)} desc={len(DESC)}")

# add reciprocal hreflang to the EN page
en_path = os.path.join(OUT, "what-is-agi.html")
s = open(en_path, encoding="utf-8").read()
if 'hreflang="zh-Hans"' not in s:
    anchor = f'<link rel="canonical" href="{EN_URL}">'
    assert anchor in s
    s = s.replace(anchor, anchor + "\n" + HREFLANG)
    open(en_path, "w", encoding="utf-8").write(s)
    print("EN page: hreflang pair added")
