#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Gate: no energy-storage or balcony-PV product is sold anywhere on the built site (2026-09-27).

Owner instruction 2026-09-27: 「eco站点下架所有储能产品」. Before this there were
108 storage links on 14 pages — the shared storage shelf (grid, top strip, exit
prompt), three context shelves, five hand-written body links, a category-hub
card, and a calculator whose result built an Amazon link for whichever battery
fitted. Removing them at the source is the fix; this gate is what keeps them
removed. The last veto on this site (EcoFlow, 2026-08-28) was honoured in the
one place a human edited and nowhere else — the lesson of check_brand_veto.py
is that a veto has to be asserted on the output.

Two shapes are checked, because a storage link can exist in two ways:
  1. a literal Amazon URL (href, or a URL string inside a script) whose query or
     path names a storage product;
  2. a script that builds Amazon links at runtime (it mentions "amazon.") and
     carries a storage product in a string literal shaped like a search term
     (no spaces, words joined by '+') — the old calculator did exactly this:
     term="Zendure+SolarFlow+800+Pro", then amazon(term). A URL scan alone
     would never have seen it. Prose literals in the same script ("Ersparnis
     ohne Speicher") are result text, not a shelf, and are left alone — the
     first version of this gate flagged them and would have taught people to
     ignore it.

Text is deliberately not checked. The storage guides stay online and may name
these devices; a Growatt troubleshooting page has to say "Growatt NOAH". What
may not exist is a link or a card that sells one.

Run: python3 tools/check_storage_veto.py [--selftest]
"""
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import storage_veto  # noqa: E402

SITE = os.path.join(os.path.dirname(HERE), "site")
AMAZON_URL = re.compile(r"""https?://(?:www\.)?amazon\.[a-z.]{2,12}/[^\s"'<>)\\]*""", re.I)
SCRIPT = re.compile(r"<script\b[^>]*>(.*?)</script>", re.S | re.I)
SEARCH_TERM = re.compile(r"^[^\s+]+(\+[^\s+]+)+$")
# {0,…} not {2,…}: an empty literal ("") must still consume its two quotes, or
# the pairing slips by one and `model="";term="Balkonkraftwerk+Speicher+1+kWh"`
# is read as the literal ";term=" — the storage term then hides between pairs.
LITERAL = re.compile(r'"((?:[^"\\\n]|\\.){0,200})"|\'((?:[^\'\\\n]|\\.){0,200})\'')


def scan(body, veto):
    hits = []
    for m in AMAZON_URL.finditer(body):
        url = re.sub(r"[?&](amp;)?tag=[^&\s\"']*", "", m.group(0))
        t = storage_veto.is_storage(url, veto)
        if t:
            hits.append(f"Amazon link sells a storage product ({t!r}): {m.group(0)[:110]}")
    for sm in SCRIPT.finditer(body):
        code = sm.group(1)
        if "amazon." not in code.lower():
            continue
        for lm in LITERAL.finditer(code):
            lit = lm.group(1) or lm.group(2) or ""
            if AMAZON_URL.search(lit) or not SEARCH_TERM.match(lit):
                continue  # URLs were judged above; prose is not a shelf
            t = storage_veto.is_storage(lit, veto)
            if t:
                hits.append(f"script builds Amazon links and carries storage term {t!r}: {lit[:90]!r}")
    return hits


def run(site=SITE, veto=None):
    veto = veto or storage_veto.load()
    hits, scanned = [], 0
    for root, _dirs, files in os.walk(site):
        for fn in sorted(files):
            if not fn.endswith((".html", ".js", ".mjs")):
                continue
            path = os.path.join(root, fn)
            try:
                body = open(path, encoding="utf-8").read()
            except (UnicodeDecodeError, OSError):
                continue
            scanned += 1
            for h in scan(body, veto):
                hits.append(f"{os.path.relpath(path, site)}: {h}")
    return hits, scanned


def selftest():
    veto = storage_veto.load()
    ok = True
    cases = [
        # (input, should be storage)
        ("https://www.amazon.de/s?k=balkonkraftwerk+speicher&tag=getecoback-21", True),
        ("Anker+Solix+Solarbank+2+E1600+Pro", True),
        ("Zendure%20SolarFlow%20800%20Pro", True),
        ("Growatt+NOAH+2000", True),
        ("Marstek Venus E", True),
        ("Jackery Explorer 1000", True),
        ("nachtspeicherofen", False),
        ("warmwasserspeicher+elektrisch", False),
        ("energiekostenmessger%C3%A4t+steckdose", False),
        # Balcony PV joined the list with the page takedown (2026-09-27); balcony
        # shade and "without a balcony" did not.
        ("balkonkraftwerk+halterung+gitterbalkon", True),
        ("Steckersolar 800 W", True),
        ("sonnensegel+balkon", False),
        ("klimaanlage+ohne+balkon", False),
        ("wlan+steckdose+strommessung", False),
        ("akku+heizl%C3%BCfter+makita", False),
    ]
    for text, want in cases:
        got = bool(storage_veto.is_storage(text, veto))
        if got != want:
            ok = False
            print(f"  selftest FAIL: is_storage({text!r}) = {got}, expected {want}")
    pages = [
        # (name, html, should fail)
        ("shelf link", '<a href="https://www.amazon.de/s?k=Marstek+Venus+E&amp;tag=getecoback-21">x</a>', True),
        ("JS-built link after an empty literal",
         '<script>model="";term="Balkonkraftwerk+Speicher+1+kWh";a.href="https://www.amazon.de/s?k="+term;</script>', True),
        ("JS-built link",
         '<script>var term="Zendure+SolarFlow+800+Pro";a.href="https://www.amazon.de/s?k="+term;</script>', True),
        ("text mention only", "<p>Die Growatt NOAH 2000 meldet Fehler 404.</p>", False),
        ("storage word in a script with no Amazon", '<script>var t="Balkonspeicher";</script>', False),
        ("result prose in an Amazon-building script",
         '<script>h+="Ersparnis/Jahr mit Speicher";a.href="https://www.amazon.de/s?k="+q;</script>', False),
        ("non-storage link", '<a href="https://www.amazon.de/s?k=energiekostenmessger%C3%A4t">x</a>', False),
        ("heater that stores heat", '<a href="https://www.amazon.de/s?k=nachtspeicherofen">x</a>', False),
    ]
    for name, body, want in pages:
        got = bool(scan(body, veto))
        if got != want:
            ok = False
            print(f"  selftest FAIL: {name}: flagged={got}, expected {want}")
    print("check_storage_veto selftest", "OK" if ok else "FAILED")
    return 0 if ok else 1


def main():
    if "--selftest" in sys.argv:
        return selftest()
    if not os.path.exists(storage_veto.VETO_FILE):
        print("FAIL check_storage_veto: tools/storage_veto.txt is missing — the list is the "
              "gate's only input, so its absence is a failure, not a pass")
        return 1
    hits, scanned = run()
    print(f"check_storage_veto: {scanned} published file(s) scanned")
    if hits:
        print(f"FAIL check_storage_veto: {len(hits)} storage product link(s) on the site")
        for h in hits[:25]:
            print("  -", h)
        return 1
    print("check_storage_veto OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
