#!/usr/bin/env python3
"""Gate: removed pages stay removed and nothing published points at them (2026-09-27).

Owner, 2026-09-27: 「全部下线储能页！」 and 「指南页，排障页，只要是相关的都下架」.
Fourteen storage and balcony-PV pages were deleted; the worker answers 410 for
them (tools/test_gone.mjs checks that). This gate checks the two ways a removal
quietly undoes itself:

  1. a page file reappears — a generator that used to write it runs again (the
     Solarbank guide was written by build_revenue_guide.py on every deploy until
     today; the season teasers and the xlinks table named these pages too);
  2. a published file still links to one — a hand-written body link, a video
     card, a sitemap/feed/llms/search-index entry. Every such link is a click
     into a 410 page, and a sitemap entry for a 410 URL tells Bing the opposite
     of what the worker says.

Scans site/ (html, md, txt, xml, json, js). Matches /guide/<slug>.html and
.md in relative and absolute form. tools/gone_pages.txt is the only input.

Run: python3 tools/check_gone.py [--selftest]
"""
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.join(os.path.dirname(HERE), "site")
LIST = os.path.join(HERE, "gone_pages.txt")
EXT = (".html", ".md", ".txt", ".xml", ".json", ".js", ".mjs")


def load(path=LIST):
    out = []
    for line in open(path, encoding="utf-8"):
        line = line.split("#", 1)[0].strip()
        if line:
            out.append(line)
    return out


def pattern(slugs):
    return re.compile(r"/guide/(" + "|".join(re.escape(s) for s in slugs) + r")\.(?:html|md)\b")


def scan_text(body, pat):
    return [m.group(0) for m in pat.finditer(body)]


def run(site=SITE, slugs=None):
    slugs = slugs or load()
    pat = pattern(slugs)
    errors = []
    for s in slugs:
        for ext in ("html", "md"):
            if os.path.exists(os.path.join(site, "guide", f"{s}.{ext}")):
                errors.append(f"site/guide/{s}.{ext} exists again — some generator re-created a removed page")
    scanned = 0
    for root, _dirs, files in os.walk(site):
        for fn in sorted(files):
            if not fn.endswith(EXT):
                continue
            path = os.path.join(root, fn)
            try:
                body = open(path, encoding="utf-8").read()
            except (UnicodeDecodeError, OSError):
                continue
            scanned += 1
            hits = scan_text(body, pat)
            if hits:
                rel = os.path.relpath(path, site)
                errors.append(f"{rel}: {len(hits)} link(s) to removed pages, e.g. {sorted(set(hits))[:3]}")
    return errors, scanned


def selftest():
    pat = pattern(["balkonspeicher-rechner", "growatt-noah-2000-probleme"])
    cases = [
        ('<a href="/guide/balkonspeicher-rechner.html">x</a>', 1),
        ("https://getecoback.com/guide/growatt-noah-2000-probleme.md", 1),
        ("<loc>https://getecoback.com/guide/growatt-noah-2000-probleme.html</loc>", 1),
        ('<a href="/guide/balkonspeicher-rechner-alt.html">', 0),   # a different slug
        ('<a href="/guide/balkon-terrasse-beschatten.html">', 0),
        ("Growatt NOAH 2000 meldet einen Fehler", 0),              # text is not a link
    ]
    ok = True
    for body, want in cases:
        got = len(scan_text(body, pat))
        if got != want:
            ok = False
            print(f"  selftest FAIL: {body!r}: {got} hit(s), expected {want}")
    print("check_gone selftest", "OK" if ok else "FAILED")
    return 0 if ok else 1


def main():
    if "--selftest" in sys.argv:
        return selftest()
    if not os.path.exists(LIST):
        print("FAIL check_gone: tools/gone_pages.txt is missing")
        return 1
    errors, scanned = run()
    print(f"check_gone: {len(load())} removed page(s), {scanned} published file(s) scanned")
    if errors:
        print(f"FAIL check_gone: {len(errors)} problem(s)")
        for e in errors[:30]:
            print("  -", e)
        return 1
    print("check_gone OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
