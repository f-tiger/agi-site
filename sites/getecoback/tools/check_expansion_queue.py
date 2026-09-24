#!/usr/bin/env python3
"""Gate for data/expansion-queue.json (2026-09-24, owner: 「站点应该持续扩展」).

The queue is what makes expansion continuous instead of a thing the owner has to
ask for: the daily fleet task builds the first unblocked 'queued' item and
restocks when the queue runs low. A queue that drifts from the site is worse than
none — the daily run would rebuild a page that exists, or trust a 'built' flag on
a page that was never shipped. So this checks the shape of those accidents:

  * every item has the fields the daily run reads, and a known status;
  * 'built' means the page file exists, carries the recorded datePublished, and
    its bet is in data/fleet-bets.json (a page without a bet is not pre-registered);
  * anything not 'built' must NOT have a page yet (else it is built and the flag
    is stale, or the slug collides with an unrelated page);
  * 'rejected' carries the SERP verdict that rejected it, with a date — the point
    of recording rejections is that nobody researches the same term twice;
  * no slug twice.
A queue with fewer than three buildable items only warns: running low is the
signal to restock, not a reason to block a deploy.

Run: python3 tools/check_expansion_queue.py [--selftest]
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SITE_ROOT = os.path.dirname(HERE)
QUEUE = os.path.join(SITE_ROOT, "data", "expansion-queue.json")
BETS = os.path.join(os.path.dirname(os.path.dirname(SITE_ROOT)), "data", "fleet-bets.json")
GUIDE = os.path.join(SITE_ROOT, "site", "guide")
STATUSES = {"queued", "built", "rejected", "blocked", "gated", "seasonal-hold"}
REQUIRED = ("slug", "working_title", "cluster", "evidence", "serp", "cannibalization",
            "monetisation", "status", "blocked_by", "next_action")


def check(queue, page_exists, page_date, bet_ids):
    errors, warnings = [], []
    seen = set()
    buildable = 0
    for i, it in enumerate(queue.get("items", [])):
        where = f"item {i} ({it.get('slug', '?')})"
        miss = [k for k in REQUIRED if k not in it]
        if miss:
            errors.append(f"{where}: missing {', '.join(miss)}")
            continue
        slug, st = it["slug"], it["status"]
        if slug in seen:
            errors.append(f"{where}: slug listed twice")
        seen.add(slug)
        if st not in STATUSES:
            errors.append(f"{where}: unknown status {st!r}")
            continue
        if not it["evidence"]:
            errors.append(f"{where}: no evidence — a queue item without a reason is a guess")
        if st == "built":
            if not page_exists(slug):
                errors.append(f"{where}: marked built but site/guide/{slug}.html does not exist")
            elif it.get("built") and page_date(slug) != it["built"]:
                errors.append(f"{where}: built {it.get('built')} but the page's datePublished is {page_date(slug)}")
            if it.get("bet") not in bet_ids:
                errors.append(f"{where}: built without a bet in data/fleet-bets.json ({it.get('bet')!r})")
        elif page_exists(slug):
            errors.append(f"{where}: status {st!r} but site/guide/{slug}.html exists — mark it built or rename the slug")
        if st == "rejected":
            s = it["serp"] or {}
            if not s.get("date") or s.get("verdict") in ("", "unchecked"):
                errors.append(f"{where}: rejected without a dated SERP verdict")
        if st == "queued" and not it["blocked_by"]:
            buildable += 1
    if buildable < 3:
        warnings.append(f"only {buildable} buildable item(s) queued — the next daily run should restock "
                        "from the season calendar")
    return errors, warnings


def _page_date(slug):
    try:
        html = open(os.path.join(GUIDE, slug + ".html"), encoding="utf-8").read()
    except OSError:
        return None
    m = re.search(r'"datePublished"\s*:\s*"(\d{4}-\d{2}-\d{2})"', html)
    return m.group(1) if m else None


def selftest():
    base = {"slug": "x", "working_title": "t", "cluster": "heizen", "evidence": ["e"],
            "serp": {"date": "2026-09-24", "verdict": "writable", "seen": "s"}, "cannibalization": "c",
            "monetisation": "m", "blocked_by": "", "next_action": ""}
    ex = lambda s: s == "exists"
    dt = lambda s: "2026-09-24"
    cases = [
        ("built page missing", {**base, "slug": "nope", "status": "built", "built": "2026-09-24", "bet": "b"}, True),
        ("built without bet", {**base, "slug": "exists", "status": "built", "built": "2026-09-24", "bet": "zz"}, True),
        ("queued but page exists", {**base, "slug": "exists", "status": "queued"}, True),
        ("rejected without verdict", {**base, "slug": "r", "status": "rejected",
                                      "serp": {"date": "", "verdict": "unchecked", "seen": ""}}, True),
        ("no evidence", {**base, "slug": "e0", "status": "queued", "evidence": []}, True),
        ("good built", {**base, "slug": "exists", "status": "built", "built": "2026-09-24", "bet": "b"}, False),
    ]
    bad = 0
    for name, item, want_err in cases:
        errs, _ = check({"items": [item]}, ex, dt, {"b"})
        ok = bool(errs) == want_err
        print(("ok   " if ok else "FAIL ") + name + ("" if ok else f" — {errs}"))
        bad += not ok
    errs, _ = check({"items": [{**base, "slug": "d", "status": "queued"}, {**base, "slug": "d", "status": "queued"}]},
                    ex, dt, set())
    ok = any("twice" in e for e in errs)
    print(("ok   " if ok else "FAIL ") + "duplicate slug")
    bad += not ok
    return 1 if bad else 0


def main():
    if "--selftest" in sys.argv:
        return selftest()
    queue = json.load(open(QUEUE, encoding="utf-8"))
    bet_ids = {b["id"] for b in json.load(open(BETS, encoding="utf-8"))["bets"]}
    errs, warns = check(queue, lambda s: os.path.exists(os.path.join(GUIDE, s + ".html")), _page_date, bet_ids)
    for w in warns:
        print(f"::warning::expansion queue: {w}")
    for e in errs:
        print(f"::error::expansion queue: {e}")
    items = queue.get("items", [])
    counts = {}
    for it in items:
        counts[it.get("status")] = counts.get(it.get("status"), 0) + 1
    print("expansion queue: " + ", ".join(f"{k} {v}" for k, v in sorted(counts.items())))
    return 1 if errs else 0


if __name__ == "__main__":
    sys.exit(main())
