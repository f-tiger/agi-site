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
SEEDS = ["luftentfeuchter", "heizlüfter", "balkonkraftwerk",
         "klimaanlage", "schimmel entfernen", "infrarotheizung"]
GEO = "DE"
TIMEFRAME = "today 3-m"
GAP_S = 30


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
    result = {}
    for i, seed in enumerate(SEEDS):
        if i:
            time.sleep(GAP_S)
        rows = []
        try:
            rows = normalize(tr.related_queries(seed, geo=GEO, timeframe=TIMEFRAME))
        except Exception as e:  # noqa: BLE001
            print(f"rising error {seed!r}: {e}", file=sys.stderr)
        if rows:
            result[seed] = {"rising": rows, "fetched": today}
        elif seed in previous:
            result[seed] = previous[seed]
    if result:
        json.dump({"fetched": today, "geo": GEO, "seeds": result},
                  open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        print(f"OK: {len(result)} seeds → trends-rising.json")
    else:
        print("all seeds failed — previous file untouched", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
