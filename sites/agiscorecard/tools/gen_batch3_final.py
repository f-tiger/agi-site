# -*- coding: utf-8 -*-
"""Generate the 4 final batch-3 pages. Established site data + widely-documented
public positions only (qualitative; no invented numbers)."""
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

PAGES = []

PAGES.append(dict(
    slug="sam-altman-agi-prediction",
    title="Sam Altman's AGI Prediction: What He's Actually Said",
    desc="Sam Altman has said OpenAI is confident it knows how to build AGI, and put superintelligence 'a few thousand days' away. His position vs the other forecasts.",
    og_title="Sam Altman's AGI prediction",
    eyebrow="Forecaster profile",
    h1="Sam Altman's AGI prediction: what he's actually said",
    capsule='<span class="verdict">Confident and near-term — but deliberately unnumbered.</span> OpenAI CEO Sam Altman has said his lab is <strong>“confident we know how to build AGI as we have traditionally understood it,”</strong> and in his 2024 essay <em>The Intelligence Age</em> put superintelligence possibly <strong>“a few thousand days”</strong> away. Unlike Aschenbrenner’s 2027, he attaches no hard deadline — which makes his optimism harder to grade.',
    body_html="""<h2>The public record</h2>
<p>Altman's stated position has been consistent in direction: AGI is coming soon, and OpenAI knows the path. In <em>The Intelligence Age</em> (September 2024) he wrote that superintelligence might be “a few thousand days” away. In early 2025 he wrote that OpenAI was “confident we know how to build AGI as we have traditionally understood it,” and predicted AI agents would begin materially joining the workforce. He has also repeatedly softened the significance of the milestone itself — suggesting AGI will arrive and matter less on day one than people expect, with the world continuing to look surprisingly normal at first.</p>
<h2>How it compares</h2>
<table><thead><tr><th>Forecaster</th><th>Position</th><th>Falsifiable?</th></tr></thead><tbody>
<tr><td>Elon Musk</td><td class="nowrap">By end of 2026</td><td class="nowrap v-ok">Yes — dated</td></tr>
<tr><td>Leopold Aschenbrenner</td><td class="nowrap">2027 "strikingly plausible"</td><td class="nowrap v-ok">Yes — resolves Jan 2028</td></tr>
<tr><td><strong>Sam Altman</strong></td><td class="nowrap">Soon; ASI "a few thousand days"</td><td class="nowrap v-open">Partly — no hard date</td></tr>
<tr><td>Demis Hassabis</td><td class="nowrap">~50% by 2030</td><td class="nowrap v-ok">Yes — probabilistic</td></tr>
<tr><td>Andrej Karpathy</td><td class="nowrap">About a decade</td><td class="nowrap v-ok">Yes — loosely dated</td></tr>
</tbody></table>
<p>“A few thousand days” spans roughly the late 2020s through early 2030s — compatible with Aschenbrenner's aggressive path <em>and</em> with Hassabis's more cautious one. That width is why this scorecard tracks Aschenbrenner's dated claim rather than Altman's: a prediction you can't miss isn't a prediction you can grade.</p>
<h2>The incentive question</h2>
<p>Altman runs the company whose valuation most benefits from near-term AGI expectations, which cuts both ways: he has better visibility than almost anyone, and stronger incentives than almost anyone. The scorecard's approach is to note the position, weight the falsifiable versions of it, and grade against public evidence — where the story is the same as everywhere else: <a href="/can-ai-replace-knowledge-workers">capability strong</a>, <a href="/will-agi-arrive-2027">autonomy undemonstrated</a>.</p>""",
    faqs=[
        ("What is Sam Altman's AGI prediction?", "Altman has said OpenAI is “confident we know how to build AGI as we have traditionally understood it,” and in The Intelligence Age (2024) suggested superintelligence may be “a few thousand days” away. He deliberately avoids hard dates."),
        ("Did Sam Altman say AGI has been achieved?", "No. He has predicted AI agents joining the workforce and described AGI as near, while also arguing the milestone will feel less dramatic than expected when it arrives."),
        ("How does Altman's timeline compare to Aschenbrenner's?", "They're directionally aligned — both very near-term relative to expert medians. The difference is falsifiability: Aschenbrenner's 2027 resolves by January 2028, while “a few thousand days” spans roughly the late 2020s to early 2030s and can't cleanly miss."),
        ("Why doesn't the scorecard grade Altman's prediction?", "Because it has no deadline. This scorecard grades pre-registered, dated claims; Altman's public position is tracked here as context for the graded forecasts."),
    ],
    related=[("/when-will-agi-arrive", "When will AGI arrive? Every forecast"),
             ("/elon-musk-agi-prediction", "Elon Musk's AGI prediction"),
             ("/what-is-agi", "What is AGI?")],
    extra_schema=[{"@context": "https://schema.org", "@type": "Person", "name": "Sam Altman",
                   "description": "CEO of OpenAI; has said OpenAI is confident it knows how to build AGI and put superintelligence 'a few thousand days' away.",
                   "url": "https://agiscorecard.com/sam-altman-agi-prediction",
                   "knowsAbout": ["Artificial general intelligence", "OpenAI"]}],
))

PAGES.append(dict(
    slug="dario-amodei-agi-prediction",
    title="Dario Amodei's AGI Prediction: Powerful AI by 2026–27?",
    desc="Anthropic's CEO avoids the term AGI but has said 'powerful AI' — a country of geniuses in a datacenter — could arrive as early as 2026–27, with explicit uncertainty.",
    og_title="Dario Amodei's AGI prediction",
    eyebrow="Forecaster profile",
    h1="Dario Amodei's AGI prediction: “powerful AI” by 2026–27?",
    capsule='<span class="verdict">Among the earliest lab-leader timelines — with the caveats stated out loud.</span> Anthropic CEO Dario Amodei avoids the term “AGI” but has said <strong>“powerful AI”</strong> — which he describes as <strong>“a country of geniuses in a datacenter”</strong> — could arrive <strong>as early as 2026–27</strong>, while explicitly flagging the uncertainty. That puts him alongside Aschenbrenner at the aggressive end of serious forecasts.',
    body_html="""<h2>What Amodei actually forecasts</h2>
<p>In his October 2024 essay <em>Machines of Loving Grace</em>, Amodei sketched what he calls “powerful AI”: systems smarter than Nobel-level experts across most fields, able to operate autonomously over long horizons — millions of them, running faster than humans. His much-quoted summary: “a country of geniuses in a datacenter.” On timing, he has said it could arrive as early as 2026, and has since referenced the 2026–27 window — always with explicit caveats that the timing could slip and the term “AGI” obscures more than it reveals.</p>
<h2>Why his framing is distinctive</h2>
<p>Amodei's contribution to the timeline debate is definitional discipline: instead of arguing about “AGI,” he specifies capabilities (expert-level breadth, long-horizon autonomy, massive parallelism). That maps almost exactly onto the strictest row of the <a href="/what-is-agi">AGI definition table</a> — and onto the bar this scorecard uses for the <a href="/will-agi-arrive-2027">2027 verdict</a>. In effect, Amodei and Aschenbrenner describe similar destinations on similar clocks, from different institutional seats.</p>
<h2>How it compares</h2>
<table><thead><tr><th>Forecaster</th><th>Timeline</th><th>Seat</th></tr></thead><tbody>
<tr><td>Elon Musk</td><td class="nowrap">By end of 2026</td><td>xAI founder</td></tr>
<tr><td><strong>Dario Amodei</strong></td><td class="nowrap">"Powerful AI" possibly 2026–27</td><td>Anthropic CEO</td></tr>
<tr><td>Leopold Aschenbrenner</td><td class="nowrap">AGI 2027</td><td>Forecaster/investor</td></tr>
<tr><td>Demis Hassabis</td><td class="nowrap">~50% by 2030</td><td>DeepMind CEO</td></tr>
<tr><td>Andrej Karpathy</td><td class="nowrap">About a decade</td><td>Researcher/educator</td></tr>
</tbody></table>
<h2>What the evidence says so far</h2>
<p>Amodei's window is now live: mid-2026 sits inside his “as early as” range. The scorecard's read applies unchanged — <a href="/can-ai-replace-knowledge-workers">capability near the top of the skilled-human range</a> (~83% GDPval, ~80% SWE-Bench Pro), but nothing resembling an autonomous country of geniuses. If the 2026–27 window closes without long-horizon autonomous systems, his forecast joins the missed-aggressive-calls column; if it doesn't, he called it earlier than almost any lab leader.</p>""",
    faqs=[
        ("What is Dario Amodei's AGI prediction?", "Amodei avoids the term AGI but has said “powerful AI” — systems beyond Nobel-level experts with long-horizon autonomy, “a country of geniuses in a datacenter” — could arrive as early as 2026–27, with explicit uncertainty."),
        ("What does 'a country of geniuses in a datacenter' mean?", "Amodei's shorthand from Machines of Loving Grace (2024): millions of AI systems, each smarter than top human experts across fields, operating autonomously and faster than humans — his definition of transformative, powerful AI."),
        ("How does Amodei's timeline compare to Aschenbrenner's?", "They're closely aligned: Amodei's as-early-as 2026–27 window overlaps Aschenbrenner's 2027, and both use a strict autonomy-centric bar. The main difference is that Amodei attaches explicit uncertainty rather than a single focal year."),
        ("Is Amodei's prediction on track?", "The window is live but the destination is undemonstrated: capability benchmarks are strong as of mid-2026, but long-horizon autonomous systems — the core of his definition — haven't appeared. It resolves within roughly the next 18 months."),
    ],
    related=[("/when-will-agi-arrive", "When will AGI arrive? Every forecast"),
             ("/aschenbrenner-vs-hassabis", "Aschenbrenner vs Hassabis"),
             ("/what-is-agi", "What is AGI?")],
    extra_schema=[{"@context": "https://schema.org", "@type": "Person", "name": "Dario Amodei",
                   "description": "CEO of Anthropic; forecasts 'powerful AI' — a country of geniuses in a datacenter — possibly as early as 2026–27.",
                   "url": "https://agiscorecard.com/dario-amodei-agi-prediction",
                   "knowsAbout": ["Artificial general intelligence", "AI safety", "Anthropic"]}],
))

PAGES.append(dict(
    slug="agi-vs-superintelligence",
    title="AGI vs Superintelligence: The Difference, Explained",
    desc="AGI matches skilled humans at cognitive work; superintelligence (ASI) goes far beyond the best humans at everything. The chain between them — and where each stands in 2026.",
    og_title="AGI vs superintelligence (ASI)",
    eyebrow="Definition",
    h1="AGI vs superintelligence: the difference, explained",
    capsule='<span class="verdict">One is human-level breadth; the other is beyond-human everything.</span> <strong>AGI</strong> is AI that can do essentially any cognitive task a skilled human can. <strong>Superintelligence (ASI)</strong> is AI far beyond the best humans at essentially everything. In the standard forecast they are links in a chain: AGI automates AI research, an <em>intelligence explosion</em> follows, and ASI is the result. As of mid-2026: AGI-by-2027 is <strong class="v-open">Open</strong>; the explosion and ASI are <strong class="v-pending">Pending</strong>.',
    body_html="""<h2>The definitions side by side</h2>
<table><thead><tr><th></th><th>AGI</th><th>Superintelligence (ASI)</th></tr></thead><tbody>
<tr><td class="nowrap"><strong>Bar</strong></td><td>Match skilled humans across cognitive work</td><td>Far exceed the best humans at essentially everything</td></tr>
<tr><td class="nowrap"><strong>Canonical test</strong></td><td>Do the work of an AI researcher/engineer</td><td>Decisive scientific, economic, and strategic advantage</td></tr>
<tr><td class="nowrap"><strong>Forecast timing</strong></td><td>2026–2047 depending on forecaster</td><td>Early 2030s (Aschenbrenner); "a few thousand days" (Altman)</td></tr>
<tr><td class="nowrap"><strong>Scorecard status</strong></td><td class="v-open">Open (resolves Jan 2028)</td><td class="v-pending">Pending (preconditions unmet)</td></tr>
</tbody></table>
<h2>The chain that connects them</h2>
<p>In <em>Situational Awareness</em>, the two are separated by one mechanism: the <a href="/intelligence-explosion-2027">intelligence explosion</a>. Once AI can do AI research (AGI), hundreds of thousands of automated researchers compress roughly a decade of progress into about a year — and the output of that compression is superintelligence. That's why the scorecard grades them separately: AGI-by-2027 is a live, dated claim; ASI-in-the-2030s is downstream and can't be graded until its preconditions exist.</p>
<h2>Why the distinction matters practically</h2>
<p>Almost everything contentious about AI risk and geopolitics attaches to ASI, not AGI: decisive military advantage, the case for a <a href="/will-the-us-government-build-agi">government Project</a>, the stakes of the <a href="/us-china-ai-arms-race">US–China race</a>. Conflating the two makes near-term AI sound apocalyptic and long-term AI sound mundane. The scorecard's verdicts keep them apart — which is also why the current picture (<a href="/how-close-is-agi">close on capability, not on autonomy</a>) can be true at the same time as "superintelligence remains speculative."</p>""",
    faqs=[
        ("What is the difference between AGI and superintelligence?", "AGI matches skilled humans at general cognitive work; superintelligence (ASI) far exceeds the best humans at essentially everything. AGI is the trigger; ASI is the predicted result of AGI automating AI research."),
        ("Does AGI come before superintelligence?", "In every major forecast, yes. The standard sequence is AGI → intelligence explosion (AI automating AI research) → superintelligence. Aschenbrenner dates these roughly 2027 → 2027–29 → early 2030s."),
        ("How far away is superintelligence?", "Unknowable with confidence — it depends on AGI and an intelligence explosion that haven't happened. Aschenbrenner forecasts the early 2030s; Altman has suggested 'a few thousand days.' This scorecard grades it Pending."),
        ("Is ChatGPT AGI or ASI?", "Neither. Current frontier systems score near skilled humans on scoped tasks (~83% GDPval) but lack the reliable long-horizon autonomy that defines serious AGI bars — and are nowhere near the beyond-all-humans bar of ASI."),
    ],
    related=[("/what-is-agi", "What is AGI?"),
             ("/what-is-superintelligence", "What is superintelligence?"),
             ("/intelligence-explosion-2027", "The intelligence explosion, graded")],
))

PAGES.append(dict(
    slug="aschenbrenner-timeline",
    title="The Situational Awareness Timeline, Stage by Stage",
    desc="Aschenbrenner's full predicted sequence — 2025/26 college-grad AI, 2027 AGI, 2027–29 intelligence explosion, 2030s superintelligence — with the current verdict at every stage.",
    og_title="The Situational Awareness timeline, graded",
    eyebrow="Timeline",
    h1="The Situational Awareness timeline, stage by stage",
    capsule='<span class="verdict">A five-stage ladder — currently standing on the first rung.</span> <em>Situational Awareness</em> lays out a strict sequence: <strong>2025/26</strong> college-grad-level AI → <strong>2027</strong> AGI → <strong>2027–29</strong> intelligence explosion → <strong>2027/28</strong> a US government Project → <strong>2030s</strong> superintelligence. As of mid-2026 the first stage is <strong class="v-ok">on track</strong>, the second is <strong class="v-open">open</strong>, and everything above it is <strong class="v-pending">pending</strong>.',
    body_html="""<h2>The ladder, with live verdicts</h2>
<table><thead><tr><th>When</th><th>Predicted stage</th><th>Verdict, mid-2026</th></tr></thead><tbody>
<tr><td class="nowrap">2025/26</td><td>Models outpace college graduates on knowledge work</td><td class="nowrap v-ok">On track (~83% GDPval, ~80% SWE-Bench Pro)</td></tr>
<tr><td class="nowrap">2027</td><td><strong>AGI</strong> — AI does the work of an AI researcher</td><td class="nowrap v-open">Open — autonomy undemonstrated; resolves Jan 2028</td></tr>
<tr><td class="nowrap">2027/28</td><td>"The Project" — US government takes over AGI development</td><td class="nowrap v-open">Open — involvement growing, no formal project</td></tr>
<tr><td class="nowrap">2027–29</td><td>Intelligence explosion — a decade of progress in ~a year</td><td class="nowrap v-pending">Pending — trigger (AGI) hasn't fired</td></tr>
<tr><td class="nowrap">2030s</td><td>Superintelligence; decisive strategic advantage</td><td class="nowrap v-pending">Pending — two rungs away</td></tr>
</tbody></table>
<h2>Why the sequence is strict</h2>
<p>Each rung depends on the one below. No college-grad capability → no AGI. No AGI → nothing to explode. No explosion → no superintelligence in the 2030s. That structure is what makes the essay checkable: the whole tower resolves or falls with the <a href="/will-agi-arrive-2027">2027 AGI claim</a>, which is why it is the scorecard's headline verdict. The parallel input predictions — <a href="/is-ai-compute-still-scaling">compute ~0.5 OOM/yr</a> (on track), <a href="/ai-capex-trillion-dollar">trillion-dollar capex</a> (exceeded), <a href="/did-open-source-ai-fade">open source fading</a> (wrong) — feed the ladder but don't reorder it.</p>
<h2>Where we are on the clock</h2>
<p>Mid-2026 sits at the boundary between stage one and stage two: the capability stage has largely arrived on schedule, and the AGI stage has about 18 months left on its clock. The next 18 months therefore carry all the information — either autonomous AI research appears and the ladder holds, or January 2028 passes and the timeline's spine breaks. Follow it live on the <a href="/">scorecard homepage</a>.</p>""",
    faqs=[
        ("What is the Situational Awareness timeline?", "A five-stage sequence: college-grad-level AI by 2025/26, AGI in 2027, a US government Project by 2027/28, an intelligence explosion 2027–29, and superintelligence in the 2030s."),
        ("Which stages have happened so far?", "The first is on track — models perform near skilled-human level on knowledge work (~83% GDPval) and agentic coding (~80% SWE-Bench Pro). AGI (2027) is open, and every later stage is pending."),
        ("What happens if AGI doesn't arrive by 2027?", "The whole ladder loses its spine: the intelligence explosion and 2030s superintelligence stages depend on AGI arriving first. The claim resolves by January 1, 2028."),
        ("Is the timeline ahead or behind schedule?", "Roughly on schedule through stage one, with the decisive stage unresolved: input trends (compute, capex, capability) have held or exceeded, but the AGI stage's defining evidence — autonomous AI research — hasn't appeared."),
    ],
    related=[("/situational-awareness-summary", "Situational Awareness, summarized"),
             ("/situational-awareness-predictions", "Every prediction, tracked"),
             ("/will-agi-arrive-2027", "Will AGI arrive by 2027?")],
))

FOOT_OLD = 'Not affiliated with any lab</footer>'
FOOT_NEW = 'Not affiliated with any lab · <a href="/about" style="color:var(--muted);">About</a> · <a href="/privacy" style="color:var(--muted);">Privacy</a></footer>'

for p in PAGES:
    html = build(**p)
    html = html.replace("Last updated: June 30, 2026", f"Last updated: {UPD}")
    html = html.replace('"datePublished": "2026-06-30"', f'"datePublished": "{PUB}"')
    html = html.replace('"dateModified": "2026-06-30"', f'"dateModified": "{PUB}"')
    m = re.search(r'(View the live scorecard(?: &rarr;| →)?</a>\s*</div>\n)', html)
    html = html[:m.end(1)] + NEWSLETTER + html[m.end(1):]
    html = html.replace(FOOT_OLD, FOOT_NEW)
    with open(os.path.join(OUT, p["slug"] + ".html"), "w", encoding="utf-8") as f:
        f.write(html)
    print(f"wrote {p['slug']}.html ({len(html)} b) title={len(p['title'])} desc={len(p['desc'])}")
