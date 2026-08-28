#!/usr/bin/env python3
"""EN twin of gen_entfeuchter_qm.py: "What size dehumidifier for X m²?"

上量执行队列② (2026-08-28): the German qm series carries Bing's literal-match
structure; this adds the English face. Reads the SAME
tools/content_entfeuchter_qm.json (single source of truth — the litres/day
ladder, watt figure and cost basis are shared with the DE pages; only the
`raumtyp_en` / `hinweis_en` text fields are English) and writes
site/en/guide/dehumidifier-<qm>-sqm.html.

Hard gate (post-HCU survival line, per queue item ②): every page carries ≥3
independent data points — ① the litres/day ladder value, ② the 300 W →
€0.09/h running-cost calculation, ③ the <60 % RH mould threshold, plus the
full-series ladder table. hreflang declares the DE partner; build_hreflang's
group model rewrites both sides.

One-shot scaffold like its DE twin: committed pages get enriched by the
injector pipeline afterwards — do not blindly re-run over live pages.
Usage: python3 tools/gen_entfeuchter_qm_en.py
"""
import os, re, json

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, "site")
GA4 = "G-E2V0Q9SJ9V"
TAG = "getecoback-21"
BASE = "https://getecoback.com"
PRICE_KWH = 0.30
WATT = 300  # typical draw of a compressor dehumidifier (same basis as DE pages)

STYLE = """  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; color:#1a2733; line-height:1.65; background:#f7fafc; }
  .wrap { max-width:720px; margin:0 auto; padding:0 20px; }
  header { background:linear-gradient(135deg,#0f6ba8,#0a4d7a); color:#fff; padding:40px 0 34px; }
  header a { color:rgba(255,255,255,0.85); font-size:14px; text-decoration:none; }
  header h1 { font-size:clamp(24px,4vw,34px); margin:14px 0 8px; }
  header p { color:rgba(255,255,255,0.9); }
  article { padding:40px 0 20px; }
  article h2 { font-size:21px; margin:28px 0 10px; }
  article p { margin-bottom:14px; color:#26333d; }
  article ul { margin:0 0 16px 22px; color:#26333d; }
  article li { margin-bottom:8px; }
  .tldr { background:#eaf6ff; border:1px solid #cfe6fa; border-radius:10px; padding:16px 18px; margin:18px 0; }
  .rec { background:#fff; border:1px solid #e4ebf0; border-radius:12px; padding:16px 18px; margin:18px 0; }
  .badge { display:inline-block; background:#0f6ba8; color:#fff; font-size:12px; font-weight:700; padding:3px 10px; border-radius:20px; }
  .cta-box { background:#fff; border:1px solid #e4ebf0; border-radius:12px; padding:20px; margin:22px 0; }
  .btn { display:inline-block; background:#f59e0b; color:#1a2733; font-weight:800; padding:12px 22px; border-radius:8px; text-decoration:none; }
  .btn:hover { background:#e08c05; }
  .disclosure { font-size:13px; color:#7a6f4e; background:#fbfaf5; border:1px solid #efe9d6; border-radius:8px; padding:12px 16px; margin:20px 0; }
  .related { background:#fff; border:1px solid #e4ebf0; border-radius:12px; padding:18px 20px; margin:26px 0; }
  .related a { display:block; margin:6px 0; }
  table.qmt { width:100%; border-collapse:collapse; margin:16px 0; font-size:14px; background:#fff; border:1px solid #e4ebf0; }
  table.qmt th, table.qmt td { padding:9px 12px; text-align:left; border-bottom:1px solid #eef2f5; }
  table.qmt th { background:#f0f6fa; font-size:13px; }
  table.qmt tr:last-child td { border-bottom:none; }
  footer { text-align:center; color:#5b6b78; font-size:13px; padding:30px 20px 50px; }
  footer a, a { color:#0f6ba8; }"""

TRACK = ('<script>document.addEventListener("click",function(e){var t=e.target;'
         'while(t&&t.tagName!=="A"){t=t.parentElement;}if(t&&t.href&&t.href.indexOf'
         '("amazon.de")>-1&&typeof gtag==="function"){gtag("event","affiliate_click",'
         '{link_url:t.href,page_path:location.pathname});}});</script>')

def amazon(term):
    return f"https://www.amazon.de/s?k={term}&amp;tag={TAG}"

def ladder_table(entries, current_qm):
    rows = []
    for e in entries:
        cell = f"{e['qm']} m²"
        if e["qm"] != current_qm:
            cell = f'<a href="/en/guide/dehumidifier-{e["qm"]}-sqm.html">{e["qm"]} m²</a>'
        else:
            cell = f"<strong>{e['qm']} m² (this page)</strong>"
        rows.append(f"<tr><td>{cell}</td><td>{e['liter']} litres/day</td><td>{e['raumtyp_en']}</td></tr>")
    return ('<table class="qmt"><tr><th>Room size</th><th>Extraction capacity</th><th>Typical room</th></tr>'
            + "".join(rows) + "</table>")

def page(e, entries):
    qm = e["qm"]
    slug = f"dehumidifier-{qm}-sqm"
    url = f"{BASE}/en/guide/{slug}.html"
    de_url = f"{BASE}/guide/luftentfeuchter-{qm}-qm.html"
    title = f"What size dehumidifier for {qm} m²? (litres per day)"
    desc = (f"What size dehumidifier for {qm} m²? Recommended: {e['liter']} litres/day. "
            f"Capacity, running cost (~€0.09/h) and what to look for in a {e['raumtyp_en']}.")
    kosten_h = f"{WATT / 1000 * PRICE_KWH:.2f}"
    faqs = [
        (f"How many litres per day do I need for {qm} m²?",
         f"As a rule of thumb, {e['liter']} litres/day. {e['hinweis_en']}"),
        (f"What does a dehumidifier for {qm} m² cost to run?",
         f"A typical compressor unit draws about {WATT} W, so roughly €{kosten_h} per hour "
         f"(at €0.30/kWh). With a humidistat it only runs until the target humidity is reached, "
         "then barely at all."),
        (f"Does a dehumidifier help against mould in a {qm} m² room?",
         "Yes — by keeping relative humidity below about 60 % it removes the basis mould needs "
         "to grow. A humidistat that switches off automatically at the target level is ideal for this."),
        ("When should I size up?",
         "Pick the next capacity class up for basements, ground-floor flats, frequent indoor "
         "laundry drying, or after water damage — persistent moisture sources outpace an "
         "exactly-sized unit."),
    ]
    faq_html = "\n  ".join(f'<p><strong>{q}</strong><br>{a}</p>' for q, a in faqs)
    graph = [
        {"@type": "Article", "headline": title, "description": desc, "mainEntityOfPage": url,
         "inLanguage": "en", "datePublished": "2026-08-28", "dateModified": "2026-08-28",
         "author": {"@type": "Organization", "name": "EcoBack", "url": f"{BASE}/"},
         "publisher": {"@type": "Organization", "name": "EcoBack", "url": f"{BASE}/"}},
        {"@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "EcoBack Heatwave Guide", "item": f"{BASE}/en/"},
            {"@type": "ListItem", "position": 2, "name": "Guides", "item": f"{BASE}/en/#guides"},
            {"@type": "ListItem", "position": 3, "name": f"Dehumidifier for {qm} m²", "item": url}]},
        {"@type": "FAQPage", "mainEntity": [
            {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}}
            for q, a in faqs]},
    ]
    jsonld = json.dumps({"@context": "https://schema.org", "@graph": graph}, ensure_ascii=False)
    heater = f'<a href="/en/guide/electric-heater-{qm}-sqm.html">What size electric heater for {qm} m²? →</a>' \
        if qm in (10, 15, 20, 25, 30, 40) else ""
    return slug, f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{url}">
<link rel="alternate" hreflang="de" href="{de_url}">
<link rel="alternate" hreflang="en" href="{url}">
<link rel="alternate" hreflang="x-default" href="{de_url}">
<meta property="og:type" content="article">
<meta property="og:title" content="What size dehumidifier for {qm} m²?">
<meta property="og:description" content="Litres-per-day recommendation, running cost and what to look for at {qm} m².">
<meta property="og:url" content="{url}">
<!-- Google Analytics (GA4) -->
<script async src="https://www.googletagmanager.com/gtag/js?id={GA4}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments);}}gtag('js',new Date());gtag('config','{GA4}');</script>
<style>
{STYLE}
</style>
<script type="application/ld+json">{jsonld}</script>
</head>
<body>
<header>
  <div class="wrap">
    <a href="/en/">← EcoBack heatwave guide</a>
    <h1>What size dehumidifier for {qm} m²?</h1>
    <p>How many litres per day you need, what running it costs, and which unit fits.</p>
  </div>
</header>

<div class="wrap">
<article>
  <p>Damp air, condensation on the windows or a musty smell in a room of around {qm} m²? A dehumidifier fixes that — but only with the right capacity. Too small, and it never catches up. Here is the concrete recommendation for {qm} m².</p>

  <div class="disclosure">As an Amazon Associate, EcoBack earns from qualifying purchases. Product links below are affiliate links — you pay the same price.</div>

  <div class="tldr"><strong>Quick answer:</strong> For {qm} m², choose a dehumidifier with <strong>{e['liter']} litres/day</strong> of extraction capacity. Running it costs about €{f"{WATT / 1000 * PRICE_KWH:.2f}"} per hour (at €0.30/kWh) — much less with a humidistat, which switches off at the target humidity.</div>

  <h2>How many litres per day for {qm} m²?</h2>
  <p>{e['hinweis_en']} Size up for basements, ground floors, lots of indoor laundry drying, or after water damage. The manufacturer's litres/day figure is measured under warm, very humid lab conditions — real-world extraction is lower, which is another reason not to undersize.</p>

  <h2>The full size ladder</h2>
  {ladder_table(entries, qm)}

  <h2>Recommended unit for {qm} m²</h2>
  <div class="rec">
    <span class="badge">Dehumidifier · {e['liter']} l/day</span>
    <p style="margin:8px 0 4px;">A <strong>{e['liter']}-litre compressor dehumidifier</strong> with a humidistat fits a {e['raumtyp_en']}. The humidistat switches off automatically at the target humidity — that is where the real electricity saving is. We do not test units ourselves; picks summarise public tests.</p>
    <p style="margin:4px 0 8px;font-size:13.5px;"><span style="color:#177245;">✓ Against mould &amp; damp &nbsp; ✓ Frugal with a humidistat</span> &nbsp; <span style="color:#9a3412;">✕ Some operating noise</span></p>
    <p style="margin:0 0 6px;font-size:11.5px;color:#8a99a6;">Ad · affiliate link — same price for you. Amazon.de ships to most EU countries, with site and checkout available in English.</p>
    <a style="display:inline-block;background:#f59e0b;color:#1a2733;font-weight:800;padding:9px 16px;border-radius:8px;text-decoration:none;font-size:14px;" href="{amazon(e['suchbegriff'])}" target="_blank" rel="sponsored noopener">Check the price on Amazon.de →</a>
  </div>

  <h2>What does running it cost at {qm} m²?</h2>
  <p>A compressor dehumidifier draws about {WATT} W, so roughly <strong>€{f"{WATT / 1000 * PRICE_KWH:.2f}"} per hour</strong> (calculated at €0.30/kWh — put in your own tariff). With a humidistat it only runs until the target humidity is reached, so real-world cost is well below continuous operation. Keeping the room below about 60 % relative humidity is what takes away the basis mould needs.</p>

  <h2>Frequently asked questions</h2>
  {faq_html}

  <div class="cta-box">
    <p style="margin-bottom:6px;"><strong>Matching dehumidifiers for {qm} m² on Amazon.de</strong> — check litres/day and the humidistat:</p>
    <p style="margin:0 0 12px;font-size:11.5px;color:#8a99a6;">Ad · affiliate links — same price for you</p>
    <a class="btn" href="{amazon(e['suchbegriff'])}" target="_blank" rel="sponsored noopener">See dehumidifiers →</a>
  </div>

  <div class="related">
    <strong>More guides</strong>
    {heater}
    <a href="/en/guide/dehumidifier-drying-clothes-cost.html">Drying laundry indoors: what a dehumidifier costs →</a>
    <a href="/en/guide/portable-ac-smells-musty.html">Portable AC smells musty? Clean it before storing →</a>
    <a href="/guide/luftentfeuchter-{qm}-qm.html">Diese Seite auf Deutsch →</a>
  </div>
</article>
</div>

<footer>
  <p><a href="/en/">← Back to the EcoBack heatwave guide</a></p>
  <p style="margin-top:8px;">As an Amazon Associate, EcoBack earns from qualifying purchases.</p>
</footer>
{TRACK}
</body>
</html>
"""

def main():
    data = json.load(open(os.path.join(ROOT, "tools", "content_entfeuchter_qm.json"), encoding="utf-8"))
    outdir = os.path.join(SITE, "en", "guide")
    made = []
    for e in data["entries"]:
        slug, html = page(e, data["entries"])
        m = re.search(r'<script type="application/ld\+json">(.*?)</script>', html, re.S)
        json.loads(m.group(1))
        open(os.path.join(outdir, f"{slug}.html"), "w", encoding="utf-8").write(html)
        made.append(slug)
    print(f"generated {len(made)} EN dehumidifier pages: " + ", ".join(made))

if __name__ == "__main__":
    main()
