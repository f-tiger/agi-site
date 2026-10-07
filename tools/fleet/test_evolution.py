#!/usr/bin/env python3
"""Small invariant suite for the deterministic evolution report."""
from __future__ import annotations

import datetime as dt
import json
import tempfile
from pathlib import Path
from unittest.mock import patch

import evolution


def test_missing_is_unknown() -> None:
    assert evolution.integer(None, None) is None
    assert evolution.age_days(None, dt.date(2026, 9, 20)) is None


def test_action_is_bounded_and_redacted() -> None:
    action = evolution.safe_action("membership_conversion", 999, "reason", {"paid_members": 0}, "queue")
    assert action["priority"] == 100
    assert "token" not in json.dumps(action).lower()


def test_write_if_changed() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        path = Path(tmp) / "x.json"
        assert evolution.write_if_changed(path, "{}\n") is True
        assert evolution.write_if_changed(path, "{}\n") is False


def test_membership_totals_require_current_complete_evidence() -> None:
    today = dt.date(2026, 10, 7)
    cases = [
        ({}, None),
        ({"generated": today.isoformat(), "counters_complete": False,
          "totals": {"paid_members": 0, "active_members": 0}}, None),
        ({"generated": "2026-09-24T07:47:56.109Z", "counters_complete": True,
          "totals": {"paid_members": 0, "active_members": 0}}, None),
        ({"generated": today.isoformat(), "counters_complete": True,
          "totals": {"paid_members": None, "active_members": None}}, None),
        ({"generated": today.isoformat(), "counters_complete": True,
          "totals": {"paid_members": False, "active_members": -1}}, None),
        ({"generated": today.isoformat(), "counters_complete": True,
          "totals": {"paid_members": 0, "active_members": 0}}, 0),
        ({"generated": today.isoformat(), "counters_complete": True,
          "totals": {"paid_members": 3, "active_members": 3}}, 3),
    ]
    with tempfile.TemporaryDirectory() as tmp:
        data = Path(tmp)
        directory = data / "fleet-evolution"
        directory.mkdir()
        with patch.multiple(evolution, DATA=data, EVOLUTION=directory, SITE_DIRS={}):
            for snapshot, expected in cases:
                (directory / "membership.json").write_text(json.dumps(snapshot))
                report, _ = evolution.build(today)
                assert report["latest"]["fleet"]["paid_members"] == expected, snapshot
                assert report["latest"]["fleet"]["active_members"] == expected, snapshot
                if expected is None:
                    assert "paid members: unknown · active members: unknown" in report["markdown"]


def test_site_decisions_do_not_treat_missing_or_stale_counts_as_zero() -> None:
    today = dt.date(2026, 10, 7)
    with tempfile.TemporaryDirectory() as tmp:
        data = Path(tmp)
        directory = data / "fleet-evolution"
        directory.mkdir()
        with patch.multiple(evolution, DATA=data, EVOLUTION=directory,
                            SITE_DIRS={"agiscorecard": "sites/agiscorecard"}), \
                patch.object(evolution, "load_traffic", return_value={"reach_humans_referred": 200}):
            for generated, paid, expected_conversion in [
                (today.isoformat(), None, False),
                (today.isoformat(), False, False),
                (today.isoformat(), -1, False),
                ("2026-09-24", 0, False),
                (today.isoformat(), 0, True),
            ]:
                snapshot = {"generated": generated, "sites": [{"site": "agi",
                    "public": {"ok": True, "ready": True},
                    "admin": {"ok": True, "paid_members": paid, "active_members": paid}}]}
                (directory / "membership.json").write_text(json.dumps(snapshot))
                report, _ = evolution.build(today)
                kinds = [row["kind"] for row in report["latest"]["actions"]]
                assert ("membership_conversion" in kinds) is expected_conversion
                signal = report["manifests"]["agiscorecard"]["signals"]["membership"]
                assert signal["has_paid_members"] is (False if expected_conversion else None)
                assert signal["has_active_members"] is (False if expected_conversion else None)


if __name__ == "__main__":
    test_missing_is_unknown()
    test_action_is_bounded_and_redacted()
    test_write_if_changed()
    test_membership_totals_require_current_complete_evidence()
    test_site_decisions_do_not_treat_missing_or_stale_counts_as_zero()
    print("evolution invariants: ok")
