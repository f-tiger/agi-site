# -*- coding: utf-8 -*-
"""Generate the Games Ledger static site from official Steam data.

Every page is a dated verdict with a pre-registered flip rule, built only from
data/concurrents.json (Valve official API, written by CI) + data/games.json
(curated metadata + per-game honesty caveat). Games without a valid sample are
excluded, never estimated. SITE_URL is the single point to change when the
owner attaches the real domain.
"""
import json, os, html, datetime, urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, "site")
SITE_URL = "https://games.agiscorecard.com"  # owner 2026-08-22: agiscorecard 子域,不买新域
SITE_NAME = "Games Ledger"
TODAY = datetime.datetime.utcnow().strftime("%Y-%m-%d")

BANDS = [
    (100000, "Emphatically alive", "No — emphatically not dead."),
    (20000, "Alive and healthy", "No — not dead."),
    (2000, "Alive, mid-size population", "No — not dead, with a mid-size population."),
    (300, "Small but active", "Not dead, but it is small."),
    (50, "Niche — expect slower matchmaking", "Mostly — a niche population remains."),
    (0, "Nearly empty on Steam", "On Steam, effectively yes."),
]


def band_of(n):
    for floor, label, verdict in BANDS:
        if n >= floor:
            return label, verdict
    return BANDS[-1][1], BANDS[-1][2]


STYLE = """*{box-sizing:border-box;margin:0;padding:0}
body{background:#0b0c0e;color:#e8e9ec;font-family:Inter,-apple-system,'Segoe UI',sans-serif;font-size:16px;line-height:1.7}
a{color:#6ea8fe;text-decoration:none}a:hover{opacity:.85}
header{border-bottom:1px solid rgba(255,255,255,.08);padding:14px 20px;display:flex;gap:10px;align-items:center}
.dot{width:9px;height:9px;border-radius:50%;background:#41d18f}
main{max-width:760px;margin:0 auto;padding:2.2rem 1.2rem 4rem}
h1{font-size:clamp(1.5rem,4vw,2.1rem);line-height:1.2;margin-bottom:1rem}
h2{font-size:1.15rem;margin:2rem 0 .8rem}
p{margin-bottom:.9rem}
.capsule{background:#121418;border:1px solid rgba(255,255,255,.09);border-left:3px solid #41d18f;border-radius:0 10px 10px 0;padding:1rem 1.2rem;margin-bottom:1.4rem}
.big{font-size:34px;font-weight:800;font-variant-numeric:tabular-nums}
.muted{color:#9aa1ad;font-size:13px}
table{width:100%;border-collapse:collapse;font-size:14px;background:#121418;border:1px solid rgba(255,255,255,.08);border-radius:10px;overflow:hidden;margin:1rem 0}
th,td{text-align:left;padding:9px 11px;border-bottom:1px solid rgba(255,255,255,.07)}
th{color:#9aa1ad;font-size:11px;text-transform:uppercase;letter-spacing:.05em}
tr:last-child td{border-bottom:none}
.num{font-variant-numeric:tabular-nums;text-align:right}
.faq-q{font-weight:600;margin:1.1rem 0 .3rem}
footer{border-top:1px solid rgba(255,255,255,.08);color:#9aa1ad;font-size:12px;text-align:center;padding:22px}
.warn{background:rgba(232,160,64,.08);border:1px solid rgba(232,160,64,.35);border-radius:10px;padding:.8rem 1rem;margin:1rem 0;font-size:14px}
@media(max-width:640px){table{display:block;overflow-x:auto;white-space:nowrap}}"""


def head(title, desc, path, ld):
    return f"""<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{html.escape(title)}</title>
<meta name="description" content="{html.escape(desc)}">
<link rel="canonical" href="{SITE_URL}{path}">
<meta property="og:site_name" content="{SITE_NAME}"><meta property="og:title" content="{html.escape(title)}">
<meta property="og:description" content="{html.escape(desc)}"><meta property="og:type" content="article">
<meta property="og:url" content="{SITE_URL}{path}">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%230b0c0e'/%3E%3Ccircle cx='16' cy='16' r='6' fill='%2341d18f'/%3E%3C/svg%3E">
<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>
<style>{STYLE}</style></head><body>
<header><span class="dot"></span><a href="/" style="color:#e8e9ec;font-weight:600">{SITE_NAME}</a>
<span class="muted">· official numbers or no numbers</span></header><main>"""

FOOT = f"""</main><footer>{SITE_NAME} · Every count is Valve's official API or it is not published here ·
<a href="/methodology">Methodology</a> · Not affiliated with Valve or any studio</footer></body></html>"""


def stats(hist):
    ns = [h["n"] for h in hist]
    last = hist[-1]
    n7 = ns[-7:]
    return {"now": last["n"], "t": last.get("t", last["d"]), "d7_avg": round(sum(n7) / len(n7)),
            "d7_min": min(n7), "d7_max": max(n7), "days": len(ns)}


def game_page(g, rec):
    s = stats(rec["history"])
    label, verdict = band_of(s["d7_avg"])
    name, slug = g["name"], g["slug"]
    title = f"Is {name} Dead? Official Steam Numbers ({TODAY[:4]})"
    desc = (f"{verdict} {name} averaged {s['d7_avg']:,} concurrent Steam players over the last "
            f"{min(s['days'],7)} sample day(s) (Valve official API). Graded verdict with flip rule.")[:155]
    faq = [
        (f"Is {name} dead?",
         f"{verdict} Over the last {min(s['days'],7)} sampled day(s), {name} averaged {s['d7_avg']:,} concurrent players "
         f"in-game on Steam (latest sample: {s['now']:,} at {s['t']} UTC), measured by Valve's official API. "
         f"Verdict band: {label}. {g['caveat']}"),
        (f"How many people play {name} right now?",
         f"The latest official sample is {s['now']:,} concurrent Steam players ({s['t']} UTC). This page re-samples daily "
         f"and never publishes estimates: if Valve's API returns no number, this page says so instead."),
        ("Why do other sites show different player counts?",
         "Most 'player count' sites publish unlabeled estimates or invented monthly-active figures with no source. "
         "This ledger uses one source only — Valve's public GetNumberOfCurrentPlayers API — and states platform "
         "coverage limits explicitly instead of guessing."),
    ]
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "Article", "headline": f"Is {name} dead? Official Steam numbers", "datePublished": "2026-08-22",
         "dateModified": TODAY, "author": {"@type": "Organization", "name": SITE_NAME},
         "publisher": {"@type": "Organization", "name": SITE_NAME, "url": SITE_URL + "/"}, "description": desc},
        {"@type": "FAQPage", "mainEntity": [
            {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faq]},
    ]}
    share_x = ("https://twitter.com/intent/tweet?text=" + urllib.parse.quote(
        f"Is {name} dead? Official Steam number today: {s['now']:,} in-game. {SITE_URL}/is-{slug}-dead"))
    rows = "".join(f"<tr><td>{h['d']}</td><td class='num'>{h['n']:,}</td></tr>" for h in rec["history"][-14:][::-1])
    faq_html = "".join(f"<div class='faq-q'>{html.escape(q)}</div><p>{html.escape(a)}</p>" for q, a in faq)
    return head(title, desc, f"/is-{slug}-dead", ld) + f"""
<h1>Is {name} dead?</h1>
<div class="muted" style="margin-bottom:1rem">Updated {TODAY} · re-sampled daily · verdict flips only when the 7-day average crosses a published band</div>
<div class="capsule"><strong>{verdict}</strong><br>
<span class="big">{s['now']:,}</span> <span class="muted">players in-game on Steam · official Valve API · {s['t']} UTC</span><br>
<span class="muted">7-day sampled average {s['d7_avg']:,} (range {s['d7_min']:,}–{s['d7_max']:,}) · band: <strong>{label}</strong></span></div>
<div class="warn"><strong>What this number does not cover:</strong> {html.escape(g['caveat'])}</div>
<p style="margin:.2rem 0 1rem"><a href="{share_x}" rel="noopener" target="_blank" style="font-size:13px;border:1px solid rgba(255,255,255,.2);border-radius:8px;padding:6px 12px;">Share the number →</a>
<a href="/dead-or-alive" style="font-size:13px;border:1px solid rgba(255,255,255,.2);border-radius:8px;padding:6px 12px;margin-left:6px;">🎮 Play: guess 10 games dead-or-alive →</a></p>
<h2>Recent official samples</h2>
<table><thead><tr><th>Date (UTC)</th><th class="num">Concurrent players</th></tr></thead><tbody>{rows}</tbody></table>
<p class="muted">Source: Valve, ISteamUserStats/GetNumberOfCurrentPlayers (public API), sampled once daily by this site's
pipeline. History depth grows daily; {s['days']} sample day(s) on record so far. No estimates, no third-party numbers.</p>
<h2>The verdict rule (pre-registered)</h2>
<p>The verdict re-grades automatically when the 7-day average crosses a band boundary:
≥100k emphatic · ≥20k healthy · ≥2k mid-size · ≥300 small-but-active · ≥50 niche · &lt;50 nearly empty (Steam).
{html.escape(g['genre'].capitalize())}, released {g['released']}. A verdict change shows up here the day it happens — no
editorial discretion involved.</p>
<h2>Frequently asked questions</h2>{faq_html}
<h2>Embed the live number</h2>
<p class="muted">A live badge for your forum, Discord, wiki or README — updates every 10 minutes, always Valve's official number:</p>
<div style="margin:.4rem 0"><img src="/badge/{g['appid']}.svg" alt="{html.escape(name)} live player badge"></div>
<pre style="background:#121418;border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:10px;font-size:12px;overflow-x:auto">&lt;a href="{SITE_URL}/is-{slug}-dead?utm_source=badge"&gt;&lt;img src="{SITE_URL}/badge/{g['appid']}.svg" alt="{html.escape(name)} players right now"&gt;&lt;/a&gt;</pre>
<pre style="background:#121418;border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:10px;font-size:12px;overflow-x:auto">[![{html.escape(name)} players right now]({SITE_URL}/badge/{g['appid']}.svg)]({SITE_URL}/is-{slug}-dead?utm_source=badge)</pre>
<h2>More verdicts</h2><p><a href="/">All games on the ledger →</a></p>""" + FOOT


def index_page(entries, trends=None):
    tr = trends or {"hits": [], "discovered": []}
    tr_games = ([(h["appid"], h["name"]) for h in tr.get("hits", [])]
                + [(d["appid"], d["name"]) for d in tr.get("discovered", [])])[:6]
    trending_strip = ""
    if tr_games:
        btns = "".join(f'<button onclick="window._pick&&window._pick({a})" style="margin:3px 6px 0 0;background:#1a1d22;border:1px solid #41d18f;border-radius:8px;padding:6px 12px;color:#e8e9ec;cursor:pointer;font-size:13px">🔥 {html.escape(n)}</button>' for a, n in tr_games)
        trending_strip = (f'<div class="capsule" style="border-left-color:#e8a040"><strong>Trending in search today</strong> '
                          f'<span class="muted">(Google Trends US, matched to real Steam games — tap for the live number)</span><br>{btns}</div>')
    rows = "".join(
        f"<tr><td><a href='/is-{e['slug']}-dead'><b>{html.escape(e['name'])}</b></a></td>"
        f"<td class='num'>{e['now']:,}</td><td class='num'>{e['d7_avg']:,}</td><td>{html.escape(e['label'])}</td></tr>"
        for e in sorted(entries, key=lambda x: -x["d7_avg"]))
    desc = f"Live 'is it dead?' verdicts for {len(entries)} games from Valve's official concurrent-player API. No estimates — official numbers or no numbers."
    ld = {"@context": "https://schema.org", "@type": "Dataset", "name": "Games Ledger — official Steam concurrent players",
          "description": desc, "url": SITE_URL + "/", "license": "https://creativecommons.org/licenses/by/4.0/",
          "creator": {"@type": "Organization", "name": SITE_NAME}, "dateModified": TODAY}
    return head(f"Is It Dead? Official Steam Player Verdicts — {SITE_NAME}", desc, "/", ld) + f"""
<h1>Is it dead? Official numbers or no numbers.</h1>
<p>Most player-count sites publish invented estimates. This ledger publishes one thing: <strong>Valve's official
concurrent-player API</strong>, sampled daily, with a graded verdict and a pre-registered flip rule per game — and an
explicit note on what each number does <em>not</em> cover (consoles, other launchers).</p>
{trending_strip}<h2 style="margin-top:0">Check any game — live</h2>
<div class="capsule">
<input id="q" placeholder="Type a game name… (top-100 most played + tracked games)" style="width:100%;background:#0b0c0e;border:1px solid rgba(255,255,255,.2);border-radius:8px;padding:10px 12px;color:#e8e9ec;font-size:15px" autocomplete="off">
<div id="hits" style="margin-top:6px"></div><div id="live" style="margin-top:10px"></div>
</div>
<script>
(function(){{
var POOL=[];fetch('/pool.json').then(r=>r.json()).then(p=>{{POOL=p;var m=/[?&]app=(\d+)/.exec(location.search);if(m)pick(+m[1]);}});
function band(n){{return n>=100000?'Emphatically alive':n>=20000?'Alive and healthy':n>=2000?'Alive, mid-size':n>=300?'Small but active':n>=50?'Niche':'Nearly empty on Steam';}}
var q=document.getElementById('q'),hits=document.getElementById('hits'),live=document.getElementById('live');
q.addEventListener('input',function(){{var v=q.value.trim().toLowerCase();hits.innerHTML='';if(v.length<2)return;
POOL.filter(g=>g.n.toLowerCase().includes(v)).slice(0,6).forEach(function(g){{var b=document.createElement('button');b.textContent=g.n;b.style.cssText='margin:3px 4px 0 0;background:#1a1d22;border:1px solid rgba(255,255,255,.15);border-radius:7px;padding:5px 10px;color:#e8e9ec;cursor:pointer;font-size:13px';b.onclick=function(){{pick(g.a,g.n);}};hits.appendChild(b);}});}});
window._pick=pick;function pick(a,nm){{live.innerHTML='<span class="muted">checking Valve\u2019s official API\u2026</span>';
fetch('/api/live?app='+a).then(r=>r.json()).then(function(d){{
if(!d.ok){{live.innerHTML='<span class="muted">Valve publishes no number for this app.</span>';return;}}
var g=POOL.find(x=>x.a===a);var name=nm||(g&&g.n)||('app '+a);
history.replaceState(null,'','?app='+a);
live.innerHTML='<div style="font-size:30px;font-weight:800">'+d.n.toLocaleString()+'</div>'
+'<div class="muted">'+name+' \u00b7 in-game on Steam right now \u00b7 official Valve API \u00b7 '+d.t+'</div>'
+'<div style="margin-top:4px"><strong>'+band(d.n)+'</strong></div>'
+'<div style="margin-top:8px"><a target="_blank" rel="noopener" style="font-size:13px;border:1px solid rgba(255,255,255,.2);border-radius:8px;padding:5px 10px" href="https://twitter.com/intent/tweet?text='+encodeURIComponent(name+' right now on Steam: '+d.n.toLocaleString()+' in-game (official). '+location.origin+'/?app='+a)+'">Share \u2192</a>'
+' <button onclick="navigator.clipboard.writeText(location.origin+\'/?app='+a+'\');this.textContent=\'copied\'" style="font-size:13px;background:none;border:1px solid rgba(255,255,255,.2);border-radius:8px;padding:5px 10px;color:#e8e9ec;cursor:pointer">Copy link</button></div>';}})
.catch(function(){{live.innerHTML='<span class="muted">API unreachable, try again.</span>';}});}}
}})();
</script>
<div class="capsule">Updated <strong>{TODAY}</strong> · {len(entries)} games tracked · <a href="/dead-or-alive">🎮 dead-or-alive quiz</a> · <a href="/methodology">methodology & bands</a> · raw data: <a href="/concurrents.json">concurrents.json</a> (CC BY 4.0)</div>
<table><thead><tr><th>Game</th><th class="num">Now</th><th class="num">7-day avg</th><th>Verdict band</th></tr></thead><tbody>{rows}</tbody></table>
<p class="muted">"Now" = latest daily sample, not a live socket. Console/other-launcher populations are explicitly out of
scope per game — see each page's coverage note.</p>""" + FOOT


def methodology_page():
    desc = "One source (Valve's official API), one sample cadence, published verdict bands, and an exclusion rule instead of estimates."
    ld = {"@context": "https://schema.org", "@type": "Article", "headline": "Games Ledger methodology",
          "dateModified": TODAY, "description": desc,
          "publisher": {"@type": "Organization", "name": SITE_NAME, "url": SITE_URL + "/"}}
    bands = "".join(f"<tr><td class='num'>≥{floor:,}</td><td>{label}</td></tr>" for floor, label, _ in BANDS[:-1]) \
        + f"<tr><td class='num'>&lt;50</td><td>{BANDS[-1][1]}</td></tr>"
    return head("Methodology — official numbers or no numbers", desc, "/methodology", ld) + f"""
<h1>Methodology</h1>
<p><strong>One source.</strong> Every number is Valve's public <code>GetNumberOfCurrentPlayers</code> endpoint, sampled
once daily by an auditable pipeline (open repo). If the API returns an error for a game, that game's page is excluded
that day — we never interpolate, estimate, or copy third-party figures.</p>
<p><strong>Concurrent ≠ monthly.</strong> We publish concurrent in-game players — the only number Valve makes public.
Sites quoting "monthly active users" for Steam games without a publisher source are guessing; that is the supply this
ledger exists to displace.</p>
<p><strong>Coverage limits are stated, not hidden.</strong> Steam numbers exclude consoles and other PC launchers.
Every game page carries an explicit note on what its number does not cover.</p>
<h2>Verdict bands (7-day sampled average)</h2>
<table><thead><tr><th class="num">Average</th><th>Band</th></tr></thead><tbody>{bands}</tbody></table>
<p>Bands are fixed and public; verdicts re-grade automatically when the average crosses a boundary. Disagreements with
the banding are arguments about the rule — which is exactly where such arguments belong.</p>
<p class="muted">Data: <a href="/concurrents.json">concurrents.json</a>, CC BY 4.0 with attribution to {SITE_NAME}.</p>""" + FOOT



def tracker_page(ai):
    latest = ai["samples"][-1]
    hist_rows = "".join(
        f"<tr><td>{x['d']}</td><td class='num'>{x['disclosed']}/{x['classified']}</td>"
        f"<td class='num'>{x['share_pct']}%</td></tr>" for x in ai["samples"][::-1][:26])
    names = ", ".join(html.escape(n) for n in latest.get("disclosed_names", [])[:12]) or "—"
    title = "What % of New Steam Games Disclose AI? Live Tracker"
    desc = (f"Own weekly sample ({latest['d']}): {latest['share_pct']}% of the {latest['classified']} newest Steam releases "
            f"carry a generative-AI content disclosure. Published studies: 10.9% (2024) → 19.9% (2025) → 30.8% (2026).")[:155]
    faq = [
        ("What percentage of new Steam games disclose generative AI?",
         f"In this site's own sample of {latest['classified']} of the newest Steam releases on {latest['d']}, "
         f"{latest['disclosed']} ({latest['share_pct']}%) carried Valve's AI Generated Content Disclosure. "
         "Across full years, published studies report 10.9% of 2024 releases, 19.9% of 2025, and 30.8% of 2026 releases "
         "to date (Sulka Haro, 'Three years of AI on Steam', 2026; Engadget reported ~20% of June 2026 Next Fest demos)."),
        ("Where does this data come from?",
         "Two layers, kept separate: our own weekly sample reads Valve's storefront directly (newest releases, "
         "store-page disclosure section; unclassifiable pages are excluded, never guessed), and the yearly trajectory "
         "cites published third-party studies with dates. The raw sample data is public at /ai-disclosures.json."),
        ("Does disclosing AI content hurt a game's sales?",
         "Unknown from this tracker. A July 2026 Cinevva study ('1 in 3 new games discloses AI, revenue tells a harder "
         "story') examined revenue correlations; this page tracks the disclosure share only and does not infer causation."),
    ]
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "Dataset", "name": "Steam generative-AI disclosure share — weekly samples",
         "description": desc, "url": SITE_URL + "/steam-ai-disclosure-tracker",
         "license": "https://creativecommons.org/licenses/by/4.0/", "dateModified": TODAY,
         "creator": {"@type": "Organization", "name": SITE_NAME}},
        {"@type": "FAQPage", "mainEntity": [
            {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faq]},
    ]}
    faq_html = "".join(f"<div class='faq-q'>{html.escape(q)}</div><p>{html.escape(a)}</p>" for q, a in faq)
    return head(title, desc, "/steam-ai-disclosure-tracker", ld) + f"""
<h1>What share of new Steam games discloses generative AI?</h1>
<div class="muted" style="margin-bottom:1rem">Updated {latest['d']} · own weekly storefront sample + published yearly studies, kept separate</div>
<div class="capsule"><span class="big">{latest['share_pct']}%</span>
<span class="muted">of the {latest['classified']} newest Steam releases sampled on {latest['d']} carry Valve's AI Generated Content Disclosure
({latest['disclosed']} games; {latest['unknown_excluded']} unclassifiable pages excluded, not guessed)</span></div>
<h2>The trajectory (published studies, dated)</h2>
<table><thead><tr><th>Release year</th><th class="num">Share with AI disclosure</th><th>Source</th></tr></thead><tbody>
<tr><td>2024</td><td class="num">10.9%</td><td rowspan="3"><a href="https://fragwyz.substack.com/p/three-years-of-ai-on-steam" rel="noopener">Sulka Haro, "Three years of AI on Steam" (2026)</a>; corroborated by <a href="https://www.engadget.com/2195840/around-a-fifth-of-steam-next-fest-demos-have-a-generative-ai-disclosure/" rel="noopener">Engadget</a> (~20% of June 2026 Next Fest demos)</td></tr>
<tr><td>2025</td><td class="num">19.9%</td></tr>
<tr><td>2026 (to date)</td><td class="num">30.8%</td></tr>
</tbody></table>
<h2>Our own weekly samples</h2>
<table><thead><tr><th>Sample date</th><th class="num">Disclosed / classified</th><th class="num">Share</th></tr></thead><tbody>{hist_rows}</tbody></table>
<p class="muted">Method: newest storefront releases (games only, DLC excluded), store-page disclosure section detected
directly; sample size ≈{latest['classified']}/week, so single-week numbers are noisy — the trend is the signal. Raw data:
<a href="/ai-disclosures.json">/ai-disclosures.json</a> (CC BY 4.0).</p>
<h2>Recently sampled games that disclose AI</h2>
<p class="muted">{names}</p>
<h2>Frequently asked questions</h2>{faq_html}
<h2>More from the ledger</h2><p><a href="/">Is-it-dead verdicts, official numbers only →</a></p>""" + FOOT


def quiz_page():
    desc = "Guess which Steam games still pull a crowd — 10 rounds against real, official Valve numbers sampled today. Share your score."
    ld = {"@context": "https://schema.org", "@type": "WebApplication", "name": "Dead or Alive — the Steam reality check",
          "url": SITE_URL + "/dead-or-alive", "applicationCategory": "GameApplication",
          "isAccessibleForFree": True, "offers": {"@type": "Offer", "price": "0"},
          "featureList": "10-round guessing game against official Valve concurrent-player numbers, shareable score",
          "description": desc}
    return head("Dead or Alive? The Steam Reality-Check Quiz", desc, "/dead-or-alive", ld) + """
<h1>Dead or alive? Call it, then see the real number.</h1>
<p class="muted" style="margin-bottom:1rem">10 games. For each: is it pulling <strong>&ge;2,000</strong> concurrent players on Steam right now?
Answers are Valve's official numbers sampled today — no estimates, no vibes.</p>
<div class="capsule" id="game"><button id="start" style="background:#41d18f;color:#0b0c0e;font-weight:700;border:none;border-radius:9px;padding:10px 18px;font-size:15px;cursor:pointer">Start →</button></div>
<p class="muted">Numbers are the day's sample from Valve's public API (chart games: official Most Played chart). The 2,000 line matches this site's published verdict bands. <a href="/methodology">Methodology</a>.</p>
<script>
(function(){
var P=[],i=0,score=0,cur=null,order=[];
fetch('/quiz-pool.json').then(r=>r.json()).then(function(d){P=d.items;});
var box=document.getElementById('game');
document.getElementById('start').onclick=go;
function shuffle(a){for(var j=a.length-1;j>0;j--){var k=Math.floor(Math.random()*(j+1));var t=a[j];a[j]=a[k];a[k]=t;}return a;}
function go(){var hi=shuffle(P.filter(g=>g.n>=2000)).slice(0,5),lo=shuffle(P.filter(g=>g.n<2000)).slice(0,5);order=shuffle(hi.concat(lo));i=0;score=0;next();}
function next(){if(i>=order.length){return fin();}cur=order[i];
box.innerHTML='<div class="muted">Round '+(i+1)+'/'+order.length+' · score '+score+'</div>'
+'<div style="font-size:22px;font-weight:700;margin:6px 0 10px">'+cur.name+'</div>'
+'<button onclick="window._ans(true)" style="background:#41d18f;color:#0b0c0e;font-weight:700;border:none;border-radius:9px;padding:9px 14px;margin-right:8px;cursor:pointer">Alive (&ge;2k in-game)</button>'
+'<button onclick="window._ans(false)" style="background:#1a1d22;color:#e8e9ec;border:1px solid rgba(255,255,255,.25);border-radius:9px;padding:9px 14px;cursor:pointer">Quiet (&lt;2k)</button>';}
window._ans=function(g){var truth=cur.n>=2000;var ok=(g===truth);if(ok)score++;
box.innerHTML='<div style="font-size:16px;font-weight:700;margin-bottom:4px">'+(ok?'✅ Called it.':'❌ Nope.')+'</div>'
+'<div><strong>'+cur.name+'</strong>: <span style="font-size:24px;font-weight:800">'+cur.n.toLocaleString()+'</span> <span class="muted">in-game · sampled '+cur.d+' · official Valve number</span></div>'
+'<button onclick="window._nx()" style="margin-top:10px;background:#41d18f;color:#0b0c0e;font-weight:700;border:none;border-radius:9px;padding:9px 16px;cursor:pointer">Next →</button>';i++;};
window._nx=next;
function fin(){var txt='I scored '+score+'/'+order.length+' guessing which Steam games are still alive — against real Valve numbers. Try it: '+location.origin+'/dead-or-alive';
box.innerHTML='<div style="font-size:26px;font-weight:800">'+score+'/'+order.length+'</div>'
+'<div class="muted" style="margin:4px 0 10px">'+(score>=8?'You know the graveyard.':score>=5?'Respectable read of the charts.':'The charts are weirder than they look.')+'</div>'
+'<a target="_blank" rel="noopener" style="border:1px solid rgba(255,255,255,.25);border-radius:9px;padding:8px 13px;font-size:14px" href="https://twitter.com/intent/tweet?text='+encodeURIComponent(txt)+'">Share score →</a> '
+'<button onclick="navigator.clipboard.writeText(window._txt);this.textContent=\\'copied\\'" style="border:1px solid rgba(255,255,255,.25);border-radius:9px;padding:8px 13px;font-size:14px;background:none;color:#e8e9ec;cursor:pointer">Copy</button> '
+'<button onclick="window._go()" style="border:none;border-radius:9px;padding:8px 13px;font-size:14px;background:#41d18f;color:#0b0c0e;font-weight:700;cursor:pointer">Play again</button>';
window._txt=txt;window._go=go;}
})();
</script>""" + FOOT


def main():
    games = json.load(open(os.path.join(ROOT, "data", "games.json"), encoding="utf-8"))["games"]
    store = json.load(open(os.path.join(ROOT, "data", "concurrents.json"), encoding="utf-8"))
    os.makedirs(SITE, exist_ok=True)
    entries = []
    skipped = []
    for g in games:
        rec = store["samples"].get(str(g["appid"]))
        if not rec or not rec.get("history"):
            skipped.append(g["slug"])
            continue
        s = stats(rec["history"])
        label, _ = band_of(s["d7_avg"])
        entries.append({**g, **s, "label": label})
        open(os.path.join(SITE, f"is-{g['slug']}-dead.html"), "w", encoding="utf-8").write(game_page(g, rec))
    tr_path = os.path.join(ROOT, "data", "trends-games.json")
    trends = json.load(open(tr_path, encoding="utf-8")) if os.path.exists(tr_path) else {"hits": [], "watch": []}
    ai_path = os.path.join(ROOT, "data", "ai-disclosures.json")
    ai = json.load(open(ai_path, encoding="utf-8")) if os.path.exists(ai_path) else None
    has_tracker = bool(ai and ai.get("samples"))
    if has_tracker:
        open(os.path.join(SITE, "steam-ai-disclosure-tracker.html"), "w", encoding="utf-8").write(tracker_page(ai))
        json.dump(ai, open(os.path.join(SITE, "ai-disclosures.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    open(os.path.join(SITE, "index.html"), "w", encoding="utf-8").write(
        index_page(entries, trends).replace('<a href="/methodology">methodology & bands</a>',
            ('<a href="/steam-ai-disclosure-tracker">AI-disclosure tracker</a> · ' if has_tracker else '')
            + '<a href="/methodology">methodology & bands</a>'))
    open(os.path.join(SITE, "methodology.html"), "w", encoding="utf-8").write(methodology_page())
    open(os.path.join(SITE, "dead-or-alive.html"), "w", encoding="utf-8").write(quiz_page())
    # 搜索池 + 小游戏池:top100 官方榜 + 策展台账,按 appid 去重
    top_path = os.path.join(ROOT, "data", "top100.json")
    top = json.load(open(top_path, encoding="utf-8")) if os.path.exists(top_path) else {"d": TODAY, "games": []}
    pool, seen, quiz_items = [], set(), []
    for t in top["games"]:
        if t["appid"] in seen: continue
        seen.add(t["appid"]); pool.append({"a": t["appid"], "n": t["name"]})
        quiz_items.append({"name": t["name"], "n": t["n"], "d": top.get("d", TODAY)})
    for e in entries:
        if e["appid"] in seen: continue
        seen.add(e["appid"]); pool.append({"a": e["appid"], "n": e["name"]})
        quiz_items.append({"name": e["name"], "n": e["d7_avg"], "d": TODAY})
    for w in trends.get("watch", []):
        if w["appid"] in seen: continue
        seen.add(w["appid"]); pool.append({"a": w["appid"], "n": w["name"]})
    json.dump(pool, open(os.path.join(SITE, "pool.json"), "w", encoding="utf-8"), ensure_ascii=False)
    json.dump({"d": TODAY, "items": quiz_items}, open(os.path.join(SITE, "quiz-pool.json"), "w", encoding="utf-8"), ensure_ascii=False)
    # machine-readable surfaces
    json.dump(store, open(os.path.join(SITE, "concurrents.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    urls = ["/", "/methodology", "/dead-or-alive"] + (["/steam-ai-disclosure-tracker"] if has_tracker else []) + [f"/is-{e['slug']}-dead" for e in entries]
    open(os.path.join(SITE, "sitemap.xml"), "w", encoding="utf-8").write(
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "".join(f"  <url><loc>{SITE_URL}{u}</loc><lastmod>{TODAY}</lastmod></url>\n" for u in urls) + "</urlset>\n")
    # IndexNow key 文件(公开验证文件,自动收录机器的一部分)
    import shutil, glob as _g
    for kf in _g.glob(os.path.join(ROOT, "static", "*.txt")):
        shutil.copy(kf, SITE)
    open(os.path.join(SITE, "robots.txt"), "w", encoding="utf-8").write(
        f"User-agent: *\nAllow: /\nSitemap: {SITE_URL}/sitemap.xml\n")
    open(os.path.join(SITE, "llms.txt"), "w", encoding="utf-8").write(
        f"# {SITE_NAME}\n\n> Dated 'is this game dead?' verdicts from Valve's official concurrent-player API — "
        "one source, daily samples, published verdict bands, explicit platform-coverage notes, no estimates ever. "
        "Raw dataset at /concurrents.json (CC BY 4.0).\n\n"
        + "".join(f"- [{e['name']}]({SITE_URL}/is-{e['slug']}-dead): {e['d7_avg']:,} avg concurrent (7d, Steam official), band: {e['label']}\n" for e in sorted(entries, key=lambda x: -x['d7_avg'])))
    print(f"built {len(entries)} game pages (+index/methodology), skipped (no valid data): {skipped or 'none'}")


if __name__ == "__main__":
    main()
