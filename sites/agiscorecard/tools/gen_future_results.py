# -*- coding: utf-8 -*-
"""Generate /future-bet/<slug> result pages for The Future Bet game. Each is a SOCIAL
SHARE landing page: its own og:image (share/future-<slug>.png) so a shared link
unfurls a branded persona card, plus the "you're closest to <forecaster>" reveal, a
real-data context line (public forecaster positions only — no invented stats), the
subscribe funnel, a native "Challenge a friend" re-share, and a loop back to the game.
noindex,follow — share pages, not the crawl surface. Score read from data.json."""
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCORE = str(json.load(open(os.path.join(ROOT, "data.json")))["thesisTracker"]["score"])
GA = "G-FZXLMBB5QB"

# Sponsor slot (clearly labeled; never affects verdicts — CLAUDE.md). If no sponsor is
# active, render a house ad inviting sponsors to /advertise.
_scfg = json.load(open(os.path.join(ROOT, "future-bet-sponsor.json")))
if _scfg.get("active") and _scfg.get("sponsor", {}).get("headline"):
    s = _scfg["sponsor"]
    SPONSOR = ('<div class="sponsor">\n'
       '  <div class="sponsor-tag">Sponsored</div>\n'
       '  <p style="font-weight:600">' + s["headline"] + '</p>\n'
       '  <p style="color:var(--muted)">' + s.get("body", "") + '</p>\n'
       '  <a href="' + s["url"] + '" target="_blank" rel="noopener sponsored" '
       'onclick="gtag(\'event\',\'sponsor_click\',{location:\'future_bet\'});">' + s.get("cta", "Learn more") + ' &rarr;</a>\n'
       '  <div style="font-size:11px;color:var(--muted);margin-top:6px">Sponsored placement · never affects our verdicts</div>\n'
       '</div>')
else:
    SPONSOR = ('<div class="sponsor">\n'
       '  <div class="sponsor-tag">Sponsor slot · available</div>\n'
       '  <p style="font-weight:600">Put your brand in front of people betting on the future of AI.</p>\n'
       '  <a href="/advertise" onclick="gtag(\'event\',\'advertise_click\',{location:\'future_bet_sponsor\'});">Sponsor The Future Bet &rarr;</a>\n'
       '</div>')

PERSONAS = {
 "musk": {"emoji":"🚀","name":"Elon Musk","tl":"AGI by end of 2026",
   "case":"You bet 10–12 of the futures happen on time — the boldest score there is. That puts you ahead of even Elon Musk, whose end-of-2026 AGI call is the most aggressive public forecast on record. The case for you: compute keeps scaling ~0.5 OOM/yr and agentic capability is climbing fast. The risk: reliable autonomy has repeatedly proven harder than benchmarks suggest."},
 "aschenbrenner": {"emoji":"⏱️","name":"Leopold Aschenbrenner","tl":"AGI by 2027",
   "case":"Your bets land you on Leopold Aschenbrenner's <em>Situational Awareness</em> line — AGI by 2027, driven by \"counting the OOMs.\" Two years in, the scorecard has 3 predictions on track and 1 clearly wrong (open source didn't fade); the AGI-2027 Thesis Tracker sits at " + SCORE + "/100."},
 "hassabis": {"emoji":"📊","name":"Demis Hassabis","tl":"~50% by 2030",
   "case":"You're with Demis Hassabis (~50% by 2030): the future arrives this decade, but past the 2027 focal point. The case: capability curves are real, but robustness and deployment lag stretch the timeline a few years beyond the most aggressive lab insiders."},
 "metaculus": {"emoji":"🤔","name":"the Metaculus crowd","tl":"~50% by 2033",
   "case":"You're near the Metaculus community forecast (~50% by 2033) — more cautious than most frontier-lab leaders. The case: benchmark scores overstate real-world generality, and each past AI wave underdelivered on its boldest timelines."},
 "survey": {"emoji":"🛡️","name":"the academic survey","tl":"50% by 2047",
   "case":"You side with the broad academic survey of 2,778 AI researchers (~50% by 2047): the big leaps are far off, or not on the current trajectory at all. The case: today's systems still lack durable reasoning, agency and grounding — you bet the trend lines break before they finish."},
}

PAGE = """<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,follow">
<title>{name} — The Future Bet | AGI Scorecard</title>
<meta name="description" content="My Future Bet puts me closest to {name} ({tl}). Play the 60-second game — bet YES/NO on 12 bold predictions and see which forecaster you are.">
<link rel="canonical" href="https://agiscorecard.com/future-bet/{slug}">
<meta property="og:type" content="website">
<meta property="og:url" content="https://agiscorecard.com/future-bet/{slug}">
<meta property="og:title" content="My future bets make me {emoji} {name}. What's yours?">
<meta property="og:description" content="{tl} — play The Future Bet: 12 YES/NO bets on bold predictions, see which forecaster you match.">
<meta property="og:image" content="https://agiscorecard.com/share/future-{slug}.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="I'm {emoji} {name} on the future. What's your Future Bet?">
<meta name="twitter:image" content="https://agiscorecard.com/share/future-{slug}.png">
<style>
:root{{--bg:#0e0e14;--bg2:#16151f;--bg3:#1e1c28;--border:#26232f;--text:#f4f4f8;--muted:#a8a4c4;--accent:#7c6af5;--accent2:#4fc3a1}}
*{{margin:0;padding:0;box-sizing:border-box}}
body{{background:radial-gradient(900px 520px at 30% -5%,#1a1830,#0e0e14);color:var(--text);font:16px/1.65 -apple-system,'Segoe UI',Roboto,sans-serif;min-height:100vh}}
.wrap{{max-width:640px;margin:0 auto;padding:26px 20px 64px}}
a{{color:var(--accent)}}
header{{display:flex;justify-content:space-between;align-items:center;font-size:14px;margin-bottom:26px}}
header .brand{{font-weight:700;color:var(--text);text-decoration:none}}
.kicker{{font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}}
.card{{width:100%;border-radius:14px;border:1px solid var(--border);margin:6px 0 18px;display:block}}
h1{{font-size:30px;line-height:1.12;margin:6px 0 12px;letter-spacing:-.01em}}
.case{{background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:18px 20px;color:#cfcde0;margin-bottom:18px}}
.btn{{display:inline-block;background:var(--accent);color:#fff;padding:12px 22px;border-radius:8px;font-weight:600;text-decoration:none;border:0;cursor:pointer;font-family:inherit;font-size:15px}}
.btn.sec{{background:var(--bg3)}}
.row{{display:flex;gap:10px;flex-wrap:wrap;margin:16px 0}}
.cta{{background:linear-gradient(135deg,rgba(124,106,245,.14),rgba(79,195,161,.08));border:1px solid rgba(124,106,245,.3);border-radius:12px;padding:18px 20px;margin:18px 0;text-align:center}}
.cta p{{margin:0 0 12px;font-weight:600}}
#copied{{display:none;font-size:13px;color:var(--accent2);margin-left:8px}}
.sponsor{{border:1px dashed var(--border);border-radius:12px;padding:14px 16px;margin:16px 0;text-align:center}}
.sponsor-tag{{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin-bottom:6px}}
.sponsor p{{margin:0 0 6px;font-size:14px}}
.sponsor a{{font-weight:600;font-size:14px}}
footer{{margin-top:40px;font-size:12px;color:var(--muted);text-align:center}}
footer a{{color:var(--muted)}}
</style></head>
<body><div class="wrap">
<header><a class="brand" href="/">◆ AGI Scorecard</a><span class="kicker">The Future Bet 🎲</span></header>
<div class="kicker">Your forecaster match</div>
<h1>{emoji} You're closest to {name}</h1>
<img class="card" src="/share/future-{slug}.png" width="1200" height="630" alt="{name} — The Future Bet result card">
<div class="case">{case}</div>
<div class="row">
  <button class="btn" onclick="challengeFriend()">🔥 Challenge a friend</button>
  <button class="btn sec" onclick="shareToX()">Share on 𝕏</button>
  <button class="btn sec" onclick="copyShare()">Copy link</button>
  <span id="copied">✓ Copied</span>
</div>
<div class="cta">
  <p>Want to know if your bets come true? We track the biggest one — the AGI-2027 Thesis Tracker is at {score}/100 and moves only when real evidence lands.</p>
  <a class="btn" href="https://agiscorecard.beehiiv.com/subscribe?utm_source=agiscorecard&amp;utm_medium=future_bet_result" target="_blank" rel="noopener" onclick="gtag('event','subscribe_click',{{location:'future_bet_result'}});">Track the future with us →</a>
</div>
{sponsor}
<div class="row">
  <a class="btn sec" href="/future-bet" onclick="gtag('event','agi_test_click',{{location:'future_bet_result'}});">🎲 Play The Future Bet yourself →</a>
  <a class="btn sec" href="/progress-index" onclick="gtag('event','index_click',{{location:'future_bet_result'}});">See the live AGI-2027 score →</a>
</div>
<footer>By the AGI Scorecard team · <a href="/about">methodology</a> · <a href="/agi-questions">all AGI questions</a> · <a href="/">agiscorecard.com</a><br>
Grades the falsifiable predictions in Aschenbrenner's <em>Situational Awareness</em>. Not affiliated with any lab.</footer>
</div>
<script>
function sUrl(){{return 'https://agiscorecard.com/future-bet/{slug}';}}
function sText(){{return 'My future bets put me closest to {emoji} {name}. Musk or skeptic — what\\u2019s your Future Bet?';}}
function challengeFriend(){{gtag('event','challenge_share',{{label:'{slug}'}});if(navigator.share){{navigator.share({{title:'The Future Bet',text:sText(),url:sUrl()}}).catch(function(){{}});}}else{{window.open('https://twitter.com/intent/tweet?text='+encodeURIComponent(sText()+' \\ud83d\\udc47')+'&url='+encodeURIComponent(sUrl()),'_blank');}}}}
function shareToX(){{gtag('event','x_share',{{label:'{slug}'}});window.open('https://twitter.com/intent/tweet?text='+encodeURIComponent(sText()+' \\ud83d\\udc47')+'&url='+encodeURIComponent(sUrl()),'_blank');}}
function copyShare(){{navigator.clipboard.writeText(sUrl()).then(function(){{var c=document.getElementById('copied');c.style.display='inline';setTimeout(function(){{c.style.display='none'}},2000)}});}}
window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments)}}
</script>
<script async src="https://www.googletagmanager.com/gtag/js?id={ga}"></script>
<script>gtag('js',new Date());gtag('config','{ga}')</script>
</body></html>"""

outdir = os.path.join(ROOT, "future-bet")
os.makedirs(outdir, exist_ok=True)
for slug, p in PERSONAS.items():
    html = PAGE.format(slug=slug, emoji=p["emoji"], name=p["name"], tl=p["tl"],
                       case=p["case"], score=SCORE, ga=GA, sponsor=SPONSOR)
    open(os.path.join(outdir, slug + ".html"), "w").write(html)
    print("wrote future-bet/" + slug + ".html")
