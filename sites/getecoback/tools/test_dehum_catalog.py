import copy
import datetime as dt
import re
import unittest
from urllib.parse import parse_qs, urlsplit
from html import unescape
import dehum_catalog as C
from build_agent_md import to_markdown
from build_structure import inject_models
from moisture_decision import inject as inject_buyer
from build_onpage import inject_toc
from test_buyer_comparison import Document

class CatalogTest(unittest.TestCase):
    def test_bosch_dry_filter_scope_and_order_on_final_generated_pages(self):
        site = C.DATA.parent.parent / 'site'
        path = site / 'guide/luftentfeuchter-ratgeber.html'
        page = path.read_text()
        mirror = path.with_suffix('.md').read_text()
        self.assertEqual(page.count('id="bosch-dry-4000-aktivkohlefilter"'), 1)
        section = page.split('aria-labelledby="bosch-dry-4000-aktivkohlefilter">', 1)[1].split('</section>', 1)[0]
        for fact in ['Staubfilter im Lufteintrittsgitter integriert', '7733703602', '2er-Pack',
                     'verschiebe den Kauf', 'https://www.bosch-home.com/de/de/product/7733703602', 'https://bosch-de-de.boschhc-documents.com/download/pdf/file/6721890171#page=10']:
            self.assertIn(fact, section)
            self.assertIn(fact, mirror)
        self.assertNotIn('sponsored', section)
        card = page.split('id="modell-bosch-d4000-eu"', 1)[1].split('id="modell-meaco-two-12"', 1)[0]
        self.assertLess(card.index('id="bosch-dry-4000-aktivkohlefilter"'), card.index('data-catalog-commerce'))
        for slug in ['luftentfeuchter-keller', 'waesche-trocknen-wohnung']:
            self.assertNotIn('id="bosch-dry-4000-aktivkohlefilter"', (site / 'guide' / (slug + '.html')).read_text())

    def test_bosch_german_identity_and_model_search_on_final_pages(self):
        site = C.DATA.parent.parent / 'site'
        data = C.load()
        product, = [item for item in data['products'] if item['id'] == 'bosch-d4000-eu']
        self.assertNotIn('asin', product)
        for slug in data['pages']:
            with self.subTest(slug=slug):
                html = (site / 'guide' / (slug + '.html')).read_text()
                mirror = (site / 'guide' / (slug + '.md')).read_text()
                cards = [node for node in Document(html).root.find('div') if node.attrs.get('class') == 'dc-card']
                card, = [node for node in cards if any(h.attrs.get('id') == 'modell-bosch-d4000-eu' for h in node.find('h3'))]
                for token in ('D4000-EU', '7733703558', '4069143047774', 'D4000-UK', '7733703561',
                              '4069143047804', 'Bosch Air 4000', '7733701943', 'Luftreiniger', '25.11.2026'):
                    self.assertIn(token, card.text())
                    self.assertIn(token, mirror)
                links = [node.attrs['href'] for node in card.find('a')]
                for row in [product['identity'], *product['identity']['alternatives']]:
                    self.assertIn(row['source'], links)
                    self.assertIn(row['source'], mirror)
                retailer = product['identity']['retailer']
                checked = [node for node in card.find('a') if node.attrs.get('href') == retailer['source']]
                self.assertEqual(len(checked), 1)
                self.assertIn('Modell bei Conrad prüfen (ohne Partnerlink)', checked[0].text())
                self.assertNotIn('sponsored', checked[0].attrs.get('rel', ''))
                url = urlsplit(checked[0].attrs['href'])
                self.assertEqual(url.hostname, 'www.conrad.de')
                self.assertFalse(url.query)
                self.assertFalse(url.fragment)
                self.assertIn(retailer['source'], mirror)
                for fact in ('Conrad listet dieselbe EAN und Hersteller-Teilenummer',
                             'Lieferumfang und Gesamtpreis einschließlich Versand', '26.11.2026'):
                    self.assertIn(fact, card.text())
                    self.assertIn(fact, mirror)
                merchant = [urlsplit(url) for url in links if urlsplit(url).hostname == 'www.amazon.de']
                age = (dt.datetime.now(dt.timezone.utc).date() - dt.date.fromisoformat(data['checked'])).days
                if 0 <= age <= data['max_age_days'] and product['status'] == 'verified':
                    self.assertEqual(len(merchant), 1)
                if merchant:
                    self.assertEqual(len(merchant), 1)
                    self.assertEqual(merchant[0].path, '/s')
                    self.assertEqual(parse_qs(merchant[0].query), {'k': [product['query']], 'tag': ['getecoback-21']})
                self.assertNotIn('getecoback-21', mirror)

    def test_comfee_base_and_wifi_identifiers_on_final_pages(self):
        data = C.load()
        site = C.DATA.parent.parent / 'site' / 'guide'
        product, = [item for item in data['products'] if item['id'] == 'comfee-mddf20']
        today = dt.datetime.now(dt.timezone.utc).date()
        age = (today - dt.date.fromisoformat(data['checked'])).days
        eligible = 0 <= age <= data['max_age_days'] and product['status'] == 'verified'
        expected_url = 'https://www.amazon.de/dp/B07KJX6RDK?tag=getecoback-21'
        for slug in data['pages']:
            with self.subTest(slug=slug):
                doc = Document((site / (slug + '.html')).read_text()).root
                mirror = (site / (slug + '.md')).read_text()
                card, = [node for node in doc.find('div') if node.attrs.get('class') == 'dc-card'
                         and any(h.attrs.get('id') == 'modell-comfee-mddf20' for h in node.find('h3'))]
                for token in ('MDDF-20DEN7', 'ohne WF', '10000651', '4048164103010', 'MDDF-20DEN7-WF',
                              '10000726', '4048164103485', 'Sprachsteuerung', '10 °C / 60 %',
                              'kläre die Variante', '04.2024', '25.11.2026'):
                    self.assertIn(token, card.text())
                    self.assertIn(token, mirror)
                links = card.find('a')
                sources = [link.attrs['href'] for link in links]
                for row in [product, product['identity'], *product['identity']['alternatives']]:
                    self.assertIn(row['source'], sources)
                    self.assertIn(row['source'], mirror)
                merchant = [link for link in links if urlsplit(link.attrs['href']).hostname == 'www.amazon.de']
                self.assertEqual([link.attrs['href'] for link in merchant], [expected_url] if eligible else [])
                if merchant:
                    self.assertIn('ohne WF', merchant[0].text())
                self.assertNotIn(expected_url, mirror)

    def test_native_reading_and_comparison_shortcuts_survive_the_full_rebuild_order(self):
        for slug in C.load()['pages']:
            source = (C.DATA.parent.parent/'site/guide'/f'{slug}.html').read_text()
            for _ in range(2):
                source = inject_toc(C.inject(inject_buyer(inject_models(source, slug), slug), slug), False)
                doc = Document(source).root
                nav = next(n for n in doc.find('nav') if n.attrs.get('class') == 'dc-entry')
                self.assertEqual([n.attrs['href'] for n in nav.find('a')], ['#eb-catalog-reading', '#eb-models'])
                ids = [n.attrs['id'] for n in doc.find(attr='id')]
                self.assertEqual(len(ids), len(set(ids)), slug)
                self.assertLess(source.index('class="dc-entry"'), source.index('<!--EB_BUYER-->'))
                self.assertLess(source.index('<!--/EB_TOC-->'), source.index('id="eb-catalog-reading"'))
                self.assertLess(source.index('id="eb-catalog-reading"'), source.index('<!--EB_MODELS-->'))
                faq = re.search(r'<h2\b[^>]*>\s*Häufige Fragen(?:\s+[^<]*)?\s*</h2>', source)
                self.assertIsNotNone(faq, slug)
                self.assertLess(source.index('<!--/EB_MODELS-->'), faq.start())
                # The actual article answer is before the full catalog, rather
                # than following all six product cards as in the old layout.
                self.assertIn('<h2', source[source.index('<!--/EB_CATALOG_READING-->'):source.index('<!--EB_MODELS-->')])
            # The existing TOC builder adds one inter-tag newline per pass even
            # on main. Compare rendered structure here; our own injection must
            # still be byte-for-byte idempotent below and in the older test.
            rebuilt = inject_toc(C.inject(inject_buyer(inject_models(source, slug), slug), slug), False)
            normalize = lambda value: re.sub(r'>\s+<', '><', value)
            self.assertEqual(normalize(source), normalize(rebuilt))

    def test_without_contents_or_faq_the_article_reading_and_model_destinations_still_work(self):
        seed = ('<header><h2>Häufige Fragen</h2></header><article><!--EB_BUYER-->'
                '<section>Existing helper</section><!--/EB_BUYER--><h2>Authored answer</h2>'
                '<p>Existing reader advice.</p></article>')
        output = C.inject(seed, 'luftentfeuchter-ratgeber')
        self.assertEqual(output, C.inject(output, 'luftentfeuchter-ratgeber'))
        self.assertLess(output.index('id="eb-catalog-reading"'), output.index('<h2>Authored answer</h2>'))
        self.assertLess(output.index('Existing reader advice.'), output.index('<!--EB_MODELS-->'))
        article = Document(output).root.find('article')[0]
        self.assertEqual(len([n for n in article.find('section') if n.attrs.get('id') == 'eb-models']), 1)
        with self.assertRaises(ValueError):
            C.inject('<!--EB_BUYER-->x<!--/EB_BUYER--><article><h2>Advice</h2></article>', 'luftentfeuchter-ratgeber')

    def test_committed_purchase_routes_survive_repeated_injection(self):
        for slug in C.load()['pages']:
            source=(C.DATA.parent.parent/'site/guide'/f'{slug}.html').read_text()
            # Assert final generated files BEFORE repairing them in memory.
            # Otherwise a later generator can erase the catalog and CI passes.
            self.assertEqual(source.count('data-catalog-evidence'),1,slug)
            self.assertEqual(source.count('class="dc-card"'),6,slug)
            self.assertLess(source.index('<!--/EB_BUYER-->'),source.index('<!--EB_MODELS-->'))
            # Read the actual final file, not a repaired renderer output.
            self.assertEqual(source.count('id="ablauf-vor-kauf"'),1,slug)
            self.assertEqual(source.count('data-catalog-drain-entry'),1,slug)
            self.assertIn('Abfluss höher als der Geräteauslass?',source)
            self.assertLess(source.index('data-catalog-drain-entry'),source.index('id="ablauf-vor-kauf"'))
            self.assertLess(source.index('id="ablauf-vor-kauf"'),source.index('<div class="dc-table"'))
            self.assertIn('Ein Schlauchanschluss allein bestätigt keine Pumpe.',source)
            mirror=(C.DATA.parent.parent/'site/guide'/f'{slug}.md').read_text()
            self.assertIn('Ein Schlauchanschluss allein bestätigt keine Pumpe.',mirror,slug)
            self.assertIn('Abfluss höher als der Geräteauslass?',mirror,slug)
            self.assertIn('weder den deutschen Lieferumfang noch die Eignung der Arete Two 12L',mirror,slug)
            self.assertIn('geprüft am 13.11.2026',mirror,slug)
            def rebuild(html):
                return C.inject(inject_buyer(inject_models(html,slug),slug),slug)
            first=rebuild(source)
            self.assertEqual(first,rebuild(first))
            self.assertEqual(first.count('data-catalog-evidence'),1)
            self.assertEqual(first.count('class="dc-card"'),6)
        self.assertIsNone(C.block('luftentfeuchter-20-qm'))

    def test_buyer_replacement_cannot_swallow_the_catalog(self):
        slug='luftentfeuchter-ratgeber'
        seed='<article><!--EB_BUYER--><h2>Old buyer</h2>'+C.block(slug)+'<!--/EB_BUYER--><h2>Guide</h2></article>'
        first=C.inject(inject_buyer(seed,slug),slug)
        self.assertEqual(first.count('class="dc-card"'),6)
        self.assertLess(first.index('<!--/EB_BUYER-->'),first.index('<!--EB_MODELS-->'))
        self.assertEqual(first,C.inject(inject_buyer(first,slug),slug))
        with self.assertRaises(ValueError):C.inject('<article><h2>Missing buyer</h2></article>',slug)

    def test_cellar_handoff_on_final_files(self):
        site = C.DATA.parent.parent / 'site/guide'
        for slug in C.load()['pages']:
            page = (site / f'{slug}.html').read_text()
            if slug != 'luftentfeuchter-keller':
                self.assertNotIn('<nav class="dc-drain-paths"', page)
                self.assertNotIn('id="schlauch-ueber-schwelle"', page)
                continue
            self.assertIn('<a href="#ablauf-vor-kauf">Schlauch mit Gefälle', page)
            choices = re.search(r'<nav class="dc-drain-paths".*?</nav>', page, re.S)[0]
            self.assertEqual(re.findall(r'href="#([^"]+)"', choices),
                             ['modell-stadler-lukas', 'modell-meaco-one-20'])
            for target in ['modell-stadler-lukas', 'modell-meaco-one-20']:
                self.assertEqual(page.count(f'id="{target}"'), 1)
            mirror = (site / f'{slug}.md').read_text()
            for surface in (page, mirror):
                self.assertIn('Sein Ende muss tiefer liegen als der Anfang.', surface)
                self.assertIn('die passende Pumpe und den deutschen Lieferumfang', surface)
                for phrase in ('Abfluss unten, Schlauch über eine Schwelle?',
                               'auch wenn der Zielablauf tiefer liegt',
                               '6 m waagerechtem Weg und 1,5 m Anstieg', '2,5 m Förderhöhe',
                               'mitgelieferten Schlauch von 3 m', 'keine Eignung einer Verlängerung',
                               'Tankbetrieb', 'Feuchteursache klären',
                               'https://www.meaco.de/produkt/meaco-dry-arete-one-pumpe/',
                               'https://www.meaco.de/produkt/luftentfeuchter-meaco-arete-one-20-l-pumpe/'):
                    self.assertIn(phrase, surface)
            self.assertEqual(page.count('id="schlauch-ueber-schwelle"'), 1)
            share = re.search(r'<nav aria-label="Hinweis teilen".*?</nav>', page, re.S)[0]
            direct, reddit = map(unescape, re.findall(r'href="([^"]+)"', share))
            self.assertEqual(direct, 'https://getecoback.com/guide/luftentfeuchter-keller.html#ablauf-vor-kauf')
            parsed = urlsplit(reddit)
            self.assertEqual((parsed.scheme, parsed.netloc, parsed.path, parsed.fragment),
                             ('https', 'www.reddit.com', '/submit', ''))
            self.assertEqual(parse_qs(parsed.query),
                             {'url': [direct], 'title': ['Kellerentfeuchter: Schlauch über eine Schwelle oder Tankbetrieb?']})
            self.assertNotIn('reddit.com/submit', mirror)
            self.assertNotIn('getecoback-21', mirror)

    def test_laundry_handoff_on_final_files(self):
        site = C.DATA.parent.parent / 'site'
        guide = site / 'guide/waesche-trocknen-wohnung.html'
        html = guide.read_text()
        mirror = guide.with_suffix('.md').read_text()
        routes, = Document(html).root.find(attr='data-laundry-model-routes')
        calculator = '/waeschetrockner-oder-luftentfeuchter.html#lc-measurement'
        targets = ['#modell-bosch-d4000-eu', '#modell-stadler-lukas']
        self.assertEqual([link.attrs['href'] for link in routes.find('a')], [calculator, *targets])
        self.assertNotIn('s?k=luftentfeuchter+waeschetrocknen', html)
        self.assertIn('id="lc-measurement"', (site / calculator.lstrip('/').split('#')[0]).read_text())
        for target in targets:
            self.assertEqual(html.count(f'id="{target[1:]}"'), 1)
            self.assertIn(f'https://getecoback.com/guide/{guide.name}{target}', mirror)
        self.assertIn(f'https://getecoback.com{calculator}', mirror)
        self.assertIn('Die Angaben zum Modus sagen nicht, wie viel Strom eine Ladung bei dir braucht.', mirror)
        self.assertNotIn('getecoback-21', mirror)

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

    def test_drain_answer_preserves_evidence_and_uncertainty_in_mirror(self):
        source=C.block('luftentfeuchter-ratgeber',dt.date(2026,11,13))
        md=to_markdown('<title>Ablauf prüfen</title><article>'+source+'</article>','/guide/luftentfeuchter-ratgeber.html','de')
        for phrase in ['Ein Schlauchanschluss allein bestätigt keine Pumpe.',
                       'ist die Eignung für deinen Ablauf ungeklärt',
                       'keinen mitgelieferten Schlauch',
                       'weder den deutschen Lieferumfang noch die Eignung der Arete Two 12L',
                       'geprüft am 13.11.2026',
                       'ein Neukauf ist dann noch nicht begründet']:
            for surface in [source,md]:self.assertIn(phrase,surface)
        self.assertIn('https://www.meaco.com/products/meacodry-arete-one-20l-dehumidifier-and-air-purifier',md)
        self.assertNotIn('amazon.de',md)
        self.assertNotIn('getecoback-21',md)

    def test_unknown_conditions_do_not_become_efficiency_rankings(self):
        d=C.load();bos=d['products'][0];two=d['products'][1];luk=d['products'][2]
        self.assertIn('nicht belegt',bos['limit'])
        self.assertIn('20 °C / 60 %',two['facts'])
        self.assertIn('12.11.2026',two['limit'])
        self.assertIn('andere Händler',two['limit'])
        self.assertIn('kein gemessener Verbrauch',luk['limit'])
        self.assertIn('nicht Lukas little',luk['variant'])

if __name__=='__main__':unittest.main()
