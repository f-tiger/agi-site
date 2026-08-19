# -*- coding: utf-8 -*-
"""Net-new GEO page: will-ai-cause-mass-unemployment. Distinct macro labor-market
angle (NOT role-replacement like the programmer/knowledge-worker pages) —
recombines established site data only, funnels to the Thesis Tracker + subscribe."""
import gen_lib as g

DATE = "2026-07-12"

capsule = ('<span class="verdict">Not the overnight wave the headlines predict — but a real, uneven shift already underway.</span> '
           'On raw capability, AI has crossed knowledge-work thresholds (~<strong>83% on GDPval</strong>, ~<strong>80% on SWE-Bench Pro</strong>). '
           'But mass unemployment needs more than capability: it needs reliable, unsupervised, end-to-end autonomy — and that <strong>autonomy gap</strong> is exactly '
           'what is still undemonstrated. So the near-term picture is task-level automation and productivity pressure, not a sudden jobs cliff.')

body = """<h2>Why capability alone doesn't cause mass unemployment</h2>
<p>The scary headlines skip a step. A model scoring ~83% on knowledge-work benchmarks (GDPval) or ~80% on agentic coding (SWE-Bench Pro) is not the same as a system that reliably owns a whole job end-to-end without supervision. That reliability-and-ownership gap — the same one that keeps the headline <a href="/will-agi-arrive-2027">AGI-by-2027</a> verdict <strong class="v-open">Open</strong> — is precisely what stands between "AI can do tasks" and "AI replaces the worker."</p>
<h2>What's actually happening to jobs in 2026</h2>
<table><thead><tr><th>Claim</th><th>Reality (mid-2026)</th></tr></thead><tbody>
<tr><td>AI automates whole jobs overnight</td><td class="nowrap v-wrong">Not yet</td></tr>
<tr><td>AI automates <em>tasks</em> within jobs</td><td class="nowrap v-ok">Yes, widely</td></tr>
<tr><td>Productivity per worker rises</td><td class="nowrap v-ok">Yes</td></tr>
<tr><td>Reliable unsupervised job replacement</td><td class="nowrap v-open">Undemonstrated</td></tr>
</tbody></table>
<p>The honest read: AI is automating slices of work and raising each worker's output, which reshapes roles and can slow hiring at the margin — but the decisive capability for wholesale replacement (autonomous, accountable, end-to-end work) has not arrived. This is capability being <a href="/can-ai-replace-knowledge-workers">On track</a> while full replacement stays unproven.</p>
<h2>So when does the labor shock actually land?</h2>
<p>That depends on the same milestone everything else does: whether AI reaches the level of a drop-in worker (and then an AI researcher). Public forecasts for that span 2026 (Musk) to 2047 (academic survey median), clustering around 2030–2033. The AGI Scorecard tracks how that bet is holding up as one auditable number — so you can watch the precondition for any real labor shock move in real time, instead of reacting to headlines.</p>"""

faqs = [
    ("Will AI cause mass unemployment?",
     "Not in the overnight sense the headlines imply, as of mid-2026. AI has crossed knowledge-work capability thresholds (~83% GDPval, ~80% SWE-Bench Pro) and is automating tasks within jobs, but reliable unsupervised replacement of whole jobs is undemonstrated. The near-term effect is task automation and productivity pressure, not a sudden jobs cliff."),
    ("Is AI taking jobs right now?",
     "It's automating tasks within jobs and raising per-worker output, which reshapes roles and can slow hiring at the margin. But wholesale, unsupervised job replacement — one system reliably owning an entire role end-to-end — has not been demonstrated as of mid-2026."),
    ("When will AI seriously affect employment?",
     "It hinges on AI reaching drop-in-worker reliability, the same milestone behind the AGI-by-2027 verdict (currently Open). Public forecasts for that range from 2026 to 2047, clustering around 2030–2033."),
    ("Why hasn't AI caused mass layoffs despite being so capable?",
     "Because benchmark capability isn't the same as reliable, accountable, end-to-end autonomy. That autonomy gap is what keeps AI in an assist-and-augment role rather than a full-replacement one."),
]
related = [
    ("/can-ai-replace-knowledge-workers", "Can AI replace knowledge workers?"),
    ("/will-ai-replace-programmers", "Will AI replace programmers?"),
    ("/how-close-is-agi", "How close are we to AGI?"),
]

html = g.build(
    slug="will-ai-cause-mass-unemployment",
    title="Will AI Cause Mass Unemployment? What the Data Shows (2026)",
    desc="Not the overnight jobs cliff the headlines predict. AI has crossed capability thresholds (~83% GDPval) but reliable unsupervised job replacement is undemonstrated.",
    og_title="Will AI cause mass unemployment?",
    eyebrow="Analysis",
    h1="Will AI cause mass unemployment?",
    capsule=capsule, body_html=body, faqs=faqs, related=related,
)

# post-process to current page kit
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
         '{"@type": "ListItem", "position": 3, "name": "Will AI cause mass unemployment?", "item": "https://agiscorecard.com/will-ai-cause-mass-unemployment"}]}</script>\n')
i = html.index('<script type="application/ld+json">')
html = html[:i] + crumb + html[i:]
# Thesis Tracker funnel after the capsule
html = html.replace('</div>\n<h2>Why capability alone',
    '''</div>
  <a href="/progress-index" onclick="gtag('event','index_click',{location:'unemployment'});" style="display:flex; align-items:center; gap:14px; margin:0 0 1.75rem; padding:1rem 1.3rem; background:var(--bg2); border:1px solid rgba(124,106,245,.28); border-radius:12px; text-decoration:none;">
    <span style="font-size:2rem; font-weight:700; color:var(--accent); line-height:1;">62.5</span>
    <span style="line-height:1.3;"><span style="display:block; font-weight:600; color:var(--text); font-size:14px;">Track the precondition: AGI-2027 Thesis Tracker</span><span style="display:block; font-size:12.5px; color:var(--muted);">One auditable score for whether the drop-in-worker milestone is arriving →</span></span>
  </a>
<h2>Why capability alone''')
# newsletter CTA + footer trust links
html = html.replace(
    '  </div>\n</article>',
    '''  </div>
  <div class="cta" style="margin-top:1rem; background:var(--bg2); border:1px solid var(--border);">
    <p style="margin:0;font-weight:600;">Get the weekly AGI progress briefing</p>
    <p style="margin:6px 0 0;font-size:13px;color:var(--muted);">The jobs question turns on one milestone — subscribe to hear when the verdict moves. Free, no hype.</p>
    <a href="https://agiscorecard.beehiiv.com/subscribe?utm_source=agiscorecard&utm_medium=deep_page" target="_blank" rel="noopener" onclick="gtag('event','subscribe_click',{location:'deep_page'});">Subscribe free &rarr;</a>
  </div>
</article>''')
html = html.replace(
    'Not affiliated with any lab</footer>',
    'Not affiliated with any lab · <a href="/about" style="color:var(--muted);">About</a> · '
    '<a href="/privacy" style="color:var(--muted);">Privacy</a> · '
    '<a href="/advertise" style="color:var(--muted);">Advertise</a></footer>')

open(f"{g.OUT}/will-ai-cause-mass-unemployment.html", "w").write(html)
print("will-ai-cause-mass-unemployment.html written")
