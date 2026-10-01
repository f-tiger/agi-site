import contextlib
import io
import tempfile
import unittest
from pathlib import Path
from coverage import build, status, exemption, Page, SITES

class CoverageTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
    def page(self, script=''):
        return '<html><head><link rel="canonical" href="https://agiscorecard.com/earn"></head><body>' + script + '</body></html>'
    def test_existing_tag_and_config_remain_byte_identical(self):
        html = self.page('<script async src="https://www.googletagmanager.com/gtag/js?id=G-FZXLMBB5QB"></script><script>gtag("config","G-FZXLMBB5QB")</script>')
        f = self.root / 'earn.html'; f.write_text(html)
        with contextlib.redirect_stdout(io.StringIO()): report = build(self.root, 'agi', True)
        self.assertEqual(f.read_text(), html)
        self.assertEqual(next(r for r in report['records'] if r['file']=='earn.html')['mode'], 'existing')
    def test_missing_is_repaired_idempotently_but_check_only_fails(self):
        f = self.root / 'earn.html'
        f.write_text(self.page('<script>window.gtag=function(){/* first-party bridge only */}</script><!-- googletagmanager.com/gtag/js -->'))
        with self.assertRaisesRegex(AssertionError,'Missing GA4'): build(self.root,'agi')
        with contextlib.redirect_stdout(io.StringIO()):
            build(self.root,'agi',True); first=f.read_text(); build(self.root,'agi',True); build(self.root,'agi')
        self.assertEqual(first,f.read_text())
        self.assertEqual(first.count('data-ga4-id='),1)
    def test_wrong_property_and_duplicate_are_blocked(self):
        wrong = self.page('<script src="https://www.googletagmanager.com/gtag/js?id=G-E2V0Q9SJ9V"></script>')
        with self.assertRaisesRegex(AssertionError,'Unexpected measurement'): status(wrong,self.root,'agi')
        double=self.page('<script src="https://www.googletagmanager.com/gtag/js?id=G-FZXLMBB5QB"></script>'*2)
        with self.assertRaisesRegex(AssertionError,'Duplicate'): status(double,self.root,'agi')
    def test_local_dynamic_loader_is_recognized_and_missing_asset_fails(self):
        (self.root/'tag.js').write_text('s.src="https://www.googletagmanager.com/gtag/js?id=G-FZXLMBB5QB"')
        self.assertEqual(len(status(self.page('<script src="/tag.js?v=1"></script>'),self.root,'agi')[1]),1)
        with self.assertRaisesRegex(AssertionError,'Missing script'): status(self.page('<script src="/missing.js"></script>'),self.root,'agi')
    def test_exceptions_are_narrow_and_documented(self):
        p=Page(self.page())
        for rel in ['members.html','zh/members.html','studio/quote-builder.html','widgets/taupunkt.html','__ci/probe.html']:
            self.assertTrue(exemption(rel,p),rel)
        for rel in ['member-benefits.html','tools.html','earn.html','privacy.html']:
            self.assertIsNone(exemption(rel,p),rel)
    def test_site_ids_are_distinct(self):
        self.assertEqual(len({v[1] for v in SITES.values()}),4)

if __name__=='__main__': unittest.main()
