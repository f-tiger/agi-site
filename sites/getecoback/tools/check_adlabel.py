#!/usr/bin/env python3
"""Fail the build if a block carrying affiliate links ships without a
Werbekennzeichnung.

The site's own rule was written into build_structure.py when the toppick strip
moved above the article's disclosure: "the label belongs at the ad, not 600 px
further down the page." An audit on 2026-08-27 found that rule had only ever
been applied to that one block — the sticky bar (139 pages), the model grid
(90), the exit popup (131), the BTU result panel (54), the homepage autumn
block and the rising rail all carried Amazon links with no ad label. Several
said "Affiliate-Links" in body copy, which is a disclosure but not a
Werbekennzeichnung, and the sticky bar and popup are exactly the floating
surfaces an in-article label does not reach.

Rather than trust that the next generator edit remembers, this asserts it.
"""
import glob
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, "site")

BLOCKS = ["EB_TOPPICK", "EB_MODELS", "EB_STICKY", "EB_POPUP",
          "EB_HERBST", "EB_SIZER", "EB_RISING_RAIL", "EB_USMARKET",
          # Added 2026-08-29: the profile bar carries an affiliate link on every
          # page it renders on and was never covered here.
          "EB_PROFILE"]
# German pages must carry a German marker, English pages an English one.
LABELS = ("Anzeige", "Werbung", ">Ad<", "Ad ·")


def main():
    files = glob.glob(os.path.join(SITE, "**", "*.html"), recursive=True)
    gaps = []
    checked = 0
    for path in files:
        html = open(path, encoding="utf-8").read()
        for block in BLOCKS:
            m = re.search(r"<!--" + block + r"-->(.*?)<!--/" + block + r"-->", html, re.S)
            if not m:
                continue
            frag = m.group(1)
            # "amazon." appears in the block's own click-tracking selector too;
            # that is fine — a block that references affiliate links at all is a
            # block a reader can click through from.
            if "amazon." not in frag:
                continue
            checked += 1
            if not any(x in frag for x in LABELS):
                gaps.append(f"{os.path.relpath(path, ROOT)}: {block}")
    if gaps:
        print(f"check_adlabel: {len(gaps)} affiliate block(s) with no Werbekennzeichnung:")
        for g in gaps[:25]:
            print("  " + g)
        if len(gaps) > 25:
            print(f"  … and {len(gaps) - 25} more")
        sys.exit(1)
    print(f"check_adlabel: {checked} affiliate blocks, all carry an ad label")


if __name__ == "__main__":
    main()
