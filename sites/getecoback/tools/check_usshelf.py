#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Gate for the US product shelf (EB_USSHELF, 2026-09-15).

The shelf ships on English pages hidden, and JS reveals it only for North
American readers. Every failure mode here is silent in a build log and obvious
to a reader:

  * the shelf rendered WITHOUT `hidden` — every European visitor is then shown
    American machines they cannot buy, on the pages that carry a quarter of
    this site's clicks. This is the one that costs money immediately.
  * a US associates tag on an amazon.de link, or the German tag on an
    amazon.com link — either one puts the commission in the wrong account or
    voids it.
  * the shelf on a German or Italian page, where the reader is not American.
  * the shelf on a CONTEXT page, which sells parts for that page's problem;
    swapping in whole appliances answers a question nobody asked.
  * either US surface on a page about cooling a room in a European country.
    A US portable AC is 115 V / 60 Hz and will not run on a 230 V / 50 Hz
    socket, so this is a machine that does not work, not a mismatch of taste.
  * the European strip left visible while the US one is shown, or vice versa —
    the page would then recommend two countries' machines at once.
"""
import glob, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import build_structure as B  # noqa: E402

SITE = os.path.join(os.path.dirname(HERE), "site")
DE_TAG, US_TAG = "getecoback-21", B.US_TAG


def main():
    bad, n = [], 0
    for f in sorted(glob.glob(os.path.join(SITE, "**", "*.html"), recursive=True)):
        rel = os.path.relpath(f, SITE)
        h = open(f, encoding="utf-8").read()
        if "<!--EB_USSHELF-->" not in h and "<!--EB_USTOP-->" not in h:
            continue
        n += 1
        slug0 = os.path.basename(f)[:-5]
        if any(w in slug0 for w in B.US_SWAP_NEVER):
            bad.append(f"{rel}: US surface on a European-location page (115 V goods, 230 V readers)")
        if "<!--EB_USTOP-->" in h:
            tb = re.search(r"<!--EB_USTOP-->(.*?)<!--/EB_USTOP-->", h, re.S).group(1)
            if not re.search(r'id="eb-ustop"[^>]*\bhidden\b', tb):
                bad.append(f"{rel}: US strip is NOT hidden by default")
            if 'id="eb-toppick"' not in h:
                bad.append(f"{rel}: US strip ships but the European strip has no id to hide")
            for url in re.findall(r'href="(https://www\.amazon\.[^"]+)"', tb):
                u = url.replace("&amp;", "&")
                if "amazon.de" in u:
                    bad.append(f"{rel}: US strip links to amazon.de: {u[:70]}")
                if "amazon.com" in u and f"tag={US_TAG}" not in u:
                    bad.append(f"{rel}: US strip amazon.com link without the US tag")
            # Count script COPIES, not identifier occurrences: the guard both
            # reads and sets the flag, so "__ebUsSwap" appears twice inside one
            # script. Counting the identifier made this gate fail on correct
            # pages — the assertion was wrong, not the build.
            copies = h.count("window.__ebUsSwap=1")
            if copies != 1:
                bad.append(f"{rel}: swap script appears {copies} times, expected 1")
        if "<!--EB_USSHELF-->" not in h:
            continue
        if not rel.startswith("en" + os.sep):
            bad.append(f"{rel}: US shelf outside the English section")
        slug = os.path.basename(f)[:-5]
        if B.context_entries(slug, en=True):
            bad.append(f"{rel}: US shelf on a CONTEXT page (it sells parts, not appliances)")
        blk = re.search(r"<!--EB_USSHELF-->(.*?)<!--/EB_USSHELF-->", h, re.S).group(1)
        if not re.search(r'id="eb-usshelf"[^>]*\bhidden\b', blk):
            bad.append(f"{rel}: US shelf is NOT hidden by default — European readers would see it")
        for url in re.findall(r'href="(https://www\.amazon\.[^"]+)"', blk):
            u = url.replace("&amp;", "&")
            if "amazon.com" in u and f"tag={US_TAG}" not in u:
                bad.append(f"{rel}: amazon.com link without the US tag: {u[:70]}")
            if "amazon.de" in u:
                bad.append(f"{rel}: US shelf links to amazon.de: {u[:70]}")
        if "eb-shop-grid" not in blk:
            bad.append(f"{rel}: US shelf has no product grid")

    # The inverse leak, checked site-wide rather than only inside the block.
    for f in glob.glob(os.path.join(SITE, "**", "*.html"), recursive=True):
        h = open(f, encoding="utf-8").read().replace("&amp;", "&")
        rel = os.path.relpath(f, SITE)
        for u in re.findall(r'https://www\.amazon\.com/[^"\s]+', h):
            if f"tag={DE_TAG}" in u:
                bad.append(f"{rel}: German tag on an amazon.com link: {u[:70]}")
        for u in re.findall(r'https://www\.amazon\.de/[^"\s]+', h):
            if f"tag={US_TAG}" in u:
                bad.append(f"{rel}: US tag on an amazon.de link: {u[:70]}")

    print(f"check_usshelf: {n} pages carry a US surface")
    if bad:
        print("FAIL check_usshelf:")
        for b in bad[:20]:
            print("  -", b)
        return 1
    print("check_usshelf OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
