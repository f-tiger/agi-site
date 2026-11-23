"""Read-only release check of the final buyer/catalog composition and AI mirror."""
import argparse
import concurrent.futures
from pathlib import Path
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

def check(slug, read_page=None):
    if read_page is None:
        read_page = read
    path = '/guide/' + slug + '.html'
    for attempt in range(3):
        try:
            html = read_page(path)
            match = re.search(r'<!--EB_MODELS-->(.*?)<!--/EB_MODELS-->', html, re.S)
            assert match, slug + ': final catalog missing'
            assert html.index('<!--/EB_BUYER-->') < match.start(), slug + ': catalog nested in buyer'
            assert match[1].count('class="dc-card"') == len(DATA['products']), slug
            md = read_page(path, 'text/markdown')
            assert match[1].count('data-catalog-drain-entry') == 1, slug + ': quick entry missing'
            assert 'Abfluss höher als der Geräteauslass?' in md, slug + ': quick answer missing from mirror'
            assert match[1].count('id="ablauf-vor-kauf"') == 1, slug + ': drain answer missing'
            for surface in [match[1], md]:
                assert 'Ein Schlauchanschluss allein bestätigt keine Pumpe.' in surface, slug + ': drain limitation missing'
                assert 'weder den deutschen Lieferumfang noch die Eignung der Arete Two 12L' in surface, slug + ': market/model caveat missing'
            if slug == 'luftentfeuchter-keller':
                choices = re.search(r'<nav class="dc-drain-paths".*?</nav>', match[1], re.S)
                assert choices, 'Cellar drainage model choices missing'
                for model in ('stadler-lukas', 'meaco-one-20'):
                    assert f'href="#modell-{model}"' in choices[0]
                    assert match[1].count(f'id="modell-{model}"') == 1
                for surface in (match[1], md):
                    assert 'Sein Ende muss tiefer liegen als der Anfang.' in surface
                    assert '1,97 L/Tag bei 111 W' in surface, 'Cold-condition Arete Two data missing'
                assert 'id="kaelte-pruefwerte"' in html
                assert '3,4 L/Tag bei 180 W' in md and 'Meaco DE, Herstellerdaten' in md
            for product in DATA['products']:
                for surface in [match[1], md]:
                    assert product['name'] in surface and product['source'] in surface, slug + ': evidence missing'
            assert 'amazon.de' not in md and 'getecoback-21' not in md, slug + ': commerce in AI mirror'
            return slug
        except (AssertionError, OSError):
            if attempt == 2:
                raise
            time.sleep(2)

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--site-dir', type=Path, help='Read completed generated artifacts without using the network')
    args = parser.parse_args()
    if args.site_dir:
        def reader(path, accept='text/html'):
            target = args.site_dir / path.lstrip('/')
            return (target.with_suffix('.md') if accept == 'text/markdown' else target).read_text(encoding='utf-8')
    else:
        reader = read
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        paths = list(pool.map(lambda slug: check(slug, reader), DATA['pages']))
    label = 'Final generated catalog and Markdown' if args.site_dir else 'Live catalog and negotiated Markdown'
    print(label + ' verified: ' + ', '.join(paths) + '; no business events sent')


if __name__ == '__main__':
    main()
