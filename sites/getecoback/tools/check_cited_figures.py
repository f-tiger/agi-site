#!/usr/bin/env python3
"""Build gate: a number a tool prints must exist on the page that tool cites.

Origin (2026-08-29): the BTU calculator's result panel shipped
`kwh:"~0,7",eur:"0,21"` for the De'Longhi Pinguino PAC EX105 under a comment
claiming the figures were taken from the model's test page. That page carries no
kWh figure at all — the only "0,7 kWh" on the site belongs to a dehumidifier.
Nobody fabricated it on purpose; the table simply had a column that had to be
filled and nothing checked it. check_adlabel guards disclosure, check_events
guards telemetry, check_faq_parity guards schema — nothing guarded a printed
number against its own cited source.

The check: every result-panel entry that pairs a numeric claim (kwh/eur) with a
`test:` page must have that number present, as the same kind of quantity, on
that page. Numbers are compared as values, not strings ("~1,0 kWh" matches
"rund 1 kWh"), because the site's prose rounds while the table does not.
Exit non-zero = build fails, like the other gates.
"""
import glob, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, "site")

ENTRY_RE = re.compile(r'\{[^{}]*?test:"(?P<test>/[^"]+\.html)"[^{}]*?\}')
FIG_RE = {"kwh": re.compile(r'kwh:"~?([0-9]+(?:,[0-9]+)?)"'),
          "eur": re.compile(r'eur:"~?([0-9]+(?:,[0-9]+)?)"')}
UNIT_ON_PAGE = {"kwh": re.compile(r'([0-9]+(?:,[0-9]+)?)\s*kWh'),
                "eur": re.compile(r'([0-9]+(?:,[0-9]+)?)\s*(?:€|EUR)')}


def num(s):
    return float(s.replace(",", "."))


def main():
    bad, checked = [], 0
    for path in sorted(glob.glob(os.path.join(SITE, "**", "*.html"), recursive=True)):
        html = open(path, encoding="utf-8").read()
        for m in ENTRY_RE.finditer(html):
            entry, test = m.group(0), m.group("test")
            target = os.path.join(SITE, test.lstrip("/"))
            figs = {k: r.search(entry) for k, r in FIG_RE.items()}
            if not any(figs.values()):
                continue
            rel = os.path.relpath(path, ROOT)
            if not os.path.exists(target):
                bad.append(f"{rel}: cites a page that does not exist: {test}")
                continue
            src = open(target, encoding="utf-8").read()
            for kind, hit in figs.items():
                if not hit:
                    continue
                checked += 1
                claimed = num(hit.group(1))
                found = {num(x) for x in UNIT_ON_PAGE[kind].findall(src)}
                if not any(abs(claimed - f) < 0.051 for f in found):
                    bad.append(
                        f"{rel}: prints {kind}={hit.group(1)} citing {test}, "
                        f"but that page carries no matching {kind} figure "
                        f"({'none at all' if not found else 'it has ' + ', '.join(str(f) for f in sorted(found))})")
    if bad:
        print(f"check_cited_figures: {len(bad)} unsourced figure(s):")
        for b in bad:
            print("  " + b)
        print("Fix: use a figure the cited page actually carries, or drop the field "
              "(the renderer must fall back to cls.note, never print 'undefined').")
        return 1
    print(f"check_cited_figures: {checked} tool figures, all present on the page they cite")
    return 0


if __name__ == "__main__":
    sys.exit(main())
