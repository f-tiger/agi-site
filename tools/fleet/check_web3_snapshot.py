"""Reject missing, old or reused Web3 audit evidence without network calls."""
import argparse
import json
from datetime import datetime, timezone
from pathlib import Path


def timestamp(value):
    parsed = datetime.fromisoformat(value.replace('Z', '+00:00'))
    if parsed.tzinfo is None:
        raise ValueError('Snapshot time must include a timezone')
    return parsed


def check(report, now=None, since=None, max_age_hours=36):
    now = now or datetime.now(timezone.utc)
    measured = timestamp(report['asOf'])
    age = (now - measured).total_seconds()
    if age < -60 or age > max_age_hours * 3600:
        raise ValueError(f'Web3 snapshot is stale or future-dated: {report["asOf"]}')
    if since and measured < timestamp(since):
        raise ValueError('Web3 snapshot predates this run; refusing to preserve old evidence as new')
    if not isinstance(report.get('ok'), bool) or not report.get('checks'):
        raise ValueError('Incomplete Web3 audit report')
    return age


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--path', default='data/autopilot/web3/latest.json')
    parser.add_argument('--since')
    parser.add_argument('--max-age-hours', type=float, default=36)
    args = parser.parse_args()
    try:
        report = json.loads(Path(args.path).read_text())
        age = check(report, since=args.since, max_age_hours=args.max_age_hours)
        print(f'Web3 audit recorded {report["asOf"]}; age {age / 3600:.2f}h; checks ok={report["ok"]}')
    except (OSError, ValueError, KeyError, TypeError) as error:
        print(f'::error::{error}')
        raise SystemExit(1)
