"""Sourced thermostat package choices on the existing intent-owning guide."""
import datetime as dt
import json
import re
from html import escape as e
from pathlib import Path
from urllib.parse import quote_plus, urlsplit

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data/thermostat-catalog.json'
SLUG = 'smarte-heizkoerperthermostate-lohnen-sich'
HOSTS = {'shop.tado.com', 'www.bosch-smarthome.com', 'fritz.com', 'www.tp-link.com'}


def load():
    data = json.loads(DATA.read_text())
    if data['market'] != 'DE' or data['schema_version'] != 1:
        raise ValueError('Unsupported thermostat catalog market/schema')
    dt.date.fromisoformat(data['checked'])
    ids = set()
    for item in data['products']:
        if not re.fullmatch(r'[a-z0-9-]+', item['id']) or item['id'] in ids:
            raise ValueError('Duplicate/invalid thermostat identity')
        ids.add(item['id'])
        for key in ['source', 'manual']:
            if key not in item:
                continue
            url = urlsplit(item[key])
            if url.scheme != 'https' or url.hostname not in HOSTS or url.query or url.fragment or url.username or url.port:
                raise ValueError('Unreviewed thermostat source')
        if not item['query'].strip() or item['status'] not in {'verified', 'unverified'}:
            raise ValueError('Missing model query or source status')
        if 'checked' in item:
            dt.date.fromisoformat(item['checked'])
        if 'alternate_query' in item and not (item['alternate_query'].strip() and item['alternate_label'].strip()):
            raise ValueError('Missing alternate package query or label')
    return data


def buyer_start():
    """Static route choice before the model-specific valve tool; no inferred fit."""
    return ('<section class="tc-start" id="thermostat-start" aria-labelledby="tc-start-title">'
            '<h2 id="tc-start-title">Lohnt sich ein smartes Heizkörperthermostat für mich?</h2>'
            '<p><strong>Ein smarter Kopf lohnt sich eher, wenn ein Zeitplan deine bisherige Heizroutine verbessert.</strong> '
            'Wer schon passend herunterregelt, hat möglicherweise wenig zusätzlichen Nutzen. Vor dem Kauf müssen '
            'Ventil, vorhandene Zentrale und vollständiges Paket zusammenpassen. Eine feste Ersparnis ist nicht garantiert.</p>'
            '<ul class="tc-routes">'
            '<li><a href="#eb-thermostat-products"><strong>Ich kenne mein vorhandenes System</strong>'
            ' <span>tado° X, Bosch II [+M], FRITZ! 302 oder Kasa KE100 samt benötigter Zentrale vergleichen.</span></a></li>'
            '<li><a href="#ventilcheck"><strong>Ich bin beim Ventil unsicher</strong>'
            ' <span>Modell und Anschluss klären. Prüfe tado° V3+, Bosch II [+M] und FRITZ! 302 anhand der jeweiligen Herstellerunterlagen.</span></a></li>'
            '<li><a href="#thermostat-paketkosten"><strong>Ich möchte die Gesamtkosten prüfen</strong>'
            ' <span>Köpfe, fehlende Zentrale und Adapter zählen; danach mit eigener Sparannahme rechnen.</span></a></li>'
            '<li><a href="#thermostat-behalten"><strong>Mein bisheriger Kopf reicht vielleicht</strong>'
            ' <span>Weiterverwenden oder einen einfachen Zeitplan prüfen, bevor du ein Funk-System kaufst.</span></a></li>'
            '</ul><p><a href="/guide/heizkoerper-wird-nicht-warm.html#referenzraum-warm-nebenraum-kalt">Ein Zimmer bleibt trotz warmem Referenzraum kalt</a> · <a href="#thermostat-ohne-internet">Bedienung ohne Internet oder Zentrale prüfen</a></p>'
            '<p class="tc-source">Grundlage: <a href="https://www.verbraucherzentrale.de/wissen/energie/heizen-und-warmwasser/heizkosten-sparen-thermostat-richtig-einstellen-und-wechseln-7940">'
            'Verbraucherzentrale zur Thermostatregelung</a> (Quellenstand 4. Oktober 2026). '
            'Modell- und Paketquellen stehen bei den jeweiligen Geräten. '
            'Redaktionelle Entscheidungshilfe, kein eigener Produkttest.</p></section>')


def offline_choice():
    return (
        '<section class="tc-keep" aria-labelledby="thermostat-ohne-internet">'
        '<h3 id="thermostat-ohne-internet">Welches Thermostat funktioniert ohne Internet oder Zentrale?</h3>'
        '<p>Vor dem Kauf festlegen, ob du nur am Heizkörper drehen oder auch einen Zeitplan beziehungsweise App-Zugriff '
        'brauchst. Ein fehlender Internetzugang und eine fehlende Verbindung zur Zentrale sind verschiedene Fälle.</p>'
        '<ul><li><strong>Bosch II [+M] ohne Zentrale.</strong> Nach der Kalibrierung lässt sich die Wunschtemperatur '
        'laut Bosch am Drehknopf einstellen. Für das Konfigurationsmenü am Gerät muss der Kopf mit einem Bosch- oder '
        'Matter-System gekoppelt sein. Wenn du Zeitpläne brauchst, prüfe das gewählte System vor der Bestellung. '
        '<a href="https://www.bosch-smarthome.com/res/web/produkt/heizkoerper-thermostat2/pdf/8-750-002-924_V001_BTH-RAD_OM_11L_20240819.pdf">'
        'Bosch-Anleitung II [+M], Abschnitt Autarker Betrieb</a> · <a href="#thermostat-bosch-ii-m">Bosch-System und Paket prüfen</a>.</li>'
        '<li><strong>FRITZ!Smart Thermo 302 bei einer Unterbrechung.</strong> Laut FRITZ! bleiben Einstellungen '
        'bei fehlendem Internet, Stromausfall an der FRITZ!Box oder unterbrochener DECT-Verbindung erhalten. '
        'Die automatische Schaltung ist dabei eingeschränkt. Die Anleitung nennt Routinen und den Zugriff per '
        'FRITZ!App als Beispiele. Die Hinweise gelten für das aktuelle FRITZ!OS. Kläre vor dem Kauf für deine Ausfallart, '
        'ob dein gewünschter Zeitplan funktioniert. '
        '<a href="https://fritz.com/apps/knowledge-base/FRITZ-Smart-Thermo-302/3523_Verhalten-des-FRITZ-Heizkorperreglers-bei-Strom-oder-Internetausfall/">'
        'FRITZ!-Wissensdokument 3523</a> · <a href="#thermostat-fritz-302">FRITZ!Box und Paket prüfen</a>.</li></ul>'
        '<p>Wenn dein vorhandener Kopf für die manuelle Regelung reicht, behalte ihn. Für einen festen Zeitplan '
        'ohne Funk kommt ein lokal programmierbarer Kopf infrage. Ist die gewünschte Funktion ungeklärt, '
        'warte mit der Bestellung. <a href="#thermostat-paketkosten">Das vollständige Paket rechnen</a>.</p>'
        '<p class="tc-source">Herstellerquellen für Deutschland geprüft am <time datetime="2026-11-25">25. November 2026</time>.</p>'
        '</section>'
    )


def render(today=None, data=None):
    data = load() if data is None else data
    today = today or dt.datetime.now(dt.timezone.utc).date()
    rows, cards = [], []
    adapter_checks = {
        'bosch-ii-m': '<p><a href="#bosch-ii-m-danfoss-adapter">Für Bosch II [+M]: Danfoss RA, RAV und RAVL abgleichen</a></p><p><a href="#bosch-ii-m-e03">Bosch II [+M] zeigt E03? Kalibrierung prüfen</a></p>',
        'fritz-302': '<p><a href="#fritz-302-danfoss-adapter">Für FRITZ! 302: Danfoss-Adapter und Lieferumfang prüfen</a></p>',
    }
    for item in data['products']:
        target = 'thermostat-' + item['id']
        rows.append(f'<tr><th scope="row"><a href="#{target}">{e(item["name"])}</a></th><td>{e(item["role"])}</td><td>{e(item["system"])}</td></tr>')
        sources = f'<a href="{e(item["source"], quote=True)}">{e(item["source_label"])}</a>'
        if item.get('manual'):
            sources += f' · <a href="{e(item["manual"], quote=True)}">{e(item["manual_label"])}</a>'
        review_day = item.get('checked', data['checked'])
        sources += f' · geprüft am <time datetime="{e(review_day, quote=True)}">{e(review_day)}</time>'
        age = (today - dt.date.fromisoformat(review_day)).days
        action = '<p class="tc-status">Modellsuche pausiert: Quellenprüfung ausstehend. Bitte zuerst aktuelle Herstellerunterlagen prüfen.</p>'
        if 0 <= age <= data['max_age_days'] and item['status'] == 'verified':
            searches = [(item['query'], item.get('search_label', item['name']))]
            if 'alternate_query' in item:
                searches.append((item['alternate_query'], item['alternate_label']))
            links = []
            for query, label in searches:
                href = 'https://www.amazon.de/s?k=' + quote_plus(query) + '&tag=getecoback-21'
                links.append(f'<p class="tc-commerce"><small>Anzeige · Modellsuche, kein geprüftes Einzelangebot.</small><a data-winter-shop href="{e(href, quote=True)}" target="_blank" rel="sponsored nofollow noopener">{e(label)} bei Amazon.de suchen →</a></p>')
            action = ''.join(links)
        adapter_check = adapter_checks.get(item['id'], '')
        cards.append(f'<section class="tc-card" id="{target}" aria-labelledby="{target}-title"><h3 id="{target}-title">{e(item["name"])}</h3>'
                     f'<p class="tc-role">{e(item["role"])}</p><dl><dt><strong>System: </strong></dt><dd><p> {e(item["system"])}</p></dd>'
                     f'<dt><strong>Paket und Zusatzkauf: </strong></dt><dd><p> {e(item["package"])}</p></dd><dt><strong>Betrieb und Funktionen: </strong></dt><dd><p> {e(item["care"])}</p></dd></dl>'
                     f'<p class="tc-limit"><strong>Vor der Bestellung:</strong> {e(item["limit"])}</p>{adapter_check}<p class="tc-source">{sources}</p>{action}</section>')
    return ('<section class="thermostat-catalog" id="eb-thermostat-products" aria-labelledby="tc-title">'
            '<h2 id="tc-title">Welches System und welches Paket passt zu dir?</h2>'
            '<p>Konkrete Modelle für unterschiedliche vorhandene Systeme. Die Auswahl ist keine Rangliste und kein eigener Produkttest. '
            'Die Ventilpassung und der Nutzen eines Zeitplans bleiben eigene Prüfschritte.</p>'
            '<nav class="tc-jump" aria-label="Vorhandenes Thermostat-System"><a href="#thermostat-tado-x-starter">Neues tado° X-System</a>'
            '<a href="#thermostat-bosch-ii-m">Bosch oder Matter</a><a href="#thermostat-fritz-302">FRITZ!Box vorhanden</a>'
            '<a href="#thermostat-kasa-ke100">Kasa KE100: Einzelkopf oder Kit</a></nav>' +
            offline_choice() +
            '<div class="tc-keep" id="thermostat-behalten"><h3>Vorhandene Köpfe weiter nutzen</h3>'
            '<p>Deine Räume werden passend zur Nutzung warm und du regelst zuverlässig herunter? Dann musst du nicht auf smarte Köpfe wechseln. '
            'Für gleichbleibende Zeiten kann ein einfacher programmierbarer Kopf genügen. Vergleiche diese Lösung vor einem neuen Funk-System.</p>'
            '<p><a href="#rechner">Erst mit 0 % zusätzlicher Ersparnis rechnen</a> · <a href="#ventilcheck">Ventil und Modellgeneration klären</a></p></div>'
            '<p class="tc-source">Prüfdaten stehen bei den jeweiligen Herstellerquellen. Keine Live-Preise, Bestands- oder Spargarantie. '
            'Aktuelle Herstellerunterlagen und das konkrete Händlerpaket gehen vor.</p>'
            '<p class="tc-source">Auf kleinen Bildschirmen kannst du die Vergleichstabelle seitlich verschieben.</p>'
            '<div class="tc-table" role="region" aria-label="Thermostat-Systeme vergleichen, horizontal scrollbar" tabindex="0"><table>'
            '<caption>Erst die vorhandene Zentrale, dann den Thermostatkopf wählen</caption><thead><tr><th scope="col">Genaues Modell</th>'
            '<th scope="col">Ausgangslage</th><th scope="col">Was benötigt wird</th></tr></thead><tbody>' + ''.join(rows) +
            '</tbody></table></div><div class="tc-grid">' + ''.join(cards) + '</div>'
            '<aside class="tc-market"><h3>Deutschland, Österreich oder Schweiz?</h3><p><strong>Anzeige · Affiliate-Links:</strong> '
            'Als Amazon-Partner verdienen wir an qualifizierten Verkäufen. Die Links öffnen Modellsuchen bei Amazon.de, keine geprüften Einzelangebote. '
            'Modell, Generation, Starter Kit und Verkäufer im Ergebnis abgleichen.</p>'
            '<p><strong>DE:</strong> EUR-Gesamtkosten einschließlich benötigter Zentrale prüfen. <strong>AT:</strong> Lieferung an deine Adresse, '
            'Rückgabe und Endpreis separat bestätigen. <strong>CH:</strong> lokale CHF-Kosten, Anschluss, Import und Garantie prüfen; '
            'diese Auswahl bestätigt keinen Schweizer Händler. Keine automatische Währungsumrechnung.</p></aside>'
            '<h3 id="thermostat-paketkosten">Ein Raum oder drei Räume: das vollständige Paket rechnen</h3>'
            '<p>Preise selbst beim Händler eintragen und alle Beträge in derselben Währung halten. Ein Raum kann mehrere Heizkörper haben: '
            'Köpfe zählen, nicht nur Räume. Bereits enthaltene oder weiterverwendbare Teile nicht doppelt kaufen.</p>'
            '<ul><li><strong>Ein Heizkörper:</strong> benötigter Kopf bzw. Starter Kit + fehlende Zentrale + nötige Adapter.</li>'
            '<li><strong>Drei Heizkörper:</strong> Starter Kit mit einem Kopf + zwei passende Einzelköpfe, oder drei Köpfe + fehlende Zentrale; '
            'jeweils benötigte Adapter hinzufügen. Mehrfachpack und Starter Kit nicht verwechseln.</li>'
            '<li><strong>Jährlicher Betrieb:</strong> Batterien bzw. Laden, Zentrale und nur tatsächlich gewählte kostenpflichtige Dienste berücksichtigen.</li></ul>'
            '<p><a class="winter-button" href="#rechner">Gesamtsumme und eigene Sparannahme im Rechner prüfen ↑</a></p>'
            '<p>Die Rechnung bestätigt weder die Ventilpassung noch eine Ersparnis. Mit 0 % Annahme zeigt sie auch den Fall ohne finanziellen Rückfluss.</p></section>')


def asset_tag():
    import hashlib
    version = hashlib.sha256((ROOT / 'site/assets/thermostat-catalog.css').read_bytes()).hexdigest()[:12]
    return f'<link rel="stylesheet" href="/assets/thermostat-catalog.css?v={version}">'
