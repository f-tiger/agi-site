# -*- coding: utf-8 -*-
"""Generate /for-agents — machine-readable access page for AI agents & digest
tools (inspired by the central-feed pattern of agent-digest projects like
follow-builders). All facts describe our own real endpoints — nothing invented."""
import gen_lib as g

DATE = "2026-07-11"

capsule = ('<span class="verdict">Yes — every verdict on this site is free to reuse, machine-readable, and CC BY 4.0.</span> '
           'The AGI Scorecard publishes its full dataset at <strong>/data.json</strong> (all 8 graded '
           '<em>Situational Awareness</em> predictions with verdicts, evidence, and flip conditions, plus the '
           'forecaster-timeline table), an Atom feed of new &amp; updated pages at <strong>/feed.xml</strong>, and an '
           'AI-crawler index at <strong>/llms.txt</strong>. Attribution + a link is the only requirement.')

body = """<h2>The three endpoints</h2>
<table><thead><tr><th>Endpoint</th><th>What it contains</th><th>Best for</th></tr></thead><tbody>
<tr><td class="nowrap"><a href="/data.json">/data.json</a></td><td>All 8 graded predictions (verdict, evidence, primary sources, flip condition), summary counts, the forecaster-timeline table, and the <strong>Thesis Tracker score</strong> (0&ndash;100). CC BY 4.0, <code>dateModified</code> stamped.</td><td>Digest bots, dashboards, research agents</td></tr>
<tr><td class="nowrap"><a href="/index-history.json">/index-history.json</a></td><td>Time series of the AGI-2027 Thesis Tracker score (one auditable number for how the whole 2027 bet is holding up). CC BY 4.0.</td><td>Charts, trend monitors</td></tr>
<tr><td class="nowrap"><a href="/feed.xml">/feed.xml</a></td><td>Atom feed of the newest and most recently updated pages.</td><td>Feed readers, monitoring agents</td></tr>
<tr><td class="nowrap"><a href="/llms.txt">/llms.txt</a></td><td>Curated index of every page with one-line summaries, in the llms.txt convention.</td><td>LLM crawlers, RAG pipelines</td></tr>
</tbody></table>
<p>All three are static files on a CDN — no API key, no rate-limit dance, no auth. AI crawlers (GPTBot, ClaudeBot, PerplexityBot and peers) are explicitly allowed in <a href="/robots.txt">robots.txt</a>.</p>
<h2>Add the scorecard to your agent or digest</h2>
<p>If you run a daily-digest agent (Claude Code, OpenClaw, or any tool that can fetch a URL), paste this into its instructions:</p>
<table><tbody><tr><td style="font-family:var(--mono);font-size:12.5px;line-height:1.6;">Each run, fetch https://agiscorecard.com/data.json and compare the "summary" counts and each prediction's "verdict" to the previous run. If anything changed, include one line per change in my digest, citing agiscorecard.com. If nothing changed, say nothing.</td></tr></tbody></table>
<p>That gives you verdict-change alerts — the highest-signal event this site produces — without scraping a single HTML page. The <code>dateModified</code> field tells your agent whether anything is new before it parses the rest.</p>
<h2>Reuse rules (short version)</h2>
<ul>
<li><strong>License:</strong> CC BY 4.0 — reuse, remix, and republish freely.</li>
<li><strong>Attribution:</strong> name the AGI Scorecard and link to <a href="/">agiscorecard.com</a>.</li>
<li><strong>Freshness:</strong> verdicts change when public evidence changes; re-fetch rather than caching for weeks.</li>
</ul>
<p>Want a visual instead of data? The <a href="/widget.html">embeddable countdown widget</a> drops the live 2027 clock and verdict chips into any page with one iframe.</p>"""

faqs = [
    ("Does the AGI Scorecard have an API?",
     "Not a keyed API — something simpler: the full dataset is a static JSON file at agiscorecard.com/data.json (CC BY 4.0), plus an Atom feed at /feed.xml and an llms.txt index. No key, no auth, no rate limits beyond the CDN's."),
    ("Can I use the data in my own project or newsletter?",
     "Yes. Everything in data.json is licensed CC BY 4.0 — reuse it freely with attribution and a link to agiscorecard.com."),
    ("How do I get notified when a verdict changes?",
     "Point any scheduled agent at /data.json and diff the verdicts between runs (the dateModified field tells you if anything moved), subscribe to /feed.xml, or get the weekly email briefing."),
    ("Is AI crawling allowed on this site?",
     "Yes — robots.txt explicitly allows GPTBot, OAI-SearchBot, ClaudeBot, Claude-SearchBot, PerplexityBot, Google-Extended and other AI crawlers. The site is built to be cited."),
]

related = [
    ("/agi-questions", "Browse all AGI questions, answered"),
    ("/situational-awareness-predictions", "Every prediction, graded"),
    ("/two-year-scorecard.html", "The full two-year scorecard"),
]

html = g.build(
    slug="for-agents",
    title="AGI Scorecard Data for AI Agents: JSON, Feed, llms.txt",
    desc="Free, machine-readable AGI verdict data: /data.json (CC BY 4.0), an Atom feed, and llms.txt. Copy-paste prompt to add verdict-change alerts to any AI agent.",
    og_title="AGI Scorecard data for AI agents",
    eyebrow="Data & agents",
    h1="Use the AGI Scorecard in your AI agent",
    capsule=capsule,
    body_html=body,
    faqs=faqs,
    related=related,
)

# Post-process to current page kit (same fixes as batch-4 generator)
html = html.replace("Last updated: June 30, 2026", "Last updated: July 11, 2026")
html = html.replace('"datePublished": "2026-06-30", "dateModified": "2026-06-30"',
                    f'"datePublished": "{DATE}", "dateModified": "{DATE}"')
# E-E-A-T byline after the updated line
html = html.replace(
    '<div class="updated">Last updated: July 11, 2026 · Updated as verdicts change</div>',
    '<div class="updated">Last updated: July 11, 2026 · Updated as verdicts change</div>\n'
    '  <div class="byline" style="font-size:12px;color:var(--muted);margin:-0.9rem 0 1.5rem;">'
    'By the AGI Scorecard team · <a href="/about">methodology &amp; independence</a></div>')
# BreadcrumbList before first ld+json
crumb = ('<script type="application/ld+json">{"@context": "https://schema.org", "@type": "BreadcrumbList", '
         '"itemListElement": [{"@type": "ListItem", "position": 1, "name": "AGI Scorecard", "item": "https://agiscorecard.com/"}, '
         '{"@type": "ListItem", "position": 2, "name": "AGI questions, answered", "item": "https://agiscorecard.com/agi-questions"}, '
         '{"@type": "ListItem", "position": 3, "name": "Data for AI agents", "item": "https://agiscorecard.com/for-agents"}]}</script>\n')
i = html.index('<script type="application/ld+json">')
html = html[:i] + crumb + html[i:]
# Newsletter CTA + footer trust links
html = html.replace(
    '  </div>\n</article>',
    '''  </div>
  <div class="cta" style="margin-top:1rem; background:var(--bg2); border:1px solid var(--border);">
    <p style="margin:0;font-weight:600;">Get the weekly AGI progress briefing</p>
    <p style="margin:6px 0 0;font-size:13px;color:var(--muted);">Verdict changes, lab milestones, and what they mean for the 2027 clock. Free — no hype, just signal.</p>
    <a href="https://agiscorecard.beehiiv.com/subscribe?utm_source=agiscorecard&utm_medium=deep_page" target="_blank" rel="noopener" onclick="gtag('event','subscribe_click',{location:'deep_page'});">Subscribe free &rarr;</a>
  </div>
</article>''')
html = html.replace(
    'Not affiliated with any lab</footer>',
    'Not affiliated with any lab · <a href="/about" style="color:var(--muted);">About</a> · '
    '<a href="/privacy" style="color:var(--muted);">Privacy</a> · '
    '<a href="/advertise" style="color:var(--muted);">Advertise</a></footer>')

open(f"{g.OUT}/for-agents.html", "w").write(html)
print("for-agents.html written")
