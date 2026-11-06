"""Buyer evidence stays distinct from shopping panels in both agent views."""
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from agent_sources import citation_url
from build_agent_md import to_markdown
import build_llmstxt as FULL

MEACO = 'https://www.meaco.com/products/meacodry-arete-one-20l-dehumidifier-and-air-purifier'
COMFEE = 'https://www.feelcomfee.com/de/produkte/klimatisieren-heizen/mddf-20den7'
DATASHEET = 'https://www.feelcomfee.com/content/dam/comfee-aem/de/produkte/klimatisieren-heizen/mddf-20den7/comfee-MDDF-20DEN7-Datenblatt.pdf#page=2'


def fixture(en=False, method=True):
    lang = 'en' if en else 'de'
    unknown = 'Not verified at these conditions' if en else 'Unter diesen Bedingungen nicht verifiziert'
    scope = ('Check One / Two, 20L / 25L and the WF suffix. Manufacturer data, not our own tests or an efficiency ranking.'
             if en else 'One / Two, 20L / 25L und den WF-Zusatz prüfen. Herstellerdaten, keine eigenen Tests oder Effizienzrangliste.')
    details = ('<details data-choice-method><summary>Method</summary><p>' + scope + '</p>'
               '<table><tr><th>Model</th><th>20 °C / 60 % RH</th></tr>'
               '<tr><td>MeacoDry Arete One 20L</td><td>8.5 L/day · 216 W</td></tr>'
               '<tr><td>Comfee MDDF-20DEN7</td><td>' + unknown + '</td></tr></table>'
               '<form><textarea>PRIVATE_INPUT_INSIDE_METHOD</textarea></form>'
               '<small>Sources checked 2026-11-06: <a href="' + MEACO + '">Meaco</a> · '
               '<a href="' + COMFEE + '">Comfee DE</a> · <a href="' + DATASHEET + '">Datasheet page 2</a></small></details>') if method else ''
    return ('<html lang="' + lang + '"><head><title>Buyer guide</title></head><body>'
            '<article><p>Keep the article.</p></article><!--EB_BUYER--><section>'
            '<form><label>Private room<textarea>PRIVATE_ROOM_27</textarea></label></form>'
            '<div data-results hidden><details data-choice-evidence><summary>Model details</summary>'
            '<p>SHOPPING_PANEL_COPY</p><a href="https://www.amazon.de/dp/EXAMPLE?tag=getecoback-21">Buy now</a>'
            '</details><p>PRIVATE_RESULT_27</p></div>' + details +
            '<input hidden data-share value="PRIVATE_SHARE_FRAGMENT">'
            '</section><!--/EB_BUYER--></body></html>')


class BuyerGeo(unittest.TestCase):
    def test_marked_method_not_first_product_details_in_both_locales(self):
        for en in [False, True]:
            with self.subTest(en=en):
                lang = 'en' if en else 'de'
                source = fixture(en)
                route = ('/en' if en else '') + '/guide/buyer-fixture.html'
                markdown = to_markdown(source, route, lang)
                for text in ['Keep the article.', 'One / Two', '20L / 25L', 'WF', '2026-11-06',
                             'MeacoDry Arete One 20L', '8.5 L/day', '216 W', 'Comfee MDDF-20DEN7',
                             'Not verified at these conditions' if en else 'Unter diesen Bedingungen nicht verifiziert']:
                    self.assertIn(text, markdown)
                for reference in [MEACO, COMFEE, DATASHEET]:
                    self.assertIn('](' + reference + ')', markdown)
                self.assertNotRegex(markdown, r'PRIVATE_|SHOPPING_PANEL_COPY|Buy now|https?://[^\s)]*amazon|tag=getecoback|ecoback0d')
                self.assertNotRegex(markdown, r'Comfee MDDF-20DEN7[^\n]*\|\s*0(?:\s|[|.]|$)')
                with tempfile.TemporaryDirectory() as directory:
                    path = Path(directory) / route.lstrip('/')
                    path.parent.mkdir(parents=True)
                    path.write_text(source)
                    with patch.object(FULL, 'ROOT', directory):
                        self.assertEqual(FULL.body_text(path), markdown)

    def test_unmarked_product_details_never_become_method(self):
        markdown = to_markdown(fixture(method=False), '/guide/buyer-fixture.html', 'de')
        self.assertNotIn('SHOPPING_PANEL_COPY', markdown)
        self.assertNotIn('Herstellerdaten vor dem Kauf prüfen', markdown)

    def test_only_recognized_legacy_method_has_a_fallback(self):
        for en, summary in [(False, 'Warum „20 Liter“ nicht immer 20 Liter sind'),
                            (True, 'Why “20 litres” does not always mean 20 litres')]:
            old = ('<html><title>Legacy</title><article>Existing article.</article><!--EB_BUYER-->'
                   '<details><summary>Other details</summary><p>UNRELATED_FIRST_DETAILS</p></details>'
                   '<details><summary>' + summary + '</summary><p>LEGACY_METHOD_EVIDENCE</p></details>'
                   '<small>' + ('Sources checked' if en else 'Quellen geprüft') + ' 2026-10-01: '
                   '<a href="' + MEACO + '">Meaco</a></small><!--/EB_BUYER--></html>')
            markdown = to_markdown(old, '/guide/legacy.html', 'en' if en else 'de')
            self.assertIn('LEGACY_METHOD_EVIDENCE', markdown)
            self.assertIn('](' + MEACO + ')', markdown)
            self.assertNotIn('UNRELATED_FIRST_DETAILS', markdown)

    def test_explicit_method_wins_over_legacy_copy_and_keeps_one_source_section(self):
        source = fixture().replace('<details data-choice-method>', '<details><summary>Warum „20 Liter“ nicht immer 20 Liter sind</summary><p>OLD_EVIDENCE</p></details><details data-choice-method>')
        markdown = to_markdown(source, '/guide/buyer-fixture.html', 'de')
        self.assertNotIn('OLD_EVIDENCE', markdown)
        self.assertEqual(markdown.count('](' + MEACO + ')'), 1)

    def test_new_comfee_sources_are_exact_references_not_a_domain_allowlist(self):
        self.assertEqual(citation_url(COMFEE), COMFEE)
        self.assertEqual(citation_url(DATASHEET), DATASHEET)
        self.assertIsNone(citation_url(COMFEE + '-wf'))
        self.assertIsNone(citation_url(COMFEE + '?tag=example'))
        self.assertIsNone(citation_url(DATASHEET.replace('page=2', 'page=2&url=https://example.test')))

    def test_current_component_keeps_the_method_for_all_six_guides(self):
        # Exercise the real generator without writing any generated page. This
        # catches drift between the private shopping panels and public method.
        import moisture_decision as DECISION
        site = Path(__file__).resolve().parents[1] / 'site'
        count = 0
        for en, slugs in DECISION.PATHS.items():
            for slug in sorted(slugs):
                with self.subTest(slug=slug, en=en):
                    route = ('/en' if en else '') + '/guide/' + slug + '.html'
                    source = (site / route.lstrip('/')).read_text()
                    updated = DECISION.inject(source, slug, en)
                    self.assertEqual(updated.count('<details data-choice-method>'), 1)
                    self.assertGreater(updated.count('<details data-choice-evidence>'), 1)
                    markdown = to_markdown(updated, route, 'en' if en else 'de')
                    for reference in [MEACO, COMFEE, DATASHEET, DECISION.COMFEE, DECISION.AIR]:
                        self.assertIn('](' + reference + ')', markdown)
                    for text in ['20 °C / 60 % RH', '10 °C / 60 % RH', '216 W', '180 W',
                                 'Comfee MDDF-20DEN7', 'MeacoDry Arete One 20L', 'Arete Two', 'One 25L', 'WF']:
                        self.assertIn(text, markdown)
                    unknown = ('Extraction and running power at these conditions are not verified here.' if en
                               else 'Entzug und Betriebsleistung unter dieser Bedingung nicht verifiziert.')
                    self.assertEqual(markdown.count(unknown), 2)
                    self.assertIn('6 November 2026' if en else '06.11.2026', markdown)
                    self.assertIn('2026\n' + ('Condition' if en else 'Bedingung') + ' |', markdown)
                    self.assertIn('not a whole-market comparison or an EcoBack product test' if en
                                  else 'kein vollständiger Marktvergleich und kein EcoBack-Produkttest', markdown)
                    self.assertNotRegex(markdown, r'https?://[^\s)]*amazon|tag=getecoback|ecoback0d')
                    self.assertNotIn('data-choice-evidence', markdown)
                    self.assertNotIn('Share this decision guide' if en else 'Diese Entscheidungshilfe teilen', markdown)
                    count += 1
        self.assertEqual(count, 6)

    def test_ambiguous_marked_methods_fail_instead_of_silently_choosing(self):
        source = fixture().replace('<!--/EB_BUYER-->', '<details data-choice-method><p>Conflicting method</p></details><!--/EB_BUYER-->')
        with self.assertRaisesRegex(ValueError, 'exactly one data-choice-method'):
            to_markdown(source, '/guide/buyer-fixture.html', 'de')

    def test_nested_household_link_cannot_unwrap_hidden_buyer_results(self):
        # link_household runs after build_structure and inserts before the
        # first h2. On the Keller guide that h2 belongs to the buyer module.
        # A generic EB opener/closer regex can stop at this nested block and
        # accidentally expose the remaining hidden shopping results.
        import moisture_decision as DECISION
        link = ('<!--EB_HOUSEHOLD_LINK--><aside><a href="/guide/luftentfeuchter-ratgeber.html#eb-moisture-choice">'
                'Nested household entry</a></aside><!--/EB_HOUSEHOLD_LINK-->')
        for en in [False, True]:
            with self.subTest(en=en):
                buyer = DECISION.block(en).replace('<h2', link + '<h2', 1)
                source = '<html lang="' + ('en' if en else 'de') + '"><title>Nested module</title><article><p>Keep editorial.</p>' + buyer + '<h2>Authored advice</h2></article></html>'
                route = ('/en' if en else '') + '/guide/nested-module.html'
                markdown = to_markdown(source, route, 'en' if en else 'de')
                self.assertIn('Keep editorial.', markdown)
                self.assertIn('Authored advice', markdown)
                self.assertNotIn('Nested household entry', markdown)
                for shopping in ['Feste Amazon.de-Produktseite', 'A fixed Amazon.de product page',
                                 'Modell bei Amazon.de prüfen', 'Check model at Amazon.de',
                                 'Quellen und Kaufprüfung öffnen', 'Open sources and purchase checks']:
                    self.assertNotIn(shopping, markdown)
                self.assertEqual(markdown.count('How to compare the manufacturer data' if en
                                                else 'So vergleichst du die Herstellerdaten'), 1)
                for reference in [MEACO, COMFEE, DATASHEET, DECISION.COMFEE, DECISION.AIR]:
                    self.assertEqual(markdown.count('](' + reference + ')'), 1)
                with tempfile.TemporaryDirectory() as directory:
                    path = Path(directory) / route.lstrip('/')
                    path.parent.mkdir(parents=True)
                    path.write_text(source)
                    with patch.object(FULL, 'ROOT', directory):
                        self.assertEqual(FULL.body_text(path), markdown)


if __name__ == '__main__':
    unittest.main()
