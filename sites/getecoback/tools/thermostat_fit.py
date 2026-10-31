"""Narrow, sourced valve decision surface; shared data powers JS and no-JS table."""
from pathlib import Path
from html import escape as e
import hashlib
import json

ASSETS = Path(__file__).resolve().parents[1] / 'site' / 'assets'


def render():
    data = json.loads((ASSETS / 'thermostat-fit-data.json').read_text())
    models = ''.join(f'<option value="{e(x["id"])}">{e(x["label"])}</option>' for x in data['models'])
    valves = '<option value="unknown">Ventil unbekannt / nicht aufgeführt</option>' + ''.join(
        f'<option value="{e(x["id"])}">{e(x["label"])}</option>' for x in data['cases'])
    rows = ''.join(f'<tr role="row"><th role="rowheader" scope="row">{e(x["label"])}</th><td role="cell"><strong>{e(x["title"])}</strong><p>{e(x["detail"])}</p></td><td role="cell"><a data-valve-official href="{e(data["sources"][x["source"]]["url"])}">Herstellerangabe</a>; Bildabgleich in der <a data-valve-official href="{e(data["sources"]["guide"]["url"])}#page={x["page"]}">Ventilliste, Seite {x["page"]}</a></td></tr>' for x in data['cases'])
    encoded = json.dumps(data, ensure_ascii=False).replace('<', '\\u003c')
    return f'''<section id="ventilcheck" class="valve-check" data-valve-check aria-labelledby="valve-title">
<p class="winter-kicker">Vor dem Kauf · zwei Auswahlen, keine Texteingabe</p><h2 id="valve-title">Welcher Thermostatkopf passt zu meinem Ventil?</h2>
<p>Wähle zuerst die genaue Gerätegeneration, dann ein bereits identifiziertes Ventil. Der Check sortiert den nächsten Prüfschritt; er erkennt kein Ventil und erteilt keine Montagefreigabe.</p>
<div class="valve-controls" hidden data-valve-controls><label for="valve-model">Thermostatkopf<select id="valve-model" name="valve-model">{models}</select></label><label for="valve-connection">Bekanntes Ventil / Anschluss<select id="valve-connection" name="valve-connection">{valves}</select></label></div>
<div class="valve-result" data-valve-result role="status" aria-live="polite"><h3>Unbekannt ist ein sinnvolles Ergebnis</h3><p>Notiere die genaue Gerätegeneration und vergleiche Ventilkennzeichnung und Bilder mit der Herstelleranleitung. Kein Adapterkauf nur nach Markenname oder Gewindedurchmesser.</p></div>
<p data-valve-share-row hidden><button type="button" data-valve-share>Prüfschritt-Link kopieren</button><span data-valve-share-status role="status"></span></p>
<p class="winter-note">Der Link enthält nur diese beiden festen Auswahlkategorien, keine Fotos, Adresse oder Heizkosten. Geteilt wird ein Prüfschritt, kein bestätigter Kompatibilitätsnachweis.</p>
<details open><summary>Geprüfte Orientierung ohne JavaScript</summary><p><strong>Nur tado° V3+ und frühere Generationen.</strong> Nicht auf tado° X, TP-Link oder andere Thermostatköpfe übertragen. Bei unklarer Generation gibt es hier keine Zuordnung.</p><div class="winter-table"><table role="table"><caption>Begrenzte Auswahl aus Herstellerunterlagen, geprüft am 31. Oktober 2026</caption><thead role="rowgroup"><tr role="row"><th role="columnheader">Identifiziertes Ventil</th><th role="columnheader">Nächster Prüfschritt</th><th role="columnheader">Quelle / Abbildung</th></tr></thead><tbody role="rowgroup">{rows}</tbody></table></div></details>
<h3>Ventil noch unbekannt?</h3><ol><li>Modellbezeichnung auf dem bisherigen Kopf, Unterlagen und vorhandene Kennzeichnungen vergleichen. Bei Unsicherheit Fotos nach Herstelleranleitung für dessen Support oder den Fachbetrieb vorbereiten; hier ist kein Upload nötig.</li><li>Gewinde, Klemmanschluss und genaue Variante zusammen prüfen. Uni L und Uni LV oder RA, RAV und RAVL sind nicht austauschbare Bezeichnungen.</li><li>Den wasserführenden Ventilkörper nicht lösen. Bei Leckage, festsitzenden Teilen oder unklarer Zuständigkeit stoppen und einen Fachbetrieb beziehungsweise die Hausverwaltung einbeziehen.</li></ol>
<p><a data-valve-official href="{e(data['sources']['overview']['url'])}">tado°: vollständige Herstellerübersicht öffnen</a> · <a data-valve-official href="{e(data['sources']['x']['url'])}">Separate Hilfe für tado° X</a></p>
<p class="winter-note">Stand der Prüfung: 31. Oktober 2026. Die verlinkte Ventilliste trägt Version 2.0, September 2021 und wird weiterhin von der Herstellerhilfe verlinkt. Die Liste ist indikativ und unvollständig. Neuere Modellunterlagen und Herstellerbestätigung gehen vor. Keine eigenen Montage- oder Produkttests; die Herstellerlinks sind keine Affiliate-Links.</p>
<h3>Passt technisch – lohnt sich der Wechsel?</h3><p>Kompatibilität belegt noch keine Heizkostenersparnis. Prüfe zuerst deinen Zeitplan. Rechne danach Köpfe, notwendige Adapter, Zentrale, Batterien und verpflichtende Dienste zusammen. Für Deutschland und Österreich EUR, für die Schweiz CHF verwenden; keine Währungsumrechnung und keine bestätigte lokale Lieferbarkeit.</p><p><a class="winter-button" href="#rechner">Gesamtkosten und eigene Sparannahme prüfen ↓</a></p>
<script type="application/json" data-valve-data>{encoded}</script></section>'''


def assets():
    version = hashlib.sha256(b''.join((ASSETS / name).read_bytes() for name in (
        'thermostat-fit.mjs', 'thermostat-fit.css', 'thermostat-fit-data.json'))).hexdigest()[:12]
    return f'<link rel="stylesheet" href="/assets/thermostat-fit.css?v={version}"><script type="module" src="/assets/thermostat-fit.mjs?v={version}"></script>'
