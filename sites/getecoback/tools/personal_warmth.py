"""Canonical, idempotent source for the existing German blanket decision page.

Called by demand_tools after commerce/chrome enrichment. Model evidence is not
an affiliate recommendation or a claim that other blanket variants match it.
"""
from pathlib import Path
import hashlib
import html
import json
import re

SITE = Path(__file__).resolve().parents[1] / 'site'
SLUG = 'heizdecke-stromverbrauch'
TITLE = 'Heizdecke: Stromkosten für Sofa und Homeoffice berechnen'
DESC = 'Heizdecken-Stromkosten ohne Pflichtangaben: Beispiele für Sofa und Homeoffice, eigener Tarif in EUR oder CHF, Abschaltzeit und sichere Auswahl prüfen.'
URL = 'https://getecoback.com/guide/' + SLUG + '.html'
FAQ = [
    ('Was kostet eine Heizdecke für zwei Stunden?', 'Bei angenommenen 110 W durchgehender Leistung und 0,35 EUR/kWh ergeben zwei Stunden 0,22 kWh und 0,077 EUR, gerundet 0,08 EUR. Das ist ein Rechenbeispiel, kein gemessener Verbrauch oder aktueller Durchschnittstarif.'),
    ('Kann ich acht Stunden über Nacht rechnen?', 'Eine Rechnung ist keine Betriebserlaubnis. Zulässige Nutzung und Abschaltzeit stehen in der Anleitung des konkreten Geräts. Beim Herstellerbeispiel Beurer HD 75 schaltet die Decke nach etwa drei Stunden ab. Acht Stunden ohne Unterbrechung wären dafür kein passendes Standardszenario.'),
    ('Ersetzt eine Heizdecke die Raumheizung?', 'Nein. Sie kann eine Person wärmen, aber nicht ausreichend die Raumluft und kalte Bauteile. Ob weniger Raumheizung möglich ist, hängt unter anderem von Gebäude, Feuchtigkeit und Nutzung ab. Eine feste Heizkostenersparnis lässt sich daraus nicht ableiten.'),
    ('Gelten die Beispiele für Deutschland, Österreich und die Schweiz?', 'Der Rechenweg gilt in allen drei Ländern. Deutschland und Österreich werden in EUR, die Schweiz in CHF angezeigt. 0,35 pro kWh ist in jeder Währung nur eine frei gewählte Rechenannahme, kein Landesdurchschnitt und keine Währungsumrechnung. Lieferbarkeit, Stecker und Rückgabe sind separat zu prüfen.'),
]

TOOL = '''<section id="waerme-rechner" class="warmth-tool" aria-labelledby="warmth-title">
<h2 id="warmth-title">Deine Wärme-Pause: Kosten sofort sehen</h2>
<p>Du musst nichts eingeben. Wähle eine Dauer; alle Beispiele rechnen mit <strong>110 W durchgehend und 0,35 €/kWh</strong>. Das ist weder ein aktueller Tarif noch eine Messung.</p>
<div class="warmth-examples" aria-label="Beispiel wählen">
<button type="button" data-warmth-example="short" aria-pressed="false" disabled>Kurze Pause · 30 Minuten</button>
<button type="button" data-warmth-example="sofa" aria-pressed="true" disabled>Sofa · 2 Stunden</button>
<button type="button" data-warmth-example="desk" aria-pressed="false" disabled>Homeoffice-Block · 3 Stunden</button>
</div>
<div class="warmth-table"><table><caption>Statische Beispiele bei 110 W und 0,35 €/kWh – auch ohne JavaScript lesbar</caption><thead><tr><th>Dauer</th><th>Energie</th><th>Gerundete Stromkosten</th></tr></thead><tbody><tr><td>30 Minuten</td><td>55 Wh / 0,055 kWh</td><td>0,02 €</td></tr><tr><td>2 Stunden</td><td>220 Wh / 0,22 kWh</td><td>0,08 €</td></tr><tr><td>3 Stunden</td><td>330 Wh / 0,33 kWh</td><td>0,12 €</td></tr></tbody></table></div>
<form hidden><details><summary>Optional: Land, Gerät und eigenen Strompreis anpassen</summary>
<div class="warmth-fields">
<label>Land und Währung<select name="country"><option value="DE">Deutschland · EUR</option><option value="AT">Österreich · EUR</option><option value="CH">Schweiz · CHF</option></select></label>
<label>Nennleistung laut Typenschild (W)<input name="watts" type="number" min="0" max="500" step="any" required value="110"></label>
<label>Stunden je Nutzungstag<input name="hours" type="number" min="0" max="24" step="any" required value="2"></label>
<label>Arbeitspreis (<span data-warmth-currency>EUR</span>/kWh)<input name="tariff" type="number" min="0" max="5" step="any" required value="0.35"></label>
<label>Anzahl Nutzungstage<input name="days" type="number" min="1" max="366" step="1" required value="1"></label>
</div><p>Die Länderwahl ändert nur die Währung, nicht den Tarif und nicht den Händler. 0,35 ist auch in CHF nur eine Rechenannahme; es erfolgt keine Währungsumrechnung. Verwende den Arbeitspreis einschließlich variabler Abgaben aus deiner Rechnung.</p>
</details><button type="submit">Mit diesen Annahmen berechnen</button></form>
<p data-warmth-result aria-live="polite">Rechenbeispiel · 220 Wh = 0,22 kWh pro Nutzung · 0,08 €. Durchgehende Nennleistung; keine Verbrauchsmessung.</p>
<p><strong>Die Grenze:</strong> Gerechnet wird Watt × Stunden ÷ 1.000 × Arbeitspreis × Nutzungstage. Regelung und Abschaltung können den tatsächlichen Verbrauch verringern; das ist hier nicht als feste Ersparnis eingerechnet. Ein längerer Zeitraum ist nur zulässig, wenn die Anleitung des eigenen Geräts dies erlaubt. Standby, Kaufpreis und Raumheizung fehlen.</p>
<button type="button" data-warmth-copy disabled>Ergebnis für Reddit, X oder eine Nachricht kopieren</button>
<small>Du teilst selbst. Der Text enthält deine Rechenannahmen und Grenzen, keine Anmeldung oder automatisch veröffentlichten Beiträge. Eingaben bleiben in diesem Browser.</small>
<p data-warmth-status role="status"></p><textarea data-warmth-fallback readonly hidden aria-label="Ergebnis zum manuellen Kopieren"></textarea>
<noscript><p>Die Tabelle und Auswahlhilfe bleiben ohne JavaScript nutzbar. Für eigene Berechnung und Kopierhilfe JavaScript aktivieren.</p></noscript>
</section>'''

def article():
    faq = ''.join('<h3>' + html.escape(q) + '</h3><p>' + html.escape(a) + '</p>' for q, a in FAQ)
    return '''<article><div class="wrap">
<p><small>Fachlich überarbeitet und Quellen geprüft: 31. Oktober 2026 · EcoBack Redaktion</small></p>
<div class="tldr"><strong>Kurz gesagt:</strong> 110 W für zwei Stunden ergeben 0,22 kWh. Bei einem frei gewählten Preis von 0,35 €/kWh sind das rund 0,08 €. Eine Heizdecke wärmt eine Person; Raumheizung, Lüften und Feuchteschutz bleiben eigene Aufgaben.</div>
<p>Für kalte Füße am Schreibtisch oder einen Abend auf dem Sofa zählt zuerst die passende Anwendung. Probiere vorhandene Decken, Kleidung und einen weniger zugigen Arbeitsplatz, bevor du ein neues Gerät kaufst. Der Rechner zeigt Gerätestromkosten, keine versprochene Ersparnis gegenüber deiner Heizung.</p>
''' + TOOL + '''
<h2 id="modell-und-abschaltung">Ein konkretes Herstellerbeispiel statt pauschaler Wattzahlen</h2>
<p>Im <a href="https://www.beurer.com/web/flippingbook/beurer-produktkatalog-2025-DE/62-63/">Beurer-Katalog 2025, Seiten 62–63</a> sind für die dort aufgeführte HD-75-Variante mit Art.-Nr. 424.00 <strong>100–110 W</strong> und eine Abschaltung nach etwa drei Stunden angegeben. Deshalb verwenden wir 110 W als obere Nennleistung dieses Rechenbeispiels. Die <a href="https://www.beurer.com/de/p/42400/">aktuelle Produktseite zur HD 75 Taupe</a> nennt ebenfalls drei Stunden bis zur Sicherheitsabschaltung. Das ist keine Messung der gewählten Heizstufe und keine Freigabe für andere Modelle.</p>
<p>Ein Zwei-Stunden-Beispiel passt rechnerisch in dieses Zeitfenster. Drei Stunden liegen an der angegebenen Abschaltzeit. Acht Stunden ohne Unterbrechung rechnen wir nicht als Standardnacht. Die Abschaltung nicht überbrücken; Anleitung, genaue Artikelnummer und Eignung für die Person gehen vor.</p>
<h2 id="zweck-pruefen">Sofa, Schreibtisch oder Bett: nicht dasselbe Produkt</h2>
<ul><li><strong>Auf dem Sofa:</strong> Eine Wärmezudecke nur so verwenden, wie die Anleitung es vorsieht. Nicht beschädigt, nass oder entgegen der Anleitung gefaltet betreiben.</li><li><strong>Am Schreibtisch:</strong> Erst Zugluft, Sitzposition und kalten Boden prüfen. Ein Fußwärmer ist eine andere Bauart mit eigener Leistung und Abschaltzeit. Das 110-W-Beispiel ist kein Fußwärmer-Test. <a href="/guide/homeoffice-warm-bleiben.html">Homeoffice-Schritte im Zusammenhang ansehen</a>.</li><li><strong>Im Bett:</strong> Wärmezudecke und Wärmeunterbett nicht verwechseln. Eine Abschaltautomatik allein erlaubt weder Schlafbetrieb noch die Nutzung unter dem Körper. Nur die ausdrücklichen Anwendungsvorgaben des konkreten Geräts verwenden.</li><li><strong>Ohne Neukauf:</strong> Eine vorhandene ungeheizte Decke verursacht keinen zusätzlichen Gerätestrom. Bei ausgefallener Heizung oder dauerhaft kalten, feuchten Räumen die Ursache lösen.</li></ul>
<h2 id="raum-und-feuchte">Warum daraus keine pauschale Heizkostenersparnis folgt</h2>
<p>Eine warme Person bedeutet nicht automatisch ausreichend warme Wandoberflächen. Die <a href="https://www.verbraucherzentrale.de/wissen/energie/strom-sparen/heizen-und-lueften-so-gehts-richtig-10426">Verbraucherzentrale erläutert den Zusammenhang zwischen Heizen, Lüften und Schimmelrisiko</a>. Ihre Orientierung von mindestens 16–18 °C in Wohn- und Schlafräumen während der Heizperiode ist keine universelle Schimmelfrei-Garantie; bei schlechtem Bauzustand können höhere Temperaturen nötig sein. Gebäudeteile, Feuchte und Luftaustausch entscheiden mit.</p>
<p>Wir rechnen deshalb weder einen festen Eurobetrag für eingesparte Raumheizung noch einen pauschalen Prozentvorteil aus. Beobachte Raumtemperatur, Feuchte und kalte Oberflächen. <a href="/guide/richtig-lueften-im-winter.html">Winter-Lüftung und Taupunkt prüfen</a> · <a href="/strommess-protokoll.html">Tatsächliche kWh über eine vollständige Nutzung messen</a>.</p>
<h2 id="kaufpruefung">Vor einem Kauf: die vier offenen Punkte</h2>
<ol><li>Exakte Bauart und Artikelnummer: Zudecke, Unterbett, Heizkissen oder Fußwärmer?</li><li>Anleitung: erlaubte Körperposition, Betrieb beim Schlafen, Abschaltung, Reinigung und Eignung bei eingeschränktem Wärmeempfinden prüfen.</li><li>Typenschild und vollständige Messung: Nennleistung ist kein Verbrauch einer mittleren Stufe.</li><li>Lieferland, Stecker, Rückgabe und Gesamtpreis: in Österreich und besonders der Schweiz separat beim Händler prüfen; die Länderwahl im Rechner bestätigt keine Lieferbarkeit.</li></ol>
<div class="warmth-buy"><strong>Optional weitervergleichen · Werbung / Affiliate-Links</strong><p>Die folgenden bestehenden Kategorie-Suchen führen zu Amazon.de (Deutschland). EcoBack kann an qualifizierten Käufen verdienen. Keine eigene Produktprüfung, keine bestätigte Passform oder Lieferzusage nach Österreich oder in die Schweiz. Die Suche kann andere Varianten als das Herstellerbeispiel enthalten.</p>
<a href="https://www.amazon.de/s?k=heizdecke+abschaltautomatik+waschbar&amp;tag=getecoback-21" target="_blank" rel="sponsored noopener">Wärmezudecken: Anleitung und Abschaltzeit vergleichen →</a>
<a href="https://www.amazon.de/s?k=heizkissen+abschaltautomatik&amp;tag=getecoback-21" target="_blank" rel="sponsored noopener">Heizkissen: Bauart und Anwendung prüfen →</a>
<a href="https://www.amazon.de/s?k=waermeunterbett+abschaltautomatik&amp;tag=getecoback-21" target="_blank" rel="sponsored noopener">Wärmeunterbetten: ausdrücklich erlaubte Nutzung prüfen →</a></div>
<h2 id="haeufige-fragen">Häufige Fragen</h2>''' + faq + '''
<p><a href="/guide/heizluefter-stromverbrauch.html">Kosten kurzzeitiger Raumwärme berechnen</a> · <a href="/winter-energiesparen.html">Winter-Aufgaben im Überblick</a></p>
</div></article>'''

def inject(source):
    # Rebuild the canonical article after generic cards. Never retain contradictory
    # sleep or savings promises hidden in a popup or a second structured FAQ.
    for marker in ('POPUP','TOPPICK','MODELS','QUICKPICK','STICKY','RADAR','USSWITCH','USMARKET','USTOP','USSHELF','PERSONAL_WARMTH_ASSETS'):
        source = re.sub(r'<!--EB_' + marker + r'-->.*?<!--/EB_' + marker + r'-->', '', source, flags=re.S)
    source = re.sub(r'<article\b[^>]*>.*?</article>', lambda _: article(), source, count=1, flags=re.S)
    source = re.sub(r'<title>.*?</title>', '<title>' + TITLE + '</title>', source, count=1, flags=re.S)
    source = re.sub(r'<meta name="description" content="[^"]*">', '<meta name="description" content="' + DESC + '">', source)
    source = re.sub(r'<meta property="og:title" content="[^"]*">', '<meta property="og:title" content="' + TITLE + '">', source)
    source = re.sub(r'<meta property="og:description" content="[^"]*">', '<meta property="og:description" content="' + DESC + '">', source)
    source = re.sub(r'<h1>.*?</h1>', '<h1>' + TITLE + '</h1>', source, count=1, flags=re.S)
    source = source.replace('Die ehrliche Rechnung — pro Stunde, pro Nacht, pro Winter. Und der Hebel, den die Decke erst möglich macht.', 'Kosten für persönliche Wärme sofort einordnen – mit nachvollziehbaren Beispielen, eigenem Tarif und Grenzen der Anwendung.')
    def schema(match):
        try: data = json.loads(match.group(2))
        except (ValueError, TypeError): return match.group(0)
        nodes = data.get('@graph', [data]) if isinstance(data, dict) else []
        changed = False
        for node in nodes:
            if node.get('@type') == 'Article':
                node.update(headline=TITLE, description=DESC, dateModified='2026-10-31')
                changed = True
            elif node.get('@type') == 'FAQPage':
                node['mainEntity'] = [{'@type':'Question','name':q,'acceptedAnswer':{'@type':'Answer','text':a}} for q,a in FAQ]
                changed = True
        return match.group(1)+json.dumps(data, ensure_ascii=False)+match.group(3) if changed else match.group(0)
    source = re.sub(r'(<script\b[^>]*type="application/ld\+json"[^>]*>)(.*?)(</script>)', schema, source, flags=re.S)
    assets = []
    for name in ('personal-warmth.css', 'personal-warmth.mjs'):
        digest = hashlib.sha256((SITE/'assets'/name).read_bytes()).hexdigest()[:12]
        path = '/assets/' + name + '?v=' + digest
        assets.append('<link rel="stylesheet" href="'+path+'">' if name.endswith('.css') else '<script type="module" src="'+path+'"></script>')
    return source.replace('</body>', '<!--EB_PERSONAL_WARMTH_ASSETS-->'+''.join(assets)+'<!--/EB_PERSONAL_WARMTH_ASSETS--></body>')

if __name__ == '__main__':
    target = SITE/'guide'/(SLUG+'.html')
    target.write_text(inject(target.read_text()), encoding='utf-8')
