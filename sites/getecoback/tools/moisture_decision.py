"""Replace the link-only picker on six existing purchase-intent guides.

No new URLs, inferred product tests, live prices or automatic market routing.
Manufacturer figures were checked on 2026-10-01; the dated evidence is visible.
"""
import re
from html import escape

PATHS = {
    False: {'luftentfeuchter-ratgeber', 'waesche-trocknen-wohnung', 'luftentfeuchter-20-qm', 'luftentfeuchter-keller'},
    True: {'dehumidifier-20-sqm', 'dehumidifier-drying-clothes-cost'},
}
MEACO = 'https://www.meaco.com/products/meacodry-arete-one-20l-dehumidifier-and-air-purifier'
COMFEE = 'https://www.feelcomfee.com/content/dam/comfee-aem/global/products/heating-cooling/dehumidifier-mddf-20den7/DF-Owners-Manual.pdf'
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
    read = '/en/guide/dehumidifier-20-sqm.html' if en else '/guide/meacodry-arete-one-test.html'
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
    products = '<div data-market-de hidden><div class="choice-products"><div><h3>Comfee MDDF-20DEN7</h3><p>'+t(
        'Vergleichskandidat mit Hygrostat und Dauerablauf. Prüfe am angebotenen Modell Einsatztemperatur, Anschluss und Raumempfehlung. MDDF-20DEN7 und die WF-Variante nicht verwechseln.',
        'A candidate with a humidistat and continuous drainage. Check operating temperature, connection and room guidance for the exact listing. Do not confuse MDDF-20DEN7 with the WF variant.')+'</p>'+shop('https://www.amazon.de/dp/B07KJX6RDK?tag=getecoback-21',t('Modell bei Amazon.de prüfen*','Check model at Amazon.de*'))+'</div><div><h3>MeacoDry Arete One 20L</h3><p>'+t(
        'Vergleichskandidat mit Wäschemodus. Der Hersteller nennt 8,5 l/Tag bei 20 °C und 60 % relativer Feuchte; bei 10 °C und 60 % nur 3,4 l/Tag. Die 20L im Namen sind keine Alltagsgarantie.',
        'A candidate with laundry mode. The maker lists 8.5 L/day at 20°C and 60% RH, versus 3.4 L/day at 10°C and 60% RH. The 20L name is not an everyday output guarantee.')+'</p>'+shop('https://www.amazon.de/s?k=MeacoDry+Arete+One+20L&tag=getecoback-21',t('Exaktes Modell bei Amazon.de suchen*','Find exact model at Amazon.de*'))+'</div></div><small>'+t(
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
        'If high humidity returns despite suitable ventilation and no structural cause is present, consider a unit with a humidistat. Room volume, moisture load, noise and measured temperature still matter; these examples do not automatically establish the right size.')+'</p>'+products+link(read,t('Auslegung und Quellen nachlesen','Read sizing guidance and sources')))
    evidence = '<details><summary>'+t('Warum „20 Liter“ nicht immer 20 Liter sind','Why “20 litres” does not always mean 20 litres')+'</summary><p>'+t(
        'Beispiel MeacoDry Arete One 20L. Herstellerdaten, kein EcoBack-Test. Verschiedene Raumbedingungen dürfen nicht als direkter Effizienzvergleich gelesen werden.',
        'Example: MeacoDry Arete One 20L. Manufacturer figures, not an EcoBack test. Different room conditions are not a controlled efficiency comparison.')+'</p><div class="choice-table"><table><thead><tr><th>'+t('Bedingung','Condition')+'</th><th>'+t('Wasser pro Tag','Water per day')+'</th><th>'+t('Leistung','Power')+'</th></tr></thead><tbody><tr><td>10 °C / 60 % RH</td><td>3.4 L</td><td>180 W</td></tr><tr><td>20 °C / 60 % RH</td><td>8.5 L</td><td>216 W</td></tr></tbody></table></div><p>'+t(
        'Rechenbeispiel: 216 W × 6 h ÷ 1.000 × 0,35 €/kWh = 0,45 €. Das ist weder eine gemessene Wäscheladung noch eine Einsparzusage.',
        'Example calculation: 216 W × 6 h ÷ 1,000 × €0.35/kWh = €0.45. This is not a measured laundry load or a savings promise.')+'</p></details>'
    return '<!--EB_BUYER--><link rel="stylesheet" href="/assets/moisture-decision.css"><section id="eb-moisture-choice" data-lang="'+('en' if en else 'de')+'" aria-labelledby="eb-choice-title"><h2 id="eb-choice-title">'+t('Brauchst du einen Entfeuchter – und welchen Typ?','Do you need a dehumidifier — and which type?')+'</h2><p>'+t(
        'Beantworte drei kurze Fragen. Du erhältst einen nächsten Schritt – vom Weiterbeobachten bis zum gezielten Modellvergleich. Ohne Anmeldung.',
        'Answer three short questions for a next step, from monitoring the room to comparing models. No account needed.')+'</p><form>'+fields+'<button type="submit">'+t('Meinen nächsten Schritt zeigen','Show my next step')+'</button></form><div data-results tabindex="-1" aria-live="polite" hidden>'+answers+'</div>'+evidence+'<small>'+t('Quellen geprüft am 01.10.2026: ','Sources checked on 1 October 2026: ')+f'<a href="{MEACO}">Meaco</a> · <a href="{COMFEE}">Comfee '+t('Handbuch','manual')+f'</a> · <a href="{AIR}">Verbraucherzentrale</a>. '+t('Keine eigenen Produkttests. Angaben sind Orientierung, keine Ferndiagnose.','No hands-on tests. Guidance, not a remote diagnosis.')+'</small><button type="button" data-copy>'+t('Diese Entscheidungshilfe teilen','Share this decision guide')+'</button><input data-share aria-label="'+t('Link zum Kopieren','Link to copy')+'" readonly hidden><p data-status role="status"></p><noscript><p>'+t('Ohne JavaScript: ','Without JavaScript: ')+link(cost,t('Kosten vergleichen','Compare costs'))+' · '+link(cold,t('Kalte Räume prüfen','Read cold-room guidance'))+'</p></noscript></section><script type="module" src="/assets/moisture-decision.mjs"></script><!--/EB_BUYER-->\n'

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
    return html[:pos]+block(en)+html[pos:]

def creator_entry(html, en=False):
    path = '/en/guide/dehumidifier-drying-clothes-cost.html' if en else '/guide/waesche-trocknen-wohnung.html'
    title = 'Before recommending a dehumidifier' if en else 'Vor einer Entfeuchter-Empfehlung'
    body = ('Give readers a decision guide they can use: measure humidity, compare cold-room performance and check laundry costs before buying. The guide includes reasons to wait. Share the link below; it contains no reader answers or affiliate URL.' if en else 'Gib deinen Lesern eine prüfbare Entscheidungshilfe: Feuchte messen, Kalt-Raum-Leistung und Wäschekosten vergleichen, erst danach kaufen. Auch Gründe gegen einen Kauf sind enthalten. Der Link unten enthält weder persönliche Antworten noch eine Affiliate-URL.')
    label = 'Open the free decision guide' if en else 'Kostenlose Entscheidungshilfe öffnen'
    part = f'<!--EB_BUYER_KIT--><section id="buyer-kit"><h2>{title}</h2><p>{body}</p><p><a href="{path}?utm_source=creator-kit&amp;utm_medium=referral&amp;utm_campaign=moisture-decision#eb-moisture-choice">{label}</a></p></section><!--/EB_BUYER_KIT-->'
    cost = '/en/guide/dehumidifier-drying-clothes-cost.html' if en else '/waeschetrockner-oder-luftentfeuchter.html'
    demo = ('Demonstration idea: compare 250 W for eight hours with a dryer using 1.5 kWh. Then change the runtime to four hours. Mark all numbers as fictional and hold load size and final dryness equal. Readers can enter whole-run kWh, convert labels per 100 cycles, and export their own result card without an account.' if en else 'Demo-Idee: Vergleiche 250 W über acht Stunden mit einem Trockner mit 1,5 kWh. Ändere danach die Laufzeit auf vier Stunden. Kennzeichne alle Zahlen als Rechenbeispiel; Wäschemenge und Trocknungsgrad bleiben gleich. Leser können ganze kWh-Durchgänge eingeben, Label je 100 Zyklen umrechnen und ihre Ergebniskarte ohne Konto herunterladen.')
    label = 'Open the laundry cost calculator' if en else 'Wäschekostenrechner öffnen'
    part = part.replace('</section>',f'<h3>{"A reproducible video demonstration" if en else "Eine nachvollziehbare Video-Demo"}</h3><p>{demo}</p><p><a href="{cost}#laundry-check">{label}</a></p></section>')
    if '<!--EB_BUYER_KIT-->' in html:
        return re.sub(r'<!--EB_BUYER_KIT-->.*?<!--/EB_BUYER_KIT-->',lambda m:part,html,flags=re.S)
    if '</main>' not in html: raise ValueError('Creator kit has no main element')
    return html.replace('</main>',part+'</main>',1)
