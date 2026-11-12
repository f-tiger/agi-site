"""Market routing must follow an explicit shopping choice, never a timezone."""
import json
import re
import subprocess
import unittest
from pathlib import Path

import build_structure as B

HERE = Path(__file__).resolve().parent


class MarketChoice(unittest.TestCase):
    def test_legacy_rewriter_is_removed_without_touching_model_links(self):
        original = '<a href="https://www.amazon.de/s?k=AEG+ChillFlex+Pro&tag=getecoback-21">AEG ChillFlex Pro</a>'
        stale = original + '<!--EB_USSWITCH--><script>oldRewrite()</script><!--/EB_USSWITCH-->'
        self.assertEqual(B.strip_legacy_market_switch(stale), original)
        self.assertEqual(B.strip_legacy_market_switch(original), original)

    def test_country_task_wins_and_old_us_blocks_are_removed(self):
        for slug, extra in [
            ('portable-air-conditioner-france', ''),
            ('best-portable-air-conditioner-italy', ''),
            ('portable-air-conditioner-spain', ''),
            ('12l-vs-20l-dehumidifier-uk', ''),
            ('dehumidifier-drying-clothes-cost', '<!--EB_UK_PATH-->'),
            ('dehumidifier', '<section data-country-market="AT">'),
            ('dehumidifier', "<section data-country-market='CH'>"),
            ('dehumidifier', '<section data-country-market="CA">'),
            ('portable-air-conditioner', '<link rel="canonical" href="https://getecoback.com/it/guide/example.html">'),
        ]:
            with self.subTest(slug=slug, extra=extra):
                source = '<html lang="en">' + extra + '<!--/EB_TRUST--><!--EB_TOPPICK-->DE<!--/EB_TOPPICK-->\n<!--EB_MODELS-->DE<!--/EB_MODELS-->\n'
                for marker in ['USMARKET', 'USTOP', 'USSHELF', 'USUNITS']:
                    source += '<!--EB_' + marker + '-->stale<!--/EB_' + marker + '-->'
                for inject in [B.inject_usmarket, B.inject_us_toppick, B.inject_us_shelf, B.inject_us_units]:
                    source = inject(source, slug)
                self.assertNotRegex(source, r'<!--EB_(?:USMARKET|USTOP|USSHELF|USUNITS)-->')
                self.assertNotIn('data-eb-popup-market="us"', B.inject_popup(source, slug, en=True))

    def test_accessory_and_skipped_pages_do_not_get_whole_appliances(self):
        for slug in ['portable-ac-leaking-water', 'klimaanlage-wohnmobil', 'heated-airer-vs-dehumidifier', 'balkonspeicher-ratgeber', 'fan-with-ice-cool-room', 'evaporative-cooler-vs-fan']:
            with self.subTest(slug=slug):
                self.assertEqual(B.usmarket_html(slug), '')
                self.assertNotIn('EB_USMARKET', B.inject_usmarket('<!--/EB_TRUST-->', slug))
                source = '<!--EB_TOPPICK-->DE<!--/EB_TOPPICK-->\n<!--EB_MODELS-->DE<!--/EB_MODELS-->\n'
                self.assertNotIn('EB_USTOP', B.inject_us_toppick(source, slug))
                self.assertNotIn('EB_USSHELF', B.inject_us_shelf(source, slug))

    def test_no_js_fallback_names_the_actual_market_and_named_models(self):
        markup = B.usmarket_html('portable-ac-vs-air-cooler')
        self.assertIn('Amazon.de (Germany)', markup)
        self.assertIn('Amazon.com (United States)', markup)
        self.assertIn('<details id="eb-market-us-fallback">', markup)
        self.assertIn('Midea+Duo+MAP14HS1TBL', markup)
        self.assertNotIn('<script', markup)
        self.assertNotIn('Looks like', markup)
        for name, _role, _note in B.US_MODELS['portable air conditioner']:
            from urllib.parse import quote_plus
            self.assertIn('k=' + quote_plus(name), markup)
            self.assertIn(name, markup)

    def test_explicit_us_content_is_not_rewritten(self):
        source = '<a href="https://www.amazon.com/s?k=MERV+13+20x25x1&tag=ecoback0d-20">US: MERV 13 20x25x1</a>'
        self.assertEqual(B.strip_legacy_market_switch(source), source)

    def test_unverified_categories_cannot_inherit_air_conditioner_fallback(self):
        for slug in ['luftreiniger-ratgeber', 'air-purifier-guide',
                     'air-purifier-heatwave', 'heating-pad-guide',
                     'humidifier-guide', 'luftbefeuchter-ratgeber',
                     'saugwischer-kaufberatung', 'saugroboter-kaufberatung',
                     'smarte-heizkoerperthermostate-lohnen-sich',
                     'heizdecke-stromverbrauch', 'balkon-terrasse-beschatten',
                     'treiben-rechenzentren-die-strompreise',
                     'future-household-category', '']:
            with self.subTest(slug=slug):
                self.assertFalse(B.us_market_allowed(slug))
                self.assertEqual(B.usmarket_html(slug), '')

    def test_purifier_rebuild_removes_old_cooling_surfaces_only(self):
        # A real guide had the default AC alternatives despite its purifier
        # subject. Keep the authored text and separate US filter reference.
        slug = 'luftreiniger-ratgeber'
        authored = '<p>Check the exact purifier filter.</p><a href="https://www.amazon.com/s?k=MERV+13&tag=ecoback0d-20">US filter reference</a>'
        source = '<html lang="de"><article>' + authored + '<!--EB_TOPPICK-->DE<!--/EB_TOPPICK-->\n<!--EB_MODELS-->DE<!--/EB_MODELS-->\n</article>'
        for marker in ['USMARKET', 'USTOP', 'USSHELF', 'USUNITS']:
            source += '<!--EB_' + marker + '-->Midea Duo MAP14HS1TBL<!--/EB_' + marker + '-->'
        def rebuild(value):
            for inject in [B.inject_usmarket, B.inject_us_toppick,
                           B.inject_us_shelf, B.inject_us_units]:
                value = inject(value, slug)
            return value
        result = rebuild(source)
        self.assertIn(authored, result)
        self.assertNotIn('Midea Duo', result)
        self.assertNotRegex(result, r'<!--EB_(?:USMARKET|USTOP|USSHELF|USUNITS)-->')
        self.assertEqual(rebuild(result), result)

    def test_known_cooling_and_humidity_topics_keep_matching_families(self):
        # "overheating" must never become an electric-heater recommendation.
        for slug in ['gaming-pc-overheating-summer', 'portable-ac-vs-air-cooler',
                     'mobile-klimaanlage-vergleich', 'how-many-btu-do-i-need',
                     'aeg-chillflex-pro-test', 'delonghi-pac-n90-test']:
            self.assertEqual(B.us_term(slug)[0], 'portable air conditioner', slug)
        for slug in ['meacodry-arete-one-test', 'dehumidifier-20-sqm',
                     'tilt-and-turn-windows-winter-condensation',
                     'richtig-lueften-im-winter']:
            self.assertEqual(B.us_term(slug)[0], 'dehumidifier', slug)
        for slug in ['electric-heater-20-sqm', 'heizung-20-qm']:
            self.assertEqual(B.us_term(slug)[0], 'space heater', slug)

    def test_clean_page_and_second_build_keep_one_consistent_choice(self):
        slug = 'portable-ac-vs-air-cooler'
        source = '<html lang="en"><head></head><body><!--EB_NAV--><nav>Navigation</nav><!--/EB_NAV--><article><h1>Compare cooling</h1><h2>Options</h2><p>Original article.</p></article><!--EB_TRACK--></body></html>'
        def rebuild(value):
            value = B.inject_crumb_trust(value, 'klimaanlagen', 'Compare cooling',
                                         'https://getecoback.com/en/guide/' + slug + '.html', en=True)
            value = B.inject_usmarket(value, slug)
            value = B.inject_models(value, slug, en=True)
            value = B.inject_toppick(value, slug, en=True)
            value = B.inject_us_toppick(value, slug)
            value = B.inject_us_shelf(value, slug)
            value = B.inject_popup(value, slug, en=True)
            return B.strip_legacy_market_switch(value)
        result = rebuild(source)
        self.assertEqual(rebuild(result), result)
        for item in ['eb-market-choice', 'eb-market-us-fallback', 'eb-ustop', 'eb-usshelf', 'eb-toppick', 'eb-models']:
            self.assertEqual(result.count('id="' + item + '"'), 1, item)
        self.assertLess(result.index('id="eb-market-choice"'), result.index('id="eb-toppick"'))
        self.assertIn('id="eb-ustop" hidden', result)
        self.assertIn('id="eb-usshelf" hidden', result)
        self.assertIn('data-eb-popup-market="us" hidden', result)
        self.assertIn('Original article.', result)

    def test_timezone_dynamic_click_and_repeated_choices_in_isolation(self):
        result = subprocess.run(['node', str(HERE / 'test_market_choice_vm.cjs')],
                                input=json.dumps({'script': re.search(r'<script>(.*)</script>', B.US_SHELF_JS, re.S)[1]}),
                                text=True, capture_output=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)


if __name__ == '__main__':
    unittest.main()
