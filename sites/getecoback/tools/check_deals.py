#!/usr/bin/env python3
"""Gate for the deal-calendar band (tools/build_deals.py, 2026-09-24).

The band is the only surface on this site that asks a reader to start a
subscription trial, so the accidents worth catching are the ones that would
make it pushy or untrue:

  calendar  * an announced event without a primary source, quote or date text;
            * show_from more than 14 days before the start — the band would turn
              into year-round Prime advertising;
            * a bounty URL that is not the exact Prime-trial link with our tag.
  built     * the band on a page while no event is live (stale), or missing from
              a shelf page while one is;
            * a band that is not shipped `hidden` (the time-zone gate would be
              bypassed for every reader outside DE/AT);
            * the trial link on a non-Prime event, or any other Amazon link
              inside the band;
            * the band on /en/ or /it/ pages.
An announced-false event starting within 45 days only warns: it is the prompt
for the daily run to look for Amazon's announcement.

Run: python3 tools/check_deals.py [--today=YYYY-MM-DD] [--selftest]
"""
import datetime as dt
import glob
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import build_deals as bd  # noqa: E402

BOUNTY_URL = "https://www.amazon.de/primegratistesten?tag=getecoback-21"
MAX_LEAD_DAYS = 14
WARN_DAYS = 45


def check_calendar(cal, today):
    errors, warnings = [], []
    b = (cal.get("bounty") or {}).get("prime_trial") or {}
    if b.get("url") != BOUNTY_URL:
        errors.append(f"bounty url must be exactly {BOUNTY_URL}, got {b.get('url')!r}")
    if not str(b.get("source", "")).startswith("https://partnernet.amazon.de/"):
        errors.append("bounty needs its PartnerNet source")
    seen = set()
    for ev in cal.get("events", []):
        eid = ev.get("id", "?")
        if eid in seen:
            errors.append(f"{eid}: listed twice")
        seen.add(eid)
        try:
            start, end = dt.date.fromisoformat(ev["start"]), dt.date.fromisoformat(ev["end"])
        except Exception:
            errors.append(f"{eid}: start/end must be ISO dates")
            continue
        if end < start:
            errors.append(f"{eid}: ends before it starts")
        guide_paths = ev.get("guide_paths")
        if guide_paths is not None and (
            not isinstance(guide_paths, dict) or not guide_paths
            or not all(
                re.fullmatch(r"(?:index|guide/[a-z0-9-]+)\.html", rel)
                and isinstance(href, str)
                and re.fullmatch(r"/guide/[a-z0-9-]+\.html#[a-z0-9-]+", href)
                for rel, href in guide_paths.items()
            )
        ):
            errors.append(f"{eid}: guide_paths must map German shelf pages to German guide fragments")
        if ev.get("announced"):
            for k in ("source", "quote", "date_text", "checked"):
                if not ev.get(k):
                    errors.append(f"{eid}: announced without {k}")
            if ev.get("source") and not str(ev["source"]).startswith("https://"):
                errors.append(f"{eid}: source must be an https URL")
            if "show_from" not in ev:
                errors.append(f"{eid}: specify show_from or set it to null for an event without the band")
            elif ev["show_from"] is not None:
                try:
                    sf = dt.date.fromisoformat(ev["show_from"])
                except (TypeError, ValueError):
                    errors.append(f"{eid}: show_from must be an ISO date or null")
                    continue
                if sf > start:
                    errors.append(f"{eid}: show_from after start")
                if (start - sf).days > MAX_LEAD_DAYS:
                    errors.append(f"{eid}: show_from is {(start - sf).days} days before the start "
                                  f"(max {MAX_LEAD_DAYS}) — the band would become standing Prime advertising")
        elif 0 <= (start - today).days <= WARN_DAYS:
            warnings.append(f"{eid} starts {start} ({(start - today).days} d) and is not announced — "
                            "check aboutamazon.de and fill data/deal-calendar.json")
    return errors, warnings


def check_built(pages, ev):
    """pages: {rel: html}. ev: the event live today, or None."""
    errors = []
    guide_paths = (ev.get("guide_paths") or {}) if ev else {}
    for rel in guide_paths:
        if bd.ANCHOR not in pages.get(rel, ""):
            errors.append(f"{rel}: selected deal page has no shelf")
    for rel, s in pages.items():
        blocks = re.findall(r"<!--EB_DEALS-->(.*?)<!--/EB_DEALS-->", s, re.S)
        german = not rel.startswith(("en/", "it/"))
        if blocks and not german:
            errors.append(f"{rel}: deal band on a non-German page")
            continue
        if len(blocks) > 1:
            errors.append(f"{rel}: {len(blocks)} deal bands")
        if ev is None:
            if blocks:
                errors.append(f"{rel}: deal band while no event is live (stale)")
            continue
        expected = bd.applies_to_page(ev, rel)
        if expected and bd.ANCHOR in s and not blocks:
            errors.append(f"{rel}: shelf page without the live deal band")
        if blocks and not expected:
            errors.append(f"{rel}: deal band outside the selected shelf pages")
        for blk in blocks:
            if (buyer_guide := guide_paths.get(rel)) and f'href="{buyer_guide}"' not in blk:
                errors.append(f"{rel}: deal band without the buyer guide link")
            if 'id="eb-deals" hidden' not in blk:
                errors.append(f"{rel}: deal band not shipped hidden")
            if f'data-deal="{ev["id"]}"' not in blk:
                errors.append(f"{rel}: deal band is for another event")
            amazon = re.findall(r'href="(https?://(?:www\.)?amazon\.[^"]*)"', blk)
            if re.search(r'href="[^"]*amazon\.', blk.replace(BOUNTY_URL, "")):
                errors.append(f"{rel}: deal band links another URL containing 'amazon.' — "
                              "the page trackers would log it as an affiliate click")
            if ev.get("prime_only"):
                if amazon != [BOUNTY_URL]:
                    errors.append(f"{rel}: Prime event band must carry exactly the trial link, has {amazon}")
            elif amazon:
                errors.append(f"{rel}: non-Prime event band carries Amazon links {amazon}")
    return errors


def selftest():
    good_ev = {"id": "pdd", "name": "Prime Deal Days", "start": "2026-10-06", "end": "2026-10-07",
               "show_from": "2026-09-29", "announced": True, "prime_only": True, "date_text": "6. und 7. Oktober",
               "source": "https://www.aboutamazon.de/x", "quote": "q", "checked": "2026-09-24"}
    cal = {"bounty": {"prime_trial": {"url": BOUNTY_URL, "source": "https://partnernet.amazon.de/promotion/prime"}},
           "events": [good_ev]}
    today = dt.date(2026, 9, 30)
    bad = 0

    def ok(name, cond):
        nonlocal bad
        print(("ok   " if cond else "FAIL ") + name)
        bad += not cond

    ok("good calendar passes", check_calendar(cal, today) == ([], []))
    recorded = dict(cal, events=[dict(good_ev, show_from=None)])
    ok("confirmed event with no band is recorded", check_calendar(recorded, today) == ([], [])
       and bd.active_event(recorded, dt.date(2026, 10, 6)) is None)
    missing_display = dict(good_ev)
    missing_display.pop("show_from")
    ok("missing display decision is refused", check_calendar(dict(cal, events=[missing_display]), today)[0])
    early = dict(good_ev, show_from="2026-09-01")
    ok("30-day lead is refused", any("standing Prime" in e for e in check_calendar(dict(cal, events=[early]), today)[0]))
    nosrc = dict(good_ev, source="")
    ok("announced without source is refused", check_calendar(dict(cal, events=[nosrc]), today)[0])
    wrong = {"bounty": {"prime_trial": {"url": BOUNTY_URL.replace("getecoback-21", "x-21"),
                                        "source": "https://partnernet.amazon.de/p"}}, "events": []}
    ok("foreign tag on the bounty is refused", check_calendar(wrong, today)[0])
    pend = dict(good_ev, id="bf", announced=False, start="2026-11-01", end="2026-11-01", source="")
    ok("unannounced soon only warns", check_calendar(dict(cal, events=[pend]), today)[0] == []
       and check_calendar(dict(cal, events=[pend]), today)[1])
    band = bd.render(good_ev, {"bounty": {"prime_trial": {"url": BOUNTY_URL}}}, "dehum")
    shelf = "<!--EB_TOPPICK-->x<!--/EB_TOPPICK-->"
    ok("built page with band passes", check_built({"guide/a.html": bd.apply(shelf, band)}, good_ev) == [])
    ok("missing band is caught", check_built({"guide/a.html": shelf}, good_ev))
    ok("stale band is caught", check_built({"guide/a.html": bd.apply(shelf, band)}, None))
    ok("visible band is caught", check_built({"guide/a.html": bd.apply(shelf, band.replace(" hidden", ""))}, good_ev))
    extra = band.replace("</div></aside>", '<a href="https://www.amazon.de/s?k=x&tag=getecoback-21">x</a></div></aside>')
    ok("extra Amazon link is caught", check_built({"guide/a.html": bd.apply(shelf, extra)}, good_ev))
    ok("English page is caught", check_built({"en/guide/a.html": bd.apply(shelf, band)}, good_ev))
    href = "/guide/klimaanlage-wann-kaufen.html#angebot-30-tage-preis"
    scoped = dict(good_ev, prime_only=False, date_prefix="vom", guide_paths={"index.html": href})
    selected = bd.apply(shelf, bd.render(scoped, cal, None, "index.html"))
    ok("scoped deal includes a dated buyer guide link", f'href="{href}"' in selected and " vom " in selected)
    ok("scoped deal only expects the selected shelf", check_built(
        {"index.html": selected, "guide/a.html": shelf}, scoped) == [])
    ok("scoped deal requires the selected shelf", check_built({}, scoped))
    ok("scoped deal rejects a band on another shelf", check_built(
        {"index.html": selected, "guide/a.html": selected}, scoped))
    ok("scoped deal requires the exact buyer guide link", check_built(
        {"index.html": selected.replace(href, "/guide/another.html#fragment")}, scoped))
    invalid = dict(scoped, guide_paths={"index.html": "https://example.org/"})
    ok("scoped deal rejects an external link", check_calendar(dict(cal, events=[invalid]), today)[0])
    return 1 if bad else 0


def main(today):
    cal = bd.load_calendar()
    errors, warnings = check_calendar(cal, today)
    ev = bd.active_event(cal, today)
    pages = {}
    for p in glob.glob(os.path.join(bd.SITE, "**", "*.html"), recursive=True):
        rel = os.path.relpath(p, bd.SITE)
        s = open(p, encoding="utf-8").read()
        if "EB_DEALS" in s or (rel == "index.html" or rel.startswith("guide/")):
            pages[rel] = s
    errors += check_built(pages, ev)
    for w in warnings:
        print(f"::warning::deal calendar: {w}")
    for e in errors:
        print(f"::error::deal band: {e}")
    live = sum("<!--EB_DEALS-->" in s for s in pages.values())
    print(f"check_deals: {today} · event {ev['id'] if ev else 'none'} · band on {live} page(s) · {len(errors)} error(s)")
    return 1 if errors else 0


if __name__ == "__main__":
    if "--selftest" in sys.argv:
        sys.exit(selftest())
    today = bd.dt.datetime.now(bd.BERLIN).date()
    for a in sys.argv[1:]:
        if a.startswith("--today="):
            today = dt.date.fromisoformat(a.split("=", 1)[1])
    sys.exit(main(today))
