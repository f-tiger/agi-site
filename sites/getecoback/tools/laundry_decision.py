"""Reusable evidence-first laundry calculator on two existing URLs."""
import re
import hashlib
from pathlib import Path
from html import escape
from urllib.parse import quote, urlencode
DE='/waeschetrockner-oder-luftentfeuchter.html'
EN='/en/guide/dehumidifier-drying-clothes-cost.html'
RESULT_GUIDE_ID='waesche-messung-naechster-schritt'
RESULT_GUIDE_TITLE='Was folgt aus den gemessenen Kosten fürs Wäschetrocknen?'
RESULT_GUIDE_SUMMARY='Vergleiche vollständige Durchgänge bis zur gleichen Endtrockenheit. Bei steigender Raumfeuchte oder muffigem Keller prüfe den Raum und die Feuchteursache vor einem Gerätekauf.'
ASSETS=Path(__file__).resolve().parents[1]/'site/assets'
ASSET_VERSION=hashlib.sha256(b''.join((ASSETS/name).read_bytes() for name in ['laundry-check.mjs','laundry-check.css'])).hexdigest()[:12]
SEASON_VERSION=hashlib.sha256((ASSETS/'laundry-season-ui.mjs').read_bytes()).hexdigest()[:12]
SOURCE='https://www.verbraucherzentrale.de/wissen/energie/strom-sparen/beim-kauf-eines-waeschetrockners-an-den-stromverbrauch-denken-37984'
METER_CHOICE = '<p>Noch kein geeignetes Messgerät? TDS hilft dir, <a href="https://thedollscout.com/de/ai-tools/dach-meter-fit#messgeraet-ausleihen-oder-kaufen" data-tds-laundry-referral="de">zwischen vorhandenem, geliehenem und neuem Strommessgerät zu wählen</a>. Prüfe dabei, welche Messung der Hersteller deines Geräts erlaubt.</p>'
SHARE_NOTE='<p class="lc-note" data-laundry-share-note>Für eine Diskussion reichen die kWh des ganzen Durchgangs, dein Arbeitspreis und die Angabe, ob Wäschemenge und Endtrockenheit vergleichbar waren. Fehlt eine Messung, teile die bekannte Zahl als Einzelwert. Der öffentliche Rechnerlink enthält keine Eingaben.</p>'

def washer_dryer_label():
 url = 'https://getecoback.com' + DE + '#waschtrockner-label'
 title = 'Waschtrockner-Energielabel richtig lesen und Trocknungsstrom messen'
 reddit = escape('https://www.reddit.com/submit?' + urlencode({'url':url, 'title':title}, quote_via=quote), quote=True)
 return f'''<section id="waschtrockner-label" class="lc-evidence" aria-labelledby="lc-waschtrockner-label-title">
<h3 id="lc-waschtrockner-label-title">Waschtrockner-Energielabel: Welche Zahl beschreibt das Trocknen?</h3>
<ol>
<li><strong>Eigene Messung.</strong> Verwende für deine Rechnung die kWh eines vollständigen, separat gemessenen Trocknungsgangs. Bei einem Kombigerät zuerst prüfen, ob die Anleitung ein eigenes Trocknungsprogramm für diese Wäschemenge vorsieht.</li>
<li><strong>Eigenständiger Wäschetrockner.</strong> Steht auf seinem Energielabel „kWh je 100 Trocknungen“, teile den Wert durch 100. Das ergibt den standardisierten Verbrauch pro Trocknung. Prüfe für deinen Vergleich auch Wäschemenge und Endtrockenheit.</li>
<li><strong>Waschtrockner mit zwei Labelspalten.</strong> Links steht der vollständige Zyklus aus Waschen und Trocknen, rechts der reine Waschzyklus. Die Energieangabe in jeder Spalte gilt für 100 Zyklen des jeweiligen Tests. Auch die zwei Füllmengen in kg gehören zu ihren jeweiligen Spalten.</li>
</ol>
<p><strong>Frei gewähltes Beispiel:</strong> Links stehen <strong>300 kWh je 100 kombinierte Zyklen</strong> und <strong>5 kg Nennkapazität</strong>, rechts <strong>50 kWh je 100 Waschzyklen</strong> und <strong>8 kg Nennkapazität</strong>. Geteilt durch 100 sind das <strong>3,0 kWh je kombiniertem Normzyklus</strong> und <strong>0,50 kWh je Wasch-Normzyklus</strong>. Beim Abziehen der beiden Zahlen verrechnest du unterschiedlich gewichtete Normzyklen und Beladungen. Ermittle den Trocknungsstrom mit einer eigenen Messung des vollständigen Trocknungsgangs.</p>
<p>Hast du im Beispiel die vollen <strong>8 kg</strong> gewaschen, prüfe in der Anleitung die zulässige Menge für das gewählte Trocknungsprogramm. Bei einer Grenze von <strong>5 kg</strong> teile die Wäsche vor dem Trocknen auf oder hänge einen Teil auf.</p>
<p>Quellen geprüft am <time datetime="2026-11-22">22.11.2026</time>. <a href="https://eur-lex.europa.eu/legal-content/DE/TXT/PDF/?uri=CELEX%3A02019R2014-20210501">EU-Verordnung 2019/2014 zum Energielabel, Anhang III B und Anhang IV</a> · <a href="https://www.verbraucherzentrale.de/wissen/energie/strom-sparen/waschtrockner-kombigeraete-sind-platzsparende-stromfresser-37060">Verbraucherzentrale zum Waschtrockner-Label</a>.</p>
<nav aria-label="Hinweis teilen"><a href="{url}">Direktlink zu diesem Abschnitt</a> · <a href="{reddit}" target="_blank" rel="noopener noreferrer">Auf Reddit teilen</a></nav>
</section>'''

def bosch_eco_load():
 url = 'https://getecoback.com' + DE + '#trockner-teilbeladung'
 title = 'Bosch WQG241031: Was kostet eine halbe Eco-Ladung?'
 reddit = escape('https://www.reddit.com/submit?' + urlencode({'url':url, 'title':title}, quote_via=quote), quote=True)
 return f'''<section id="trockner-teilbeladung" class="lc-evidence" aria-labelledby="lc-eco-load-title">
<h3 id="lc-eco-load-title">Bosch WQG241031: Wie viel Strom braucht eine halbe Eco-Ladung?</h3>
<p>Die deutsche Anleitung nennt bei 1.000 U/min Schleuderdrehzahl, 60 % Anfangsfeuchte und 0 % Endfeuchte diese Eco-Programmwerte.</p>
<ul>
<li><strong>9,0 kg:</strong> 1,93 kWh in 3:50 h.</li>
<li><strong>4,5 kg:</strong> 1,08 kWh in 2:12 h.</li>
</ul>
<p>Bei einem beispielhaften Arbeitspreis von 0,35 €/kWh sind das rund 0,68 € für die volle und 0,38 € für die halbe Ladung. Zwei gleich trockene halbe Ladungen mit zusammen 9 kg ergeben im Beispiel 2,16 kWh und rund 0,76 €.</p>
<p>Das Energielabel nennt 128 kWh je 100 Trocknungen. Die daraus berechneten 1,28 kWh pro Normzyklus dienen dem standardisierten Vergleich. Für deine Rechnung zählen die eigene Beladung, das Programm und die <a href="#lc-measurement">gemessenen kWh bis zur gleichen Endtrockenheit</a>. Beim Kauf die vollständige E-Nr. und die zugehörige Anleitung prüfen.</p>
<p>Geprüft am <time datetime="2026-11-23">23.11.2026</time>. <a href="https://media3.bsh-group.com/Documents/9001984619_B.pdf">Bosch-Anleitung WQG241031, Abschnitt 19, S. 38–39</a> · <a href="https://media3.bosch-home.com/Documents/energylabel/de-DE/WQG241031.pdf">Bosch EU-Energielabel für Deutschland</a>.</p>
<nav aria-label="Hinweis teilen"><a href="{url}">Direktlink zu diesem Abschnitt</a> · <a href="{reddit}" target="_blank" rel="noopener noreferrer">Auf Reddit teilen</a></nav>
</section>'''

def dehumidifier_laundry_cost():
 anchor = 'luftentfeuchter-waesche-kosten'
 url = 'https://getecoback.com' + DE + '#' + anchor
 title = 'Was kostet das Wäschetrocknen mit einem Luftentfeuchter?'
 reddit = escape('https://www.reddit.com/submit?' + urlencode({'url':url, 'title':title}, quote_via=quote), quote=True)
 version = hashlib.sha256(b''.join((ASSETS/name).read_bytes() for name in ['laundry-single.mjs','laundry-math.mjs'])).hexdigest()[:12]
 return f'''<section id="{anchor}" class="eb-laundry" aria-labelledby="lc-single-title">
<h3 id="lc-single-title">{title}</h3>
<p>Der Rechner zeigt den direkten Stromverbrauch und die Stromkosten für einen Durchgang mit deinem Luftentfeuchter. Nutze den kWh-Wert eines vollständigen Durchgangs oder schätze ihn aus der mittleren Leistung und der Laufzeit.</p>
<p><strong>Kein Platz für einen Trockner und nur 400 W im Datenblatt?</strong> Für eine Ladung brauchst du den Verbrauch bis zur gewünschten Trockenheit. Läuft das Gerät tatsächlich gleichmäßig mit 400 W, sind das 0,4 kWh pro Stunde. Weder die 400 W auf dem Typenschild noch eine Angabe in Litern pro Tag zeigen, wie lange es für deine Wäsche läuft oder wie viel Strom es dabei verbraucht.</p>
<p>Nutze den vorhandenen Wäscheständer weiter, wenn die Wäsche am geeigneten, gut lüftbaren Platz trocknet. Prüfe bei Innenraumtrocknung Luftfeuchte und Lüftung. Erst wenn du zusätzlich ein Gerät brauchst, <a href="/guide/waesche-trocknen-wohnung.html#eb-models">Stellplatz, Einsatzbedingungen und Modelle vergleichen</a>. <a href="https://www.umweltbundesamt.de/themen/gesundheit/umwelteinfluesse-auf-den-menschen/schimmel/wie-luefte-ich-richtig-tipps-tricks-zur">Umweltbundesamt zu Wäsche und Lüftung</a>.</p>
<ul>
<li><strong>Mit Strommessgerät:</strong> Ziehe den Startstand vom Endstand ab. Frei gewähltes Beispiel: 1,8 kWh × 0,35 €/kWh = 0,63 €.</li>
<li><strong>Mit mittlerer Leistung:</strong> Watt × Stunden ÷ 1.000 ergibt kWh. Schätzbeispiel: 200 W im Mittel × 6 Stunden ÷ 1.000 = 1,2 kWh. Bei 0,35 €/kWh sind das 0,42 €. Die Nennleistung auf dem Typenschild gibt den Durchschnitt über einen Durchgang nicht an.</li>
</ul>
<p>Raumheizung, Lüftungswärme und Anschaffung bleiben außen vor. Für einen Kostenvergleich brauchst du auch den Verbrauch des zweiten Verfahrens sowie eine vergleichbare Wäschemenge und Endtrockenheit.</p>
<form data-laundry-single hidden inert>
 <fieldset class="lc-fields" data-single-fields disabled>
  <legend>Deine Angaben je Durchgang</legend>
  <label>Berechnungsgrundlage
   <select name="method">
    <option value="measured">Gemessene kWh je Durchgang</option>
    <option value="estimate">Mittlere Watt × Stunden</option>
   </select>
  </label>
  <fieldset class="lc-fields" data-single-measured>
   <label>Gemessener Stromverbrauch (kWh)<input name="dehum" type="number" min="0" max="100" step="any" inputmode="decimal" required></label>
  </fieldset>
  <fieldset class="lc-fields" data-single-estimate hidden disabled>
   <div class="lc-grid">
    <label>Mittlere Leistung (W)<input name="watts" type="number" min="0" max="5000" step="any" inputmode="decimal" required></label>
    <label>Laufzeit (Stunden)<input name="hours" type="number" min="0" max="72" step="any" inputmode="decimal" required></label>
   </div>
  </fieldset>
  <label>Strompreis (€/kWh)<input name="price" type="number" min="0" max="5" step="any" inputmode="decimal" required></label>
  <button type="submit">Stromkosten pro Durchgang berechnen</button>
  <p class="lc-error" role="alert" data-single-error></p>
  <p class="lc-verdict" role="status" data-single-result></p>
  <button type="button" class="lc-secondary" data-single-copy hidden>Zusammenfassung mit meinen Werten kopieren</button>
  <p class="lc-status" role="status" data-single-copy-status hidden></p>
  <label data-single-copy-fallback hidden>Text zum Kopieren<textarea rows="6" readonly></textarea></label>
 </fieldset>
</form>
<p>Zur Messung kannst du ein geeignetes Strommessgerät zwischen Steckdose und Gerät stecken. <a href="https://www.verbraucherzentrale.de/wissen/energie/strom-sparen/strom-sparen-im-haushalt-einfache-tipps-10734">Hinweise der Verbraucherzentrale zum Strommessen</a>.</p>
<nav aria-label="Hinweis teilen"><a href="{url}">Direktlink zu diesem Abschnitt</a> · <a href="{reddit}" target="_blank" rel="noopener noreferrer">Auf Reddit teilen</a></nav>
</section><script type="module" src="/assets/laundry-single.mjs?v={version}"></script>'''

def dryness_check():
 url = 'https://getecoback.com' + DE + '#lc-endtrockenheit'
 title = 'Wäsche gleich trocken? So vergleichst du die Stromkosten fair'
 reddit = escape('https://www.reddit.com/submit?' + urlencode({'url':url, 'title':title}, quote_via=quote), quote=True)
 return f'''<section class="lc-evidence" aria-labelledby="lc-endtrockenheit">
<h3 id="lc-endtrockenheit">Sind beide Ladungen gleich trocken?</h3>
<ol>
<li>Nimm für beide Durchgänge dieselben geeigneten Textilien und dasselbe Schleuderprogramm. Wiege die Wäsche unmittelbar vor dem Trocknen. Bei deutlich unterschiedlichem Startgewicht wiederhole den Versuch oder bewerte die Durchgänge getrennt.</li>
<li>Wähle für beide dasselbe Ziel, etwa Wäsche zum Einräumen. Prüfe auch dicke Nähte und Taschen auf Restfeuchte. Wiege die Wäsche danach unter vergleichbaren Bedingungen mit derselben Waage. Ziehe das Gewicht des leeren Korbs ab.</li>
<li>Sind Gewicht oder Feuchtegefühl am Ende deutlich verschieden, notiere die kWh pro Durchgang getrennt. Lass im Kostenrechner die Bestätigung für gleichen Trocknungsgrad frei.</li>
</ol>
<p>Das Wiegen zu Hause ist eine grobe Kontrolle. Es liefert keine normgerechte Restfeuchte in Prozent. Auch die Raumluftfeuchte, die Wassermenge im Tank oder ein fester Timer zeigen nicht, ob die Wäsche gleich trocken ist.</p>
<p>Zur Methode: <a href="https://www.testfakta.com/de/test/testfaktas-test-of-tumble-dryers">Testfakta ermittelt die Restfeuchte durch Wiegen</a>. <a href="https://entfeuchter-test.de/luftentfeuchter-waesche-trocknen/">Entfeuchter Test misst Feuchteverlust nach drei Stunden</a> und leitet daraus keine Schranktrockenheit ab. Geprüft am <time datetime="2026-11-23">23.11.2026</time>.</p>
<nav aria-label="Messmethode teilen"><a href="{url}">Direktlink zu diesem Abschnitt</a> · <a href="{reddit}" target="_blank" rel="noopener noreferrer">Auf Reddit teilen</a></nav>
</section>'''

def decision_paths():
 return '''<div class="lc-evidence" id="waesche-entscheidung"><h3>Welche Situation passt zu dir?</h3><details><summary>Ich habe bereits einen Trockner</summary><p>Vergleiche zuerst einen vollständigen Durchgang deines vorhandenen Geräts. Ein neuer Entfeuchter muss zusätzlich angeschafft werden; ein niedriger Wattwert allein rechtfertigt den Kauf nicht. Das Rechenbeispiel unten zeigt, wie eine lange Laufzeit den Vorteil umkehren kann.</p><p>Wenn nur ein Teil der Ladungen wechselt, <a href="#waesche-saisonwechsel">Kosten und Anschaffung je Saison vergleichen</a>. Miss zuerst, wenn Wäschemenge, Trocknungsgrad oder Zusatzstrom noch offen sind.</p></details><details><summary>Ich habe wenig Platz und keinen Trockner</summary><p>Prüfe zuerst Platz für einen Wäscheständer, Luftaustausch und den gewünschten Trocknungszeitpunkt. Eine Wäscheleine braucht keinen direkten Gerätestrom; mögliche zusätzliche Heiz- und Lüftungsenergie ist damit nicht berechnet. Ein Entfeuchter ersetzt weder Luftaustausch noch Stellfläche für die Wäsche.</p><p><a href="/guide/waesche-trocknen-wohnung.html">Lüften und Trocknen in der Wohnung einordnen</a></p></details><details><summary>Die Wohnung ist auch ohne Wäsche dauerhaft feucht</summary><p>Ein günstiger Trocknungsdurchgang erklärt die Feuchteursache nicht. Beobachte, wann und wo Feuchte auftritt, und kläre mögliche bauliche Ursachen oder Leckagen mit der zuständigen Fachperson beziehungsweise Hausverwaltung. Nicht vorschnell ein größeres Gerät kaufen.</p><p><a href="/guide/luftfeuchtigkeit-senken.html">Feuchteursache und nächsten Schritt prüfen</a></p></details></div>'''
def result_guidance():
 return f'''<section class="lc-evidence" aria-labelledby="{RESULT_GUIDE_ID}">
<h3 id="{RESULT_GUIDE_ID}">{RESULT_GUIDE_TITLE}</h3>
<p>{RESULT_GUIDE_SUMMARY}</p>
<ul>
<li><strong>Nur geschätzt oder noch unterschiedlich trocken?</strong> Beide Durchgänge bis zur gleichen Endtrockenheit messen. Gleiche Wäschemenge und dasselbe Schleuderprogramm nutzen. <a href="#lc-endtrockenheit">Endtrockenheit der Wäsche vergleichen</a> · <a href="#lc-measurement">kWh je Durchgang messen</a>.</li>
<li><strong>Trocknet die Wäsche langsam, steigt die Raumfeuchte oder riecht der Keller muffig?</strong> Raumtemperatur und relative Feuchte vor, während und nach dem Trocknen notieren. Einen geeigneten, gut lüftbaren Ort prüfen. Bei muffigem Geruch oder feuchten Wänden zuerst die Feuchteursache klären. Warme, feuchte Außenluft kann im kühlen Keller an kalten Flächen kondensieren. <a href="/guide/luftentfeuchter-ratgeber.html#eb-moisture-choice">Raum und Feuchteursache prüfen</a> · <a href="/guide/luftentfeuchter-keller.html">Besonderheiten im kühlen Keller</a>.</li>
<li><strong>Haben beide gemessenen Durchgänge dieselbe Endtrockenheit erreicht?</strong> Erst prüfen, ob das vorhandene Gerät und der Platz ausreichen. Wenn eine Anschaffung nötig ist, beim <a href="/produkte.html#entscheidung-waeschetrockner">Trockner Aufstellort, Türöffnung und Ablauf</a> prüfen oder bei <a href="/guide/waesche-trocknen-wohnung.html#eb-models">Entfeuchtern die Einsatzgrenzen für Wäsche</a> nachlesen.</li>
</ul>
<p>Die Hinweise folgen den <a href="https://www.umweltbundesamt.de/themen/gesundheit/umwelteinfluesse-auf-den-menschen/schimmel/wie-luefte-ich-richtig-tipps-tricks-zur">Lüftungsempfehlungen des Umweltbundesamts</a>. Geprüft am <time datetime="2026-11-26">26.11.2026</time>.</p>
</section>'''

def season_switch():
 return f'''<section class="eb-laundry" id="waesche-saisonwechsel" data-lang="de" aria-labelledby="waesche-saisonwechsel-titel">
 <h2 id="waesche-saisonwechsel-titel">Nur einen Teil der Wäsche umstellen: Kosten pro Saison</h2>
 <p>Große oder eilige Ladungen bleiben oft im Trockner. Zähle alle Ladungen einer Saison und gib separat an, wie viele du wirklich ersetzen kannst. Vergleiche nur vollständige, gleich trockene Durchgänge mit gleicher Wäschemenge und Schleuderdrehzahl.</p>
 <p><strong>Frei gewähltes Beispiel:</strong> Wenn 60 von 100 Ladungen wechseln, bleiben 40 im Trockner. Bei 1,4 kWh im Trockner, 0,6 kWh mit Entfeuchter einschließlich Zusatzstrom und 0,35 €/kWh kosten alle Trocknerladungen 49,00 €. Der Mix kostet 32,20 €. Das sind 16,80 € Ersparnis pro Saison. Bei gleichbleibenden Werten sind sechs volle Saisons nötig, um die zusätzlichen Anschaffungskosten von 100 € zu decken.</p>
 <p>Für den Mix rechnest du verbleibende Trocknerladungen × Trockner-kWh plus ersetzte Ladungen × Entfeuchter-kWh. Multipliziere die Summe mit deinem Arbeitspreis. Ziehe die Mixkosten von den bisherigen Kosten ab.</p>
 <form data-laundry-season hidden inert aria-label="Trocknerwechsel pro Saison berechnen">
  <div class="lc-grid">
   <label>Alle Ladungen je Saison<input name="ladungen_saison" type="number" min="1" max="2000" step="1" inputmode="numeric" required></label>
   <label>Davon ersetzbare Ladungen<input name="ladungen_ersetzbar" type="number" min="0" max="2000" step="1" inputmode="numeric" required></label>
  </div>
  <fieldset class="lc-fields">
   <legend>Eigene Messwerte und Kosten für den Vergleich</legend>
   <div class="lc-grid">
    <label>Trockner je vollständiger Ladung (kWh)<input name="trockner_kwh" type="number" min="0" max="100" step="any" inputmode="decimal"></label>
    <label>Entfeuchter und Zusatzgeräte je Ladung (kWh)<input name="entfeuchter_kwh" type="number" min="0" max="100" step="any" inputmode="decimal"></label>
    <label>Arbeitspreis (€/kWh)<input name="tarif_eur_kwh" type="number" min="0" max="5" step="any" inputmode="decimal"></label>
    <label>Zusätzliche Anschaffung inkl. Zubehör (€)<input name="anschaffung_eur" type="number" min="0" max="50000" step="0.01" inputmode="decimal"></label>
   </div>
   <p class="lc-note">Gib für die Anschaffung 0 € ein, wenn du bereits alles hast.</p>
   <label class="lc-check"><input name="ladungen_vergleichbar" type="checkbox"> Beide vollständigen Durchgänge hatten gleiche Wäschemenge, Schleuderdrehzahl und Endtrockenheit.</label>
   <label class="lc-check"><input name="zusatzstrom_erfasst" type="checkbox"> Zusatzstrom, etwa für Ventilator oder elektrische Zusatzheizung, ist erfasst oder fällt nicht an.</label>
  </fieldset>
  <button type="submit">Saisonkosten berechnen</button>
  <p class="lc-verdict" role="status" data-season-result></p>
  <p data-season-compare hidden>Passt die errechnete Zeit zu deiner geplanten Nutzung und passen Lüftung und Stellfläche? Dann kannst du <a href="/guide/waesche-trocknen-wohnung.html#eb-models">Modelle und Kaufgrenzen für Wäsche vergleichen</a>.</p>
 </form>
 <p>Vor einem Kauf auch <a href="/guide/luftentfeuchter-ratgeber.html#eb-moisture-choice">Raumfeuchte, Lüftung und Platz prüfen</a>. Wenn die Anschaffung sich während deiner geplanten Nutzung rechnerisch nicht deckt oder du bereits alles hast, ist der Stromvergleich allein kein Grund für einen Neukauf. Nicht erfasste Heizwärme, Wartung, Lebensdauer und Tarifänderungen bleiben offen. Die Eingaben bleiben im Browser.</p>
</section><script type="module" src="/assets/laundry-season-ui.mjs?v={SEASON_VERSION}"></script>'''


def block(en=False):
 def t(de,en_text):return en_text if en else de
 def field(name,label,value,lo,hi):return f'<label>{label}<input name="{name}" type="number" value="{value}" min="{lo}" max="{hi}" step="any" required inputmode="decimal"></label>'
 def select(name,label,choices):return f'<label>{label}<select name="{name}">'+''.join(f'<option value="{v}">{s}</option>' for v,s in choices)+'</select></label>'
 tariff_note='<p class="lc-note">UK example: GBP 0.35/kWh means 35p/kWh. This is a fictional rate, not an Ofgem cap or your tariff. Divide the pence/kWh on your bill by 100. Other markets can change currency below; changing currency does not convert amounts. Standing charges are excluded.</p>' if en else ''
 intro=t('Kleine Wattzahl. Lange Laufzeit. Was kostet eine wirklich trockene Ladung?','Low watts. Long runtime. What does one equally dry load cost?')
 example=t('Beispiel laden: 250 W, 8 Stunden','Load example: 250 W, 8 hours')
 single_jump='' if en else '<p><a href="#luftentfeuchter-waesche-kosten">Nur die Stromkosten des Luftentfeuchters berechnen</a> · <a href="#lc-endtrockenheit">Gleiche Endtrockenheit prüfen</a> · <a href="#waesche-saisonwechsel">Teilweisen Wechsel je Saison berechnen</a></p>'
 season_next='' if en else '<p><a href="#waesche-saisonwechsel">Wenn nur ein Teil der Ladungen wechselt: Saisonkosten berechnen</a></p>'
 result_next='' if en else f'<p class="lc-note" data-laundry-result-next><span></span> <a href="#{RESULT_GUIDE_ID}">Nächsten Prüfschritt öffnen</a>.</p>'
 dryer_choices = [('cycle','load (kWh)'),('hundred','100 cycles (kWh)')] if en else [
  ('cycle','Gemessener Trocknungsgang · kWh je Ladung'),
  ('hundred','Eigenständiger Trockner · Label in kWh je 100 Trocknungen'),
  ('combined','Waschtrockner · EU-Label für Waschen oder Waschen und Trocknen'),
 ]
 dryer=field('dryer',t('Trockner: Verbrauch laut Messung oder Label','Dryer: meter reading or label value'),1.5,0,2000)+select('dryerBasis',t('Einheit der Trockner-Angabe','Dryer value is per'),dryer_choices)
 if not en:
  dryer+='<p class="lc-note" id="laundry-combined-warning" role="status" data-combined-warning hidden>Links steht der kombinierte Zyklus, rechts der Waschzyklus. Für einen Vergleich der Trocknungskosten miss den Trocknungsgang separat. <a href="#waschtrockner-label">Waschtrockner-Energielabel einordnen</a>.</p>'
 dehum=select('method',t('Entfeuchter: Berechnungsgrundlage','Dehumidifier: calculation method'),[('estimate',t('Mittlere Watt × Stunden schätzen','Estimate average watts × hours')),('measured',t('Gemessene kWh je Durchgang','Measured kWh per run'))])
 dehum+='<div data-estimate class="lc-grid">'+field('watts',t('Mittlere Leistung (W)','Average power (W)'),250,0,5000)+field('hours',t('Laufzeit je Durchgang (h)','Runtime per run (h)'),8,0,72)+'</div><div data-measured hidden>'+field('dehum',t('Gemessene Energie je Durchgang (kWh)','Metered energy per run (kWh)'),2,0,100)+'</div>'
 fallback = '<div class="lc-evidence" data-laundry-fallback><h3>'+t('Ohne Rechner weiterkommen','Continue without the calculator')+'</h3><p>'+t('Eigene Werte kannst du eingeben, sobald der Rechner geladen ist. Falls er nicht startet, helfen dir dieses Rechenbeispiel und die Mess-Checkliste unten.','You can enter your own values once the calculator loads. If it does not start, use this worked example and the measurement checklist below.')+'</p><p data-laundry-example>'+t('Frei gewähltes Beispiel, keine Produktmessung: 250 W × 8 h ÷ 1.000 = 2 kWh; bei 0,35 €/kWh sind das 0,70 €. Ein Trockner mit 1,5 kWh kostet 0,525 €. Gleiche Wäschemenge und gleichen Trocknungsgrad vorausgesetzt; Raumheizung und Lüftungswärme fehlen.','Fictional example, not a product measurement: 250 W × 8 h ÷ 1,000 = 2 kWh; at GBP 0.35/kWh that costs GBP 0.70. A dryer using 1.5 kWh costs GBP 0.525. This assumes the same load and final dryness; room heating and ventilation heat are excluded.')+'</p><a href="#lc-measurement">'+t('Eine Ladung fair messen: Checkliste','Measure one load fairly: checklist')+'</a></div>'
 return '<!--EB_LAUNDRY-->'+f'''<link rel="stylesheet" href="/assets/laundry-check.css?v={ASSET_VERSION}"><section class="eb-laundry" id="laundry-check" data-lang="{'en' if en else 'de'}" aria-labelledby="lc-title"><p class="lc-kicker">{t('Deine Wäsche. Deine Rechnung.','Your laundry. Your numbers.')}</p><h2 id="lc-title">{t('Trocknungskosten pro Ladung vergleichen','Compare drying cost per load')}</h2><p>{intro}</p>{single_jump}<p class="lc-note">{t('Vorbelegte Zahlen sind ein frei gewähltes Beispiel, keine Messung oder Tarifempfehlung.','Prefilled numbers are a fictional example, not a measurement or recommended tariff.')}</p>{tariff_note}{"" if en else decision_paths()}{fallback}<button type="button" class="lc-secondary" data-example disabled>{example}</button><form data-laundry hidden inert><fieldset class="lc-fields" data-laundry-fields disabled><legend class="lc-note">{t("Deine Angaben für den Kostenvergleich","Your cost comparison inputs")}</legend><div class="lc-grid"><fieldset><legend>1 · {t('Trockner','Tumble dryer')}</legend>{dryer}</fieldset><fieldset><legend>2 · {t('Entfeuchter','Dehumidifier')}</legend>{dehum}</fieldset></div><details><summary>{t('Strompreis, Nutzung und Kaufpreis anpassen','Adjust tariff, usage and purchase cost')}</summary><div class="lc-grid">{field('price',t('Strompreis je kWh','Electricity unit price per kWh'),.35,0,5)}{select('currency',t('Währung · keine Umrechnung','Currency · no conversion'),([('GBP','GBP'),('EUR','EUR'),('USD','USD')] if en else [('EUR','EUR'),('GBP','GBP'),('USD','USD')]))}{field('loads',t('Ladungen pro Woche','Loads per week'),3,0,30)}{field('purchase',t('Zusätzlicher Kaufpreis Entfeuchter','Extra upfront cost for dehumidifier'),0,0,50000)}</div></details><label class="lc-confirm"><input name="comparable" type="checkbox">{t('Gleiche Wäschemenge und gleicher Trocknungsgrad; die Annahmen passen zu beiden Verfahren.','Same laundry amount and final dryness; these assumptions fit both methods.')}</label><button type="submit">{t('Meine Kosten vergleichen','Compare my costs')}</button><p class="lc-error" role="alert" data-error></p></fieldset></form><div class="lc-results" data-results hidden tabindex="-1" aria-labelledby="lc-result-title"><p class="lc-kicker" data-provenance></p><h3 id="lc-result-title">{t('Direkte Stromkosten je Ladung','Direct electricity cost per load')}</h3><div class="lc-bars"><div><span>{t('Trockner','Dryer')}</span><span class="lc-track"><i class="lc-bar" data-bar="dryer"></i></span><strong data-cost="dryer"></strong></div><div><span>{t('Entfeuchter','Dehumidifier')}</span><span class="lc-track"><i class="lc-bar" data-bar="dehum"></i></span><strong data-cost="dehum"></strong></div></div><p class="lc-verdict" data-verdict></p><p data-annual></p><p data-breakeven></p><p data-payback></p><p class="lc-detail" data-formula></p>{result_next}<p class="lc-note">{t('Raumheizung, Lüftungswärme, Reparaturen und Zeit fehlen. Ein trockener Raum beweist keine gleich trockene Wäsche.','Room heating, ventilation heat, repairs and your time are excluded. A dry room does not prove equally dry clothes.')}</p><button type="button" data-card>{t('Ergebniskarte als PNG','Download result card (PNG)')}</button><button type="button" class="lc-secondary" data-csv>{t('Rechenblatt als CSV','Download calculation (CSV)')}</button><p class="lc-status" role="status" data-export-status></p>{season_next}</div>{"" if en else result_guidance() + washer_dryer_label() + bosch_eco_load()}<details id="lc-measurement"{t(" open", "")}><summary>{t('Eine Ladung fair messen: Checkliste','Measure one load fairly: checklist')}</summary><ol><li>{t('Vergleiche Wäsche mit gleicher Masse, Schleuderdrehzahl und gewünschter Restfeuchte.','Use the same laundry mass, spin speed and desired final dryness.')}</li><li>{t('Notiere Start- und Endstand eines passenden Strommessgeräts sowie die Laufzeit. Beachte Anleitung und elektrische Belastbarkeit.','Record start/end energy readings and runtime using a suitable meter. Follow its instructions and electrical rating.')}</li><li>{t('Nutze die kWh-Differenz des ganzen Durchgangs. Typenschild-Watt ist keine gemessene mittlere Leistung.','Use the kWh difference for the whole run. Rated watts are not measured average power.')}</li><li>{t('Beim Label eines eigenständigen Trockners für 100 Trocknungen: durch 100 teilen. Das Labelprogramm kann von deiner eigenen Nutzung abweichen.','For a label per 100 cycles, divide by 100. Its test programme may differ from your actual use.')}</li></ol>{"" if en else METER_CHOICE + dryness_check()}</details>{"" if en else SHARE_NOTE}<div class="lc-evidence"><p><strong>{t('Was hier belegt ist','What is supported here')}</strong><br>{t('Rechenweg: kWh × Strompreis. Vergleichsdaten: deine Eingaben. Geräteleistung: hier nicht getestet.','Method: kWh × unit price. Comparison data: your inputs. Device performance: not tested here.')}</p><p><a href="{SOURCE}">{t('Verbraucherzentrale: Label je 100 Trocknungen','Verbraucherzentrale: label per 100 drying cycles')}</a> · {t('geprüft 01.10.2026','checked 1 October 2026')}</p></div><p><a data-laundry-next href="{'/en/guide/12l-vs-20l-dehumidifier-uk.html#purchase-checklist' if en else '/guide/luftentfeuchter-ratgeber.html#eb-moisture-choice'}">{t('Danach prüfen: Brauche ich ein Gerät?','Next: check UK models and buying conditions')}</a></p><button type="button" class="lc-secondary" data-share disabled>{t('Rechnerlink kopieren','Copy calculator link')}</button><p class="lc-share-url" data-share-url></p><p class="lc-note">{t('Kein Konto. Eingaben bleiben im Browser. Downloads und der ausdrücklich gewählte Szenario-Link können deine Zahlen enthalten. Der öffentliche Rechnerlink enthält sie nicht. Anonyme Ereignisse zählen Nutzung, keine Messwerte.','No account. Inputs stay in your browser. Downloads contain your numbers; the shared link does not. Anonymous events count actions, not meter readings.')}</p></section><script type="module" src="/assets/laundry-check.mjs?v={ASSET_VERSION}"></script>{"" if en else dehumidifier_laundry_cost() + season_switch()}<!--/EB_LAUNDRY-->'''
def inject(html,slug,en=False):
 if (en and slug=='dehumidifier-drying-clothes-cost') or (not en and slug=='waeschetrockner-oder-luftentfeuchter'):
  if '<!--EB_LAUNDRY-->' in html:return re.sub(r'<!--EB_LAUNDRY-->.*?<!--/EB_LAUNDRY-->',lambda _:block(en),html,flags=re.S)
  if not en:return re.sub(r'<section class="work-panel" aria-labelledby="calculator">.*?</section>',lambda _:block(False),html,count=1,flags=re.S).replace('href="#calculator"','href="#laundry-check"')
  if '<!--EB_BUYER-->' in html:return html.replace('<!--EB_BUYER-->',block(True)+'\n<!--EB_BUYER-->',1)
  return html.replace('<h2',block(True)+'\n<h2',1)
 return html
