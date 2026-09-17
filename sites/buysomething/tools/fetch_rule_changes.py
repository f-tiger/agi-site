#!/usr/bin/env python3
"""US import rule-change radar, from the official Federal Register API (keyless).

Why (2026-09-16, vertical push): the expensive mistakes in cross-border selling are not arithmetic,
they are *stale rules* — the $800 de minimis, the postal flat duty, the IEEPA tariffs. Each of those
changed on a specific date, in a document with a number, and anyone who kept quoting the old figure did
so because nothing told them it had moved. The Federal Register publishes all of it with a free API, so
this file is the fleet's answer to "what changed, and when": a dated list an agent (or a reader) can diff
against what it believes.

Scope discipline: the queries below are import-duty scope only. Each item keeps the agencies, the document
type, the publication date, the official URL and the FR abstract verbatim — **this script never judges
whether a document matters to you, and never summarises it in its own words.**

Keep-last-good: any fetch failure leaves the previous file untouched (a stale radar that says so beats a
radar that quietly empties itself).

Usage: python3 tools/fetch_rule_changes.py [--selftest]
"""
import datetime as dt
import json
import os
import sys
import time
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.join(HERE, "..", "site")
OUT = os.path.join(SITE, "import-rule-changes.json")
API = "https://www.federalregister.gov/api/v1/documents.json"
UA = {"User-Agent": "Mozilla/5.0 (compatible; sourceradar-rule-radar; +https://source.agiscorecard.com)", "Accept": "application/json"}
WINDOW_DAYS = 120
PER_TERM = 40
# 每条查询都是**关税/进口**范围内的字面词;不加「trade」「commerce」这种会把无关文件卷进来的宽词。
TERMS = ['"section 301"', '"section 232"', '"de minimis exemption"', '"harmonized tariff schedule"']
# 机构白名单 = 这条雷达的**范围声明**,不是对单份文件重要性的判断:
# 只留跨货物通用的进口规则来源(总统令、CBP/DHS、USTR、ITC)。
# 刻意排除 Commerce / International Trade Administration 的反倾销个案公告与外贸区(FTZ)公告 ——
# 它们每周几十份、只对具体产品与具体案号有效,混进来会把「什么规则变了」淹掉。
# 这条排除必须写在输出文件里,读者才知道这里看不到什么。
AGENCIES = {
    "Executive Office of the President",
    "U.S. Customs and Border Protection",
    "Homeland Security Department",
    "Trade Representative, Office of United States",
    "Treasury Department",
}
OUT_OF_SCOPE = ("Case-specific trade-remedy paperwork is deliberately excluded: Commerce/ITA antidumping and countervailing "
                "notices, International Trade Commission investigation and scheduling notices, and Foreign-Trade Zones Board "
                "notices. They run to dozens a week and bind one product in one case; this radar is for the rules that apply "
                "across shipments. Check the ITC and ITA dockets directly if your product is under a case.")
FIELDS = ["document_number", "title", "publication_date", "type", "html_url", "abstract", "agencies"]


def build_url(term, since):
    q = [("per_page", str(PER_TERM)), ("order", "newest"), ("conditions[term]", term), ("conditions[publication_date][gte]", since)]
    q += [("fields[]", f) for f in FIELDS]
    return API + "?" + urllib.parse.urlencode(q)


def normalise(doc, term):
    """Pure: one API row → our row. Abstract kept verbatim (trimmed), never rewritten."""
    ab = (doc.get("abstract") or "").strip().replace("\n", " ")
    if len(ab) > 320:
        ab = ab[:317].rstrip() + "…"
    return {
        "document_number": doc.get("document_number"),
        "date": doc.get("publication_date"),
        "type": doc.get("type"),
        "title": (doc.get("title") or "").strip(),
        "abstract": ab,
        "agencies": [a.get("name") for a in (doc.get("agencies") or []) if a.get("name")],
        "url": doc.get("html_url"),
        "matched": [term.strip('"')],
    }


def in_scope(row):
    """Pure: keep only rows from the import-rule agencies (see AGENCIES for why)."""
    return any(a in AGENCIES for a in row.get("agencies", []))


def where_matched(row):
    """Pure, mechanical, no editorial judgement: did the matched phrase surface in the title/abstract,
    or only somewhere in the full text? Full-text-only matches are the ones that drag in documents about
    something else entirely (a tax rule that happens to cite the HTSUS), so the page lists them separately
    instead of silently dropping or silently promoting them."""
    hay = (row.get("title", "") + " " + row.get("abstract", "")).lower()
    return "title_or_abstract" if any(t.lower() in hay for t in row.get("matched", [])) else "full_text_only"


def merge(rows):
    """Pure: dedupe by document number, union the matched terms, newest first."""
    by = {}
    for r in rows:
        k = r.get("document_number")
        if not k or not r.get("date") or not r.get("url"):
            continue
        if k in by:
            for t in r["matched"]:
                if t not in by[k]["matched"]:
                    by[k]["matched"].append(t)
        else:
            r = dict(r)
            r["matched"] = list(r["matched"])
            by[k] = r
    out = sorted(by.values(), key=lambda r: (r["date"], r["document_number"]), reverse=True)
    for r in out:
        r["matched"].sort()
        r["matched_in"] = where_matched(r)
    return out


def selftest():
    a = normalise({"document_number": "1", "publication_date": "2026-09-14", "type": "Rule", "title": " T ",
                   "abstract": "x" * 400, "agencies": [{"name": "U.S. Customs and Border Protection"}, {}],
                   "html_url": "https://federalregister.gov/d/1"}, '"section 301"')
    assert a["title"] == "T" and a["agencies"] == ["U.S. Customs and Border Protection"]
    assert a["abstract"].endswith("…") and len(a["abstract"]) == 318
    assert a["matched"] == ["section 301"]
    b = normalise({"document_number": "1", "publication_date": "2026-09-14", "type": "Rule", "title": "T",
                   "abstract": "", "agencies": [], "html_url": "https://federalregister.gov/d/1"}, '"de minimis"')
    c = normalise({"document_number": "2", "publication_date": "2026-09-15", "type": "Notice", "title": "U",
                   "abstract": "", "agencies": [], "html_url": "https://federalregister.gov/d/2"}, '"section 232"')
    m = merge([a, b, c])
    assert len(m) == 2, m
    assert m[0]["document_number"] == "2", "newest first"
    assert m[1]["matched"] == ["de minimis", "section 301"], m[1]["matched"]
    assert merge([{"document_number": None, "date": "x", "url": "y", "matched": []}]) == []
    assert in_scope({"agencies": ["U.S. Customs and Border Protection"]}) is True
    assert in_scope({"agencies": ["International Trade Administration", "Commerce Department"]}) is False
    assert in_scope({"agencies": []}) is False
    assert where_matched({"title": "Section 301 action", "abstract": "", "matched": ["section 301"]}) == "title_or_abstract"
    assert where_matched({"title": "Ending Birth Tourism", "abstract": "visas", "matched": ["section 301"]}) == "full_text_only"
    assert m[0]["matched_in"] in ("title_or_abstract", "full_text_only")
    u = build_url('"section 301"', "2026-01-01")
    assert "conditions%5Bterm%5D=%22section+301%22" in u and "gte%5D=2026-01-01" in u, u
    print("fetch_rule_changes selftest: OK")


def main(argv):
    if "--selftest" in argv:
        selftest()
        return 0
    since = (dt.date.today() - dt.timedelta(days=WINDOW_DAYS)).isoformat()
    rows, failed = [], []
    for term in TERMS:
        try:
            with urllib.request.urlopen(urllib.request.Request(build_url(term, since), headers=UA), timeout=40) as r:
                data = json.loads(r.read().decode("utf-8", "replace"))
            for doc in data.get("results", []):
                rows.append(normalise(doc, term))
        except Exception as e:
            failed.append({"term": term.strip('"'), "why": str(e)[:120]})
        time.sleep(1.0)  # 官方 API 没有公布硬限,但每次只打 5 发、逐发间隔 1 秒,不给公共服务添麻烦
    if failed and not rows:
        print("::warning::rule radar: every query failed (%s) — keeping last good file" % failed[0]["why"])
        return 1
    doc = {
        "generated": dt.date.today().isoformat(),
        "source": "https://www.federalregister.gov/developers/documentation/api/v1 (official Federal Register API, keyless)",
        "window_days": WINDOW_DAYS,
        "since": since,
        "queries": [t.strip('"') for t in TERMS],
        "agencies_kept": sorted(AGENCIES),
        "out_of_scope": OUT_OF_SCOPE,
        "failed_queries": failed,
        "note": ("Documents whose full text matches an import-duty query in the window, newest first. Titles and abstracts are "
                 "the Federal Register's own words, trimmed but never rewritten. A match means the phrase appears in the document, "
                 "not that the document affects any particular shipment. matched_in says whether the phrase surfaced in the "
                 "title/abstract or only deeper in the full text — the latter often means the document is about something else."),
        "count": 0,
        "changes": [],
    }
    merged = [r for r in merge(rows) if in_scope(r)]
    doc["changes"] = merged[:80]
    doc["count"] = len(doc["changes"])
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, indent=1)
        f.write("\n")
    print("rule radar: %d documents in %d days (%d queries, %d failed)" % (doc["count"], WINDOW_DAYS, len(TERMS), len(failed)))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
