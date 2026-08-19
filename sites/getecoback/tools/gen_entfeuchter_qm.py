#!/usr/bin/env python3
"""Programmatic page generator #3: "Luftentfeuchter für X m²?"

Third data-driven category (dehumidifier capacity in Liter/Tag by room size),
mirroring gen_roomsize.py / gen_heizung_qm.py. Reads
tools/content_entfeuchter_qm.json → site/guide/luftentfeuchter-<qm>-qm.html, fully
templated (GA4, affiliate links tag=getecoback-21, click tracking, TL;DR, FAQ,
Article+BreadcrumbList+FAQPage JSON-LD, button CTA + pros/cons).

Honest rules of thumb; model links by keyword search, no fabricated ASINs.
Usage: python tools/gen_entfeuchter_qm.py
"""
import os, re, json

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, "site")
GA4 = "G-E2V0Q9SJ9V"
TAG = "getecoback-21"
BASE = "https://getecoback.com"
PRICE_KWH = 0.30
WATT = 300  # typische Leistungsaufnahme Kompressor-Luftentfeuchter

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
  footer { text-align:center; color:#5b6b78; font-size:13px; padding:30px 20px 50px; }
  footer a, a { color:#0f6ba8; }"""

TRACK = ('<script>document.addEventListener("click",function(e){var t=e.target;'
         'while(t&&t.tagName!=="A"){t=t.parentElement;}if(t&&t.href&&t.href.indexOf'
         '("amazon.de")>-1&&typeof gtag==="function"){gtag("event","affiliate_click",'
         '{link_url:t.href,page_path:location.pathname});}});</script>')

def amazon(term):
    return f"https://www.amazon.de/s?k={term}&amp;tag={TAG}"

def page(e):
    qm = e["qm"]
    slug = f"luftentfeuchter-{qm}-qm"
    url = f"{BASE}/guide/{slug}.html"
    title = f"Luftentfeuchter für {qm} m²: Wie viel Liter/Tag? (Ratgeber 2026)"
    desc = (f"Welcher Luftentfeuchter für {qm} m²? Empfohlen: {e['liter']} Liter/Tag. "
            f"Kapazität, Stromkosten & Geräte-Tipp für dein {e['raumtyp']} (2026).")
    kosten_h = round(WATT / 1000 * PRICE_KWH, 2)
    kosten_h_str = f"{kosten_h:.2f}".replace(".", ",")
    faqs = [
        (f"Wie viel Liter Entfeuchtungsleistung brauche ich für {qm} m²?",
         f"Als Orientierung {e['liter']} Liter/Tag. {e['hinweis']}"),
        (f"Was kostet ein Luftentfeuchter für {qm} m² an Strom?",
         f"Ein typisches Kompressor-Gerät zieht ca. {WATT} W, also rund {kosten_h_str} € pro "
         f"Stunde (0,30 €/kWh). Mit Hygrostat läuft es nur bis zur Zielfeuchte und dann kaum noch."),
        (f"Hilft ein Luftentfeuchter gegen Schimmel in {qm} m²?",
         "Ja — indem er die Luftfeuchtigkeit unter ~60 % hält, entzieht er Schimmel die "
         "Grundlage. Ein Hygrostat, der bei Zielfeuchte automatisch abschaltet, ist dafür ideal."),
    ]
    faq_html = "\n  ".join(f'<p><strong>{q}</strong><br>{a}</p>' for q, a in faqs)
    graph = [
        {"@type": "Article", "headline": title, "description": desc, "mainEntityOfPage": url,
         "inLanguage": "de", "datePublished": "2026-07-10", "dateModified": "2026-07-10",
         "author": {"@type": "Organization", "name": "EcoBack", "url": f"{BASE}/"},
         "publisher": {"@type": "Organization", "name": "EcoBack", "url": f"{BASE}/"}},
        {"@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "EcoBack Hitzewelle-Ratgeber", "item": f"{BASE}/"},
            {"@type": "ListItem", "position": 2, "name": "Luftqualität", "item": f"{BASE}/kategorie/luftqualitaet.html"},
            {"@type": "ListItem", "position": 3, "name": f"Luftentfeuchter für {qm} m²", "item": url}]},
        {"@type": "FAQPage", "mainEntity": [
            {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}}
            for q, a in faqs]},
    ]
    jsonld = json.dumps({"@context": "https://schema.org", "@graph": graph}, ensure_ascii=False)
    return slug, f"""<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{url}">
<link rel="alternate" hreflang="de" href="{url}">
<meta property="og:type" content="article">
<meta property="og:title" content="Luftentfeuchter für {qm} m²?">
<meta property="og:description" content="Liter/Tag-Empfehlung, Stromkosten und passendes Gerät für {qm} m².">
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
    <a href="/">← EcoBack Hitzewelle-Ratgeber</a>
    <h1>Luftentfeuchter für {qm} m²?</h1>
    <p>Wie viel Liter/Tag du brauchst, was der Betrieb kostet und welches Gerät passt.</p>
  </div>
</header>

<div class="wrap">
<article>
  <p>Feuchte Luft, beschlagene Fenster oder muffiger Geruch in einem Raum mit rund {qm} m²? Ein Luftentfeuchter hilft — aber nur mit der richtigen Kapazität. Zu klein, und er kommt nie hinterher. Hier die konkrete Empfehlung für {qm} m².</p>

  <div class="disclosure">Als Amazon-Partner verdient EcoBack an qualifizierten Käufen. Produktlinks unten sind Affiliate-Links — du zahlst denselben Preis.</div>

  <div class="tldr"><strong>Kurz gesagt:</strong> Für {qm} m² solltest du einen Luftentfeuchter mit <strong>{e['liter']} Liter/Tag</strong> Entfeuchtungsleistung wählen. Betrieb kostet ca. {kosten_h_str} € pro Stunde — mit Hygrostat deutlich weniger, weil er bei Zielfeuchte abschaltet.</p></div>

  <h2>Wie viel Liter/Tag für {qm} m²?</h2>
  <p>{e['hinweis']} Als Orientierung gelten <strong>{e['liter']} Liter/Tag</strong>. Aufschlagen solltest du bei Kellern, Erdgeschoss, viel Wäschetrocknen oder nach einem Wasserschaden. Grundlagen: <a href="/guide/luftentfeuchter-ratgeber.html">Luftentfeuchter-Ratgeber</a>.</p>

  <h2>Empfohlenes Gerät für {qm} m²</h2>
  <div class="rec">
    <span class="badge">Luftentfeuchter · {e['liter']} L/Tag</span>
    <p style="margin:8px 0 4px;">Ein <strong>{e['liter']}-Liter-Kompressor-Luftentfeuchter</strong> mit Hygrostat passt für ein {e['raumtyp']}. Der Hygrostat schaltet bei Zielfeuchte automatisch ab — das spart am meisten Strom. Wir testen nicht selbst; die Auswahl fasst öffentliche Tests zusammen.</p>
    <p style="margin:4px 0 8px;font-size:13.5px;"><span style="color:#177245;">✓ Gegen Schimmel &amp; Feuchte &nbsp; ✓ Mit Hygrostat sparsam</span> &nbsp; <span style="color:#9a3412;">✕ Erzeugt etwas Betriebsgeräusch</span></p>
    <a style="display:inline-block;background:#f59e0b;color:#1a2733;font-weight:800;padding:9px 16px;border-radius:8px;text-decoration:none;font-size:14px;" href="{amazon(e['suchbegriff'])}" target="_blank" rel="sponsored noopener">Preis auf Amazon.de ansehen →</a>
  </div>

  <h2>Was kostet der Betrieb bei {qm} m²?</h2>
  <p>Ein Kompressor-Luftentfeuchter zieht ca. {WATT} W, also rund <strong>{kosten_h_str} € pro Stunde</strong> (0,30 €/kWh Rechenbasis). Mit Hygrostat läuft er nur, bis die Zielfeuchte erreicht ist — real also deutlich günstiger als Dauerbetrieb. Mehr: <a href="/guide/klimaanlage-stromkosten.html">Stromkosten-Ratgeber</a>.</p>

  <h2>Häufige Fragen</h2>
  {faq_html}

  <div class="cta-box">
    <p style="margin-bottom:12px;"><strong>Passende Luftentfeuchter für {qm} m² auf Amazon.de</strong> — auf Liter/Tag und Hygrostat achten:</p>
    <a class="btn" href="{amazon('luftentfeuchter')}" target="_blank" rel="sponsored noopener">Luftentfeuchter ansehen →</a>
  </div>

  <div class="related">
    <strong>Weitere Ratgeber</strong>
    <a href="/guide/luftentfeuchter-ratgeber.html">Luftentfeuchter gegen Schimmel & feuchte Luft →</a>
    <a href="/guide/klimaanlage-vs-luftkuehler.html">Klimaanlage vs. Luftkühler →</a>
    <a href="/guide/klimaanlage-stromkosten.html">Was kostet der Betrieb an Strom? →</a>
  </div>
</article>
</div>

<footer>
  <p><a href="/">← Zurück zum EcoBack Hitzewelle-Ratgeber</a></p>
  <p style="margin-top:8px;">Als Amazon-Partner verdient EcoBack an qualifizierten Käufen.</p>
</footer>
{TRACK}
</body>
</html>
"""

def main():
    data = json.load(open(os.path.join(ROOT, "tools", "content_entfeuchter_qm.json"), encoding="utf-8"))
    outdir = os.path.join(SITE, "guide")
    made = []
    for e in data["entries"]:
        slug, html = page(e)
        m = re.search(r'<script type="application/ld\+json">(.*?)</script>', html, re.S)
        json.loads(m.group(1))
        open(os.path.join(outdir, f"{slug}.html"), "w", encoding="utf-8").write(html)
        made.append(slug)
    print(f"generated {len(made)} entfeuchter pages: " + ", ".join(made))

if __name__ == "__main__":
    main()
