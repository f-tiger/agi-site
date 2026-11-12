#!/usr/bin/env python3
"""Source freshness, variant boundaries and final-artifact gates for robot buyers."""
import copy
import datetime as dt
from html import escape
from html.parser import HTMLParser
import json
import re
import unittest
from urllib.parse import parse_qs, urlsplit
import build_robot_guide as guide
from agent_sources import citation_url
from build_agent_md import to_markdown

TODAY = dt.date(2026, 11, 12)


class Page(HTMLParser):
    def __init__(self, text):
        super().__init__(convert_charrefs=True)
        self.links, self.ids = [], []
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs:
            self.ids.append(attrs['id'])
        if tag == 'a':
            self.links.append(attrs)


def searches(text):
    return [a for a in Page(text).links if urlsplit(a.get('href', '')).hostname == 'www.amazon.de']


class RobotGuide(unittest.TestCase):
    def setUp(self):
        self.data = guide.load()
        self.html = guide.render(today=TODAY)

    def test_model_boundaries_do_not_turn_double_steps_into_single_steps(self):
        products = {p['id']: p for p in self.data['products']}
        saros = products['roborock-saros-10r']
        self.assertEqual(saros['threshold']['double_mm'], 40)
        self.assertIsNone(saros['threshold']['single_mm'])
        self.assertIn('Doppelschwellen', saros['threshold_note'])
        self.assertIn('keine einzelne 4-cm-Kante', saros['threshold_note'])
        self.assertIn('aktiviert', saros['floor'])
        self.assertIn('keine Stationsabmessungen', saros['dock'])
        self.assertIn('nicht 120 cm zusätzlich', saros['dock'])
        gen2 = products['dreame-l10s-ultra-gen2']
        self.assertEqual(gen2['model'], 'RLL32SE')
        self.assertIn('5 cm', gen2['dock'])
        self.assertNotIn('0,5 m', gen2['dock'])
        self.assertIn('Gen 3', gen2['variant'])
        d10 = products['dreame-d10-plus-gen2']
        self.assertEqual(d10['model'], 'RLD32GD')
        self.assertIn('RCDD0202', d10['variant'])
        self.assertIn('220–240 V', d10['variant'])
        self.assertIn('Keine automatische Moppanhebung', d10['floor'])
        self.assertIn('mehr als 0,5 m', d10['dock'])
        self.assertIn('keine Reinigungs- oder Desinfektionsmittel', d10['care'])
        self.assertNotIn('eufy-c10', products)
        # Preserve the reviewed interpretation; don't fabricate derived home-fit scores.
        self.assertNotIn('data-fit-score', self.html)
        self.assertNotIn('6 cm', saros['threshold_note'])

    def test_only_reviewed_models_have_disclosed_exact_searches(self):
        actual = searches(self.html)
        eligible = [p for p in self.data['products'] if guide.commerce_eligible(p, self.data, TODAY)]
        self.assertEqual(len(actual), len(eligible))
        self.assertEqual(len(actual), 3)
        self.assertEqual({parse_qs(urlsplit(a['href']).query)['k'][0] for a in actual}, {p['query'] for p in eligible})
        for link in actual:
            self.assertEqual(urlsplit(link['href']).path, '/s')
            self.assertEqual(parse_qs(urlsplit(link['href']).query)['tag'], ['getecoback-21'])
            self.assertTrue({'sponsored', 'nofollow', 'noopener'} <= set(link['rel'].split()))
        self.assertIn('Suchergebnisse, keine feste Produktseite', self.html)
        self.assertIn('keine Live-Preise'.lower(), self.html.lower())
        for product in self.data['products']:
            if product['status'] == 'conflict':
                self.assertIn(escape(product['hold_reason']), self.html)
                self.assertNotIn(product['query'], {parse_qs(urlsplit(a['href']).query)['k'][0] for a in actual})

    def test_source_conflict_hides_shop_search_but_keeps_comparison(self):
        # Regression from rejected C10 source: a locale page is not proof of mains suitability.
        data = copy.deepcopy(self.data)
        product = data['products'][0]
        product['status'] = 'conflict'
        product['hold_reason'] = 'Kaufverweis pausiert: Regionale Netzspannung in den Quellen widersprüchlich.'
        result = guide.render(today=TODAY, data=data)
        self.assertEqual(len(searches(result)), 2)
        self.assertIn(product['hold_reason'], result)
        self.assertIn(product['name'], result)
        self.assertNotIn(product['query'], {parse_qs(urlsplit(a['href']).query)['k'][0] for a in searches(result)})

    def test_expiry_includes_each_source_and_future_or_invalid_dates(self):
        self.assertFalse(searches(guide.render(today=TODAY + dt.timedelta(days=91))))
        self.assertFalse(searches(guide.render(today=TODAY - dt.timedelta(days=1))))
        self.assertTrue(searches(guide.render(today=TODAY + dt.timedelta(days=90))))
        for changed in ['source_date', 'product_date', 'source_status', 'source_missing', 'product_status']:
            with self.subTest(changed=changed):
                data = copy.deepcopy(self.data)
                product = next(p for p in data['products'] if p['status'] == 'verified')
                source = data['sources'][product['sources'][0]]
                if changed == 'source_date':
                    source['checked'] = '2026-11-13'
                elif changed == 'product_date':
                    product['checked'] = 'not-a-date'
                elif changed == 'source_status':
                    source['status'] = 'unverified'
                elif changed == 'source_missing':
                    del data['sources'][product['sources'][0]]
                else:
                    product['status'] = 'conflict'
                self.assertFalse(guide.commerce_eligible(product, data, TODAY))
        data = copy.deepcopy(self.data)
        data['market'] = 'US'
        for product in data['products']:
            self.assertFalse(guide.commerce_eligible(product, data, TODAY))

    def test_same_facts_and_sources_in_no_commerce_markdown(self):
        md = to_markdown(self.html, guide.URL, 'de')
        for source in self.data['sources'].values():
            self.assertEqual(citation_url(source['url']), source['url'])
            self.assertIn(source['url'], md)
        for product in self.data['products']:
            self.assertIn(product['name'], md)
            self.assertIn(product['threshold_note'], md)
            self.assertIn(product['variant'], md)
        self.assertNotIn('amazon.de/', md)
        self.assertNotIn('getecoback-21', md)
        self.assertIn('musst du nichts kaufen', md)
        self.assertIn('keine einzelne 4-cm-Kante', md)

    def test_faq_schema_is_visible_and_metadata_is_specific(self):
        schema = json.loads(re.search(r'<script type="application/ld\+json">(.*?)</script>', self.html, re.S)[1])
        questions = schema['@graph'][1]['mainEntity']
        self.assertEqual(len(questions), len(guide.FAQ))
        for question in questions:
            self.assertIn('<summary>' + escape(question['name']) + '</summary>', self.html)
            self.assertIn('<p>' + escape(question['acceptedAnswer']['text']) + '</p>', self.html)
        for unsupported in ['aggregateRating', 'reviewRating', 'offers']:
            self.assertNotIn(unsupported, json.dumps(schema))
        self.assertTrue(120 <= len(guide.DESCRIPTION) <= 155)
        self.assertIn('href="' + guide.URL + '"', self.html)

    def test_final_artifact_preserves_path_and_has_no_generic_models(self):
        # Deliberately read final output without rebuilding: catch later generator damage.
        final = guide.TARGET.read_text()
        for product in self.data['products']:
            self.assertIn('id="' + product['id'] + '"', final)
        self.assertIn('data-robot-guide', final)
        self.assertIn('/rechner.html#home-fit-robot', final)
        self.assertIn('id="wohnung-pruefen"', final)
        for unwanted in ['Pinguino', 'MAP14HS1TBL', 'Whynter NEX', 'BPACT14WT', 'DeLonghi EX105', 'EB_MODELS_BEGIN']:
            self.assertNotIn(unwanted, final)
        parsed = Page(final)
        self.assertEqual(len(parsed.ids), len(set(parsed.ids)))
        for link in parsed.links:
            href = link.get('href', '')
            if href.startswith('#') and len(href) > 1:
                self.assertIn(href[1:], parsed.ids)
        expected = searches(guide.render())
        self.assertEqual({a['href'] for a in searches(final)}, {a['href'] for a in expected})


if __name__ == '__main__':
    unittest.main()
