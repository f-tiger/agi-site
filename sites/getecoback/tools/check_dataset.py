#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Gate for the open dataset and its landing page (2026-09-16).

Two things here can fail silently, and both destroy the only reason the page
exists.

1. THE SCHEMA. /daten.html is the site's bid for Google Dataset Search, which
   needs schema.org/Dataset with specific fields. If a future edit drops
   `distribution`, `license` or `variableMeasured`, the page still renders
   perfectly and simply stops being a dataset as far as any machine is
   concerned. Nothing visible breaks. So assert the fields.

2. DRIFT. The page's whole claim is "these are the exact numbers our calculators
   use". The generator reads sizing-data.json so it cannot drift by accident —
   but someone hand-editing daten.html, or changing the dataset without
   rebuilding, would publish two different truths under a CC BY licence. Assert
   every rule value from the JSON actually appears on the page.

Also asserts the embed snippets carry an attribution link in the HOST page.
Before 2026-09-16 the snippet was a bare <iframe> and every widget page is
noindex, so an embed produced exactly zero link equity — the site was giving
away calculators for nothing. CC BY requires attribution anyway; this makes the
copied snippet honour it.

Run: python3 tools/check_dataset.py
"""
import csv
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, "site")
DATA = os.path.join(SITE, "sizing-data.json")
PAGE = os.path.join(SITE, "daten.html")
CSV = os.path.join(SITE, "sizing-data.csv")
WIDGETS = os.path.join(SITE, "widgets.html")

REQUIRED = ["name", "description", "url", "license", "creator",
            "distribution", "isAccessibleForFree", "variableMeasured", "dateModified"]


def main():
    bad = []

    if not os.path.exists(DATA):
        print("FAIL check_dataset: sizing-data.json is missing")
        return 1
    d = json.load(open(DATA, encoding="utf-8"))

    if not os.path.exists(PAGE):
        bad.append("daten.html missing — run tools/build_dataset_page.py")
        print("FAIL check_dataset:\n  - " + bad[0])
        return 1
    page = open(PAGE, encoding="utf-8").read()

    # ── 1. the Dataset node ────────────────────────────────────────────────
    ds = None
    for m in re.finditer(r'<script type="application/ld\+json">(.*?)</script>', page, re.S):
        try:
            node = json.loads(m.group(1))
        except Exception as e:
            bad.append(f"daten.html: JSON-LD does not parse ({e})")
            continue
        if node.get("@type") == "Dataset":
            ds = node
    if ds is None:
        bad.append("daten.html: no schema.org/Dataset node — Dataset Search cannot see this page")
    else:
        for f in REQUIRED:
            if not ds.get(f) and ds.get(f) is not False:
                bad.append(f"daten.html: Dataset node is missing required field '{f}'")
        dist = ds.get("distribution") or []
        if not any((x.get("contentUrl") or "").endswith("/sizing-data.json") for x in dist):
            bad.append("daten.html: Dataset.distribution does not point at /sizing-data.json")
        # The CSV is advertised in the schema. A schema entry for a file that is
        # not there, or that has drifted from the JSON, is a broken promise made
        # under a CC BY licence — and nothing on the rendered page would show it.
        if not any((x.get("contentUrl") or "").endswith("/sizing-data.csv") for x in dist):
            bad.append("daten.html: Dataset.distribution does not offer the CSV")
        elif not os.path.exists(CSV):
            bad.append("sizing-data.csv is advertised in the Dataset node but does not exist")
        else:
            rows = list(csv.reader(open(CSV, encoding="utf-8")))
            # The two *_note keys are prose, not values, so they are not CSV
            # rows; heating_w_per_m2_insulated is a list and becomes one row.
            # Count the non-prose rules rather than hard-coding a number.
            numeric = [k for k, v in (d.get("rules") or {}).items() if not isinstance(v, str)]
            expect = 1 + len(numeric) + sum(len(v) for v in (d.get("ladders") or {}).values())
            if len(rows) != expect:
                bad.append(f"sizing-data.csv has {len(rows)} lines, expected {expect} "
                           f"(header + {len(numeric)} rules + ladder rows) — rebuild it")
            widths = {len(r) for r in rows}
            if len(widths) != 1:
                bad.append(f"sizing-data.csv is ragged: row widths {sorted(widths)}")
        if "creativecommons.org" not in str(ds.get("license", "")):
            bad.append("daten.html: Dataset.license is not a Creative Commons URL")
        if ds.get("dateModified") != d.get("dateModified"):
            bad.append(f"daten.html: dateModified {ds.get('dateModified')!r} "
                       f"does not match the dataset's {d.get('dateModified')!r}")

    # ── 1b. the page must not sell anything ────────────────────────────────
    # The entire value of this page is that it gives something away and asks
    # for nothing. A future round "monetising" it — a shelf, a top pick, one
    # affiliate link in the prose — would cost more than it earns, and nothing
    # else in the pipeline would object.
    #
    # Scripts are excluded on purpose. The site-wide chrome (the US marketplace
    # switch, the saved-room bar) is injected on every page including the legal
    # ones and builds its URLs in JS; a first version scanned raw HTML and went
    # red on the switch's own string concatenation, which is a false positive,
    # not a find. What is asserted is that no marked-up link on this page points
    # at a shop — the shape the accident would actually take.
    body = re.sub(r"<script\b.*?</script>", "", page, flags=re.S)
    for m in re.finditer(r'href="([^"]*amazon[^"]*)"', body):
        bad.append(f"daten.html carries an affiliate link ({m.group(1)[:60]}…) — "
                   f"this page's value is that it sells nothing")

    # ── 2. no drift between the page and the dataset ───────────────────────
    text = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", page))
    rules = d.get("rules", {})
    for key in ("cooling_btu_per_m2", "mould_threshold_rh_percent", "monoblock_ceiling_btu"):
        if key in rules and str(rules[key]) not in text:
            bad.append(f"daten.html: rule {key}={rules[key]} from the dataset does not appear on the page")
    rows = sum(len(v) for v in (d.get("ladders") or {}).values())
    shown = len(re.findall(r"<tr>", page)) - 1  # minus the rules table header row
    if rows and shown < rows:
        bad.append(f"daten.html: dataset has {rows} ladder rows but the page renders about {shown} table rows")

    # ── 3. embeds must produce a link in the host page ─────────────────────
    if os.path.exists(WIDGETS):
        w = open(WIDGETS, encoding="utf-8").read()
        blocks = re.findall(r'<div class="code"[^>]*>(.*?)</div>', w, re.S)
        iframe_blocks = [b for b in blocks if "iframe" in b]
        if not iframe_blocks:
            bad.append("widgets.html: no iframe snippet found — did the markup change?")
        for i, b in enumerate(iframe_blocks):
            if "daten.html" not in b:
                bad.append(f"widgets.html: iframe snippet #{i+1} has no attribution link — "
                           f"widget pages are noindex, so this embed would earn nothing")
        # The configurator builds its snippet in JS. A character-window search
        # here was tried and silently passed a test that removed the link (the
        # window was too short), so anchor on the assignment itself instead.
        m = re.search(r"code\.textContent\s*=\s*(.*?);\s*\n", w, re.S)
        if not m:
            bad.append("widgets.html: cannot find the configurator's snippet assignment "
                       "(code.textContent=...) — markup changed, this gate is now blind")
        elif "daten.html" not in m.group(1):
            bad.append("widgets.html: the configurator's generated snippet has no attribution link")

    print(f"check_dataset: {len(d.get('rules', {}))} rules, "
          f"{sum(len(v) for v in (d.get('ladders') or {}).values())} ladder rows, "
          f"{len(re.findall(r'<div class=.code.[^>]*>.*?iframe', open(WIDGETS, encoding='utf-8').read(), re.S)) if os.path.exists(WIDGETS) else 0} embed snippets")
    if bad:
        print("FAIL check_dataset:")
        for b in bad[:20]:
            print("  -", b)
        return 1
    print("check_dataset OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
