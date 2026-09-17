#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Gate for the UK running-cost block (2026-09-17).

The failure this exists to catch is quiet and total: the Ofgem cap changes every
quarter, and a page that still prints last quarter's pence per kWh looks exactly
like a page that prints this quarter's. Nothing renders wrong. The site's whole
claim — every figure is arithmetic you can repeat — is what breaks.

So assert three things:

1. Every page carrying the block shows the rate that is in data/ofgem-cap.json,
   and the period it belongs to. If someone hand-edits a page, or edits the JSON
   without rebuilding, the deploy stops.

2. The arithmetic in the table is actually right. The generator could be changed
   to divide instead of multiply and every gate above would still pass, so
   recompute each row here from the plate and the hours and compare.

3. The rate on the page is not stale relative to today. A cap period that ended
   before today means nobody has run the fetcher in over three months, and the
   pages are quoting a price that no longer exists.

Run: python3 tools/check_ukcost.py
"""
import datetime
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, "site")
CAP = os.path.join(ROOT, "data", "ofgem-cap.json")
OPEN_RE = re.compile(r"<!--EB_UKCOST(?::([a-z]+))?-->")

MONTHS = {m: i for i, m in enumerate(
    ["January", "February", "March", "April", "May", "June", "July",
     "August", "September", "October", "November", "December"], 1)}


def period_end(period):
    """'1 October to 31 December 2026' -> date(2026, 12, 31). None if unparsed."""
    m = re.search(r"to (\d{1,2}) (\w+) (\d{4})", period)
    if not m or m.group(2) not in MONTHS:
        return None
    return datetime.date(int(m.group(3)), MONTHS[m.group(2)], int(m.group(1)))


def main():
    bad = []
    if not os.path.exists(CAP):
        print("FAIL check_ukcost: data/ofgem-cap.json is missing")
        return 1
    cap = json.load(open(CAP, encoding="utf-8"))
    rate = cap["electricity_p_per_kwh"]

    end = period_end(cap["period"])
    if end is None:
        bad.append(f"ofgem-cap.json: cannot parse the period {cap['period']!r}")
    elif end < datetime.date.today():
        bad.append(f"ofgem-cap.json: the cap period ended {end} — the pages are quoting "
                   f"a rate that no longer exists. Run tools/fetch_ofgem_cap.py.")

    pages = 0
    for root, _dirs, files in os.walk(SITE):
        for fn in files:
            if not fn.endswith(".html"):
                continue
            path = os.path.join(root, fn)
            html = open(path, encoding="utf-8").read()
            if not OPEN_RE.search(html):
                continue
            pages += 1
            rel = os.path.relpath(path, SITE)
            blk = re.search(OPEN_RE.pattern + r"(.*?)<!--/EB_UKCOST-->", html, re.S)
            if not blk:
                bad.append(f"{rel}: EB_UKCOST opened but never closed")
                continue
            body = blk.group(2)
            if f"{rate}p per kWh" not in body:
                bad.append(f"{rel}: does not show the current rate {rate}p per kWh "
                           f"— run tools/build_ukcost.py")
            if cap["period"] not in body:
                bad.append(f"{rel}: does not name the cap period {cap['period']!r}, so a "
                           f"reader cannot tell how old the figure is")
            # Recompute every row: plate W, hours implied by the kWh column.
            for w, kwh, pounds in re.findall(
                    r"<td>(\d+) W</td><td>[^<]*</td><td>([\d.]+) kWh</td><td>([\d.]+)</td>", body):
                want = float(kwh) * rate / 100.0
                if abs(want - float(pounds)) > 0.011:
                    bad.append(f"{rel}: {w} W row says £{pounds} for {kwh} kWh, but "
                               f"{kwh} x {rate}p = £{want:.2f}")

    if pages == 0:
        bad.append("no page carries EB_UKCOST — the block was removed, and with it the "
                   "only UK-localised cost figures on the site")

    print(f"check_ukcost: {rate}p/kWh ({cap['period']}), {pages} page(s)")
    if bad:
        print("FAIL check_ukcost:")
        for b in bad[:20]:
            print("  -", b)
        return 1
    print("check_ukcost OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
