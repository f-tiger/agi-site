#!/usr/bin/env python3
"""Opportunity matcher (zero AI). Reddit-mined requests × measured demand × existing supply.

Owner 2026-09-13: 「ai时代,做一个子站点,挖掘爬取Reddit用户需求,并匹配产品机会点,变成一个机会撮合网站」.
Verdict (docs/reddit-opportunity-board-2026-09-13.md): the *mining* stays where it already is
(tools/startup_radar.mjs, runner-only, read-only, ~20 requests/day, never republished), and this
file is the *matching* layer the fleet lacked. It never publishes Reddit content. What it emits is
the fleet's own derived facts: a request theme, how many days it recurred, whether Google Trends
rising shows the same demand, whether Product Hunt / HN already show someone built it, and which
fleet page (if any) already answers it.

Inputs (all already produced daily by fleet-trends / fleet-autopilot):
  data/startup-radar.json           sources.reddit_requests / reddit_vertical items, reddit_recurring, PH/HN items, history
  sites/<site>/**/*rising*.json     Google Trends rising per seed (q, v)
  data/autopilot/<site>-demand.json covered rows (q → page) — "we already answer this"
Output: data/autopilot/opportunities.json  {generated, counts, opportunities:[…]}

States (deterministic):
  scout            seen on one day only, no demand confirmation
  recurring        same theme on ≥2 distinct days (radar's reddit_recurring)
  demand-confirmed a Google Trends rising query overlaps the theme (≥2 content tokens, or 1 token ≥6 chars)
  supplied         a PH/HN item overlaps the theme — someone already built it (still listed; it is a fact, not a kill)
Score = 2·days_seen + demand_bucket(0..3) + min(points,100)/50 + min(comments,40)/20 − (1 if supplied)

Usage: python3 tools/fleet/opportunity_match.py [--today=YYYY-MM-DD] [--selftest]
"""
import datetime as dt
import glob
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
RADAR = os.path.join(ROOT, "data", "startup-radar.json")
OUT = os.path.join(ROOT, "data", "autopilot", "opportunities.json")
SITES = ["agiscorecard", "baipiaoji", "getecoback", "thedollscout", "goldrush", "gridlings", "buysomething", "gamesledger"]
STOP = set("""a an the is are was were be been being there this that these those it its i we you they he she my our your
their of to in on for with and or but if then than so as at by from into about over under up down out off again
app apps tool tools site website website software service product something someone somebody make made makes making
want need needs looking look find help please anyone any does do did can could would should has have had how what
which who why when where free best good great new idea ideas thing things way ways get got use using used like just
really very also still only even more most some all one two three lot lots people everyone anybody exist exists
does there a that lets let me build built""".split())
STOP |= {"der", "die", "das", "und", "ist", "ein", "eine", "für", "mit", "von", "gibt", "es", "ich", "wie"}


def tokens(text):
    t = re.sub(r"[^a-z0-9äöüß\s]", " ", str(text or "").lower())
    return [w for w in t.split() if len(w) >= 3 and w not in STOP]


def overlap(a, b):
    """Content-token overlap that counts as 'the same need': ≥2 shared tokens, or one shared token ≥6 chars."""
    sa, sb = set(a), set(b)
    common = sa & sb
    if len(common) >= 2:
        return sorted(common)
    if len(common) == 1 and len(next(iter(common))) >= 6:
        return sorted(common)
    return []


def load(p):
    try:
        return json.load(open(p, encoding="utf-8"))
    except Exception:
        return None


def rising_rows(site):
    rows = []
    for f in glob.glob(os.path.join(ROOT, "sites", site, "**", "*rising*.json"), recursive=True):
        if "/node_modules/" in f or "/dist/" in f:
            continue
        d = load(f) or {}
        seeds = d.get("seeds") or {}
        if isinstance(seeds, dict):
            for seed, v in seeds.items():
                for r in (v.get("rising") if isinstance(v, dict) else None) or []:
                    q = r.get("q")
                    if q:
                        rows.append({"site": site, "seed": seed, "q": q, "v": r.get("v"), "kind": r.get("kind") or v.get("kind") or ""})
    return rows


def covered_rows(site):
    d = load(os.path.join(ROOT, "data", "autopilot", f"{site}-demand.json")) or {}
    return [{"q": c.get("q"), "page": c.get("page")} for c in (d.get("covered") or []) if isinstance(c, dict) and c.get("q")]


def demand_bucket(v):
    try:
        v = float(v)
    except Exception:
        return 0
    return 3 if v >= 5000 else 2 if v >= 500 else 1 if v >= 50 else 0


def match(radar, rising, covered, supply, today):
    """Pure. radar: parsed startup-radar.json; rising: {site:[rows]}; covered: {site:[rows]}; supply: [{title,url,src}]."""
    src = radar.get("sources") or {}
    recurring = radar.get("reddit_recurring") or {}
    rec_days = {}
    for site, rows in recurring.items():
        for r in rows:
            rec_days[(site, r.get("title"))] = r.get("days") or []
    cands = []
    for it in ((src.get("reddit_vertical") or {}).get("items") or []):
        cands.append({"theme": norm(it.get("title")), "site": it.get("site") or "", "kind": "vertical", "sub": it.get("sub") or "",
                      "points": it.get("points") or 0, "comments": it.get("comments") or 0, "published": it.get("published") or ""})
    for it in [*(((src.get("reddit_requests") or {}).get("items") or [])), *(((src.get("reddit_wish") or {}).get("items") or [])), *(((src.get("hn_ask") or {}).get("items") or []))]:
        cands.append({"theme": norm(it.get("title")), "site": "", "kind": "request-board", "sub": it.get("sub") or "",
                      "points": it.get("points") or 0, "comments": it.get("comments") or 0, "published": it.get("published") or ""})
    for site, rows in recurring.items():  # recurring themes that are not in today's listing still count
        for r in rows:
            if not any(c["theme"] == r.get("title") and c["site"] == site for c in cands):
                cands.append({"theme": r.get("title"), "site": site, "kind": "vertical", "sub": "", "points": 0, "comments": 0, "published": ""})
    out, seen = [], set()
    for c in cands:
        key = (c["site"], c["theme"])
        if not c["theme"] or key in seen:
            continue
        seen.add(key)
        tk = tokens(c["theme"])
        if len(tk) < 2:
            continue
        days = rec_days.get(key) or ([c["published"]] if c["published"] else [today.isoformat()])
        sites = [c["site"]] if c["site"] else SITES
        dm = []
        for s in sites:
            for r in rising.get(s, []):
                ov = overlap(tk, tokens(r["q"]))
                if ov:
                    dm.append({"site": s, "q": r["q"], "v": r.get("v"), "seed": r["seed"], "shared": ov})
        dm.sort(key=lambda x: -(float(x["v"]) if isinstance(x.get("v"), (int, float)) else 0))
        sm = []
        for s in supply:
            ov = overlap(tk, tokens(s.get("title")))
            if ov:
                sm.append({"title": s.get("title"), "url": s.get("url"), "src": s.get("src"), "shared": ov})
        fp = []
        for s in sites:
            for r in covered.get(s, []):
                if overlap(tk, tokens(r["q"])) and r.get("page"):
                    fp.append({"site": s, "q": r["q"], "page": r["page"]})
        state = "demand-confirmed" if dm else ("recurring" if len(days) >= 2 else "scout")
        supplied = bool(sm)
        score = 2 * len(days) + (demand_bucket(dm[0]["v"]) if dm else 0) + min(c["points"], 100) / 50 + min(c["comments"], 40) / 20 - (1 if supplied else 0)
        out.append({"theme": c["theme"], "site": c["site"], "kind": c["kind"], "subreddit": c["sub"], "days_seen": sorted(set(days)),
                    "state": state, "supplied": supplied, "score": round(score, 2), "demand": dm[:3], "supply": sm[:3], "fleet_pages": fp[:3]})
    out.sort(key=lambda o: (-o["score"], o["theme"]))
    counts = {"candidates": len(out), "demand_confirmed": sum(o["state"] == "demand-confirmed" for o in out),
              "recurring": sum(o["state"] == "recurring" for o in out), "scout": sum(o["state"] == "scout" for o in out),
              "supplied": sum(o["supplied"] for o in out)}
    return out[:60], counts


def norm(t):
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9äöüß\s]", " ", str(t or "").lower())).strip()[:80]


def selftest():
    T = dt.date(2026, 9, 13)
    radar = {"sources": {
        "reddit_vertical": {"items": [{"site": "getecoback", "title": "Luftentfeuchter Empfehlung für Keller?", "sub": "de", "points": 12, "comments": 9, "published": "2026-09-12"}]},
        "reddit_requests": {"items": [{"title": "Is there an app that tracks free tier limits of AI tools", "sub": "SomebodyMakeThis", "points": 40, "comments": 15, "published": "2026-09-13"}]},
        "producthunt": {"items": [{"title": "LimitWatch – track AI free tier limits", "url": "https://ph/x"}]}},
        "reddit_recurring": {"getecoback": [{"title": "luftentfeuchter empfehlung für keller", "days": ["2026-09-05", "2026-09-12"]}]}}
    rising = {"getecoback": [{"site": "getecoback", "seed": "luftentfeuchter", "q": "luftentfeuchter keller test", "v": 48200, "kind": "value"}],
              "baipiaoji": [{"site": "baipiaoji", "seed": "deepseek", "q": "deepseek v4 flash", "v": 82350, "kind": "value"}]}
    covered = {"getecoback": [{"q": "luftentfeuchter keller test", "page": "guide/trotec-luftentfeuchter-test.html"}]}
    supply = [{"title": "LimitWatch – track AI free tier limits", "url": "https://ph/x", "src": "producthunt"}]
    out, counts = match(radar, rising, covered, supply, T)
    by = {o["theme"]: o for o in out}
    eco = by.get("luftentfeuchter empfehlung für keller")
    req = by.get("is there an app that tracks free tier limits of ai tools")
    checks = [
        ("both candidates present", eco is not None and req is not None),
        ("eco: recurring days carried over", eco and eco["days_seen"] == ["2026-09-05", "2026-09-12"]),
        ("eco: demand-confirmed via rising 'luftentfeuchter keller test'", eco and eco["state"] == "demand-confirmed" and eco["demand"][0]["q"] == "luftentfeuchter keller test"),
        ("eco: fleet page found", eco and eco["fleet_pages"] and eco["fleet_pages"][0]["page"].endswith("trotec-luftentfeuchter-test.html")),
        ("request: supplied by PH item", req and req["supplied"] and req["supply"][0]["src"] == "producthunt"),
        ("request: not demand-confirmed (no rising overlap)", req and req["state"] == "scout"),
        ("stopwords stripped", tokens("is there an app that tracks free tier limits") == ["tracks", "tier", "limits"]),
        ("overlap needs 2 tokens or one ≥6", overlap(["keller", "test"], ["keller", "abc"]) == ["keller"] and overlap(["tier", "abc"], ["tier", "xyz"]) == []),
        ("eco outranks request", out[0]["theme"] == eco["theme"]),
        ("counts", counts["candidates"] == 2 and counts["demand_confirmed"] == 1 and counts["supplied"] == 1),
    ]
    for n, ok in checks:
        print(("✅ " if ok else "❌ ") + n)
    return 0 if all(ok for _, ok in checks) else 1


def main(argv):
    if "--selftest" in argv:
        return selftest()
    today = dt.date.today()
    for a in argv:
        if a.startswith("--today="):
            today = dt.date.fromisoformat(a.split("=", 1)[1])
    radar = load(RADAR)
    if not radar:
        print("::warning::startup-radar.json unreadable — opportunities not computed"); return 0
    src = radar.get("sources") or {}
    supply = []
    for name in ("producthunt", "hn_show", "hn_top_ai"):
        for it in ((src.get(name) or {}).get("items") or []):
            supply.append({"title": it.get("title"), "url": it.get("url"), "src": name})
    rising = {s: rising_rows(s) for s in SITES}
    covered = {s: covered_rows(s) for s in SITES}
    reddit_ok = {k: bool((src.get(k) or {}).get("ok")) for k in ("reddit_requests", "reddit_wish", "reddit_vertical", "hn_ask")}
    out, counts = match(radar, rising, covered, supply, today)
    snap = {"generated": today.isoformat(), "radar_fetched": radar.get("fetched"), "reddit_sources_ok": reddit_ok,
            "note": "Derived facts only: no Reddit post text, bodies or permalinks are stored here or published. "
                    "Themes are normalised request titles used as matching keys; demand = Google Trends rising; supply = PH/HN public feeds.",
            "counts": counts, "opportunities": out}
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump(snap, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"opportunities {today}: {counts} (reddit sources ok: {reddit_ok})")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
