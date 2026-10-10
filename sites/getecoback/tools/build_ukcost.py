#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fill the UK running-cost block from data/ofgem-cap.json. Idempotent.

Why an injector and not just typing the table (2026-09-17). The UK unit rate
changes every three months. A hand-written table would be right for one quarter
and silently wrong afterwards, on pages whose entire pitch is "here is the
arithmetic, check it yourself". Same pattern as build_season.py: the number
lives in one file, the pages render it, and check_ukcost.py fails the deploy if
a page ever disagrees with the file.

Every page carrying <!--EB_UKCOST--> gets the same table, with the cap period
printed in it so a reader in the next quarter can see how old the figure is.

Run: python3 tools/build_ukcost.py
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, "site")
CAP = os.path.join(ROOT, "data", "ofgem-cap.json")
CLOSE = "<!--/EB_UKCOST-->"
OPEN_RE = re.compile(r"<!--EB_UKCOST(?::([a-z]+))?-->")

# (label, watts, hours). Wattages are the bands these appliances occupy, not
# claims about any particular model — the page tells the reader to use the
# figure on their own plate. Anything model-specific would be a spec we have
# not verified, and this site does not publish those. A row with watts=None
# carries its kWh directly, for an appliance rated per cycle rather than per
# hour (a tumble dryer's figure is a cycle, not a wattage).
VARIANTS = {
    "dehumidifier": [
        ("Compressor dehumidifier, small", 200, 8),
        ("Compressor dehumidifier, typical", 300, 8),
        ("Desiccant dehumidifier, low setting", 330, 8),
        ("Desiccant dehumidifier, high setting", 650, 8),
    ],
    "airer": [
        ("Heated airer, low-wattage", 100, 8),
        ("Heated airer, mid", 200, 8),
        ("Heated airer, three-tier", 300, 8),
        ("Compressor dehumidifier alongside it", 300, 8),
        ("Airer plus dehumidifier (both at 300 W)", 600, 8),
        ("Tumble dryer, one cycle", None, 2.0),
    ],
}


def block(cap, variant):
    rate = cap["electricity_p_per_kwh"]
    rows = []
    for label, w, h in VARIANTS[variant]:
        if w is None:
            kwh, plate, per_hour = float(h), "per cycle", "—"
        else:
            kwh, plate = w * h / 1000.0, f"{w} W"
            per_hour = f"{w / 1000.0 * rate:.1f}p"
        rows.append(
            f"<tr><td>{label}</td><td>{plate}</td><td>{per_hour}</td>"
            f"<td>{kwh:.1f} kWh</td><td>{kwh * rate / 100:.2f}</td></tr>")
    body = "\n    ".join(rows)
    vat = f" {cap['vat_note']}" if cap.get("vat_note") else ""
    span = "8 hours" if variant != "airer" else "Energy (8 h; dryer: 1 cycle)"
    machine = "Machine" if variant != "airer" else "Example appliance"
    plate = "Plate" if variant != "airer" else "Assumed draw"
    assumptions = comparison = ""
    if variant == "airer":
        assumptions = (
            "  <p>Illustrative fixed-draw examples, not product measurements or matched drying tests. "
            "Eight hours is an assumed runtime, not a promise that a load will be dry. "
            "The dryer row assumes 2.0 kWh for one cycle; use your own cycle measurement or label basis.</p>\n")
        combined_kwh = 2 * 300 / 1000 * 8
        dryer_kwh = 2.0
        comparison = (
            f"  <p>In this example, a 300 W airer plus a 300 W dehumidifier, both running for eight hours, "
            f"use <strong>{combined_kwh:.1f} kWh (£{combined_kwh * rate / 100:.2f})</strong>. "
            f"That is <strong>{combined_kwh / dryer_kwh:.1f} times</strong> the energy of the "
            f"assumed <strong>{dryer_kwh:.1f} kWh (£{dryer_kwh * rate / 100:.2f})</strong> dryer cycle at the same unit rate. "
            "This is an arithmetic comparison, not evidence that either setup dries the same load to the same final dryness.</p>\n")
    return (
        f"<!--EB_UKCOST:{variant}-->\n"
        f"  <p>At the Ofgem price cap for <strong>{cap['period']}</strong>, the average electricity unit rate for "
        f"Direct Debit in England, Scotland and Wales is <strong>{rate}p per kWh</strong>. This is not a Northern Ireland tariff; regional and plan rates vary. Scale the hours to your own run.</p>\n"
        f"{assumptions}"
        f"  <table>\n"
        f"    <tr><th>{machine}</th><th>{plate}</th><th>Per hour</th><th>{span}</th><th>Cost (£)</th></tr>\n"
        f"    {body}\n"
        f"  </table>\n"
        f"{comparison}"
        f"  <p style=\"font-size:13px;color:#5b6b78;\">Unit rate only, standing charge excluded — "
        f"that is a daily fixed cost you pay whether the machine runs or not.{vat} "
        f"Rate from <a href=\"{cap['source']}\" rel=\"nofollow noopener\" target=\"_blank\">Ofgem</a>, "
        f"read {cap['fetched']}. Your tariff may differ; the sum is watts ÷ 1000 × hours × your rate.</p>\n"
        f"{CLOSE}")


def main():
    if not os.path.exists(CAP):
        print("no data/ofgem-cap.json — run tools/fetch_ofgem_cap.py first", file=sys.stderr)
        return 1
    cap = json.load(open(CAP, encoding="utf-8"))
    n = 0
    for root, _dirs, files in os.walk(SITE):
        for fn in files:
            if not fn.endswith(".html"):
                continue
            path = os.path.join(root, fn)
            html = open(path, encoding="utf-8").read()
            m = OPEN_RE.search(html)
            if not m:
                continue
            variant = m.group(1) or "dehumidifier"
            if variant not in VARIANTS:
                print(f"::error::{fn}: unknown EB_UKCOST variant {variant!r}", file=sys.stderr)
                return 1
            new = block(cap, variant)
            out = re.sub(OPEN_RE.pattern + r".*?" + re.escape(CLOSE), lambda _m: new, html, flags=re.S)
            if out != html:
                open(path, "w", encoding="utf-8").write(out)
                n += 1
    print(f"uk cost block: {cap['electricity_p_per_kwh']}p/kWh ({cap['period']}), "
          f"{n} page(s) updated")
    return 0


if __name__ == "__main__":
    sys.exit(main())
