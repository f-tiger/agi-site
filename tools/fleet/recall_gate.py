#!/usr/bin/env python3
"""PRD P1-4: the fleet's shelf gate on SourceRadar's official recall radar.

Any fleet script that puts a product category on an affiliate shelf (eco Preis-Engine, tds picks) can call
`blocked(keywords)` before publishing: it returns the CPSC recall hits from sites/buysomething/site/recalls.json
whose keyword list overlaps, so the caller can refuse or annotate. Reads only; never fetches.
`--check` (heartbeat): red if recalls.json exists but is older than 14 days — a stale radar is worse than none.
"""
import datetime as dt
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, "sites", "buysomething", "site", "recalls.json")
MAX_AGE = 14


def load():
    try:
        return json.load(open(SRC, encoding="utf-8"))
    except Exception:
        return None


def blocked(keywords, data=None):
    """Pure given data: keywords (list of str) → list of {pick, n, latest, items} whose recall keywords overlap and n > 0."""
    d = data if data is not None else load()
    if not d:
        return []
    kws = {k.lower() for k in keywords}
    out = []
    for pid, v in (d.get("picks") or {}).items():
        if v.get("n") and {k.lower() for k in (v.get("keywords") or [])} & kws:
            out.append({"pick": pid, "n": v["n"], "latest": v.get("latest"), "items": v.get("items") or []})
    return out


def main(argv):
    if "--selftest" in argv:
        d = {"picks": {"litter-box": {"n": 2, "latest": "2026-05-01", "items": [], "keywords": ["litter box"]}, "moon-chair": {"n": 0, "keywords": ["camping chair"]}}}
        ok = [b["pick"] for b in blocked(["Litter Box"], d)] == ["litter-box"] and blocked(["camping chair"], d) == [] and blocked(["nothing"], d) == []
        print(("✅ " if ok else "❌ ") + "recall gate: overlap + n>0 only, case-insensitive"); return 0 if ok else 1
    if "--check" in argv:
        d = load()
        if not d:
            print("recall radar: not produced yet (expected before the first buysomething schedule run)"); return 0
        age = (dt.date.today() - dt.date.fromisoformat(d["generated"])).days
        hits = {k: v.get("n") for k, v in (d.get("picks") or {}).items() if v.get("n")}
        print(f"recall radar: generated {d['generated']} ({age} d), {len(d.get('picks') or {})} picks, hits {hits}")
        if age > MAX_AGE:
            print(f"::error::SourceRadar recall radar is {age} days old — the shelf gate is reading stale official data"); return 1
        return 0
    print(json.dumps(blocked(argv), ensure_ascii=False, indent=1)); return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
