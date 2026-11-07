"""Check actual catalog preservation and reasoned route policy, not styling."""
from html.parser import HTMLParser
from html import escape
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
import build_onpage
import check_related
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


class CuratedRelatedGate(unittest.TestCase):
    """The owned handoff can cite an existing destination, never drift silently."""

    def test_all_reviewed_routes_accept_both_owned_renderers_and_body_citations(self):
        self.assertEqual(len(GUIDE_NEXT), 17)
        for route, steps in GUIDE_NEXT.items():
            for country_actions in (False, True):
                with self.subTest(route=route, country_actions=country_actions):
                    block = render_next_steps(route, country_actions=country_actions)
                    citation = '<p>See <a href="' + escape(steps[0]['href'], quote=True) + '">the existing explanation</a>.</p>'
                    html = '<article><h1>Existing guide</h1>' + citation + block + '</article>'
                    self.assertEqual(check_related.check_curated_block(route, html), [])

    def test_only_the_localized_onpage_heading_id_is_an_accepted_mutation(self):
        for route in GUIDE_NEXT:
            for country_actions in (False, True):
                with self.subTest(route=route, country_actions=country_actions):
                    block = render_next_steps(route, country_actions=country_actions)
                    heading_id = 'next-step' if route.startswith('/en/') else 'dein-naechster-schritt'
                    sections = ''.join('<h2>Existing section ' + str(i) + '</h2><p>Original guide content.</p>'
                                       for i in range(build_onpage.MIN_H2))
                    onpage = build_onpage.inject_toc('<article>' + sections + block + '</article>', route.startswith('/en/'))
                    self.assertIn('id="' + heading_id + '"', onpage)
                    self.assertEqual(check_related.check_curated_block(route, onpage), [])
                    wrong_id = onpage.replace('id="' + heading_id + '"', 'id="unreviewed-handoff"', 1)
                    self.assertTrue(check_related.check_curated_block(route, wrong_id))

    def test_changed_destination_label_or_reason_and_missing_reason_fail(self):
        for route, steps in GUIDE_NEXT.items():
            block = render_next_steps(route)
            first = steps[0]
            reason = escape(first['why'])
            changes = {
                'destination': block.replace(escape(first['href'], quote=True), '/guide/unreviewed.html', 1),
                'label': block.replace(escape(first['label']), 'Different advice', 1),
                'reason_changed': block.replace(reason, 'Unreviewed reason', 1),
                'reason_removed': block.replace(reason, '', 1),
            }
            for mutation, html in changes.items():
                with self.subTest(route=route, mutation=mutation):
                    self.assertNotEqual(html, block)
                    self.assertTrue(check_related.check_curated_block(route, html))

    def test_extra_handoff_or_link_is_rejected_even_with_approved_destinations(self):
        for route, steps in GUIDE_NEXT.items():
            block = render_next_steps(route)
            href = escape(steps[0]['href'], quote=True)
            extra = '<a href="' + href + '">One more action</a>'
            for mutation, html in (
                ('additional_step', block.replace('</ul>', '<li>' + extra + '<p>Extra reason</p></li></ul>', 1)),
                ('link_outside_list', block.replace('</nav>', extra + '</nav>', 1)),
            ):
                with self.subTest(route=route, mutation=mutation):
                    self.assertTrue(check_related.check_curated_block(route, html))

    def test_missing_partial_and_duplicate_marker_pairs_fail(self):
        route = next(iter(GUIDE_NEXT))
        block = render_next_steps(route)
        cases = {
            'missing_block': '<article><h1>Existing guide without its handoff</h1></article>',
            'missing_open': block.replace('<!--EB_RELATED-->', '', 1),
            'missing_close': block.replace('<!--/EB_RELATED-->', '', 1),
            'duplicate_block': block + block,
            'stray_open': block + '<!--EB_RELATED-->',
            'stray_close': '<!--/EB_RELATED-->' + block,
        }
        for mutation, html in cases.items():
            with self.subTest(mutation=mutation):
                self.assertTrue(check_related.check_curated_block(route, html))

    def run_site_gate(self, overrides):
        """Exercise main's routing too, with all approved routes represented."""
        pages = {route: '<article>' + render_next_steps(route) + '</article>' for route in GUIDE_NEXT}
        pages.update(overrides)
        # The gate checks real destinations as well as block ownership. Supply
        # every referenced path/fragment so each mutation tests its own fault.
        targets = {}
        for steps in GUIDE_NEXT.values():
            for step in steps:
                target = urlsplit(step['href'])
                targets.setdefault(target.path, set())
                if target.fragment:
                    targets[target.path].add(target.fragment)
        for target, fragments in targets.items():
            pages.setdefault(target, '<article><h1>Existing destination</h1></article>')
            pages[target] += ''.join('<span id="' + escape(fragment, quote=True) + '"></span>' for fragment in fragments)
        with tempfile.TemporaryDirectory(prefix='eco-related-contract-') as directory:
            for route, html in pages.items():
                target = Path(directory) / route.lstrip('/')
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_text(html)
            with patch.object(check_related, 'SITE', directory), redirect_stdout(StringIO()):
                return check_related.main()

    def test_main_checks_curated_pages_even_when_their_block_is_missing(self):
        self.assertEqual(self.run_site_gate({}), 0)
        route = next(iter(GUIDE_NEXT))
        self.assertNotEqual(self.run_site_gate({route: '<article><h1>Missing next steps</h1></article>'}), 0)

    def test_noncore_impersonation_and_generic_duplicate_rules_still_fail(self):
        route = next(iter(GUIDE_NEXT))
        impersonation = render_next_steps(route)
        unreviewed = '/guide/unreviewed-moisture-copy.html'
        self.assertTrue(check_related.check_curated_block(unreviewed, impersonation))
        self.assertNotEqual(self.run_site_gate({unreviewed: impersonation}), 0)
        duplicate = ('<article><a href="/guide/existing.html">Body citation</a>'
                     '<!--EB_RELATED--><aside><a href="/guide/existing.html">Related</a></aside>'
                     '<!--/EB_RELATED--></article>')
        self.assertNotEqual(self.run_site_gate({unreviewed: duplicate}), 0)


if __name__ == '__main__':
    unittest.main()
