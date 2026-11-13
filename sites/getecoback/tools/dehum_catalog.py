"""Sourced alternatives on existing German purchase routes; no price/rating feed."""
import datetime as dt
import json
import re
from html import escape as e
from pathlib import Path
from urllib.parse import quote_plus
from agent_sources import citation_url

DATA = Path(__file__).resolve().parents[1] / 'data/dehum-catalog.json'

def load():
    data = json.loads(DATA.read_text())
    ids = set()
    for p in data['products']:
        if not re.fullmatch(r'[a-z0-9-]+', p['id']) or p['id'] in ids:
            raise ValueError('Invalid or duplicate catalog identity')
        ids.add(p['id'])
        if not citation_url(p['source']):
            raise ValueError('Unreviewed catalog source: ' + p['id'])
        if p.get('asin') and (p['id'] != 'comfee-mddf20' or p['asin'] != 'B07KJX6RDK'):
            raise ValueError('No newly guessed ASINs')
    return data

def block(slug, today=None, data=None):
    data = load() if data is None else data
    if slug not in data['pages']:
        return None
    age = ((today or dt.datetime.now(dt.timezone.utc).date()) - dt.date.fromisoformat(data['checked'])).days
    fresh = 0 <= age <= data['max_age_days']
    rows, cards = [], []
    for p in data['products']:
        anchor = 'modell-' + p['id']
        rows.append(f'<tr><th scope="row"><a href="#{anchor}">{e(p["name"])}</a></th>'
                    f'<td>{e(p["reason"])}</td><td>{e(p["variant"])}</td></tr>')
        source = f'<a href="{e(p["source"], quote=True)}">{e(p["source_label"])}</a>'
        evidence = (f'<h3 id="{anchor}">{e(p["name"])}</h3>'
                    f'<p><strong>{e(p["reason"])}</strong></p><p>{e(p["variant"])}</p>'
                    f'<p>{e(p["facts"])}</p><p><strong>Vor dem Kauf:</strong> {e(p["limit"])}</p>'
                    f'<p>Quelle: {source}</p>')
        # Static facts remain visible; stale/conflicting evidence removes only this catalog's commerce.
        if fresh and p['status'] == 'verified':
            href = ('https://www.amazon.de/dp/' + p['asin'] + '?tag=getecoback-21' if p.get('asin')
                    else 'https://www.amazon.de/s?k=' + quote_plus(p['query']) + '&tag=getecoback-21')
            label = 'Produktseite' if p.get('asin') else 'Modellsuche'
            action = (f'<p data-catalog-commerce><a class="eb-shop-btn" href="{e(href, quote=True)}" '
                      f'target="_blank" rel="sponsored nofollow noopener">{label} bei Amazon.de →</a>'
                      '<small>Anzeige · Preis, Variante und Lieferbarkeit beim Händler prüfen.</small></p>')
        else:
            action = '<p data-catalog-commerce>Quellenprüfung ausstehend. Prüfe die verlinkten Unterlagen vor einer Kaufentscheidung.</p>'
        cards.append(f'<div class="dc-card">{evidence}{action}</div>')
    return ('<!--EB_MODELS--><section class="eb-shop eb-models dc-catalog" id="eb-models" aria-labelledby="dc-title">'
            '<style>.dc-catalog{scroll-margin-top:100px}.dc-catalog .dc-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,290px),1fr));gap:16px}'
            '.dc-catalog .dc-card{padding:18px;border:1px solid #cfe0ea;border-radius:12px;background:#fff;min-width:0}'
            '.dc-catalog h3{margin:0 0 10px;color:#0a4d7a;font-size:19px;scroll-margin-top:180px}'
            '.dc-catalog p{font-size:15px;line-height:1.6}.dc-catalog a{overflow-wrap:anywhere}'
            '.dc-catalog small{display:block;margin-top:8px;color:#5b6b78}.dc-catalog table{width:100%;min-width:620px;font-size:14px}'
            '.dc-catalog th[scope="row"]{min-width:145px}'
            '.dc-catalog th,.dc-catalog td{vertical-align:top;padding:10px}.dc-table{overflow-x:auto;margin:16px 0}'
            '.dc-drain{scroll-margin-top:180px;padding:18px;border-left:4px solid #0a4d7a;background:#f2f7fa;border-radius:8px;margin:18px 0}'
            '.dc-drain li{margin:10px 0;font-size:15px;line-height:1.6}'
            '.dc-catalog :focus-visible{outline:3px solid #c77400;outline-offset:3px}</style>'
            '<div data-catalog-evidence><div class="eb-shop-h" role="heading" aria-level="2" id="dc-title">Sechs Luftentfeuchter: Unterschiede vor dem Kauf</div>'
            '<p>Du hast die Feuchte gemessen und brauchst ein Gerät? Vergleiche zuerst Bedienung, Ablauf und die genaue Modellvariante. '
            'Diese Auswahl erweitert die Möglichkeiten; sie ist keine Rangliste und kein eigener Gerätetest.</p>'
            '<p><strong>Deutschland:</strong> Händlerlinks führen zu Amazon.de. Für Österreich und die Schweiz Lieferung, Stecker, Garantie und Gesamtkosten separat prüfen.</p>'
            '<p>Bei ungeklärter Feuchte zuerst <a href="/guide/luftfeuchtigkeit-richtig-messen.html">richtig messen</a>; '
            'bei nassen Wänden oder Schimmel <a href="/guide/luftentfeuchter-gegen-schimmel.html">die Ursache klären</a>. '
            'Für kalte Räume <a href="/guide/luftentfeuchter-keller.html#kalter-keller">Betriebsgrenzen prüfen</a>; '
            'bei Wäsche <a href="/waeschetrockner-oder-luftentfeuchter.html#laundry-check">Kosten je Ladung vergleichen</a>.</p>'
            f'<p>Hersteller-/Anbieterquellen geprüft: {e(data["checked"])}. Keine Live-Preise oder garantierte Lieferbarkeit. '
            'Unterschiedliche Nennkapazitäten, Messbedingungen oder Quellen ergeben keinen Effizienzsieger.</p>'
            '<section class="dc-drain" id="ablauf-vor-kauf" aria-labelledby="dc-drain-title">'
            '<h3 id="dc-drain-title">Schlauchanschluss oder Pumpe: Passt der Ablauf zu deinem Raum?</h3>'
            '<p><strong>Ein Schlauchanschluss allein bestätigt keine Pumpe.</strong> '
            'Liegt dein Abfluss höher als der Geräteauslass, muss die Anleitung genau dieses Modells eine passende Lösung bestätigen. '
            'Fehlt eine Pumpenangabe, ist die Eignung für deinen Ablauf ungeklärt.</p>'
            '<ol><li><strong>Platz prüfen:</strong> Stellfläche und Freiräume aus der genauen Anleitung abgleichen. '
            'Auch der Tank muss zum Leeren erreichbar bleiben.</li>'
            '<li><strong>Wasserweg skizzieren:</strong> Geräteauslass, Schlauchverlauf und Zielablauf einzeichnen. '
            'Gefälle, Knicke und gegebenenfalls Förderhöhe mit der Anleitung abgleichen; nicht allein nach dem Anschlussfoto kaufen.</li>'
            '<li><strong>Lieferumfang klären:</strong> Schlauch, Adapter und Pumpe getrennt prüfen. '
            'Ohne bestätigte Schlauch- oder Pumpenlösung den vorgesehenen Tankbetrieb oder einen anderen geeigneten Standort prüfen; '
            'zuerst vorhandene Möglichkeiten prüfen.</li></ol>'
            '<p><strong>Konkretes Beispiel: MeacoDry Arete One 20L.</strong> '
            'Die UK-Herstellerseite nennt einen Schlauchadapter, keinen mitgelieferten Schlauch und eine separat verkaufte Pumpe '
            'für Entwässerung nach oben. Das bestätigt weder den deutschen Lieferumfang noch die Eignung der Arete Two 12L. '
            'Vor Bestellung die genaue deutsche Variante und ihre Anleitung abgleichen.</p>'
            '<p>Quelle: <a href="https://www.meaco.com/products/meacodry-arete-one-20l-dehumidifier-and-air-purifier">'
            'Meaco UK: Arete One 20L, Ablauf und separates Pumpenzubehör</a> · geprüft am 13.11.2026. '
            'Bei ungeklärter Feuchte bleibt Messen und Ursachenklärung der erste Schritt; ein Neukauf ist dann noch nicht begründet.</p>'
            '</section>'
            '<div class="dc-table" role="region" aria-label="Modellübersicht, horizontal scrollbar" tabindex="0"><table>'
            '<caption>Kaufgründe und genaue Varianten</caption>\n<thead><tr><th scope="col">Modell</th><th scope="col">Prüfen, wenn dir dies wichtig ist</th><th scope="col">Variante</th></tr></thead>'
            '<tbody>' + ''.join(rows) + '</tbody></table></div><div class="dc-grid">' + ''.join(cards) +
            '</div></div></section><!--/EB_MODELS-->\n')

def inject(html, slug):
    reviewed = block(slug)
    if reviewed is None:
        return html
    html = re.sub(r'<!--EB_MODELS-->.*?<!--/EB_MODELS-->\n?', '', html, flags=re.S)
    for marker in ('EB_CATALOG_ENTRY', 'EB_CATALOG_READING'):
        html = re.sub(r'<!--' + marker + r'-->.*?<!--/' + marker + r'-->', '', html, flags=re.S)
    anchor = '<!--/EB_BUYER-->'
    if html.count(anchor) != 1:
        raise ValueError('Catalog needs one preceding buyer decision: ' + slug)
    article = re.search(r'<article\b[^>]*>(.*?)</article\s*>', html, re.S)
    if not article or not article.start() < html.index('<!--EB_BUYER-->') < article.end():
        raise ValueError('Catalog needs an article containing the buyer decision: ' + slug)
    # Preserve both reading speeds without making the reader traverse the quiz
    # or every model card to reach the answer promised by the article title.
    entry = ('<!--EB_CATALOG_ENTRY--><nav class="dc-entry" aria-label="Ratgeber oder Modelle" '
             'style="display:flex;flex-wrap:wrap;gap:10px;margin:18px 0">'
             '<a href="#eb-catalog-reading" style="display:inline-flex;align-items:center;min-height:44px;'
             'padding:8px 12px;border:1px solid #7895a4;border-radius:6px;color:#0a4d7a;background:#fff;'
             'font-weight:700">Ratgeber direkt lesen</a>'
             '<a href="#eb-models" style="display:inline-flex;align-items:center;min-height:44px;'
             'padding:8px 12px;border:1px solid #7895a4;border-radius:6px;color:#0a4d7a;background:#fff;'
             'font-weight:700">Modellvarianten vergleichen</a></nav><!--/EB_CATALOG_ENTRY-->')
    reading = ('<!--EB_CATALOG_READING--><div id="eb-catalog-reading" '
               'style="scroll-margin-top:150px" tabindex="-1"></div><!--/EB_CATALOG_READING-->')
    html = html.replace('<!--EB_BUYER-->', entry + '<!--EB_BUYER-->', 1)
    # The existing on-page builder replaces only EB_TOC, so this destination
    # survives that rebuild. Minimal fixtures without a TOC use the buyer end.
    reading_anchor = '<!--/EB_TOC-->' if '<!--/EB_TOC-->' in article.group(1) else anchor
    # Keep the preceding builder's owned newline next to its closing marker;
    # otherwise its replacement leaves an extra blank line on every build.
    article = re.search(r'<article\b[^>]*>(.*?)</article\s*>', html, re.S)
    preceding = re.search(re.escape(reading_anchor) + r'\n?', article.group(1))
    position = article.start(1) + preceding.end()
    html = html[:position] + reading + html[position:]
    # Keep the catalog outside all replaceable buyer/contents regions, after
    # authored advice and before the ordinary FAQ. No product fact/date changes.
    article = re.search(r'<article\b[^>]*>(.*?)</article\s*>', html, re.S)
    faq = re.search(r'<h2\b[^>]*>\s*Häufige Fragen(?:\s+[^<]*)?\s*</h2>', article.group(1))
    position = article.start(1) + faq.start() if faq else article.end(1)
    return html[:position] + reviewed + html[position:]

def evidence_html(source):
    """Extract the same public evidence, excluding all shopping, styles and chrome."""
    match = re.search(r'<!--EB_MODELS-->(.*?)<!--/EB_MODELS-->', source, re.S)
    if not match or 'data-catalog-evidence' not in match[1]:
        return ''
    content = match[1].split('<div data-catalog-evidence>', 1)[1].rsplit('</div></section>', 1)[0]
    return re.sub(r'<p data-catalog-commerce>.*?</p>', '', content, flags=re.S)
