"""Reviewed German compatibility bindings. Never infer compatibility from navigation."""
import copy
from datetime import date
import gzip
from html.parser import HTMLParser
import io
import json
from pathlib import Path
import re
import signal
import time
import urllib.request

from refresh_filter_finder import NoRedirect, digest, normalize

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data/filter-finder-de.json'
BINDINGS = {
    'levoit-core-300s': {
        'brand': 'Levoit', 'models': ['Core 300S'],
        'source_url': 'https://levoit.de/products/levoit-core-300-und-core-300s-ersatzfilter-hepa-filter',
        'name': 'Levoit Standard Ersatzfilter für Core 300(S) Luftreiniger',
        'part_number': '', 'variant': 'Standardfilter',
        'product_id': 9294220624194, 'variant_id': 48314199277890,
        'sku': 'HEACAFLVNEA0038', 'adapter': 'shopify',
    },
    'beurer-lr401': {
        'brand': 'Beurer', 'models': ['LR 401'],
        'source_url': 'https://www.beurer.com/de/p/69309/',
        'name': 'LR 400/401/405 Filter', 'part_number': '69309',
        'variant': 'Ersatzfilter 69309', 'sku': '69309_pseudo',
        'gtin': '4211125693091', 'adapter': 'product-jsonld',
    },
}


class ProductEvidence(HTMLParser):
    def __init__(self, text):
        super().__init__(convert_charrefs=True)
        self.scripts, self.headings, self.visible = [], [], []
        self.script = None
        self.hidden = False
        self.heading = None
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag in ('script', 'style'):
            self.hidden = True
        if tag == 'script' and attrs.get('type') == 'application/ld+json':
            self.script = []
        if tag == 'h1':
            self.heading = []

    def handle_data(self, value):
        if self.script is not None:
            self.script.append(value)
        if self.heading is not None:
            self.heading.append(value)
        if not self.hidden:
            self.visible.append(value)

    def handle_endtag(self, tag):
        if tag == 'script' and self.script is not None:
            self.scripts.append(''.join(self.script))
            self.script = None
        if tag in ('script', 'style'):
            self.hidden = False
        if tag == 'h1' and self.heading is not None:
            self.headings.append(' '.join(self.heading))
            self.heading = None


def product_payload(text, binding):
    if binding['adapter'] == 'shopify':
        return json.loads(text)
    parsed = ProductEvidence(text)
    products = []
    for script in parsed.scripts:
        obj = json.loads(script)
        entries = obj if isinstance(obj, list) else obj.get('@graph', [obj])
        products.extend(p for p in entries if isinstance(p, dict) and p.get('@type') == 'Product')
    matches = [p for p in products if p.get('url') == binding['source_url']]
    if len(matches) != 1:
        raise ValueError('Expected one exact canonical product')
    product = matches[0]
    # A schema-only product or a related-product card cannot establish a match.
    if ([normalize(h) for h in parsed.headings] != [normalize(binding['name'])]
            or normalize(product.get('description', '')) not in normalize(' '.join(parsed.visible))):
        raise ValueError('Visible product evidence missing')
    return product


def validate(data):
    if data.get('schema_version') != 1 or data.get('market') != 'DE':
        raise ValueError('Expected German source catalog v1')
    date.fromisoformat(data['updated'])
    items = data.get('items', [])
    if len(items) != len(BINDINGS) or {i['id'] for i in items} != set(BINDINGS):
        raise ValueError('Unexpected or duplicate source records')
    for item in items:
        binding = BINDINGS[item['id']]
        for key in ('brand', 'models', 'source_url', 'name', 'part_number', 'variant'):
            if item.get(key) != binding[key]:
                raise ValueError('Unreviewed identity: ' + item['id'] + '/' + key)
        if item.get('market') != 'DE' or item.get('status') not in ('verified', 'conflict', 'unavailable'):
            raise ValueError('Invalid market or status')
        if not re.fullmatch('[a-f0-9]{64}', item.get('approved_description_sha256', '')):
            raise ValueError('Missing reviewed fingerprint')
        statement = item.get('compatibility_statement', '')
        if not statement or any(normalize(model) not in normalize(statement) for model in item['models']):
            raise ValueError('Missing explicit model evidence')
        for field in ('checked_at', 'last_good_checked_at'):
            value = item.get(field, '')
            if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', value):
                raise ValueError('Missing calendar date')
            date.fromisoformat(value)
    return data


def evaluate(item, text):
    binding = BINDINGS[item['id']]
    try:
        payload = product_payload(text, binding)
    except (ValueError, TypeError, AttributeError):
        return 'unavailable', 'product_evidence_unreadable'
    if not isinstance(payload, dict):
        return 'unavailable', 'invalid_product_object'
    if binding['adapter'] == 'shopify':
        variants = payload.get('variants')
        if not isinstance(variants, list) or any(not isinstance(v, dict) for v in variants):
            return 'unavailable', 'invalid_product_variants'
        selected = [v for v in variants if v.get('id') == binding['variant_id']]
        identity = (payload.get('id') == binding['product_id'] and payload.get('title') == binding['name']
                    and payload.get('handle') == binding['source_url'].rsplit('/', 1)[-1]
                    and len(selected) == 1 and selected[0].get('sku') == binding['sku']
                    and selected[0].get('title') == binding['variant'])
    else:
        identity = (payload.get('name') == binding['name'] and payload.get('sku') == binding['sku']
                    and payload.get('gtin') == binding['gtin'])
    description = payload.get('description')
    if not identity:
        return 'conflict', 'product_or_variant_changed'
    if not isinstance(description, str) or not normalize(description):
        return 'unavailable', 'missing_description'
    if (normalize(item['compatibility_statement']) not in normalize(description)
            or digest(description) != item['approved_description_sha256']):
        return 'conflict', 'description_changed_review_required'
    return 'verified', 'reviewed_identity_and_description_unchanged'


def fetch_source(url, timeout):
    def expired(*_):
        raise TimeoutError('Source deadline exceeded')
    previous = signal.getsignal(signal.SIGALRM)
    signal.signal(signal.SIGALRM, expired)
    signal.setitimer(signal.ITIMER_REAL, timeout)
    try:
        request = urllib.request.Request(url, headers={
            'User-Agent': 'EcoBackFilterSourceCheck/1.0 (+https://getecoback.com/)',
            'Accept-Encoding': 'identity',
        })
        with urllib.request.build_opener(NoRedirect).open(request, timeout=timeout) as response:
            if response.status != 200 or response.geturl() != url:
                raise ValueError('Unexpected source response')
            raw = response.read(1_000_001)
            if len(raw) > 1_000_000:
                raise ValueError('Source too large')
            if raw.startswith(b'\x1f\x8b'):
                raw = gzip.GzipFile(fileobj=io.BytesIO(raw)).read(1_000_001)
            if len(raw) > 1_000_000:
                raise ValueError('Decoded source too large')
            return raw.decode('utf-8')
    finally:
        signal.setitimer(signal.ITIMER_REAL, 0)
        signal.signal(signal.SIGALRM, previous)


def refresh(data, fetcher=fetch_source, today=None):
    result = copy.deepcopy(validate(data))
    today = today or date.today().isoformat()
    started = time.monotonic()
    for item in result['items']:
        item['last_attempt_at'] = today
        binding = BINDINGS[item['id']]
        url = binding['source_url'] + ('.js' if binding['adapter'] == 'shopify' else '')
        try:
            remaining = 20 - (time.monotonic() - started)
            if remaining <= 0:
                raise TimeoutError('Total source deadline exceeded')
            status, reason = evaluate(item, fetcher(url, timeout=min(8, remaining)))
        except (OSError, ValueError, TimeoutError):
            status, reason = 'unavailable', 'source_fetch_failed'
        item['status'], item['verification_reason'] = status, reason
        if status == 'verified':
            item['checked_at'] = item['last_good_checked_at'] = today
    return result


if __name__ == '__main__':
    data = refresh(json.loads(DATA.read_text()))
    DATA.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    print({state: sum(i['status'] == state for i in data['items']) for state in ('verified', 'conflict', 'unavailable')})
