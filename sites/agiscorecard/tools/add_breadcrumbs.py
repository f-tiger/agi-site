#!/usr/bin/env python3
"""给多语言页补上 BreadcrumbList JSON-LD(2026-09-15,舰队互学矩阵发现)。

**为什么**:站规写着「每个新页:BreadcrumbList JSON-LD(Home → AGI questions → page)」,
英文根目录 85/99 做到了,但 **zh 只有 10/44,de/es/fr/it/ja/ko/pt 各 0/10** —— 104 页缺。
同期舰队互学矩阵显示 baipiaoji 是 16/16,这条是 bpj → agi 的移植。

**为什么这不算翻炒**:只往 `<head>` 加一段 JSON-LD,**正文一个字不动、渲染不变**,
与 09-04 那次「只改 hreflang 属性、未动一字正文」属同一类有意例外,记录在案。

名字与 URL 全部取自页面自己:name 取 `<h1>`,item 取 `rel=canonical`,
home 取页面自己 JSON-LD 里的 publisher 名(zh 用站内既有的「AGI 记分牌 → /cn」写法)。
**不编造任何一个字段**;取不到 h1 或 canonical 的页直接跳过并报出来。

用法:
  python3 tools/add_breadcrumbs.py --check     # 只报缺口,退出码 1 表示有缺
  python3 tools/add_breadcrumbs.py --apply     # 写入
"""
import glob
import html as htmllib
import json
import os
import re
import sys

LANG_DIRS = ["zh", "de", "es", "fr", "it", "ja", "ko", "pt"]
HOME = {"zh": ("AGI 记分牌", "https://agiscorecard.com/cn")}
HOME_DEFAULT = ("The AGI Scorecard", "https://agiscorecard.com/")


def targets():
    out = []
    for d in LANG_DIRS:
        out.extend(sorted(glob.glob(f"{d}/*.html")))
    return out


def h1_of(s):
    m = re.search(r"<h1[^>]*>(.*?)</h1>", s, re.S | re.I)
    if not m:
        return None
    t = re.sub(r"<[^>]+>", "", m.group(1))
    t = htmllib.unescape(re.sub(r"\s+", " ", t)).strip()
    return t or None


def canonical_of(s):
    m = re.search(r'<link rel="canonical" href="([^"]+)"', s)
    return m.group(1) if m else None


def crumb_json(lang, name, url):
    home_name, home_url = HOME.get(lang, HOME_DEFAULT)
    return json.dumps({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": home_name, "item": home_url},
            {"@type": "ListItem", "position": 2, "name": name, "item": url},
        ],
    }, ensure_ascii=False)


def process(path, apply_):
    s = open(path, encoding="utf-8").read()
    if "BreadcrumbList" in s:
        return "have", None
    name, url = h1_of(s), canonical_of(s)
    if not name or not url:
        return "skip", f"{path}: 缺 {'h1' if not name else 'canonical'},不猜,跳过"
    lang = path.split("/")[0]
    tag = '<script type="application/ld+json">' + crumb_json(lang, name, url) + "</script>"
    # 插在 head 里最后一个 ld+json 之后;没有的话插在 </head> 前。
    last = None
    for m in re.finditer(r'<script type="application/ld\+json">.*?</script>', s, re.S):
        last = m
    if last:
        s2 = s[:last.end()] + "\n" + tag + s[last.end():]
    else:
        i = s.lower().find("</head>")
        if i < 0:
            return "skip", f"{path}: 没有 </head>,跳过"
        s2 = s[:i] + tag + "\n" + s[i:]
    if apply_:
        open(path, "w", encoding="utf-8").write(s2)
    return "added", None


def main(argv):
    apply_ = "--apply" in argv
    if not apply_ and "--check" not in argv:
        print(__doc__)
        return 2
    counts = {"have": 0, "added": 0, "skip": 0}
    notes = []
    for p in targets():
        st, note = process(p, apply_)
        counts[st] += 1
        if note:
            notes.append(note)
    for n in notes:
        print("::warning::" + n)
    if apply_:
        print(f"breadcrumbs: 新增 {counts['added']} 页,原有 {counts['have']} 页,跳过 {counts['skip']} 页")
        return 0
    print(f"breadcrumbs --check: 缺 {counts['added']} 页,已有 {counts['have']} 页,无法处理 {counts['skip']} 页")
    return 1 if counts["added"] else 0


if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    sys.exit(main(sys.argv[1:]))
