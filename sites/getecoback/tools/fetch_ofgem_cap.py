#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""The UK electricity unit rate, from Ofgem, with its period attached.

Why this exists (2026-09-17). Every running-cost figure on this site is
arithmetic: watts / 1000 x hours x the rate you pay. That is honest and
checkable, and it is also why the site cannot serve a UK reader from the
German pages — the German pages assume EUR 0,30/kWh, and the UK rate is set by
the Ofgem price cap, quoted in pence, and changed every three months.

A number that changes quarterly must never be typed into a page by hand. It
would be right for one quarter and quietly wrong for every quarter after, on a
site whose entire claim is that its figures can be checked.

Source: ofgem.gov.uk, the "Energy price cap unit rates and standing charges"
page, Direct Debit column. Parsed, not guessed: the parser looks for the period
heading and the pence-per-kWh figures under it, and if the page's shape changes
it fails loudly and keeps the previous file rather than inventing a rate.

Reading the output:
  * `electricity_p_per_kwh` is the unit rate only. The standing charge is a
    daily fixed cost and is deliberately NOT folded into it — an appliance's
    running cost is unit rate times kilowatt-hours, and adding a standing
    charge to it would overstate what running the appliance costs.
  * `period` is the cap window. Any page quoting the rate must print it, so a
    reader in the next quarter can see the figure is from the previous one.
  * `vat_note` carries whatever Ofgem says about VAT in the period, because it
    has changed and it changes the arithmetic.

Run: python3 tools/fetch_ofgem_cap.py     (keep-last-good, no schedule)
"""
import html
import json
import os
import re
import sys
import urllib.request
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "ofgem-cap.json")
URL = ("https://www.ofgem.gov.uk/your-energy-supply/your-energy-bill/"
       "energy-price-cap-unit-rates-and-standing-charges")
UA = "Mozilla/5.0 (compatible; getecoback-research/1.0; +https://getecoback.com/)"


def text_of(page):
    t = re.sub(r"<(script|style)\b.*?</\1>", " ", page, flags=re.S)
    t = re.sub(r"</t[dh]>", " | ", t)
    t = re.sub(r"</tr>", "\n", t)
    t = re.sub(r"<[^>]+>", " ", t)
    t = html.unescape(t)
    # Ofgem separates the figure from its unit with non-breaking and narrow
    # no-break spaces, and not consistently: "26.11 pence" is a plain space,
    # "26.32\xa0pence" is not. A first version matched only one of the two
    # columns because of it — which is precisely the "silently reads the wrong
    # period" failure the assertion below exists to catch, and it caught it.
    return t.replace("\xa0", " ").replace(" ", " ").replace(" ", " ")


def parse(page):
    t = text_of(page)
    flat = re.sub(r"[ \t]+", " ", t)

    # The cap period, e.g. "Energy price cap from 1 October to 31 December 2026".
    m = re.search(r"Energy price cap from (\d{1,2} \w+ (?:\d{4} )?to \d{1,2} \w+ \d{4})", flat)
    if not m:
        raise ValueError("could not find the cap period heading")
    period = m.group(1)

    # The annual cap level, for context only — never used in appliance maths.
    lvl = re.search(r"price cap will be £([\d,]+) per year", flat)

    # Ofgem prints the outgoing period first and the incoming one second. Take
    # the LAST electricity unit rate on the page, which is the current period's;
    # asserting there are exactly two stops a layout change from silently
    # handing us the wrong column.
    rates = re.findall(r"(\d{1,2}\.\d{2}) pence per kWh", flat)
    if len(rates) < 2:
        raise ValueError(f"expected at least two pence-per-kWh figures, found {len(rates)}")
    # Electricity figures come before gas ones and are the larger pair; pick the
    # electricity pair explicitly rather than by position.
    elec = [float(r) for r in rates if float(r) > 15]
    if len(elec) < 2:
        raise ValueError(f"could not identify the electricity pair among {rates}")
    current, previous = elec[1], elec[0]

    stand = re.findall(r"(\d{1,3}\.\d{2}) pence daily standing charge", flat)
    standing = float(stand[1]) if len(stand) > 1 else None

    vat = re.search(r"(There is no VAT on electricity[^.]*\.)", flat)

    return {
        "source": URL,
        "period": period,
        "electricity_p_per_kwh": current,
        "electricity_p_per_kwh_previous_period": previous,
        "electricity_standing_charge_p_per_day": standing,
        "cap_level_gbp_per_year": int(lvl.group(1).replace(",", "")) if lvl else None,
        "payment_method": "Direct Debit",
        "vat_note": vat.group(1).strip() if vat else None,
        "note": ("Unit rate only. The daily standing charge is a fixed cost and is "
                 "excluded on purpose: an appliance's running cost is the unit rate "
                 "times the kilowatt-hours it uses."),
    }


def main():
    req = urllib.request.Request(URL, headers={"User-Agent": UA})
    try:
        page = urllib.request.urlopen(req, timeout=40).read().decode("utf-8", "replace")
        doc = parse(page)
    except Exception as e:
        print(f"ofgem fetch/parse FAILED: {str(e)[:200]}", file=sys.stderr)
        if os.path.exists(OUT):
            print("keeping the previous file (keep-last-good) — no rate invented", file=sys.stderr)
            return 0
        print("and there is no previous file, so nothing is written", file=sys.stderr)
        return 1

    doc["fetched"] = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    prev = json.load(open(OUT, encoding="utf-8")) if os.path.exists(OUT) else {}
    if prev.get("electricity_p_per_kwh") and prev["electricity_p_per_kwh"] != doc["electricity_p_per_kwh"]:
        print(f"::warning::Ofgem rate changed {prev['electricity_p_per_kwh']} -> "
              f"{doc['electricity_p_per_kwh']} p/kWh — rebuild the UK pages")
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, indent=1)
        f.write("\n")
    print(f"ofgem: {doc['electricity_p_per_kwh']} p/kWh ({doc['period']}), "
          f"cap £{doc['cap_level_gbp_per_year']}/yr")
    return 0


if __name__ == "__main__":
    sys.exit(main())
