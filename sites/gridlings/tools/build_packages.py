#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Standalone HTML5 packages for every game (2026-08-24, owner: 游戏打包发布
自动化). Built in CI at deploy time — zips are NOT committed (site/downloads/
is gitignored); wrangler uploads them as static assets alongside the site.

Each zip is simultaneously:
  - a self-host / offline package (serve with any static server), and
  - an itch.io / CrazyGames-ready HTML5 build (entry file is index.html,
    all asset paths relative, no service worker, no backend dependency).
Post-processing per page: drop the PWA manifest link + SW register (a deep
hosting path would break them), drop /sub.js (needs our backend; the plain
subscribe link fallback keeps working), keep the /e beacon (try/catch'd —
it 404s silently off-domain)."""
import io, json, os, re, zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, "site")
OUT = os.path.join(SITE, "downloads")

GAMES = {
    "gridlings":  dict(page="index.html",      js="app.js",            data=["puzzles-daily.json", "puzzles-pool.json"]),
    "balance":    dict(page="balance.html",    js="app-balance.js",    data=["balance-daily.json", "balance-pool.json"]),
    "starbattle": dict(page="starbattle.html", js="app-starbattle.js", data=["starbattle-daily.json", "starbattle-pool.json"]),
    "trail":      dict(page="trail.html",      js="app-trail.js",      data=["trail-daily.json", "trail-pool.json"]),
    "futoshiki":  dict(page="futoshiki.html",  js="app-futoshiki.js",  data=["futoshiki-daily.json", "futoshiki-pool.json"]),
    "towers":     dict(page="towers.html",     js="app-towers.js",     data=["towers-daily.json", "towers-pool.json"]),
    "minisudoku": dict(page="minisudoku.html", js="app-latin.js",      data=["minisudoku-daily.json", "minisudoku-pool.json"]),
    "kropki":     dict(page="kropki.html",     js="app-latin.js",      data=["kropki-daily.json", "kropki-pool.json"]),
    "sandwich":   dict(page="sandwich.html",   js="app-latin.js",      data=["sandwich-daily.json", "sandwich-pool.json"]),
    "thermo":     dict(page="thermo.html",     js="app-thermo.js",     data=["thermo-daily.json", "thermo-pool.json"]),
    "nonogram":   dict(page="nonogram.html",   js="app-nonogram.js",   data=["nonogram-daily.json", "nonogram-pool.json"]),
}

README = """{name} — a Gridlings daily logic puzzle (standalone build)

Every board is machine-verified before publication: exactly one solution,
reachable by pure deduction. {days} pre-baked daily boards from {epoch},
plus free-play pools in three difficulties.

Run it: serve this folder with any static file server, e.g.
    python3 -m http.server 8000
then open http://localhost:8000/ — opening index.html directly from disk
won't work (browsers block JSON fetches from file://).

Upload it: this zip is a ready HTML5 build for itch.io or similar portals
(entry file index.html, relative paths, no backend required).

License: free for personal, educational, and portal use with attribution —
link to https://play.agiscorecard.com (the live version, with all 11 games,
daily streaks, bilingual play, and an open 1,100-puzzle research benchmark).
Not affiliated with LinkedIn or The New York Times.
"""

def strip_page(html_src):
    s = html_src
    s = re.sub(r'<link rel="manifest"[^>]*>\n?', "", s)
    s = re.sub(r'<script>if\("serviceWorker".*?</script>\n?', "", s, flags=re.S)
    s = re.sub(r'<script src="/sub\.js" defer></script>\n?', "", s)
    return s

def main():
    os.makedirs(OUT, exist_ok=True)
    index_rows = []
    all_zip = io.BytesIO()
    all_zf = zipfile.ZipFile(all_zip, "w", zipfile.ZIP_DEFLATED)
    for slug, g in GAMES.items():
        d = json.load(open(os.path.join(SITE, g["data"][0])))
        page = strip_page(open(os.path.join(SITE, g["page"])).read())
        readme = README.format(name=slug.capitalize(), days=len(d["puzzles"]), epoch=d["epoch"])
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
            zf.writestr("index.html", page)
            zf.writestr("style.css", open(os.path.join(SITE, "style.css")).read())
            zf.writestr(g["js"], open(os.path.join(SITE, g["js"])).read())
            for f in g["data"]:
                zf.writestr(f, open(os.path.join(SITE, f)).read())
            zf.writestr("README.txt", readme)
        data = buf.getvalue()
        name = f"{slug}.zip"
        open(os.path.join(OUT, name), "wb").write(data)
        # the all-in-one nests each game in its own folder
        all_zf.writestr(f"{slug}/index.html", page)
        all_zf.writestr(f"{slug}/style.css", open(os.path.join(SITE, "style.css")).read())
        all_zf.writestr(f"{slug}/{g['js']}", open(os.path.join(SITE, g["js"])).read())
        for f in g["data"]:
            all_zf.writestr(f"{slug}/{f}", open(os.path.join(SITE, f)).read())
        all_zf.writestr(f"{slug}/README.txt", readme)
        index_rows.append((slug, len(data)))
        print(f"packed {name}: {len(data)//1024} KB")
    all_zf.writestr("README.txt", README.format(name="Gridlings — all 11 games", days=450, epoch="2026-08-24"))
    all_zf.close()
    open(os.path.join(OUT, "gridlings-all-11.zip"), "wb").write(all_zip.getvalue())
    print(f"packed gridlings-all-11.zip: {len(all_zip.getvalue())//1024} KB")
    json.dump({s: n for s, n in index_rows}, open(os.path.join(OUT, "sizes.json"), "w"))

if __name__ == "__main__":
    main()
