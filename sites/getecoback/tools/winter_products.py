"""German winter offer identities. Match whole model queries, including variants."""
from html import escape
import json
from pathlib import Path
from urllib.parse import urlsplit, parse_qs
import re

DATA = Path(__file__).resolve().parents[1] / 'data/winter-products-de.json'
PRODUCTS = {p['id']: p for p in json.loads(DATA.read_text())}
BY_QUERY = {p['query'].casefold(): p for p in PRODUCTS.values()}


def validate():
    for p in PRODUCTS.values():
        target = urlsplit(p['amazonUrl'])
        params = parse_qs(target.query)
        if target.scheme != 'https' or target.netloc != 'www.amazon.de' or params.get('tag') != ['getecoback-21']:
            raise ValueError(p['id'])
        asin = p['asin']
        if asin:
            if not re.fullmatch('[A-Z0-9]{10}', asin) or target.path != '/dp/' + asin:
                raise ValueError(p['name'])
        elif target.path != '/s' or params.get('k') != [p['query']]:
            raise ValueError(p['query'])
        if bool(p['secondaryShopUrl']) != bool(p['secondaryShopName']):
            raise ValueError('Incomplete secondary offer: ' + p['id'])
        if p['secondaryShopUrl'] and urlsplit(p['secondaryShopUrl']).scheme != 'https':
            raise ValueError('Secondary offer requires HTTPS')


def buttons(p, placement='data-eb-tp="1"'):
    def link(url, label):
        return (f'<a class="winter-pick-cta cro-cta" {placement} target="_blank" '
                f'aria-label="{escape(label + " – " + p["name"], quote=True)}" '
                f'rel="nofollow sponsored noopener" href="{escape(url, quote=True)}">{escape(label)}</a>')
    result = link(p['amazonUrl'], 'Aktuellen Preis bei Amazon prüfen * →')
    if p['secondaryShopUrl']:
        result += link(p['secondaryShopUrl'], 'Bei ' + p['secondaryShopName'] + ' vergleichen *')
    return result


validate()
