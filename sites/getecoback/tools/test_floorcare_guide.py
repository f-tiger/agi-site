#!/usr/bin/env python3
"""Evidence, commerce and final-artifact regression gates for the buying guide."""
import copy
import datetime as dt
from html.parser import HTMLParser
import json
import re
import unittest
from urllib.parse import urlsplit, parse_qs
import build_floorcare_guide as guide
from agent_sources import citation_url
from build_agent_md import to_markdown


class Page(HTMLParser):
    def __init__(self, html):
        super().__init__(convert_charrefs=True)
        self.links = []
        self.ids = []
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if 'id' in a:
            self.ids.append(a['id'])
        if tag == 'a':
            self.links.append(a)


class FloorcareGuide(unittest.TestCase):
    def setUp(self):
        self.data = guide.load()
        self.html = guide.render(today=dt.date(2026, 11, 12))

    def test_exact_searches_not_guessed_products(self):
        links = [a for a in Page(self.html).links if urlsplit(a.get('href', '')).hostname == 'www.amazon.de']
        self.assertEqual(len(links), 3)
        expected = {p['query'] for p in self.data['products']}
        self.assertEqual({parse_qs(urlsplit(a['href']).query)['k'][0] for a in links}, expected)
        for a in links:
            self.assertEqual(urlsplit(a['href']).path, '/s')
            self.assertEqual(parse_qs(urlsplit(a['href']).query)['tag'], ['getecoback-21'])
            self.assertTrue({'sponsored','nofollow','noopener'} <= set(a['rel'].split()))
        self.assertIn('Suchergebnisse, keine feste Produktseite', self.html)

    def test_stale_or_conflicted_evidence_closes_commerce(self):
        self.assertNotIn('https://www.amazon.', guide.render(today=dt.date(2027, 2, 11)))
        self.assertNotIn('https://www.amazon.', guide.render(today=dt.date(2026, 11, 11)))
        d = copy.deepcopy(self.data)
        d['products'][0]['status'] = 'conflict'
        result = guide.render(today=dt.date(2026, 11, 12), data=d)
        self.assertEqual(len([a for a in Page(result).links if 'www.amazon.de' in a.get('href', '')]), 2)
        self.assertIn(d['products'][0]['name'], result)
        self.assertIn('Quellenprüfung ausstehend', result)

    def test_sources_survive_markdown_and_commerce_does_not(self):
        md = to_markdown(self.html, guide.URL, 'de')
        for src in self.data['sources'].values():
            self.assertEqual(citation_url(src['url']), src['url'])
            self.assertIn(src['url'], md)
        for p in self.data['products']:
            self.assertIn(p['name'], md)
            self.assertIn(p['variant'], md)
        self.assertNotIn('amazon.de/', md)
        self.assertNotIn('getecoback-21', md)
        self.assertIn('zusätzliche Nachpflege', md)
        self.assertIn('musst du nichts kaufen', md)

    def test_schema_and_visible_faq_agree(self):
        schema = json.loads(re.search(r'<script type="application/ld\+json">(.*?)</script>', self.html, re.S)[1])
        questions = schema['@graph'][1]['mainEntity']
        self.assertEqual(len(questions), len(guide.FAQ))
        for q in questions:
            self.assertIn('<summary>' + q['name'] + '</summary>', self.html)
            self.assertIn('<p>' + q['acceptedAnswer']['text'] + '</p>', self.html)
        self.assertNotIn('aggregateRating', json.dumps(schema))
        self.assertNotIn('offers', json.dumps(schema))
        self.assertTrue(120 <= len(guide.DESCRIPTION) <= 155)

    def test_final_file_contains_buying_path_without_generic_air_conditioners(self):
        # Read committed/generated artifact first: do not let reinjection mask a bad build.
        final = guide.TARGET.read_text()
        for p in self.data['products']:
            self.assertIn('id="' + p['id'] + '"', final)
        self.assertIn('/rechner.html#home-fit-floor', final)
        self.assertIn('id="land-pruefen"', final)
        for unwanted in ['Pinguino', 'MAP14HS1TBL', 'Whynter NEX', 'BPACT14WT', 'DeLonghi EX105']:
            self.assertNotIn(unwanted, final)
        parsed = Page(final)
        self.assertEqual(len(parsed.ids), len(set(parsed.ids)))
        for a in parsed.links:
            href = a.get('href', '')
            if href.startswith('#') and len(href) > 1:
                self.assertIn(href[1:], parsed.ids)


if __name__ == '__main__':
    unittest.main()
