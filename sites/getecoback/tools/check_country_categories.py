#!/usr/bin/env python3
"""Gate local routing, merchant eligibility and discovery for the expansion."""
import html
import json
import re
from pathlib import Path
from urllib.parse import urlsplit, parse_qs
from build_country_categories import DATA, SITE, BASE


def main():
    index = json.loads((SITE / 'search-index.json').read_text())
    sitemap = (SITE / 'sitemap.xml').read_text()
    llms = (SITE / 'llms.txt').read_text()
    assert 'Balkonkraftwerk-Rechner' not in llms, 'Withdrawn category in AI index'
    experiments = json.loads((SITE.parent / "data/growth-experiments.json").read_text())["bets"]
    registered = {p for b in experiments for p in b.get("built_pages", [])}
    count = 0
    for c in DATA['countries']:
        for url in (c['path'], c['guide']['path']):
            assert url in registered, 'Country page lacks a registered experiment: ' + url
            rel = url.lstrip('/') + ('index.html' if url.endswith('/') else '')
            p = SITE / rel
            s = p.read_text()
            assert f'<html lang="{c["lang"]}">' in s, url
            assert f'<link rel="canonical" href="{BASE+url}">' in s, url
            assert '<!--EB_TRACK-->' not in s, 'Generic tracker would misclassify ordinary merchant links'
            assert 'data-eb-popup-market' not in s, 'Country guides must not acquire DE/US popups'
            assert any(i['u'] == url and i['l'] == c['lang'] for i in index), url
            assert BASE + url in sitemap, url
            assert BASE + url in llms or BASE + url + 'index.html' in llms, url
            for href in re.findall(r'href="([^"]+)"', s):
                href = html.unescape(href)
                u = urlsplit(href)
                if u.hostname and 'amazon.' in u.hostname:
                    assert u.hostname == 'www.' + c['merchant'], (url, href)
                    expected = ['getecoback-21'] if c['market'] == 'DE' else None
                    assert parse_qs(u.query).get('tag') == expected, (url, href)
                if href.startswith('/') and not href.startswith('//'):
                    target = SITE / (u.path.lstrip('/') + ('index.html' if u.path.endswith('/') else ''))
                    assert target.exists(), (url, href)
                    if u.fragment:
                        assert f'id="{u.fragment}"' in target.read_text(), (url, href)
            if not url.endswith('/') and url != '/wohnen.html':
                assert (p.with_suffix('.md')).exists(), url
            count += 1
    for rel in ('index.html', 'en/index.html', 'kategorie/luftqualitaet.html', 'kategorie/energie-sparen.html',
                'guide/waesche-trocknen-wohnung.html', 'guide/luftfeuchtigkeit-senken.html', 'en/guide/portable-ac-tilt-and-turn-windows.html'):
        text = (SITE / rel).read_text()
        assert text.count('<!--EB_COUNTRIES-->') == 1, rel
        if rel in ('index.html', 'en/index.html'):
            assert 'api.web3forms.com' not in text and 'name="access_key"' not in text, 'Legacy form credentials must not be republished'
            assert 'Balkon-Solar' not in text, 'Withdrawn topic in publisher metadata'
            assert 'radar.html#radar-form' in text, 'Use the existing consent-based signup surface'
    print(f'country categories: {count} pages, correct locales/shops/tags, internal paths and discovery')


if __name__ == '__main__':
    main()
