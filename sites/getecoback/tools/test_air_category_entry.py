"""Air-quality discovery should lead to the relevant decision before a merchant."""
from html.parser import HTMLParser
from pathlib import Path
import re
import unittest

import build_structure as B


class Anchors(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'a':
            self.links.append(attrs.get('href', ''))


class AirCategoryEntry(unittest.TestCase):
    def test_qualified_existing_guides_replace_unconditional_shopping(self):
        section = B.shop_section('luftqualitaet')
        parser = Anchors()
        parser.feed(section)
        self.assertEqual(parser.links, [
            '/guide/luftentfeuchter-ratgeber.html#eb-moisture-choice',
            '/guide/luftreiniger-ratgeber.html',
        ])
        self.assertNotIn('amazon.', section)
        self.assertNotIn('Stoppt Feuchte', section)
        self.assertNotIn('ab 120', section)
        self.assertIn('keine bauliche Ursache', section)
        self.assertIn('andere Aufgabe als Luft entfeuchten', section)
        for href in parser.links:
            route, _, fragment = href.partition('#')
            text = (Path(B.SITE) / route.lstrip('/')).read_text()
            if fragment:
                self.assertRegex(text, r'id=["\']' + re.escape(fragment) + r'["\']')

    def test_air_hub_keeps_its_crawlable_guide_inventory(self):
        guides = B.collect_articles()['luftqualitaet']
        output = B.hub_page('luftqualitaet', guides)
        parser = Anchors()
        parser.feed(output)
        self.assertGreater(len(guides), 20)
        for guide in guides:
            self.assertIn(guide['url'], parser.links)
        self.assertEqual(output.count('id="eb-air-decisions"'), 1)
        self.assertIn('https://getecoback.com/kategorie/luftqualitaet.html', output)


if __name__ == '__main__':
    unittest.main()
