# -*- coding: utf-8 -*-
"""Net-new GEO page: ai-vs-human-intelligence. Capability-comparison angle
("AI vs human intelligence / is AI smarter than humans"), distinct from the
definition/timeline pages. On-brand data-grounded. Funnels to the Tracker."""
import gen_lib as g

DATE = "2026-07-12"

capsule = ('<span class="verdict">Superhuman in narrow bands, subhuman where it counts most: reliable, autonomous, real-world judgment.</span> '
           'By 2026 AI beats most humans on many <em>scoped</em> tasks (~83% GDPval, ~80% SWE-Bench Pro) and vastly exceeds us on recall and speed. '
           'But it still can’t reliably own an open-ended job end-to-end without supervision — the dimension where human intelligence remains ahead, and the one that defines AGI.')

body = """<h2>It's not one axis — it's a jagged frontier</h2>
<p>"Is AI smarter than humans?" assumes a single scale. Real intelligence is jagged: AI is already superhuman at some things and stubbornly subhuman at others, often at the same time.</p>
<table><thead><tr><th>Dimension</th><th>Where it stands (mid-2026)</th></tr></thead><tbody>
<tr><td>Knowledge recall &amp; breadth</td><td class="nowrap v-ok">Superhuman</td></tr>
<tr><td>Speed &amp; scale</td><td class="nowrap v-ok">Superhuman</td></tr>
<tr><td>Scoped knowledge work / coding</td><td class="nowrap v-ok">Near-to-above skilled human</td></tr>
<tr><td>Reliable long-horizon autonomy</td><td class="nowrap v-open">Below human</td></tr>
<tr><td>Accountability for real-world outcomes</td><td class="nowrap v-open">Below human</td></tr>
</tbody></table>
<p>So AI has surpassed humans on the axes benchmarks measure well, while humans keep the lead on the axis that's hardest to measure and matters most for real work: reliably owning a task end-to-end, unsupervised.</p>
<h2>Why the gap that remains is the whole game</h2>
<p>That last gap isn't a detail — it's the definition of <a href="/what-is-agi">AGI</a>. A system that matched humans on reliable autonomous work would be the "drop-in remote worker," which is exactly the bar the <a href="/will-agi-arrive-2027">AGI-2027</a> prediction is graded against. Until AI closes it, "smarter than humans" is true on the benchmarks and false where it counts. This is the same reason <a href="/is-chatgpt-agi">ChatGPT isn't AGI</a> despite its scores.</p>
<h2>How to watch the comparison shift</h2>
<p>The frontier moves fastest on the autonomy axis, and that's the one that changes the answer. The <a href="/progress-index">AGI-2027 Thesis Tracker</a> distills whether AI is closing the human-advantage gap into one auditable score. It resolves the headline question by <strong>January 1, 2028</strong>."""

faqs = [
    ("Is AI smarter than humans?",
     "On some axes, yes — AI is superhuman at knowledge recall, speed, and scale, and near-to-above skilled humans on many scoped tasks (~83% GDPval). But it's below human on reliable, autonomous, long-horizon judgment — the axis that matters most for real work and that defines AGI."),
    ("How does AI compare to human intelligence?",
     "Intelligence is jagged, not a single scale. AI already exceeds humans on breadth, recall, speed, and many scoped tasks, while humans keep the lead on reliable end-to-end autonomy and accountability for real-world outcomes. The comparison depends entirely on which axis you measure."),
    ("What can humans do that AI can't (2026)?",
     "Reliably own an open-ended job end-to-end without supervision, take accountability for consequential real-world outcomes, and act with physical dexterity and deep interpersonal trust. These are the axes where human intelligence remains ahead."),
    ("When will AI surpass human intelligence overall?",
     "'Overall' hinges on the autonomy axis, which is what AGI measures. Forecasts for AGI span 2026–2047, clustering around 2030–2033; the headline AGI-by-2027 verdict resolves by January 2028."),
]
related = [
    ("/what-is-agi", "What is AGI?"),
    ("/is-chatgpt-agi", "Is ChatGPT AGI?"),
    ("/how-close-is-agi", "How close are we to AGI?"),
]

html = g.build(
    slug="ai-vs-human-intelligence",
    title="AI vs Human Intelligence: Who's Ahead in 2026?",
    desc="Superhuman in narrow bands, subhuman where it counts — reliable autonomous judgment. Intelligence is a jagged frontier, not one scale. Where AI leads and humans still win.",
    og_title="AI vs human intelligence",
    eyebrow="Analysis",
    h1="AI vs human intelligence: who's ahead?",
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
         '{"@type": "ListItem", "position": 3, "name": "AI vs human intelligence", "item": "https://agiscorecard.com/ai-vs-human-intelligence"}]}</script>\n')
i = html.index('<script type="application/ld+json">')
html = html[:i] + crumb + html[i:]
html = html.replace("</div>\n<h2>It's not one axis",
    '''</div>
  <a href="/progress-index" onclick="gtag('event','index_click',{location:'ai-vs-human'});" style="display:flex; align-items:center; gap:14px; margin:0 0 1.75rem; padding:1rem 1.3rem; background:var(--bg2); border:1px solid rgba(124,106,245,.28); border-radius:12px; text-decoration:none;">
    <span style="font-size:2rem; font-weight:700; color:var(--accent); line-height:1;">62.5</span>
    <span style="line-height:1.3;"><span style="display:block; font-weight:600; color:var(--text); font-size:14px;">Is AI closing the gap? AGI-2027 Thesis Tracker</span><span style="display:block; font-size:12.5px; color:var(--muted);">One auditable score for the autonomy axis where humans still lead →</span></span>
  </a>
<h2>It's not one axis''')
html = html.replace(
    '  </div>\n</article>',
    '''  </div>
  <div class="cta" style="margin-top:1rem; background:var(--bg2); border:1px solid var(--border);">
    <p style="margin:0;font-weight:600;">Get the weekly AGI progress briefing</p>
    <p style="margin:6px 0 0;font-size:13px;color:var(--muted);">The human-vs-AI gap narrows on one axis — subscribe to hear when it closes. Free, no hype.</p>
    <a href="https://agiscorecard.beehiiv.com/subscribe?utm_source=agiscorecard&utm_medium=deep_page" target="_blank" rel="noopener" onclick="gtag('event','subscribe_click',{location:'deep_page'});">Subscribe free &rarr;</a>
  </div>
</article>''')
html = html.replace(
    'Not affiliated with any lab</footer>',
    'Not affiliated with any lab · <a href="/about" style="color:var(--muted);">About</a> · '
    '<a href="/privacy" style="color:var(--muted);">Privacy</a> · '
    '<a href="/advertise" style="color:var(--muted);">Advertise</a></footer>')

open(f"{g.OUT}/ai-vs-human-intelligence.html", "w").write(html)
print("ai-vs-human-intelligence.html written")
