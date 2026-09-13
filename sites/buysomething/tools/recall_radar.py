#!/usr/bin/env python3
"""PRD P1-2: recall radar per pick from the official CPSC SaferProducts REST API (probe 2026-09-13: 200, JSON).

For each pick, query Recall?format=json&RecallTitle=<kw>&RecallDateStart=<365 d ago> for each recall keyword
(tools/hts_candidates.json → recall_kw), de-duplicate by RecallID, keep date/title/hazard/URL (official record
only, no inference). EU Safety Gate: the probed URL serves HTML, so it is recorded as "not wired" until a JSON
endpoint is confirmed — never scraped from HTML. Keep-last-good per pick on failure.

Usage: python3 tools/recall_radar.py [--selftest]
"""
import datetime as dt
import json
import os
import sys
import time
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.join(HERE, "..", "site")
CAND = os.path.join(HERE, "hts_candidates.json")
OUT = os.path.join(SITE, "recalls.json")
UA = {"User-Agent": "Mozilla/5.0 (compatible; sourceradar-recall-radar; +https://source.agiscorecard.com)", "Accept": "application/json"}
WINDOW = 365


def fetch(kw, since):
    u = "https://www.saferproducts.gov/RestWebServices/Recall?format=json&RecallTitle=" + urllib.parse.quote(kw) + "&RecallDateStart=" + since
    with urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=30) as r:
        return json.loads(r.read().decode("utf-8", "replace"))


def normalise(items, since):
    """Pure: CPSC rows → compact list within window, de-duplicated by RecallID, newest first."""
    seen, out = set(), []
    for it in items or []:
        rid = it.get("RecallID")
        date = str(it.get("RecallDate") or "")[:10]
        if rid in seen or not date or date < since:
            continue
        seen.add(rid)
        hazards = [h.get("Name") for h in (it.get("Hazards") or []) if isinstance(h, dict) and h.get("Name")]
        out.append({"id": rid, "date": date, "title": (it.get("Title") or "")[:140], "hazard": (hazards[0] if hazards else "")[:120], "url": it.get("URL") or ""})
    out.sort(key=lambda x: x["date"], reverse=True)
    return out


def selftest():
    since = "2025-09-13"
    rows = [{"RecallID": 1, "RecallDate": "2026-05-01T00:00:00", "Title": "Firm recalls litter boxes", "Hazards": [{"Name": "Entrapment"}], "URL": "https://cpsc/1"},
            {"RecallID": 1, "RecallDate": "2026-05-01T00:00:00", "Title": "dup"},
            {"RecallID": 2, "RecallDate": "2024-01-01T00:00:00", "Title": "too old"},
            {"RecallID": 3, "RecallDate": "2026-08-01T00:00:00", "Title": "newer", "Hazards": []}]
    n = normalise(rows, since)
    checks = [("dedupe + window + newest first", [x["id"] for x in n] == [3, 1]),
              ("hazard copied verbatim, empty when absent", n[1]["hazard"] == "Entrapment" and n[0]["hazard"] == ""),
              ("candidates file has recall_kw for all", all(v.get("recall_kw") for v in json.load(open(CAND, encoding="utf-8"))["picks"].values()))]
    for nm, ok in checks:
        print(("✅ " if ok else "❌ ") + nm)
    return 0 if all(ok for _, ok in checks) else 1


def main(argv):
    if "--selftest" in argv:
        return selftest()
    cands = json.load(open(CAND, encoding="utf-8"))["picks"]
    try:
        prev = json.load(open(OUT, encoding="utf-8"))
    except Exception:
        prev = {"picks": {}}
    today = dt.date.today(); since = (today - dt.timedelta(days=WINDOW)).isoformat()
    out = {"generated": today.isoformat(), "window_days": WINDOW, "since": since,
           "sources": {"cpsc": "https://www.saferproducts.gov/RestWebServices/Recall (official CPSC API)", "eu_safety_gate": "not wired: probed URL serves HTML, JSON endpoint unconfirmed (2026-09-13)"},
           "note": "Official records only, matched by title keyword; a hit means the keyword appears in a recall title in the window, not that a specific supplier or SKU is affected.", "picks": {}}
    cache, failed = {}, []
    for pid, c in cands.items():
        items, kws_ok = [], 0
        for kw in c["recall_kw"]:
            if kw not in cache:
                try:
                    cache[kw] = fetch(kw, since); time.sleep(0.8)
                except Exception as e:
                    cache[kw] = None; failed.append(f"{kw}: {str(e)[:50]}")
            if cache[kw] is not None:
                kws_ok += 1; items.extend(cache[kw])
        if kws_ok == 0:
            old = (prev.get("picks") or {}).get(pid)
            out["picks"][pid] = {**(old or {"n": None, "items": []}), "stale": True}
            continue
        n = normalise(items, since)
        out["picks"][pid] = {"n": len(n), "latest": n[0]["date"] if n else None, "items": n[:5], "keywords": c["recall_kw"], "stale": False}
    out["failed_keywords"] = failed
    json.dump(out, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    hits = {k: v["n"] for k, v in out["picks"].items() if v.get("n")}
    print(f"recall radar: {len(out['picks'])} picks; hits {hits}; failed {failed}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
