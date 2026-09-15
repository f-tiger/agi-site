#!/usr/bin/env python3
"""AI-assistant referrals per site, 28-day window, read from each site's D1 (zero AI).

The fleet's only proven distribution edge that does not depend on Google traffic is being
*cited by AI systems* (agiscorecard: 33–37.5 % citation share on "are we close to agi"
class queries, Bing data). Until 2026-09-12 no daily instrument counted the humans those
citations send back. This one does: a page view whose referrer host is an AI assistant
(ChatGPT, Perplexity, Claude, Copilot, Gemini, Kagi, You, Poe, Mistral, DeepSeek, Kimi,
Doubao, Yiyan, Metaso). Baseline measured by hand on 2026-09-12 (28 d, human only):
agi 20 / 27 662 pv, bpj 33 / 1 888, eco 16 / 381, five other sites 0 → fleet 69.

Mechanics:
  * 2026-09-13: every site now serves a public, zero-PII aggregate — /api/pulse on the seven
    workers/functions and /api/reach on baipiaoji — computed from its own D1 binding. That is
    the primary read: no token, no owner action. D1 REST stays as the fallback for any site
    whose endpoint fails, and only runs if a token with D1 read scope exists.
  * Cloudflare D1 REST API, one query per site (fallback). Tokens are tried in order
    CLOUDFLARE_API_TOKEN_ZONE, CLOUDFLARE_API_TOKEN, CF_API_TOKEN (same discipline as
    tds-traffic.yml: every secret gets tried, the winning *name* is recorded, never a value).
  * Each site's schema differs (pageviews/ev/hits, ref/ref_host, d/day) — see SITES.
  * Writes data/fleet-ai-referrals.json (keep-last-good). Exit 1 only when the read has
    been failing for more than 3 days (no snapshot newer than that), so a token that lacks
    D1 read scope shows up as one red heartbeat, not twelve, and never silently.
  * Never prints a token, an account id, or any row-level data (public repo, public logs).

Usage: python3 tools/fleet/ai_referrals.py [--selftest]
"""
import datetime as dt
import json
import os
import sys
import urllib.error
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "data", "fleet-ai-referrals.json")
WINDOW = 28
GRACE_DAYS = 3

AI_HOSTS = ["chatgpt", "chat.openai", "perplexity", "claude.ai", "copilot", "gemini.google",
            "you.com", "kagi", "poe.com", "mistral", "deepseek", "kimi", "doubao", "yiyan", "metaso"]

# (site, database_id, ref column, "human page-view rows in window" predicate, aggregate expr)
SITES = [
    ("agiscorecard", "f84f9d29-3ad9-4b37-b28e-3a78027d2f22", "pageviews", "ref_host",
     "ua_class='human' AND day>=date('now','-{w} days')", "SUM(hits)"),
    ("baipiaoji", "1ee08cb8-a174-4ec3-8dbc-89ef5d28aa05", "hits", "ref",
     "ev='' AND d>=date('now','-{w} days') AND path NOT LIKE '/__ci%'", "COUNT(*)"),
    ("getecoback", "75e45e05-44b5-4c56-9a3b-dd504b5c53f1", "ev", "ref",
     "name='page_view' AND ua_class='human' AND day>=date('now','-{w} days')", "COUNT(*)"),
    ("thedollscout", "6e71ddc6-b58c-49f4-b6f5-207f3778133f", "hits", "ref",
     "ev='' AND d>=date('now','-{w} days') AND d>='2026-08-30' AND path NOT LIKE '/__ci%'", "COUNT(*)"),
    ("goldrush", "77a0a152-6345-450e-83eb-6f26f246c0b8", "ev", "ref",
     "name='page_view' AND ua_class='human' AND day>=date('now','-{w} days')", "COUNT(*)"),
    ("gridlings", "bd3b1ca9-e9cb-4b71-9834-df3d67b39504", "ev", "ref",
     "name='page_view' AND ua_class='human' AND day>=date('now','-{w} days')", "COUNT(*)"),
    ("buysomething", "f92b6207-90bf-46f6-97c7-cc88195b2ec7", "ev", "ref",
     "name='page_view' AND ua_class='human' AND day>=date('now','-{w} days')", "COUNT(*)"),
    ("gamesledger", "2bebbaef-aa46-4b75-89ca-77920ad4f863", "ev", "ref_host",
     "name='page_view' AND ua_class='human' AND day>=date('now','-{w} days')", "COUNT(*)"),
    ("after35", "6109b81e-c970-47d7-b7fc-3a2a15f68ed2", "ev", "ref",
     "name='page_view' AND ua_class='human' AND day>=date('now','-{w} days')", "COUNT(*)"),
    ("learn", "6109b81e-c970-47d7-b7fc-3a2a15f68ed2", "lev", "ref",
     "name='page_view' AND ua_class='human' AND day>=date('now','-{w} days')", "COUNT(*)"),
    ("fanzha", "6109b81e-c970-47d7-b7fc-3a2a15f68ed2", "fev", "ref",
     "name='page_view' AND ua_class='human' AND day>=date('now','-{w} days')", "COUNT(*)"),
]


ENDPOINTS = {
    "agiscorecard": "https://agiscorecard.com/api/pulse",
    "baipiaoji": "https://baipiaoji.com/api/reach?days=28",
    "getecoback": "https://getecoback.com/api/pulse",
    "thedollscout": "https://thedollscout.com/api/pulse",
    "goldrush": "https://goldrush.agiscorecard.com/api/pulse",
    "gridlings": "https://play.agiscorecard.com/api/pulse",
    "buysomething": "https://source.agiscorecard.com/api/pulse",
    "gamesledger": "https://games.agiscorecard.com/api/pulse",
    "after35": "https://35.agiscorecard.com/api/pulse",
    "learn": "https://learn.agiscorecard.com/api/pulse",
    "fanzha": "https://fanzha.agiscorecard.com/api/pulse",
}


def parse_endpoint(site, body):
    """Pure: an endpoint's JSON → (human_pv, ai_ref, by_host). Raises on a bad shape."""
    if not isinstance(body, dict) or not body.get("ok"):
        raise ValueError("endpoint not ok: " + str((body or {}).get("error") or (body or {}).get("code") or "?"))
    if site == "baipiaoji":
        # /api/reach: humans_referred = referred human views (its human line A), ai_referrals rows (ref, path, n)
        by = {}
        for r in body.get("ai_referrals") or []:
            by[r["ref"]] = by.get(r["ref"], 0) + int(r.get("n") or 0)
        return int(body.get("humans_referred") or 0), sum(by.values()), by
    by = {k: int(v) for k, v in (body.get("by_host") or {}).items()}
    return int(body.get("human_pv") or 0), int(body.get("ai_ref") or sum(by.values())), by


def fetch_endpoint(site):
    req = urllib.request.Request(ENDPOINTS[site], headers={"User-Agent": "fleet-heartbeat/ai_referrals (+https://github.com/f-tiger/agi-site)", "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=20) as r:
        return parse_endpoint(site, json.load(r))


def ai_pred(col):
    return "(" + " OR ".join(f"{col} LIKE '%{h}%'" for h in AI_HOSTS) + ")"


def sql_for(site):
    _, _, table, col, pred, agg = site
    pred = pred.format(w=WINDOW)
    return (f"SELECT '_total' AS host, {agg} AS n FROM {table} WHERE {pred} "
            f"UNION ALL SELECT {col} AS host, {agg} AS n FROM {table} WHERE {pred} AND {ai_pred(col)} "
            f"GROUP BY {col} ORDER BY n DESC")


def parse_rows(rows):
    """Pure: D1 rows → (human_pv, ai_ref, by_host)."""
    total, by_host = 0, {}
    for r in rows:
        if r.get("host") == "_total":
            total = int(r.get("n") or 0)
        elif r.get("host"):
            by_host[r["host"]] = int(r.get("n") or 0)
    return total, sum(by_host.values()), by_host


def d1_query(acct, token, dbid, sql):
    req = urllib.request.Request(
        f"https://api.cloudflare.com/client/v4/accounts/{acct}/d1/database/{dbid}/query",
        data=json.dumps({"sql": sql}).encode(), method="POST",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        body = json.load(r)
    if not body.get("success"):
        raise RuntimeError("; ".join(f"{e.get('code')} {e.get('message')}" for e in body.get("errors", [])) or "success=false")
    return body["result"][0]["results"]


def account_for(token):
    req = urllib.request.Request("https://api.cloudflare.com/client/v4/accounts",
                                 headers={"Authorization": f"Bearer {token}"})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            res = json.load(r).get("result") or []
            return (res[0] or {}).get("id") or ""
    except Exception:
        return ""


def load_last():
    try:
        return json.load(open(OUT, encoding="utf-8"))
    except Exception:
        return None


def snapshot_age_days(snap, today):
    try:
        return (today - dt.date.fromisoformat(snap["generated"][:10])).days
    except Exception:
        return 10 ** 6


def _raises(fn):
    try:
        fn()
    except Exception:
        return True
    return False


def selftest():
    rows = [{"host": "_total", "n": 381}, {"host": "chatgpt.com", "n": 12}, {"host": "www.perplexity.ai", "n": 4}]
    checks = [
        ("parse: total/ai/by_host", parse_rows(rows) == (381, 16, {"chatgpt.com": 12, "www.perplexity.ai": 4})),
        ("parse: empty → zeros", parse_rows([]) == (0, 0, {})),
        ("parse: only total → ai 0", parse_rows([{"host": "_total", "n": 5}]) == (5, 0, {})),
        ("sql: agi uses SUM(hits) on pageviews.ref_host", "SUM(hits)" in sql_for(SITES[0]) and "ref_host LIKE '%chatgpt%'" in sql_for(SITES[0])),
        ("sql: bpj excludes /__ci and ev=''", "path NOT LIKE '/__ci%'" in sql_for(SITES[1]) and "ev=''" in sql_for(SITES[1])),
        ("sql: tds starts at 2026-08-30 (old site rows excluded)", "d>='2026-08-30'" in sql_for(SITES[3])),
        ("sql: every host token present", all(h in sql_for(SITES[2]) for h in AI_HOSTS)),
        ("sql: window is 28 days", f"'-{WINDOW} days'" in sql_for(SITES[4]) and WINDOW == 28),
        ("age: missing snapshot is ancient", snapshot_age_days(None, dt.date(2026, 9, 12)) > 1000),
        ("age: 2-day-old snapshot", snapshot_age_days({"generated": "2026-09-10T08:00:00Z"}, dt.date(2026, 9, 12)) == 2),
        ("eight sites", len(SITES) == 8 and len({s[1] for s in SITES}) == 8),
        ("endpoint: pulse shape", parse_endpoint("gridlings", {"ok": True, "human_pv": 658, "ai_ref": 3, "by_host": {"chatgpt.com": 3}}) == (658, 3, {"chatgpt.com": 3})),
        ("endpoint: bpj reach shape sums per ref", parse_endpoint("baipiaoji", {"ok": True, "humans_referred": 900, "ai_referrals": [{"ref": "www.perplexity.ai", "path": "/a", "n": 12}, {"ref": "www.perplexity.ai", "path": "/b", "n": 8}, {"ref": "chatgpt.com", "path": "/", "n": 12}]}) == (900, 32, {"www.perplexity.ai": 20, "chatgpt.com": 12})),
        ("endpoint: not ok raises", (lambda: (_raises(lambda: parse_endpoint("goldrush", {"ok": False, "error": "no_db"}))))()),
        ("endpoint map covers all eight sites", set(ENDPOINTS) == {s[0] for s in SITES}),
    ]
    for n, ok in checks:
        print(("✅ " if ok else "❌ ") + n)
    return 0 if all(ok for _, ok in checks) else 1


def main(argv):
    if "--selftest" in argv:
        return selftest()
    today = dt.datetime.now(dt.timezone.utc).date()
    last = load_last()
    sites, errors, via = [], [], {}
    for s in SITES:
        try:
            pv, ai, by = fetch_endpoint(s[0])
            sites.append({"site": s[0], "human_pv": pv, "ai_ref": ai, "by_host": by, "via": "endpoint"})
            print(f"  {s[0]:<13} endpoint  human_pv={pv:<6} ai_ref={ai:<4} {by}")
        except Exception as e:
            via[s[0]] = str(e)[:100]
            print(f"  {s[0]:<13} endpoint failed ({str(e)[:100]}) — will try D1 REST")
    leftovers = [s for s in SITES if s[0] in via]
    if not leftovers:
        return write(sites, errors, "endpoints")
    names = ["CLOUDFLARE_API_TOKEN_ZONE", "CLOUDFLARE_API_TOKEN", "CF_API_TOKEN"]
    seen, winner, acct = set(), None, None
    for n in names:
        tok = (os.environ.get(n) or "").strip()
        if not tok or tok in seen:
            print(f"  {n}: {'unset' if not tok else 'same value as an earlier one, skipped'}")
            continue
        seen.add(tok)
        a = account_for(tok) or (os.environ.get("CLOUDFLARE_ACCOUNT_ID") or "").strip()
        if not a:
            print(f"  {n}: cannot resolve an account")
            continue
        try:
            d1_query(a, tok, SITES[0][1], "SELECT 1 AS x")
            winner, acct, token = n, a, tok
            print(f"  {n}: works for D1 read")
            break
        except Exception as e:
            print(f"  {n}: D1 read refused ({str(e)[:100]})")
    if not winner:
        errors = [f"{s[0]}: endpoint {via[s[0]]}; no token with D1 read scope for the fallback" for s in leftovers]
        if not sites:
            return fail(last, today, "every endpoint failed and no token with D1 read scope: " + " | ".join(errors))
        return write(sites, errors, "endpoints (partial)")
    for s in leftovers:
        try:
            pv, ai, by = parse_rows(d1_query(acct, token, s[1], sql_for(s)))
            sites.append({"site": s[0], "human_pv": pv, "ai_ref": ai, "by_host": by, "via": "d1-rest"})
            print(f"  {s[0]:<13} human_pv={pv:<6} ai_ref={ai:<4} {by}")
        except Exception as e:
            errors.append(f"{s[0]}: {str(e)[:100]}")
            print(f"  {s[0]:<13} ERROR {str(e)[:100]}")
    if not sites:
        return fail(last, today, "every site query failed: " + " | ".join(errors))
    return write(sites, errors, f"endpoints + d1-rest via {winner}")


def write(sites, errors, how):
    sites = sorted(sites, key=lambda x: [s[0] for s in SITES].index(x["site"]))
    snap = {
        "generated": dt.datetime.now(dt.timezone.utc).replace(microsecond=0, tzinfo=None).isoformat() + "Z",
        "window_days": WINDOW, "ok": not errors, "read_via": how, "errors": errors,
        "baseline_2026_09_12": {"fleet_ai_ref": 69, "note": "hand-measured; agi 20, bpj 33, eco 16, others 0"},
        "fleet_ai_ref": sum(x["ai_ref"] for x in sites),
        "fleet_human_pv": sum(x["human_pv"] for x in sites),
        "sites": sites,
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    open(OUT, "w", encoding="utf-8").write(json.dumps(snap, ensure_ascii=False, indent=1) + "\n")
    print(f"wrote {os.path.relpath(OUT, ROOT)}: fleet ai_ref={snap['fleet_ai_ref']}/{WINDOW}d"
          + (f" ({len(errors)} site(s) failed)" if errors else ""))
    if errors:
        print("::warning::AI-referral read incomplete: " + " | ".join(errors))
    return 0


def fail(last, today, why):
    age = snapshot_age_days(last, today)
    if last is None:
        # first ever failure: leave a dated stub so the grace period is measured from today, not forever
        os.makedirs(os.path.dirname(OUT), exist_ok=True)
        open(OUT, "w", encoding="utf-8").write(json.dumps(
            {"generated": today.isoformat() + "T00:00:00Z", "ok": False, "stub": True, "reason": why}) + "\n")
        print(f"::warning::AI-referral read failed ({why}); wrote a dated stub, will go red after {GRACE_DAYS} days")
        return 0
    if age <= GRACE_DAYS:
        print(f"::warning::AI-referral read failed ({why}); last snapshot is {age} d old, keeping it")
        return 0
    print(f"::error::AI-referral read has failed for {age} days ({why}). "
          "Give one of CLOUDFLARE_API_TOKEN_ZONE / CLOUDFLARE_API_TOKEN / CF_API_TOKEN D1 read scope.")
    return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
