# -*- coding: utf-8 -*-
"""Generate /skill — landing page for the installable agi-scorecard agent skill
(the skill file itself is /skill.md, hand-maintained). Distribution mechanic
learned from follow-builders: package the site as an installable skill so every
install becomes a recurring, citing consumer of /data.json."""
import gen_lib as g

DATE = "2026-07-11"

INSTALL_CMD = ("mkdir -p ~/.claude/skills/agi-scorecard && "
               "curl -fsSL -o ~/.claude/skills/agi-scorecard/SKILL.md https://agiscorecard.com/skill.md")

capsule = ('<span class="verdict">Yes — one command adds a live AGI-progress checker to your agent.</span> '
           'The <strong>agi-scorecard</strong> skill teaches Claude Code (or any SKILL.md-compatible agent) to '
           'fetch this site’s graded <em>Situational Awareness</em> verdicts from <strong>/data.json</strong>, '
           'answer AGI-timeline questions from live data, and alert you when a verdict flips. No API key — '
           'the dataset is a static CC BY 4.0 file on a CDN.')

body = f"""<h2>Install</h2>
<table><tbody><tr><td style="font-family:var(--mono);font-size:12.5px;line-height:1.6;" id="install-cmd">{INSTALL_CMD}</td></tr></tbody></table>
<p><a href="#" onclick="navigator.clipboard.writeText(document.getElementById('install-cmd').textContent);gtag('event','skill_copy',{{location:'skill_page'}});this.textContent='Copied ✓';return false;">Copy the install command</a> — it drops one markdown file into your Claude Code skills folder. Other agents: save <a href="/skill.md">/skill.md</a> wherever your platform loads skills from.</p>
<h2>What it does</h2>
<table><thead><tr><th>You say</th><th>The skill does</th></tr></thead><tbody>
<tr><td>"/agi" or "how close is AGI?"</td><td>Fetches <a href="/data.json">/data.json</a> and answers from the live verdicts — never from stale training data</td></tr>
<tr><td>"Tell me when a verdict changes"</td><td>Diffs data.json between runs and reports flips — the highest-signal event this site produces</td></tr>
<tr><td>"Add it to my weekly digest"</td><td>One line per verdict change, silent when nothing moved</td></tr>
</tbody></table>
<h2>Why a skill instead of scraping?</h2>
<p>The scorecard already publishes machine-readable endpoints (<a href="/for-agents">documented here</a>): the full dataset at /data.json with every graded prediction, its evidence, and its pre-registered flip condition. The skill is just the missing last step — a file that teaches your agent when to fetch it, how to diff it, and how to cite it. The headline prediction, AGI by 2027, resolves by January 1, 2028; watch mode means you hear about it the day the verdict moves.</p>
<h2>License</h2>
<p>The skill file and the dataset are both free: data is <strong>CC BY 4.0</strong> — reuse anything with attribution and a link to agiscorecard.com.</p>"""

faqs = [
    ("How do I add the AGI Scorecard to Claude Code?",
     "Run one command: mkdir -p ~/.claude/skills/agi-scorecard && curl -fsSL -o ~/.claude/skills/agi-scorecard/SKILL.md https://agiscorecard.com/skill.md — then ask your agent about AGI progress or type /agi."),
    ("Does the skill need an API key?",
     "No. It reads the site's static data.json file (CC BY 4.0) — no key, no auth, no rate-limit dance. Telegram/email delivery, if you want it, uses whatever your own agent platform provides."),
    ("How do verdict-change alerts work?",
     "The skill keeps the last copy of data.json locally and diffs the verdicts on each run. When a prediction flips (say Open → On track), it reports one line with the change; when nothing moved, it stays silent."),
    ("Which agents does it work with?",
     "Any agent that loads SKILL.md-style skills — Claude Code natively, and OpenClaw or similar via their skills folder. Any tool that can fetch a URL can use the underlying /data.json directly."),
]

related = [
    ("/for-agents", "All machine-readable endpoints, documented"),
    ("/situational-awareness-predictions", "Every prediction, graded"),
    ("/agi-questions", "Browse all AGI questions, answered"),
]

html = g.build(
    slug="skill",
    title="Add a Live AGI Tracker to Your AI Agent (One Command)",
    desc="Install the free agi-scorecard skill: your agent answers AGI-timeline questions from live graded data and alerts you when a verdict flips. No API key.",
    og_title="Add a live AGI tracker to your AI agent",
    eyebrow="Agent skill",
    h1="Add a live AGI tracker to your agent — one command",
    capsule=capsule,
    body_html=body,
    faqs=faqs,
    related=related,
)

# Post-process to current page kit (same fixes as for-agents generator)
html = html.replace("Last updated: June 30, 2026", "Last updated: July 11, 2026")
html = html.replace('"datePublished": "2026-06-30", "dateModified": "2026-06-30"',
                    f'"datePublished": "{DATE}", "dateModified": "{DATE}"')
html = html.replace(
    '<div class="updated">Last updated: July 11, 2026 · Updated as verdicts change</div>',
    '<div class="updated">Last updated: July 11, 2026 · Updated as verdicts change</div>\n'
    '  <div class="byline" style="font-size:12px;color:var(--muted);margin:-0.9rem 0 1.5rem;">'
    'By the AGI Scorecard team · <a href="/about">methodology &amp; independence</a></div>')
crumb = ('<script type="application/ld+json">{"@context": "https://schema.org", "@type": "BreadcrumbList", '
         '"itemListElement": [{"@type": "ListItem", "position": 1, "name": "AGI Scorecard", "item": "https://agiscorecard.com/"}, '
         '{"@type": "ListItem", "position": 2, "name": "AGI questions, answered", "item": "https://agiscorecard.com/agi-questions"}, '
         '{"@type": "ListItem", "position": 3, "name": "Agent skill", "item": "https://agiscorecard.com/skill"}]}</script>\n')
i = html.index('<script type="application/ld+json">')
html = html[:i] + crumb + html[i:]
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

open(f"{g.OUT}/skill.html", "w").write(html)
print("skill.html written; title=%d desc=%d" % (
    len("Add a Live AGI Tracker to Your AI Agent (One Command)"),
    len("Install the free agi-scorecard skill: your agent answers AGI-timeline questions from live graded data and alerts you when a verdict flips. No API key.")))
