# -*- coding: utf-8 -*-
"""Generate what-is-agi.html (batch-3 head term). Established site data only."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from gen_lib import build, OUT

PUB = "2026-07-10"
UPD = "July 10, 2026"

page = dict(
    slug="what-is-agi",
    title="What Is AGI? Definition, Timelines & Current Status",
    desc="AGI is AI that can do essentially any cognitive work a human professional can. What the term actually means, why definitions drive the timeline fights, and how close we are in 2026.",
    og_title="What is AGI?",
    eyebrow="Definition",
    h1="What is AGI? The definition behind the timeline fights",
    capsule='<span class="verdict">AI that can do the cognitive work of a skilled human — and the definition is half the fight.</span> AGI (artificial general intelligence) usually means AI that can perform <strong>essentially any cognitive task a human professional can</strong>. But forecasters use materially different bars — from “drop-in remote worker” to “automated AI researcher” — and that definitional gap explains much of why public AGI timelines range from <strong>2026 to 2047</strong>.',
    body_html="""<h2>The working definitions that matter</h2>
<table><thead><tr><th>Definition (bar)</th><th>What it requires</th><th>Status, mid-2026</th></tr></thead><tbody>
<tr><td><strong>Benchmark-level capability</strong></td><td>Match skilled humans on scoped professional tasks</td><td class="nowrap v-ok">Largely here (~83% GDPval, ~80% SWE-Bench Pro)</td></tr>
<tr><td><strong>Drop-in remote worker</strong></td><td>Do a real job end-to-end, unsupervised, reliably</td><td class="nowrap v-open">Not yet — reliability lags benchmarks</td></tr>
<tr><td><strong>Automated AI researcher</strong> (Aschenbrenner's bar)</td><td>Autonomously conduct AI research itself</td><td class="nowrap v-open">Undemonstrated</td></tr>
</tbody></table>
<p>Almost every public disagreement about “when AGI” is really a disagreement about which row counts. By the first bar, something like AGI is arriving now. By the third — the one <em>Situational Awareness</em> uses, because it triggers an <a href="/intelligence-explosion-2027">intelligence explosion</a> — it has not arrived, and that is what the <a href="/will-agi-arrive-2027">AGI-by-2027 verdict</a> tracks.</p>
<h2>What AGI is not</h2>
<p>AGI is not the same as <a href="/what-is-superintelligence">superintelligence</a> (ASI) — AI far beyond the best humans at essentially everything. In the standard sequence, AGI is the trigger: once AI can do AI research, hundreds of thousands of automated researchers compress progress, and superintelligence follows. Nor is AGI the same as a strong chatbot: fluent conversation was passed years ago without the autonomy that defines the serious bars.</p>
<h2>How close is AGI in 2026?</h2>
<p>On capability, close: models sit near the top of the skilled-human range on scoped knowledge work and agentic coding. On autonomy, the defining gap remains: no system has run the full research loop — or a full job — reliably without human supervision. That split verdict is why this scorecard grades the capability prediction <strong class="v-ok">On track</strong> while the headline <a href="/will-agi-arrive-2027">AGI-by-2027 claim</a> stays <strong class="v-open">Open</strong>, resolving by January 1, 2028.</p>
<h2>When do forecasters expect it?</h2>
<p>Public timelines span <a href="/elon-musk-agi-prediction">Musk's end-of-2026</a>, Aschenbrenner's 2027, <a href="/demis-hassabis-agi-prediction">Hassabis's ~50% by 2030</a>, Metaculus's 50% by 2033, <a href="/karpathy-agi-prediction">Karpathy's roughly-a-decade</a>, and the academic survey's 2047 — with expert medians compressing from ~2060 to ~2033 in about six years. The full comparison: <a href="/when-will-agi-arrive">when will AGI arrive?</a></p>""",
    faqs=[
        ("What is AGI in simple terms?", "AGI (artificial general intelligence) is AI that can do essentially any cognitive task a skilled human professional can — not just chat or pass tests, but perform real work across domains. The strictest common bar is AI that can autonomously do AI research itself."),
        ("What is the difference between AGI and ASI?", "AGI matches skilled humans at general cognitive work; ASI (superintelligence) is far beyond the best humans at essentially everything. In most forecasts AGI comes first and, by automating AI research, accelerates the path to ASI."),
        ("Does AGI exist in 2026?", "By the loosest definition (benchmark-level capability on scoped tasks), arguably close — ~83% on GDPval-style knowledge work. By the serious bars — a reliable drop-in worker, or an automated AI researcher — no. That autonomy gap is why the AGI-by-2027 prediction is still Open."),
        ("Why do AGI predictions differ so much?", "Mostly definitions and weighting of the autonomy gap. Forecasters using capability-centric bars predict 2026–2027; those weighting reliability and autonomy land 2030–2047. Public forecasts currently span Musk (2026) to the academic survey median (2047)."),
    ],
    related=[("/how-close-is-agi", "How close are we to AGI?"),
             ("/when-will-agi-arrive", "When will AGI arrive? Every forecast"),
             ("/what-is-superintelligence", "What is superintelligence?")],
)

html = build(**page)
html = html.replace("Last updated: June 30, 2026", f"Last updated: {UPD}")
html = html.replace('"datePublished": "2026-06-30"', f'"datePublished": "{PUB}"')
html = html.replace('"dateModified": "2026-06-30"', f'"dateModified": "{PUB}"')
with open(os.path.join(OUT, page["slug"] + ".html"), "w", encoding="utf-8") as f:
    f.write(html)
print(f"wrote {page['slug']}.html ({len(html)} b) title={len(page['title'])} desc={len(page['desc'])}")
