#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Gate for the US marketplace switch (EB_USSWITCH).

The switch is the only thing standing between a North-American reader and a
German storefront they cannot buy from. Its predecessor failed silently: it
carried eleven hand-written German terms, matched none of the terms US readers
actually clicked, and nothing in the build noticed for the four weeks it was
live. A check that cannot go red is worth nothing, so this one asserts the
property that actually broke — coverage of the terms the site really links to,
measured against the pages as built.

Fails when:
  * a rule pattern does not compile, or carries a quote/backslash that would
    terminate the JS string literal it is embedded in;
  * a US target term is empty or non-ASCII (it goes into an amazon.com query);
  * fewer than MIN_COVER per cent of the site's Amazon search links resolve to
    a US term;
  * the emitted block links to any tag other than the US associates tag;
  * a term that names a part, a consumable or an accessory resolves to a whole
    appliance. Found 2026-09-15 on portable-ac-leaking-water, the page that
    takes more of its views from US search than any other here: a reader
    looking for a condensate hose was sent to shop for an air conditioner,
    because the generic 'klimaanlage' rule fired before any hose rule did.
    Coverage alone cannot see this — the term was mapped, just mapped to the
    wrong thing — so the ordering of the rule list is now asserted rather than
    trusted.
"""
import os, re, sys, urllib.parse, collections

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import build_structure as B  # noqa: E402

SITE = os.path.join(os.path.dirname(HERE), "site")
# 2026-09-06 measured coverage is 94.1 %. The gap is deliberate and named:
# balcony solar plants, battery storage and cut-to-size acrylic have no US
# counterpart and keep their amazon.de link. The floor sits below today's
# number so that adding a handful of unmapped terms is allowed, and a new
# unmapped *family* is not.
MIN_COVER = 90.0
LINK_RE = re.compile(r'amazon\.de/s\?k=([^&"\']*)')


def us_term_for(term):
    t = term.lower()
    for pat, out in B.US_SWITCH_RULES:
        if re.search(pat, t):
            return out
    return None


def main():
    bad = []
    for pat, out in B.US_SWITCH_RULES:
        try:
            re.compile(pat)
        except re.error as e:
            bad.append(f"rule pattern does not compile: {pat!r} ({e})")
        for label, val in (("pattern", pat), ("target", out)):
            if '"' in val or "'" in val or "\\" in val:
                bad.append(f"{label} carries a quote or backslash, would break the JS literal: {val!r}")
        if not out.strip():
            bad.append(f"empty US target for pattern {pat!r}")
        if not all(ord(c) < 128 for c in out):
            bad.append(f"non-ASCII US target (goes into an amazon.com query): {out!r}")

    if B.US_TAG in B.USSWITCH.replace(B.US_TAG, "", 1):
        bad.append("USSWITCH names the US tag more than once")
    for tag in re.findall(r"tag=([A-Za-z0-9-]+)", B.USSWITCH):
        if tag != B.US_TAG:
            bad.append(f"USSWITCH links to a non-US tag: {tag}")

    counts = collections.Counter()
    for root in (os.path.join(SITE, "guide"), os.path.join(SITE, "en", "guide")):
        for fn in sorted(os.listdir(root)) if os.path.isdir(root) else []:
            if not fn.endswith(".html"):
                continue
            html = open(os.path.join(root, fn), encoding="utf-8").read()
            for raw in LINK_RE.findall(html):
                term = urllib.parse.unquote_plus(raw.replace("&amp;", "&")).strip()
                if term:
                    counts[term] += 1

    total = sum(counts.values())
    if not total:
        bad.append("no amazon.de search links found — the scan is broken, not the site")
    else:
        unmapped = {t: n for t, n in counts.items() if not us_term_for(t)}
        covered = total - sum(unmapped.values())
        pct = covered * 100.0 / total
        print(f"US switch coverage: {covered}/{total} links = {pct:.1f}% "
              f"({len(counts)} distinct terms, {len(unmapped)} unmapped)")
        for t, n in sorted(unmapped.items(), key=lambda kv: -kv[1])[:12]:
            print(f"  unmapped  {n:4d}x  {t}")
        if pct < MIN_COVER:
            bad.append(f"coverage {pct:.1f}% is below the {MIN_COVER}% floor")

    # --- parts must not resolve to appliances -------------------------------
    # The rule list is ordered and first match wins, so a broad appliance
    # pattern placed above a narrow part pattern silently swallows it. Every
    # term the site actually links to is re-classified here from its German
    # wording, and a part that lands on an appliance is an error.
    PART_RE = re.compile(
        r"schlauch|filter|dichtung|abdicht|adapter|reiniger|lamellenkamm|"
        r"k\u00fchlrippen|entkalker|schaumstoffband|hohlkammerplatte|xps platte|"
        r"kondensatpumpe|ersatz|klett|abluftd\u00fcse|abdeckhaube|antivibrationsmatte|"
        r"k\u00fchlakku|zubeh\u00f6r")
    APPLIANCE = {
        "portable air conditioner", "dehumidifier", "space heater", "room fan",
        "air purifier", "window air conditioner", "tower fan", "pedestal fan",
        "ceiling fan", "12v fan", "evaporative air cooler",
        "ductless mini split heat pump", "rv rooftop air conditioner",
    }
    for term in sorted(counts):
        us = us_term_for(term)
        if us in APPLIANCE and PART_RE.search(term.lower()):
            bad.append(f"part term {term!r} resolves to the appliance {us!r} "
                       f"— move its rule above the appliance rule")

    if bad:
        print("\nFAIL check_usswitch:")
        for b in bad:
            print("  -", b)
        return 1
    print("check_usswitch OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
