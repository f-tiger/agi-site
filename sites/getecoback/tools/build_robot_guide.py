#!/usr/bin/env python3
"""Build the original German robot buyer path from exact, dated source records."""
import datetime as dt
from html import escape as esc
import json
from pathlib import Path
from urllib.parse import quote_plus

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data/robot-catalog.json'
TARGET = ROOT / 'site/guide/saugroboter-kaufberatung.html'
URL = 'https://getecoback.com/guide/saugroboter-kaufberatung.html'
TITLE = 'Saugroboter kaufen: Schwellen, Teppiche und Station prüfen'
DESCRIPTION = 'Saugroboter passend zur Wohnung wählen: Schwellen, Teppiche, Stationsplatz und Pflege vergleichen. Genaue Modelle mit Herstellerquellen für DACH.'
FAQ = [
    ('Schafft ein Saugroboter eine 4 cm hohe Türschwelle?', 'Das lässt sich aus einer Werbezahl allein nicht ableiten. Die deutsche Saros-10R-Seite nennt maximal 4 cm bei Doppelschwellen und interne Tests. Eine einzelne 4-cm-Kante ist damit nicht bestätigt. Jede Stufe, ihren Abstand, die Kantenform und den Boden messen; im Zweifel die genaue Situation beim Hersteller klären.'),
    ('Bleibt mein Teppich durch eine Moppanhebung trocken?', 'Nicht automatisch. Die 10,5 mm Moppanhebung des Dreame L10s Ultra Gen 2 sind eine Gerätefunktion, keine Freigabe für jede Florhöhe. Beim Saros 10R muss das automatische Ablegen der Mopps in der App aktiviert werden. Empfindliche oder unklare Teppiche zunächst aussparen.'),
    ('Wie viel Platz benötigt eine Absaugstation?', 'Stationsmaße und freier Aufstellbereich sind verschieden. Die Gen-2-Anleitung von Dreame fordert 1,5 m davor und 5 cm auf jeder Seite. Beim Saros 10R nennt Abschnitt B3 einen Bereich mit mindestens 75 cm Höhe, 40 cm seitlicher Ausdehnung und 120 cm Tiefe. Zusätzlich müssen die für die Pflege nötigen Teile erreichbar bleiben.'),
    ('Ersetzt ein Roboter mit Station die manuelle Pflege?', 'Nein. Kleine Gegenstände und Kabel aufräumen, Bürsten und Sensoren pflegen sowie Beutel, Filter und gegebenenfalls Wasserbehälter kontrollieren bleibt nötig. Der Dreame L10s Ultra Gen 2 verlangt die Reinigung des Schmutzwasserbehälters nach jeder Nutzung. Vergleiche deshalb deine aktive Gesamtzeit.'),
    ('Sind die Links zu Amazon.de feste Produktangebote?', 'Nein. Die gekennzeichneten Affiliate-Links öffnen eine Suche nach dem genauen Modell. Andere Generationen oder Lieferumfänge können erscheinen. Modell, regionale Ausführung, Zustand, Verkäufer, Lieferland und Endpreis vor einer Bestellung prüfen. Bei ungeklärten Quellen zeigen wir keinen Kaufverweis.')
]


def load():
    data = json.loads(DATA.read_text())
    if data['market'] != 'DE' or data['max_age_days'] != 90:
        raise ValueError('Catalog requires the reviewed DE market and 90-day evidence window')
    if len({p['id'] for p in data['products']}) != len(data['products']):
        raise ValueError('Duplicate robot identity')
    for product in data['products']:
        if not product['sources'] or not all(k in data['sources'] for k in product['sources']):
            raise ValueError('Missing official source')
        if product['threshold']['source'] not in product['sources']:
            raise ValueError('Threshold claim must cite this model’s source')
        if product['status'] == 'conflict' and not product.get('hold_reason'):
            raise ValueError('Unresolved conflicts need an explanation')
    return data


def commerce_eligible(product, data, today):
    """Missing, conflicted, future or stale evidence never opens a shop search."""
    if data.get('market') != 'DE' or product.get('status') != 'verified':
        return False
    records = [data, product] + [data.get('sources', {}).get(k, {}) for k in product.get('sources', [])]
    if not product.get('sources'):
        return False
    for record in records:
        if record is not data and record.get('status') != 'verified':
            return False
        try:
            age = (today - dt.date.fromisoformat(record['checked'])).days
        except (KeyError, TypeError, ValueError):
            return False
        if not 0 <= age <= min(data.get('max_age_days', 90), 90):
            return False
    return True


def render(today=None, data=None):
    data = load() if data is None else data
    today = today or dt.datetime.now(dt.timezone.utc).date()
    cards, rows = [], []
    for product in data['products']:
        eligible = commerce_eligible(product, data, today)
        state = 'Quellen geprüft' if eligible else 'Kaufverweis pausiert'
        rows.append(f'<tr><th scope="row"><a href="#{esc(product["id"])}">{esc(product["name"])}</a></th><td>{esc(product["role"])}</td><td>{esc(product["threshold_note"])}</td><td>{state}</td></tr>')
        refs = ' · '.join(f'<a href="{esc(data["sources"][key]["url"], quote=True)}">{esc(data["sources"][key]["title"])}</a>' for key in product['sources'])
        action = '<p class="rb-hold">' + esc(product.get('hold_reason') or 'Kaufverweis pausiert: Quellenprüfung ausstehend. Zuerst aktuelle Herstellerunterlagen prüfen.') + '</p>'
        if eligible:
            href = 'https://www.amazon.de/s?k=' + quote_plus(product['query']) + '&tag=getecoback-21'
            action = f'<p class="rb-commerce"><a class="rb-button" href="{esc(href, quote=True)}" target="_blank" rel="sponsored nofollow noopener">{esc(product["name"])}: Modellsuche bei Amazon.de →</a><small>Anzeige · Suchergebnisse, keine feste Produktseite. Generation und regionale Ausführung prüfen.</small></p>'
        fields = [('Übergänge', 'threshold_note'), ('Platz für die Station', 'dock'), ('Boden und Teppich', 'floor'), ('Pflege im Alltag', 'care'), ('Genau diese Ausführung', 'variant'), ('Teile nachkaufen', 'parts')]
        detail = ''.join(f'<dt>{label}</dt><dd>{esc(product[key])}</dd>' for label, key in fields)
        cards.append(f'<section class="rb-card" id="{esc(product["id"])}" data-model-status="{esc(product["status"])}"><p class="rb-kicker">{esc(product["role"])}</p><h3>{esc(product["name"])}</h3><p>{esc(product["facts"])}</p><dl>{detail}</dl><p class="rb-sources">Herstellerquellen: {refs}</p>{action}</section>')
    faq = ''.join(f'<details><summary>{esc(q)}</summary><p>{esc(a)}</p></details>' for q, a in FAQ)
    schema = {'@context': 'https://schema.org', '@graph': [
        {'@type': 'Article', 'headline': TITLE, 'description': DESCRIPTION, 'inLanguage': 'de', 'mainEntityOfPage': URL, 'datePublished': '2026-11-12', 'dateModified': '2026-11-12', 'author': {'@type': 'Organization', 'name': 'EcoBack', 'url': 'https://getecoback.com/'}, 'publisher': {'@type': 'Organization', 'name': 'EcoBack', 'url': 'https://getecoback.com/'}},
        {'@type': 'FAQPage', 'mainEntity': [{'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': a}} for q, a in FAQ]}
    ]}
    return f'''<!DOCTYPE html>
<html lang="de"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{esc(TITLE)}</title><meta name="description" content="{esc(DESCRIPTION, quote=True)}"><link rel="canonical" href="{URL}">
<link rel="alternate" hreflang="de" href="{URL}"><link rel="alternate" type="text/markdown" href="{URL[:-5]}.md">
<meta property="og:type" content="article"><meta property="og:title" content="{esc(TITLE)}"><meta property="og:description" content="{esc(DESCRIPTION, quote=True)}"><meta property="og:url" content="{URL}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml"><meta name="theme-color" content="#0a4d7a"><link rel="stylesheet" href="/assets/robot-guide.css">
<script type="application/ld+json">{json.dumps(schema, ensure_ascii=False).replace('<', chr(92)+'u003c')}</script></head><body>
<header class="rb-hero"><div class="wrap"><a href="/">EcoBack</a><p class="rb-kicker">Haushalt · Erst messen, dann auswählen</p><h1>{esc(TITLE)}</h1><p>Der passende Roboter muss durch deine Wohnung kommen. Und seine Station muss in deinen Alltag passen.</p></div></header>
<article class="wrap" data-robot-guide>
<div class="rb-answer"><strong>Die kurze Entscheidung</strong><p>Prüfe zuerst Übergänge, Möbelhöhe, Teppiche und den freien Platz für die Station. Erst wenn diese Grenzen passen, lohnt sich der Modellvergleich. Eine große Pa-Zahl oder maximale Kletterhöhe allein entscheidet das nicht.</p><a href="#wohnung-pruefen">1. Wohnung prüfen</a> · <a href="#modelle-vergleichen">2. Modelle abgleichen</a> · <a href="#pflege-einplanen">3. Pflege einplanen</a></div>
<p class="rb-note">Redaktionelle Kaufhilfe, kein eigener Gerätetest. Quellenstand: {esc(data['checked'])}. Drei Ansätze von manuell gepflegtem Wischpad bis zur Tankstation. Keine Live-Preise oder Liefergarantie.</p>
<h2 id="wohnung-pruefen">Vier Messungen, bevor du einen Roboter kaufst</h2>
<div class="rb-steps"><section><h3>1. Jede Kante einzeln</h3><p>Miss jede Stufe und bei mehreren Stufen auch den Abstand dazwischen. Notiere senkrechte oder schräge Kante, Material und Rutschigkeit. Eine Doppelschwelle besteht aus mehreren Übergängen; ihre Gesamthöhe ist kein Nachweis für eine gleich hohe Einzelkante.</p></section><section><h3>2. Die engste Möbelstelle</h3><p>Miss den niedrigsten Punkt einschließlich Querstreben und durchhängender Möbelteile. Plane Bewegungsspielraum ein. Die angegebene Gerätehöhe allein bestätigt keine sichere Durchfahrt; ein angehobenes Chassis kann zusätzlichen Raum brauchen.</p></section><section><h3>3. Teppiche und Freigabe</h3><p>Notiere Flor, Teppichdicke, Fransen und empfindliche Materialien. Bei Wischbetrieb gilt auch die Pflegefreigabe deines Bodenherstellers. Ein Mopp-Hubwert bestätigt nicht, dass weicher Flor trocken bleibt.</p></section><section><h3>4. Station im Betrieb</h3><p>Miss freien Anfahrbereich und Platz für Deckel, Tanks oder Beutel. Stationsabmessungen ersetzen die Vorgaben für freien Raum nicht. Die Karten unten unterscheiden beide Angaben; Tank- und Festwasser-Versionen nicht vermischen.</p></section></div>
<p><a class="rb-secondary" href="/rechner.html#home-fit-robot">Maße im vorhandenen Wohnungs-Check durchgehen →</a></p><p class="rb-note">Der Check ist eine allgemeine Vorprüfung. Er bestätigt weder die Eignung eines dieser Modelle noch das Überfahren deiner konkreten Schwelle.</p>
<section class="rb-no-buy" id="kein-neukauf"><h2>Wann du vorerst nichts kaufen solltest</h2><p>Fehlt der freie Stationsplatz, ist eine Schwelle ungeklärt oder kannst du Kabel und kleine Gegenstände nicht aus dem Fahrweg räumen, zuerst dieses Problem lösen. Bei empfindlichen Böden ohne Wischfreigabe die Nassfunktion nicht einplanen. Kommt dein vorhandener Sauger mit der Aufgabe gut zurecht, musst du nichts kaufen.</p><p>Ein Roboter übernimmt keine Treppenreinigung und beseitigt nicht jede manuelle Nacharbeit. Für gelegentliches Wischen kann die vorhandene Kombination aus Sauger und Mopp reichen. Willst du selbst führen statt Fahrwege vorzubereiten, hilft die <a href="/guide/saugwischer-kaufberatung.html">Kaufhilfe für Saugwischer</a>.</p></section>
<h2 id="modelle-vergleichen">Drei unterschiedliche Ansätze, mit klaren Grenzen</h2><p>Die Reihenfolge ist keine Rangliste. Beim D10 Plus Gen 2 pflegst du das Wischpad von Hand. Der L10s Ultra Gen 2 ergänzt Moppwäsche und Tankpflege. Beim Saros 10R kommen die flache Bauhöhe und die genau zu prüfende Doppelschwellen-Angabe hinzu. Den Quellenstatus findest du bei jedem Modell.</p>
<div class="rb-table" role="region" aria-label="Modellübersicht, horizontal scrollbar" tabindex="0"><table><caption>Wohnungsbedarf und Quellenstatus vergleichen</caption><thead><tr><th scope="col">Modell</th><th scope="col">Ansatz</th><th scope="col">Schwellenangabe mit Grenze</th><th scope="col">Status</th></tr></thead><tbody>{''.join(rows)}</tbody></table></div>
<p class="rb-disclosure">Anzeige · Die gekennzeichneten Modellsuchen enthalten Affiliate-Links. EcoBack kann bei qualifizierten Käufen eine Provision erhalten. Suchergebnisse bestätigen weder die genaue Variante noch Lieferumfang, Preis oder Verfügbarkeit.</p>
<div class="rb-models">{''.join(cards)}</div>
<h2 id="pflege-einplanen">Rechne deine aktive Arbeit mit</h2><p>Vergleiche dieselben Räume bei ähnlicher Verschmutzung: bisherige aktive Reinigungszeit gegenüber Aufräumen des Fahrwegs, manueller Nacharbeit und Gerätepflege. Die Fahr- oder Trockenzeit ohne deine Mitarbeit ist getrennte Wartezeit. Wir haben keine eigenen Zeitmessungen dieser Geräte.</p>
<ol><li><strong>Vor dem Lauf:</strong> Kabel, kleine Teile und gefährdete Gegenstände entfernen; Sperrzonen kontrollieren. An Absturzkanten die Schutzvorgaben der Anleitung einhalten.</li><li><strong>Nach dem Lauf:</strong> Rückstände und nicht erreichte Stellen prüfen. Bei Wischmodellen Schmutzwasser- und Waschbereich nach der genauen Anleitung reinigen.</li><li><strong>Regelmäßig:</strong> Bürsten, Sensoren, Filter und Beutel kontrollieren. Gewaschene Teile erst nach der vorgeschriebenen Trocknung einsetzen.</li><li><strong>Vor der Bestellung:</strong> Ersatzfilter, Beutel, Mopps und freigegebene Lösung mit vollständiger Modellkennung finden. „Passt für die Serie“ reicht ohne die genaue Kompatibilitätsliste nicht.</li></ol>
<p>Für den Kostenvergleich zählen Anschaffung, tatsächlich benötigte Ersatzteile und Verbrauchsmittel sowie gemessener Stromverbrauch. Herstellerintervalle sind kein belastbarer jährlicher Eurobetrag für deinen Haushalt. Bei einem bestehenden Roboter zunächst Bürsten, Sensoren, Filter und Stationsaufstellung prüfen.</p>
<h2 id="land-pruefen">Deutschland, Österreich oder Schweiz?</h2><dl class="rb-markets"><dt>Deutschland</dt><dd>Die freigegebenen Modellsuchen führen zu Amazon.de. Prüfe die genaue DE/EU-Ausführung, Netzanschluss, Verkäufer, Lieferumfang und Rückgabe. Ein Modellname allein bestätigt keine regionale Variante.</dd><dt>Österreich</dt><dd>Versand und Endpreis für deine österreichische Adresse sowie die regionale Ausführung beim Verkäufer prüfen. Eine sichtbare Amazon.de-Suche bestätigt keine Lieferung.</dd><dt>Schweiz</dt><dd>EUR-Angebote sind keine Schweizer CHF-Endpreise. Einfuhr, Anschluss, Garantieabwicklung und Lieferung vorab klären. Ein Reiseadapter ersetzt keine Prüfung der elektrischen Eignung; hier ist kein Schweizer Händlerprogramm angebunden.</dd></dl>
<h2 id="methode">Wie wir prüfen und was offenbleibt</h2><p>Die Karten trennen Herstellerangaben von der Entscheidung für deine Wohnung. Die verlinkten Originalanleitungen belegen Aufstellung, Pflege und Modellgrenzen; die Produktseiten ergänzen Gehäusehöhe und Funktionen. Wir vergeben keine Testnoten, übernehmen keine Händlerbewertungen und vergleichen keine unter unterschiedlichen Bedingungen gemessenen Pa-Zahlen.</p><p>Bei Saros 10R bleibt die Doppelschwellenangabe ausdrücklich eine Laborangabe; ein eigener Einzelschwellenwert wird hier nicht bestätigt. Suchlinks werden nur bei bestätigtem Quellenstatus und höchstens 90 Tage alter Prüfung erzeugt. Ein neu angezeigtes Seitendatum ersetzt keine erneute Quellenprüfung.</p>
<section id="haeufige-fragen" class="rb-faq"><h2>Häufige Fragen vor dem Kauf</h2>{faq}</section>
<div class="rb-next"><a href="/rechner.html#home-fit-robot">Wohnung prüfen →</a><a href="/guide/saugwischer-kaufberatung.html">Selbst führen und wischen →</a><a href="/tools.html">Alle kostenlosen Werkzeuge →</a></div>
</article><footer><a href="/impressum.html">Impressum</a> · <a href="/datenschutz.html">Datenschutz</a> · <a href="/ueber-uns.html">Über EcoBack</a></footer></body></html>
'''


def main():
    TARGET.write_text(render())
    print('Built robot buying path: exact source records; unsupported commerce withheld')


if __name__ == '__main__':
    main()
