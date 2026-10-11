"""No live HTTP: tests enforce private storage, one-read limits and site isolation."""
import io
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import Mock, patch
import urllib.error
import urllib.request

import collect


class Response(io.BytesIO):
    def __init__(self, body, code=200, headers=None):
        super().__init__(json.dumps(body).encode())
        self.code = code
        self.headers = headers or {"Date": "Sun, 11 Oct 2026 10:00:00 GMT", "Age": "75", "Cache-Control": "public,max-age=3600", "X-Fleet-Aggregate-Version": "read-only-v1"}


def manifest(sources=None, sites=None):
    return {"sources": sources or [{"id": "agi", "url": "https://agiscorecard.com/api/pulse"}],
            "sites": sites or [{"hostname": "agiscorecard.com", "aggregate_source_ids": ["agi"]}]}


class CollectorTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.cache = Path(self.temp.name)

    def test_one_get_per_unique_url_and_explicit_probe(self):
        sources = [{"id": name, "url": "https://agiscorecard.com/api/pulse"} for name in ("agi", "same")]
        opener = Mock()
        opener.open.return_value = Response({"generatedAt": "2026-10-11T10:00:00Z"})
        snapshot, _ = collect.collect(manifest(sources=sources), self.cache, opener=opener, clock=lambda: 10000)
        self.assertEqual(opener.open.call_count, 1)
        request = opener.open.call_args.args[0]
        self.assertEqual(request.get_method(), "GET")
        self.assertEqual(request.get_header("User-agent"), collect.UA)
        self.assertEqual(snapshot["unique_url_count"], 1)
        self.assertEqual(snapshot["sources"]["agi"]["headers"]["age"], "75")
        self.assertEqual(snapshot["sources"]["agi"]["headers"]["x-fleet-aggregate-version"], "read-only-v1")

    def test_hourly_cache_ttl_and_failure_attempts(self):
        opener = Mock()
        opener.open.side_effect = urllib.error.URLError("offline")
        url = "https://agiscorecard.com/api/pulse"
        first = collect.cached_fetch(url, self.cache, opener=opener, clock=lambda: 10000)
        second = collect.cached_fetch(url, self.cache, opener=opener, clock=lambda: 13599)
        self.assertEqual(first["status"], "failure")
        self.assertTrue(second["local_cache"]["reused"])
        self.assertEqual(second["local_cache"]["age_seconds"], 3599)
        self.assertEqual(opener.open.call_count, 1)
        collect.cached_fetch(url, self.cache, opener=opener, clock=lambda: 13600)
        self.assertEqual(opener.open.call_count, 2)

    def test_http_errors_no_retry_and_preserve_json(self):
        opener = Mock()
        opener.open.side_effect = urllib.error.HTTPError("https://agiscorecard.com/api/pulse", 503, "Unavailable", {}, io.BytesIO(b'{"ok":false,"error":"database unavailable"}'))
        record = collect.fetch_once("https://agiscorecard.com/api/pulse", opener, clock=lambda: 10000)
        self.assertEqual(opener.open.call_count, 1)
        self.assertEqual(record["http_status"], 503)
        self.assertEqual(record["body"]["ok"], False)
        self.assertEqual(record["status"], "failure")
        self.assertEqual(collect.status_for({"success": False}, 200), "unavailable")
        self.assertEqual(collect.status_for({"success": True}, 200), "success")

    def test_no_redirect_handler(self):
        handler = collect.NoRedirect()
        self.assertIsNone(handler.redirect_request(None, None, 302, "Found", {}, "https://evil.invalid/"))
        opener = Mock()
        opener.open.side_effect = urllib.error.HTTPError("https://agiscorecard.com/api/pulse", 302, "Found", {"Location": "https://evil.invalid/"}, io.BytesIO(b'{}'))
        with patch.object(collect.urllib.request, "build_opener", return_value=opener) as builder:
            result = collect.fetch_once("https://agiscorecard.com/api/pulse", clock=lambda: 10000)
        self.assertIsInstance(builder.call_args.args[0], collect.NoRedirect)
        self.assertEqual(result["status"], "failure")
        self.assertEqual(opener.open.call_count, 1)

    def test_rejects_private_hosts_auth_paths_queries(self):
        for url in ("http://agiscorecard.com/api/pulse", "https://127.0.0.1/api/pulse", "https://evil.agiscorecard.com/api/pulse",
                    "https://user:pass@agiscorecard.com/api/pulse", "https://agiscorecard.com:443/api/pulse", "https://agiscorecard.com/mcp",
                    "https://agiscorecard.com/api/pulse?fresh=1", "https://agiscorecard.com/api/pulse#secret"):
            with self.subTest(url=url), self.assertRaises(ValueError):
                collect.validate_url(url)
        self.assertEqual(collect.validate_url("https://baipiaoji.com/api/reach?days=28"), "https://baipiaoji.com/api/reach?days=28")

    def test_privacy_guard_uses_nearest_existing_ancestor(self):
        with patch.object(collect.subprocess, "run", return_value=subprocess.CompletedProcess([], 0, "true\n", "")) as run:
            with self.assertRaisesRegex(ValueError, "outside every Git"):
                collect.private_path(self.cache / "does-not-exist" / "nested")
        self.assertEqual(run.call_args.args[0][2], str(self.cache))
        with patch.object(collect.subprocess, "run", return_value=subprocess.CompletedProcess([], 128, "", "")):
            self.assertEqual(collect.private_path(self.cache / "private"), self.cache / "private")

    def test_shared_hub_only_supplies_matching_rows(self):
        source = {"id": "web3-growth", "url": "https://web3.agiscorecard.com/api/growth",
                  "grouping": {"field": "site", "values_by_hostname": {"web3.agiscorecard.com": "hub", "proof.agiscorecard.com": "proof"}}}
        body = {"total": 999, "groups": [{"site": "hub", "count": 7}, {"site": "proof", "count": 2}],
                "daily": [{"site": "proof", "date": "2026-10-10", "count": 1}], "today": [], "timezone": "UTC"}
        scoped, reason = collect.scoped_body(source, "proof.agiscorecard.com", body)
        self.assertIsNone(reason)
        self.assertNotIn("total", scoped)
        self.assertEqual(scoped["groups"], [{"site": "proof", "count": 2}])
        self.assertEqual(len(scoped["daily"]), 1)
        self.assertEqual(body["groups"][0]["site"], "hub")

    def test_missing_shared_groups_are_unknown_never_zero(self):
        source = {"grouping": {"field": "site", "values_by_hostname": {"proof.agiscorecard.com": "proof"}}}
        for body in ({"total": 99}, {"groups": [{"site": "hub", "count": 99}]}, {"groups": []}):
            scoped, reason = collect.scoped_body(source, "proof.agiscorecard.com", body)
            self.assertTrue(reason)
            self.assertNotIn("total", scoped or {})
        self.assertTrue(collect.scoped_body(source, "other.agiscorecard.com", {"groups": []})[1])

    def test_uncovered_sites_and_dynamic_utc_dates(self):
        opener = Mock()
        opener.open.return_value = Response({"ok": False})
        sites = [{"hostname": "agiscorecard.com", "aggregate_source_ids": ["agi"]}, {"hostname": "unused.agiscorecard.com", "aggregate_source_ids": []}]
        snapshot, coverage = collect.collect(manifest(sites=sites), self.cache, opener=opener, clock=lambda: 1791712800)
        self.assertEqual(coverage["sites"][1]["status"], "uncovered")
        self.assertEqual(coverage["sites"][0]["status"], "unavailable")
        self.assertEqual(snapshot["comparison_dates"]["timezone"], "UTC")
        self.assertNotEqual(snapshot["comparison_dates"]["yesterday"], snapshot["comparison_dates"]["today_partial"])

    def test_unknown_source_selection_does_not_read(self):
        opener = Mock()
        with self.assertRaisesRegex(ValueError, "Unknown source"):
            collect.collect(manifest(), self.cache, selected={"typo"}, opener=opener)
        opener.open.assert_not_called()

    def test_current_manifest_contract(self):
        current = json.loads(Path(__file__).with_name("manifest.json").read_text())
        opener = Mock()
        def response(request, **kwargs):
            rows = [{"site": value, "events": 1} for source in current["sources"] for value in source.get("grouping", {}).get("values_by_hostname", {}).values()]
            return Response({"status": "ok", "groups": rows, "daily": [], "today": [], "qa": False})
        opener.open.side_effect = response
        snapshot, coverage = collect.collect(current, self.cache, opener=opener, clock=lambda: 10000)
        configured = sum(bool(site["aggregate_source_ids"]) for site in current["sites"])
        self.assertEqual(sum(site["status"] == "success" for site in coverage["sites"]), configured)
        self.assertEqual(snapshot["source_count"], len(current["sources"]))
        self.assertEqual(opener.open.call_count, len({s["url"] for s in current["sources"]}))

    def test_unusual_status_object_does_not_abort_other_sources(self):
        opener = Mock()
        opener.open.side_effect = [Response({"status": {"custom": True}}), Response({"ok": True})]
        sources = [{"id": "agi", "url": "https://agiscorecard.com/api/pulse"}, {"id": "eco", "url": "https://getecoback.com/api/pulse"}]
        snapshot, _ = collect.collect(manifest(sources=sources), self.cache, opener=opener, clock=lambda: 10000)
        self.assertEqual(snapshot["source_count"], 2)
        self.assertEqual(opener.open.call_count, 2)


if __name__ == "__main__":
    unittest.main()
