# -*- coding: utf-8 -*-
"""Generate /feed.xml (Atom) from the sitemap + page metadata.
Run after EVERY publish/refresh:  python3 tools/gen_feed.py
Feed = automated distribution layer (aggregators, Feedly/Flipboard, AI
curators consume it with no accounts needed) + a secondary sitemap that
accelerates indexing. Declares WebSub hubs for push discovery.
Keeps the newest MAX_ENTRIES root-level pages by sitemap lastmod.
"""
import html
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://agiscorecard.com"
MAX_ENTRIES = 20

sm = open(os.path.join(ROOT, "sitemap.xml"), encoding="utf-8").read()
rows = re.findall(r"<loc>https://agiscorecard\.com/([^<]*)</loc><lastmod>([^<]*)</lastmod>", sm)

entries = []
for loc, lastmod in rows:
    if "/" in loc or loc in ("", "about", "privacy"):  # root pages only; skip langs & meta
        continue
    base = loc.replace(".html", "")
    path = os.path.join(ROOT, base + ".html")
    if not os.path.exists(path):
        continue
    page = open(path, encoding="utf-8").read()
    t = re.search(r"<title>([^<]*)</title>", page)
    d = re.search(r'<meta name="description" content="([^"]*)"', page)
    if not (t and d):
        continue
    entries.append({"url": f"{SITE}/{base}", "title": t.group(1), "summary": d.group(1), "date": lastmod})

entries.sort(key=lambda e: e["date"], reverse=True)
entries = entries[:MAX_ENTRIES]
updated = max(e["date"] for e in entries) + "T00:00:00Z"

items = ""
for e in entries:
    items += f"""  <entry>
    <title>{html.escape(e['title'])}</title>
    <link href="{e['url']}"/>
    <id>{e['url']}</id>
    <updated>{e['date']}T00:00:00Z</updated>
    <summary>{html.escape(e['summary'])}</summary>
  </entry>
"""

feed = f"""<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>The AGI Scorecard</title>
  <subtitle>Live verdicts on Aschenbrenner's Situational Awareness predictions — AGI timelines, graded against reality.</subtitle>
  <link href="{SITE}/"/>
  <link rel="self" href="{SITE}/feed.xml"/>
  <link rel="hub" href="https://pubsubhubbub.appspot.com/"/>
  <link rel="hub" href="https://pubsubhubbub.superfeedr.com/"/>
  <id>{SITE}/</id>
  <updated>{updated}</updated>
  <author><name>The AGI Scorecard</name></author>
  <rights>CC BY 4.0 — reuse with attribution and a link to {SITE}</rights>
{items}</feed>
"""

out = os.path.join(ROOT, "feed.xml")
open(out, "w", encoding="utf-8").write(feed)
print(f"feed.xml: {len(entries)} entries, updated {updated}")

if __name__ == "__main__" and "--ping" in sys.argv:
    # best-effort WebSub ping (egress may block; hubs also poll the self link)
    import subprocess
    for hub in ("https://pubsubhubbub.appspot.com/", "https://pubsubhubbub.superfeedr.com/"):
        r = subprocess.run(["curl", "-s", "-o", "/dev/null", "-w", "%{http_code}", "-m", "10",
                            "-d", f"hub.mode=publish&hub.url={SITE}/feed.xml", hub],
                           capture_output=True, text=True)
        print(f"ping {hub}: HTTP {r.stdout.strip() or 'fail'}")
