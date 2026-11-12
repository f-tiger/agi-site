#!/usr/bin/env python3
"""Rebuild the three existing humidifier intents before shared HTML/MD generators."""
import datetime as dt
import hashlib
from html import escape as esc
import json
import math
from pathlib import Path

import humidifier_catalog as catalog

ROOT = catalog.ROOT
CHECKED = '2026-11-12'
MAIN = catalog.SLUG
ENERGY = 'luftbefeuchter-stromverbrauch'
DUST = 'luftbefeuchter-weisser-staub'
PAGES = {
    MAIN: {
        'title':'Luftbefeuchter wählen: Bedarf, Pflege und drei genaue Modelle',
        'description':'Luftbefeuchter vergleichen: Bedarf messen, Oskar, Beurer LB 200 und LB 55 mit Pflege, Filterkosten und Herstellerquellen für DE, AT und CH prüfen.',
        'published':'2026-09-15',
        'intro':'Erst die Raumfeuchte verstehen, dann die Technik wählen. Hier vergleichst du drei genaue Modelle samt Pflege und passenden Ersatzteilen.',
        'faq':[
            ('Brauche ich bei weniger als 40 Prozent einen Luftbefeuchter?', 'Ein einzelner Messwert entscheidet das nicht. Miss Temperatur und Feuchte über mehrere Tage, prüfe den Messort und beachte kalte Oberflächen. Ob zusätzliche Feuchte sinnvoll ist, hängt vom Raum und der Nutzung ab. Bei Kondenswasser zuerst die Ursache klären.'),
            ('Welcher Luftbefeuchter passt bei hartem Wasser?', 'Bei Ultraschall kann mineralhaltiges Wasser weißen Staub verursachen. Verdunster sind deshalb eine mögliche Alternative, brauchen aber ebenfalls Pflege und passende Filter. Beim Dampfbefeuchter gehört Entkalkung dazu. Die erlaubte Wasserart steht in der genauen Geräteanleitung.'),
            ('Haben alle drei ausgewählten Geräte einen Hygrostat?', 'Nein. Oskar und LB 200 bieten einstellbare Feuchteziele. Beim LB 55 wählst du eine Dampfstufe und kontrollierst die Raumfeuchte separat. Ein Hygrostat ersetzt weder die Reinigung noch den Blick auf kalte Fenster und Wände.'),
            ('Welcher Filter passt zum Oskar und zum LB 200?', 'Für den hier gemeinten Oskar O-020 führt Stadler Form die Filtermatten O-030 im Zweierpack. Zum Beurer LB 200 passt der Original-Ersatzfilter 110005, in der Anleitung als 110.005 geschrieben. Vor der Bestellung die vollständige Modell- und Teilekennung abgleichen.'),
            ('Sind die Amazon-Links geprüfte Angebote?', 'Nein. Die gekennzeichneten Affiliate-Links öffnen Modellsuchen bei Amazon.de. Sie bestätigen weder Preis noch Bestand oder Versand. Deutschland, Österreich und Schweiz können unterschiedliche Endkosten und Lieferbedingungen haben.')]
    },
    ENERGY: {
        'title':'Luftbefeuchter-Stromverbrauch: Watt in echte Kosten umrechnen',
        'description':'Stromkosten von Luftbefeuchtern berechnen: 6–18, 17 und 365 Watt als Herstellerwerte, klare Rechenbeispiele und Filterkosten getrennt vergleichen.',
        'published':'2026-08-17',
        'intro':'Eine Wattzahl liefert eine Kostenannahme. Für deine tatsächliche Rechnung zählen gemessene Kilowattstunden, Laufzeit und Stromtarif.',
        'faq':[
            ('Wie berechne ich die Stromkosten eines Luftbefeuchters?', 'Watt geteilt durch 1.000 mal Stunden mal Preis je Kilowattstunde ergibt die Kosten bei konstant angenommener Leistung. Ein Gerät mit 17 Watt benötigt rechnerisch 0,136 Kilowattstunden in acht Stunden. Bei 0,30 Euro je Kilowattstunde sind das rund vier Cent.'),
            ('Ist die Nennleistung der tatsächliche Verbrauch?', 'Nein. Stufe, Regelpausen und zusätzliche Funktionen verändern die Energieaufnahme. Miss Kilowattstunden über einen repräsentativen Zeitraum mit einem geeigneten Strommessgerät. Unterschiedliche Wassermengen und Raumbedingungen lassen sich nicht allein über Watt vergleichen.'),
            ('Sind Filter und Wasser in der Stromrechnung enthalten?', 'Nein. Ersatzfilter oder Kalkpads, Wasser und freigegebene Reinigungsmittel kommen getrennt hinzu. Nutze aktuelle Preise und die Wechselvorgaben deiner genauen Anleitung, statt pauschale jährliche Betriebskosten anzunehmen.')]
    },
    DUST: {
        'title':'Weißer Staub am Luftbefeuchter: Wasser und Technik prüfen',
        'description':'Weißer Staub beim Luftbefeuchter? Mineralien, Wasserart und Reinigung prüfen. Ultraschall von Verdunstung unterscheiden, ohne vorschnellen Neukauf.',
        'published':'2026-09-18',
        'intro':'Ein weißer Belag nach dem Befeuchten ist ein Anlass, Wasser und Gerätetechnik zu prüfen. Er ist allein keine verlässliche Diagnose.',
        'faq':[
            ('Warum kann ein Ultraschall-Luftbefeuchter weißen Staub erzeugen?', 'Ultraschallgeräte können Mineralien aus dem Wasser mit dem Nebel verteilen. Diese können sich als weißer Belag absetzen. Ob ein bestimmter Belag tatsächlich aus dem Gerät stammt, muss vor Ort geprüft werden; nicht jeder Staub hat dieselbe Ursache.'),
            ('Kann ich einfach anderes Wasser einfüllen?', 'Prüfe zuerst die Anleitung deines genauen Modells. Mineralarmes Wasser kann die Mineralverteilung verringern, ersetzt aber keine Reinigung. Mineralwasser ist kein Ersatz für mineralarmes Wasser, und ein beliebiger Haushalts-Wasserfilter garantiert keine ausreichende Entmineralisierung.'),
            ('Muss ich wegen weißen Staubs einen Verdunster kaufen?', 'Nicht automatisch. Kläre zuerst Bedarf, Wasserfreigabe und Pflege des vorhandenen Geräts. Ein Verdunster ist eine mögliche Alternative, wenn ein Gerätewechsel ohnehin sinnvoll ist. Er braucht weiter Tankpflege und passende Ersatzteile; ein Luftwäscher ist dadurch nicht automatisch ein geprüfter Luftreiniger.')]
    }
}


def ref(keys, d):
    return '<p class="hc-source">Quellen: ' + catalog.source_links(keys, d) + '.</p>'


def wall_rows():
    def saturated(t):
        return math.exp(17.62*t/(243.12+t))
    return ''.join('<tr><th scope="row">' + str(rh) + ' %</th>' + ''.join(f'<td>{round(rh*saturated(20)/saturated(t))} %</td>' for t in [16,14,12]) + '</tr>' for rh in [35,40,45,50,55])


def main_body(d, today=None):
    return '''<div class="hc-answer"><strong>Die kurze Entscheidung</strong><p>Ohne nachvollziehbaren Bedarf brauchst du kein neues Gerät. Bei wiederholt trockener Raumluft zuerst Messung und Nutzung prüfen. Wenn Befeuchtung sinnvoll bleibt, sind passende Regelung, Wasserart und eine Pflege, die du zuverlässig erledigst, wichtiger als ein pauschaler Testsieger.</p><nav aria-label="Luftbefeuchter auswählen"><a href="#bedarf-pruefen">1. Bedarf prüfen</a> · <a href="#technik-waehlen">2. Technik verstehen</a> · <a href="#modelle-vergleichen">3. Modelle vergleichen</a></nav></div>
<h2 id="bedarf-pruefen">Erst messen: Vielleicht ist kein Kauf nötig</h2>
<div class="hc-steps"><section><h3>Mehrere Tage beobachten</h3><p>Notiere Temperatur und relative Feuchte zu verschiedenen Tageszeiten. Stelle das Messgerät nicht direkt an Heizung, Fenster oder Nebelauslass. Ein Einzelwert unter 40 % begründet für sich keine Kaufempfehlung.</p><a href="/guide/luftfeuchtigkeit-richtig-messen.html">Messort und Vergleichsmessung prüfen →</a></section><section><h3>Kalte Flächen beachten</h3><p>Bei Kondenswasser oder feuchten Stellen zusätzliche Befeuchtung pausieren und Ursachen klären. Für schlecht gedämmte Wohnungen empfiehlt das Umweltbundesamt im Winter als Faustregel unter 50 % Raumfeuchte; das ist keine universelle Zielzahl für jedes Gebäude.</p></section><section><h3>Vorhandene Lösung reicht</h3><p>Wenn der Raum keinen zusätzlichen Feuchteeintrag braucht oder du die notwendige Pflege nicht übernehmen kannst, kaufe vorerst nichts. Ein vorhandenes Gerät erst nach seiner Anleitung prüfen, statt es allein wegen eines Belags zu ersetzen.</p></section></div>''' + ref(['uba'],d) + '''
<h2 id="technik-waehlen">Verdunster, Ultraschall und Dampf sind verschiedene Aufgabenpakete</h2>
<div class="hc-table" role="region" aria-label="Befeuchtungstechniken, horizontal scrollbar" tabindex="0"><table><caption>Technik wählen, ohne Pflege auszublenden</caption><thead><tr><th scope="col">Technik</th><th scope="col">Worauf du achten solltest</th><th scope="col">Kaufgrenze</th></tr></thead><tbody><tr><th scope="row">Verdunstung</th><td>Luft strömt über feuchtes Material; Filter und Tank müssen gepflegt werden.</td><td>Kein sichtbarer Nebel ist kein Beweis für einen Defekt. Hygrostat und Raumkontrolle bleiben wichtig.</td></tr><tr><th scope="row">Ultraschall</th><td>Wasser wird vernebelt. Mineralien können mitverteilt werden; Anleitung zur Wasserart prüfen.</td><td>Bei hartem Wasser zuerst den <a href="/guide/luftbefeuchter-weisser-staub.html">Weißer-Staub-Check</a> nutzen. Hier ist kein Ultraschallmodell ausgewählt.</td></tr><tr><th scope="row">Dampf</th><td>Wasser wird elektrisch erhitzt. Heiße Teile, Wasser und Dampf sowie Entkalkung mitdenken.</td><td>Der LB 55 ist eine bewusste Alternative, keine allgemeine Empfehlung für Kinderzimmer.</td></tr></tbody></table></div>
<p>Ein Gerät, das als „Luftwäscher“ beworben wird, ist nicht allein deshalb ein nachgewiesen wirksamer Luftreiniger. Diese Kaufhilfe bewertet Befeuchtung, keine Partikelreinigung oder gesundheitliche Wirkung.</p>''' + ref(['epa'],d) + catalog.render(today,d) + '''
<h2 id="gesamtkosten">Kaufpreis plus Pflege: mit deinen Preisen rechnen</h2>
<p>Trage aktuelle Händlerpreise selbst in eine Notiz ein und bleibe bei derselben Währung. Für einen Vergleich brauchst du dieselbe Nutzungsdauer und dieselbe Aufgabe.</p>
<ol><li><strong>Anschaffung:</strong> Gerät + wirklich fehlendes Zubehör. Bereits beiliegende Filter oder Pads nicht doppelt addieren.</li><li><strong>Verbrauchsmaterial:</strong> Preis je passendem Ersatzteil × geplante zusätzliche Wechsel. Oskar benötigt zwei Filtermatten pro vollständigem Wechsel; O-030 ist dafür ein Zweierpack. Beim LB 200 die kürzere Frist aus sechs Monaten und tatsächlichem Zustand beachten.</li><li><strong>Wasser und Reinigung:</strong> freigegebene Wasserart, Wasserhärte und Reinigungsmittel einplanen. Unbekannte Preise bleiben offen, nicht null.</li><li><strong>Strom:</strong> gemessene kWh × eigener Tarif; für eine erste Schätzung Nennleistung und Laufzeit klar als Annahmen markieren.</li></ol>
<p>Eine Heizsaison und ein ganzes Betriebsjahr sind nicht dasselbe. Die Wechselanzeige ist kein Nachweis, dass ein verschmutzter Filter bis dahin weiterverwendet werden kann.</p>
<p><a class="hc-secondary" href="/guide/luftbefeuchter-stromverbrauch.html">Die drei Leistungswerte in Beispielkosten umrechnen →</a></p>
<h2 id="kalte-wand">Warum 50 % im Raum nicht 50 % an der kalten Wand sind</h2>
<p>Relative Feuchte steigt beim Abkühlen derselben Luft, solange ihr Wasserdampfgehalt gleich bleibt. Die folgende idealisierte Rechnung nimmt 20 °C Raumluft und unveränderten Wasserdampf-Partialdruck bis zur Oberfläche an. Sie ist keine Messung deiner Wand und keine universelle Schimmelgrenze.</p>
<div class="hc-table" role="region" aria-label="Berechnete Oberflächenfeuchte, horizontal scrollbar" tabindex="0"><table><caption>Rechenbeispiel: relative Feuchte bei drei Oberflächentemperaturen</caption><thead><tr><th scope="col">Raum bei 20 °C</th><th scope="col">Oberfläche 16 °C</th><th scope="col">14 °C</th><th scope="col">12 °C</th></tr></thead><tbody>''' + wall_rows() + '''</tbody></table></div>
<p class="hc-note">Rechenweg: relative Feuchte an der Oberfläche = Raumfeuchte × eₛ(20 °C) ÷ eₛ(Oberflächentemperatur), mit eₛ(T) proportional zu exp(17,62 × T ÷ (243,12 + T)); gerundet. Material, Luftbewegung, Messfehler und Dauer der Feuchte sind nicht abgebildet. Die Zahlen ersetzen keine Ursachenprüfung.</p>
<p>Darum soll ein höher eingestellter Zielwert nicht allein einen angenehm klingenden Zahlenbereich erreichen. Beachte die tatsächlichen Oberflächen und passe Befeuchtung, Heizen und Lüften an den Raum an.</p>''' + ref(['uba'],d) + '''
<h2 id="land-pruefen">Deutschland, Österreich oder Schweiz?</h2><dl class="hc-markets"><dt>Deutschland</dt><dd>Unsere Modell- und Teilekennungen beziehen sich auf die verlinkten deutschsprachigen Herstellerunterlagen. Die Modellsuchen führen zu Amazon.de; Verkäufer, genaue Variante, Lieferumfang und Rückgabe prüfen.</dd><dt>Österreich</dt><dd>Lieferung an deine Adresse, Endpreis und Rückgabe separat bestätigen. Ein sichtbares Amazon.de-Ergebnis belegt keine österreichische Lieferbarkeit.</dd><dt>Schweiz</dt><dd>Lokalen CHF-Endpreis, Importkosten, Netzanschluss und Garantieabwicklung vergleichen. Diese Auswahl bindet keinen Schweizer Händler an und rechnet EUR nicht automatisch in CHF um.</dd></dl>
<h2 id="methode">Was diese Auswahl belegt und was offen bleibt</h2><p>Wir haben die offiziellen deutschen Produktseiten, Anleitungen und passenden Ersatzteile geprüft. Die Modelle zeigen unterschiedliche Bedien- und Pflegeentscheidungen. Es gibt keinen eigenen Gerätevergleich unter gleichen Raumbedingungen, keine Lautstärkemessung und keine Rangfolge nach Gesundheitseffekt oder Quadratmeter-Versprechen.</p>
<p>Vor einem Neukauf kannst du auch die <a href="/guide/richtig-lueften-im-winter.html">Lüftungsstrategie im Winter</a> prüfen. Ein eingebauter Sensor misst am Gerät; er macht die separate Beobachtung deines Raums nicht überflüssig.</p>'''


def energy_body(d):
    rows=[]
    for p in d['products']:
        lo,hi=p['power_w']; energy=f'{lo*8/1000:.3f}–{hi*8/1000:.3f}' if lo!=hi else f'{hi*8/1000:.3f}'
        cost=f'{lo*8/1000*.30:.2f}–{hi*8/1000*.30:.2f}' if lo!=hi else f'{hi*8/1000*.30:.2f}'
        month=f'{lo*8/1000*.30*30:.2f}–{hi*8/1000*.30*30:.2f}' if lo!=hi else f'{hi*8/1000*.30*30:.2f}'
        rows.append(f'<tr><th scope="row">{esc(p["name"])}</th><td>{catalog.power_label(p)}</td><td>{energy.replace(".",",")} kWh</td><td>{cost.replace(".",",")} €</td><td>{month.replace(".",",")} €</td></tr>')
    return '''<div class="hc-answer"><strong>Die direkte Rechnung</strong><p>Watt ÷ 1.000 × Betriebsstunden × eigener Preis je kWh = Stromkosten bei konstant angenommener Leistung. Für reale Kosten die gemessene Energiemenge verwenden.</p><a href="/guide/stromkosten-rechner.html">Watt und eigenen Tarif im vorhandenen Rechner einsetzen →</a></div>
<h2 id="kostenbeispiel">Was acht Stunden rechnerisch kosten</h2><p>Beispielannahmen: 8 Stunden täglich, 30 Tage und 0,30 €/kWh. Der Tarif ist frei gewählt, kein aktueller deutscher Durchschnitt. Hersteller-Nennleistungen sind die Grundlage; Regelpausen, Nachlauf oder Filtertrocknung sind nicht als gemessener Nutzungsablauf abgebildet.</p>
<div class="hc-table" role="region" aria-label="Beispiel-Stromkosten, horizontal scrollbar" tabindex="0"><table><caption>Rechenszenario, keine Verbrauchsmessung</caption><thead><tr><th scope="col">Modell</th><th scope="col">Nennleistung</th><th scope="col">8 Stunden</th><th scope="col">pro Tag</th><th scope="col">30 Tage</th></tr></thead><tbody>''' + ''.join(rows) + '''</tbody></table></div>''' + ref(['oskar_manual','lb200_manual','lb55_manual'],d) + '''
<p>Die niedrigere Wattzahl beweist nicht, dass zwei Geräte dieselbe Wassermenge unter gleichen Bedingungen effizienter bereitstellen. Raumtemperatur, Ausgangsfeuchte, Luftwechsel, Stufe und Betriebsdauer müssten für einen solchen Vergleich gleich sein. Die Raumgrößenangaben verschiedener Hersteller sind ebenfalls keine gemeinsame Messung.</p>
<h2 id="eigenen-verbrauch-messen">Vom Typenschild zu deinem tatsächlichen Verbrauch</h2><ol><li>Ein geeignetes Strommessgerät nach dessen Anleitung einsetzen und den Zählerstand vor Beginn notieren.</li><li>Über mehrere typische Tage messen. Laufzeiten, Feuchteeinstellung und Nachpflege dokumentieren, einschließlich aktivierter Trocknungsprogramme.</li><li>Gemessene kWh mit deinem vertraglichen Arbeitspreis multiplizieren. Diese Messung gilt für deinen Ablauf, nicht automatisch für einen anderen Raum.</li></ol>
<p>Der LB 200 kann den entleerten Filter mit einem dreistündigen Programm trocknen. Solche zusätzlichen Laufzeiten gehören zur vollständigen Messung; ein Hygrostat kann die Befeuchtung zugleich zeitweise unterbrechen. Die Richtung des Unterschieds zur Beispielrechnung ist daher nicht pauschal vorgegeben.</p>
<h2 id="betriebskosten">Filterkosten gehören in eine eigene Zeile</h2><p>Vergleiche Anschaffung plus Strom plus Wasser plus passende Verbrauchsteile und Reinigungsmittel für denselben Zeitraum. Aktuelle Preise selbst eintragen; beiliegende Filter nicht doppelt berechnen. Ein günstiger Stromwert kann neben regelmäßigem Filterwechsel stehen.</p><p><a class="hc-secondary" href="/guide/luftbefeuchter-ratgeber.html#gesamtkosten">Passende Filter, Pflegefristen und Modellwahl prüfen →</a></p>
<h2 id="bedarf">Weniger Laufzeit ist nur bei passender Raumfeuchte sinnvoll</h2><p>Wähle keine Dauerlaufzeit allein, damit eine Beispielrechnung aufgeht. Prüfe zuerst, ob zusätzliche Feuchte benötigt wird, und beobachte kalte Fenster und Wände. Bei Kondenswasser pausieren und die Ursache klären.</p><p><a href="/guide/luftbefeuchter-ratgeber.html#bedarf-pruefen">Zur Messung und zur Möglichkeit, nichts zu kaufen</a> · <a href="/guide/luftbefeuchter-weisser-staub.html">Wasser und weißen Staub prüfen</a></p>'''


def dust_body(d):
    return '''<div class="hc-answer"><strong>Zuerst Wasser und Anleitung prüfen</strong><p>Ultraschall kann Mineralien aus dem Wasser verteilen. Das kann weißen Staub erklären, beweist aber nicht die Herkunft jedes Belags. Schalte das Gerät für die Prüfung aus und folge den Reinigungs- und Wasserangaben seiner Anleitung.</p><a href="#pruefen">Zum Prüfablauf →</a></div>
<h2 id="entstehung">Warum Wasserhärte bei Ultraschall relevant ist</h2><p>Die US-Umweltbehörde EPA beschreibt, dass Ultraschall- und bestimmte Kaltnebelgeräte Wasserinhalte in die Raumluft abgeben können. Bei Verdunstung und Dampf ist keine vergleichbar große Mineralverteilung zu erwarten. Diese Unterscheidung ist keine Sauberkeitsgarantie für Tank oder Gerät.</p>''' + ref(['epa'],d) + '''
<h2 id="pruefen">Vier Prüfungen vor einem Neukauf</h2><ol><li><strong>Gerätetechnik identifizieren:</strong> Modell und Anleitung nachschlagen. Ein Produktfoto mit Nebel ersetzt keine Angabe zur Technik.</li><li><strong>Wasser prüfen:</strong> Wasserhärte beim Versorger nachsehen und die vom Hersteller erlaubte Wasserart beachten. Mineralarmes Wasser kann Mineralrückstände verringern. Mineralwasser oder beliebig gefiltertes Leitungswasser sind nicht automatisch dafür geeignet.</li><li><strong>Pflege prüfen:</strong> Gerät ausstecken; Tank und zugängliche Teile nur nach Anleitung reinigen. Frisches Wasser ersetzt die Reinigung nicht, und Entkalkung ersetzt nicht jeden weiteren Pflegeschritt.</li><li><strong>Bedarf erneut prüfen:</strong> Bei ausreichender Feuchte muss kein Ersatzgerät her. Beobachte, ob und wann der Belag erneut auftritt. Bei unklarer Herkunft nicht alle Rückstände vorschnell dem Gerät zuordnen.</li></ol>
<h2 id="wasserart">Nicht jede Wasserempfehlung gilt für jedes Modell</h2><p>Die LB-200-Anleitung erlaubt kaltes Leitungswasser oder destilliertes Wasser. Beim LB 55 nennt Beurer entmineralisiertes oder destilliertes Wasser als Möglichkeit bei hartem Leitungswasser. Das ist keine Freigabe für andere Geräte. Herstellerangaben zu Zusätzen, Temperatur und Befüllung bleiben maßgeblich.</p>''' + ref(['lb200_manual','lb55_manual'],d) + '''
<h2 id="alternative">Wann ein Verdunster eine Alternative ist</h2><p>Wenn du zusätzliche Befeuchtung brauchst und die Wasser- oder Pflegeanforderungen des bisherigen Geräts nicht zu deinem Alltag passen, lohnt ein Technikvergleich. Verdunster benötigen ebenfalls Wasserwechsel, Tankpflege und passende Ersatzteile. Die automatische Filtertrocknung eines Geräts macht diese Schritte nicht überflüssig.</p>
<p>Ein „Luftwäscher“ ist nicht allein aufgrund seines Namens ein nachgewiesen wirksamer Luftreiniger. Diese Seite verspricht weder eine medizinische Wirkung noch Partikelfilterung.</p>
<p><a class="hc-secondary" href="/guide/luftbefeuchter-ratgeber.html#modelle-vergleichen">Oskar, LB 200 und LB 55 nach Pflege und Regelung vergleichen →</a></p><p><a href="/guide/luftbefeuchter-stromverbrauch.html">Strom und weitere Betriebskosten berechnen</a> · <a href="/guide/luftfeuchtigkeit-richtig-messen.html">Raumfeuchte richtig messen</a></p>'''


def render(slug, today=None, data=None):
    d = catalog.load() if data is None else catalog.validate(data)
    page = PAGES[slug]
    assert 120 <= len(page['description']) <= 155, (slug, len(page['description']))
    url = 'https://getecoback.com/guide/' + slug + '.html'
    body = main_body(d,today) if slug == MAIN else energy_body(d) if slug == ENERGY else dust_body(d)
    faq = ''.join(f'<details><summary>{esc(q)}</summary><p>{esc(a)}</p></details>' for q,a in page['faq'])
    ld = {'@context':'https://schema.org','@graph':[
        {'@type':'Article','headline':page['title'],'description':page['description'],'inLanguage':'de','mainEntityOfPage':url,'datePublished':page['published'],'dateModified':CHECKED,'author':{'@type':'Organization','name':'EcoBack','url':'https://getecoback.com/'},'publisher':{'@type':'Organization','name':'EcoBack','url':'https://getecoback.com/'}},
        {'@type':'FAQPage','mainEntity':[{'@type':'Question','name':q,'acceptedAnswer':{'@type':'Answer','text':a}} for q,a in page['faq']]}
    ]}
    css=hashlib.sha256((ROOT/'site/assets/humidifier-catalog.css').read_bytes()).hexdigest()[:12]
    return f'''<!DOCTYPE html>
<html lang="de"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{esc(page['title'])}</title><meta name="description" content="{esc(page['description'],quote=True)}">
<link rel="canonical" href="{url}"><link rel="alternate" hreflang="de" href="{url}"><link rel="alternate" type="text/markdown" href="{url[:-5]}.md">
<meta property="og:type" content="article"><meta property="og:title" content="{esc(page['title'],quote=True)}"><meta property="og:description" content="{esc(page['description'],quote=True)}"><meta property="og:url" content="{url}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml"><meta name="theme-color" content="#0a4d7a"><link rel="stylesheet" href="/assets/humidifier-catalog.css?v={css}">
<script type="application/ld+json">{json.dumps(ld,ensure_ascii=False).replace('<','\\u003c')}</script></head><body>
<header class="hc-hero"><div class="wrap"><a href="/">EcoBack</a><p class="hc-kicker">Raumklima · Besser entscheiden</p><h1>{esc(page['title'])}</h1><p>{esc(page['intro'])}</p></div></header>
<article class="wrap" {'data-humidifier-guide' if slug == MAIN else 'data-humidifier-support'}>
<p class="hc-note">Aktualisiert am 12. November 2026 · Redaktionelle Kauf- und Nutzungshilfe, kein eigener Gerätetest.</p>{body}
<section id="haeufige-fragen" class="hc-faq"><h2>Häufige Fragen</h2>{faq}</section>
<nav class="hc-next" aria-label="Weitere Kaufhilfen"><a href="/kategorie/luftqualitaet.html">Raumklima</a><a href="/rechner.html">Rechner und Prüfungen</a><a href="/wie-wir-empfehlen.html">Unsere Methodik</a></nav>
</article><footer><a href="/">EcoBack</a> · <a href="/impressum.html">Impressum</a> · <a href="/datenschutz.html">Datenschutz</a></footer></body></html>
'''


def main():
    for slug in PAGES:
        target=ROOT/'site/guide'/f'{slug}.html'
        text=render(slug)
        if not target.exists() or target.read_text()!=text:
            target.write_text(text)
        print('Built', target.relative_to(ROOT))


if __name__ == '__main__':
    main()
