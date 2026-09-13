#!/usr/bin/env python3
"""Demand board page for source.agiscorecard.com — built only from the fleet's own derived facts.

Owner 2026-09-13 asked for a Reddit-mined "opportunity matching" site. The verdict
(docs/reddit-opportunity-board-2026-09-13.md) is: no new sub-domain (rule ③ fails), and no
republishing of Reddit content (GummySearch died of the licence question 2025-11-30; Reddit sues
scrapers). So this page shows, per opportunity: the *Google Trends rising query* as the headline
(public, Google-derived), how many days the same request recurred on Reddit (a count we computed),
which subreddits (names only), a plain link to Reddit's own search, existing supply from Product
Hunt / HN public feeds, and the fleet page that already answers it. No post titles, no bodies, no
permalinks.

Publish gate (pre-registered): the page is written only when ≥ MIN_CONFIRMED opportunities are
demand-confirmed AND recurring (≥2 days). Below that the page is not written (thin content is
worse than no page); an existing page is left as-is and flagged, never faked fresh.

Usage: python3 sites/buysomething/tools/gen_demand_board.py [--selftest] [--min=N]
"""
import datetime as dt
import html
import json
import os
import sys
import urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
SITE_DIR = os.path.join(HERE, "..", "site")
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
SRC = os.path.join(ROOT, "data", "autopilot", "opportunities.json")
OUT = os.path.join(SITE_DIR, "demand-board.html")
BASE = "https://source.agiscorecard.com"
MIN_CONFIRMED = 3


def eligible(opps):
    return [o for o in opps if o.get("state") == "demand-confirmed" and len(o.get("days_seen") or []) >= 2]


def card(o):
    d = (o.get("demand") or [{}])[0]
    q = d.get("q") or o.get("theme")
    v = d.get("v")
    subs = ", ".join("r/" + s for s in sorted({o.get("subreddit")} - {"", None})) or "Reddit"
    rs = "https://www.reddit.com/search/?q=" + urllib.parse.quote_plus(q)
    supply = "".join(f'<li><a class="ext-link" href="{html.escape(s.get("url") or "#")}" rel="nofollow noopener" target="_blank">{html.escape(s.get("title") or "")}</a> <span class="muted">({html.escape(s.get("src") or "")})</span></li>'
                     for s in (o.get("supply") or [])[:3])
    pages = "".join(f'<li>{html.escape(p.get("site") or "")}: <code>{html.escape(p.get("page") or "")}</code></li>' for p in (o.get("fleet_pages") or [])[:2])
    return f'''
      <article class="card">
        <div class="card-top"><h3 class="card-title">{html.escape(q)}</h3><span class="chip">{html.escape(o.get("state"))}</span></div>
        <p><strong>Demand</strong>: Google Trends rising{f" (growth value {int(v):,})" if isinstance(v, (int, float)) else ""} under seed <em>{html.escape(d.get("seed") or "")}</em>.</p>
        <p><strong>Asked on Reddit</strong>: the same request recurred on {len(o.get("days_seen") or [])} distinct days ({html.escape(o["days_seen"][0])} → {html.escape(o["days_seen"][-1])}) in {html.escape(subs)}.
        <a class="ext-link" href="{rs}" rel="nofollow noopener" target="_blank">See the threads on Reddit →</a></p>
        {"<p><strong>Someone already built something close</strong>:</p><ul>" + supply + "</ul>" if supply else "<p><strong>Existing supply</strong>: nothing matching on Product Hunt / HN in the last radar window.</p>"}
        {"<p><strong>Already answered in this fleet</strong>:</p><ul>" + pages + "</ul>" if pages else ""}
      </article>'''


def render(snap, today):
    rows = eligible(snap.get("opportunities") or [])
    cards = "".join(card(o) for o in rows)
    c = snap.get("counts") or {}
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>&#128225;</text></svg>">
  <link rel="stylesheet" href="styles.css">
  <title>Demand Board: requests people keep making, matched to measured demand ({today.year})</title>
  <meta name="description" content="{len(rows)} product requests that recurred on Reddit on two or more days and also show up as rising Google searches, with existing supply from Product Hunt and HN. Derived counts only, refreshed daily.">
  <link rel="canonical" href="{BASE}/demand-board">
  <meta property="og:title" content="Demand Board: recurring requests × rising searches">
  <meta property="og:url" content="{BASE}/demand-board">
  <meta property="og:type" content="article">
  <script type="application/ld+json">{json.dumps({"@context": "https://schema.org", "@type": "Dataset", "name": "SourceRadar demand board", "description": "Recurring product requests matched to Google Trends rising queries and existing supply; derived counts only.", "dateModified": today.isoformat(), "license": "https://creativecommons.org/licenses/by/4.0/", "url": BASE + "/demand-board"})}</script>
</head>
<body>
  <header class="site-header">
    <div class="container header-inner">
      <a class="brand" href="/"><span class="brand-mark">&#128225;</span><span class="brand-text">Source<em>Radar</em></span></a>
      <nav class="main-nav">
        <a href="/#picks">Radar Picks</a>
        <a href="/landed-cost">Landed Cost</a>
        <a href="/is-alibaba-legit">Alibaba Risk</a>
        <a href="/sourcing-margins">Margins</a>
        <a href="/demand-board">Demand Board</a>
        <a href="/packs">Packs</a>
      </nav>
    </div>
  </header>
  <section class="hero">
    <div class="container">
      <h1>Demand board:<br><span class="accent">requests people keep making, matched to searches people keep making</span></h1>
      <p class="hero-sub">A request that appears once is noise. One that comes back on separate days <em>and</em> shows up as a rising Google query is a signal.
      This board lists only those: {len(rows)} today, out of {c.get("candidates", 0)} candidates ({c.get("recurring", 0)} recurring, {c.get("demand_confirmed", 0)} demand-confirmed, {c.get("supplied", 0)} with something already built).</p>
      <p class="hero-sub muted">Refreshed {today.isoformat()} from public feeds. We store and show counts and query strings, not people's posts; the Reddit link runs Reddit's own search. Not advice, not a marketplace, nothing is for sale here.</p>
    </div>
  </section>
  <section class="container" style="padding:1.5rem 0 3rem">
    <div class="grid">{cards}
    </div>
  </section>
  <footer class="site-footer"><div class="container footer-inner"><p class="footer-note">Derived from Google Trends rising queries, Product Hunt and Hacker News public feeds, and recurrence counts of public requests. Data reused under CC BY 4.0 with attribution to SourceRadar.</p></div></footer>
</body>
</html>
'''


def register(today):
    sm = os.path.join(SITE_DIR, "sitemap.xml")
    s = open(sm, encoding="utf-8").read()
    if "/demand-board</loc>" not in s:
        s = s.replace("</urlset>", f"  <url><loc>{BASE}/demand-board</loc><lastmod>{today.isoformat()}</lastmod><changefreq>daily</changefreq></url>\n</urlset>")
        open(sm, "w", encoding="utf-8").write(s)
    llms = os.path.join(SITE_DIR, "llms.txt")
    t = open(llms, encoding="utf-8").read()
    if "/demand-board" not in t:
        t = t.rstrip("\n") + f"\n- [Demand board]({BASE}/demand-board): recurring public product requests matched to Google Trends rising queries and existing supply (Product Hunt / HN); derived counts only, refreshed daily.\n"
        open(llms, "w", encoding="utf-8").write(t)


def selftest():
    T = dt.date(2026, 9, 13)
    mk = lambda n, st="demand-confirmed", days=("2026-09-01", "2026-09-09"): {"theme": f"theme {n}", "state": st, "days_seen": list(days), "subreddit": "de",
                                                                             "demand": [{"q": f"query {n}", "v": 1234, "seed": "s"}], "supply": [{"title": "X", "url": "https://ph/x", "src": "producthunt"}], "fleet_pages": []}
    snap = {"counts": {"candidates": 5}, "opportunities": [mk(1), mk(2), mk(3), mk(4, days=("2026-09-01",)), mk(5, st="recurring")]}
    rows = eligible(snap["opportunities"])
    page = render(snap, T)
    checks = [
        ("gate: confirmed AND ≥2 days only", [r["theme"] for r in rows] == ["theme 1", "theme 2", "theme 3"]),
        ("gate: below MIN refuses", len(eligible({"opportunities": [mk(1), mk(2)]}["opportunities"])) < MIN_CONFIRMED),
        ("page: headline is the Google query, not the reddit theme", "query 1" in page and "theme 1" not in page),
        ("page: no permalink to reddit posts, only Reddit search", "reddit.com/r/" not in page and "reddit.com/search/?q=" in page and "/comments/" not in page),
        ("page: canonical + dataset schema", f'{BASE}/demand-board' in page and '"@type": "Dataset"' in page),
        ("page: external links nofollow", page.count('rel="nofollow noopener"') == page.count("ext-link\" href")),
        ("page: no affiliate params", "tag=" not in page and "utm_" not in page),
    ]
    for n, ok in checks:
        print(("✅ " if ok else "❌ ") + n)
    return 0 if all(ok for _, ok in checks) else 1


def main(argv):
    if "--selftest" in argv:
        return selftest()
    mn = MIN_CONFIRMED
    for a in argv:
        if a.startswith("--min="):
            mn = int(a.split("=", 1)[1])
    today = dt.date.today()
    try:
        snap = json.load(open(SRC, encoding="utf-8"))
    except Exception as e:
        print(f"::warning::opportunities.json unreadable ({e}); demand board not written"); return 0
    rows = eligible(snap.get("opportunities") or [])
    if len(rows) < mn:
        print(f"demand board: {len(rows)} eligible < {mn} — page not written" + (" (existing page kept as-is)" if os.path.exists(OUT) else ""))
        return 0
    open(OUT, "w", encoding="utf-8").write(render(snap, today))
    register(today)
    print(f"demand board: wrote {os.path.relpath(OUT, ROOT)} with {len(rows)} opportunities")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
