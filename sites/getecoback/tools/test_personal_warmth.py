from pathlib import Path
import hashlib
import html
import json
import re
import unittest
from urllib.parse import parse_qs, urlsplit
from personal_warmth import CHECKED, FAQ, METER_SOURCE, SHARE_TARGET, SHARE_TITLE, inject
from build_agent_md import to_markdown
from demand_tools import inject as inject_demand

SITE = Path(__file__).resolve().parents[1] / 'site'
class WarmthSurfaceTest(unittest.TestCase):
    def test_generator_cleans_legacy_claims_and_is_idempotent(self):
        source = (SITE/'guide/heizdecke-stromverbrauch.html').read_text()
        first = inject_demand(source, 'heizdecke-stromverbrauch', False)
        self.assertEqual(first, inject_demand(first, 'heizdecke-stromverbrauch', False))
        for stale in ('zum Einschlafen gemacht', 'Heizung bleibt unten', 'rund 6 %', '2–3 °C', '0,24 € pro Nacht', '100 € und mehr', 'mittlere Stufe (100 W)', 'ab ca. 40 €'):
            self.assertNotIn(stale, first)
        self.assertEqual(first.count('id="waerme-rechner"'),1)
        self.assertEqual(first.count('data-warmth-example='),3)
        self.assertIn('<form hidden>',first)
        self.assertIn('data-warmth-copy disabled',first)
        self.assertIn('Lieferzusage nach Österreich oder in die Schweiz',first)
        for name in ('personal-warmth.css','personal-warmth.mjs'):
            digest=hashlib.sha256((SITE/'assets'/name).read_bytes()).hexdigest()[:12]
            self.assertIn(name+'?v='+digest,first)
        schema=[json.loads(x) for x in re.findall(r'<script\b[^>]*type="application/ld\+json"[^>]*>(.*?)</script>',first,re.S)]
        nodes=[node for item in schema for node in item.get('@graph',[item])]
        faq=next(node for node in nodes if node.get('@type')=='FAQPage')
        self.assertEqual([q['acceptedAnswer']['text'] for q in faq['mainEntity']],[a for _,a in FAQ])
        article=next(node for node in nodes if node.get('@type')=='Article')
        self.assertEqual(article['dateModified'], CHECKED)
        restored=first.replace('</body>','<!--EB_POPUP-->zum Einschlafen gemacht<!--/EB_POPUP--></body>')
        self.assertEqual(first,inject(restored))

    def test_markdown_keeps_static_evidence_and_limits_without_commerce(self):
        markup=inject((SITE/'guide/heizdecke-stromverbrauch.html').read_text())
        md=to_markdown(markup,'/guide/heizdecke-stromverbrauch.html','de')
        for evidence in ('55 Wh / 0,055 kWh','220 Wh / 0,22 kWh','330 Wh / 0,33 kWh','Watt × Stunden ÷ 1.000','100–110 W','Abschaltung','keine Währungsumrechnung','Gebäudeteile'):
            self.assertIn(evidence,md)
        self.assertNotIn('amazon.de',md)
        self.assertNotIn('tag=getecoback',md)
        self.assertNotIn('reddit.com/submit',md)
        self.assertNotIn('<form',md)
        self.assertIn('https://getecoback.com/guide/homeoffice-warm-bleiben.html',md)
        for evidence in (METER_SOURCE, 'vor dem Einschalten', 'einschließlich Aufheizen',
                         'Anfangsstand vom Endstand ab', 'gemessenen kWh mit deinem Arbeitspreis'):
            self.assertIn(evidence, md)

    def test_static_answer_and_reddit_composer_use_canonical_fragment(self):
        markup = (SITE / 'guide/heizdecke-stromverbrauch.html').read_text()
        tool = markup.split('id="waerme-rechner"', 1)[1].split('</section>', 1)[0]
        self.assertLess(tool.index('220 Wh = 0,22 kWh'), tool.index('<form hidden>'))
        self.assertIn('rel="noopener noreferrer">Auf Reddit teilen</a>', tool)
        share = re.search(r'href="(https://www.reddit.com/submit\?[^"]+)"', tool)[1]
        url = urlsplit(html.unescape(share))
        self.assertEqual((url.scheme, url.netloc, url.path), ('https', 'www.reddit.com', '/submit'))
        self.assertEqual(parse_qs(url.query), {'url': [SHARE_TARGET], 'title': [SHARE_TITLE]})

if __name__=='__main__':unittest.main()
