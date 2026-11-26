"""Sourced alternatives on existing German purchase routes; no price/rating feed."""
import datetime as dt
import json
import re
from html import escape as e
from pathlib import Path
from urllib.parse import quote, quote_plus, urlencode
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
        if identity := p.get('identity'):
            dt.date.fromisoformat(identity['checked'])
            sources = [identity, *identity['alternatives']]
            if retailer := identity.get('retailer'):
                dt.date.fromisoformat(retailer['checked'])
                sources.append(retailer)
            if not all(citation_url(row['source']) for row in sources):
                raise ValueError('Unreviewed model identity source: ' + p['id'])
        if p.get('asin') and (p['id'] != 'comfee-mddf20' or p['asin'] != 'B07KJX6RDK'):
            raise ValueError('No newly guessed ASINs')
    return data

def cellar_drain_route():
    target = 'https://getecoback.com/guide/luftentfeuchter-keller.html#ablauf-vor-kauf'
    title = 'Kellerentfeuchter: Schlauch über eine Schwelle oder Tankbetrieb?'
    reddit = 'https://www.reddit.com/submit?' + urlencode({'url':target, 'title':title}, quote_via=quote)
    return (
        '<h4 id="arete-schlauchmass">Arete One 20L und Two 12L: Welcher Schlauch passt?</h4>'
        '<p>Beide deutschen Anleitungen nennen für den Schwerkraftablauf einen Standard-Gartenschlauch mit '
        '<strong>12,5 mm Innendurchmesser</strong>. Der rechtwinklige Adapter sitzt im Tankdeckel. '
        'Den Schlauch separat einplanen und durchgehend abwärts ohne Knicke oder Blockaden verlegen.</p>'
        '<p>Die <a href="https://eu.meaco.com/products/meacodry-arete%C2%AE-pumpe-fur-alle-modelle">deutsche Meaco-Produktseite zur Arete-Pumpe</a> '
        'führt Arete One und Two in 20 L und 25 L auf. Die Arete Two 12L steht nicht auf dieser Liste. '
        'Für einen höheren Abfluss bei der Two 12L deshalb Tankbetrieb oder einen anderen Standort prüfen, bis der Hersteller eine passende Lösung bestätigt.</p>'
        '<p><a href="https://www.meaco.de/atlantis-media/files/german-meacodry-arete-one-20l-and-25l_1.pdf">Meaco-Anleitung One 20/25L (DE, S. 13)</a> · '
        '<a href="https://www.meaco.de/atlantis-media/files/aretetwo-10l12l-manual-de02-160424_1.pdf">Meaco-Anleitung Two 10/12L (DE, S. 14)</a> · '
        'geprüft am <time datetime="2026-11-23">23.11.2026</time>.</p>'
        '<h4 id="schlauch-ueber-schwelle">Abfluss unten, Schlauch über eine Schwelle?</h4>'
        '<p>Beim vorgesehenen Schwerkraftablauf zählt der ganze Schlauchweg. '
        'Steigt der Schlauch an einer Türschwelle kurz an, fehlt dort das nötige Gefälle, auch wenn der Zielablauf tiefer liegt. '
        'Prüfe einen anderen, durchgehend fallenden Weg nach Anleitung. Sonst nutze den vorgesehenen Tankbetrieb '
        'mit aktivem Tankalarm oder lass dir eine passende Pumpenlösung für dein genaues Modell bestätigen.</p>'
        '<p><strong>Beispiel mit 6 m waagerechtem Weg und 1,5 m Anstieg.</strong> '
        'Für die separate Kondensatpumpe zum MeacoDry Arete One 20L nennt das deutsche Angebot bis zu 2,5 m Förderhöhe '
        'und einen mitgelieferten Schlauch von 3 m. Der Anstieg liegt im Beispiel unter der genannten Förderhöhe. '
        'Schon das waagerechte Teilstück ist länger als der mitgelieferte Schlauch. '
        'Kläre für diese Strecke zulässigen Schlauch, Länge, Anschlüsse und Förderleistung gemeinsam mit dem Anbieter. '
        'Die beiden Angaben belegen keine Eignung einer Verlängerung. Bis zur Klärung Tankbetrieb oder einen anderen Standort prüfen.</p>'
        '<p>Quellen geprüft am <time datetime="2026-11-22">22.11.2026</time>. '
        'Deutscher Meaco-Vertrieb (AirSain). '
        '<a href="https://www.meaco.de/produkt/meaco-dry-arete-one-pumpe/">Separate Kondensatpumpe für Arete One 20L und 25L</a> · '
        '<a href="https://www.meaco.de/produkt/luftentfeuchter-meaco-arete-one-20-l-pumpe/">Arete One 20L in der Variante mit Pumpe</a>. '
        'Den Lieferumfang des eigenen Pakets separat prüfen.</p>'
        '<p>Reicht der vorhandene Tankbetrieb, kannst du ihn weiter nutzen. Bei nassen Wänden, möglichem Wassereintritt oder '
        'sichtbarem Schimmel zuerst <a href="/guide/luftentfeuchter-gegen-schimmel.html">die Feuchteursache klären</a>.</p>'
        f'<nav aria-label="Hinweis teilen"><a href="{e(target)}">Direktlink zum Ablauf-Check</a> · '
        f'<a href="{e(reddit)}" target="_blank" rel="noopener noreferrer">Auf Reddit teilen</a></nav>'
    )


def cold_room_note(evidence):
    if not evidence:
        return ''
    checked = dt.date.fromisoformat(evidence['checked'])
    return (
        f'<p><strong>Prüfwerte bei Kälte:</strong> {e(evidence["text"])} '
        f'Herstellerangaben geprüft am <time datetime="{checked.isoformat()}">{checked:%d.%m.%Y}</time>.</p>'
    )


BOSCH_FILTER_ID = 'bosch-dry-4000-aktivkohlefilter'
BOSCH_FILTER_TITLE = 'Ist der Aktivkohlefilter beim Bosch Dry 4000 dabei?'
BOSCH_FILTER_SUMMARY = 'Der Bosch Dry 4000 D4000-EU hat einen integrierten Staubfilter. Bosch führt den zusätzlichen HEPA-/Aktivkohlefilter separat als Dry-Filter-Zweierpack 7733703602.'


def bosch_filter_note():
    return (
        f'<section aria-labelledby="{BOSCH_FILTER_ID}">'
        f'<h4 id="{BOSCH_FILTER_ID}" style="scroll-margin-top:180px">{BOSCH_FILTER_TITLE}</h4>'
        '<p>Beim deutschen Dry 4000 <strong>D4000-EU</strong> (Geräteartikel 7733703558, EAN 4069143047774) '
        'ist der <strong>Staubfilter im Lufteintrittsgitter integriert</strong>. '
        'Den 2-in-1-Dry-Filter mit HEPA- und Aktivkohleschicht führt Bosch separat als Zubehör. '
        'Die Zubehörnummer <strong>7733703602</strong> bezeichnet bei Bosch das <strong>2er-Pack</strong> für die Luftentfeuchter der Dry-Serie.</p>'
        '<p>Für die reine Entfeuchtung genügt der vorhandene Staubfilter; reinige ihn nach der Geräteanleitung. '
        'Wenn ein Händler ein Set mit dem Zusatzfilter bewirbt, prüfe den ausgewiesenen Lieferumfang. '
        'Für den <strong>Air 4000</strong> gilt die eigene Filterzuordnung des Luftreinigers. '
        'Sind Feuchte und Ursache noch ungeklärt, <a href="/guide/luftfeuchtigkeit-richtig-messen.html">miss zuerst</a> und verschiebe den Kauf. '
        '<a href="#luftentfeuchter-30-tage-preischeck">Angebot und nötige Zusatzkosten prüfen</a>.</p>'
        '<p><a href="https://www.bosch-homecomfort.com/de/de/ocs/wohngebaeude/dry-4000-20990506-p/">Bosch: Ausstattung des Dry 4000</a> · '
        '<a href="https://www.bosch-home.com/de/de/product/7733703602">Bosch: Dry Filter 7733703602</a> · '
        '<a href="https://bosch-de-de.boschhc-documents.com/download/pdf/file/6721890171#page=10">Bosch-Anleitung: integrierten Staubfilter reinigen</a>. '
        'Quellen geprüft am <time datetime="2026-11-26">26. November 2026</time>.</p>'
        '</section>'
    )


def block(slug, today=None, data=None):
    data = load() if data is None else data
    if slug not in data['pages']:
        return None
    age = ((today or dt.datetime.now(dt.timezone.utc).date()) - dt.date.fromisoformat(data['checked'])).days
    fresh = 0 <= age <= data['max_age_days']
    cellar = slug == 'luftentfeuchter-keller'
    drain_notes = {
        'stadler-lukas': 'Beim Lukas weiss L-031E gehört ein 100-cm-Schlauch zum Lieferumfang. Sein Ende muss tiefer liegen als der Anfang. Quelle: Stadler Form Deutschland, geprüft am 18.11.2026.',
        'meaco-one-20': 'Für einen höher gelegenen Ablauf nennt Meaco UK eine separat erhältliche Pumpe. Vor dem Kauf die passende Pumpe und den deutschen Lieferumfang für die One 20L prüfen. Quelle: Meaco UK, geprüft am 18.11.2026.',
    }
    rows, cards = [], []
    for p in data['products']:
        anchor = 'modell-' + p['id']
        rows.append(f'<tr><th scope="row"><a href="#{anchor}">{e(p["name"])}</a></th>'
                    f'<td>{e(p["reason"])}</td><td>{e(p["variant"])}</td></tr>')
        source = f'<a href="{e(p["source"], quote=True)}">{e(p["source_label"])}</a>'
        note = drain_notes.get(p['id']) if cellar else None
        drain = f'<p><strong>Wasserablauf:</strong> {e(note)}</p>' if note else ''
        cold = cold_room_note(p.get('cold_evidence')) if cellar else ''
        identity_note = ''
        if identity := p.get('identity'):
            differences = ''.join(
                f'<li><a href="{e(row["source"])}">{e(row["label"])}</a>: {e(row["detail"])}</li>'
                for row in identity['alternatives']
            )
            checked = dt.date.fromisoformat(identity['checked'])
            identity_note = (
                f'<p><strong>Deutsches Angebot prüfen:</strong> Zur oben genannten Modell- und Artikelnummer '
                f'gehört die EAN <strong>{e(identity["ean"])}</strong>. {e(identity["offer_check"])}</p>'
                f'<ul>{differences}</ul><p><a href="{e(identity["source"])}">{e(identity["source_label"])}</a> '
                f'· Modellzuordnung geprüft am '
                f'<time datetime="{checked.isoformat()}">{checked:%d.%m.%Y}</time>.</p>'
            )
            if retailer := identity.get('retailer'):
                retailer_date = dt.date.fromisoformat(retailer['checked'])
                identity_note += (
                    f'<p data-catalog-retailer>{e(retailer["name"])} listet dieselbe EAN und Hersteller-Teilenummer. '
                    f'<a href="{e(retailer["source"])}">Modell bei {e(retailer["name"])} prüfen (ohne Partnerlink)</a>. '
                    'Lieferumfang und Gesamtpreis einschließlich Versand beim Händler prüfen. '
                    f'Händlerangaben zur Kennung geprüft am <time datetime="{retailer_date.isoformat()}">{retailer_date:%d.%m.%Y}</time>.</p>'
                )
        filter_note = bosch_filter_note() if slug == 'luftentfeuchter-ratgeber' and p['id'] == 'bosch-d4000-eu' else ''
        evidence = (f'<h3 id="{anchor}">{e(p["name"])}</h3>'
                    f'<p><strong>{e(p["reason"])}</strong></p><p>{e(p["variant"])}</p>'
                    f'<p>{e(p["facts"])}</p><p><strong>Vor dem Kauf:</strong> {e(p["limit"])}</p>'
                    f'{identity_note}{cold}{drain}<p>Quelle: {source}</p>{filter_note}')
        # Static facts remain visible; stale/conflicting evidence removes only this catalog's commerce.
        if fresh and p['status'] == 'verified':
            href = ('https://www.amazon.de/dp/' + p['asin'] + '?tag=getecoback-21' if p.get('asin')
                    else 'https://www.amazon.de/s?k=' + quote_plus(p['query']) + '&tag=getecoback-21')
            label = 'Produktseite' if p.get('asin') else 'Modellsuche'
            cta = f'{label} bei Amazon.de'
            if cellar:
                cta = (f'{p["name"]} bei Amazon.de ansehen' if p.get('asin')
                       else f'{p["name"]} bei Amazon.de suchen')
            cta = p.get('commerce_label', cta)
            action = (f'<p data-catalog-commerce><a class="eb-shop-btn" href="{e(href, quote=True)}" '
                      f'target="_blank" rel="sponsored nofollow noopener">{e(cta)} →</a>'
                      '<small>Anzeige · Preis, Variante und Lieferbarkeit beim Händler prüfen.</small></p>')
        else:
            action = '<p data-catalog-commerce>Quellenprüfung ausstehend. Prüfe die verlinkten Unterlagen vor einer Kaufentscheidung.</p>'
        cards.append(f'<div class="dc-card">{evidence}{action}</div>')
    drain_style = (
        '.dc-drain h4{scroll-margin-top:180px}'
        '.dc-drain-paths a{display:flex;align-items:center;min-height:44px;width:fit-content;margin:6px 0;font-weight:700}'
    ) if cellar else ''
    drain_choices = (
        '<nav class="dc-drain-paths" aria-label="Modell nach Wasserweg prüfen">'
        '<a href="#modell-stadler-lukas">Ablauf mit Gefälle: Schlauch beim Lukas L-031E prüfen</a>'
        '<a href="#modell-meaco-one-20">Ablauf liegt höher: Pumpenoption der Arete One 20L prüfen</a>'
        '</nav>'
    ) if cellar else ''
    return ('<!--EB_MODELS--><section class="eb-shop eb-models dc-catalog" id="eb-models" aria-labelledby="dc-title">'
            '<style>.dc-catalog{scroll-margin-top:180px}.dc-catalog .dc-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,290px),1fr));gap:16px}'
            '.dc-catalog .dc-card{padding:18px;border:1px solid #cfe0ea;border-radius:12px;background:#fff;min-width:0}'
            '.dc-catalog h3{margin:0 0 10px;color:#0a4d7a;font-size:19px;scroll-margin-top:180px}'
            '.dc-catalog p{font-size:15px;line-height:1.6}.dc-catalog a{overflow-wrap:anywhere}'
            '.dc-catalog small{display:block;margin-top:8px;color:#5b6b78}.dc-catalog table{width:100%;min-width:620px;font-size:14px}'
            '.dc-catalog th[scope="row"]{min-width:145px}'
            '.dc-catalog th,.dc-catalog td{vertical-align:top;padding:10px}.dc-table{overflow-x:auto;margin:16px 0}'
            '.dc-drain{scroll-margin-top:180px;padding:18px;border-left:4px solid #0a4d7a;background:#f2f7fa;border-radius:8px;margin:18px 0}'
            '.dc-drain li{margin:10px 0;font-size:15px;line-height:1.6}'
            f'{drain_style}'
            '.dc-catalog :focus-visible{outline:3px solid #c77400;outline-offset:3px}</style>'
            '<div data-catalog-evidence><div class="eb-shop-h" role="heading" aria-level="2" id="dc-title">Sechs Luftentfeuchter: Unterschiede vor dem Kauf</div>'
            '<aside class="dc-quick" aria-label="Kurzantwort zum Wasserablauf" style="padding:12px;border:1px solid #cfe0ea;border-radius:8px;margin:12px 0">'
            '<p><strong>Abfluss höher als der Geräteauslass?</strong> Ein Schlauchanschluss allein bestätigt keine Pumpe. '
            'Ohne passende Lösung in der Anleitung des genauen Modells bleibt der Ablauf ungeklärt; '
            'prüfe stattdessen den vorgesehenen Tankbetrieb oder einen anderen Standort.</p>'
            '<a data-catalog-drain-entry href="#ablauf-vor-kauf" style="display:inline-flex;align-items:center;min-height:44px;font-weight:700">'
            'Ablauf, Lieferumfang und Modellquelle prüfen ↓</a></aside>'
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
            f'{cellar_drain_route() if cellar else ""}'
            f'{drain_choices}</section>'
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
               'style="scroll-margin-top:180px" tabindex="-1"></div><!--/EB_CATALOG_READING-->')
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
    heading, content = match[1].split('<div data-catalog-evidence>', 1)
    content = content.rsplit('</div></section>', 1)[0]
    content = re.sub(r'<p data-catalog-commerce>.*?</p>', '', content, flags=re.S)
    anchor = re.match(r'<section\b[^>]*\bid="(eb-models)"[^>]*>', heading)
    if anchor:
        return f'<section id="{anchor[1]}">{content}</section>'
    return content
