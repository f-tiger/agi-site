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
        self.assertIn('"dateModified": "2026-11-26"', html)
        self.assertEqual(html.count('id="tado-x-oventrop"'), 1)
        self.assertIn('4026755228717', html)
        self.assertEqual(html, page(catalog.SLUG, PAGES[catalog.SLUG]))

    def test_other_winter_pages_do_not_gain_thermostats(self):
        slug = 'heizkoerper-wird-nicht-warm'
        self.assertNotIn('id="eb-thermostat-products"', page(slug, PAGES[slug]))

    def test_offline_choice_preserves_source_limits_and_model_links(self):
        from build_agent_md import to_markdown
        html = page(catalog.SLUG, PAGES[catalog.SLUG])
        mirror = to_markdown(html, '/guide/' + catalog.SLUG + '.html', 'de')
        self.assertEqual(html.count('id="thermostat-ohne-internet"'), 1)
        self.assertIn('href="#thermostat-ohne-internet"', html)
        section = html.split('aria-labelledby="thermostat-ohne-internet">', 1)[1].split('</section>', 1)[0]
        for document in (section, mirror):
            for phrase in (
                'Nach der Kalibrierung', 'am Drehknopf einstellen', 'Matter-System gekoppelt sein',
                'unterbrochener DECT-Verbindung', 'Die automatische Schaltung ist dabei eingeschränkt',
                'warte mit der Bestellung', '#thermostat-bosch-ii-m', '#thermostat-fritz-302',
                'V001_BTH-RAD_OM_11L_20240819.pdf', '3523_Verhalten-des-FRITZ-Heizkorperreglers',
            ):
                self.assertIn(phrase, document)
            self.assertNotIn('amazon.de/', document)

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
        self.assertIn('8750002861', md)
        self.assertIn('4062321692636', md)
        self.assertIn('#bosch-ii-m-danfoss-adapter', md)
        self.assertIn('#fritz-302-danfoss-adapter', md)
        self.assertIn('?market=de-de', md)
        self.assertNotIn('SystemBridge', md)
        self.assertNotIn('amazon.de/', md)
        self.assertNotIn('getecoback-21', md)
        self.assertIn('nicht miteinander kompatibel', md)

    def test_final_artifact_not_only_generator(self):
        html = (catalog.ROOT / 'site/guide' / (catalog.SLUG + '.html')).read_text()
        self.assertEqual(html.count('id="eb-thermostat-products"'), 1)
        self.assertLess(html.index('id="thermostat-start"'), html.index('id="ventilcheck"'))
        for target in ['eb-thermostat-products', 'ventilcheck', 'thermostat-paketkosten', 'thermostat-behalten', 'bosch-ii-m-danfoss-adapter', 'fritz-302-danfoss-adapter']:
            self.assertIn('href="#' + target + '"', html)
            self.assertEqual(html.count('id="' + target + '"'), 1)
        for p in catalog.load()['products']:
            self.assertIn('id="thermostat-' + p['id'] + '"', html)
            self.assertIn(p['source'], html)

    def test_both_valve_answers_reach_their_existing_model_cards(self):
        source = catalog.ROOT / 'site/guide' / (catalog.SLUG + '.html')
        html = source.read_text()
        md = source.with_suffix('.md').read_text()
        for section, target, limit in (
            ('bosch-ii-m-danfoss-adapter', 'thermostat-bosch-ii-m', 'separat benötigten Adapter'),
            ('fritz-302-danfoss-adapter', 'thermostat-fritz-302', 'welcher Zusatzadapter passt'),
        ):
            with self.subTest(section=section):
                answer = html.split('id="' + section + '"', 1)[1].split('</section>', 1)[0]
                self.assertEqual(answer.count('href="#' + target + '"'), 1)
                self.assertEqual(html.count('id="' + target + '"'), 1)
                self.assertIn('warte mit der Bestellung', answer)
                self.assertIn('Wenn du den Kopf ersetzen möchtest', answer)
                self.assertIn(limit, answer)
                self.assertIn(limit, md)
                self.assertIn('/guide/' + catalog.SLUG + '.html#' + target, md)
                self.assertNotIn('amazon.de/', answer)


    def test_bosch_e03_has_the_same_source_and_no_unconfirmed_buy_in_built_surfaces(self):
        from build_agent_md import to_markdown
        slug = catalog.SLUG
        source = catalog.ROOT / 'site/guide' / (slug + '.html')
        heading = 'Bosch II [+M] zeigt E03: Kalibrierung prüfen'
        facts = ('8750002861', 'Kalibrierung fehlgeschlagen', 'Ventilstift klemmt',
                 'runde Taste am Kopf', 'Bosch-Service', 'RA und RAVL liegen bei',
                 'eindeutig bestätigtem Danfoss RAV', '8750002600', 'warte mit der Bestellung',
                 '8-750-002-924_BTH-RAD_OM_11L.pdf', 'Druckseiten 47–48')
        for html in (page(slug, PAGES[slug]), source.read_text()):
            self.assertEqual(html.count('id="bosch-ii-m-e03"'), 1)
            self.assertIn('href="#bosch-ii-m-e03"', html)
            section = html.split('id="bosch-ii-m-e03"', 1)[1].split('</section>', 1)[0]
            self.assertIn(heading, section)
            for fact in facts:
                self.assertIn(fact, section)
            self.assertNotIn('amazon.de/', section)
            self.assertNotIn('getecoback-21', section)
        for md in (to_markdown(page(slug, PAGES[slug]), '/guide/' + slug + '.html', 'de'),
                   source.with_suffix('.md').read_text()):
            answer = md.split('#### ' + heading, 1)[1].split('### ', 1)[0]
            for fact in facts:
                self.assertIn(fact, answer)
            self.assertNotIn('amazon.de/', answer)


if __name__ == '__main__':
    unittest.main()
