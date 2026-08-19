#!/usr/bin/env python3
"""Programmatic page generator: "Welche Klimaanlage für X m²?"

Reads tools/content_roomsize.json and emits one fully-templated guide page per
room size into site/guide/klimaanlage-<qm>-qm.html — each with GA4, affiliate
links (tag=getecoback-21), click tracking, TL;DR, FAQ and Article+BreadcrumbList
+FAQPage JSON-LD. This is the automation for category expansion: add an entry to
the JSON (or add a whole new *.json + a sibling generator) and re-run.

Every amazon.de link is model-keyed (search by model name) — no fabricated ASINs,
resilient to stock changes. Cooling figures are honest rules of thumb, marked "ca."

Usage: python tools/gen_roomsize.py
"""
import datetime
import os, re, json

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, "site")
GA4 = "G-E2V0Q9SJ9V"
TAG = "getecoback-21"
BASE = "https://getecoback.com"
PRICE_KWH = 0.30  # Rechenbasis, im Text als solche gekennzeichnet

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
    slug = f"klimaanlage-{qm}-qm"
    url = f"{BASE}/guide/{slug}.html"
    title = f"Klimaanlage für {qm} m²: BTU, Modell-Tipps & Stromkosten 2026"
    desc = (f"Welche Klimaanlage für {qm} m²? Empfohlen: {e['btu']} BTU. "
            f"Mit Modell-Tipp, Stromkosten & Kauf-Checkliste für dein {e['raumtyp']} (2026).")
    if len(desc) > 160:
        desc = (f"Welche Klimaanlage für {qm} m²? Empfohlen: {e['btu']} BTU. "
                f"Mit Modell-Tipp, Stromkosten & Kauf-Checkliste (Ratgeber 2026).")
    kosten_h = round(e["watt"] / 1000 * PRICE_KWH, 2)
    kosten_h_str = f"{kosten_h:.2f}".replace(".", ",")
    # ~8 h/Nacht, 30 Tage, real ~65% Auslastung
    kosten_monat = round(e["watt"] / 1000 * PRICE_KWH * 8 * 30 * 0.65)
    kosten_nacht = round(e["watt"] / 1000 * PRICE_KWH * 8 * 0.65, 2)
    kosten_nacht_str = f"{kosten_nacht:.2f}".replace(".", ",")
    # The two German buying questions that depend on room size: small rooms are
    # bedrooms (noise decides), large rooms raise the monoblock-vs-split
    # question (a PortaSplit costs more but halves the noise indoors).
    schlafzimmer = qm <= 25
    faqs = [
        (f"Wie viel BTU brauche ich für {qm} m²?",
         f"Als Faustregel {e['btu']} BTU. Bei viel Sonneneinstrahlung, hoher Decke "
         f"oder Dachlage eher am oberen Ende planen."),
        (f"Was kostet der Betrieb bei {qm} m² an Strom?",
         f"Ein passendes Gerät zieht ca. {e['watt']} W, das sind rund {kosten_h_str} € "
         f"pro Stunde (bei 0,30 €/kWh). Real liegst du bei ~{kosten_monat} € im Hitzemonat, "
         f"weil der Kompressor bei erreichter Temperatur heruntertaktet."),
        (f"Welches Modell passt für {qm} m²?",
         f"Für ein {e['raumtyp']} wird {e['modell']} häufig empfohlen. {e['hinweis']}"),
        (f"Was kostet eine Nacht Kühlung bei {qm} m²?",
         f"Rund {kosten_nacht_str} € — {e['watt']} W × 8 Stunden × 0,30 €/kWh, mit realem "
         f"Kompressor-Takt von etwa 65 Prozent. Ohne dichte Fensterabdichtung läuft das Gerät "
         f"gegen die zurückströmende Warmluft an und die Nacht kostet bis zum Doppelten."),
    ] + ([
        (f"Wie laut darf eine Klimaanlage im Schlafzimmer sein?",
         "Zum Schlafen gelten rund 50 dB(A) als Grenze — das leiseste Monoblock-Gerät im "
         "Stiftung-Warentest-Umfeld (De'Longhi PAC N90 ECO Silent) liegt im Silent-Modus "
         "darunter, viele Standardgeräte bei 60 dB und mehr. Alternativ: vorkühlen per Timer "
         "und zum Einschlafen ausschalten."),
    ] if schlafzimmer else [
        (f"Monoblock oder Split ohne Kernbohrung für {qm} m²?",
         f"Ab dieser Raumgröße lohnt der Vergleich: Ein Quick-Connect-Split wie der Midea "
         f"PortaSplit kostet mehr, ist aber drinnen deutlich leiser und effizienter, weil der "
         f"Kompressor draußen hängt. Der Monoblock bleibt die günstigere und flexiblere Wahl "
         f"für gelegentliche Hitzewellen."),
    ])
    faq_html = "\n  ".join(
        f'<p><strong>{q}</strong><br>{a}</p>' for q, a in faqs)
    graph = [
        {"@type": "Article", "headline": title, "description": desc,
         "mainEntityOfPage": url, "inLanguage": "de",
         "datePublished": "2026-07-10", "dateModified": TODAY,
         "author": {"@type": "Organization", "name": "EcoBack", "url": f"{BASE}/"},
         "publisher": {"@type": "Organization", "name": "EcoBack", "url": f"{BASE}/"}},
        {"@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "EcoBack Hitzewelle-Ratgeber", "item": f"{BASE}/"},
            {"@type": "ListItem", "position": 2, "name": "Ratgeber", "item": f"{BASE}/#guides"},
            {"@type": "ListItem", "position": 3, "name": f"Klimaanlage für {qm} m²", "item": url}]},
        {"@type": "FAQPage", "mainEntity": [
            {"@type": "Question", "name": q,
             "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faqs]},
    ]
    if schlafzimmer:
        extra_section = f"""  <h2>Schlafzimmer: Auf die Lautstärke achten</h2>
  <p>Räume dieser Größe sind meistens Schlafzimmer — und nachts entscheidet nicht die Kühlleistung, sondern der Geräuschpegel. Zum Schlafen gelten rund <strong>50 dB(A)</strong> als Obergrenze; Standard-Monoblocks liegen bei 60 dB und mehr, Silent-Modelle darunter. Zwei Strategien funktionieren: ein leises Gerät im Nachtmodus durchlaufen lassen, oder per Timer vorkühlen und zum Einschlafen abschalten. Mehr dazu: <a href="/guide/beste-tragbare-klimaanlage-schlafzimmer.html">die leisesten Geräte fürs Schlafzimmer</a> und <a href="/guide/bei-hitze-schlafen.html">Schlafen bei Hitze</a>.</p>
"""
    else:
        extra_section = f"""  <h2>Ab {qm} m²: Monoblock oder Split ohne Kernbohrung?</h2>
  <p>Je größer der Raum, desto eher lohnt der Blick auf Quick-Connect-Splits wie den Midea PortaSplit: Kompressor draußen heißt <strong>deutlich leiser drinnen und spürbar effizienter</strong> — bei höherem Preis und nötigem Stellplatz vor dem Fenster. Für gelegentliche Hitzewellen bleibt der Monoblock die flexible Wahl, für den ganzen Sommer im {e['raumtyp']} rechnet sich der Split schneller. Der ehrliche Vergleich: <a href="/guide/portasplit-vs-monoblock.html">PortaSplit vs. Monoblock</a> und <a href="/guide/split-klimaanlage-ohne-kernbohrung.html">Split ohne Kernbohrung</a>.</p>
"""
    jsonld = json.dumps({"@context": "https://schema.org", "@graph": graph}, ensure_ascii=False)
    html = f"""<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{url}">
<link rel="alternate" hreflang="de" href="{url}">
<meta property="og:type" content="article">
<meta property="og:title" content="Welche Klimaanlage für {qm} m²?">
<meta property="og:description" content="BTU-Empfehlung, Stromkosten und passendes Modell für {qm} m².">
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
    <h1>Welche Klimaanlage für {qm} m²?</h1>
    <p>BTU-Empfehlung, Stromkosten und das passende Modell für dein {e['raumtyp']}.</p>
  </div>
</header>

<div class="wrap">
<article>
  <p>Du suchst eine tragbare Klimaanlage für einen Raum mit rund {qm} m²? Die wichtigste Frage ist die richtige Kühlleistung (BTU): zu wenig, und das Gerät kommt nie hinterher; zu viel ist rausgeworfenes Geld und unnötig laut. Hier die konkrete Empfehlung für {qm} m².</p>

  <div class="disclosure">Als Amazon-Partner verdient EcoBack an qualifizierten Käufen. Produktlinks unten sind Affiliate-Links — du zahlst denselben Preis.</div>

  <div class="tldr"><strong>Kurz gesagt:</strong> Für {qm} m² solltest du eine Klimaanlage mit <strong>{e['btu']} BTU</strong> wählen. Ein häufig empfohlenes Modell dieser Klasse ist <strong>{e['modell']}</strong>. Rechne mit rund {kosten_h_str} € Stromkosten pro Stunde bzw. ~{kosten_monat} € im Hitzemonat.</p></div>

  <h2>Wie viel BTU für {qm} m²?</h2>
  <p>{e['hinweis']} Als Orientierung gelten für {qm} m² <strong>{e['btu']} BTU</strong>. Aufschlagen solltest du bei starker Sonneneinstrahlung (Süd-/Westfenster), hohen Decken oder Dachgeschoss-Lage. Die vollständige Tabelle findest du im <a href="/guide/wie-viel-btu-brauche-ich.html">BTU-Ratgeber nach Raumgröße</a>.</p>

  <h2>Empfohlenes Modell für {qm} m²</h2>
  <div class="rec">
    <span class="badge">{e['rolle']} · {e['btu']} BTU</span>
    <p style="margin:8px 0 4px;"><strong>{e['modell']}</strong> — passend dimensioniert für ein {e['raumtyp']}. Wird in unabhängigen deutschen Tests und Amazon-Bestsellern regelmäßig genannt. Wir testen nicht selbst; die Auswahl fasst öffentliche Tests zusammen.</p>
    <p style="margin:4px 0 8px;font-size:13.5px;"><span style="color:#177245;">✓ Richtig dimensioniert für {qm}&nbsp;m² &nbsp; ✓ Ohne Installation</span> &nbsp; <span style="color:#9a3412;">✕ Abluftschlauch/Fensterabdichtung nötig</span></p>
    <a style="display:inline-block;background:#f59e0b;color:#1a2733;font-weight:800;padding:9px 16px;border-radius:8px;text-decoration:none;font-size:14px;" href="{amazon(e['suchbegriff'])}" target="_blank" rel="sponsored noopener">Preis auf Amazon.de ansehen →</a>
  </div>

  <h2>Was kostet die Kühlung von {qm} m²?</h2>
  <p>Ein für {qm} m² passendes Gerät zieht ca. {e['watt']} W. Bei 0,30 €/kWh (Rechenbasis — setze deinen Tarif ein) sind das rund <strong>{kosten_h_str} € pro Stunde</strong>. Über einen Hitzemonat (ca. 8 Std./Nacht, Kompressor taktet herunter) liegst du real bei etwa <strong>{kosten_monat} €</strong>. Spartipps im <a href="/guide/klimaanlage-stromkosten.html">Stromkosten-Ratgeber</a>.</p>

  <h3>Die Kosten im Überblick</h3>
  <table style="width:100%;border-collapse:collapse;margin:10px 0 16px;font-size:14.5px;">
    <tr><th style="text-align:left;padding:7px 6px;border-bottom:2px solid #e4ebf0;">Zeitraum</th><th style="text-align:left;padding:7px 6px;border-bottom:2px solid #e4ebf0;">Rechnung ({e['watt']} W, 0,30 €/kWh, ~65 % Takt)</th><th style="text-align:left;padding:7px 6px;border-bottom:2px solid #e4ebf0;">Kosten</th></tr>
    <tr><td style="padding:7px 6px;border-bottom:1px solid #eef2f5;">1 Stunde Volllast</td><td style="padding:7px 6px;border-bottom:1px solid #eef2f5;">{e['watt']} W ÷ 1.000 × 0,30 €</td><td style="padding:7px 6px;border-bottom:1px solid #eef2f5;"><strong>{kosten_h_str} €</strong></td></tr>
    <tr><td style="padding:7px 6px;border-bottom:1px solid #eef2f5;">1 Nacht (8 h)</td><td style="padding:7px 6px;border-bottom:1px solid #eef2f5;">× 8 h × 0,65</td><td style="padding:7px 6px;border-bottom:1px solid #eef2f5;"><strong>{kosten_nacht_str} €</strong></td></tr>
    <tr><td style="padding:7px 6px;border-bottom:1px solid #eef2f5;">1 Hitzemonat (30 Nächte)</td><td style="padding:7px 6px;border-bottom:1px solid #eef2f5;">× 30</td><td style="padding:7px 6px;border-bottom:1px solid #eef2f5;"><strong>~{kosten_monat} €</strong></td></tr>
    <tr><td style="padding:7px 6px;">Ohne Fensterabdichtung</td><td style="padding:7px 6px;">Warmluft strömt zurück, Gerät taktet kaum</td><td style="padding:7px 6px;"><strong>bis ×2</strong></td></tr>
  </table>
  <p>Die letzte Zeile ist der am meisten unterschätzte Posten: Ohne dichtes Fenster kühlt das Gerät gegen die eigene Abwärme an. Mit dynamischem Stromtarif lässt sich zusätzlich <a href="/guide/strompreis-radar.html">mittags billig vorkühlen</a>.</p>

{extra_section}
  <h2>Für Mieter</h2>
  <p>Ein Monoblock braucht weder Bohrung noch Außeneinheit — aufstellen, Schlauch ins Fenster, fertig. Damit ist er in der Mietwohnung in aller Regel <a href="/guide/klimaanlage-mietwohnung.html">ohne Zustimmung des Vermieters</a> nutzbar; erst ein Split-Gerät mit Wandmontage braucht eine Erlaubnis.</p>

  <h2>Nicht vergessen: Fensterabdichtung</h2>
  <p>Jede tragbare Klimaanlage muss die warme Luft über einen Schlauch nach draußen leiten. Bei deutschen Dreh-Kipp-Fenstern brauchst du eine passende <a href="{amazon('klimaanlage+fensterabdichtung')}" target="_blank" rel="sponsored noopener">Fensterabdichtung</a> — sonst strömt warme Luft zurück und das Gerät läuft doppelt so lange. Details: <a href="/guide/klimaanlage-kippfenster.html">Klimaanlage am Kippfenster abdichten</a>.</p>

  <h2>Häufige Fragen</h2>
  {faq_html}

  <div class="cta-box">
    <p style="margin-bottom:12px;"><strong>Passende Klimaanlagen für {qm} m² auf Amazon.de ansehen</strong> — nach BTU und Preis filterbar:</p>
    <a class="btn" href="{amazon('tragbare+klimaanlage')}" target="_blank" rel="sponsored noopener">Klimaanlagen vergleichen →</a>
  </div>

  <div class="related">
    <strong>Weitere Ratgeber</strong>
    <a href="/guide/wie-viel-btu-brauche-ich.html">Wie viel BTU brauche ich? →</a>
    <a href="/guide/beste-tragbare-klimaanlage-hitzewelle.html">Beste tragbare Klimaanlage 2026 →</a>
    <a href="/guide/klimaanlage-stromkosten.html">Was kostet eine Klimaanlage an Strom? →</a>
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
    return slug, html

def main():
    data = json.load(open(os.path.join(ROOT, "tools", "content_roomsize.json"), encoding="utf-8"))
    outdir = os.path.join(SITE, "guide")
    made = []
    for e in data["entries"]:
        slug, html = page(e)
        # validate embedded JSON-LD before writing
        m = re.search(r'<script type="application/ld\+json">(.*?)</script>', html, re.S)
        json.loads(m.group(1))
        open(os.path.join(outdir, f"{slug}.html"), "w", encoding="utf-8").write(html)
        made.append(slug)
    print(f"generated {len(made)} room-size pages: " + ", ".join(made))

if __name__ == "__main__":
    main()
