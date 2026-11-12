import unittest
from build_dach_discovery import inject, PAGES, ROOT

class DiscoveryTests(unittest.TestCase):
    def test_repeat_build_keeps_one_block(self):
        once = inject('<main><h1>Existing task</h1></main>')
        self.assertEqual(inject(once), once)
        self.assertEqual(once.count('id="dach-kaufhilfe"'), 1)
        self.assertIn('Existing task', once)

    def test_final_pages_have_real_destinations(self):
        for name in PAGES:
            text = (ROOT / 'site' / name).read_text()
            self.assertIn('<!--EB_DACH_BUYING-->', text, name)
            self.assertIn('/guide/saugwischer-kaufberatung.html', text, name)
        self.assertTrue((ROOT / 'site/guide/saugwischer-kaufberatung.html').exists())

if __name__ == '__main__':
    unittest.main()
