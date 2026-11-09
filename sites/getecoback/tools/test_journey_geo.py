"""Only the published reasoned next step survives generic chrome removal."""
import unittest
from build_agent_md import to_markdown
from moisture_journeys import GUIDE_NEXT, render_next_steps
from laundry_decision import block, inject

class JourneyGeo(unittest.TestCase):
    def test_laundry_fallback_preserves_example_and_checklist_in_markdown(self):
        for en, slug in [(False, 'waeschetrockner-oder-luftentfeuchter'), (True, 'dehumidifier-drying-clothes-cost')]:
            source = '<html><title>Costs</title><article>' + block(en) + '</article></html>'
            rendered = inject(source, slug, en)
            self.assertEqual(inject(rendered, slug, en), rendered)
            self.assertIn('<form data-laundry hidden inert>', rendered)
            self.assertIn('data-laundry-fields disabled', rendered)
            self.assertIn('data-example disabled', rendered)
            self.assertIn('data-share disabled', rendered)
            for html in (rendered, rendered.replace('<details id="lc-measurement">', '<details>')):
                md = to_markdown(html, '/' + slug + '.html', 'en' if en else 'de')
                self.assertIn('0.525' if en else '0,525', md)
                self.assertIn('Record start/end energy readings' if en else 'Notiere Start- und Endstand', md)
                self.assertIn('not a product measurement' if en else 'keine Produktmessung', md)
                self.assertNotIn('data-laundry-fields', md)
                self.assertNotIn('amazon.', md)

    def test_reviewed_handoff_retains_reason_and_exact_destination_without_commerce(self):
        for route in ['/guide/luftfeuchtigkeit-senken.html', '/en/guide/dehumidifier-20-sqm.html']:
            nav = render_next_steps(route)
            source = '<html><title>Task guide</title><article><p>Existing answer.</p>' + nav + '</article></html>'
            result = to_markdown(source, route, 'en' if route.startswith('/en/') else 'de')
            for step in GUIDE_NEXT[route]:
                self.assertIn(step['why'], result)
                self.assertIn('https://getecoback.com' + step['href'], result)
                self.assertEqual(result.count(step['label']), 1)
            self.assertNotIn('amazon.', result)
            self.assertNotIn('data-country-action', result)

    def test_absent_or_generic_navigation_is_not_invented_or_kept(self):
        source = '<html><title>Task</title><article>Answer<!--EB_RELATED--><nav>UNRELATED_LINKS</nav><!--/EB_RELATED--></article></html>'
        result = to_markdown(source, '/guide/luftfeuchtigkeit-senken.html', 'de')
        self.assertNotIn('UNRELATED_LINKS', result)
        self.assertNotIn('Dein nächster Schritt', result)

if __name__ == '__main__':
    unittest.main()
