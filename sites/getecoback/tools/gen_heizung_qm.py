#!/usr/bin/env python3
"""Programmatic page generator #2: "Welche Heizleistung für X m²?"

Second data-driven category, mirroring gen_roomsize.py — demonstrates the
pipeline scaling to a new category with minimal effort. Reads
tools/content_heizung_qm.json and emits site/guide/heizung-<qm>-qm.html, fully
templated (GA4, affiliate links tag=getecoback-21, click tracking, TL;DR, FAQ,
Article+BreadcrumbList+FAQPage JSON-LD).

Honest rules of thumb (ca. 60–100 W/m² Infrarot je nach Dämmung); model links by
keyword search, no fabricated ASINs. Usage: python tools/gen_heizung_qm.py
"""
import datetime
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
  footer { text-align:center; color:#5b6b78; font-size:13px; padding:30px 20px 50px; }
  footer a, a { color:#0f6ba8; }"""

TRACK = ('<script>document.addEventListener("click",function(e){var t=e.target;'
         'while(t&&t.tagName!=="A"){t=t.parentElement;}if(t&&t.href&&t.href.indexOf'
         '("amazon.de")>-1&&typeof gtag==="function"){gtag("event","affiliate_click",'
         '{link_url:t.href,page_path:location.pathname});}});</script>')

def amazon(term):
    return f"https://www.amazon.de/s?k={term}&amp;tag={TAG}"

TODAY = datetime.date.today().isoformat()


def page(e):
    qm = e["qm"]
    slug = f"heizung-{qm}-qm"
    url = f"{BASE}/guide/{slug}.html"
    title = f"Heizung für {qm} m²: Watt-Bedarf, Infrarot & Kosten (2026)"
    desc = (f"Welche Heizleistung für {qm} m²? Empfohlen: {e['watt']} W. "
            f"Watt-Faustregel, Stromkosten & passende Infrarotheizung für dein {e['raumtyp']} (2026).")
    kosten_h = round(e["wref"] / 1000 * PRICE_KWH, 2)
    kosten_h_str = f"{kosten_h:.2f}".replace(".", ",")
    # Same rule as /guide/infrarotheizung-watt-rechner.html and the MCP tool
    # heizleistung_watt: area × 60/80/100 W/m², rounded to 10 W.
    w_gut, w_mittel, w_schlecht = (int(round(qm * k / 10) * 10) for k in (60, 80, 100))
    def de(n):
        return f"{n:,}".replace(",", ".")
    # A heating season, with the assumption stated so anyone can recompute it:
    # 5 h/day, thermostat cycling at ~40 % of full load, 150 days.
    saison = round(e["wref"] / 1000 * PRICE_KWH * 5 * 0.4 * 150)
    zwei_panels = w_schlecht > 2000
    panel_hint = (f" Über 2.000 W solltest du auf <strong>zwei Panels</strong> aufteilen "
                  f"(z. B. 2 × {de(int(round(w_schlecht / 2 / 50) * 50))} W an verschiedenen Wänden) — "
                  f"ein einzelnes Panel dieser Größe gibt es kaum, und zwei verteilen die Wärme besser."
                  if zwei_panels else "")
    faqs = [
        (f"Wie viel Watt Heizleistung brauche ich für {qm} m²?",
         f"Als Faustregel {e['watt']} W (rund 60–100 W pro m² je nach Dämmung). "
         f"Gut gedämmte Neubauten kommen mit weniger aus, Altbau braucht mehr."),
        (f"Was kostet Heizen mit {e['wref']} W an Strom?",
         f"Bei voller Leistung zieht ein {e['wref']}-W-Gerät rund {kosten_h_str} € pro Stunde "
         f"(bei 0,30 €/kWh). Ein Thermostat senkt das deutlich, weil nicht durchgehend geheizt wird."),
        (f"Reicht eine Infrarotheizung als alleinige Heizung für {qm} m²?",
         f"Für {qm} m² als Zusatz- oder Übergangsheizung ja. {e['hinweis']} Als alleinige "
         f"Heizung im tiefen Winter ist eine Gebäude-Wärmepumpe meist wirtschaftlicher."),
        (f"Was kostet eine Heizsaison für {qm} m²?",
         f"Mit {e['wref']} W, 5 Heizstunden am Tag, Thermostat-Takt von rund 40 Prozent und 150 Heiztagen "
         f"kommst du auf etwa {de(saison)} € pro Saison (0,30 €/kWh). Rechne mit deinem eigenen Arbeitspreis "
         f"nach: Watt ÷ 1000 × Preis × Stunden × Takt × Tage."),
        (f"Infrarot, Heizlüfter oder Klimaanlage mit Heizfunktion für {qm} m²?",
         f"Der Heizlüfter ist am billigsten in der Anschaffung und am teuersten im Betrieb — gut für "
         f"kurzes Aufheizen im Bad. Infrarot lohnt sich, wenn der Raum täglich mehrere Stunden warm sein soll. "
         f"Eine Klimaanlage mit Heizfunktion arbeitet als Wärmepumpe und braucht für dieselbe Wärme deutlich "
         f"weniger Strom, kostet in der Anschaffung aber ein Vielfaches."),
    ]
    faq_html = "\n  ".join(f'<p><strong>{q}</strong><br>{a}</p>' for q, a in faqs)
    graph = [
        {"@type": "Article", "headline": title, "description": desc, "mainEntityOfPage": url,
         "inLanguage": "de", "datePublished": "2026-07-10", "dateModified": TODAY,
         "author": {"@type": "Organization", "name": "EcoBack", "url": f"{BASE}/"},
         "publisher": {"@type": "Organization", "name": "EcoBack", "url": f"{BASE}/"}},
        {"@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "EcoBack Hitzewelle-Ratgeber", "item": f"{BASE}/"},
            {"@type": "ListItem", "position": 2, "name": "Heizen", "item": f"{BASE}/kategorie/heizen.html"},
            {"@type": "ListItem", "position": 3, "name": f"Heizleistung für {qm} m²", "item": url}]},
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
<meta property="og:title" content="Welche Heizleistung für {qm} m²?">
<meta property="og:description" content="Watt-Empfehlung, Stromkosten und passende Infrarotheizung für {qm} m².">
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
    <h1>Welche Heizleistung für {qm} m²?</h1>
    <p>Watt-Faustregel, Stromkosten und die passende Infrarotheizung für dein {e['raumtyp']}.</p>
  </div>
</header>

<div class="wrap">
<article>
  <p>Du willst einen Raum mit rund {qm} m² elektrisch beheizen — mit Infrarotheizung oder Heizlüfter — und fragst dich, wie viel Watt du brauchst? Zu wenig, und es wird nie warm; zu viel kostet unnötig Strom. Hier die konkrete Empfehlung für {qm} m².</p>

  <div class="disclosure">Als Amazon-Partner verdient EcoBack an qualifizierten Käufen. Produktlinks unten sind Affiliate-Links — du zahlst denselben Preis.</div>

  <div class="tldr"><strong>Kurz gesagt:</strong> Für {qm} m² solltest du rund <strong>{e['watt']} W</strong> Heizleistung einplanen (ca. 60–100 W pro m² je nach Dämmung). Bei voller Leistung sind das etwa {kosten_h_str} € Stromkosten pro Stunde — mit Thermostat deutlich weniger.</p></div>

  <h2>Wie viel Watt für {qm} m²?</h2>
  <p>{e['hinweis']} Als Orientierung gelten <strong>{e['watt']} W</strong>. Aufschlagen solltest du bei schlechter Dämmung (Altbau), hohen Decken oder vielen Fensterflächen. Mehr zum effizienten Heizen: <a href="/guide/infrarotheizung-ratgeber.html">Infrarotheizung-Ratgeber</a> und <a href="/guide/heizluefter-stromsparend.html">Heizlüfter stromsparend</a>.</p>

  <h3>Watt nach Dämmstandard</h3>
  <table style="width:100%;border-collapse:collapse;margin:10px 0 16px;font-size:14.5px;">
    <tr><th style="text-align:left;padding:7px 6px;border-bottom:2px solid #e4ebf0;">Dämmung</th><th style="text-align:left;padding:7px 6px;border-bottom:2px solid #e4ebf0;">Rechenwert</th><th style="text-align:left;padding:7px 6px;border-bottom:2px solid #e4ebf0;">für {qm} m²</th></tr>
    <tr><td style="padding:7px 6px;border-bottom:1px solid #eef2f5;">Gut (Neubau, gedämmt)</td><td style="padding:7px 6px;border-bottom:1px solid #eef2f5;">60 W/m²</td><td style="padding:7px 6px;border-bottom:1px solid #eef2f5;"><strong>{de(w_gut)} W</strong></td></tr>
    <tr><td style="padding:7px 6px;border-bottom:1px solid #eef2f5;">Mittel (Bestand)</td><td style="padding:7px 6px;border-bottom:1px solid #eef2f5;">80 W/m²</td><td style="padding:7px 6px;border-bottom:1px solid #eef2f5;"><strong>{de(w_mittel)} W</strong></td></tr>
    <tr><td style="padding:7px 6px;">Schlecht (Altbau)</td><td style="padding:7px 6px;">100 W/m²</td><td style="padding:7px 6px;"><strong>{de(w_schlecht)} W</strong></td></tr>
  </table>
  <p>Die Tabelle ist dieselbe Rechnung wie im <a href="/guide/infrarotheizung-watt-rechner.html">Watt-Rechner</a>: Fläche × Wert je Dämmstandard.{panel_hint}</p>

  <h2>Empfohlenes Gerät für {qm} m²</h2>
  <div class="rec">
    <span class="badge">Infrarotheizung · {e['watt']} W</span>
    <p style="margin:8px 0 4px;">Eine <strong>Infrarotheizung mit rund {e['wref']} W</strong> (ggf. auf zwei Panels verteilt) passt für ein {e['raumtyp']}. Achte auf ein integriertes oder separates Thermostat — das spart im Betrieb am meisten. Wir testen nicht selbst; die Auswahl fasst öffentliche Tests zusammen.</p>
    <p style="margin:4px 0 8px;font-size:13.5px;"><span style="color:#177245;">✓ Schnell warm &nbsp; ✓ Keine Installation</span> &nbsp; <span style="color:#9a3412;">✕ Strom teurer als Wärmepumpe</span></p>
    <a style="display:inline-block;background:#f59e0b;color:#1a2733;font-weight:800;padding:9px 16px;border-radius:8px;text-decoration:none;font-size:14px;" href="{amazon(e['suchbegriff'])}" target="_blank" rel="sponsored noopener">Preis auf Amazon.de ansehen →</a>
  </div>

  <h2>Was kostet das Heizen von {qm} m²?</h2>
  <p>Ein {e['wref']}-W-Gerät kostet bei voller Leistung rund <strong>{kosten_h_str} € pro Stunde</strong> (0,30 €/kWh Rechenbasis). Mit Thermostat läuft es aber nicht durchgehend — realistisch liegst du je nach Zieltemperatur bei 40–70 % davon. Spartipps im <a href="/guide/klimaanlage-stromkosten.html">Stromkosten-Ratgeber</a>.</p>
  <p><strong>Und über eine ganze Saison?</strong> Mit 5 Heizstunden am Tag, einem Thermostat-Takt von rund 40 Prozent und 150 Heiztagen landest du bei etwa <strong>{de(saison)} €</strong>. Das sind ausdrücklich Annahmen, keine Messung — setz deine eigenen Zahlen ein: {e['wref']} W ÷ 1000 × 0,30 € × 5 h × 0,4 × 150 Tage.</p>
  <p><strong>Ein Punkt, der oft übersehen wird:</strong> Ein normaler Schuko-Stromkreis ist mit 16 A abgesichert, also rund 3.500 W. Ein Heizgerät allein ist unkritisch, aber Heizgerät plus Wasserkocher plus Mikrowelle am selben Stromkreis fliegt zuverlässig raus. Bei mehreren Panels auf verschiedene Stromkreise verteilen.</p>

  <h2>Häufige Fragen</h2>
  {faq_html}

  <div class="cta-box">
    <p style="margin-bottom:12px;"><strong>Passende Infrarotheizungen für {qm} m² auf Amazon.de</strong> — auf Watt und Thermostat achten:</p>
    <a class="btn" href="{amazon('infrarotheizung+mit+thermostat')}" target="_blank" rel="sponsored noopener">Infrarotheizungen ansehen →</a>
  </div>

  <div class="related">
    <strong>Weitere Ratgeber</strong>
    <a href="/guide/infrarotheizung-watt-rechner.html">Infrarotheizung Watt-Rechner: Leistung berechnen →</a>
    <a href="/guide/infrarotheizung-ratgeber.html">Infrarotheizung: Für wen sie sich lohnt →</a>
    <a href="/guide/heizluefter-stromsparend.html">Heizlüfter stromsparend →</a>
    <a href="/guide/klimaanlage-mit-heizfunktion.html">Klimaanlage mit Heizfunktion →</a>
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
    data = json.load(open(os.path.join(ROOT, "tools", "content_heizung_qm.json"), encoding="utf-8"))
    outdir = os.path.join(SITE, "guide")
    made = []
    for e in data["entries"]:
        slug, html = page(e)
        m = re.search(r'<script type="application/ld\+json">(.*?)</script>', html, re.S)
        json.loads(m.group(1))
        open(os.path.join(outdir, f"{slug}.html"), "w", encoding="utf-8").write(html)
        made.append(slug)
    print(f"generated {len(made)} heizung pages: " + ", ".join(made))

if __name__ == "__main__":
    main()
