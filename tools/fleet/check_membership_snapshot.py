"""Validate current aggregate membership evidence without network calls."""
import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

SITES = {"bpj", "agi", "eco", "tds"}
COUNTERS = ("paid_orders", "paid_members", "active_members", "unexpired_pending")


def timestamp(value):
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        raise ValueError("Snapshot time must include a timezone")
    return parsed


def count(value):
    return type(value) is int and 0 <= value <= 9007199254740991


def check(report, now=None, since=None, max_age_hours=36):
    now = now or datetime.now(timezone.utc)
    measured = timestamp(report["generated"])
    age = (now - measured).total_seconds()
    if age < -60 or age > max_age_hours * 3600:
        raise ValueError("Membership snapshot is stale or future-dated")
    if since and measured < timestamp(since):
        raise ValueError("Membership snapshot predates this run")
    rows = report["sites"]
    if len(rows) != len(SITES) or {row["site"] for row in rows} != SITES:
        raise ValueError("Membership report must contain each expected site exactly once")
    if report.get("schema_version") != 1:
        raise ValueError("Unsupported membership snapshot schema")
    if not isinstance(report.get("ok"), bool) or not isinstance(report.get("counters_complete"), bool):
        raise ValueError("Missing membership availability flags")
    for row in rows:
        if type(row["admin"].get("ok")) is not bool or type(row["public"].get("ok")) is not bool:
            raise ValueError("Missing site availability flags")
        for key in COUNTERS:
            value = row["admin"].get(key)
            if value is not None and not count(value):
                raise ValueError("Invalid membership counter")
    expected = {}
    for key in COUNTERS:
        complete = all(row["admin"]["ok"] and count(row["admin"].get(key)) for row in rows)
        expected[key] = sum(row["admin"][key] for row in rows) if complete else None
    totals = report["totals"]
    if set(totals) != set(COUNTERS) or any(
        totals[key] != expected[key] or (totals[key] is not None and not count(totals[key]))
        for key in COUNTERS
    ):
        raise ValueError("Fleet totals must match complete observations; unread counters must be null")
    if report["counters_complete"] != all(value is not None for value in expected.values()):
        raise ValueError("Membership completeness flag disagrees with its counters")
    ready = all(row["public"]["ok"] and row["public"].get("ready") is True for row in rows)
    if report["ok"] != ready:
        raise ValueError("Membership readiness flag disagrees with its sites")
    return age


def summary(report):
    def display(value):
        return "unavailable" if value is None else str(value)
    lines = ["## Membership aggregate report", "", f"Observed: {report['generated']}",
             f"Counters complete: {report['counters_complete']}",
             "Counts are membership-service observations, not revenue, cash, or account registrations.", ""]
    for row in report["sites"]:
        counters = ", ".join(f"{key}={display(row['admin'].get(key) if row['admin']['ok'] else None)}" for key in COUNTERS)
        ready = str(row["public"].get("ready") is True) if row["public"]["ok"] else "unavailable"
        lines.append(f"- {row['site']}: ready={ready}; {counters}")
    lines.extend(["", "Fleet totals: " + ", ".join(f"{key}={display(report['totals'][key])}" for key in COUNTERS), ""])
    return "\n".join(lines)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--path", default="data/fleet-evolution/membership.json")
    parser.add_argument("--since")
    parser.add_argument("--summary")
    parser.add_argument("--require-available", action="store_true")
    args = parser.parse_args()
    try:
        report = json.loads(Path(args.path).read_text())
        check(report, since=args.since)
        rendered = summary(report)
        print(rendered)
        if args.summary:
            with Path(args.summary).open("a") as stream:
                stream.write(rendered)
        if args.require_available and (not report["counters_complete"] or not all(row["public"]["ok"] for row in report["sites"])):
            raise ValueError("Current membership reads are unavailable or incomplete; see the saved report")
    except (OSError, ValueError, KeyError, TypeError, AttributeError) as error:
        print(f"::error::{error}")
        raise SystemExit(1)
