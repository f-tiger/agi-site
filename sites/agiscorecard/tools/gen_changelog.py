#!/usr/bin/env python3
"""/changelog — 真实变动的公开汇总页 (BENCHMARK 队列 public-changelog, shipped v0).

Data source: changelog.json (curated, every entry = a shipped commit) +
index-history.json (score points appended automatically). Zero invention:
the generator only renders what those two files contain.
Rerun after adding an entry: python3 tools/gen_changelog.py
"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gen_lib as g

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cl = json.load(open(os.path.join(ROOT, "changelog.json")))
hist = json.load(open(os.path.join(ROOT, "index-history.json")))
DATE = max(e["date"] for e in cl["entries"])

rows = "".join(
    f'<tr><td class="nowrap"><strong>{e["date"]}</strong></td><td><strong>{e["title"]}</strong><br>'
    f'<span style="color:var(--muted);font-size:13.5px;">{e["note"]}</span></td></tr>'
    for e in cl["entries"])
score_rows = "".join(f'<tr><td class="nowrap">{h["date"]}</td><td>{h["score"]}/100</td></tr>' for h in reversed(hist))

capsule = ('<span class="verdict">Everything that changed on the evidence layer, dated and real.</span> '
           'Every entry corresponds to a shipped change; score history is machine-readable. '
           'If you would rather not check back: subscribers get one email when something '
           'that matters actually changes — a verdict, the score, a new tool — and silence otherwise.')

body = f"""<h2>Changes</h2>
<table><tbody>{rows}</tbody></table>
<h2>Thesis Tracker score history</h2>
<table><thead><tr><th>Date</th><th>Score</th></tr></thead><tbody>{score_rows}</tbody></table>
<p>Score points are stamped in <a href="/index-history.json">/index-history.json</a> (CC BY 4.0); the score only moves when a verdict changes.</p>"""

faqs = [
    ("How often does this page update?",
     "Whenever something real ships: a verdict change, a score move, a new tool or dataset. Entries are dated and correspond to public commits — nothing is backfilled or invented."),
    ("What counts as a change worth logging?",
     "Verdict flips, Thesis Tracker score moves, new tools and datasets, and structural site changes. Routine copy edits do not qualify."),
]
related = [("/progress-index", "AGI-2027 Thesis Tracker"),
           ("/agi-2027-resolution", "AGI-2027 resolution page"),
           ("/for-agents", "Machine-readable data for AI agents")]

html = g.build(
    slug="changelog",
    title="Changelog — What Changed on the AGI Scorecard",
    desc="Dated record of every real change on the evidence layer: verdict moves, Thesis Tracker score history, new tools and datasets. No backfilling.",
    og_title="AGI Scorecard changelog",
    eyebrow="Changelog",
    h1="What changed, and when",
    capsule=capsule, body_html=body, faqs=faqs, related=related,
)
html = html.replace('"datePublished": "2026-06-30", "dateModified": "2026-06-30"',
                    f'"datePublished": "2026-08-08", "dateModified": "{DATE}"')
open(os.path.join(ROOT, "changelog.html"), "w").write(html)
print(f"changelog.html written ({len(cl['entries'])} entries, latest {DATE})")
