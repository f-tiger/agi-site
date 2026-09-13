#!/usr/bin/env python3
"""PRD P0-3: probe the official data sources before anything is built on them (zero-fabrication).

USITC HTS REST, CPSC SaferProducts REST, EU Safety Gate. Runs on the runner (the session sandbox cannot
reach them); records status/type/bytes per endpoint into data/sr-source-probe.json. Nothing is parsed or
published from these until a session reads a 200 here and writes a parser with fixtures (PRD P1).
"""
import datetime as dt
import json
import os
import sys
import urllib.request

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
OUT = os.path.join(ROOT, "data", "sr-source-probe.json")
UA = {"User-Agent": "Mozilla/5.0 (compatible; sourceradar-probe; +https://source.agiscorecard.com)", "Accept": "application/json,*/*"}
ENDPOINTS = {
    "usitc_hts_search": "https://hts.usitc.gov/reststop/search?keyword=water%20fountain",
    "usitc_hts_export": "https://hts.usitc.gov/reststop/exportList?from=8509&to=8510&format=JSON&styles=false",
    "cpsc_recalls": "https://www.saferproducts.gov/RestWebServices/Recall?format=json&RecallTitle=fountain",
    "eu_safety_gate": "https://ec.europa.eu/safety-gate-alerts/screen/webReport/alertsSearch",
    "ustr_301_lists": "https://ustr.gov/issue-areas/enforcement/section-301-investigations/tariff-actions",
}


def probe(u):
    try:
        with urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=25) as r:
            body = r.read(200000)
            return {"status": r.status, "type": (r.headers.get("content-type") or "")[:50], "bytes": len(body), "head": body[:120].decode("utf-8", "replace")}
    except Exception as e:
        return {"status": 0, "error": str(e)[:100]}


def main():
    out = {"checked": dt.datetime.now(dt.timezone.utc).replace(microsecond=0, tzinfo=None).isoformat() + "Z", "endpoints": {}}
    for k, u in ENDPOINTS.items():
        out["endpoints"][k] = {"url": u, **probe(u)}
        print(f"  {k:<18} {out['endpoints'][k].get('status')} {out['endpoints'][k].get('type','')} {out['endpoints'][k].get('bytes','')}B {out['endpoints'][k].get('error','')}")
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump(out, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    return 0


if __name__ == "__main__":
    sys.exit(main())
