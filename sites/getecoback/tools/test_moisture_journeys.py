"""Check actual catalog preservation and reasoned route policy, not styling."""
from html.parser import HTMLParser
from contextlib import redirect_stdout
from io import StringIO
from pathlib import Path
import re
import shutil
import tempfile
import unittest
from unittest.mock import patch
from urllib.parse import urlsplit

import build_structure
from moisture_journeys import (
    COMMERCE_DEFER_SLUGS, GUIDE_NEXT, ROUTE_META, category_content, category_inventory,
    render_next_steps,
)

SITE = Path(__file__).resolve().parents[1] / 'site'


class Document(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.links, self.ids, self.entries = [], [], []
        self.heading_links = []
        self._in_h3, self._heading_link = False, None
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'h3':
            self._in_h3 = True
        if tag == 'a':
            self.links.append(attrs.get('href', ''))
            if self._in_h3:
                self._heading_link = {'url': attrs.get('href', ''), 'title': ''}
        if attrs.get('id'):
            self.ids.append(attrs['id'])
        if attrs.get('data-journey-article'):
            self.entries.append(attrs['data-journey-article'])

    def handle_data(self, data):
        if self._heading_link is not None:
            self._heading_link['title'] += data

    def handle_endtag(self, tag):
        if tag == 'a' and self._heading_link is not None:
            self.heading_links.append(self._heading_link)
            self._heading_link = None
        if tag == 'h3':
            self._in_h3 = False


class MoistureJourneys(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.articles = build_structure.collect_articles()['luftqualitaet']
        cls.output = category_content(cls.articles)
        cls.document = Document(cls.output)

    def test_real_inventory_survives_grouping_exactly_once(self):
        self.assertGreater(len(self.articles), 30)
        self.assertCountEqual(self.document.entries, [a['slug'] for a in self.articles])
        for article in self.articles:
            self.assertEqual(self.document.links.count(article['url']), 1)
        self.assertIn('<details id="weitere-luftqualitaet-ratgeber">', self.output)
        self.assertIn('/guide/luftentfeuchter-ratgeber.html#eb-moisture-choice', self.document.links)
        self.assertIn('/guide/luftreiniger-ratgeber.html', self.document.links)
        self.assertEqual(self.document.ids.count('eb-air-decisions'), 1)
        self.assertNotIn('amazon.', self.output)

    def test_structured_inventory_matches_actual_heading_order_and_overrides(self):
        inventory = category_inventory(iter(self.articles))
        self.assertEqual(inventory, self.document.heading_links)
        self.assertEqual(len(inventory), len(self.articles))
        by_url = {item['url']: item['title'] for item in inventory}
        base = 'https://getecoback.com/guide/'
        self.assertEqual(inventory[0]['url'], base + 'luftfeuchtigkeit-richtig-messen.html')
        self.assertEqual(by_url[base + 'luftentfeuchter-ratgeber.html'],
                         'Entfeuchter: Bedarf und Modelldaten prüfen')
        self.assertEqual(by_url[base + 'meacodry-arete-one-test.html'],
                         'MeacoDry Arete: Produktfamilie einordnen')
        self.assertEqual(by_url[base + 'luftentfeuchter-10-qm.html'],
                         'Luftentfeuchter für 10 m²: Raumgröße einordnen')

    def test_primary_stages_are_ordered_and_not_merchant_shelves(self):
        stages = ['feuchte-verstehen', 'entfeuchter-auswaehlen',
                  'waesche-und-betrieb', 'geraet-pruefen', 'partikel-filtern']
        positions = [self.output.index(f'id="{stage}"') for stage in stages]
        self.assertEqual(positions, sorted(positions))
        for size in (10, 15, 20, 25, 30, 40):
            match = re.search(r'data-journey-article="luftentfeuchter-' + str(size) + r'-qm"(.*?)</div>', self.output, re.S)
            self.assertIsNotNone(match)
            self.assertNotRegex(match.group(1), r'\d+\s*(?:L|Liter)/Tag')
            self.assertIn('Die Fläche allein', match.group(1))

    def test_native_task_jumps_target_existing_sections_before_first_cards(self):
        navigation = re.search(r'<nav class="eco-journey-nav".*?</nav>', self.output, re.S).group(0)
        self.assertIn('aria-label="Direkt zur Aufgabe"', navigation)
        links = Document(navigation).links
        self.assertEqual(links, ['#feuchte-verstehen', '#entfeuchter-auswaehlen',
                                 '#waesche-und-betrieb', '#geraet-pruefen', '#partikel-filtern'])
        for href in links:
            self.assertEqual(self.document.ids.count(href[1:]), 1)
        self.assertIn('Ein Gerät auswählen</a>', navigation)
        self.assertIn('Partikel aus der Luft filtern</a>', navigation)
        self.assertLess(self.output.index(navigation), self.output.index('data-journey-article='))
        # A partial catalog must not acquire a jump to an absent group.
        single = category_content([next(a for a in self.articles if a['slug'] == 'luftentfeuchter-ratgeber')])
        single_nav = re.search(r'<nav class="eco-journey-nav".*?</nav>', single, re.S).group(0)
        self.assertEqual(Document(single_nav).links, ['#entfeuchter-auswaehlen'])

    def test_unreviewed_future_article_is_preserved_in_archive(self):
        extra = {'slug': 'future-test', 'url': 'https://getecoback.com/guide/future-test.html',
                 'title': 'Title <test>', 'desc': 'Description & context'}
        result = category_content(self.articles + [extra])
        self.assertIn('Title &lt;test&gt;', result)
        self.assertIn('Description &amp; context', result)
        self.assertGreater(result.index('data-journey-article="future-test"'), result.index('<details'))
        inventory = category_inventory(self.articles + [extra])
        self.assertEqual(inventory, Document(result).heading_links)
        self.assertEqual(inventory[-1], {'url': extra['url'], 'title': extra['title']})

    def test_metadata_routes_and_anchors_are_real_and_not_self_reload(self):
        for route, steps in GUIDE_NEXT.items():
            with self.subTest(route=route):
                self.assertTrue((SITE / route.lstrip('/')).is_file(), route)
                self.assertLessEqual(len(steps), 2)
                self.assertGreater(len(steps), 0)
                for step in steps:
                    self.assertTrue(step['label'].strip())
                    self.assertTrue(step['why'].strip())
                    target = urlsplit(step['href'])
                    self.assertEqual(target.netloc, '')
                    self.assertNotEqual(target.path, route)
                    page = SITE / target.path.lstrip('/')
                    self.assertTrue(page.is_file(), step['href'])
                    if target.fragment:
                        self.assertRegex(page.read_text(), r'id=["\']' + re.escape(target.fragment) + r'["\']')

    def test_deferred_commerce_is_exactly_reviewed_diagnostic_or_repair_routes(self):
        self.assertEqual(len(COMMERCE_DEFER_SLUGS), 8)
        self.assertIn('luftentfeuchter-zieht-kein-wasser', COMMERCE_DEFER_SLUGS)
        self.assertIn('luftfeuchtigkeit-senken', COMMERCE_DEFER_SLUGS)
        self.assertNotIn('luftentfeuchter-ratgeber', COMMERCE_DEFER_SLUGS)
        for route, meta in ROUTE_META.items():
            if Path(route).stem in COMMERCE_DEFER_SLUGS:
                self.assertIn(meta['role'], ('measure', 'diagnose', 'repair'))

    def test_shared_next_steps_are_localized_and_reasoned(self):
        for route in GUIDE_NEXT:
            block = render_next_steps(route)
            heading = 'Next step' if route.startswith('/en/') else 'Dein nächster Schritt'
            self.assertIn('>' + heading + '</h2>', block)
            self.assertIn('aria-label="' + heading + '"', block)
            self.assertEqual(block.count('<!--EB_RELATED-->'), 1)
            self.assertEqual(Document(block).links, [item['href'] for item in GUIDE_NEXT[route]])
            self.assertNotIn('data-country-action', block)
            for item in GUIDE_NEXT[route]:
                self.assertIn(item['why'], block)

    def test_late_country_rebuild_retains_one_owned_measurement_handoff(self):
        import build_country_categories as country
        route = '/guide/luftfeuchtigkeit-richtig-messen.html'
        with tempfile.TemporaryDirectory(prefix='eco-moisture-country-') as directory:
            target = Path(directory)
            (target / 'assets').mkdir()
            for asset in ('country-categories.css', 'country-categories.js'):
                shutil.copyfile(SITE / 'assets' / asset, target / 'assets' / asset)
            with patch.object(country, 'SITE', target), patch.object(country, 'discovery'), redirect_stdout(StringIO()):
                country.main()
                first = (target / route.lstrip('/')).read_text()
                country.main()
                final = (target / route.lstrip('/')).read_text()
        self.assertEqual(first, final)
        self.assertEqual(final.count('<!--EB_RELATED-->'), 1)
        self.assertEqual(final.count('id="eb-journey-next"'), 1)
        self.assertNotIn('<h2>Der nächste Schritt</h2>', final)
        block = re.search(r'<!--EB_RELATED-->.*?<!--/EB_RELATED-->', final, re.S).group(0)
        self.assertEqual(Document(block).links, [item['href'] for item in GUIDE_NEXT[route]])
        self.assertEqual(block.count('data-country-action="guide"'), 2)
        self.assertGreater(final.index('Alle Wohn-Themen für Deutschland'), final.index('<!--/EB_RELATED-->'))
        for original_anchor in ('messort', 'protokoll', 'einordnen', 'auswahl', 'sources'):
            self.assertIn('id="' + original_anchor + '"', final)
        self.assertIn('data-country-shop="DE"', final)


if __name__ == '__main__':
    unittest.main()
