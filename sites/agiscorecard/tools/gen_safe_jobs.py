# -*- coding: utf-8 -*-
"""Net-new GEO page: what-jobs-are-safe-from-ai. Practical "which jobs are safe /
safest jobs from AI" angle — distinct from the macro-unemployment page and the
role-replacement pages. Anchored in the autonomy-gap data. Funnels to Tracker."""
import gen_lib as g

DATE = "2026-07-12"

capsule = ('<span class="verdict">The safest work needs reliable, unsupervised, end-to-end judgment — the exact thing AI still lacks.</span> '
           'AI in 2026 automates <em>tasks</em>, not whole jobs: it clears ~83% on knowledge-work benchmarks but can’t reliably own a role unsupervised. '
           'So the jobs most exposed are task-bounded and digital; the most durable ones combine accountability, physical-world action, and human trust — where the '
           '<strong>autonomy gap</strong> bites hardest.')

body = """<h2>The principle, not a list of job titles</h2>
<p>Predictions about specific titles age badly. The durable signal is <em>what kind of work</em> the current autonomy gap protects. AI is strong at scoped, digital, well-specified tasks (~80% SWE-Bench Pro, ~83% GDPval) but weak at reliable, accountable, long-horizon ownership without a human in the loop. That gap — the same one keeping <a href="/will-agi-arrive-2027">AGI-2027</a> graded Open — maps directly onto which work is exposed.</p>
<table><thead><tr><th>More exposed (near-term)</th><th>More durable (near-term)</th></tr></thead><tbody>
<tr><td>Task-bounded, fully digital</td><td>Reliable unsupervised judgment &amp; accountability</td></tr>
<tr><td>Well-specified, repeatable outputs</td><td>Ambiguous, high-stakes, one-off decisions</td></tr>
<tr><td>No physical-world action needed</td><td>Physical dexterity / presence</td></tr>
<tr><td>Little human-trust requirement</td><td>Deep interpersonal trust &amp; care</td></tr>
</tbody></table>
<h2>Why "safe" is about autonomy, not intelligence</h2>
<p>It's tempting to assume "smarter AI = fewer safe jobs," but the binding constraint in 2026 isn't raw capability — it's <strong>reliable autonomy</strong>. A model can draft brilliantly and still can't be left to own a consequential decision unsupervised. Work that <em>requires</em> being accountable for outcomes end-to-end is protected exactly as long as that autonomy bar stays unmet — which is what this scorecard tracks. See also <a href="/will-ai-cause-mass-unemployment">will AI cause mass unemployment?</a> and <a href="/can-ai-replace-knowledge-workers">can AI replace knowledge workers?</a></p>
<h2>How to know when the picture changes</h2>
<p>The moment AI demonstrates reliable, unsupervised, end-to-end work — the drop-in-worker milestone — the "safe" map redraws fast. That milestone is the headline verdict on the <a href="/progress-index">AGI-2027 Thesis Tracker</a>: one auditable score that moves the day the autonomy bar is cleared. It resolves by <strong>January 1, 2028</strong>."""

faqs = [
    ("What jobs are safe from AI?",
     "In 2026, the most durable work needs reliable, unsupervised, end-to-end judgment, physical-world action, or deep human trust — the things AI still can't do reliably. AI automates scoped digital tasks (~83% GDPval) but can't own a whole job unsupervised, so task-bounded digital roles are the most exposed."),
    ("Which jobs will AI replace first?",
     "Task-bounded, fully digital, well-specified work is most exposed, because that's where AI's capability is strongest and the autonomy gap matters least. But 'replace' still overstates it — AI is automating tasks within jobs faster than it's replacing whole roles."),
    ("Why are some jobs safer from AI than others?",
     "Because the binding constraint in 2026 is reliable autonomy, not raw intelligence. Work that requires being accountable for outcomes end-to-end, unsupervised, is protected as long as AI can't reliably do that — the exact gap the AGI-2027 verdict tracks."),
    ("When will AI threaten more jobs?",
     "When AI demonstrates reliable, unsupervised, end-to-end work — the drop-in-worker milestone behind the AGI-by-2027 verdict, which resolves by January 2028. The Thesis Tracker moves the moment that changes."),
]
related = [
    ("/will-ai-cause-mass-unemployment", "Will AI cause mass unemployment?"),
    ("/can-ai-replace-knowledge-workers", "Can AI replace knowledge workers?"),
    ("/will-ai-replace-programmers", "Will AI replace programmers?"),
]

html = g.build(
    slug="what-jobs-are-safe-from-ai",
    title="What Jobs Are Safe From AI? The Autonomy-Gap Answer (2026)",
    desc="The safest work needs reliable, unsupervised, end-to-end judgment — the exact thing AI still lacks. Why 'safe' is about autonomy, not intelligence, and how to watch it change.",
    og_title="What jobs are safe from AI?",
    eyebrow="Analysis",
    h1="What jobs are safe from AI?",
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
         '{"@type": "ListItem", "position": 3, "name": "What jobs are safe from AI?", "item": "https://agiscorecard.com/what-jobs-are-safe-from-ai"}]}</script>\n')
i = html.index('<script type="application/ld+json">')
html = html[:i] + crumb + html[i:]
html = html.replace('</div>\n<h2>The principle',
    '''</div>
  <a href="/progress-index" onclick="gtag('event','index_click',{location:'safe-jobs'});" style="display:flex; align-items:center; gap:14px; margin:0 0 1.75rem; padding:1rem 1.3rem; background:var(--bg2); border:1px solid rgba(124,106,245,.28); border-radius:12px; text-decoration:none;">
    <span style="font-size:2rem; font-weight:700; color:var(--accent); line-height:1;">62.5</span>
    <span style="line-height:1.3;"><span style="display:block; font-weight:600; color:var(--text); font-size:14px;">When does the map redraw? AGI-2027 Thesis Tracker</span><span style="display:block; font-size:12.5px; color:var(--muted);">One score for whether AI is crossing the autonomy bar that protects jobs →</span></span>
  </a>
<h2>The principle''')
html = html.replace(
    '  </div>\n</article>',
    '''  </div>
  <div class="cta" style="margin-top:1rem; background:var(--bg2); border:1px solid var(--border);">
    <p style="margin:0;font-weight:600;">Get the weekly AGI progress briefing</p>
    <p style="margin:6px 0 0;font-size:13px;color:var(--muted);">The "safe jobs" map redraws when AI clears the autonomy bar. Subscribe to hear when it does. Free, no hype.</p>
    <a href="https://agiscorecard.beehiiv.com/subscribe?utm_source=agiscorecard&utm_medium=deep_page" target="_blank" rel="noopener" onclick="gtag('event','subscribe_click',{location:'deep_page'});">Subscribe free &rarr;</a>
  </div>
</article>''')
html = html.replace(
    'Not affiliated with any lab</footer>',
    'Not affiliated with any lab · <a href="/about" style="color:var(--muted);">About</a> · '
    '<a href="/privacy" style="color:var(--muted);">Privacy</a> · '
    '<a href="/advertise" style="color:var(--muted);">Advertise</a></footer>')

open(f"{g.OUT}/what-jobs-are-safe-from-ai.html", "w").write(html)
print("what-jobs-are-safe-from-ai.html written")
