#!/usr/bin/env python3
"""Heat-pump suitability and winter maintenance must not sell unrelated heaters."""
import html
import json
import re
import unittest
from pathlib import Path

import build_structure as B

SITE = Path(__file__).resolve().parent.parent / "site"
HEATPUMP = "klimaanlage-mit-heizfunktion"
WINTER = "mobile-klimaanlage-ueberwintern"
SHOPPING = ("MODELS", "TOPPICK", "POPUP", "STICKY", "PROFILE", "QUICKPICK",
            "SIZER", "USMARKET", "USTOP", "USSHELF", "USUNITS", "USSWITCH", "INLINE", "HEATENERGY")


def text(markup):
    return html.unescape(re.sub(r"<[^>]+>", "", markup)).strip()


def rebuild(source, slug):
    """The actual recommendation injectors, in the release pipeline's order."""
    source = B.inject_profile(source)
    source = B.inject_usmarket(source, slug)
    source = B.inject_models(source, slug)
    source = B.inject_sizer(source, slug)
    source = B.inject_toppick(source, slug)
    # Explicitly exercise the optional-US surfaces too, including stale EN-era
    # blocks, even though only the German guides are in this change.
    source = B.inject_us_toppick(source, slug)
    source = B.inject_us_shelf(source, slug)
    source = B.inject_us_units(source, slug)
    source = B.inject_quickpick(source, slug)
    source = B.inject_heatenergy(source, slug)
    source = B.inject_sticky(source)
    source = B.inject_popup(source, slug)
    source = B.strip_legacy_market_switch(source)
    return B.strip_decision_promotions(source, slug)


class HeatpumpIntent(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = (SITE / "guide" / (HEATPUMP + ".html")).read_text()
        cls.article = re.search(r"<article>(.*?)</article>", cls.source, re.S)[1]

    def test_old_wrong_shelves_are_removed_and_cannot_return(self):
        old = '<a href="https://www.amazon.de/s?k=Schmidbauer+Hybrid+Pro+600+W&tag=getecoback-21">Schmidbauer / Heizlüfter 300 Watt / Reinigungs-Schaum</a>'
        stale = "".join("<!--EB_" + marker + "-->" + old + "<!--/EB_" + marker + "-->\n" for marker in SHOPPING)
        own = '<a href="/strommess-protokoll.html">Verbrauch prüfen</a>'
        for slug in (HEATPUMP, WINTER):
            with self.subTest(slug=slug):
                source = '<html lang="de"><head></head><body><article><h1>Vor dem Kauf prüfen</h1>' + stale + '<h2>Eigene Entscheidung</h2>' + own + '</article></body></html>'
                once = rebuild(source, slug)
                self.assertEqual(rebuild(once, slug), once)
                self.assertIn(own, once)
                self.assertNotIn("amazon.", once)
                self.assertNotIn("Schmidbauer", once)
                for marker in SHOPPING:
                    self.assertNotIn("<!--EB_" + marker + "-->", once)

    def test_precise_task_skip_keeps_other_market_and_product_paths(self):
        for slug in (HEATPUMP, WINTER):
            self.assertTrue(B.shelf_skipped(slug, B.context_entries(slug)))
            self.assertFalse(B.us_market_allowed(slug))
            self.assertEqual(B.usmarket_html(slug), "")
            self.assertIsNone(B.context_entries(slug))
        other = '<!--EB_MODELS-->Existing relevant models<!--/EB_MODELS-->'
        self.assertEqual(B.strip_decision_promotions(other, "klimaanlage-30-qm"), other)
        self.assertTrue(B.us_market_allowed("portable-ac-vs-air-cooler"))
        self.assertFalse(B.us_market_allowed("12l-vs-20l-dehumidifier-uk"))
        self.assertIsNotNone(B.context_entries("klimaanlage-reinigen"))

    def test_heatpump_page_has_no_irrelevant_shopping_layers(self):
        for marker in SHOPPING:
            self.assertNotIn("<!--EB_" + marker + "-->", self.source)
        self.assertNotRegex(self.source, r'href=["\'][^"\']*amazon\.')
        self.assertNotIn("Schmidbauer", self.source)
        self.assertNotIn("Heizlüfter 300 Watt", self.source)

    def test_comparison_and_cost_boundaries_replace_universal_claims(self):
        article = text(self.article)
        for required in ("Fest installiertes Splitgerät", "Mobiles Splitgerät", "Mobiler Monoblock",
                         "Widerstandsheizung", "Strompreis je kWh Strom ÷ tatsächlicher COP",
                         "keine persönliche Verbrauchsprognose", "keine Temperaturzuordnung",
                         "Gasarbeitspreis ÷ Nutzungsgrad", "Abtauphasen", "Warmwasser separat",
                         "COP-3-Szenario", "keine eigenen Leistungs- oder Produkttests"):
            self.assertIn(required, article)
        for removed in ("günstigste Übergangsheizung", "bricht die Effizienz vieler Geräte",
                        "Heizfunktion praktisch geschenkt", "Ordentlich (COP ~2,5)", "~300–600 €"):
            self.assertNotIn(removed, text(self.source))

    def test_faq_schema_is_identical_to_visible_answers(self):
        schemas = [json.loads(m) for m in re.findall(r'<script type="application/ld\+json">(.*?)</script>', self.source, re.S)]
        faqs = [s for s in schemas if s.get("@type") == "FAQPage"]
        self.assertEqual(len(faqs), 1)
        visible = re.search(r'<h2 id="haeufige-fragen">.*?</h2>(.*?)<div class="related">', self.article, re.S)[1]
        pairs = [(text(q), text(a)) for q, a in re.findall(r'<p><strong>(.*?)</strong><br>(.*?)</p>', visible, re.S)]
        structured = [(q["name"], q["acceptedAnswer"]["text"]) for q in faqs[0]["mainEntity"]]
        self.assertEqual(len(pairs), 4)
        self.assertEqual(structured, pairs)

    def test_evidence_and_existing_next_steps_are_reachable_from_body(self):
        for authority in ("energy-efficient-products.ec.europa.eu", "www.verbraucherzentrale.de",
                          "www.midea.com", "www.idar-oberstein.de"):
            self.assertIn('href="https://' + authority + '/', self.article)
        links = re.findall(r'href="(/[^"#?]+\.html)(?:[?#][^"]*)?"', self.article)
        for link in links:
            self.assertTrue((SITE / link.lstrip("/")).is_file(), link)
        self.assertIn("/strommess-protokoll.html", links)
        self.assertIn("/guide/heizkosten-vergleich-rechner.html", links)
        self.assertIn("/guide/split-klimaanlage-ohne-kernbohrung.html", links)
        for target in re.findall(r'href="#([^"]+)"', self.article):
            self.assertIn('id="' + target + '"', self.article)

    def test_heater_copy_does_not_turn_trends_into_search_volume(self):
        for table in (B.DEVICE_MODELS, B.DEVICE_MODELS_EN):
            card = next(row for row in table["heater"] if row[0] == "Midea NTH20-17BR")
            self.assertNotRegex(card[2], r"48[.,]600|Anfrage der Woche|search volume|queries this week")
            self.assertRegex(card[2], r"keine Wärmepumpe|not a heat pump")


if __name__ == "__main__":
    unittest.main()
