"""Regression cases for real buying-intent mismatches, not click-volume goals."""
from pathlib import Path
import unittest
import re
from urllib.parse import urlsplit
from build_rising_rail import destination_for
from build_home_order import compose
from check_related import check_curated_block
from moisture_journeys import GUIDE_NEXT

SITE = Path(__file__).resolve().parents[1] / 'site'

class ConversionRoutes(unittest.TestCase):
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
