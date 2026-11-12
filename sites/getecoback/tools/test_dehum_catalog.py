import copy
import datetime as dt
import re
import unittest
from urllib.parse import parse_qs, urlsplit
from html import unescape
import dehum_catalog as C
from build_agent_md import to_markdown
from build_structure import inject_models

class CatalogTest(unittest.TestCase):
    def test_committed_purchase_routes_survive_repeated_injection(self):
        for slug in C.load()['pages']:
            source=(C.DATA.parent.parent/'site/guide'/f'{slug}.html').read_text()
            first=inject_models(source,slug)
            self.assertEqual(first,inject_models(first,slug))
            self.assertEqual(first.count('data-catalog-evidence'),1)
            self.assertEqual(first.count('class="dc-card"'),6)
        self.assertIsNone(C.block('luftentfeuchter-20-qm'))

    def test_scoped_routes_and_source_identity(self):
        d=C.load()
        self.assertEqual(len(d['products']),6)
        self.assertEqual(len(d['pages']),3)
        self.assertIsNone(C.block('klimaanlage-kaufen'))
        html=C.block('luftentfeuchter-ratgeber',dt.date(2026,11,12))
        for p in d['products']:
            self.assertIn(p['source'],html)
            self.assertIn(p['variant'],html)
        urls=[unescape(u) for u in re.findall(r'href="([^"]+)"',html) if 'amazon.de' in u]
        self.assertEqual(len(urls),6)
        for p,url in zip(d['products'],urls):
            q=parse_qs(urlsplit(url).query)
            self.assertEqual(q['tag'],['getecoback-21'])
            if p.get('asin'):self.assertEqual(urlsplit(url).path,'/dp/B07KJX6RDK')
            else:self.assertEqual(q['k'],[p['query']])
        self.assertIn('keine Rangliste',html)
        self.assertIn('ander',html)

    def test_stale_future_or_unverified_sources_remove_commerce_not_evidence(self):
        for day in [dt.date(2026,11,11),dt.date(2027,2,11)]:
            s=C.block('luftentfeuchter-ratgeber',day)
            self.assertNotIn('https://www.amazon.de',s)
            self.assertIn('Bosch Dry 4000',s)
        d=copy.deepcopy(C.load());d['products'][0]['status']='conflict'
        s=C.block('luftentfeuchter-ratgeber',dt.date(2026,11,12),d)
        self.assertNotIn('k=Bosch',s)
        self.assertEqual(s.count('rel="sponsored nofollow noopener"'),5)

    def test_mirror_preserves_all_evidence_without_shopping_and_does_not_invent_sources(self):
        s=C.block('luftentfeuchter-ratgeber',dt.date(2026,11,12))
        md=to_markdown('<title>Modelle</title><article>'+s+'</article>','/guide/luftentfeuchter-ratgeber.html','de')
        for p in C.load()['products']:
            self.assertIn(p['name'],md)
            self.assertIn(p['source'],md)
            self.assertIn(p['limit'],md)
        self.assertNotIn('amazon.de',md)
        self.assertNotIn('getecoback-21',md)
        self.assertNotIn('data-catalog-commerce',md)
        self.assertEqual(C.evidence_html('<article>Other article</article>'),'')

    def test_unknown_conditions_do_not_become_efficiency_rankings(self):
        d=C.load();bos=d['products'][0];two=d['products'][1];luk=d['products'][2]
        self.assertIn('nicht belegt',bos['limit'])
        self.assertIn('20 °C / 60 %',two['facts'])
        self.assertIn('12.11.2026',two['limit'])
        self.assertIn('andere Händler',two['limit'])
        self.assertIn('kein gemessener Verbrauch',luk['limit'])
        self.assertIn('nicht Lukas little',luk['variant'])

if __name__=='__main__':unittest.main()
