# -*- coding: utf-8 -*-
"""Generate batch-2 GEO long-tail pages for agiscorecard, reusing the v13 template.
All facts are recombined from already-verified site data — no new claims invented."""
import json, os

OUT = "/home/user/agiscorecard"
SITE = "https://agiscorecard.com"
OG_IMG = f"{SITE}/scorecard-summary.png"
DATE = "2026-06-30"

STYLE = """  :root{--bg:#0a0a0b;--bg2:#111114;--bg3:#18181d;--border:rgba(255,255,255,0.07);--border2:rgba(255,255,255,0.12);--text:#e8e8ec;--muted:#8888a0;--accent:#7c6af5;--accent2:#4fc3a1;--warn:#e8a040;--danger:#e05555;--font:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;--mono:'JetBrains Mono',monospace;}
  *{box-sizing:border-box;margin:0;padding:0;}
  body{background:var(--bg);color:var(--text);font-family:var(--font);font-size:16px;line-height:1.75;}
  a{color:var(--accent);text-decoration:none;}a:hover{opacity:.8;}
  header{border-bottom:1px solid var(--border);padding:0 1.5rem;display:flex;align-items:center;justify-content:space-between;height:56px;position:sticky;top:0;background:rgba(10,10,11,.92);backdrop-filter:blur(12px);z-index:100;}
  .logo{display:flex;align-items:center;gap:10px;font-weight:600;font-size:15px;color:var(--text);}
  .logo-dot{width:8px;height:8px;background:var(--accent2);border-radius:50%;}
  .back-link{font-size:13px;color:var(--muted);}.back-link:hover{color:var(--text);opacity:1;}
  article{max-width:720px;margin:0 auto;padding:2.5rem 1.5rem 4rem;}
  .eyebrow{font-size:12px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--accent);margin-bottom:.75rem;}
  h1{font-size:clamp(1.7rem,4vw,2.4rem);font-weight:700;letter-spacing:-.02em;line-height:1.18;margin-bottom:1.25rem;}
  .capsule{background:var(--bg2);border:1px solid var(--border);border-left:3px solid var(--accent2);border-radius:0 10px 10px 0;padding:1.15rem 1.4rem;font-size:16px;margin-bottom:1.75rem;}
  .capsule .verdict{font-weight:700;}
  .v-ok{color:var(--accent2);}.v-wrong{color:var(--danger);}.v-open{color:var(--accent);}.v-pending{color:var(--muted);}
  h2{font-size:1.25rem;font-weight:600;margin:2.25rem 0 .9rem;letter-spacing:-.01em;}
  h3{font-size:1.05rem;font-weight:600;margin:1.5rem 0 .6rem;}
  p{margin-bottom:1rem;}
  ul{margin:0 0 1rem 1.3rem;}li{margin-bottom:.45rem;}
  strong{color:#fff;}
  table{width:100%;border-collapse:collapse;font-size:13.5px;margin:1rem 0 1.4rem;background:var(--bg2);border:1px solid var(--border);border-radius:10px;overflow:hidden;}
  th{text-align:left;padding:10px 12px;color:var(--muted);font-weight:500;font-size:11px;letter-spacing:.05em;text-transform:uppercase;border-bottom:1px solid var(--border);}
  td{padding:10px 12px;border-bottom:1px solid var(--border);vertical-align:top;}
  tr:last-child td{border-bottom:none;}
  .nowrap{white-space:nowrap;font-weight:600;}
  .faq-q{font-weight:600;margin:1.3rem 0 .4rem;}
  .related{margin-top:2.5rem;padding-top:1.5rem;border-top:1px solid var(--border);}
  .related h2{margin-top:0;}
  .related a{display:block;padding:6px 0;font-size:14px;}
  .src{font-size:12px;color:var(--muted);margin-top:.5rem;}
  .updated{font-size:12px;color:var(--muted);margin-bottom:1.5rem;}
  .cta{margin-top:2rem;background:linear-gradient(135deg,rgba(124,106,245,.08),rgba(79,195,161,.06));border:1px solid rgba(124,106,245,.2);border-radius:14px;padding:1.5rem;text-align:center;}
  .cta a{display:inline-block;background:var(--accent);color:#fff;padding:10px 22px;border-radius:8px;font-size:14px;font-weight:500;margin-top:.6rem;}
  footer{border-top:1px solid var(--border);padding:24px 0;font-size:12px;color:var(--muted);text-align:center;}"""

GTAG = """<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-FZXLMBB5QB"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-FZXLMBB5QB');
</script>"""

FAVICON = ("<link rel=\"icon\" href=\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' "
           "viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%230a0a0b'/%3E%3Ccircle "
           "cx='16' cy='16' r='6' fill='%234fc3a1'/%3E%3C/svg%3E\">")


def article_schema(headline, desc):
    return {"@context": "https://schema.org", "@type": "Article", "headline": headline,
            "datePublished": DATE, "dateModified": DATE,
            "author": {"@type": "Organization", "name": "The AGI Scorecard"},
            "publisher": {"@type": "Organization", "name": "The AGI Scorecard", "url": SITE + "/"},
            "description": desc}


def faq_schema(faqs):
    return {"@context": "https://schema.org", "@type": "FAQPage",
            "mainEntity": [{"@type": "Question", "name": q,
                            "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faqs]}


def claimreview_schema(url, claim, rating, alt):
    return {"@context": "https://schema.org", "@type": "ClaimReview", "url": url, "datePublished": DATE,
            "author": {"@type": "Organization", "name": "The AGI Scorecard", "url": SITE + "/"},
            "claimReviewed": claim,
            "itemReviewed": {"@type": "Claim", "author": {"@type": "Person", "name": "Leopold Aschenbrenner"},
                             "datePublished": "2024-06", "appearance": {"@type": "CreativeWork", "name": "Situational Awareness"}},
            "reviewRating": {"@type": "Rating", "ratingValue": rating, "bestRating": 5, "worstRating": 1, "alternateName": alt}}


def build(slug, title, desc, og_title, eyebrow, h1, capsule, body_html, faqs,
          related, claimreviews=None, extra_schema=None):
    url = f"{SITE}/{slug}"
    schemas = [article_schema(og_title, desc), faq_schema(faqs)]
    if claimreviews:
        for c in claimreviews:
            schemas.append(claimreview_schema(url, c[0], c[1], c[2]))
    if extra_schema:
        schemas.extend(extra_schema)
    ld = "\n".join('<script type="application/ld+json">' + json.dumps(s, ensure_ascii=False) + '</script>'
                   for s in schemas)
    faq_html = "".join(f'<div class="faq-q">{q}</div><p>{a}</p>' for q, a in faqs)
    rel_html = "".join(f'<a href="{href}">{label} →</a>' for href, label in related)
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
{GTAG}
{FAVICON}
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{url}">
<meta property="og:site_name" content="The AGI Scorecard">
<meta property="og:title" content="{og_title}">
<meta property="og:description" content="{desc}">
<meta property="og:type" content="article">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{OG_IMG}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="{OG_IMG}">
{ld}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="dns-prefetch" href="https://www.googletagmanager.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
{STYLE}
</style>
</head>
<body>
<header>
  <a href="/" class="logo"><span class="logo-dot"></span>AGI Scorecard</a>
  <a href="/" class="back-link">← Live scorecard</a>
</header>
<article>
  <div class="eyebrow">{eyebrow}</div>
  <h1>{h1}</h1>
  <div class="updated">Last updated: June 30, 2026 · Updated as verdicts change</div>
  <div class="capsule">{capsule}</div>
{body_html}
  <h2>Frequently asked questions</h2>
  {faq_html}
  <div class="related">
    <h2>Related</h2>
    {rel_html}
    <a href="/two-year-scorecard.html">Full two-year scorecard with all 8 predictions →</a>
  </div>
  <div class="cta">
    <p style="margin:0;font-weight:600;">The live scorecard updates as models ship and verdicts change.</p>
    <a href="/">View the live scorecard →</a>
  </div>
</article>
<footer>AGI Scorecard · Independent tracker of <a href="https://situational-awareness.ai" style="color:var(--muted);">Situational Awareness</a> · Not affiliated with any lab</footer>
</body>
</html>"""


# Shared forecaster table (real data from existing pages)
FORECASTER_TABLE = """<table><thead><tr><th>Forecaster</th><th>AGI timeline</th></tr></thead><tbody>
<tr><td>Elon Musk (xAI)</td><td class="nowrap">By end of 2026</td></tr>
<tr><td><strong>Leopold Aschenbrenner</strong></td><td class="nowrap">2027</td></tr>
<tr><td>Demis Hassabis (DeepMind)</td><td class="nowrap">~50% by 2030</td></tr>
<tr><td>Samotsvety forecasters</td><td class="nowrap">~28% by 2030</td></tr>
<tr><td>Metaculus community</td><td class="nowrap">25% by 2029 · 50% by 2033</td></tr>
<tr><td>Andrej Karpathy</td><td class="nowrap">~A decade out</td></tr>
<tr><td>AI researcher survey (n=2,778)</td><td class="nowrap">50% by 2047</td></tr>
</tbody></table>"""

PAGES = []

# ---------------------------------------------------------------- 1. WHO IS
PAGES.append(dict(
    slug="who-is-leopold-aschenbrenner",
    title="Who Is Leopold Aschenbrenner? Predictions & Track Record (2026)",
    desc="Leopold Aschenbrenner is the former OpenAI researcher who predicted AGI by 2027 in Situational Awareness (2024). Two years on: 3 predictions on track, 1 wrong, 2 open.",
    og_title="Who is Leopold Aschenbrenner?",
    eyebrow="Profile",
    h1="Who is Leopold Aschenbrenner?",
    capsule='<span class="verdict">A former OpenAI researcher turned forecaster and investor.</span> In June 2024 Leopold Aschenbrenner published <em>Situational Awareness</em>, a 165-page essay predicting AGI by 2027, and later founded Situational Awareness LP, an AI-focused investment firm. Two years on, his major predictions grade <strong class="v-ok">3 on track</strong>, <strong class="v-wrong">1 wrong</strong>, <strong class="v-open">2 open</strong>.',
    body_html="""<h2>Background</h2>
<p>Leopold Aschenbrenner is a former member of OpenAI's Superalignment team. In June 2024 he published <em>Situational Awareness: The Decade Ahead</em>, a 165-page essay that became one of the most-discussed documents in AI forecasting. He subsequently launched <strong>Situational Awareness LP</strong>, an investment firm built around the thesis in the essay.</p>
<h2>What he predicted</h2>
<p>The essay's core argument is an extrapolation of orders-of-magnitude (OOM) trends in compute, algorithmic efficiency, and "unhobbling." From those trends he forecast AGI — AI capable of doing the work of an AI researcher — as "strikingly plausible" by 2027, followed by an intelligence explosion and superintelligence in the early 2030s.</p>
<h2>How his predictions are holding up</h2>
<p>This site grades his major predictions against mid-2026 evidence:</p>
<table><thead><tr><th>Prediction</th><th>Verdict (mid-2026)</th></tr></thead><tbody>
<tr><td>Models reach college-grad level on knowledge work</td><td class="nowrap v-ok">On track</td></tr>
<tr><td>Effective compute scales ~0.5 OOM/yr</td><td class="nowrap v-ok">On track</td></tr>
<tr><td>Trillion-dollar capex acceleration</td><td class="nowrap v-ok">Exceeded</td></tr>
<tr><td>Open source fades; proprietary moat</td><td class="nowrap v-wrong">Wrong</td></tr>
<tr><td>AGI by 2027</td><td class="nowrap v-open">Open</td></tr>
<tr><td>US government AGI project by 2027/28</td><td class="nowrap v-open">Open</td></tr>
</tbody></table>
<p>His strongest calls have been on the input curves — compute and capex both scaled at or above his pace. His clearest miss is the prediction that open-source AI would fade. The defining claim, AGI by 2027, resolves by January 2028.</p>
<h2>Situational Awareness LP</h2>
<p>After leaving OpenAI, Aschenbrenner founded Situational Awareness LP, an investment firm that puts capital behind the trends the essay describes. The fund's existence is part of why the essay is read as a thesis with money behind it, not just commentary.</p>""",
    faqs=[
        ("Who is Leopold Aschenbrenner?", "Leopold Aschenbrenner is a former OpenAI Superalignment researcher who published Situational Awareness in June 2024, predicting AGI by 2027. He later founded Situational Awareness LP, an AI-focused investment firm."),
        ("What did Leopold Aschenbrenner predict?", "That AGI is plausible by 2027, followed by an intelligence explosion (2027–29) and superintelligence in the 2030s, driven by continued compute scaling, trillion-dollar capex, and algorithmic gains."),
        ("Was Aschenbrenner right?", "Partly, so far. As of mid-2026: 3 of his major predictions are on track, 1 is wrong (open source fading), and 2 are open — including the headline AGI-by-2027 call, which resolves by January 2028."),
        ("What is Situational Awareness LP?", "An AI-focused investment firm Aschenbrenner founded after leaving OpenAI, built around the thesis in his Situational Awareness essay."),
    ],
    related=[("/was-aschenbrenner-right", "Was Aschenbrenner right about AGI?"),
             ("/situational-awareness-summary", "Situational Awareness, summarized"),
             ("/will-agi-arrive-2027", "Will AGI arrive by 2027?")],
    extra_schema=[{"@context": "https://schema.org", "@type": "Person", "name": "Leopold Aschenbrenner",
                   "description": "Former OpenAI researcher, author of Situational Awareness (2024), founder of Situational Awareness LP.",
                   "url": f"{SITE}/who-is-leopold-aschenbrenner",
                   "knowsAbout": ["Artificial general intelligence", "AI forecasting", "AI policy"]}],
))

# ---------------------------------------------------------------- 2. WHEN WILL AGI
PAGES.append(dict(
    slug="when-will-agi-arrive",
    title="When Will AGI Arrive? Every Major Forecast Compared (2026)",
    desc="Public AGI forecasts now cluster between 2026 and 2047: Musk 2026, Aschenbrenner 2027, Hassabis ~2030, Metaculus 2033, academic surveys 2047. Expert medians have compressed from ~2060 to ~2033.",
    og_title="When will AGI arrive?",
    eyebrow="Forecast roundup",
    h1="When will AGI arrive? Every major forecast, compared",
    capsule='<span class="verdict">No consensus — but the range has narrowed sharply.</span> Public AGI forecasts now cluster between <strong>2026 and 2047</strong>: Musk says 2026, Aschenbrenner 2027, Hassabis ~50% by 2030, Metaculus 50% by 2033, and academic surveys 50% by 2047. Expert medians have compressed from roughly 2060 to roughly 2033 in about six years.',
    body_html=f"""<h2>The forecasts, side by side</h2>
{FORECASTER_TABLE}
<p>Definitions of "AGI" vary enough that this table is approximate — some forecasters mean a drop-in remote worker, others a system that can autonomously do AI research. But the spread is real, and so is the direction of travel.</p>
<h2>The meta-trend: everyone is moving earlier</h2>
<p>The single most striking fact isn't any one date — it's the compression. Expert median estimates have moved from roughly 2060 to roughly 2033 in about six years. The whole distribution keeps sliding toward the aggressive end, where Aschenbrenner's 2027 sits.</p>
<h2>Who's closest to being tested?</h2>
<p>Aschenbrenner's 2027 call is the nearest concrete deadline among serious forecasters and resolves by January 1, 2028. As of mid-2026, agentic coding is strong (~80% on SWE-Bench Pro) but no system has autonomously conducted AI research end-to-end — the bar that would settle it. That gap is why his prediction is currently graded <strong class="v-open">Open</strong>, not on track.</p>""",
    faqs=[
        ("When will AGI arrive?", "There is no consensus. As of 2026, serious public forecasts range from 2026 (Musk) and 2027 (Aschenbrenner) to ~2030 (Hassabis), 2033 (Metaculus community), and 2047 (academic survey median)."),
        ("Who predicts the earliest AGI?", "Elon Musk is the most aggressive among prominent voices, suggesting AGI by end of 2026. Aschenbrenner's 2027 is next, more aggressive than lab leaders like Demis Hassabis (~50% by 2030)."),
        ("What is the expert consensus on AGI timing?", "The academic survey median (n=2,778) is 50% by 2047, and the Metaculus community median is 50% by 2033. But expert medians have compressed from roughly 2060 to 2033 in about six years."),
    ],
    related=[("/will-agi-arrive-2027", "Will AGI arrive by 2027?"),
             ("/aschenbrenner-vs-metaculus", "Aschenbrenner vs Metaculus"),
             ("/aschenbrenner-vs-hassabis", "Aschenbrenner vs Hassabis")],
))

# ---------------------------------------------------------------- 3. VS HASSABIS
PAGES.append(dict(
    slug="aschenbrenner-vs-hassabis",
    title="Aschenbrenner vs Hassabis: AGI Timeline Comparison (2026)",
    desc="Aschenbrenner predicts AGI by 2027; DeepMind CEO Demis Hassabis puts it at ~50% by 2030 — about three years more conservative. A side-by-side of the two forecasts and why they differ.",
    og_title="Aschenbrenner vs Hassabis on AGI timing",
    eyebrow="Comparison",
    h1="Aschenbrenner vs Hassabis on AGI timing",
    capsule='<span class="verdict">About three years apart.</span> Aschenbrenner predicts AGI by <strong>2027</strong>; DeepMind CEO Demis Hassabis puts it at roughly <strong>50% by 2030</strong>. Both expect transformative AI within the decade — they differ on whether the final research-automation step lands in the first half or the second.',
    body_html="""<h2>Side by side</h2>
<table><thead><tr><th>Dimension</th><th>Aschenbrenner</th><th>Demis Hassabis</th></tr></thead><tbody>
<tr><td>Central AGI estimate</td><td>2027 "strikingly plausible"</td><td>~50% by 2030</td></tr>
<tr><td>Role</td><td>Forecaster &amp; investor (ex-OpenAI)</td><td>CEO, Google DeepMind</td></tr>
<tr><td>Method</td><td>Single-author trend extrapolation (OOMs)</td><td>Lab-leader judgment, frontier-builder view</td></tr>
<tr><td>Stance</td><td>Front-loaded, aggressive tail</td><td>Cautious; warns against hype cycles</td></tr>
</tbody></table>
<h2>Why they differ</h2>
<p>Aschenbrenner's 2027 is a tight extrapolation of compute, algorithmic efficiency, and "unhobbling" trends, assuming they compound into autonomous AI research within three years of the essay. Hassabis, building frontier systems daily, prices in more friction between benchmark capability and genuine autonomy — the gap between scoring well on tasks and being a reliable drop-in researcher.</p>
<h2>Who's been closer so far?</h2>
<p>On the input curves — compute and capex — Aschenbrenner's aggressive read has tracked reality well. On the timing of full autonomy, Hassabis's caution looks defensible: as of mid-2026, agentic coding is strong but no system has autonomously conducted AI research end-to-end. Aschenbrenner's call resolves by January 2028; Hassabis's 2030 window has longer to run.</p>""",
    faqs=[
        ("What's the difference between Aschenbrenner and Hassabis on AGI?", "Aschenbrenner predicts AGI by 2027; Demis Hassabis puts it at roughly 50% by 2030 — about three years more conservative. Both expect transformative AI within the decade."),
        ("Does Demis Hassabis think AGI is close?", "Yes, but more cautiously than Aschenbrenner. Hassabis has indicated roughly 50% odds of AGI by 2030 and frequently warns against over-hyping near-term timelines."),
        ("Who is more likely to be right?", "Too early to say. Aschenbrenner has been closer on compute and capex trends; Hassabis's caution on the timing of full autonomy looks defensible as of mid-2026, with autonomous AI research still undemonstrated."),
    ],
    related=[("/will-agi-arrive-2027", "Will AGI arrive by 2027?"),
             ("/aschenbrenner-vs-metaculus", "Aschenbrenner vs Metaculus"),
             ("/when-will-agi-arrive", "When will AGI arrive?")],
))

# ---------------------------------------------------------------- 4. SUMMARY
PAGES.append(dict(
    slug="situational-awareness-summary",
    title="Situational Awareness Summary (Aschenbrenner, 2024) — and Graded",
    desc="A summary of Aschenbrenner's Situational Awareness essay — AGI by 2027, intelligence explosion, the Project — plus how each major prediction grades two years on: 3 on track, 1 wrong, 2 open.",
    og_title="Situational Awareness, summarized and graded",
    eyebrow="Explainer",
    h1="Situational Awareness, summarized — and graded",
    capsule='<span class="verdict">The case that AGI is close, with money behind it.</span> <em>Situational Awareness</em> (June 2024) argues AGI is plausible by <strong>2027</strong> and superintelligence by the early 2030s, driven by compute scaling, algorithmic gains, and "unhobbling." Two years on, its trend predictions largely hold; its open-source-fading call is <strong class="v-wrong">wrong</strong>; AGI-2027 is still <strong class="v-open">open</strong>.',
    body_html="""<h2>What the essay argues</h2>
<p>Leopold Aschenbrenner's 165-page essay is built on extrapolating orders-of-magnitude (OOM) trends. The chain of reasoning: compute keeps scaling, algorithms keep improving, models get "unhobbled" (tools, agents, reasoning) — and those combine to reach AI that can do the work of an AI researcher around 2027. That triggers an intelligence explosion (2027–29) and superintelligence in the 2030s, with national security inevitably taking over via a government "Project."</p>
<h2>The key predictions</h2>
<ul>
<li><strong>AGI by 2027</strong> — AI at the level of an automated AI researcher</li>
<li><strong>Intelligence explosion 2027–29</strong> — AI automating AI research, compressing a decade into a year</li>
<li><strong>Superintelligence in the 2030s</strong></li>
<li><strong>Compute scaling ~0.5 OOM/yr</strong> and <strong>trillion-dollar capex</strong></li>
<li><strong>Open source fades</strong>; proprietary algorithms form a durable US moat</li>
<li><strong>A US government AGI project</strong> ("The Project") by 2027/28</li>
</ul>
<h2>How the predictions are holding up</h2>
<table><thead><tr><th>Prediction</th><th>Verdict (mid-2026)</th></tr></thead><tbody>
<tr><td>Outpace college grads on knowledge work</td><td class="nowrap v-ok">On track</td></tr>
<tr><td>Compute scales ~0.5 OOM/yr</td><td class="nowrap v-ok">On track</td></tr>
<tr><td>Trillion-dollar capex</td><td class="nowrap v-ok">Exceeded</td></tr>
<tr><td>Open source fades; moat holds</td><td class="nowrap v-wrong">Wrong</td></tr>
<tr><td>AGI by 2027</td><td class="nowrap v-open">Open</td></tr>
<tr><td>US govt AGI project by 27/28</td><td class="nowrap v-open">Open</td></tr>
<tr><td>Intelligence explosion 2027–29</td><td class="nowrap v-pending">Pending</td></tr>
<tr><td>Superintelligence, 2030s</td><td class="nowrap v-pending">Pending</td></tr>
</tbody></table>
<h2>The bottom line</h2>
<p>The input curves Aschenbrenner bet on — compute, capex, raw capability — have largely held or exceeded expectations. His biggest miss is on diffusion: open source did not fade. The defining claim, AGI by 2027, resolves by January 2028.</p>""",
    faqs=[
        ("What is Situational Awareness about?", "It's Leopold Aschenbrenner's June 2024 essay arguing AGI is plausible by 2027, followed by an intelligence explosion and superintelligence in the 2030s, driven by compute scaling, algorithmic gains, and 'unhobbling.'"),
        ("What did Situational Awareness predict?", "AGI by 2027, an intelligence explosion 2027–29, superintelligence in the 2030s, continued compute scaling, trillion-dollar capex, open source fading, and a US government AGI project."),
        ("Is Situational Awareness accurate?", "Partly. Its compute, capex, and capability predictions have largely held; its open-source prediction is wrong; and its defining AGI-2027 claim is still open, resolving by January 2028."),
    ],
    related=[("/was-aschenbrenner-right", "Was Aschenbrenner right about AGI?"),
             ("/situational-awareness-predictions", "All predictions tracked"),
             ("/who-is-leopold-aschenbrenner", "Who is Leopold Aschenbrenner?")],
))

# ---------------------------------------------------------------- 5. GOVT PROJECT
PAGES.append(dict(
    slug="will-the-us-government-build-agi",
    title="Will the US Government Build AGI? 'The Project' Prediction, Graded",
    desc="Aschenbrenner predicted a Manhattan-Project-style US government AGI effort by 2027/28. As of mid-2026, national-security involvement is growing but no formal project exists — graded Open.",
    og_title="Will the US government build AGI?",
    eyebrow="Open verdict",
    h1="Will the US government build AGI? (“The Project”, graded)",
    capsule='<span class="verdict v-open">Open — deadline not yet reached.</span> Aschenbrenner predicted a Manhattan-Project-style US government AGI effort — “The Project” — by <strong>2027/28</strong>. As of mid-2026, national-security involvement in AI is clearly growing, but no formal government project has been launched. The deadline hasn’t elapsed, so the verdict is Open.',
    body_html="""<h2>What he predicted</h2>
<p>One of <em>Situational Awareness</em>'s boldest claims is institutional, not technical: as AGI approaches, Aschenbrenner argued, the US national-security state would inevitably step in and run a government-led AGI effort — explicitly analogous to the Manhattan Project — by roughly 2027 or 2028. He treats this as close to inevitable once the stakes become legible.</p>
<h2>Where it stands in mid-2026</h2>
<p>The evidence is mixed, which is why this is graded <strong class="v-open">Open</strong> rather than wrong. On the "moving toward it" side: national-security attention to AI has grown markedly — export controls, security requirements at the frontier labs, and growing defense interest. On the "not happening" side: there is no formal, centralized government AGI project of the kind the essay describes. Frontier development remains led by private labs.</p>
<h2>What would settle it</h2>
<p>The prediction's deadline is 2027/28, so it has not yet resolved. It would be graded fulfilled if the US government launches a centralized, Manhattan-Project-style AGI effort by then — and Wrong if that deadline passes with frontier development still firmly in private hands. Until then the trend is partial: more state involvement, but no Project.</p>
<h2>Why this prediction matters</h2>
<p>The Project is downstream of the open-source verdict. The essay's case for government takeover rests on AI being concentrated and controllable. If capability instead diffuses cheaply — as the <a href="/did-open-source-ai-fade">open-source verdict</a> suggests it has — the strategic logic that motivates a centralized Project weakens.</p>""",
    faqs=[
        ("Will the US government build AGI?", "Unresolved as of mid-2026. Aschenbrenner predicted a Manhattan-Project-style US government AGI effort by 2027/28. National-security involvement is growing, but no formal project exists yet, so the prediction is graded Open."),
        ("What is 'The Project' in Situational Awareness?", "Aschenbrenner's term for a predicted centralized US government AGI effort, analogous to the Manhattan Project, that he expected the national-security state to launch by roughly 2027/28."),
        ("Is the government taking over AI development?", "Not in a centralized way. As of mid-2026, frontier AI development is still led by private labs, though government attention — export controls, security requirements, defense interest — has grown significantly."),
    ],
    related=[("/situational-awareness-predictions", "All predictions tracked"),
             ("/did-open-source-ai-fade", "Did open-source AI fade?"),
             ("/was-aschenbrenner-right", "Was Aschenbrenner right about AGI?")],
    claimreviews=[("A US government AGI project (“The Project”) will launch by 2027/28 (Situational Awareness, 2024).", 3, "Open")],
))

# ---------------------------------------------------------------- 6. INTELLIGENCE EXPLOSION
PAGES.append(dict(
    slug="intelligence-explosion-2027",
    title="Will There Be an Intelligence Explosion in 2027? (Graded)",
    desc="Aschenbrenner predicted an intelligence explosion — AI automating AI research — beginning 2027–29. As of mid-2026 the precondition (autonomous AI research) is undemonstrated, so it's graded Pending.",
    og_title="Will there be an intelligence explosion in 2027?",
    eyebrow="Pending verdict",
    h1="Will there be an intelligence explosion in 2027?",
    capsule='<span class="verdict v-pending">Too early to grade.</span> Aschenbrenner predicted an “intelligence explosion” — AI automating AI research and compressing a decade of progress into about a year — beginning <strong>2027–2029</strong>. As of mid-2026, the precondition (a system that can autonomously do AI research) is undemonstrated, so the prediction is <strong class="v-pending">Pending</strong>.',
    body_html="""<h2>What an intelligence explosion means here</h2>
<p>In <em>Situational Awareness</em>, the intelligence explosion is the hinge of the whole argument: once AI reaches the level of a competent AI researcher (the AGI-2027 milestone), it can be turned on improving AI itself. Hundreds of thousands of automated researchers running in parallel would, Aschenbrenner argues, compress roughly a decade of algorithmic progress into about a year — vaulting from AGI to superintelligence by the late 2020s or early 2030s.</p>
<h2>Why it's Pending, not Open or Wrong</h2>
<p>This prediction is downstream of AGI-2027. Its precondition — a system that can <strong>autonomously conduct AI research end-to-end</strong> — has not been demonstrated as of mid-2026. Agentic coding is strong (~80% on SWE-Bench Pro), but that is assisting human researchers, not replacing the research loop. Because the trigger hasn't fired and the 2027–29 window hasn't arrived, there is simply not enough evidence to grade it either way. That's what <strong>Pending</strong> means on this scorecard.</p>
<h2>What to watch</h2>
<p>The leading indicator is the <a href="/will-agi-arrive-2027">AGI-2027</a> verdict. If a system demonstrably automates a meaningful fraction of AI research engineering — the bar that would flip AGI-2027 from Open — the intelligence-explosion clock effectively starts. Until then, this remains the most speculative claim on the scorecard, and the one furthest from being testable.</p>""",
    faqs=[
        ("Will there be an intelligence explosion in 2027?", "Too early to tell. Aschenbrenner predicted one beginning 2027–29, triggered by AI automating AI research. As of mid-2026 that precondition is undemonstrated, so the prediction is graded Pending."),
        ("What is an intelligence explosion?", "The idea that once AI can do AI research, it rapidly improves itself — compressing roughly a decade of progress into about a year and vaulting from AGI to superintelligence."),
        ("Why is the intelligence-explosion prediction not graded yet?", "Because its trigger — a system that can autonomously conduct AI research end-to-end — hasn't been demonstrated, and the 2027–29 window hasn't arrived. There isn't yet evidence to grade it either way."),
    ],
    related=[("/will-agi-arrive-2027", "Will AGI arrive by 2027?"),
             ("/situational-awareness-predictions", "All predictions tracked"),
             ("/situational-awareness-summary", "Situational Awareness, summarized")],
))

if __name__ == "__main__":
    for p in PAGES:
        html = build(**p)
        path = os.path.join(OUT, p["slug"] + ".html")
        with open(path, "w", encoding="utf-8") as f:
            f.write(html)
        print(f"wrote {path}  ({len(html)} bytes)")
    print(f"\nGenerated {len(PAGES)} pages.")
