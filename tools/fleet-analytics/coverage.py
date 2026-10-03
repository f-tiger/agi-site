#!/usr/bin/env python3
"""Complete consent-controlled GA4 coverage after ALL page generators.

One opt-in channel per public page. The explicit fleet registry maps AGI-owned
subdomains to its existing property; the other main sites keep their own IDs.
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
REGISTRY = json.loads((HERE / 'registry.json').read_text())
FILES = ['consent.mjs', 'collector.mjs', 'consent.css', 'frame.html', 'frame-loader.mjs', 'business.mjs', 'legacy.mjs', 'campaign.mjs']
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
    if 'analytics-assets/' in relative:
        return 'internal-analytics-frame'
    if page.redirect:
        return 'redirect'
    if relative.startswith(('__ci/', '__probe/')) or relative in {'404.html', '500.html'}:
        return 'probe-or-error'
    if relative == 'packs-thanks.html':
        return 'private-purchase-delivery'
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
    cfg = REGISTRY[site]
    measurement = cfg['id']
    host = urlparse(page.canonical).hostname
    assert host in cfg['hosts'], 'Unexpected canonical hostname: ' + str(host)
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
                prefix = cfg.get('assetPrefixes', [''])[cfg['hosts'].index(host)] if cfg.get('assetPrefixes') else ''
                file = (root / prefix / url.path.lstrip('/')).resolve()
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
    if site == 'tds' and any('/document-assets/analytics.mjs' in x for x in loaders):
        ids.update(re.findall(r'G-[A-Z0-9]+', (root / 'js/config.js').read_text()))
    assert not (ids - {measurement}), f'Unexpected measurement ID(s): {ids - {measurement}}'
    # Some legacy inline loaders also contain their external source string. A
    # direct external tag plus its config is one loader; only executable sources count.
    assert len(loaders) <= 1, f'Duplicate GA4 loaders: {loaders}'
    if loaders:
        assert measurement in ids, 'Loader without the site measurement ID'
    return page, loaders

def migrate(html, measurement):
    """Remove only known Google entrypoints; leave event callbacks and D1 intact."""
    def script(match):
        page = Page(match[0])
        tag = page.scripts[0]
        if tag['attrs'].get('type') in {'application/json', 'application/ld+json'}: return match[0]
        ids = set(re.findall(r'\bG-[A-Z0-9]{8,}\b', tag['attrs'].get('src', '') + tag['body']))
        assert not (ids - {measurement}), f'Unexpected measurement ID(s): {ids - {measurement}}'
        src = urlparse(tag['attrs'].get('src', ''))
        if src.hostname in {'www.googletagmanager.com', 'googletagmanager.com'} and src.path == '/gtag/js':
            return ''
        if not src.hostname and '/' + src.path.lstrip('/') in {'/js/analytics.js', '/document-assets/analytics.mjs'}:
            return ''
        # BPJ outputs produced before the source generator migration. Keep its
        # first-party beacon and event callbacks in the surrounding inline block.
        body = match[0]
        body = re.sub(r"var s = document\.createElement\('script'\);\s*s\.async = true;\s*s\.src = 'https://www\.googletagmanager\.com/gtag/js\?id=G-[A-Z0-9]+';\s*document\.head\.appendChild\(s\);", '', body)
        return body
    return re.sub(r'<script\b[^>]*>[\s\S]*?</script\s*>', script, html, flags=re.I)

def version():
    return hashlib.sha256(b''.join((HERE / n).read_bytes() for n in FILES + ['registry.json'])).hexdigest()[:12]

def install_assets(root, site):
    cfg = REGISTRY[site]
    allowed = {host: c['id'] for c in REGISTRY.values() for host in c['hosts']}
    for prefix in cfg.get('assetPrefixes', ['']):
        target = root / prefix / 'analytics-assets'
        target.mkdir(parents=True, exist_ok=True)
        for name in FILES: (target / name).write_bytes((HERE / name).read_bytes())
        (target / 'registry.mjs').write_text('export const allowed = ' + json.dumps(allowed, sort_keys=True) + ';\n')
        # no-transform applies ONLY to the isolated analytics document, preserving
        # the normal site's Cloudflare beacon and keeping the frame truly empty.
        headers = root / prefix / '_headers'
        text = headers.read_text() if headers.exists() else ''
        text = re.sub(r'\n?# FLEET-GA4-HEADERS\n[\s\S]*?# /FLEET-GA4-HEADERS\n?', '', text)
        text += '\n# FLEET-GA4-HEADERS\n/analytics-assets/frame.html\n  Cache-Control: public, max-age=0, must-revalidate, no-transform\n  X-Robots-Tag: noindex, nofollow\n/analytics-assets/frame\n  Cache-Control: public, max-age=0, must-revalidate, no-transform\n  X-Robots-Tag: noindex, nofollow\n# /FLEET-GA4-HEADERS\n'
        headers.write_text(text)

def build(root, site, write=False):
    root = Path(root).resolve()
    cfg = REGISTRY[site]
    measurement = cfg['id']
    release = version()
    if write:
        install_assets(root, site)
    records, changed = [], []
    for file in sorted(root.rglob('*.html')):
        relative = file.relative_to(root).as_posix()
        if set(file.relative_to(root).parts[:-1]) & SKIP_DIRS or file.relative_to(root).parts[0] in SOURCE_DIRS.get(site, set()):
            continue
        html = file.read_text()
        page = Page(html)
        exception = exemption(relative, page)
        if exception:
            records.append({'file': relative, 'mode': 'excluded', 'reason': exception})
            continue
        if write: html = migrate(html, measurement)
        page, loaders = status(html, root, site)
        host = urlparse(page.canonical).hostname
        assert not loaders or loaders == ['consent'], 'Legacy GA4 loader bypasses consent: ' + relative
        if not loaders:
            assert page.canonical and urlparse(page.canonical).hostname == host, 'Missing same-site canonical: ' + relative
            assert '</body>' in html.lower(), 'Missing body close: ' + relative
            if not write:
                raise AssertionError('Missing GA4 loader: ' + relative)
            tag = (f'<link rel="stylesheet" href="/analytics-assets/consent.css?v={release}">'
                   f'<script type="module" src="{ASSET}?v={release}" data-ga4-id="{measurement}" data-ga4-host="{host}" data-ga4-page="{escape(page.canonical, quote=True)}" data-ga4-title="{escape(page.title, quote=True)}"></script>')
            html = re.sub('</body>', lambda _: tag + '</body>', html, count=1, flags=re.I)
            file.write_text(html)
            changed.append(relative)
            page, loaders = status(html, root, site)
        if write and loaders == ['consent']:
            html = re.sub(r'(/analytics-assets/consent\.(?:mjs|css))\?v=[a-zA-Z0-9.-]+', lambda m: m[1]+'?v='+release, html)
            file.write_text(html)
        records.append({'file': relative, 'url': page.canonical, 'mode': 'consent' if loaders == ['consent'] else 'existing'})
    report = {'site': site, 'hosts': cfg['hosts'], 'measurementId': measurement, 'version': release, 'assets': FILES + ['registry.mjs'], 'records': records}
    if write:
        for prefix in cfg.get('assetPrefixes', ['']):
            (root / prefix / 'analytics-assets/coverage.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'site': site, 'pages': len(records), 'repaired': len(changed), 'consent': sum(r['mode'] == 'consent' for r in records), 'existing': sum(r['mode'] == 'existing' for r in records), 'excluded': [r for r in records if r['mode'] == 'excluded']}))
    return report

if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--site', choices=REGISTRY, required=True)
    p.add_argument('--out')
    p.add_argument('--write', action='store_true')
    a = p.parse_args()
    build(a.out or REGISTRY[a.site]['root'], a.site, a.write)
