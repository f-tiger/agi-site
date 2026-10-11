import copy
import json
import tempfile
import unittest
from pathlib import Path

import build_manifest as inventory


class ManifestTests(unittest.TestCase):
    def setUp(self):
        self.manifest = inventory.build()

    def test_current_inventory_and_deterministic_generation(self):
        inventory.validate(self.manifest)
        self.assertEqual(self.manifest, inventory.build())
        self.assertEqual(len(self.manifest["sources"]), 23)
        self.assertEqual(sum(bool(s["aggregate_source_ids"]) for s in self.manifest["sites"]), 31)
        hosts = {s["hostname"] for s in self.manifest["sites"]}
        self.assertTrue({"invest.agiscorecard.com", "mcppulse.agiscorecard.com", "lens.agiscorecard.com", "bestblindtoys.com"} <= hosts)
        self.assertNotIn("www.getecoback.com", hosts)

    def test_missing_canonical_host_and_duplicate_hostname_rejected(self):
        missing = copy.deepcopy(self.manifest)
        missing["sites"] = [s for s in missing["sites"] if s["hostname"] != "invest.agiscorecard.com"]
        with self.assertRaisesRegex(AssertionError, "canonical hosts missing"):
            inventory.validate(missing)
        duplicated = copy.deepcopy(self.manifest)
        duplicated["sites"].append(dict(duplicated["sites"][0], id="other"))
        with self.assertRaisesRegex(AssertionError, "duplicate site hostname"):
            inventory.validate(duplicated)

    def test_new_route_without_analytics_registry_is_discovered(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "sites/new-site").mkdir(parents=True)
            for path in [inventory.GA_REGISTRY, inventory.ACCOUNT_ALLOWLIST]:
                target = root / path
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_text((inventory.ROOT / path).read_text())
            (root / "sites/new-site/wrangler.jsonc").write_text('{"routes":[{"pattern":"new-site.agiscorecard.com","custom_domain":true}]}')
            self.assertIn("new-site.agiscorecard.com", inventory.local_host_evidence(root))
            generated = inventory.build(root)
            row = next(s for s in generated["sites"] if s["hostname"] == "new-site.agiscorecard.com")
            self.assertEqual(row["coverage_status"], "uncovered")
            self.assertIsNone(row["ga4"]["property_id"])
            with self.assertRaisesRegex(AssertionError, "canonical hosts missing"):
                inventory.validate(self.manifest, root)

    def test_shared_web3_group_cannot_be_copied_to_each_host(self):
        source = next(s for s in self.manifest["sources"] if s["id"] == "web3-growth")
        self.assertEqual(source["grouping"]["values_by_hostname"]["web3.agiscorecard.com"], "hub")
        source["grouping"]["values_by_hostname"]["proof.agiscorecard.com"] = "hub"
        with self.assertRaisesRegex(AssertionError, "values duplicated"):
            inventory.validate(self.manifest)

    def test_endpoint_deduplication_and_cache_floor(self):
        self.manifest["sources"][1]["url"] = self.manifest["sources"][0]["url"]
        with self.assertRaisesRegex(AssertionError, "duplicate source url"):
            inventory.validate(self.manifest)
        self.manifest = inventory.build()
        self.manifest["sources"][0]["min_refresh_seconds"] = 1
        with self.assertRaisesRegex(AssertionError, "cache budget"):
            inventory.validate(self.manifest)

    def test_alias_and_property_evidence_do_not_create_false_coverage(self):
        compass = next(s for s in self.manifest["sites"] if s["id"] == "compass")
        self.assertIsNone(compass["ga4"]["property_id"])
        alias = next(s for s in self.manifest["aliases"] if s["hostname"] == "aichain-stocks.netlify.app")
        self.assertEqual(alias["ga4"]["property_id"], "541485670")
        compass["ga4"]["property_id"] = "541485670"
        with self.assertRaisesRegex(AssertionError, "inferred GA4 mapping"):
            inventory.validate(self.manifest)
        self.manifest = inventory.build()
        self.manifest["aliases"][0]["hostname"] = "getecoback.com"
        with self.assertRaisesRegex(AssertionError, "alias counted"):
            inventory.validate(self.manifest)
        self.manifest = inventory.build()
        self.manifest["aliases"].append(copy.deepcopy(self.manifest["aliases"][0]))
        with self.assertRaisesRegex(AssertionError, "duplicate alias identity"):
            inventory.validate(self.manifest)


if __name__ == "__main__":
    unittest.main()
