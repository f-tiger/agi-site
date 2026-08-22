# -*- coding: utf-8 -*-
"""Fetch Valve's official 'Most Played' top-100 chart + resolve names.

Runs in CI. Output data/top100.json feeds the search pool and the quiz's
'alive' side. Names are cached in the same file so appdetails is only called
for appids we haven't named yet (100 calls only on first run).
Zero-fabrication: chart and counts are Valve's own; unnamed apps are dropped.
"""
import json, os, sys, time, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "top100.json")
CHART = "https://api.steampowered.com/ISteamChartsService/GetMostPlayedGames/v1/"
DETAILS = "https://store.steampowered.com/api/appdetails?appids={aid}&l=english&filters=basic"
HDRS = {"User-Agent": "gamesledger-fetch/1.0"}


def get_json(url):
    req = urllib.request.Request(url, headers=HDRS)
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.load(r)


def main():
    ranks = get_json(CHART).get("response", {}).get("ranks", [])
    if len(ranks) < 50:
        sys.exit("chart returned <50 ranks — refusing to overwrite")
    names = {}
    if os.path.exists(OUT):
        names = {str(e["appid"]): e["name"] for e in json.load(open(OUT, encoding="utf-8")).get("games", [])}
    games, unnamed = [], 0
    for r in ranks:
        aid = str(r.get("appid"))
        cc = r.get("concurrent_in_game") or r.get("peak_in_game") or 0
        nm = names.get(aid)
        if not nm:
            try:
                d = get_json(DETAILS.format(aid=aid)).get(aid, {})
                if d.get("success"):
                    nm = d["data"].get("name")
                time.sleep(0.4)
            except Exception:
                nm = None
        if not nm:
            unnamed += 1
            continue
        games.append({"appid": int(aid), "name": nm[:80], "rank": r.get("rank"), "n": int(cc)})
    day = time.strftime("%Y-%m-%d", time.gmtime())
    json.dump({"note": "Valve official Most Played chart; written only by CI.", "d": day, "games": games},
              open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"top100: {len(games)} named games ({unnamed} unnamed dropped), day {day}")


if __name__ == "__main__":
    main()
