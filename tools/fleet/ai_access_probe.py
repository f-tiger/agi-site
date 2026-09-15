#!/usr/bin/env python3
"""Fleet-wide AI-crawler reachability probe (zero AI, stdlib only).

Why this exists (2026-09-12, docs/ai-era-site-2026-09-12.md):
  * robots.txt allowing GPTBot is not the same as GPTBot getting a 200. Cloudflare's
    Bot Fight Mode / "Block AI Scrapers" / Pay-Per-Crawl defaults sit *above* robots and
    *below* the app, so a blocked crawler leaves no trace in any site's D1.
  * baipiaoji has had this probe since 08-xx (scripts/ai-crawler-probe.mjs) but the other
    seven sites had nothing, while the fleet manual literally promised "09-15 后若
    heartbeat 看到 GPTBot… 被 403,先解封" — heartbeat never looked. Now it does.

Contract:
  * For each site, fetch "/" and "/llms.txt" with each AI agent UA plus one ordinary
    browser UA (the control). Every request carries ?__probe=1 so edge middleware that
    honours it (baipiaoji) does not count us; workers that don't honour it classify these
    hits as `bot` anyway (all agent tokens are in tools/fleet/bot_ua.txt), so the known,
    constant noise is ≤1 bot row per agent per site per day at 08:00 UTC.
  * A site is only judged when its control UA got 200 on both paths (otherwise the site is
    down or the runner's egress is broken — heartbeat's own 200-probe already owns that).
  * BLOCKED = control 200 but an AI agent got 401/403/429/503 on any path.
  * Writes data/fleet-ai-access.json; exit 1 iff any site blocks any agent. Never writes
    guesses: a request that errors is recorded as status 0 with the error text.

Usage: python3 tools/fleet/ai_access_probe.py [--selftest] [--only=site,site]
"""
import concurrent.futures as cf
import datetime as dt
import json
import os
import sys
import urllib.error
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "data", "fleet-ai-access.json")

# goldrush counts ?ci=1 as self-test traffic and skips its UA audit; the rest ignore extra params.
SITES = [
    ("agiscorecard", "https://agiscorecard.com"),
    ("baipiaoji", "https://baipiaoji.com"),
    ("getecoback", "https://getecoback.com"),
    ("thedollscout", "https://thedollscout.com"),
    ("goldrush", "https://goldrush.agiscorecard.com"),
    ("gridlings", "https://play.agiscorecard.com"),
    ("buysomething", "https://source.agiscorecard.com"),
    ("gamesledger", "https://games.agiscorecard.com"),
    ("after35", "https://35.agiscorecard.com"),
    ("learn", "https://learn.agiscorecard.com"),
    ("fanzha", "https://fanzha.agiscorecard.com"),
]
PATHS = ["/", "/llms.txt"]

# UA strings as published by each vendor; the probe only GETs, never stores content.
AGENTS = [
    ("GPTBot", "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.1; +https://openai.com/gptbot"),
    ("OAI-SearchBot", "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot"),
    ("ChatGPT-User", "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot"),
    ("PerplexityBot", "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot"),
    ("Perplexity-User", "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; Perplexity-User/1.0; +https://perplexity.ai/perplexity-user"),
    ("ClaudeBot", "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ClaudeBot/1.0; +claudebot@anthropic.com"),
    ("Claude-User", "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; Claude-User/1.0; +Claude-User@anthropic.com"),
    ("Bingbot", "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)"),
]
CONTROL = ("(browser)", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36")
BLOCK_CODES = {401, 403, 429, 503}


def fetch(url, ua, timeout=20):
    req = urllib.request.Request(url, headers={"User-Agent": ua, "Accept": "text/html,text/plain,*/*"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            r.read(4096)
            return {"status": r.status}
    except urllib.error.HTTPError as e:
        return {"status": e.code}
    except Exception as e:  # DNS, TLS, timeout, reset
        return {"status": 0, "error": str(e)[:120]}


def probe_url(origin, path):
    sep = "&" if "?" in path else "?"
    if "goldrush" in origin and path == "/":
        path = "/?ci=1"
        sep = "&"
    return f"{origin}{path}{sep}__probe=1"


def probe_site(name, origin, fetcher=fetch):
    rows = {}
    for agent, ua in [CONTROL] + AGENTS:
        rows[agent] = {p: fetcher(probe_url(origin, p), ua) for p in PATHS}
    return {"site": name, "origin": origin, "agents": rows}


def classify(site_result):
    """Pure: returns (valid, blocked_list) for one site's raw rows."""
    rows = site_result["agents"]
    ctrl = rows.get(CONTROL[0], {})
    valid = all(ctrl.get(p, {}).get("status") == 200 for p in PATHS)
    blocked = []
    if valid:
        for agent, _ in AGENTS:
            for p in PATHS:
                st = rows.get(agent, {}).get(p, {}).get("status")
                if st in BLOCK_CODES:
                    blocked.append({"agent": agent, "path": p, "status": st})
    return valid, blocked


def selftest():
    def mk(ctrl, agent_status, agent="GPTBot", path="/"):
        rows = {CONTROL[0]: {p: {"status": ctrl} for p in PATHS}}
        for a, _ in AGENTS:
            rows[a] = {p: {"status": 200} for p in PATHS}
        rows[agent][path] = {"status": agent_status}
        return {"site": "x", "origin": "https://x", "agents": rows}
    checks = [
        ("all 200 → valid, none blocked", classify(mk(200, 200)) == (True, [])),
        ("agent 403 → blocked", classify(mk(200, 403)) == (True, [{"agent": "GPTBot", "path": "/", "status": 403}])),
        ("agent 503 on llms.txt → blocked", classify(mk(200, 503, "ClaudeBot", "/llms.txt"))[1] == [{"agent": "ClaudeBot", "path": "/llms.txt", "status": 503}]),
        ("control not 200 → invalid, not judged", classify(mk(403, 403)) == (False, [])),
        ("agent 404 is not a block", classify(mk(200, 404)) == (True, [])),
        ("agent network error (0) is not a block", classify(mk(200, 0)) == (True, [])),
        ("goldrush root gets ci=1", probe_url("https://goldrush.agiscorecard.com", "/") == "https://goldrush.agiscorecard.com/?ci=1&__probe=1"),
        ("other root gets __probe only", probe_url("https://baipiaoji.com", "/llms.txt") == "https://baipiaoji.com/llms.txt?__probe=1"),
    ]
    bad = [n for n, ok in checks if not ok]
    for n, ok in checks:
        print(("✅ " if ok else "❌ ") + n)
    return 1 if bad else 0


def main(argv):
    if "--selftest" in argv:
        return selftest()
    only = None
    for a in argv:
        if a.startswith("--only="):
            only = set(a.split("=", 1)[1].split(","))
    sites = [s for s in SITES if not only or s[0] in only]
    with cf.ThreadPoolExecutor(max_workers=len(sites)) as ex:
        raw = list(ex.map(lambda s: probe_site(*s), sites))
    out_sites, any_blocked, invalid = [], False, []
    for r in raw:
        valid, blocked = classify(r)
        any_blocked |= bool(blocked)
        if not valid:
            invalid.append(r["site"])
        # keep the error text for status 0 — "0" alone cannot distinguish DNS from a proxy refusing CONNECT
        flat = {a: {p: (r["agents"][a][p].get("status") or ("0 " + r["agents"][a][p].get("error", ""))) for p in PATHS}
                for a in r["agents"]}
        out_sites.append({"site": r["site"], "origin": r["origin"], "valid": valid, "blocked": blocked, "status": flat})
        mark = "⚠️ " if not valid else ("🚫" if blocked else "✅")
        print(f"{mark} {r['site']:<13} control={flat[CONTROL[0]]}  " + (f"BLOCKED {blocked}" if blocked else ""))
    snap = {
        "checked": dt.datetime.now(dt.timezone.utc).replace(microsecond=0, tzinfo=None).isoformat() + "Z",
        "paths": PATHS,
        "agents": [a for a, _ in AGENTS],
        "invalid_sites": invalid,
        "blocked_sites": [s["site"] for s in out_sites if s["blocked"]],
        "sites": out_sites,
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    open(OUT, "w", encoding="utf-8").write(json.dumps(snap, ensure_ascii=False, indent=1) + "\n")
    print(f"wrote {os.path.relpath(OUT, ROOT)}")
    if invalid:
        print(f"::warning::probe invalid for {', '.join(invalid)} — control UA did not get 200 on both paths; not judged")
    if any_blocked:
        print("::error::AI crawlers blocked on: " + ", ".join(snap["blocked_sites"])
              + " — robots.txt allows them but the edge does not. Cloudflare dashboard → Security → Bots:"
              " turn off Bot Fight Mode / Block AI Scrapers (Pay-Per-Crawl default since 2026-09-15) for that zone."
              " While this is red, no AI assistant can cite the site, whatever the content says.")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
