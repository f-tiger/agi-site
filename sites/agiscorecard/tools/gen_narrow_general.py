# -*- coding: utf-8 -*-
"""Net-new GEO page: narrow-vs-general-ai. The "types of AI" ladder (ANI / AGI /
ASI), adding the narrow-AI tier the agi-vs-superintelligence page doesn't cover.
High-demand ("types of AI / narrow vs general AI"). Funnels to the Tracker."""
import gen_lib as g

DATE = "2026-07-12"

capsule = ('<span class="verdict">Everything shipping in 2026 is still narrow AI — very wide narrow AI, but narrow.</span> '
           'The ladder runs <strong>narrow (ANI) → general (AGI) → super (ASI)</strong>. Today’s frontier models are astonishingly broad narrow AI: '
           'they clear ~83% on knowledge-work tasks (GDPval) yet still can’t reliably own a job end-to-end unsupervised — the line that separates narrow from general.')

body = """<h2>The three tiers, and where we actually are</h2>
<table><thead><tr><th>Tier</th><th>What it means</th><th>Status (mid-2026)</th></tr></thead><tbody>
<tr><td><strong>Narrow AI (ANI)</strong></td><td>Superb at specific tasks; no reliable autonomous generality</td><td class="nowrap v-ok">Here — and very broad</td></tr>
<tr><td><strong>General AI (AGI)</strong></td><td>Does essentially any cognitive job a skilled human can, reliably and unsupervised</td><td class="nowrap v-open">Not yet — resolves by Jan 2028</td></tr>
<tr><td><strong>Superintelligence (ASI)</strong></td><td>Far beyond the best humans at essentially everything</td><td class="nowrap v-pending">Speculative — downstream of AGI</td></tr>
</tbody></table>
<p>The confusing part in 2026 is that narrow AI got <em>wide</em>. A single model can code, write, and reason across domains — which feels general. But breadth of skill isn't the test. The test is reliable, unsupervised, end-to-end ownership, and that's still missing — so today's systems are broad <a href="/is-chatgpt-agi">narrow AI, not AGI</a>.</p>
<h2>Narrow vs general: the line that matters</h2>
<p>The dividing line isn't "how many things can it do" — it's "can it be trusted to do a whole job without a human in the loop." A model that scores 83% on knowledge-work benchmarks is narrow-but-wide; a model that could reliably <em>be</em> a remote worker would be general. That gap is exactly what the <a href="/will-agi-arrive-2027">AGI-2027</a> verdict tracks, and why it's still Open. Above general sits <a href="/what-is-superintelligence">superintelligence</a>, reached (in the standard forecast) via an <a href="/intelligence-explosion-2027">intelligence explosion</a>.</p>
<h2>How to watch the jump from narrow to general</h2>
<p>The move from wide-narrow to genuinely general is the single most important transition on the ladder — and it's exactly what the <a href="/progress-index">AGI-2027 Thesis Tracker</a> is built to catch, in one auditable score that moves only when the evidence does. It resolves by <strong>January 1, 2028</strong>."""

faqs = [
    ("What is the difference between narrow AI and general AI?",
     "Narrow AI (ANI) is superb at specific tasks but can't reliably work autonomously across a whole job; general AI (AGI) can do essentially any cognitive job a skilled human can, reliably and unsupervised. As of mid-2026 everything shipping is still narrow AI — very broad, but narrow."),
    ("Is ChatGPT narrow or general AI?",
     "Narrow — very wide narrow AI. It clears ~83% on knowledge-work benchmarks across many domains, which feels general, but it can't reliably own a whole job end-to-end unsupervised, which is the line that defines general AI."),
    ("What are the three types of AI?",
     "Narrow AI (ANI) — task-specific; General AI (AGI) — human-level across cognitive work, reliable and autonomous; and Superintelligence (ASI) — far beyond the best humans at essentially everything. In 2026 we're at broad narrow AI; AGI is undemonstrated and ASI is speculative."),
    ("When will AI go from narrow to general?",
     "When a system can reliably own a whole job end-to-end without supervision — the AGI bar, tracked by the AGI-2027 verdict, which resolves by January 2028. Forecasts for that span 2026–2047, clustering around 2030–2033."),
]
related = [
    ("/what-is-agi", "What is AGI?"),
    ("/agi-vs-superintelligence", "AGI vs superintelligence"),
    ("/is-chatgpt-agi", "Is ChatGPT AGI?"),
]

html = g.build(
    slug="narrow-vs-general-ai",
    title="Narrow vs General AI: The Three Types, Explained (2026)",
    desc="Everything shipping in 2026 is still narrow AI — very wide narrow AI, but narrow. The ANI → AGI → ASI ladder, the line that separates narrow from general, and where we are.",
    og_title="Narrow vs general AI",
    eyebrow="Explainer",
    h1="Narrow vs general AI: the three types",
    capsule=capsule, body_html=body, faqs=faqs, related=related,
)

html = html.replace("Last updated: June 30, 2026", "Last updated: July 12, 2026")
html = html.replace('"datePublished": "2026-06-30", "dateModified": "2026-06-30"',
                    f'"datePublished": "{DATE}", "dateModified": "{DATE}"')
html = html.replace(
    '<div class="updated">Last updated: July 12, 2026 · Updated as verdicts change</div>',
    '<div class="updated">Last updated: July 12, 2026 · Updated as verdicts change</div>\n'
    '  <div class="byline" style="font-size:12px;color:var(--muted);margin:-0.9rem 0 1.5rem;">'
    'By the AGI Scorecard team · <a href="/about">methodology &amp; independence</a></div>')
crumb = ('<script type="application/ld+json">{"@context": "https://schema.org", "@type": "BreadcrumbList", '
         '"itemListElement": [{"@type": "ListItem", "position": 1, "name": "AGI Scorecard", "item": "https://agiscorecard.com/"}, '
         '{"@type": "ListItem", "position": 2, "name": "AGI questions, answered", "item": "https://agiscorecard.com/agi-questions"}, '
         '{"@type": "ListItem", "position": 3, "name": "Narrow vs general AI", "item": "https://agiscorecard.com/narrow-vs-general-ai"}]}</script>\n')
i = html.index('<script type="application/ld+json">')
html = html[:i] + crumb + html[i:]
html = html.replace('</div>\n<h2>The three tiers',
    '''</div>
  <a href="/progress-index" onclick="gtag('event','index_click',{location:'narrow-general'});" style="display:flex; align-items:center; gap:14px; margin:0 0 1.75rem; padding:1rem 1.3rem; background:var(--bg2); border:1px solid rgba(124,106,245,.28); border-radius:12px; text-decoration:none;">
    <span style="font-size:2rem; font-weight:700; color:var(--accent); line-height:1;">62.5</span>
    <span style="line-height:1.3;"><span style="display:block; font-weight:600; color:var(--text); font-size:14px;">Watch the narrow&rarr;general jump: AGI-2027 Thesis Tracker</span><span style="display:block; font-size:12.5px; color:var(--muted);">One auditable score for the most important transition on the ladder →</span></span>
  </a>
<h2>The three tiers''')
html = html.replace(
    '  </div>\n</article>',
    '''  </div>
  <div class="cta" style="margin-top:1rem; background:var(--bg2); border:1px solid var(--border);">
    <p style="margin:0;font-weight:600;">Get the weekly AGI progress briefing</p>
    <p style="margin:6px 0 0;font-size:13px;color:var(--muted);">The narrow-to-general jump is the one that matters — subscribe to hear when it happens. Free, no hype.</p>
    <a href="https://agiscorecard.beehiiv.com/subscribe?utm_source=agiscorecard&utm_medium=deep_page" target="_blank" rel="noopener" onclick="gtag('event','subscribe_click',{location:'deep_page'});">Subscribe free &rarr;</a>
  </div>
</article>''')
html = html.replace(
    'Not affiliated with any lab</footer>',
    'Not affiliated with any lab · <a href="/about" style="color:var(--muted);">About</a> · '
    '<a href="/privacy" style="color:var(--muted);">Privacy</a> · '
    '<a href="/advertise" style="color:var(--muted);">Advertise</a></footer>')

open(f"{g.OUT}/narrow-vs-general-ai.html", "w").write(html)
print("narrow-vs-general-ai.html written")
