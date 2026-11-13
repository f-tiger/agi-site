"""Small local decision tools for the reviewed household product categories.

Examples are illustrative inputs, not product measurements or manufacturer advice.
The shared page owns tracking; no input is placed in a URL or a request.
"""
from html import escape

TOOLS = {
    'luftreiniger': {
        'title': 'Raumvolumen und geplanten Luftdurchsatz berechnen',
        'intro': 'Plane einen Luftdurchsatz aus Raummaßen und einer selbst gewählten Zahl von Luftwechseln. Das ist keine Gesundheits- oder Kaufempfehlung.',
        'method': 'Raumvolumen = Länge × Breite × Höhe; geplanter Luftdurchsatz = Raumvolumen × Luftwechsel pro Stunde.',
        'example': 'Fiktives Beispiel: 4 × 5 × 2,5 m ergeben 50 m³; bei selbst gewählten 3 Luftwechseln/h sind es 150 m³/h. Drei ist hier eine Rechenannahme, kein allgemeiner Sollwert.',
        'limit': 'Hersteller-CADR, Filterzustand, Luftführung und Messbedingungen separat prüfen. Das Ergebnis bestätigt keine Eignung eines der Geräte.',
        'fields': [('length', 'Raumlänge (m)', '4', '.1', '100', '.1'), ('width', 'Raumbreite (m)', '5', '.1', '100', '.1'), ('height', 'Raumhöhe (m)', '2.5', '.1', '10', '.1'), ('changes', 'Selbst geplante Luftwechsel pro Stunde', '3', '.1', '20', '.1')],
    },
    'hygrometer': {
        'title': 'Zwei Feuchteanzeigen am selben Ort vergleichen',
        'intro': 'Notiere zwei gleichzeitig abgelesene Werte nach einer gemeinsamen Angleichzeit am gleichen Ort.',
        'method': 'Anzeigedifferenz = Betrag von Messwert A minus Messwert B, in Prozentpunkten.',
        'example': 'Fiktives Beispiel: 48 % und 52 % relative Feuchte unterscheiden sich um 4 Prozentpunkte.',
        'limit': 'Die Differenz zeigt nicht, welches Gerät richtig misst. Sie ist keine Kalibrierung und keine Prüfung der Feuchte an kalten Bauteilen. Genauigkeit und Angleichzeit der Anleitungen beachten.',
        'fields': [('readingA', 'Anzeige A (% relative Feuchte)', '48', '0', '100', '.1'), ('readingB', 'Anzeige B (% relative Feuchte)', '52', '0', '100', '.1')],
    },
    'dampfreiniger': {
        'title': 'Oberflächenfreigabe vor dem Dampfreinigen prüfen',
        'intro': 'Prüfe die Pflegefreigabe der konkreten Oberfläche und die Anleitung des konkreten Geräts.',
        'method': 'Nur eine ausdrückliche Dampffreigabe und geklärte Wärme-/Feuchteempfindlichkeit erlauben eine weitere Prüfung nach Anleitung. Fehlende Angaben sind keine Freigabe.',
        'example': 'Fiktives Beispiel: Für einen unbekannten Bodenbelag liegt keine Freigabe vor. Ergebnis: erst Pflegehinweise klären, keinen Dampfeinsatz daraus ableiten.',
        'limit': 'Der Check bewertet nur deine Angaben. Er prüft weder Material, Versiegelung noch Gerät und ersetzt keinen vorgeschriebenen Test an unauffälliger Stelle.',
        'selects': [('approval', 'Dampf laut Oberflächen-Pflegeanleitung ausdrücklich erlaubt?', [('yes', 'Ja, ausdrücklich erlaubt'), ('no', 'Nein'), ('unknown', 'Nicht geklärt')]), ('sensitive', 'Wärme- oder feuchteempfindliche Schicht ungeklärt/vorhanden?', [('no', 'Laut Pflegehinweisen ausgeschlossen'), ('yes', 'Ja'), ('unknown', 'Nicht geklärt')])],
    },
    'fenstersauger': {
        'title': 'Die zu reinigende Glasfläche planen',
        'intro': 'Berechne die Glasfläche gleich großer Scheiben. Für unterschiedliche Größen getrennte Rechnungen verwenden.',
        'method': 'Glasfläche = Scheibenbreite × Scheibenhöhe × Scheibenzahl × zu reinigende Seiten.',
        'example': 'Fiktives Beispiel: 0,8 × 1,2 m, sechs Scheiben und zwei Seiten ergeben 11,52 m² Glasfläche.',
        'limit': 'Rahmen, Sprossen und unzugängliche Seiten separat prüfen. Aus der Fläche folgen weder Akkulaufzeit noch Reinigungstempo oder eine sichere Arbeitshöhe.',
        'fields': [('width', 'Glasbreite einer Scheibe (m)', '.8', '.01', '20', '.01'), ('height', 'Glashöhe einer Scheibe (m)', '1.2', '.01', '20', '.01'), ('panes', 'Anzahl gleich großer Scheiben', '6', '1', '1000', '1'), ('sides', 'Zu reinigende Seiten je Scheibe', '2', '1', '2', '1')],
    },
    'nass-trockensauger': {
        'title': 'Saugaufgabe und Filtervorgaben vorprüfen',
        'intro': 'Wähle das tatsächlich aufzunehmende Material. Eine Bezeichnung als Nass-/Trockensauger ist keine Freigabe für jede Flüssigkeit oder Staubart.',
        'method': 'Aufgabe bestimmen → genaue Gerätefreigabe → Filter-/Beutelvorgaben und Entleerung in der Anleitung prüfen. Gefahrstoffe nicht als gewöhnlichen Schmutz behandeln.',
        'example': 'Fiktives Beispiel: Nach einem verschütteten Glas Wasser ist eine Prüfung der Flüssigkeitsfreigabe und Filterkonfiguration nötig; ein unbekanntes Lösungsmittel ist kein solcher Wasserfall.',
        'limit': 'Keine Staubklasse, Explosionsfreigabe oder Gefahrstoff-Eignung wird bestätigt. Für eine Werkzeugsteckdose zusätzlich die zulässige Anschlussleistung prüfen.',
        'selects': [('material', 'Was soll aufgenommen werden?', [('dry', 'Gewöhnlicher, ungefährlicher trockener Haushaltsschmutz'), ('water', 'Sauberes Wasser ohne Zusätze'), ('hazard', 'Gefährlicher/unbekannter Feinstaub'), ('flammable', 'Brennbare Flüssigkeit oder Lösungsmittel'), ('unknown', 'Material nicht sicher bekannt')])],
    },
    'bodenstaubsauger': {
        'title': 'Beutel- und Filterkosten pro Jahr planen',
        'intro': 'Trage die von dir ermittelten Preise und deinen eigenen Wechselbedarf ein. Die Vorgaben des konkreten Geräts gehen vor.',
        'method': 'Jahreskosten = Packungspreis ÷ Beutel pro Packung × Beutel pro Jahr + Filterpreis × Filterwechsel pro Jahr.',
        'example': 'Fiktives Beispiel: 20 € für vier Beutel, acht Beutel/Jahr und ein 15-€-Filter/Jahr ergeben 55 €/Jahr und 165 € für drei gleich angenommene Jahre.',
        'limit': 'Kein Produktpreisvergleich. Anschaffung, Strom und weitere Teile fehlen. Verbrauch und Preise können sich ändern; die Rechnung legt kein Wartungsintervall fest.',
        'fields': [('bagPackPrice', 'Preis einer Beutelpackung (€)', '20', '0', '10000', '.01'), ('bagsPerPack', 'Beutel pro Packung', '4', '1', '1000', '1'), ('bagsPerYear', 'Eigener Beutelbedarf pro Jahr', '8', '0', '1000', '1'), ('filterPrice', 'Preis pro Filterwechsel (€)', '15', '0', '10000', '.01'), ('filterChanges', 'Geplante Filterwechsel pro Jahr', '1', '0', '100', '.1')],
    },
    'wasserkocher': {
        'title': 'Wasserbedarf für deine Tassen planen',
        'intro': 'Plane die tatsächlich benötigte Wassermenge, bevor du ein Kannenvolumen vergleichst.',
        'method': 'Benötigtes Wasser = Tassenanzahl × Wasser pro Tasse + zusätzlich benötigtes Wasser; Milliliter ÷ 1.000 = Liter.',
        'example': 'Fiktives Beispiel: Vier Tassen mit je 250 ml und ohne Zusatzbedarf ergeben 1 Liter.',
        'limit': 'Die berechnete Menge darf die tatsächliche Mindest- und Höchstfüllmenge des Geräts nicht ersetzen. Bei Bedarf mehrere Durchgänge planen. Keine Kochzeit oder Energieersparnis wird vorhergesagt.',
        'fields': [('cups', 'Tassenanzahl', '4', '1', '40', '1'), ('millilitres', 'Wasser pro Tasse (ml)', '250', '1', '1000', '1'), ('extra', 'Zusätzlicher Wasserbedarf (ml)', '0', '0', '10000', '1')],
    },
    'heissluftfritteusen': {
        'title': 'Zwei getrennte Garzonen zeitlich planen',
        'intro': 'Nutze eigene Rezeptzeiten und Temperaturen als Planungswerte. Die Rechnung setzt zwei unabhängig bedienbare Zonen voraus.',
        'method': 'Gemeinsamer Plan-Endpunkt = längere Rezeptdauer. Startverzögerung je Zone = längere Rezeptdauer minus Dauer dieser Zone.',
        'example': 'Fiktives Beispiel: A braucht 20, B 30 Minuten. B beginnt zuerst; A folgt nach 10 Minuten. Das ist eine Zeitplanung, keine Garprobe.',
        'limit': 'Unterschiedliche Temperaturen benötigen getrennt geregelte Zonen. Platz, zulässige Einstellungen, Aufheizen und tatsächliche Garung separat prüfen. Keine Aussage zu Lebensmittelsicherheit oder Portionenzahl.',
        'fields': [('minutesA', 'Eigene Rezeptdauer A (min)', '20', '.1', '240', '.1'), ('minutesB', 'Eigene Rezeptdauer B (min)', '30', '.1', '240', '.1'), ('temperatureA', 'Eigene Rezepttemperatur A (°C)', '180', '30', '300', '1'), ('temperatureB', 'Eigene Rezepttemperatur B (°C)', '200', '30', '300', '1')],
    },
    'kontaktgrills': {
        'title': 'Aufstellfläche mit Handbuch-Abständen prüfen',
        'intro': 'Übernimm Gerätebreite, Gerätetiefe und erforderliche horizontale Abstände aus der Anleitung deiner genauen Variante.',
        'method': 'Benötigte Breite/Tiefe = Gerätemaß + zweimal der größte vorgeschriebene horizontale Abstand je Seite. Mit freier Arbeitsfläche vergleichen.',
        'example': 'Fiktives Beispiel: 37 × 35 cm Gerät und angenommene 10 cm je Seite benötigen 57 × 55 cm. Die 10 cm sind kein Herstellerabstand.',
        'limit': 'Nur ein rechteckiger Flächenvergleich. Öffnungshöhe, Kabel, Untergrund, Hitzebeständigkeit und reale Abstandsregeln bleiben separat zu prüfen. Beispielwerte vor einer echten Prüfung ersetzen.',
        'fields': [('deviceWidth', 'Gerätebreite laut Anleitung (cm)', '37', '.1', '200', '.1'), ('deviceDepth', 'Gerätetiefe laut Anleitung (cm)', '35', '.1', '200', '.1'), ('clearance', 'Größter vorgeschriebener horizontaler Abstand je Seite (cm)', '10', '0', '200', '.1'), ('spaceWidth', 'Freie Breite der Arbeitsfläche (cm)', '80', '.1', '1000', '.1'), ('spaceDepth', 'Freie Tiefe der Arbeitsfläche (cm)', '70', '.1', '1000', '.1')],
    },
}

LINKS = {
    'ventilatoren': ('Stromkosten für deine Ventilator-Nutzung', '/guide/stromkosten-rechner.html', 'Watt ÷ 1.000 × Betriebsstunden × eigener Arbeitspreis.', 'Fiktives Beispiel: 30 W × 8 h × 0,35 €/kWh ÷ 1.000 = 0,084 € pro Tag.', 'Die Rechnung senkt keine Raumtemperatur und sagt nichts über Luftstrom oder Lautstärke. Watt und Nutzung der genauen Variante selbst prüfen.'),
    'heizluefter': ('Heizlüfter: Kosten pro Stunde und Nutzung', '/guide/heizluefter-stromverbrauch.html#eb-heater-cost', 'Watt ÷ 1.000 × Nutzungsstunden × Heizanteil × Arbeitspreis.', 'Fiktives Beispiel: 2.000 W bei angenommener voller Heizzeit, 2 h und 0,35 €/kWh ergeben 1,40 €.', 'Der Heizanteil ist eine Annahme; ein Thermostat garantiert keine bestimmte Ersparnis. Das bestehende Werkzeug berücksichtigt deinen Tarif.'),
    'waeschetrockner': ('Eine Wäscheladung mit Entfeuchter oder Trockner vergleichen', '/waeschetrockner-oder-luftentfeuchter.html#laundry-check', 'Gemessene kWh für einen vollständigen Durchgang × eigener Arbeitspreis.', 'Fiktives Beispiel: 1,5 kWh pro vollständiger Ladung × 0,35 €/kWh ergeben 0,525 €.', 'Nur gleiche Wäschemenge und gleicher Trocknungsgrad sind vergleichbar. Nennleistung allein beweist keinen Verbrauch pro Ladung.'),
}


def render_tool(category_id):
    """Return one self-contained static tool section; unknown categories fail."""
    esc = lambda value: escape(str(value), quote=True)
    prefix = 'pc-tool-' + category_id
    if category_id in LINKS:
        title, url, method, example, limit = LINKS[category_id]
        return (f'<section class="pc-tool" id="{prefix}" aria-labelledby="{prefix}-title">'
                f'<h3 id="{prefix}-title">{esc(title)}</h3><p>{esc(method)}</p>'
                f'<p><strong>Rechenbeispiel:</strong> {esc(example)}</p><p>{esc(limit)}</p>'
                f'<a href="{esc(url)}">Vorhandenes Werkzeug öffnen →</a></section>')
    if category_id not in TOOLS:
        raise ValueError('No reviewed category tool: ' + str(category_id))
    spec = TOOLS[category_id]
    controls = []
    for name, label, value, minimum, maximum, step in spec.get('fields', []):
        control_id = prefix + '-' + name
        controls.append(f'<label for="{control_id}">{esc(label)}<input id="{control_id}" name="{name}" type="number" inputmode="decimal" value="{value}" min="{minimum}" max="{maximum}" step="{step}" required></label>')
    for name, label, options in spec.get('selects', []):
        control_id = prefix + '-' + name
        choices = '<option value="">Bitte wählen</option>' + ''.join(f'<option value="{esc(value)}">{esc(text)}</option>' for value, text in options)
        controls.append(f'<label for="{control_id}">{esc(label)}<select id="{control_id}" name="{name}" required>{choices}</select></label>')
    return (f'<section class="pc-tool" id="{prefix}" aria-labelledby="{prefix}-title">'
            f'<h3 id="{prefix}-title">{esc(spec["title"])}</h3><p>{esc(spec["intro"])}</p>'
            f'<p><strong>Rechenweg:</strong> {esc(spec["method"])}</p><p><strong>Rechenbeispiel:</strong> {esc(spec["example"])}</p>'
            f'<p>{esc(spec["limit"])}</p><form data-category-tool="{category_id}" hidden>'
            '<p>Vorbelegte Zahlen sind fiktive Beispiele. Für die eigene Planung ersetzen; Eingaben bleiben in diesem Browser.</p>'
            + ''.join(controls) + '<button type="submit">Meine Angaben prüfen</button><button type="reset">Beispielwerte zurücksetzen</button></form>'
            f'<div id="{prefix}-result" data-category-result role="status" aria-live="polite" tabindex="-1" hidden></div>'
            '<noscript><p>Die Formel und das fiktive Beispiel sind ohne JavaScript lesbar. Eigene Werte kannst du damit von Hand nachrechnen.</p></noscript></section>')
