#!/usr/bin/env python3
"""FutureEval coverage and rules probe (2026-09-27; docs/ai-era-founder-2026-09-25.md §三, bet fe-coverage-1005).

Question it answers mechanically: would a post-close "resolution desk" built on sources the fleet
already archives cover a meaningful share of FutureEval / MiniBench questions? It samples open
questions from the public Metaculus API (runner only; the sandbox gets 403), extracts the hosts named
in resolution_criteria + fine_print, and counts a question as covered only if one of those hosts is in
tools/fleet/archived_sources.txt. Unknown or unparseable = not covered. Only id, title and matched
host are stored — no question text beyond the title, no forecasts.

It also fetches the public FutureEval pages and records a hash + retrieval date, so a rules change
shows up as a hash change (warning), and any explicit close date the page states.

  python3 tools/fleet/futureeval_coverage.py --selftest
  python3 tools/fleet/futureeval_coverage.py        # writes data/futureeval-coverage.json
"""
from __future__ import annotations

import datetime as dt
import hashlib
import json
import os
import re
import sys
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "data", "futureeval-coverage.json")
HOSTS_FILE = os.path.join(ROOT, "tools", "fleet", "archived_sources.txt")
LIST_API = "https://www.metaculus.com/api/posts/?tournaments={}&statuses=open&limit={}"
RULE_PAGES = ["https://www.metaculus.com/futureeval/participate/", "https://www.metaculus.com/futureeval/"]
UA = "fleet-heartbeat/futureeval_coverage (+https://github.com/f-tiger/agi-site)"
URL_RE = re.compile(r"https?://([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})")


def archived_hosts(path=HOSTS_FILE) -> set[str]:
    out = set()
    with open(path, encoding="utf-8") as f:
        for line in f:
            h = line.split("#", 1)[0].strip().lower()
            if h:
                out.add(h)
    return out


def host_matches(host: str, allowed: set[str]) -> str | None:
    host = host.lower().rstrip(".")
    if host.startswith("www."):
        host = host[4:]
    for a in allowed:
        if host == a or host.endswith("." + a):
            return a
    return None


def classify(post: dict, allowed: set[str]) -> dict:
    q = post.get("question") if isinstance(post.get("question"), dict) else {}
    text = " ".join(str(x or "") for x in (q.get("resolution_criteria"), q.get("fine_print"),
                                             post.get("resolution_criteria"), post.get("fine_print")))
    hosts = sorted({m.group(1).lower() for m in URL_RE.finditer(text)})
    hit = next((h for h in (host_matches(x, allowed) for x in hosts) if h), None)
    return {"post_id": post.get("id"), "title": str(post.get("title") or q.get("title") or "")[:160],
            "hosts": hosts[:8], "covered_by": hit}


def get_json(url: str, token: str = ""):
    h = {"User-Agent": UA}
    if token:
        h["Authorization"] = f"Token {token}"
    with urllib.request.urlopen(urllib.request.Request(url, headers=h), timeout=25) as r:
        return json.loads(r.read().decode())


def get_text(url: str) -> str:
    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=25) as r:
        return r.read().decode("utf-8", "replace")


def selftest() -> int:
    allowed = {"hts.usitc.gov", "trends.google.com", "federalregister.gov"}
    cases = [
        ({"id": 1, "title": "t", "question": {"resolution_criteria": "per https://www.federalregister.gov/x"}}, "federalregister.gov"),
        ({"id": 2, "title": "t", "question": {"resolution_criteria": "per https://fred.stlouisfed.org/series/X"}}, None),
        ({"id": 3, "title": "t", "question": {"fine_print": "see https://trends.google.com/trends/explore"}}, "trends.google.com"),
        ({"id": 4, "title": "t", "question": {"resolution_criteria": "https://notfederalregister.gov.evil.com/"}}, None),
        ({"id": 5, "title": "t"}, None),
    ]
    bad = 0
    for post, want in cases:
        got = classify(post, allowed)["covered_by"]
        ok = got == want
        bad += not ok
        print(("  ok   " if ok else "  FAIL ") + f"post {post['id']}: covered_by={got}")
    ok = len(archived_hosts()) >= 5
    bad += not ok
    print(("  ok   " if ok else "  FAIL ") + "archived_sources.txt parses")
    return 1 if bad else 0


def main(argv) -> int:
    if "--selftest" in argv:
        return selftest()
    now = dt.datetime.now(dt.timezone.utc)
    token = os.getenv("METACULUS_TOKEN", "")
    allowed = archived_hosts()
    ids = [x for x in [os.getenv("BOT_TOURNAMENT_ID") or "33121", os.getenv("BOT_MINIBENCH_ID") or ""] if x]
    last = {}
    try:
        with open(OUT, encoding="utf-8") as f:
            last = json.load(f)
    except (OSError, ValueError):
        pass
    sample, errors = [], []
    for tid in ids:
        try:
            body = get_json(LIST_API.format(urllib.parse.quote(tid), 60), token)
            posts = body.get("results") if isinstance(body, dict) else None
            for p in posts or []:
                if isinstance(p, dict):
                    sample.append(dict(classify(p, allowed), tournament=tid))
        except Exception as e:
            errors.append(f"list {tid}: {type(e).__name__}")
    rules = []
    for u in RULE_PAGES:
        try:
            t = get_text(u)
            dates = sorted(set(re.findall(r"20\d\d-\d\d-\d\d", t)))[:20]
            rules.append({"url": u, "sha256": hashlib.sha256(t.encode()).hexdigest(), "retrieved": now.date().isoformat(), "iso_dates_on_page": dates})
        except Exception as e:
            errors.append(f"rules {u}: {type(e).__name__}")
    prev_hash = {r.get("url"): r.get("sha256") for r in (last.get("rules") or [])}
    changed = [r["url"] for r in rules if prev_hash.get(r["url"]) and prev_hash[r["url"]] != r["sha256"]]
    if not sample and last.get("sample"):
        sample, stale = last["sample"], True  # keep last good, mark stale
    else:
        stale = False
    covered = sum(1 for s in sample if s.get("covered_by"))
    snap = {
        "generated": now.isoformat(timespec="seconds"),
        "definition": "share of sampled open FutureEval/MiniBench questions whose resolution text names a host the fleet archives on a schedule (tools/fleet/archived_sources.txt); unknown = not covered",
        "tournaments": ids, "sampled": len(sample), "covered": covered,
        "coverage_share": round(covered / len(sample), 3) if sample else None,
        "stale": stale, "sample": sample, "rules": rules or last.get("rules") or [], "rules_changed": changed, "errors": errors,
    }
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(snap, f, ensure_ascii=False, indent=1)
        f.write("\n")
    print(f"futureeval coverage: sampled={len(sample)} covered={covered} share={snap['coverage_share']} stale={stale} errors={len(errors)}")
    if changed:
        print("::warning::FutureEval rules page changed: " + ", ".join(changed))
    if errors:
        print("::warning::" + "; ".join(errors[:4]))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
