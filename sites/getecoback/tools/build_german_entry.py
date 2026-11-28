"""Compose the German reader entry after all page writers. Keep existing markup and IDs intact."""
from html import escape, unescape
from pathlib import Path
import re

from build_asin_links import rewrite
from room_constraints import room_advice
from winter_products import PRODUCTS, buttons

SITE = Path(__file__).resolve().parents[1] / 'site'
ASSETS = '<link rel="stylesheet" href="/assets/german-entry.css"><script defer src="/assets/german-tariffs.js"></script>'
LABEL = '<small class="cro-transparency">Werbung · Einige Links sind Affiliate-Links (*). Für dich ändert sich der Preis nicht.</small>'
CORE = {
    'luftentfeuchter-ratgeber': 'Im kalten Keller zählt der Entzug bei deiner Raumtemperatur.',
    'smarte-heizkoerperthermostate-lohnen-sich': 'Prüfe zuerst dein Ventil und die vorhandene Zentrale.',
    'waesche-trocknen-wohnung': 'Bleibt die Wäsche feucht, miss Temperatur und Luftfeuchte direkt am Wäscheständer.',
    'homeoffice-warm-bleiben': 'Für kalte Füße am Schreibtisch reicht oft Wärme am Körper. Einen kalten Raum musst du separat beheizen.',
}
H2 = re.compile(r'<h2\b([^>]*)>(.*?)</h2>', re.S|re.I)


def text(fragment):
    return ' '.join(unescape(re.sub('<[^>]+>', ' ', fragment)).split())


def bounded(key, content):
    return f'<!--CRO:{key}-->{content}<!--/CRO:{key}-->'


def scenario_card(product_id, title, detail):
    p = PRODUCTS[product_id]
    return (f'<div><h3>{escape(title)}</h3><strong>{escape(p["name"])}</strong>'
            f'<p>{escape(detail)}</p>{buttons(p)}</div>')


def buying_entry(slug):
    if slug == 'homeoffice-warm-bleiben':
        rows = [
            ('hd75', 'Nur dir ist kalt', 'Die Wärmezudecke wärmt dich am Sitzplatz. Raumtemperatur separat prüfen.'),
            ('ir600', 'Wärme für einen festen Platz', '600 W über vier Stunden entsprechen bei voller Leistung 2,4 kWh. Montageabstände prüfen.'),
        ]
        third = '<a href="/guide/heizkosten-vergleich-rechner.html">Wärmedecke, Infrarot und Heizlüfter durchrechnen →</a>'
    else:
        rows = [
            ('meaco-two-12', 'Wohnung um 20 °C', 'Bei 20 °C und 60 % relativer Feuchte: 5,4 L/Tag bei 136 W. Die Laufzeit für eine Ladung hängt von deiner Wäsche ab.'),
            ('tp50', 'Noch keine Messwerte?', 'Vor jedem Kauf Temperatur und Feuchte protokollieren. Ein vorhandenes Hygrometer reicht.'),
        ]
        third = '<a href="/guide/luftentfeuchter-ratgeber.html#schnell-entscheidung">Kühler Waschkeller? Werte bei 10 °C vergleichen →</a>'
    sources = ' · '.join(f'<a href="{escape(PRODUCTS[model]["source"])}">{escape(PRODUCTS[model]["name"])}</a>' for model, _, _ in rows)
    method = '<details><summary>Methodik, Datenquellen &amp; Hinweise</summary><p>Modellunterlagen und Angebotsvarianten: ' + sources + '</p></details>'
    return ('<section class="cro-scenarios"><h2>3-Sekunden-Entscheidungshilfe</h2><div class="cro-grid">'
            + ''.join(scenario_card(*row) for row in rows) + '</div><p>' + third + '</p>' + method + '</section>')


def equipment_note(slug):
    choices = {
        'luftentfeuchter-keller': ('dd8l-junior', 'Kälter als der dokumentierte Prüfpunkt?',
            'Beim DD8L Junior übernimmt ein Adsorptionsrotor den Feuchteentzug. Vergleiche Einsatztemperatur, Stromaufnahme und Ablauf für deinen Keller. Bei nassen Wänden zuerst die Ursache klären.'),
        'infrarotheizung-thermostat': ('bn30', 'Eine vorhandene Platte nach Raumtemperatur schalten',
            'Prüfe zuerst, ob die Platte nach einer Stromunterbrechung wieder heizt und der Hersteller eine externe Schaltung erlaubt. Danach die zulässige Schaltlast des BN30 mit dem Typenschild abgleichen.'),
        'luftentfeuchter-25-qm': ('ttk-53-e', 'Für den Waschkeller den Strombedarf durchrechnen',
            'Vergleiche die Laufzeit mit deinem eigenen Tarif. Aus der Raumfläche allein ergibt sich keine tägliche Entzugsmenge.'),
    }
    if slug not in choices:
        return ''
    model, heading, explanation = choices[slug]
    product = PRODUCTS[model]
    return ('<section class="cro-room" id="geraet-im-szenario"><h2>' + escape(heading) +
            '</h2><strong>' + escape(product['name']) + '</strong><p>' + escape(explanation) +
            '</p><p><a href="' + escape(product['source']) + '">Modellunterlagen prüfen</a></p>' +
            buttons(product, 'data-winter-table') + '</section>')


def guide_routes(html):
    # Link to actual editorial headings. Ignore injected chrome, FAQ and shopping rails.
    body = re.search(r'<article\b[^>]*>(.*?)</article>|<main\b[^>]*>(.*?)</main>', html, re.S|re.I)
    if not body:
        return '', html
    editorial = re.sub(r'<!--(EB_[A-Z0-9_]+)-->.*?<!--/\1-->', '', body[1] or body[2], flags=re.S)
    anchors = []
    for match in H2.finditer(editorial):
        label = text(match[2])
        if not 5 <= len(label) <= 115 or re.search(r'quelle|methodik|häufige fragen|ähnliche|werbung|affiliate|weitere ratgeber', label, re.I):
            continue
        ident = re.search(r'\bid="([^"]+)"', match[1])
        if ident:
            target = ident[1]
        else:
            # Unique deterministic id, preserved when build_onpage has already assigned one.
            target = 'cro-leseziel-' + str(len(anchors)+1)
            if html.count(match[0]) != 1 or f'id="{target}"' in html:
                continue
            html = html.replace(match[0], match[0].replace('<h2', f'<h2 id="{target}"', 1), 1)
        anchors.append(f'<a href="#{escape(target)}">{escape(label)}</a>')
        if len(anchors) == 2:
            break
    return ('<nav class="cro-routes" aria-label="Direkt zur Entscheidung">' + ''.join(anchors) + '</nav>' if anchors else ''), html


def render(path, html):
    if path.parent.name == 'widgets' and path.name == 'stromkosten.html':
        html = re.sub(r'<!--CRO:assets-->.*?<!--/CRO:assets-->', '', html, flags=re.S)
        return html.replace('</head>', bounded('assets', ASSETS) + '</head>', 1)
    if not re.search(r'<html\b[^>]*lang=["\']de(?:-DE)?["\']', html, re.I) or '</h1>' not in html:
        return html
    slug = path.stem
    html = re.sub(r'<!--CRO:(entry|assets|equipment)-->.*?<!--/CRO:\1-->', '', html, flags=re.S)
    is_guide = path.parent.name == 'guide'
    is_tool = bool(re.search(r'<input\b[^>]*(?:type="number"|inputmode="decimal")', html))
    if not (is_guide or is_tool):
        return html
    html = html.replace('</head>', bounded('assets', ASSETS) + '</head>', 1)
    html, _ = rewrite(html)
    area = re.fullmatch(r'(heizung|luftentfeuchter)-(\d+)-qm', slug)
    if area and 'id="raumprofil"' not in html:
        # Also covers the checked-in editorial versions of the area templates.
        match = re.search(r'<article\b[^>]*>\s*(?:<div class="wrap">)?', html)
        if match:
            html = html[:match.end()] + room_advice(int(area[2]), area[1]=='heizung') + html[match.end():]
    equipment = equipment_note(slug)
    if equipment:
        html = re.sub(r'</article>|</main>', lambda m: bounded('equipment', equipment) + m[0], html, count=1)
    if slug in ('homeoffice-warm-bleiben', 'waesche-trocknen-wohnung'):
        routes = buying_entry(slug)
    elif slug in CORE:
        routes = ''  # These two generators own the adjacent winter-pick grid.
    else:
        routes, html = guide_routes(html)
    summary = CORE.get(slug, '')
    if not summary:
        intro = re.search(r'<(?:div|p) class="tldr"[^>]*>(.*?)</(?:div|p)>', html, re.S)
        if intro:
            clean = re.sub(r'^(?:TL;DR|Kurz(?:fassung|antwort)?|Auf einen Blick)\s*[:·–—]?\s*', '', text(intro[1]), flags=re.I)
            sentence = re.split(r'(?<=[.!?])\s+(?=[A-ZÄÖÜ])', clean)[0]
            if 15 <= len(sentence) <= 200:
                summary = sentence
    if not summary and is_guide:
        power = re.search(r'data-power-watts="([0-9.]+)"', html)
        if power:
            summary = f'Bei {power[1]} W zählt die Laufzeit: Rechne mit deinem Tarif und den Stunden, die das Gerät tatsächlich läuft.'
        else:
            lead = re.search(r'<meta\b[^>]*name="description"[^>]*content="([^"]+)"', html)
            if lead:
                sentences = re.split(r'(?<=[.!?])\s+(?=[A-ZÄÖÜ])', unescape(lead[1]))
                summary = next((s for s in sentences if 15 <= len(s) <= 205 and not s.endswith('?')), '')
    has_offers = bool(re.search(r'<a\b[^>]*href="https?://(?:www\.)?amazon\.[^"]*(?:tag=|/dp/)', html))
    entry = (LABEL if has_offers else '') + (f'<p class="cro-answer">{escape(summary)}</p>' if summary else '') + routes
    html = html.replace('</h1>', '</h1>'+bounded('entry', entry), 1)
    # A generated contents list can precede the title on article-first pages.
    # Keep all anchors, but place the list behind the decision itself.
    title = html.index('</h1>')
    toc = re.search(r'<!--EB_TOC-->.*?<!--/EB_TOC-->', html[:title], re.S)
    if toc:
        html = html[:toc.start()] + html[toc.end():]
        html = html.replace('<!--/CRO:entry-->', '<!--/CRO:entry-->' + toc[0], 1)
    # Move non-essential live feeds and the market chooser out of the first viewport.
    header = re.search(r'<header\b[^>]*>(?:(?!</header>).)*?<h1\b.*?</header>', html, re.S)
    if header:
        before = html[:header.start()]
        pattern = r'<!--(EB_(?:USMARKET|PROFILE|STROMHEAT|FEUCHTENOW|HEATNOW|STROMNOW))-->.*?<!--/\1-->'
        blocks = [m[0] for m in re.finditer(pattern, before, re.S)]
        html = re.sub(pattern, '', before, flags=re.S) + header[0] + ''.join(blocks) + html[header.end():]
    # Move complete methodology/disclosure blocks only; do not move safety instructions.
    if '<!--CRO:method-->' in html:
        prior = re.search(r'<!--CRO:method--><details class="cro-method"><summary>.*?</summary>(.*?)</details><!--/CRO:method-->', html, re.S)
        if prior:
            html = html[:prior.start()] + prior[1] + html[prior.end():]
    if 'class="cro-method"' not in html:
        pattern = r'<(div|p) class="disclosure">(?:(?!<(?:div|p)\b).)*?</\1>'
        notes = list(dict.fromkeys(m[0] for m in re.finditer(pattern, html, re.S)))
        if notes:
            html = re.sub(pattern, '', html, flags=re.S)
            note = '<details class="cro-method"><summary>Methodik, Datenquellen &amp; Hinweise</summary>' + ''.join(notes) + '</details>'
            html = re.sub(r'<footer\b|</body>', lambda m: bounded('method', note) + m[0], html, count=1)
    return re.sub(r'(?m)^[ \t]+$', '', html)


def main():
    total = 0
    for path in sorted([*SITE.glob('guide/*.html'), *SITE.glob('*.html'), *SITE.glob('widgets/*.html')]):
        old = path.read_text()
        new = render(path, old)
        if old != new:
            path.write_text(new)
            total += 1
    print(f'German guide and tariff entries: {total} files updated')


if __name__ == '__main__':
    main()
