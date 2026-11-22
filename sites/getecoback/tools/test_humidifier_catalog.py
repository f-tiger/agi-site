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
REVIEW_DAY = dt.date(2026, 11, 18)


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
        self.assertEqual([p['id'] for p in self.data['products']],['oskar-o020','beurer-lb200','beurer-lb55','oskar-little-o060'])
        html=catalog.render(REVIEW_DAY,self.data)
        parser=PageParser();parser.feed(html)
        links=[u for u in parser.links if 'amazon.de' in u]
        self.assertEqual(len(links),4)
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
        for delta,count in [(-1,0),(0,3),(6,4),(90,4),(91,1),(96,1),(97,0)]:
            text=catalog.render(DAY+dt.timedelta(days=delta),self.data)
            self.assertEqual(text.count('amazon.de/s?'),count)
            self.assertIn('Stadler Form Oskar weiß O-020',text)
            self.assertIn(self.data['sources']['lb200_manual']['url'],text)
        d=copy.deepcopy(self.data);d['products'][1]['status']='unverified'
        html=catalog.render(DAY,d)
        self.assertEqual(html.count('amazon.de/s?'),2)
        self.assertNotIn('k=Beurer+LB+200+10069',html)
        self.assertIn('Quellenprüfung ausstehend',html)

    def test_mixed_review_dates_preserve_old_evidence_and_decision(self):
        self.assertEqual(self.data['checked'],'2026-11-12')
        self.assertEqual(self.data['products'][3]['checked'],'2026-11-18')
        html=catalog.render(REVIEW_DAY,self.data)
        self.assertEqual(html.count('Herstellerquellen geprüft: 2026-11-12'),3)
        self.assertEqual(html.count('Herstellerquellen geprüft: 2026-11-18'),1)
        for text in ['Oskar oder Oskar little', 'zwei vollständige Wechsel', 'keine Zusage geringerer Gesamtkosten', 'kaufe vorerst nichts']:
            self.assertIn(text,html)
        expired=catalog.render(DAY+dt.timedelta(days=91),self.data)
        self.assertNotIn('k=Stadler+Form+Oskar+O-020',expired)
        self.assertIn('k=Stadler+Form+Oskar+little+O-060',expired)

    def test_unreviewed_sources_and_bad_identity_rejected(self):
        mutations=[lambda d:d['sources']['lb200'].update(url='https://evil.example/'),
                   lambda d:d['sources']['lb200'].update(url='https://res.cloudinary.com/other/file.pdf'),
                   lambda d:d['products'][1].update(id=d['products'][0]['id']),
                   lambda d:d['products'][0].update(sources=['missing']),
                   lambda d:d.update(max_age_days=365),
                   lambda d:d['products'][3].update(checked='2026-02-30')]
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
            self.assertEqual(article['dateModified'],p['modified'])
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
                self.assertEqual(html.count('class="hc-card"'),4)
                self.assertIn('kaufe vorerst nichts',html)
            else:
                self.assertNotIn('amazon.de/s?',html)
                self.assertNotIn('class="hc-card"',html)
                self.assertIn('/guide/luftbefeuchter-ratgeber.html#',html)
            for old in ['ohne Überfeuchtungsrisiko','nicht gefährlich','der einzige Fall','Du sparst','ab 10 €']:
                self.assertNotIn(old,html)

    def test_energy_math_and_physics_are_explicit_scenarios(self):
        html=guide.render(guide.ENERGY,DAY,self.data)
        for expected in ['6–15 W','6–18 W','17 W','365 W','0,136 kWh','2,920 kWh','1,22 €','26,28 €','keine Verbrauchsmessung']:
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

    def test_humidifier_efficiency_section_is_published_with_both_operating_limits(self):
        path = catalog.ROOT / 'site/guide' / f'{guide.ENERGY}.html'
        html, md = path.read_text(), path.with_suffix('.md').read_text()
        self.assertEqual(html.count('id="effizienz-vergleichen"'), 1)
        for text in (html, md):
            self.assertIn('365 W Nennleistung', text)
            self.assertIn('Eine separate Leistungsaufnahme für jede Stufe nennt sie dort nicht.', text)
            self.assertIn('Stufe I 6 W und bis zu 200 g/h, für Stufe II 18 W und bis zu 370 g/h', text)
            for source in ('oskar_manual', 'lb55_manual'):
                self.assertIn(self.data['sources'][source]['url'], text)

    def test_published_accessory_lookup_keeps_model_to_part_matches(self):
        base = catalog.ROOT / 'site/guide'
        html = (base / f'{guide.MAIN}.html').read_text()
        md = (base / f'{guide.MAIN}.md').read_text()
        heading = 'Welcher Ersatzfilter oder welches Kalkpad passt zu meinem Luftbefeuchter?'
        self.assertEqual(html.count('id="ersatzteile-zuordnen"'), 1)
        self.assertIn('href="#ersatzteile-zuordnen"', html)
        self.assertIn(heading, md)
        html_lookup = html.split('id="ersatzteile-zuordnen"', 1)[1].split('</section>', 1)[0]
        md_lookup = md.split('## ' + heading, 1)[1].split('\n## ', 1)[0]
        html_rows = re.findall(r'<li>(.*?)</li>', html_lookup, re.S)
        md_rows = [line for line in md_lookup.splitlines() if line.startswith('- ')]
        matches = [
            ('O-020', 'oskar_filter', 'Zwei Filtermatten'),
            ('O-060', 'oskar_filter', 'Eine Filtermatte'),
            ('LB 200', 'lb200_filter', '110.005'),
            ('LB 55', 'lb55_pads', 'Kalkpads'),
        ]
        for rows in (html_rows, md_rows):
            self.assertEqual(len(rows), len(matches))
            for model, source, detail in matches:
                matching = [row for row in rows if model in row]
                self.assertEqual(len(matching), 1, model)
                self.assertIn(self.data['sources'][source]['url'], matching[0])
                self.assertIn(detail, matching[0])
        for lookup in (html_lookup, md_lookup):
            self.assertIn('Typenschild', lookup)
            self.assertIn('unleserlichen', lookup)
            self.assertIn('Mengenangaben', lookup)
            self.assertNotIn('amazon.de/', lookup)

    def test_philips_filter_sources_and_canonical_share_targets(self):
        from build_agent_md import to_markdown

        path = catalog.ROOT / 'site/guide' / f'{guide.MAIN}.html'
        html = path.read_text()
        md = to_markdown(html, f'/guide/{guide.MAIN}.html', 'de')
        data = json.loads(guide.PHILIPS_FILTERS.read_text())
        self.assertEqual(html.count('id="philips-verdunsterfilter"'), 1)
        section = html.split('<section aria-labelledby="philips-verdunsterfilter">', 1)[1].split('</section>', 1)[0]
        self.assertIn('href="#philips-verdunsterfilter"', html)
        parser = PageParser()
        parser.feed(section)
        base = f'https://getecoback.com/guide/{guide.MAIN}.html'
        self.assertNotIn('reddit.com/submit', md)
        self.assertNotIn('amazon.de/', section)
        self.assertIn(data['manufacturer_source'], md)
        self.assertIn('warte mit der Bestellung', md)
        self.assertIn('pausiere die Befeuchtung', md)
        for device, part, anchor in (
            ('HU4803/01', 'FY2401/30', 'philips-hu4803-01'),
            ('HU2716/10', 'FY3446/30', 'philips-hu2716-10'),
        ):
            with self.subTest(device=device):
                self.assertEqual(parser.ids.count(anchor), 1)
                model = next(row for row in data['models'] if row['device'] == device)
                target = f'{base}#{anchor}'
                self.assertIn(target, parser.links)
                share = next(url for url in parser.links if device in parse_qs(urlsplit(url).query).get('title', [''])[0])
                share_url = urlsplit(share)
                self.assertEqual((share_url.scheme, share_url.netloc, share_url.path),
                                 ('https', 'www.reddit.com', '/submit'))
                self.assertEqual(parse_qs(share_url.query), {
                    'url': [target], 'title': [f'Welcher Verdunsterfilter passt zum Philips {device}?'],
                })
                answer = md.split(f'### Philips {device}', 1)[1].split('\n### ', 1)[0]
                self.assertIn(part, answer)
                self.assertIn(model['source'], answer)

    def test_final_artifacts_keep_catalog_and_support_separation(self):
        for slug in guide.PAGES:
            html=(catalog.ROOT/'site/guide'/f'{slug}.html').read_text()
            self.assertIn('humidifier-catalog.css',html)
            self.assertIn('Redaktionell aktualisiert am '+str(int(guide.PAGES[slug]['modified'][-2:]))+'. November 2026',html)
            self.assertNotIn('data-eb-explainer="dehum"',html)
            if slug==guide.MAIN:
                self.assertEqual(html.count('id="eb-humidifier-products"'),1)
                for p in self.data['products']:self.assertIn('id="humidifier-'+p['id']+'"',html)
            else:self.assertNotIn('class="hc-card"',html)


if __name__=='__main__':unittest.main()
