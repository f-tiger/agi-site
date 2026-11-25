"""Narrow, sourced valve decision surface; shared data powers JS and no-JS table."""
from datetime import date
from pathlib import Path
from html import escape as e
from urllib.parse import quote, urlencode
import hashlib
import json

ASSETS = Path(__file__).resolve().parents[1] / 'site' / 'assets'
GUIDE = 'https://getecoback.com/guide/smarte-heizkoerperthermostate-lohnen-sich.html'


def render_rows(cases, sources, page_source=None):
    rows = []
    for case in cases:
        source = sources[case['source']]
        references = f'<a data-valve-official href="{e(source["url"])}">{e(source["title"])}</a>'
        if page_source and case.get('page'):
            guide_url = f'{sources[page_source]["url"]}#page={case["page"]}'
            references += f' · <a data-valve-official href="{e(guide_url)}">Ventilbilder, Seite {case["page"]}</a>'
        rows.append(f'<tr><th scope="row">{e(case["label"])}</th>'
                    f'<td><strong>{e(case["title"])}</strong><p>{e(case["detail"])}</p></td>'
                    f'<td>{references}</td></tr>')
    return ''.join(rows)


def share_nav(fragment, title):
    target = f'{GUIDE}#{fragment}'
    reddit = 'https://www.reddit.com/submit?' + urlencode({'url':target, 'title':title}, quote_via=quote)
    return f'<nav aria-label="Hinweis teilen"><a href="{e(target)}">Direktlink zu dieser Zuordnung</a> · <a href="{e(reddit)}" target="_blank" rel="noopener noreferrer">Auf Reddit teilen</a></nav>'


def render_bosch(data):
    bosch = data.get('bosch')
    if not bosch:
        return ''
    sources = data['sources']
    rows = render_rows(bosch['cases'], sources, 'bosch-guide')
    source_links = ' · '.join(f'<a data-valve-official href="{e(sources[key]["url"])}">{e(sources[key]["title"])}</a>'
                              for key in ('bosch-product', 'bosch-adapter', 'bosch-guide'))
    reviewed = date.fromisoformat(bosch['reviewed']).strftime('%d.%m.%Y')
    title = 'Bosch Heizkörper-Thermostat II [+M] an Danfoss RA, RAV oder RAVL prüfen'
    return f'''<section id="bosch-ii-m-danfoss-adapter" aria-labelledby="bosch-ii-m-danfoss-title">
<h3 id="bosch-ii-m-danfoss-title">Welcher Danfoss-Adapter passt zum Bosch II [+M]?</h3>
<p>Diese Zuordnung gilt für das deutsche Bosch Smart Home Heizkörper-Thermostat II [+M], Gerätenummer <strong>{e(bosch['model'])}</strong>. Prüfe die genaue Variante an der Verpackung oder in den Geräteunterlagen.</p>
<p>Bosch zeigt bei <strong>Danfoss RAV 34 mm</strong> und bei <strong>Danfoss RAVL 25,5 mm</strong> am Anschluss. Beide haben vier Kerben. Nutze die Maße als Hinweis und vergleiche die Kennzeichnung am vorhandenen Ventil und die Abbildungen in der Bosch-Übersicht.</p>
<div class="winter-table"><table><caption>Danfoss-Anschlüsse am Bosch II [+M], geprüft am {reviewed}</caption><thead><tr><th scope="col">Identifiziertes Ventil</th><th scope="col">Nächster Prüfschritt</th><th scope="col">Bosch-Quelle</th></tr></thead><tbody>{rows}</tbody></table></div>
<p>Bei bestätigtem RAV führt Bosch den separaten Adapter mit der Gerätenummer <strong>8750002600</strong> und EAN <strong>4062321692636</strong>. Bei RA oder RAVL prüfe den passenden beiliegenden Adapter in der genauen Packung. Ist die Kennzeichnung offen, warte mit der Bestellung. Am wasserführenden Ventilkörper nichts lösen. Bei Unsicherheit einen Fachbetrieb fragen.</p>
<p class="winter-note">{source_links}.</p>
{share_nav('bosch-ii-m-danfoss-adapter', title)}
</section>'''


def render_fritz(data):
    fritz = data.get('fritz')
    if not fritz:
        return ''
    sources = data['sources']
    rows = render_rows(fritz['cases'], sources)
    source_links = ' · '.join(f'<a data-valve-official href="{e(sources[key]["url"])}">{e(sources[key]["title"])}</a>'
                              for key in ('fritz-product', 'fritz-valves'))
    reviewed = date.fromisoformat(fritz['reviewed']).strftime('%d.%m.%Y')
    title = 'FRITZ!Smart Thermo 302 an Danfoss RA, RAV oder RAVL prüfen'
    return f'''<section id="fritz-302-danfoss-adapter" aria-labelledby="fritz-302-danfoss-title">
<h3 id="fritz-302-danfoss-title">Welcher Danfoss-Adapter passt zum FRITZ!Smart Thermo 302?</h3>
<p>Diese Zuordnung gilt für das deutsche <strong>FRITZ!Smart Thermo 302</strong>, auch als <strong>FRITZ!DECT 302</strong> dokumentiert, Artikelnummer <strong>{e(fritz['model'])}</strong>. Prüfe die genaue Variante an der Verpackung oder in den Geräteunterlagen.</p>
<p>FRITZ! nennt <strong>34 mm für Danfoss RAV</strong> und <strong>25,5 mm für Danfoss RAVL</strong>. Nutze die Maße als Hinweis und gleiche die Kennzeichnung am vorhandenen Ventil mit der Herstellerübersicht ab.</p>
<div class="winter-table"><table><caption>Danfoss-Anschlüsse am FRITZ!Smart Thermo 302, geprüft am {reviewed}</caption><thead><tr><th scope="col">Identifiziertes Ventil</th><th scope="col">Nächster Prüfschritt</th><th scope="col">FRITZ!-Quelle</th></tr></thead><tbody>{rows}</tbody></table></div>
<p>Ist die Kennzeichnung offen, warte mit der Bestellung und kläre den Anschluss mit dem Hersteller oder einem Fachbetrieb. Am wasserführenden Ventilkörper nichts lösen.</p>
<p class="winter-note">{source_links}.</p>
{share_nav('fritz-302-danfoss-adapter', title)}
</section>'''


def render():
    data = json.loads((ASSETS / 'thermostat-fit-data.json').read_text())
    models = ''.join(f'<option value="{e(x["id"])}">{e(x["label"])}</option>' for x in data['models'])
    valve_labels = {'unknown': 'Ventil unbekannt / nicht aufgeführt'}
    cases = data['cases'] + data.get('bosch', {}).get('cases', []) + data.get('fritz', {}).get('cases', [])
    for case in cases:
        valve_labels.setdefault(case['id'], case['label'])
    if data.get('bosch') or data.get('fritz'):
        valve_labels['danfoss-ra'] = 'Danfoss RA'
    valves = ''.join(f'<option value="{e(value)}">{e(label)}</option>' for value, label in valve_labels.items())
    rows = ''.join(f'<tr role="row"><th role="rowheader" scope="row">{e(x["label"])}</th><td role="cell"><strong>{e(x["title"])}</strong><p>{e(x["detail"])}</p></td><td role="cell"><a data-valve-official href="{e(data["sources"][x["source"]]["url"])}">Herstellerangabe</a>; Bildabgleich in der <a data-valve-official href="{e(data["sources"]["guide"]["url"])}#page={x["page"]}">Ventilliste, Seite {x["page"]}</a></td></tr>' for x in data['cases'])
    encoded = json.dumps(data, ensure_ascii=False).replace('<', '\\u003c')
    return f'''<section id="ventilcheck" class="valve-check" data-valve-check aria-labelledby="valve-title">
<p class="winter-kicker">Vor dem Kauf · zwei Auswahlen, keine Texteingabe</p><h2 id="valve-title">Welcher Thermostatkopf passt zu meinem Ventil?</h2>
<p>Wähle zuerst die genaue Gerätegeneration, dann ein bereits identifiziertes Ventil. Der Check sortiert den nächsten Prüfschritt; er erkennt kein Ventil und erteilt keine Montagefreigabe.</p>
<section aria-labelledby="danfoss-altventil">
<h3 id="danfoss-altventil">Welcher Typ steckt hinter dem alten Danfoss-Klickventil?</h3>
<p>Danfoss verwendet <a href="https://designcenter.danfoss.com/de-de/products/p/015G4590">RA-click als Anschlussbezeichnung</a>. Ein Steck- oder Klemmgefühl ist ein erster Hinweis. Vergleiche die Kennzeichnung am Ventil und die Anschlussform in der Herstellerzeichnung, bevor du RA, RAV oder RAVL auswählst.</p>
<p>Für ältere Ventile zeigt <a href="https://assets.danfoss.com/documents/latest/215970/AB433044178502de-DE0102.pdf">Danfoss den Ventilhals mit 34 mm bei RAV und 26 mm bei RAVL</a>. <a href="{e(data['sources']['fritz-valves']['url'])}">FRITZ! nennt für RAVL 25,5 mm</a>. Vergleiche Maß und Messstelle mit der jeweiligen Skizze. Eine einzelne Messung reicht für die Adapterwahl nicht aus.</p>
<p>Ist Ventiltyp oder gewünschte Gerätegeneration offen, behalte den vorhandenen Kopf und warte mit der Bestellung. Notiere sichtbare Kennzeichnungen und zeige sie dem Hersteller oder Fachbetrieb. Am wasserführenden Ventilkörper nichts lösen. Melde eine undichte oder festsitzende Stelle dem Fachbetrieb oder der Hausverwaltung.</p>
<p>Bei bestätigtem Ventil und Kopf prüfe den Lieferumfang für <a href="#bosch-ii-m-danfoss-adapter">Bosch II [+M]</a> oder <a href="#fritz-302-danfoss-adapter">FRITZ!Smart Thermo 302</a> in der jeweils passenden Übersicht. Quellen für Deutschland geprüft am <time datetime="2026-11-25">25. November 2026</time>.</p>
</section>
<div class="valve-controls" hidden data-valve-controls><label for="valve-model">Thermostatkopf<select id="valve-model" name="valve-model">{models}</select></label><label for="valve-connection">Bekanntes Ventil / Anschluss<select id="valve-connection" name="valve-connection">{valves}</select></label></div>
<div class="valve-result" data-valve-result role="status" aria-live="polite"><h3>Unbekannt ist ein sinnvolles Ergebnis</h3><p>Notiere die genaue Gerätegeneration und vergleiche Ventilkennzeichnung und Bilder mit der Herstelleranleitung. Kein Adapterkauf nur nach Markenname oder Gewindedurchmesser.</p></div>
<p data-valve-share-row hidden><button type="button" data-valve-share>Prüfschritt-Link kopieren</button><span data-valve-share-status role="status"></span></p>
<p class="winter-note">Der Link enthält nur diese beiden festen Auswahlkategorien, keine Fotos, Adresse oder Heizkosten. Geteilt wird ein Prüfschritt, kein bestätigter Kompatibilitätsnachweis.</p>
<details open><summary>Geprüfte Orientierung ohne JavaScript</summary><p><strong>Nur tado° V3+ und frühere Generationen.</strong> Nicht auf tado° X, TP-Link oder andere Thermostatköpfe übertragen. Bei unklarer Generation gibt es hier keine Zuordnung.</p><div class="winter-table"><table role="table"><caption>Begrenzte Auswahl aus Herstellerunterlagen, geprüft am 31. Oktober 2026</caption><thead role="rowgroup"><tr role="row"><th role="columnheader">Identifiziertes Ventil</th><th role="columnheader">Nächster Prüfschritt</th><th role="columnheader">Quelle / Abbildung</th></tr></thead><tbody role="rowgroup">{rows}</tbody></table></div></details>
{render_bosch(data)}
{render_fritz(data)}
<h3>Ventil noch unbekannt?</h3><ol><li>Modellbezeichnung auf dem bisherigen Kopf, Unterlagen und vorhandene Kennzeichnungen vergleichen. Bei Unsicherheit Fotos nach Herstelleranleitung für dessen Support oder den Fachbetrieb vorbereiten; hier ist kein Upload nötig.</li><li>Gewinde, Klemmanschluss und genaue Variante zusammen prüfen. Uni L und Uni LV oder RA, RAV und RAVL sind nicht austauschbare Bezeichnungen.</li><li>Den wasserführenden Ventilkörper nicht lösen. Bei Leckage, festsitzenden Teilen oder unklarer Zuständigkeit stoppen und einen Fachbetrieb beziehungsweise die Hausverwaltung einbeziehen.</li></ol>
<p><a data-valve-official href="{e(data['sources']['overview']['url'])}">tado°: vollständige Herstellerübersicht öffnen</a> · <a data-valve-official href="{e(data['sources']['x']['url'])}">Separate Hilfe für tado° X</a></p>
<p class="winter-note">Stand der Prüfung: 31. Oktober 2026. Die verlinkte Ventilliste trägt Version 2.0, September 2021 und wird weiterhin von der Herstellerhilfe verlinkt. Die Liste ist indikativ und unvollständig. Neuere Modellunterlagen und Herstellerbestätigung gehen vor. Keine eigenen Montage- oder Produkttests; die Herstellerlinks sind keine Affiliate-Links.</p>
<h3>Passt technisch – lohnt sich der Wechsel?</h3><p>Kompatibilität belegt noch keine Heizkostenersparnis. Prüfe zuerst deinen Zeitplan. Rechne danach Köpfe, notwendige Adapter, Zentrale, Batterien und verpflichtende Dienste zusammen. Für Deutschland und Österreich EUR, für die Schweiz CHF verwenden; keine Währungsumrechnung und keine bestätigte lokale Lieferbarkeit.</p><p><a class="winter-button" href="#rechner">Gesamtkosten und eigene Sparannahme prüfen ↓</a></p>
<script type="application/json" data-valve-data>{encoded}</script></section>'''


def assets():
    version = hashlib.sha256(b''.join((ASSETS / name).read_bytes() for name in (
        'thermostat-fit.mjs', 'thermostat-fit.css', 'thermostat-fit-data.json'))).hexdigest()[:12]
    return f'<link rel="stylesheet" href="/assets/thermostat-fit.css?v={version}"><script type="module" src="/assets/thermostat-fit.mjs?v={version}"></script>'
