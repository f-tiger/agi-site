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

ICONS = {"gridlings":"\U0001F98A","balance":"\U0001F319","starbattle":"\u2B50","trail":"\U0001F43E","futoshiki":"\u2276","towers":"\U0001F3D9","minisudoku":"\U0001F522","kropki":"\u26AB","sandwich":"\U0001F96A","thermo":"\U0001F321","nonogram":"\u25A6"}

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

Store listing: cover.png in this zip is a ready 630x500 cover image; titles,
descriptions and tags for bulk uploads are in store-listing.md at
https://github.com/f-tiger/agi-site/blob/main/docs/games-store-listing.md

License: free for personal, educational, and portal use with attribution —
link to https://play.agiscorecard.com (the live version, with all 11 games,
daily streaks, bilingual play, and an open 1,100-puzzle research benchmark).
Not affiliated with LinkedIn or The New York Times.
"""

SITE_URL = "https://play.agiscorecard.com"

def strip_page(html_src, slug):
    """Portal-context rewrites (zip copies only — the live site is untouched):
    root-absolute links break on a deep portal path AND waste the funnel, so
    they become absolute site links with per-package UTM; the win modal gains
    the one CTA that matters at the moment of victory."""
    s = html_src
    s = re.sub(r'<link rel="manifest"[^>]*>\n?', "", s)
    s = re.sub(r'<script>if\("serviceWorker".*?</script>\n?', "", s, flags=re.S)
    s = re.sub(r'<script src="/sub\.js" defer></script>\n?', "", s)
    # embed.js is a live-site asset (never bundled): drop its tag and the
    # "Copy iframe code" line whose handler lives in it — dead UI in a package.
    s = re.sub(r'<script src="/embed\.js" defer></script>\n?', "", s)
    s = re.sub(r'<p class="subline">Embed this game:.*?</p>\n?', "", s, flags=re.S)
    # inline hub-card beacons (gridlings index): root-absolute /e posts to the
    # portal origin and every hub_click is lost — same rewrite as the engine js
    s = s.replace("sendBeacon('/e'", "sendBeacon('https://play.agiscorecard.com/e'")
    utm = f"?utm_source=package&utm_medium={slug}"
    s = re.sub(r'href="/(?!/)([a-z0-9-]*)"',
               lambda m: f'href="{SITE_URL}/{m.group(1)}{utm}" target="_blank" rel="noopener"', s)
    cta = (f'<p style="margin:6px 0 0"><a href="{SITE_URL}/{utm}" target="_blank" rel="noopener">'
           f'\U0001F9E9 11 daily logic games \u2014 play the full collection \u2192</a></p>')
    s = re.sub(r'(<div id="win"[^>]*>)', r"\1" + cta.replace("\\", "\\\\"), s, count=1) if False else s
    # inject the CTA right before the win modal closes (after the subline row)
    m = re.search(r'(<p class="subline">.*?</p>)', s, flags=re.S)
    if m:
        s = s.replace(m.group(1), cta + m.group(1), 1)
    return s

def strict_page(html_src):
    """CrazyGames-class portals reject games carrying external links. Drop every
    <a href="http..."> (keep inner text), win-CTA included; plain-text
    attribution stays. Applied on top of strip_page output."""
    s = html_src
    # whole dead paragraphs go first (anchor-stripping would leave orphan text):
    # the injected full-collection CTA and the subscribe line
    s = re.sub(r'<p style="margin:6px 0 0"><a href="https://play\.agiscorecard\.com[^>]*>.*?</a></p>\n?', "", s, flags=re.S)
    s = re.sub(r'<p class="subline"><a id="subcta".*?</p>\n?', "", s, flags=re.S)
    # attribute-order-proof: the old pattern required href to be the FIRST
    # attribute and let <a id="subcta" href="http..."> ship in all 11 zips
    s = re.sub(r'<a\b[^>]*href="https?://[^"]*"[^>]*>(.*?)</a>', r"\1", s, flags=re.S)
    # engines: window.GL_CLEAN === true kills the beacon, the challenge UI and
    # the share-text site URL — built for exactly this delivery
    s = s.replace('<script src="copy.js">', '<script>window.GL_CLEAN=true</script><script src="portal.js"></script><script src="copy.js">', 1)
    s = s.replace("</title>", " (portal build)</title>", 1)
    return s

def portal_js(js_src, page_path):
    """Zip copy of the engine: beacon goes to the site (CORS * on /e, so
    portal plays are measured, with the portal as referrer), and challenge
    links point at the canonical site page instead of the portal copy."""
    j = js_src.replace('"/e"', f'"{SITE_URL}/e"')
    j = j.replace("location.origin + location.pathname",
                  f'"{SITE_URL}{page_path}"')
    return j

def main():
    os.makedirs(OUT, exist_ok=True)
    index_rows = []
    all_zip = io.BytesIO()
    all_zf = zipfile.ZipFile(all_zip, "w", zipfile.ZIP_DEFLATED)
    for slug, g in GAMES.items():
        d = json.load(open(os.path.join(SITE, g["data"][0])))
        page = strip_page(open(os.path.join(SITE, g["page"])).read(), slug)
        play_path = "/" if slug == "gridlings" else "/" + slug
        js_body = portal_js(open(os.path.join(SITE, g["js"])).read(), play_path)
        readme = README.format(name=slug.capitalize(), days=len(d["puzzles"]), epoch=d["epoch"])
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
            zf.writestr("index.html", page)
            zf.writestr("style.css", open(os.path.join(SITE, "style.css")).read())
            zf.writestr(g["js"], js_body)
            zf.writestr("firstrun.js", open(os.path.join(SITE, "firstrun.js")).read())
            zf.writestr("copy.js", open(os.path.join(SITE, "copy.js")).read())
            cov = os.path.join(SITE, "covers", (slug if slug != "gridlings" else "gridlings") + ".png")
            if os.path.exists(cov):
                zf.writestr("cover.png", open(cov, "rb").read())
            for f in g["data"]:
                zf.writestr(f, open(os.path.join(SITE, f)).read())
            zf.writestr("README.txt", readme)
        data = buf.getvalue()
        name = f"{slug}.zip"
        open(os.path.join(OUT, name), "wb").write(data)
        # the all-in-one nests each game in its own folder
        all_zf.writestr(f"{slug}/index.html", page)
        all_zf.writestr(f"{slug}/style.css", open(os.path.join(SITE, "style.css")).read())
        all_zf.writestr(f"{slug}/{g['js']}", js_body)
        all_zf.writestr(f"{slug}/firstrun.js", open(os.path.join(SITE, "firstrun.js")).read())
        all_zf.writestr(f"{slug}/copy.js", open(os.path.join(SITE, "copy.js")).read())
        for f in g["data"]:
            all_zf.writestr(f"{slug}/{f}", open(os.path.join(SITE, f)).read())
        all_zf.writestr(f"{slug}/README.txt", readme)
        index_rows.append((slug, len(data)))
        print(f"packed {name}: {len(data)//1024} KB")
    # strict variants (no external links) for CrazyGames-class portals
    sdir = os.path.join(OUT, "strict")
    os.makedirs(sdir, exist_ok=True)
    for slug, g in GAMES.items():
        page = strict_page(strip_page(open(os.path.join(SITE, g["page"])).read(), slug))
        play_path = "/" if slug == "gridlings" else "/" + slug
        js_body = portal_js(open(os.path.join(SITE, g["js"])).read(), play_path)
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
            zf.writestr("index.html", page)
            zf.writestr("style.css", open(os.path.join(SITE, "style.css")).read())
            zf.writestr(g["js"], js_body)
            zf.writestr("firstrun.js", open(os.path.join(SITE, "firstrun.js")).read())
            zf.writestr("copy.js", open(os.path.join(SITE, "copy.js")).read())
            zf.writestr("portal.js", open(os.path.join(SITE, "portal.js")).read())
            for f in g["data"]:
                zf.writestr(f, open(os.path.join(SITE, f)).read())
            cov = os.path.join(SITE, "covers", f"{slug}.png")
            if os.path.exists(cov):
                zf.writestr("cover.png", open(cov, "rb").read())
            zf.writestr("README.txt", README.format(name=slug.capitalize() + " (portal build, no external links)", days=450, epoch="2026-08-24"))
        open(os.path.join(sdir, f"{slug}.zip"), "wb").write(buf.getvalue())
    print(f"strict portal builds: {len(GAMES)} zips in downloads/strict/")
    hub_rows = "".join(
        f'<a href="{sl}/index.html" style="border:1px solid rgba(128,128,128,.4);border-radius:12px;padding:14px 16px;text-decoration:none;color:inherit;background:rgba(128,128,128,.07);font-size:16px;display:block">{ICONS[sl]} <strong>{sl.capitalize()}</strong></a>'
        for sl in GAMES)
    all_zf.writestr("index.html", f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Gridlings — 11 Daily Logic Puzzles</title>
<style>body{{font-family:system-ui,sans-serif;margin:0;padding:24px;max-width:640px;margin:auto}}h1{{font-size:1.4rem}}p{{color:#666;font-size:14px}}.g{{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px}}</style>
</head><body>
<h1>Gridlings — 11 daily logic puzzles</h1>
<p>Every board machine-verified: exactly one solution, reachable by pure deduction. Pick a game:</p>
<div class="g">{hub_rows}</div>
<p style="margin-top:18px">Live version with streaks, archive &amp; 中文: play.agiscorecard.com</p>
</body></html>""")
    all_zf.writestr("README.txt", README.format(name="Gridlings — all 11 games", days=450, epoch="2026-08-24"))
    all_zf.close()
    open(os.path.join(OUT, "gridlings-all-11.zip"), "wb").write(all_zip.getvalue())
    print(f"packed gridlings-all-11.zip: {len(all_zip.getvalue())//1024} KB")
    json.dump({s: n for s, n in index_rows}, open(os.path.join(OUT, "sizes.json"), "w"))

if __name__ == "__main__":
    main()
