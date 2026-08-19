# -*- coding: utf-8 -*-
"""Net-new GEO page: how-will-we-know-agi-arrived. Distinct "test / criteria /
definition-of-done" angle. Reinforces the core thesis (autonomous AI research is
the bar). Funnels to the Thesis Tracker + subscribe."""
import gen_lib as g

DATE = "2026-07-12"

capsule = ('<span class="verdict">The test isn’t a benchmark score — it’s reliable autonomy.</span> '
           'We’ll know AGI has arrived when a system can <strong>do the work of an AI researcher/engineer end-to-end, unsupervised</strong> — not when it clears one more eval. '
           'That single bar is why "AGI by 2027" is graded <strong class="v-open">Open</strong> despite ~83% GDPval and ~80% SWE-Bench Pro: the capability is here, the autonomy isn’t.')

body = """<h2>Three tests that get proposed — and which one counts</h2>
<table><thead><tr><th>Proposed test</th><th>Problem / status</th></tr></thead><tbody>
<tr><td>Beat a benchmark (GDPval, SWE-Bench…)</td><td class="nowrap v-ok">Largely passed — but scores ≠ autonomy</td></tr>
<tr><td>Pass as a "drop-in remote worker"</td><td class="nowrap v-open">The real bar — unmet: reliability lags</td></tr>
<tr><td>Autonomously conduct AI research</td><td class="nowrap v-open">The strictest bar — undemonstrated</td></tr>
</tbody></table>
<p>The first is a moving target that keeps getting cleared without the world changing much. The serious tests are the last two: can the system <strong>reliably own a whole job end-to-end</strong>, and ultimately <strong>improve AI itself</strong>? Those are observable, falsifiable events — not vibes.</p>
<h2>The concrete signals to watch</h2>
<ul>
<li>A model runs a real, multi-week project unsupervised and is <em>accountable</em> for the outcome — not just assisting a human who cleans up.</li>
<li>Frontier labs report AI meaningfully automating their own research engineering (the <a href="/intelligence-explosion-2027">intelligence-explosion</a> trigger).</li>
<li>Adoption shifts from "assist" to "replace" for whole roles, not tasks — the signal behind <a href="/will-ai-cause-mass-unemployment">the jobs question</a>.</li>
</ul>
<h2>Why we track it as one number</h2>
<p>Because "has AGI arrived?" fragments into eight specific, dated claims, the honest way to watch it is a scorecard, distilled into a single auditable figure. The <a href="/progress-index">AGI-2027 Thesis Tracker</a> moves only when one of those verdicts changes — so the day the autonomy bar is actually cleared, the number moves, and you don’t have to parse the hype to notice. The headline claim resolves by <strong>January 1, 2028</strong>."""

faqs = [
    ("How will we know when AGI has arrived?",
     "When a system can reliably do the work of an AI researcher or engineer end-to-end and unsupervised — not when it clears another benchmark. As of mid-2026 that autonomy bar is unmet, which is why the AGI-by-2027 verdict is Open."),
    ("Is there a test for AGI?",
     "The serious test isn't a single benchmark — it's reliable, accountable, long-horizon autonomy: owning a whole job end-to-end without human cleanup, and ultimately conducting AI research. Benchmark scores (GDPval ~83%, SWE-Bench ~80%) are necessary but not sufficient."),
    ("Why don't high benchmark scores mean AGI is here?",
     "Because scoring well on scoped tasks isn't the same as reliably owning an entire job unsupervised. The gap between benchmark capability and accountable autonomy is exactly what still separates today's models from AGI."),
    ("When will we know if AGI by 2027 was right?",
     "By January 1, 2028. The prediction is fulfilled if autonomous AI research is demonstrated by then, and Wrong if the deadline passes without it. The Thesis Tracker moves the moment that verdict changes."),
]
related = [
    ("/what-is-agi", "What is AGI?"),
    ("/how-close-is-agi", "How close are we to AGI?"),
    ("/will-agi-arrive-2027", "Will AGI arrive by 2027?"),
]

html = g.build(
    slug="how-will-we-know-agi-arrived",
    title="How Will We Know When AGI Has Arrived? The Real Test",
    desc="Not a benchmark score — reliable autonomy. We'll know AGI is here when a system does an AI researcher's job end-to-end, unsupervised. The signals to watch, graded.",
    og_title="How will we know when AGI has arrived?",
    eyebrow="Explainer",
    h1="How will we know when AGI has arrived?",
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
         '{"@type": "ListItem", "position": 3, "name": "How will we know when AGI has arrived?", "item": "https://agiscorecard.com/how-will-we-know-agi-arrived"}]}</script>\n')
i = html.index('<script type="application/ld+json">')
html = html[:i] + crumb + html[i:]
html = html.replace('</div>\n<h2>Three tests',
    '''</div>
  <a href="/progress-index" onclick="gtag('event','index_click',{location:'how-know'});" style="display:flex; align-items:center; gap:14px; margin:0 0 1.75rem; padding:1rem 1.3rem; background:var(--bg2); border:1px solid rgba(124,106,245,.28); border-radius:12px; text-decoration:none;">
    <span style="font-size:2rem; font-weight:700; color:var(--accent); line-height:1;">62.5</span>
    <span style="line-height:1.3;"><span style="display:block; font-weight:600; color:var(--text); font-size:14px;">Watch the bar move: AGI-2027 Thesis Tracker</span><span style="display:block; font-size:12.5px; color:var(--muted);">One auditable score that changes the day the autonomy bar is cleared →</span></span>
  </a>
<h2>Three tests''')
html = html.replace(
    '  </div>\n</article>',
    '''  </div>
  <div class="cta" style="margin-top:1rem; background:var(--bg2); border:1px solid var(--border);">
    <p style="margin:0;font-weight:600;">Get the weekly AGI progress briefing</p>
    <p style="margin:6px 0 0;font-size:13px;color:var(--muted);">We watch the autonomy bar so you don't have to. Subscribe to hear the moment it's cleared. Free, no hype.</p>
    <a href="https://agiscorecard.beehiiv.com/subscribe?utm_source=agiscorecard&utm_medium=deep_page" target="_blank" rel="noopener" onclick="gtag('event','subscribe_click',{location:'deep_page'});">Subscribe free &rarr;</a>
  </div>
</article>''')
html = html.replace(
    'Not affiliated with any lab</footer>',
    'Not affiliated with any lab · <a href="/about" style="color:var(--muted);">About</a> · '
    '<a href="/privacy" style="color:var(--muted);">Privacy</a> · '
    '<a href="/advertise" style="color:var(--muted);">Advertise</a></footer>')

open(f"{g.OUT}/how-will-we-know-agi-arrived.html", "w").write(html)
print("how-will-we-know-agi-arrived.html written")
