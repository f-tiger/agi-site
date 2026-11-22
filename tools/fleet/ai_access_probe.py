#!/usr/bin/env python3
"""Compare public responses from the runner with browser and crawler user agents.

Fetch both browser controls before sending crawler-UA probes. If either control
fails, record the crawler requests as untested and leave availability diagnosis
to heartbeat. Preserve the existing blocked_sites field for 401/403/429/503
responses where both controls worked. These are observations from the runner's
IP. Real crawler access, indexing and citation require separate evidence.

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

# ?ci=1 marks self-test traffic on goldrush and the six after35-events sites; the rest ignore it.
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
    ("firstjob", "https://firstjob.agiscorecard.com"),
    ("codeword", "https://codeword.agiscorecard.com"),
    ("powerbill", "https://powerbill.agiscorecard.com"),
    # Four deployed sites that no fleet instrument watched until 2026-09-23.
    ("localebatch", "https://localebatch.agiscorecard.com"),
    ("agent-delivery-lab", "https://verify.agiscorecard.com"),
    ("venture-lab", "https://rfqdesk.agiscorecard.com"),
    ("web3-studio", "https://web3.agiscorecard.com"),
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
    # TDS bot logging excludes this header; query markers alone are insufficient.
    req = urllib.request.Request(url, headers={
        "User-Agent": ua,
        "Accept": "text/html,text/plain,*/*",
        "X-Probe": "fleet-ai-access",
        "DNT": "1",
        "Sec-GPC": "1",
    })
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            r.read(4096)
            return {"status": r.status}
    except urllib.error.HTTPError as e:
        return {"status": e.code}
    except Exception as e:  # DNS, TLS, timeout, reset
        return {"status": 0, "error": str(e)[:120]}


def probe_url(origin, path):
    # Every probe request carries ci=1 (2026-09-23). The control request uses a
    # browser UA, and the six workers on after35-events (after35/learn/fanzha/
    # firstjob/codeword/powerbill) do not know __probe: they logged it as a human
    # page_view, two rows per site per day, in the very pv the fleet judges them
    # on. All of them skip logging on ci=1; goldrush already did. Checked the same
    # day that all 18 sites return the identical status with and without ci=1,
    # and a block happens at the edge before the worker sees the query anyway.
    sep = "&" if "?" in path else "?"
    return f"{origin}{path}{sep}ci=1&__probe=1&__ci=1"


def probe_site(name, origin, fetcher=fetch):
    control_name, control_ua = CONTROL
    control_rows = {path: fetcher(probe_url(origin, path), control_ua) for path in PATHS}
    rows = {control_name: control_rows}
    can_compare = all(result.get("status") == 200 for result in control_rows.values())
    for agent, ua in AGENTS:
        rows[agent] = {
            path: fetcher(probe_url(origin, path), ua) if can_compare else {"status": None}
            for path in PATHS
        }
    return {"site": name, "origin": origin, "agents": rows}


def classify(site_result):
    """Return whether controls worked and the sampled access failures."""
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


def reported_status(result):
    status = result["status"]
    return "0 " + result.get("error", "") if status == 0 else status


def selftest():
    def mk(ctrl, agent_status, agent="GPTBot", path="/"):
        rows = {CONTROL[0]: {p: {"status": ctrl} for p in PATHS}}
        for a, _ in AGENTS:
            rows[a] = {p: {"status": 200} for p in PATHS}
        rows[agent][path] = {"status": agent_status}
        return {"site": "x", "origin": "https://x", "agents": rows}
    attempts = []

    def unhealthy_control(url, ua):
        attempts.append((url, ua))
        return {"status": 429 if "/llms.txt?" in url else 200}

    incomplete = probe_site("x", "https://example.com", unhealthy_control)
    checks = [
        ("all 200 → valid, none blocked", classify(mk(200, 200)) == (True, [])),
        ("agent 403 → blocked", classify(mk(200, 403)) == (True, [{"agent": "GPTBot", "path": "/", "status": 403}])),
        ("agent 503 on llms.txt → blocked", classify(mk(200, 503, "ClaudeBot", "/llms.txt"))[1] == [{"agent": "ClaudeBot", "path": "/llms.txt", "status": 503}]),
        ("control not 200 → invalid, not judged", classify(mk(403, 403)) == (False, [])),
        ("agent 404 is not a block", classify(mk(200, 404)) == (True, [])),
        ("agent network error (0) is not a block", classify(mk(200, 0)) == (True, [])),
        ("QA query markers", probe_url("https://goldrush.agiscorecard.com", "/") == "https://goldrush.agiscorecard.com/?ci=1&__probe=1&__ci=1"),
        ("failed control sends only the two control GETs", len(attempts) == len(PATHS) and all(ua == CONTROL[1] for _, ua in attempts)),
        ("skipped user agents retain a null status", all(reported_status(result) is None for agent, _ in AGENTS for result in incomplete["agents"][agent].values())),
        ("network error preserves its reason", reported_status({"status": 0, "error": "timeout"}) == "0 timeout"),
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
        flat = {agent: {path: reported_status(result) for path, result in paths.items()}
                for agent, paths in r["agents"].items()}
        out_sites.append({"site": r["site"], "origin": r["origin"], "valid": valid, "blocked": blocked,
                          "crawler_user_agents_tested": valid, "status": flat})
        mark = "⚠️ " if not valid else ("🚫" if blocked else "✅")
        detail = "crawler user agents untested" if not valid else f"access failures: {blocked}"
        print(f"{mark} {r['site']:<13} control={flat[CONTROL[0]]} {detail}")
    snap = {
        "checked": dt.datetime.now(dt.timezone.utc).replace(microsecond=0, tzinfo=None).isoformat() + "Z",
        "paths": PATHS,
        "agents": [a for a, _ in AGENTS],
        "scope": "Synthetic user agents from this runner. A null status was not tested. A 200 does not establish real crawler access, indexing or citation.",
        "invalid_sites": invalid,
        "blocked_sites": [s["site"] for s in out_sites if s["blocked"]],
        "sites": out_sites,
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    open(OUT, "w", encoding="utf-8").write(json.dumps(snap, ensure_ascii=False, indent=1) + "\n")
    print(f"wrote {os.path.relpath(OUT, ROOT)}")
    if invalid:
        print(f"::warning::Crawler user agents untested for {', '.join(invalid)} because a browser control failed")
    if any_blocked:
        print("::error::Crawler user-agent requests failed while the browser controls passed on: "
              + ", ".join(snap["blocked_sites"]))
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
