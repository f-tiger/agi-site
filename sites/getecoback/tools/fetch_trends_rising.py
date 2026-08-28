#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""快反信号面(2026-08-23,owner:「监控谷歌trends,让站点快速获取流量」)。

全国热搜 RSS(fetch_trends_de.mjs)抓的是新闻头条,四天里 niche 命中只有
「wetter <城市>」——打不中可出页的需求词。真正能触发「当天出页抢流量」的是
**种子词的 rising 关联查询**(如 luftentfeuchter schimmel +250%),本脚本补上:
trendspy 拉德国 geo 的 related_queries rising,写 data/trends-rising.json。
规则同舰队管线:≥30s 间隔、keep-last-good、抓不到绝不伪造。
"""
import json, os, re, sys, time
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "trends-rising.json")
# 2026-08-26 v2 品类补研(docs/amazon-category-strategy-2026-08.md):+3 个 6%/5% 带
# 高客单候选(kaffeevollautomat €18-72/单、akku staubsauger €12-36、matratze €12-30)。
# 10 seeds × 2/日 = 5 天全覆盖;rising 数据先证需求,快反规则再决定建页。
# saugwischer added 2026-08-28: the niche scan found Nass-Trockensauger is the
# rising sub-segment of Bodenpflege (Tineco/Dreame duopoly press wave), and the
# "akku staubsauger" seed does not capture those queries. 10 seeds × 2/day = 5-day
# full coverage.
SEEDS = ["luftentfeuchter", "heizlüfter", "balkonkraftwerk",
         "klimaanlage", "schimmel entfernen", "infrarotheizung",
         "kaffeevollautomat", "akku staubsauger", "matratze", "saugwischer"]
GEO = "DE"
TIMEFRAME = "today 3-m"
GAP_S = 60
SEEDS_PER_RUN = 2  # 配额极严:每日轮换 2 个,3 天全覆盖


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


def fetch_rising_rows(tr, seed, geo, timeframe):
    """related_queries with the referer fix trendspy itself suggests, one
    120s retry on quota errors, and graceful fallback if the installed
    trendspy version does not accept a headers kwarg."""
    for attempt in range(2):
        if attempt:
            time.sleep(120)
        try:
            try:
                rq = tr.related_queries(seed, geo=geo, timeframe=timeframe,
                                        headers={"referer": "https://www.google.com/"})
            except TypeError:
                rq = tr.related_queries(seed, geo=geo, timeframe=timeframe)
            return normalize_rising(rq) if "normalize_rising" in globals() else normalize(rq)
        except Exception as e:  # noqa: BLE001
            msg = str(e)
            print(f"  rising error {seed!r}: {msg[:120]}", file=sys.stderr)
            if "quota" not in msg.lower():
                return []
    return []




def autocomplete_terms(seed, hl, gl):
    """Quota-free fallback signal: Google autocomplete for the seed. A term
    APPEARING vs yesterday's snapshot is our rising proxy (v='new')."""
    import urllib.parse, urllib.request
    url = ("https://suggestqueries.google.com/complete/search?client=firefox"
           f"&hl={hl}&gl={gl}&q=" + urllib.parse.quote(seed))
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    data = json.loads(urllib.request.urlopen(req, timeout=15).read().decode("utf-8", "replace"))
    return [str(t)[:80] for t in (data[1] if len(data) > 1 else [])][:10]


def main():
    from trendspy import Trends
    os.makedirs(os.path.join(ROOT, "data"), exist_ok=True)
    previous = {}
    if os.path.exists(OUT):
        try:
            previous = json.load(open(OUT, encoding="utf-8")).get("seeds", {})
        except Exception:
            previous = {}
    tr = Trends()
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    result = dict(previous)  # 未轮到的种子保留上次数据
    off = datetime.now(timezone.utc).toordinal() % len(SEEDS)
    todays = [SEEDS[(off + k) % len(SEEDS)] for k in range(SEEDS_PER_RUN)]
    print(f"today's rotation: {todays}")
    for i, seed in enumerate(todays):
        if i:
            time.sleep(GAP_S)
        rows = fetch_rising_rows(tr, seed, GEO, TIMEFRAME)
        if not rows:
            try:
                terms = autocomplete_terms(seed, "de", "DE")
                pv = previous.get(seed, {}) if isinstance(previous, dict) else {}
                prev_terms = set(pv.get("auto", []))
                new = [t for t in terms if t not in prev_terms and t.strip().lower() != seed.strip().lower()]
                if terms:
                    result[seed] = {"auto": terms, "rising": [{"q": t, "v": "new"} for t in new],
                                    "source": "autocomplete-diff",
                                    "fetched": datetime.now(timezone.utc).strftime("%Y-%m-%d")}
                    print(f"  autocomplete fallback {seed!r}: {len(terms)} terms, {len(new)} new")
                    continue
            except Exception as e:  # noqa: BLE001
                print(f"  autocomplete error {seed!r}: {e}", file=sys.stderr)
        if rows:
            result[seed] = {"rising": rows, "source": "related-queries", "fetched": today}
    if result:
        json.dump({"fetched": today, "geo": GEO, "seeds": result},
                  open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        print(f"OK: {len(result)} seeds → trends-rising.json")
    else:
        print("no data at all (fresh repo + quota) — nothing written", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
