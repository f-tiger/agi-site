"""Release regression for exact model/package evidence and stale-commerce handling."""
import copy
import datetime as dt
import re
import unittest
from urllib.parse import parse_qs, urlsplit
from html import unescape

import thermostat_catalog as catalog
from build_winter_guides import page, PAGES


class CatalogTests(unittest.TestCase):
    def test_all_sources_and_exact_queries(self):
        data = catalog.load()
        self.assertEqual(len(data['products']), 3)
        text = catalog.render(today=dt.date(2026, 11, 12), data=data)
        links = re.findall(r'href="([^"]*amazon[^\"]*)"', text)
        self.assertEqual(len(links), 3)
        for link, product in zip(links, data['products']):
            url = urlsplit(unescape(link))
            self.assertEqual(url.netloc, 'www.amazon.de')
            self.assertEqual(url.path, '/s')
            self.assertEqual(parse_qs(url.query), {'k': [product['query']], 'tag': ['getecoback-21']})
            self.assertIn(product['source'], text)
        self.assertIn('Modellsuchen', text)
        self.assertIn('vorhandene Köpfe weiter nutzen', text)

    def test_stale_unverified_and_future_evidence_remove_only_merchant_links(self):
        data = catalog.load()
        for day in [dt.date(2026, 11, 11), dt.date(2027, 2, 11)]:
            html = catalog.render(today=day, data=data)
            self.assertNotIn('amazon.de/s?', html)
            self.assertIn('tado° Smartes Heizkörper-Thermostat X', html)
            self.assertIn('Quellenprüfung ausstehend', html)
        old = copy.deepcopy(data)
        old['products'][0]['status'] = 'unverified'
        html = catalog.render(today=dt.date(2026, 11, 12), data=old)
        self.assertEqual(html.count('amazon.de/s?'), 2)

    def test_generator_preserves_catalog_and_v3_scope(self):
        html = page(catalog.SLUG, PAGES[catalog.SLUG])
        self.assertEqual(html.count('id="eb-thermostat-products"'), 1)
        self.assertIn('keine Übertragung auf tado° X', html)
        self.assertIn('nicht miteinander kompatibel', html)
        self.assertIn('Thread Border Router', html)
        self.assertIn('FRITZ!OS ab 6.83', html)
        self.assertIn('Schweiz', html)
        self.assertIn('keinen Schweizer Händler', html)
        self.assertIn('0 %', html)
        self.assertIn('12. November 2026', html)
        self.assertIn('"dateModified": "2026-11-13"', html)
        self.assertEqual(html, page(catalog.SLUG, PAGES[catalog.SLUG]))

    def test_other_winter_pages_do_not_gain_thermostats(self):
        slug = 'heizkoerper-wird-nicht-warm'
        self.assertNotIn('id="eb-thermostat-products"', page(slug, PAGES[slug]))

    def test_markdown_retains_model_evidence_without_merchant_urls(self):
        from build_agent_md import to_markdown
        html = page(catalog.SLUG, PAGES[catalog.SLUG])
        md = to_markdown(html, '/guide/' + catalog.SLUG + '.html', 'de')
        for product in catalog.load()['products']:
            self.assertIn(product['name'], md)
            self.assertIn(product['source'], md)
            if product.get('manual'):
                self.assertIn(product['manual'], md)
        self.assertIn('**System:**', md)
        self.assertIn('**Paket und Zusatzkauf:**', md)
        self.assertIn('Lohnt sich ein smartes Heizkörperthermostat für mich?', md)
        self.assertNotIn('SystemBridge', md)
        self.assertNotIn('amazon.de/', md)
        self.assertNotIn('getecoback-21', md)
        self.assertIn('nicht miteinander kompatibel', md)

    def test_final_artifact_not_only_generator(self):
        html = (catalog.ROOT / 'site/guide' / (catalog.SLUG + '.html')).read_text()
        self.assertEqual(html.count('id="eb-thermostat-products"'), 1)
        self.assertLess(html.index('id="thermostat-start"'), html.index('id="ventilcheck"'))
        for target in ['eb-thermostat-products', 'ventilcheck', 'thermostat-paketkosten', 'thermostat-behalten']:
            self.assertIn('href="#' + target + '"', html)
            self.assertEqual(html.count('id="' + target + '"'), 1)
        for p in catalog.load()['products']:
            self.assertIn('id="thermostat-' + p['id'] + '"', html)
            self.assertIn(p['source'], html)


if __name__ == '__main__':
    unittest.main()
