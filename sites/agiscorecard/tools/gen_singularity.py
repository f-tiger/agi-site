# -*- coding: utf-8 -*-
"""Net-new GEO page: what-is-the-singularity. The popular-umbrella-term explainer
("what is the singularity / AI singularity / when is the singularity"), mapped to
Aschenbrenner's intelligence explosion -> superintelligence chain and the
scorecard's verdict. Distinct from the graded intelligence-explosion page and the
superintelligence explainer. Funnels to the Thesis Tracker + subscribe."""
import gen_lib as g

DATE = "2026-07-12"

capsule = ('<span class="verdict">A popular name for one specific mechanism — and it hasn’t started.</span> '
           '"The singularity" is the point where AI improving AI triggers runaway, self-accelerating progress — in Aschenbrenner’s framing, the <strong>intelligence explosion</strong> that turns AGI into superintelligence. '
           'As of mid-2026 its precondition — a system that can autonomously do AI research — is undemonstrated, so on this scorecard the singularity is graded <strong class="v-pending">Pending / speculative</strong>.')

body = """<h2>What people mean by "the singularity"</h2>
<p>The term is used loosely, but the serious version is precise: once AI can improve AI, progress compounds on itself and rockets past human comprehension. That's exactly the <a href="/intelligence-explosion-2027">intelligence explosion</a> Aschenbrenner describes — hundreds of thousands of automated researchers compressing a decade of progress into about a year, vaulting from <a href="/what-is-agi">AGI</a> to <a href="/what-is-superintelligence">superintelligence</a>. The "singularity" is the popular umbrella name for that chain.</p>
<h2>Has it started? Where it stands on the scorecard</h2>
<table><thead><tr><th>Link in the chain</th><th>Status (mid-2026)</th></tr></thead><tbody>
<tr><td>AGI (drop-in AI researcher)</td><td class="nowrap v-open">Open — resolves by Jan 2028</td></tr>
<tr><td>Intelligence explosion (AI improving AI)</td><td class="nowrap v-pending">Pending — trigger unfired</td></tr>
<tr><td>Superintelligence</td><td class="nowrap v-pending">Pending — downstream, speculative</td></tr>
</tbody></table>
<p>The whole thing hangs on one unmet precondition: no system has autonomously conducted AI research end-to-end. Until that fires, the singularity is a forecast, not an event — which is why the scorecard grades it Pending rather than On track or Wrong.</p>
<h2>When is the singularity — the forecasts</h2>
<p>Timelines track the AGI question that gates it: Musk (2026), Aschenbrenner (2027, then explosion 2027–29 and superintelligence early 2030s), Hassabis (~2030), Metaculus (2033), academic surveys (2047). So "when is the singularity" is really "when does AGI arrive, plus the explosion that follows." Watch the gating milestone move as one number on the <a href="/progress-index">AGI-2027 Thesis Tracker</a>."""

faqs = [
    ("What is the singularity?",
     "The point where AI improving AI triggers runaway, self-accelerating progress that surpasses human comprehension — Aschenbrenner's intelligence explosion, which turns AGI into superintelligence. As of mid-2026 its precondition (autonomous AI research) is undemonstrated, so it's graded Pending."),
    ("Has the AI singularity started?",
     "No. The trigger — a system that can autonomously conduct AI research end-to-end — has not been demonstrated as of mid-2026. Until it does, the singularity is a forecast, not an event; the scorecard grades it Pending."),
    ("When will the singularity happen?",
     "It gates on AGI, whose public forecasts span 2026 (Musk) to 2047 (academic surveys), clustering around 2030–2033. Aschenbrenner puts AGI at 2027, the intelligence explosion at 2027–29, and superintelligence in the early 2030s."),
    ("Is the singularity the same as AGI?",
     "No. AGI is roughly human-level general capability; the singularity is the runaway self-improvement that AGI is supposed to trigger, producing superintelligence. AGI is the precondition; the singularity is the downstream event."),
]
related = [
    ("/intelligence-explosion-2027", "The intelligence explosion, graded"),
    ("/what-is-superintelligence", "What is superintelligence?"),
    ("/agi-vs-superintelligence", "AGI vs superintelligence"),
]

html = g.build(
    slug="what-is-the-singularity",
    title="What Is the Singularity? The AI Version, Graded (2026)",
    desc="The point where AI improving AI triggers runaway progress — Aschenbrenner's intelligence explosion. As of mid-2026 its precondition is undemonstrated, so it's graded Pending.",
    og_title="What is the singularity?",
    eyebrow="Explainer",
    h1="What is the singularity?",
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
         '{"@type": "ListItem", "position": 3, "name": "What is the singularity?", "item": "https://agiscorecard.com/what-is-the-singularity"}]}</script>\n')
i = html.index('<script type="application/ld+json">')
html = html[:i] + crumb + html[i:]
html = html.replace('</div>\n<h2>What people mean',
    '''</div>
  <a href="/progress-index" onclick="gtag('event','index_click',{location:'singularity'});" style="display:flex; align-items:center; gap:14px; margin:0 0 1.75rem; padding:1rem 1.3rem; background:var(--bg2); border:1px solid rgba(124,106,245,.28); border-radius:12px; text-decoration:none;">
    <span style="font-size:2rem; font-weight:700; color:var(--accent); line-height:1;">62.5</span>
    <span style="line-height:1.3;"><span style="display:block; font-weight:600; color:var(--text); font-size:14px;">Track the precondition: AGI-2027 Thesis Tracker</span><span style="display:block; font-size:12.5px; color:var(--muted);">One auditable score for whether the chain to the singularity is starting →</span></span>
  </a>
<h2>What people mean''')
html = html.replace(
    '  </div>\n</article>',
    '''  </div>
  <div class="cta" style="margin-top:1rem; background:var(--bg2); border:1px solid var(--border);">
    <p style="margin:0;font-weight:600;">Get the weekly AGI progress briefing</p>
    <p style="margin:6px 0 0;font-size:13px;color:var(--muted);">The singularity gates on one milestone — subscribe to hear the moment it moves. Free, no hype.</p>
    <a href="https://agiscorecard.beehiiv.com/subscribe?utm_source=agiscorecard&utm_medium=deep_page" target="_blank" rel="noopener" onclick="gtag('event','subscribe_click',{location:'deep_page'});">Subscribe free &rarr;</a>
  </div>
</article>''')
html = html.replace(
    'Not affiliated with any lab</footer>',
    'Not affiliated with any lab · <a href="/about" style="color:var(--muted);">About</a> · '
    '<a href="/privacy" style="color:var(--muted);">Privacy</a> · '
    '<a href="/advertise" style="color:var(--muted);">Advertise</a></footer>')

open(f"{g.OUT}/what-is-the-singularity.html", "w").write(html)
print("what-is-the-singularity.html written")
