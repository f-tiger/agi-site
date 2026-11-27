"""Regression cases for real buying-intent mismatches, not click-volume goals."""
from html import unescape
from pathlib import Path
import unittest
import re
from urllib.parse import parse_qs, urlsplit
from build_rising_rail import destination_for
from build_home_order import compose
from check_related import check_curated_block
from moisture_journeys import GUIDE_NEXT

SITE = Path(__file__).resolve().parents[1] / 'site'

class ConversionRoutes(unittest.TestCase):
    def test_trotec_offer_has_one_approved_search_after_exact_model_and_room_conditions(self):
        guide=SITE / 'guide/trotec-luftentfeuchter-test.html'
        page=guide.read_text()
        md=guide.with_suffix('.md').read_text()
        self.assertNotRegex(page,r'<!--EB_(?:TOPPICK|MODELS|POPUP|STICKY|PROFILE|QUICKPICK|USMARKET|USSWITCH|RADAR)-->')
        self.assertNotRegex(page,r'href="https://(?:www\.)?amazon\.com/')
        [offer]=re.findall(r'<h3 id="ttk75-angebot">.*?(?=<div class="tbl-scroll">)',page,re.S)
        self.assertLess(page.index('id="ttk75-pruefpunkt"'),page.index(offer))
        first=re.search(r'<a\b[^>]*href="(https://www\.amazon\.de/[^"]+)"',page)
        expected='https://www.amazon.de/s?k=Trotec+TTK+75+ECO&amp;tag=getecoback-21'
        self.assertEqual(first[1],expected)
        self.assertEqual(page.count(expected),1)
        self.assertLess(offer.index('Warte mit dem Kauf'),offer.index(expected))
        self.assertIn('Anzeige · Trotec TTK 75 ECO bei Amazon.de suchen',offer)
        for fact in ('1120001110','1120001003','Gesamtpreis inklusive Versand','Warte mit dem Kauf',
                     'https://de.trotec.com/shop/luftentfeuchter-ttk-75-eco.html',
                     'https://de.trotec.com/shop/luftentfeuchter-ttk-75-e.html'):
            self.assertIn(fact,offer)
            self.assertIn(fact,md)
        comparison=re.search(r'<h2 id="vergleich">.*?(?=<h2)',page,re.S)[0]
        self.assertIn('href="#ttk70-hepa-filter"',comparison)
        self.assertNotIn('Trotec+TTK+70+HEPA',comparison)
        evidence='/guide/luftentfeuchter-keller.html#modell-comfee-mddf20'
        self.assertLess(comparison.index(evidence),comparison.index('B07KJX6RDK'))
        self.assertNotRegex(md,r'getecoback-21|https://www.amazon.de/')

    def test_winter_hygrometer_keeps_measurement_and_exact_german_searches(self):
        page = SITE / 'guide' / 'richtig-lueften-im-winter.html'
        html = page.read_text()
        markdown = page.with_suffix('.md').read_text()
        comparison = re.search(r'<section aria-labelledby="hygrometer-nachtwert">(.*?)</section>', html, re.S)
        self.assertIsNotNone(comparison)
        section = comparison[1]
        self.assertEqual(html.count('id="hygrometer-nachtwert"'), 1)
        measurement = re.search(r'<section id="lueften-vorher-nachher".*?</section>', html, re.S)
        self.assertIsNotNone(measurement)
        self.assertIn('href="#hygrometer-nachtwert"', measurement[0])
        self.assertLess(section.index('vorhandenes Hygrometer'), section.index('rel="sponsored noopener"'))
        self.assertIn('die Ursache klären', section)
        self.assertNotIn('hygrometer+innen+min+max', html)

        product = SITE / 'produkte.html'
        self.assertIn('href="/produkte.html#modelle-hygrometer"', section)
        self.assertIn('id="modelle-hygrometer"', product.read_text())
        links = re.findall(r'<a href="(https://www\.amazon\.de/[^"]+)"[^>]*rel="sponsored noopener"', section)
        searches = ['TFA 30.5055.01 Thermo Hygrometer', 'TFA EXACTO 30.5047.54 Thermo Hygrometer']
        self.assertEqual(len(links), len(searches))
        for href, query in zip(links, searches):
            url = urlsplit(unescape(href))
            self.assertEqual(url.path, '/s')
            self.assertEqual(parse_qs(url.query), {'k': [query], 'tag': ['getecoback-21']})
        for text in ('30.5055.01', '30.5047.54', '35–75 %', '±3 Prozentpunkte',
                     '25. November 2026', 'vorhandenes Hygrometer', 'die Ursache klären',
                     'https://www.tfa-dostmann.de/produkt/digitales-thermo-hygrometer-30-5055/',
                     'https://www.tfa-dostmann.de/produkt/digitales-thermo-hygrometer-exacto-30-5047/'):
            self.assertIn(text, markdown)
        self.assertNotIn('https://www.amazon.de/', markdown)
        self.assertNotIn('getecoback-21', markdown)

    def test_winter_dehumidifier_choice_follows_measurement_and_has_one_exact_offer(self):
        page = SITE / 'guide' / 'richtig-lueften-im-winter.html'
        html = page.read_text()
        mirror = page.with_suffix('.md').read_text()
        target = 'https://www.amazon.de/dp/B07KJX6RDK?tag=getecoback-21'
        block = re.search(r'<section id="eb-models" aria-labelledby="entfeuchter-nach-dem-lueften".*?</section>', html, re.S)[0]
        self.assertEqual(html.count('id="eb-models"'), 1)
        self.assertEqual(html.count(target), 1)
        self.assertLess(html.index('id="lueften-vorher-nachher"'), html.index(target))
        self.assertLess(block.index('warte mit dem Gerätekauf'), block.index(target))
        self.assertIn('href="#lueften-vorher-nachher"', block)
        self.assertIn('rel="sponsored noopener"', block)
        self.assertNotRegex(html, r'<!--EB_(?:MODELS|POPUP|STICKY|PROFILE|TOPPICK)-->')
        for doc in (html, mirror):
            for phrase in ('4048164103010', '10000651', '30 °C und 80 %', '10 °C und 60 %',
                           'warte mit dem Gerätekauf', 'luftentfeuchter-30-tage-preischeck',
                           'comfee-MDDF-20DEN7-Datenblatt.pdf', '#modell-comfee-mddf20'):
                self.assertIn(phrase, doc)
            self.assertNotRegex(doc, r'150[–-]200 €|spart am meisten Strom')
        self.assertNotRegex(mirror, r'amazon\.de/|getecoback-21')
        buying = (SITE / 'guide' / 'luftentfeuchter-ratgeber.html').read_text()
        self.assertIn('id="luftentfeuchter-30-tage-preischeck"', buying)

    def test_autumn_next_steps_resolve_to_existing_tools_and_anchors(self):
        for slug in ['fenster-beschlagen-innen','luftentfeuchter-keller',
                     'schimmel-im-keller-entfernen','heizluefter-stromsparend',
                     'heizluefter-stromverbrauch']:
            html=(SITE/'guide'/f'{slug}.html').read_text()
            route='/guide/'+slug+'.html'
            if route in GUIDE_NEXT:
                self.assertEqual(check_curated_block(route, html), [], route)
                self.assertNotIn('<!--EB_HOUSEHOLD_LINK-->', html, route)
                block=re.search(r'<!--EB_RELATED-->(.*?)<!--/EB_RELATED-->',html,re.S)
                self.assertEqual(re.findall(r'href="([^"]+)"',block[1]),
                                 [step['href'] for step in GUIDE_NEXT[route]])
            else:
                block=re.search(r'<!--EB_HOUSEHOLD_LINK-->(.*?)<!--/EB_HOUSEHOLD_LINK-->',html,re.S)
            self.assertIsNotNone(block,slug)
            for href in re.findall(r'href="([^"]+)"',block[1]):
                url=urlsplit(href)
                target=SITE/url.path.lstrip('/')
                self.assertTrue(target.is_file(),href)
                if url.fragment:self.assertIn('id="'+url.fragment+'"',target.read_text(),href)

    def test_home_table_does_not_present_area_as_dehumidifier_capacity(self):
        html=(SITE/'index.html').read_text()
        table=re.search(r'<!--EB_HOMETABLE-->(.*?)<!--/EB_HOMETABLE-->',html,re.S)[1]
        self.assertNotRegex(table,r'\d+[–-]\d+ l/Tag')
        self.assertNotIn('Hälfte',table)
        self.assertIn('kein pauschaler Umrechnungsfaktor',table)
        self.assertIn('eb-moisture-choice',table)

    def test_unserved_rental_review_and_solar_queries_are_not_ads(self):
        for query in ['obi luftentfeuchter mieten','luftentfeuchter test mieten',
                      'solar heizlüfter','solar-heizlüfter','heizlüfter solar',
                      'heizlüfter testsieger','infrarotheizung bauhaus',
                      'wie funktioniert ein radiator']:
            with self.subTest(query=query):
                self.assertIsNone(destination_for(query))

    def test_questions_reach_the_correct_existing_tool_or_guide(self):
        for query, slug in [('akku heizlüfter makita','akku-heizluefter'),
                            ('infrarotheizung test stiftung warentest','infrarotheizung-ratgeber'),
                            ('sparsamer heizlüfter','heizluefter-stromsparend'),
                            ('heizlüfter stromsparend','heizluefter-stromsparend'),
                            ('luftentfeuchter testsieger','luftentfeuchter-ratgeber')]:
            with self.subTest(query=query):
                result=destination_for(query)
                self.assertEqual(result[:2],('guide','/guide/'+slug+'.html'))
                self.assertTrue((SITE / result[1].lstrip('/')).exists())
        self.assertIsNone(destination_for('ewt heizlüfter'))

    def test_household_tools_are_visible_before_autumn_shelf(self):
        html=(SITE/'index.html').read_text()
        for season in ['herbst','winter']:
            result=compose(html,season)
            self.assertLess(result.index('<!--EB_HOUSEHOLD_LINK-->'),result.index('<!--EB_HERBST-->'))
            self.assertEqual(result.count('<!--EB_HOUSEHOLD_LINK-->'),1)
            self.assertEqual(compose(result,season),result)
        for season in ['sommer','frühjahr']:
            result=compose(html,season)
            self.assertLess(result.index('<!--EB_HOMETOOL-->'),result.index('<!--EB_HOUSEHOLD_LINK-->'))
            self.assertEqual(compose(result,season),result)

class CalculatorIsolation(unittest.TestCase):
    def test_moisture_choice_stays_outside_laundry_calculator(self):
        from moisture_decision import inject
        html='<article><!--EB_LAUNDRY--><section id="laundry-check"><h2>Laundry</h2><form data-laundry></form></section><!--/EB_LAUNDRY--></article>'
        result=inject(html,'dehumidifier-drying-clothes-cost',True)
        self.assertLess(result.index('<!--/EB_BUYER-->'),result.index('<!--EB_LAUNDRY-->'))
        self.assertEqual(inject(result,'dehumidifier-drying-clothes-cost',True),result)


class ModelIntent(unittest.TestCase):
    def test_only_reviewed_exact_german_queries_become_product_links(self):
        from urllib.parse import quote_plus
        from build_asin_links import rewrite

        def search(term, tag='getecoback-21'):
            return f'<a href="https://www.amazon.de/s?k={quote_plus(term)}&amp;tag={tag}">Prüfen</a>'

        for term, product in (
            ('Comfee MDDF-20DEN7 Luftentfeuchter', 'B07KJX6RDK'),
            ('Comfee MDDF-20DEN7 ohne WF', 'B07KJX6RDK'),
            ('mddf_20den7', 'B07KJX6RDK'),
            ('Comfee MPPH-09CRN7', 'B07KJYD1ZP'),
            ("De'Longhi PAC N90 ECO Silent", 'B07NC5CP6F'),
            ('Klarstein Kraftwerk Smart 12K', 'B08VWSP8FW'),
            ('PAC AP98', 'B0F3XL6LK6'),
        ):
            with self.subTest(term=term):
                result, _ = rewrite(search(term))
                self.assertIn(f'/dp/{product}?tag=getecoback-21"', result)
                self.assertEqual(rewrite(result)[0], result)
        for term in (
            'Comfee MDDF-20DEN7-WF', 'Comfee MDDF-20DEN7B',
            'Comfee MDDF-20DEN7 Ersatzfilter', 'Ablaufschlauch MDDF-20DEN7',
            'Comfee MDDF-20DEN7 mit Ersatzfiltern',
            'Comfee MDDF-20DEN7 oder MPPH-09CRN7',
            'Abluftschlauch für Comfee MPPH-09CRN7',
            "De'Longhi PAC N90 ECO Silent Adapter",
            'Klarstein Kraftwerk Smart 12K Fernbedienung', 'PAC AP98X',
            'Klarstein mobile Klimaanlage 12000 BTU',
        ):
            with self.subTest(term=term):
                original = search(term)
                self.assertEqual(rewrite(original)[0], original)
        alternate_tag = search('Comfee MDDF-20DEN7', 'getecoback-210')
        self.assertEqual(rewrite(alternate_tag)[0], alternate_tag)
        valid = search('Comfee MDDF-20DEN7')
        raw_quoted = valid.replace('&amp;', '&').replace('"', "'")
        self.assertIn("/dp/B07KJX6RDK?tag=getecoback-21'", rewrite(raw_quoted)[0])
        for tail in ('&amp;k=Ersatzfilter', '&amp;tag=unknown-21', '&variant=WF', '#offer'):
            original = valid.replace('21"', '21' + tail + '"')
            self.assertEqual(rewrite(original)[0], original)
        for original in (
            valid.replace('www.amazon.de', 'www.amazon.de.example.com'),
            valid.replace('https://www.amazon.de/s?', 'https://www.example.com/?target=https://www.amazon.de/s?'),
        ):
            self.assertEqual(rewrite(original)[0], original)

    def test_meacodry_guide_is_discovered_as_humidity_not_cooling(self):
        from build_structure import cat_of, device_of, us_term, usmarket_html
        slug = 'meacodry-arete-one-test'
        self.assertEqual(device_of(slug), 'dehum')
        self.assertEqual(cat_of(slug), 'luftqualitaet')
        self.assertEqual(us_term(slug)[0], 'dehumidifier')
        us = usmarket_html(slug)
        self.assertIn('Midea+Cube+50-Pint', us)
        self.assertNotRegex(us, r'Midea.Duo|Whynter|portable.air.conditioner')
        # The adjacent Meaco fan and actual portable-AC intent must stay distinct.
        self.assertEqual(device_of('meacofan-1056-ventilator-test'), 'fan')
        self.assertEqual(device_of('mobile-klimaanlage-vergleich'), 'ac')

    def test_rebuilding_meacodry_replaces_stale_cooling_purchase_surfaces(self):
        from build_structure import (device_of, inject_models, inject_toppick,
                                     inject_popup, inject_sizer, inject_climate,
                                     inject_heatenergy)
        from build_asin_links import rewrite
        slug = 'meacodry-arete-one-test'
        original = '<article><h1>Existing review</h1><p>Preserve the source.</p><h2 id="alternativen">Conditions</h2></article></body>'
        # Simulate the previous misclassification, then migrate it using the
        # producing functions. This catches stale markers as well as new pages.
        from build_structure import models_block, toppick_block, popup_block
        stale = original.replace('<h2 ', models_block('ac') + '<h2 ', 1)
        stale = stale.replace('<article>', '<article>' + toppick_block('ac'), 1)
        stale = stale.replace('</body>', popup_block('ac') + '</body>')
        stale = stale.replace('</body>', '<!--EB_CLIMATE-->Cooling days<!--/EB_CLIMATE--><!--EB_HEATENERGY-->Cooling costs<!--/EB_HEATENERGY--><!--EB_SIZER-->BTU<!--/EB_SIZER--></body>')
        def rebuild(source):
            for inject in (inject_models, inject_sizer, inject_toppick,
                           inject_climate, inject_heatenergy, inject_popup):
                source = inject(source, slug)
            return rewrite(source)[0]
        rendered = rebuild(stale)
        self.assertEqual(rebuild(rendered), rendered)
        self.assertIn('Preserve the source.', rendered)
        self.assertIn('href="#alternativen"', rendered)
        self.assertNotIn('href="#eb-models"', rendered)
        for marker in ('EB_MODELS', 'EB_TOPPICK', 'EB_POPUP'):
            block = re.search(r'<!--' + marker + r'-->(.*?)<!--/' + marker + r'-->', rendered, re.S)[1]
            self.assertIn('MeacoDry Arete One 20L', block)
            self.assertIn('amazon.de/dp/B07KJX6RDK?tag=getecoback-21', block)
            self.assertIn('MeacoDry+Arete+One+20L', block)
            self.assertNotRegex(block, r'PAC N90|MPPH-09CRN7|ChillFlex|data-eb-pu="calc"')
        self.assertNotIn('<!--EB_SIZER-->', rendered)
        self.assertNotIn('<!--EB_CLIMATE-->', rendered)
        self.assertNotIn('<!--EB_HEATENERGY-->', rendered)
        self.assertNotIn('window.ebReadRoom&&window.ebReadRoom()', rendered)
        # A cooling page must still expose its useful calculator route.
        self.assertIn('data-eb-pu="calc"', popup_block(device_of('mobile-klimaanlage-vergleich')))

if __name__=='__main__':
    unittest.main()
