#!/usr/bin/env python3
"""Release guard for reviewed upkeep tools and their SEO/GEO discovery."""
import json
import re
from pathlib import Path

SITE = Path(__file__).resolve().parents[1] / 'site'
BASE = 'https://getecoback.com'
ROUTES = {
    'guide/tineco-saugt-nicht-mehr.html': ('upkeep-check', 'Tineco'),
    'guide/thermovorhang-ratgeber.html': ('upkeep-check', 'Thermovorhang'),
    'en/guide/12l-vs-20l-dehumidifier-uk.html': ('meaco-care', '£59.98'),
}

def main():
    search = {row['u'] for row in json.loads((SITE / 'search-index.json').read_text())}
    for path, (anchor, evidence) in ROUTES.items():
        text = (SITE / path).read_text()
        assert len(re.findall(r'<h1\b', text)) == 1, path
        canon = re.findall(r'<link[^>]+rel="canonical"[^>]+href="([^"]+)"', text)
        assert canon == [BASE + '/' + path], (path, canon)
        assert text.count(f'id="{anchor}"') == 1, path
        assert not re.search(r'<meta[^>]+name="robots"[^>]+noindex', text, re.I), path
        assert '/' + path in search, path
        for index in ('sitemap.xml', 'llms.txt'):
            assert BASE + '/' + path in (SITE / index).read_text(), (path, index)
        mirror = (SITE / path).with_suffix('.md').read_text()
        assert evidence in mirror, (path, 'missing readable evidence')
        assert not re.search(r'amazon\.[a-z.]+/|amzn\.to/|tag=getecoback', mirror), path
        assert '/' + path in (SITE / 'tools.html').read_text(), (path, 'tool hub')
        home = 'en/index.html' if path.startswith('en/') else 'index.html'
        assert '/' + path + '#' + anchor in (SITE / home).read_text(), (path, 'homepage')
        for marker in ('EB_TOPPICK', 'EB_MODELS', 'EB_STICKY', 'EB_PROFILE', 'EB_USMARKET', 'EB_POPUP', 'EB_USSWITCH'):
            assert '<!--' + marker + '-->' not in text, (path, marker)
    print('PASS upkeep: 3 existing canonical pages, readable evidence, discovery and qualified commerce.')

if __name__ == '__main__':
    main()
