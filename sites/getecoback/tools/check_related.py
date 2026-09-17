#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Gate for the lateral related-links layer (2026-09-17).

Three ways this block can quietly turn from an asset into a liability, none of
which changes how the page looks:

1. A wall of links. An early version of build_related.py grew one block to 16
   entries because its top-up pass appended without a real cap. Link blocks that
   read as a wall are ignored by readers and discounted by engines.
2. Duplicate links. The builder skips targets a page already links to, but it
   reads those with a regex, and the first version of that regex matched only
   relative hrefs while this site also links with absolute URLs. Same blind spot
   produced a phantom "orphan crisis" in the analysis that motivated the tool.
   So assert on the OUTPUT: no target may appear both inside the block and
   outside it.
3. Self-links, which waste a slot and look broken.

Run: python3 tools/check_related.py
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, "site")
HARD_MAX = 6
# Both URL forms, deliberately — see reason 2 above.
LINK = re.compile(r'href="(?:https://getecoback\.com)?(/[^"#?]*\.html)"')
BLOCK = re.compile(r"<!--EB_RELATED-->(.*?)<!--/EB_RELATED-->", re.S)


def main():
    bad, blocks, links = [], 0, 0
    for root, _dirs, files in os.walk(SITE):
        for fn in files:
            if not fn.endswith(".html"):
                continue
            path = os.path.join(root, fn)
            rel = "/" + os.path.relpath(path, SITE).replace(os.sep, "/")
            html = open(path, encoding="utf-8").read()
            m = BLOCK.search(html)
            if not m:
                continue
            blocks += 1
            inside = LINK.findall(m.group(1))
            links += len(inside)
            if len(inside) > HARD_MAX:
                bad.append(f"{rel}: related block has {len(inside)} links (max {HARD_MAX}) — a wall, not a suggestion")
            if rel in inside:
                bad.append(f"{rel}: related block links to itself")
            if len(inside) != len(set(inside)):
                bad.append(f"{rel}: related block repeats a link inside itself")
            rest = re.sub(r"<(script|style)\b.*?</\1>", "", html[:m.start()] + html[m.end():], flags=re.S)
            dupes = set(inside) & set(LINK.findall(rest))
            if dupes:
                bad.append(f"{rel}: related block repeats {len(dupes)} link(s) the page already makes "
                           f"(e.g. {sorted(dupes)[0]})")
    if blocks == 0:
        bad.append("no page carries EB_RELATED — the lateral link layer is gone")
    print(f"check_related: {blocks} block(s), {links} lateral links")
    if bad:
        print("FAIL check_related:")
        for b in bad[:20]:
            print("  -", b)
        return 1
    print("check_related OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
