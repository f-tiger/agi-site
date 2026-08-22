# -*- coding: utf-8 -*-
"""Google Trends (US) → games matcher. The site's demand trigger.

Daily in CI: pull the trending-searches RSS, match against the game pool
(top100 + curated). A trending query NOT in the pool is checked against
Steam's official storesearch API — a close name match means a real game is
trending: it enters the search pool (instantly live-checkable) but NOT the
verdict ledger (verdict pages need hand-curated platform caveats; that stays
human, zero-fabrication rule). Most days match nothing — that is the trigger
working, not failing (fleet doctrine).
"""
import json, os, re, sys, time, urllib.request, urllib.parse
from difflib import SequenceMatcher

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "trends-games.json")
RSS = "https://trends.google.com/trending/rss?geo=US"
SEARCH = "https://store.steampowered.com/api/storesearch/?term={q}&cc=us&l=english"
HDRS = {"User-Agent": "gamesledger-trends/1.0"}


def get(url):
    req = urllib.request.Request(url, headers=HDRS)
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.read().decode("utf-8", "replace")


def norm(s):
    return re.sub(r"[^a-z0-9 ]", "", s.lower()).strip()


def main():
    rss = get(RSS)
    queries = re.findall(r"<title>(?:<!\[CDATA\[)?([^<\]]{2,60})(?:\]\]>)?</title>", rss)[1:]  # drop channel title
    queries = [q.strip() for q in queries if q.strip()][:25]
    print(f"trends: {len(queries)} queries: {queries[:10]}")
    if not queries:
        sys.exit("empty trends feed — refusing to overwrite state")

    # pool = top100 + curated
    pool = []
    top = os.path.join(ROOT, "data", "top100.json")
    if os.path.exists(top):
        pool += [(g["appid"], g["name"]) for g in json.load(open(top, encoding="utf-8"))["games"]]
    pool += [(g["appid"], g["name"]) for g in json.load(open(os.path.join(ROOT, "data", "games.json"), encoding="utf-8"))["games"]]
    pool_norm = {norm(n): (a, n) for a, n in pool}

    hits, discovered = [], []
    for q in queries:
        nq = norm(q)
        if len(nq) < 3:
            continue
        matched = None
        for pn, (a, n) in pool_norm.items():
            if nq == pn or (len(nq) > 5 and (nq in pn or pn in nq)):
                matched = {"query": q, "appid": a, "name": n, "in_pool": True}
                break
        if matched:
            hits.append(matched)
            continue
        # 池外:问 Steam 官方搜索,名字高相似才算「热搜里的游戏」
        try:
            d = json.loads(get(SEARCH.format(q=urllib.parse.quote(q))))
            items = d.get("items") or []
            if items:
                cand = items[0]
                sim = SequenceMatcher(None, nq, norm(cand.get("name", ""))).ratio()
                if sim >= 0.85:
                    discovered.append({"query": q, "appid": int(cand["id"]), "name": cand["name"][:80], "sim": round(sim, 2)})
            time.sleep(0.5)
        except Exception as e:
            print(f"  storesearch fail for {q!r}: {e}", file=sys.stderr)

    day = time.strftime("%Y-%m-%d", time.gmtime())
    prev = {"watch": []}
    if os.path.exists(OUT):
        prev = json.load(open(OUT, encoding="utf-8"))
    watch = {w["appid"]: w for w in prev.get("watch", [])}
    for dd in discovered:
        watch[dd["appid"]] = {"appid": dd["appid"], "name": dd["name"], "first_seen": watch.get(dd["appid"], {}).get("first_seen", day)}
    json.dump({"d": day, "hits": hits, "discovered": discovered,
               "watch": list(watch.values())[-60:],
               "note": "hits=in-pool trending; discovered=new games surfaced by trends via Steam official storesearch (>=0.85 name similarity); watch feeds the search pool only — verdict pages stay hand-curated."},
              open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"day {day}: {len(hits)} pool hits, {len(discovered)} discovered, watch={len(watch)}")


if __name__ == "__main__":
    main()
