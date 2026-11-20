#!/usr/bin/env python3
"""Build the reviewed German multi-category product directory without network I/O.

Merchant destinations are derived only from reviewed model queries and the site's
fixed DE tag. Evidence survives a commerce withdrawal; unknown is never a price,
stock promise, test score or verified recommendation.
"""
from __future__ import annotations

import argparse
import datetime as dt
from html import escape
import json
import hashlib
from pathlib import Path
import re
from urllib.parse import urlencode

from agent_sources import citation_url
from filter_finder_de_sources import BINDINGS as FILTER_CARE_MODELS
from build_agent_md import to_markdown
import storage_veto

ROOT = Path(__file__).resolve().parents[1]
ROUTE = '/produkte.html'
CANONICAL = 'https://getecoback.com' + ROUTE
TITLE = 'Haushaltsgeräte nach Aufgabe und Modell vergleichen | EcoBack'
DESCRIPTION = 'Vergleiche konkrete Haushaltsgeräte nach Aufgabe und genauer Variante: mit Herstellerquellen, Grenzen und passenden Modellsuchen für Deutschland.'
SLUG = re.compile(r'[a-z0-9]+(?:-[a-z0-9]+)*')
PRODUCT_FIELDS = ('id', 'category', 'name', 'brand', 'variant', 'role', 'facts',
                  'limit', 'source', 'source_label', 'query', 'checked', 'status')
FORBIDDEN = {'asin', 'tag', 'affiliate_tag', 'merchant_url', 'affiliate_url', 'price', 'rating', 'stock'}


# These comparisons have their own reviewed catalogs and merchant eligibility.
# Only their editorial entry points belong in this directory.
SPECIALIST_GUIDES = (
    ('Luftentfeuchter', '/guide/luftentfeuchter-ratgeber.html#eb-models',
     'Ist dein Keller dauerhaft feucht? Erst messen und die Ursache klären. Bei Bedarf Tankbetrieb und Schlauchablauf vergleichen.',
     'Raumfeuchte Feuchtigkeit feuchter Keller Luftentfeuchtung Meaco Bosch Dry'),
    ('Luftbefeuchter', '/guide/luftbefeuchter-ratgeber.html#modelle-vergleichen',
     'Trockene Luft gemessen? Vergleiche manuelle Stufen mit einstellbarem Feuchteziel und prüfe, welche Filter du wechseln musst.',
     'Raumfeuchte Luftbefeuchtung trockene Raumluft Hygrostat Stadler Form Oskar little O-060 Beurer'),
    ('Ersatzteile für Luftbefeuchter', '/guide/luftbefeuchter-ratgeber.html#ersatzteile-zuordnen',
     'Welches Teil passt zu deinem Gerät? Gleiche die Modellkennung mit den Filtermatten O-030, dem Ersatzfilter 110005 oder den Kalkpads 163141 ab.',
     'Zubehör Ersatzteile Ersatzfilter Filtermatten Kalkpads O-030 110005 163141 Stadler Form Beurer'),
    ('Heizkörperthermostate', '/guide/smarte-heizkoerperthermostate-lohnen-sich.html#thermostat-start',
     'Willst du Heizzeiten einstellen? Prüfe zuerst dein Ventil und ob das gewählte Thermostat eine passende Zentrale braucht.',
     'Heizung Heizkörper regeln Thermostat Ventiladapter Smart Home tado Bosch FRITZ'),
    ('Saugroboter', '/guide/saugroboter-kaufberatung.html#modelle-vergleichen',
     'Soll ein Roboter die Räume selbstständig reinigen? Miss die Türschwellen und den Platz für die Station, bevor du die Wischfunktion wählst.',
     'Staubsaugerroboter Wischroboter Türschwelle Teppich Dreame D10 Plus Gen 2 L10s Ultra Gen 2 Roborock Saros 10R'),
    ('Saugwischer', '/guide/saugwischer-kaufberatung.html#modelle-vergleichen',
     'Willst du Hartboden von Hand saugen und wischen? Prüfe die Freigabe für feuchte Reinigung und plane Zeit für Tank und Walze ein.',
     'Wischsauger Nasswischen Bodenfreigabe Parkett Tineco S7 FlashDry Dreame H14 Pro Roborock F25 XT'),
)

APPLIANCE_EVIDENCE = '''
<section class="pc-method" id="spuelmaschine-einbaumasse">
<h2>Passt ein Einbaugeschirrspüler auch bei geöffneter Tür?</h2>
<p>Miss die Nische an mehreren Stellen und notiere den kleinsten nutzbaren Querschnitt. Halte die Gerätefront, die 90° geöffnete Tür und eine zusätzlich ausgezogene Schublade getrennt fest. Vergleiche Tiefen vom selben Bezugspunkt und notiere Vorsprünge, gegenüberliegende Schranktüren und den verbleibenden Durchgang.</p>
<p>Das deutsche Datenblatt für Bosch SBV4EBX00D nennt 865 × 598 × 550 mm (H × B × T) als Gerätemaße, 865–925 × 600 × 550 mm als Nischenmaß und 1.200 mm Tiefe bei 90° geöffneter Tür. Bosch führt das Modell als nicht mehr verfügbar. Diese Daten helfen bei der Bestandsprüfung oder bei einem Gebrauchtangebot mit passender Kennung.</p>
<p>Die Anleitung für SBV4EBX00D/48 zeigt verschiedene Montagesituationen. Gleiche die vollständige Modellkennung, die Bezugskante und die passende Zeichnung für Front und Sockel ab. Fehlt diese Zuordnung, bleibt der Platzbedarf offen. Maße allein klären keine Anschlüsse oder Montage.</p>
<p>Herstellerquellen Deutschland, gelesen am <time datetime="2026-11-20">20.11.2026</time>. <a href="https://media3.bosch-home.com/Documents/specsheet/de-DE/SBV4EBX00D.pdf">Bosch Datenblatt SBV4EBX00D</a> · <a href="https://www.bosch-home.com/de/de/product/SBV4EBX00D">Bosch Modellseite</a> · <a href="https://www.bosch-home.com/de/de/productservice/SBV4EBX00D-48">Bosch Service SBV4EBX00D/48</a> · <a href="https://media3.bsh-group.com/Documents/9001902376_A.pdf">Montagezeichnung 9001902376_A</a>.</p>
</section>
<section class="pc-method" id="waeschesaeule-zubehoer">
<h2>Welcher Verbindungssatz passt zu Waschmaschine und Trockner?</h2>
<p>Prüfe zuerst die Modellkennungen, Baureihen und den genauen Verbindungssatz. Miss die verfügbare Höhe an der niedrigsten Stelle und halte den Platz für eine geöffnete Tür oder eine ausgezogene Ablage fest. Die Außenmaße eines Zubehörs und die endgültige Einbauhöhe stehen in unterschiedlichen Unterlagen.</p>
<ul>
<li>Miele WTV 512 (9351790) misst 120 mm und gehört zur T1 White Edition. WTV 511 (9351780) misst 120 mm und wird für T1 Chrome Edition oder T1 Classic angegeben. Beide haben eine Schublade. Die jeweiligen Miele-Seiten nennen WTZH und WTW als Ausnahmen bei den Waschmaschinen.</li>
<li>Miele WTV 501 (9256130) misst 25 mm und wird für T1 Chrome Edition oder T1 Classic angegeben. Die Produktseite schließt W 1000 und WTZH aus. W 3000, W 5000 und W Classic werden mit gerader Blende angegeben. Die Anleitung der WTV 511 und 512 behandelt auf Seite 13 den Zustand der Abdeckung nach der Demontage. Prüfe beim Gebrauchtkauf, welche Teile tatsächlich vorliegen.</li>
<li>Die Bosch-Anleitung für WQG241001 nennt WTZ27410 und WTZ27400 mit ausziehbarer Arbeitsplatte, eine geeignete Waschmaschine desselben Herstellers mit gleicher Breite und Tiefe sowie den Ausschluss eines Podests für die Säule. Die Zubehörseiten nennen eine Waschmaschinen-Arbeitsplattentiefe über 55 cm. WTZ27410 wird mit 35 × 593 × 556 mm angegeben, WTZ27400 mit 42 × 595 × 574 mm (H × B × T).</li>
<li>Die Anleitung nennt für WQG241001 einen Gerätekörper von 842 × 598 × 613 mm, eine Tiefe von 648 mm bei geschlossener und 1.096 mm bei geöffneter Tür. Dieselbe Anleitung führt WTZ1110 separat als Zubehör für den Kondensatablauf auf.</li>
</ul>
<p>Prüfe den Lieferumfang und die Bezugskanten der Messung. Fehlende Angaben zu Auszug, Belastung oder Kombination bleiben offen. Bei unklarer Kombination kommen getrennte Aufstellung oder Rückfrage beim Hersteller in Frage.</p>
<p>Herstellerquellen Deutschland, gelesen am <time datetime="2026-11-20">20.11.2026</time>. <a href="https://www.miele.de/product/9351790/wasch-trocken-verbindungssatz-wtv-512">Miele WTV 512</a> · <a href="https://www.miele.de/product/9351780/wasch-trocken-verbindungssatz-wtv-511">Miele WTV 511</a> · <a href="https://www.miele.de/product/9256130/wasch-trocken-verbindungssatz-wtv-501">Miele WTV 501</a> · <a href="https://media.miele.com/downloads/c9/e5/00_56D762FF8C918420E10080000AB5C9E5.pdf">Miele Anleitung für WTV 511 und 512</a> · <a href="https://media3.bosch-home.com/Documents/9001984634_A.pdf">Bosch WQG241001 Anleitung, Seiten 6, 27 und 48</a> · <a href="https://www.bosch-home.com/de/de/product/WTZ27410">Bosch WTZ27410</a> · <a href="https://www.bosch-home.com/de/de/product/WTZ27400">Bosch WTZ27400</a>.</p>
</section>
<section class="pc-method" id="dunstabzug-umluft-zubehoer">
<h2>Welches Umluftset oder welcher Ersatzfilter gehört zur Dunstabzugshaube?</h2>
<p>Notiere die volle E-Nummer, den Aufbau und die Nummer des bereits verbauten Sets. Beim Wechsel von Abluft zu Umluft brauchst du die Angaben zum kompletten Set. Für einen Filterwechsel brauchst du die Angaben zum eingebauten Halter und zum Ersatzfilter. Ein Filter aus dem Zubehörverzeichnis ist noch kein vollständiges Set.</p>
<p>Das deutsche Bosch-Datenblatt zur DWB66BC50 nennt auf höchster Normalstufe 621 m³/h und 69 dB(A) re 1 pW im Abluftbetrieb. Für die angegebene Clean Air Plus-Konfiguration stehen dort 422 m³/h und eine Schallleistung von 74 dB(A) re 1 pW. Die Zahlen gelten für die benannte Betriebsart und Ausstattung. Ein Datenblattwert beschreibt nicht den Schalldruck in deiner Küche.</p>
<p>Das Blatt nennt 600 mm Gerätebreite und 500 mm Tiefe. Es unterscheidet die Gerätehöhe bei Abluft (635–965 mm), die allgemein bezeichnete Umluftzeile (635–1075 mm), Clean Air Plus innen am Kamin (833–1163 mm) und außen (703 mm). Nutze die Zeichnung und miss vom selben Bezugspunkt. Vergleiche die dokumentierten Bedingungen, bevor du eine passende Bauhöhe ableitest.</p>
<p>Der deutsche Bosch-Katalog 2024/25 führt für die DWB66BC50 DWZ1DX1I4 (Clean Air Standard), DWZ1DX1I6 (Clean Air Plus innen) und DWZ1FX5C6 (Clean Air Plus außen). Bosch führt DWZ1DX1I6 unter der Artikelnummer 17004061 mit Filterhalter, Clean Air Plus-Filter, Schlauch, zwei Schellen und Befestigungsmaterial. DZZ0XX0P0 und DZZ1XX1B6 sind als Ersatzfilter aufgeführt. In der jeweiligen Zubehörzuordnung stimmen die Listen für DZZ1XX1B6 und DWZ1DX1I6 nicht vollständig überein. Prüfe die Verbindung über die volle E-Nummer und das tatsächliche Set. Die Angabe zur Spülmaschinenreinigung gehört zum Metallfettfilter. Für DZZ1XX1B6 nennt die Zubehörseite 12–18 Monate.</p>
<p>Miele beschreibt DKF 12-R, Artikel 10271450, als einzelnen regenerierbaren Geruchsfilter. DKF 16-P, Artikel 11762660, umfasst zwei DKF 12-P und ist für die angegebene DA 7006 D dokumentiert. Für DKF 12-R nennt Miele Regeneration im Abstand von sechs Monaten und eine angegebene Nutzungsdauer von drei Jahren. Für DKF 16-P nennt Miele einen Wechselabstand von sechs Monaten. Die Zeitangaben gehören zu den jeweiligen Filtern und Bedingungen. Ein angebotenes Set oder eine allgemeine Empfehlung belegt noch keine Passung.</p>
<p>Herstellerquellen Deutschland, gelesen am <time datetime="2026-11-20">20.11.2026</time>. <a href="https://media3.bosch-home.com/Documents/specsheet/de-DE/DWB66BC50.pdf">Bosch DWB66BC50 Datenblatt</a> · <a href="https://media3.bosch-home.com/Documents/25665283_EBG_Handbuch_Linie_2024_2025_150dpi_ePaper.pdf">Bosch Zubehörkatalog 2024/25</a> · <a href="https://www.bosch-home.com/de/de/product/kochen-backen/kochzubehoer-backzubehoer/dunstabzugshauben/startersets-umluftbetrieb/DWZ1DX1I6">Bosch DWZ1DX1I6</a> · <a href="https://www.bosch-home.com/de/de/product/kochen-backen/kochzubehoer-backzubehoer/dunstabzugshauben/aktivkohlefilter/DZZ1XX1B6">Bosch DZZ1XX1B6</a> · <a href="https://www.miele.de/product/10271450/regenerierbarer-longlife-airclean-geruchsfilter-dkf-12-r">Miele DKF 12-R</a> · <a href="https://www.miele.de/product/11762660/active-airclean-geruchsfilter-mit-aktivkohle-dkf-16-p">Miele DKF 16-P</a>.</p>
</section>

<section class="pc-method" id="backofen-vollauszug-belege">
<h2>Welcher Vollauszug passt zum Backofen und wie viele Paare sind enthalten?</h2>
<p>Vergleiche zuerst Modellkennung, Baureihe und die benötigten Ebenen. Halte die bestätigten Zubehörteile und Paarzahlen getrennt von den gewünschten Ebenen fest. Prüfe vor einem Ersatzkauf auch den tatsächlichen Lieferumfang.</p>
<p>Das deutsche Bosch-Datenblatt HEZ638370 nennt fest zugeordnete Vollauszüge auf den Ebenen 1, 2 und 3 für passende 60-cm-Backöfen mit Pyrolyse. Backwagen, Dampfgaren und reine Mikrowellenanwendungen fallen außerhalb der benannten Fälle. Eine zugesagte Gerätekombination setzt die Prüfung der vollständigen E-Nummer voraus.</p>
<ul>
<li>Miele HFC 72 (9520670) ist ein Paar für H 6000 und H 7000 Backöfen mit Pyrolyse; die Produktseite benennt PyroFit ausdrücklich.</li>
<li>Miele HFC 70 (9520650) ist ein Paar für H 6000/H 7000 und DGC 6000/DGC 7000. HFC 70-C (10581490) ist ein Paar für H 2000. Prüfe den Reinigungshinweis der konkreten Kombination. Eine fehlende Angabe lässt die Frage offen.</li>
<li>Das deutsche Angebot H 2861 BP (12144610) führt ein Paar HFC 70-C, ein Paar Aufnahmegitter und je ein HBB 71, HUBB 71 und Rost auf. Die Anleitung des H 2861 BP schließt auf Seite 101 das Zubehör dieses Geräts, darunter FlexiClip-Auszüge, Aufnahmegitter und Rost, bei der Pyrolyse aus. Für andere Kombinationen gilt die jeweilige Anleitung. Die Seiten 23 und 42 unterscheiden die Position der HFC 70-C von der Ebene des Garguts. Die Tabellen ab Seite 90 kennzeichnen Werte mit und ohne HFC 70-C als +HFC und -HFC.</li>
</ul>
<p>Für die Platzfrage miss geöffnete Tür, vorstehendes Zubehör und Durchgang am gleichen Bezug. Die Beobachtung ordnet Bewegungsraum ein. Belastbarkeit und Freigaben ergeben sich aus der passenden Anleitung.</p>
<p>Herstellerquellen Deutschland, gelesen am <time datetime="2026-11-20">20.11.2026</time>. <a href="https://media3.bosch-home.com/Documents/specsheet/de-DE/HEZ638370.pdf">Bosch HEZ638370</a> · <a href="https://www.miele.de/product/9520670/original-miele-flexiclip-vollauszuege-pyrofit-hfc-72">Miele HFC 72</a> · <a href="https://www.miele.de/product/9520650/original-miele-flexiclip-vollauszuege-hfc-70">Miele HFC 70</a> · <a href="https://www.miele.de/product/10581490/original-miele-flexiclip-vollauszuege-hfc-70-c">Miele HFC 70-C</a> · <a href="https://www.miele.de/product/12144610/backofen-h-2861-bp-edelstahl-cleansteel">Miele H 2861 BP und Lieferumfang</a> · <a href="https://media.miele.com/downloads/85/93/00_C7F12828C43B1FD0A7F0508AFEC78593.pdf">Miele H 2861 BP Anleitung, Seite 101</a>.</p>
</section>

<section class="pc-method" id="luftgeraete-rollen">
<h2>Passt ein Rollensatz oder Rollwagen zum vorhandenen Luftgerät?</h2>
<p>Halte Gerätekennung, Zubehörnummer und Lieferumfang getrennt fest. Die deutschsprachige Anleitung 3PDE690982-1 für Daikin MC80ZVM nennt KKS080B41 als separat erhältlichen Satz mit vier Rollen. BAFT501A bezeichnet einen anderen Zubehörtyp. Die Geräteabmessungen 630 × 315 × 315 mm beziehen sich auf die angegebene Geräteausführung. Die Anleitung weist 9,8 kg Gerätegewicht und zwei Tragegriffe aus. Sie liefert an dieser Stelle keine Maße des Geräts mit montierten Rollen.</p>
<p>Venta führt Artikel 6060 (ausgewählte Produktnummer 6060500) als einzelnen separaten Rollwagen. Der Fließtext nennt unter anderem Original Connect AH530, AH535, AH550 und AH555. Die Tabelle nennt stattdessen unter anderem LW24, LW24 Plus, LW44 und LW44 Plus. Die LW25- und LW45-Gruppen kommen in beiden Angaben vor. Wenn deine genaue Modellkennung nur in einem Teil der Seite erscheint, kläre die Passung vor dem Kauf beim Hersteller. Eine Liste ersetzt keinen bestätigten Lieferumfang oder eine Nutzerbeobachtung am konkreten Gerät.</p>
<p>Miss für einen vorhandenen Aufbau den vollständigen Bewegungsraum, die tatsächlich genutzte Fläche und beide Zustände vor und nach der Platzänderung. Dokumentiere Anforderungen an Untergrund, Schlauch und Stromführung nach der Anleitung. Ein Zubehörmaß allein erlaubt kein Urteil über Tragfähigkeit, Kippsicherheit oder Schwellen.</p>
<p>Herstellerquellen Deutschland, gelesen am <time datetime="2026-11-20">20.11.2026</time>. <a href="https://www.daikin.de/content/dam/document-library/operation-manuals/airp/air-purifiers/mc80z/MC80Z_Operation%20manual_3PDE690982-1_German.pdf">Daikin MC80ZVM deutsche Bedienungsanleitung</a> · <a href="https://www.venta-air.com/Rollwagen-fuer-Venta-Luftbefeuchter/6060">Venta 6060 Produktbeschreibung und technische Daten</a>.</p>
</section>

'''


def date(value):
    if not isinstance(value, str) or not re.fullmatch(r'\d{4}-\d{2}-\d{2}', value):
        raise ValueError('Expected exact ISO calendar date')
    return dt.date.fromisoformat(value)


def normalized(value):
    return ' '.join(value.casefold().split())


def validate(data):
    if not isinstance(data, dict) or type(data.get('version')) is not int or data['version'] != 1:
        raise ValueError('Unsupported product catalog version')
    if data.get('market') != 'DE' or type(data.get('max_age_days')) is not int or data['max_age_days'] != 90:
        raise ValueError('Catalog requires reviewed DE market and 90-day evidence boundary')
    published = date(data.get('published'))
    modified = date(data.get('modified'))
    if modified < published:
        raise ValueError('Modified date precedes publication')
    categories, products = data.get('categories'), data.get('products')
    if not isinstance(categories, list) or not categories or not isinstance(products, list) or not products:
        raise ValueError('A reviewed catalog cannot be empty')
    category_ids, category_names, ids, models, queries = set(), set(), set(), set(), set()
    veto = storage_veto.load()
    for category in categories:
        if not isinstance(category, dict) or any(not isinstance(category.get(k), str) or not category[k].strip() for k in ('id', 'name', 'intro', 'no_purchase')):
            raise ValueError('Missing category identity or decision guidance')
        key = category['id']
        if not SLUG.fullmatch(key) or key in category_ids or normalized(category['name']) in category_names:
            raise ValueError('Invalid or duplicate category identity')
        if storage_veto.is_storage(category['id'] + ' ' + category['name'], veto):
            raise ValueError('Storage/PV categories are excluded')
        guide = category.get('buying_guide')
        if guide is not None:
            if (not isinstance(guide, dict) or
                any(not isinstance(guide.get(k), str) or not guide[k].strip() for k in ('question', 'answer')) or
                not isinstance(guide.get('steps'), list) or len(guide['steps']) != 3 or
                any(not isinstance(step, str) or not step.strip() for step in guide['steps'])):
                raise ValueError('Invalid category buying guide')
        category_ids.add(key); category_names.add(normalized(category['name']))
    for product in products:
        if not isinstance(product, dict) or any(not isinstance(product.get(k), str) or not product[k].strip() for k in PRODUCT_FIELDS):
            raise ValueError('Missing reviewed product fields')
        if FORBIDDEN.intersection(product):
            raise ValueError('Merchant, price, stock and rating fields are not catalog inputs')
        key, model, query = product['id'], normalized(product['brand'] + ' ' + product['name']), normalized(product['query'])
        if not SLUG.fullmatch(key) or key in ids or model in models or query in queries:
            raise ValueError('Invalid or duplicate exact model identity')
        if product['category'] not in category_ids:
            raise ValueError('Unknown product category')
        if product['status'] not in {'verified', 'unverified', 'conflict', 'stale', 'pending'}:
            raise ValueError('Unknown evidence status')
        date(product['checked'])
        if not citation_url(product['source']):
            raise ValueError('Unreviewed official source: ' + product['id'])
        if storage_veto.is_storage(' '.join(product[k] for k in ('id', 'category', 'brand', 'name', 'variant', 'query')), veto):
            raise ValueError('Storage/PV products are excluded')
        ids.add(key); models.add(model); queries.add(query)
    if any(not any(p['category'] == c for p in products) for c in category_ids):
        raise ValueError('Category has no reviewed product')
    return data


def load(path=ROOT / 'data/product-catalog.json'):
    return validate(json.loads(Path(path).read_text(encoding='utf-8')))


def eligible(product, data, today):
    age = (today - date(product['checked'])).days
    return product['status'] == 'verified' and 0 <= age <= data['max_age_days']


def render(data, today=None):
    data = validate(data)
    today = today or dt.datetime.now(dt.timezone.utc).date()
    esc = lambda value: escape(str(value), quote=True)
    # Every published product group must have its matching practical check.
    # A missing helper is a build error, never an empty feature placeholder.
    from product_category_tools import render_tool
    from product_category_comparison import render_comparison
    groups = []
    for category in data['categories']:
        cards = []
        for product in data['products']:
            if product['category'] != category['id']:
                continue
            if eligible(product, data, today):
                url = 'https://www.amazon.de/s?' + urlencode({'k': product['query'], 'tag': 'getecoback-21'})
                merchant = f'<p class="pc-commerce"><a href="{esc(url)}" target="_blank" rel="sponsored nofollow noopener">Modellsuche bei Amazon.de →</a><small>Anzeige · Suche, keine feste Produktseite. Genaue Variante, Gesamtpreis und Lieferung beim Händler prüfen.</small></p>'
            else:
                merchant = '<p class="pc-commerce pc-paused">Händlersuche pausiert: Quellenprüfung ausstehend. Die Angaben unten sind der dokumentierte Stand, keine aktuelle Kaufempfehlung.</p>'
            care_link = (f'<p class="pc-care"><a href="/ersatzfilter.html#{esc(product["id"])}">Ersatzfilter zuordnen &amp; Pflege notieren →</a></p>'
                         if product['id'] in FILTER_CARE_MODELS else '')
            cards.append(f'''<section class="pc-card" id="produkt-{esc(product['id'])}" data-product-card data-category="{esc(category['id'])}">
<h3>{esc(product['name'])}</h3><p class="pc-brand">{esc(product['brand'])} · {esc(product['variant'])}</p>
<p><strong>Aufgabe:</strong> {esc(product['role'])}</p><p>{esc(product['facts'])}</p>
<p class="pc-limit"><strong>Vor dem Kauf:</strong> {esc(product['limit'])}</p>
<p class="pc-source">Quelle: <a href="{esc(product['source'])}" target="_blank" rel="noopener">{esc(product['source_label'])}</a> · geprüft am <time datetime="{esc(product['checked'])}">{date(product['checked']).strftime('%d.%m.%Y')}</time>.</p>
{merchant}{care_link}</section>''')
        comparison = render_comparison(category['id'], data['products'], category.get('buying_guide'))
        tool = render_tool(category['id'])
        if not isinstance(tool, str) or not tool.strip():
            raise ValueError('Missing category tool: ' + category['id'])
        groups.append(f'''<section class="pc-category" id="kategorie-{esc(category['id'])}" data-product-category="{esc(category['id'])}">
<h2>{esc(category['name'])} <span class="pc-category-count">{len(cards)} Modelle</span></h2>
<p>{esc(category['intro'])}</p><p class="pc-no-purchase"><strong>Vorhandenes weiter nutzen?</strong> {esc(category['no_purchase'])}</p>
<p class="pc-buyer-routes"><a href="#modelle-{esc(category['id'])}">Direkt die {len(cards)} Modelle vergleichen ↓</a> <a href="#pc-tool-{esc(category['id'])}">Erst die passende Auswahlhilfe nutzen ↓</a></p>
{comparison}{tool}<h3 class="pc-model-heading" id="modelle-{esc(category['id'])}">{esc(category['name'])}: Modelle und Kaufgrenzen</h3><div class="pc-grid">{''.join(cards)}</div></section>''')
    nav = ''.join(f'<a href="#kategorie-{esc(c["id"])}" data-category-link="{esc(c["id"])}">{esc(c["name"])}</a>' for c in data['categories'])
    guide_items = ''.join(
        f'<li data-specialist-guide data-search-terms="{esc(keywords)}">'
        f'<a href="{esc(target)}">{esc(name)}</a> <p>{esc(question)}</p></li>'
        for name, target, question, keywords in SPECIALIST_GUIDES
    )
    options = ''.join(f'<option value="{esc(c["id"])}">{esc(c["name"])}</option>' for c in data['categories'])
    css_version = hashlib.sha256((ROOT / 'site/assets/product-catalog.css').read_bytes()).hexdigest()[:12]
    script_version = hashlib.sha256((ROOT / 'site/assets/product-catalog.mjs').read_bytes()).hexdigest()[:12]
    tool_version = hashlib.sha256((ROOT / 'site/assets/product-category-tools.mjs').read_bytes()).hexdigest()[:12]
    count = len(data['products'])
    published, modified = data['published'], data['modified']
    graph = {'@context': 'https://schema.org', '@type': 'CollectionPage', 'name': TITLE,
             'description': DESCRIPTION, 'url': CANONICAL, 'inLanguage': 'de-DE',
             'datePublished': published, 'dateModified': modified,
             'publisher': {'@type': 'Organization', 'name': 'EcoBack', 'url': 'https://getecoback.com/'},
             'mainEntity': {'@type': 'ItemList', 'numberOfItems': count,
                            'itemListElement': [{'@type': 'ListItem', 'position': n, 'name': p['name'], 'url': CANONICAL + '#produkt-' + p['id']} for n, p in enumerate(data['products'], 1)]}}
    structured = json.dumps(graph, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c')
    return f'''<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{TITLE}</title><meta name="description" content="{DESCRIPTION}"><link rel="canonical" href="{CANONICAL}">
<link rel="alternate" type="text/markdown" href="https://getecoback.com/produkte.md"><link rel="alternate" hreflang="de" href="{CANONICAL}">
<meta property="og:type" content="website"><meta property="og:title" content="{TITLE}"><meta property="og:description" content="{DESCRIPTION}"><meta property="og:url" content="{CANONICAL}">
<link rel="stylesheet" href="/assets/product-catalog.css?v={css_version}"><script type="module" src="/assets/product-catalog.mjs?v={script_version}"></script><script type="module" src="/assets/product-category-tools.mjs?v={tool_version}"></script>
<script type="application/ld+json">{structured}</script></head><body>
<main class="pc-page"><article data-product-directory><header class="pc-header"><p><a href="/">EcoBack</a> / Produkte</p>
<h1>Haushaltsgeräte: konkrete Modelle für deine Aufgabe</h1><p class="pc-lead">{count} konkrete Modelle in {len(data['categories'])} Produktgruppen. Vergleiche Einsatz, genaue Variante und Grenzen anhand der Herstellerquellen — ohne Testnoten oder Preisrangliste.</p>
<p class="pc-disclosure">Als Amazon-Partner verdient EcoBack an qualifizierten Käufen. Händlersuchen sind als Anzeige gekennzeichnet. Keine eigenen Gerätetests; Herstellerangaben sind keine Leistungszusage für dein Zuhause.</p>
<p class="pc-dates">Veröffentlicht: <time datetime="{published}">{date(published).strftime('%d.%m.%Y')}</time> · Inhalt geändert: <time datetime="{modified}">{date(modified).strftime('%d.%m.%Y')}</time>. Der Quellenstand steht an jedem Modell.</p></header>
<nav class="pc-categories" aria-label="Produktgruppen und Kaufhilfen">{nav}<a class="pc-guide-jump" href="#kaufhilfen">Zu den {len(SPECIALIST_GUIDES)} Kaufhilfen ↓</a></nav>
<form class="pc-filters" id="product-filters" role="search" hidden><label for="product-query">Modelle und Kaufhilfen durchsuchen<input id="product-query" type="search" maxlength="100" autocomplete="off" placeholder="Zum Beispiel: Luftbefeuchter, Bosch, Parkett"></label>
<label for="product-category">Produktgruppe<select id="product-category"><option value="">Alle Produktgruppen</option>{options}</select></label><button type="reset">Filter zurücksetzen</button>
<p class="pc-filter-note">Die Suche läuft nur in diesem Browser. Dein Suchtext wird nicht übertragen.</p>
<p id="product-filter-empty" hidden>Keine passenden Modelle oder Kaufhilfen gefunden. Ändere die Suche oder setze die Filter zurück.</p></form>
<p id="product-filter-status" role="status" aria-live="polite">{count} Modelle in {len(data['categories'])} Produktgruppen.</p>
<section class="pc-guides" id="kaufhilfen" data-specialist-guides aria-labelledby="pc-guides-heading">
<h2 id="pc-guides-heading">Kaufhilfen für Raumklima, Heizung und Böden</h2>
<ul>{guide_items}</ul></section>
{''.join(groups)}
{APPLIANCE_EVIDENCE}
<section class="pc-method" id="auswahlmethode"><h2>Was diese Auswahl leistet</h2><p>Die Gruppen zeigen unterschiedliche Aufgaben und konkrete Modelle, keine vollständige Marktübersicht. Herstellerdaten und genaue Varianten stehen bei jedem Gerät. Wir haben diese Geräte nicht selbst getestet. Eine Händlersuche bestätigt weder ein bestimmtes Angebot noch Verfügbarkeit oder einen Preis.</p><p>Quellen älter als 90 Tage, zukünftige Prüfdaten oder offene Widersprüche pausieren die Händlersuche. Die zuletzt dokumentierten Fakten bleiben nachvollziehbar. Zubehör, regionale Ausführung und die passende Anleitung am konkreten Angebot prüfen. Ein funktionierendes vorhandenes Gerät muss nicht ersetzt werden.</p></section>
</article></main><footer class="pc-footer"><a href="/wie-wir-empfehlen.html">Unsere Methode</a> · <a href="/datenschutz.html">Datenschutz</a> · <a href="/impressum.html">Impressum</a></footer></body></html>\n'''


def build(root=ROOT, today=None):
    root = Path(root)
    data = load(root / 'data/product-catalog.json')
    output = render(data, today)
    site = root / 'site'
    if site.is_symlink():
        raise ValueError('Refusing symlink site root')
    site.mkdir(parents=True, exist_ok=True)
    html_path = site / 'produkte.html'
    md_path = site / 'produkte.md'
    markdown = to_markdown(output, ROUTE, 'de')
    if re.search(r'https?://(?:www\.)?amazon\.|tag=getecoback-21', markdown, re.I):
        raise ValueError('Merchant link leaked into machine-readable text')
    for path, text in ((html_path, output), (md_path, markdown)):
        if path.is_symlink():
            raise ValueError('Refusing symlink output')
        if not path.exists() or path.read_text(encoding='utf-8') != text:
            path.write_text(text, encoding='utf-8')
    return {'products': len(data['products']), 'categories': len(data['categories']),
            'merchant_searches': sum(eligible(p, data, today or dt.datetime.now(dt.timezone.utc).date()) for p in data['products'])}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=ROOT)
    parser.add_argument('--today', type=date)
    args = parser.parse_args()
    print(json.dumps(build(args.root, args.today), ensure_ascii=False))
