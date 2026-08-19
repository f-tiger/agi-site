# -*- coding: utf-8 -*-
"""Generate /invest/<slug> investor profile pages for the Invest section.

Data is migrated verbatim from the merged aistock dataset, which sources every
position from public SEC 13F filings and named reporting — each page carries its
`asOf` date and links its primary sources. Nothing here is estimated or invented:
if a number is not in a filing or a cited article, it is not on the page.
"""
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GA = "G-FZXLMBB5QB"
SCORE = "62.5"

PROFILES = [
  {
    "slug": "warren-buffett",
    "name": "Warren Buffett",
    "firm": "Berkshire Hathaway",
    "stance": "Cautious", "stance_class": "cautious",
    "style": "Value investing / moats",
    "horizon": "Very long-term (decades)",
    "asof": "2026-03-31 (Q1 2026 13F)",
    "title": "Warren Buffett's AI Stocks: The Q1 2026 Great Pivot",
    "desc": "Berkshire exited Amazon entirely and raised Alphabet 225% while leaving Apple untouched — how Buffett's AI exposure actually moved, per the Q1 2026 13F.",
    "capsule": "Berkshire's Q1 2026 filing was a pivot, not a dabble: <strong>Amazon fully exited</strong>, <strong>Alphabet up 225%</strong>, <strong>Apple untouched</strong> at roughly 22% and still the largest holding. The AI exposure moved from e-commerce and cloud toward search plus full-stack AI.",
    "thesis": [
      "Q1 2026 brought the pivot: Berkshire exited Amazon entirely and boosted Alphabet by 225%, while leaving Apple untouched — shifting its AI exposure from e-commerce and cloud toward search and full-stack AI.",
      "Buffett — and Abel's team taking the reins — still buys compounding businesses inside the circle of competence. But Q1 cut the book from 40 names to 26 with 15 full exits, sharply concentrating the portfolio.",
      "The 225% Alphabet increase is Berkshire's clearest AI statement: search cash flow, Gemini, and in-house TPUs — full-stack AI still valued below the pure-play AI names.",
    ],
    "holdings": [
      ("AAPL", "Apple", "hold", "#1 holding (~22%), unchanged this quarter"),
      ("GOOGL", "Alphabet", "add", "Added 225% — the clearest AI bet"),
      ("AMZN", "Amazon", "exit", "Fully exited"),
    ],
    "sources": [
      ("Seeking Alpha — Tracking Berkshire Hathaway portfolio, Q1 2026 update", "https://seekingalpha.com/article/4905557-tracking-berkshire-hathaway-portfolio-q1-2026-update"),
      ("MarketMinute — Berkshire bets on Alphabet's AI future", "https://markets.financialcontent.com/wral/article/marketminute-2026-1-1-the-great-pivot-berkshire-hathaway-slashes-apple-stake-to-bet-on-alphabets-ai-future"),
      ("Forbes — Berkshire portfolio shifts as Abel reshapes the playbook", "https://www.forbes.com/sites/bill_stone/2026/05/16/berkshire-portfolio-shifts-as-abel-reshapes-buffetts-playbook/"),
    ],
    "faqs": [
      ("Does Warren Buffett own AI stocks?",
       "Yes, but through businesses rather than pure-play AI names. As of the Q1 2026 13F, Berkshire's AI-adjacent exposure runs through Apple (~22%, the largest holding, unchanged that quarter) and Alphabet, which was increased 225%. Amazon was fully exited."),
      ("Why did Berkshire buy more Alphabet?",
       "The 225% increase is Berkshire's clearest AI statement to date: Alphabet pairs search cash flow with Gemini and in-house TPUs — a full-stack AI position still valued below pure-play AI names, which fits the circle-of-competence and valuation discipline Berkshire has always applied."),
      ("Is Buffett bullish or bearish on AI?",
       "Neither, on the evidence. The Q1 2026 book concentrated from 40 names to 26 with 15 full exits — the discipline is valuation and certainty, not narrative. Berkshire bought the AI business it could value and exited the one it could not justify."),
    ],
  },
  {
    "slug": "cathie-wood",
    "name": "Cathie Wood",
    "firm": "ARK Invest",
    "stance": "Bull", "stance_class": "bull",
    "style": "Disruptive innovation / high growth",
    "horizon": "Long-term (5+ year themes)",
    "asof": "2026-03-31 (Q1 2026 13F)",
    "title": "Cathie Wood's AI Portfolio: What ARK Bought in Q1 2026",
    "desc": "ARK's Q1 2026 13F: ~$12.9B across 181 positions, Tesla still #1 and AMD now #2. What Cathie Wood added — CoreWeave, Tempus, Amazon — and the nuclear angle on AI power.",
    "capsule": "One of the most aggressive AI bulls on the board. The Q1 2026 filing shows <strong>~$12.9B across 181 positions</strong>, anchored by <strong>Tesla (8.2%)</strong> with <strong>AMD now #2 (4.3%)</strong> — and the additions cluster around AI infrastructure, next-gen compute, and the power to run it.",
    "thesis": [
      "One of the most aggressive AI bulls: the bets run to AI infrastructure and next-generation compute — CoreWeave, Cerebras — and to nuclear (X-Energy) as AI's energy base layer.",
      "Wood treats AI as a cross-industry general-purpose technology driving a productivity boom, which is why the positions favour the earliest, highest-beta layers rather than the incumbents.",
      "Q1 2026 13F: roughly $12.9B across 181 positions, anchored by Tesla at 8.2% with AMD now second at 4.3%. AMD, Tempus, Amazon, Alphabet and CoreWeave were all added, with 17 new names opened.",
    ],
    "holdings": [
      ("TSLA", "Tesla", "hold", "#1 holding (8.2%) — the physical-AI bet"),
      ("AMD", "AMD", "add", "Added — now #2 at 4.3%"),
      ("PLTR", "Palantir", "hold", "Top-5 holding (AI software)"),
      ("AMZN", "Amazon", "add", "Cloud + AI platform, added again"),
      ("CRWV", "CoreWeave", "add", "Pure-play GPU cloud"),
      ("TEM", "Tempus AI", "add", "AI + healthcare data"),
    ],
    "sources": [
      ("Seeking Alpha — Tracking Cathie Wood's ARK Invest 13F portfolio, Q1 2026", "https://seekingalpha.com/article/4903557-tracking-cathie-woods-ark-invest-13f-portfolio-q1-2026-update"),
      ("TheStreet — Wood buys another $72M of Amazon", "https://www.thestreet.com/investing/cathie-wood-buys-another-72m-of-mega-cap-amazon"),
      ("Motley Fool — Wood adds CoreWeave", "https://www.fool.com/investing/2026/03/07/cathie-wood-bargain-hunting-2-ai-stocks/"),
    ],
    "faqs": [
      ("What AI stocks does Cathie Wood own?",
       "Per ARK's Q1 2026 13F (~$12.9B across 181 positions): Tesla is the largest holding at 8.2%, AMD is second at 4.3% after being added, and Palantir sits in the top five. CoreWeave, Tempus AI, Amazon and Alphabet were all added during the quarter."),
      ("Why does ARK own nuclear stocks for an AI thesis?",
       "Because compute needs power. The X-Energy position treats nuclear as AI's energy base layer — the same reasoning that shows up elsewhere in the sector, where the constraint on scaling is increasingly electricity and grid capacity rather than chips alone."),
      ("Is Cathie Wood still bullish on AI in 2026?",
       "On the filings, yes — and at the highest-beta end. Q1 2026 opened 17 new names and added to AMD, Amazon, Alphabet, CoreWeave and Tempus, concentrating on infrastructure and next-generation compute rather than incumbents."),
    ],
  },
]

ACTION_LABEL = {"add": ("Added", "add"), "hold": ("Held", "hold"), "exit": ("Exited", "exit")}

PAGE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<script async src="https://www.googletagmanager.com/gtag/js?id={ga}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments);}}gtag('js',new Date());gtag('config','{ga}');</script>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%230a0a0b'/%3E%3Ccircle cx='16' cy='16' r='6' fill='%234fc3a1'/%3E%3C/svg%3E">
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="https://agiscorecard.com/invest/{slug}">
<meta property="og:site_name" content="The AGI Scorecard">
<meta property="og:title" content="{name}'s AI positioning">
<meta property="og:description" content="{desc}">
<meta property="og:type" content="article">
<meta property="og:url" content="https://agiscorecard.com/invest/{slug}">
<meta property="og:image" content="https://agiscorecard.com/scorecard-summary.png">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">{{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{{"@type":"ListItem","position":1,"name":"AGI Scorecard","item":"https://agiscorecard.com/"}},{{"@type":"ListItem","position":2,"name":"AI Investing Hub","item":"https://agiscorecard.com/invest"}},{{"@type":"ListItem","position":3,"name":"{name}","item":"https://agiscorecard.com/invest/{slug}"}}]}}</script>
<script type="application/ld+json">{{"@context":"https://schema.org","@type":"Article","headline":"{name}'s AI positioning","datePublished":"2026-07-26","dateModified":"2026-07-26","author":{{"@type":"Organization","name":"The AGI Scorecard"}},"publisher":{{"@type":"Organization","name":"The AGI Scorecard","url":"https://agiscorecard.com/"}},"description":"{desc}"}}</script>
<script type="application/ld+json">{faq_ld}</script>
<style>
:root{{--bg:#0a0a0b;--bg2:#111114;--bg3:#18181d;--border:rgba(255,255,255,0.07);--border2:rgba(255,255,255,0.12);--text:#e8e8ec;--muted:#8888a0;--accent:#7c6af5;--accent2:#4fc3a1;--warn:#e8a040;--danger:#e05555;--font:'Inter',-apple-system,sans-serif;--mono:'JetBrains Mono',monospace}}
*{{box-sizing:border-box;margin:0;padding:0}}
body{{font-variant-numeric:tabular-nums;background:var(--bg);color:var(--text);font-family:var(--font);font-size:16px;line-height:1.75}}
a{{color:var(--accent);text-decoration:none}}a:hover{{opacity:.85}}
header{{border-bottom:1px solid var(--border);padding:0 1.5rem;display:flex;align-items:center;justify-content:space-between;height:56px;position:sticky;top:0;background:rgba(10,10,11,.92);backdrop-filter:blur(12px);z-index:100}}
.logo{{display:flex;align-items:center;gap:10px;font-weight:600;font-size:15px;color:var(--text)}}
.logo-dot{{width:8px;height:8px;background:var(--accent2);border-radius:50%}}
.back-link{{font-size:13px;color:var(--muted)}}
article{{max-width:760px;margin:0 auto;padding:2.5rem 1.5rem 4rem}}
.eyebrow{{font-size:12px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--accent);margin-bottom:.75rem}}
h1{{font-size:clamp(1.6rem,4vw,2.2rem);font-weight:700;line-height:1.2;margin-bottom:.5rem}}
.updated{{font-size:12px;color:var(--muted);margin-bottom:1.25rem}}
.meta{{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:1.5rem}}
.meta span{{font-size:12px;border:1px solid var(--border2);border-radius:20px;padding:3px 12px;color:var(--muted)}}
.capsule{{background:var(--bg2);border:1px solid var(--border);border-left:3px solid var(--accent2);border-radius:0 10px 10px 0;padding:1.15rem 1.4rem;margin-bottom:1.75rem}}
h2{{font-size:1.25rem;font-weight:600;margin:2.25rem 0 .9rem}}
p{{margin-bottom:1rem}}
strong{{color:#fff}}
table{{width:100%;border-collapse:collapse;font-size:13.5px;margin:1rem 0 1.4rem;background:var(--bg2);border:1px solid var(--border);border-radius:10px;overflow:hidden}}
th{{text-align:left;padding:10px 12px;color:var(--muted);font-weight:500;font-size:11px;letter-spacing:.05em;text-transform:uppercase;border-bottom:1px solid var(--border)}}
td{{padding:10px 12px;border-bottom:1px solid var(--border);vertical-align:top}}
tr:last-child td{{border-bottom:none}}
.tk{{font-family:var(--mono);font-weight:700;color:var(--text)}}
.act{{display:inline-block;font-size:11px;font-weight:700;padding:2px 9px;border-radius:5px;white-space:nowrap}}
.add{{color:var(--accent2);background:rgba(79,195,161,.12)}}
.hold{{color:var(--muted);background:rgba(136,136,160,.12)}}
.exit{{color:var(--danger);background:rgba(224,85,85,.12)}}
.bull{{color:var(--accent2)}}.cautious{{color:var(--warn)}}.bear{{color:var(--danger)}}
ul{{margin:0 0 1rem 1.2rem}}li{{margin-bottom:.5rem}}
.src{{font-size:12.5px;color:var(--muted)}}
.faq-q{{font-weight:600;margin:1.3rem 0 .4rem}}
.cta{{margin-top:2rem;background:linear-gradient(135deg,rgba(124,106,245,.08),rgba(79,195,161,.06));border:1px solid rgba(124,106,245,.2);border-radius:14px;padding:1.5rem;text-align:center}}
.cta a.btn{{display:inline-block;background:var(--accent);color:#fff;padding:10px 22px;border-radius:8px;font-size:14px;font-weight:500;margin-top:.6rem}}
.disclaimer{{font-size:12px;color:var(--muted);border:1px dashed var(--border2);border-radius:10px;padding:12px 16px;margin:1.5rem 0}}
.related{{margin-top:2.5rem;padding-top:1.5rem;border-top:1px solid var(--border)}}
.related a{{display:block;padding:6px 0;font-size:14px}}
footer{{border-top:1px solid var(--border);padding:24px 0;font-size:12px;color:var(--muted);text-align:center}}
@media(max-width:640px){{table{{display:block;overflow-x:auto;-webkit-overflow-scrolling:touch}}}}
</style>
</head>
<body>
<header>
  <a href="/" class="logo"><span class="logo-dot"></span>AGI Scorecard</a>
  <a href="/invest" class="back-link">← AI Investing Hub</a>
</header>
<article>
  <div class="eyebrow">Investor profile</div>
  <h1>{name}: the AI positioning</h1>
  <div class="updated">Holdings as of {asof} · Published July 26, 2026</div>
  <div class="meta"><span>{firm}</span><span>{style}</span><span>{horizon}</span><span class="{stance_class}">AI stance: {stance}</span></div>
  <div class="capsule">{capsule}</div>

<h2>The thesis, in their own moves</h2>
<ul>{thesis_html}</ul>

<h2>AI-related holdings ({asof_short})</h2>
<table><thead><tr><th>Ticker</th><th>Company</th><th>Q1 move</th><th>Note</th></tr></thead><tbody>
{holdings_html}
</tbody></table>
<p class="src">Positions shown are the AI-relevant subset of a much larger book — this is not a complete portfolio. Figures come from the public Q1 2026 13F filing and the reporting cited below. 13F filings are quarterly snapshots and may not reflect current positions.</p>

<h2>Sources</h2>
<ul class="src">{sources_html}</ul>

<div class="disclaimer">⚠️ <strong>Not investment advice.</strong> This page is educational information assembled from public SEC filings and named reporting. Nothing here is a recommendation to buy or sell any security.</div>

<h2>Frequently asked questions</h2>
{faq_html}

<div class="cta">
  <p style="font-weight:600;margin:0">The 13Fs drop quarterly. We read them so you don't have to.</p>
  <p style="font-size:13px;color:var(--muted);margin:6px 0 0">When a legend's AI position moves — or an AGI verdict flips — we tell you what changed. Free, no hype.</p>
  <a class="btn" href="https://agiscorecard.beehiiv.com/subscribe?utm_source=agiscorecard&amp;utm_medium=invest_profile" target="_blank" rel="noopener" onclick="gtag('event','subscribe_click',{{location:'invest_profile'}});">Subscribe free →</a>
</div>

<div class="related">
  <h2>Related</h2>
  <a href="/invest">← All 8 investors and the AI Investing Hub</a>
  <a href="/cn">The AGI-2027 author's own $20B fund →</a>
  <a href="/progress-index" onclick="gtag('event','index_click',{{location:'invest_profile'}});">Is the AGI thesis actually on track? The Tracker: {score}/100 →</a>
  <a href="/is-the-ai-capex-a-bubble">Is the AI capex a bubble? →</a>
</div>
</article>
<footer>AGI Scorecard · Independent tracker of <a href="https://situational-awareness.ai" style="color:var(--muted)">Situational Awareness</a> · Not affiliated with any lab · <a href="/about" style="color:var(--muted)">About</a> · <a href="/privacy" style="color:var(--muted)">Privacy</a></footer>
</body></html>
"""

def esc(t):
    return t.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;')

os.makedirs(os.path.join(ROOT, "invest"), exist_ok=True)
for p in PROFILES:
    thesis_html = "".join(f"<li>{t}</li>" for t in p["thesis"])
    holdings_html = "\n".join(
        f'<tr><td class="tk">{tk}</td><td>{nm}</td><td><span class="act {ACTION_LABEL[a][1]}">{ACTION_LABEL[a][0]}</span></td><td>{note}</td></tr>'
        for tk, nm, a, note in p["holdings"])
    sources_html = "".join(
        f'<li><a href="{u}" target="_blank" rel="noopener nofollow">{esc(l)}</a></li>' for l, u in p["sources"])
    faq_html = "".join(f'<div class="faq-q">{q}</div><p>{a}</p>' for q, a in p["faqs"])
    faq_ld = ('{"@context":"https://schema.org","@type":"FAQPage","mainEntity":['
              + ",".join('{"@type":"Question","name":"%s","acceptedAnswer":{"@type":"Answer","text":"%s"}}'
                         % (esc(q), esc(a)) for q, a in p["faqs"]) + ']}')
    html = PAGE.format(ga=GA, score=SCORE, faq_ld=faq_ld, thesis_html=thesis_html,
                       holdings_html=holdings_html, sources_html=sources_html, faq_html=faq_html,
                       asof_short=p["asof"].split(" (")[0], **p)
    out = os.path.join(ROOT, "invest", p["slug"] + ".html")
    open(out, "w").write(html)
    print("wrote invest/" + p["slug"] + ".html")
