#!/usr/bin/env python3
"""Rebuild site/sitemap.xml from the filesystem.

Scans site/ for .html files, skips noindex pages, derives the canonical URL
(from the <link rel="canonical"> tag, falling back to the path), assigns
priority/changefreq by URL shape, and writes a fresh sitemap.

Run manually (`python tools/build_sitemap.py`) or in CI before deploy so the
sitemap always matches whatever pages actually exist — no manual edits when a
new category or page is generated.

Each URL gets its own lastmod, read from the page's dateModified in JSON-LD and
falling back to the file's modification time. Stamping every URL with today's
date — which is what this used to do — tells crawlers the whole site changed
every single day, which is both untrue and exactly the kind of noisy freshness
signal that devalues the ones that are real.

Usage: python tools/build_sitemap.py [YYYY-MM-DD]
  optional arg = fallback lastmod for pages with no date signal at all
"""
import os, re, sys, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, "site")
BASE = "https://getecoback.com"
CANON_RE = re.compile(r'<link\s+rel="canonical"\s+href="([^"]+)"', re.I)
MODIFIED_RE = re.compile(r'"dateModified"\s*:\s*"(\d{4}-\d{2}-\d{2})')
NOINDEX_RE = re.compile(r'<meta[^>]+name="robots"[^>]+noindex', re.I)

def page_lastmod(html, path, fallback):
    m = MODIFIED_RE.search(html)
    if m:
        return m.group(1)
    try:
        return datetime.date.fromtimestamp(os.path.getmtime(path)).isoformat()
    except OSError:
        return fallback


def priority_and_freq(url):
    path = url[len(BASE):] or "/"
    if path == "/":
        return "1.0", "daily"
    if path == "/en/":
        return "0.7", "daily"
    if path.startswith("/en/"):
        return "0.6", "weekly"
    if path.startswith("/guide/"):
        return "0.9", "weekly"
    return "0.8", "weekly"

def main():
    lastmod = sys.argv[1] if len(sys.argv) > 1 else datetime.date.today().isoformat()
    urls = []
    for dirpath, _, files in os.walk(SITE):
        for f in sorted(files):
            if not f.endswith(".html"):
                continue
            full = os.path.join(dirpath, f)
            html = open(full, encoding="utf-8").read()
            if NOINDEX_RE.search(html):
                continue  # legal pages etc. stay out of the sitemap
            m = CANON_RE.search(html)
            if m:
                url = m.group(1)
            else:
                rel = os.path.relpath(full, SITE).replace(os.sep, "/")
                rel = "" if rel == "index.html" else rel.replace("index.html", "")
                url = f"{BASE}/{rel}"
            urls.append((url, page_lastmod(html, full, lastmod)))
    # de-dup + stable sort: homepage first, then de guides, then en
    # de-dup on URL, keeping the newest date if two files map to the same URL
    seen = {}
    for url, mod in urls:
        if url not in seen or mod > seen[url]:
            seen[url] = mod
    urls = sorted(seen.items(), key=lambda kv: (kv[0] != f"{BASE}/", "/en/" in kv[0], kv[0]))
    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for u, mod in urls:
        pr, cf = priority_and_freq(u)
        lines.append(f'  <url><loc>{u}</loc><lastmod>{mod}</lastmod>'
                     f'<changefreq>{cf}</changefreq><priority>{pr}</priority></url>')
    lines.append('</urlset>')
    out = os.path.join(SITE, "sitemap.xml")
    open(out, "w", encoding="utf-8").write("\n".join(lines) + "\n")
    dates = sorted({m for _, m in urls})
    print(f"sitemap.xml rebuilt: {len(urls)} URLs, {len(dates)} distinct lastmod dates "
          f"({dates[0]} … {dates[-1]})")

if __name__ == "__main__":
    main()
