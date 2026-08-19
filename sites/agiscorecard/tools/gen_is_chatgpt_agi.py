# -*- coding: utf-8 -*-
"""Net-new GEO page: is-chatgpt-agi. Huge distinct query ("is ChatGPT AGI /
is GPT-5 AGI"), answered definitively from established site data. Funnels to
what-is-agi, how-close-is-agi, and the Thesis Tracker + subscribe."""
import gen_lib as g

DATE = "2026-07-12"

capsule = ('<span class="verdict">No — and neither is any 2026 frontier model.</span> '
           'Today’s best systems reach near skilled-human scores on <em>scoped</em> tasks (~<strong>83% on GDPval</strong>, ~<strong>80% on SWE-Bench Pro</strong>), '
           'but they lack the reliable, long-horizon, <strong>autonomous</strong> work that serious AGI definitions require — and they are nowhere near superintelligence. '
           'On this scorecard, "AGI by 2027" is still graded <strong class="v-open">Open</strong>, precisely because that autonomy bar is unmet.')

body = """<h2>Why ChatGPT (and its peers) aren't AGI yet</h2>
<p>AGI, in the serious sense, is AI that can do essentially any cognitive task a skilled human can — including working <strong>autonomously and reliably end-to-end</strong>, the "drop-in remote worker." Frontier chatbots clear a lot of the capability bar but miss the autonomy one: they assist brilliantly within a task, but don't own an entire job unsupervised without human cleanup. That gap is the whole ballgame.</p>
<table><thead><tr><th>AGI test</th><th>Frontier models, mid-2026</th></tr></thead><tbody>
<tr><td>Match skilled humans on scoped tasks</td><td class="nowrap v-ok">Largely yes (~83% GDPval)</td></tr>
<tr><td>Strong agentic / coding work</td><td class="nowrap v-ok">Yes (~80% SWE-Bench Pro)</td></tr>
<tr><td>Reliable unsupervised, end-to-end ownership</td><td class="nowrap v-open">No</td></tr>
<tr><td>Autonomously conduct AI research</td><td class="nowrap v-open">Undemonstrated</td></tr>
</tbody></table>
<h2>Is it superintelligence? Not remotely</h2>
<p>Superintelligence (ASI) means far exceeding the best humans at essentially everything — a bar today's models are nowhere near. If anything, the honest framing is that current systems sit in a powerful "very capable assistant" band: past a strong graduate on many scoped tasks, short of a reliable autonomous worker, and light-years from ASI. See <a href="/agi-vs-superintelligence">AGI vs superintelligence</a> for where each line sits.</p>
<h2>So how close is it?</h2>
<p>Closer than skeptics say, further than the "AGI is here" headlines claim. The decisive milestone — autonomous AI research — hasn't been demonstrated, which is why the headline <a href="/will-agi-arrive-2027">AGI-by-2027</a> prediction resolves by January 2028 rather than being settled now. Watch the single number that tracks it move in real time on the <a href="/progress-index">Thesis Tracker</a>."""

faqs = [
    ("Is ChatGPT AGI?",
     "No. As of mid-2026, ChatGPT and other frontier models reach near skilled-human performance on scoped tasks (~83% GDPval, ~80% SWE-Bench Pro) but lack reliable, unsupervised, end-to-end autonomy — the bar serious AGI definitions require. They are also nowhere near superintelligence."),
    ("Is GPT-5 or any 2026 model AGI?",
     "No frontier model in 2026 meets the serious AGI bar. They are extremely capable assistants that clear much of the capability threshold but miss the autonomy one — no system reliably owns an entire job, or conducts AI research, without human supervision."),
    ("What would make ChatGPT actually AGI?",
     "Reliable, accountable, long-horizon autonomy: doing an entire job end-to-end without human cleanup, and ultimately conducting AI research itself. That is the milestone behind the AGI-by-2027 verdict, currently graded Open and resolving by January 2028."),
    ("Is ChatGPT superintelligent?",
     "Not remotely. Superintelligence means far exceeding the best humans at essentially everything. Current models sit in a 'very capable assistant' band — strong on scoped tasks, short of autonomous work, and far from superintelligence."),
]
related = [
    ("/what-is-agi", "What is AGI?"),
    ("/how-close-is-agi", "How close are we to AGI?"),
    ("/agi-vs-superintelligence", "AGI vs superintelligence"),
]

html = g.build(
    slug="is-chatgpt-agi",
    title="Is ChatGPT AGI? The Honest Answer (2026)",
    desc="No — and neither is any 2026 frontier model. Near skilled-human on scoped tasks (~83% GDPval) but missing reliable autonomous work, and far from superintelligence.",
    og_title="Is ChatGPT AGI?",
    eyebrow="Explainer",
    h1="Is ChatGPT AGI?",
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
         '{"@type": "ListItem", "position": 3, "name": "Is ChatGPT AGI?", "item": "https://agiscorecard.com/is-chatgpt-agi"}]}</script>\n')
i = html.index('<script type="application/ld+json">')
html = html[:i] + crumb + html[i:]
html = html.replace('</div>\n<h2>Why ChatGPT',
    '''</div>
  <a href="/progress-index" onclick="gtag('event','index_click',{location:'is-chatgpt-agi'});" style="display:flex; align-items:center; gap:14px; margin:0 0 1.75rem; padding:1rem 1.3rem; background:var(--bg2); border:1px solid rgba(124,106,245,.28); border-radius:12px; text-decoration:none;">
    <span style="font-size:2rem; font-weight:700; color:var(--accent); line-height:1;">62.5</span>
    <span style="line-height:1.3;"><span style="display:block; font-weight:600; color:var(--text); font-size:14px;">How close is the real thing? AGI-2027 Thesis Tracker</span><span style="display:block; font-size:12.5px; color:var(--muted);">One auditable score for whether AGI is actually arriving →</span></span>
  </a>
<h2>Why ChatGPT''')
html = html.replace(
    '  </div>\n</article>',
    '''  </div>
  <div class="cta" style="margin-top:1rem; background:var(--bg2); border:1px solid var(--border);">
    <p style="margin:0;font-weight:600;">Get the weekly AGI progress briefing</p>
    <p style="margin:6px 0 0;font-size:13px;color:var(--muted);">We track the exact line between "very capable assistant" and real AGI. Subscribe to hear when it moves. Free, no hype.</p>
    <a href="https://agiscorecard.beehiiv.com/subscribe?utm_source=agiscorecard&utm_medium=deep_page" target="_blank" rel="noopener" onclick="gtag('event','subscribe_click',{location:'deep_page'});">Subscribe free &rarr;</a>
  </div>
</article>''')
html = html.replace(
    'Not affiliated with any lab</footer>',
    'Not affiliated with any lab · <a href="/about" style="color:var(--muted);">About</a> · '
    '<a href="/privacy" style="color:var(--muted);">Privacy</a> · '
    '<a href="/advertise" style="color:var(--muted);">Advertise</a></footer>')

open(f"{g.OUT}/is-chatgpt-agi.html", "w").write(html)
print("is-chatgpt-agi.html written")
