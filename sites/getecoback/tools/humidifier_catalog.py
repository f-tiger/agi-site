"""Exact, sourced humidifier choices; commerce expires after 90 days."""
import datetime as dt
import json
import re
from html import escape as esc
from pathlib import Path
from urllib.parse import quote_plus, urlsplit

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data/humidifier-catalog.json'
SLUG = 'luftbefeuchter-ratgeber'
SOURCE_HOSTS = {'www.stadlerform.com', 'www.beurer.com', 'res.cloudinary.com', 'www.umweltbundesamt.de', 'www.epa.gov'}


def validate(data):
    if data['schema_version'] != 1 or data['market'] != 'DE' or data['max_age_days'] != 90:
        raise ValueError('Invalid catalog schema, market or freshness interval')
    dt.date.fromisoformat(data['checked'])
    for src in data['sources'].values():
        u = urlsplit(src['url'])
        if (u.scheme != 'https' or u.hostname not in SOURCE_HOSTS or u.username or u.port or u.query or u.fragment
                or (u.hostname == 'res.cloudinary.com' and not u.path.startswith('/beurer/image/upload/'))):
            raise ValueError('Unreviewed humidifier source')
    ids = set()
    for product in data['products']:
        if not re.fullmatch('[a-z0-9-]+', product['id']) or product['id'] in ids:
            raise ValueError('Invalid or duplicate model identity')
        ids.add(product['id'])
        if product['status'] not in {'verified', 'unverified'} or not product['query'].strip():
            raise ValueError('Invalid source status or model query')
        if not product['sources'] or any(k not in data['sources'] for k in product['sources']):
            raise ValueError('Missing official evidence')
        lo, hi = product['power_w']
        if not (0 < lo <= hi):
            raise ValueError('Invalid nameplate power')
    return data


def load():
    return validate(json.loads(DATA.read_text()))


def source_links(keys, data=None):
    d = load() if data is None else data
    return ' · '.join(f'<a href="{esc(d["sources"][k]["url"], quote=True)}">{esc(d["sources"][k]["title"])}</a>' for k in keys)


def power_label(p):
    lo, hi = p['power_w']
    return f'{lo}–{hi} W' if lo != hi else f'{hi} W'


def render(today=None, data=None):
    d = load() if data is None else validate(data)
    age = ((today or dt.datetime.now(dt.timezone.utc).date()) - dt.date.fromisoformat(d['checked'])).days
    fresh = 0 <= age <= d['max_age_days']
    rows, cards = [], []
    for p in d['products']:
        target = 'humidifier-' + p['id']
        rows.append(f'<tr><th scope="row"><a href="#{target}">{esc(p["name"])}</a></th><td>{esc(p["role"])}</td><td>{power_label(p)}</td></tr>')
        action = '<p class="hc-status">Modellsuche pausiert: Quellenprüfung ausstehend. Aktuelle Herstellerunterlagen zuerst prüfen.</p>'
        if fresh and p['status'] == 'verified':
            href = 'https://www.amazon.de/s?k=' + quote_plus(p['query']) + '&tag=getecoback-21'
            action = f'<p class="hc-commerce"><small>Anzeige · Modellsuche, kein geprüftes Einzelangebot.</small><a class="hc-button" href="{esc(href, quote=True)}" target="_blank" rel="sponsored nofollow noopener">{esc(p["name"])} bei Amazon.de suchen →</a></p>'
        cards.append(f'<section class="hc-card" id="{target}" aria-labelledby="{target}-title"><p class="hc-kicker">{esc(p["role"])}</p><h3 id="{target}-title">{esc(p["name"])}</h3><dl><dt>Regelung</dt><dd>{esc(p["controls"])}</dd><dt>Pflege einplanen</dt><dd>{esc(p["care"])}</dd><dt>Passendes Verbrauchsmaterial</dt><dd>{esc(p["parts"])}</dd></dl><p class="hc-limit"><strong>Vor dem Kauf:</strong> {esc(p["limit"])}</p><p class="hc-source">{source_links(p["sources"], d)}</p>{action}</section>')
    return ('<section id="eb-humidifier-products" class="humidifier-catalog" aria-labelledby="modelle-vergleichen">'
            '<h2 id="modelle-vergleichen">Drei genaue Modelle: Regelung und Pflege entscheiden</h2>'
            '<p>Zwei Verdunster unterscheiden sich hier durch Bedienung und Pflegeablauf. Der Dampfbefeuchter ist eine bewusste Alternative mit höherer elektrischer Nennleistung und heißem Wasser. Die Reihenfolge ist keine Rangliste; wir haben die Geräte nicht selbst getestet.</p>'
            f'<p class="hc-source">Herstellerquellen geprüft: {esc(d["checked"])}. Keine Live-Preise, Lieferzusagen oder Verbrauchsmessungen. Das Prüfdatum bestätigt keine aktuellen Händlerangebote.</p>'
            '<p class="hc-note">Die Tabelle lässt sich auf kleinen Bildschirmen seitlich verschieben. Nennleistung ist keine Effizienzbewertung bei gleicher Befeuchtungsleistung.</p>'
            '<div class="hc-table" role="region" aria-label="Luftbefeuchter-Modellvergleich, horizontal scrollbar" tabindex="0"><table><caption>Bedienung und Herstellerleistung im Vergleich</caption><thead><tr><th scope="col">Genaues Modell</th><th scope="col">Kaufgrund prüfen</th><th scope="col">Hersteller-Nennleistung</th></tr></thead><tbody>' + ''.join(rows) + '</tbody></table></div>'
            '<p class="hc-disclosure">Anzeige · Affiliate-Links: Als Amazon-Partner verdienen wir an qualifizierten Verkäufen. Die gekennzeichneten Links öffnen genaue Modellsuchen bei Amazon.de. Suchergebnisse können andere Varianten enthalten; Modell, Verkäufer und Lieferumfang abgleichen.</p>'
            '<div class="hc-models">' + ''.join(cards) + '</div></section>')
