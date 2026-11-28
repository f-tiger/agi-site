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
            if slug == 'luftentfeuchter-ratgeber':
                assert html.count('id="schnell-entscheidung"') == 1
                assert html.index('id="schnell-entscheidung"') < html.index('<!--EB_BUYER-->')
                table = re.search(r'<details data-choice-method[^>]*>.*?<table>(.*?)</table>', html, re.S)
                assert table and 'nicht verifiziert' not in table[1] and 'Comfee' not in table[1]
                for text in ('MeacoDry Arete One 20L', 'MeacoDry Arete Two 12L', '3,4 L/Tag · 180 W',
                             '1,97 L/Tag · 111 W', '8,5 L/Tag · 216 W', '5,4 L/Tag · 136 W'):
                    assert text in table[1] and text in md, slug + ': incomplete condition comparison'
            if slug == 'luftentfeuchter-keller':
                choices = re.search(r'<nav class="dc-drain-paths".*?</nav>', match[1], re.S)
                assert choices, 'Cellar drainage model choices missing'
                for model in ('stadler-lukas', 'meaco-one-20'):
                    assert f'href="#modell-{model}"' in choices[0]
                    assert match[1].count(f'id="modell-{model}"') == 1
                for surface in (match[1], md):
                    assert 'Sein Ende muss tiefer liegen als der Anfang.' in surface
                    assert '1,97 L/Tag bei 111 W' in surface, 'Cold-condition Arete Two data missing'
                station = re.search(r'<section\b[^>]* id="modellwahl-de".*?</section>', html, re.S)
                assert station, 'German model decision missing'
                for target in ('kaelte-pruefwerte', 'ablauf-vor-kauf', 'datenblatt'):
                    assert html.count(f'id="{target}"') == 1
                    assert f'href="#{target}"' in station[0], target
                assert 'sponsored' not in station[0] and 'amazon.' not in station[0]
                assert not re.search(r'amazon\.de/s\?k=luftentfeuchter\+(?:keller|mit\+schlauch)', html, re.I)
                assert 'Vom Messwert zum passenden Modell' in md and 'den Kauf verschieben' in md
                for surface in (match[1], md):
                    assert '12,5 mm Innendurchmesser' in surface, 'German hose dimension missing'
                    assert 'Die Arete Two 12L steht nicht auf dieser Liste.' in surface
                    assert 'german-meacodry-arete-one-20l-and-25l_1.pdf' in surface
                    assert 'aretetwo-10l12l-manual-de02-160424_1.pdf' in surface
                assert '3,4 L/Tag bei 180 W' in md and 'Meaco DE, Herstellerdaten' in md
                assert '5,4 L/Tag bei 136 W' in md and 'meacodry-arete-two-12l-luftentfeuchter-luftreiniger' in md
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
