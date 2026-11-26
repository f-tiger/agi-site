"""Static buyer answer using the same reviewed model records as product cards."""
from html import escape


BOSCH_WTH_DRAIN_ID = 'bosch-wth83v03-kondensatablauf'
BOSCH_WTH_DRAIN_TITLE = 'Bosch WTH83V03: Muss ich den Behälter leeren oder passt ein Ablaufschlauch?'
BOSCH_WTH_DRAIN_ANSWER = (
    'Du kannst den Kondenswasserbehälter nutzen und regelmäßig leeren. Dafür brauchst du keinen Ablaufschlauch. '
    'Für einen direkten Ablauf nennt Bosch den Wasserablaufschlauch WTZ1110 als optionales Zubehör zum WTH83V03.'
)
BOSCH_DRAIN_LINK = f'<a href="#{BOSCH_WTH_DRAIN_ID}">Lieferumfang und Kondensatablauf mit WTZ1110 prüfen</a>'
BOSCH_DRAIN_GUIDE = f'''<section class="pc-method" aria-labelledby="{BOSCH_WTH_DRAIN_ID}">
<h3 id="{BOSCH_WTH_DRAIN_ID}">{BOSCH_WTH_DRAIN_TITLE}</h3>
<p>{BOSCH_WTH_DRAIN_ANSWER}</p>
<p><strong>Was liegt bei?</strong> Die deutsche <a href="https://www.bosch-home.com/de/de/product/WTH83V03">Bosch-Produktseite WTH83V03</a> führt „Ablauf-Schlauch für Kondenswasser“ mit „Nein“. Die <a href="https://media3.bsh-group.com/Documents/9001752575_A.pdf#page=13">Lieferliste der Anleitung, Seite 13</a> nennt den Wäschetrockner und die Begleitunterlagen. Prüfe den Inhalt deines konkreten Angebots, bevor du Zubehör zusätzlich bestellst.</p>
<p><strong>Was passt zum Ablauf?</strong> Die <a href="https://media3.bsh-group.com/Documents/9001752575_A.pdf#page=24">Zubehörliste der Anleitung, Seite 24</a> führt den <a href="https://www.bosch-home.com/de/de/product/waschen-trocknen/zubehoer-trockner/WTZ1110">Bosch-Ablaufschlauch WTZ1110</a> für überschüssiges Kondenswasser. Der dort separat gelistete Y-Verteiler 15000490 ist für ein zweites Gerät am selben Siphonanschluss vorgesehen. Prüfe, ob am Aufstellort ein geeigneter Ablauf vorhanden ist.</p>
<p>Vergleiche die vollständige E-Nr. am Typenschild, einschließlich der Ziffern nach dem Schrägstrich, mit der zugehörigen Anleitung. Der <a href="https://www.bosch-home.com/de/de/productservice/WTH83V03-01">Bosch-Serviceeintrag WTH83V03/01</a> gilt für diese Ausführung. Sind Modellendung oder Anschluss unklar, kläre sie vor einer Bestellung.</p>
<p>Quellen für Deutschland geprüft am <time datetime="2026-11-26">26.11.2026</time>. <a href="#produkt-bosch-wth83v03">Zur Modellkarte Bosch WTH83V03</a>.</p>
</section>'''

BOSCH_WQG_CARE_ID = 'bosch-wqg235d00-filterpflege'
BOSCH_WQG_CARE_TITLE = 'Bosch WQG235D00: Muss ich trotz selbstreinigendem Kondensator das Flusensieb reinigen?'
BOSCH_WQG_CARE_ANSWER = (
    'Ja. Beim WQG235D00 spült die Selbstreinigung den Wärmetauscher. Das zweiteilige Flusensieb '
    'reinigst du nach jedem beendeten Trockenprogramm selbst. Erscheint der Filterhinweis schon '
    'während des Trocknens, warte mit der Reinigung bis zum Programmende.'
)
BOSCH_WQG_CARE_LINK = f'<a href="#{BOSCH_WQG_CARE_ID}">Selbstreinigung und Pflege des zweiteiligen Flusensiebs prüfen</a>'
BOSCH_WQG_CARE_GUIDE = f'''<section class="pc-method" aria-labelledby="{BOSCH_WQG_CARE_ID}">
<h3 id="{BOSCH_WQG_CARE_ID}">{BOSCH_WQG_CARE_TITLE}</h3>
<p>{BOSCH_WQG_CARE_ANSWER}</p>
<p>Die <a href="https://www.bosch-home.com/de/de/product/waschen-trocknen/waeschetrockner/waermepumpentrockner/WQG235D00">deutsche Bosch-Produktseite zum WQG235D00</a> nennt einen selbstreinigenden Kondensator. <a href="https://media3.bosch-home.com/Documents/9001984679_B.pdf#page=15">Seite 15 der Anleitung</a> erklärt, welchen Teil das Gerät automatisch spült.</p>
<p>Nimm die beiden Siebteile nach Programmende nacheinander heraus. Öffne beide und entsorge die Flusen im Hausmüll. Reinige beide Siebe mit warmem fließendem Wasser und trockne sie vor dem Zusammensetzen und Wiedereinsetzen ab. Folge der <a href="https://media3.bosch-home.com/Documents/9001984679_B.pdf#page=23">bebilderten Anleitung in Abschnitt 11.10, Seite 23</a>. <a href="https://media3.bosch-home.com/Documents/9001984679_B.pdf#page=24">Seite 24</a> erklärt, wie du das aufgefangene Reinigungswasser filterst und die beiden Siebe wieder einsetzt.</p>
<p>Der Filter im Kondenswasserbehälter ist ein separates Bauteil. Prüfe diesen Filter regelmäßig und reinige ihn bei Verschmutzung nach Anleitung. Wenn dein vorhandener Trockner für deine Wäsche ausreicht, kannst du ihn weiter nutzen. Nutze bei einer anderen E-Nr. die Anleitung deines Geräts.</p>
<p>Quellen für Deutschland geprüft am <time datetime="2026-11-26">26.11.2026</time>. <a href="#produkt-bosch-wqg235d00">Zur Modellkarte Bosch WQG235D00</a>.</p>
</section>'''

BOSCH_DRYER_NOTES = {
    'bosch-wth83v03': (BOSCH_DRAIN_LINK, BOSCH_DRAIN_GUIDE),
    'bosch-wqg235d00': (BOSCH_WQG_CARE_LINK, BOSCH_WQG_CARE_GUIDE),
}


def render_vacuum_offers(products):
    models = []
    for product in products:
        if product['category'] != 'bodenstaubsauger' or 'offer' not in product:
            continue
        offer = product['offer']
        sources = f'<a href="{escape(product["source"])}">{escape(product["source_label"])}</a>'
        if 'source' in offer:
            sources += f' · <a href="{escape(offer["source"])}">Bosch-Datenblatt für Deutschland</a>'
        models.append(
            f'<li><p><strong><a href="#produkt-{escape(product["id"])}">{escape(product["variant"])}</a></strong> · '
            f'{escape(offer["nozzle"])} Beutel: {escape(offer["bag"])}'
            f'</p><p>{escape(offer["caveat"])}</p><p class="pc-source">{sources} · '
            f'geprüft am <time datetime="{escape(product["checked"])}">{escape(product["checked"])}</time>.</p></li>'
        )
    fields = []
    for prefix, label in (('s1', 'Guard S1'), ('m1', 'Guard M1 Parquet Flex')):
        inputs = []
        for key, field_label in (('geraet', 'Gerätepreis'), ('extras', 'Fehlendes Zubehör, Beutel und Versand zusammen')):
            name = prefix + '_' + key
            inputs.append(f'<label for="vacuum-{name}">{field_label} (€)'
                          f'<input id="vacuum-{name}" name="{name}" type="number" inputmode="decimal" '
                          'min="0" max="100000" step="0.01" required></label>')
        fields.append(f'<fieldset><legend>{label}</legend>{"".join(inputs)}</fieldset>')
    return f'''<section class="pc-tool pc-vacuum-offers" aria-labelledby="beutelstaubsauger-angebote">
<h3 id="beutelstaubsauger-angebote">Beutelstaubsauger im Angebot: Was kosten S1 und M1 mit dem Zubehör für meinen Boden?</h3>
<p>Gleiche zuerst die Modellnummer und den Lieferumfang mit dem Angebot ab. Liegt die benötigte Düse bei? Welche Beutel passen? Familienname und Produktfoto reichen für diese Entscheidung allein nicht aus.</p>
<ul>{''.join(models)}</ul>
<p>Für den Preisvergleich der zwei Miele-Angebote gilt: <strong>Gesamtpreis = Gerätepreis + Zusatzkosten.</strong> Addiere als Zusatzkosten die tatsächlich benötigte, fehlende Düse, passende Beutel für denselben selbst gewählten Zeitraum und den Versand. Bereits enthaltenes Zubehör wird nicht nochmals berechnet. Trage ausdrücklich 0 ein, wenn nichts hinzukommt. Ist ein Betrag offen, kläre ihn vor dem Vergleich.</p>
<p><strong>Fiktives Rechenbeispiel:</strong> Beim S1 ergeben 200 € + 40 € insgesamt 240 €. Beim M1 ergeben 230 € + 15 € insgesamt 245 €. Mit diesen angenommenen Beträgen kostet das S1-Angebot 5 € weniger. Die Rechnung bewertet weder Reinigungsleistung noch Lebensdauer.</p>
<form data-vacuum-offer-form hidden>{''.join(fields)}
<button type="submit">Meine beiden Gesamtpreise vergleichen</button>
<output data-vacuum-offer-result aria-live="polite"></output></form></section>'''


def render_comparison(category_id, products, guide=None):
    if category_id != 'heissluftfritteusen' and not guide:
        return ''
    esc = lambda value: escape(str(value), quote=True)
    rows = []
    model_notes = []
    for p in products:
        if p['category'] != category_id:
            continue
        limit = esc(p['limit'])
        if note := BOSCH_DRYER_NOTES.get(p['id']):
            link, section = note
            limit += f'<p>{link}</p>'
            model_notes.append(section)
        rows.append(f'<tr><th scope="row"><a href="#produkt-{esc(p["id"])}">{esc(p["name"])}</a><br>{esc(p["variant"])}</th><td>{esc(p["role"])}<p>{esc(p["facts"])}</p></td><td>{limit}</td><td><a href="{esc(p["source"])}">{esc(p["source_label"])}</a><br>Quellenstand: {esc(p["checked"])}</td></tr>')
    if guide:
        steps = ''.join(f'<li>{esc(step)}</li>' for step in guide['steps'])
        offers = render_vacuum_offers(products) if category_id == 'bodenstaubsauger' else ''
        return offers + f'''<section class="pc-comparison" aria-labelledby="entscheidung-{esc(category_id)}"><h3 id="entscheidung-{esc(category_id)}">{esc(guide['question'])}</h3><p>{esc(guide['answer'])}</p><ol>{steps}</ol><p>Vergleich nach dokumentierten Herstellerangaben, keine Rangliste und keine eigenen Gerätetests. Die genaue Variante und den Quellenstand vor der Auswahl beachten.</p><div class="pc-table-scroll" role="region" aria-label="Modelle nach Aufgabe vergleichen" tabindex="0"><table><caption>Genaue Variante, Aufgabe und Kaufgrenze im Vergleich</caption><thead><tr><th scope="col">Modell</th><th scope="col">Aufgabe und Herstellerangabe</th><th scope="col">Grenze</th><th scope="col">Quelle</th></tr></thead><tbody>{''.join(rows)}</tbody></table></div></section>{''.join(model_notes)}'''
    return '''<section class="pc-comparison" aria-labelledby="airfryer-choice"><h3 id="airfryer-choice">Heißluftfritteuse: eine Schublade oder zwei Garzonen?</h3>
<p><strong>Die Aufgabe entscheidet:</strong> Für eine Speise oder zwei Durchgänge nacheinander genügt eine passend große Zone. Möchtest du zwei Speisen mit verschiedenen Temperaturen parallel planen, brauchst du zwei unabhängig geregelte Zonen. Zwei Programme oder ein Grillrost belegen diese Eigenschaft nicht.</p>
<p>Eine geteilte Schublade ist nicht dasselbe wie zwei herausziehbare Schubladen: Beim FlexDrawer AF550EU beschreibt der Hersteller zwei Zonen innerhalb einer Schublade mit entnehmbarer Trennwand. Beim EY9018 nennt Tefal zwei unterschiedlich große Schubladen. Prüfe die genaue Variante und nutzbare Fläche statt allein die Summe der Liter.</p>
<p><strong>Vor dem Kauf:</strong> Stellfläche, Öffnungsraum, vorgeschriebene Abstände, Reinigung und passende Menge anhand der Anleitung prüfen. Liter bestimmen keine verlässliche Portionenzahl. Wenn der vorhandene Backofen passt, ist ein Neukauf nicht nötig; aus Werbeprozenten folgt keine persönliche Stromersparnis.</p>
<p>Herstellervergleich für Deutschland, keine eigenen Gerätetests und keine Rangliste. Die unten genannten Modellquellen tragen Fakten und Grenzen; der Quellenstand bleibt je Modell sichtbar.</p>
<div class="pc-table-scroll" role="region" aria-label="Vier Heißluftfritteusen nach Aufgabe vergleichen" tabindex="0"><table><caption>Genaue Variante, Aufgabe und Kaufgrenze im Vergleich</caption><thead><tr><th scope="col">Modell</th><th scope="col">Aufgabe und Herstellerangabe</th><th scope="col">Grenze</th><th scope="col">Quelle</th></tr></thead><tbody>''' + ''.join(rows) + '</tbody></table></div></section>'
