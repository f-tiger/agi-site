#!/usr/bin/env python3
"""Validate generated model guides and their discovery surfaces before/after release.

The optional live mode performs bounded GET requests only, without executing
JavaScript or following product/affiliate links. Source age is retained as a
captured fact; rereading a published page never refreshes its evidence date.
"""
from __future__ import annotations
import argparse
from datetime import datetime, timezone
from html import unescape
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import sys
import time
import urllib.error
import urllib.request
from urllib.parse import urljoin, urlsplit

from auto_content import FACT_GROUPS, public_source, read_state, substantive_hash, validate_route
from auto_content_sources import ALLOWED_HOSTS
from build_auto_content import ALIASES, MARKER, neat

ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://getecoback.com'
MAX_BYTES = 1_000_000


class ReleaseError(ValueError):
    pass


def require(ok, route, message):
    if not ok:
        raise ReleaseError(route + ': ' + message)


def normal(text):
    return ' '.join(unescape(str(text)).split())


class Document(HTMLParser):
    def __init__(self):
        super().__init__()
        self.lang = None
        self.h1 = []
        self.h1_open = False
        self.canonical = []
        self.robots = []
        self.links = []
        self.scripts = []
        self.ids = []
        self.fact_rows = {}
        self.fact_key = None
        self.duplicates = set()
        self.formula = ''
        self.limit = ''
        self.capture = None
        self.jsonld = []
        self.jsonld_open = False
        self.script_open = False
        self.tool = None
        self.text = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'html': self.lang = attrs.get('lang')
        if tag == 'h1': self.h1.append(''); self.h1_open = True
        if tag == 'link' and attrs.get('rel') == 'canonical': self.canonical.append(attrs.get('href'))
        if tag == 'meta' and attrs.get('name', '').lower() in ('robots', 'googlebot'): self.robots.append(attrs.get('content', ''))
        if tag == 'a': self.links.append(attrs.get('href', ''))
        if 'id' in attrs: self.ids.append(attrs['id'])
        if attrs.get('id') == 'auto-product-tool': self.tool = attrs
        if tag == 'script':
            self.script_open = True
            self.scripts.append(attrs)
            if attrs.get('type') == 'application/ld+json': self.jsonld.append(''); self.jsonld_open = True
        if 'data-fact-key' in attrs:
            key = attrs['data-fact-key']
            if key in self.fact_rows: self.duplicates.add(key)
            self.fact_rows[key] = ''
            self.fact_key = key
        if 'data-cost-formula' in attrs: self.capture = 'formula'
        if 'data-power-limit' in attrs: self.capture = 'limit'

    def handle_data(self, data):
        if not self.script_open: self.text.append(data)
        if self.h1_open: self.h1[-1] += data
        if self.fact_key is not None: self.fact_rows[self.fact_key] += data + ' '
        if self.capture: setattr(self, self.capture, getattr(self, self.capture) + data)
        if self.jsonld_open: self.jsonld[-1] += data

    def handle_endtag(self, tag):
        if tag == 'h1': self.h1_open = False
        if tag == 'tr': self.fact_key = None
        if tag == 'p': self.capture = None
        if tag == 'script': self.jsonld_open = False; self.script_open = False


def date(value):
    return datetime.fromisoformat(value.replace('Z', '+00:00')).date()


def articles(document):
    result = []
    for text in document.jsonld:
        try: data = json.loads(text)
        except ValueError as error: raise ReleaseError('Malformed JSON-LD') from error
        nodes = data if isinstance(data, list) else data.get('@graph', [data]) if isinstance(data, dict) else []
        result.extend(node for node in nodes if isinstance(node, dict) and node.get('@type') == 'Article')
    return result


def check_document(html, route, entry, owned):
    product = entry['product']
    require(isinstance(html, str) and 1000 <= len(html) <= MAX_BYTES, route, 'invalid document length')
    require(html.count(MARKER) == 1, route, 'owned content marker missing or duplicated')
    d = Document(); d.feed(html)
    require(d.canonical == [BASE + route], route, 'canonical must exactly match this route')
    require(len(d.h1) == 1 and bool(d.h1[0].strip()), route, 'exactly one nonempty H1 required')
    country = product.get('country')
    require(country in ('DE', 'GB'), route, 'unsupported country')
    require(route.startswith('/en/') == (country == 'GB'), route, 'market does not match route')
    require(d.lang == ('de' if country == 'DE' else 'en-GB'), route, 'HTML language does not match country')
    require(product.get('language') == ('de' if country == 'DE' else 'en-GB'), route, 'source language does not match country')
    require(product.get('market', {}).get('currency') == ('EUR' if country == 'DE' else 'GBP'), route, 'currency does not match country')
    require(not any('noindex' in value.lower() for value in d.robots), route, 'page is not indexable')
    require(d.ids.count('auto-product-tool') == 1 and d.tool is not None, route, 'tool anchor missing or duplicated')
    require(any(s.get('type') == 'module' and urlsplit(s.get('src', '')).path == '/assets/auto-product.mjs' for s in d.scripts), route, 'interactive module missing')
    require(d.tool.get('data-currency') == ('EUR' if country == 'DE' else 'GBP'), route, 'tool currency mismatch')
    require(d.tool.get('data-share-url') == BASE + route, route, 'share URL mismatch')
    try: matching_power = float(d.tool.get('data-power-watts', 'nan')) == float(product['power_watts'])
    except (ValueError, TypeError): matching_power = False
    require(matching_power, route, 'tool power differs from source facts')
    require(bool(d.formula.strip()) and '1000' in d.formula, route, 'visible cost formula missing')
    require(bool(d.limit.strip()), route, 'constant-power calculation limits missing')
    require(not d.duplicates, route, 'duplicate specification rows')
    groups = {FACT_GROUPS[key] for key in d.fact_rows if key in FACT_GROUPS}
    require('power' in groups and len(groups) >= 4, route, 'four independent specification groups required')
    for fact in product['facts']:
        key = ALIASES.get(fact['key'], fact['key'])
        row = normal(d.fact_rows.get(key, ''))
        require(bool(row), route, 'source fact row missing: ' + key)
        for field in ('value', 'unit', 'context'):
            expected = normal(neat(fact[field]) if field == 'value' else fact.get(field, ''))
            require(not expected or expected in row, route, 'fact value or condition changed: ' + key + '/' + field)
    sources = product.get('source_urls', [])
    require(bool(sources) and product.get('product_url') in sources, route, 'product source missing')
    require(all(public_source(url, ALLOWED_HOSTS) for url in sources), route, 'unapproved public source URL')
    require(set(sources).issubset(d.links), route, 'public manufacturer reference missing')
    for link in d.links:
        parsed = urlsplit(urljoin(BASE + route, link))
        internal = parsed.scheme == 'https' and parsed.hostname == 'getecoback.com' and not parsed.username and not parsed.password and parsed.port in (None, 443)
        require(internal or link in sources, route, 'unverified external/affiliate link: ' + link[:120])
    require(not re.search(r'amazon\.[a-z.]+/|amzn\.to/|[?&](?:amp;)?tag=getecoback|ui\.awin\.', html, re.I), route, 'affiliate purchase link leaked into generated page')
    require(owned.get('source_id') == product.get('source_id') and owned.get('name') == product.get('name'), route, 'ledger source identity mismatch')
    require(owned.get('content_hash') == substantive_hash(product), route, 'ledger content hash mismatch')
    try:
        published, modified, captured = date(entry['published']), date(entry['modified']), date(product['checked_at'])
        created, updated = date(owned['created_at']), date(owned['modified_at'])
    except (ValueError, TypeError, KeyError, AttributeError) as error:
        raise ReleaseError(route + ': invalid publication/source date') from error
    require(published == created and modified == updated and published <= modified <= datetime.now(timezone.utc).date() and captured <= modified, route, 'source/publication/ledger dates disagree or are in the future')
    schema = articles(d)
    require(len(schema) == 1, route, 'exactly one Article schema required')
    require(schema[0].get('datePublished') == entry['published'] and schema[0].get('dateModified') == entry['modified'], route, 'Article dates differ from durable facts')
    require(schema[0].get('inLanguage') == ('de-DE' if country == 'DE' else 'en-GB'), route, 'Article locale mismatch')
    require(set(sources).issubset(schema[0].get('citation', [])), route, 'Article source citations missing')
    require(normal(entry['published']) in normal(' '.join(d.text)) and normal(entry['modified']) in normal(' '.join(d.text)), route, 'publication dates are not visible')
    return d


def local(root=ROOT):
    root = Path(root)
    state, ledger = read_state(root)
    pages = state['pages']; site = root / 'site'
    if not pages:
        print('PASS automatic content: registry empty; no fabricated pages required.')
        return 0
    search = {row['u'] for row in json.loads((site / 'search-index.json').read_text())}
    tools = (site / 'tools.html').read_text()
    sitemap = (site / 'sitemap.xml').read_text()
    llms = (site / 'llms.txt').read_text()
    homes = {'DE': (site / 'index.html').read_text(), 'GB': (site / 'en/index.html').read_text()}
    parents = {'DE': ['guide/luftentfeuchter-ratgeber.html', 'guide/trotec-luftentfeuchter-test.html'],
               'GB': ['en/guide/uk-damp-and-heating-decisions.html', 'en/guide/12l-vs-20l-dehumidifier-uk.html']}
    parent_docs = {country: '\n'.join((site / file).read_text() for file in files if (site / file).exists()) for country, files in parents.items()}
    newest = {}
    for country in ('DE', 'GB'):
        newest[country] = {route for _, route in sorted(((entry['modified'], route) for route, entry in pages.items() if entry['product']['country'] == country), reverse=True)[:6]}
    for route, entry in pages.items():
        validate_route(route)
        file = site / route.lstrip('/')
        require(file.is_file() and not file.is_symlink(), route, 'generated file missing or symlinked')
        document = check_document(file.read_text(), route, entry, ledger['pages'][route])
        require(route in search, route, 'site search does not list the page')
        require(BASE + route in sitemap and BASE + route in llms, route, 'sitemap or llms index missing')
        require(route in tools, route, 'tool hub missing the page')
        country = entry['product']['country']
        require('/tools.html' in homes['DE'], route, 'homepage cannot reach the tool hub')
        if route in newest[country]:
            require(route + '#auto-product-tool' in homes[country], route, 'new page not linked from its market homepage')
            require(route + '#auto-product-tool' in parent_docs[country], route, 'new page not linked from a relevant existing guide')
        mirror = file.with_suffix('.md')
        require(mirror.is_file(), route, 'Markdown evidence mirror missing')
        text = normal(mirror.read_text())
        require(all(url in text for url in entry['product']['source_urls']), route, 'Markdown source URLs were stripped')
        for fact in entry['product']['facts']:
            require(normal(neat(fact['value'])) in text, route, 'Markdown fact value was stripped: ' + fact['key'])
            require(not fact.get('context') or normal(fact['context']) in text, route, 'Markdown test condition was stripped: ' + fact['key'])
        require(normal(document.limit) in text, route, 'Markdown constant-power limits were stripped')
        require(not re.search(r'amazon\.[a-z.]+/|amzn\.to/|tag=getecoback', text, re.I), route, 'Markdown affiliate URL')
    print(f'PASS automatic content: {len(pages)} owned pages, exact facts/dates, tools, sources and discovery.')
    return len(pages)


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def live_targets(state, receipt=None):
    pages = state['pages']
    if receipt is None:
        return sorted(pages)
    require(isinstance(receipt, dict) and receipt.get('schema_version') == 1, 'receipt', 'invalid schema')
    require(type(receipt.get('changed')) is bool, 'receipt', 'invalid changed flag')
    urls = receipt.get('canonical_urls')
    require(isinstance(urls, list) and all(isinstance(url, str) for url in urls) and len(urls) == len(set(urls)), 'receipt', 'canonical URLs must be unique strings')
    require(receipt['changed'] or not urls, 'receipt', 'unchanged receipt cannot list changed URLs')
    routes = []
    for url in urls:
        parsed = urlsplit(url)
        require(parsed.scheme == 'https' and parsed.netloc == 'getecoback.com' and not parsed.query and not parsed.fragment, 'receipt', 'live URL outside fixed origin')
        try: validate_route(parsed.path)
        except ValueError as error: raise ReleaseError('receipt: invalid controlled route') from error
        require(parsed.path in pages and url == BASE + parsed.path, 'receipt', 'live URL is not registry-owned')
        routes.append(parsed.path)
    return routes


def fetch_live(url):
    request = urllib.request.Request(url, headers={'User-Agent': 'EcoBack-Automatic-Release-Probe/1.0', 'Accept': 'text/html'})
    with urllib.request.build_opener(NoRedirect()).open(request, timeout=20) as response:
        require(response.status == 200, url, 'live response is not 200')
        body = response.read(MAX_BYTES + 1)
        require(len(body) <= MAX_BYTES, url, 'live response too large')
        return body.decode('utf-8')


def live(root=ROOT, receipt_file=None, fetcher=fetch_live, pause=time.sleep):
    state, ledger = read_state(Path(root))
    receipt = json.loads(Path(receipt_file).read_text()) if receipt_file else None
    targets = live_targets(state, receipt)
    for route in targets:
        for attempt in range(3):
            try:
                check_document(fetcher(BASE + route), route, state['pages'][route], ledger['pages'][route])
                break
            except (ReleaseError, urllib.error.URLError, OSError, UnicodeError) as error:
                if attempt == 2: raise ReleaseError(route + ': live verification failed: ' + str(error)) from error
                pause(3)
    print(f'PASS live automatic content: {len(targets)} registry-owned page(s) by GET; no JS, commerce click or analytics event sent.')
    return len(targets)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--live', action='store_true')
    parser.add_argument('--receipt', type=Path)
    parser.add_argument('--root', type=Path, default=ROOT)
    args = parser.parse_args()
    try:
        live(args.root, args.receipt) if args.live else local(args.root)
    except (ValueError, OSError, KeyError, TypeError) as error:
        print('FAIL automatic content release: ' + str(error), file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
