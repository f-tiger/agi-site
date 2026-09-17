#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Gate the four category hubs, which are how every guide is found.

Why this exists (2026-09-17). Correcting an invented finding earlier the same
day established that the hubs really do carry crawlable links to all 142
guides — they are the site's discovery layer, not a decoration. Then a retitle
of the storage pages made me read a hub page properly, and two defects had been
sitting on that layer for weeks with nothing able to see them:

  * 124 of 144 card blurbs were a dangling fragment ending in a colon. The
    generator cut the page's meta description at its first ".:!?", and every
    description on this site is written "Keyword vorne: dann die Substanz", so
    the cut kept the keyword and threw away the substance. Two were cut
    mid-abbreviation into "Klimaanlage vs." and "Midea PortaSplit vs.".
  * 17 card titles were double-escaped, so the page showed a literal "&amp;".
    That is the same bug crumb_trust() was fixed for on 2026-09-04; this path
    was simply never checked.

Both are invisible to every other gate and neither breaks a build, which is
precisely why they lasted. So the assertions below are written against the
SHAPE OF THE ACCIDENT and not against the generator: a stub is a stub however
it was produced, and re-running the generator's own function here would be one
of the self-checks this repo has caught itself writing before — one that cannot
fail.

Run: python3 tools/check_hubcards.py
"""
import glob
import html as htmllib
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, "site")
HUBS = os.path.join(SITE, "kategorie", "*.html")
CARD = re.compile(r'<div class="eb-card"><a href="([^"]+)">(.*?)</a><p>(.*?)</p></div>', re.S)
H1 = re.compile(r"<h1[^>]*>(.*?)</h1>", re.S)
DESC = re.compile(r'<meta name="description" content="([^"]*)"')

# A blurb this short is only acceptable when the page's own description really
# is that short. Everything on this site is gated to 120-165 characters.
MIN_BLURB = 40


def text(s):
    return " ".join(htmllib.unescape(re.sub(r"<[^>]+>", "", s)).split())


def main():
    hubs = sorted(glob.glob(HUBS))
    if not hubs:
        print("no category hubs found — nothing to check, which is itself wrong", file=sys.stderr)
        return 1

    bad, cards = [], 0
    for hub in hubs:
        rel = os.path.relpath(hub, SITE)
        raw = open(hub, encoding="utf-8").read()

        # Double-escaping shows up as a literal "&amp;" to the reader. There is
        # no legitimate reason for it on a hub page.
        for m in re.finditer(r"&amp;(?:amp|lt|gt|quot|#\d+);", raw):
            bad.append(f"{rel}: double-escaped entity {m.group(0)!r} — unescape before escaping")

        for url, t_raw, d_raw in CARD.findall(raw):
            cards += 1
            title, blurb = text(t_raw), text(d_raw)
            src = os.path.join(SITE, url.replace("https://getecoback.com/", "").lstrip("/"))
            if not title:
                bad.append(f"{rel}: card for {url} has no title")
            if not blurb:
                bad.append(f"{rel}: card {title!r} has no blurb")
                continue
            if blurb.endswith(":"):
                bad.append(f"{rel}: card {title!r} blurb ends on a colon — {blurb!r}")
            if re.search(r"\b(vs|bzw|ca|z\.\s?B|u\.\s?a)\.$", blurb):
                bad.append(f"{rel}: card {title!r} blurb stops mid-abbreviation — {blurb!r}")
            if not os.path.exists(src):
                bad.append(f"{rel}: card {title!r} points at a missing page ({url})")
                continue

            s = open(src, encoding="utf-8").read()
            d = DESC.search(s)
            if d:
                full = " ".join(htmllib.unescape(d.group(1)).split())
                if len(blurb) < MIN_BLURB <= len(full):
                    bad.append(f"{rel}: card {title!r} blurb is {len(blurb)} chars of a "
                               f"{len(full)}-char description — {blurb!r}")
            h = H1.search(s)
            if h and text(h.group(1)) != title:
                bad.append(f"{rel}: card title drifted from the page h1\n"
                           f"      card: {title!r}\n      h1:   {text(h.group(1))!r}")

    if bad:
        print(f"check_hubcards: {len(bad)} problem(s) across {len(hubs)} hub(s):", file=sys.stderr)
        for b in bad[:20]:
            print("  " + b, file=sys.stderr)
        if len(bad) > 20:
            print(f"  … and {len(bad) - 20} more", file=sys.stderr)
        return 1

    print(f"check_hubcards OK: {cards} cards on {len(hubs)} hubs — no stubs, "
          f"no double-escaping, titles match their page h1")
    return 0


if __name__ == "__main__":
    sys.exit(main())
