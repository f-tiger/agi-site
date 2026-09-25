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


SEASON_HORIZON = 42      # days: the peak MONTH has to begin within six weeks
SEASON_STALE = 40        # the file refreshes monthly (eco-trends.yml); older = the refresh broke
SEASON_FLOOR = 2.0       # below this peak (anchor scale) a term is too small to plan a page on
_TRANS = str.maketrans({"ü": "ue", "ö": "oe", "ä": "ae", "ß": "ss"})


def _title_index(site):
    """{path: lowercased title + h1} for the site's German pages (not /en/, /it/)."""
    import html as _h, re as _re
    idx = {}
    for p in glob.glob(os.path.join(ROOT, "sites", site, "site", "**", "*.html"), recursive=True):
        rel = os.path.relpath(p, os.path.join(ROOT, "sites", site, "site"))
        if rel.startswith(("en/", "it/")) or "workbench" in rel:
            continue
        try:
            s = open(p, encoding="utf-8").read()
        except Exception:
            continue
        t = _re.search(r"<title>(.*?)</title>", s, _re.S)
        h = _re.search(r"<h1[^>]*>(.*?)</h1>", s, _re.S)
        txt = (t.group(1) if t else "") + " " + _re.sub(r"<[^>]+>", " ", h.group(1) if h else "")
        idx[rel.lower()] = _h.unescape(txt).lower()
    return idx


def _covered(term, idx):
    """Pages whose title/h1 contains every word of the term, or whose slug
    contains its transliteration (heizlüfter -> heizluefter). Title-level on
    purpose: the question is whether a page is ABOUT this term, and the
    2026-09-17 gap audit showed body-text matching answers a different one."""
    ws = term.lower().split()
    return [p for p, t in idx.items() if all(w in t or w.translate(_TRANS) in p for w in ws)]


def season_calendar(site, today):
    """Terms whose five-year peak month begins within SEASON_HORIZON days,
    against how many of the site's German pages are titled for them.
    Reads sites/<site>/data/seasonality-de.json (refreshed monthly) and the
    settled decisions in season-verdicts.json. Empty for sites without it."""
    f = os.path.join(ROOT, "sites", site, "data", "seasonality-de.json")
    if not os.path.exists(f):
        return []
    d = load(f)
    if "__error__" in d:
        return [f"**季节日历**:seasonality-de.json 不可用({d['__error__']})"]
    verdicts = (load(os.path.join(ROOT, "sites", site, "data", "season-verdicts.json")) or {}).get("verdicts") or {}
    a = age_days(today, d.get("fetched", ""))
    stale = " **STALE:月度刷新断了,查 eco-trends.yml**" if (a is None or a > SEASON_STALE) else ""
    idx = _title_index(site)
    rows = []
    for r in d.get("terms", []):
        m = r.get("peak_month")
        if not isinstance(m, int):
            continue
        if m == today.month:
            days = 0
        else:
            y = today.year + (1 if m < today.month else 0)
            days = (dt.date(y, m, 1) - today).days
        if days > SEASON_HORIZON:
            continue
        cov = _covered(r["term"], idx)
        v = verdicts.get(r["term"])
        if v:
            status = f"已裁定:{v.get('verdict')}({v.get('date')})"
        elif (r.get("peak") or 0) < SEASON_FLOOR:
            status = f"量太小(峰值 <{SEASON_FLOOR})"
        elif not cov:
            status = "**未覆盖 · 待过三门**"
        else:
            status = f"已覆盖 {len(cov)} 页"
        carried = f" (沿用 {r['carried_from']})" if r.get("carried_from") else ""
        rows.append((days, -(r.get("peak") or 0), f"| {r['term']}{carried} | {r.get('peak')} | {m} 月 | "
                     + ("本月" if days == 0 else f"{days} 天") + f" | {r.get('win_over_sep')} | {len(cov)} | {status} |"))
    rows.sort()
    out = [f"**季节日历**(5 年季节性 × 德语页标题覆盖;峰值月在 {SEASON_HORIZON} 天内开始;"
           f"数据 {d.get('fetched', '?')},{a} 天前,锚 {d.get('anchor')}{stale})"]
    if not rows:
        return out + ["- (未来 6 周没有进入峰值月的词)"]
    out += ["| 词 | 峰值 | 峰值月 | 距峰值月 | 冬÷九月 | 标题覆盖页 | 状态 |", "|---|---|---|---|---|---|---|"]
    out += [x[2] for x in rows]
    out.append("读法:数值只在本文件内可比(与 rising 不可比);「未覆盖 · 待过三门」才是候选,仍要过需求/变现门;"
               "过了门的写进扩展队列,每天最多建一页(2026-09-24 起不再等 eco-new-page-discovery-1020,"
               "新页的发现面由首页「Neu im Ratgeber」块承担,是否奏效看 eco-newest-block-1008)。")
    return out


def expansion_queue(site):
    """The site's standing expansion queue (sites/<site>/data/expansion-queue.json,
    2026-09-24, owner: 「站点应该持续扩展」): counts by status and the next three
    buildable items with the action each one still needs. The daily run builds
    the first of them; this makes the queue visible to whoever reads the digest
    before choosing a topic. Empty for sites without a queue."""
    f = os.path.join(ROOT, "sites", site, "data", "expansion-queue.json")
    if not os.path.exists(f):
        return []
    d = load(f)
    if "__error__" in d:
        return [f"**扩展队列**:expansion-queue.json 不可用({d['__error__']})"]
    items = d.get("items") or []
    counts = {}
    for it in items:
        counts[it.get("status")] = counts.get(it.get("status"), 0) + 1
    ready = [it for it in items if it.get("status") == "queued" and not it.get("blocked_by")]
    out = [f"**扩展队列**(更新 {d.get('updated', '?')};"
           + " · ".join(f"{k} {v}" for k, v in sorted(counts.items()))
           + (";**可建 <3,当天先补货**" if len(ready) < 3 else "") + ")"]
    for it in ready[:3]:
        out.append(f"- `{it.get('slug')}` — {it.get('working_title', '')}"
                   + (f" · 待办:{str(it.get('next_action'))[:160]}" if it.get("next_action") else ""))
    if not ready:
        out.append("- (没有可建项:按季节日历补货,每个 SERP 裁定都写回队列)")
    return out


def deal_calendar(site, today):
    """Next Amazon.de shopping events from sites/<site>/data/deal-calendar.json
    (2026-09-24). An event that is close and still unannounced is the prompt to
    look for Amazon's own announcement; the band renders nothing until it is filled."""
    f = os.path.join(ROOT, "sites", site, "data", "deal-calendar.json")
    if not os.path.exists(f):
        return []
    d = load(f)
    if "__error__" in d:
        return [f"**Deal-Kalender**:deal-calendar.json 不可用({d['__error__']})"]
    rows = []
    for ev in d.get("events") or []:
        try:
            end = dt.date.fromisoformat(ev["end"])
            start = dt.date.fromisoformat(ev["start"])
        except Exception:
            continue
        if end < today:
            continue
        if ev.get("announced"):
            st = f"已公告,横幅 {ev.get('show_from')}→{ev['end']}" + (",带 Prime 试用链接" if ev.get("prime_only") else "")
        else:
            st = "**未公告:去 aboutamazon.de 查,填进 deal-calendar.json 才会出横幅**"
        rows.append(f"- {ev.get('name')} {start}({(start - today).days} 天后)· {st}")
    return ["**Deal-Kalender**(Amazon 活动;data/deal-calendar.json)"] + (rows or ["- (没有未结束的活动)"])


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

    # 板块产出榜(owner 09-13:「监控好板块比什么都合适」):按 14 天产出看名单,demote 是机器标记、会话来删
    bs = radar.get("board_stats") or {}
    if bs:
        out.append("## 板块产出榜(14 天;名单 tools/fleet/reddit_watchlist.json,更新 " + str(radar.get("watchlist_updated", "?")) + ")")
        out.append("| 板块 | 名单 | 今日 | ok 天数 | 帖子 | 求做形 | 重现主题 | 标记 |")
        out.append("|---|---|---|---|---|---|---|---|")
        for sub, v in sorted(bs.items(), key=lambda kv: (-kv[1].get("recurring_14d", 0), -kv[1].get("requests_14d", 0))):
            out.append(f"| r/{sub} | {v.get('list')} | {'ok' if v.get('today_ok') else 'HTTP ' + str(v.get('today_status'))} | {v.get('days_ok_14d')} | {v.get('items_14d')} | {v.get('requests_14d')} | {v.get('recurring_14d')} | {'**demote**' if v.get('demote') else ''} |")
        out.append("")
    fp = radar.get("feed_probes") or {}
    if fp:
        out.append("## 候选 idea 源探针(只报状态,200 且有内容才值得写解析器)")
        for name, v in fp.items():
            out.append(f"- {name}: HTTP {v.get('status')} {v.get('type', '')} {v.get('bytes', '')}B {v.get('error', '')}".rstrip())
        out.append("")

    # Reddit 求做板块 + 大板块求做句式 + Ask HN(跨站;这里列原始前 10 条供人读)
    rr = [*(((srcs.get("reddit_requests") or {}).get("items") or [])), *(((srcs.get("reddit_wish") or {}).get("items") or [])), *(((srcs.get("hn_ask") or {}).get("items") or [])), *(((srcs.get("softwarerecs") or {}).get("items") or [])), *(((srcs.get("bluesky_wish") or {}).get("items") or [])), *(((srcs.get("lemmy_wish") or {}).get("items") or []))]
    out.append(f"- Reddit 访问通道:{radar.get('reddit_access', '?')}(oauth = owner 已注册官方 app;public-json = 未鉴权,runner 09-13 起逐板 403)")
    out.append("## 求做帖(Reddit request 板 + wish 句式 + Ask HN + Software Recommendations SE + Bluesky 求做搜索)")
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
            out.append(f"**autopilot 需求队列**:gaps **{len(gaps)}** / covered {len(d.get('covered') or [])} · heat: {str(d.get('heat_source'))[:60]}"
                       + ("(gaps 量的是标题与开篇有没有接住,不是站内有没有这一页——建页前先 grep 正文)" if gaps else ""))
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
        out.extend(season_calendar(site, today))
        out.extend(expansion_queue(site))
        out.extend(deal_calendar(site, today))
        out.append("")

    # 机会撮合(Reddit 请求 × rising 需求 × 已有供给;零 AI,派生事实,不转载帖子)
    op = load(os.path.join(ROOT, "data/autopilot/opportunities.json"))
    out.append("## 机会撮合(reddit 请求 × Trends rising × PH/HN 供给;data/autopilot/opportunities.json)")
    if "__error__" in op:
        out.append(f"- 不可用:{op['__error__']}")
    else:
        oc = op.get("counts") or {}
        out.append(f"- 候选 {oc.get('candidates', 0)} · 已确认需求 {oc.get('demand_confirmed', 0)} · 重现 {oc.get('recurring', 0)} · 已有人做 {oc.get('supplied', 0)}(生成 {op.get('generated', '?')};Reddit 源 ok:{op.get('reddit_sources_ok')})")
        for o in (op.get("opportunities") or [])[:8]:
            dm = (o.get("demand") or [{}])[0]
            out.append(f"- [{o.get('state')}] {o.get('theme')} · {len(o.get('days_seen') or [])} 天 · 站 {o.get('site') or '-'}"
                       + (f" · rising「{dm.get('q')}」({dm.get('v')})" if dm.get("q") else "")
                       + (" · 已有人做" if o.get("supplied") else "")
                       + (f" · 舰队页 {o['fleet_pages'][0]['page']}" if o.get("fleet_pages") else ""))
        if not op.get("opportunities"):
            out.append("- (无候选:Reddit 源尚未落数据或今日无请求)")
    out.append("")

    # AI 助手引荐(舰队唯一不靠 Google 的分发面;读 heartbeat 写的快照)
    ar = load(os.path.join(ROOT, "data/fleet-ai-referrals.json"))
    out.append("## AI 助手引荐(28 天窗,真人 pv 里 referrer 是 ChatGPT/Perplexity/Claude/Copilot 等)")
    if "__error__" in ar or ar.get("stub"):
        out.append("- 快照不可用:" + str(ar.get("__error__") or ar.get("reason") or "stub") + "(heartbeat 的 D1 读步骤还没成功过)")
    else:
        aa = age_days(today, ar.get("generated", ""))
        stale = " **STALE**" if (aa is None or aa > 3) else ""
        base = (ar.get("baseline_2026_09_12") or {}).get("fleet_ai_ref")
        # 读数不全时绝不印成「舰队合计」——那正是 2026-09-25 D1 日读配额耗尽那天的形状:
        # 14 站里 13 站 500,文件写着 19,而基线是 78。
        if ar.get("fleet_ai_ref") is None:
            out.append(f"- ⚠️ **舰队 AI 引荐读数不全,不可用于结算**:仅读到 {ar.get('sites_read','?')}/{ar.get('sites_expected','?')} 站"
                       f"(这几站合计 {ar.get('partial_ai_ref','?')} 次,**不是舰队合计**);"
                       f"快照 {ar.get('generated','?')[:10]}{stale};09-12 手测基线 {base}。原因见同文件 errors 字段")
        else:
            out.append(f"- 舰队合计 **{ar.get('fleet_ai_ref')}** 次 / 真人 pv {ar.get('fleet_human_pv')},剔除已标记噪音站 {ar.get('fleet_human_pv_excl_flagged', '?')}(快照 {ar.get('generated','?')[:10]}{stale};09-12 手测基线 {base})")
        for s_ in sorted(ar.get("sites", []), key=lambda x: -x.get("ai_ref", 0)):
            hosts = ", ".join(f"{h} {n}" for h, n in sorted(s_.get("by_host", {}).items(), key=lambda kv: -kv[1])) or "—"
            out.append(f"- {s_['site']}: {s_.get('ai_ref', 0)} / {s_.get('human_pv', 0)} pv · {hosts}" + (f" · ⚠ pv 不是读者数:{s_['pv_caveat']}" if s_.get('pv_caveat') else ''))
        if ar.get("errors"):
            out.append("- 未读到:" + " | ".join(ar["errors"]))
    out.append("")

    # 渠道构成(2026-09-15):每个站的读者从哪来。在这之前只有 eco 被手查过,而同日手查 bpj
    # 的答案与 eco 正相反(bpj 第一大来源是 Google,eco 的 Google 是 0)——所以"按 Google 优化"
    # 这件事,每个站必须先看自己的这一行再决定。
    ts = load(os.path.join(ROOT, "data/fleet-traffic-sources.json"))
    out.append("## 渠道构成(28 天窗;`search` 指真正的搜索引擎引荐,不是排名)")
    if "__error__" in ts or not ts.get("sites"):
        out.append("- 快照不可用:" + str(ts.get("__error__") or "尚无数据")
                   + "(worker 的 /api/pulse 要先部署 2026-09-15 的 by_source 才有读数)")
    else:
        ta = age_days(today, ts.get("generated", ""))
        stale = " **STALE**" if (ta is None or ta > 3) else ""
        f = ts.get("fleet") or {}
        out.append(f"- 舰队合计(快照 {ts.get('generated','?')[:10]}{stale}):"
                   + " · ".join(f"{k} {f.get(k, 0)}" for k in ["search", "ai", "fleet", "social", "self", "direct", "other"]))
        for s_ in sorted(ts.get("sites", []), key=lambda x: -(x.get("by_source", {}).get("search", 0))):
            b = s_.get("by_source", {})
            eng = ", ".join(f"{h} {n}" for h, n in list(s_.get("by_search", {}).items())[:3]) or "—"
            g = sum(n for h, n in s_.get("by_search", {}).items() if h.startswith("google.") or ".google." in h or h == "google.com")
            out.append(f"- {s_['site']}: 搜索 {b.get('search', 0)} / AI {b.get('ai', 0)} / 舰队内 {b.get('fleet', 0)}"
                       f" / 社交 {b.get('social', 0)} / 直接 {b.get('direct', 0)} · Google {g} · 前三 {eng}")
        if ts.get("errors"):
            out.append("- 未读到:" + " | ".join(ts["errors"]))
        out.append("- **读法**:自己这一行 Google = 0,就不要做「给 Google 看」的优化(eco 09-15 的教训);"
                   "`舰队内` 是兄弟站互链真的送来的人,不是链接数。")

    # 钱线仪表盘(2026-09-21「营收目标增长」):手册 08-23 起要求每次报告带钱线,此前只能由有 Cloudflare MCP
    # 的会话手查 D1。现在读 heartbeat 写的快照;各站钱线口径不同,不归一化成假的统一口径。
    mo = load(os.path.join(ROOT, "data/fleet-money.json"))
    out.append("## 钱线仪表盘(28 天窗,各站自己的口径;owner 亲报的 PartnerNet 数字带数据窗)")
    if "__error__" in mo or not mo.get("sites"):
        out.append("- 快照不可用:" + str(mo.get("__error__") or "尚无数据") + "(五站 pulse/reach 的 money 键要先部署)")
    else:
        ma = age_days(today, mo.get("generated", ""))
        stale = " **STALE**" if (ma is None or ma > 3) else ""
        out.append(f"- 快照 {mo.get('generated','?')[:10]}{stale}")
        for s_ in mo.get("sites", []):
            sm = s_.get("summary") or {}
            f_ = lambda v: "—" if v is None else str(v)
            extra = ""
            m_ = s_.get("money") or {}
            if s_["site"] == "getecoback":
                extra = f" · us-market {m_.get('affiliate_click_us_market_28d','—')} · amazon.com {m_.get('affiliate_click_amazon_com_28d','—')}"
            elif s_["site"] == "baipiaoji":
                extra = f" · go {m_.get('go_28d','—')} · 厂商 biz {m_.get('biz_28d','—')} · 投稿累计 {m_.get('submissions_total','—')} · watches {m_.get('watches','—')}"
            elif s_["site"] == "buysomething":
                extra = f" · mcp_call {m_.get('mcp_call_28d','—')} · out_click {m_.get('out_click_28d','—')}"
            elif s_["site"] == "agiscorecard":
                extra = f" · invest_tool_click {m_.get('ev_invest_tool_click_28d','—')} · /advertise pv {m_.get('pv_advertise_28d','—')} · /audits pv {m_.get('pv_audits_28d','—')}"
            out.append(f"- {s_['site']}: 联盟点击 {f_(sm.get('affiliate_click_28d'))} / 付费订单 {f_(sm.get('paid_orders'))} / 订阅 {f_(sm.get('subscribers'))}{extra} ({s_.get('via')})")
        own = (mo.get("owner_reported") or {}).get("amazon_de_partnernet") or {}
        if own:
            out.append(f"- owner 亲报 PartnerNet DE(30 天窗至 {own.get('window_end')}):佣金 €{own.get('commission_eur')} · {own.get('clicks')} 点击 · 待办 {own.get('payout_blocked')}")
        if mo.get("errors"):
            out.append("- 未读到:" + " | ".join(mo["errors"]))
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
