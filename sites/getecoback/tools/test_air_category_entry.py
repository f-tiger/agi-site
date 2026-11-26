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


class CoolingCategoryEntry(unittest.TestCase):
    def test_generated_cooling_hub_opens_owned_decisions_and_keeps_inventory(self):
        pages = B.collect_articles()['klimaanlagen']
        output = B.hub_page('klimaanlagen', pages)
        matches = re.findall(r'<section class="eb-shop" id="eb-cooling-decisions"[^>]*>.*?</section>', output, re.S)
        self.assertEqual(len(matches), 1)
        self.assertLess(output.index(matches[0]), output.index('<article>'))
        parser = Anchors()
        parser.feed(matches[0])
        self.assertEqual(parser.links, [
            '/guide/btu-rechner.html',
            '/guide/portasplit-vs-monoblock.html#bauart-vor-angebot',
            '/guide/midea-portasplit-ausverkauft-alternativen.html#fm-solar-yfg-montage',
            '/guide/klimaanlage-wann-kaufen.html#angebot-30-tage-preis',
        ])
        self.assertNotRegex(output, r'amazon\.de/|besserer Schlaf|ab (?:250|60|30|120) €')
        for href in parser.links:
            route, _, fragment = href.partition('#')
            text = (Path(B.SITE) / route.lstrip('/')).read_text()
            if fragment:
                self.assertIn('id="' + fragment + '"', text)
        parser = Anchors()
        parser.feed(output)
        for page in pages:
            self.assertIn(page['url'], parser.links)


if __name__ == '__main__':
    unittest.main()
