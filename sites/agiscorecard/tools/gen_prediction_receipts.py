# -*- coding: utf-8 -*-
"""DISCOVERY tool page: /prediction-receipts — "AI Prediction Receipts".
Every dated public AGI call rendered as a RECEIPT: the claim, the deadline, a live
JS countdown, and an auto-derived status stamp (ON THE CLOCK / EXPIRES SOON /
DATE PASSED). Statuses are pure date math vs today — zero fabrication; every
position is already documented on-site with primary sources. Each receipt has its
own X-share (x_share{receipt_<slug>}). The bet: expiring predictions are proven
share-bait (X "receipts" culture; Polymarket-style live numbers in link previews),
and Musk's end-2026 deadline is the first predictable viral moment.
Run: python3 tools/gen_prediction_receipts.py"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gen_lib as g

DATE = "2026-07-24"
SCORE = str(json.load(open(os.path.join(g.OUT, "data.json")))["thesisTracker"]["score"])

# slug, emoji, who, claim, deadline (ISO, end of window), deadline_label, note, detail link
RECEIPTS = [
 ("musk","🚀","Elon Musk (xAI)","AGI by the end of 2026","2026-12-31","Dec 31, 2026",
  "The boldest dated call on record. Hard deadline.","/elon-musk-agi-prediction"),
 ("amodei","🧭","Dario Amodei (Anthropic)","“Powerful AI” possibly 2026–27","2027-12-31","Dec 31, 2027",
  "Stated with explicit uncertainty; window closes end of 2027.","/dario-amodei-agi-prediction"),
 ("aschenbrenner","⏱️","Leopold Aschenbrenner","AGI by 2027 (Situational Awareness)","2028-01-01","Jan 1, 2028",
  "The thesis this site grades line by line — Tracker at __SCORE__/100.","/who-is-leopold-aschenbrenner"),
 ("hassabis","📊","Demis Hassabis (DeepMind)","~50% chance of AGI by 2030","2030-12-31","Dec 31, 2030",
  "Probabilistic — graded at the date, not before.","/demis-hassabis-agi-prediction"),
 ("metaculus","🤔","Metaculus community","50% by 2033","2033-12-31","Dec 31, 2033",
  "Community median; moves with the news.","/when-will-agi-arrive"),
 ("survey","🛡️","AI researcher survey (n=2,778)","50% by 2047","2047-12-31","Dec 31, 2047",
  "The long-horizon academic base rate.","/when-will-agi-arrive"),
]

import html as html_mod
rows = []
for slug, emoji, who, claim, iso, dl, note, link in RECEIPTS:
    note_html = note.replace("__SCORE__", SCORE)
    share = ("RECEIPT: %s called '%s.' Deadline %s — the clock is public now. Tracking every AI prediction that comes due:" % (who.split(" (")[0], claim.replace("“","").replace("”",""), dl))
    share_attr = html_mod.escape(share, quote=True)
    rows.append(f'''<div class="receipt" style="border:1px solid var(--border); border-left:4px solid var(--accent); border-radius:10px; padding:14px 16px; margin:0 0 12px; background:var(--bg2);">
  <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; align-items:baseline;">
    <p style="margin:0; font-weight:700;">{emoji} {who}</p>
    <span class="stamp" data-deadline="{iso}" style="font-size:11px; letter-spacing:.08em; text-transform:uppercase; font-weight:700; padding:3px 9px; border-radius:6px; border:1px solid var(--border);">…</span>
  </div>
  <p style="margin:6px 0 2px; font-size:15.5px;">&ldquo;{claim}&rdquo;</p>
  <p style="margin:0 0 8px; font-size:13px; color:var(--muted);">Deadline: <strong>{dl}</strong> · <span class="cd" data-deadline="{iso}">…</span> · {note_html} · <a href="{link}">the full record →</a></p>
  <button class="btn-share" data-slug="{slug}" data-share="{share_attr}" style="cursor:pointer; font:inherit; font-size:12.5px; font-weight:600; color:var(--accent); background:none; border:1px solid var(--border); border-radius:7px; padding:5px 12px;">Share this receipt on &#120143;</button>
</div>''')
receipts_html = "\n".join(rows)

capsule = ('<span class="verdict">Every dated AGI call, on one public clock.</span> '
           'Elon Musk’s &ldquo;AGI by end of 2026&rdquo; is the first big receipt to come due &mdash; the countdown below is live. '
           'Aschenbrenner’s 2027 thesis follows (Jan 1, 2028), with the field stretching to the academic survey’s 2047. '
           f'The evidence meter for the 2027 bet sits at <strong>{SCORE}/100</strong> as of July 2026.')

body = f"""<h2>The receipts, soonest due first</h2>
<p>A receipt is simple: the exact public claim, the date it comes due, and a live clock. No editorializing &mdash; the stamps below are pure date math, and every claim links to its full sourced record. When a date passes, the receipt stays.</p>
{receipts_html}
<p style="font-size:13px; color:var(--muted);">Statuses update automatically: <b>ON THE CLOCK</b> (deadline ahead) &rarr; <b>EXPIRES SOON</b> (&le;180 days) &rarr; <b>DATE PASSED</b> (deadline behind, claim unresolved on our scorecard). Probabilistic calls (&ldquo;~50% by&hellip;&rdquo;) are graded at their date, not before.</p>
<h2>Why keep receipts?</h2>
<p>Because timelines are the one thing AI discourse never gets held to. Public figures make dated calls; the dates pass; the conversation moves on. This page doesn't. It pairs each claim with the same evidence base our scorecard uses &mdash; the <a href="/progress-index">AGI-2027 Thesis Tracker</a> ({SCORE}/100 as of July 2026) grades the nearest big claim against benchmarks, compute and capex, and moves only when a verdict changes. See also the <a href="/forecaster-leaderboard">full forecaster leaderboard</a> ranked by boldness.</p>
<script>
function tick(){{
  var now=new Date();
  document.querySelectorAll('.cd').forEach(function(el){{
    var d=new Date(el.getAttribute('data-deadline')+'T23:59:59Z');
    var ms=d-now;
    if(ms>0){{var days=Math.floor(ms/86400000);el.textContent=days+' days left';}}
    else{{el.textContent=Math.floor(-ms/86400000)+' days past due';}}
  }});
  document.querySelectorAll('.stamp').forEach(function(el){{
    var d=new Date(el.getAttribute('data-deadline')+'T23:59:59Z');
    var days=Math.floor((d-now)/86400000);
    if(days<0){{el.textContent='DATE PASSED';el.style.color='#e05555';el.style.borderColor='#e05555';}}
    else if(days<=180){{el.textContent='EXPIRES SOON';el.style.color='#e8a040';el.style.borderColor='#e8a040';}}
    else{{el.textContent='ON THE CLOCK';el.style.color='var(--accent2)';}}
  }});
}}
document.querySelectorAll('.btn-share').forEach(function(b){{
  b.addEventListener('click',function(){{
    gtag('event','x_share',{{label:'receipt_'+b.getAttribute('data-slug')}});
    window.open('https://twitter.com/intent/tweet?text='+encodeURIComponent(b.getAttribute('data-share')+' \\ud83d\\udc47')+'&url='+encodeURIComponent('https://agiscorecard.com/prediction-receipts'),'_blank');
  }});
}});
tick(); setInterval(tick,60000);
</script>"""

faqs = [
    ("Which AI prediction expires first?",
     "Elon Musk's — he has said AGI arrives by the end of 2026, the boldest dated call on record. That receipt comes due December 31, 2026. Dario Amodei's 'powerful AI possibly 2026–27' window closes a year later, and Leopold Aschenbrenner's AGI-2027 thesis resolves January 1, 2028."),
    ("What happens when an AI prediction's date passes?",
     "The receipt stays and the stamp flips to DATE PASSED — pure date math against the claim's own deadline. Whether the claim was fulfilled is graded separately on the scorecard; as of July 2026 no system has met the AGI bar, and the AGI-2027 Thesis Tracker reads %s/100." % SCORE),
    ("Are these real quotes and dates?",
     "Every claim is a documented public position — each receipt links to a full sourced record on this site, and the machine-readable dataset (data.json, CC BY 4.0) carries the primary sources. Nothing is invented; probabilistic forecasts are labeled and graded at their date, not before."),
]
related = [
    ("/forecaster-leaderboard", "AGI forecaster leaderboard"),
    ("/elon-musk-agi-prediction", "Musk's AGI prediction, examined"),
    ("/will-agi-arrive-2027", "Will AGI arrive by 2027?"),
    ("/progress-index", "The AGI-2027 Thesis Tracker"),
]

html = g.build(
    slug="prediction-receipts",
    title="AI Prediction Receipts: Every Dated AGI Call, on the Clock",
    desc="Musk said AGI by end of 2026. Amodei 2026–27. Aschenbrenner 2027. Live countdowns to every dated AGI prediction — the receipts stay when the dates pass.",
    og_title="AI Prediction Receipts — the clock is public now",
    eyebrow="Accountability",
    h1="AI prediction receipts: every dated call, on the clock",
    capsule=capsule, body_html=body, faqs=faqs, related=related,
)

html = html.replace("Last updated: June 30, 2026", "Last updated: July 24, 2026")
html = html.replace('"datePublished": "2026-06-30", "dateModified": "2026-06-30"',
                    f'"datePublished": "{DATE}", "dateModified": "{DATE}"')
html = html.replace(
    '<div class="updated">Last updated: July 24, 2026 · Updated as verdicts change</div>',
    '<div class="updated">Last updated: July 24, 2026 · Countdowns update live</div>\n'
    '  <div class="byline" style="font-size:12px;color:var(--muted);margin:-0.9rem 0 1.5rem;">'
    'By the AGI Scorecard team · <a href="/about">methodology &amp; independence</a></div>')
crumb = ('<script type="application/ld+json">{"@context": "https://schema.org", "@type": "BreadcrumbList", '
         '"itemListElement": [{"@type": "ListItem", "position": 1, "name": "AGI Scorecard", "item": "https://agiscorecard.com/"}, '
         '{"@type": "ListItem", "position": 2, "name": "AGI questions, answered", "item": "https://agiscorecard.com/agi-questions"}, '
         '{"@type": "ListItem", "position": 3, "name": "AI prediction receipts", "item": "https://agiscorecard.com/prediction-receipts"}]}</script>\n')
i = html.index('<script type="application/ld+json">')
html = html[:i] + crumb + html[i:]
html = html.replace(
    '  </div>\n</article>',
    '''  </div>
  <div class="cta" style="margin-top:1rem;">
    <p style="margin:0;font-weight:600;">Where do YOUR bets land? Play The Future Bet.</p>
    <a href="/future-bet" onclick="gtag('event','agi_test_click',{location:'receipts'});">Bet on 12 bold futures in 60 seconds &rarr;</a>
  </div>
  <div class="cta" style="margin-top:1rem; background:var(--bg2); border:1px solid var(--border);">
    <p style="margin:0;font-weight:600;">Get told the moment a receipt comes due</p>
    <p style="margin:6px 0 0;font-size:13px;color:var(--muted);">One email when a dated call expires or a verdict flips. Free — no hype, just the record.</p>
    <a href="https://agiscorecard.beehiiv.com/subscribe?utm_source=agiscorecard&utm_medium=deep_page" target="_blank" rel="noopener" onclick="gtag('event','subscribe_click',{location:'deep_page'});">Subscribe free &rarr;</a>
  </div>
</article>''')
html = html.replace(
    'Not affiliated with any lab</footer>',
    'Not affiliated with any lab · <a href="/about" style="color:var(--muted);">About</a> · '
    '<a href="/privacy" style="color:var(--muted);">Privacy</a> · '
    '<a href="/advertise" style="color:var(--muted);">Advertise</a></footer>')

open(f"{g.OUT}/prediction-receipts.html", "w").write(html)
print("prediction-receipts.html written")
