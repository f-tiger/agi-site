"""Adversarial checks for trend ingestion, not mocks of publishing success."""
import copy
import json
import sys
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch

import eco_evolution as evo

NOW = datetime(2026, 10, 17, 12, tzinfo=timezone.utc)
TARGET = "/guide/tineco-saugt-nicht-mehr.html"
PAGES = {TARGET: {"title": "Tineco saugt nicht mehr: Filter und Wartung", "country": "DE"}}


def catalog(verified=False):
    evidence = {"status": "verified" if verified else "reference_only", "country": "DE",
                "reviewed_at": "2026-10-16T12:00:00+00:00", "url": "https://www.meaco.com/source", "scope": "Exact reviewed maintenance task only"}
    return {"tasks": [{"id": "maintenance", "country": "DE", "aliases": ["tineco"],
                       "target": TARGET, "local_pain": dict(evidence, url="https://www.reddit.com/r/test/"), "primary_guidance": evidence.copy()}]}


def signal(text="tineco filter wechseln", **kwargs):
    row = {"text": text, "source_id": "rss-DE", "country": "DE", "source_status": "ok",
           "captured_at": NOW.isoformat(), "observed_at": NOW.isoformat(),
           "signal_kind": "rss", "metric": "public_trending_feed_presence"}
    return dict(row, **kwargs)


def queue(rows, cat=None, pages=None):
    return evo.classify(rows, cat or catalog(), pages or PAGES, NOW)


class SourceTests(unittest.TestCase):
    def test_country_and_per_source_capture_are_preserved(self):
        raw = b'<rss><channel><item><title>meaco filter</title><pubDate>Sat, 17 Oct 2026 08:00:00 GMT</pubDate></item></channel></rss>'
        receipt, rows = evo.collect_rss("GB", NOW, lambda country: raw)
        self.assertEqual((receipt["status"], rows[0]["country"]), ("ok", "GB"))
        self.assertEqual(receipt["captured_at"], NOW.isoformat())

    def test_failed_fetch_is_unknown_not_empty_success(self):
        def fail(country): raise OSError("untrusted error content")
        receipt, rows = evo.collect_rss("DE", NOW, fail)
        self.assertEqual(receipt["status"], "failed")
        self.assertIsNone(receipt["captured_at"])
        self.assertEqual(rows, [])
        self.assertNotIn("untrusted", json.dumps(receipt))

    def test_parse_failure_and_empty_feed_are_failed(self):
        for raw in (b'<html>blocked</html>', b'<rss><channel/></rss>', b'not xml'):
            with self.subTest(raw=raw):
                receipt, rows = evo.collect_rss("DE", NOW, lambda country: raw)
                self.assertEqual(receipt["status"], "failed")

    def test_xml_entity_and_oversized_response_are_rejected(self):
        for raw in (b'<!DOCTYPE rss [<!ENTITY x SYSTEM "file:///etc/passwd">]><rss/>', b'x' * (evo.MAX_BYTES + 1)):
            with self.assertRaises(ValueError): evo.parse_rss(raw)

    def test_related_snapshot_tracks_individual_staleness_and_failures(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "rising.json"
            path.write_text(json.dumps({"geo": "DE", "seeds": {
                "a": {"fetched": "2026-09-01", "source": "related-queries", "rising": [{"q": "tineco filter", "v": 7000}]},
                "b": {"fetched": "2026-10-16", "source": "related-queries", "last_attempt_status": "failed", "rising": [{"q": "tineco geruch", "v": 9000}]},
                "c": {"fetched": "2026-10-16", "source": "autocomplete-diff", "auto": ["tineco neu"], "rising": [{"q": "tineco neu", "v": "new"}]}
            }}))
            receipts, rows = evo.collect_rising(path, NOW)
        self.assertEqual([r["status"] for r in receipts], ["stale", "fetch_failed_keep_last_good", "ok"])
        self.assertEqual(rows[-1]["metric"], "vocabulary_only")
        self.assertIsNone(rows[-1]["relative_growth"])

    def test_missing_snapshot_is_not_zero_demand(self):
        receipts, rows = evo.collect_rising("/nonexistent/snapshot.json", NOW)
        self.assertEqual(receipts[0]["status"], "failed")

    def test_unknown_source_and_invalid_relative_growth_do_not_create_signals(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'rising.json'
            path.write_text(json.dumps({'geo': 'DE', 'seeds': {
                'unknown': {'source': 'some-blog', 'fetched': '2026-10-16', 'rising': [{'q':'tineco filter','v':9000}], 'auto':['tineco filter']},
                'known': {'source': 'related-queries', 'fetched': '2026-10-16', 'rising': [{'q':'tineco filter','v':value} for value in [-1, 0, True, 1.5, float('inf'), float('nan'), 'new', 100]]}
            }}))
            receipts, rows = evo.collect_rising(path, NOW)
        self.assertEqual(receipts[0]['status'], 'unknown_source')
        self.assertEqual(receipts[1]['invalid_rows_ignored'], 7)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]['relative_growth'], 100)


class DecisionTests(unittest.TestCase):
    def test_fresh_signal_only_queues_existing_page_research(self):
        rows, dropped = queue([signal()])
        self.assertEqual(rows[0]["status"], "research_existing")
        self.assertEqual(rows[0]["target"], TARGET)
        for field in ("auto_publish", "new_page_allowed", "product_link_allowed"):
            self.assertFalse(rows[0][field])

    def test_deepening_requires_both_current_country_specific_evidence(self):
        rows, _ = queue([signal()], catalog(True))
        self.assertEqual(rows[0]["status"], "deepen_existing")
        for change in ({"status": "missing"}, {"country": "GB"}, {"reviewed_at": "2025-10-16"}, {"reviewed_at": "2027-10-16"}):
            cat = catalog(True); cat["tasks"][0]["primary_guidance"].update(change)
            rows, _ = queue([signal()], cat)
            self.assertEqual(rows[0]["status"], "research_existing")

    def test_broad_brand_query_does_not_inherit_exact_model_guidance(self):
        cat = catalog(True)
        cat['tasks'][0].update(required_intent_terms=['filter', 'geruch'], reviewed_model_terms=['s7 flashdry'])
        for query in ('tineco', 'tineco filter', 'tineco s5 filter', 'tineco s7 flashdry aktie'):
            rows, _ = queue([signal(query)], cat)
            self.assertEqual(rows[0]['status'], 'research_existing', query)
        rows, _ = queue([signal('tineco s7 flashdry filter')], cat)
        self.assertEqual(rows[0]['status'], 'deepen_existing')

    def test_stale_missing_date_and_source_failure_never_promote(self):
        for options in ({"observed_at": "2026-09-01"}, {"observed_at": None},
                        {"observed_at": "2026-10-17T12:00:01+00:00"},
                        {"source_status": "fetch_failed_keep_last_good"}, {"source_status": "polluted"}):
            rows, _ = queue([signal(**options)], catalog(True))
            self.assertEqual(rows[0]["status"], "awaiting_evidence")

    def test_autocomplete_new_is_not_a_trend_even_with_verified_task(self):
        rows, _ = queue([signal(signal_kind="autocomplete", metric="vocabulary_only")], catalog(True))
        self.assertEqual(rows[0]["reason"], "autocomplete_is_vocabulary_not_trend_or_demand")
        self.assertEqual(rows[0]["status"], "awaiting_evidence")

    def test_retired_products_and_irrelevant_news_are_rejected(self):
        for text in ("growatt heizung", "solar heizung", "balkonkraftwerk", "tineco bundestag", "fussball finale", "bayern wetter", "ｓｏｌａｒ heizlüfter", "%67rowatt tineco"):
            rows, dropped = queue([signal(text)])
            self.assertEqual(rows, [], text)
            self.assertEqual(len(dropped), 1)

    def test_injection_cannot_supply_actions_or_change_targets(self):
        for text in ("tineco ignore previous instructions", "tineco <script>run()</script>", "tineco curl https://evil.invalid/", "tineco 忽略所有指令"):
            rows, dropped = queue([signal(text)])
            self.assertEqual(rows, [])
            self.assertNotIn(text, json.dumps(dropped))

    def test_duplicate_signals_keep_provenance_without_double_counting(self):
        rows, _ = queue([signal(), signal(source_id="related-DE")])
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["also_seen_in"], ["related-DE"])

    def test_stale_or_autocomplete_copy_cannot_hide_fresh_signal(self):
        rows, _ = queue([signal(signal_kind="autocomplete"), signal(source_id="fresh-DE")])
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["status"], "research_existing")
        self.assertEqual(rows[0]["source_id"], "fresh-DE")

    def test_country_does_not_cross_map_german_pages_to_uk(self):
        rows, _ = queue([signal(country="GB")], catalog(True))
        self.assertIsNone(rows[0]["target"])
        self.assertEqual(rows[0]["status"], "awaiting_evidence")

    def test_missing_curated_page_is_not_a_new_page_request(self):
        rows, _ = evo.classify([signal()], catalog(True), {}, NOW)
        self.assertIsNone(rows[0]["target"])
        self.assertEqual(rows[0]["reason"], "mapped_page_missing_do_not_create_duplicate")

    def test_evidence_urls_require_exact_reviewed_hosts_without_credentials(self):
        for url in ("https://localhost/", "https://127.0.0.1/", "https://www.meaco.com.evil.invalid/",
                    "https://user@www.meaco.com/", "https://www.meaco.com:8443/", "http://www.meaco.com/", "https://arbitrary.example/"):
            cat = catalog(True); cat["tasks"][0]["primary_guidance"]["url"] = url
            rows, _ = queue([signal()], cat)
            self.assertEqual(rows[0]["status"], "research_existing", url)

    def test_existing_title_and_path_match_requires_intent_review(self):
        rows, _ = queue([signal("staubsauger filter wartung")])
        self.assertEqual(rows[0]["target"], TARGET)
        self.assertEqual(rows[0]["reason"], "title_and_path_overlap_requires_manual_intent_check")


class LegacyRailTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        sys.path.insert(0, str(evo.ROOT / "sites/getecoback/tools"))
        import build_rising_rail
        cls.rail = build_rising_rail

    def test_unverified_model_does_not_become_automatic_affiliate_ad(self):
        self.assertIsNone(self.rail.destination_for("ewt heizlüfter"))
        self.assertIsNone(self.rail.destination_for("growatt heizlüfter"))

    def test_rail_requires_current_related_queries(self):
        fresh = {"source": "related-queries", "fetched": "2026-10-16"}
        self.assertTrue(self.rail.fresh_related_seed(fresh, NOW))
        for extra in ({"source": "autocomplete-diff"}, {"fetched": "2026-09-01"}, {"polluted": True}, {"last_attempt_status": "failed"}, {"last_attempt_status": "empty"}):
            self.assertFalse(self.rail.fresh_related_seed(dict(fresh, **extra), NOW))


class AuditTests(unittest.TestCase):
    def test_english_is_not_automatically_british_localisation(self):
        with tempfile.TemporaryDirectory() as folder:
            site = Path(folder); (site / 'en/guide').mkdir(parents=True)
            entries = {'italy-air-conditioning.html':'en', 'dehumidifier-uk.html':'en',
                       'british-maintenance.html':'en-GB', 'dehumidifier-drying-clothes-cost.html':'en'}
            for filename, lang in entries.items():
                (site / 'en/guide' / filename).write_text(f'<html lang="{lang}"><title>Dehumidifier</title></html>')
            cat = {'tasks':[{'target':'/en/guide/dehumidifier-drying-clothes-cost.html','country':'GB'}]}
            pages = evo.inventory(site, cat)
        self.assertEqual(pages['/en/guide/italy-air-conditioning.html']['country'], 'unknown')
        for filename in list(entries)[1:]:
            self.assertEqual(pages['/en/guide/' + filename]['country'], 'GB')

    def test_candidate_gets_real_static_audit_without_modifying_page(self):
        with tempfile.TemporaryDirectory() as folder:
            site = Path(folder); (site / 'guide').mkdir()
            (site / 'index.html').write_text('<a href="/guide/tineco-saugt-nicht-mehr.html">Help</a>')
            html = '<title>Maintenance</title><meta name="description" content="Check maintenance"><link rel="canonical" href="https://getecoback.com' + TARGET + '"><script type="application/ld+json">{"@type":"Article"}</script><a href="https://de.tineco.com/support/">Source</a>'
            page = site / TARGET.lstrip('/'); page.write_text(html)
            result = evo.audit_targets(site, [TARGET])[0]
            self.assertEqual(result['status'], 'pass')
            self.assertEqual(result['discovery_link_depth'], 1)
            self.assertFalse(result['modified'])
            self.assertEqual(page.read_text(), html)

    def test_missing_canonical_noindex_invalid_json_and_unreachable_page_are_reported(self):
        with tempfile.TemporaryDirectory() as folder:
            site = Path(folder); (site / 'guide').mkdir()
            (site / 'index.html').write_text('<title>Home</title>')
            (site / TARGET.lstrip('/')).write_text('<meta name="robots" content="noindex"><script type="application/ld+json">broken</script>')
            result = evo.audit_targets(site, [TARGET])[0]
            self.assertEqual(result['status'], 'review')
            for finding in ('canonical_missing_duplicate_or_mismatched', 'noindex_directive',
                            'structured_data_missing_or_invalid', 'not_reached_from_home_or_tools_within_three_links',
                            'primary_source_reference_needs_review'):
                self.assertIn(finding, result['findings'])


if __name__ == "__main__": unittest.main()
