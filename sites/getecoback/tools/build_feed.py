#!/usr/bin/env python3
"""Generate site/feed.xml (RSS 2.0) from the German guide pages.

Another crawler-discovery channel that needs no manual action: RSS is read by
feed aggregators, some search crawlers, and syndication services. Runs in CI
before deploy (like build_sitemap.py), so the feed always matches the site.

Usage: python3 tools/build_feed.py [YYYY-MM-DD]
"""
import os, re, sys, glob, datetime, html as htmllib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, "site")
BASE = "https://getecoback.com"

def meta(h, name):
    m = re.search(rf'<meta name="{name}" content="([^"]*)"', h)
    return m.group(1) if m else ""

def title_of(h):
    m = re.search(r'<title>(.*?)</title>', h, re.S)
    return re.sub(r'\s+', ' ', m.group(1)).strip() if m else ""

def pubdate(h):
    m = re.search(r'"datePublished":\s*"(\d{4}-\d{2}-\d{2})"', h)
    return m.group(1) if m else "2026-07-07"

def rfc822(datestr):
    d = datetime.datetime.strptime(datestr, "%Y-%m-%d")
    return d.strftime("%a, %d %b %Y 08:00:00 +0000")

def main():
    items = []
    for path in glob.glob(os.path.join(SITE, "guide", "*.html")):
        h = open(path, encoding="utf-8").read()
        slug = os.path.basename(path)[:-5]
        items.append({
            "url": f"{BASE}/guide/{slug}.html",
            "title": htmllib.escape(title_of(h)),
            "desc": htmllib.escape(meta(h, "description")),
            "date": pubdate(h),
        })
    items.sort(key=lambda i: (i["date"], i["url"]), reverse=True)
    now = sys.argv[1] if len(sys.argv) > 1 else datetime.date.today().isoformat()
    out = ['<?xml version="1.0" encoding="UTF-8"?>',
           '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
           '<channel>',
           '<title>EcoBack – Kühlen, Heizen &amp; Energie sparen</title>',
           f'<link>{BASE}/</link>',
           '<description>Unabhängiger deutschsprachiger Ratgeber für Klimageräte, Heizen, Luftqualität und Energiesparen.</description>',
           '<language>de-DE</language>',
           f'<lastBuildDate>{rfc822(now)}</lastBuildDate>',
           f'<atom:link href="{BASE}/feed.xml" rel="self" type="application/rss+xml"/>']
    for i in items[:50]:
        out += ['<item>',
                f'<title>{i["title"]}</title>',
                f'<link>{i["url"]}</link>',
                f'<guid isPermaLink="true">{i["url"]}</guid>',
                f'<pubDate>{rfc822(i["date"])}</pubDate>',
                f'<description>{i["desc"]}</description>',
                '</item>']
    out += ['</channel>', '</rss>']
    open(os.path.join(SITE, "feed.xml"), "w", encoding="utf-8").write("\n".join(out) + "\n")
    print(f"feed.xml: {min(len(items),50)} items (of {len(items)} guides)")

if __name__ == "__main__":
    main()
