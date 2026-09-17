#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Gate: no vetoed brand reaches the published site (2026-09-17).

The EcoFlow veto is an owner instruction from 2026-08-28, restated 2026-09-17.
Until today it was enforced in exactly one place — a human had deleted the card
from the curated shelf in build_structure.py — and every automated surface was
still free to publish the brand. The homepage rising rail is the sharp edge: it
turns any Google Trends query into a tagged amazon.de search chip with nobody in
the loop, and data/trends-rising.json has carried "ecoflow stream 5000" at
v=8800 under the balkonkraftwerk seed since 2026-09-12. It missed the page by
luck, not by design.

So this scans the built site rather than the source. A veto enforced at one
injection point only holds until someone adds a second injection point; a veto
asserted on the output holds regardless of how the brand got there.

Scope note: only site/ is scanned. tools/ legitimately names vetoed brands in
comments explaining why they are vetoed, and brand_veto.txt is the list itself —
flagging those would make the gate unusable and teach people to ignore it.

Run: python3 tools/check_brand_veto.py
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, "site")
VETO_FILE = os.path.join(ROOT, "tools", "brand_veto.txt")
SCAN_EXT = (".html", ".md", ".txt", ".json", ".xml")


def load():
    out = []
    for line in open(VETO_FILE, encoding="utf-8"):
        line = line.split("#", 1)[0].strip().lower()
        if line:
            out.append(line)
    return out


def main():
    if not os.path.exists(VETO_FILE):
        print("FAIL check_brand_veto: tools/brand_veto.txt is missing — the veto "
              "list is the gate's only input, so its absence is a failure, not a pass")
        return 1
    veto = load()
    if not veto:
        print("check_brand_veto: veto list is empty, nothing to enforce")
        return 0

    pat = re.compile("|".join(re.escape(b) for b in veto), re.I)
    hits, scanned = [], 0
    for root, _dirs, files in os.walk(SITE):
        for fn in files:
            if not fn.endswith(SCAN_EXT):
                continue
            path = os.path.join(root, fn)
            scanned += 1
            try:
                body = open(path, encoding="utf-8").read()
            except (UnicodeDecodeError, OSError):
                continue
            m = pat.search(body)
            if m:
                rel = os.path.relpath(path, SITE)
                ctx = re.sub(r"\s+", " ", body[max(0, m.start() - 60):m.end() + 60])
                hits.append(f"{rel}: publishes vetoed brand {m.group(0)!r} — …{ctx}…")

    print(f"check_brand_veto: {len(veto)} vetoed brand(s), {scanned} published file(s) scanned")
    if hits:
        print("FAIL check_brand_veto:")
        for h in hits[:20]:
            print("  -", h)
        return 1
    print("check_brand_veto OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
