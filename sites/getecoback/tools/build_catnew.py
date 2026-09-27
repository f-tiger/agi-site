#!/usr/bin/env python3
"""List a category's newest guides on the pages bingbot actually crawls (2026-09-27).

All of this site's search traffic comes from the Bing index family, and on
2026-09-27 bingbot had fetched 2 of the 14 guides published since 09-15 (one
fetch each) while it fetched the same 20-odd older pages every day or two
(D1 crawl log, 14 days: luftentfeuchter-30-qm 17, luftentfeuchter-10-qm 16,
thermovorhang-ratgeber 19, strom-sparen-haushalt 17 …). IndexNow had been told
about every new page on the day it went up (HTTP 200); links from the homepage
(EB_NEWEST) and from one hot page (the season bridge on
mobile-klimaanlage-ueberwintern) had not been enough.

So the newest guides of a category are listed, as plain links with their
dates, on the pages of that category bingbot returns to most. The hub list is
chosen from the crawl log, not guessed, and every hub is on the same subject as
the pages it lists: dehumidifier size pages list the humidity/mould guides,
heating and electricity-cost pages list the heating guides. It changes only
when a new guide is published in that category, and then only on these hubs,
so it does not bring back the whole-site HTML churn that flooded IndexNow
until 09-22.

Idempotent: the block lives between EB_CATNEW markers and is replaced whole.
Run: python3 tools/build_catnew.py [--check]
"""
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import build_structure as bs  # noqa: E402

GUIDE = os.path.join(os.path.dirname(HERE), "site", "guide")
N = 8
LABEL = {"luftqualitaet": "Luftqualität", "heizen": "Heizen"}

# hub slug -> category whose newest guides it lists. Picked from bingbot's
# 14-day crawl counts on 2026-09-27 (numbers in the module docstring); revisit
# when the crawl log shows different hot pages, not on a schedule.
HUBS = {
    "luftentfeuchter-30-qm": "luftqualitaet",
    "luftentfeuchter-10-qm": "luftqualitaet",
    "luftentfeuchter-15-qm": "luftqualitaet",
    "waesche-trocknen-wohnung": "luftqualitaet",
    "thermovorhang-ratgeber": "heizen",
    "klimaanlage-mit-heizfunktion": "heizen",
    "heizung-25-qm": "heizen",
    "infrarotheizung-watt-rechner": "heizen",
    "strom-sparen-haushalt": "heizen",
    "stromkosten-rechner": "heizen",
}

OPEN, CLOSE = "<!--EB_CATNEW-->", "<!--/EB_CATNEW-->"
ANCHOR = "<!--EB_RELATED-->"


def newest_in(cat, exclude):
    rows = [r for r in bs.newest_guides(10_000) if bs.cat_of(r[1]) == cat and r[1] != exclude]
    return rows[:N]


def block(cat, rows):
    lis = "".join(
        f'<li style="margin:5px 0;"><a href="/guide/{slug}.html" style="color:#0f6ba8;font-weight:700;'
        f'text-decoration:none;">{title}</a> <span style="color:#5b6b78;font-size:12.5px;">· '
        f'{d[8:10]}.{d[5:7]}.{d[:4]}</span></li>' for d, slug, title in rows)
    return (OPEN + '<nav class="eb-catnew" aria-label="Neu in ' + LABEL[cat] + '" style="margin:22px 0 8px;'
            'padding:14px 16px;background:#f7fafc;border:1px solid #e4ebf0;border-radius:12px;">'
            '<strong style="display:block;font-size:14px;color:#0a4d7a;margin-bottom:6px;">Neu in ' + LABEL[cat]
            + '</strong><ul style="list-style:none;margin:0;padding:0;font-size:14.5px;">' + lis + '</ul></nav>'
            + CLOSE + "\n")


def apply(html, slug):
    cat = HUBS.get(slug)
    if not cat:
        return re.sub(re.escape(OPEN) + r".*?" + re.escape(CLOSE) + r"\n?", "", html, flags=re.S)
    blk = block(cat, newest_in(cat, slug))
    if OPEN in html:
        return re.sub(re.escape(OPEN) + r".*?" + re.escape(CLOSE) + r"\n?", lambda m: blk, html, flags=re.S)
    if ANCHOR in html:
        return html.replace(ANCHOR, blk + ANCHOR, 1)
    # heizung-N-qm pages are rewritten by differentiate_heizung.py earlier in
    # the chain, and their EB_RELATED block only comes back after this step.
    if "</article>" in html:
        return html.replace("</article>", blk + "</article>", 1)
    raise SystemExit(f"FAIL build_catnew: {slug} has no {ANCHOR} anchor")


def main():
    changed, missing = 0, [s for s in HUBS if not os.path.exists(os.path.join(GUIDE, s + ".html"))]
    if missing:
        print("FAIL build_catnew: hub page(s) missing: " + ", ".join(missing))
        return 1
    for path in sorted(os.listdir(GUIDE)):
        if not path.endswith(".html"):
            continue
        slug = path[:-5]
        full = os.path.join(GUIDE, path)
        html = open(full, encoding="utf-8").read()
        new = apply(html, slug)
        if apply(new, slug) != new:
            print(f"FAIL build_catnew: second run differs on {slug}")
            return 1
        if new != html:
            changed += 1
            if "--check" not in sys.argv:
                open(full, "w", encoding="utf-8").write(new)
    for cat in sorted(set(HUBS.values())):
        print(f"build_catnew: {LABEL[cat]} newest → " + ", ".join(s for _, s, _ in newest_in(cat, None)))
    print(f"build_catnew: {len(HUBS)} hubs, {changed} page(s) changed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
