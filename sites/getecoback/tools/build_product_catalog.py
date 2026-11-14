#!/usr/bin/env python3
"""Build the reviewed German multi-category product directory without network I/O.

Merchant destinations are derived only from reviewed model queries and the site's
fixed DE tag. Evidence survives a commerce withdrawal; unknown is never a price,
stock promise, test score or verified recommendation.
"""
from __future__ import annotations

import argparse
import datetime as dt
from html import escape
import json
from pathlib import Path
import re
from urllib.parse import urlencode

from agent_sources import citation_url
from build_agent_md import to_markdown
import storage_veto

ROOT = Path(__file__).resolve().parents[1]
ROUTE = '/produkte.html'
CANONICAL = 'https://getecoback.com' + ROUTE
TITLE = 'Haushaltsgeräte nach Aufgabe und Modell vergleichen | EcoBack'
DESCRIPTION = 'Vergleiche konkrete Haushaltsgeräte nach Aufgabe und genauer Variante: mit Herstellerquellen, Grenzen und passenden Modellsuchen für Deutschland.'
SLUG = re.compile(r'[a-z0-9]+(?:-[a-z0-9]+)*')
PRODUCT_FIELDS = ('id', 'category', 'name', 'brand', 'variant', 'role', 'facts',
                  'limit', 'source', 'source_label', 'query', 'checked', 'status')
FORBIDDEN = {'asin', 'tag', 'affiliate_tag', 'merchant_url', 'affiliate_url', 'price', 'rating', 'stock'}


def date(value):
    if not isinstance(value, str) or not re.fullmatch(r'\d{4}-\d{2}-\d{2}', value):
        raise ValueError('Expected exact ISO calendar date')
    return dt.date.fromisoformat(value)


def normalized(value):
    return ' '.join(value.casefold().split())


def validate(data):
    if not isinstance(data, dict) or type(data.get('version')) is not int or data['version'] != 1:
        raise ValueError('Unsupported product catalog version')
    if data.get('market') != 'DE' or type(data.get('max_age_days')) is not int or data['max_age_days'] != 90:
        raise ValueError('Catalog requires reviewed DE market and 90-day evidence boundary')
    published = date(data.get('published'))
    modified = date(data.get('modified'))
    if modified < published:
        raise ValueError('Modified date precedes publication')
    categories, products = data.get('categories'), data.get('products')
    if not isinstance(categories, list) or not categories or not isinstance(products, list) or not products:
        raise ValueError('A reviewed catalog cannot be empty')
    category_ids, category_names, ids, models, queries = set(), set(), set(), set(), set()
    veto = storage_veto.load()
    for category in categories:
        if not isinstance(category, dict) or any(not isinstance(category.get(k), str) or not category[k].strip() for k in ('id', 'name', 'intro', 'no_purchase')):
            raise ValueError('Missing category identity or decision guidance')
        key = category['id']
        if not SLUG.fullmatch(key) or key in category_ids or normalized(category['name']) in category_names:
            raise ValueError('Invalid or duplicate category identity')
        if storage_veto.is_storage(category['id'] + ' ' + category['name'], veto):
            raise ValueError('Storage/PV categories are excluded')
        category_ids.add(key); category_names.add(normalized(category['name']))
    for product in products:
        if not isinstance(product, dict) or any(not isinstance(product.get(k), str) or not product[k].strip() for k in PRODUCT_FIELDS):
            raise ValueError('Missing reviewed product fields')
        if FORBIDDEN.intersection(product):
            raise ValueError('Merchant, price, stock and rating fields are not catalog inputs')
        key, model, query = product['id'], normalized(product['brand'] + ' ' + product['name']), normalized(product['query'])
        if not SLUG.fullmatch(key) or key in ids or model in models or query in queries:
            raise ValueError('Invalid or duplicate exact model identity')
        if product['category'] not in category_ids:
            raise ValueError('Unknown product category')
        if product['status'] not in {'verified', 'unverified', 'conflict', 'stale', 'pending'}:
            raise ValueError('Unknown evidence status')
        date(product['checked'])
        if not citation_url(product['source']):
            raise ValueError('Unreviewed official source: ' + product['id'])
        if storage_veto.is_storage(' '.join(product[k] for k in ('id', 'category', 'brand', 'name', 'variant', 'query')), veto):
            raise ValueError('Storage/PV products are excluded')
        ids.add(key); models.add(model); queries.add(query)
    if any(not any(p['category'] == c for p in products) for c in category_ids):
        raise ValueError('Category has no reviewed product')
    return data


def load(path=ROOT / 'data/product-catalog.json'):
    return validate(json.loads(Path(path).read_text(encoding='utf-8')))


def eligible(product, data, today):
    age = (today - date(product['checked'])).days
    return product['status'] == 'verified' and 0 <= age <= data['max_age_days']


def render(data, today=None):
    data = validate(data)
    today = today or dt.datetime.now(dt.timezone.utc).date()
    esc = lambda value: escape(str(value), quote=True)
    # Every published product group must have its matching practical check.
    # A missing helper is a build error, never an empty feature placeholder.
    from product_category_tools import render_tool
    groups = []
    for category in data['categories']:
        cards = []
        for product in data['products']:
            if product['category'] != category['id']:
                continue
            if eligible(product, data, today):
                url = 'https://www.amazon.de/s?' + urlencode({'k': product['query'], 'tag': 'getecoback-21'})
                merchant = f'<p class="pc-commerce"><a href="{esc(url)}" target="_blank" rel="sponsored nofollow noopener">Modellsuche bei Amazon.de →</a><small>Anzeige · Suche, keine feste Produktseite. Genaue Variante, Gesamtpreis und Lieferung beim Händler prüfen.</small></p>'
            else:
                merchant = '<p class="pc-commerce pc-paused">Händlersuche pausiert: Quellenprüfung ausstehend. Die Angaben unten sind der dokumentierte Stand, keine aktuelle Kaufempfehlung.</p>'
            cards.append(f'''<section class="pc-card" id="produkt-{esc(product['id'])}" data-product-card data-category="{esc(category['id'])}">
<h3>{esc(product['name'])}</h3><p class="pc-brand">{esc(product['brand'])} · {esc(product['variant'])}</p>
<p><strong>Aufgabe:</strong> {esc(product['role'])}</p><p>{esc(product['facts'])}</p>
<p class="pc-limit"><strong>Vor dem Kauf:</strong> {esc(product['limit'])}</p>
<p class="pc-source">Quelle: <a href="{esc(product['source'])}" target="_blank" rel="noopener">{esc(product['source_label'])}</a> · geprüft am <time datetime="{esc(product['checked'])}">{date(product['checked']).strftime('%d.%m.%Y')}</time>.</p>
{merchant}</section>''')
        tool = render_tool(category['id'])
        if not isinstance(tool, str) or not tool.strip():
            raise ValueError('Missing category tool: ' + category['id'])
        groups.append(f'''<section class="pc-category" id="kategorie-{esc(category['id'])}" data-product-category="{esc(category['id'])}">
<h2>{esc(category['name'])} <span class="pc-category-count">{len(cards)} Modelle</span></h2>
<p>{esc(category['intro'])}</p><p class="pc-no-purchase"><strong>Vorhandenes weiter nutzen?</strong> {esc(category['no_purchase'])}</p>
<p class="pc-buyer-routes"><a href="#modelle-{esc(category['id'])}">Direkt die {len(cards)} Modelle vergleichen ↓</a> <a href="#pc-tool-{esc(category['id'])}">Erst die passende Auswahlhilfe nutzen ↓</a></p>
{tool}<h3 class="pc-model-heading" id="modelle-{esc(category['id'])}">{esc(category['name'])}: Modelle und Kaufgrenzen</h3><div class="pc-grid">{''.join(cards)}</div></section>''')
    nav = ''.join(f'<a href="#kategorie-{esc(c["id"])}" data-category-link="{esc(c["id"])}">{esc(c["name"])}</a>' for c in data['categories'])
    options = ''.join(f'<option value="{esc(c["id"])}">{esc(c["name"])}</option>' for c in data['categories'])
    count = len(data['products'])
    published, modified = data['published'], data['modified']
    graph = {'@context': 'https://schema.org', '@type': 'CollectionPage', 'name': TITLE,
             'description': DESCRIPTION, 'url': CANONICAL, 'inLanguage': 'de-DE',
             'datePublished': published, 'dateModified': modified,
             'publisher': {'@type': 'Organization', 'name': 'EcoBack', 'url': 'https://getecoback.com/'},
             'mainEntity': {'@type': 'ItemList', 'numberOfItems': count,
                            'itemListElement': [{'@type': 'ListItem', 'position': n, 'name': p['name'], 'url': CANONICAL + '#produkt-' + p['id']} for n, p in enumerate(data['products'], 1)]}}
    structured = json.dumps(graph, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c')
    return f'''<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{TITLE}</title><meta name="description" content="{DESCRIPTION}"><link rel="canonical" href="{CANONICAL}">
<link rel="alternate" type="text/markdown" href="https://getecoback.com/produkte.md"><link rel="alternate" hreflang="de" href="{CANONICAL}">
<meta property="og:type" content="website"><meta property="og:title" content="{TITLE}"><meta property="og:description" content="{DESCRIPTION}"><meta property="og:url" content="{CANONICAL}">
<link rel="stylesheet" href="/assets/product-catalog.css"><script type="module" src="/assets/product-catalog.mjs"></script><script type="module" src="/assets/product-category-tools.mjs"></script>
<script type="application/ld+json">{structured}</script></head><body>
<main class="pc-page"><article data-product-directory><header class="pc-header"><p><a href="/">EcoBack</a> / Produkte</p>
<h1>Haushaltsgeräte: konkrete Modelle für deine Aufgabe</h1><p class="pc-lead">{count} konkrete Modelle in {len(data['categories'])} Produktgruppen. Vergleiche Einsatz, genaue Variante und Grenzen anhand der Herstellerquellen — ohne Testnoten oder Preisrangliste.</p>
<p class="pc-disclosure">Als Amazon-Partner verdient EcoBack an qualifizierten Käufen. Händlersuchen sind als Anzeige gekennzeichnet. Keine eigenen Gerätetests; Herstellerangaben sind keine Leistungszusage für dein Zuhause.</p>
<p class="pc-dates">Veröffentlicht: <time datetime="{published}">{date(published).strftime('%d.%m.%Y')}</time> · Inhalt geändert: <time datetime="{modified}">{date(modified).strftime('%d.%m.%Y')}</time>. Der Quellenstand steht an jedem Modell.</p></header>
<nav class="pc-categories" aria-label="Produktgruppen">{nav}</nav>
<form class="pc-filters" id="product-filters" role="search" hidden><label for="product-query">Modell, Marke oder Aufgabe<input id="product-query" type="search" maxlength="100" autocomplete="off" placeholder="Zum Beispiel: Fenster, Bosch, Akku"></label>
<label for="product-category">Produktgruppe<select id="product-category"><option value="">Alle Produktgruppen</option>{options}</select></label><button type="reset">Filter zurücksetzen</button>
<p class="pc-filter-note">Die Suche läuft nur in diesem Browser. Dein Suchtext wird nicht übertragen.</p></form>
<p id="product-filter-status" role="status" aria-live="polite">{count} Modelle in {len(data['categories'])} Produktgruppen.</p>
<p id="product-filter-empty" hidden>Keine passenden Modelle. Ändere die Suche oder setze die Filter zurück.</p>
{''.join(groups)}
<section class="pc-method" id="auswahlmethode"><h2>Was diese Auswahl leistet</h2><p>Die Gruppen zeigen unterschiedliche Aufgaben und konkrete Modelle, keine vollständige Marktübersicht. Herstellerdaten und genaue Varianten stehen bei jedem Gerät. Wir haben diese Geräte nicht selbst getestet. Eine Händlersuche bestätigt weder ein bestimmtes Angebot noch Verfügbarkeit oder einen Preis.</p><p>Quellen älter als 90 Tage, zukünftige Prüfdaten oder offene Widersprüche pausieren die Händlersuche. Die zuletzt dokumentierten Fakten bleiben nachvollziehbar. Zubehör, regionale Ausführung und die passende Anleitung am konkreten Angebot prüfen. Ein funktionierendes vorhandenes Gerät muss nicht ersetzt werden.</p><p>Weitere genaue Kaufhilfen: <a href="/guide/luftentfeuchter-ratgeber.html">Luftentfeuchter</a> · <a href="/guide/smarte-heizkoerperthermostate-lohnen-sich.html">Heizkörperthermostate</a> · <a href="/guide/saugwischer-kaufberatung.html">Saugwischer</a> · <a href="/guide/saugroboter-kaufberatung.html">Saugroboter</a> · <a href="/guide/luftbefeuchter-ratgeber.html">Luftbefeuchter</a>.</p></section>
</article></main><footer class="pc-footer"><a href="/wie-wir-empfehlen.html">Unsere Methode</a> · <a href="/datenschutz.html">Datenschutz</a> · <a href="/impressum.html">Impressum</a></footer></body></html>\n'''


def build(root=ROOT, today=None):
    root = Path(root)
    data = load(root / 'data/product-catalog.json')
    output = render(data, today)
    site = root / 'site'
    if site.is_symlink():
        raise ValueError('Refusing symlink site root')
    site.mkdir(parents=True, exist_ok=True)
    html_path = site / 'produkte.html'
    md_path = site / 'produkte.md'
    markdown = to_markdown(output, ROUTE, 'de')
    if re.search(r'https?://(?:www\.)?amazon\.|tag=getecoback-21', markdown, re.I):
        raise ValueError('Merchant link leaked into machine-readable text')
    for path, text in ((html_path, output), (md_path, markdown)):
        if path.is_symlink():
            raise ValueError('Refusing symlink output')
        if not path.exists() or path.read_text(encoding='utf-8') != text:
            path.write_text(text, encoding='utf-8')
    return {'products': len(data['products']), 'categories': len(data['categories']),
            'merchant_searches': sum(eligible(p, data, today or dt.datetime.now(dt.timezone.utc).date()) for p in data['products'])}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=ROOT)
    parser.add_argument('--today', type=date)
    args = parser.parse_args()
    print(json.dumps(build(args.root, args.today), ensure_ascii=False))
