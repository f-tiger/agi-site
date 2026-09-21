#!/usr/bin/env python3
"""Small invariant suite for the deterministic evolution report."""
from __future__ import annotations

import datetime as dt
import json
import tempfile
from pathlib import Path

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


if __name__ == "__main__":
    test_missing_is_unknown()
    test_action_is_bounded_and_redacted()
    test_write_if_changed()
    print("evolution invariants: ok")
