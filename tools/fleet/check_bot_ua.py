#!/usr/bin/env python3
"""舰队级 bot UA 分类器一致性检查(2026-09-12 舰队进化)。

起因:09-12 agiscorecard 的 ua_audit 抓到 panscient.com 一天 288 次被算成 human,当天加进了
它的正则。查下来六个 worker 各有一份自己的正则,从 9 个 token(buysomething)到 55 个
(agiscorecard)不等——同一个爬虫在一站是 bot、在另外五站是「真人」。台账口径要求各站
人类 pv 可比,分类器不一致就是台账不可比。

规矩:
  * `tools/fleet/bot_ua.txt` 是唯一权威;每个 worker 里的正则字面量必须与它逐字相同。
  * 只收自报家门的爬虫/扫描器 token。**主流浏览器 UA 永远不进正则**——那个方向的错会
    静默抹掉真读者(agi 站规原文)。伪装成浏览器的探针用 09-12 那条行为 SQL 在读数时扣除。
  * 两个方向都要测:样本里的爬虫必须全部命中,样本里的真人必须全部不命中。任一失败 → 退出 1。
挂在 fleet-heartbeat 里跑,漂移了就走 GitHub 失败邮件(唯一不经过 AI 的告警通道)。
"""
import re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
CANON = (ROOT / "tools/fleet/bot_ua.txt").read_text(encoding="utf-8").strip()

WORKERS = [
    "sites/agiscorecard/tools/analytics-worker/index.js",
    "sites/gridlings/worker.js",
    "sites/goldrush/worker.js",
    "sites/getecoback/src/worker.js",
    "sites/buysomething/worker.js",
    "sites/gamesledger/worker.js",
    "sites/after35/worker.js",
    "sites/learn/worker.js",
    "sites/fanzha/worker.js",
]

BOTS = [
    "panscient.com", "curl/8.5.0", "python-requests/2.32",
    "Mozilla/5.0 (compatible; GPTBot/1.2; +https://openai.com/gptbot)",
    "Mozilla/5.0 (compatible; ClaudeBot/1.0)", "Mozilla/5.0 (compatible; PerplexityBot/1.0)",
    "Expanse, a Palo Alto Networks company", "Mozilla/5.0 zgrab/0.x", "Go-http-client/1.1",
    "node-fetch/1.0", "okhttp/4.9.3", "Mozilla/5.0 (compatible; SemrushBot/7~bl)",
    "Mozilla/5.0 (compatible; Bytespider; spider-feedback@bytedance.com)", "CensysInspect/1.1",
    "undici", "node", "Wget/1.21", "ChatGPT-User/1.0", "Mozilla/5.0 (compatible; AhrefsBot/7.0)",
    "Scrapy/2.11", "HeadlessChrome/120.0", "monitor-probe/1.0", "Mozilla/5.0 (compatible; bingbot/2.0)",
]
HUMANS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.0.0",
    "Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Linux; Android 13; Pixel 7; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/127.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/127.0.0.0 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Linux; Android 14; 2312DRA50C) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36 XiaoMi/MiuiBrowser/18.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0",
]

def main() -> int:
    bad = 0
    rx = re.compile(CANON, re.I)
    miss = [u for u in BOTS if not rx.search(u)]
    fp = [u for u in HUMANS if rx.search(u)]
    if miss: print("::error::canonical regex misses crawlers:", miss); bad = 1
    if fp: print("::error::canonical regex would erase real readers:", fp); bad = 1
    lit = "/" + CANON + "/i"
    for w in WORKERS:
        text = (ROOT / w).read_text(encoding="utf-8")
        n = text.count(lit)
        if n != 1:
            print(f"::error::{w}: canonical bot regex literal found {n} times (want exactly 1) — drifted from tools/fleet/bot_ua.txt")
            bad = 1
        else:
            print(f"  ok   {w}")
    print("bot-ua parity:", "FAIL" if bad else "OK", f"({len(CANON.split('|'))} tokens, {len(BOTS)} bot / {len(HUMANS)} human samples)")
    return bad

if __name__ == "__main__":
    sys.exit(main())
