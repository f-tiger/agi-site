"""Read-only release check of the final buyer/catalog composition and AI mirror."""
import concurrent.futures
import re
import time
import urllib.request
from dehum_catalog import load

DATA = load()
HEADERS = {'User-Agent': 'getecoback-ci geo-catalog-probe/1.0', 'x-probe': '1'}

def read(path, accept='text/html'):
    request = urllib.request.Request('https://getecoback.com' + path + '?__probe=1',
                                     headers={**HEADERS, 'Accept': accept})
    with urllib.request.urlopen(request, timeout=25) as response:
        assert response.status == 200
        return response.read().decode('utf-8')

def check(slug):
    path = '/guide/' + slug + '.html'
    for attempt in range(3):
        try:
            html = read(path)
            match = re.search(r'<!--EB_MODELS-->(.*?)<!--/EB_MODELS-->', html, re.S)
            assert match, slug + ': final catalog missing'
            assert html.index('<!--/EB_BUYER-->') < match.start(), slug + ': catalog nested in buyer'
            assert match[1].count('class="dc-card"') == len(DATA['products']), slug
            md = read(path, 'text/markdown')
            assert match[1].count('id="ablauf-vor-kauf"') == 1, slug + ': drain answer missing'
            for surface in [match[1], md]:
                assert 'Ein Schlauchanschluss allein bestätigt keine Pumpe.' in surface, slug + ': drain limitation missing'
                assert 'weder den deutschen Lieferumfang noch die Eignung der Arete Two 12L' in surface, slug + ': market/model caveat missing'
            for product in DATA['products']:
                for surface in [match[1], md]:
                    assert product['name'] in surface and product['source'] in surface, slug + ': evidence missing'
            assert 'amazon.de' not in md and 'getecoback-21' not in md, slug + ': commerce in AI mirror'
            return slug
        except (AssertionError, OSError):
            if attempt == 2:
                raise
            time.sleep(2)

if __name__ == '__main__':
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        paths = list(pool.map(check, DATA['pages']))
    print('Live catalog and negotiated Markdown verified: ' + ', '.join(paths) + '; no business events sent')
