#!/usr/bin/env python3
"""Complete GA4 coverage after ALL page generators, without replacing working tags.

Only the four existing GA4 properties are supported. Private portals, deliberately
isolated quotes, embeds and probes are explicit exceptions, not silent omissions.
"""
import argparse
import hashlib
import json
import re
from html import escape
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse

HERE = Path(__file__).resolve().parent
SITES = {
    'agi': ('agiscorecard.com', 'G-FZXLMBB5QB'),
    'eco': ('getecoback.com', 'G-E2V0Q9SJ9V'),
    'bpj': ('baipiaoji.com', 'G-H79D948F4Z'),
    'tds': ('thedollscout.com', 'G-2SEHFY33H8'),
}
ASSET = '/analytics-assets/consent.mjs'
SKIP_DIRS = {'node_modules', '.git', '.wrangler'}
SOURCE_DIRS = {'agi': {'tools', 'docs'}, 'eco': set(), 'bpj': set(), 'tds': {'scripts', 'content', 'dist'}}

class Page(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.scripts, self.current, self.canonical, self.redirect = [], None, '', False
        self.title, self.in_title = '', False
        self.feed(html)
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'title': self.in_title = True
        if tag == 'script':
            self.current = {'attrs': attrs, 'body': ''}
            self.scripts.append(self.current)
        if tag == 'link' and attrs.get('rel') == 'canonical':
            self.canonical = attrs.get('href', '')
        if tag == 'meta' and attrs.get('http-equiv', '').lower() == 'refresh':
            self.redirect = True
    def handle_data(self, text):
        if self.in_title: self.title += text
        if self.current is not None:
            self.current['body'] += text
    def handle_endtag(self, tag):
        if tag == 'title': self.in_title = False
        if tag == 'script':
            self.current = None

def exemption(relative, page):
    if relative == 'analytics-assets/frame.html':
        return 'internal-analytics-frame'
    if page.redirect:
        return 'redirect'
    if relative.startswith(('__ci/', '__probe/')) or relative in {'404.html', '500.html'}:
        return 'probe-or-error'
    if relative == 'widget.html' or re.search(r'(^|/)(widgets?|embed)/', relative):
        return 'embedded-widget'
    if re.search(r'(^|/)(members|account)\.html$', relative):
        return 'private-account-portal'
    if relative in {'studio/quote-builder.html', 'en/studio/quote-builder.html'}:
        return 'isolated-client-quote-first-party-events'
    return None

def status(html, root, site):
    """Inspect executable scripts, not CSP hints, comments, or a stray gtag symbol."""
    page = Page(html)
    host, measurement = SITES[site]
    loaders, ids, visited = [], set(), set()
    def inspect(text, name):
        ids.update(re.findall(r'\bG-[A-Z0-9]{8,}\b', text))
        if 'googletagmanager.com/gtag/js' in text:
            loaders.append(name)
    for script in page.scripts:
        attrs = script['attrs']
        if attrs.get('type', '').lower() in {'application/ld+json', 'application/json'}:
            continue
        src = attrs.get('src', '')
        if src:
            url = urlparse(src)
            if url.hostname in {'www.googletagmanager.com', 'googletagmanager.com'} and url.path == '/gtag/js':
                inspect(src, src)
            elif not url.hostname or url.hostname == host:
                file = (root / url.path.lstrip('/')).resolve()
                if not file.is_relative_to(root.resolve()) or not file.is_file():
                    raise AssertionError('Missing script asset: ' + src)
                if url.path == ASSET:
                    loaders.append('consent')
                    ids.add(attrs.get('data-ga4-id', ''))
                    assert attrs.get('data-ga4-host') == host, 'Wrong analytics hostname'
                    assert urlparse(attrs.get('data-ga4-page', '')).hostname == host, 'Missing public analytics page URL'
                    assert 'data-ga4-title' in attrs, 'Missing build-time page title'
                elif file not in visited:
                    visited.add(file)
                    inspect(file.read_text(), src)
        else:
            inspect(script['body'], 'inline')
    # Existing TDS document loader reads its ID from /js/config.js.
    if any('/document-assets/analytics.mjs' in x for x in loaders):
        ids.update(re.findall(r'G-[A-Z0-9]+', (root / 'js/config.js').read_text()))
    assert not (ids - {measurement}), f'Unexpected measurement ID(s): {ids - {measurement}}'
    # Some legacy inline loaders also contain their external source string. A
    # direct external tag plus its config is one loader; only executable sources count.
    assert len(loaders) <= 1, f'Duplicate GA4 loaders: {loaders}'
    if loaders:
        assert measurement in ids, 'Loader without the site measurement ID'
    return page, loaders

def build(root, site, write=False):
    root = Path(root).resolve()
    host, measurement = SITES[site]
    version = hashlib.sha256(b''.join((HERE / n).read_bytes() for n in ['consent.mjs','collector.mjs','consent.css','frame.html'])).hexdigest()[:12]
    if write:
        for name in ['consent.mjs', 'collector.mjs', 'consent.css', 'frame.html']:
            target = root / 'analytics-assets' / name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes((HERE / name).read_bytes())
    records, changed = [], []
    for file in sorted(root.rglob('*.html')):
        relative = file.relative_to(root).as_posix()
        if set(file.relative_to(root).parts[:-1]) & SKIP_DIRS or file.relative_to(root).parts[0] in SOURCE_DIRS[site]:
            continue
        html = file.read_text()
        page = Page(html)
        exception = exemption(relative, page)
        if exception:
            records.append({'file': relative, 'mode': 'excluded', 'reason': exception})
            continue
        page, loaders = status(html, root, site)
        if not loaders:
            assert page.canonical and urlparse(page.canonical).hostname == host, 'Missing same-site canonical: ' + relative
            assert '</body>' in html.lower(), 'Missing body close: ' + relative
            if not write:
                raise AssertionError('Missing GA4 loader: ' + relative)
            tag = (f'<link rel="stylesheet" href="/analytics-assets/consent.css?v={version}">'
                   f'<script type="module" src="{ASSET}?v={version}" data-ga4-id="{measurement}" data-ga4-host="{host}" data-ga4-page="{escape(page.canonical, quote=True)}" data-ga4-title="{escape(page.title, quote=True)}"></script>')
            html = re.sub('</body>', lambda _: tag + '</body>', html, count=1, flags=re.I)
            file.write_text(html)
            changed.append(relative)
            page, loaders = status(html, root, site)
        if write and loaders == ['consent']:
            html = re.sub(r'(/analytics-assets/consent\.(?:mjs|css))\?v=[a-zA-Z0-9.-]+', lambda m: m[1]+'?v='+version, html)
            file.write_text(html)
        records.append({'file': relative, 'url': page.canonical, 'mode': 'consent' if loaders == ['consent'] else 'existing'})
    report = {'site': site, 'measurementId': measurement, 'version': version, 'records': records}
    if write:
        (root / 'analytics-assets/coverage.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'site': site, 'pages': len(records), 'repaired': len(changed), 'consent': sum(r['mode'] == 'consent' for r in records), 'existing': sum(r['mode'] == 'existing' for r in records), 'excluded': [r for r in records if r['mode'] == 'excluded']}))
    return report

if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--site', choices=SITES, required=True)
    p.add_argument('--out', required=True)
    p.add_argument('--write', action='store_true')
    a = p.parse_args()
    build(a.out, a.site, a.write)
