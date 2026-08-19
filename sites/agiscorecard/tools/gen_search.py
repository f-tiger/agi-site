#!/usr/bin/env python3
"""Build /search-index.json for the client-side site search (/search).

站内搜索的意义(owner 指令 2026-08-08)不只是找页面:每一次搜索词都会以
site_search 事件进 D1——搜索词=用户真实需求信号,零结果搜索=产品缺口,
每日运行读它们来驱动选题与工具开发(规则见 CLAUDE.md)。

Index = every indexable HTML page's {u:url-path, t:title, d:description, h:h1,
l:lang} + a few fixed entries for the domain-merged sub-sites (SunWatch/Compass),
so "股票/invest/红队" 之类的查询能把人送到对的工具。
Noindex pages (widget, search itself) and working files are excluded.
Rerun whenever pages are added/renamed: python3 tools/gen_search.py
"""
import glob
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

PAGES = sorted(
    glob.glob(os.path.join(ROOT, "*.html"))
    + glob.glob(os.path.join(ROOT, "*", "*.html"))
    + glob.glob(os.path.join(ROOT, "*", "*", "*.html"))
)
PAGES = [p for p in PAGES if os.sep + "tools" + os.sep not in p and os.sep + "." not in p]

def field(pattern, html):
    m = re.search(pattern, html, re.S | re.I)
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", m.group(1))).strip() if m else ""

entries = []
for f in PAGES:
    html = open(f, encoding="utf-8").read()
    if re.search(r'name="robots"[^>]*noindex', html, re.I):
        continue
    rel = os.path.relpath(f, ROOT).replace(os.sep, "/")
    url = "/" + (rel[:-5] if rel.endswith(".html") else rel)
    if url == "/index":
        url = "/"
    if url in ("/404", "/search"):
        continue
    title = field(r"<title>(.*?)</title>", html)
    if not title:
        continue
    entries.append({
        "u": url,
        "t": title,
        "d": field(r'<meta name="description" content="([^"]*)"', html)[:180],
        "h": field(r"<h1[^>]*>(.*?)</h1>", html)[:120],
        "l": field(r'<html lang="([^"]*)"', html) or "en",
    })

# Domain-merged tools: not crawlable from this repo, added as fixed entries so
# stock/invest-intent searches route to them. Keep titles honest and current.
entries += [
    {"u": "https://invest.agiscorecard.com/", "t": "SunWatch 行情台 — 触发线纪律与公开战绩",
     "d": "AI 赛道周期定位、A股/港股/美股买卖触发线、每 30 分钟机器盯守、公开战绩台账。", "h": "SunWatch Pro", "l": "zh-CN"},
    {"u": "https://invest.agiscorecard.com/en", "t": "SunWatch — market calls you can audit",
     "d": "Falsifiable price triggers across US, HK and China A-shares. Public track record, hits and misses side by side.", "h": "SunWatch", "l": "en"},
    {"u": "https://invest.agiscorecard.com/red-team", "t": "对抗审查台 — 每条在档判断的幸存概率",
     "d": "多轮多空对抗后的幸存概率、最强反方攻击、证伪条件,全部公开;信心变动当天邮件。", "h": "对抗审查台", "l": "zh-CN"},
    {"u": "https://invest.agiscorecard.com/method", "t": "十倍工程方法论 v2.1:八层纪律",
     "d": "杠铃结构、五要素、周期时钟、分数凯利、预登记派发、熔断复盘、红队对抗。", "h": "方法论", "l": "zh-CN"},
    {"u": "https://compass.agiscorecard.com/zh", "t": "AI 投资罗盘 — 大佬 13F 布局与共识分",
     "d": "8 位传奇投资人的 AI 持仓、罗盘共识分、赛道拆解;基于公开 SEC 13F。", "h": "AI 投资罗盘", "l": "zh-CN"},
    {"u": "https://compass.agiscorecard.com/en", "t": "AI Investing Compass — legends' 13F positioning",
     "d": "Eight legendary investors' AI holdings, a consensus score per AI stock, from public SEC 13F filings.", "h": "AI Investing Compass", "l": "en"},
    {"u": "https://compass.agiscorecard.com/zh/track-record", "t": "抄作业成绩单 — 跟着大佬抄 AI 作业赚了多少",
     "d": "用 13F 申报当天的收盘价回测(不是拿不到的季度末价),逐期给出累计收益与同期 QQQ 对照。", "h": "抄作业成绩单", "l": "zh-CN"},
    {"u": "https://compass.agiscorecard.com/en/track-record", "t": "Copy-Homework Scorecard — did copying the legends pay?",
     "d": "Backtested at each 13F's filing-date close — the first price a real person could pay — with QQQ as the benchmark.", "h": "Copy-Homework Scorecard", "l": "en"},
]

out = os.path.join(ROOT, "search-index.json")
json.dump(entries, open(out, "w"), ensure_ascii=False, separators=(",", ":"))
open(out, "a").write("\n")
print(f"search-index.json: {len(entries)} entries, {os.path.getsize(out)//1024}KB")
