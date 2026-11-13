#!/usr/bin/env python3
"""Small invariant suite for the deterministic evolution report."""
from __future__ import annotations

import datetime as dt
import json
import tempfile
from pathlib import Path
from unittest.mock import patch

import evolution


def utc_noon(day: dt.date) -> dt.datetime:
    return dt.datetime.combine(day, dt.time(12), dt.timezone.utc)


def test_missing_is_unknown() -> None:
    assert evolution.integer(None, None) is None
    assert evolution.age_days(None, dt.date(2026, 9, 20)) is None


def test_action_is_bounded_and_redacted() -> None:
    action = evolution.safe_action("membership_demand_review", 999, "reason", {"paid_members": 0}, "queue")
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
                report, _ = evolution.build(today, now=utc_noon(today))
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
            for generated, paid, expected_review in [
                (today.isoformat()+"T11:00:00Z", None, False),
                (today.isoformat()+"T11:00:00Z", False, False),
                (today.isoformat()+"T11:00:00Z", -1, False),
                ("2026-09-24", 0, False),
                (today.isoformat()+"T11:00:00Z", 0, True),
            ]:
                snapshot = {"generated": generated, "sites": [{"site": "agi",
                    "public": {"ok": True, "ready": True},
                    "admin": {"ok": True, "paid_members": paid, "active_members": paid}}]}
                (directory / "membership.json").write_text(json.dumps(snapshot))
                report, _ = evolution.build(today, now=utc_noon(today))
                kinds = [row["kind"] for row in report["latest"]["actions"]]
                assert "membership_conversion" not in kinds
                assert ("membership_demand_review" in kinds) is expected_review
                signal = report["manifests"]["agiscorecard"]["signals"]["membership"]
                assert signal["has_paid_members"] is (False if expected_review else None)
                assert signal["has_active_members"] is (False if expected_review else None)


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
            report, _ = evolution.build(today, now=utc_noon(today))
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
            report, _ = evolution.build(today, now=utc_noon(today))
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


def test_readiness_uses_hours_and_handles_midnight_without_inventing_health() -> None:
    now = dt.datetime(2026, 11, 13, 1, tzinfo=dt.timezone.utc)
    for stamp, expected in [
        ("2026-11-12T23:00:00Z", True),
        ("2026-11-13T03:00:00+02:00", True),
        ("2026-11-12T21:00:00Z", False),
        ("2026-11-13T01:00:01Z", False),
        ("2026-11-13", False),
        ("2026-11-13T00:30:00", False),
        (None, False),
    ]:
        assert evolution.readiness_snapshot_current(stamp, now.date(), now) is expected, stamp
    assert not evolution.readiness_snapshot_current("2026-11-13T00:30:00Z", dt.date(2026, 11, 12), now)
    # A morning flag must not be reused in an evening report on the same date.
    assert not evolution.readiness_snapshot_current("2026-11-13T01:00:00Z", now.date(), utc_noon(now.date()))


def test_pageviews_do_not_establish_paid_demand_or_ai_readership() -> None:
    today = dt.date(2026, 11, 13)
    with tempfile.TemporaryDirectory() as tmp:
        data = Path(tmp); directory = data / "fleet-evolution"; directory.mkdir()
        (directory / "membership.json").write_text(json.dumps({"generated": "2026-11-13T11:30:00Z", "sites": [{"site": "bpj", "public": {"ok": True, "ready": True}, "admin": {"ok": True, "paid_members": 0, "active_members": 0}}]}))
        with patch.multiple(evolution, DATA=data, EVOLUTION=directory, SITE_DIRS={"baipiaoji": "sites/baipiaoji"}), patch.object(evolution, "load_traffic", return_value={"human_pv": 50000, "ai_ref": 0, "reach_humans_referred": 10000}):
            report, _ = evolution.build(today, now=utc_noon(today))
        actions = {r["kind"]: r for r in report["latest"]["actions"]}
        assert "membership_conversion" not in actions and "ai_discovery" not in actions
        assert actions["membership_demand_review"]["evidence"]["external_referrer_page_view_events"] == 10000
        assert actions["membership_readiness_check"]["priority"] > actions["membership_demand_review"]["priority"]
        assert actions["membership_readiness_check"]["mode"] == "observe"
        assert "qualified buyers" in actions["membership_demand_review"]["reason"]
        assert actions["ai_attribution_review"]["evidence"]["legacy_page_view_events"] == 50000
        assert "not verified people" in report["manifests"]["baipiaoji"]["signals"]["traffic"]["measurement"]


def test_strategy_is_reviewable_and_missing_policy_does_not_invent_direction() -> None:
    policy = evolution.growth_policy()
    assert policy and set(policy["sites"]) == set(evolution.MEMBER_SITE)
    report, _ = evolution.build(dt.date(2026, 11, 13), now=utc_noon(dt.date(2026, 11, 13)))
    assert report["latest"]["growth_policy"] == policy
    assert policy["revenue_targets"]["milestones"] == [1000, 5000, 10000]
    assert "USD 1,000 → USD 5,000 → USD 10,000" in report["markdown"]
    assert "targets, not measured revenue" in report["markdown"]
    for row in policy["sites"].values():
        assert row["buyer"] in report["markdown"]
        assert (evolution.ROOT / row["review_contract"]).exists(), row["review_contract"]
    with tempfile.TemporaryDirectory() as tmp:
        data=Path(tmp)
        with patch.multiple(evolution, DATA=data, EVOLUTION=data / "fleet-evolution", SITE_DIRS={}):
            missing, _ = evolution.build(dt.date(2026, 11, 13), now=utc_noon(dt.date(2026, 11, 13)))
            assert missing["latest"]["growth_policy"] is None
            assert "Growth policy unavailable" in missing["markdown"]
            (data / "fleet-growth-policy.json").write_text('{"version":1,"sites":{}}')
            assert evolution.growth_policy() is None
            for milestones in [[], [True], [-1], [1000, 1000], [5000, 1000], ["1000"]]:
                broken = json.loads(json.dumps(policy))
                broken["revenue_targets"]["milestones"] = milestones
                (data / "fleet-growth-policy.json").write_text(json.dumps(broken))
                assert evolution.growth_policy() is None
            for field in ["buyer", "expansion_gate"]:
                broken = json.loads(json.dumps(policy)); del broken["sites"]["baipiaoji"][field]
                (data / "fleet-growth-policy.json").write_text(json.dumps(broken))
                assert evolution.growth_policy() is None
            broken = json.loads(json.dumps(policy)); del broken["other_sites"]["expansion_gate"]
            (data / "fleet-growth-policy.json").write_text(json.dumps(broken))
            assert evolution.growth_policy() is None


def test_failed_or_malformed_public_reads_are_unknown_not_closed() -> None:
    today=dt.date(2026, 11, 13)
    with tempfile.TemporaryDirectory() as tmp:
        data=Path(tmp);directory=data/'fleet-evolution';directory.mkdir()
        with patch.multiple(evolution, DATA=data, EVOLUTION=directory, SITE_DIRS={"agiscorecard":"sites/agiscorecard"}):
            for public in [None, False, "unavailable", {}, {"ok":False,"ready":False}, {"ok":True,"ready":None}, {"ok":True,"ready":"false"}, {"ok":True,"ready":0}]:
                snapshot={"generated":"2026-11-13T11:30:00Z","sites":[{"site":"agi","public":public,"admin":{"ok":True,"paid_members":0,"active_members":0}}]}
                (directory/'membership.json').write_text(json.dumps(snapshot))
                report,_=evolution.build(today,now=utc_noon(today))
                assert report['latest']['fleet']['membership_ready'] is None
                assert not any(a['kind']=='membership_health' for a in report['latest']['actions'])
                assert any(a['kind']=='membership_observability' for a in report['latest']['actions'])
            for admin in [None, False, "unavailable", {}]:
                snapshot['sites'][0].update(public={"ok":True,"ready":True},admin=admin)
                (directory/'membership.json').write_text(json.dumps(snapshot))
                report,_=evolution.build(today,now=utc_noon(today))
                assert report['manifests']['agiscorecard']['signals']['membership']['has_paid_members'] is None
                assert not any(a['kind']=='membership_demand_review' for a in report['latest']['actions'])


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
    test_readiness_uses_hours_and_handles_midnight_without_inventing_health()
    test_pageviews_do_not_establish_paid_demand_or_ai_readership()
    test_strategy_is_reviewable_and_missing_policy_does_not_invent_direction()
    test_failed_or_malformed_public_reads_are_unknown_not_closed()
    print("evolution invariants: ok")
