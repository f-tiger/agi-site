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
CRITERIA_DATE = "2026-08-08"
REVIEW_DATE = "2026-11-25"
REVIEW_LABEL = "November 25, 2026"
LEDGER_DATE = "2026-09-06"
with open(os.path.join(ROOT, "index-history.json"), encoding="utf-8") as archive:
    score = next(entry["score"] for entry in json.load(archive) if entry["date"] == LEDGER_DATE)

original = "https://situational-awareness.ai/from-gpt-4-to-agi/"
metr = "https://metr.org/blog/2026-11-20-q4-2026-capability-update/"
openai = "https://deploymentsafety.openai.com/gpt-6-2-chatgpt/ai-self-improvement-capabilities"
anthropic = "https://www.sec.gov/Archives/edgar/data/2130357/000162828026072484/anthropicpbc-sx1ax2.htm"
fri = "https://forecastingresearch.org/research/recursive-self-improvement"
sakana = "https://doi.org/10.1038/s41586-026-10265-5"

description = (f"Read the pre-registered AGI-2027 resolution criteria, January 1, 2028 deadline "
               f"and {REVIEW_LABEL} review of public AI research evidence.")
capsule = (f'<span class="verdict v-open">Open as of {REVIEW_LABEL}.</span> '
           'The <a href="#resolution-criteria">pre-registered criteria</a> govern how the claim '
           f'resolves by January 1, 2028. <a href="#review-{REVIEW_DATE}">Read the latest evidence review</a>.')

body = f"""<div style="text-align:center;margin:1.2rem 0;"><div style="font-size:13px;color:var(--muted);">Time until the claim resolves (Jan 1, 2028)</div>
<div id="cd" style="font-size:clamp(1.6rem,5vw,2.6rem);font-weight:700;font-variant-numeric:tabular-nums;">—</div></div>
<script>(function(){{var t=Date.UTC(2028,0,1);function f(){{var s=Math.max(0,Math.floor((t-Date.now())/1000));var d=Math.floor(s/86400);var h=Math.floor(s%86400/3600);var m=Math.floor(s%3600/60);document.getElementById('cd').textContent=d+'d '+h+'h '+m+'m';}}f();setInterval(f,30000);}})();</script>
<h2>The claim, verbatim</h2>
<p>Leopold Aschenbrenner, <a href="{original}"><em>Situational Awareness</em></a> (June 2024): AGI by 2027 is "strikingly plausible" — where AGI means <strong>models that can do the work of an AI researcher/engineer</strong>. That definition is the resolution bar. Not chatbot benchmarks, not lab announcements: autonomous AI-research work.</p>
<h2 id="resolution-criteria">Pre-registered resolution criteria</h2>
<table><thead><tr><th>Outcome</th><th>Resolves when</th></tr></thead><tbody>
<tr><td><strong class="v-ok">Right</strong></td><td>By 2028-01-01, credible public evidence that frontier models autonomously perform the work of an AI researcher/engineer (agentic research runs producing accepted novel results, or a lab demonstrating automated researchers at production scale).</td></tr>
<tr><td><strong class="v-wrong">Wrong</strong></td><td>2028-01-01 arrives without that evidence. Strong coding agents alone (already here: ~80% SWE-Bench Pro) do not meet the bar — the claim is about research autonomy, not code completion.</td></tr>
<tr><td><strong class="v-open">Partial</strong></td><td>Demonstrated autonomous research in narrow domains but not the general "drop-in AI researcher". The verdict text will say exactly which half held.</td></tr>
</tbody></table>
<section id="review-{REVIEW_DATE}" aria-labelledby="review-heading-{REVIEW_DATE}">
  <h2 id="review-heading-{REVIEW_DATE}">Evidence review, {REVIEW_LABEL}</h2>
  <p>METR measured improvement on specific research tasks. OpenAI reported a High result for research assistance under its own framework. Anthropic’s policy determination reflects expected future models and its overall progress. The reviewed evidence leaves the general claim Open. <a href="{metr}">METR</a> · <a href="{openai}">OpenAI system card</a> · <a href="{anthropic}">Anthropic filing</a> · <a href="{fri}">Forecasting Research Institute</a></p>
  <p>A generated Sakana AI manuscript passed ICLR workshop review and was withdrawn under the study protocol. That narrower result remains relevant to Partial. See the <a href="/will-agi-arrive-2027#review-{REVIEW_DATE}">full review with source notes</a> for how it relates to the existing criteria. <a href="{sakana}">Sakana AI study in Nature</a></p>
  <p>The Thesis Tracker ledger dated September 6, 2026 recorded <a href="/progress-index"><strong>{score}/100</strong></a> (3 of 8 predictions on track, 1 wrong, 2 open, 2 pending). That record is a dated editorial score. <a href="/agi-odds-vs-evidence">Compare the score and announcement-market odds</a>.</p>
</section>
<h2>What happens on resolution day</h2>
<p>The verdict flips from Open to its final state, the Thesis Tracker recomputes, every embedded badge and widget updates, the dataset (<a href="/data.json">data.json</a>, CC BY 4.0) is re-stamped, and everyone subscribed to this prediction gets <strong>one email</strong>. This page then becomes the permanent resolution record with the full evidence trail.</p>"""

faqs = [
    ("When does the AGI-2027 prediction resolve?",
     "By January 1, 2028. The target covers 2027."),
    ("What counts as AGI for this resolution?",
     "The scorecard checks whether frontier models can autonomously do the work of an AI researcher or engineer. "
     "The published criteria also specify an outcome for narrow demonstrations."),
    ("What does the evidence say right now?",
     f"Open as of {REVIEW_LABEL}. The reviewed sources document progress on specific research tasks and assistance "
     "to researchers. They do not establish that a model can take on the work of an AI researcher or engineer "
     "under the published criteria. The deadline is January 1, 2028."),
    ("How is this different from Polymarket’s AGI market?",
     "The scorecard grades the stated capability claim. The related market prices an announcement event under "
     "its own contract terms."),
]
related = [("/will-agi-arrive-2027", "Will AGI arrive by 2027? (full analysis)"),
           ("/progress-index", "AGI-2027 Thesis Tracker"),
           ("/agi-odds-vs-evidence", "Prediction-market odds vs the evidence"),
           ("/prediction-receipts", "Every dated AGI call, on the clock")]

html = g.build(
    slug="agi-2027-resolution",
    title="AGI-2027 Resolution: Criteria, Countdown, Evidence",
    desc=description,
    og_title="The AGI-2027 resolution page — criteria locked, clock running",
    eyebrow="Resolution record",
    h1="AGI-2027 resolution: the criteria are locked, the clock is running",
    capsule=capsule, body_html=body, faqs=faqs, related=related,
)
original_schema = g.article_schema("The AGI-2027 resolution page — criteria locked, clock running", description)
article_schema = {
    **original_schema,
    "datePublished": CRITERIA_DATE,
    "dateModified": REVIEW_DATE,
    "citation": [original, metr, openai, anthropic, fri, sakana],
}
html = html.replace(json.dumps(original_schema, ensure_ascii=False), json.dumps(article_schema, ensure_ascii=False), 1)
html = html.replace(
    "Last updated: June 30, 2026 · Updated as verdicts change",
    f'Resolution criteria published August 8, 2026 · Evidence reviewed <time datetime="{REVIEW_DATE}">{REVIEW_LABEL}</time>',
    1,
)
with open(os.path.join(ROOT, "agi-2027-resolution.html"), "w", encoding="utf-8") as output:
    output.write(html)
print("agi-2027-resolution.html written")
