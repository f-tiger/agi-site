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


def test_previous_day_readiness_is_unknown_not_a_live_failure() -> None:
    today = dt.date(2026, 11, 3)
    with tempfile.TemporaryDirectory() as tmp:
        data = Path(tmp)
        directory = data / "fleet-evolution"
        directory.mkdir()
        snapshot = {"generated": "2026-11-02T09:56:01Z", "counters_complete": True,
                    "totals": {"paid_members": 0, "active_members": 0},
                    "sites": [{"site": "agi", "public": {"ok": True, "ready": False},
                               "admin": {"ok": True, "paid_members": 0, "active_members": 0}}]}
        (directory / "membership.json").write_text(json.dumps(snapshot))
        with patch.multiple(evolution, DATA=data, EVOLUTION=directory,
                            SITE_DIRS={"agiscorecard": "sites/agiscorecard"}), \
                patch.object(evolution, "load_traffic", return_value={}):
            report, _ = evolution.build(today)
        actions = report["latest"]["actions"]
        assert not any(row["kind"] == "membership_health" for row in actions)
        assert any(row["kind"] == "membership_observability" for row in actions)
        assert report["latest"]["fleet"]["membership_ready"] is None
        assert report["manifests"]["agiscorecard"]["signals"]["membership"]["ready"] is None
        assert "Membership ready: unknown" in report["markdown"]


def test_current_readiness_still_raises_a_real_health_alert() -> None:
    today = dt.date(2026, 11, 3)
    with tempfile.TemporaryDirectory() as tmp:
        data = Path(tmp)
        directory = data / "fleet-evolution"
        directory.mkdir()
        snapshot = {"generated": "2026-11-03T09:56:01Z", "counters_complete": True,
                    "totals": {"paid_members": 0, "active_members": 0},
                    "sites": [{"site": "agi", "public": {"ok": True, "ready": False},
                               "admin": {"ok": True, "paid_members": 0, "active_members": 0}}]}
        (directory / "membership.json").write_text(json.dumps(snapshot))
        with patch.multiple(evolution, DATA=data, EVOLUTION=directory,
                            SITE_DIRS={"agiscorecard": "sites/agiscorecard"}), \
                patch.object(evolution, "load_traffic", return_value={}):
            report, _ = evolution.build(today)
        assert any(row["kind"] == "membership_health" for row in report["latest"]["actions"])
        assert report["latest"]["fleet"]["membership_ready"] == 0
        assert report["manifests"]["agiscorecard"]["signals"]["membership"]["ready"] is False


def test_workflow_waits_for_membership_and_checks_out_current_main() -> None:
    workflow = (evolution.ROOT / ".github/workflows/fleet-autopilot.yml").read_text(encoding="utf-8")
    autopilot = workflow.split("  autopilot:\n", 1)[1].split("  web3-audit:\n", 1)[0]
    assert "needs: membership-report" in autopilot
    assert "if: ${{ !cancelled() }}" in autopilot
    assert "- uses: actions/checkout@v4\n        with:\n          ref: main" in autopilot


def test_membership_maintenance_uses_one_off_peak_schedule() -> None:
    workflow = (evolution.ROOT / ".github/workflows/bpj-ad-watch.yml").read_text(encoding="utf-8")
    assert workflow.count("cron:") == 1
    assert "cron: '37 */2 * * *'" in workflow
    assert "cron: '7 */2 * * *'" not in workflow
    assert "Continue bounded Jarvis missions" in workflow
    assert "node sites/agiscorecard/tools/jarvis/ops.mjs run" in workflow


if __name__ == "__main__":
    test_missing_is_unknown()
    test_action_is_bounded_and_redacted()
    test_write_if_changed()
    test_membership_totals_require_current_complete_evidence()
    test_site_decisions_do_not_treat_missing_or_stale_counts_as_zero()
    test_previous_day_readiness_is_unknown_not_a_live_failure()
    test_current_readiness_still_raises_a_real_health_alert()
    test_workflow_waits_for_membership_and_checks_out_current_main()
    test_membership_maintenance_uses_one_off_peak_schedule()
    print("evolution invariants: ok")
