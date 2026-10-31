#!/usr/bin/env python3
"""Offline regressions for source gates, task lifecycle and existing consumers."""
import copy
import datetime as dt
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import evolution
import demand_digest
import pain_radar as radar

TODAY = dt.date(2026, 10, 31)
SITES = {"baipiaoji": "sites/baipiaoji"}
def fixture():
    return {"schema_version": 1, "items": [{
        "id": "fixture-pain", "site": "baipiaoji", "status": "queued",
        "site_fit_verified": True, "title": "Synthetic pain", "task": "Check existing path",
        "priority": 76, "scope": ["sites/baipiaoji/"], "acceptance": ["Use synthetic data"],
        "sources": [{"id": "fixture-a", "original_verified": True, "published_at": "2026-10-01", "reviewed_at": "2026-10-31"},
                    {"id": "fixture-b", "original_verified": True, "published_at": "2026-10-02", "reviewed_at": "2026-10-31"}]}]}
def evaluate(data):
    return radar.evaluate(data, TODAY, SITES)

class Gates(unittest.TestCase):
    def test_valid_fixture_can_extend(self):
        self.assertEqual(evaluate(fixture())[0]["decision"], "extend")
    def test_one_source_cannot_extend(self):
        d = fixture(); d["items"][0]["sources"].pop()
        self.assertEqual(evaluate(d)[0]["decision"], "verify")
    def test_duplicate_sources_do_not_confirm(self):
        d = fixture(); d["items"][0]["sources"][1] = copy.deepcopy(d["items"][0]["sources"][0])
        self.assertEqual(evaluate(d)[0]["decision"], "verify")
        self.assertEqual(evaluate(d)[0]["verified_sources"], 1)
    def test_unknown_stale_future_and_cached_sources(self):
        for key, value in [("published_at", None), ("published_at", "2025-01-01"),
                           ("published_at", "2026-11-01"), ("reviewed_at", "2026-10-01"),
                           ("reviewed_at", "2026-11-01"), ("original_verified", False),
                           ("original_verified", 1)]:
            d = fixture(); d["items"][0]["sources"][0][key] = value
            with self.subTest(key=key, value=value):
                self.assertEqual(evaluate(d)[0]["decision"], "verify")
    def test_unknown_customer_fit(self):
        d = fixture(); d["items"][0].pop("site_fit_verified")
        self.assertEqual(evaluate(d)[0]["decision"], "verify")
    def test_terminal_and_working_states(self):
        for status in ["done", "working", "blocked", "rejected"]:
            d = fixture(); d["items"][0]["status"] = status
            self.assertEqual(radar.actions(evaluate(d)), [])
    def test_duplicate_task_ids_fail_closed(self):
        d = fixture(); d["items"].append(copy.deepcopy(d["items"][0]))
        self.assertEqual(evaluate(d), [])
    def test_scope_allowlist(self):
        for scope in [["sites/agiscorecard/"], ["sites/baipiaoji/../../secret"],
                      ["https://example.com"], [], ["sites/baipiaoji/..\\secret"]]:
            d = fixture(); d["items"][0]["scope"] = scope
            self.assertEqual(evaluate(d), [])
        for site in ["unknown", None, []]:
            d = fixture(); d["items"][0]["site"] = site
            self.assertEqual(evaluate(d), [])
    def test_one_action_per_site_and_working_site_busy(self):
        d = fixture(); second = copy.deepcopy(d["items"][0]); second["id"] = "fixture-second"
        d["items"].append(second)
        self.assertEqual(len(radar.actions(evaluate(d))), 1)
        second["status"] = "working"
        self.assertEqual(radar.actions(evaluate(d)), [])
    def test_unknown_fields_are_not_projected(self):
        d = fixture(); d["items"][0]["secret"] = "sensitive-sentinel"
        d["items"][0]["sources"][0]["raw_body"] = "private-sentinel"
        self.assertNotIn("sentinel", json.dumps(evaluate(d)))
    def test_missing_invalid_document(self):
        for d in [None, [], {}, {"schema_version": 2}, {"schema_version": 1, "items": [None, {}]}]:
            self.assertEqual(evaluate(d), [])
        self.assertEqual(radar.load("/does-not-exist/pain.json"), {})
    def test_priority_and_threshold_cannot_bypass_gate(self):
        d = fixture(); d["items"][0]["priority"] = 999
        d["items"][0]["sources"] = []
        d["limits"] = {"min_verified_sources_for_extension": 0}
        row = evaluate(d)[0]
        self.assertEqual(row["priority"], 85)
        self.assertEqual(row["decision"], "verify")
    def test_production_ledger_schema_allows_evidence_and_lifecycle_updates(self):
        d = radar.load(Path(__file__).resolve().parents[2] / "data/user-pain-radar.json")
        self.assertEqual(d.get("schema_version"), 1)
        self.assertIsInstance(d.get("items"), list)
        rows = radar.evaluate(d, TODAY, evolution.SITE_DIRS)
        self.assertEqual(len(rows), len(d["items"]))
        for item in d["items"]:
            self.assertTrue(item.get("counter_evidence"))
            self.assertIsInstance(item.get("sources"), list)
            for source in item["sources"]:
                self.assertEqual(set(source), {"id", "original_verified", "published_at", "reviewed_at"})
        # The live ledger may grow, reach extension gates, or complete its tasks.
        # Lifecycle and source behavior are asserted against synthetic fixtures.
    def test_existing_evolution_and_digest_consume_same_feed(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); data = root / "data"; data.mkdir()
            (data / "user-pain-radar.json").write_text(json.dumps(fixture()))
            with patch.multiple(evolution, ROOT=root, DATA=data, EVOLUTION=data / "fleet-evolution", SITE_DIRS=SITES):
                report, _ = evolution.build(TODAY)
            action = next(a for a in report["latest"]["actions"] if a["kind"] == "pain_point_extension")
            self.assertEqual(action["evidence"]["pain_id"], "fixture-pain")
            manifest_action = next(a for a in report["manifests"]["baipiaoji"]["actions"] if a["kind"] == "pain_point_extension")
            self.assertEqual(manifest_action["evidence"]["acceptance"], ["Use synthetic data"])
            self.assertIn("fixture-pain", report["markdown"])
            target = data / "autopilot/demand-digest.md"
            with patch.multiple(demand_digest, ROOT=str(root), OUT=str(target), SITES=list(SITES)), \
                 patch("sys.argv", ["demand_digest.py", "--today=2026-10-31"]):
                self.assertEqual(demand_digest.main(), 0)
            self.assertIn("fixture-pain", target.read_text())
            self.assertEqual(json.loads((data / "user-pain-radar.json").read_text()), fixture())

if __name__ == "__main__":
    unittest.main()
