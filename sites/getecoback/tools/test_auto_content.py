#!/usr/bin/env python3
"""Adversarial offline tests for the automatic content transaction boundary."""
import copy
from datetime import datetime, timedelta, timezone
import html
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import auto_content as engine

NOW = datetime(2026, 10, 17, 5, 0, tzinfo=timezone.utc)
HEAD = "a" * 40


def product(country="DE", model="TTK 53 E", power=230, tank=5.5):
    brand = "Trotec" if country == "DE" else "Meaco"
    host = "de.trotec.com" if country == "DE" else "www.meaco.com"
    url = "https://" + host + "/products/" + engine.normalise(model).replace(" ", "-")
    return {
        "source_id": country.lower() + "-" + engine.normalise(model).replace(" ", "-"),
        "country": country, "language": "de" if country == "DE" else "en-GB",
        "brand": brand, "model": model, "name": brand + " " + model,
        "product_url": url, "source_urls": [url], "checked_at": engine.iso(NOW),
        "source_hash": "b" * 64, "power_watts": power,
        "market": {"currency": "EUR" if country == "DE" else "GBP", "plug": "not verified"},
        "facts": [
            {"key": "power_watts", "label": "Power", "value": power, "unit": "W", "context": "Listed input"},
            {"key": "extraction_l_per_day", "label": "Extraction", "value": 16, "unit": "L/day", "context": "30°C / 80% RH"},
            {"key": "tank_l", "label": "Tank", "value": tank, "unit": "L", "context": ""},
            {"key": "noise_db", "label": "Noise", "value": 42, "unit": "dB(A)", "context": "At 1 m"},
        ],
    }


def render(product, route, published, modified):
    facts = "".join('<tr data-fact-key="' + f["key"] + '"><td>' + html.escape(str(f["value"])) + '</td></tr>' for f in product["facts"])
    links = "".join('<a href="' + html.escape(url, quote=True) + '">Official source</a>' for url in product["source_urls"])
    return '<!doctype html><html><head><title>' + product["name"] + '</title><link rel="canonical" href="' + engine.ORIGIN + route + '"></head><body><!--EB_AUTO_CONTENT--><h1>' + product["name"] + '</h1><table>' + facts + '</table><p data-cost-formula>kW × h × EUR/kWh</p><p data-power-limit>If continuously drawing this listed test power; actual average needs measurement.</p>' + links + '<p>' + ('Independent buying context and visible conditional assumptions. ' * 16) + '</p></body></html>'


class AutoContentTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name) / "sites/getecoback"
        (self.root / "site/guide").mkdir(parents=True)
        self.addCleanup(self.temp.cleanup)

    def execute(self, products=None, day=0, apply=True, renderer=render, receipts=None):
        products = copy.deepcopy(products if products is not None else [product()])
        for item in products:
            if isinstance(item, dict) and item.get("checked_at") == engine.iso(NOW):
                item["checked_at"] = engine.iso(NOW + timedelta(days=day))
        return engine.execute(self.root, {"products": products, "receipts": receipts or []}, NOW + timedelta(days=day), apply=apply, renderer=renderer, before_sha=HEAD)

    def snapshot(self):
        return {str(path.relative_to(self.root)): path.read_bytes() for path in self.root.rglob("*") if path.is_file()}

    def test_default_read_only_does_not_create_state_or_page(self):
        receipt, selection = self.execute(apply=False)
        self.assertFalse(receipt["changed"])
        self.assertEqual(selection["status"], "eligible_read_only")
        self.assertEqual(self.snapshot(), {})

    def test_publication_receipt_exact_keys_and_bounded_paths(self):
        receipt, selection = self.execute()
        self.assertTrue(receipt["changed"], selection)
        self.assertEqual(set(receipt), {"schema_version", "before_sha", "changed", "paths", "canonical_urls"})
        self.assertEqual(receipt["before_sha"], HEAD)
        self.assertEqual(len(receipt["paths"]), 3)
        self.assertEqual(receipt["canonical_urls"], ["https://getecoback.com/guide/trotec-ttk-53-e-betriebskosten.html"])
        self.assertTrue(all(p.startswith("sites/getecoback/") and ".." not in p for p in receipt["paths"]))

    def test_same_day_is_idempotent_and_does_not_refresh_dates(self):
        self.execute()
        before = self.snapshot()
        receipt, selection = self.execute([product(model="TTK 75 E", power=400, tank=8)])
        self.assertFalse(receipt["changed"])
        self.assertEqual(selection["status"], "daily_limit_reached")
        self.assertEqual(before, self.snapshot())

    def test_check_date_hash_price_changes_do_not_count_as_content(self):
        self.execute()
        before = self.snapshot()
        newer = product()
        newer.update(source_hash="c" * 64, price=99.99)
        newer["facts"].append({"key": "price", "label": "Price", "value": 99.99, "unit": "EUR"})
        receipt, selection = self.execute([newer], day=1)
        self.assertFalse(receipt["changed"])
        self.assertEqual(before, self.snapshot())
        self.assertEqual(selection["decisions"][0]["status"], "unchanged_specifications")

    def test_integer_float_or_whitespace_changes_are_not_content(self):
        self.execute()
        newer = product(power=230.0)
        newer["facts"][1]["context"] = " 30°C  / 80% RH "
        receipt, _ = self.execute([newer], day=1)
        self.assertFalse(receipt["changed"])

    def test_real_fact_change_reuses_url_and_preserves_publication_date(self):
        first, _ = self.execute()
        receipt, selection = self.execute([product(power=250)], day=1)
        self.assertTrue(receipt["changed"], selection)
        self.assertEqual(first["canonical_urls"], receipt["canonical_urls"])
        state = json.loads((self.root / engine.DATA_FILES[0]).read_text())
        entry = next(iter(state["pages"].values()))
        self.assertEqual(entry["published"], "2026-10-17")
        self.assertEqual(entry["modified"], "2026-10-18")
        self.assertEqual(entry["product"]["power_watts"], 250)

    def test_collection_failure_preserves_all_existing_state(self):
        self.execute()
        before = self.snapshot()
        receipt, selection = self.execute([], day=1, receipts=[{"status": "timeout"}])
        self.assertFalse(receipt["changed"])
        self.assertEqual(before, self.snapshot())
        self.assertEqual(selection["status"], "no_verified_products_not_evidence_of_zero_demand")

    def test_missing_source_private_host_affiliate_and_market_mismatch_blocked(self):
        invalid = []
        for update in [
            {"source_urls": []}, {"source_hash": ""}, {"checked_at": "2026-10-18T00:00:00Z"},
            {"checked_at": "2026-10-10T00:00:00Z"}, {"language": "en-GB"},
            {"market": {"currency": "GBP"}},
        ]:
            candidate = product(); candidate.update(update); invalid.append(candidate)
        for url in ["http://de.trotec.com/thing", "https://127.0.0.1/private", "https://de.trotec.com@evil.com/a", "https://de.trotec.com/a?tag=affiliate", "https://de.trotec.com.evil.com/a", "https://de.trotec.com:8443/a"]:
            candidate = product(); candidate.update(product_url=url, source_urls=[url]); invalid.append(candidate)
        for candidate in invalid:
            with self.subTest(candidate=candidate):
                receipt, _ = self.execute([candidate])
                self.assertFalse(receipt["changed"])
                self.assertEqual(self.snapshot(), {})

    def test_specification_categories_do_not_count_temperature_twice(self):
        candidate = product()
        candidate["facts"] = candidate["facts"][:1] + [
            {"key": "tank_l", "value": 5.5, "unit": "L"},
            {"key": "operating_temperature_min_c", "value": 5, "unit": "°C"},
            {"key": "operating_temperature_max_c", "value": 35, "unit": "°C"},
            {"key": "voltage_v", "value": 230, "unit": "V"},
            {"key": "plug", "value": "UK", "unit": ""},
        ]
        receipt, selection = self.execute([candidate])
        self.assertFalse(receipt["changed"])
        self.assertEqual(selection["decisions"][0]["status"], "four_independent_specifications_required")

    def test_extraction_requires_test_conditions_and_power_requires_consistency(self):
        for bad in ["context", "power"]:
            candidate = product()
            if bad == "context":
                candidate["facts"][1].pop("context")
            else:
                candidate["power_watts"] = 999
            receipt, _ = self.execute([candidate])
            self.assertFalse(receipt["changed"])

    def test_exact_existing_editorial_title_is_protected(self):
        path = self.root / "site/guide/editorial-review.html"
        path.write_text('<title>Trotec TTK 53 E: Erfahrungen</title><h1>Existing manual content</h1>')
        before = self.snapshot()
        receipt, selection = self.execute()
        self.assertFalse(receipt["changed"])
        self.assertEqual(before, self.snapshot())
        self.assertEqual(selection["decisions"][0]["status"], "existing_editorial_model")

    def test_existing_unmarked_route_is_not_overwritten(self):
        path = self.root / "site/guide/trotec-ttk-53-e-betriebskosten.html"
        path.write_text("Manual original, no matching title")
        before = self.snapshot()
        receipt, _ = self.execute()
        self.assertFalse(receipt["changed"])
        self.assertEqual(before, self.snapshot())

    def test_same_model_from_new_source_and_near_colour_variant_do_not_new_url(self):
        self.execute()
        before = self.snapshot()
        for model in ["TTK 53 E", "TTK 53 E White"]:
            candidate = product(model=model)
            candidate["source_id"] += "-new-listing"
            receipt, _ = self.execute([candidate], day=1)
            self.assertFalse(receipt["changed"])
            self.assertEqual(before, self.snapshot())

    def test_only_one_different_specification_is_too_similar(self):
        self.execute()
        candidate = product(model="TTK 54 E", power=240)
        receipt, selection = self.execute([candidate], day=1)
        self.assertFalse(receipt["changed"])
        self.assertEqual(selection["decisions"][0]["status"], "insufficient_distinct_product_facts")

    def test_de_anchor_allows_gb_after_two_de_publications(self):
        gb = product("GB", "Arete One 12L", power=165, tank=2.5)
        first, _ = self.execute([gb, product()])
        self.assertNotIn("/en/", first["canonical_urls"][0])
        second, _ = self.execute([gb, product(model="TTK 75 E", power=400, tank=8)], day=1)
        self.assertNotIn("/en/", second["canonical_urls"][0])
        third, selection = self.execute([product(model="TTK 95 E", power=600, tank=10), gb], day=2)
        self.assertTrue(third["changed"], selection)
        self.assertIn("/en/", third["canonical_urls"][0])

    def test_path_escape_and_symlink_escape_are_blocked(self):
        for route in ["/guide/../../private.html", "//evil.com/page.html", "/guide/a.html?query=x", "/en/guide/%2e%2e.html"]:
            with self.assertRaises(engine.GateError):
                engine.validate_route(route)
        outside = Path(self.temp.name) / "outside"
        outside.mkdir()
        (self.root / "site/guide").rmdir()
        (self.root / "site/guide").symlink_to(outside, target_is_directory=True)
        receipt, _ = self.execute()
        self.assertFalse(receipt["changed"])
        self.assertEqual(list(outside.iterdir()), [])

    def test_within_project_directory_symlink_is_also_rejected(self):
        target = self.root / "site/en/guide"
        target.mkdir(parents=True)
        (self.root / "site/guide").rmdir()
        (self.root / "site/guide").symlink_to(target, target_is_directory=True)
        receipt, selection = self.execute()
        self.assertFalse(receipt["changed"])
        self.assertEqual(selection["decisions"][0]["status"], "unsafe_output_path")
        self.assertEqual(list(target.iterdir()), [])

    def test_corrupt_existing_state_is_preserved(self):
        (self.root / "data").mkdir()
        (self.root / engine.DATA_FILES[0]).write_text("not json")
        before = self.snapshot()
        receipt, selection = self.execute()
        self.assertFalse(receipt["changed"])
        self.assertEqual(selection["status"], "blocked_preserving_existing_state")
        self.assertEqual(before, self.snapshot())

    def test_renderer_affiliate_missing_fact_or_wrong_canonical_blocks_all_writes(self):
        variants = [
            lambda text: text.replace('</body>', '<a href="https://amazon.de/?tag=anything">Buy</a></body>'),
            lambda text: text.replace('data-cost-formula', 'data-no-formula'),
            lambda text: text.replace('data-fact-key="noise_db"', 'data-no-fact="noise_db"'),
            lambda text: text.replace(engine.ORIGIN, 'https://evil.com'),
        ]
        for transform in variants:
            receipt, selection = self.execute(renderer=lambda *args: transform(render(*args)))
            self.assertFalse(receipt["changed"], selection)
            self.assertEqual(self.snapshot(), {})

    def test_transaction_rolls_back_if_second_replace_fails(self):
        real_replace = engine.os.replace
        calls = 0
        def fail_second(*args):
            nonlocal calls
            calls += 1
            if calls == 2:
                raise OSError("disk unavailable")
            return real_replace(*args)
        with patch.object(engine.os, "replace", side_effect=fail_second):
            receipt, selection = self.execute()
        self.assertFalse(receipt["changed"])
        self.assertEqual(selection["status"], "blocked_preserving_existing_state")
        self.assertEqual(self.snapshot(), {})

    def write_trend(self, **overrides):
        record = {"source": "related-queries", "fetched": "2026-10-17", "last_attempt_status": "ok", "polluted": False, "rising": [{"q": "Trotec TTK 75 E", "v": 300}]}
        record.update(overrides)
        path = self.root / "data/trends-rising.json"
        path.parent.mkdir(exist_ok=True)
        path.write_text(json.dumps({"geo": "DE", "seeds": {"luftentfeuchter": record}}))

    def test_fresh_exact_model_trend_prioritises_that_verified_product(self):
        self.write_trend()
        receipt, selection = self.execute([product(), product(model="TTK 75 E", power=400, tank=8)])
        self.assertIn("ttk-75-e", receipt["canonical_urls"][0])
        self.assertEqual(selection["selected"]["selection_reason"], "fresh_related_query_priority_with_verified_product_facts")
        self.assertEqual(selection["selected"]["trend_evidence"]["match_scope"], "exact_model")
        self.assertEqual(selection["selected"]["trend_evidence"]["metric"], "relative_growth_not_search_volume")
        state = (self.root / engine.DATA_FILES[0]).read_text()
        self.assertNotIn("relative_growth", state)
        self.assertNotIn("selection_reason", state)

    def test_autocomplete_stale_future_failed_or_zero_trends_are_not_demand(self):
        for change in [
            {"source": "autocomplete-vocabulary"}, {"fetched": "2026-10-01"}, {"fetched": "2026-10-18"},
            {"last_attempt_status": "failed"}, {"source_status": "failed"}, {"polluted": True},
            {"rising": [{"q": "Trotec TTK 75 E", "v": 0}]}, {"rising": [{"q": "Trotec TTK 75 E", "v": "new"}]},
        ]:
            with self.subTest(change=change):
                self.write_trend(**change)
                receipt, selection = self.execute([product(), product(model="TTK 75 E", power=400, tank=8)], apply=False)
                self.assertFalse(receipt["changed"])
                self.assertIn("ttk-53-e", selection["selected"]["route"])
                self.assertEqual(selection["selected"]["selection_reason"], "official_catalogue_specification_coverage_gap")
                self.assertIsNone(selection["selected"]["trend_evidence"])

    def test_category_trend_does_not_claim_model_popularity_or_transfer_market(self):
        self.write_trend(rising=[{"q": "luftentfeuchter keller dauerbetrieb", "v": 200}])
        _, selection = self.execute(apply=False)
        self.assertEqual(selection["selected"]["trend_evidence"]["match_scope"], "category_only_not_model_popularity")
        _, selection = self.execute([product("GB", "Arete One 12L", power=165, tank=2.5)], apply=False)
        self.assertIsNone(selection["selected"]["trend_evidence"])

    def test_render_exception_produces_no_publication_and_no_state_change(self):
        def broken(*args):
            raise RuntimeError("renderer crashed")
        receipt, selection = self.execute(renderer=broken)
        self.assertFalse(receipt["changed"])
        self.assertEqual(selection["status"], "blocked_preserving_existing_state")
        self.assertEqual(self.snapshot(), {})

    def test_real_gb_adapter_to_executor_and_renderer_integration_offline(self):
        from auto_content_sources import parse_meaco
        from build_auto_content import render_page
        url = 'https://www.meaco.com/products/meacodry-arete-two-12l-dual-dehumidifier-hepa-air-purifier'
        name = 'MeacoDry Arete Two 12L Dehumidifier / Air Purifier'
        rows = [
            ('Power consumption at 20 °C and 60 % RH', '136 watts'),
            ('Noise level', '35, 38 and 44 dB(A)'), ('Weight', '10.9 kg'),
            ('Tank size', '2.5 litres'), ('Operating temperatures', '5 °C - 35 °C'),
            ('Dimensions (HWD)', '472 x 319 x 237 mm'),
        ]
        body = ('<link rel="canonical" href="' + url + '"><h1>' + name + '</h1><table>' + ''.join('<tr><td>' + key + '</td><td>' + value + '</td></tr>' for key, value in rows) + '</table>').encode()
        candidate = parse_meaco(body, url, {'title': name}, NOW)
        receipt, selection = self.execute([candidate], renderer=render_page)
        self.assertTrue(receipt['changed'], selection)
        self.assertEqual(candidate['source_urls'], [url])
        self.assertIn('/en/guide/', receipt['canonical_urls'][0])
        output = (self.root / receipt['paths'][-1].removeprefix('sites/getecoback/')).read_text()
        self.assertIn('20 °C and 60 % RH', output)
        self.assertIn('GBP', output)


if __name__ == "__main__":
    unittest.main()
