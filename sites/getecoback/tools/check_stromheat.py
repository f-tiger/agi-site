#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Gate for the winter exchange-price band (EB_STROMHEAT).

The band puts a live EPEX figure on the first screen of every page whose
subject is the cost of a bought kilowatt-hour. That figure is the exchange
price, which is roughly a third of what a household actually pays, so the
sentence that says so is not decoration — without it the band reads as
"electricity costs 8 ct/kWh" on a page telling someone what their heater
costs, which is worse than having no band at all.

Fails when:
  * a page in the cluster is missing the band, or carries it more than once;
  * a page outside the cluster carries it (it would be claiming the exchange
    price is the economics of a page about something else);
  * any page carries both EB_STROMHEAT and EB_STROMNOW — they say opposite
    things about the same number (replaced vs bought), and a reader given both
    framings at once has been told nothing;
  * the band loses its disclaimer, its EPEX attribution, or the 0,30 €/kWh it
    names as this site's own assumption;
  * the band hard-codes a ct/kWh figure, which would survive a dead feed and
    become a fabricated price.
"""
import os, re, sys, glob

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import build_structure as B  # noqa: E402

SITE = os.path.join(os.path.dirname(HERE), "site")
BLOCK = re.compile(r'<!--EB_STROMHEAT-->.*?<!--/EB_STROMHEAT-->', re.S)


def main():
    bad, seen = [], set()
    for path in glob.glob(os.path.join(SITE, "**", "*.html"), recursive=True):
        html = open(path, encoding="utf-8").read()
        rel = os.path.relpath(path, SITE)
        slug = os.path.basename(path)[:-5]
        n = html.count("<!--EB_STROMHEAT-->")
        if n == 0:
            continue
        seen.add(slug)
        if n > 1:
            bad.append(f"{rel}: {n} copies of the band")
        if slug not in B.STROMHEAT_PAGES:
            bad.append(f"{rel}: carries the band but is not in STROMHEAT_PAGES")
        if "<!--EB_STROMNOW-->" in html:
            bad.append(f"{rel}: carries BOTH the balcony band and the winter band")
        block = BLOCK.search(html)
        if not block:
            bad.append(f"{rel}: opening marker without a closing one")
            continue
        body = block.group(0)
        # The disclaimer, in the shape it is actually written.
        if "nicht" not in body or "Haushaltstarif" not in body:
            bad.append(f"{rel}: band no longer says the exchange price is not the household tariff")
        if "EPEX" not in body:
            bad.append(f"{rel}: band no longer attributes the price to EPEX")
        if "0,30" not in body:
            bad.append(f"{rel}: band no longer names the 0,30 EUR/kWh this site assumes")
        # A literal price in the markup would outlive a dead feed.
        for lit in re.findall(r'\d+[.,]\d+\s*ct/kWh', body):
            bad.append(f"{rel}: hard-coded price {lit!r} in the band")

    missing = [s for s in B.STROMHEAT_PAGES
               if s not in seen and glob.glob(os.path.join(SITE, "**", s + ".html"), recursive=True)]
    for s in missing:
        bad.append(f"{s}: in STROMHEAT_PAGES but the built page has no band")

    print(f"stromheat band on {len(seen)} pages "
          f"({len(B.STROMHEAT_PAGES)} in the cluster)")
    if bad:
        print("\nFAIL check_stromheat:")
        for b in bad:
            print("  -", b)
        return 1
    print("check_stromheat OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
