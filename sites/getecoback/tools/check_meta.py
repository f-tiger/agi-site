#!/usr/bin/env python3
"""Gate the two SERP elements the site actually controls (2026-08-31).

Google organic is at zero and GSC lives on the owner's side, so there is no
click-through data to optimise titles against — guessing at wording would be
flying blind and would risk pages that are currently converting. What CAN be
checked without any external data is truncation: a description past ~165
characters or a title past 70 is cut in the result, and the tail is lost.
That is objective, so it is a gate rather than an opinion.

Audit that produced it: 17 descriptions were over the line (all rewritten to
120–155 with the keyword in front and one concrete number kept, per the site's
own page standard) and 4 titles. One title was fixed — the page had no ranking
history to protect. THREE ARE DELIBERATELY LEFT at 66 characters and are the
reason the title bound here is 70, not 65:

    guide/klimaanlage-reinigen.html                  66 — most-cited page (109)
    en/guide/portable-ac-tilt-and-turn-windows.html  66 — 8 clicks/30d, pos ~9
    guide/beste-tragbare-klimaanlage-hitzewelle.html 70 — July CTR rewrite

Rewording a title that is one character over a soft threshold, on a page that
is currently earning citations or clicks, with no CTR data to check the result
against, is a bet with a real downside and no measurable upside. Not doing it
is the point, not an oversight.
"""
import glob, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, "site")
DESC_MAX, TITLE_MAX = 165, 70


def main():
    bad, n = [], 0
    for path in sorted(glob.glob(os.path.join(SITE, "**", "*.html"), recursive=True)):
        rel = os.path.relpath(path, SITE)
        html = open(path, encoding="utf-8").read()
        # widgets are noindex embeds and 404 never appears in a result page
        if rel.startswith("widgets/") or rel == "404.html" or "noindex" in html[:2000]:
            continue
        n += 1
        t = re.search(r"<title>(.*?)</title>", html, re.S)
        d = re.search(r'<meta name="description" content="(.*?)"', html, re.S)
        if not t:
            bad.append(f"{rel}: no <title>")
        elif len(t.group(1)) > TITLE_MAX:
            bad.append(f"{rel}: title {len(t.group(1))} chars (max {TITLE_MAX})")
        if not d:
            bad.append(f"{rel}: no meta description")
        elif len(d.group(1)) > DESC_MAX:
            bad.append(f"{rel}: description {len(d.group(1))} chars (max {DESC_MAX})")
    if bad:
        print(f"check_meta: {len(bad)} SERP element(s) would be truncated:")
        for b in bad[:15]:
            print("  " + b)
        return 1
    print(f"check_meta: {n} indexable pages, no title or description is truncated")
    return 0


if __name__ == "__main__":
    sys.exit(main())
