"""Static buyer answer using the same reviewed model records as product cards."""
from html import escape


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
    for p in products:
        if p['category'] != category_id:
            continue
        rows.append(f'<tr><th scope="row"><a href="#produkt-{esc(p["id"])}">{esc(p["name"])}</a><br>{esc(p["variant"])}</th><td>{esc(p["role"])}<p>{esc(p["facts"])}</p></td><td>{esc(p["limit"])}</td><td><a href="{esc(p["source"])}">{esc(p["source_label"])}</a><br>Quellenstand: {esc(p["checked"])}</td></tr>')
    if guide:
        steps = ''.join(f'<li>{esc(step)}</li>' for step in guide['steps'])
        offers = render_vacuum_offers(products) if category_id == 'bodenstaubsauger' else ''
        return offers + f'''<section class="pc-comparison" aria-labelledby="entscheidung-{esc(category_id)}"><h3 id="entscheidung-{esc(category_id)}">{esc(guide['question'])}</h3><p>{esc(guide['answer'])}</p><ol>{steps}</ol><p>Vergleich nach dokumentierten Herstellerangaben, keine Rangliste und keine eigenen Gerätetests. Die genaue Variante und den Quellenstand vor der Auswahl beachten.</p><div class="pc-table-scroll" role="region" aria-label="Modelle nach Aufgabe vergleichen" tabindex="0"><table><caption>Genaue Variante, Aufgabe und Kaufgrenze im Vergleich</caption><thead><tr><th scope="col">Modell</th><th scope="col">Aufgabe und Herstellerangabe</th><th scope="col">Grenze</th><th scope="col">Quelle</th></tr></thead><tbody>{''.join(rows)}</tbody></table></div></section>'''
    return '''<section class="pc-comparison" aria-labelledby="airfryer-choice"><h3 id="airfryer-choice">Heißluftfritteuse: eine Schublade oder zwei Garzonen?</h3>
<p><strong>Die Aufgabe entscheidet:</strong> Für eine Speise oder zwei Durchgänge nacheinander genügt eine passend große Zone. Möchtest du zwei Speisen mit verschiedenen Temperaturen parallel planen, brauchst du zwei unabhängig geregelte Zonen. Zwei Programme oder ein Grillrost belegen diese Eigenschaft nicht.</p>
<p>Eine geteilte Schublade ist nicht dasselbe wie zwei herausziehbare Schubladen: Beim FlexDrawer AF550EU beschreibt der Hersteller zwei Zonen innerhalb einer Schublade mit entnehmbarer Trennwand. Beim EY9018 nennt Tefal zwei unterschiedlich große Schubladen. Prüfe die genaue Variante und nutzbare Fläche statt allein die Summe der Liter.</p>
<p><strong>Vor dem Kauf:</strong> Stellfläche, Öffnungsraum, vorgeschriebene Abstände, Reinigung und passende Menge anhand der Anleitung prüfen. Liter bestimmen keine verlässliche Portionenzahl. Wenn der vorhandene Backofen passt, ist ein Neukauf nicht nötig; aus Werbeprozenten folgt keine persönliche Stromersparnis.</p>
<p>Herstellervergleich für Deutschland, keine eigenen Gerätetests und keine Rangliste. Die unten genannten Modellquellen tragen Fakten und Grenzen; der Quellenstand bleibt je Modell sichtbar.</p>
<div class="pc-table-scroll" role="region" aria-label="Vier Heißluftfritteusen nach Aufgabe vergleichen" tabindex="0"><table><caption>Genaue Variante, Aufgabe und Kaufgrenze im Vergleich</caption><thead><tr><th scope="col">Modell</th><th scope="col">Aufgabe und Herstellerangabe</th><th scope="col">Grenze</th><th scope="col">Quelle</th></tr></thead><tbody>''' + ''.join(rows) + '</tbody></table></div></section>'
