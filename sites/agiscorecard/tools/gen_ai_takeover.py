# -*- coding: utf-8 -*-
"""Net-new GEO page: will-ai-take-over. Huge query cluster the site has zero
coverage of. Handled ON-BRAND: a sober, capability-grounded reality check (the
takeover scenarios presuppose autonomous capability that's undemonstrated), not
fear-mongering or dismissal. Funnels to the Tracker."""
import gen_lib as g

DATE = "2026-07-12"

capsule = ('<span class="verdict">The scenarios all presuppose one capability that doesn’t exist yet: reliable, autonomous agency.</span> '
           '"AI takes over" stories — from job-market dominance to sci-fi control — depend on AI that can act independently, at scale, without human oversight. '
           'As of 2026 AI is a powerful <em>assistant</em> (~83% GDPval) but can’t reliably run even one job end-to-end unsupervised. That autonomy gap is the load-bearing assumption in every takeover story — and it’s unmet.')

body = """<h2>Separate the claim from the capability it needs</h2>
<p>"Will AI take over?" bundles very different scenarios — economic (AI runs the economy), institutional (AI makes the decisions), and the sci-fi version (AI acts against us). They share one precondition: AI that can <strong>act autonomously and reliably, at scale, without a human in the loop</strong>. Strip away the framing and the empirical question is simply: how close is that autonomy? On this scorecard, it's the exact bar that keeps <a href="/will-agi-arrive-2027">AGI-2027</a> graded Open.</p>
<table><thead><tr><th>Takeover needs…</th><th>Where it stands (2026)</th></tr></thead><tbody>
<tr><td>Reliable unsupervised action</td><td class="nowrap v-open">Undemonstrated</td></tr>
<tr><td>Long-horizon autonomous planning</td><td class="nowrap v-open">Weak / brittle</td></tr>
<tr><td>Accountability-free real-world agency</td><td class="nowrap v-open">Not present</td></tr>
<tr><td>Raw capability on scoped tasks</td><td class="nowrap v-ok">Strong (~83% GDPval)</td></tr>
</tbody></table>
<h2>What's actually true in 2026</h2>
<p>AI is reshaping work by automating tasks and raising output — a real, consequential shift (see <a href="/will-ai-cause-mass-unemployment">will AI cause mass unemployment?</a>). But "reshaping" is not "taking over." Every model still runs inside human-defined loops, hands results back for review, and can't be trusted to own consequential decisions alone. The honest position is neither dismissal nor doom: the capability that would make "takeover" more than a headline is exactly the one being tracked, and it hasn't arrived.</p>
<h2>The one signal worth watching</h2>
<p>You don't need to adjudicate the scenarios — you need to watch the shared precondition. The moment AI demonstrates reliable, unsupervised, long-horizon agency, every "takeover" question gets more serious at once. That milestone is the headline verdict on the <a href="/progress-index">AGI-2027 Thesis Tracker</a>: one auditable score that moves the day the autonomy bar is cleared. It resolves by <strong>January 1, 2028</strong>."""

faqs = [
    ("Will AI take over the world?",
     "Not on current capability. Every 'takeover' scenario presupposes AI that can act autonomously and reliably at scale without human oversight — and as of 2026 AI can't reliably run even a single job end-to-end unsupervised. It's a powerful assistant, not an autonomous agent."),
    ("Is AI going to take over jobs / the economy?",
     "AI is automating tasks within jobs and raising output, which is reshaping work — but that's not the same as taking over. Reliable, unsupervised replacement of whole roles is undemonstrated. See 'will AI cause mass unemployment?' for the data."),
    ("What would AI need to actually take over?",
     "Reliable, unsupervised, long-horizon autonomous agency — the ability to act consequentially in the real world without a human in the loop. That's the exact capability the AGI-2027 verdict tracks, and it hasn't been demonstrated as of 2026."),
    ("When would 'AI takeover' become a real risk?",
     "When AI demonstrates reliable, unsupervised, long-horizon agency — the AGI milestone the scorecard tracks, which resolves by January 2028. Until that bar is cleared, takeover scenarios lack their load-bearing precondition."),
]
related = [
    ("/will-ai-cause-mass-unemployment", "Will AI cause mass unemployment?"),
    ("/how-close-is-agi", "How close are we to AGI?"),
    ("/will-agi-arrive-2027", "Will AGI arrive by 2027?"),
]

html = g.build(
    slug="will-ai-take-over",
    title="Will AI Take Over? What the Capability Data Says (2026)",
    desc="Every takeover scenario presupposes reliable autonomous agency — which doesn't exist yet. AI is a powerful assistant (~83% GDPval) that can't run one job unsupervised. A sober read.",
    og_title="Will AI take over?",
    eyebrow="Analysis",
    h1="Will AI take over?",
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
         '{"@type": "ListItem", "position": 3, "name": "Will AI take over?", "item": "https://agiscorecard.com/will-ai-take-over"}]}</script>\n')
i = html.index('<script type="application/ld+json">')
html = html[:i] + crumb + html[i:]
html = html.replace('</div>\n<h2>Separate the claim',
    '''</div>
  <a href="/progress-index" onclick="gtag('event','index_click',{location:'takeover'});" style="display:flex; align-items:center; gap:14px; margin:0 0 1.75rem; padding:1rem 1.3rem; background:var(--bg2); border:1px solid rgba(124,106,245,.28); border-radius:12px; text-decoration:none;">
    <span style="font-size:2rem; font-weight:700; color:var(--accent); line-height:1;">62.5</span>
    <span style="line-height:1.3;"><span style="display:block; font-weight:600; color:var(--text); font-size:14px;">Watch the shared precondition: AGI-2027 Thesis Tracker</span><span style="display:block; font-size:12.5px; color:var(--muted);">One auditable score for the autonomy every takeover scenario needs →</span></span>
  </a>
<h2>Separate the claim''')
html = html.replace(
    '  </div>\n</article>',
    '''  </div>
  <div class="cta" style="margin-top:1rem; background:var(--bg2); border:1px solid var(--border);">
    <p style="margin:0;font-weight:600;">Get the weekly AGI progress briefing</p>
    <p style="margin:6px 0 0;font-size:13px;color:var(--muted);">We track the one capability every takeover scenario needs. Subscribe to hear when it moves. Free, no hype.</p>
    <a href="https://agiscorecard.beehiiv.com/subscribe?utm_source=agiscorecard&utm_medium=deep_page" target="_blank" rel="noopener" onclick="gtag('event','subscribe_click',{location:'deep_page'});">Subscribe free &rarr;</a>
  </div>
</article>''')
html = html.replace(
    'Not affiliated with any lab</footer>',
    'Not affiliated with any lab · <a href="/about" style="color:var(--muted);">About</a> · '
    '<a href="/privacy" style="color:var(--muted);">Privacy</a> · '
    '<a href="/advertise" style="color:var(--muted);">Advertise</a></footer>')

open(f"{g.OUT}/will-ai-take-over.html", "w").write(html)
print("will-ai-take-over.html written")
