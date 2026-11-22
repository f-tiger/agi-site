"""The bulk agent document must preserve evidence, not hidden shopping UI."""
import re
import html
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from urllib.parse import parse_qs, urlsplit

import build_agent_md as AGENT
import build_llmstxt as FULL

SITE = Path(__file__).resolve().parents[1] / 'site'
MEACO = 'https://www.meaco.com/products/meacodry-arete-one-20l-dehumidifier-and-air-purifier'


class LlmsFull(unittest.TestCase):
    def test_root_mcp_citations_keep_static_evidence_and_safe_sources(self):
        evidence = {
            'strommess-protokoll': ['0,6 kWh pro Tag', '219 kWh und 76,65 €',
                                   'betriebstage', 'Keine Arbeiten an offenen Leitungen'],
            'geraete-austausch-rechner': ['7,14 Jahre', 'Behalten 700 €', 'positive jährliche Stromersparnis',
                                         'https://energy-efficient-products.ec.europa.eu/product-list/dishwashers_en'],
            'familienwerkstatt': ['Keine allgemeine Treppenfreigabe.', 'Begrenzungsdraht-Installation',
                                  'https://www.husqvarna.com/us/support/how-to-create-a-passage-in-an-automower-boundary-wire-installation-ka-01710/',
                                  'https://help.prusa3d.com/filament-material-guide', 'kein geprüftes Ersatzteil'],
            'daten': ['CC BY 4.0', 'https://getecoback.com/sizing-data.json',
                      'Die Grundfläche allein bestimmt keine passende Kapazität'],
            'wie-wir-empfehlen': ['öffentlich verfügbare Quellen', 'Fehlt eine zuverlässige Zuordnung',
                                   'Ergebnisse hängen von den Eingaben'],
        }
        for slug, phrases in evidence.items():
            with self.subTest(slug=slug):
                source = SITE / (slug + '.html')
                mirror = source.with_suffix('.md').read_text()
                self.assertIn(f'Canonical (HTML, zitierfähig): https://getecoback.com/{slug}.html', mirror)
                self.assertIn(f'rel="alternate" type="text/markdown" href="https://getecoback.com/{slug}.md"',
                              source.read_text())
                for phrase in phrases:
                    self.assertIn(phrase.lower(), mirror.lower())
                self.assertNotRegex(mirror, r'https?://[^\s)]*(?:amazon\.|amzn\.)|[?&]tag=|<form|<script|fw-result')
                if slug == 'familienwerkstatt':
                    self.assertNotIn('Meine Checkliste herunterladen', mirror)
                    self.assertEqual(mirror.count('Keine allgemeine Treppenfreigabe.'), 1)

    def test_n90_guide_and_mirror_keep_acoustic_quantities_and_evidence(self):
        guide = SITE / 'guide/delonghi-pac-n90-test.html'
        html = guide.read_text()
        md = guide.with_suffix('.md').read_text()
        for content in (html, md):
            self.assertIn('50–52 dB(A) Schalldruck', content)
            self.assertIn('64 dB(A) Schallleistung', content)
            self.assertIn('8004399512351', content)
            self.assertIn('https://www.delonghi.com/de-de/s/PACN90ECOSILENT', content)
            self.assertIn('datasheet_delonghi_PAC%20N90ECO.pdf', content)
            self.assertNotRegex(content, r'50-dB-Schlafgrenze|Silent-Modus unter 50 dB|Leisester Monoblock im Stiftung')
        self.assertIn('https://www.amazon.de/dp/B07NC5CP6F?tag=getecoback-21', html)
        self.assertNotIn('amazon.de/', md)

    def test_n90_portasplit_noise_comparison_keeps_metrics_and_sources(self):
        route = '/guide/delonghi-pac-n90-test.html'
        guide = SITE / route.lstrip('/')
        page = guide.read_text()
        md = guide.with_suffix('.md').read_text()
        section = re.search(r'<section class="n90-noise-comparison" aria-labelledby="lautstaerke">(.*?)</section>',
                            page, re.S)
        self.assertIsNotNone(section)
        self.assertEqual(page.count('id="lautstaerke"'), 1)
        for phrase in ('kein Unterschied von 25 dB am Bett', 'Silent-Modus innen 39 dB(A)',
                       '1 m Abstand und 1 m Höhe', 'Schallleistung', '59 dB innen', '64 dB',
                       'Sonepar Österreich', 'ohne Angabe eines Messabstands', 'Fiche-1917520-de.pdf'):
            self.assertIn(phrase, section[1])
            self.assertIn(phrase, md)
        share = re.search(r'href="(https://www\.reddit\.com/submit\?[^"]+)" rel="noreferrer"', section[1])
        self.assertIsNotNone(share)
        self.assertEqual(parse_qs(urlsplit(html.unescape(share[1])).query), {
            'url': [f'https://getecoback.com{route}#lautstaerke'],
            'title': ['Midea PortaSplit 39 dB(A) und PAC N90 64 dB: Was ist vergleichbar?'],
        })
        self.assertNotIn('reddit.com/submit', md)

    def test_n90_offer_identity_has_a_static_answer_and_clean_share(self):
        guide = SITE / 'guide/delonghi-pac-n90-test.html'
        page = guide.read_text()
        md = guide.with_suffix('.md').read_text()
        section = re.search(r'<section class="n90-identity" aria-labelledby="testlage">(.*?)</section>', page, re.S)
        self.assertIsNotNone(section)
        self.assertEqual(page.count('id="testlage"'), 1)
        for phrase in ('8004399512351', 'Beides stimmt überein', 'EAN fehlt oder „PAC N90“ steht allein',
                       'EAN oder Modell weicht ab', 'Warte mit der Bestellung', 'Sonepar Österreich'):
            self.assertIn(phrase, section[1])
            self.assertIn(phrase, md)
        self.assertIn('href="#n90-angebot"', section[1])
        self.assertIn('<div class="cta-box" id="n90-angebot">', page)
        share = re.search(r'href="(https://www\.reddit\.com/submit\?[^\"]+)" rel="noreferrer"', section[1])
        self.assertIsNotNone(share)
        query = parse_qs(urlsplit(html.unescape(share[1])).query)
        self.assertEqual(query, {
            'url': ['https://getecoback.com/guide/delonghi-pac-n90-test.html#testlage'],
            'title': ['De’Longhi PAC N90 ECO Silent: Welche EAN passt?'],
        })
        self.assertNotIn('reddit.com/submit', md)

    def test_portasplit_window_fit_keeps_original_manual_and_cautious_decision(self):
        route = '/guide/midea-portasplit-ausverkauft-alternativen.html'
        guide = SITE / route.lstrip('/')
        page = guide.read_text()
        md = guide.with_suffix('.md').read_text()
        section = re.search(r'<section class="portasplit-window-fit" id="fensterfalz"[^>]*>(.*?)</section>',
                            page, re.S)
        self.assertIsNotNone(section)
        self.assertEqual(page.count('id="fensterfalz"'), 1)
        self.assertEqual(page.count('id="kaufpruefung"'), 1)
        self.assertIn('class="portasplit-fit-jump" href="#fensterfalz"', page)
        for phrase in ('60 mm Falzbreite liegen außerhalb', '4048164116478', '45 mm Falzbreite', '20 mm Falzhöhe',
                       'Klemmstelle, Dichtung oder genaue Modellvariante unklar', 'Tragfähigkeit',
                       'Seite 15', '/portasplit/PortaSplit-Gebrauchsanweisung-DE.pdf'):
            self.assertIn(phrase, section[1])
            self.assertIn(phrase, md)
        share = re.search(r'href="(https://www\.reddit\.com/submit\?[^"]+)" rel="noreferrer"', section[1])
        self.assertIsNotNone(share)
        self.assertEqual(parse_qs(urlsplit(html.unescape(share[1])).query), {
            'url': [f'https://getecoback.com{route}#fensterfalz'],
            'title': ['Passt die Midea PortaSplit an einen 60-mm-Fensterfalz?'],
        })
        self.assertNotIn('reddit.com/submit', md)

    def test_trotec_test_point_separates_rating_range_and_supplier_data(self):
        route = '/guide/trotec-luftentfeuchter-test.html'
        guide = SITE / route.lstrip('/')
        page = guide.read_text()
        md = guide.with_suffix('.md').read_text()
        section = re.search(r'<section class="ttk75-pruefpunkt tldr" aria-labelledby="ttk75-pruefpunkt">(.*?)</section>',
                            page, re.S)
        self.assertIsNotNone(section)
        self.assertEqual(page.count('id="ttk75-pruefpunkt"'), 1)
        for phrase in ('10 °C und 60 %', 'keine Literleistung', '20 l/24 h bei 30 °C und 80 %',
                       'maximal 21 l/24 h', '5 bis 32 °C', '30 bis 90 %', '6,4 l/24 h bei 20 °C und 60 %',
                       'Das ist eine Händlerangabe', 'Originalbetriebsanleitung TTK 75 ECO',
                       '/TRT-BA-TTK75ECO-TC-010-DE.pdf',
                       'https://www.baushop-express.com/trotec-kondensationsentfeuchter-ttk-eco.html'):
            self.assertIn(phrase, section[1])
            self.assertIn(phrase, md)
        for artifact in (page, md):
            self.assertNotRegex(artifact, r'440\s*W|Arbeitstier|Vergleichssieger|165–190|nur halb so hoch')
        share = re.search(r'href="(https://www\.reddit\.com/submit\?[^"]+)" rel="noreferrer"', section[1])
        self.assertIsNotNone(share)
        self.assertEqual(parse_qs(urlsplit(html.unescape(share[1])).query), {
            'url': [f'https://getecoback.com{route}#ttk75-pruefpunkt'],
            'title': ['Trotec TTK 75 ECO bei 10 °C im Keller: Was sagt das Datenblatt?'],
        })
        self.assertNotIn('reddit.com/submit', md)

    def test_trotec_hepa_generation_holds_for_contradictory_manufacturer_dates(self):
        route = '/guide/trotec-luftentfeuchter-test.html'
        guide = SITE / route.lstrip('/')
        page = guide.read_text()
        md = guide.with_suffix('.md').read_text()
        heading = 'Trotec TTK 70 HEPA: Welcher Ersatzfilter passt?'
        section = re.search(r'<section[^>]* id="ttk70-hepa-filter"[^>]*>(.*?)</section>', page, re.S)
        self.assertIsNotNone(section)
        self.assertEqual(page.count('id="ttk70-hepa-filter"'), 1)
        self.assertIn('href="#ttk70-hepa-filter">Ersatzfilter für die genaue Gerätevariante prüfen</a>', page)
        mirror = re.search(r'## ' + re.escape(heading) + r'.*?(?=\n## )', md, re.S)
        self.assertIsNotNone(mirror)
        for fact in ('vor Dezember 2023', '7710000024', '7710000077', '7710000080', 'im Titel „ab“ Dezember 2023',
                     'in der Merkmalliste aber „bis“', 'Warte mit dem Kauf', 'Typenschild',
                     'hepa-filter-fuer-ttk-70-hepa.html', 'hepa-filter-fuer-ttk-70-hepa-plus-ab-bj-12-23.html',
                     'luftfilter-fuer-ttk-70-hepa-plus-ab-bj-12-23.html'):
            self.assertIn(fact, section[1])
            self.assertIn(fact, mirror[0])
        share = re.search(r'href="(https://www\.reddit\.com/submit\?[^"]+)" rel="noreferrer"', section[1])
        self.assertIsNotNone(share)
        self.assertEqual(parse_qs(urlsplit(html.unescape(share[1])).query), {
            'url': [f'https://getecoback.com{route}#ttk70-hepa-filter'],
            'title': [heading],
        })
        self.assertNotRegex(mirror[0], r'reddit[.]com/submit|[?&]tag=')

    def test_tesamoll_static_overlap_keeps_sources_and_clean_share(self):
        route = '/guide/fenster-zugluft-mietwohnung.html'
        guide = SITE / route.lstrip('/')
        page = guide.read_text()
        md = guide.with_suffix('.md').read_text()
        section = re.search(r'<section class="tesamoll-profile"[^>]*>(.*?)</section>', page, re.S)
        self.assertIsNotNone(section)
        self.assertEqual(page.count('id="dichtungsprofil"'), 1)
        for phrase in ('Bei 4 mm liegen P und D', '1–3,5 mm', '2–5 mm', '3–7 mm',
                       'Nutdichtung', 'Entwässerungsöffnungen', 'Lüftungsöffnungen',
                       '/fensterdichtung-erneuern.html', '/11555752%2C4%2Ctesa-consumerkatalog-2024-online.pdf'):
            self.assertIn(phrase, section[1])
            self.assertIn(phrase, md)
        share = re.search(r'href="(https://www\.reddit\.com/submit\?[^"]+)" rel="noreferrer"', section[1])
        self.assertIsNotNone(share)
        self.assertEqual(parse_qs(urlsplit(html.unescape(share[1])).query), {
            'url': [f'https://getecoback.com{route}#dichtungsprofil'],
            'title': ['Welche tesamoll-Dichtung passt bei 4 mm Spalt?'],
        })
        self.assertNotIn('reddit.com/submit', md)

    def test_real_final_catalog_tables_keep_headers_and_canonical_fragments(self):
        for slug in ['luftentfeuchter-ratgeber', 'luftentfeuchter-keller', 'waesche-trocknen-wohnung']:
            # Actual generated files, before any renderer can repair them.
            md = (SITE / 'guide' / (slug + '.md')).read_text()
            self.assertIn('| Modell | Prüfen, wenn dir dies wichtig ist | Variante |\n| --- | --- | --- |', md)
            self.assertIn(f'https://getecoback.com/guide/{slug}.html#modell-meaco-one-20', md)
            self.assertIn('10 °C / 60 %', md)
            self.assertNotIn('amazon.de/', md)
            self.assertNotIn('picks summarise public tests', md)

    def test_table_caption_cells_entities_and_reference_survive(self):
        source = ('<html lang="en"><article><table><caption>Measured conditions</caption>'
                  '<tr><th>Model</th><th>Conditions</th><th>Source</th></tr>'
                  '<tr><td>A &#124; B</td><td>10 °C<br>60 % RH</td>'
                  f'<td><a href="{MEACO}">Manufacturer</a></td></tr>'
                  '<tr><td>C</td><td></td><td><a href="https://amazon.de/?tag=getecoback-21">Shop</a></td></tr>'
                  '</table></article></html>')
        md = self.extract(source)
        self.assertIn('Measured conditions\n\n| Model | Conditions | Source |\n| --- | --- | --- |', md)
        self.assertIn('| A \\| B | 10 °C 60 % RH |', md)
        self.assertIn(f'[Manufacturer]({MEACO})', md)
        self.assertIn('| C |  | Shop |', md)
        self.assertNotIn('amazon.de', md)
        self.assertNotIn('ECOMDTABLE', md)

    def test_merged_or_headerless_table_does_not_invent_column_ownership(self):
        for table in ['<tr><th colspan="2">Combined</th></tr><tr><td>10 °C</td><td>3.4 L</td></tr>',
                      '<tr><td>10 °C</td><td>3.4 L</td></tr>']:
            md = self.extract('<html lang="en"><article><table>'+table+'</table></article></html>')
            self.assertIn('- 10 °C · 3.4 L', md)
            self.assertNotIn('| --- |', md)

    def test_only_retained_visible_fragment_targets_become_citations(self):
        source = ('<html lang="en"><article><h2 id="evidence">Evidence</h2>'
                  '<a href="#evidence">Check source</a><a href="#missing">Missing</a>'
                  '<a href="#hidden">Hidden</a><script><div id="hidden">secret</div></script>'
                  '<a href="#secret-form">Form</a><form id="secret-form">private</form>'
                  '<a href="#hidden-section">Collapsed</a><section hidden><h2 id="hidden-section">Hidden title</h2></section>'
                  '<a href="#aria">Aria</a><div aria-hidden="true" id="aria">Decorative</div>'
                  '</article></html>')
        md = self.extract(source)
        self.assertIn('[Check source](https://getecoback.com/guide/example.html#evidence)', md)
        self.assertNotIn('.html#missing', md)
        self.assertNotIn('.html#hidden', md)
        self.assertNotIn('.html#secret-form', md)
        self.assertNotIn('.html#hidden-section', md)
        self.assertNotIn('.html#aria', md)

    def extract(self, source, route='guide/example.html', mirror=None):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / route
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(source)
            if mirror is not None:
                path.with_suffix('.md').write_text(mirror)
            with patch.object(FULL, 'ROOT', directory):
                return FULL.body_text(path)

    def test_bulk_matches_shared_converter_and_keeps_citations(self):
        source = ('<html lang="de"><head><title>Feuchte prüfen</title></head><body><article>'
                  '<p>Redaktion: EcoBack. Quellen geprüft am 2026-11-06. Kein eigener Produkttest.</p>'
                  '<p>Die Prüfbedingungen entscheiden.</p><a href="/guide/luftentfeuchter-keller.html">Keller</a>'
                  '<a href="https://www.umweltbundesamt.de/service/uba-fragen/was-tun-bei-schimmel-in-meiner-wohnung">UBA</a>'
                  '<!--EB_TOPPICK--><p>DEFAULT_SHOP</p><!--/EB_TOPPICK-->'
                  '<!--EB_USTOP--><section hidden>HIDDEN_US_SHOP</section><!--/EB_USTOP-->'
                  '<!--EB_USSHELF--><section hidden>HIDDEN_US_GRID</section><!--/EB_USSHELF-->'
                  '<a href="https://www.amazon.de/s?k=fixture&amp;tag=getecoback-21" rel="sponsored">Shop</a>'
                  '</article><!--EB_BUYER--><section><details data-choice-method><summary>Herstellerdaten</summary>'
                  '<table><tr><td>10 °C / 60 % RH</td><td>3.4 L</td><td>180 W</td></tr></table>'
                  '<small>Quellen geprüft am 2026-11-06: <a href="' + MEACO + '">Meaco</a></small>'
                  '</details></section><!--/EB_BUYER--></body></html>')
        result = self.extract(source)
        self.assertEqual(result, AGENT.to_markdown(source, '/guide/example.html', 'de'))
        for text in ['Redaktion: EcoBack', '2026-11-06', 'Kein eigener Produkttest', '10 °C / 60 % RH', '180 W', '](' + MEACO + ')', '[Keller](https://getecoback.com/guide/luftentfeuchter-keller.html)']:
            self.assertIn(text, result)
        self.assertNotRegex(result, r'DEFAULT_SHOP|HIDDEN_US|https?://[^\s)]*amazon|tag=getecoback|ecoback0d')

    def test_main_fallback_preserves_epicooler_editorial_content(self):
        path = SITE / 'guide/epicooler-erfahrungen.html'
        source = path.read_text()
        result = FULL.body_text(path)
        self.assertEqual(result, AGENT.to_markdown(source, '/guide/epicooler-erfahrungen.html', 'de'))
        self.assertIn('Verdunstung', result)
        self.assertIn('Abluftschlauch', result)
        self.assertGreater(len(result), 2000)
        self.assertNotIn('Straight to the picks', result)
        self.assertNotRegex(result, r'https?://[^\s)]*amazon')

    def test_article_stays_preferred_to_main(self):
        source = '<html lang="en"><title>Scope</title><main><p>Outer controls</p><article><p>Original evidence.</p></article></main></html>'
        result = self.extract(source)
        self.assertIn('Original evidence.', result)
        self.assertNotIn('Outer controls', result)

    def test_main_fallback_retains_authored_attribution_and_date(self):
        source = '<html lang="de"><title>Quelle</title><main><header><p>EcoBack Redaktion · geprüft am 2026-11-06.</p></header><p>Keine eigene Produktmessung.</p></main></html>'
        result = self.extract(source)
        self.assertIn('EcoBack Redaktion · geprüft am 2026-11-06.', result)
        self.assertIn('Keine eigene Produktmessung.', result)

    def test_regional_english_preserves_the_country_task(self):
        source = '<html lang="en-GB"><title>UK decision</title><article><p>UK: compare litres at the same temperature.</p></article></html>'
        result = self.extract(source, 'en/guide/uk-example.html')
        self.assertEqual(result, AGENT.to_markdown(source, '/en/guide/uk-example.html', 'en'))
        self.assertIn('UK: compare litres', result)

    def test_dedicated_locale_mirror_must_match_current_html(self):
        source = '<html lang="fr"><title>Calculer</title><main><p>Mesurer avant de choisir.</p><p>Sources vérifiées 2026-11-06.</p><a href="https://www.energie-info.fr/">Source</a></main></html>'
        mirror = '# Calculer\n\nCanonical: https://getecoback.com/fr/calculateur.html\n\nMesurer avant de choisir.\n\nSources vérifiées 2026-11-06.\n\n- [Source](https://www.energie-info.fr/)\n'
        self.assertEqual(self.extract(source, 'fr/calculateur.html', mirror), mirror)
        with self.assertRaisesRegex(ValueError, 'stale|current HTML'):
            self.extract(source, 'fr/calculateur.html', mirror.replace('2026-11-06', '2026-10-01'))
        with self.assertRaisesRegex(ValueError, 'citation|current HTML'):
            self.extract(source, 'fr/calculateur.html', mirror.replace('www.energie-info.fr/', 'unknown.example/'))

    def test_unknown_language_private_and_missing_mirror_are_not_fabricated(self):
        with self.assertRaisesRegex(ValueError, 'language|mirror'):
            self.extract('<html lang="xx"><article>Unknown copy</article></html>')
        with self.assertRaisesRegex(ValueError, 'mirror'):
            self.extract('<html lang="fr"><main>Known locale</main></html>', 'fr/calculateur.html')
        source = '<html lang="en"><meta name="robots" content="noindex,nofollow"><article>Private text</article></html>'
        self.assertEqual(self.extract(source), '')

    def test_current_specialized_mirrors_remain_supported(self):
        for relative in ['fr/calculateur.html', 'es/calculadora.html', 'fr/creator-kit.html',
                         'es/creator-kit.html', 'en/agents/cbam-supplier-data.html',
                         'zh/agents/eudr-geolocation-evidence.html',
                         'stromtarif-werkstatt.html', 'en/energy-tariff-workbench.html']:
            with self.subTest(relative=relative):
                path = SITE / relative
                self.assertEqual(FULL.body_text(path), path.with_suffix('.md').read_text())

    def test_current_winter_articles_keep_every_cited_evidence_url(self):
        for slug in ['klimaanlage-mit-heizfunktion', 'mobile-klimaanlage-ueberwintern',
                     'luftentfeuchter-dauerbetrieb-stromkosten']:
            with self.subTest(slug=slug):
                path = SITE / 'guide' / (slug + '.html')
                source = path.read_text()
                article = re.search(r'<article[^>]*>(.*?)</article>', source, re.S)[1]
                references = {html.unescape(url) for url in re.findall(r'href="(https?[^"]+)"', article)
                              if not any(host in url for host in ['amazon.', 'amzn.', 'youtube.com', 'getecoback.com'])}
                self.assertTrue(references)
                for document in [AGENT.to_markdown(source, '/guide/' + slug + '.html', 'de'), FULL.body_text(path)]:
                    for reference in references:
                        self.assertIn('](' + reference + ')', document, reference)


if __name__ == '__main__':
    unittest.main()
