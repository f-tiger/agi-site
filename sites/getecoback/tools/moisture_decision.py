"""Replace the link-only picker on six existing purchase-intent guides.

No new URLs, inferred product tests, live prices or automatic market routing.
Manufacturer figures were checked on 2026-11-06; the dated evidence is visible.
"""
import re
import hashlib
from pathlib import Path

ASSET_VERSION = hashlib.sha256((Path(__file__).resolve().parents[1] / "site/assets/moisture-decision.mjs").read_bytes()).hexdigest()[:12]
from html import escape

PATHS = {
    False: {'luftentfeuchter-ratgeber', 'waesche-trocknen-wohnung', 'luftentfeuchter-20-qm', 'luftentfeuchter-keller'},
    True: {'dehumidifier-20-sqm', 'dehumidifier-drying-clothes-cost'},
}
MEACO = 'https://www.meaco.com/products/meacodry-arete-one-20l-dehumidifier-and-air-purifier'
COMFEE = 'https://www.feelcomfee.com/content/dam/comfee-aem/global/products/heating-cooling/dehumidifier-mddf-20den7/DF-Owners-Manual.pdf'
COMFEE_PRODUCT = 'https://www.feelcomfee.com/de/produkte/klimatisieren-heizen/mddf-20den7'
COMFEE_DATA = 'https://www.feelcomfee.com/content/dam/comfee-aem/de/produkte/klimatisieren-heizen/mddf-20den7/comfee-MDDF-20DEN7-Datenblatt.pdf#page=2'
AIR = 'https://www.verbraucherzentrale.de/wissen/energie/strom-sparen/heizen-und-lueften-so-gehts-richtig-10426'

def block(en=False):
    def t(de, english): return english if en else de
    def link(url, label, action='guide'):
        return f'<a href="{escape(url, quote=True)}" data-choice-action="{action}">{label}</a>'
    def shop(url, label):
        return f'<a href="{escape(url, quote=True)}" target="_blank" rel="sponsored nofollow noopener" data-choice-action="shop">{label}</a>'
    def select(name, title, options, default=None):
        return f'<label>{title}<select name="{name}">'+''.join(f'<option value="{v}"'+(' selected' if v==default else '')+f'>{s}</option>' for v,s in options)+'</select></label>'
    cost = '/en/guide/dehumidifier-drying-clothes-cost.html' if en else '/waeschetrockner-oder-luftentfeuchter.html'
    cold = '/en/guide/desiccant-vs-compressor-dehumidifier.html' if en else '/guide/luftentfeuchter-keller.html'
    care = '/en/guide/rising-damp-penetrating-damp-or-condensation.html' if en else '/guide/luftentfeuchter-gegen-schimmel.html'
    fields = select('purpose',t('Wobei brauchst du Hilfe?','What are you trying to do?'),[
        ('room',t('Feuchte Raumluft senken','Reduce room humidity')),
        ('laundry',t('Wäsche drinnen trocknen','Dry laundry indoors')),
        ('damage',t('Nasse Wand, Leck oder Schimmel','Wet wall, leak or visible mould'))])
    fields += select('humidity',t('Relative Luftfeuchte gemessen?','Have you measured relative humidity?'),[
        ('unknown',t('Noch nicht / unsicher','Not yet / unsure')),
        ('normal',t('Meist 40–60 % oder darunter','Usually 40–60% or below')),
        ('high',t('Wiederholt über 60 %','Repeatedly above 60%'))])
    fields += select('temperature',t('Temperatur am Aufstellort','Temperature where it will run'),[
        ('unknown',t('Noch nicht gemessen','Not measured yet')),
        ('warm',t('Mindestens 15 °C','At least 15°C')),
        ('cold',t('Unter 15 °C','Below 15°C'))])
    fields += select('market',t('Wo möchtest du einkaufen?','Where will you shop?'),[
        ('de',t('Deutschland / Amazon.de','Germany / Amazon.de')),
        ('other',t('Anderer Markt / nur informieren','Another market / advice only'))], 'other' if en else 'de')
    unknown = t('Entzug und Betriebsleistung unter dieser Bedingung nicht verifiziert.',
                'Extraction and running power at these conditions are not verified here.')

    def source(url, label):
        return f'<a href="{escape(url, quote=True)}">{label}</a>'

    def candidate(name, identity, data20, data10, features, limit, sources, destination, url, label):
        rows = [(t('Genaues Modell', 'Exact model'), identity),
                ('20 °C / 60 % RH', data20), ('10 °C / 60 % RH', data10),
                (t('Funktionen und Aufbau', 'Features and setup'), features),
                (t('Was offenbleibt', 'What remains uncertain'), limit)]
        facts = '<dl class="choice-facts">' + ''.join(
            f'<div><dt>{heading}</dt><dd>{value}</dd></div>' for heading, value in rows) + '</dl>'
        checks = '<details data-choice-evidence><summary>' + t(
            'Quellen und Kaufprüfung öffnen', 'Open sources and purchase checks') + '</summary><p>' + sources + '</p><ol><li>' + t(
            '<strong>Modell:</strong> Name, Generation und Modellzusatz auf Angebot, Typenschild und Anleitung abgleichen.',
            '<strong>Model:</strong> match the name, generation and suffix across the listing, rating plate and manual.') + '</li><li>' + t(
            '<strong>Strom und Aufstellung:</strong> Netzspannung, Stecker, Einsatztemperatur, Schlauch und Gefälle für dein Zuhause prüfen.',
            '<strong>Power and setup:</strong> check voltage, plug, operating temperature, hose and drainage slope for your home.') + '</li><li>' + t(
            '<strong>Verkäufer und Rückgabe:</strong> Gesamtpreis, Liefergebiet, Lieferumfang, Garantie und Rückgabebedingungen beim konkreten Händler prüfen.',
            '<strong>Seller and returns:</strong> check the delivered price, delivery area, included items, warranty and return terms with the actual retailer.') + '</li></ol></details>'
        return '<div class="choice-candidate"><h4>' + name + '</h4><p class="choice-evidence-label">' + t(
            'Herstellerangaben · kein eigener Test · geprüft 06.11.2026',
            'Manufacturer data · not hands-on tested · checked 6 November 2026') + '</p>' + facts + checks + '<div class="choice-offer"><p>' + destination + '</p>' + shop(url, label) + '</div></div>'

    comfee = candidate('Comfee MDDF-20DEN7', t('Ohne WF-Zusatz; nicht mit MDDF-20DEN7-WF gleichsetzen.',
        'Without the WF suffix; do not treat MDDF-20DEN7-WF as the same model.'), unknown, unknown,
        t('Feuchteregelung und 3-Liter-Tank. Dauerablauf nur nach passender Anleitung und mit Gefälle einrichten.',
          'Humidity control and a 3-litre tank. Set up continuous drainage using the applicable manual and a downward slope.'),
        t('Keine belegte Effizienzrangfolge aus den vorhandenen Angaben. Ein spezieller Wäschemodus ist für diese Variante hier nicht bestätigt.',
          'The available figures do not establish an efficiency ranking. A dedicated laundry mode is not confirmed here for this variant.'),
        source(COMFEE_PRODUCT, t('Offizielle Modellseite', 'Official model page')) + ' · ' +
        source(COMFEE_DATA, t('Datenblatt, Seite 2', 'Data sheet, page 2')) + ' · ' +
        source(COMFEE, t('Bedienhinweise zum Ablauf', 'Drainage instructions')),
        t('Feste Amazon.de-Produktseite. Modell und aktuelle Angebotsdetails dort nochmals prüfen.',
          'A fixed Amazon.de product page. Recheck the model and current offer details there.'),
        'https://www.amazon.de/dp/B07KJX6RDK?tag=getecoback-21',
        t('Modell bei Amazon.de prüfen*', 'Check model at Amazon.de*'))
    meaco = candidate('MeacoDry Arete One 20L', t('Arete One, 20L; weder Arete Two noch die 25L-Variante.',
        'Arete One, 20L; neither Arete Two nor the 25L variant.'),
        t('8.5 L/Tag · 216 W', '8.5 L/day · 216 W'), t('3.4 L/Tag · 180 W', '3.4 L/day · 180 W'),
        t('Feuchteregelung, Wäschemodus und Dauerablauf laut Modellseite. Ablaufschlauch dort nicht enthalten.',
          'The model page lists humidity control, laundry mode and continuous drainage. Its drain hose is not included.'),
        t('UK-Herstellerdaten belegen weder die Ausstattung eines deutschen Angebots noch dessen Lieferbarkeit. „20L“ ist keine Alltagsgarantie.',
          'UK manufacturer data does not verify a German offer’s equipment or availability. “20L” is not an everyday output guarantee.'),
        source(MEACO, t('Offizielle One-20L-Daten mit Messbedingungen', 'Official One 20L figures and test conditions')),
        t('Amazon.de-Modellsuche. Treffer können andere Generationen oder Größen enthalten.',
          'An Amazon.de model search. Results may include other generations or sizes.'),
        'https://www.amazon.de/s?k=MeacoDry+Arete+One+20L&tag=getecoback-21',
        t('Exaktes Modell bei Amazon.de suchen*', 'Find exact model at Amazon.de*'))
    products = '<div data-market-de hidden><p class="choice-comparison-note">' + t(
        'Zwei vorhandene Kandidaten mit denselben Prüfpunkten. Fehlende Werte sind keine Null und kein Nachteil im Ranking: Ohne vergleichbare Daten gibt es hier keinen Effizienz-Sieger.',
        'Two existing candidates with the same checks. Missing figures are not zero or a ranking penalty: without comparable data, this guide names no efficiency winner.') + '</p><div class="choice-products">' + comfee + meaco + '</div><small>'+t(
        'Werbung · Affiliate-Links: Als Amazon-Partner verdienen wir an qualifizierten Verkäufen. Preis, Verkäufer, Lieferbarkeit, Stecker und Rückgabebedingungen bei Amazon prüfen. Zwei Beispiele aus unserem Bestand, kein vollständiger Marktvergleich und kein eigener Produkttest.',
        'Ad · Affiliate links: As an Amazon Associate we earn from qualifying purchases. Check price, seller, availability, plug and return terms at Amazon. Two examples from our existing coverage, not a whole-market comparison or hands-on test.')+'</small></div><p data-market-other hidden>'+t(
        'Hier werden keine deutschen Kauflinks eingeblendet. Vergleiche beim Händler in deinem Markt das genaue Modell, Netzspannung, Stecker, Garantie und Liefergebiet.',
        'German shopping links are hidden. At a retailer serving your market, check the exact model, voltage, plug, warranty and delivery area.')+'</p>'
    answer = lambda key,title,body: f'<div data-answer="{key}" hidden><h3>{title}</h3>{body}</div>'
    answers = answer('measure',t('Erst messen, dann entscheiden','Measure before deciding'),'<p>'+t(
        'Notiere an mehreren typischen Tagen Temperatur und relative Feuchte, auch vor und nach dem Lüften oder Wäschetrocknen. Wenn du schon ein Hygrometer hast, nutze es. Ein neuer Entfeuchter ist aus diesen Angaben noch nicht begründet.',
        'Record temperature and relative humidity on several typical days, including before and after airing or drying laundry. Use your existing hygrometer if you have one. These answers do not yet justify buying a dehumidifier.')+'</p>')
    answers += answer('wait',t('Vorerst keinen Entfeuchter ableiten','No dehumidifier purchase indicated yet'),'<p>'+t(
        '40–60 % sind ein allgemeiner Wohnraum-Orientierungsbereich, keine Schimmelfrei-Garantie. Beobachte kalte Oberflächen und den Verlauf. Bei sehr trockener Luft nicht zusätzlich entfeuchten. Prüfe Lüftung und Feuchtequellen, bevor du ein Gerät kaufst.',
        '40–60% is a general comfort range, not a guarantee against mould. Check cold surfaces and changes over time. Do not dehumidify air that is already too dry. Review ventilation and moisture sources before buying.')+'</p>')
    answers += answer('cause',t('Die Feuchtequelle zuerst klären','Investigate the moisture source first'),'<p>'+t(
        'Ein Entfeuchter beseitigt weder ein Leck noch eine bauliche Feuchteursache oder vorhandenen Schimmel. Ursache dokumentieren und fachlich prüfen lassen; bei Mietwohnungen den Vermieter informieren. Ein Gerätekauf ersetzt diese Klärung nicht.',
        'A dehumidifier does not fix a leak, structural damp or existing mould. Document the problem and arrange an appropriate assessment; renters should notify the landlord. A device purchase does not replace that investigation.')+'</p>'+link(care,t('Ursachen und Grenzen lesen','Read about causes and limits')))
    answers += answer('cold',t('Kalte Räume: Leistung bei deiner Temperatur vergleichen','Cold rooms: compare output at your temperature'),'<p>'+t(
        'Unter 15 °C dient hier als Vergleichssignal, nicht als feste Abschaltgrenze. Verdichtergeräte können noch arbeiten, aber deutlich weniger Wasser entziehen. Prüfe Daten bei deiner Temperatur und Feuchte; Adsorptionsgeräte als Alternative auch nach Strombedarf vergleichen. Keine pauschale Kaufempfehlung für einen kalten Keller.',
        'Below 15°C is a comparison cue here, not a universal operating limit. Compressor units may still operate but extract much less water. Check data at your temperature and humidity; compare desiccant alternatives on energy use too. A cold basement does not automatically justify a purchase.')+'</p>'+link(cold,t('Bauart und Kellerbedingungen prüfen','Compare types and cold-room conditions')))
    answers += answer('laundry',t('Zuerst Kosten pro gleich trockener Ladung vergleichen','Compare cost per equally dry load first'),'<p>'+t(
        'Hast du schon einen Wärmepumpentrockner, kann dessen Nutzung günstiger sein als ein zusätzlicher Kauf. Vergleiche gemessene kWh bis zum gleichen Trocknungsgrad, Kaufpreis, Platz und Zeit. Ein Entfeuchter kann sinnvoll sein, wenn zugleich Raumfeuchte abgeführt werden muss.',
        'If you already own a heat-pump dryer, using it may cost less than buying another appliance. Compare measured kWh to the same dryness, purchase price, space and time. A dehumidifier may be useful when room moisture also needs to be removed.')+'</p>'+link(cost,t('Wäschekosten vergleichen','Compare laundry running costs'),'cost')+products)
    answers += answer('compare',t('Zwei Kandidaten gezielt prüfen','Compare two candidates for the job'),'<p>'+t(
        'Wenn erhöhte Feuchte trotz passender Lüftung wiederkehrt und keine bauliche Ursache vorliegt, kannst du ein Gerät mit Hygrostat prüfen. Raumvolumen, Feuchtelast, Geräusch und gemessene Temperatur bleiben entscheidend; die folgenden Beispiele sind keine automatische Größenfreigabe.',
        'If high humidity returns despite suitable ventilation and no structural cause is present, consider a unit with a humidistat. Room volume, moisture load, noise and measured temperature still matter; these examples do not automatically establish the right size.')+'</p>'+products)
    evidence = '<details data-choice-method><summary>'+t('So vergleichst du die Herstellerdaten','How to compare the manufacturer data')+'</summary><p>'+t(
        'Zwei Beispiele aus vorhandenen Ratgebern, kein vollständiger Marktvergleich und kein EcoBack-Produkttest. Verglichen werden Wasserentzug und Betriebsleistung bei derselben Temperatur und relativen Feuchte (RH). Fehlende Angaben bleiben offen; daraus folgt keine Rangfolge.',
        'Two examples from existing guides, not a whole-market comparison or an EcoBack product test. Compare extraction and running power at the same temperature and relative humidity (RH). Missing figures remain unknown; they do not establish a ranking.')+'</p><div class="choice-table"><table><caption>'+t(
        'Herstellerangaben zu Wasserentzug und Leistung; geprüft am 06.11.2026',
        'Manufacturer extraction and power figures; checked on 6 November 2026')+'</caption><thead><tr><th scope="col">'+t('Bedingung','Condition')+'</th><th scope="col">Comfee MDDF-20DEN7</th><th scope="col">MeacoDry Arete One 20L</th></tr></thead><tbody><tr><th scope="row">20 °C / 60 % RH</th><td>'+unknown+'</td><td>'+t('8.5 L/Tag · 216 W','8.5 L/day · 216 W')+'</td></tr><tr><th scope="row">10 °C / 60 % RH</th><td>'+unknown+'</td><td>'+t('3.4 L/Tag · 180 W','3.4 L/day · 180 W')+'</td></tr></tbody></table></div><p>'+t(
        'Die genannten 20 L/Tag beziehen sich in den Modellunterlagen auf 30 °C / 80 % RH. Das ist keine Zusage für den Keller oder eine Wäscheladung. Für Comfee wurden in den verlinkten Unterlagen keine Werte für die beiden Tabellenbedingungen verifiziert. Anschlusswert oder Nennleistung dürfen diese Datenlücke nicht ersetzen.',
        'The model documents associate 20 L/day with 30°C / 80% RH. That is not a promise for a basement or a laundry load. The linked Comfee documents do not verify figures at the two conditions in this table. Connection ratings or rated input must not be substituted for this missing data.')+'</p><p>'+t(
        'Modellgrenzen: Comfee MDDF-20DEN7 ist hier die Variante ohne WF. MeacoDry Arete One 20L ist weder Arete Two noch One 25L. Die UK-Modellseite bestätigt keine deutsche Händlerausstattung, Stecker, Lieferbarkeit oder Rückgabe. Netzspannung, Typenschild und Anleitung immer mit dem konkreten Angebot abgleichen. Beide Kandidaten ersetzen weder Ursachenklärung noch eine passende Lüftung.',
        'Model boundaries: Comfee MDDF-20DEN7 here is the variant without WF. MeacoDry Arete One 20L is neither Arete Two nor One 25L. The UK model page does not verify a German retailer’s equipment, plug, availability or returns. Match voltage, rating plate and manual to the actual offer. Neither candidate replaces investigating moisture sources or suitable ventilation.')+'</p><p>'+t(
        'Rechenbeispiel: 216 W × 6 h ÷ 1.000 × 0,35 €/kWh = 0,45 €. Das ist weder eine gemessene Wäscheladung noch eine Einsparzusage.',
        'Example calculation: 216 W × 6 h ÷ 1,000 × €0.35/kWh = €0.45. This is not a measured laundry load or a savings promise.')+'</p><small>'+t('Quellen geprüft am 06.11.2026: ','Sources checked on 6 November 2026: ')+source(MEACO, 'Meaco One 20L')+' · '+source(COMFEE_PRODUCT, 'Comfee MDDF-20DEN7')+' · '+source(COMFEE_DATA,t('Comfee-Datenblatt, Seite 2','Comfee data sheet, page 2'))+' · '+source(COMFEE,t('Comfee-Bedienhinweise','Comfee operating instructions'))+' · '+source(AIR,'Verbraucherzentrale')+'. '+t('Herstellerangaben, keine eigenen Messungen. Orientierung, keine Ferndiagnose.','Manufacturer figures, not our own measurements. Guidance, not a remote diagnosis.')+'</small></details>'
    fallback = '<div data-choice-fallback><p>'+t(
        'Dein nächster Schritt: Feuchte und Temperatur zunächst messen, bei nassen Wänden die Ursache klären. Die Herstellerdaten unten helfen dir, Bedingungen und Modellvarianten zu unterscheiden.',
        'Your next step: measure humidity and temperature first, and investigate the cause of wet walls. The manufacturer data below helps distinguish conditions and model variants.')+'</p><p>'+link(cost,t('Wäschekosten vergleichen','Compare laundry costs'))+' · '+link(cold,t('Kalte Räume prüfen','Check cold-room conditions'))+' · '+link(care,t('Feuchteursachen klären','Investigate moisture sources'))+'</p></div>'
    return '<!--EB_BUYER--><link rel="stylesheet" href="/assets/moisture-decision.css"><section id="eb-moisture-choice" data-lang="'+('en' if en else 'de')+'" aria-labelledby="eb-choice-title"><h2 id="eb-choice-title">'+t('Brauchst du einen Entfeuchter – und welchen Typ?','Do you need a dehumidifier — and which type?')+'</h2><p>'+t(
        'Finde deinen nächsten Schritt – vom Weiterbeobachten bis zum gezielten Modellvergleich. Entscheidend sind Feuchte, Temperatur und die Ursache. Ohne Anmeldung.',
        'Find your next step, from monitoring the room to comparing models. Humidity, temperature and the moisture source matter. No account needed.')+'</p>'+fallback+'<form hidden inert><fieldset data-choice-fields disabled><legend>'+t('Deine Situation und dein Einkaufsmarkt','Your situation and shopping market')+'</legend>'+fields+'<button type="submit">'+t('Meinen nächsten Schritt zeigen','Show my next step')+'</button></fieldset></form><div data-results tabindex="-1" aria-live="polite" hidden>'+answers+'</div>'+evidence+'<button type="button" data-copy hidden>'+t('Diese Entscheidungshilfe teilen','Share this decision guide')+'</button><input data-share aria-label="'+t('Link zum Kopieren','Link to copy')+'" readonly hidden><p data-status role="status"></p></section><script type="module" src="/assets/moisture-decision.mjs?v='+ASSET_VERSION+'"></script><!--/EB_BUYER-->\n'

def inject(html, slug, en=False):
    if slug not in PATHS[en]: return None
    html = re.sub(r'<!--EB_BUYER-->.*?<!--/EB_BUYER-->\n?', '', html, flags=re.S)
    html = re.sub(r'<!--EB_QUICKPICK-->.*?<!--/EB_QUICKPICK-->\n?', '', html, flags=re.S)
    marker = '<!--EB_MODELS-->'
    if marker in html: return html.replace(marker, block(en)+marker, 1)
    # An explicit article anchor avoids headings belonging to the navigation.
    article = re.search(r'<article\b[^>]*>',html)
    start = article.end() if article else 0
    match = re.search(r'<h2\b', html[start:])
    if not match: raise ValueError('No content heading for '+slug)
    pos=start+match.start()
    # Keep independent calculators as siblings, never wrap another tool's form.
    laundry = html.find('<!--EB_LAUNDRY-->', start)
    if start <= laundry < pos: pos = laundry
    return html[:pos]+block(en)+html[pos:]

def creator_entry(html, en=False):
    path = '/en/guide/dehumidifier-drying-clothes-cost.html' if en else '/guide/waesche-trocknen-wohnung.html'
    title = 'Before recommending a dehumidifier' if en else 'Vor einer Entfeuchter-Empfehlung'
    body = ('Give readers a decision guide they can use: measure humidity, compare cold-room performance and check laundry costs before buying. The guide includes reasons to wait. Share the link below; it contains no reader answers or affiliate URL.' if en else 'Gib deinen Lesern eine prüfbare Entscheidungshilfe: Feuchte messen, Kalt-Raum-Leistung und Wäschekosten vergleichen, erst danach kaufen. Auch Gründe gegen einen Kauf sind enthalten. Der Link unten enthält weder persönliche Antworten noch eine Affiliate-URL.')
    label = 'Open the free decision guide' if en else 'Kostenlose Entscheidungshilfe öffnen'
    part = f'<!--EB_BUYER_KIT--><section id="buyer-kit"><h2>{title}</h2><p>{body}</p><p><a href="{path}?utm_source=creator-kit&amp;utm_medium=referral&amp;utm_campaign=moisture-decision#eb-moisture-choice">{label}</a></p></section><!--/EB_BUYER_KIT-->'
    cost = '/en/guide/dehumidifier-drying-clothes-cost.html' if en else '/waeschetrockner-oder-luftentfeuchter.html'
    demo = ('Demonstration idea: compare 250 W for eight hours with a dryer using 1.5 kWh. Then change the runtime to four hours. Mark all numbers as fictional and hold load size and final dryness equal. Readers can enter whole-run kWh, convert labels per 100 cycles, and export their own result card without an account.' if en else 'Demo-Idee: Ein Trockner-Label mit 125 kWh je 100 Zyklen entspricht 1,25 kWh je Label-Zyklus. Bei beispielhaften 0,35 €/kWh sind das gerundet 0,44 € direkte Stromkosten; mit 0,40 €/kWh werden es 0,50 €. Zeige die Eingabe „je 100 Zyklen“ und ändere danach nur den Strompreis. Kennzeichne die Zahlen als Rechenbeispiel: Labelbedingungen sind keine Messung deiner eigenen Wäscheladung. Für einen Gerätevergleich müssen Wäschemenge und Trocknungsgrad vergleichbar sein. Leser können die Ergebniskarte ohne Konto herunterladen. Bei einer Veröffentlichung die Quelle und gegebenenfalls Werbung offenlegen.')
    label = 'Open the laundry cost calculator' if en else 'Wäschekostenrechner öffnen'
    part = part.replace('</section>',f'<h3>{"A reproducible video demonstration" if en else "Eine nachvollziehbare Video-Demo"}</h3><p>{demo}</p><p><a href="{cost}#laundry-check">{label}</a></p></section>')
    if '<!--EB_BUYER_KIT-->' in html:
        return re.sub(r'<!--EB_BUYER_KIT-->.*?<!--/EB_BUYER_KIT-->',lambda m:part,html,flags=re.S)
    if '</main>' not in html: raise ValueError('Creator kit has no main element')
    return html.replace('</main>',part+'</main>',1)
