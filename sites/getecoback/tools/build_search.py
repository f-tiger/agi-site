#!/usr/bin/env python3
"""Build the static site-search index.

140 static pages need no search backend: the index is title + description per
indexable page, built here from the same files the sitemap trusts, and matched
in the visitor's browser. The search box exists for the reader — but the reason
it feeds /api/ev is the site's automation loop: every query is zero-cost keyword
research from the site's own audience, and a query with zero hits is an unmet
need surfaced verbatim. The daily routine reads those from D1 as its topic
queue (SQL in docs/analytics-first-party-d1.md).
"""
import glob, json, os, re, html as H

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, "site")

SKIP = {"404.html", "radar-bestaetigt.html"}


def field(h, pattern):
    m = re.search(pattern, h, re.S)
    return re.sub(r"\s+", " ", H.unescape(m.group(1))).strip() if m else ""


def collect():
    out = []
    pats = ["*.html", "guide/*.html", "en/*.html", "en/guide/*.html", "kategorie/*.html"]
    for pat in pats:
        for path in sorted(glob.glob(os.path.join(SITE, pat))):
            rel = os.path.relpath(path, SITE).replace(os.sep, "/")
            if os.path.basename(rel) in SKIP or rel.startswith("widgets/"):
                continue
            h = open(path, encoding="utf-8").read()
            if 'name="robots" content="noindex' in h:
                continue
            title = field(h, r"<title>(.*?)</title>")
            desc = field(h, r'<meta name="description" content="(.*?)"')
            if not title:
                continue
            url = "/" + rel
            if url.endswith("/index.html"):
                url = url[: -len("index.html")]
            out.append({"u": url, "t": title, "d": desc[:160],
                        "l": "en" if rel.startswith("en/") else "de"})
    return out


def main():
    entries = collect()
    path = os.path.join(SITE, "search-index.json")
    payload = json.dumps(entries, ensure_ascii=False, separators=(",", ":"))
    old = open(path, encoding="utf-8").read() if os.path.exists(path) else ""
    if payload != old:
        open(path, "w", encoding="utf-8").write(payload)
    print(f"search-index.json: {len(entries)} pages, {len(payload)//1024} KB")


if __name__ == "__main__":
    main()
