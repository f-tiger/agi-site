#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Give the homepage the one thing a machine can actually quote.

Why the homepage specifically (2026-09-17). Of 190 ChatGPT-User fetches in 28
days, 157 landed on "/" — 83%. Individual guides got one to five each. The
homepage is this site's largest AI surface by a factor of thirty, and it is the
page most likely to be the thing an assistant reads when someone asks it a
room-climate question.

What it offered a machine was four illustrated tiles and prose. No table. The
house citation playbook is blunt about this: a table is a citation magnet,
because structured rows survive being lifted into an answer while prose does
not.

So this renders the site's own published sizing ladders as one compact table,
generated from site/sizing-data.json — the same CC BY dataset behind
/daten.html. Nothing here is typed by hand, so the homepage cannot drift from
the dataset, and every row links to the page that derives it.

Idempotent: the block lives between EB_HOMETABLE markers and is replaced whole.

Run: python3 tools/build_home_table.py
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, "site")
DATA = os.path.join(SITE, "sizing-data.json")
PAGE = os.path.join(SITE, "index.html")
OPEN, CLOSE = "<!--EB_HOMETABLE-->", "<!--/EB_HOMETABLE-->"
ANCHOR = "<!--EB_DEVICE_TILES-->"


def main():
    if not os.path.exists(DATA):
        print("no sizing-data.json — run tools/build_agent_md.py first", file=sys.stderr)
        return 1
    d = json.load(open(DATA, encoding="utf-8"))
    rules, ladders = d["rules"], d["ladders"]

    # Index the three ladders by room size so one row can carry all three
    # answers. Sizes present in any ladder become rows; a gap stays a dash
    # rather than an invented figure.
    cool = {r["m2"]: r["btu_class"] for r in ladders["cooling_btu"]}
    dehum = {r["m2"]: r["liters_per_day"] for r in ladders["dehumidifier_l_per_day"]}
    heat = {r["m2"]: r["watt"] for r in ladders["heating_watt"]}
    guide = {}
    for r in ladders["dehumidifier_l_per_day"]:
        guide.setdefault(r["m2"], {})["dehum"] = r["guide"].replace("https://getecoback.com", "")
    for r in ladders["cooling_btu"]:
        guide.setdefault(r["m2"], {})["cool"] = r["guide"].replace("https://getecoback.com", "")
    for r in ladders["heating_watt"]:
        guide.setdefault(r["m2"], {})["heat"] = r["guide"].replace("https://getecoback.com", "")

    sizes = sorted(set(cool) | set(dehum) | set(heat))
    rows = []
    for m2 in sizes:
        g = guide.get(m2, {})
        c = f'<a href="{g["cool"]}">{cool[m2]}</a>' if m2 in cool else "—"
        dh = f'<a href="{g["dehum"]}">{dehum[m2]} l/Tag</a>' if m2 in dehum else "—"
        ht = f'<a href="{g["heat"]}">{heat[m2]} W</a>' if m2 in heat else "—"
        rows.append(f"<tr><th scope=\"row\" style=\"text-align:left;\">{m2} m²</th>"
                    f"<td>{c}</td><td>{dh}</td><td>{ht}</td></tr>")

    block = (
        f'{OPEN}<section style="padding:10px 0 30px;background:#f7fafc;">'
        f'<div style="max-width:1000px;margin:0 auto;padding:0 20px;">'
        f'<h2 style="font-size:21px;margin:0 0 4px;">Richtwerte nach Raumgröße</h2>'
        f'<p style="margin:0 0 12px;color:#5b6b78;font-size:13.5px;">'
        f'Die Zahlen, mit denen unsere Rechner arbeiten — '
        f'{rules["cooling_btu_per_m2"]} BTU/h je m² zum Kühlen, '
        f'{rules["heating_w_per_m2_insulated"][0]}–{rules["heating_w_per_m2_insulated"][1]} W je m² zum Heizen, '
        f'Schimmelgefahr ab {rules["mould_threshold_rh_percent"]} % relativer Luftfeuchte. '
        f'Stand {d["dateModified"]}, frei nachnutzbar als '
        f'<a href="/daten.html">offener Datensatz</a>.</p>'
        f'<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;'
        f'font-size:14.5px;background:#fff;">'
        f'<caption style="caption-side:bottom;text-align:left;font-size:12.5px;color:#5b6b78;'
        f'padding-top:8px;">Faustregeln, keine Norm. Hersteller-Liter/Tag sind bei 30 °C/80 % rF '
        f'gemessen; real liegt der Entzug oft bei etwa der Hälfte.</caption>'
        f'<tr><th style="text-align:left;background:#f0f5f9;padding:8px 10px;border:1px solid #e4ebf0;">Raum</th>'
        f'<th style="text-align:left;background:#f0f5f9;padding:8px 10px;border:1px solid #e4ebf0;">Kühlen</th>'
        f'<th style="text-align:left;background:#f0f5f9;padding:8px 10px;border:1px solid #e4ebf0;">Entfeuchten</th>'
        f'<th style="text-align:left;background:#f0f5f9;padding:8px 10px;border:1px solid #e4ebf0;">Heizen</th></tr>'
        + "".join(rows).replace("<td>", '<td style="padding:8px 10px;border:1px solid #e4ebf0;">')
                       .replace('<th scope="row" style="text-align:left;">',
                                '<th scope="row" style="text-align:left;padding:8px 10px;border:1px solid #e4ebf0;background:#fbfdfe;">')
        + f'</table></div></div></section>{CLOSE}')

    html = open(PAGE, encoding="utf-8").read()
    if OPEN in html:
        out = re.sub(re.escape(OPEN) + r".*?" + re.escape(CLOSE), lambda m: block, html, flags=re.S)
    elif ANCHOR in html:
        out = html.replace(ANCHOR, block + "\n" + ANCHOR, 1)
    else:
        print("no anchor on the homepage — not injecting blind", file=sys.stderr)
        return 1
    changed = out != html
    if changed:
        open(PAGE, "w", encoding="utf-8").write(out)
    print(f"{'wrote' if changed else 'unchanged'} homepage table: {len(rows)} room sizes "
          f"from sizing-data.json ({d['dateModified']})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
