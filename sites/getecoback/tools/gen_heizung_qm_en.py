#!/usr/bin/env python3
"""EN twin of gen_heizung_qm.py: "What size electric heater for X m²?"

上量执行队列② (2026-08-28), same pattern as gen_entfeuchter_qm_en.py: reads the
SAME tools/content_heizung_qm.json (single source of truth — the watt ladder and
cost basis are shared with the DE pages; only `raumtyp_en` / `hinweis_en` are
English) and writes site/en/guide/electric-heater-<qm>-sqm.html.

Hard gate (≥3 independent data points per page): ① the watt ladder value with
the 60–100 W/m² insulation rule, ② the wref → €/h running-cost calculation,
③ the transparent season formula (watts ÷ 1000 × price × hours × duty × days),
plus the full-series ladder table and the heat-pump honesty line on large rooms.
All figures identical to the published German pages — no new claims.

One-shot scaffold: committed pages get enriched by the injector pipeline
afterwards — do not blindly re-run over live pages.
Usage: python3 tools/gen_heizung_qm_en.py
"""
import os, re, json

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, "site")
GA4 = "G-E2V0Q9SJ9V"
TAG = "getecoback-21"
BASE = "https://getecoback.com"
PRICE_KWH = 0.30

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

def en_watt(w_de):
    # DE thousands separator "2.400" → EN "2,400"
    return w_de.replace(".", ",")

def ladder_table(entries, current_qm):
    rows = []
    for e in entries:
        if e["qm"] != current_qm:
            cell = f'<a href="/en/guide/electric-heater-{e["qm"]}-sqm.html">{e["qm"]} m²</a>'
        else:
            cell = f"<strong>{e['qm']} m² (this page)</strong>"
        rows.append(f"<tr><td>{cell}</td><td>{en_watt(e['watt'])} W</td><td>{e['raumtyp_en']}</td></tr>")
    return ('<table class="qmt"><tr><th>Room size</th><th>Heating power</th><th>Typical room</th></tr>'
            + "".join(rows) + "</table>")

def page(e, entries):
    qm = e["qm"]
    slug = f"electric-heater-{qm}-sqm"
    url = f"{BASE}/en/guide/{slug}.html"
    de_url = f"{BASE}/guide/heizung-{qm}-qm.html"
    watt_en = en_watt(e["watt"])
    wref = e["wref"]
    title = f"What size electric heater for {qm} m²? Wattage guide"
    kosten_h = f"{wref / 1000 * PRICE_KWH:.2f}"
    season = round(wref / 1000 * PRICE_KWH * 5 * 0.4 * 150)
    desc = (f"What size electric heater for {qm} m²? Recommended: {watt_en} W "
            f"(60–100 W per m²). Running cost about €{kosten_h}/h and the honest season maths.")
    faqs = [
        (f"How many watts of heating power do I need for {qm} m²?",
         f"As a rule of thumb {watt_en} W (around 60–100 W per m², depending on insulation). "
         f"{e['hinweis_en']}"),
        (f"What does heating with {wref:,} W cost?",
         f"At full power a {wref:,} W heater draws about €{kosten_h} per hour (at €0.30/kWh). "
         "A thermostat lowers that considerably, because it does not heat continuously."),
        (f"What does a heating season cost for {qm} m²?",
         f"With {wref:,} W, 5 heating hours a day, a thermostat duty cycle of about 40 % and "
         f"150 heating days you end up at roughly €{season} per season (at €0.30/kWh). Recalculate "
         "with your own tariff: watts ÷ 1000 × price × hours × duty cycle × days."),
        (f"Is an electric panel heater enough as the only heating for {qm} m²?",
         ("As a supplementary or transition-season heater, yes. As the sole heating in deep winter, "
          "a building heat pump is usually more economical — electric resistance heating turns every "
          "kilowatt-hour of expensive electricity into exactly one kilowatt-hour of heat, no more.")
         if qm < 40 else
         ("Only just — at this size you need several panels, and as the sole heating in deep winter "
          "it is borderline. A building heat pump is usually more economical for rooms this large; "
          "electric panels remain a zone or supplementary heater.")),
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
            {"@type": "ListItem", "position": 3, "name": f"Electric heater for {qm} m²", "item": url}]},
        {"@type": "FAQPage", "mainEntity": [
            {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}}
            for q, a in faqs]},
    ]
    jsonld = json.dumps({"@context": "https://schema.org", "@graph": graph}, ensure_ascii=False)
    dehum = f'<a href="/en/guide/dehumidifier-{qm}-sqm.html">What size dehumidifier for {qm} m²? →</a>' \
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
<meta property="og:title" content="What size electric heater for {qm} m²?">
<meta property="og:description" content="Wattage recommendation, running cost and the honest season maths for {qm} m².">
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
    <h1>What size electric heater for {qm} m²?</h1>
    <p>How many watts you need, what running it costs, and when electric heating stops making sense.</p>
  </div>
</header>

<div class="wrap">
<article>
  <p>Heating a room of around {qm} m² with an electric panel or infrared heater? It works — but only with the right wattage and honest expectations about the electricity bill. Here is the concrete recommendation for {qm} m².</p>

  <div class="disclosure">As an Amazon Associate, EcoBack earns from qualifying purchases. Product links below are affiliate links — you pay the same price.</div>

  <div class="tldr"><strong>Quick answer:</strong> For {qm} m² you need about <strong>{watt_en} W</strong> of heating power (rule of thumb: 60–100 W per m², depending on insulation). At full power that costs about €{kosten_h} per hour at €0.30/kWh — a thermostat brings the real-world figure well down.</div>

  <h2>How many watts for {qm} m²?</h2>
  <p>{e['hinweis_en']} Well-insulated new buildings sit at the lower end of the 60–100 W per m² band, old buildings with high ceilings at the upper end.</p>

  <h2>The full size ladder</h2>
  {ladder_table(entries, qm)}

  <h2>Recommended setup for {qm} m²</h2>
  <div class="rec">
    <span class="badge">Electric heating · {watt_en} W</span>
    <p style="margin:8px 0 4px;">An <strong>infrared panel (or set of panels) totalling {watt_en} W</strong> with a thermostat fits a {e['raumtyp_en']}. The thermostat is where the saving is — it cycles the panel instead of heating continuously. We do not test units ourselves; picks summarise public tests.</p>
    <p style="margin:4px 0 8px;font-size:13.5px;"><span style="color:#177245;">✓ No installation, plugs into a socket &nbsp; ✓ Silent, no moving parts</span> &nbsp; <span style="color:#9a3412;">✕ Electricity is an expensive way to make heat</span></p>
    <p style="margin:0 0 6px;font-size:11.5px;color:#8a99a6;">Ad · affiliate link — same price for you. Amazon.de ships to most EU countries, with site and checkout available in English.</p>
    <a style="display:inline-block;background:#f59e0b;color:#1a2733;font-weight:800;padding:9px 16px;border-radius:8px;text-decoration:none;font-size:14px;" href="{amazon(e['suchbegriff'])}" target="_blank" rel="sponsored noopener">Check the price on Amazon.de →</a>
  </div>

  <h2>What does heating {qm} m² cost?</h2>
  <p>At full power, {wref:,} W draws about <strong>€{kosten_h} per hour</strong> (calculated at €0.30/kWh — put in your own tariff). For a season: with 5 heating hours a day, a thermostat duty cycle of about 40 % and 150 heating days that is roughly <strong>€{season} per season</strong>. The formula is transparent: watts ÷ 1000 × price × hours × duty cycle × days. Electric resistance heating turns one kilowatt-hour of electricity into exactly one kilowatt-hour of heat — that physics is why a heat pump beats it for whole-home, all-winter heating.</p>

  <h2>Frequently asked questions</h2>
  {faq_html}

  <div class="cta-box">
    <p style="margin-bottom:6px;"><strong>Matching heating panels for {qm} m² on Amazon.de</strong> — check total wattage and the thermostat:</p>
    <p style="margin:0 0 12px;font-size:11.5px;color:#8a99a6;">Ad · affiliate links — same price for you</p>
    <a class="btn" href="{amazon(e['suchbegriff'])}" target="_blank" rel="sponsored noopener">See heating panels →</a>
  </div>

  <div class="related">
    <strong>More guides</strong>
    {dehum}
    <a href="/en/guide/dehumidifier-drying-clothes-cost.html">Drying laundry indoors: what a dehumidifier costs →</a>
    <a href="/guide/heizung-{qm}-qm.html">Diese Seite auf Deutsch →</a>
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
    data = json.load(open(os.path.join(ROOT, "tools", "content_heizung_qm.json"), encoding="utf-8"))
    outdir = os.path.join(SITE, "en", "guide")
    made = []
    for e in data["entries"]:
        slug, html = page(e, data["entries"])
        m = re.search(r'<script type="application/ld\+json">(.*?)</script>', html, re.S)
        json.loads(m.group(1))
        open(os.path.join(outdir, f"{slug}.html"), "w", encoding="utf-8").write(html)
        made.append(slug)
    print(f"generated {len(made)} EN heater pages: " + ", ".join(made))

if __name__ == "__main__":
    main()
