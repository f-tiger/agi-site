"""Regression checks for evidenced humidity costs and seasonal AC storage advice."""
import html
import json
import re
import unittest
from decimal import Decimal
from pathlib import Path
from urllib.parse import urlsplit


SITE = Path(__file__).resolve().parents[1] / 'site'
COST = 'luftentfeuchter-dauerbetrieb-stromkosten'
WINTER = 'mobile-klimaanlage-ueberwintern'
PAGES = (COST, WINTER)
UBA = 'https://www.umweltbundesamt.de/service/uba-fragen/was-tun-bei-schimmel-in-meiner-wohnung'
VZ = 'https://www.verbraucherzentrale.de/wissen/energie/strom-sparen/heizen-und-lueften-so-gehts-richtig-10426'
MANUAL_ROOT = 'https://www.feelcomfee.com/content/dam/comfee-aem/global/products/heating-cooling/'


def read(name):
    return (SITE / 'guide' / (name + '.html')).read_text()


def authored(source):
    # Generated commerce modules have their own gates; do not mistake them for
    # editorial evidence or include hidden shopping choices in the FAQ checks.
    return re.sub(r'<!--(EB_[A-Z_]+)-->.*?<!--/\1-->', '', source, flags=re.S)


def text(source):
    return ' '.join(html.unescape(re.sub(r'<[^>]*>', '', source)).split())


def graph(source):
    scripts = re.findall(r'<script\b[^>]*type="application/ld\+json"[^>]*>(.*?)</script>', source, re.S)
    return [node for script in scripts for node in json.loads(script)['@graph']]


class HumidityEvidence(unittest.TestCase):
    def test_visible_faq_matches_structured_answers(self):
        for name, count in [(COST, 4), (WINTER, 3)]:
            with self.subTest(page=name):
                source = read(name)
                faq = re.search(r'<h2 id="haeufige-fragen">.*?</h2>(.*?)(?=<div class="(?:cta-box|related)")', authored(source), re.S)[1]
                visible = [(text(q), text(a)) for q, a in re.findall(r'<p><strong>(.*?)</strong><br\s*/?>(.*?)</p>', faq, re.S)]
                structured = next(node for node in graph(source) if node['@type'] == 'FAQPage')
                answers = [(item['name'], item['acceptedAnswer']['text']) for item in structured['mainEntity']]
                self.assertEqual(len(visible), count)
                self.assertEqual(visible, answers)

    def test_cost_table_recomputes_from_visible_assumptions(self):
        source = read(COST)
        table = re.search(r'<table id="dauerbetrieb-kosten">(.*?)</table>', source, re.S)[1]
        caption = text(re.search(r'<caption>(.*?)</caption>', table, re.S)[1])
        watts, price, days = re.search(r'(\d+) W, (\d+,\d+) €/kWh, (\d+) Tage', caption).groups()
        power = Decimal(watts) / 1000
        price = Decimal(price.replace(',', '.'))
        days = Decimal(days)
        rows = re.findall(r'<tr>(.*?)</tr>', table, re.S)[1:]
        self.assertEqual(len(rows), 4)
        for row in rows:
            values = [Decimal(re.search(r'[\d,]+', text(cell))[0].replace(',', '.'))
                      for cell in re.findall(r'<td>(.*?)</td>', row, re.S)]
            hours, kwh, daily, monthly = values
            with self.subTest(hours=hours):
                self.assertEqual(kwh, power * hours)
                self.assertEqual(daily, kwh * price)
                self.assertEqual(monthly, daily * days)

    def test_cost_examples_and_actual_consumption_are_distinguished(self):
        source = authored(read(COST))
        self.assertIn('frei gewählte Rechenbeispiele', source)
        self.assertIn('Gemessene kWh × eigener Strompreis', source)
        self.assertIn('Abtauphasen', source)
        for obsolete in [r'Typische Kompressor.{0,40}300', r'45–60 % rF reichen gegen Schimmel',
                         r'Werte unter 45 % rF bringen.{0,30}keinen Zusatznutzen',
                         r'zwei ehrliche Ausnahmen', r'16–20.{0,20}für.{0,10}Keller.*?reichen']:
            self.assertNotRegex(source, obsolete)

    def test_storage_does_not_promise_universal_times_or_mould_prevention(self):
        source = authored(read(WINTER))
        for obsolete in [r'1–2 (?:h|Stunden).{0,100}(?:zuverlässig|verhindert Schimmel)',
                         r'Filter schimmelt.{0,50}garantiert', r'mindestens 24 Stunden aufrecht',
                         r'Nach jedem Transport 24 Stunden', r'ideal 5–25',
                         r'ohne Schimmel und Kompressorschaden', r'40–60 Watt', r'ab ca\. 10–15']:
            self.assertNotRegex(source, obsolete)
        self.assertIn('zwölf Stunden im FAN-Modus in einem warmen Raum', source)
        self.assertIn('Diese Vorgabe gilt nicht automatisch für andere Modelle', source)
        self.assertIn('Eine pauschale Wartezeit von 24 Stunden ist keine', source)

    def test_claims_have_specific_primary_sources(self):
        cost = authored(read(COST))
        winter = authored(read(WINTER))
        for url in [UBA, VZ, MANUAL_ROOT + 'dehumidifier-mddf-20den7/DF-Owners-Manual.pdf']:
            self.assertIn('href="' + url, cost)
        self.assertIn('href="' + MANUAL_ROOT + 'mobile-air-conditioner-mpph-09crn7/PH-Owners-Manual.pdf#page=20"', winter)
        self.assertIn('Ein Messwert in der Raummitte ist keine Schimmelgarantie', cost)
        self.assertIn('Leck oder Wassereintritt zuerst beheben', cost)
        self.assertIn('Nur ausdrücklich waschbare Filter nass reinigen', winter)
        self.assertIn('Reinigung und eine mögliche Reparatur zuerst klären', winter)

    def test_metadata_is_consistent_with_the_substantive_revision(self):
        for name in PAGES:
            with self.subTest(page=name):
                source = read(name)
                article = next(node for node in graph(source) if node['@type'] == 'Article')
                desc = html.unescape(re.search(r'<meta name="description" content="([^"]+)"', source)[1])
                og = html.unescape(re.search(r'<meta property="og:description" content="([^"]+)"', source)[1])
                self.assertEqual(article['description'], desc)
                self.assertEqual(og, desc)
                self.assertLessEqual(len(desc), 155)
                self.assertGreaterEqual(len(desc), 120)
                self.assertEqual(article['dateModified'], '2026-11-06')
                self.assertIn('inhaltlich geprüft am 6. November 2026', authored(source))
                self.assertIn('EcoBack', authored(source))

    def test_existing_tools_and_storage_humidity_bridge_remain_reachable(self):
        self.assertIn('href="/guide/stromkosten-rechner.html"', authored(read(COST)))
        bridge = re.search(r'<!--EB_SEASONBRIDGE-->(.*?)<!--/EB_SEASONBRIDGE-->', read(WINTER), re.S)[1]
        for route in ['/guide/luftfeuchtigkeit-richtig-messen.html',
                      '/guide/luftentfeuchter-keller.html#kalter-keller',
                      '/guide/richtig-lueften-im-winter.html',
                      '/guide/luftentfeuchter-zieht-kein-wasser.html']:
            self.assertIn('href="' + route + '"', bridge)
        for name in PAGES:
            body = re.search(r'<article\b[^>]*>(.*?)</article>', authored(read(name)), re.S)[1]
            for href in re.findall(r'href="([^"]+)"', body):
                path = urlsplit(html.unescape(href)).path
                if href.startswith('/') and path.endswith('.html'):
                    with self.subTest(page=name, link=href):
                        self.assertTrue((SITE / path.lstrip('/')).is_file())


if __name__ == '__main__':
    unittest.main()
