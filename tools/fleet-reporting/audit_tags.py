#!/usr/bin/env python3
"""Inspect public HTML and deployed coverage without executing tags or events."""
import argparse
from concurrent.futures import ThreadPoolExecutor
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import urllib.error
import urllib.parse
import urllib.request

from collect import NoRedirect, UA, private_path, utc, write_json


class Tags(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.scripts, self.current, self.canonical = [], None, None
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'link' and attrs.get('rel') == 'canonical':
            self.canonical = attrs.get('href')
        if tag == 'script':
            self.current = {'attrs': attrs, 'body': ''}
            self.scripts.append(self.current)

    def handle_endtag(self, tag):
        if tag == 'script':
            self.current = None

    def handle_data(self, data):
        if self.current is not None:
            self.current['body'] += data


def inspect_html(html, expected_id=None):
    page = Tags(html)
    channels, ids, external = [], set(), []
    for script in page.scripts:
        a, body = script['attrs'], script['body']
        if a.get('type') in ('application/ld+json', 'application/json'):
            continue
        src = a.get('src', '')
        path = urllib.parse.urlsplit(src).path
        if path == '/analytics-assets/consent.mjs':
            channels.append('fleet')
            ids.add(a.get('data-ga4-id', ''))
        elif 'googletagmanager.com/gtag/js' in src or 'googletagmanager.com/gtag/js' in body:
            channels.append('google_direct')
        elif src:
            external.append(src)
        ids.update(re.findall(r'\bG-[A-Z0-9]{8,}\b', src + body))
    if expected_id and ids and ids != {expected_id}:
        status = 'wrong_measurement_id'
    elif len(channels) > 1:
        status = 'possible_duplicate_loaders'
    elif len(channels) == 1 and ids and (expected_id is None or ids == {expected_id}):
        status = 'tag_present_not_backend_verified'
    else:
        status = 'needs_script_inspection' if external else 'no_visible_tag'
    return {'status': status, 'measurement_ids': sorted(ids), 'channels': channels,
            'canonical': page.canonical, 'other_scripts': external}


def fetch_public(url):
    parsed = urllib.parse.urlsplit(url)
    if parsed.scheme != 'https' or parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise ValueError('Expected an explicit public HTTPS URL without query')
    req = urllib.request.Request(url, headers={'User-Agent': UA, 'X-Probe': '1'})
    result = {'url': url, 'fetched_at': utc(), 'http_status': None}
    try:
        with urllib.request.build_opener(NoRedirect()).open(req, timeout=20) as response:
            result['http_status'] = response.code
            result['headers'] = {k.lower(): v for k, v in response.headers.items()
                                 if k.lower() in ('date', 'age', 'cache-control', 'cf-cache-status', 'content-type')}
            raw = response.read(10 * 1024 * 1024 + 1)
            if len(raw) > 10 * 1024 * 1024:
                raise ValueError('Response exceeds size limit')
            result['body'] = raw.decode('utf-8')
    except urllib.error.HTTPError as error:
        result.update(http_status=error.code, error='HTTP failure or redirect (not followed)')
    except (OSError, ValueError, urllib.error.URLError):
        result['error'] = 'Network or decoding failure'
    return result


def audit(manifest, registry):
    host_cfg = {h: (key, cfg) for key, cfg in registry.items() for h in cfg['hosts']}
    def one(site):
        result = {'hostname': site['hostname'], 'expected_id': site['ga4']['measurement_id']}
        homepage = fetch_public(site['canonical_url'])
        body = homepage.pop('body', None)
        result['homepage'] = homepage
        result['inspection'] = inspect_html(body, result['expected_id']) if body is not None else {'status': 'unavailable'}
        if site['hostname'] in host_cfg:
            key, cfg = host_cfg[site['hostname']]
            coverage = fetch_public('https://' + site['hostname'] + '/analytics-assets/coverage.json')
            text = coverage.pop('body', None)
            try:
                report = json.loads(text or '')
                records = [r for r in report['records'] if urllib.parse.urlsplit(r.get('url', '')).hostname == site['hostname']]
                coverage['build_report'] = {'site': report.get('site'), 'measurement_id': report.get('measurementId'),
                    'version': report.get('version'), 'public_pages': sum(r.get('mode') == 'consent' for r in records),
                    'excluded_pages': sum(r.get('mode') != 'consent' for r in records),
                    'mapping_matches': report.get('site') == key and report.get('measurementId') == cfg['id'] and report.get('hosts') == cfg['hosts']}
            except (ValueError, KeyError, TypeError):
                coverage['error'] = 'No valid deployed coverage manifest'
            result['coverage'] = coverage
        return result
    with ThreadPoolExecutor(max_workers=6) as pool:
        rows = list(pool.map(one, manifest['sites']))
    return {'checked_at': utc(), 'method': 'Static GET only; no JavaScript, business events or GA4 collection requests', 'sites': rows}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    out = private_path(args.output)
    here = Path(__file__).resolve().parent
    result = audit(json.loads((here / 'manifest.json').read_text()), json.loads((here.parent / 'fleet-analytics/registry.json').read_text()))
    write_json(out, result)
    print(json.dumps({'sites': len(result['sites']), 'statuses': {s: sum(r['inspection']['status'] == s for r in result['sites']) for s in sorted({r['inspection']['status'] for r in result['sites']})}}))


if __name__ == '__main__':
    main()
