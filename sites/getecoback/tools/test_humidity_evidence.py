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
COMFEE_DE = 'https://www.feelcomfee.com/content/dam/comfee-aem/de/'
STORAGE_MANUAL = (COMFEE_DE + 'produkte/klimatisieren-heizen/mpph-09crn7/'
                  'comfee-MPPH-09CRN7-User-Manual-DE-FR-EN-ES-IT-NL.pdf#page=30')
STORAGE_CATALOG = COMFEE_DE + 'katalog/comfee_klimakatalog_2022_din_a4_lores.pdf#page=11'


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
    def test_regional_dewpoint_band_links_to_measurements_on_the_generated_pages(self):
        marker = '<!--EB_FEUCHTENOW-->'
        end = '<!--/EB_FEUCHTENOW-->'
        target = '/guide/keller-lueften-sommer.html#taupunkt'
        observed = {}
        for page in SITE.rglob('*.html'):
            source = page.read_text()
            if marker not in source:
                continue
            name = page.relative_to(SITE).as_posix()
            with self.subTest(page=name):
                self.assertEqual(source.count(marker), 1)
                self.assertEqual(source.count(end), 1)
            block = source.split(marker, 1)[1].partition(end)[0]
            observed[name] = block

        self.assertTrue({'guide/luftentfeuchter-keller.html', 'guide/luftentfeuchter-gegen-schimmel.html'} <= observed.keys())
        self.assertNotIn('guide/keller-lueften-sommer.html', observed)
        self.assertIn('id="taupunkt"', read('keller-lueften-sommer'))
        for block in set(observed.values()):
            with self.subTest(example_page=next(name for name, html in observed.items() if html == block)):
                self.assertIn('/api/feuchte', block)
                self.assertRegex(block, r'(?i)open[- ]meteo')
                self.assertIn('d.region', block)
                self.assertIn('d.dew', block)
                for city in ('Berlin', 'Frankfurt', 'München'):
                    self.assertIn(city, block)
                self.assertRegex(block, r'(?i)(?:Innen|drinnen)')
                self.assertRegex(block, r'(?i)(?:Wand|Oberfläche)')
                markup = block.partition('<script>')[0]
                self.assertIn('href="' + target + '" data-eb-f="tool"', markup)
                self.assertRegex(markup, r'<strong\b[^>]*data-outdoor-dew[^>]*\bhidden\b[^>]*>\s*</strong>')
                self.assertRegex(block, r'(?i)(?:Außen|draußen)')
                guide_urls = re.findall(r'/guide/[a-z0-9-]+\.html(?:#[a-z0-9-]+)?', block)
                self.assertEqual(set(guide_urls), {target})
                self.assertNotRegex(block, r'(?i)amazon\.|tag=getecoback|data-eb-f="guide"')
                for claim in ('Wohnraum ja, Keller nein', 'Gutes Lüftungsfenster',
                              'Lüften trocknet gerade nicht', 'Wasser rausholen kann jetzt nur',
                              'über jeder kalten Wand', 'Trockener als jede kalte Wand'):
                    self.assertNotIn(claim, block)
                self.assertNotRegex(block, r'd\.(?:wall_ref|cellar_ref)\b')

    def test_winter_ventilation_examples_survive_in_both_editions(self):
        # A humid but warmer outdoor sample can add moisture even in winter.
        # Check each example in the published text, including its direction.
        editions = [
            ('guide/richtig-lueften-im-winter', 'Feuchte aus dem Zimmer abführen', 'mehr Feuchte herein',
             '/waeschetrockner-oder-luftentfeuchter.html#laundry-check'),
            ('en/guide/tilt-and-turn-windows-winter-condensation', 'carry moisture out', 'more moisture into',
             '/en/guide/dehumidifier-drying-clothes-cost.html#laundry-check'),
        ]
        for path, drier, wetter, next_step in editions:
            for ext in ['html', 'md']:
                with self.subTest(path=path, ext=ext):
                    surface = (SITE / f'{path}.{ext}').read_text()
                    # Read each list entry independently so reversed outcomes fail.
                    rows = [text(line).replace('**', '') for line in surface.splitlines()]
                    for temp, outdoor_rh, adjusted, direction in [(5, 90, 34, drier), (14, 95, 65, wetter)]:
                        self.assertTrue(any(f'{temp} °C' in row and f'{outdoor_rh}%' in row.replace(' ', '')
                                            and f'{adjusted}%' in row.replace(' ', '') and direction in row
                                            for row in rows), (temp, direction))
                    self.assertIn(next_step, surface)

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
        for url in [STORAGE_MANUAL, STORAGE_CATALOG]:
            self.assertIn('href="' + url + '"', winter)
        self.assertIn('10000656', winter)
        self.assertIn('4048164103065', winter)
        self.assertIn('Batterien aus der Fernbedienung nehmen', winter)
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
                day = 26 if name == WINTER else 6
                self.assertEqual(article['dateModified'], f'2026-11-{day:02d}')
                self.assertIn(f'inhaltlich geprüft am {day}. November 2026', authored(source))
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
