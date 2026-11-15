"""Static buyer answer using the same reviewed model records as product cards."""
from html import escape


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
        return f'''<section class="pc-comparison" aria-labelledby="entscheidung-{esc(category_id)}"><h3 id="entscheidung-{esc(category_id)}">{esc(guide['question'])}</h3><p>{esc(guide['answer'])}</p><ol>{steps}</ol><p>Vergleich nach dokumentierten Herstellerangaben, keine Rangliste und keine eigenen Gerätetests. Die genaue Variante und den Quellenstand vor der Auswahl beachten.</p><div class="pc-table-scroll" role="region" aria-label="Modelle nach Aufgabe vergleichen" tabindex="0"><table><caption>Genaue Variante, Aufgabe und Kaufgrenze im Vergleich</caption><thead><tr><th scope="col">Modell</th><th scope="col">Aufgabe und Herstellerangabe</th><th scope="col">Grenze</th><th scope="col">Quelle</th></tr></thead><tbody>{''.join(rows)}</tbody></table></div></section>'''
    return '''<section class="pc-comparison" aria-labelledby="airfryer-choice"><h3 id="airfryer-choice">Heißluftfritteuse: eine Schublade oder zwei Garzonen?</h3>
<p><strong>Die Aufgabe entscheidet:</strong> Für eine Speise oder zwei Durchgänge nacheinander genügt eine passend große Zone. Möchtest du zwei Speisen mit verschiedenen Temperaturen parallel planen, brauchst du zwei unabhängig geregelte Zonen. Zwei Programme oder ein Grillrost belegen diese Eigenschaft nicht.</p>
<p>Eine geteilte Schublade ist nicht dasselbe wie zwei herausziehbare Schubladen: Beim FlexDrawer AF550EU beschreibt der Hersteller zwei Zonen innerhalb einer Schublade mit entnehmbarer Trennwand. Beim EY9018 nennt Tefal zwei unterschiedlich große Schubladen. Prüfe die genaue Variante und nutzbare Fläche statt allein die Summe der Liter.</p>
<p><strong>Vor dem Kauf:</strong> Stellfläche, Öffnungsraum, vorgeschriebene Abstände, Reinigung und passende Menge anhand der Anleitung prüfen. Liter bestimmen keine verlässliche Portionenzahl. Wenn der vorhandene Backofen passt, ist ein Neukauf nicht nötig; aus Werbeprozenten folgt keine persönliche Stromersparnis.</p>
<p>Herstellervergleich für Deutschland, keine eigenen Gerätetests und keine Rangliste. Die unten genannten Modellquellen tragen Fakten und Grenzen; der Quellenstand bleibt je Modell sichtbar.</p>
<div class="pc-table-scroll" role="region" aria-label="Vier Heißluftfritteusen nach Aufgabe vergleichen" tabindex="0"><table><caption>Genaue Variante, Aufgabe und Kaufgrenze im Vergleich</caption><thead><tr><th scope="col">Modell</th><th scope="col">Aufgabe und Herstellerangabe</th><th scope="col">Grenze</th><th scope="col">Quelle</th></tr></thead><tbody>''' + ''.join(rows) + '</tbody></table></div></section>'
