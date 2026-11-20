import copy
import datetime as dt
from html.parser import HTMLParser
import json
from pathlib import Path
import tempfile
import unittest

import build_product_catalog as C


class Document(HTMLParser):
    def __init__(self, html):
        super().__init__(); self.links=[]; self.ids=[]; self.feed(html)
    def handle_starttag(self, tag, attrs):
        attrs=dict(attrs)
        if 'id' in attrs:self.ids.append(attrs['id'])
        if tag=='a':self.links.append(attrs)


def fixture():
    return {'version':1,'market':'DE','max_age_days':90,'published':'2026-11-13','modified':'2026-11-13',
            'categories':[{'id':'luftreiniger','name':'Luftreiniger','intro':'Eine Aufgabe klären.','no_purchase':'Vorhandenes behalten, wenn es genügt.'}],
            'products':[{'id':'beispiel-modell','category':'luftreiniger','name':'Konkretes Modell','brand':'Marke','variant':'Modell 1, nicht Modell 2','role':'Eine passende Aufgabe','facts':'Dokumentierte Funktion.','limit':'Eine konkrete Grenze.','source':'https://www.meaco.com/pages/faqs','source_label':'Herstellerquelle','query':'Marke Konkretes Modell 1','checked':'2026-11-13','status':'verified'}]}


class CatalogTest(unittest.TestCase):
    def test_final_airfryer_evidence_survives_all_generators(self):
        from html import unescape
        html=(C.ROOT/'site/produkte.html').read_text()
        md=(C.ROOT/'site/produkte.md').read_text()
        self.assertIn('id="airfryer-choice"',html)
        self.assertIn('Eine Zone: A danach B',md)
        for p in C.load()['products']:
            if p['category']=='heissluftfritteusen':
                for field in ['name','facts','limit','source']:
                    self.assertIn(p[field],unescape(html))
                    self.assertIn(p[field],md)
        self.assertIn('Keine Zeitberechnung',md.replace('keine Zeitberechnung','Keine Zeitberechnung'))
        self.assertRegex(html,r'product-category-tools\.mjs\?v=[a-f0-9]{12}')

    def test_all_categories_have_source_linked_static_comparisons(self):
        data=C.load(); html=C.render(data,dt.date(2026,11,15))
        category_comparisons=html.split('class="pc-comparison"')[1:]
        self.assertEqual(len(category_comparisons),12)
        comparison_rows=0
        for section in category_comparisons:
            table, closing, _=section.partition('</table>')
            self.assertIn('<table>',table)
            self.assertTrue(closing)
            comparison_rows+=table.count('<th scope="row">')
        self.assertEqual(comparison_rows,48)
        markdown=C.to_markdown(html,C.ROUTE,'de')
        for category in data['categories']:
            if 'buying_guide' not in category:continue
            guide=category['buying_guide']
            self.assertIn(guide['question'],markdown)
            self.assertIn(guide['answer'],markdown)
            for step in guide['steps']:self.assertIn(step,markdown)
        for bad in [None, [], ['one'], ['one','two',0]]:
            broken=copy.deepcopy(data);broken['categories'][0]['buying_guide']['steps']=bad
            with self.assertRaises(ValueError):C.validate(broken)
        self.assertEqual(len(Document(html).ids),len(set(Document(html).ids)))

    def test_window_vacuum_width_example_keeps_package_evidence_and_no_purchase_path(self):
        data=C.load()
        html=C.render(data,dt.date(2026,11,20))
        self.assertEqual(Document(html).ids.count('fenstersauger-duesenbreite'),1)
        answer=html.split('id="fenstersauger-duesenbreite"',1)[1].split('id="fenstersauger-abziehlippen"',1)[0]
        for package, widths in [('1.633-662.0','280 mm'),('1.633-698.0','170 mm / 280 mm'),
                                ('1.633-785.0','170 mm / 280 mm'),('06008B7000','133 mm / 266 mm')]:
            self.assertIn(f'{package}</a></th><td>{widths}</td>',answer)
        sources=[p['source'] for p in data['products'] if p['category']=='fenstersauger']
        sources.append('https://www.bosch-diy.com/storage/de-de/glassvac-100045834-original-pdf-396340-de-de.pdf')
        for href in sources+['#modelle-fenstersauger']:
            self.assertIn(href,[link.get('href') for link in Document(answer).links])
        markdown=C.to_markdown(html,C.ROUTE,'de')
        readable=markdown.split('Welche Saugdüse kommt für ein schmales Glasfeld infrage?',1)[1].split(
            '170-mm-Abziehlippen am genauen Gerät zuordnen',1)[0]
        for surface in (answer,readable):
            for term in ('170 mm Glasbreite','5 mm Reserve je Seite','160 mm','133-mm-Saugkopf',
                         'tatsächliche Außenbreite','vorhandener Abzieher oder ein Tuch',*sources):
                self.assertIn(term,surface)
            self.assertNotIn('amazon.',surface)

    def test_freshness_boundaries_keep_facts_but_withdraw_merchant_action(self):
        data=fixture(); p=data['products'][0]
        for day,allowed in [(dt.date(2026,11,12),False),(dt.date(2026,11,13),True),(dt.date(2027,2,11),True),(dt.date(2027,2,12),False)]:
            html=C.render(data,day)
            self.assertEqual('https://www.amazon.de/s?' in html,allowed,day)
            self.assertIn('Dokumentierte Funktion.',html)
            self.assertIn(p['source'],html)
            if not allowed:self.assertIn('Händlersuche pausiert',html)
        for state in ['unverified','conflict','stale','pending']:
            data['products'][0]['status']=state
            self.assertNotIn('https://www.amazon.de/s?',C.render(data,dt.date(2026,11,13)))

    def test_merchant_search_is_fixed_labelled_and_not_a_product_listing(self):
        from urllib.parse import parse_qs,urlsplit
        html=C.render(fixture(),dt.date(2026,11,13));doc=Document(html)
        merchants=[a for a in doc.links if a.get('href','').startswith('https://www.amazon.')]
        self.assertEqual(len(merchants),1)
        url=urlsplit(merchants[0]['href'])
        self.assertEqual((url.netloc,url.path),('www.amazon.de','/s'))
        self.assertEqual(parse_qs(url.query),{'k':['Marke Konkretes Modell 1'],'tag':['getecoback-21']})
        self.assertEqual(merchants[0]['rel'],'sponsored nofollow noopener')
        self.assertIn('Modellsuche bei Amazon.de',html)
        self.assertEqual(len(doc.ids),len(set(doc.ids)))
        self.assertIn('href="#kategorie-luftreiniger"',html)
        self.assertIn('id="product-filters" role="search" hidden',html)
        self.assertIn('id="produkt-beispiel-modell"',html)
        self.assertIn('href="#modelle-luftreiniger"',html)
        self.assertIn('id="modelle-luftreiniger"',html)
        self.assertIn('href="#pc-tool-luftreiniger"',html)

    def test_rejects_missing_or_duplicate_models_bad_sources_and_merchant_overrides(self):
        for change in [lambda d:d.update(products=[]),lambda d:d.update(market='GB'),lambda d:d.update(max_age_days=True),
                       lambda d:d['products'][0].update(source='https://unreviewed.example/model'),
                       lambda d:d['products'][0].update(source='https://www.meaco.com/pages/faqs?tag=private'),
                       lambda d:d['products'][0].update(checked='2026-02-30'),
                       lambda d:d['products'][0].update(category='missing'),
                       lambda d:d['products'][0].update(query=''),
                       lambda d:d['products'][0].update(affiliate_tag='other-21'),
                       lambda d:d['products'][0].update(name='Anker Solarbank 2'),
                       lambda d:d['categories'][0].update(name='Balkonkraftwerk Speicher')]:
            data=fixture();change(data)
            with self.assertRaises(ValueError):C.validate(data)
        for field in ['id','model','query']:
            data=fixture(); second=copy.deepcopy(data['products'][0]);second.update(id='other',name='Other',query='Other query')
            if field=='id':second['id']=data['products'][0]['id']
            if field=='model':second['name']=data['products'][0]['name'].upper()
            if field=='query':second['query']='  MARKE KONKRETES   MODELL 1 '
            data['products'].append(second)
            with self.assertRaises(ValueError):C.validate(data)

    def test_escaped_content_idempotent_build_and_no_commerce_in_markdown(self):
        data=fixture();data['products'][0]['facts']='Text <img src=x onerror=alert(1)> bleibt Text.'
        html=C.render(data,dt.date(2026,11,13));self.assertNotIn('<img src=x',html);self.assertIn('&lt;img',html)
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);(root/'data').mkdir();(root/'data/product-catalog.json').write_text(json.dumps(data))
            first=C.build(root,dt.date(2026,11,13));a=(root/'site/produkte.html').read_bytes();m=(root/'site/produkte.md').read_text()
            C.build(root,dt.date(2026,11,13));self.assertEqual(a,(root/'site/produkte.html').read_bytes())
            self.assertEqual(first,{'products':1,'categories':1,'merchant_searches':1})
            self.assertNotIn('https://www.amazon.',m);self.assertNotIn('getecoback-21',m)
            self.assertIn('https://www.meaco.com/pages/faqs',m)
            self.assertIn('Eine konkrete Grenze.',m)
            # Building at another time does not fabricate editorial freshness.
            self.assertIn('"dateModified":"2026-11-13"',C.render(data,dt.date(2027,1,1)))


if __name__=='__main__':unittest.main()
