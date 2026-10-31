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
        # Avoid publishing mocked "sent" summaries as if they were live receipts.
        printed = patch("builtins.print")
        printed.start()
        self.addCleanup(printed.stop)

    def test_dry_run_never_writes_or_sends(self):
        with patch.dict(os.environ, {}, clear=True), patch.object(radar, "request", return_value=b"<rss/>"), patch.object(radar, "api") as api, patch.object(radar, "send_telegram") as send:
            with patch.object(radar, "SOURCES", ()):
                # Empty sources remains a valid offline dry run and no remote state.
                radar.run(True)
            api.assert_not_called()
            send.assert_not_called()

    def test_claim_before_send_and_no_same_day_resend(self):
        snap, ids = radar.collect(None, NOW, lambda url: feed() if "techcrunch" in url else b"<rss/>")
        snap["notifications"]["configured"] = True
        snap["notifications"]["lastDigestDate"] = dt.datetime.now(dt.timezone.utc).date().isoformat()
        with patch.dict(os.environ, {"CAPITAL_RADAR_RUNNER_TOKEN": "fixture"}), patch.object(radar, "collect", return_value=(snap, ids)), patch.object(radar, "api", return_value={"ok": True, "snapshot": snap}) as api, patch.object(radar, "send_telegram") as send:
            radar.run()
            send.assert_not_called()
            self.assertEqual(api.call_args_list[-1].args[0], "PUT")

    def test_delivery_claim_and_receipt_order(self):
        snap, ids = radar.collect(None, NOW, lambda url: feed() if "techcrunch" in url else b"<rss/>")
        snap["notifications"]["configured"] = True
        calls = []
        def api(method, token, state=None):
            calls.append((method, state["notifications"]["deliveryStatus"] if state else None))
            return {"ok": True, "snapshot": None}
        def send(message):
            calls.append(("SEND", None))
            return 1
        with patch.dict(os.environ, {"CAPITAL_RADAR_RUNNER_TOKEN": "fixture"}), patch.object(radar, "collect", return_value=(snap, ids)), patch.object(radar, "api", side_effect=api), patch.object(radar, "send_telegram", side_effect=send):
            radar.run()
        self.assertEqual(calls, [("GET", None), ("PUT", "sending"), ("SEND", None), ("PUT", "sent")])

    def test_unknown_delivery_saved_and_not_automatically_resent(self):
        snap, ids = radar.collect(None, NOW, lambda url: feed() if "techcrunch" in url else b"<rss/>")
        snap["notifications"]["configured"] = True
        writes = []
        def api(method, token, state=None):
            if method == "PUT":
                writes.append(copy.deepcopy(state))
            return {"ok": True, "snapshot": snap}
        with patch.dict(os.environ, {"CAPITAL_RADAR_RUNNER_TOKEN": "fixture"}), patch.object(radar, "collect", return_value=(snap, ids)), patch.object(radar, "api", side_effect=api), patch.object(radar, "send_telegram", side_effect=radar.SafeError("network_error")) as send:
            with self.assertRaisesRegex(radar.SafeError, "telegram_delivery_unknown"):
                radar.run()
            self.assertEqual(writes[-1]["notifications"]["deliveryStatus"], "delivery_unknown")
            radar.run()
            self.assertEqual(send.call_count, 1)

    def test_forecast_change_notifies_even_without_new_articles(self):
        snap, _ = radar.collect(None, NOW, lambda url: b"<rss/>")
        snap["forecast"] = {"status": "ready", "points": [{"estimate": 2}] * 7}
        snap["model"] = {"version": "new"}
        self.assertIn("14.0", radar.digest(snap, [], {"version": "old"}))
        self.assertIsNone(radar.digest(snap, [], {"version": "new"}))


if __name__ == "__main__":
    unittest.main()
