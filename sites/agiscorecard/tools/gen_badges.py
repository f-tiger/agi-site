# -*- coding: utf-8 -*-
"""Generate README-embeddable SVG badges from data.json (shields.io flat style).
Distribution mechanic observed on ECC's README: badges in third-party READMEs
are permanent branded backlinks. Regenerate WHENEVER a verdict changes (same
rule as widget.html) — badges must never show stale verdicts.
Outputs: badge/agi-2027.svg, badge/scorecard.svg
"""
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
d = json.load(open(os.path.join(ROOT, "data.json")))

VERDICT_COLORS = {"On track": "#4fc3a1", "Exceeded": "#4fc3a1", "Wrong": "#e05555",
                  "Open": "#7c6af5", "Pending": "#8888a0"}


def badge(label, value, color):
    def w(s):  # approx text width at 11px Verdana
        return int(len(s) * 6.6) + 20
    lw, vw = w(label), w(value)
    total = lw + vw
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{total}" height="20" role="img" aria-label="{label}: {value}">
<title>{label}: {value} — agiscorecard.com</title>
<linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient>
<clipPath id="r"><rect width="{total}" height="20" rx="3" fill="#fff"/></clipPath>
<g clip-path="url(#r)">
<rect width="{lw}" height="20" fill="#2a2a31"/>
<rect x="{lw}" width="{vw}" height="20" fill="{color}"/>
<rect width="{total}" height="20" fill="url(#s)"/>
</g>
<g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
<text x="{lw / 2}" y="14">{label}</text>
<text x="{lw + vw / 2}" y="14" font-weight="bold">{value}</text>
</g>
</svg>'''


preds = {p["id"]: p["verdict"] for p in d["predictions"]}
s = d["summary"]
tracker = d.get("thesisTracker", {})
score = tracker.get("score", "")

badges = {
    "agi-2027.svg": badge("AGI by 2027", preds["agi-2027"].upper(),
                          VERDICT_COLORS[preds["agi-2027"]]),
    "scorecard.svg": badge("Situational Awareness",
                           f"{s['on_track']} on track · {s['wrong']} wrong · {s['open']} open",
                           "#4fc3a1"),
    "thesis-tracker.svg": badge("AGI-2027 Thesis Tracker", f"{score}/100", "#7c6af5"),
}

os.makedirs(os.path.join(ROOT, "badge"), exist_ok=True)
for name, svg in badges.items():
    path = os.path.join(ROOT, "badge", name)
    with open(path, "w", encoding="utf-8") as f:
        f.write(svg)
    print(f"wrote badge/{name} ({len(svg)} b)")
