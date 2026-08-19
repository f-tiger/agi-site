# -*- coding: utf-8 -*-
"""Net-new GEO page: how-fast-is-ai-improving. The rate/pace angle, distinct from
the myth-check (are-ai-scaling-laws-dead) and the mid-year synthesis. Recombines
OOM + benchmark-trajectory data. Funnels to the Tracker."""
import gen_lib as g

DATE = "2026-07-12"

capsule = ('<span class="verdict">Fast on the inputs, uneven on the output that matters.</span> '
           'The engines of AI progress are still compounding — effective compute at roughly <strong>0.5 orders of magnitude per year</strong>, benchmark scores climbing to '
           '~83% (GDPval) and ~80% (SWE-Bench Pro). But the <em>capability that defines AGI</em> — reliable autonomous work — is improving much more slowly, which is why '
           '"how fast is AI improving" has two very different answers.')

body = """<h2>Two speeds: inputs vs. the finish line</h2>
<table><thead><tr><th>What's improving</th><th>Rate (mid-2026)</th></tr></thead><tbody>
<tr><td>Effective compute</td><td class="nowrap v-ok">~0.5 OOM/yr — <a href="/is-ai-compute-still-scaling">on trend</a></td></tr>
<tr><td>Benchmark scores</td><td class="nowrap v-ok">Fast — into the 80s%</td></tr>
<tr><td>Agentic / tool use</td><td class="nowrap v-ok">Fast — real production use</td></tr>
<tr><td>Reliable unsupervised autonomy</td><td class="nowrap v-open">Slow — the bottleneck</td></tr>
</tbody></table>
<p>Measured by inputs and benchmarks, AI is improving very fast and roughly on the trend the optimists described. Measured by the one output that defines <a href="/what-is-agi">AGI</a> — a system reliably owning a job end-to-end without supervision — progress is slower and harder to see, because benchmarks stopped being the binding constraint.</p>
<h2>Why "is it slowing down?" gets the wrong answer</h2>
<p>Skeptics point at plateauing benchmark headlines and say progress is stalling; boosters point at agentic demos and say it's accelerating. Both are looking at the fast axis. The honest read is that the <em>inputs</em> keep compounding (see <a href="/are-ai-scaling-laws-dead">are scaling laws dead?</a>) while the <em>decisive output</em> — autonomy — is the slow, rate-limiting step. That split is exactly why the headline <a href="/will-agi-arrive-2027">AGI-2027</a> verdict is Open, not On track.</p>
<h2>One number for the rate that matters</h2>
<p>Instead of arguing about vibes, watch the rate on the axis that changes the answer. The <a href="/progress-index">AGI-2027 Thesis Tracker</a> distills whether the decisive capability is actually moving into one auditable score — it climbs only when a verdict changes, so a flat score is itself the signal that the slow axis hasn't broken yet. Resolves by <strong>January 1, 2028</strong>."""

faqs = [
    ("How fast is AI improving in 2026?",
     "Fast on inputs, uneven on the output that matters. Effective compute is scaling ~0.5 orders of magnitude per year and benchmark scores are into the 80s% (GDPval ~83%, SWE-Bench Pro ~80%), but reliable autonomous work — the AGI-defining capability — is improving much more slowly."),
    ("Is AI progress slowing down?",
     "Not on the inputs — compute and benchmarks keep compounding roughly on trend. But the decisive output, reliable unsupervised autonomy, is the slow rate-limiting step. So 'slowing down' is true for the finish line and false for the engines driving toward it."),
    ("Is AI progress accelerating?",
     "On agentic capability and benchmarks, yes. On the autonomy that defines AGI, no — that's the bottleneck. The two answers come from measuring different axes, which is why headlines disagree."),
    ("How do I track the rate of AI progress objectively?",
     "Watch the axis that changes the answer — reliable autonomous capability — rather than benchmark headlines. The AGI Scorecard's Thesis Tracker distills that into one auditable score that moves only when a verdict changes."),
]
related = [
    ("/are-ai-scaling-laws-dead", "Are AI scaling laws dead?"),
    ("/is-ai-compute-still-scaling", "Is AI compute still scaling?"),
    ("/ai-progress-2026-so-far", "AI progress in 2026 so far"),
]

html = g.build(
    slug="how-fast-is-ai-improving",
    title="How Fast Is AI Improving? Two Speeds, Explained (2026)",
    desc="Fast on inputs (~0.5 OOM/yr compute, benchmarks into the 80s%), slow on the autonomy that defines AGI. Why 'is AI slowing down?' gets two opposite answers.",
    og_title="How fast is AI improving?",
    eyebrow="Analysis",
    h1="How fast is AI improving?",
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
         '{"@type": "ListItem", "position": 3, "name": "How fast is AI improving?", "item": "https://agiscorecard.com/how-fast-is-ai-improving"}]}</script>\n')
i = html.index('<script type="application/ld+json">')
html = html[:i] + crumb + html[i:]
html = html.replace('</div>\n<h2>Two speeds',
    '''</div>
  <a href="/progress-index" onclick="gtag('event','index_click',{location:'ai-pace'});" style="display:flex; align-items:center; gap:14px; margin:0 0 1.75rem; padding:1rem 1.3rem; background:var(--bg2); border:1px solid rgba(124,106,245,.28); border-radius:12px; text-decoration:none;">
    <span style="font-size:2rem; font-weight:700; color:var(--accent); line-height:1;">62.5</span>
    <span style="line-height:1.3;"><span style="display:block; font-weight:600; color:var(--text); font-size:14px;">The rate that matters: AGI-2027 Thesis Tracker</span><span style="display:block; font-size:12.5px; color:var(--muted);">One auditable score for the decisive-capability axis, not benchmark noise →</span></span>
  </a>
<h2>Two speeds''')
html = html.replace(
    '  </div>\n</article>',
    '''  </div>
  <div class="cta" style="margin-top:1rem; background:var(--bg2); border:1px solid var(--border);">
    <p style="margin:0;font-weight:600;">Get the weekly AGI progress briefing</p>
    <p style="margin:6px 0 0;font-size:13px;color:var(--muted);">We track the rate on the axis that actually moves the answer. Subscribe for the weekly read. Free, no hype.</p>
    <a href="https://agiscorecard.beehiiv.com/subscribe?utm_source=agiscorecard&utm_medium=deep_page" target="_blank" rel="noopener" onclick="gtag('event','subscribe_click',{location:'deep_page'});">Subscribe free &rarr;</a>
  </div>
</article>''')
html = html.replace(
    'Not affiliated with any lab</footer>',
    'Not affiliated with any lab · <a href="/about" style="color:var(--muted);">About</a> · '
    '<a href="/privacy" style="color:var(--muted);">Privacy</a> · '
    '<a href="/advertise" style="color:var(--muted);">Advertise</a></footer>')

open(f"{g.OUT}/how-fast-is-ai-improving.html", "w").write(html)
print("how-fast-is-ai-improving.html written")
