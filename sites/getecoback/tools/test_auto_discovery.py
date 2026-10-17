import unittest
from build_auto_discovery import block, inject

class Discovery(unittest.TestCase):
    def test_locale_and_escaping(self):
        rows=[('2026-10-17','/guide/test-betriebskosten.html','Device <script>alert(1)</script>','DE'),
              ('2026-10-17','/en/guide/test-running-cost.html','UK model','GB')]
        de=block(rows,'DE'); en=block(rows,'GB')
        self.assertIn('&lt;script&gt;',de); self.assertNotIn('<script>',de)
        self.assertNotIn('UK model',de); self.assertNotIn('/guide/test-betriebskosten',en)
        self.assertIn('#auto-product-tool',en)
    def test_no_duplicates_and_retired_registry_removes_old_discovery(self):
        body='<body><main><article>Useful content</article></main></body>'
        new=block([('2026-10-17','/guide/test.html','Model','DE')],'DE')
        updated=inject(body,new)
        self.assertEqual(inject(updated,new),updated)
        self.assertEqual(updated.count('id="auto-product-guides"'),1)
        self.assertNotIn('auto-product-guides',inject(updated,''))
        self.assertIn('Useful content',inject(updated,''))

if __name__ == '__main__': unittest.main()
