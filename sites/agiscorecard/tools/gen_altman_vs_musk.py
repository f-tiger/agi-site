# -*- coding: utf-8 -*-
"""Generate altman-vs-musk-agi.html (batch-4 pSEO comparison, vetted demand)."""
import os, re, sys
sys.path.insert(0, os.path.dirname(__file__))
from gen_lib import build, OUT

PUB = "2026-07-10"
UPD = "July 10, 2026"

NEWSLETTER = """  <div class="cta" style="margin-top:1rem; background:var(--bg2); border:1px solid var(--border);">
    <p style="margin:0;font-weight:600;">Get the weekly AGI progress briefing</p>
    <p style="margin:6px 0 0;font-size:13px;color:var(--muted);">Verdict changes, lab milestones, and what they mean for the 2027 clock. Free — no hype, just signal.</p>
    <a href="https://agiscorecard.beehiiv.com/subscribe?utm_source=agiscorecard&utm_medium=deep_page" target="_blank" rel="noopener" onclick="gtag('event','subscribe_click',{location:'deep_page'});">Subscribe free &rarr;</a>
  </div>
"""

page = dict(
    slug="altman-vs-musk-agi",
    title="Altman vs Musk on AGI: Two Aggressive Bets Compared",
    desc="Musk says AGI by end of 2026 — a dated, falsifiable call. Altman says OpenAI knows how to build it but names no date. The two most-watched AGI positions, compared.",
    og_title="Altman vs Musk on AGI",
    eyebrow="Comparison",
    h1="Altman vs Musk on AGI: two aggressive bets, compared",
    capsule='<span class="verdict">Both maximally bullish — in opposite styles.</span> Elon Musk has put AGI at <strong>end of 2026</strong>, the most aggressive dated call from any prominent figure — and one that resolves within months. Sam Altman says OpenAI is <strong>“confident we know how to build AGI”</strong> with superintelligence “a few thousand days” away — near-term in spirit but deliberately unfalsifiable. One bet can miss; the other can’t.',
    body_html="""<h2>Side by side</h2>
<table><thead><tr><th>Dimension</th><th>Elon Musk</th><th>Sam Altman</th></tr></thead><tbody>
<tr><td>Stated position</td><td class="nowrap">AGI by end of 2026</td><td>Knows how to build AGI; ASI “a few thousand days”</td></tr>
<tr><td>Falsifiable?</td><td class="nowrap v-ok">Yes — resolves within months</td><td class="nowrap v-open">Not cleanly — no hard date</td></tr>
<tr><td>Seat</td><td>xAI founder; Tesla/SpaceX CEO</td><td>OpenAI CEO</td></tr>
<tr><td>Track record on dates</td><td>Long history of aggressive, slipping deadlines</td><td>Directionally consistent; avoids deadlines</td></tr>
<tr><td>vs Aschenbrenner's 2027</td><td class="nowrap">~1 year earlier</td><td class="nowrap">Roughly compatible</td></tr>
</tbody></table>
<h2>The real difference: risk of being wrong</h2>
<p>The substantive gap between the two isn't optimism — both sit at the aggressive end of every <a href="/when-will-agi-arrive">public forecast spread</a>. It's exposure. Musk's end-of-2026 is the boldest checkable claim in the field: if December 31, 2026 passes without AGI, the call misses in public. Altman's formulation can absorb almost any outcome short of a decade-long stall — "a few thousand days" spans roughly the late 2020s through the early 2030s, and "we know how to build it" is a claim about knowledge, not delivery.</p>
<h2>What mid-2026 evidence says about both</h2>
<p>With Musk's deadline inside six months, the scorecard's evidence applies directly: capability is near the top of the skilled-human range on scoped tasks (~83% GDPval, ~80% SWE-Bench Pro), but no system has autonomously conducted AI research or run a full job unsupervised — the bar most serious definitions require. Unless that changes very fast, the end-of-2026 call is on course to miss, while Altman's undated version remains untestable by design. The disciplined middle ground is <a href="/will-agi-arrive-2027">Aschenbrenner's 2027</a> — aggressive enough to matter, dated enough to grade, resolving January 1, 2028.</p>
<h2>Why their incentives differ</h2>
<p>Both run organizations that benefit from near-term AGI expectations — xAI and OpenAI compete for the same talent, capital, and compute. The difference is what each needs the claim to do: Musk's date generates urgency around xAI's catch-up push; Altman's confidence-without-dates sustains OpenAI's positioning as the presumed frontrunner without creating a deadline it must hit. Read both as strategy as much as forecast — then grade them against <a href="/situational-awareness-predictions">the evidence</a>.</p>""",
    faqs=[
        ("What is the difference between Altman's and Musk's AGI predictions?", "Musk gives a hard date — AGI by end of 2026, the most aggressive dated public call. Altman says OpenAI is confident it knows how to build AGI and puts superintelligence 'a few thousand days' away, but names no deadline. One is falsifiable within months; the other can't cleanly miss."),
        ("Will Musk's end-of-2026 AGI prediction come true?", "It resolves within months. As of mid-2026, capability benchmarks are strong (~83% GDPval, ~80% SWE-Bench Pro) but autonomous AI research and unsupervised end-to-end work remain undemonstrated — the bar most definitions require. Absent a very fast breakthrough, the call is on course to miss."),
        ("Do Altman and Musk agree on anything about AGI?", "Directionally, yes: both sit at the maximally aggressive end of public forecasts and expect transformative AI this decade — far earlier than the academic survey median of 2047. They differ in falsifiability, not in bullishness."),
        ("Whose AGI prediction should I trust more?", "Neither is a neutral observer — both run competing AI organizations. The scorecard's approach: weight dated, checkable claims (Musk's 2026, Aschenbrenner's 2027) over unfalsifiable ones, and grade them against public evidence as deadlines arrive."),
    ],
    related=[("/elon-musk-agi-prediction", "Elon Musk's AGI prediction"),
             ("/sam-altman-agi-prediction", "Sam Altman's AGI prediction"),
             ("/when-will-agi-arrive", "When will AGI arrive? Every forecast")],
)

FOOT_OLD = 'Not affiliated with any lab</footer>'
FOOT_NEW = 'Not affiliated with any lab · <a href="/about" style="color:var(--muted);">About</a> · <a href="/privacy" style="color:var(--muted);">Privacy</a></footer>'

html = build(**page)
html = html.replace("Last updated: June 30, 2026", f"Last updated: {UPD}")
html = html.replace('"datePublished": "2026-06-30"', f'"datePublished": "{PUB}"')
html = html.replace('"dateModified": "2026-06-30"', f'"dateModified": "{PUB}"')
m = re.search(r'(View the live scorecard(?: &rarr;| →)?</a>\s*</div>\n)', html)
html = html[:m.end(1)] + NEWSLETTER + html[m.end(1):]
html = html.replace(FOOT_OLD, FOOT_NEW)
# spoke->hub + byline (methodology round)
html = html.replace('<a href="/two-year-scorecard.html">Full two-year scorecard with all 8 predictions →</a>',
    '<a href="/two-year-scorecard.html">Full two-year scorecard with all 8 predictions →</a>\n    <a href="/agi-questions">Browse all AGI questions, answered →</a>')
m2 = re.search(r'(<div class="updated">[^<]*</div>)', html)
html = html.replace(m2.group(1), m2.group(1)+'\n  <div class="byline" style="font-size:12px;color:var(--muted);margin:-0.9rem 0 1.5rem;">By the AGI Scorecard team · <a href="/about">methodology &amp; independence</a></div>',1)

with open(os.path.join(OUT, page["slug"] + ".html"), "w", encoding="utf-8") as f:
    f.write(html)
print(f"wrote {page['slug']}.html ({len(html)} b) title={len(page['title'])} desc={len(page['desc'])}")
