"""Shared German scenario evidence for the entry cards, comparison and script writer."""
from datetime import date, datetime, timezone
from html import escape
from urllib.parse import urlencode

from agent_sources import citation_url


def shortlist(data, today=None):
    today = today or datetime.now(timezone.utc).date()
    comparison = data['winter_comparison']
    products = {p['id']: p for p in data['products']}
    picks = []
    if len(comparison['order']) != 2 or len(set(comparison['order'])) != 2:
        raise ValueError('Expected two distinct winter picks')
    for model in comparison['order']:
        p = products[model]
        fact = p['winter_pick']
        if len(fact['values']) != len(comparison['columns']) or not all(v.strip() for v in fact['values']):
            raise ValueError('Incomplete winter comparison: ' + model)
        if not citation_url(fact['source']):
            raise ValueError('Unreviewed winter comparison source: ' + model)
        dates = [p.get('checked', data['checked']), fact['checked']]
        eligible = p['status'] == 'verified' and all(
            0 <= (today - date.fromisoformat(day)).days <= data['max_age_days'] for day in dates)
        url = 'https://www.amazon.de/s?' + urlencode({'k': p['query'], 'tag': 'getecoback-21'})
        picks.append({**fact, 'name': p['name'], 'id': model, 'url': url if eligible else None})
    return picks


def offer(p, hero=False, choice=False):
    if not p['url']:
        return '<small>Modellsuche pausiert, bis die Quellen erneut geprüft sind.</small>'
    surface = 'data-eb-tp="1"' if hero else 'data-winter-table'
    if choice:
        surface = 'data-winter-compare data-choice-action="shop"'
    return (f'<a class="winter-pick-cta" {surface} href="{escape(p["url"])}" target="_blank" '
            'rel="nofollow sponsored noopener">Preis bei Amazon.de prüfen (Modellsuche)*</a>')


def quick_decision(picks, dehum=False):
    cards = []
    for index, p in enumerate(picks):
        point = p['values'][index] + '. ' if dehum else ''
        cards.append(f'<div><h3>{escape(p["scenario"])}</h3><strong>{escape(p["name"])}</strong>'
                     f'<p>{escape(point + p["reason"])}</p>{offer(p, hero=True)}</div>')
    fallback = ('Bei nassen Wänden erst die Ursache klären. Ohne Messwerte zuerst Temperatur und Feuchte messen.'
                if dehum else 'Ventil noch unbekannt? Erst die Kennzeichnung prüfen. Reicht dein alter Kopf, behalte ihn.')
    return ('<section class="winter-picks" id="schnell-entscheidung" aria-labelledby="winter-pick-title">'
            '<h2 id="winter-pick-title">Schnell-Entscheidung in 30 Sekunden</h2><div class="winter-pick-grid">'
            + ''.join(cards) + f'</div><p>{fallback} <a href="#winter-quellen">* Werbung · Quellen</a></p></section>')


def disclosure(picks):
    sources = ' · '.join(f'<a href="{escape(p["source"])}">{escape(p["name"])}</a> ({p["checked"]})' for p in picks)
    return ('<details id="winter-quellen"><summary>Quellen, Auswahl und Affiliate-Links</summary>'
            '<p>Wir vergleichen veröffentlichte Herstellerangaben. EcoBack hat die Geräte nicht selbst getestet. '
            'Als Amazon-Partner verdienen wir an qualifizierten Verkäufen. Die Modellsuche zeigt mehrere Treffer. '
            'Prüfe Generation, Lieferumfang und Gesamtpreis beim Händler.</p><p>' + sources + '</p></details>')
