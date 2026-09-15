#!/usr/bin/env python3
"""舰队互学矩阵:哪个站在哪条已验证做法上最好,哪些站缺它(2026-09-15)。

owner 长期指令是「站点互相学习」。在此之前那件事靠人读 14 份 CLAUDE.md 的散文,
于是永远停留在「谁看过谁的日志」。这个脚本改成量线上页面:同一套判据打在所有站上,
谁强谁弱一张表看完。

**它测出来的第一件事就推翻了直觉**:带日期的新鲜度标注,baipiaoji 12/16 页是全舰队最好的,
而 agiscorecard——站规里写着「带日期的一手判定」、握着 33–37.5% 引用份额的那个站——只有 4/16。
移植方向是 bpj → agi,不是反过来。

四条判据(都出自舰队自己已验证的东西,不是通用 SEO 清单):
  * `dated_fresh` —— 新鲜度词与一个真日期同屏(±40 字符)。GEO 研究里「带日期的统计」+37%;
    光有"更新"两个字不算,必须看得见日期。**各站措辞不同(核实于/Last updated/Stand:),
    词表漏一个就会把最好的站误判成 0 —— 09-15 实测踩过。**
  * `has_source` —— 页面至少有一条站外一手源链接。GEO 研究里排第一(+40%),也是 agi 站规
    「一手判定 + 一手源」的一半。
  * `faq_ld` / `breadcrumb` —— 判定页六件套里能机器判的两件。

两条采样纪律(两条都是 09-15 当天踩出来的,别再踩):
  1. **按一级路径分层抽样**。只抽 sitemap 开头会把整站当成一种页面 —— bpj 的 sitemap
     前 16 条全是 /vs/ 对比页,据此得出的「全站零外链」是错的,它的 /tools/ 页每页都有。
  2. **判外链要先剥 query**。bpj 的出站链接都带 `?utm_source=baipiaoji`,按整串找站名
     会把每一条外链都误判成站内链接。

用法: python3 tools/fleet/page_patterns.py [--selftest] [--force]
默认只在周一跑(不新增 cron,搭 fleet-heartbeat;其余日子直接跳过并沿用上次快照)。
"""
import collections
import concurrent.futures as cf
import datetime as dt
import json
import os
import re
import sys
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "data", "fleet-page-patterns.json")
UA = "fleet-heartbeat/page_patterns (+https://github.com/f-tiger/agi-site)"
PER_GROUP = 2
MAX_PAGES = 16

SITES = {
    "agiscorecard": "agiscorecard.com", "baipiaoji": "baipiaoji.com",
    "getecoback": "getecoback.com", "thedollscout": "thedollscout.com",
    "gridlings": "play.agiscorecard.com", "buysomething": "source.agiscorecard.com",
    "gamesledger": "games.agiscorecard.com", "goldrush": "goldrush.agiscorecard.com",
    "after35": "35.agiscorecard.com", "learn": "learn.agiscorecard.com",
    "fanzha": "fanzha.agiscorecard.com", "firstjob": "firstjob.agiscorecard.com",
    "codeword": "codeword.agiscorecard.com", "powerbill": "powerbill.agiscorecard.com",
}
OWN = re.compile(r"(^|\.)(agiscorecard|getecoback|baipiaoji|thedollscout)\.com$")
SKIP = re.compile(r"(schema\.org|w3\.org|creativecommons|gstatic|googletagmanager|google-analytics|fonts\.|beehiiv)")
FRESH_WORD = re.compile(r"(核实|更新于|最后更新|更新日期|截至|Last updated|Updated|Verified|verified|checked|Stand|Aktualisiert|geprüft)")
DATE = re.compile(r"(20\d{2}[-/年.]\s?\d{1,2}[-/月.]\s?\d{1,2}|\d{1,2}\.\s?\d{1,2}\.\s?20\d{2}|[A-Z][a-z]{2,8}\s+\d{1,2},\s*20\d{2})")


def fetch(url, timeout=25):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode("utf-8", "replace")


def ext_hosts(html):
    """页面上的站外主机。**先剥 query** —— 出站链接常带 utm_source=<自家站名>。"""
    out = set()
    for a in re.findall(r'href="(https?://[^"]+)"', html):
        try:
            h = a.split("//", 1)[1].split("/")[0].split("?")[0].split("#")[0].lower()
        except Exception:
            continue
        h = h[4:] if h.startswith("www.") else h
        if not h or OWN.search(h) or SKIP.search(h):
            continue
        out.add(h)
    return out


def dated_fresh(html):
    """新鲜度词必须与一个真日期同屏才算数。"""
    body = re.sub(r"<script.*?</script>|<style.*?</style>", "", html, flags=re.S | re.I)
    text = re.sub(r"<[^>]+>", " ", body)
    for m in FRESH_WORD.finditer(text):
        if DATE.search(text[max(0, m.start() - 40):m.start() + 60]):
            return True
    return False


def ld_types(html):
    types = set()
    for m in re.finditer(r'<script[^>]+application/ld\+json[^>]*>(.*?)</script>', html, re.S | re.I):
        types |= set(re.findall(r'"@type"\s*:\s*"([^"]+)"', m.group(1)))
    return types


def stratify(locs, per_group=PER_GROUP, cap=MAX_PAGES):
    """按一级路径分层,每层取前 N 条。只抽开头 = 把整站当成一种页面(09-15 实测踩过)。"""
    groups = collections.defaultdict(list)
    for u in locs:
        try:
            rest = u.split("//", 1)[1]
        except Exception:
            continue
        path = rest.split("/", 1)[1] if "/" in rest else ""
        key = path.split("/")[0] if "/" in path else "(root)"
        groups[key or "(root)"].append(u)
    picked = []
    for k in sorted(groups):
        picked.extend(groups[k][:per_group])
    return picked[:cap], len(groups)


def measure(site, host):
    locs = re.findall(r"<loc>([^<]+)</loc>", fetch(f"https://{host}/sitemap.xml"))
    sample, ngroups = stratify(locs)
    rows = []

    def one(u):
        try:
            h = fetch(u)
        except Exception:
            return None
        t = ld_types(h)
        return {"fresh": dated_fresh(h), "srcs": len(ext_hosts(h)),
                "faq": "FAQPage" in t, "crumb": "BreadcrumbList" in t}
    with cf.ThreadPoolExecutor(4) as ex:
        for r in ex.map(one, sample):
            if r:
                rows.append(r)
    if not rows:
        raise RuntimeError("no page fetched")
    n = len(rows)
    return {"site": site, "pages": len(locs), "path_groups": ngroups, "sampled": n,
            "dated_fresh": sum(r["fresh"] for r in rows),
            "has_source": sum(1 for r in rows if r["srcs"] > 0),
            "faq_ld": sum(r["faq"] for r in rows),
            "breadcrumb": sum(r["crumb"] for r in rows)}


def table(sites):
    w = max([len(s["site"]) for s in sites] + [6])
    print(f"{'site'.ljust(w)}  {'页数':>6} {'抽样':>5} {'带日期新鲜度':>13} {'有一手源':>10} {'FAQ-LD':>8} {'面包屑':>8}")
    for s in sorted(sites, key=lambda x: -(x["dated_fresh"] / max(x["sampled"], 1))):
        n = s["sampled"]
        pct = lambda k: f"{s[k]}/{n}"
        print(f"{s['site'].ljust(w)}  {s['pages']:>6} {n:>5} {pct('dated_fresh'):>13} "
              f"{pct('has_source'):>10} {pct('faq_ld'):>8} {pct('breadcrumb'):>8}")


def selftest():
    ok = True
    cases = [
        ("分层抽样不会只抽开头",
         set(stratify([f"https://h/vs/{i}" for i in range(20)] + ["https://h/tools/a", "https://h/wall/b"])[0])
         >= {"https://h/tools/a", "https://h/wall/b"}),
        ("每层最多 2 条",
         len([u for u in stratify([f"https://h/vs/{i}" for i in range(20)])[0] if "/vs/" in u]) == 2),
        ("带 utm_source=自家站名的外链算外链",
         ext_hosts('<a href="https://www.moyin.com/?utm_source=baipiaoji">x</a>') == {"moyin.com"}),
        ("自家域不算外链", ext_hosts('<a href="https://play.agiscorecard.com/a">x</a>') == set()),
        ("分析/字体域不算一手源", ext_hosts('<a href="https://fonts.googleapis.com/x">x</a>') == set()),
        ("核实于 <日期> 算新鲜度", dated_fresh("<p>该信息于 2026-09-15 核实。</p>")),
        ("Last updated 算", dated_fresh("<p>Last updated: March 3, 2026</p>")),
        ("德语 Stand: 算", dated_fresh("<p>Stand: 14.09.2026</p>")),
        ("光有「更新」没日期不算", not dated_fresh("<p>我们会持续更新这个列表</p>")),
        ("日期离得太远不算", not dated_fresh("<p>更新</p>" + "x" * 200 + "<p>2026-09-15</p>")),
        ("ld 类型解析", ld_types('<script type="application/ld+json">{"@type":"FAQPage"}</script>') == {"FAQPage"}),
        ("14 个站", len(SITES) == 14),
    ]
    for label, cond in cases:
        print(("ok   " if cond else "FAIL ") + label)
        ok = ok and bool(cond)
    print("selftest:", "ok" if ok else "FAILED")
    return 0 if ok else 1


def main(argv):
    if "--selftest" in argv:
        return selftest()
    if "--force" not in argv and dt.date.today().weekday() != 0:
        print("page-patterns: 只在周一取数(搭 heartbeat,不新增 cron);今日跳过,沿用上次快照")
        return 0
    sites, errors = [], []
    for site, host in SITES.items():
        try:
            sites.append(measure(site, host))
        except Exception as e:
            errors.append(f"{site}: {str(e)[:100]}")
    if not sites:
        print("::warning::page-patterns: 一个站都没测到(" + "; ".join(errors)[:200] + ")")
        return 0
    snap = {"generated": dt.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
            "note": "同一套判据打在所有站上;分母是分层抽样的页数,不是全站。判据与采样纪律见脚本 docstring。",
            "errors": errors, "sites": sites}
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(snap, f, ensure_ascii=False, indent=1)
    table(sites)
    if errors:
        print("::warning::page-patterns 未测全: " + " | ".join(errors))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
