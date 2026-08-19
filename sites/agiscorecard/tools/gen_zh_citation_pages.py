# -*- coding: utf-8 -*-
"""zh 版：/zh/situational-awareness-summary + /zh/ai-orders-of-magnitude-explained

引用放大队列（2026-08-16）的中文部分。这两页在英文侧分别占全站 AI 引用的
42% 与 18 次，却连中文版都没有。

**做法刻意是「克隆已上线的 zh 页外壳」而不是自己写一套 CSS**：站长 2026-07-25
定下的浅色 Swiss 锚点已经落在那 31 个 zh 深页里，原样复用那段 <style> 与
langbar/页脚骨架，就不可能跑偏配色；我只替换标题、描述、正文与 FAQ。

正文是英文原页的忠实翻译，判定/数字/日期照搬，不新增任何事实。
Run: python3 tools/gen_zh_citation_pages.py
"""
import os, re, json

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DONOR = os.path.join(ROOT, "zh", "did-open-source-ai-fade.html")
DONOR_SLUG = "did-open-source-ai-fade"
SITE = "https://agiscorecard.com"
LANGS = ["es", "ja", "pt", "de", "fr", "ko", "it"]
TODAY = "2026年8月16日"

PAGES = {
  "situational-awareness-summary": {
    "title": "《态势感知》全文摘要与判定：两年后哪些成立了？",
    "desc": "阿申布伦纳 2024 年的《态势感知》主张 2027 年前后到达 AGI。两年过去：算力与资本开支基本兑现，开源衰落判定为错误，AGI-2027 仍未决。",
    "h1": "《态势感知》摘要 —— 并逐条判定",
    "capsule": '<span class="verdict">「AGI 已经很近」这一派的代表作——它曾由一支 450 亿美元的基金背书，而那支基金在 2026 年 7 月爆掉了。</span>《态势感知》（2024 年 6 月）主张 <strong>2027 年</strong>前后 AGI 是可能的、2030 年代初出现超级智能，动力来自算力扩张、算法进步与「解除束缚」。两年之后，它的趋势类预测大体站得住；「开源会衰落」这一条判定为<strong class="v-wrong">错误</strong>；AGI-2027 仍然<strong class="v-open">未决</strong>。',
    "secs": [
      ("这篇文章在论证什么", "<p>阿申布伦纳这篇 165 页的文章，建立在对「数量级（OOM）」趋势的外推之上。推理链条是：算力持续扩张、算法持续改进、模型不断被「解除束缚」（工具、智能体、推理能力）——三者叠加，在 2027 年前后到达一个能干 AI 研究员的活的 AI。那会触发智能爆炸（2027–29），并在 2030 年代走向超级智能；而国家安全的逻辑必然让政府以一个「项目」接管这一切。</p>"),
      ("六条关键预测", "<ul><li><strong>2027 年前后 AGI</strong> —— 达到「自动化 AI 研究员」的水平</li><li><strong>2027–29 智能爆炸</strong> —— AI 自动化 AI 研究，把十年压缩进一年</li><li><strong>2030 年代超级智能</strong></li><li><strong>算力每年扩张约 0.5 个数量级</strong>，以及<strong>万亿美元级资本开支</strong></li><li><strong>开源衰落</strong>，专有算法形成持久的美国护城河</li><li><strong>美国政府的 AGI 项目</strong>（「那个项目」）在 2027/28 年前成立</li></ul>"),
      ("现在的判定", '<table><thead><tr><th>预测</th><th>判定（2026 年中）</th></tr></thead><tbody><tr><td>在知识工作上超过大学毕业生</td><td class="nowrap v-ok">兑现中</td></tr><tr><td>算力每年约 0.5 个数量级</td><td class="nowrap v-ok">兑现中</td></tr><tr><td>万亿美元级资本开支</td><td class="nowrap v-ok">超额兑现</td></tr><tr><td>开源衰落、护城河成立</td><td class="nowrap v-wrong">错误</td></tr><tr><td>2027 年前后 AGI</td><td class="nowrap v-open">未决</td></tr><tr><td>美国政府 AGI 项目（27/28 年）</td><td class="nowrap v-open">未决</td></tr><tr><td>智能爆炸 2027–29</td><td class="nowrap v-pending">待验证</td></tr><tr><td>超级智能，2030 年代</td><td class="nowrap v-pending">待验证</td></tr></tbody></table>'),
      ("结论", "<p>阿申布伦纳押注的那几条输入侧曲线——算力、资本开支、原始能力——大体兑现，甚至超出预期。他最大的失手在扩散侧：开源并没有衰落。而真正定义这篇文章成败的那一条主张「2027 年前后 AGI」，将在 2028 年 1 月见分晓。</p>"),
    ],
    "faqs": [
      ("《态势感知》讲的是什么？", "这是莱奥波德·阿申布伦纳 2024 年 6 月发表的长文，主张 2027 年前后到达 AGI，随后是智能爆炸与 2030 年代的超级智能，动力来自算力扩张、算法进步与「解除束缚」。"),
      ("《态势感知》具体预测了什么？", "2027 年前后 AGI、2027–29 年的智能爆炸、2030 年代的超级智能、算力持续扩张、万亿美元级资本开支、开源衰落，以及一个美国政府主导的 AGI 项目。"),
      ("《态势感知》说得准吗？", "部分准确。算力、资本开支与能力方面的预测大体兑现；开源那一条判定为错误；而定义性的 AGI-2027 主张仍然未决，将在 2028 年 1 月见分晓。"),
    ],
  },
  "ai-orders-of-magnitude-explained": {
    "title": "AI 的「数量级（OOM）」是什么？2027 论证的算法",
    "desc": "一个数量级就是 10 倍。阿申布伦纳的 AGI 论证本质是一道加法题：把有效算力的数量级按每年约 0.5 个往上堆。两年后这个速度基本保住了。",
    "h1": "AI 的「数量级（OOM）」解释",
    "capsule": '<span class="verdict">2027 年预测背后的那套数数方法。</span>一个数量级（OOM）就是 10 倍。阿申布伦纳整套 AGI 论证，建立在数<strong>有效算力</strong>的数量级上——原始算力＋算法效率＋「解除束缚」——并押注它们以每年约 <strong>0.5 个数量级</strong>的速度累积，直到 2027 年的 AGI。两年过去，这个速度<strong class="v-ok">大体保住了</strong>。',
    "secs": [
      ("什么是一个数量级", "<p>一个数量级 = 10 倍，两个数量级 = 100 倍。阿申布伦纳用数量级思考，是因为 AI 的进步是指数式的：追踪「一年翻几个 10 倍」比追踪绝对数字容易得多。他的预测本质上是一道加法题——把有效算力的数量级堆够，就越过 AGI 的门槛。</p>"),
      ("数量级的三个来源", '<table><thead><tr><th>来源</th><th>它贡献什么</th></tr></thead><tbody><tr><td>原始算力</td><td>更大规模的训练</td></tr><tr><td>算法效率</td><td>每 FLOP 换来更多能力</td></tr><tr><td>解除束缚</td><td>释放潜在能力（推理、工具、智能体）</td></tr></tbody></table>'),
      ("这个赌注跑成什么样了", "<p>他预计有效算力每年增长约 <strong>0.5 个数量级</strong>并持续下去。截至 2026 年年中，一份独立核查把这个速度评为「大体得到支持」，各次发布散落在趋势线上下约 ±0.5 个数量级的范围内。这台「数量级引擎」是它下游每一条主张的地基——能力、AGI 的时点、智能爆炸都建在上面。数量级一旦停止累积，整个 2027 论证就会往后滑。</p>"),
    ],
    "faqs": [
      ("AI 里说的「数量级」是什么意思？", "一个数量级（OOM）就是 10 倍。阿申布伦纳数的是「有效算力」的数量级——原始算力加上算法效率再加上解除束缚——因为 AI 的进步是指数式的，用「一年几个 10 倍」来追踪更容易。"),
      ("阿申布伦纳预测每年几个数量级？", "有效算力每年约 0.5 个数量级，并在整个十年里持续。截至 2026 年年中，这个速度大体保住了。"),
      ("数量级为什么对 AGI 重要？", "因为他的 AGI 预测本质上是一道加法题：把有效算力的数量级堆够就越过门槛。数量级一旦停止累积，2027 年的时间表就会往后滑。"),
    ],
  },
}


def main():
    donor = open(DONOR, encoding="utf-8").read()
    style = re.search(r"<style>.*?</style>", donor, re.S).group(0)
    # 页脚骨架:从 FAQ 之后到文件末尾,按 slug 参数化
    tail = donor[donor.index('<h2>常见问题</h2>'):]
    tail = tail[tail.index('</div>\n', tail.index('faq-q')):] if False else None

    for slug, d in PAGES.items():
        secs = "".join(f"<h2>{h}</h2>\n{b}\n" for h, b in d["secs"])
        faq_html = "".join(f'<div class="faq-q">{q}</div>\n<p>{a}</p>\n' for q, a in d["faqs"])
        url = f"{SITE}/zh/{slug}"
        en = f"{SITE}/{slug}"
        alts = "\n".join(f'<link rel="alternate" hreflang="{l}" href="{SITE}/{l}/{slug}">' for l in LANGS)
        langbar = ' <span style="color:var(--border2);">·</span> '.join(
            [f'<a href="/{slug}" style="color:var(--muted);">EN</a>',
             '<span style="color:var(--text);font-weight:600;">中文</span>']
            + [f'<a href="/{l}/{slug}" style="color:var(--muted);">{n}</a>'
               for l, n in zip(LANGS, ["ES", "日本語", "PT", "DE", "FR", "한국어", "IT"])])
        ld = [
            {"@context": "https://schema.org", "@type": "Article", "headline": d["h1"],
             "inLanguage": "zh-Hans", "mainEntityOfPage": url,
             "author": {"@type": "Organization", "name": "AGI 记分牌"},
             "publisher": {"@type": "Organization", "name": "AGI 记分牌"},
             "dateModified": "2026-08-16", "description": d["desc"]},
            {"@context": "https://schema.org", "@type": "FAQPage",
             "mainEntity": [{"@type": "Question", "name": q,
                             "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in d["faqs"]]},
        ]
        ld_html = "\n".join('<script type="application/ld+json">' + json.dumps(x, ensure_ascii=False) + "</script>" for x in ld)

        html = f"""<!DOCTYPE html>
<html lang="zh-Hans">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<script async src="https://www.googletagmanager.com/gtag/js?id=G-B3PN0PLGTG"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments);}}
gtag('js',new Date());gtag('config','G-B3PN0PLGTG');</script>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%23ffffff'/%3E%3Ccircle cx='16' cy='16' r='6' fill='%234fc3a1'/%3E%3C/svg%3E">
<title>{d["title"]}</title>
<meta name="description" content="{d["desc"]}">
<link rel="canonical" href="{url}">
<link rel="alternate" hreflang="en" href="{en}">
<link rel="alternate" hreflang="zh-Hans" href="{url}">
{alts}
<link rel="alternate" hreflang="x-default" href="{en}">
<meta property="og:site_name" content="AGI 记分牌">
<meta property="og:title" content="{d["title"]}">
<meta property="og:description" content="{d["desc"]}">
<meta property="og:type" content="article">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{SITE}/scorecard-summary.png">
<meta name="twitter:card" content="summary_large_image">
{ld_html}
{style}
</head>
<body>
<div class="wrap">
<h1>{d["h1"]}</h1>
  <div class="updated">最后更新：{TODAY} · 随判定变化持续更新</div>
  <nav class="langbar" aria-label="Language" style="display:flex;flex-wrap:wrap;align-items:center;gap:6px 8px;font-size:12px;margin:-0.5rem 0 1.5rem;padding-bottom:1rem;border-bottom:1px solid var(--border);">{langbar}</nav>
  <div class="capsule">{d["capsule"]}</div>

<!-- 引用落地钩子：聊天答案讲得完静态内容，讲不完一个会变的数字。 -->
<div style="margin:0 0 1.6rem;background:var(--bg2);border:1px solid var(--border2);border-left:3px solid var(--accent);border-radius:0 12px 12px 0;padding:14px 18px;">
  <div style="font-size:12px;letter-spacing:.06em;color:var(--muted);">聊天答案会过期的那部分</div>
  <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:baseline;margin-top:6px;">
    <a href="/zh/progress-index" onclick="gtag('event','index_click',{{location:'zh_{slug.replace("-", "_")}_live'}});" style="font-size:28px;font-weight:800;font-variant-numeric:tabular-nums;text-decoration:none;">62.5<span style="font-size:16px;color:var(--muted);">/100</span></a>
    <span style="font-size:14px;color:var(--muted);">AGI-2027 命题现在还剩多少站得住 —— 由八条判定重算，截至 <strong>2026-08-08</strong></span>
  </div>
  <div style="margin-top:9px;font-size:14px;"><a href="/zh/progress-index" style="font-weight:600;">看全部八条判定及各自的翻转条件 &rarr;</a></div>
</div>

{secs}
<h2>常见问题</h2>
{faq_html}

<div class="cta" style="margin:2rem 0;background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:16px 18px;">
  <b>判定变化时，第一时间知道</b>
  <p style="margin:6px 0 10px;font-size:14px;color:var(--muted);">八条判定里任何一条翻转，追踪指数就会动。留个邮箱，动的那天我发一封。</p>
  <a href="https://agiscorecard.beehiiv.com/subscribe?utm_source=agiscorecard&amp;utm_medium=zh_deep_page" target="_blank" rel="noopener" onclick="gtag('event','subscribe_click',{{location:'zh_deep_page'}});" style="display:inline-block;background:var(--accent);color:#fff;padding:9px 20px;border-radius:2px;font-size:14px;font-weight:600;text-decoration:none;">订阅（免费）&rarr;</a>
  <p style="font-size:11.5px;color:var(--muted);margin:8px 0 0">订阅表单为英文：输入邮箱 → 点 Subscribe 即完成。</p>
</div>

<h2>相关</h2>
<div class="rel" style="display:flex;flex-direction:column;gap:6px;font-size:14.5px;">
<a href="/zh/progress-index">AGI-2027 命题追踪指数 →</a>
<a href="/cn">中文首页：这八条预测的完整记分牌 →</a>
<a href="/{slug}">English version →</a>
</div>
</div>
</body>
</html>
"""
        out = os.path.join(ROOT, "zh", slug + ".html")
        open(out, "w", encoding="utf-8").write(html)
        print(f"wrote zh/{slug}.html  {len(html)//1024}KB")


if __name__ == "__main__":
    main()
