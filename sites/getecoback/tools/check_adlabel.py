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

# 2026-09-04: this used to be an allowlist of nine block names, so any block that
# was never added here was never inspected — EB_HEATENERGY (69 pages), EB_SEALFIT
# (7) and EB_HOSEFIT (2) all carried Amazon links with no label and the gate said
# "all clear". Inverted to a denylist: every <!--EB_X-->…<!--/EB_X--> block whose
# markup contains an Amazon anchor is inspected, and only blocks that provably
# own no anchor of their own are exempt. EB_TRACK is the click-tracking listener
# (its only "amazon." is a CSS selector); EB_USSWITCH rewrites other blocks'
# hrefs at runtime and renders nothing.
EXEMPT = {"EB_TRACK", "EB_USSWITCH"}
BLOCK_RE = re.compile(r"<!--(EB_[A-Z_0-9]+)-->(.*?)<!--/\1-->", re.S)
ANCHOR_RE = re.compile(r"<a\s[^>]*amazon\.", re.S)
# German pages must carry a German marker, English pages an English one.
LABELS = ("Anzeige", "Werbung", ">Ad<", "Ad ·")


def main():
    files = glob.glob(os.path.join(SITE, "**", "*.html"), recursive=True)
    gaps = []
    checked = 0
    for path in files:
        html = open(path, encoding="utf-8").read()
        # finditer, not search: a page can carry the same marker twice (e.g. a
        # block re-injected below a hand-written one) and every copy must pass.
        for m in BLOCK_RE.finditer(html):
            block, frag = m.group(1), m.group(2)
            if block in EXEMPT:
                continue
            # Only blocks that render an Amazon anchor are ads. A bare "amazon."
            # in a selector or a script string is not something a reader can
            # click; an <a … amazon.…> is. Anchors built at runtime inside the
            # block's script (seal/hose calculators) still contain the literal
            # "<a href=\"https://www.amazon." in the fragment, so they count.
            if not ANCHOR_RE.search(frag):
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
