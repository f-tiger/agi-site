#!/usr/bin/env python3
"""Build gate: the BreadcrumbList JSON-LD must say what the visible breadcrumb
says. Found 2026-09-04: the crumb injector was insert-only, so 165 of 171 guide
pages carried a BreadcrumbList from a previous life ("Guides → /en/#guides",
stale titles) that disagreed with the nav a reader actually sees. Like
check_faq_parity: text-level, markup-shape-agnostic, drift fails the build.

Rules (deliberately few):
  * names are compared after entity-unescape + whitespace normalisation;
  * URLs are compared absolute (visible hrefs are site-relative);
  * a visible crumb that links to the same URL as the crumb before it is a
    label, not a level (the EN nav shows "Home › All Guides" both → /en/), so
    it collapses into that level;
  * the final crumb is the current page; the nav does not link it, so only its
    name is checked there.
Pages without both a visible EB_CRUMB nav and a BreadcrumbList are skipped —
hub pages carry their own generated LD and no injected nav."""
import glob, html, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, "site")
BASE = "https://getecoback.com"
LD_RE = re.compile(r'<script\b[^>]*type="application/ld\+json"[^>]*>(.*?)</script>', re.S)


def norm(s):
    return re.sub(r'\s+', ' ', html.unescape(s or "").replace("\xa0", " ")).strip()


def absolute(u):
    u = norm(u)
    return BASE + u if u.startswith("/") else u


def visible_crumbs(s):
    m = re.search(r'<!--EB_CRUMB--><nav[^>]*>(.*?)</nav>', s, re.S)
    if not m:
        return None
    nav = m.group(1)
    parts = re.split(r'<span>[^<]*</span>', nav)
    out = []
    for part in parts:
        a = re.search(r'<a\s[^>]*href="([^"]*)"[^>]*>(.*?)</a>', part, re.S)
        if a:
            out.append((norm(re.sub(r'<[^>]+>', '', a.group(2))), absolute(a.group(1))))
        else:
            out.append((norm(re.sub(r'<[^>]+>', '', part)), None))
    out = [c for c in out if c[0]]
    # collapse label-only crumbs (same link as the previous level)
    collapsed = []
    for c in out:
        if collapsed and c[1] and c[1] == collapsed[-1][1]:
            continue
        collapsed.append(c)
    return collapsed


def ld_crumbs(s):
    found = []
    for m in LD_RE.finditer(s):
        if "BreadcrumbList" not in m.group(1):
            continue
        try:
            d = json.loads(m.group(1))
        except ValueError:
            return "unparseable"
        for n in (d.get("@graph") or [d]) if isinstance(d, dict) else []:
            if isinstance(n, dict) and n.get("@type") == "BreadcrumbList":
                items = sorted(n.get("itemListElement", []), key=lambda i: i.get("position", 0))
                found.append([(norm(i.get("name")), absolute(i.get("item", ""))) for i in items])
    return found


def main():
    bad, checked = [], 0
    files = sorted(glob.glob(os.path.join(SITE, "**", "*.html"), recursive=True))
    for f in files:
        s = open(f, encoding="utf-8").read()
        vis = visible_crumbs(s)
        if vis is None:
            continue
        lds = ld_crumbs(s)
        if lds == "unparseable":
            bad.append((f, "JSON-LD does not parse")); continue
        if not lds:
            continue
        checked += 1
        if len(lds) > 1:
            bad.append((f, f"{len(lds)} BreadcrumbList nodes on one page")); continue
        ld = lds[0]
        if len(ld) != len(vis):
            bad.append((f, f"LD has {len(ld)} levels, nav has {len(vis)}: {[c[0] for c in ld]} vs {[c[0] for c in vis]}"))
            continue
        for i, ((vn, vu), (ln, lu)) in enumerate(zip(vis, ld)):
            last = i == len(vis) - 1
            if vn != ln:
                bad.append((f, f"level {i+1} name: nav '{vn[:60]}' vs LD '{ln[:60]}'")); break
            if not last and vu != lu:
                bad.append((f, f"level {i+1} url: nav {vu} vs LD {lu}")); break
    rel = lambda p: os.path.relpath(p, ROOT)
    if bad:
        print(f"check_crumb_parity: {len(bad)} violation(s):")
        for f, msg in bad[:30]:
            print(f"  {rel(f)}: {msg}")
        sys.exit(1)
    print(f"check_crumb_parity: {checked} pages, BreadcrumbList matches the visible breadcrumb on all")


if __name__ == "__main__":
    main()
