# -*- coding: utf-8 -*-
"""Site-level evolution loop — no AI in it.

Daily in CI: pull 28 days of real reader behavior (pick_open / out_click)
from D1 over the Cloudflare REST API and bake site/popularity.json. The
front end switches its default ordering to reader heat once the sample is
big enough (>=20 opens). keep-last-good: any failure exits nonzero and the
previous file stays untouched.

Env: CF_TOKEN, CF_ACCT.
"""
import json, os, sys, time, urllib.request

DB = "f92b6207-90bf-46f6-97c7-cc88195b2ec7"
SQL = ("SELECT label, SUM(name='pick_open') o, SUM(name='out_click') x FROM ev "
       "WHERE name IN ('pick_open','out_click') AND ts > datetime('now','-28 days') "
       "AND label != '' GROUP BY label")


def main():
    tok, acct = os.environ.get("CF_TOKEN"), os.environ.get("CF_ACCT")
    if not tok or not acct:
        sys.exit("CF_TOKEN/CF_ACCT missing")
    req = urllib.request.Request(
        f"https://api.cloudflare.com/client/v4/accounts/{acct}/d1/database/{DB}/query",
        data=json.dumps({"sql": SQL}).encode(),
        headers={"Authorization": f"Bearer {tok}", "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        d = json.load(r)
    if not d.get("success"):
        sys.exit(f"D1 API error: {d.get('errors')}")
    rows = d["result"][0]["results"]
    picks = {r["label"]: {"o": r["o"] or 0, "x": r["x"] or 0} for r in rows}
    out = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                       "site", "popularity.json")
    json.dump({"generated": time.strftime("%Y-%m-%d", time.gmtime()), "days": 28,
               "picks": picks}, open(out, "w"), separators=(",", ":"))
    print(f"popularity: {len(picks)} labels, {sum(v['o'] for v in picks.values())} opens")


if __name__ == "__main__":
    main()
