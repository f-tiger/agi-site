#!/usr/bin/env python3
"""每个站的读者从哪来 —— 全舰队渠道构成,28 天窗,零 AI(2026-09-15「舰队相互学习」)。

**为什么这个工具必须存在。** 舰队 14 个站每一次 page_view 都存了 `ref`,但在此之前读侧
只有 ai_referrals.py,它只数 AI 主机。也就是说:**除 eco 外没有一个站知道自己的读者
从哪来**,而 eco 那次(09-15)还是手查的。手查的结果写进了根 CLAUDE.md:eco 28 天
Google 引荐 = 0,搜索流量 100% 来自 Bing 家族。同一天手查 bpj,答案正相反:
**Google 157/305 = 51%,是它的第一大来源**。

两个站,两个相反的渠道 —— 而「先查自己有没有 Google 引荐,再决定按谁优化」这条推论,
在此之前没有任何一个站能自动回答。互相学习的前提是各站先看得见自己。

机制:
  * 端点优先,与 ai_referrals.py 共用同一张 ENDPOINTS 表(不另抄一份,抄一份就会漂)。
    13 个站的 /api/pulse 自 2026-09-15 起多返回 by_source / by_search / by_fleet;
    bpj 的 /api/reach 本来就返回来源域名榜,由本脚本按同一份 ref_sources.txt 分桶。
  * 分桶表 `tools/fleet/ref_sources.txt` 是唯一权威,worker 侧由 check_ref_sources.py
    逐字断言。本脚本的 Python 实现与 worker 的 JS 实现在 --selftest 里**跑同一组用例
    对齐**(node),两边不一致直接红 —— 这是 bot_ua 那次六份分歧正则的教训。
  * sum(by_source) 应当等于 human_pv;差额记为 `unattributed` 并打出来,不静默吞掉。
  * keep-last-good:取不到就保留上一份快照,连续 3 天取不到才红(同 ai_referrals.py)。
  * 永不打印 token、账号 id 或任何行级数据(公开仓,日志公开)。

用法: python3 tools/fleet/traffic_sources.py [--selftest]
"""
import datetime as dt
import json
import os
import subprocess
import sys
import tempfile
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ai_referrals import ENDPOINTS  # noqa: E402  单一来源:端点表只维护一份

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "data", "fleet-traffic-sources.json")
CANON_PATH = os.path.join(ROOT, "tools", "fleet", "ref_sources.txt")
WINDOW = 28
GRACE_DAYS = 3
BUCKETS = ["search", "ai", "fleet", "social", "self", "direct", "other"]

# 各站自己的主机名,用来把「站内跳转」从 fleet 里分出去(worker 侧用 url.hostname,
# 这里给 bpj 用;bpj 入库时就清空了本域 ref,所以它的 self 结构性为 0)。
SELF_HOST = {
    "agiscorecard": "agiscorecard.com", "baipiaoji": "baipiaoji.com",
    "getecoback": "getecoback.com", "thedollscout": "thedollscout.com",
    "goldrush": "goldrush.agiscorecard.com", "gridlings": "play.agiscorecard.com",
    "buysomething": "source.agiscorecard.com", "gamesledger": "games.agiscorecard.com",
    "after35": "35.agiscorecard.com", "learn": "learn.agiscorecard.com",
    "fanzha": "fanzha.agiscorecard.com", "firstjob": "firstjob.agiscorecard.com",
    "codeword": "codeword.agiscorecard.com", "powerbill": "powerbill.agiscorecard.com",
}
NOTES = {
    "baipiaoji": "分母是「有来源的真人」(该站真人线 A):无来源的直接访问不入库,本域 ref 入库时已清空,所以 direct/self 结构性为 0",
    "agiscorecard": "服务端口径,含不自报家门的爬虫;真人量级以 JS 口径为准(站规 2026-09-14)",
}


def canon():
    with open(CANON_PATH, encoding="utf-8") as f:
        return f.read().strip()


def src_host(ref):
    """与 worker 里的 srcHost 同义:任何形状的 ref → 裸主机名。"""
    h = ("" if ref is None else str(ref)).strip().lower()
    if not h:
        return ""
    if "://" in h:
        h = h.split("://", 1)[1]
    h = h.split("/")[0].split("?")[0].split("#")[0].split("@")[-1].split(":")[0]
    return h[4:] if h.startswith("www.") else h


def src_bucket(host, self_host, spec=None):
    """与 worker 里的 srcBucket 同义(标签对齐 + 尾部只许 TLD 段)。"""
    if not host:
        return "direct"
    if self_host and host == self_host:
        return "self"
    def tld_tail(rest):
        return rest == "" or all(0 < len(l) <= 4 and l.isalpha() and l.isascii() for l in rest.split("."))
    dotted = "." + host
    for grp in (spec or canon()).split(";;"):
        name, _, toks = grp.partition(":")
        for t in toks.split("|"):
            if not t:
                continue
            at = dotted.find("." + t)
            if at < 0:
                continue
            rest = dotted[at + len(t) + 1:]
            if rest.startswith("."):
                rest = rest[1:]
            if tld_tail(rest):
                return name
    return "other"


def classify_hosts(pairs, self_host):
    """[(host, n)] → (by_source, by_search, by_fleet)。纯函数,供自检直接调用。"""
    spec = canon()
    by_source = {b: 0 for b in BUCKETS}
    by_search, by_fleet = {}, {}
    for ref, n in pairs:
        h = src_host(ref)
        b = src_bucket(h, self_host, spec)
        by_source[b] += int(n or 0)
        if b == "search":
            by_search[h] = by_search.get(h, 0) + int(n or 0)
        elif b == "fleet":
            by_fleet[h] = by_fleet.get(h, 0) + int(n or 0)
    return by_source, by_search, by_fleet


def parse(site, body):
    """端点 JSON → 一行站点记录。形状不对就抛,不猜。"""
    if not isinstance(body, dict) or not body.get("ok"):
        raise ValueError("endpoint not ok: " + str((body or {}).get("error") or (body or {}).get("code") or "?"))
    if site == "baipiaoji":
        human = int(body.get("humans_referred") or 0)
        pairs = [(r.get("ref"), r.get("n")) for r in (body.get("referrers") or [])]
        by_source, by_search, by_fleet = classify_hosts(pairs, SELF_HOST[site])
    else:
        human = int(body.get("human_pv") or 0)
        bs = body.get("by_source")
        if not isinstance(bs, dict):
            raise ValueError("no by_source yet (worker 未部署 2026-09-15 的渠道构成)")
        by_source = {b: int(bs.get(b) or 0) for b in BUCKETS}
        by_search = {k: int(v) for k, v in (body.get("by_search") or {}).items()}
        by_fleet = {k: int(v) for k, v in (body.get("by_fleet") or {}).items()}
    row = {"site": site, "human_pv": human, "by_source": by_source,
           "by_search": dict(sorted(by_search.items(), key=lambda kv: -kv[1])[:12]),
           "by_fleet": dict(sorted(by_fleet.items(), key=lambda kv: -kv[1])[:12]),
           "unattributed": human - sum(by_source.values()), "via": "endpoint"}
    if site in NOTES:
        row["note"] = NOTES[site]
    return row


def fetch(site):
    req = urllib.request.Request(ENDPOINTS[site], headers={
        "User-Agent": "fleet-heartbeat/traffic_sources (+https://github.com/f-tiger/agi-site)",
        "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=20) as r:
        return parse(site, json.load(r))


def load_last():
    try:
        with open(OUT, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def age_days(snap, today):
    try:
        got = dt.date.fromisoformat((snap.get("generated") or "")[:10])
    except Exception:
        return 999
    return (today - got).days


def table(sites):
    w = max([len(s["site"]) for s in sites] + [6])
    head = f"{'site'.ljust(w)}  {'human':>6} {'search':>6} {'ai':>4} {'fleet':>5} {'social':>6} {'self':>5} {'direct':>6} {'other':>5} {'??':>4}  top search"
    print(head)
    for s in sites:
        b = s["by_source"]
        top = ", ".join(f"{k} {v}" for k, v in list(s["by_search"].items())[:3]) or "—"
        print(f"{s['site'].ljust(w)}  {s['human_pv']:>6} {b['search']:>6} {b['ai']:>4} {b['fleet']:>5} "
              f"{b['social']:>6} {b['self']:>5} {b['direct']:>6} {b['other']:>5} {s['unattributed']:>4}  {top}")


def selftest():
    from check_ref_sources import CASES, SELF, CANON
    ok = True
    # 1) Python 侧与用例一致
    for ref, want in CASES:
        got = src_bucket(src_host(ref), src_host(SELF), CANON)
        if got != want:
            print(f"::error::python classifier: {ref!r} -> {got} (expected {want})")
            ok = False
    # 2) Python 侧与 worker 的 JS 实现在同一组用例上逐条一致(防两边各自演化)
    js = """
const REF_SRC = %s;
const srcHost = (r) => { let h = String(r == null ? '' : r).trim().toLowerCase(); if (!h) return '';
  h = h.replace(/^[a-z][a-z0-9+.-]*:\\/\\//, ''); h = h.split('/')[0].split('?')[0].split('#')[0].split('@').pop().split(':')[0];
  return h.replace(/^www\\./, ''); };
const srcBucket = (host, self) => { if (!host) return 'direct'; if (self && host === self) return 'self';
  const tld = (rest) => rest === '' || rest.split('.').every((l) => l.length > 0 && l.length <= 4 && /^[a-z]+$/.test(l));
  const dotted = '.' + host;
  for (const grp of REF_SRC.split(';;')) { const i = grp.indexOf(':');
    for (const t of grp.slice(i + 1).split('|')) { if (!t) continue; const at = dotted.indexOf('.' + t); if (at < 0) continue;
      let rest = dotted.slice(at + t.length + 1); if (rest.startsWith('.')) rest = rest.slice(1);
      if (tld(rest)) return grp.slice(0, i); } }
  return 'other'; };
const SELF = srcHost(%s);
console.log(JSON.stringify(%s.map((c) => srcBucket(srcHost(c[0]), SELF))));
""" % (json.dumps(CANON), json.dumps(SELF), json.dumps([list(c) for c in CASES]))
    with tempfile.NamedTemporaryFile("w", suffix=".mjs", delete=False, encoding="utf-8") as fh:
        fh.write(js)
        tmp = fh.name
    try:
        out = subprocess.run(["node", tmp], capture_output=True, text=True, timeout=60)
    finally:
        os.unlink(tmp)
    if out.returncode != 0:
        print("::error::node harness failed:", out.stderr.strip()[:300])
        ok = False
    else:
        jsb = json.loads(out.stdout)
        for (ref, _), a in zip(CASES, jsb):
            b = src_bucket(src_host(ref), src_host(SELF), CANON)
            if a != b:
                print(f"::error::python/JS 分类不一致: {ref!r} js={a} py={b}")
                ok = False
    # 3) 纯函数行为
    bs, bse, bf = classify_hosts([("www.google.com", 10), ("chatgpt.com", 3), ("play.agiscorecard.com", 2),
                                  ("", 5), ("agiscorecard.com", 7)], "agiscorecard.com")
    for label, cond in [
        ("search 计入 google", bs["search"] == 10 and bse["google.com"] == 10),
        ("ai 计入 chatgpt", bs["ai"] == 3),
        ("兄弟站计 fleet 不计 self", bs["fleet"] == 2 and bf["play.agiscorecard.com"] == 2),
        ("空 ref = direct", bs["direct"] == 5),
        ("本域 = self", bs["self"] == 7),
        ("bpj 形状能解析", parse("baipiaoji", {"ok": True, "humans_referred": 4,
                                              "referrers": [{"ref": "www.google.com", "n": 4}]})["by_source"]["search"] == 4),
        ("缺 by_source 要抛而不是猜", _raises(lambda: parse("learn", {"ok": True, "human_pv": 5}))),
        ("端点 not ok 要抛", _raises(lambda: parse("learn", {"ok": False, "error": "no_db"}))),
        ("unattributed 算得出", parse("learn", {"ok": True, "human_pv": 10,
                                               "by_source": {"search": 3}})["unattributed"] == 7),
    ]:
        print(("ok   " if cond else "FAIL ") + label)
        ok = ok and bool(cond)
    print("selftest:", "ok" if ok else "FAILED")
    return 0 if ok else 1


def _raises(fn):
    try:
        fn()
    except Exception:
        return True
    return False


def main(argv):
    if "--selftest" in argv:
        return selftest()
    today = dt.date.today()
    sites, errors = [], []
    for site in ENDPOINTS:
        try:
            sites.append(fetch(site))
        except Exception as e:
            errors.append(f"{site}: {str(e)[:120]}")
    if not sites:
        last = load_last()
        why = errors[0] if errors else "no sites read"
        if last is None:
            print(f"::warning::traffic-source read failed ({why}); no snapshot yet, will go red after {GRACE_DAYS} days")
            snap = {"generated": dt.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"), "window_days": WINDOW,
                    "ok": False, "errors": errors, "sites": []}
            with open(OUT, "w", encoding="utf-8") as f:
                json.dump(snap, f, ensure_ascii=False, indent=1)
            return 0
        a = age_days(last, today)
        if a <= GRACE_DAYS:
            print(f"::warning::traffic-source read failed ({why}); last snapshot is {a} d old, keeping it")
            return 0
        print(f"::error::traffic-source read has failed for {a} days ({why})")
        return 1
    fleet = {b: sum(s["by_source"][b] for s in sites) for b in BUCKETS}
    fleet["unattributed"] = sum(s["unattributed"] for s in sites)
    snap = {"generated": dt.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"), "window_days": WINDOW,
            "ok": not errors, "read_via": "endpoints" + (" (partial)" if errors else ""),
            "errors": errors, "fleet": fleet,
            "fleet_human_pv": sum(s["human_pv"] for s in sites), "sites": sites}
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(snap, f, ensure_ascii=False, indent=1)
    table(sites)
    print(f"\nfleet 28d: " + " · ".join(f"{b} {fleet[b]}" for b in BUCKETS) + f" · 未归因 {fleet['unattributed']}")
    if errors:
        print("::warning::traffic-source read incomplete: " + " | ".join(errors))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
