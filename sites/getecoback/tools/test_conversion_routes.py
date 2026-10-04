"""Regression cases for real buying-intent mismatches, not click-volume goals."""
from pathlib import Path
import unittest
import re
from urllib.parse import urlsplit
from build_rising_rail import destination_for
from build_home_order import compose

SITE = Path(__file__).resolve().parents[1] / 'site'

class ConversionRoutes(unittest.TestCase):
    def test_autumn_next_steps_resolve_to_existing_tools_and_anchors(self):
        for slug in ['fenster-beschlagen-innen','luftentfeuchter-keller',
                     'schimmel-im-keller-entfernen','heizluefter-stromsparend',
                     'heizluefter-stromverbrauch']:
            html=(SITE/'guide'/f'{slug}.html').read_text()
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
        self.assertEqual(destination_for('ewt heizlüfter')[0],'shop')

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

if __name__=='__main__':
    unittest.main()
