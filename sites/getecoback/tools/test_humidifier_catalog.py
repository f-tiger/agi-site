"""Evidence expiry, exact model links, source parity and three separate intents."""
import copy
import datetime as dt
import json
import re
import unittest
from html import unescape
from html.parser import HTMLParser
from urllib.parse import parse_qs, urlsplit

import humidifier_catalog as catalog
import build_humidifier_guide as guide

DAY = dt.date(2026, 11, 12)


class PageParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links=[]
        self.ids=[]
        self.scripts=[]
        self.in_ld=False
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if 'id' in a:self.ids.append(a['id'])
        if tag=='a' and a.get('href'):self.links.append(a['href'])
        if tag=='script' and a.get('type')=='application/ld+json':self.in_ld=True
    def handle_endtag(self,tag):
        if tag=='script':self.in_ld=False
    def handle_data(self,text):
        if self.in_ld:self.scripts.append(json.loads(text))


class HumidifierTests(unittest.TestCase):
    def setUp(self):
        self.data=catalog.load()

    def test_exact_models_queries_and_care_sources(self):
        self.assertEqual([p['id'] for p in self.data['products']],['oskar-o020','beurer-lb200','beurer-lb55'])
        html=catalog.render(DAY,self.data)
        parser=PageParser();parser.feed(html)
        links=[u for u in parser.links if 'amazon.de' in u]
        self.assertEqual(len(links),3)
        for link,p in zip(links,self.data['products']):
            u=urlsplit(link)
            self.assertEqual((u.scheme,u.netloc,u.path),('https','www.amazon.de','/s'))
            self.assertEqual(parse_qs(u.query),{'k':[p['query']],'tag':['getecoback-21']})
            for key in p['sources']:self.assertIn(self.data['sources'][key]['url'],html)
        for part in ['O-030','110005','163141']:self.assertIn(part,html)
        self.assertIn('70 %',html)
        self.assertIn('kein geprüftes Einzelangebot',html)
        self.assertIn('Heißer Dampf',html)
        self.assertNotRegex(html,r'(?i)testsieger|[0-9]+,[0-9]{2}\s*€')

    def test_freshness_boundaries_and_unverified_fail_closed(self):
        for delta,count in [(-1,0),(0,3),(90,3),(91,0)]:
            text=catalog.render(DAY+dt.timedelta(days=delta),self.data)
            self.assertEqual(text.count('amazon.de/s?'),count)
            self.assertIn('Stadler Form Oskar weiß O-020',text)
            self.assertIn(self.data['sources']['lb200_manual']['url'],text)
        d=copy.deepcopy(self.data);d['products'][1]['status']='unverified'
        html=catalog.render(DAY,d)
        self.assertEqual(html.count('amazon.de/s?'),2)
        self.assertNotIn('k=Beurer+LB+200+10069',html)
        self.assertIn('Quellenprüfung ausstehend',html)

    def test_unreviewed_sources_and_bad_identity_rejected(self):
        mutations=[lambda d:d['sources']['lb200'].update(url='https://evil.example/'),
                   lambda d:d['sources']['lb200'].update(url='https://res.cloudinary.com/other/file.pdf'),
                   lambda d:d['products'][1].update(id=d['products'][0]['id']),
                   lambda d:d['products'][0].update(sources=['missing']),
                   lambda d:d.update(max_age_days=365)]
        for mutate in mutations:
            d=copy.deepcopy(self.data);mutate(d)
            with self.assertRaises(ValueError):catalog.render(DAY,d)

    def test_intent_schema_meta_internal_links_and_idempotence(self):
        for slug,p in guide.PAGES.items():
            html=guide.render(slug,DAY,self.data)
            self.assertEqual(html,guide.render(slug,DAY,self.data))
            self.assertTrue(120<=len(p['description'])<=155)
            self.assertEqual(html.count('<h1>'),1)
            self.assertIn('https://getecoback.com/guide/'+slug+'.html',html)
            parser=PageParser();parser.feed(html)
            self.assertEqual(len(parser.ids),len(set(parser.ids)))
            article,faq=parser.scripts[0]['@graph']
            self.assertEqual(article['datePublished'],p['published'])
            self.assertEqual(article['dateModified'],'2026-11-12')
            visible=[(unescape(q),unescape(a)) for q,a in re.findall(r'<details><summary>(.*?)</summary><p>(.*?)</p></details>',html)]
            structured=[(v['name'],v['acceptedAnswer']['text']) for v in faq['mainEntity']]
            self.assertEqual(visible,structured)
            self.assertNotRegex(html,r'"(?:aggregateRating|offers)"')
            for link in parser.links:
                u=urlsplit(link)
                if u.scheme or u.netloc:continue
                if u.path:
                    target=catalog.ROOT/'site'/u.path.lstrip('/')
                    if u.path=='/':target=target/'index.html'
                    self.assertTrue(target.exists(),(slug,link))
                elif u.fragment:self.assertIn(u.fragment,parser.ids,(slug,link))
            if slug==guide.MAIN:
                self.assertIn('data-humidifier-guide',html)
                self.assertEqual(html.count('class="hc-card"'),3)
                self.assertIn('kaufe vorerst nichts',html)
            else:
                self.assertNotIn('amazon.de/s?',html)
                self.assertNotIn('class="hc-card"',html)
                self.assertIn('/guide/luftbefeuchter-ratgeber.html#',html)
            for old in ['ohne Überfeuchtungsrisiko','nicht gefährlich','der einzige Fall','Du sparst','ab 10 €']:
                self.assertNotIn(old,html)

    def test_energy_math_and_physics_are_explicit_scenarios(self):
        html=guide.render(guide.ENERGY,DAY,self.data)
        for expected in ['6–18 W','17 W','365 W','0,136 kWh','2,920 kWh','1,22 €','26,28 €','keine Verbrauchsmessung']:
            self.assertIn(expected,html)
        table=guide.wall_rows()
        self.assertIn('<th scope="row">50 %</th><td>64 %</td><td>73 %</td><td>83 %</td>',table)
        self.assertIn('keine universelle Schimmelgrenze',guide.render(guide.MAIN,DAY,self.data))

    def test_markdown_preserves_official_evidence_and_no_commerce(self):
        from build_agent_md import to_markdown
        for slug in guide.PAGES:
            md=to_markdown(guide.render(slug,DAY,self.data),'/guide/'+slug+'.html','de')
            self.assertNotIn('amazon.de/',md)
            self.assertNotIn('getecoback-21',md)
            if slug==guide.MAIN:
                for p in self.data['products']:
                    self.assertIn(p['name'],md)
                    for key in p['sources']:self.assertIn(self.data['sources'][key]['url'],md)
                self.assertIn(self.data['sources']['uba']['url'],md)

    def test_final_artifacts_keep_catalog_and_support_separation(self):
        for slug in guide.PAGES:
            html=(catalog.ROOT/'site/guide'/f'{slug}.html').read_text()
            self.assertIn('humidifier-catalog.css',html)
            self.assertIn('Aktualisiert am 12. November 2026',html)
            self.assertNotIn('data-eb-explainer="dehum"',html)
            if slug==guide.MAIN:
                self.assertEqual(html.count('id="eb-humidifier-products"'),1)
                for p in self.data['products']:self.assertIn('id="humidifier-'+p['id']+'"',html)
            else:self.assertNotIn('class="hc-card"',html)


if __name__=='__main__':unittest.main()
