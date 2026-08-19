# -*- coding: utf-8 -*-
"""Batch-4 finish (accelerated per owner 2026-07-11): the 3 remaining vetted
comparison pages, each with genuinely distinct analysis. Established data only."""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(__file__))
from gen_lib import build, OUT, SITE

PUB = "2026-07-11"
UPD = "July 11, 2026"

NEWSLETTER = """  <div class="cta" style="margin-top:1rem; background:var(--bg2); border:1px solid var(--border);">
    <p style="margin:0;font-weight:600;">Get the weekly AGI progress briefing</p>
    <p style="margin:6px 0 0;font-size:13px;color:var(--muted);">Verdict changes, lab milestones, and what they mean for the 2027 clock. Free — no hype, just signal.</p>
    <a href="https://agiscorecard.beehiiv.com/subscribe?utm_source=agiscorecard&utm_medium=deep_page" target="_blank" rel="noopener" onclick="gtag('event','subscribe_click',{location:'deep_page'});">Subscribe free &rarr;</a>
  </div>
"""

PAGES = []

PAGES.append(dict(
    slug="altman-vs-amodei-agi",
    title="Altman vs Amodei on AGI: The Two Lab-CEO Bets Compared",
    desc="Altman says OpenAI knows how to build AGI but names no date. Amodei says powerful AI possibly by 2026-27, with explicit caveats. The CEO positions, compared.",
    og_title="Altman vs Amodei on AGI",
    eyebrow="Comparison",
    h1="Altman vs Amodei on AGI: two lab CEOs, two styles of confidence",
    capsule='<span class="verdict">Similar timelines, opposite disciplines.</span> Sam Altman says OpenAI is <strong>“confident we know how to build AGI”</strong> and puts superintelligence “a few thousand days” out — bullish but deliberately undated. Dario Amodei forecasts <strong>“powerful AI” possibly by 2026–27</strong>, but wraps it in a precise definition and explicit uncertainty. The difference isn\'t optimism — it\'s how checkable each claim is.',
    body_html="""<h2>Side by side</h2>
<table><thead><tr><th>Dimension</th><th>Sam Altman (OpenAI)</th><th>Dario Amodei (Anthropic)</th></tr></thead><tbody>
<tr><td>Stated position</td><td>Knows how to build AGI; ASI “a few thousand days”</td><td class="nowrap">“Powerful AI” possibly 2026–27</td></tr>
<tr><td>Definition offered</td><td class="nowrap v-open">Loose — shifts by context</td><td class="nowrap v-ok">Precise — “country of geniuses in a datacenter”</td></tr>
<tr><td>Uncertainty stated</td><td class="nowrap v-open">Rarely quantified</td><td class="nowrap v-ok">Explicit and repeated</td></tr>
<tr><td>Falsifiable?</td><td class="nowrap v-open">Not cleanly</td><td>Partially — the 2026–27 window is checkable</td></tr>
<tr><td>vs Aschenbrenner's 2027</td><td class="nowrap">Roughly compatible</td><td class="nowrap">Roughly aligned, more caveated</td></tr>
</tbody></table>
<h2>The real difference: definitional discipline</h2>
<p>Both CEOs run frontier labs, both expect transformative AI within a few years, and both benefit commercially from that expectation. What separates them is method. Amodei's <em>Machines of Loving Grace</em> (October 2024) defines exactly what he means — an AI that works like “a country of geniuses in a datacenter,” smarter than Nobel laureates across fields — and attaches an explicit possibly-2026–27 window with stated uncertainty. Altman's formulations are directionally consistent but definitionally fluid: “AGI” in his usage has ranged from systems that outperform humans at most economically valuable work to something OpenAI will have built sooner than expected while mattering less than expected.</p>
<h2>How mid-2026 evidence treats both</h2>
<p>Amodei's window is now live: with ~83% on GDPval-style knowledge work and ~80% on SWE-Bench Pro, capability is near the top of the skilled-human range on scoped tasks — but a “country of geniuses” that works autonomously has not appeared, and unsupervised reliability still lags benchmarks. If 2027 ends without it, his caveated forecast absorbs the miss he explicitly priced in; Altman's undated version was never exposed to begin with. The scorecard's preference is structural: <a href="/will-agi-arrive-2027">dated, checkable claims</a> beat unfalsifiable confidence, which is why Aschenbrenner's 2027 — not either CEO's formulation — anchors this site.</p>
<h2>Why this pairing matters</h2>
<p>These are the two people with the most direct visibility into frontier training runs, and their public bets differ mainly in epistemics, not expectations. Read together, they bracket the serious insider view: transformative AI plausibly within this decade's first half — with the honest disagreement being about how much to promise in public. Compare the fully-dated versions on <a href="/when-will-agi-arrive">the full forecast spread</a>.</p>""",
    faqs=[
        ("What is the difference between Altman's and Amodei's AGI predictions?", "Both expect transformative AI soon, but Amodei gives a precise definition ('a country of geniuses in a datacenter') and an explicit possibly-2026–27 window with stated uncertainty, while Altman expresses confidence — 'we know how to build AGI' — without committing to a date or fixed definition."),
        ("What did Dario Amodei predict about AGI?", "In Machines of Loving Grace (October 2024), Amodei forecast 'powerful AI' — smarter than Nobel-level experts across fields — possibly arriving by 2026–27, while explicitly flagging his uncertainty."),
        ("Has either prediction come true as of mid-2026?", "Not yet. Capability benchmarks are strong (~83% GDPval, ~80% SWE-Bench Pro), but nothing resembling an autonomous 'country of geniuses' exists, and unsupervised reliability still lags. Amodei's window remains open through 2027."),
        ("Whose AGI framing does the scorecard prefer?", "Neither CEO's, structurally: this site anchors on dated, checkable claims — Aschenbrenner's 2027, which resolves by January 1, 2028 — because unfalsifiable confidence can't be graded."),
    ],
    related=[("/sam-altman-agi-prediction", "Sam Altman's AGI prediction"),
             ("/dario-amodei-agi-prediction", "Dario Amodei's AGI prediction"),
             ("/altman-vs-musk-agi", "Altman vs Musk on AGI")],
))

PAGES.append(dict(
    slug="musk-vs-hassabis-agi",
    title="Musk vs Hassabis on AGI: Boldest Date vs Builder's Caution",
    desc="Musk says AGI by end of 2026; Hassabis says ~50% by 2030. The most aggressive public date vs the cautious frontier-builder view — and what evidence favors.",
    og_title="Musk vs Hassabis on AGI",
    eyebrow="Comparison",
    h1="Musk vs Hassabis on AGI: the boldest date vs the builder's caution",
    capsule='<span class="verdict">Four years apart — and opposite relationships with deadlines.</span> Elon Musk puts AGI at <strong>end of 2026</strong>, the most aggressive dated call from any prominent figure. Demis Hassabis puts it at roughly <strong>50% by 2030</strong> and actively warns against hype. One has a long record of bold dates that slip; the other builds frontier models daily and still refuses to promise one.',
    body_html="""<h2>Side by side</h2>
<table><thead><tr><th>Dimension</th><th>Elon Musk</th><th>Demis Hassabis</th></tr></thead><tbody>
<tr><td>Stated position</td><td class="nowrap">AGI by end of 2026</td><td class="nowrap">~50% by 2030</td></tr>
<tr><td>Seat</td><td>xAI founder; serial company builder</td><td>CEO, Google DeepMind; Nobel laureate</td></tr>
<tr><td>Track record on dates</td><td class="nowrap v-wrong">Aggressive, frequently slips</td><td class="nowrap v-ok">Consistent, probability-framed</td></tr>
<tr><td>Resolves</td><td class="nowrap">December 31, 2026</td><td class="nowrap">2030 (probabilistic)</td></tr>
<tr><td>vs Aschenbrenner's 2027</td><td class="nowrap">~1 year earlier</td><td class="nowrap">~3 years later</td></tr>
</tbody></table>
<h2>Why the four-year gap exists</h2>
<p>The two positions come from different jobs. Musk's date functions as a rallying claim — the same style that put aggressive (and often slipped) deadlines on self-driving and Mars. Hassabis speaks as someone who ships frontier models and sees, daily, the distance between benchmark performance and dependable autonomy; his ~50%-by-2030 is a probability, not a promise, and he pairs it with warnings against over-hyping near-term timelines. On the <a href="/when-will-agi-arrive">full forecast spread</a>, Musk defines the aggressive edge and Hassabis sits near the sober middle.</p>
<h2>What the evidence says with Musk's deadline months away</h2>
<p>Musk's call is about to become the field's first high-profile resolution: as of mid-2026, capability is strong on scoped tasks (~83% GDPval-style knowledge work, ~80% SWE-Bench Pro) but autonomous end-to-end work — the bar nearly every serious AGI definition requires — remains undemonstrated. Absent a very fast breakthrough, end-of-2026 is on course to miss, which would leave <a href="/will-agi-arrive-2027">Aschenbrenner's 2027</a> as the next dated claim on the clock and lend Hassabis's caution its first hard data point.</p>
<h2>What each being right would look like</h2>
<p>If Musk is right, the entire forecast distribution — including this scorecard's Open verdicts — gets compressed overnight, and the <a href="/intelligence-explosion-2027">intelligence-explosion timeline</a> starts early. If Hassabis is right, AGI lands around 2030: Aschenbrenner's trend analysis was directionally correct but ~3 years fast, and the "capability now, autonomy later" pattern in current benchmarks was the tell. The scorecard tracks both outcomes with pre-registered flip conditions.</p>""",
    faqs=[
        ("What is the difference between Musk's and Hassabis's AGI predictions?", "Musk says AGI by end of 2026 — the boldest dated public call. Hassabis puts it at roughly 50% by 2030, framed as a probability rather than a promise, and warns against hype. The gap is about four years."),
        ("Will Musk's 2026 AGI prediction come true?", "It resolves December 31, 2026. As of mid-2026, benchmarks are strong (~83% GDPval, ~80% SWE-Bench Pro) but autonomous end-to-end work is undemonstrated — the bar most AGI definitions require — so the call is on course to miss absent a very fast breakthrough."),
        ("Why is Hassabis more cautious than Musk?", "Different vantage points: Hassabis builds frontier models and prices in the gap between benchmark capability and dependable autonomy daily. Musk's aggressive dating pattern mirrors his other ventures, where bold deadlines have frequently slipped."),
        ("Where does Aschenbrenner sit between them?", "Between the two: his 2027 is one year later than Musk and roughly three earlier than Hassabis's central mass — and it's the next dated claim to resolve, by January 1, 2028."),
    ],
    related=[("/elon-musk-agi-prediction", "Elon Musk's AGI prediction"),
             ("/demis-hassabis-agi-prediction", "Demis Hassabis's AGI prediction"),
             ("/aschenbrenner-vs-hassabis", "Aschenbrenner vs Hassabis")],
))

PAGES.append(dict(
    slug="karpathy-vs-altman-agi",
    title="Karpathy vs Altman on AGI: Same Lab Roots, Opposite Reads",
    desc="Both came from OpenAI. Altman says the lab knows how to build AGI; Karpathy says it's a decade away. Why two insiders with the same information disagree.",
    og_title="Karpathy vs Altman on AGI",
    eyebrow="Comparison",
    h1="Karpathy vs Altman: same OpenAI roots, opposite AGI reads",
    capsule='<span class="verdict">The most instructive disagreement in AI forecasting.</span> Sam Altman runs OpenAI and says it is <strong>“confident we know how to build AGI.”</strong> Andrej Karpathy was a founding member of the same lab — and puts AGI <strong>about a decade away</strong>, calling this the “decade of agents,” not the year of them. Two people with frontier-level visibility, reading the same evidence in opposite directions.',
    body_html="""<h2>Side by side</h2>
<table><thead><tr><th>Dimension</th><th>Sam Altman</th><th>Andrej Karpathy</th></tr></thead><tbody>
<tr><td>Stated position</td><td>Confident OpenAI knows how to build AGI; ASI “a few thousand days”</td><td class="nowrap">~A decade out</td></tr>
<tr><td>OpenAI relationship</td><td class="nowrap">CEO (current)</td><td class="nowrap">Founding member (departed)</td></tr>
<tr><td>Current incentive</td><td>Lab positioning — capital, talent, expectations</td><td>Educator/independent — no lab to promote</td></tr>
<tr><td>Core claim type</td><td class="nowrap v-open">Confidence, undated</td><td class="nowrap v-ok">Skeptical, roughly dated</td></tr>
<tr><td>vs Aschenbrenner's 2027</td><td class="nowrap">Roughly compatible</td><td class="nowrap">~8 years later</td></tr>
</tbody></table>
<h2>Why insiders with the same information disagree</h2>
<p>This pairing controls for the usual explanation of forecast gaps — access to information. Both have seen frontier systems up close. The divergence comes from two places. First, <strong>weighting</strong>: Karpathy weights the reliability gap — models' remaining cognitive deficits, the years of unglamorous engineering between impressive demos and dependable agents — far more heavily than trend extrapolation. Second, <strong>incentive</strong>: Altman's confidence sustains OpenAI's positioning as the presumed frontrunner; Karpathy, now an independent educator, carries no organizational need for near-term AGI to be true.</p>
<h2>What mid-2026 evidence says about each read</h2>
<p>The current data genuinely supports both stories, which is why the disagreement persists. For Altman's read: capability keeps climbing (~83% GDPval-style knowledge work, ~80% SWE-Bench Pro), and the input curves — compute, capex — have held or exceeded projections. For Karpathy's read: no system has autonomously conducted AI research or run a job unsupervised, exactly the deficit he says takes a decade. The tiebreaker arrives on a schedule: <a href="/will-agi-arrive-2027">Aschenbrenner's 2027</a> resolves by January 2028, and its outcome will be the first hard evidence for one read over the other.</p>
<h2>How to use this disagreement</h2>
<p>When two frontier insiders disagree this widely, the honest conclusion is that the deciding evidence doesn't exist yet — anyone claiming certainty in either direction is ahead of the data. That's the scorecard's approach: track <a href="/situational-awareness-predictions">checkable predictions</a> with pre-registered flip conditions, and let resolutions — not confidence — settle it.</p>""",
    faqs=[
        ("How do Karpathy's and Altman's AGI predictions differ?", "Altman, OpenAI's CEO, says the lab is confident it knows how to build AGI and puts superintelligence 'a few thousand days' away. Karpathy, an OpenAI founding member who left, puts AGI about a decade out — roughly eight years apart despite shared frontier-level visibility."),
        ("Why do two OpenAI insiders disagree about AGI timing?", "Two factors: weighting and incentives. Karpathy weights the reliability gap between demos and dependable agents heavily; Altman extrapolates trends. Altman's confidence also serves OpenAI's positioning, while Karpathy has no lab to promote."),
        ("Who does the mid-2026 evidence favor?", "Both, partially: strong benchmarks (~83% GDPval, ~80% SWE-Bench Pro) support the optimistic read, while undemonstrated autonomous work supports the decade view. The first hard tiebreaker is Aschenbrenner's 2027 claim, resolving by January 2028."),
        ("What should I take away from this disagreement?", "That the deciding evidence doesn't exist yet. When insiders with equal visibility disagree by nearly a decade, tracking dated, checkable predictions — not confidence — is the only honest way to follow AGI progress."),
    ],
    related=[("/karpathy-agi-prediction", "Andrej Karpathy's AGI prediction"),
             ("/sam-altman-agi-prediction", "Sam Altman's AGI prediction"),
             ("/altman-vs-musk-agi", "Altman vs Musk on AGI")],
))

FOOT_OLD = 'Not affiliated with any lab</footer>'
FOOT_NEW = ('Not affiliated with any lab · <a href="/about" style="color:var(--muted);">About</a> · '
            '<a href="/privacy" style="color:var(--muted);">Privacy</a> · '
            '<a href="/advertise" style="color:var(--muted);">Advertise</a></footer>')

for p in PAGES:
    html = build(**p)
    html = html.replace("Last updated: June 30, 2026", f"Last updated: {UPD}")
    html = html.replace('"datePublished": "2026-06-30"', f'"datePublished": "{PUB}"')
    html = html.replace('"dateModified": "2026-06-30"', f'"dateModified": "{PUB}"')
    # newsletter block after scorecard CTA
    m = re.search(r'(View the live scorecard(?: &rarr;| →)?</a>\s*</div>\n)', html)
    html = html[:m.end(1)] + NEWSLETTER + html[m.end(1):]
    # footer trust links
    html = html.replace(FOOT_OLD, FOOT_NEW)
    # spoke->hub link
    html = html.replace(
        '<a href="/two-year-scorecard.html">Full two-year scorecard with all 8 predictions →</a>',
        '<a href="/two-year-scorecard.html">Full two-year scorecard with all 8 predictions →</a>\n'
        '    <a href="/agi-questions">Browse all AGI questions, answered →</a>')
    # byline
    m2 = re.search(r'(<div class="updated">[^<]*</div>)', html)
    html = html.replace(m2.group(1), m2.group(1) +
        '\n  <div class="byline" style="font-size:12px;color:var(--muted);margin:-0.9rem 0 1.5rem;">'
        'By the AGI Scorecard team · <a href="/about">methodology &amp; independence</a></div>', 1)
    # breadcrumb
    bc = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "AGI Scorecard", "item": SITE + "/"},
        {"@type": "ListItem", "position": 2, "name": "AGI questions, answered", "item": SITE + "/agi-questions"},
        {"@type": "ListItem", "position": 3, "name": p["og_title"], "item": f"{SITE}/{p['slug']}"}]}
    tag = '<script type="application/ld+json">' + json.dumps(bc, ensure_ascii=False) + '</script>\n'
    idx = html.find('<script type="application/ld+json">')
    html = html[:idx] + tag + html[idx:]

    with open(os.path.join(OUT, p["slug"] + ".html"), "w", encoding="utf-8") as f:
        f.write(html)
    print(f"wrote {p['slug']}.html ({len(html)} b) title={len(p['title'])} desc={len(p['desc'])}")
