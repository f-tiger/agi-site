#!/usr/bin/env python3
import copy
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import tempfile
import unittest
import build_auto_content as render

def product(country='DE'):
    de=country=='DE';url='https://de.trotec.com/shop/ttk-50-test.html' if de else 'https://www.meaco.com/products/test-12l-dehumidifier'
    return {'source_id':'test-'+country,'country':country,'language':'de' if de else 'en-GB','name':'Trotec TTK 50 Test' if de else 'Meaco Test 12L','brand':'Trotec' if de else 'Meaco','model':'TTK 50 Test' if de else 'Test 12L','product_url':url,'source_urls':[url],'checked_at':'2026-10-17T01:23:00Z','source_hash':'testhash','power_watts':200,'market':{'currency':'EUR' if de else 'GBP','plug':None},'facts':[{'key':'power_watts','label':'Power input','value':200,'unit':'W','context':'20°C / 60% RH; manufacturer measurement'},{'key':'extraction_l_per_day','label':'Extraction','value':12,'unit':'L/day','context':'30°C / 80% RH'},{'key':'tank_l','label':'Tank','value':2.5,'unit':'L','context':''},{'key':'noise_db','label':'Noise','value':'35, 38 and 44','unit':'dB(A)','context':'three fan speeds; distance not stated'},{'key':'operating_temperature_min_c','label':'Minimum temperature','value':5,'unit':'°C','context':''},{'key':'operating_temperature_max_c','label':'Maximum temperature','value':35,'unit':'°C','context':''}]}

def route(country='DE'): return '/guide/auto-test-model-betriebskosten.html' if country=='DE' else '/en/guide/auto-test-model-running-cost.html'

def render_fixture(country='DE'):
    return render.render_page(product(country),route(country),'2026-10-16','2026-10-17')

class AutoContentRendering(unittest.TestCase):
    def test_structured_faq_matches_visible_answer_and_source_facts(self):
        for country in ['DE','GB']:
            doc=render_fixture(country)
            self.assertEqual(doc.count('<h1>'),1);self.assertEqual(doc.count('rel="canonical"'),1);self.assertIn('href="https://getecoback.com'+route(country)+'"',doc)
            self.assertIn('id="auto-product-tool"',doc);self.assertEqual(doc.count(render.MARKER),1)
            self.assertIn('data-cost-formula',doc);self.assertIn('data-power-limit',doc)
            self.assertEqual(doc.count('data-fact-key='),6)
            data=json.loads(re.search(r'<script type="application/ld\+json">(.*?)</script>',doc,re.S)[1]);article,faq=data['@graph']
            self.assertEqual(article['datePublished'],'2026-10-16');self.assertEqual(article['dateModified'],'2026-10-17')
            for item in faq['mainEntity']:
                self.assertIn(render.esc(item['name']),doc);self.assertIn(render.esc(item['acceptedAnswer']['text']),doc)
            self.assertIn('20°C / 60% RH',doc);self.assertIn('30°C / 80% RH',doc);self.assertIn('35, 38 and 44',doc)
            self.assertNotIn('amazon.',doc);self.assertNotIn('ui.awin.',doc);self.assertNotIn('checked="',doc)
            self.assertIn('<form hidden>',doc);self.assertIn('<noscript>',doc)
            for value in (['0,56 €','16,80 €'] if country=='DE' else ['£0.56','£16.80']):self.assertIn(value,doc)
            before=doc.split(render.MARKER)[0];after=doc.split('<!--/EB_AUTO_CONTENT-->')[1]
            self.assertIn('<h1>',before);self.assertIn('auto-product.mjs',before);self.assertIn('data-fact-key=',after);self.assertIn('data-cost-formula',after)
    def test_dates_are_input_only_and_idempotent(self):
        self.assertEqual(render_fixture(),render_fixture())
        with tempfile.TemporaryDirectory() as directory:
            base=Path(directory);manifest=base/'manifest.json';site=base/'site';manifest.write_text(json.dumps({'schema_version':1,'pages':{route():{'product':product(),'published':'2026-10-16','modified':'2026-10-17'}}}))
            self.assertEqual(render.build(manifest,site),{'pages':1,'changed':1});self.assertEqual(render.build(manifest,site),{'pages':1,'changed':0})
            (site/route().lstrip('/')).write_text('<html>Human page</html>')
            with self.assertRaisesRegex(ValueError,'unmanaged'):render.build(manifest,site)
    def test_missing_facts_are_explicit_and_change_decision_body(self):
        p=product('GB');p['facts']=[p['facts'][0]]+[{'key':key,'label':key,'value':value,'unit':unit,'context':''} for key,value,unit in [('weight_kg',10,'kg'),('dimensions_mm','500 × 300 × 200','mm'),('extraction_l_per_day',12,'L/day')]];doc=render.render_page(p,route('GB'),'2026-10-16','2026-10-17')
        for phrase in ['does not establish usable tank size','operating-temperature range is missing','noise figure with measurement conditions is missing','Continuous drainage is not positively confirmed','A UK plug and delivery eligibility are not verified']:
            self.assertIn(phrase,doc)
        p['facts'].append({'key':'continuous_drainage','label':'Drain','value':True,'unit':'','context':'Follow manual'});doc=render.render_page(p,route('GB'),'2026-10-16','2026-10-17')
        self.assertIn('Continuous drainage is identified',doc);self.assertIn('data-drain-verified="yes"',doc)
    def test_invalid_paths_sources_and_numbers_fail_closed(self):
        for path in ['/en/guide/test.html','/guide/../../secret.html','https://evil.test/page','/guide/test.html?key=1']:
            with self.assertRaises(ValueError):render.render_page(product(),path,'2026-10-16','2026-10-17')
        for url in ['http://www.meaco.com/products/x','javascript:alert(1)','https://www.meaco.com.evil.test/x','https://user@www.meaco.com/x','https://127.0.0.1/private','https://www.meaco.com:444/x','https://www.meaco.com:443/x','https://www.meaco.com/products/x?key=1','https://www.meaco.com/products/x#claim']:
            p=product();p['source_urls']=[url]
            with self.assertRaises(ValueError):render.render_page(p,route(),'2026-10-16','2026-10-17')
        for power in [-1,0,float('nan'),float('inf'),True,10001]:
            p=product();p['power_watts']=power
            with self.assertRaises(ValueError):render.render_page(p,route(),'2026-10-16','2026-10-17')
        p=product();p['market']['currency']='GBP'
        with self.assertRaises(ValueError):render.render_page(p,route(),'2026-10-16','2026-10-17')
    def test_registry_rejects_thin_pages_and_symlink_writes(self):
        p=product();p['facts']=[p['facts'][0],p['facts'][4],p['facts'][5]]
        with self.assertRaisesRegex(ValueError,'four independent'):render.render_page(p,route(),'2026-10-16','2026-10-17')
        with self.assertRaises(ValueError):render.render_page(product(),'/guide/uncontrolled-page.html','2026-10-16','2026-10-17')
        with tempfile.TemporaryDirectory() as directory:
            base=Path(directory);site=base/'site';site.mkdir();outside=base/'outside';outside.mkdir();(site/'guide').symlink_to(outside,target_is_directory=True)
            manifest=base/'manifest.json';manifest.write_text(json.dumps({'schema_version':1,'pages':{route():{'product':product(),'published':'2026-10-16','modified':'2026-10-17'}}}))
            with self.assertRaisesRegex(ValueError,'Symlink'):render.build(manifest,site)
            self.assertEqual(list(outside.iterdir()),[])
    def test_real_long_model_metadata_respects_existing_seo_gate(self):
        for country,model in [('GB','MeacoDry Arete® One 20L'),('GB','MeacoDry Arete® Two 25L'),('DE','TTK 32 E'),('GB','Meaco Future & Quiet '+('Advanced ' * 12)+'17L')]:
            p=product(country);p['model']=model;p['name']=model+' Dehumidifier / Air Purifier'
            doc=render.render_page(p,route(country),'2026-10-16','2026-10-17')
            self.assertLessEqual(len(re.search(r'<title>(.*?)</title>',doc)[1]),70)
            self.assertLessEqual(len(re.search(r'name="description" content="(.*?)"',doc)[1]),165)
            self.assertIn(render.esc(model),doc)
    def test_untrusted_text_is_data_not_html_or_script(self):
        p=product();p['name']='Some </script><script>alert(1)</script>'
        p['facts'][0]['context']='</p><img src=x onerror=alert(1)>'
        doc=render.render_page(p,route(),'2026-10-16','2026-10-17')
        self.assertNotIn('<script>alert(1)</script>',doc);self.assertNotIn('<img src=x',doc)
        self.assertIn('&lt;img src=x',doc)
        data=json.loads(re.search(r'<script type="application/ld\+json">(.*?)</script>',doc,re.S)[1]);self.assertIn('</p><img',data['@graph'][1]['mainEntity'][0]['acceptedAnswer']['text'])
    def test_no_js_page_contains_useful_independent_decisions_and_all_local_links_exist(self):
        for country in ['DE','GB']:
            doc=render_fixture(country)
            self.assertGreater(len(re.sub('<[^>]+>',' ',doc)),6500)
            for target in re.findall(r'href="(/[^\"]+)"',doc):
                local=render.ROOT/'site'/target.lstrip('/')
                if target.endswith('/'):local=local/'index.html'
                self.assertTrue(local.exists(),target)
            self.assertIn('5 °C',doc);self.assertIn('35 °C',doc);self.assertIn('2.5 L',doc)
            self.assertIn('data-drain-verified="no"',doc)

if __name__=='__main__':unittest.main()
