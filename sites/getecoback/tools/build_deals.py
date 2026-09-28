#!/usr/bin/env python3
"""EB_DEALS: a short band about the next Amazon.de shopping event, on the pages
that already carry a shelf (2026-09-24, owner: 「eco如何突破商业营收」).

Why this exists. Every euro this site has earned is a product commission, and a
product commission needs a reader who is about to buy an appliance. In September
that is almost nobody: PartnerNet 01.–14.09. shows 56 clicks and €1,61, i.e.
€0,03 per click, a third of August. Amazon also pays a fixed bounty that does not
depend on a product purchase: €3 per Prime free trial started through our tag
(partnernet.amazon.de/promotion/prime). One trial is worth about a hundred
September clicks.

The honest limit on that: a reader only has a reason of their own to want Prime
when something is Prime-only. The Prime Deal Days are (Amazon: "exklusiv für
Prime-Mitglieder"). So the trial link appears only for events marked prime_only,
only between show_from and the event's end, and never year-round.

Contract
  * Dates, quotes and sources live in data/deal-calendar.json; an event renders
    only when announced is true and a primary source is recorded. Nothing here
    forecasts a date.
  * The band ships `hidden` and is revealed only for readers in Germany or
    Austria by time zone (amazon.de Prime is theirs) and only before the event's
    end, so a page that stops being redeployed cannot keep advertising a finished
    event.
  * It carries no product link and no price. The one Amazon link is the Prime
    trial, labelled as an ad at the label position, with the bounty disclosed.
  * A click fires `bounty_click`. The page trackers also log it as an
    affiliate_click (any amazon.de link does); product-click readings exclude
    link_url LIKE '%primegratistesten%'.
  * Out of window the block is removed, not left behind (every conditional
    injector needs its strip branch; see strip_heatnow, 2026-09-09).
  * No <h2>: the TOC is rebuilt from headings and must not change with the date.

Run: python3 tools/build_deals.py [--today=YYYY-MM-DD] [--selftest]
"""
import datetime as dt
import glob
import html
import json
import os
import re
import sys
from zoneinfo import ZoneInfo

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SITE = os.path.join(ROOT, "site")
CAL = os.path.join(ROOT, "data", "deal-calendar.json")
BERLIN = ZoneInfo("Europe/Berlin")
ANCHOR = "<!--/EB_TOPPICK-->"
BLOCK_RE = re.compile(r"<!--EB_DEALS-->.*?<!--/EB_DEALS-->\n?", re.S)
PANGV = "https://www.gesetze-im-internet.de/pangv_2022/__11.html"
TZ_RE = r"^Europe\/(Berlin|Vienna|Busingen)$"

# One line per shelf family, each a claim the site already makes elsewhere:
# the 70 % surface threshold (fenster-beschlagen-innen, schimmel-am-fenster) and
# "2.000 W bleiben 2.000 W" (heizluefter-stromsparend). Families without a line
# that is true for them get none.
FAMILY_LINE = {
    "dehum": ("Hygrometer schon über 70 %? Dann nicht auf den Rabatt warten: "
              "ab da geht es um die Wand, nicht um ein paar Euro."),
    "heater": ("Ein Rabatt macht kein Heizgerät sparsamer: Watt mal Stunden mal "
               "Strompreis bleibt."),
}


def load_calendar(path=CAL):
    return json.load(open(path, encoding="utf-8"))


def active_event(cal, today):
    live = []
    for ev in cal.get("events", []):
        if not ev.get("announced") or not ev.get("source") or not ev.get("show_from"):
            continue
        if dt.date.fromisoformat(ev["show_from"]) <= today <= dt.date.fromisoformat(ev["end"]):
            live.append(ev)
    return min(live, key=lambda e: e["start"]) if live else None


def until_iso(ev):
    end = dt.date.fromisoformat(ev["end"]) + dt.timedelta(days=1)
    return dt.datetime(end.year, end.month, end.day, tzinfo=BERLIN).isoformat()


def family_of(rel):
    """Shelf family of a page, from the same classifier build_structure uses."""
    if not rel.startswith("guide/"):
        return None
    sys.path.insert(0, HERE)
    from build_structure import device_of
    return device_of(os.path.basename(rel)[:-5])


def render(ev, cal, family):
    e = lambda s: html.escape(s, quote=True)
    lines = [f'<p style="margin:0 0 5px;"><strong>{e(ev["name"])} am {e(ev["date_text"])}</strong>'
             + (', laut Amazon nur für Prime-Mitglieder.</p>' if ev.get("prime_only") else ', laut Amazon.</p>')]
    # The source is cited in words, not linked: aboutamazon.de contains
    # "amazon.", so every page tracker on this site would log a click on it as
    # an affiliate_click. The URL stays in the calendar file.
    if FAMILY_LINE.get(family):
        lines.append(f'<p style="margin:0 0 5px;">{FAMILY_LINE[family]}</p>')
    lines.append('<p style="margin:0 0 7px;">Echter Rabatt? Zu jeder Preisermäßigung gehört der niedrigste Preis '
                 'der letzten 30 Tage '
                 f'(<a href="{PANGV}" rel="noopener" target="_blank" style="color:#0f6ba8;">§ 11 PAngV</a>): '
                 'vergleiche mit dem, nicht mit dem durchgestrichenen.</p>')
    if ev.get("prime_only"):
        b = cal["bounty"]["prime_trial"]
        lines.append(
            f'<p style="margin:0;"><a href="{e(b["url"])}" target="_blank" rel="sponsored noopener" '
            'data-eb-bounty="prime" style="display:inline-block;background:#0f6ba8;color:#fff;font-weight:700;'
            'text-decoration:none;border-radius:8px;padding:6px 12px;margin:0 8px 3px 0;">'
            'Kein Prime? Prime gratis testen →</a>'
            '<span style="font-size:11.5px;color:#6b5d42;">Anzeige · Amazon zahlt uns eine Prämie für den '
            'Gratiszeitraum. Ab wann Prime kostet und wie du kündigst, steht auf der Amazon-Seite.</span></p>')
    script = ('<script>(function(){var b=document.getElementById("eb-deals");if(!b)return;var tz="";'
              'try{tz=Intl.DateTimeFormat().resolvedOptions().timeZone||"";}catch(e){}'
              f'if(!/{TZ_RE}/.test(tz))return;'
              'if(new Date()>=new Date(b.getAttribute("data-until")))return;b.hidden=false;'
              'b.addEventListener("click",function(e){var a=e.target.closest&&e.target.closest("a[data-eb-bounty]");'
              'if(a&&window.gtag)gtag("event","bounty_click",{bounty:a.getAttribute("data-eb-bounty"),'
              f'deal:"{ev["id"]}"}});}});}})();</script>')
    return ('<!--EB_DEALS--><aside id="eb-deals" hidden data-deal="' + e(ev["id"]) + '" data-until="'
            + until_iso(ev) + '" style="max-width:1000px;margin:6px auto 12px;padding:0 20px;">'
            '<div style="background:#fffaf0;border:1px solid #f1e0bd;border-radius:12px;padding:10px 13px;'
            'font-size:13.5px;line-height:1.45;color:#26333d;">' + "".join(lines) + "</div></aside>"
            + script + "<!--/EB_DEALS-->\n")


def apply(page_html, block):
    out = BLOCK_RE.sub("", page_html)
    if block and ANCHOR in out:
        out = out.replace(ANCHOR, ANCHOR + block, 1)
    return out


def targets():
    """German pages that carry a shelf: the homepage and /guide/ (never /en/ or /it/)."""
    pages = [os.path.join(SITE, "index.html")] + sorted(glob.glob(os.path.join(SITE, "guide", "*.html")))
    return [p for p in pages if os.path.exists(p)]


def main(today=None):
    cal = load_calendar()
    today = today or dt.datetime.now(BERLIN).date()
    ev = active_event(cal, today)
    changed = placed = 0
    for p in targets():
        rel = os.path.relpath(p, SITE)
        s = open(p, encoding="utf-8").read()
        block = render(ev, cal, family_of(rel)) if (ev and ANCHOR in s) else ""
        new = apply(s, block)
        placed += bool(block)
        if new != s:
            open(p, "w", encoding="utf-8").write(new)
            changed += 1
    print(f"build_deals: {today} · event {ev['id'] if ev else 'none'} · band on {placed} page(s) · {changed} file(s) changed")
    return 0


def selftest():
    cal = {"bounty": {"prime_trial": {"url": "https://www.amazon.de/primegratistesten?tag=getecoback-21"}},
           "events": [
               {"id": "pdd", "name": "Prime Deal Days", "start": "2026-10-06", "end": "2026-10-07",
                "show_from": "2026-09-29", "announced": True, "prime_only": True, "date_text": "6. und 7. Oktober",
                "source": "https://www.aboutamazon.de/x"},
               {"id": "bf", "name": "Black Friday", "start": "2026-11-27", "end": "2026-11-27",
                "show_from": "2026-11-20", "announced": True, "prime_only": False, "date_text": "27. November",
                "source": "https://www.aboutamazon.de/y"},
               {"id": "rumour", "name": "Rumour", "start": "2026-09-25", "end": "2026-09-30",
                "show_from": "2026-09-20", "announced": False, "prime_only": True, "date_text": "x", "source": ""}]}
    page = "<article><!--EB_TOPPICK-->shelf<!--/EB_TOPPICK-->\n<p>body</p></article>"
    bad = 0

    def ok(name, cond):
        nonlocal bad
        print(("ok   " if cond else "FAIL ") + name)
        bad += not cond

    ok("nothing before show_from", active_event(cal, dt.date(2026, 9, 28)) is None)
    ok("unannounced never renders", active_event(cal, dt.date(2026, 9, 26)) is None)
    ev = active_event(cal, dt.date(2026, 9, 29))
    ok("renders from show_from", ev and ev["id"] == "pdd")
    ok("renders on the last day", (active_event(cal, dt.date(2026, 10, 7)) or {}).get("id") == "pdd")
    ok("gone the day after", active_event(cal, dt.date(2026, 10, 8)) is None)
    b = render(ev, cal, "dehum")
    ok("ships hidden", 'id="eb-deals" hidden' in b)
    ok("prime event carries the trial link", "primegratistesten?tag=getecoback-21" in b and 'data-eb-bounty="prime"' in b)
    ok("ad label at label position", "Anzeige · Amazon zahlt uns eine Prämie" in b)
    ok("family line for dehum", "70 %" in b and "2.000" not in b)
    ok("no heading", "<h2" not in b and "<h3" not in b)
    ok("no link to the source host (trackers match amazon.)", "aboutamazon" not in b)
    ok("expires at midnight Berlin after the end", 'data-until="2026-10-08T00:00:00+02:00"' in b)
    bf = render(active_event(cal, dt.date(2026, 11, 25)), cal, "heater")
    ok("non-Prime event has no trial link", "primegratistesten" not in bf and "Watt mal Stunden" in bf)
    ok("November deadline in winter time", 'data-until="2026-11-28T00:00:00+01:00"' in bf)
    once = apply(page, b)
    ok("inserted right after the shelf", once.index("<!--EB_DEALS-->") == once.index("<!--/EB_TOPPICK-->") + 18)
    ok("idempotent", apply(once, b) == once)
    ok("removed out of window", apply(once, "") == page)
    ok("no anchor, no band", apply("<p>x</p>", b) == "<p>x</p>")
    return 1 if bad else 0


if __name__ == "__main__":
    if "--selftest" in sys.argv:
        sys.exit(selftest())
    today = None
    for a in sys.argv[1:]:
        if a.startswith("--today="):
            today = dt.date.fromisoformat(a.split("=", 1)[1])
    sys.exit(main(today))
