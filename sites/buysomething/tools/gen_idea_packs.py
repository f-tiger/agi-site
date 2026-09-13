#!/usr/bin/env python3
"""Opportunity packs — the paid product (2026-09-13, owner: 「网站可以提供付费的包,用户购买,可以获取 idea」).

A pack is a dated JSON dossier set built ONLY from data the fleet already produces and may publish:
  * opportunity themes from data/autopilot/opportunities.json (derived facts: Google rising query, how many
    days the request recurred, which subreddits, PH/HN supply, fleet pages) — never Reddit post text/permalinks
  * the matching curated pick from site/data.js (three-tier price ranges, spread, MOQ, compliance difficulty,
    risks, tariff estimate) when tokens overlap
  * Google Trends momentum from site/trends.json when a pick matches
  * duty stack / recall radar: filled by PRD P1 once the official APIs are probed; until then the field says so
Every dossier carries `evidence_dates` and an `honesty` block. Sentences are templates over numbers, no AI.

Gate (pre-registered): a weekly pack is written only with >= MIN_ITEMS dossiers; otherwise nothing is written
and index.json says when the next pack is expected. sample.json (one dossier) is always public.

Usage: python3 tools/gen_idea_packs.py [--selftest] [--min=N] [--today=YYYY-MM-DD]
"""
import datetime as dt
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.join(HERE, "..", "site")
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
OPP = os.path.join(ROOT, "data", "autopilot", "opportunities.json")
PACK_DIR = os.path.join(SITE, "packs")
MIN_ITEMS = 10
STOP = set("a an the is are it its of to in on for with and or but if so as at by from into about over app apps tool tools site website want need looking find help anyone does do can could would should has have how what which who why when where free best good new idea ideas thing things way get got use using like just really very also still only even more most some all one two lot people someone somebody make made".split())


def tokens(t):
    return [w for w in re.sub(r"[^a-z0-9äöüß\s]", " ", str(t or "").lower()).split() if len(w) >= 3 and w not in STOP]


def load_picks():
    return load_data_js().get("PRODUCTS") or []

def load_data_js():
    """Evaluate site/data.js with node (strings contain colons, so regex-to-JSON is unsafe)."""
    import subprocess
    js = ("const fs=require('fs');const s=fs.readFileSync(process.argv[1],'utf8');"
          "const f=new Function(s+';return {PRODUCTS: typeof PRODUCTS!==\"undefined\"?PRODUCTS:[], DATA_PROVENANCE: typeof DATA_PROVENANCE!==\"undefined\"?DATA_PROVENANCE:null};');"
          "process.stdout.write(JSON.stringify(f()));")
    r = subprocess.run(["node", "-e", js, os.path.join(SITE, "data.js")], capture_output=True, text=True, timeout=30)
    if r.returncode != 0:
        raise RuntimeError("node failed: " + r.stderr[:200])
    return json.loads(r.stdout)
    js = m.group(1)
    js = re.sub(r"//[^\n]*", "", js)                       # comments
    js = re.sub(r"(\w+)\s*:", r'"\1":', js)                # keys → quoted
    js = re.sub(r'"(https?)":', r"\1:", js)                # undo inside urls
    js = re.sub(r",\s*([\]}])", r"\1", js)                 # trailing commas
    try:
        return json.loads(js)
    except Exception:
        return []


def load_json(p):
    try:
        return json.load(open(p, encoding="utf-8"))
    except Exception:
        return {}


def match_pick(theme_tokens, picks):
    best, score = None, 0
    for p in picks:
        pt = set(tokens(p.get("name")) + tokens(p.get("trendQuery")) + tokens(p.get("track")))
        n = len(pt & set(theme_tokens))
        if n > score:
            best, score = p, n
    return (best, score) if score >= 2 else (None, 0)


def spread(p):
    try:
        lo = p["retailPrice"][0] / p["price1688"][1]; hi = p["retailPrice"][1] / p["price1688"][0]
        return [round(lo, 1), round(hi, 1)]
    except Exception:
        return None


def dossier(o, picks, trends, today):
    d = (o.get("demand") or [{}])[0]
    q = d.get("q") or o.get("theme")
    pick, n = match_pick(tokens(o.get("theme")) + tokens(q), picks)
    tr = (trends.get("products") or {}).get(pick["id"]) if pick and isinstance(trends.get("products"), dict) else None
    ev_dates = sorted(set((o.get("days_seen") or []) + [today.isoformat()]))
    out = {
        "id": re.sub(r"[^a-z0-9]+", "-", q.lower()).strip("-")[:60],
        "headline": q,
        "state": o.get("state"),
        "score": o.get("score"),
        "demand": {"google_rising": d if d.get("q") else None,
                   "request_recurrence": {"days": len(o.get("days_seen") or []), "first": (o.get("days_seen") or [None])[0], "last": (o.get("days_seen") or [None])[-1], "subreddit": o.get("subreddit") or None, "reddit_search": "https://www.reddit.com/search/?q=" + q.replace(" ", "+")}},
        "supply": {"already_built": o.get("supply") or [], "fleet_pages": o.get("fleet_pages") or []},
        "matched_pick": None,
        "duty_stack": {"status": "pending-P1", "note": "Official HTS/Section 301 lookup lands with PRD P1 after the USITC API probe; until then use /landed-cost with your own rate."},
        "recall_radar": {"status": "pending-P1", "note": "CPSC / EU Safety Gate lookup lands with PRD P1; until then check saferproducts.gov and Safety Gate manually before ordering."},
        "evidence_dates": ev_dates,
        "honesty": ["Derived counts and public feeds only; no Reddit post text is stored or sold.",
                    "Prices and tariff estimates in matched picks are editorial estimates as of 2026-08-22 unless a source is shown.",
                    "Not purchasing, legal or financial advice."],
    }
    if pick:
        pp = (PASSPORTS.get("picks") or {}).get(pick.get("id"))
        if pp and pp.get("general_rate"):
            out["duty_stack"] = {"status": "usitc", "candidate_htsno": pp.get("candidate_htsno"), "general_rate": pp.get("general_rate"), "heading_general_rates": pp.get("heading_general_rates"), "as_of": pp.get("as_of"), "s301": pp.get("s301"), "note": PASSPORTS.get("disclaimer")}
        rc = (RECALLS.get("picks") or {}).get(pick.get("id"))
        if rc and rc.get("n") is not None:
            out["recall_radar"] = {"status": "cpsc", "n_12mo": rc.get("n"), "latest": rc.get("latest"), "items": rc.get("items"), "keywords": rc.get("keywords"), "as_of": RECALLS.get("generated")}
        out["matched_pick"] = {"id": pick.get("id"), "name": pick.get("name"), "track": pick.get("track"), "tier": pick.get("tier"),
                               "price1688": pick.get("price1688"), "priceAlibaba": pick.get("priceAlibaba"), "retailPrice": pick.get("retailPrice"),
                               "spread_range": spread(pick), "moq": pick.get("moq"), "tariffUS_estimate": pick.get("tariffUS"),
                               "compliance": pick.get("compliance"), "risks": pick.get("risks"), "buyerTip": pick.get("buyerTip"),
                               "token_overlap": n, "trend": tr}
    take = []
    if d.get("q"):
        take.append(f"Google Trends shows '{q}' rising under the seed '{d.get('seed')}' (growth value {d.get('v')}).")
    rd = len(o.get("days_seen") or [])
    if rd >= 2:
        take.append(f"The same request recurred on {rd} distinct days, which is the recurrence bar this pack uses; one-off posts are excluded.")
    if o.get("supply"):
        take.append(f"{len(o['supply'])} matching launch(es) already exist on Product Hunt / HN — treat this as a crowded lane unless your angle differs.")
    else:
        take.append("No matching launch on Product Hunt / HN in the radar window — unproven lane, not an empty one.")
    if pick:
        sp = spread(pick)
        take.append(f"Closest curated pick: {pick.get('name')} (spread ×{sp[0]}–×{sp[1]} retail over 1688, MOQ {pick.get('moq')}, compliance difficulty {((pick.get('compliance') or {}).get('difficulty'))}).")
    out["our_take"] = take
    return out


def week_id(today):
    y, w, _ = today.isocalendar()
    return f"{y}-W{w:02d}"


PASSPORTS = {}
RECALLS = {}


def sellable(o):
    """A dossier is sellable only with evidence beyond one post: rising demand confirmed AND (recurred on >=2 days,
    or existing supply found, or a curated pick matched). 2026-09-13: the first auto-built pack was 9 one-off HN
    questions out of 10 — withdrawn; this rule is the fix, not a bigger number."""
    return o.get("state") == "demand-confirmed" and (len(o.get("days_seen") or []) >= 2 or bool(o.get("supply")) or bool(o.get("_pick")))


def build(opps, picks, trends, today, min_items=MIN_ITEMS):
    global PASSPORTS, RECALLS
    PASSPORTS = load_json(os.path.join(SITE, "passports.json")); RECALLS = load_json(os.path.join(SITE, "recalls.json"))
    rows = sorted(opps, key=lambda o: -(o.get("score") or 0))
    for o in rows:
        d = (o.get("demand") or [{}])[0]
        o["_pick"] = match_pick(tokens(o.get("theme")) + tokens(d.get("q") or ""), picks)[0]
    rows = [o for o in rows if sellable(o)]
    dossiers = [dossier(o, picks, trends, today) for o in rows[:40]]
    sample = dossiers[0] if dossiers else None
    pack = None
    if len(dossiers) >= min_items:
        pack = {"week": week_id(today), "generated": today.isoformat(), "count": len(dossiers), "items": dossiers,
                "license": "Single-buyer use; redistribution not permitted. Data sources and dates inside each item.",
                "build": "tools/gen_idea_packs.py (deterministic, zero AI)"}
    return pack, sample


def write_all(pack, sample, today, existing_index):
    os.makedirs(PACK_DIR, exist_ok=True)
    weeks = list(existing_index.get("weeks") or [])
    if pack:
        open(os.path.join(PACK_DIR, f"{pack['week']}.json"), "w", encoding="utf-8").write(json.dumps(pack, ensure_ascii=False, indent=1))
        if not any(w.get("week") == pack["week"] for w in weeks):
            weeks.append({"week": pack["week"], "generated": pack["generated"], "count": pack["count"]})
        else:
            for w in weeks:
                if w["week"] == pack["week"]:
                    w.update({"generated": pack["generated"], "count": pack["count"]})
    index = {"generated": today.isoformat(), "latest": (weeks[-1]["week"] if weeks else None), "weeks": weeks[-12:],
             "min_items": MIN_ITEMS, "note": "A pack is published only with >= min_items dossiers; buyers get the latest week at purchase time."}
    same = {k: v for k, v in existing_index.items() if k != "generated"} == {k: v for k, v in index.items() if k != "generated"}
    if not (same and os.path.exists(os.path.join(PACK_DIR, "index.json"))):   # avoid a daily no-op commit + deploy
        open(os.path.join(PACK_DIR, "index.json"), "w", encoding="utf-8").write(json.dumps(index, ensure_ascii=False, indent=1))
    if sample:
        open(os.path.join(PACK_DIR, "sample.json"), "w", encoding="utf-8").write(json.dumps({"sample": True, "generated": today.isoformat(), "item": sample}, ensure_ascii=False, indent=1))
    return index


def selftest():
    T = dt.date(2026, 9, 13)
    picks = [{"id": "pet-fountain", "name": "Wireless-Pump Pet Water Fountain", "track": "Pet", "tier": "profit", "price1688": [8, 14], "priceAlibaba": [12, 20], "retailPrice": [39, 79], "moq": 200, "tariffUS": 0.33, "compliance": {"difficulty": "medium"}, "risks": "r", "buyerTip": "t", "trendQuery": "cat water fountain"}]
    mk = lambda i, days=("2026-09-01", "2026-09-09"), st="demand-confirmed": {"theme": f"is there a quiet cat water fountain {i}", "state": st, "days_seen": list(days), "subreddit": "cats", "score": 10 - i * 0.1,
                                                        "demand": [{"q": f"quiet cat water fountain {i}", "v": 900, "seed": "pet"}] if st == "demand-confirmed" else [], "supply": [], "fleet_pages": []}
    pack, sample = build([mk(i) for i in range(10)], picks, {}, T)
    pack2, _ = build([mk(i) for i in range(3)], picks, {}, T)
    scouts, _ = build([mk(i, st="scout") for i in range(12)], picks, {}, T)
    live = load_picks()
    checks = [
        ("pack built at >= MIN_ITEMS", pack is not None and pack["count"] == 10 and pack["week"] == "2026-W37"),
        ("no pack below MIN_ITEMS, sample still exists", pack2 is None and sample is not None),
        ("12 one-off scouts never make a pack (2026-09-13 lesson)", scouts is None),
        ("sellable: confirmed + one-day + no supply + no pick → not sellable", not sellable({"state": "demand-confirmed", "days_seen": ["2026-09-01"], "supply": [], "_pick": None})),
        ("dossier headline is the Google query", sample["headline"].startswith("quiet cat water fountain")),
        ("pick matched by token overlap", sample["matched_pick"] and sample["matched_pick"]["id"] == "pet-fountain" and sample["matched_pick"]["spread_range"] == [2.8, 9.9]),
        ("no reddit permalink anywhere", "/comments/" not in json.dumps(pack)),
        ("P1 fields honest: pending until the official files exist, then their source name", sample["duty_stack"]["status"] in ("pending-P1", "usitc") and sample["recall_radar"]["status"] in ("pending-P1", "cpsc")),
        ("our_take mentions recurrence", any("recurred" in t for t in sample["our_take"])),
        ("live data.js parses (31 picks)", len(live) == 31),
    ]
    for n, ok in checks:
        print(("✅ " if ok else "❌ ") + n)
    return 0 if all(ok for _, ok in checks) else 1


def main(argv):
    if "--selftest" in argv:
        return selftest()
    today = dt.date.today(); mn = MIN_ITEMS
    for a in argv:
        if a.startswith("--today="): today = dt.date.fromisoformat(a.split("=", 1)[1])
        if a.startswith("--min="): mn = int(a.split("=", 1)[1])
    opps = (load_json(OPP).get("opportunities") or [])
    picks = load_picks(); trends = load_json(os.path.join(SITE, "trends.json"))
    pack, sample = build(opps, picks, trends, today, mn)
    index = write_all(pack, sample, today, load_json(os.path.join(PACK_DIR, "index.json")))
    print(f"packs: {'wrote ' + pack['week'] + ' (' + str(pack['count']) + ' items)' if pack else 'no pack (' + str(len(opps)) + ' candidates < ' + str(mn) + ')'}; latest={index['latest']}; sample={'yes' if sample else 'none'}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
