#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Enumerate a site's published pages and index their visible text.

The page set comes from the SITEMAP, not from a filesystem walk. That is deliberate:
the sitemap is the site's own editorial statement of what it publishes, and walking
the tree instead would pull in drafts, partials, 404 pages and language stubs that no
one decided to publish. Autopilot never expands a site's inventory on its own.
"""
import html
import os
import re

SCRIPT_STYLE = re.compile(r"<(script|style)\b.*?</\1>", re.S | re.I)
TAG = re.compile(r"<[^>]+>")
TITLE = re.compile(r"<title[^>]*>(.*?)</title>", re.S | re.I)
H1 = re.compile(r"<h1[^>]*>(.*?)</h1>", re.S | re.I)
DESC = re.compile(r'<meta[^>]+name=["\']description["\'][^>]+content=["\']([^"\']*)', re.I)
WORD = re.compile(r"[0-9a-zà-öø-ÿÀ-ɏ]{3,}", re.I)
LOC_RE = re.compile(r"<loc>([^<]+)</loc>")


def sitemap_urls(cfg):
    with open(cfg.sitemap, encoding="utf-8") as fh:
        return [u.strip() for u in LOC_RE.findall(fh.read())]


def published_pages(cfg):
    """Return (rels, unresolved_urls). rels are publish_root-relative html files."""
    rels, unresolved = [], []
    seen = set()
    for url in sitemap_urls(cfg):
        rel = cfg.rel_for_url(url)
        if rel is None:
            unresolved.append(url)
            continue
        if not rel.endswith((".html", ".htm")):
            continue          # json/txt/xml assets are not pages
        if cfg.is_excluded(rel) or rel in seen:
            continue
        seen.add(rel)
        rels.append(rel)
    return rels, unresolved


def _text(raw):
    t = SCRIPT_STYLE.sub(" ", raw)
    t = TAG.sub(" ", t)
    return html.unescape(t)


def page_index(cfg, rels):
    """{rel: {"title","h1","desc","tokens"}} — visible text only, scripts stripped.

    Tokens come from title + h1 + meta description + the first 4 000 characters of
    body text. Whole-page tokenisation was tried first and matched a demand term
    against any page that merely mentioned the word once in a footer link.
    """
    out = {}
    for rel in rels:
        p = os.path.join(cfg.publish_root, rel)
        try:
            with open(p, encoding="utf-8", errors="replace") as fh:
                raw = fh.read()
        except OSError:
            continue
        title = _text(TITLE.search(raw).group(1)).strip() if TITLE.search(raw) else ""
        h1 = _text(H1.search(raw).group(1)).strip() if H1.search(raw) else ""
        desc = html.unescape(DESC.search(raw).group(1)).strip() if DESC.search(raw) else ""
        body = _text(raw)[:4000]
        heavy = " ".join([title, h1, desc])
        tokens = {}
        for w in WORD.findall(heavy.lower()):
            tokens[w] = tokens.get(w, 0) + 3      # title/h1/desc weigh triple
        for w in WORD.findall(body.lower()):
            tokens[w] = tokens.get(w, 0) + 1
        out[rel] = {"title": title[:200], "h1": h1[:200], "desc": desc[:300], "tokens": tokens}
    return out
