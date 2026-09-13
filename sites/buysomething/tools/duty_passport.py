#!/usr/bin/env python3
"""PRD P1-1: duty passport per pick from the official USITC HTS REST API (probe 2026-09-13: 200, JSON).

For each pick's candidate subheading (tools/hts_candidates.json) fetch the heading export
(https://hts.usitc.gov/reststop/exportList?from=HHHH&to=HHHH&format=JSON) and record: the candidate row's
"general" rate text, the range of general rates across the heading, the HTS release the API served, and
the fetch date. Section 301 is NOT asserted (list membership needs a USTR lookup; link provided).
Keep-last-good: a failed heading keeps the previous passport row and is marked stale. Zero fabrication:
rates are copied verbatim from the API text.

Usage: python3 tools/duty_passport.py [--selftest]
"""
import datetime as dt
import json
import os
import re
import sys
import time
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.join(HERE, "..", "site")
CAND = os.path.join(HERE, "hts_candidates.json")
OUT = os.path.join(SITE, "passports.json")
UA = {"User-Agent": "Mozilla/5.0 (compatible; sourceradar-duty-passport; +https://source.agiscorecard.com)", "Accept": "application/json"}
USTR = "https://ustr.gov/issue-areas/enforcement/section-301-investigations/tariff-actions"


def fetch_heading(h):
    u = f"https://hts.usitc.gov/reststop/exportList?from={h}&to={h}&format=JSON&styles=false"
    with urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=30) as r:
        return json.loads(r.read().decode("utf-8", "replace")), (r.headers.get("x-hts-release") or "")


def summarise(rows, candidate):
    """Pure: rows from the export → {candidate_row, general_rates_in_heading}."""
    def rate(r):
        return (r.get("general") or "").strip()
    cand = [r for r in rows if str(r.get("htsno", "")).startswith(candidate) and rate(r)]
    cand_row = cand[0] if cand else None
    rates = sorted({rate(r) for r in rows if rate(r)})
    return {"candidate_htsno": cand_row.get("htsno") if cand_row else None,
            "candidate_description": (cand_row.get("description") or "")[:160] if cand_row else None,
            "general_rate": rate(cand_row) if cand_row else None,
            "heading_general_rates": rates[:12], "rows_in_heading": len(rows)}


def selftest():
    rows = [{"htsno": "8509", "description": "Electromechanical domestic appliances", "general": ""},
            {"htsno": "8509.40.00", "description": "Food grinders", "general": "4.2%"},
            {"htsno": "8509.80.10", "description": "Floor polishers", "general": "Free"},
            {"htsno": "8509.80.50", "description": "Other", "general": "4.2%"}]
    s = summarise(rows, "8509.80")
    cands = json.load(open(CAND, encoding="utf-8"))["picks"]
    checks = [("candidate row picked (first rated row under prefix)", s["candidate_htsno"] == "8509.80.10" and s["general_rate"] == "Free"),
              ("heading rate set", s["heading_general_rates"] == ["4.2%", "Free"]),
              ("no match → None, never invented", summarise(rows, "8510.10")["general_rate"] is None),
              ("31 candidates, all with heading/candidate/recall_kw", len(cands) == 31 and all(v.get("heading") and v.get("candidate", "").startswith(v["heading"]) and v.get("recall_kw") for v in cands.values()))]
    for n, ok in checks:
        print(("✅ " if ok else "❌ ") + n)
    return 0 if all(ok for _, ok in checks) else 1


def main(argv):
    if "--selftest" in argv:
        return selftest()
    cands = json.load(open(CAND, encoding="utf-8"))["picks"]
    try:
        prev = json.load(open(OUT, encoding="utf-8"))
    except Exception:
        prev = {"picks": {}}
    today = dt.date.today().isoformat()
    out = {"generated": today, "source": "https://hts.usitc.gov/reststop (official USITC HTS REST API)", "s301_lookup": USTR,
           "disclaimer": "Candidate headings chosen by category reading; not a classification ruling. The importer of record classifies; confirm with a licensed broker.", "picks": {}}
    cache, release, failed = {}, "", []
    for pid, c in cands.items():
        h = c["heading"]
        if h not in cache:
            try:
                rows, rel = fetch_heading(h); cache[h] = rows; release = release or rel
                time.sleep(1.0)
            except Exception as e:
                cache[h] = None; failed.append(f"{h}: {str(e)[:60]}")
        rows = cache[h]
        if rows is None:
            old = (prev.get("picks") or {}).get(pid)
            out["picks"][pid] = {**(old or {"heading": h, "candidate": c["candidate"]}), "stale": True}
            continue
        out["picks"][pid] = {"heading": h, "candidate": c["candidate"], "alt": c.get("alt"), **summarise(rows, c["candidate"]),
                             "s301": {"status": "verify-on-ustr", "url": USTR}, "as_of": today, "stale": False}
    out["hts_release"] = release or None
    out["failed_headings"] = failed
    os.makedirs(SITE, exist_ok=True)
    json.dump(out, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    ok = sum(1 for v in out["picks"].values() if not v.get("stale"))
    print(f"duty passport: {ok}/{len(cands)} picks fresh; headings fetched {len([v for v in cache.values() if v])}; failed {failed}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
