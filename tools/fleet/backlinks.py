#!/usr/bin/env python3
"""舰队外链监测:谁真的在链我们,以及我们的链接进了哪些列表(2026-09-16)。

owner:「完善自动化外链方案」。在此之前外链这件事有计划(`sites/agiscorecard/backlink-kit.md`,
2026-07-12)却**没有任何读数**:既不知道有没有人在链我们,也不知道计划里的目标是不是已经进了。
本脚本把这两件事都变成机器可核的数字。

两半:
  **A. 挣到的外链(第一方)** —— 各站 `/api/pulse` 的 `by_other`:既不是搜索/AI/社交/兄弟站/
     本站的来源域,也就是**真的有别处链过来并且送来了人**。嵌入件、目录页、别人的博客都在这里。
     这是唯一不靠第三方工具、不花钱的外链读数。
  **B. 目标清单核对** —— `tools/fleet/backlink_targets.json` 里每个目标的 README 直接取回来,
     看我们的域名在不在。**只读,不提 PR、不发帖**(与 Reddit 那条同规矩:机器永不发帖)。
     它回答的是「哪些还没做、哪些做了没被合并、哪些曾经有过现在掉了」。

**掉链检测**:上一份快照里 present=true、这次 false → warning。外链掉了没人会通知你。

纪律:只读 GET,零外部副作用;默认只在周一取数(搭 fleet-heartbeat,**不新增 cron**);
取不到只 warning 不红(它是待办队列,不是告警器)。永不编造目标:404 的目标留在
`unverified` 里,不假装它存在。

用法: python3 tools/fleet/backlinks.py [--selftest] [--force]
"""
import datetime as dt
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ai_referrals import ENDPOINTS  # noqa: E402  端点表只维护一份
from endpoint_cache import fetch_url  # noqa: E402  2026-09-26:同一 run 内每个端点只出网一次(D1 读预算)

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "data", "fleet-backlinks.json")
TARGETS = os.path.join(ROOT, "tools", "fleet", "backlink_targets.json")
UA = "fleet-heartbeat/backlinks (+https://github.com/f-tiger/agi-site)"
# 词边界 + 可选子域:`play.agiscorecard.com` 要命中,`notagiscorecard.com` 这种
# 蹭名字的域不许命中(裸 substring 会,自检里钉着这条)。
FLEET_RE = re.compile(r"(?<![\w-])(?:[\w-]+\.)*(?:agiscorecard|baipiaoji|getecoback|thedollscout)\.com", re.I)


def fetch(url, timeout=25):
    return fetch_url(url, timeout=timeout, ua=UA, accept="*/*")


def earned():
    """各站 by_other = 真的把人送过来的站外来源域。"""
    rows, errs = [], []
    for site, url in ENDPOINTS.items():
        try:
            _, body = fetch(url)
            d = json.loads(body)
            if not d.get("ok"):
                raise ValueError(d.get("error") or d.get("code") or "not ok")
            if site == "baipiaoji":
                # /api/reach 出的是完整来源榜,这里只留非搜索/AI/社交的
                import traffic_sources as ts
                pairs = [(r.get("ref"), r.get("n")) for r in (d.get("referrers") or [])]
                _, _, _, by_other = ts.classify_hosts(pairs, ts.SELF_HOST[site])
            else:
                by_other = d.get("by_other")
                if by_other is None:
                    raise ValueError("no by_other yet (worker 未部署 2026-09-16 的外链读数)")
            rows.append({"site": site, "referrers": dict(sorted(by_other.items(), key=lambda kv: -kv[1])[:12]),
                         "domains": len(by_other), "visits": sum(by_other.values())})
        except Exception as e:
            errs.append(f"{site}: {str(e)[:110]}")
    return rows, errs


def check_targets():
    with open(TARGETS, encoding="utf-8") as f:
        cfg = json.load(f)
    out = []
    for t in cfg["targets"]:
        url = f"https://raw.githubusercontent.com/{t['repo']}/{t['branch']}/{t['file']}"
        rec = {k: t[k] for k in ("repo", "section", "site", "fit", "status")}
        try:
            code, body = fetch(url, 30)
            rec["http"] = code
            rec["present"] = bool(FLEET_RE.search(body))
            rec["bytes"] = len(body)
        except Exception as e:
            rec["http"] = 0
            rec["present"] = None
            rec["error"] = str(e)[:90]
        out.append(rec)
    return out, cfg.get("unverified", [])


def load_last():
    try:
        with open(OUT, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def selftest():
    ok = True
    cases = [
        ("舰队域名能被认出", bool(FLEET_RE.search("see https://agiscorecard.com/data.json for the dataset"))),
        ("子域也算", bool(FLEET_RE.search("play.agiscorecard.com"))),
        ("蹭名字的域不算", not FLEET_RE.search("https://notagiscorecard.com/x")),
        ("同名但不同 TLD 不算", not FLEET_RE.search("agiscorecard.net")),
        ("路径里带站名但域不同,不算", not FLEET_RE.search("https://example.com/agiscorecard-clone")),
        ("无关文本不命中", not FLEET_RE.search("awesome list of public datasets")),
        ("目标清单可解析且都带 fit", all(t.get("fit") and t.get("site") for t in json.load(open(TARGETS, encoding="utf-8"))["targets"])),
        ("404 的目标不在 targets 里", all("ComposioHQ" not in t["repo"] for t in json.load(open(TARGETS, encoding="utf-8"))["targets"])),
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
        print("backlinks: 只在周一取数(搭 heartbeat,不新增 cron);今日跳过,沿用上次快照")
        return 0
    prev = {t["repo"]: t for t in (load_last().get("targets") or [])}
    rows, errs = earned()
    targets, unverified = check_targets()
    lost = [t["repo"] for t in targets
            if t.get("present") is False and prev.get(t["repo"], {}).get("present") is True]
    snap = {"generated": dt.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
            "note": "earned = 各站 by_other(真的送来过人的站外来源域);targets = 清单核对,只读不提交",
            "errors": errs, "earned": rows, "targets": targets, "unverified": unverified}
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(snap, f, ensure_ascii=False, indent=1)

    print("== 挣到的外链(28 天窗,真的送来过人的站外来源域)==")
    if rows:
        for r in sorted(rows, key=lambda x: -x["visits"]):
            top = ", ".join(f"{h} {n}" for h, n in list(r["referrers"].items())[:3]) or "—"
            print(f"  {r['site']:<13} {r['domains']:>3} 个域 / {r['visits']:>4} 次访问   {top}")
    else:
        print("  (一个站都没读到)")
    print("\n== 目标清单(只读核对;机器永不自动提 PR)==")
    for t in targets:
        mark = "✅ 已在" if t.get("present") else ("❓ 取不到" if t.get("present") is None else "⬜ 未进")
        print(f"  {mark}  {t['repo']:<38} [{t['status']}] ← {t['site']}")
    if unverified:
        print("  未核实(不当成现存目标):" + ", ".join(u["repo"] for u in unverified))
    if lost:
        print("::warning::外链掉了 —— 这些目标上次还在、这次没了: " + ", ".join(lost))
    if errs:
        print("::warning::外链读数不全: " + " | ".join(errs))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
