#!/usr/bin/env python3
"""Real inventory regressions for household priority, source categories and markets."""
import json
import re
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import build_tools_hub as B
import check_tools_hub as C


def sections(rendered):
    return re.findall(r'<h2>(.*?)</h2>\s*<div class="tgrid">(.*?)</div>', rendered, re.S)


class ToolsHubTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tools = B.discover()

    def test_existing_trotec_dehumidifiers_are_in_humidity(self):
        with open(B.AUTO_CONTENT, encoding="utf-8") as f:
            pages = json.load(f)["pages"]
        # Manufacturer names independently confirm the category; the builder
        # classifies by extraction facts, never by a brand/model substring.
        routes = [url for url, page in pages.items()
                  if page["product"]["name"].startswith("Luftentfeuchter TTK ")]
        self.assertIn("/guide/trotec-ttk-52-e-betriebskosten.html", routes)
        for url in routes:
            with self.subTest(url=url):
                self.assertEqual(self.tools[url]["family"], "feuchte")
                humidity = dict(sections(B.render(self.tools, 11)))["💧 Feuchte, Schimmel & Lüften"]
                self.assertIn(f'href="{url}"', humidity)

    def test_cost_pages_and_similar_slugs_are_not_assumed_dehumidifiers(self):
        for url in ("/guide/stromkosten-rechner.html", "/geraete-austausch-rechner.html",
                    "/guide/trotec-ttk-unknown-betriebskosten.html"):
            with self.subTest(url=url):
                self.assertEqual(B.family_of(url), "strom")
        self.assertEqual(B.family_of("/guide/heizdecke-stromverbrauch.html"), "heizen")
        self.assertEqual(B.family_of("/guide/fensterabdichtung-klimaanlage.html"), "kuehlen")

    def test_future_product_requires_dehumidification_evidence(self):
        with tempfile.TemporaryDirectory() as tmp:
            source = Path(tmp) / "products.json"
            source.write_text(json.dumps({"pages": {
                "/guide/new-device-betriebskosten.html": {"product": {"facts": [{"key": "power_watts"}]}},
                "/guide/new-dryer-betriebskosten.html": {"product": {"facts": [{"key": "extraction_l_per_day"}]}},
            }}))
            with patch.object(B, "AUTO_CONTENT", str(source)):
                metadata = B.tool_metadata()
        self.assertEqual(B.family_of("/guide/new-device-betriebskosten.html", metadata), "strom")
        self.assertEqual(B.family_of("/guide/new-dryer-betriebskosten.html", metadata), "feuchte")
        self.assertEqual(B.family_of("/guide/new-dryer-betriebskosten-extra.html", metadata), "strom")

    def test_english_is_a_language_and_filter_market_is_explicit(self):
        rendered = B.render(self.tools, 11)
        english = dict(sections(rendered))["🌐 English-language tools"]
        self.assertNotIn("🇬🇧", rendered)
        self.assertIn("/en/filter-finder.html", english)
        filter_card = re.search(r'<a class="tcard" href="/en/filter-finder.html">(.*?)</a>', english, re.S).group(1)
        self.assertIn("Markt: US", filter_card)
        self.assertEqual(self.tools["/en/filter-finder.html"]["market"], "US")
        self.assertNotIn("market", self.tools["/en/guide/shower-cost-calculator.html"])
        self.assertEqual(self.tools["/en/guide/12l-vs-20l-dehumidifier-uk.html"]["family"], "english")

    def test_seasonal_household_priorities_are_visible_before_family_and_pro(self):
        first_two = {
            1: ["🔥 Heizen", "💧 Feuchte, Schimmel & Lüften"],
            3: ["💧 Feuchte, Schimmel & Lüften", "❄️ Kühlen & Hitze"],
            7: ["❄️ Kühlen & Hitze", "⚡ Stromkosten & Haushalt"],
            9: ["💧 Feuchte, Schimmel & Lüften", "🔥 Heizen"],
            11: ["🔥 Heizen", "💧 Feuchte, Schimmel & Lüften"],
        }
        for month, expected in first_two.items():
            with self.subTest(month=month):
                headings = [heading for heading, _ in sections(B.render(self.tools, month))]
                self.assertEqual(headings[:2], expected)
                for core in ("🔥 Heizen", "💧 Feuchte, Schimmel & Lüften", "❄️ Kühlen & Hitze", "⚡ Stromkosten & Haushalt"):
                    self.assertLess(headings.index(core), headings.index("Pool, Garten & Reparieren"))
                    self.assertLess(headings.index(core), headings.index("🧰 Pro-Werkzeuge & Agenten"))

    def test_every_tool_is_listed_once_in_every_month(self):
        for month in range(1, 13):
            with self.subTest(month=month):
                linked = C.HREF_RE.findall(B.render(self.tools, month))
                self.assertCountEqual(linked, self.tools)
                self.assertEqual(len(linked), len(set(linked)))

    def test_existing_family_pro_and_international_assets_remain_discoverable(self):
        required = {
            "/familienwerkstatt.html", "/en/home-workshop.html", "/pro-werkzeuge.html",
            "/agents/compliance.html", "/zh/agents/cbam-supplier-data.html",
            "/nl/wonen.html", "/au/fan-running-cost.html", "/it/calcolatore.html",
            "/es/calculadora.html", "/fr/calculateur.html", "/en/solution-calculator.html",
        }
        self.assertTrue(required <= self.tools.keys(), required - self.tools.keys())

    def test_checker_rejects_stale_categories_with_complete_inventory(self):
        current = B.render(self.tools, 11)
        stale = current.replace("🌐 English-language tools", "🇬🇧 English tools")
        self.assertEqual(C.problems(stale, self.tools, lambda url: url in self.tools), [])
        self.assertEqual(C.generated_problems(current, self.tools, 11), [])
        self.assertTrue(C.generated_problems(stale, self.tools, 11))
        self.assertTrue(C.generated_problems(current.replace("Markt: US", "Markt: GB"), self.tools, 11))
        self.assertTrue(C.generated_problems(B.render(self.tools, 7), self.tools, 11))


if __name__ == "__main__":
    unittest.main()
