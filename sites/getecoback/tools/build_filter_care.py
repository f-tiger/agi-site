"""German exact-model filter lookup and local care notes. No static commerce."""
from datetime import date
from html import escape
import hashlib
import json
from pathlib import Path
from urllib.parse import quote, urlencode

from filter_finder_de_sources import DATA, ROOT, validate
from build_filter_finder import state
from build_agent_md import to_markdown

ROUTE = '/ersatzfilter.html'
TITLE = 'Ersatzfilter nach genauem Modell finden und Pflege notieren | EcoBack'
DESCRIPTION = 'Originalfilter für Levoit Core 300S und Beurer LR 401 anhand deutscher Herstellerquellen finden. Modell und letzte Pflege kostenlos im eigenen Browser speichern.'


def exact_label_panel(items):
    answers = []
    for item in items:
        identity = item['id']
        model = f'{item["brand"]} {item["models"][0]}'
        heading = model
        if identity == 'levoit-core-300s':
            heading += ' ohne Pro-Zusatz'
            answer = (f'<p>Steht <strong>{escape(item["models"][0])}</strong> auf dem Typenschild, '
                      f'prüfe in der deutschen Herstellerquelle die Option <strong>{escape(item["variant"])}</strong>. '
                      'Bei einem Pro-Zusatz verwende die Unterlagen der dort angegebenen Variante. '
                      'Prüfe die Stückzahl der gewählten Ersatzfilter-Packung beim Verkäufer.</p>')
        else:
            answer = (f'<p>Für den Geräteaufdruck <strong>{escape(item["models"][0])}</strong> '
                      f'gleiche die Filterartikelnummer <strong>{escape(item["part_number"])}</strong> '
                      'in der deutschen Herstellerquelle und auf dem Angebot ab.</p>')
        target = f'https://getecoback.com{ROUTE}#{identity}'
        title = f'Welcher Ersatzfilter passt zum {model}?'
        reddit = 'https://www.reddit.com/submit?' + urlencode({'url': target, 'title': title}, quote_via=quote)
        answers.append(
            f'<section id="{escape(identity)}" class="filter-source-anchor" aria-labelledby="label-{escape(identity)}">'
            f'<h3 id="label-{escape(identity)}">{escape(heading)}</h3>{answer}'
            f'<p><a href="#quelle-{escape(identity)}">Herstellerzuordnung und Prüfdatum</a></p>'
            f'<nav aria-label="{escape(model)} teilen"><a href="{escape(target)}">Direktlink</a> · '
            f'<a href="{escape(reddit)}" target="_blank" rel="noopener noreferrer">Auf Reddit teilen</a></nav></section>'
        )
    return ('<div id="typenschild-abgleichen" class="section-intro">'
            + ''.join(answers)
            + '<p>Ist der Aufdruck unlesbar, weicht die Modellkennung ab oder steht eine erneute Quellenprüfung aus, '
              'kläre die Zuordnung mit dem Hersteller und warte mit der Bestellung.</p></div>')


def build():
    data = validate(json.loads(DATA.read_text()))
    items = data['items']
    e = lambda value: escape(str(value), quote=True)
    version = hashlib.sha256(b''.join((ROOT/'site/assets'/name).read_bytes() for name in
        ['filter-finder.css','filter-care.css','filter-care.mjs','filter-care-core.mjs','filter-finder-core.mjs'])).hexdigest()[:16]
    rows=[]
    for item in items:
        current = state(item, date.today()) == 'Manufacturer listing checked'
        label = 'Herstellerzuordnung geprüft' if current else 'Zuordnung erneut prüfen – Händlersuche pausiert'
        rows.append(f'''<tr id="quelle-{e(item['id'])}"><th scope="row">{e(item['brand'])} {e(item['models'][0])}</th><td>{e(item['name'])}<span class="part-number">Variante: {e(item['variant'])}</span>{'<span class="part-number">Artikelnummer: '+e(item['part_number'])+'</span>' if item['part_number'] else ''}</td><td><a href="{e(item['source_url'])}" rel="noopener noreferrer" target="_blank">Deutsche Herstellerquelle</a><span class="table-note">{e(item['note'])}</span></td><td><time datetime="{e(item['checked_at'])}">{e(item['checked_at'])}</time><span class="table-note" data-record-id="{e(item['id'])}">{label}</span></td></tr>''')
    public = [{k:item[k] for k in ('id','market','brand','models','name','variant','part_number','note','source_url','checked_at','status')} for item in items]
    payload=json.dumps({'market':'DE','items':public},ensure_ascii=False).replace('<','\\u003c')
    schema=json.dumps({'@context':'https://schema.org','@type':'WebPage','name':TITLE,'url':'https://getecoback.com'+ROUTE,'inLanguage':'de-DE','datePublished':data['updated'],'dateModified':data['updated'],'description':DESCRIPTION},ensure_ascii=False).replace('<','\\u003c')
    page=f'''<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{TITLE}</title><meta name="description" content="{DESCRIPTION}"><meta name="robots" content="index,follow"><link rel="canonical" href="https://getecoback.com{ROUTE}"><meta property="og:type" content="website"><meta property="og:title" content="{TITLE}"><meta property="og:description" content="{DESCRIPTION}"><meta property="og:url" content="https://getecoback.com{ROUTE}"><meta name="twitter:card" content="summary"><link rel="icon" href="/favicon.svg"><link rel="stylesheet" href="/assets/filter-finder.css?v={version}"><link rel="stylesheet" href="/assets/filter-care.css?v={version}"><script type="application/ld+json">{schema}</script><script id="filter-care-data" type="application/json">{payload}</script><script type="module" src="/assets/filter-care.mjs?v={version}"></script></head>
<body><a class="skip-link" href="#finder">Zur Modellauswahl</a><header class="site-header"><a class="wordmark" href="/">EcoBack<span>Geräte verstehen. Passend entscheiden.</span></a><nav aria-label="Seitennavigation"><a href="/produkte.html#kategorie-luftreiniger">Geräte vergleichen</a><a href="#model-table">Quellen</a></nav><span class="market-label">Deutschland</span></header>
<main><article><section class="finder-intro de-filter-intro"><div class="intro-copy"><p class="category-label">Ersatzfilter &amp; Gerätepflege</p><h1>Welcher Filter gehört <br>zu deinem Gerät?</h1><p>Vergleiche zuerst den vollständigen Modellnamen auf dem Typenschild. Hier findest du die dokumentierte Herstellerzuordnung und kannst deine letzte Pflege im eigenen Browser notieren.</p><div class="coverage-line"><span>{len(items)} genaue Modelle</span><span>Deutsche Herstellerquellen</span><span>Kostenlos, ohne Konto</span></div></div></section>
<section id="finder" class="finder-panel" aria-labelledby="finder-title"><div class="finder-heading"><div><h2 id="finder-title">Dein genaues Modell auswählen</h2><p>Aktuell: Levoit Core 300S und Beurer LR 401. Ähnliche Namen und andere Modellzusätze werden nicht gleichgesetzt.</p></div><span class="local-label">Suche und Notizen bleiben im Browser</span></div><form hidden id="model-search-form" role="search"><label for="model-search">Hersteller und Modell</label><div class="search-row"><input id="model-search" type="search" maxlength="100" autocomplete="off" spellcheck="false" placeholder="Zum Beispiel: Beurer LR 401" aria-controls="model-options" aria-describedby="search-help"><button type="submit">Modell finden</button></div><p id="search-help">Die Eingabe grenzt die Liste ein. Wähle danach den vollständigen Modellnamen.</p></form><div id="model-options" class="model-options" aria-label="Dokumentierte Modelle"></div><p id="search-status" class="search-status" role="status"></p><section id="model-result" data-tool tabindex="-1" hidden aria-label="Filterzuordnung und Pflegenotiz"></section><div id="saved-models" class="saved-models" hidden><h3>Deine gemerkten Geräte</h3><div id="saved-model-buttons"></div><p>Nur in diesem Browser. Kein Kontosync, keine automatische Erinnerung.</p></div><p id="save-status" class="search-status" role="status"></p><noscript><p class="no-script">Die Modellauswahl und lokalen Notizen benötigen JavaScript. Alle Herstellerzuordnungen und Quellen stehen in der Tabelle unten.</p></noscript></section>
<template id="care-template"><form class="care-form"><h4>Letzte Pflege notieren</h4><p>Deine eigene Notiz ist kein Nachweis, dass ein Filter ersetzt werden muss. Beachte Geräteanzeige und Anleitung; ein reinigbarer Vorfilter ist nicht automatisch ein waschbarer Hauptfilter.</p><div class="care-fields"><label>Tätigkeit<select name="action" required><option value="">Bitte wählen</option><option value="checked">Geprüft</option><option value="cleaned">Gereinigt</option><option value="replaced">Ersetzt</option></select></label><label>Datum<input name="date" type="date" min="1900-01-01" required></label></div><div class="care-actions"><button type="submit">Pflegenotiz speichern</button><button type="button" data-delete-care hidden>Nur Notiz löschen</button></div><p role="status" aria-live="polite"></p><p>Gespeichert werden nur dieses Modell, die Tätigkeit und das Datum in deinem Browser. Keine Übertragung an ein Konto. Beim Löschen der Browserdaten gehen die Notizen verloren.</p></form></template>
<p class="affiliate-disclosure">Als Amazon-Partner verdienen wir an qualifizierten Verkäufen. Die gekennzeichnete Amazon.de-Suche kann Drittanbieter und andere Varianten enthalten. Prüfe Modell, Filtervariante und Verkäufer. Es werden keine aktuellen Preise, Lagerbestände oder Originalanbieter garantiert.</p>
<section id="model-table" class="directory-section"><div class="section-heading"><h2>Modell und dokumentierter Ersatzfilter</h2><p>Inhalt geprüft: {e(data['updated'])}</p></div><p class="section-intro">Die Zuordnung beruht auf Herstellerangaben, nicht auf einem eigenen Passform- oder Leistungstest. Ein fehlendes Modell bedeutet „hier nicht dokumentiert“. <a href="/produkte.html#kategorie-luftreiniger">Zur Geräteübersicht</a> · <a href="/en/filter-finder.html" lang="en">US model finder (English)</a></p>{exact_label_panel(items)}<div class="table-container" tabindex="0" role="region" aria-label="Modellzuordnungen; auf kleinen Bildschirmen seitlich scrollbar"><table><caption class="visually-hidden">Gerätemodell, genauer Filter, Herstellerquelle und letzter Quellencheck</caption><thead><tr><th scope="col">Genaues Gerät</th><th scope="col">Ersatzfilter</th><th scope="col">Quelle und Grenzen</th><th scope="col">Quellencheck</th></tr></thead><tbody>{''.join(rows)}</tbody></table></div></section>
<section id="method" class="method-section"><div><h2>Vor dem nächsten Filterkauf</h2><p>Ein Datum allein ist kein Wechselgrund. Prüfe zuerst Geräteanzeige, Anleitung und Zustand. Reinigung und Austausch sind unterschiedliche Tätigkeiten.</p><p>Die Händlersuche wird nur für eine bestätigte Zuordnung mit höchstens 30 Tage alter Quellenprüfung angezeigt. Bei Quellenänderungen oder fehlgeschlagener Prüfung bleibt die Herstellerquelle sichtbar.</p></div><ol><li><strong>Typenschild lesen.</strong><span>Jeden Buchstaben und Modellzusatz beachten.</span></li><li><strong>Herstellerzuordnung öffnen.</strong><span>Filtername und Variante mit der Anleitung vergleichen.</span></li><li><strong>Verkäuferangebot selbst prüfen.</strong><span>Ein Suchergebnis bestätigt weder Originalware noch die passende Variante.</span></li></ol></section>
</article></main><footer class="site-footer"><a class="wordmark" href="/">EcoBack</a><p>Belegte Zuordnungen. Pflege in deiner Hand.</p><a data-fleet-account href="/auth/account">Kostenloses Konto</a><a href="/datenschutz.html">Datenschutz</a><a href="/impressum.html">Impressum</a></footer></body></html>'''
    output=ROOT/'site'/ROUTE.lstrip('/')
    output.write_text(page)
    output.with_suffix('.md').write_text(to_markdown(page, ROUTE, 'de'))
    print(f'German filter care: {len(items)} reviewed models, static evidence and local notes.')


if __name__ == '__main__':
    build()
