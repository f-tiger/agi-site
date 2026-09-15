#!/usr/bin/env python3
"""sitemap 里的 URL 必须是终点,不能是跳板(2026-09-15「舰队相互学习」)。

起因(实测,不是理论):baipiaoji 的 **1558 条 sitemap URL 全部 308 跳转**——
sitemap 写 `/vs/x.html`,Cloudflare Pages 把它 308 到 `/vs/x`;更糟的是每页的
`canonical` 也写着 `.html`,**即 canonical 指向一个非 200 的地址**。同日抽样,
舰队另外 13 个站的 sitemap 重定向 = 0,只有它全中,而它恰好是页数最多(1558)、
且唯一有真实 Google 引荐(157/28d)的站。

这类缺陷不会自己冒出来:站是 200 的、sitemap 是 200 的(跟随跳转之后),
只有**不跟随跳转**去看才看得见。所以要有一条常驻断言。

判定:
  * 抽样 URL 直接返回 3xx → **红**(明确的缺陷,无歧义)。
  * 页面 canonical 与被抓取的 URL 不一致 → **warning**(有正当情形,如聚合到枢纽页)。
  * 取不到(网络/超时)→ warning,不红。舰队纪律:抖动不许阻断。
挂 fleet-heartbeat;零外部副作用(只打自家站),每次 ~42 个请求。

用法: python3 tools/fleet/sitemap_guard.py [--sample N] [--selftest]
"""
import json, re, sys, urllib.error, urllib.request

HOSTS = ["agiscorecard.com", "baipiaoji.com", "getecoback.com", "thedollscout.com",
         "play.agiscorecard.com", "source.agiscorecard.com", "games.agiscorecard.com",
         "goldrush.agiscorecard.com", "35.agiscorecard.com", "learn.agiscorecard.com",
         "fanzha.agiscorecard.com", "firstjob.agiscorecard.com", "codeword.agiscorecard.com",
         "powerbill.agiscorecard.com"]
UA = "fleet-heartbeat/sitemap_guard (+https://github.com/f-tiger/agi-site)"
SAMPLE = 4


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k):
        return None


def fetch(url, follow=True, timeout=20):
    op = urllib.request.build_opener() if follow else urllib.request.build_opener(NoRedirect)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with op.open(req, timeout=timeout) as r:
            return r.status, r.read().decode("utf-8", "replace"), r.headers.get("location")
    except urllib.error.HTTPError as e:
        return e.code, "", e.headers.get("location")


def pick(locs, n):
    """确定性抽样:首尾各一条 + 中间均匀铺开,不用随机(红了要能复现)。"""
    if len(locs) <= n:
        return list(locs)
    idx = sorted({0, len(locs) - 1} | {round(i * (len(locs) - 1) / (n - 1)) for i in range(n)})
    return [locs[i] for i in idx][:n]


def canonical_of(html):
    m = re.search(r'<link[^>]+rel=["\']canonical["\'][^>]+href=["\']([^"\']+)["\']', html, re.I)
    if not m:
        m = re.search(r'<link[^>]+href=["\']([^"\']+)["\'][^>]+rel=["\']canonical["\']', html, re.I)
    return m.group(1) if m else None


def check(host, n):
    bad, warn = [], []
    try:
        st, xml, _ = fetch(f"https://{host}/sitemap.xml")
    except Exception as e:
        return [], [f"{host}: sitemap 取不到({str(e)[:60]})"], 0
    if st != 200 or "<loc>" not in xml:
        return [], [f"{host}: sitemap HTTP {st}"], 0
    locs = re.findall(r"<loc>([^<]+)</loc>", xml)
    for u in pick(locs, n):
        try:
            code, _, loc = fetch(u, follow=False)
        except Exception as e:
            warn.append(f"{host}: {u} 取不到({str(e)[:40]})")
            continue
        if 300 <= code < 400:
            bad.append(f"{u} → HTTP {code} → {loc or '?'}")
            continue
        if code != 200:
            warn.append(f"{host}: {u} → HTTP {code}")
            continue
        try:
            _, html, _ = fetch(u)
        except Exception:
            continue
        c = canonical_of(html)
        if c and c.rstrip("/") != u.rstrip("/"):
            warn.append(f"{host}: canonical 与 sitemap 不一致 — sitemap {u} vs canonical {c}")
    return bad, warn, len(locs)


def selftest():
    ok = True
    cases = [
        ("首尾必取", pick(list(range(100)), 4)[0] == 0 and pick(list(range(100)), 4)[-1] == 99),
        ("少于样本量时全取", pick([1, 2], 4) == [1, 2]),
        ("确定性", pick(list(range(50)), 4) == pick(list(range(50)), 4)),
        ("canonical 解析(rel 在前)", canonical_of('<link rel="canonical" href="https://a/b">') == "https://a/b"),
        ("canonical 解析(href 在前)", canonical_of('<link href="https://a/b" rel="canonical">') == "https://a/b"),
        ("没有 canonical 返回 None", canonical_of("<html></html>") is None),
        ("14 个站", len(HOSTS) == 14 and len(set(HOSTS)) == 14),
    ]
    for label, cond in cases:
        print(("ok   " if cond else "FAIL ") + label)
        ok = ok and bool(cond)
    print("selftest:", "ok" if ok else "FAILED")
    return 0 if ok else 1


def main(argv):
    if "--selftest" in argv:
        return selftest()
    n = SAMPLE
    if "--sample" in argv:
        n = int(argv[argv.index("--sample") + 1])
    red = 0
    for host in HOSTS:
        bad, warn, total = check(host, n)
        flag = "::error::" if bad else ""
        print(f"{flag}{host}: {total} 条 loc,抽 {n} 条 → 重定向 {len(bad)}")
        for b in bad:
            print(f"    {b}")
            red = 1
        for w in warn:
            print(f"::warning::{w}")
    if red:
        print("::error::sitemap 里有 URL 是跳板不是终点 —— canonical/IndexNow/爬虫预算三处同时受损")
    return red


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
