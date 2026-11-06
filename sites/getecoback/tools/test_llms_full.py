"""The bulk agent document must preserve evidence, not hidden shopping UI."""
import re
import html
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import build_agent_md as AGENT
import build_llmstxt as FULL

SITE = Path(__file__).resolve().parents[1] / 'site'
MEACO = 'https://www.meaco.com/products/meacodry-arete-one-20l-dehumidifier-and-air-purifier'


class LlmsFull(unittest.TestCase):
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
