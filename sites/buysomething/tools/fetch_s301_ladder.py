#!/usr/bin/env python3
"""Section 301 rate ladder, straight from the official USITC HTS export (Chapter 99, subchapter III).

Why (2026-09-16): every duty passport currently ends at `s301: {"status": "verify-on-ustr"}` — a dead end
for both readers and agents. The additional-duty headings (9903.88.xx) ARE machine-readable through the same
keyless API we already use, and each one states its own rate in the schedule's own words. So we can publish
the *ladder* (which heading carries which addition, and which U.S. note defines its list) without ever
asserting that a particular product is covered.

What this deliberately does NOT do: decide whether your HTS8 is on a list. That membership lives in U.S.
note 20 to subchapter III, which USITC publishes as a 14 MB PDF, plus the USTR list annexes. Asserting
membership from anything less is the kind of guess that costs an importer money, so the output carries the
note reference and the USTR link and stops there.

Zero fabrication: `rate_text` is copied verbatim; `additional_rate_pct` is filled only when the text matches
an unambiguous "plus N%" / "+ N%" pattern, and is null otherwise (never inferred from context).
Keep-last-good: on any fetch or parse failure the existing file is left untouched.

Usage: python3 tools/fetch_s301_ladder.py [--selftest]
"""
import datetime as dt
import json
import os
import re
import sys
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.join(HERE, "..", "site")
OUT = os.path.join(SITE, "s301-ladder.json")
SRC = "https://hts.usitc.gov/reststop/exportList?from=9903.88&to=9903.89&format=JSON&styles=false"
SRC_2024 = "https://hts.usitc.gov/reststop/exportList?from=9903.90&to=9903.95&format=JSON&styles=false"
# 只收两段,且每一行都必须自己说是「product of China」并引用对应的 U.S. note:
#   9903.88.xx + note 20 = Section 301 原始四张清单
#   9903.91.xx + note 31 = 2024-09-27 生效的加征(25 / 50 / 100%)
# 同一次导出里还有 9903.94.31(英国乘用车,note 33)这类完全无关的行——按上面两条自动落在外面,
# 这正是「只信文本自己说的」比「按号段猜」安全的地方。
PROGRAMMES = [
    ("9903.88", "20", "Section 301 (China), U.S. note 20 to subchapter III"),
    ("9903.91", "31", "Section 301 increases effective 2024-09-27 (China), U.S. note 31 to subchapter III"),
]
USTR = "https://ustr.gov/issue-areas/enforcement/section-301-investigations/tariff-actions"
UA = {"User-Agent": "Mozilla/5.0 (compatible; sourceradar-s301-ladder; +https://source.agiscorecard.com)", "Accept": "application/json"}

RATE_RE = re.compile(r"(?:plus|\+)\s*([0-9]+(?:\.[0-9]+)?)\s*%", re.I)
# 两种写法都在现行表里出现,且顺序相反:
#   "U.S. note 20(h)"                      → 20(h)
#   "subdivision (d) of U.S. note 31"      → 31(d)     ← 9903.91 段用的是这种
#   "U.S. note 31"(无小节)                 → 31
NOTE_RE = re.compile(r"U\.S\. note (\d+)\(([a-z]{1,3})\)", re.I)
SUBDIV_RE = re.compile(r"subdivision \(([a-z]{1,3})\) of U\.S\. note (\d+)", re.I)
BARE_NOTE_RE = re.compile(r"U\.S\. note (\d+)\b", re.I)
NO_ADD_RE = re.compile(r"^the duty provided in the applicable subheading\s*$", re.I)
# 只在描述**以**「Effective with respect to entries … on or after <日期>」开头时才认:
# 那是这一行自己的生效日。9903.88 段的描述里也常出现日期,但那些是某次排除延期的日期,
# 不是该 heading 的生效日——把它们填进 effective_from 会得到一个看起来精确的错数字。
EFF_RE = re.compile(r"^Effective with respect to entries[^.]*?on or after ([A-Z][a-z]+ \d{1,2}, \d{4})")
CHINA_RE = re.compile(r"product of China", re.I)


def parse_rate(text):
    """Pure. Returns (pct_or_None, kind). Only an unambiguous 'plus N%' yields a number."""
    t = (text or "").strip()
    if not t:
        return None, "empty"
    if NO_ADD_RE.match(t):
        return 0.0, "no additional duty (exclusion or excepted heading)"
    m = RATE_RE.findall(t)
    if len(m) == 1:
        return float(m[0]), "additional ad valorem duty"
    if len(m) > 1:
        return None, "multiple rates in one line — read the schedule text"
    return None, "not an ad valorem addition — read the schedule text"


def parse_notes(desc):
    """Pure. Returns the U.S. note references a heading points at, e.g. ['20(h)'] or ['31(d)']."""
    d = desc or ""
    out = {"%s(%s)" % (a, b.lower()) for a, b in NOTE_RE.findall(d)}
    out |= {"%s(%s)" % (b, a.lower()) for a, b in SUBDIV_RE.findall(d)}
    if not out:
        out = {n for n in BARE_NOTE_RE.findall(d)}
    return sorted(out)


def classify(hts, desc):
    """Pure. Returns the programme label if the row says it is one, else None — never inferred from the number alone."""
    for prefix, note, label in PROGRAMMES:
        if hts.startswith(prefix) and CHINA_RE.search(desc or "") and any(n == note or n.startswith(note + "(") for n in parse_notes(desc)):
            return label
    return None


def build(rows, release=""):
    """Pure given the API rows. Returns the ladder document."""
    out = []
    for r in rows:
        hts = str(r.get("htsno") or "")
        desc = str(r.get("description") or "")
        programme = classify(hts, desc)
        if not programme:
            continue
        text = ""
        for k, v in r.items():
            if "general" in k.lower():
                text = str(v or "")
                break
        pct, kind = parse_rate(text)
        eff = EFF_RE.match(desc.strip())
        out.append({
            "heading": hts,
            "programme": programme,
            "rate_text": text,
            "additional_rate_pct": pct,
            "kind": kind,
            "effective_from": eff.group(1) if eff else None,
            "us_notes": parse_notes(desc),
            "description": desc[:400],
        })
    rates = sorted({x["additional_rate_pct"] for x in out if x["additional_rate_pct"]})
    return {
        "generated": dt.date.today().isoformat(),
        "source": [SRC, SRC_2024],
        "source_kind": "official USITC HTS REST export, Chapter 99 subchapter III",
        "hts_release": release,
        "headings": len(out),
        "additional_rates_seen_pct": rates,
        "coverage_disclaimer": (
            "This is the rate ladder only. Whether a particular HTS8 code is covered by a list is defined in "
            "U.S. note 20 to subchapter III of chapter 99 (USITC publishes it as a PDF) and in the USTR list "
            "annexes; this file does not assert membership for any product."
        ),
        "ustr_lists": USTR,
        "ladder": out,
    }


def selftest():
    assert parse_rate("The duty provided in the applicable subheading plus 25%") == (25.0, "additional ad valorem duty")
    assert parse_rate("The duty provided in the applicable subheading + 7.5%")[0] == 7.5
    assert parse_rate("The duty provided in the applicable subheading")[0] == 0.0
    assert parse_rate("The duty provided in the applicable subheading plus 25% plus 7.5%")[0] is None
    assert parse_rate("No change")[0] is None
    assert parse_rate("")[0] is None
    assert parse_notes("as provided for in U.S. note 20(h) to this subchapter") == ["20(h)"]
    assert parse_notes("U.S. note 20(b) and U.S. note 20(C)") == ["20(b)", "20(c)"]
    assert parse_notes("subdivision (d) of U.S. note 31 to this subchapter") == ["31(d)"]
    assert parse_notes("as provided in U.S. note 31 to this subchapter") == ["31"]
    assert parse_notes("nothing here") == []
    doc = build([
        {"htsno": "9903.88.01", "general": "The duty provided in the applicable subheading plus 25%", "description": "Except as provided in headings 9903.88.05, articles the product of China, as provided for in U.S. note 20(a)"},
        {"htsno": "9903.88.05", "general": "The duty provided in the applicable subheading", "description": "Articles the product of China, as provided for in U.S. note 20(h), exclusion"},
        {"htsno": "9903.91.03", "general": "The duty provided in the applicable subheading + 100%", "description": "Effective with respect to entries on or after September 27, 2024, articles the product of China, as provided for in subdivision (d) of U.S. note 31 to this subchapter"},
        {"htsno": "9903.94.31", "general": "The duty provided in the applicable subheading + 7.5%", "description": "passenger vehicles that are products of the United Kingdom as specified in subdivision (i) of U.S. note 33"},
        {"htsno": "0101.21.00", "general": "Free", "description": "not chapter 99"},
    ], release="test")
    assert doc["headings"] == 3, doc["headings"]
    assert doc["additional_rates_seen_pct"] == [25.0, 100.0], doc["additional_rates_seen_pct"]
    assert doc["ladder"][1]["additional_rate_pct"] == 0.0
    assert doc["ladder"][2]["effective_from"] == "September 27, 2024"
    assert doc["ladder"][0]["effective_from"] is None, "a date mentioned mid-description is not the heading's effective date"
    assert all("United Kingdom" not in x["description"] for x in doc["ladder"]), "UK vehicles row must not be labelled Section 301"
    assert "does not assert membership" in doc["coverage_disclaimer"]
    print("fetch_s301_ladder selftest: OK")


def main(argv):
    if "--selftest" in argv:
        selftest()
        return 0
    try:
        rows, release = [], ""
        for u in (SRC, SRC_2024):
            req = urllib.request.Request(u, headers=UA)
            with urllib.request.urlopen(req, timeout=40) as r:
                rows += json.loads(r.read().decode("utf-8", "replace"))
                release = release or (r.headers.get("x-hts-release") or "")
        doc = build(rows, release)
        if doc["headings"] < 10:
            print("::warning::s301 ladder: only %d headings parsed — keeping last good file" % doc["headings"])
            return 1
    except Exception as e:
        print("::warning::s301 ladder fetch failed (%s) — keeping last good file" % e)
        return 1
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, indent=1)
        f.write("\n")
    print("s301 ladder: %d headings, rates seen %s, release %r" % (doc["headings"], doc["additional_rates_seen_pct"], release))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
