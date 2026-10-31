"""Keep audited buying journeys explicit across repeated site builds.

The named-model guide and conditional moisture advice are the recommendation
sources on these pages. Automatic category shelves must not contradict them.
"""
import re
from moisture_decision import PATHS as MOISTURE_PATHS
from build_winter_guides import PAGES as WINTER_PAGES

WINDOW_DE = {'klimaanlage-kippfenster', 'klimaanlage-dachfenster', 'klimaanlage-zubehoer-guenstig', 'fensterabdichtung-klimaanlage'}
WINDOW_EN = {'portable-ac-tilt-and-turn-windows', 'portable-ac-skylight-roof-window', 'window-seal-portable-ac'}
FOCUSED = {'luftentfeuchter-20-qm', 'dehumidifier-20-sqm', 'heizluefter-stromverbrauch', 'best-portable-air-conditioner-italy'}
PROTECTED = WINDOW_DE | WINDOW_EN | FOCUSED | MOISTURE_PATHS[False] | MOISTURE_PATHS[True]


def strip(html, names):
    for name in names:
        html = re.sub(r'<!--EB_'+name+r'-->.*?<!--/EB_'+name+r'-->', '', html, flags=re.S)
    return html


def seal_block(en=False):
    def t(de, eng): return eng if en else de
    return '''<!--EB_SEALFIT--><section id="eb-seal-fit" class="eb-demand" data-lang="'''+('en' if en else 'de')+'''" aria-labelledby="eb-seal-title"><h2 id="eb-seal-title">'''+t('Welche Abdichtung passt zu deinem Fenster?', 'Which seal fits your window?')+'''</h2><p>'''+t('Miss die Breite und Höhe des Flügels in cm. Der Umfang 2 × (Breite + Höhe) ist eine erste Orientierung für Stoffabdichtungen; die Messvorgaben des konkreten Herstellers gehen vor.', 'Measure sash width and height in cm. Perimeter = 2 × (width + height) is an initial guide for fabric seals; follow the exact maker’s measurement instructions.')+'''</p><form><div class="eb-demand-fields"><label>'''+t('Breite (cm)', 'Width (cm)')+'''<input name="width" type="number" min="20" max="300" step="0.1" value="60" required></label><label>'''+t('Höhe (cm)', 'Height (cm)')+'''<input name="height" type="number" min="20" max="300" step="0.1" value="140" required></label><label>'''+t('Fensterart', 'Window type')+'''<select name="window"><option value="casement">'''+t('Dreh-/Kippfenster', 'Tilt / casement')+'''</option><option value="roof">'''+t('Dachfenster', 'Roof window / skylight')+'''</option></select></label><label>'''+t('Bauart / Befestigung', 'Seal type / fixing')+'''<select name="material"><option value="fabric">'''+t('Stoff mit Klettband erlaubt', 'Fabric with adhesive allowed')+'''</option><option value="panel">'''+t('Starre Platte / nicht kleben', 'Rigid panel / no adhesive')+'''</option></select></label><label>'''+t('Suchmarkt selbst wählen', 'Choose shopping market')+'''<select name="market"><option value="none" selected>'''+t('Nur Ergebnis, kein Shop', 'Advice only, no shop')+'''</option><option value="de">Amazon.de · Germany</option><option value="us">Amazon.com · US</option></select></label></div><button type="submit">'''+t('Maße und nächsten Schritt zeigen', 'Show dimensions and next step')+'''</button></form><div data-result tabindex="-1" aria-live="polite" hidden></div><p class="eb-demand-small">'''+t('Werbung · Optionale Affiliate-Suchlinks. Suchergebnisse sind keine bestätigten passenden Angebote. Liefergebiet, Rückgabe, Schlauchöffnung, Klebefläche und Montageanleitung prüfen.', 'Ad · Optional affiliate search links. Search results are not confirmed compatible listings. Check delivery, returns, hose opening, mounting surface and installation instructions.')+'''</p><p class="eb-demand-small">'''+t('Längenbeispiele, keine Passgarantie: ', 'Example lengths, not a fit guarantee: ')+'''<a href="https://en.trotec.com/shop/airlock-100-window-sealing.html">Trotec AirLock 100 (400 cm)</a> · <a href="https://en.trotec.com/shop/airlock-1000-door-and-window-sealing.html">AirLock 1000 (560 cm)</a>. '''+t('Herstellerangaben geprüft am 02.10.2026. Für Dachfenster keine automatische Größenfreigabe.', 'Manufacturer specifications checked 2 October 2026. No automatic size approval for roof windows.')+'''</p><noscript><p>'''+t('60 × 140 cm ergeben 400 cm Umfang; 80 × 180 cm ergeben 520 cm. Eine 400-cm-Abdichtung ist für 520 cm zu kurz. Vor dem Kauf die Montagezeichnung prüfen.', '60 × 140 cm gives a 400 cm perimeter; 80 × 180 cm gives 520 cm. A 400 cm seal is too short for 520 cm. Check the installation diagram before buying.')+'''</p></noscript></section><!--/EB_SEALFIT-->'''


def heater_block():
    return '''<!--EB_HEATCOST--><section id="eb-heater-cost" class="eb-demand" aria-labelledby="eb-heater-title"><h2 id="eb-heater-title">Was kosten 20 Minuten, zwei Stunden oder ein Abend?</h2><p>Vergleiche zuerst drei kurze Rechenbeispiele ohne Eingabe. Alle rechnen mit 2.000 W bei voller Heizleistung und einem frei gewählten Arbeitspreis von 0,40 €/kWh. Das ist kein aktueller Durchschnittstarif und keine Messung deines Geräts.</p><div class="eb-demand-examples" aria-label="Heizdauer als Rechenbeispiel"><button type="button" data-heater-example="20min">20 Minuten · 0,27 €</button><button type="button" data-heater-example="2h">2 Stunden · 1,60 €</button><button type="button" data-heater-example="4h">4 Stunden · 3,20 €</button></div><p class="eb-demand-small">Die Auswahl lädt jeweils das vollständige Beispiel. Für deinen Tarif oder eine andere Leistung öffne die Einstellungen.</p><form><details><summary>Leistung, Strompreis und Nutzungsdauer anpassen</summary><div class="eb-demand-fields"><label>Eingestellte Leistung (W)<input name="watts" type="number" min="0" max="5000" step="1" value="2000" required></label><label>Betriebszeit pro Tag (h)<input name="hours" type="number" min="0" max="24" step="any" value="0.3333333333333333" required></label><label>Arbeitspreis aus deinem Tarif (€/kWh)<input name="tariff" type="number" min="0" max="5" step="any" value="0.40" required></label><label>Tage<input name="days" type="number" min="1" max="366" step="1" value="1" required></label><label>Angenommener Heizanteil (%)<input name="duty" type="number" min="0" max="100" step="1" value="100" required></label></div></details><button type="submit">Mit diesen Annahmen berechnen</button></form><div data-result tabindex="-1" aria-live="polite" hidden></div><p class="eb-demand-small">100 % bedeutet ununterbrochen mit der eingestellten Leistung. Eine kleinere Prozentzahl ist eine Annahme, keine garantierte Thermostat-Ersparnis. Für tatsächliche Kosten den gesamten kWh-Verbrauch messen; Standby und Lüfternachlauf fehlen in der Leistungsrechnung.</p><p><strong>Erst den Zweck prüfen:</strong> Kurzzeitige Zusatzwärme ist eine andere Aufgabe als Raumheizung über viele Stunden. Eine niedrigere Wattzahl beweist weder gleiche Wärme noch niedrigere Gesamtkosten. Feuchte Wäsche gehört nicht auf das Heizgerät; dafür gibt es den <a href="/waeschetrockner-oder-luftentfeuchter.html">Vergleich für eine gleich trockene Ladung</a>.</p><p><a href="/strommess-protokoll.html">Tatsächlichen Verbrauch messen</a> · <a href="/guide/heizkosten-vergleich-rechner.html">Vor einem Neukauf: Heizarten vergleichen</a> · <a href="https://www.verbraucherzentrale.de/wissen/energie/strom-sparen/stromsparboxen-und-heizluefter-fuer-steckdosen-ohne-spareffekt-78391">Verbraucherzentrale: Vorsicht bei Sparversprechen für Steckdosen-Heizgeräte</a></p><noscript><p>Die drei Beispielkosten oben funktionieren ohne JavaScript. Formel: W ÷ 1.000 × Stunden × Heizanteil ÷ 100 × €/kWh × Tage. 20 Minuten sind ein Drittel einer Stunde: 2 kW × ⅓ h × 0,40 €/kWh = rund 0,27 €. Eigene Werte lassen sich mit JavaScript berechnen.</p></noscript></section><!--/EB_HEATCOST-->'''


def inject(html, slug, en=False):
    if slug in WINTER_PAGES or slug == 'winter-energiesparen':
        return strip(html, ['USSWITCH','USMARKET','USTOP','USSHELF','POPUP','MODELS','TOPPICK','QUICKPICK','SIZER','STICKY','EXPLAINER','PROFILE','HEATNOW','HEATENERGY','CLIMATE','RADAR'])
    if slug not in PROTECTED: return html
    # Run last: both DE and EN build loops may inject these more than once.
    html = strip(html, ['USSWITCH', 'USMARKET', 'USTOP', 'USSHELF', 'POPUP', 'DEMAND_MARKET', 'DEMAND_ASSETS'])
    if slug in FOCUSED or slug in MOISTURE_PATHS[en]:
        html = strip(html, ['MODELS', 'TOPPICK', 'QUICKPICK', 'SIZER'])
    if slug in WINDOW_DE | WINDOW_EN:
        html = strip(html, ['TOPPICK', 'SIZER', 'SEALFIT'])
        tool = seal_block(en)
    elif slug == 'heizluefter-stromverbrauch':
        html = strip(html, ['HEATCOST'])
        tool = heater_block()
    else: tool = ''
    notice = ('Shopping links in the article use Amazon.de (Germany) unless the link explicitly says otherwise. They keep the named model or accessory; your location does not change them. Check delivery to your address, exact variant and returns. The window tool offers a separate, optional US search.' if en else 'Kauflinks im Artikel führen zu Amazon.de (Deutschland), sofern nicht anders beschriftet. Modell und Zubehörart bleiben erhalten; dein Standort ändert die Links nicht. Liefergebiet, genaue Variante und Rückgabe prüfen. Im Fenster-Tool kannst du eine US-Suche ausdrücklich wählen.')
    if not (slug in WINDOW_DE | WINDOW_EN): notice = notice.split(' The window tool')[0].split(' Im Fenster-Tool')[0]
    block = '<!--EB_DEMAND_MARKET--><aside class="eb-demand-market"><strong>'+('Store and model check' if en else 'Shop und Modell prüfen')+'</strong><p>'+notice+'</p></aside><!--/EB_DEMAND_MARKET-->'
    article = re.search(r'<article\b[^>]*>', html)
    if not article: raise ValueError('Article missing: '+slug)
    # Before generated comparison cards, after the article opening.
    pos = article.end()
    html = html[:pos]+block+tool+html[pos:]
    assets = '<!--EB_DEMAND_ASSETS--><link rel="stylesheet" href="/assets/demand-tools.css"><script type="module" src="/assets/demand-tools.mjs"></script><!--/EB_DEMAND_ASSETS-->'
    return html.replace('</body>', assets+'</body>')
