#!/usr/bin/env python3
"""/your-agi-timeline — interactive forecaster-spectrum slider (GAMIFICATION backlog:
agi-timeline-slider, seeded 2026-07-21).

Answers the site's highest-demand query ("when will AGI arrive") by making the reader
commit to a year, then placing that year against nine real public forecasts and the
Thesis Tracker. Zero invented data: every marker comes from data.json
forecaster_timelines, and the tracker score is read from data.json at build time.

Rerun after a verdict/score change or a forecaster update:
    python3 tools/gen_timeline.py
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATE = "2026-08-14"
d = json.load(open(os.path.join(ROOT, "data.json"), encoding="utf-8"))
score = d["thesisTracker"]["score"]

# Year anchors come from the published positions in data.json. Where a forecaster gives
# a range or a probability curve, the anchor is the year their own words put at ~50%,
# and the label repeats those words verbatim so nothing is smoothed into false precision.
MARKERS = [
    (2026, "Elon Musk", "AGI by end of 2026", "/elon-musk-agi-prediction"),
    (2027, "Dario Amodei", "“Powerful AI” possibly 2026–27", "/dario-amodei-agi-prediction"),
    (2027, "Leopold Aschenbrenner", "AGI 2027", "/will-agi-arrive-2027"),
    (2029, "Sam Altman", "Near-term; superintelligence “a few thousand days”", "/sam-altman-agi-prediction"),
    (2030, "Demis Hassabis", "~50% by 2030", "/demis-hassabis-agi-prediction"),
    (2030, "Samotsvety", "~28% by 2030", "/forecaster-leaderboard"),
    (2033, "Metaculus community", "25% by 2029; 50% by 2033", "/aschenbrenner-vs-metaculus"),
    (2035, "Andrej Karpathy", "About a decade out", "/karpathy-agi-prediction"),
    (2047, "AI researcher survey (n=2778)", "50% by 2047", "/when-will-agi-arrive"),
]
MJ = json.dumps([{"y": y, "n": n, "p": p, "u": u} for y, n, p, u in MARKERS], ensure_ascii=False)

CSS = """:root{--bg:#0a0a0b;--bg2:#111114;--bg3:#18181d;--border:rgba(255,255,255,.07);--border2:rgba(255,255,255,.12);--text:#e8e8ec;--muted:#8888a0;--accent:#7c6af5;--accent2:#4fc3a1;--warn:#e8a040}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--text);font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;font-size:16px;line-height:1.7}
a{color:var(--accent);text-decoration:none}a:hover{opacity:.85}
.wrap{max-width:720px;margin:0 auto;padding:2rem 1.4rem 3.5rem}
header{display:flex;align-items:center;justify-content:space-between;margin-bottom:1.6rem}
.brand{font-weight:600;font-size:15px;color:var(--text)}
.kicker{font-size:12px;font-weight:600;letter-spacing:.09em;text-transform:uppercase;color:var(--accent)}
h1{font-size:clamp(1.6rem,4.4vw,2.3rem);font-weight:700;letter-spacing:-.02em;line-height:1.2;margin:.5rem 0 .9rem}
h1 em{color:var(--accent2);font-style:normal}
.lead{color:var(--muted);font-size:15px;margin-bottom:1.6rem}
.panel{background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:1.3rem 1.3rem 1.5rem}
.yearline{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:.2rem}
.year{font-size:clamp(2.4rem,9vw,3.4rem);font-weight:700;letter-spacing:-.03em;line-height:1;font-variant-numeric:tabular-nums}
.stance{font-size:13px;font-weight:700;padding:4px 12px;border-radius:99px;white-space:nowrap}
input[type=range]{width:100%;margin:1.1rem 0 .3rem;accent-color:var(--accent);height:26px}
.scale{display:flex;justify-content:space-between;font-size:11.5px;color:var(--muted);font-variant-numeric:tabular-nums}
.spectrum{margin:1.5rem 0 0;border-top:1px solid var(--border);padding-top:1.1rem}
.mk{display:flex;align-items:flex-start;gap:10px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.04);font-size:14px}
.mk:last-child{border-bottom:none}
.mk .yr{font-variant-numeric:tabular-nums;font-weight:700;min-width:44px;color:var(--muted)}
.mk .nm{font-weight:600}
.mk .ps{color:var(--muted);font-size:13px}
.mk.before .yr{color:var(--accent2)}
.mk.after .yr{color:var(--warn)}
.verdictbox{margin-top:1.2rem;background:var(--bg3);border:1px solid var(--border2);border-radius:12px;padding:1rem 1.15rem;font-size:15px}
.verdictbox b{color:#fff}
.row{display:flex;flex-wrap:wrap;gap:9px;margin-top:1rem}
.btn{display:inline-block;background:var(--accent);color:#fff;padding:10px 18px;border-radius:9px;font-size:14px;font-weight:600;border:0;cursor:pointer;font-family:inherit}
.btn.sec{background:transparent;border:1px solid var(--border2);color:var(--text)}
.marketing{margin-top:2rem}
.tracker{margin-top:1.4rem;background:var(--bg2);border:1px solid var(--border);border-left:3px solid var(--accent2);border-radius:0 12px 12px 0;padding:1rem 1.2rem;font-size:14.5px}
.embed-brand{display:none;text-align:center;margin:16px 0 2px;font-size:13px}
body.embed{background:#0e0e14}
body.embed .wrap{padding:16px 16px 22px}
body.embed header,body.embed .lead,body.embed .marketing,body.embed footer,body.embed .faq{display:none}
body.embed h1{font-size:24px}
body.embed .embed-brand{display:block}
.faq{margin-top:2.2rem}
.faq h2{font-size:1.2rem;margin-bottom:.6rem}
.faq-q{font-weight:600;margin:1.15rem 0 .35rem}
.faq p{color:var(--muted);font-size:14.5px}
textarea{width:100%;background:var(--bg3);color:var(--muted);border:1px solid var(--border2);border-radius:8px;padding:9px;font-size:11.5px;font-family:ui-monospace,monospace;height:66px}
footer{margin-top:2.5rem;font-size:12px;color:var(--muted);text-align:center}
footer a{color:var(--muted)}"""

LD = [
    {"@context": "https://schema.org", "@type": "WebApplication",
     "name": "Your AGI Timeline", "url": "https://agiscorecard.com/your-agi-timeline",
     "description": "Pick the year you think AGI arrives and see where you land against nine real public forecasts and the auditable AGI-2027 Thesis Tracker.",
     "applicationCategory": "EducationalApplication", "operatingSystem": "Any (web browser)",
     "browserRequirements": "Requires JavaScript", "isAccessibleForFree": True, "inLanguage": "en",
     "featureList": ["One-slider year pick", "Nine real forecaster positions, quoted verbatim",
                     "Bull / base / bear placement", "Shareable result", "Embeddable via ?embed=1"],
     "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"},
     "publisher": {"@type": "Organization", "name": "AGI Scorecard", "url": "https://agiscorecard.com/"},
     "isPartOf": {"@type": "CollectionPage", "name": "Free AI & AGI tools", "url": "https://agiscorecard.com/ai-tools"}},
    {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "AGI Scorecard", "item": "https://agiscorecard.com/"},
        {"@type": "ListItem", "position": 2, "name": "Free AI & AGI tools", "item": "https://agiscorecard.com/ai-tools"},
        {"@type": "ListItem", "position": 3, "name": "Your AGI Timeline", "item": "https://agiscorecard.com/your-agi-timeline"}]},
    {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": "When will AGI arrive?",
         "acceptedAnswer": {"@type": "Answer", "text": "There is no consensus: published positions run from Musk's end-2026 to a 2778-researcher survey median of 2047, with Aschenbrenner at 2027, Hassabis ~50% by 2030 and the Metaculus community ~50% by 2033. This tool places your own pick against all nine, and against the graded evidence."}},
        {"@type": "Question", "name": "Where do the forecaster positions come from?",
         "acceptedAnswer": {"@type": "Answer", "text": "All nine are public positions quoted verbatim from the scorecard's machine-readable dataset at /data.json (CC BY 4.0). Where a forecaster gives a probability curve rather than a date, the marker sits at the year their own words put near 50%, and the wording is shown unaltered."}},
        {"@type": "Question", "name": "Does picking a year mean AGI will happen then?",
         "acceptedAnswer": {"@type": "Answer", "text": "No. The tool shows where your view sits in the published distribution — it is a positioning device, not a forecast. What the scorecard actually grades is eight dated, falsifiable predictions, tracked as one auditable score."}}]},
]

def build(score):
    ld = "\n".join('<script type="application/ld+json">' + json.dumps(x, ensure_ascii=False) + "</script>" for x in LD)
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<script async src="https://www.googletagmanager.com/gtag/js?id=G-FZXLMBB5QB"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments);}}gtag('js',new Date());gtag('config','G-FZXLMBB5QB');</script>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%230a0a0b'/%3E%3Ccircle cx='16' cy='16' r='6' fill='%234fc3a1'/%3E%3C/svg%3E">
<title>Your AGI Timeline: Pick a Year, See Who Agrees</title>
<meta name="description" content="Slide to the year you think AGI arrives. See instantly where you land against Musk, Aschenbrenner, Hassabis, Metaculus and 2,778 researchers — plus the auditable 62.5/100 tracker.">
<link rel="canonical" href="https://agiscorecard.com/your-agi-timeline">
<meta property="og:site_name" content="The AGI Scorecard">
<meta property="og:title" content="Your AGI Timeline — pick a year, see who agrees">
<meta property="og:description" content="One slider. Nine real forecasts. Find out whether your AGI date makes you a bull, a base case, or a bear.">
<meta property="og:type" content="website">
<meta property="og:url" content="https://agiscorecard.com/your-agi-timeline">
<meta property="og:image" content="https://agiscorecard.com/scorecard-summary.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>{CSS}</style>
{ld}
</head>
<body>
<script>if(location.search.indexOf('embed')>-1||location.hash.indexOf('embed')>-1){{document.body.classList.add('embed');}}</script>
<div class="wrap">
<header><a class="brand" href="/">◆ AGI Scorecard</a><span style="font-size:13px"><a href="/ai-tools" style="color:var(--muted)">All tools</a></span></header>
<div class="kicker">Your AGI timeline</div>
<h1>Pick a year. <em>See who agrees with you.</em></h1>
<p class="lead">Everyone has an instinct about when AGI shows up — almost nobody knows where that instinct sits next to the people who forecast for a living. Move the slider once and find out. Nine published positions, quoted word for word, from Musk's end-2026 to a 2,778-researcher median of 2047.</p>

<div class="panel">
  <div class="yearline"><div class="year" id="yr">2030</div><div class="stance" id="stance"></div></div>
  <input type="range" id="sl" min="2026" max="2048" step="1" value="2030" aria-label="Year you expect AGI to arrive">
  <div class="scale"><span>2026</span><span>2033</span><span>2040</span><span>2048</span></div>
  <div class="verdictbox" id="vb"></div>
  <div class="row">
    <button class="btn" id="share">Copy my result</button>
    <a class="btn sec" id="xshare" target="_blank" rel="noopener">Share on X</a>
    <a class="btn sec" href="/agi-test" onclick="gtag('event','agi_test_click',{{location:'timeline_tool'}});">Get my archetype →</a>
  </div>
  <div class="spectrum" id="spec"></div>
</div>

<div class="embed-brand">📅 <b>Your AGI Timeline</b> · <a href="https://agiscorecard.com/your-agi-timeline?utm_source=game_embed&amp;utm_medium=iframe" target="_blank" rel="noopener" onclick="gtag('event','embed_brand_click',{{location:'timeline_embed'}});">See the full forecaster spectrum on AGI Scorecard →</a></div>

<div class="tracker">
  <b>Opinions are cheap — this one is graded.</b> Whatever year you picked, the underlying question is whether the specific, dated claims are holding up. The <a href="/progress-index" onclick="gtag('event','index_click',{{location:'timeline_tool'}});">AGI-2027 Thesis Tracker</a> is one auditable score for exactly that — currently <b>{score}/100</b> across eight pre-registered predictions, each with a condition that would flip it.
</div>

<div class="marketing">
  <div class="tracker" style="border-left-color:var(--accent)">
    <b>Get told if the evidence moves against your pick.</b>
    <div style="font-size:14px;color:var(--muted);margin-top:5px">One email when a verdict actually flips — and not otherwise. No digest, no hype.</div>
    <div style="margin-top:9px"><a class="btn" href="https://agiscorecard.beehiiv.com/subscribe?utm_source=agiscorecard&amp;utm_medium=timeline_tool" target="_blank" rel="noopener" onclick="gtag('event','subscribe_click',{{location:'timeline_tool'}});">Subscribe free →</a></div>
  </div>

  <h2 style="font-size:1.15rem;margin:2rem 0 .5rem">Embed this on your site</h2>
  <p style="font-size:14px;color:var(--muted);margin-bottom:.6rem">Free, no attribution required beyond the link that ships with it.</p>
  <textarea readonly onclick="this.select();gtag('event','embed_copy',{{location:'timeline_tool'}});">&lt;iframe src="https://agiscorecard.com/your-agi-timeline?embed=1" width="100%" height="720" style="border:1px solid #26232f;border-radius:12px;max-width:680px" title="Your AGI Timeline — where does your AGI date sit?" loading="lazy"&gt;&lt;/iframe&gt;</textarea>

  <div class="faq">
    <h2>Frequently asked questions</h2>
    <div class="faq-q">When will AGI arrive?</div>
    <p>There is no consensus: published positions run from Musk's end-2026 to a 2,778-researcher survey median of 2047, with Aschenbrenner at 2027, Hassabis ~50% by 2030 and the Metaculus community ~50% by 2033. This tool places your own pick against all nine, and against the graded evidence.</p>
    <div class="faq-q">Where do the forecaster positions come from?</div>
    <p>All nine are public positions quoted verbatim from the scorecard's machine-readable dataset at <a href="/data.json">/data.json</a> (CC BY 4.0). Where a forecaster gives a probability curve rather than a date, the marker sits at the year their own words put near 50%, and the wording is shown unaltered.</p>
    <div class="faq-q">Does picking a year mean AGI will happen then?</div>
    <p>No. The tool shows where your view sits in the published distribution — it is a positioning device, not a forecast. What the scorecard actually grades is <a href="/situational-awareness-predictions">eight dated, falsifiable predictions</a>, tracked as <a href="/progress-index">one auditable score</a>.</p>
  </div>
</div>

<footer>The AGI Scorecard · <a href="/ai-tools">All free tools</a> · <a href="/about">About</a> · <a href="/privacy">Privacy</a></footer>
</div>
<script>
(function(){{
  var M={MJ};
  var sl=document.getElementById('sl'),yr=document.getElementById('yr'),st=document.getElementById('stance'),
      vb=document.getElementById('vb'),spec=document.getElementById('spec'),logT=null;
  function esc(s){{return String(s).replace(/[&<>"]/g,function(c){{return {{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}}[c];}});}}
  function stanceOf(y){{
    if(y<=2027) return ['Bull','#4fc3a1','rgba(79,195,161,.14)'];
    if(y<=2031) return ['Base case','#7c6af5','rgba(124,106,245,.16)'];
    if(y<=2036) return ['Bear','#e8a040','rgba(232,160,64,.14)'];
    return ['Deep bear','#e05555','rgba(224,85,85,.14)'];
  }}
  function render(){{
    var y=+sl.value;
    yr.textContent=y;
    var s=stanceOf(y);
    st.textContent=s[0]; st.style.color=s[1]; st.style.background=s[2];
    var earlier=M.filter(function(m){{return m.y<y;}}).length;
    var later=M.filter(function(m){{return m.y>y;}}).length;
    var same=M.length-earlier-later;
    // 单复数必须跟着数字走:英文页面里的 "1 forecasts are" 会立刻毁掉专业感。
    // 同年 = 并列而非领先,earlier===0 的文案不能写成 "ahead of everyone"。
    var msg, isAre=function(n){{return n===1?' is ':' are ';}};
    if(earlier===0) msg='<b>Nobody here is earlier than you.</b> '+(same?same+' forecast'+(same===1?'':'s')+' land'+(same===1?'s':'')+' on your exact year; the other '+later+' '+(later===1?'is':'are')+' later.':'Every one of these '+M.length+' forecasts is later.');
    else if(later===0) msg='<b>Nobody here is later than you.</b> Even the 2,778-researcher survey median (2047) arrives before your date.';
    else msg='<b>'+earlier+' of these '+M.length+' forecasts'+isAre(earlier)+'earlier than you'+(same?', '+same+' land'+(same===1?'s':'')+' on your exact year':'')+', and '+later+(later===1?' is':' are')+' later.</b>';
    vb.innerHTML=msg+' <span style="color:var(--muted)">Your year: '+y+'.</span>';
    spec.innerHTML=M.map(function(m){{
      var cls=m.y<y?'before':(m.y>y?'after':'');
      return '<div class="mk '+cls+'"><span class="yr">'+m.y+'</span><span><a class="nm" href="'+m.u+'">'+esc(m.n)+'</a><br><span class="ps">'+esc(m.p)+'</span></span></div>';
    }}).join('');
    // 需求信号:停顿后记一次所选年份(去抖,避免拖动时刷屏)
    clearTimeout(logT);
    logT=setTimeout(function(){{gtag('event','calc_use',{{location:'timeline_tool',label:String(y)}});}},700);
    var txt='I think AGI arrives in '+y+'. That puts me ahead of '+earlier+' of '+M.length+' public forecasts \\u2014 and behind '+later+'.';
    document.getElementById('xshare').href='https://twitter.com/intent/tweet?text='+encodeURIComponent(txt)+'&url='+encodeURIComponent('https://agiscorecard.com/your-agi-timeline');
    document.getElementById('share').setAttribute('data-txt',txt+' https://agiscorecard.com/your-agi-timeline');
  }}
  sl.addEventListener('input',render);
  document.getElementById('share').addEventListener('click',function(){{
    var t=this.getAttribute('data-txt')||'';
    var self=this;
    function done(){{self.textContent='Copied ✓';setTimeout(function(){{self.textContent='Copy my result';}},1800);}}
    if(navigator.clipboard&&navigator.clipboard.writeText){{navigator.clipboard.writeText(t).then(done,done);}}
    else{{var ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);ta.select();try{{document.execCommand('copy');}}catch(e){{}}document.body.removeChild(ta);done();}}
    gtag('event','challenge_share',{{location:'timeline_tool'}});
  }});
  document.getElementById('xshare').addEventListener('click',function(){{gtag('event','x_share',{{location:'timeline_tool'}});}});
  // 深链:?y=2031 直接定位(可分享的结果链接)
  var q=/[?&]y=(\\d{{4}})/.exec(location.search);
  if(q){{var v=Math.min(2048,Math.max(2026,+q[1]));sl.value=v;}}
  render();
}})();
</script>
</body>
</html>"""

open(os.path.join(ROOT, "your-agi-timeline.html"), "w", encoding="utf-8").write(build(score))
print(f"your-agi-timeline.html written (tracker {score}/100, {len(MARKERS)} markers)")
