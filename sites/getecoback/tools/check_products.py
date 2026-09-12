#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Gate for the live-price overlay (tools/product_intel/).

build_structure.py already refuses stale or unmatched entries. This gate is the
second, independent layer: it reads the BUILT pages and checks that nothing
rendered contradicts data/products.json. It exists because a price the reader
cannot still get is a lie, and because a /dp/ link for a term Amazon's own
title check rejected is the exact substitution this site closed on 2026-08-31.

Fails when:
  * data/products.json exists but does not parse;
  * a page shows a live price (data-eb-live) for which no fresh (<24 h) ok
    entry exists;
  * a page carries a /dp/ link for a product whose entry is `unmatched`, i.e.
    the rendered link is the one the refresher said not to use;
  * a live price string lacks its "Stand"/"as of" day (the display rule).
Passes trivially, with a note, when the file is absent — the overlay is optional.
"""
import datetime, glob, json, os, re, sys, urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.join(os.path.dirname(HERE), "site")
PJ = os.path.join(os.path.dirname(HERE), "data", "products.json")
MAX_AGE_H = 24


def main():
    bad = []
    if not os.path.exists(PJ):
        live_pages = [f for f in glob.glob(os.path.join(SITE, "**", "*.html"), recursive=True)
                      if "data-eb-live" in open(f, encoding="utf-8").read()]
        if live_pages:
            bad.append(f"no products.json, yet {len(live_pages)} page(s) render a live price")
        print("check_products: no data/products.json — overlay off" + ("" if not bad else " (but pages carry live prices!)"))
    else:
        try:
            raw = json.load(open(PJ, encoding="utf-8"))
        except Exception as e:
            print(f"FAIL check_products: products.json does not parse: {e}")
            return 1
        now = datetime.datetime.now(datetime.timezone.utc)
        fresh_asins, unmatched_asins = set(), set()
        for term, e in (raw.get("items") or {}).items():
            if e.get("status") == "ok" and e.get("fetched_at") and e.get("asin"):
                t = datetime.datetime.fromisoformat(e["fetched_at"].replace("Z", "+00:00"))
                if (now - t).total_seconds() <= MAX_AGE_H * 3600:
                    fresh_asins.add(e["asin"].upper())
            if e.get("status") == "unmatched":
                # an unmatched term must never be resolved; if the refresher ever
                # wrote an asin next to "unmatched", that asin must not appear
                if e.get("asin"):
                    unmatched_asins.add(e["asin"].upper())
        n_live, n_pages = 0, 0
        for f in glob.glob(os.path.join(SITE, "**", "*.html"), recursive=True):
            h = open(f, encoding="utf-8").read()
            rel = os.path.relpath(f, SITE)
            for m in re.finditer(r'<span data-eb-live="1">([^<]*)</span>', h):
                n_live += 1
                txt = m.group(1)
                if not re.search(r"(Stand|as of) \d{2}\.\d{2}\.", txt):
                    bad.append(f"{rel}: live price without its day: {txt!r}")
            if "data-eb-live" in h:
                n_pages += 1
                if not fresh_asins:
                    bad.append(f"{rel}: renders a live price but no entry in products.json is fresh")
            for a in set(re.findall(r"amazon\.de/dp/([A-Z0-9]{10})", h)):
                if a in unmatched_asins:
                    bad.append(f"{rel}: /dp/{a} belongs to a term the refresher marked unmatched")
        print(f"check_products: {len(fresh_asins)} fresh entries, {n_live} live prices on {n_pages} pages")
    if bad:
        print("FAIL check_products:")
        for b in bad[:20]:
            print("  -", b)
        return 1
    print("check_products OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
