# -*- coding: utf-8 -*-
"""Site-wide validator for agiscorecard.com. Run before every ship:
    python3 tools/validate.py
Exit code 0 = safe to ship. Checks:
  - every JSON-LD block parses on every page
  - template FAQ pages: visible .faq-q count == FAQPage mainEntity count
    (two-year-scorecard.html uses different markup; checked by text instead)
  - no broken internal links (root-level clean URLs)
  - <div> balance per page
  - sitemap.xml well-formed; every sitemap root URL has a matching file
"""
import glob
import json
import os
import re
import sys
import xml.dom.minidom

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KNOWN_EXTENSIONLESS = {"two-year-scorecard", "agi-questions"}

problems = []

# Root pages plus the language/section subdirectories (zh/, invest/, agi-type/ ...).
# These used to be unvalidated: 43 live pages with no FAQ/JSON-LD/link checking.
PAGES = sorted(
    glob.glob(os.path.join(ROOT, "*.html"))
    + glob.glob(os.path.join(ROOT, "*", "*.html"))
    + glob.glob(os.path.join(ROOT, "*", "*", "*.html"))
)
PAGES = [p for p in PAGES if os.sep + "tools" + os.sep not in p and os.sep + "." not in p]

for f in PAGES:
    name = os.path.relpath(f, ROOT)
    html = open(f, encoding="utf-8").read()
    faq_schema = None
    for block in re.findall(r'<script type="application/ld\+json">(.*?)</script>', html, re.S):
        try:
            d = json.loads(block)
        except Exception as e:
            problems.append(f"{name}: JSON-LD parse error: {e}")
            continue
        if d.get("@type") == "FAQPage":
            faq_schema = d["mainEntity"]
    if faq_schema is not None:
        visible = html.count('class="faq-q"')
        if visible:
            if visible != len(faq_schema):
                problems.append(f"{name}: FAQ mismatch schema={len(faq_schema)} visible={visible}")
        else:  # non-template page: every schema question must appear in the text
            for q in faq_schema:
                if q["name"] not in html:
                    problems.append(f"{name}: FAQ question not visible: {q['name'][:60]}")
    for href in set(re.findall(r"href=[\"']/([a-z0-9\-]+)[\"']", html)):
        if href in KNOWN_EXTENSIONLESS:
            continue
        if not os.path.exists(os.path.join(ROOT, href + ".html")):
            problems.append(f"{name}: broken internal link /{href}")
    if html.count("<div") != html.count("</div>"):
        problems.append(f"{name}: div imbalance {html.count('<div')}/{html.count('</div>')}")

sm_path = os.path.join(ROOT, "sitemap.xml")
sm = open(sm_path, encoding="utf-8").read()
try:
    xml.dom.minidom.parseString(sm)
except Exception as e:
    problems.append(f"sitemap.xml: not well-formed: {e}")
for loc in re.findall(r"<loc>https://agiscorecard\.com/([^<]*)</loc>", sm):
    if not loc or "/" in loc:  # homepage or language subdir (files live in repo subdirs)
        continue
    base = loc.replace(".html", "")
    if not os.path.exists(os.path.join(ROOT, base + ".html")):
        problems.append(f"sitemap.xml: no file for URL /{loc}")

count = sm.count("<loc>")
# 判定型高引用页必须带**首屏**活数字区块(CLAUDE.md「定位深化」第 ⑥ 条)。
# 8-16 我用「页面里有没有提到 62.5」这种松检查放过了两页,8-17 才发现。
# 所以改成硬校验:正文里提一句不算,必须有首屏区块的标记串。
# 名单按 Bing 引用明细维护——新页进前十引用就加进来。
for _slug in ("situational-awareness-summary", "what-is-agi", "how-close-is-agi",
              "when-will-agi-arrive", "ai-orders-of-magnitude-explained"):
    _p = os.path.join(ROOT, _slug + ".html")
    if os.path.exists(_p) and "goes stale on" not in open(_p, encoding="utf-8").read():
        problems.append(f"{_slug}: 高引用页缺首屏活数字区块(定位深化第 ⑥ 条)")

# 可见「Last updated」必须与 JSON-LD 的 dateModified 一致。
# 2026-08-18 实测有 7 页不一致,且**全部是可见日期更旧**——读者看到过期日期、
# 引擎看到新日期。这类漂移不会报错、不会被人注意,只能靠校验拦。
_MON = {"January":"01","February":"02","March":"03","April":"04","May":"05","June":"06",
        "July":"07","August":"08","September":"09","October":"10","November":"11","December":"12"}
for _f in sorted(glob.glob(os.path.join(ROOT, "*.html"))):
    _s = open(_f, encoding="utf-8").read()
    _ld = re.search(r'"dateModified": *"([0-9-]{10})"', _s)
    _vis = re.search(r"Last updated: ([A-Za-z]+) (\d+), (\d{4})", _s)
    if not _ld or not _vis:
        continue
    _v = f"{_vis.group(3)}-{_MON.get(_vis.group(1), '??')}-{int(_vis.group(2)):02d}"
    if _v != _ld.group(1):
        problems.append(f"{os.path.basename(_f)}: 可见日期 {_v} 与 dateModified {_ld.group(1)} 不一致")

if problems:
    print(f"FAIL — {len(problems)} problem(s):")
    for p in problems:
        print("  -", p)
    sys.exit(1)
print(f"OK — {len(PAGES)} pages valid, sitemap {count} URLs")
