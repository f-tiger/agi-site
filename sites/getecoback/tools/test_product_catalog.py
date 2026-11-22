import copy
import datetime as dt
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import tempfile
import unittest
from urllib.parse import parse_qs, urlsplit

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
    def test_focused_parts_are_static_readable_and_reached_from_catalogue_entries(self):
        from link_product_catalog import inject
        route = C.ROUTE
        data = C.load()
        page = (C.ROOT / 'site' / route.lstrip('/')).read_text()
        markdown = (C.ROOT / 'site' / route.lstrip('/')).with_suffix('.md').read_text()
        self.assertEqual(Document(page).ids.count('ersatzteile-pruefen'), 1)
        self.assertLess(page.index('id="ersatzteile-pruefen"'), page.index('id="product-query"'))
        section = re.search(r'<section id="ersatzteile-pruefen"[^>]*>.*?</section>', page, re.S)
        self.assertIsNotNone(section)
        links = Document(section[0]).links
        expected = [
            '/produkte.html#miele-staubsaugerbeutel', '/produkte.html#kaercher-170mm-saugduese',
            '/produkte.html#kaffee-wasserfilter', '/guide/trotec-luftentfeuchter-test.html#ttk70-hepa-filter',
            '/ersatzfilter.html#finder',
        ]
        self.assertEqual([route+href if href.startswith('#') else href for href in (link['href'] for link in links)], expected)
        self.assertIn('Typenschild', section[0])
        self.assertNotIn('hidden', section[0])
        for target in expected:
            path, fragment = target.split('#', 1)
            file = (C.ROOT / 'site' / path.lstrip('/')).read_text()
            self.assertEqual(Document(file).ids.count(fragment), 1, target)
            self.assertIn('https://getecoback.com' + target, markdown)
        for entry in ('index.html', 'tools.html', 'wohnen.html'):
            authored = (C.ROOT / 'site' / entry).read_text()
            self.assertEqual(inject(authored, data), authored)
            self.assertEqual(sum(link.get('href') == route+'#ersatzteile-pruefen' for link in Document(authored).links), 1)

    def test_miele_bag_packs_keep_exact_model_filter_roles_and_native_share(self):
        html = C.render(C.load(), dt.date(2026, 11, 22))
        anchor = 'miele-staubsaugerbeutel'
        self.assertEqual(Document(html).ids.count(anchor), 1)
        title = 'Welcher Staubsaugerbeutel passt zu meinem Miele?'
        end = 'Wechselanzeige, Ursache und Guard L1 HS22'
        answer = html.split(f'id="{anchor}"', 1)[1].split(end, 1)[0]
        md = C.to_markdown(html, C.ROUTE, 'de')
        mirror = md.split(title, 1)[1].split(end, 1)[0]
        for phrase in (
            'Compact C2 braucht FJM, Complete C2 braucht GN', 'nur „C2“', 'warte bis dahin',
            'GN HyClean Pure 12421170', 'FJM HyClean Pure 12421180',
            'TU HyClean Pure 12557060', 'CO HyClean Pure 12557080',
            '4 Beutel, 1 Motorschutzfilter und 1 Abluftfilter',
            '4 Beutel und 1 AirClean Abluftfilter', '16 Beutel, 4 Motorschutzfilter und 4 Abluftfilter',
            'separat in der Tabelle gelistete HEPA-Kassette',
            'passenden, unbenutzten und unbeschädigten Beuteln',
        ):
            self.assertIn(phrase, answer)
            self.assertIn(phrase, mirror)
        share = next(link for link in Document(answer).links
                     if link.get('href', '').startswith('https://www.reddit.com/submit?'))
        self.assertEqual(share['rel'], 'noreferrer')
        self.assertEqual(parse_qs(urlsplit(share['href']).query), {
            'url': [f'{C.CANONICAL}#{anchor}'],
            'title': [title],
        })
        self.assertNotIn('reddit.com/submit', mirror)
        self.assertNotIn('amazon.', answer)

    def test_kaercher_nozzle_matches_exact_german_labels_and_clean_share(self):
        html = C.render(C.load(), dt.date(2026, 11, 22))
        anchor = 'kaercher-170mm-saugduese'
        self.assertEqual(Document(html).ids.count(anchor), 1)
        answer = html.split(f'id="{anchor}"', 1)[1].split('id="fenstersauger-abziehlippen"', 1)[0]
        md = C.to_markdown(html, C.ROUTE, 'de')
        title = 'Welche 170-mm-Saugdüse passt zu meinem Kärcher Fenstersauger?'
        mirror = md.split(title, 1)[1].split('170-mm-Abziehlippen am genauen Gerät zuordnen', 1)[0]
        expected = {
            'WV 2 Plus Multi Edition': ['2.633-112.0'],
            'WV 3 Comfort Precision+ Black': ['2.633-605.0'],
            'WV 4-4 Plus': ['2.633-512.0'],
            'WV 5 Ultra Care': ['2.633-532.0'],
            'WV 6 Plus': ['2.633-512.0', '2.633-532.0'],
            'WV 6 + KV 4': ['2.633-512.0'],
            'WV 6 + KV 4 Premium': ['2.633-532.0'],
            'WV 8 Signature Line': ['2.633-532.0'],
        }
        for row, parts in expected.items():
            line = re.search(rf'<li><strong>{re.escape(row)}:</strong>(.*?)</li>', answer)
            self.assertIsNotNone(line, row)
            self.assertEqual(re.findall(r'2\.633-\d{3}\.0', line[1]), parts)
            self.assertIn(row, mirror)
        for phrase in ('weißen Düse steht WV 4-4 Plus nicht', 'Lieferumfang separat bestätigen',
                       'die Abziehlippe für die vorhandene Originaldüse', 'Warte mit dem Kauf',
                       'p26331120', 'p26336050', 'p26335120', 'p26335320'):
            self.assertIn(phrase, answer)
            self.assertIn(phrase, mirror)
        share = next(link for link in Document(answer).links
                     if link.get('href', '').startswith('https://www.reddit.com/submit?'))
        self.assertEqual(share['rel'], 'noreferrer')
        self.assertEqual(parse_qs(urlsplit(share['href']).query), {
            'url': [f'{C.CANONICAL}#{anchor}'],
            'title': [title],
        })
        self.assertNotIn('reddit.com/submit', mirror)
        self.assertNotIn('amazon.', answer)

    def test_focal_coffee_filter_offer_keeps_exact_parts_and_clean_share(self):
        route = 'site/produkte.html'
        rendered = (C.ROOT / route).read_text()
        authored = C.render(C.load(), dt.date(2026, 11, 22))
        section = r'<section id="kaffeevollautomat-pflege-und-kauf"[^>]*>.*?</section>'
        answer = re.search(section, rendered, re.S)[0]
        self.assertEqual(answer, re.search(section, authored, re.S)[0])
        self.assertEqual(Document(rendered).ids.count('kaffee-wasserfilter'), 1)
        md = (C.ROOT / route).with_suffix('.md').read_text()
        for value in ('EP2220/10', 'CA6903/10', 'TIE20301', 'TCZ7003', 'TCZ7033',
                      'ECAM22.110.B', 'DLSC002', 'Wasserhärte', 'Filtermodus',
                      'Dafür brauchst du keinen Ersatzfilter',
                      'https://acc.philips.de/c-p/CA6903_10/kalk-und-wasserfilter'):
            self.assertIn(value, answer)
            self.assertIn(value, md)
        share = next(link for link in Document(answer).links
                     if link.get('href', '').startswith('https://www.reddit.com/submit?'))
        self.assertEqual(share['rel'], 'noreferrer')
        self.assertEqual(parse_qs(urlsplit(share['href']).query), {
            'url': ['https://getecoback.com/produkte.html#kaffee-wasserfilter'],
            'title': ['Welcher Wasserfilter passt zu meinem Kaffeevollautomaten?'],
        })
        self.assertNotIn('reddit.com/submit', md)

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
        ids=Document(html).ids
        self.assertEqual(ids.count('fenstersauger-duesenbreite'),1)
        answer=html.split('id="fenstersauger-duesenbreite"',1)[1].split('id="kaercher-170mm-saugduese"',1)[0]
        self.assertEqual(answer.count('data-window-width-table'),1)
        self.assertIn('data-window-width-check hidden',answer)
        models=[('kaercher-wv2-multi','1.633-662.0','280 mm'),
                ('kaercher-wv3-precision','1.633-698.0','170 mm / 280 mm'),
                ('kaercher-wv8-signature','1.633-785.0','170 mm / 280 mm'),
                ('bosch-glassvac-set','06008B7000','133 mm / 266 mm')]
        answer_links=[link.get('href') for link in Document(answer).links]
        for model, package, widths in models:
            target='produkt-'+model
            self.assertRegex(answer,fr'<th scope="row"><a href="#{target}">[^<]+{re.escape(package)}</a><br><small>Quelle: <a [^>]+>[^<]+</a></small></th><td>{widths}</td>')
            self.assertEqual(answer_links.count('#'+target),1)
            self.assertEqual(ids.count(target),1)
        sources=[p['source'] for p in data['products'] if p['category']=='fenstersauger']
        sources.append('https://www.bosch-diy.com/storage/de-de/glassvac-100045834-original-pdf-396340-de-de.pdf')
        sources.append('https://www.bosch-diy.com/de/de/p/glassvac-solo-plus-06008b7200')
        for href in sources+['#modelle-fenstersauger']:
            self.assertIn(href,answer_links)
        markdown=C.to_markdown(html,C.ROUTE,'de')
        readable=markdown.split('Welche Saugdüse kommt für ein schmales Glasfeld infrage?',1)[1].split(
            'Welche 170-mm-Saugdüse passt zu meinem Kärcher Fenstersauger?',1)[0]
        for model, package, widths in models:
            self.assertIn(f'{package}]({C.CANONICAL}#produkt-{model}) Quelle:',readable)
            self.assertIn(f' | {widths} |',readable)
        for surface in (answer,readable):
            for term in ('170 mm Glasbreite','5 mm Reserve je Seite','160 mm','133-mm-Saugkopf',
                         'tatsächliche Außenbreite','vorhandener Abzieher oder ein Tuch',
                         '06008B7000 (EAN 3165140920148)', 'EAN 3165140976374',
                         'nur den großen Saugkopf', 'vor dem Kauf den kleinen Saugkopf bestätigen',
                         'ausgeschaltetes Gerät trocken an', 'Gehäuse und Fensterbank zuerst anstoßen', *sources):
                self.assertIn(term,surface)
            self.assertNotIn('amazon.',surface)
        self.assertNotIn('Ich möchte neue Sets vergleichen',readable)
        bosch_card=html.split('id="produkt-bosch-glassvac-set"',1)[1].split('</section>',1)[0]
        for term in ('06008B7000 (EAN 3165140920148)', '06008B7200 (EAN 3165140976374)',
                     'www.amazon.de/s?k=Bosch+GlassVAC+Set+06008B7000&amp;tag=getecoback-21'):
            self.assertIn(term,bosch_card)
        self.assertNotIn('amazon.de/dp/',bosch_card)

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

    def test_glassvac_temperature_evidence_is_present_in_both_final_formats(self):
        page = C.ROOT / 'site/produkte.html'
        html, markdown = page.read_text(), page.with_suffix('.md').read_text()
        self.assertEqual(html.count('id="bosch-glassvac-einsatz-und-pflege"'),1)
        for content in (html, markdown):
            self.assertIn('Nach Frost zuerst die Temperatur am Ladeort messen.',content)
            self.assertIn('Bosch empfiehlt 0 bis +45 °C als Umgebungstemperatur beim Laden.',content)
            self.assertIn('Für die Lagerung nennt Bosch −20 bis +50 °C.',content)
            self.assertIn('Unter −5 °C das Gerät nicht einschalten.',content)
            self.assertIn('glassvac-100045834-original-pdf-396340-de-de.pdf',content)

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
