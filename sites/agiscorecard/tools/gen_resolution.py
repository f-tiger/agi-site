#!/usr/bin/env python3
"""/agi-2027-resolution — resolution hub v0 (STRATEGY-2027 Phase 3, skeleton built early).

The single biggest predictable traffic event this site will ever see is the
AGI-2027 claim resolving (window: Dec 2027 - Jan 1 2028). This page is built
17 months early so it has age, links and citations by the time the query spike
hits. Content = pre-registered resolution criteria + live evidence state +
countdown + the strongest subscribe hook the site has (pred_flip agi-2027).
Rerun after verdict changes: python3 tools/gen_resolution.py
"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gen_lib as g

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATE = "2026-08-08"
d = json.load(open(os.path.join(ROOT, "data.json")))
score = d["thesisTracker"]["score"]

capsule = ('<span class="verdict">The "AGI by 2027" claim resolves by January 1, 2028 — and the resolution criteria are already locked.</span> '
           'This page is the permanent record of how the headline claim of <em>Situational Awareness</em> gets graded: '
           'what counts as AGI under the claim, what the evidence says today, and exactly what happens on resolution day. '
           'Written and pre-registered long before the deadline, so nobody — including us — can move the goalposts later.')

body = f"""<div style="text-align:center;margin:1.2rem 0;"><div style="font-size:13px;color:var(--muted);">Time until the claim resolves (Jan 1, 2028)</div>
<div id="cd" style="font-size:clamp(1.6rem,5vw,2.6rem);font-weight:700;font-variant-numeric:tabular-nums;">—</div></div>
<script>(function(){{var t=Date.UTC(2028,0,1);function f(){{var s=Math.max(0,Math.floor((t-Date.now())/1000));var d=Math.floor(s/86400);var h=Math.floor(s%86400/3600);var m=Math.floor(s%3600/60);document.getElementById('cd').textContent=d+'d '+h+'h '+m+'m';}}f();setInterval(f,30000);}})();</script>
<h2>The claim, verbatim</h2>
<p>Leopold Aschenbrenner, <em>Situational Awareness</em> (June 2024): AGI by 2027 is "strikingly plausible" — where AGI means <strong>models that can do the work of an AI researcher/engineer</strong>. That definition is the resolution bar. Not chatbot benchmarks, not lab announcements: autonomous AI-research work.</p>
<h2>Pre-registered resolution criteria</h2>
<table><thead><tr><th>Outcome</th><th>Resolves when</th></tr></thead><tbody>
<tr><td><strong class="v-ok">Right</strong></td><td>By 2028-01-01, credible public evidence that frontier models autonomously perform the work of an AI researcher/engineer (agentic research runs producing accepted novel results, or a lab demonstrating automated researchers at production scale).</td></tr>
<tr><td><strong class="v-wrong">Wrong</strong></td><td>2028-01-01 arrives without that evidence. Strong coding agents alone (already here: ~80% SWE-Bench Pro) do not meet the bar — the claim is about research autonomy, not code completion.</td></tr>
<tr><td><strong class="v-open">Partial</strong></td><td>Demonstrated autonomous research in narrow domains but not the general "drop-in AI researcher". The verdict text will say exactly which half held.</td></tr>
</tbody></table>
<h2>Where the evidence stands today</h2>
<p>As of {DATE}: verdict <strong class="v-open">Open</strong> — agentic coding is strong, autonomous AI research remains undemonstrated. The wider thesis tracks at <a href="/progress-index"><strong>{score}/100</strong> on the Thesis Tracker</a> (3 of 8 predictions on track, 1 wrong, 2 open, 2 pending). Prediction markets price the related-but-different announcement event separately — see <a href="/agi-odds-vs-evidence">odds vs evidence</a> for why the two numbers should not be conflated.</p>
<h2>What happens on resolution day</h2>
<p>The verdict flips from Open to its final state, the Thesis Tracker recomputes, every embedded badge and widget updates, the dataset (<a href="/data.json">data.json</a>, CC BY 4.0) is re-stamped, and everyone subscribed to this prediction gets <strong>one email</strong>. This page then becomes the permanent resolution record with the full evidence trail.</p>"""

faqs = [
    ("When does the AGI-2027 prediction resolve?",
     "By January 1, 2028. The claim targets 2027, so the deadline is the end of that year; the verdict and full evidence trail will be published on this page."),
    ("What counts as AGI for this resolution?",
     "Aschenbrenner's own bar: models that can do the work of an AI researcher/engineer. Strong coding assistants alone do not qualify; autonomous AI-research work does. The criteria above were pre-registered before the outcome."),
    ("What does the evidence say right now?",
     f"Verdict Open as of {DATE}: agentic coding is strong (~80% SWE-Bench Pro) but autonomous AI research is undemonstrated. The overall thesis tracks at {score}/100."),
    ("How is this different from Polymarket's AGI market?",
     "Prediction markets price announcement events (e.g. 'OpenAI announces AGI'). This page grades a capability claim against pre-registered criteria. An announcement without the capability would move their contract but not this verdict — and vice versa."),
]
related = [("/will-agi-arrive-2027", "Will AGI arrive by 2027? (full analysis)"),
           ("/progress-index", "AGI-2027 Thesis Tracker"),
           ("/agi-odds-vs-evidence", "Prediction-market odds vs the evidence"),
           ("/prediction-receipts", "Every dated AGI call, on the clock")]

html = g.build(
    slug="agi-2027-resolution",
    title="AGI-2027 Resolution: Criteria, Countdown, Evidence",
    desc=f"How the 'AGI by 2027' claim gets graded: pre-registered resolution criteria, live countdown to Jan 1 2028, and where the evidence stands ({score}/100 on the Thesis Tracker).",
    og_title="The AGI-2027 resolution page — criteria locked, clock running",
    eyebrow="Resolution record",
    h1="AGI-2027 resolution: the criteria are locked, the clock is running",
    capsule=capsule, body_html=body, faqs=faqs, related=related,
)
html = html.replace('"datePublished": "2026-06-30", "dateModified": "2026-06-30"',
                    f'"datePublished": "{DATE}", "dateModified": "{DATE}"')
open(os.path.join(ROOT, "agi-2027-resolution.html"), "w").write(html)
print("agi-2027-resolution.html written")
