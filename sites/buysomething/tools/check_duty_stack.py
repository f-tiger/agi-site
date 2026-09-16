#!/usr/bin/env python3
"""Gate: site/duty-stack.json (machine face) and site/landed-cost.html (human face) must not drift.

Why (2026-09-16): the MCP server answers "is the $800 de minimis still a thing?" from duty-stack.json
while readers get the same answer from the HTML page. Two faces, one set of facts — the moment they
disagree, one of them is lying to somebody. This gate is the only thing that keeps them in step, so it
runs before every deploy and is meant to go red.

Checks (all mechanical, no judgement):
  1. every fee rate in the JSON appears literally in the page;
  2. every dated rule's date appears in the page;
  3. every superseded claim is recognisable in the page's expired block (the page keeps them struck
     through on purpose, so readers can recognise stale guides);
  4. the JSON never states a product-specific duty rate (zero fabrication: rates are the importer's).
Exit 1 on any failure; --selftest runs the pure checks against fixtures.
"""
import datetime as dt
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.join(HERE, "..", "site")
JSON_PATH = os.path.join(SITE, "duty-stack.json")
HTML_PATH = os.path.join(SITE, "landed-cost.html")
LLMS_PATH = os.path.join(SITE, "llms.txt")
LADDER_PATH = os.path.join(SITE, "s301-ladder.json")

# 机器面第二处:llms.txt 是给 AI 系统读的摘要,它在 2026-09-16 之前一直把 $80–$200 与 54%/$100
# 当作现行规则写着(页面 09-13 就改了,摘要没跟上)。这是比页面更危险的漂移——被引用的是它。
# 规则:这些数字可以出现,但必须和「superseded / expired / struck down / died」同句,否则闸门红。
STALE_FIGURES = ["$80–$200", "$80-200", "54%", "$100 flat", "$800"]
STALE_CONTEXT = ("superseded", "expired", "struck down", "died", "suspended", "no longer")

# 页面把过期数字放在 .expired 块里(故意保留,让读者认得出旧攻略);核对时只在这一块里找它们。
EXPIRED_RE = re.compile(r'<div class="expired">(.*?)</div>', re.S)
# superseded 里的口径 → 页面上那串必须出现的字样
SUPERSEDED_MARKS = {
    "$800 de minimis exemption still applies to small parcels": ["de minimis"],
    "Postal flat duty of $80 to $200 per item": ["$80–$200", "$80-200"],
    "Courier shipments pay about 54% ad valorem, or $100 flat per shipment": ["54%"],
    "'Reciprocal' baseline tariffs apply on top of the stack": ["Reciprocal", "reciprocal"],
}


def check_ladder(ladder, html):
    """Pure: every additional rate in the official Section 301 ladder must be offered on the page's own hint.

    The point is drift in one direction: USTR adds a rate (2024 added 50% and 100%), the ladder picks it up
    from the official export the next morning, and the page silently keeps offering the old menu. This goes
    red so a human updates the page instead of readers quietly using a stale list.
    """
    bad = []
    m = re.search(r"official ladder</a>:([^<]*)\)", html)
    if not m:
        return ["landed-cost.html no longer carries the Section 301 rate hint the gate checks"]
    offered = {float(x) for x in re.findall(r"[\d.]+", m.group(1))}
    faq = re.search(r'<p id="s301-faq">(.*?)</p>', html, re.S)
    faq_rates = {float(x) for x in re.findall(r"([\d.]+)%", faq.group(1))} if faq else None
    for rate in ladder.get("additional_rates_seen_pct", []):
        if float(rate) not in offered:
            bad.append("official ladder has a %s%% Section 301 rate that the page hint does not offer" % rate)
        if faq_rates is not None and float(rate) not in faq_rates:
            bad.append("official ladder has a %s%% Section 301 rate that the FAQ answer does not mention" % rate)
    if faq is None:
        bad.append("landed-cost.html lost the Section 301 FAQ answer (id=s301-faq) the gate checks")
    if not ladder.get("ladder"):
        bad.append("s301-ladder.json has no rows")
    return bad


def check_llms(text):
    """Pure: superseded figures in llms.txt must be framed as superseded, line by line."""
    bad = []
    for i, line in enumerate(text.splitlines(), 1):
        hit = [f for f in STALE_FIGURES if f in line]
        if hit and not any(c in line.lower() for c in STALE_CONTEXT):
            bad.append("llms.txt line %d states superseded figures %s as if current" % (i, hit))
    return bad


def check(data, html):
    """Pure: returns a list of problems (empty = ok)."""
    bad = []
    page = html
    expired = "".join(EXPIRED_RE.findall(html))

    for fee in ("mpf", "hmf"):
        rate = str(data["fees"][fee]["rate_pct"])
        if rate not in page:
            bad.append("fee %s rate %s%% is in the JSON but not on the page" % (fee, rate))

    for rule in data["rules"]:
        d = rule.get("as_of")
        if d and d not in page:
            bad.append("rule %d (%s) is dated %s in the JSON but that date is absent from the page" % (rule["n"], rule["rule"], d))

    for item in data["superseded"]:
        marks = SUPERSEDED_MARKS.get(item["claim"])
        if marks is None:
            bad.append("superseded claim has no page marker registered in this gate: %r" % item["claim"])
            continue
        where = expired if item["claim"] != "$800 de minimis exemption still applies to small parcels" else page
        if not any(m in where for m in marks):
            bad.append("superseded claim not recognisable on the page: %r" % item["claim"])
        if not item.get("sources"):
            bad.append("superseded claim carries no source: %r" % item["claim"])

    blob = json.dumps(data, ensure_ascii=False).lower()
    for word in ("general_rate", "htsno", "duty_rate_pct"):
        if word in blob:
            bad.append("duty-stack.json must not state product-specific rates (found %r)" % word)
    return bad


def selftest():
    good = {
        "fees": {"mpf": {"rate_pct": 0.3464}, "hmf": {"rate_pct": 0.125}},
        "rules": [{"n": 1, "rule": "X", "as_of": "2026-02-20"}],
        "superseded": [{"claim": "'Reciprocal' baseline tariffs apply on top of the stack", "sources": ["u"]}],
    }
    html = 'MPF 0.3464% HMF 0.125% 2026-02-20 <div class="expired"><s>Reciprocal</s></div>'
    assert check(good, html) == [], check(good, html)
    assert check(good, html.replace("0.125", "0.2")), "drifted HMF must fail"
    assert check(good, html.replace("2026-02-20", "2026-01-01")), "drifted date must fail"
    assert check(good, html.replace("Reciprocal", "something else")), "missing superseded mark must fail"
    bad_rate = dict(good, superseded=[{"claim": "'Reciprocal' baseline tariffs apply on top of the stack", "sources": ["u"], "general_rate": "2.5%"}])
    assert check(bad_rate, html), "a product rate inside duty-stack.json must fail"
    assert check_llms("- landed cost: postal flat duties $80-200/item, the courier 54%-or-$100 rule"), "stale figures stated as current must fail"
    assert check_llms("- landed cost: the $80-200 postal flat duty expired 2026-02-28") == [], "superseded framing must pass"
    page_hint = 'official ladder</a>: 0 / 7.5 / 10 / 15 / 25 / 50 / 100)<p id="s301-faq">7.5%, 10%, 15%, 25%, 50% and 100%</p>'
    assert check_ladder({"additional_rates_seen_pct": [7.5, 25.0, 100.0], "ladder": [1]}, page_hint) == []
    assert check_ladder({"additional_rates_seen_pct": [7.5, 60.0], "ladder": [1]}, page_hint), "a new official rate missing from the page must fail"
    assert check_ladder({"additional_rates_seen_pct": [7.5], "ladder": []}, page_hint), "an empty ladder must fail"
    assert check_ladder({"additional_rates_seen_pct": [7.5], "ladder": [1]}, "no hint here"), "a removed page hint must fail"
    print("check_duty_stack selftest: OK")


def main():
    if "--selftest" in sys.argv:
        selftest()
        return 0
    data = json.load(open(JSON_PATH, encoding="utf-8"))
    html = open(HTML_PATH, encoding="utf-8").read()
    bad = check(data, html) + check_llms(open(LLMS_PATH, encoding="utf-8").read())
    try:
        ladder = json.load(open(LADDER_PATH, encoding="utf-8"))
    except Exception as e:
        bad.append("s301-ladder.json unreadable: %s" % e)
        ladder = None
    if ladder:
        bad += check_ladder(ladder, html)
        age = (dt.date.today() - dt.date.fromisoformat(ladder["generated"])).days
        if age > 45:
            print("::warning::s301 ladder is %d days old (refreshed in the schedule branch; not fatal)" % age)
    for b in bad:
        print("::error::duty-stack drift: " + b)
    if bad:
        return 1
    print("duty-stack gate: OK (%d rules, %d superseded figures, %d Section 301 headings; page, llms.txt and ladder all in step)"
          % (len(data["rules"]), len(data["superseded"]), len((ladder or {}).get("ladder", []))))
    return 0


if __name__ == "__main__":
    sys.exit(main())
