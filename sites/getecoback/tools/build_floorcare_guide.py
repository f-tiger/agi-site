#!/usr/bin/env python3
"""Build one original, sourced German floor-cleaner buying guide before shared generators."""
import datetime as dt
from html import escape as esc
import json
from pathlib import Path
from urllib.parse import quote_plus

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data/floorcare-catalog.json'
TARGET = ROOT / 'site/guide/saugwischer-kaufberatung.html'
URL = 'https://getecoback.com/guide/saugwischer-kaufberatung.html'
TITLE = 'Saugwischer kaufen: Boden, Pflege und drei Modelle prüfen'
DESCRIPTION = 'Saugwischer wählen: Bodenfreigabe, Pflegezeit und drei Modelle vergleichen. Herstellerquellen und Kaufhinweise für Deutschland, Österreich, Schweiz.'
FAQ = [
    ('Kann ein Saugwischer meinen Staubsauger ersetzen?', 'Nur für die Aufgaben, die seine genaue Anleitung erlaubt. Teppiche, Polster und empfindliche Böden sind separat zu prüfen. Die hier beschriebenen Hartbodenreiniger sind kein pauschaler Ersatz für einen Teppichsauger.'),
    ('Ist ein Saugwischer für Parkett geeignet?', 'Das Wort Parkett genügt nicht. Versiegelung, Fugen, Zustand und Pflegevorgaben des Bodenherstellers entscheiden mit. Bei unbekannter Freigabe zunächst den Bodenhersteller fragen und keine Eignung aus einem Produktfoto ableiten.'),
    ('Wie viel Zeit spart ein Saugwischer?', 'Das hängt von deiner Fläche, Verschmutzung und Nachpflege ab. Vergleiche dieselbe Reinigungsaufgabe: bisherige aktive Zeit minus neue aktive Zeit minus zusätzliche Nachpflege. Ein negatives Ergebnis bedeutet zusätzlichen Zeitaufwand.'),
    ('Muss ich trotz Selbstreinigung den Tank reinigen?', 'Ja, die Selbstreinigung ersetzt nicht alle manuellen Pflegeschritte. Die Tineco-S7-FlashDry- und Dreame-H14-Pro-Anleitungen nennen die Reinigung des Schmutzwasserbehälters nach der Nutzung. Für jedes Modell gilt die eigene Anleitung.'),
    ('Sind die Händlerlinks konkrete Produktseiten?', 'Nein. Die gekennzeichneten Links öffnen eine Suche nach dem genauen Modell bei Amazon.de. Suchergebnisse können andere Varianten zeigen. Modell, Lieferumfang, Verkäufer, Lieferland und Endpreis vor einer Bestellung prüfen.')
]

def load():
    d = json.loads(DATA.read_text())
    if d['market'] != 'DE' or len({p['id'] for p in d['products']}) != len(d['products']):
        raise ValueError('Invalid market or duplicate model identity')
    for p in d['products']:
        if not all(k in d['sources'] for k in p['sources']):
            raise ValueError('Missing source')
    return d

def render(today=None, data=None):
    d = load() if data is None else data
    age = ((today or dt.datetime.now(dt.timezone.utc).date()) - dt.date.fromisoformat(d['checked'])).days
    fresh = 0 <= age <= d['max_age_days']
    rows, cards = [], []
    for p in d['products']:
        rows.append(f'<tr><th scope="row"><a href="#{esc(p["id"])}">{esc(p["name"])}</a></th><td>{esc(p["role"])}</td><td>{esc(p["variant"])}</td></tr>')
        refs = ' · '.join(f'<a href="{esc(d["sources"][k]["url"], quote=True)}">{esc(d["sources"][k]["title"])}</a>' for k in p['sources'])
        action = '<p class="fc-note">Quellenprüfung ausstehend. Bitte zuerst die Herstellerunterlagen prüfen.</p>'
        if fresh and p['status'] == 'verified':
            href = 'https://www.amazon.de/s?k=' + quote_plus(p['query']) + '&tag=getecoback-21'
            action = f'<p class="fc-commerce"><a class="fc-button" href="{esc(href, quote=True)}" target="_blank" rel="sponsored nofollow noopener">{esc(p["name"])}: Modellsuche bei Amazon.de →</a><small>Anzeige · Suchergebnisse, keine feste Produktseite. Variante und Lieferung prüfen.</small></p>'
        cards.append(f'<section class="fc-card" id="{esc(p["id"])}"><p class="fc-kicker">{esc(p["role"])}</p><h3>{esc(p["name"])}</h3><p>{esc(p["facts"])}</p><dl><dt>Boden und Einsatz</dt><dd>{esc(p["floor"])}</dd><dt>Pflege danach</dt><dd>{esc(p["care"])}</dd><dt>Genau diese Variante</dt><dd>{esc(p["variant"])}</dd><dt>Verbrauchsmaterial</dt><dd>{esc(p["parts"])}</dd></dl><p class="fc-sources">Herstellerquellen: {refs}</p>{action}</section>')
    faq = ''.join(f'<details><summary>{esc(q)}</summary><p>{esc(a)}</p></details>' for q,a in FAQ)
    ld = {'@context':'https://schema.org','@graph':[
        {'@type':'Article','headline':TITLE,'description':DESCRIPTION,'inLanguage':'de','mainEntityOfPage':URL,'datePublished':'2026-11-12','dateModified':'2026-11-12','author':{'@type':'Organization','name':'EcoBack','url':'https://getecoback.com/'},'publisher':{'@type':'Organization','name':'EcoBack','url':'https://getecoback.com/'}},
        {'@type':'FAQPage','mainEntity':[{'@type':'Question','name':q,'acceptedAnswer':{'@type':'Answer','text':a}} for q,a in FAQ]}
    ]}
    return f'''<!DOCTYPE html>
<html lang="de"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{esc(TITLE)}</title><meta name="description" content="{esc(DESCRIPTION, quote=True)}">
<link rel="canonical" href="{URL}"><link rel="alternate" hreflang="de" href="{URL}"><link rel="alternate" type="text/markdown" href="{URL[:-5]}.md">
<meta property="og:type" content="article"><meta property="og:title" content="{esc(TITLE)}"><meta property="og:description" content="{esc(DESCRIPTION, quote=True)}"><meta property="og:url" content="{URL}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml"><meta name="theme-color" content="#0a4d7a"><link rel="stylesheet" href="/assets/floorcare-guide.css">
<script type="application/ld+json">{json.dumps(ld,ensure_ascii=False).replace('<','\\u003c')}</script></head><body>
<header class="fc-hero"><div class="wrap"><a href="/">EcoBack</a><p class="fc-kicker">Besser entscheiden · Haushalt</p><h1>{esc(TITLE)}</h1><p>Ein sauberer Boden ist das Ziel. Das passende Gerät muss auch zu deinem Boden, deinem Alltag und der Pflege danach passen.</p></div></header>
<article class="wrap" data-floorcare-guide>
<div class="fc-answer"><strong>Die kurze Entscheidung:</strong><p>Bei geeigneten Hartböden und regelmäßigem Wischen kann ein Saugwischer zwei Arbeitsschritte verbinden. Rechne Tankpflege und Reinigung der Walze mit. Für viel Teppich, ungeklärte Bodenfreigabe oder seltenes Wischen ist dein vorhandenes Gerät oft der bessere Ausgangspunkt.</p><a href="#boden-pruefen">1. Boden prüfen</a> · <a href="#zeit-vergleichen">2. Zeit vergleichen</a> · <a href="#modelle-vergleichen">3. Modelle ansehen</a></div>
<p class="fc-note">Redaktionelle Kaufhilfe, kein eigener Gerätetest. Herstellerangaben geprüft: {esc(d['checked'])}. Keine Live-Preise, Verfügbarkeits- oder Einspargarantie.</p>
<h2 id="boden-pruefen">Passt Nassreinigung zu deinem Boden?</h2>
<div class="fc-steps"><section><h3>Hartboden mit Freigabe</h3><p>Bei Fliesen, Vinyl oder versiegeltem Holz die Pflegevorgaben des Bodens und die genaue Geräteanleitung gemeinsam prüfen. Materialname oder Versiegelung allein sind keine Zusage für jedes Gerät.</p></section><section><h3>Teppich oder unklare Oberfläche</h3><p>Diese Auswahl verspricht keine Teppichreinigung. Bei offenem Holz, beschädigten Fugen oder unbekannter Pflegefreigabe erst nachfragen. Für Polster oder Teppich kann ein anderer Gerätetyp erforderlich sein.</p></section><section><h3>Vorhandenes Gerät reicht</h3><p>Wenn du nur selten wischst, mit Sauger und Mopp gut zurechtkommst oder die neue Nachpflege nicht übernehmen willst, musst du nichts kaufen. Ein Defekt verlangt zunächst einen passenden Pflege- oder Servicecheck.</p></section></div>
<h2 id="zeit-vergleichen">Zählt die Reinigung danach noch als Zeitersparnis?</h2>
<p>Miss dieselbe Fläche bei vergleichbarer Verschmutzung. Die neue Methode umfasst das Führen des Geräts, Füllen und Entleeren der Tanks sowie die notwendige Nachpflege. Automatische Trocknungszeit ohne deine Mitarbeit zählt getrennt als Wartezeit; sie blockiert gegebenenfalls die nächste Nutzung.</p>
<div class="fc-equation"><strong>Aktiv gesparte Minuten = bisherige aktive Minuten − neue aktive Minuten − zusätzliche Nachpflege.</strong><p>Fiktives Beispiel: 25 Minuten Saugen und Wischen gegenüber 15 Minuten mit dem neuen Gerät plus 7 Minuten Nachpflege ergeben 3 Minuten weniger aktive Arbeit. Bei 12 Minuten Nachpflege wären es 2 Minuten mehr. Das sind Rechenbeispiele, keine Gerätemessungen.</p><a class="fc-secondary" href="/rechner.html#home-fit-floor">Eigene Zeiten im vorhandenen Haushalts-Check vergleichen →</a><p class="fc-note">Der Check öffnet „Nassreiniger: echte Zeitersparnis“. Auch Null oder ein negatives Ergebnis ist hilfreich.</p></div>
<p>Zum finanziellen Vergleich gehören Anschaffung, freigegebene Reinigungslösung, Filter und Walze sowie gemessener Stromverbrauch. Nutzungsdauer und Wechselintervalle hängen vom Alltag ab. Ein Vortrieb nimmt dir das Gewicht beim Tragen über eine Treppe nicht ab.</p>
<h2 id="modelle-vergleichen">Drei genaue Modelle mit unterschiedlichen Kaufgründen</h2>
<p>Die Reihenfolge ist keine Rangliste. Wähle zuerst die Eigenschaft, die du brauchst, und lies dann die Einschränkungen. Watt, Pa, Hersteller-Reichweiten und unterschiedlich gemessene Gewichte ergeben keinen fairen gemeinsamen Testsieger.</p>
<div class="fc-table" role="region" aria-label="Modellübersicht, horizontal scrollbar" tabindex="0"><table><caption>Was du mit welchem Modell prüfen kannst</caption><thead><tr><th scope="col">Modell</th><th scope="col">Interessant bei diesem Bedarf</th><th scope="col">Vor einem Vergleich abgrenzen</th></tr></thead><tbody>{''.join(rows)}</tbody></table></div>
<p class="fc-disclosure">Anzeige · Die gekennzeichneten Modellsuchen enthalten Affiliate-Links. EcoBack kann bei qualifizierten Käufen eine Provision erhalten. Eine Suche bestätigt weder die genaue Variante noch den Preis oder die Lieferbarkeit.</p>
<div class="fc-models">{''.join(cards)}</div>
<h2 id="nachpflege">Vor dem Kauf einen Pflegeplan durchgehen</h2><ol><li>Tankentleerung und die in der Anleitung genannten Reinigungsarbeiten nach jeder Nutzung einplanen.</li><li>Walze, Filter und Ansaugweg nach den eigenen Modellvorgaben kontrollieren. Feuchte Teile nur so einsetzen oder lagern, wie es die Anleitung erlaubt.</li><li>Passende Teile und freigegebene Reinigungslösung mit genauer Modellkennung suchen; aktuelle Verfügbarkeit beim Anbieter prüfen.</li><li>Bei deinem vorhandenen Tineco zuerst den <a href="/guide/tineco-saugt-nicht-mehr.html">Pflege-Check für S5 und S7 FlashDry</a> nutzen. Er gilt nicht automatisch für andere Modelle.</li></ol>
<h2 id="land-pruefen">Deutschland, Österreich oder Schweiz?</h2><dl class="fc-markets"><dt>Deutschland</dt><dd>Unsere Modellsuchen führen zu Amazon.de. Lieferumfang, Verkäufer, Zustand und Rückgabe vor der Bestellung prüfen.</dd><dt>Österreich</dt><dd>Versand nach Österreich und den vollständigen Endpreis für deine Adresse prüfen. Dass ein Angebot auf Amazon.de sichtbar ist, bestätigt die Lieferung nicht.</dd><dt>Schweiz</dt><dd>Ein deutscher Preis in EUR ist kein lokaler CHF-Endpreis. Einfuhrkosten, Netzanschluss, Garantieabwicklung und Lieferung beim Händler klären. Hier ist kein Schweizer Händlerprogramm angebunden.</dd></dl>
<h2 id="methode">Wie diese Auswahl entstanden ist</h2><p>Wir vergleichen öffentlich dokumentierte Funktionen und Grenzen. Tineco und Dreame belegen die genannten Boden- und Pflegehinweise in ihren Modellanleitungen. Bei Roborock nennt die deutsche Produktseite die Verbindung F25 XT / F25 ACE Neue Version; die ACE-Anleitung dient hier als Pflegekontext, nicht als Zusage identischer Teile für jede Variante. Nicht ausreichend vergleichbare Messwerte bleiben bewusst ohne Rangfolge.</p><p>Der S7 FlashDry ist hier eine eigene Auswahl. Daten des S7 Max Pro, S7 Pro oder anderer Serien werden nicht auf ihn übertragen. Jede Karte verlinkt ihre offiziellen Grundlagen. Bei geänderten Modellen oder unklaren Quellen muss die Auswahl erneut geprüft werden.</p>
<section id="haeufige-fragen" class="fc-faq"><h2>Häufige Fragen vor dem Kauf</h2>{faq}</section>
<div class="fc-next"><a href="/rechner.html#home-fit-floor">Haushalt und Gerät prüfen →</a><a href="/guide/tineco-saugt-nicht-mehr.html">Bestehendes Gerät pflegen →</a><a href="/tools.html">Alle kostenlosen Werkzeuge →</a></div>
</article><footer><a href="/impressum.html">Impressum</a> · <a href="/datenschutz.html">Datenschutz</a> · <a href="/ueber-uns.html">Über EcoBack</a></footer></body></html>
'''

def main():
    TARGET.write_text(render())
    print('Built sourced German floorcare guide: 3 exact models; no prices or own-test claims')

if __name__ == '__main__':
    main()
