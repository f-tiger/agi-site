import datetime as dt
import copy
import importlib.util
import os
import unittest
from pathlib import Path
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("radar", Path(__file__).with_name("radar.py"))
radar = importlib.util.module_from_spec(spec)
spec.loader.exec_module(radar)
NOW = dt.datetime(2026, 10, 31, 12, tzinfo=dt.timezone.utc)


def feed(title="San Francisco AI startup raises seed funding", link="https://techcrunch.com/2026/10/30/example/", date="Fri, 30 Oct 2026 12:00:00 GMT", description="A startup launches an AI agent."):
    return f"<rss><channel><item><title>{title}</title><link>{link}</link><pubDate>{date}</pubDate><description>{description}</description></item></channel></rss>".encode()


class FeedTests(unittest.TestCase):
    def test_provenance_and_region_are_qualified_mentions(self):
        record = radar.parse_feed(feed(), radar.SOURCES[0], NOW)[0]
        self.assertEqual(record["geography"], "sf-bay-area")
        self.assertEqual(record["evidence"], "rss-rule-match")
        self.assertNotIn("amountUsd", record)
        self.assertEqual(record["publishedAt"], "2026-10-30T12:00:00Z")

    def test_generic_ai_and_funding_are_both_required(self):
        self.assertEqual(radar.parse_feed(feed(title="AI benchmark comparison", description="Testing two tools"), radar.SOURCES[0], NOW), [])
        self.assertEqual(radar.parse_feed(feed(title="Restaurant raises seed funding", description="Catering startup"), radar.SOURCES[0], NOW), [])

    def test_unconfirmed_geography_not_invented(self):
        self.assertEqual(radar.parse_feed(feed(title="AI startup launches"), radar.SOURCES[0], NOW)[0]["geography"], "unconfirmed")

    def test_link_allowlist_and_no_secrets_or_remote_entities(self):
        for url in ["http://techcrunch.com/story", "https://evil.com/story", "https://techcrunch.com.evil.com/a", "https://user:secret@techcrunch.com/a", "https://techcrunch.com:8443/a", "https://techcrunch.com:not-a-port/a", "https://[invalid/a"]:
            self.assertEqual(radar.parse_feed(feed(link=url), radar.SOURCES[0], NOW), [])
        with self.assertRaises(radar.SafeError):
            radar.parse_feed(b'<!DOCTYPE rss [<!ENTITY x SYSTEM "file:///etc/passwd">]><rss/>', radar.SOURCES[0], NOW)

    def test_bad_or_future_dates_excluded(self):
        for date in ["nonsense", "Fri, 30 Oct 2027 12:00:00 GMT", "Fri, 30 Oct 2025 12:00:00 GMT"]:
            self.assertEqual(radar.parse_feed(feed(date=date), radar.SOURCES[0], NOW), [])

    def test_dedup_tracks_missing_retained_items_and_first_day_warmup(self):
        fetch = lambda url: feed() if "techcrunch" in url else b"<rss><channel/></rss>"
        first, ids = radar.collect(None, NOW, fetch)
        self.assertEqual(len(ids), 1)
        first["items"] = []  # bounded UI retention must not make the next poll new
        second, ids = radar.collect(first, NOW + dt.timedelta(days=1), fetch)
        self.assertEqual(ids, [])
        self.assertFalse(second["history"][0]["complete"])
        self.assertEqual(second["history"][1]["count"], 0)

    def test_failure_marks_gap_and_preserves_last_data(self):
        first, _ = radar.collect(None, NOW, lambda url: feed() if "techcrunch" in url else b"<rss/>")
        def fail(url):
            raise radar.SafeError("network_error")
        second, ids = radar.collect(first, NOW + dt.timedelta(days=2), fail)
        self.assertEqual(ids, [])
        self.assertEqual(len(second["items"]), 1)
        self.assertTrue(all(not x["ok"] for x in second["sources"]))
        self.assertEqual(second["forecast"]["observedDays"], 0)


class ForecastTests(unittest.TestCase):
    def history(self, length=70):
        start = NOW.date() - dt.timedelta(days=length)
        return [{"date": (start + dt.timedelta(days=i)).isoformat(), "count": (i % 7) * 3 + 2, "complete": True} for i in range(length)]

    def test_no_forecast_without_contiguous_history_or_variation(self):
        self.assertEqual(radar.forecasts(self.history(40), NOW.date())[0]["status"], "insufficient_history")
        history = self.history()
        history[-5]["complete"] = False
        self.assertEqual(radar.forecasts(history, NOW.date())[0]["observedDays"], 4)
        for row in history:
            row.update(count=0, complete=True)
        self.assertEqual(radar.forecasts(history, NOW.date())[0]["status"], "insufficient_variation")

    def test_nn_trains_only_past_prefixes(self):
        fits = []
        class RecordingModel:
            def __init__(self, values):
                fits.append(values[:])
            def predict(self, values):
                return values[-1]
        history = self.history()
        with patch.object(radar, "TinyMLP", RecordingModel):
            radar.forecasts(history, NOW.date())
        actual = [x["count"] for x in history]
        for cut, fit in zip(range(56, 70), fits[:14]):
            self.assertEqual(fit, actual[:cut])

    def test_deterministic_bounded_network_and_gated_promotion(self):
        first = radar.forecasts(self.history(), NOW.date())
        second = radar.forecasts(self.history(), NOW.date())
        self.assertEqual(first, second)
        forecast, model = first
        self.assertEqual(forecast["status"], "ready")
        self.assertEqual(len(forecast["points"]), 7)
        self.assertEqual(model["validationPoints"], 14)
        for point in forecast["points"]:
            self.assertGreaterEqual(point["estimate"], 0)
            self.assertLessEqual(point["low"], point["estimate"])
            self.assertGreaterEqual(point["high"], point["estimate"])
        if model["status"] == "candidate_promoted":
            self.assertLess(model["candidateMAE"], model["baselineMAE"] * radar.PROMOTION_THRESHOLD)


class DeliveryTests(unittest.TestCase):
    def setUp(self):
        printed = patch("builtins.print")
        printed.start()
        self.addCleanup(printed.stop)

    def snapshot(self):
        return radar.collect(None, NOW, lambda url: feed() if "techcrunch" in url else b"<rss/>")[0]

    def initialized(self):
        snap = self.snapshot()
        snap["internal"]["notificationPolicy"] = {"version": "sunwatch-v1", "initialized": True, "pendingBayIds": []}
        return snap

    def test_dry_run_never_writes_or_sends(self):
        with patch.dict(os.environ, {}, clear=True), patch.object(radar, "collect", return_value=(self.snapshot(), [])), patch.object(radar, "api") as api, patch.object(radar, "request") as network:
            radar.run(True)
            api.assert_not_called()
            network.assert_not_called()

    def test_initial_confirmation_does_not_relabel_retained_articles_as_new(self):
        snap = self.snapshot()
        self.assertTrue(radar.prepare_notification(snap, []))
        box = snap["internal"]["notificationOutbox"]
        self.assertIn("当前保留 1 条", box["message"])
        self.assertIn("不表示这些报道刚刚发生或刚刚新增", box["message"])
        self.assertEqual(box["status"], "pending")
        self.assertEqual(box["id"], radar.hashlib.sha256(box["message"].encode()).hexdigest()[:24])
        self.assertNotIn("lastSentAt", snap["notifications"])

    def test_pending_message_survives_new_signals_until_same_id_ack(self):
        snap = self.snapshot()
        radar.prepare_notification(snap, [])
        pending = copy.deepcopy(snap["internal"]["notificationOutbox"])
        snap["generatedAt"] = "2026-11-02T12:00:00Z"
        item = copy.deepcopy(snap["items"][0]); item["id"] = "b" * 24
        snap["items"].append(item)
        self.assertFalse(radar.prepare_notification(snap, [item["id"]]))
        self.assertEqual(snap["internal"]["notificationOutbox"], pending)
        self.assertEqual(snap["internal"]["notificationPolicy"]["pendingBayIds"], [item["id"]])
        snap["internal"]["notificationOutbox"]["status"] = "sent"
        snap["notifications"]["lastSentAt"] = "2026-11-01T10:00:00Z"
        self.assertTrue(radar.prepare_notification(snap, []))
        self.assertNotEqual(snap["internal"]["notificationOutbox"]["id"], pending["id"])
        self.assertIn("融资候选报道 1 条", snap["internal"]["notificationOutbox"]["message"])

    def test_daily_cap_preserves_deferred_core_signal(self):
        snap = self.initialized()
        snap["notifications"]["lastSentAt"] = snap["generatedAt"]
        ident = snap["items"][0]["id"]
        self.assertFalse(radar.prepare_notification(snap, [ident]))
        self.assertEqual(snap["internal"]["notificationPolicy"]["pendingBayIds"], [ident])
        snap["generatedAt"] = "2026-11-01T12:00:00Z"
        self.assertTrue(radar.prepare_notification(snap, []))
        self.assertFalse(radar.prepare_notification(snap, []))

    def test_ordinary_news_and_unchanged_state_are_silent(self):
        snap = self.initialized()
        item = snap["items"][0]
        item["geography"] = "unconfirmed"
        self.assertFalse(radar.prepare_notification(snap, [item["id"]]))
        item["geography"], item["kind"] = "sf-bay-area", "startup"
        self.assertFalse(radar.prepare_notification(snap, [item["id"]]))
        self.assertFalse(radar.prepare_notification(snap, []))
        self.assertIsNone(snap["internal"]["notificationOutbox"])

    def test_forecast_first_ready_thresholds_and_method_change(self):
        def example(total, previous=None, method="baseline"):
            snap = self.initialized()
            snap["forecast"] = {"status": "ready", "method": method, "points": [{"estimate": total / 7}] * 7}
            if previous is not None:
                snap["internal"]["notificationPolicy"]["lastForecast"] = {"total": previous, "method": "baseline"}
            return snap
        self.assertTrue(radar.prepare_notification(example(20), []))
        self.assertFalse(radar.prepare_notification(example(20, 20), []))
        self.assertFalse(radar.prepare_notification(example(24, 20), []))
        self.assertFalse(radar.prepare_notification(example(124, 100), []))
        self.assertTrue(radar.prepare_notification(example(125, 100), []))
        self.assertTrue(radar.prepare_notification(example(75, 100), []))
        self.assertTrue(radar.prepare_notification(example(20, 20, "lag7-mlp-v1"), []))

    def test_forecast_baseline_advances_only_after_ack_not_expiry(self):
        snap = self.initialized()
        snap["forecast"] = {"status": "ready", "method": "baseline", "points": [{"estimate": 3}] * 7}
        radar.prepare_notification(snap, [])
        self.assertNotIn("lastForecast", snap["internal"]["notificationPolicy"])
        failed = copy.deepcopy(snap)
        failed["internal"]["notificationOutbox"]["status"] = "expired"
        radar.prepare_notification(failed, [])
        self.assertNotIn("lastForecast", failed["internal"]["notificationPolicy"])
        self.assertIsNone(failed["internal"]["notificationOutbox"])
        snap["internal"]["notificationOutbox"]["status"] = "sent"
        radar.prepare_notification(snap, [])
        self.assertEqual(snap["internal"]["notificationPolicy"]["lastForecast"]["total"], 21)
        self.assertIsNone(snap["internal"]["notificationOutbox"])

    def test_runner_saves_without_telegram_credentials_or_direct_send(self):
        snap = self.snapshot()
        writes = []
        def api(method, token, state=None):
            if method == "PUT":
                writes.append(copy.deepcopy(state))
            return {"ok": True, "snapshot": None}
        with patch.dict(os.environ, {"CAPITAL_RADAR_RUNNER_TOKEN": "fixture"}, clear=True), patch.object(radar, "collect", return_value=(snap, [])), patch.object(radar, "api", side_effect=api), patch.object(radar, "request") as network:
            radar.run()
            network.assert_not_called()
        self.assertEqual(len(writes), 1)
        self.assertEqual(writes[0]["internal"]["notificationOutbox"]["status"], "pending")
        self.assertNotIn("lastSentAt", writes[0]["notifications"])

    def test_source_failure_still_saves_existing_pending_then_fails(self):
        previous = self.snapshot()
        radar.prepare_notification(previous, [])
        def failed(url):
            raise radar.SafeError("network_error")
        snap, ids = radar.collect(previous, NOW + dt.timedelta(days=1), failed)
        expected = copy.deepcopy(previous["internal"]["notificationOutbox"])
        with patch.dict(os.environ, {"CAPITAL_RADAR_RUNNER_TOKEN": "fixture"}, clear=True), patch.object(radar, "collect", return_value=(snap, ids)), patch.object(radar, "api", return_value={"ok": True, "snapshot": previous}) as api:
            with self.assertRaisesRegex(radar.SafeError, "all_sources_failed"):
                radar.run()
            self.assertEqual(api.call_args_list[-1].args[0], "PUT")
            self.assertEqual(api.call_args_list[-1].args[2]["internal"]["notificationOutbox"], expected)


if __name__ == "__main__":
    unittest.main()
