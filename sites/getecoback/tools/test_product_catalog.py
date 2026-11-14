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
