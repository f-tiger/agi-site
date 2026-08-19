# -*- coding: utf-8 -*-
"""Net-new GEO page: who-is-building-agi. Org/race angle (which LABS are racing to
AGI + their stated positions), distinct from the individual-forecaster pages.
Recombines established lab-leader data only; funnels to the Thesis Tracker."""
import gen_lib as g

DATE = "2026-07-12"

capsule = ('<span class="verdict">A handful of frontier labs — and they mostly agree it’s close, not that it’s here.</span> '
           'The serious race is run by <strong>OpenAI, Google DeepMind, Anthropic, and xAI</strong>, with strong open-weight pressure from Chinese labs (DeepSeek, Qwen). '
           'Their leaders’ public timelines span 2026–2030+, but none has shown the one thing that would settle it: a system doing AI research autonomously. '
           'That’s why "AGI by 2027" is still graded <strong class="v-open">Open</strong>.')

body = """<h2>The labs racing to AGI, and what their leaders say</h2>
<table><thead><tr><th>Lab</th><th>Leader &amp; stated position</th></tr></thead><tbody>
<tr><td>OpenAI</td><td><a href="/sam-altman-agi-prediction">Sam Altman</a> — confident on the path; superintelligence "a few thousand days"</td></tr>
<tr><td>Google DeepMind</td><td><a href="/demis-hassabis-agi-prediction">Demis Hassabis</a> — ~50% by 2030; cautious on hype</td></tr>
<tr><td>Anthropic</td><td><a href="/dario-amodei-agi-prediction">Dario Amodei</a> — "powerful AI" possibly 2026–27, with caveats</td></tr>
<tr><td>xAI</td><td><a href="/elon-musk-agi-prediction">Elon Musk</a> — most aggressive, by end of 2026</td></tr>
<tr><td>DeepSeek / Qwen (open-weight)</td><td>No AGI claim — but <a href="/deepseek-vs-openai-gap">~3–6 months behind the frontier</a> at far lower cost</td></tr>
</tbody></table>
<p>The striking thing isn't any one date — it's that the people actually building the systems cluster around "this decade," with the lab leaders (Hassabis, Amodei) more measured than the loudest voices. Full side-by-sides: <a href="/aschenbrenner-vs-hassabis">Aschenbrenner vs Hassabis</a>, <a href="/altman-vs-musk-agi">Altman vs Musk</a>.</p>
<h2>Is any lab actually close to AGI?</h2>
<p>Close on capability, not on the finish line. Frontier models reach ~83% on knowledge-work benchmarks (GDPval) and ~80% on agentic coding (SWE-Bench Pro), but no lab has demonstrated a system that <strong>autonomously conducts AI research end-to-end</strong> — the bar that defines serious AGI. Until one does, "who's building AGI" is really "who's building toward it."</p>
<h2>How to track the race objectively</h2>
<p>Instead of trusting any lab's framing, watch the falsifiable claims resolve. The <a href="/progress-index">AGI-2027 Thesis Tracker</a> distills the whole bet into one auditable score that moves only on evidence — the cleanest way to see whether any of these labs is actually pulling it off. The headline claim resolves by <strong>January 1, 2028</strong>."""

faqs = [
    ("Who is building AGI?",
     "The serious race is run by OpenAI, Google DeepMind, Anthropic, and xAI, with strong open-weight pressure from Chinese labs like DeepSeek and Qwen. Their leaders' public AGI timelines span 2026 to 2030+, but none has demonstrated the autonomous AI research that would settle it."),
    ("Which company is closest to AGI?",
     "On capability, the frontier labs (OpenAI, DeepMind, Anthropic, xAI) are neck-and-neck near the top, with open-weight models ~3–6 months behind. But none has crossed the decisive bar — reliable, autonomous, end-to-end work — so 'closest' is a matter of months on capability, not a finish line anyone has reached."),
    ("Do AI labs think AGI is here?",
     "No — mostly that it's close. Lab leaders' public positions range from Musk's aggressive end-of-2026 to Hassabis's ~50% by 2030, with the builders (Hassabis, Amodei) more measured than the loudest voices. None claims AGI has arrived."),
    ("How can I track which lab reaches AGI first?",
     "Watch the falsifiable, dated claims resolve rather than trusting any lab's framing. The AGI Scorecard's Thesis Tracker distills the shared 2027-ish bet into one auditable score that moves only on evidence."),
]
related = [
    ("/when-will-agi-arrive", "When will AGI arrive? (all forecasts)"),
    ("/will-china-beat-us-to-agi", "Will China beat the US to AGI?"),
    ("/how-close-is-agi", "How close are we to AGI?"),
]

html = g.build(
    slug="who-is-building-agi",
    title="Who Is Building AGI? The Labs Racing to It (2026)",
    desc="OpenAI, DeepMind, Anthropic, and xAI lead the AGI race, with open-weight pressure from DeepSeek and Qwen. Their timelines span 2026–2030+ — but none has crossed the bar.",
    og_title="Who is building AGI?",
    eyebrow="The race",
    h1="Who is building AGI?",
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
         '{"@type": "ListItem", "position": 3, "name": "Who is building AGI?", "item": "https://agiscorecard.com/who-is-building-agi"}]}</script>\n')
i = html.index('<script type="application/ld+json">')
html = html[:i] + crumb + html[i:]
html = html.replace('</div>\n<h2>The labs racing',
    '''</div>
  <a href="/progress-index" onclick="gtag('event','index_click',{location:'who-building'});" style="display:flex; align-items:center; gap:14px; margin:0 0 1.75rem; padding:1rem 1.3rem; background:var(--bg2); border:1px solid rgba(124,106,245,.28); border-radius:12px; text-decoration:none;">
    <span style="font-size:2rem; font-weight:700; color:var(--accent); line-height:1;">62.5</span>
    <span style="line-height:1.3;"><span style="display:block; font-weight:600; color:var(--text); font-size:14px;">Who's actually pulling it off? AGI-2027 Thesis Tracker</span><span style="display:block; font-size:12.5px; color:var(--muted);">One auditable score that moves only on evidence, not lab hype →</span></span>
  </a>
<h2>The labs racing''')
html = html.replace(
    '  </div>\n</article>',
    '''  </div>
  <div class="cta" style="margin-top:1rem; background:var(--bg2); border:1px solid var(--border);">
    <p style="margin:0;font-weight:600;">Get the weekly AGI progress briefing</p>
    <p style="margin:6px 0 0;font-size:13px;color:var(--muted);">Which lab is really closest — by evidence, not press release. Subscribe for the weekly read. Free, no hype.</p>
    <a href="https://agiscorecard.beehiiv.com/subscribe?utm_source=agiscorecard&utm_medium=deep_page" target="_blank" rel="noopener" onclick="gtag('event','subscribe_click',{location:'deep_page'});">Subscribe free &rarr;</a>
  </div>
</article>''')
html = html.replace(
    'Not affiliated with any lab</footer>',
    'Not affiliated with any lab · <a href="/about" style="color:var(--muted);">About</a> · '
    '<a href="/privacy" style="color:var(--muted);">Privacy</a> · '
    '<a href="/advertise" style="color:var(--muted);">Advertise</a></footer>')

open(f"{g.OUT}/who-is-building-agi.html", "w").write(html)
print("who-is-building-agi.html written")
