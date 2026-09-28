#!/usr/bin/env python3
"""Watchdog for the daily master Routine (2026-09-27, owner: 「重建每天的定时任务」+「你要避免每天任务无法读取agi-site仓库，从而执行发布」).

Why: the v1 master Routine was bound to a resident session that was archived on 2026-09-15. From then on no daily loop
ran, and nothing noticed for 12 days, because the only thing watching the Routine was the Routine itself. This check
lives in layer ① (fleet-heartbeat, zero AI): the GitHub failure email is the one alert channel that does not depend on
any AI session being alive.

Every run of the master Routine appends one line to data/fleet-master-run.json as part of its single push
(or, when cloning failed, through the GitHub MCP fallback). This script turns the heartbeat red when:
  * no run record is younger than STALE_HOURS (the Routine did not fire, died before pushing, or could not push), or
  * the two most recent records both say repo_ok=false (it fires but cannot reach agi-site).
Before the first record exists it only warns, until GRACE_UNTIL.

  python3 tools/fleet/check_master_run.py --selftest
  python3 tools/fleet/check_master_run.py
"""
from __future__ import annotations

import datetime as dt
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PATH = os.path.join(ROOT, "data", "fleet-master-run.json")
STALE_HOURS = 50            # daily cron + GitHub/Routine jitter + one missed day of slack
GRACE_UNTIL = "2026-09-30"  # first scheduled run is 2026-09-28; warn-only until then


def parse(ts):
    try:
        return dt.datetime.fromisoformat(str(ts).replace("Z", "+00:00"))
    except ValueError:
        return None


def verdict(doc, now: dt.datetime) -> tuple[str, str]:
    """Pure: ('ok'|'warn'|'error', message)."""
    runs = [r for r in ((doc or {}).get("runs") or []) if parse(r.get("at"))]
    runs.sort(key=lambda r: parse(r["at"]))
    if not runs:
        if now.date().isoformat() <= GRACE_UNTIL:
            return "warn", f"no master-run record yet (grace until {GRACE_UNTIL})"
        return "error", "no master-run record at all: the daily Routine has never reported from inside the repo"
    last = runs[-1]
    age_h = (now - parse(last["at"])).total_seconds() / 3600
    if age_h > STALE_HOURS:
        return "error", f"last master-run record is {age_h:.0f}h old (> {STALE_HOURS}h): the daily Routine did not fire, died, or could not push ({last.get('at')})"
    tail = runs[-2:]
    if len(tail) == 2 and all(r.get("repo_ok") is False for r in tail):
        return "error", "the last two master runs could not reach agi-site (repo_ok=false): " + "; ".join(str(r.get("note", ""))[:120] for r in tail)
    if last.get("repo_ok") is False:
        return "warn", "latest master run could not reach agi-site: " + str(last.get("note", ""))[:160]
    return "ok", f"last master run {last.get('at')} ({age_h:.0f}h ago), blocks={last.get('blocks')}, pushed={last.get('pushed')}"


def selftest() -> int:
    now = dt.datetime(2026, 10, 5, 12, tzinfo=dt.timezone.utc)
    r = lambda at, ok=True, note="": {"at": at, "repo_ok": ok, "note": note, "blocks": "A-H", "pushed": ok}
    cases = [
        ("empty after grace -> error", {}, "error"),
        ("fresh ok -> ok", {"runs": [r("2026-10-05T04:10:00+00:00")]}, "ok"),
        ("stale 60h -> error", {"runs": [r("2026-10-03T00:00:00+00:00")]}, "error"),
        ("one repo failure -> warn", {"runs": [r("2026-10-04T04:00:00+00:00"), r("2026-10-05T04:00:00+00:00", False, "clone 403")]}, "warn"),
        ("two repo failures -> error", {"runs": [r("2026-10-04T04:00:00+00:00", False), r("2026-10-05T04:00:00+00:00", False)]}, "error"),
        ("unordered input sorted", {"runs": [r("2026-10-05T04:00:00+00:00"), r("2026-09-01T04:00:00+00:00", False)]}, "ok"),
    ]
    bad = 0
    for name, doc, want in cases:
        got = verdict(doc, now)[0]
        bad += got != want
        print(("  ok   " if got == want else "  FAIL ") + f"{name}: {got}")
    early = verdict({}, dt.datetime(2026, 9, 28, tzinfo=dt.timezone.utc))[0]
    bad += early != "warn"
    print(("  ok   " if early == "warn" else "  FAIL ") + f"empty during grace -> warn: {early}")
    return 1 if bad else 0


def main(argv) -> int:
    if "--selftest" in argv:
        return selftest()
    try:
        with open(PATH, encoding="utf-8") as f:
            doc = json.load(f)
    except (OSError, ValueError):
        doc = {}
    level, msg = verdict(doc, dt.datetime.now(dt.timezone.utc))
    if level == "error":
        print(f"::error::daily master Routine: {msg}")
        return 1
    if level == "warn":
        print(f"::warning::daily master Routine: {msg}")
    else:
        print(f"daily master Routine: {msg}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
