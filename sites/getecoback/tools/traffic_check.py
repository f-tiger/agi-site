#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""One command that says how far the traffic goal has actually got.

Why this exists (2026-09-17). The goal "double eco's traffic" was set with a
baseline measured by hand in a D1 console. Settling it in November would have
meant somebody reconstructing those queries from a commit message, and the
single easiest way to lose a bet honestly is to settle it with a slightly
different yardstick than the one that set it.

So the baseline is written down in data/traffic-baseline.json, and the reading
comes from the same instrument every time: the site's own public /api/pulse
endpoint, which needs no token and already computes exactly the two numbers the
bets are written against.

One caveat worth keeping in view. /api/pulse counts human_pv as
`ua_class IS NULL OR ua_class='human'`, which is the site's standard permissive
definition — the strict-human count is lower. That is fine for a ratio measured
against itself, and wrong the moment it is compared to a number produced any
other way. Both readings come from this endpoint or neither counts.

Run: python3 tools/traffic_check.py
"""
import json
import os
import sys
import urllib.request
from datetime import date

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = os.path.join(ROOT, "data", "traffic-baseline.json")
PULSE = "https://getecoback.com/api/pulse"
UA = "getecoback-traffic-check/1.0"


def read_pulse():
    req = urllib.request.Request(PULSE, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode("utf-8"))


def bar(pct, width=28):
    filled = max(0, min(width, round(width * pct / 100)))
    return "█" * filled + "·" * (width - filled)


def main():
    if not os.path.exists(BASE):
        print(f"no {os.path.relpath(BASE, ROOT)} — nothing to compare against", file=sys.stderr)
        return 1
    b = json.load(open(BASE, encoding="utf-8"))
    try:
        p = read_pulse()
    except Exception as e:
        print(f"could not read {PULSE}: {str(e)[:160]}", file=sys.stderr)
        return 1
    if not p.get("ok"):
        print(f"{PULSE} reports not ok — refusing to publish a reading", file=sys.stderr)
        return 1
    if p.get("days") != b.get("window_days"):
        print(f"::warning::window changed: baseline is {b.get('window_days')}d, "
              f"endpoint now reports {p.get('days')}d — the comparison is no longer like for like")

    print(f"eco traffic goal — read {p['generated'][:10]} from {PULSE} ({p.get('days')}d window)")
    print(f"  baseline {b['taken']} (same endpoint, same window)\n")
    for key, label in (("human_pv", "human page views"), ("ai_ref", "AI referrals")):
        t0, now, target = b[key], p.get(key, 0), b[key] * b["multiple"]
        pct = 100.0 * now / target if target else 0.0
        delta = now - t0
        print(f"  {label:18} {now:>6}   t0 {t0:>5}   target {target:>5}   "
              f"{pct:5.1f}%  {bar(pct)}  {delta:+d}")
    due = b.get("due")
    if due:
        left = (date.fromisoformat(due) - date.today()).days
        print(f"\n  reading day {due} — {left} day(s) away" if left > 0
              else f"\n  reading day {due} — due now, settle the bets")
    print("\n  Bets: " + ", ".join(b.get("bets", [])))
    return 0


if __name__ == "__main__":
    sys.exit(main())
