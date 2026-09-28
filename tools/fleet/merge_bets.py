#!/usr/bin/env python3
"""Resolve a data/fleet-bets.json merge conflict by union of ids.

The ledger is the one file several sessions write on the same day, so it
conflicts on almost every merge. Doing it by hand is how a pre-registered line
gets deleted (CLAUDE.md, 2026-09-17: one added row became a 1,925-line
conflict). The rule, from the handbook: never lose a row, prefer the incoming
side on a shared id because a settlement is newer than an open row, and keep
any field the local side added that the incoming row lacks.

    python3 tools/fleet/merge_bets.py            # resolve the current conflict
    python3 tools/fleet/merge_bets.py --selftest
"""
import json
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PATH = os.path.join(ROOT, "data", "fleet-bets.json")


def rows(doc):
    return doc["bets"] if isinstance(doc, dict) else doc


def union(ours, theirs):
    """theirs = incoming side. Returns (doc, added_ids, kept_fields)."""
    ro, rt = rows(ours), rows(theirs)
    by_id = {r["id"]: r for r in rt}
    kept = []
    for r in ro:
        t = by_id.get(r["id"])
        if t is None:
            continue
        for k, v in r.items():
            if k not in t:            # a field only the local side added
                t[k] = v
                kept.append(f"{r['id']}.{k}")
    added = [r for r in ro if r["id"] not in by_id]
    merged = rt + added
    doc = dict(theirs) if isinstance(theirs, dict) else merged
    if isinstance(doc, dict):
        doc["bets"] = merged
    return doc, [r["id"] for r in added], kept


def read_stage(n):
    out = subprocess.run(["git", "show", f":{n}:data/fleet-bets.json"],
                         cwd=ROOT, capture_output=True, text=True)
    if out.returncode:
        sys.exit("not in a conflicted merge for data/fleet-bets.json")
    return json.loads(out.stdout)


def selftest():
    ours = {"bets": [{"id": "a", "status": "open", "settle_guard": "mine"},
                     {"id": "only-ours", "status": "open"}]}
    theirs = {"bets": [{"id": "a", "status": "won", "reading": "12"}]}
    doc, added, kept = union(ours, theirs)
    got = {r["id"]: r for r in doc["bets"]}
    checks = [
        ("no row is lost", set(got) == {"a", "only-ours"}),
        ("incoming wins on a shared id", got["a"]["status"] == "won"),
        ("a local-only field is carried over", got["a"]["settle_guard"] == "mine"),
        ("the incoming row's own fields survive", got["a"]["reading"] == "12"),
        ("added ids are reported", added == ["only-ours"]),
        ("carried fields are reported", kept == ["a.settle_guard"]),
    ]
    for n, ok in checks:
        print(("✅ " if ok else "❌ ") + n)
    return 0 if all(ok for _, ok in checks) else 1


def main():
    if "--selftest" in sys.argv:
        return selftest()
    doc, added, kept = union(read_stage(2), read_stage(3))
    with open(PATH, "w", encoding="utf-8") as fh:
        fh.write(json.dumps(doc, ensure_ascii=False, indent=1) + "\n")
    print(f"{len(rows(doc))} rows; added {added or 'none'}; carried {kept or 'none'}")
    subprocess.run(["git", "add", "data/fleet-bets.json"], cwd=ROOT, check=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
