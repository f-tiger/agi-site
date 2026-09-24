#!/usr/bin/env python3
"""One comparable reading of the fleet's machine face (MCP), written down every day.

Why this exists (2026-09-24 retrospective). Three sites now serve MCP — buysomething, getecoback,
baipiaoji — and each of them had to learn the same lesson alone: **the raw call count is mostly us**.
eco's worker carries the scar in a comment ("the same mistake — an indexer counted as a third-party
client — has been made twice before"); SR's first week read 80 calls of which 58 were its own deploy
self-check and sandbox curl. Nobody was comparing the three, and every "the machine face is being
used" claim had to be re-derived by hand from D1.

So this script fixes the vocabulary once, reads whatever each site can expose without a token, and
writes `data/fleet-mcp-usage.json`. It is deliberately unable to flatter:

  ci        our own deploy/smoke robots                        — never demand
  operator  bare curl/wget/node/python clients, or no UA       — could be us poking; never demand
  indexer   self-identified collectors, audits, censuses       — discovery, not use
  other     everything else                                    — the only bucket that can be demand

  demand caller = >=10 calls carrying arguments, on >=5 distinct days, with argument variety
                  >= 1/4 of those calls.

The variety clause is the 2026-09-24 addition and it was written *because* of a reading, not in the
abstract: eco's top caller sent 180 argument-bearing calls across 20 days using **nine** distinct
argument sets. Under the previous threshold that was a win; it is a replayer. Tightening a line before
anything qualifies is allowed and is the only honest moment to do it.

Sites differ in what they can answer, and the output says so per site rather than printing a zero that
looks like a measurement: SR records argument *names* only (privacy choice) so its variety is
shape-only; eco records argument values so its variety is stronger; bpj records neither and exposes no
aggregate at all, so it reports `exposed: false` instead of 0.

Usage: python3 tools/fleet/mcp_usage.py [--selftest]   (runs in fleet-heartbeat.yml; no token, no cron)
"""
import datetime as dt
import json
import os
import sys
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "data", "fleet-mcp-usage.json")
UA = {"User-Agent": "agi-site-fleet-mcp-usage/1.0 (+https://github.com/f-tiger/agi-site)", "Accept": "application/json"}
STALE_RED_DAYS = 3

SITES = [
    {"site": "buysomething", "url": "https://source.agiscorecard.com/api/pulse", "shape": "pulse_mcp",
     "endpoint": "/api/mcp"},
    {"site": "getecoback", "url": "https://getecoback.com/api/trend", "shape": "trend_mcp",
     "endpoint": "/mcp/v1"},
    {"site": "baipiaoji", "url": "https://baipiaoji.com/api/reach", "shape": "none",
     "endpoint": "/api/mcp",
     "note": "no machine-face aggregate exposed yet; D1 has the rows (hits.ev='api', path /api/mcp*) but no arguments and no CI exclusion"},
]


def fetch(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=25) as r:
        return json.loads(r.read().decode("utf-8", "replace"))


def normalise(cfg, payload):
    """Pure: one site's payload → the common row. Missing answers are named, never zeroed."""
    row = {"site": cfg["site"], "endpoint": cfg["endpoint"], "exposed": True, "missing": []}
    if cfg["shape"] == "pulse_mcp":
        m = (payload or {}).get("mcp")
        if not isinstance(m, dict):
            return {**row, "exposed": False, "missing": ["mcp block absent from /api/pulse"]}
        row.update({
            "days": m.get("days"), "calls": m.get("calls", 0), "ci": m.get("ci", 0),
            "operator": m.get("operator", 0), "indexer": m.get("indexer", 0), "other": m.get("other", 0),
            "with_args": m.get("with_args", 0), "callers": m.get("callers", 0),
            "demand_callers": m.get("demand_callers", 0), "variety": m.get("variety"),
            "best_caller": m.get("best"),
        })
        return row
    if cfg["shape"] == "trend_mcp":
        tools = (payload or {}).get("mcp")
        if not isinstance(tools, list):
            return {**row, "exposed": False, "missing": ["mcp block absent from /api/trend"]}
        calls = sum(int(t.get("n") or 0) for t in tools)
        return {**row, "days": 28, "calls": calls, "by_tool": {str(t.get("tool")): int(t.get("n") or 0) for t in tools},
                "ci": 0, "ci_note": "the worker already refuses to log its own smoke UA, so these are non-CI calls",
                "missing": ["caller classes", "argument variety", "demand_callers"],
                "demand_callers": None}
    return {**row, "exposed": False, "missing": [cfg.get("note", "no aggregate endpoint")]}


def summarise(rows):
    """Pure: fleet totals + the one sentence that decides the open bets."""
    seen = [r for r in rows if r.get("exposed")]
    calls = sum(int(r.get("calls") or 0) for r in seen)
    demand = [r for r in seen if isinstance(r.get("demand_callers"), int)]
    demand_total = sum(r["demand_callers"] for r in demand)
    unknown = [r["site"] for r in seen if r.get("demand_callers") is None] + [r["site"] for r in rows if not r.get("exposed")]
    return {
        "calls_28d": calls,
        "demand_callers": demand_total,
        "demand_measurable_on": [r["site"] for r in demand],
        "demand_unmeasurable_on": unknown,
        "verdict": ("no demand caller anywhere it can be measured" if demand_total == 0
                    else "%d demand caller(s)" % demand_total),
    }


def selftest():
    sr = normalise(SITES[0], {"mcp": {"days": 28, "calls": 83, "ci": 45, "operator": 13, "indexer": 14,
                                      "other": 11, "with_args": 11, "callers": 1, "demand_callers": 1,
                                      "variety": "shape_only", "best": {"calls": 11, "days": 6, "shapes": 8}}})
    assert sr["exposed"] and sr["demand_callers"] == 1 and sr["calls"] == 83, sr
    assert normalise(SITES[0], {})["exposed"] is False
    eco = normalise(SITES[1], {"mcp": [{"tool": "btu_empfehlung", "n": 100}, {"tool": "geraet_wahl", "n": 80}]})
    assert eco["calls"] == 180 and eco["demand_callers"] is None and "argument variety" in eco["missing"], eco
    bpj = normalise(SITES[2], {"ok": True})
    assert bpj["exposed"] is False and bpj["missing"], bpj
    s = summarise([sr, eco, bpj])
    assert s["calls_28d"] == 263 and s["demand_callers"] == 1, s
    assert s["demand_unmeasurable_on"] == ["getecoback", "baipiaoji"], s
    s0 = summarise([normalise(SITES[0], {"mcp": {"calls": 5, "ci": 5, "operator": 0, "indexer": 0, "other": 0,
                                                 "with_args": 0, "callers": 0, "demand_callers": 0}})])
    assert s0["demand_callers"] == 0 and "no demand caller" in s0["verdict"], s0
    print("mcp_usage selftest: OK")


def main(argv):
    if "--selftest" in argv:
        selftest()
        return 0
    try:
        prev = json.load(open(OUT, encoding="utf-8"))
    except Exception:
        prev = {}
    prev_rows = {r["site"]: r for r in prev.get("sites", [])}
    rows, errors = [], []
    for cfg in SITES:
        if cfg["shape"] == "none":
            rows.append(normalise(cfg, None))
            continue
        try:
            rows.append(normalise(cfg, fetch(cfg["url"])))
        except Exception as e:
            old = prev_rows.get(cfg["site"], {})
            stale = int(old.get("stale_days", 0)) + 1
            rows.append({**old, "site": cfg["site"], "exposed": False, "stale_days": stale,
                         "missing": ["fetch failed: %s" % str(e)[:80]]})
            if stale > STALE_RED_DAYS:
                errors.append("%s machine-face aggregate unreadable for %d days" % (cfg["site"], stale))
    doc = {"generated": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
           "window_days": 28,
           "rule": ("demand caller = >=10 argument-bearing calls, >=5 distinct days, argument variety >= 1/4 of "
                    "those calls; ci/operator/indexer never count. Pre-registered 2026-09-24, before anything qualified."),
           "sites": rows, "fleet": summarise(rows)}
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, indent=1)
        f.write("\n")
    print("fleet machine face: %d calls/28d across %d exposed site(s); %s"
          % (doc["fleet"]["calls_28d"], sum(1 for r in rows if r.get("exposed")), doc["fleet"]["verdict"]))
    for r in rows:
        print("  %-13s exposed=%-5s calls=%-6s demand=%s%s"
              % (r["site"], r.get("exposed"), r.get("calls", "-"), r.get("demand_callers"),
                 (" missing: " + "; ".join(r.get("missing", []))) if r.get("missing") else ""))
    for e in errors:
        print("::error::" + e)
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
