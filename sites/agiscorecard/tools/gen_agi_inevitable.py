# -*- coding: utf-8 -*-
"""Net-new GEO page: is-agi-inevitable. The inevitability/feasibility angle
("is AGI inevitable / will AGI definitely happen"), distinct from is-agi-just-hype
(hype-check) and how-close (current state). On-topic, data-grounded. Funnels to
the Tracker."""
import gen_lib as g

DATE = "2026-07-12"

capsule = ('<span class="verdict">Strongly trending, not guaranteed.</span> '
           'The inputs that would produce AGI — compute (~0.5 OOM/yr), capex, and capability — are all still climbing, which is why almost no serious forecaster says "never." '
           'But "inevitable" overstates it: AGI still depends on crossing one unproven step (reliable autonomous research) and on those trends <em>continuing</em>, neither of which is guaranteed. '
           'That’s the difference between "on track" and "certain."')

body = """<h2>The case that it's close to inevitable</h2>
<p>The engines keep running. Effective compute scales ~0.5 orders of magnitude per year, capex has <strong>exceeded</strong> even aggressive projections, and capability keeps climbing (~83% GDPval, ~80% SWE-Bench Pro). Expert medians have compressed from ~2060 to ~2033 in six years — the whole distribution keeps sliding earlier. When the inputs compound and the forecasts converge, "it won't happen" gets hard to defend.</p>
<h2>The case that it isn't guaranteed</h2>
<p>Two real off-ramps remain:</p>
<ul>
<li><strong>The unproven step.</strong> AGI requires reliable, autonomous, end-to-end work — and no system has demonstrated it. Capability has stalled at exactly that line before; there's no law that says it must cross.</li>
<li><strong>The trends must hold.</strong> Compute scaling depends on capex, and capex depends on revenue eventually justifying it. A funding pullback — the bear case behind the <a href="/is-the-ai-capex-a-bubble">capex-bubble question</a> — would slow everything.</li>
</ul>
<p>So "inevitable" is the wrong word. "On track, with identified ways it could fail" is the honest one — which is exactly how this scorecard grades the <a href="/will-agi-arrive-2027">AGI-2027</a> prediction: Open, not certain.</p>
<h2>How to tell trending from certain</h2>
<p>Watch the two things that would settle it: whether the autonomy step gets crossed, and whether the input trends hold. Both feed the <a href="/progress-index">AGI-2027 Thesis Tracker</a> — one auditable score that captures how the whole bet is holding up, moving only on evidence. The headline claim resolves by <strong>January 1, 2028</strong>."""

faqs = [
    ("Is AGI inevitable?",
     "Strongly trending, but not guaranteed. The inputs — compute (~0.5 OOM/yr), capex, capability — keep climbing and expert timelines keep moving earlier, so almost no serious forecaster says 'never.' But AGI still depends on crossing one unproven step (reliable autonomous work) and on those trends continuing, so 'inevitable' overstates it."),
    ("Will AGI definitely happen?",
     "Most evidence points toward yes eventually, but 'definitely' is too strong. Two off-ramps remain: the autonomy step (reliable unsupervised end-to-end work) is undemonstrated, and the compute/capex trends driving progress could slow if funding pulls back."),
    ("Could AGI never happen?",
     "It's possible but looks unlikely on current trends. The main ways it stalls are capability plateauing at the autonomy line, or a capex/funding pullback slowing compute scaling. Neither is happening as of mid-2026, but neither is ruled out."),
    ("Is AGI a matter of when, not if?",
     "That's the optimists' framing, and the trends lend it support — but the honest read is 'on track with identified failure modes,' not certainty. The AGI-2027 verdict is graded Open, not guaranteed; it resolves by January 2028."),
]
related = [
    ("/is-agi-just-hype", "Is AGI just hype?"),
    ("/how-close-is-agi", "How close are we to AGI?"),
    ("/is-the-ai-capex-a-bubble", "Is the AI capex a bubble?"),
]

html = g.build(
    slug="is-agi-inevitable",
    title="Is AGI Inevitable? Trending vs Guaranteed (2026)",
    desc="Strongly trending, not guaranteed. The inputs keep climbing, but AGI still depends on one unproven step and on those trends holding. The honest line between 'on track' and 'certain.'",
    og_title="Is AGI inevitable?",
    eyebrow="Analysis",
    h1="Is AGI inevitable?",
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
         '{"@type": "ListItem", "position": 3, "name": "Is AGI inevitable?", "item": "https://agiscorecard.com/is-agi-inevitable"}]}</script>\n')
i = html.index('<script type="application/ld+json">')
html = html[:i] + crumb + html[i:]
html = html.replace("</div>\n<h2>The case that it's close",
    '''</div>
  <a href="/progress-index" onclick="gtag('event','index_click',{location:'inevitable'});" style="display:flex; align-items:center; gap:14px; margin:0 0 1.75rem; padding:1rem 1.3rem; background:var(--bg2); border:1px solid rgba(124,106,245,.28); border-radius:12px; text-decoration:none;">
    <span style="font-size:2rem; font-weight:700; color:var(--accent); line-height:1;">62.5</span>
    <span style="line-height:1.3;"><span style="display:block; font-weight:600; color:var(--text); font-size:14px;">Trending or certain? AGI-2027 Thesis Tracker</span><span style="display:block; font-size:12.5px; color:var(--muted);">One auditable score for how the bet is actually holding up →</span></span>
  </a>
<h2>The case that it's close''')
html = html.replace(
    '  </div>\n</article>',
    '''  </div>
  <div class="cta" style="margin-top:1rem; background:var(--bg2); border:1px solid var(--border);">
    <p style="margin:0;font-weight:600;">Get the weekly AGI progress briefing</p>
    <p style="margin:6px 0 0;font-size:13px;color:var(--muted);">Trending isn't certain — we track which way it's actually going. Subscribe for the weekly read. Free, no hype.</p>
    <a href="https://agiscorecard.beehiiv.com/subscribe?utm_source=agiscorecard&utm_medium=deep_page" target="_blank" rel="noopener" onclick="gtag('event','subscribe_click',{location:'deep_page'});">Subscribe free &rarr;</a>
  </div>
</article>''')
html = html.replace(
    'Not affiliated with any lab</footer>',
    'Not affiliated with any lab · <a href="/about" style="color:var(--muted);">About</a> · '
    '<a href="/privacy" style="color:var(--muted);">Privacy</a> · '
    '<a href="/advertise" style="color:var(--muted);">Advertise</a></footer>')

open(f"{g.OUT}/is-agi-inevitable.html", "w").write(html)
print("is-agi-inevitable.html written")
