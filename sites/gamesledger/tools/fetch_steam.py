# -*- coding: utf-8 -*-
"""Fetch official Steam concurrent-player counts for the curated game list.

Runs in GitHub Actions (the session sandbox cannot reach api.steampowered.com;
the runner can — same pattern as eco's trends fetcher). Appends one dated
sample per game per run into data/concurrents.json, keeping 180 samples max.

Zero-fabrication contract:
- Only Valve's official GetNumberOfCurrentPlayers endpoint is used.
- A non-ok response marks the appid invalid for the day; the generator then
  EXCLUDES that game from page generation rather than guessing.
- No interpolation, no estimates, no third-party numbers, ever.
"""
import json, os, sys, time, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GAMES = os.path.join(ROOT, "data", "games.json")
OUT = os.path.join(ROOT, "data", "concurrents.json")
API = "https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid={appid}"


def fetch(appid):
    req = urllib.request.Request(API.format(appid=appid), headers={"User-Agent": "gamesledger-fetch/1.0"})
    with urllib.request.urlopen(req, timeout=15) as r:
        d = json.load(r)
    resp = d.get("response", {})
    if resp.get("result") != 1:
        return None
    return int(resp.get("player_count", -1))


def main():
    games = json.load(open(GAMES, encoding="utf-8"))["games"]
    store = {"note": "Written only by tools/fetch_steam.py in CI. Source: Valve official API, one sample per run.",
             "samples": {}}
    if os.path.exists(OUT):
        store = json.load(open(OUT, encoding="utf-8"))
    day = time.strftime("%Y-%m-%d", time.gmtime())
    ts = time.strftime("%Y-%m-%dT%H:%MZ", time.gmtime())
    ok = bad = 0
    for g in games:
        aid = str(g["appid"])
        try:
            n = fetch(g["appid"])
        except Exception as e:
            print(f"  {g['slug']}: fetch error {e}", file=sys.stderr)
            n = None
        rec = store["samples"].setdefault(aid, {"slug": g["slug"], "history": []})
        rec["slug"] = g["slug"]
        if n is None or n < 0:
            rec["last_error"] = ts
            bad += 1
            print(f"  {g['slug']}: NOT OK (excluded from pages until a good sample)")
        else:
            hist = rec["history"]
            if hist and hist[-1]["d"] == day:
                hist[-1] = {"d": day, "n": n, "t": ts}
            else:
                hist.append({"d": day, "n": n, "t": ts})
            rec["history"] = hist[-180:]
            ok += 1
            print(f"  {g['slug']}: {n}")
        time.sleep(0.6)
    store["generated"] = ts
    json.dump(store, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"fetched ok={ok} bad={bad} -> {OUT}")
    if ok == 0:
        sys.exit("all fetches failed — refusing to write a site from nothing")


if __name__ == "__main__":
    main()
