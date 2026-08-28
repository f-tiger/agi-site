#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""舰队 rising 关联查询触发器(2026-08-25,owner:「bpj 按谷歌趋势优化」+「其他
几个站点也要检查」)。

fleet_trends.mjs 抓的美国「当日热搜」RSS 结构性失效:bpj/agi/tds 三站的 niche
词表连续 6 天(08-20→08-25)全部 matched:[]——当日热搜面被体育/明星占满,打不到
各站需求。真正能触发「按需求出页/复核数据」的是**种子词的 rising 关联查询**
(deepseek → "deepseek free/pricing/alternative")。本脚本是 fleet_trends.mjs 的
rising 对应面:trendspy 拉三站种子的 related_queries rising,分别写各站 rising 文件。

架构与配额:与 fleet_trends.mjs 一样一次服务三站;但外部抓取遵守舰队「每次只抓 2
个种子」的配额纪律(eco/SR 独立验证过的上限)——三站种子合成一个池子,按序轮换,
每次运行只打 Google 2 次,全池 ~6 天覆盖一轮。keep-last-good、抓不到绝不伪造、
autocomplete 作零配额兜底。沙箱对 google 出网 403,只有 runner 能抓。

诚实边界:这是**选题输入,不是选题依据**。任何由 rising 词引出的页面仍要过三门
(尤其需求门)与各站硬内容规则;rising 词里的编造/幻名一律不落页。
"""
import json, os, re, sys, time
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GAP_S = 60
SEEDS_PER_RUN = 2  # 配额纪律:每次运行全池只打 Google 2 次

# 每站种子按各自「已挣得的需求面」挑,不是照抄工具名:
#  bpj = 免费额度目录 → 裸工具名,让 rising 浮出 "<工具> free/pricing/alternative";
#  agi = 判定型引用台账 → 只用定义型品类词(绝不用 openai/altman 这类实体,那会把
#        本站推向它明确回避的追新闻;品类词浮出的是 "is agi close/when will agi/agi
#        2027" —— 正是本站 33-37.5% 引用份额所在的判定题territory,喂 rung ⓪);
#  tds = 联盟产品目录 → niche 产品词,rising = 买家意图需求(同 eco/bpj)。
FLEET = [
    {"site": "bpj", "geo": "US", "out": "sites/baipiaoji/data/trends-rising.json",
     "seeds": ["deepseek", "midjourney", "suno", "sora", "gemini", "perplexity"]},
    {"site": "agi", "geo": "US", "out": "sites/agiscorecard/trends-rising.json",
     "seeds": ["artificial general intelligence", "agi timeline"]},
    {"site": "tds", "geo": "US", "out": "sites/thedollscout/content/trends-rising.json",
     "seeds": ["sex doll", "realdoll", "silicone doll"]},
    # eco 的美国面(2026-08-28,owner:「分别扩展德国与美国不同的热点」)。此前 eco 只有
    # 德国需求信号——sites/getecoback/tools/fetch_trends_rising.py 写死 GEO="DE",而
    # 「按美国趋势扩展」在没有美国数据时只能靠猜,那是本站明令禁止的。故先建数据面。
    # 种子刻意是**品类词而非型号**:eco 的美国面只有 /en/ 的 47 次真人浏览/28 天,
    # 还不足以承载型号级选品;品类 rising 才回答「美国读者此刻在找哪一类」这个问题。
    # 数据要等下一次 runner 跑(沙箱对 Google 403),首轮落库前不得据此出任何页。
    {"site": "eco-us", "geo": "US", "out": "sites/getecoback/data/trends-rising-us.json",
     "seeds": ["portable air conditioner", "dehumidifier"]},
    # 高费率品类扩展探针(2026-08-26,docs/highvalue-expansion-2026-08.md):不属于任何
    # 站点,只验需求——探针过线(v≥1.000 或连续两轮购买/求证意图)才进 KGR/建面流程。
    {"site": "probe-us", "geo": "US", "out": "data/probes-rising.json",
     "seeds": ["mattress fiberglass", "furniture scam", "counterfeit makeup"]},
    # probe-de 2026-08-26 更正(owner:载体=eco 自有域):撤手表种子(EcoBack 家居品牌
    # 装不下打假手表),换 eco-Faktencheck 直接可承接的家具/床垫消保意图。
    {"site": "probe-de", "geo": "DE", "out": "data/probes-de-rising.json",
     "seeds": ["matratze fiberglas", "möbel online shop seriös"]},
]
# (site_index, seed) 扁平池,供全局轮换。
POOL = [(i, s) for i, cfg in enumerate(FLEET) for s in cfg["seeds"]]


def normalize(rq):
    rows = rq.get("rising") if isinstance(rq, dict) else rq
    out = []
    if rows is None:
        return out
    try:
        iterable = rows.to_dict("records") if hasattr(rows, "to_dict") else list(rows)
    except Exception:
        return out
    for r in iterable:
        try:
            if isinstance(r, dict):
                q = r.get("query") or r.get("q") or ""
                v = r.get("value") or 0
            else:
                q = getattr(r, "query", "") or str(r)
                v = getattr(r, "value", 0)
            if not q:
                continue
            if isinstance(v, str):
                v = 100000 if "break" in v.lower() else int(re.sub(r"[^0-9]", "", v) or 0)
            out.append({"q": str(q)[:80], "v": int(v)})
        except Exception:
            continue
    out.sort(key=lambda x: -x["v"])
    return out[:10]


def fetch_rising_rows(tr, seed, geo, timeframe="today 3-m"):
    """related_queries with the referer fix trendspy suggests, one 120s retry on
    quota errors, graceful fallback if the installed version rejects headers."""
    for attempt in range(2):
        if attempt:
            time.sleep(120)
        try:
            try:
                rq = tr.related_queries(seed, geo=geo, timeframe=timeframe,
                                        headers={"referer": "https://www.google.com/"})
            except TypeError:
                rq = tr.related_queries(seed, geo=geo, timeframe=timeframe)
            return normalize(rq)
        except Exception as e:  # noqa: BLE001
            msg = str(e)
            print(f"  rising error {seed!r}: {msg[:120]}", file=sys.stderr)
            if "quota" not in msg.lower():
                return []
    return []


def autocomplete_terms(seed, hl, gl):
    """Quota-free fallback: Google autocomplete. A term APPEARING vs the last
    snapshot is our rising proxy (v='new')."""
    import urllib.parse, urllib.request
    url = ("https://suggestqueries.google.com/complete/search?client=firefox"
           f"&hl={hl}&gl={gl}&q=" + urllib.parse.quote(seed))
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    data = json.loads(urllib.request.urlopen(req, timeout=15).read().decode("utf-8", "replace"))
    return [str(t)[:80] for t in (data[1] if len(data) > 1 else [])][:10]


def load_seeds(path):
    if os.path.exists(path):
        try:
            return json.load(open(path, encoding="utf-8")).get("seeds", {})
        except Exception:
            return {}
    return {}


def main():
    from trendspy import Trends
    tr = Trends()
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    # RISING_ALL=1(一次性 bootstrap,workflow_dispatch 手动开):抓全池,一次填满三站。
    # 只用于首次铺底/手动重铺;日常仍走 2/run 轮换配额纪律,绝不设成常态。
    if os.environ.get("RISING_ALL", "").strip().lower() in ("1", "true", "yes"):
        todays = list(POOL)
        print(f"BOOTSTRAP full sweep: {len(todays)} seeds (RISING_ALL)")
    else:
        # 全池按 ordinal 轮换,每天前进 SEEDS_PER_RUN 个(不是 1)——否则相邻两天窗口
        # 重叠、每天只添 1 个新种子,11 种子要 11 天才首次填满 agi/tds。步进 = 每次取的
        # 数量,则无重叠,~6 天覆盖一轮,agi/tds 首次数据也在 6 天内到。
        off = (datetime.now(timezone.utc).toordinal() * SEEDS_PER_RUN) % len(POOL)
        todays = [POOL[(off + k) % len(POOL)] for k in range(SEEDS_PER_RUN)]
        print(f"today's rotation: {[(FLEET[i]['site'], s) for i, s in todays]}")

    # 各站现存种子先读进内存,只更新本次轮到的,其余保留(keep-last-good)。
    state = {i: load_seeds(cfg["out"]) for i, cfg in enumerate(FLEET)}

    for n, (si, seed) in enumerate(todays):
        if n:
            time.sleep(GAP_S)
        cfg = FLEET[si]
        geo = cfg["geo"]
        rows = fetch_rising_rows(tr, seed, geo)
        if rows:
            state[si][seed] = {"rising": rows, "source": "related-queries", "fetched": today}
            continue
        # 兜底:autocomplete diff
        try:
            terms = autocomplete_terms(seed, "en", geo.lower())
            prev = state[si].get(seed, {})
            prev_terms = set(prev.get("auto", []))
            new = [t for t in terms if t not in prev_terms and t.strip().lower() != seed.strip().lower()]
            if terms:
                state[si][seed] = {"auto": terms,
                                   "rising": [{"q": t, "v": "new"} for t in new],
                                   "source": "autocomplete-diff", "fetched": today}
                print(f"  autocomplete fallback {seed!r}: {len(terms)} terms, {len(new)} new")
        except Exception as e:  # noqa: BLE001
            print(f"  autocomplete error {seed!r}: {e}", file=sys.stderr)

    wrote = 0
    for i, cfg in enumerate(FLEET):
        seeds = state[i]
        if not seeds:
            continue  # 该站还没有任何数据(全新+配额)——不写空文件
        path = os.path.join(ROOT, cfg["out"])
        os.makedirs(os.path.dirname(path), exist_ok=True)
        json.dump({"fetched": today, "geo": cfg["geo"], "seeds": seeds},
                  open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        wrote += 1
        print(f"  {cfg['site']}: {len(seeds)} seeds → {cfg['out']}")
    if not wrote:
        print("no data at all (fresh repo + quota) — nothing written", file=sys.stderr)
        sys.exit(1)
    print(f"OK: {wrote}/{len(FLEET)} site rising files updated")


if __name__ == "__main__":
    main()
