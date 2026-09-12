#!/usr/bin/env python3
"""舰队需求摘要(2026-09-12,owner:「我发现最难在统计获取用户需求」)。

零 AI。舰队已经有四个需求仪器,但它们分散在四处、没人一次读完:
  ① 各站 Google Trends rising 面(sites/*/…/trends-rising*.json / rising*.json)
  ② 创业雷达 data/startup-radar.json(Product Hunt + HN + 2026-09-12 起 Reddit 求做板块)
  ③ autopilot 的需求队列 data/autopilot/<site>-demand.json(gaps = 有需求、站内接不住)
  ④ 各站第一方信号(站内搜索 / 零命中词),同在 ③ 的 first_party_demand
本脚本只做一件事:把四处**读成一页** data/autopilot/demand-digest.md,按站列。
诚实规则:每条带日期;超过 10 天的 rising 标 STALE;抓不到的源写「不可用 + 原因」;
空就写空。**它不判断、不选题、不写正文**——第②层(会判断的那层)读它,人也读它。
"""
import datetime as dt, glob, json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "data/autopilot/demand-digest.md")
MAX_AGE = 10
SITES = ["agiscorecard", "baipiaoji", "getecoback", "buysomething", "gridlings", "thedollscout", "goldrush", "gamesledger"]


def load(p):
    try:
        return json.load(open(p, encoding="utf-8"))
    except Exception as e:
        return {"__error__": f"{type(e).__name__}: {e}"}


def age_days(today, iso):
    try:
        return (today - dt.date.fromisoformat(str(iso)[:10])).days
    except Exception:
        return None


def rising_for(site, today):
    """每个 seed 自带 fetched 时取它自己的;否则退到文件顶层。超过 10 天标 STALE。"""
    files = [f for f in glob.glob(os.path.join(ROOT, "sites", site, "**", "*rising*.json"), recursive=True)
             if "/node_modules/" not in f and "/dist/" not in f]
    rows = []
    for f in files:
        d = load(f)
        if "__error__" in d:
            rows.append(f"- `{os.path.relpath(f, ROOT)}`: 不可用({d['__error__']})"); continue
        top = d.get("fetched") or d.get("generated") or ""
        seeds = d.get("seeds") or {}
        if isinstance(seeds, dict):
            for seed, v in list(seeds.items())[:8]:
                when = (v.get("fetched") if isinstance(v, dict) else None) or top
                a = age_days(today, when)
                tag = "STALE" if (a is None or a > MAX_AGE) else f"{a}d"
                rs = v.get("rising") if isinstance(v, dict) else None
                items = ", ".join(f"{r.get('q')} ({r.get('v')})" for r in rs[:4]) if isinstance(rs, list) and rs else "(空)"
                rows.append(f"- [{tag}] **{seed}** → {items}")
        elif isinstance(seeds, list):
            rows.append(f"- 文件 {os.path.relpath(f, ROOT)}:列表形 {len(seeds)} 条(未细读)")
    return rows or ["- (无 rising 文件)"]


def main():
    today = dt.date.today()
    for a in sys.argv[1:]:
        if a.startswith("--today="):
            today = dt.date.fromisoformat(a.split("=", 1)[1])
    radar = load(os.path.join(ROOT, "data/startup-radar.json"))
    out = [f"# 舰队需求摘要 · {today}", "",
           "零 AI 汇总;每条带日期;它是**选题输入不是选题依据**,任何由此引出的页面仍过三门(数据/需求/变现)。", ""]

    # 跨站源状态
    out.append("## 源状态(抓不到就写出来,不复用旧数据)")
    srcs = radar.get("sources", {}) if "__error__" not in radar else {}
    if "__error__" in radar:
        out.append(f"- startup-radar.json 不可用:{radar['__error__']}")
    for name, sdat in srcs.items():
        out.append(f"- {name}: " + ("ok, %d 条" % len(sdat.get("items", [])) if sdat.get("ok") else f"**不可用** — {sdat.get('reason')}"))
    ra = age_days(today, radar.get("fetched", "")) if "__error__" not in radar else None
    out.append(f"- 雷达快照日期:{radar.get('fetched', '?')}" + (f"({ra} 天前)" if ra is not None else "") + "")
    out.append("")

    # Reddit 求做板块(跨站,按各站词表已在 niche_hits 里;这里再列原始前 10 条供人读)
    rr = (srcs.get("reddit_requests") or {}).get("items") or []
    out.append("## Reddit 求做板块(r/SomebodyMakeThis + r/AppIdeas,48h)")
    out.append("只读,机器永不发帖。出现在这里 ≠ 有人在搜它。")
    for i in sorted(rr, key=lambda x: -(x.get("points") or 0))[:10]:
        out.append(f"- ↑{i.get('points',0)} · {i.get('sub','')} · {i.get('title','')}" + (f" — {i['url']}" if i.get("url") else ""))
    if not rr:
        out.append("- (本次无数据:源不可用或 48h 内无帖)")
    out.append("")

    # 垂直板块的「重现」信号:同一问题 14 天内出现在 ≥2 个不同日期。单日热帖不算。
    rec = radar.get("reddit_recurring", {}) if "__error__" not in radar else {}
    out.append("## Reddit 垂直板块 · 14 天内重现的问题(这才是需求信号)")
    out.append("按站给定板块 + 句式(startup_radar.mjs 的 VERTICAL),只读。同一标题出现在 ≥2 个不同日期才列。")
    any_rec = False
    for site, rows in (rec or {}).items():
        for r in sorted(rows, key=lambda x: -len(x.get("days", [])))[:5]:
            any_rec = True
            out.append(f"- **{site}** · ×{len(r.get('days', []))} 天({', '.join(r.get('days', [])[-3:])}) · {r.get('title', '')}")
    if not any_rec:
        out.append("- (尚无重现:源刚接入或 14 天内没有重复出现的问题)")
    out.append("")

    # 按站
    hits = radar.get("niche_hits", {}) if "__error__" not in radar else {}
    for site in SITES:
        out.append(f"## {site}")
        out.append("**Trends rising(逐 seed 时效)**")
        out.extend(rising_for(site, today))
        nh = hits.get(site) or []
        out.append("**创业雷达词表命中(PH/HN/Reddit)**")
        out.extend([f"- {t}" for t in nh[:8]] or ["- (无)"])
        dp = os.path.join(ROOT, f"data/autopilot/{site}-demand.json")
        if os.path.exists(dp):
            d = load(dp)
            gaps = d.get("gaps") or []
            out.append(f"**autopilot 需求队列**:gaps **{len(gaps)}** / covered {len(d.get('covered') or [])} · heat: {str(d.get('heat_source'))[:60]}")
            for g in gaps[:3]:
                if isinstance(g, dict):
                    out.append("- " + " · ".join(f"{k}={str(v)[:40]}" for k, v in list(g.items())[:4]))
                else:
                    out.append(f"- {str(g)[:120]}")
            fp = d.get("first_party_demand")
            if fp:
                out.append(f"**第一方需求**:`{json.dumps(fp, ensure_ascii=False)[:200]}`")
        else:
            out.append("**autopilot 需求队列**:该站未纳入 autopilot")
        out.append("")

    out.append("---")
    out.append("读法:gaps>0 且对应 rising 不是 STALE,才值得进第②层选题;Reddit 命中要再查搜索需求;")
    out.append("PH/HN 命中里的产品名不是需求词。三门(数据/需求/变现)不变。")
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    open(OUT, "w", encoding="utf-8").write("\n".join(out) + "\n")
    print(f"wrote {os.path.relpath(OUT, ROOT)} ({len(out)} lines)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
