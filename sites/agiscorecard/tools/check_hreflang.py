#!/usr/bin/env python3
"""Hreflang graph validator for agiscorecard.com (seo-hreflang skill gate).

Checks, per the skill's rules:
  1. Self-reference: every page carrying hreflang must include a tag whose
     href exactly matches its own canonical URL.
  2. Return tags: every hreflang edge A->B requires B->A (full bidirectional
     mesh); B must itself carry hreflang markup.
  3. x-default: exactly one per page's set.
  4. Language codes: ISO 639-1 (+ optional ISO 15924 script / ISO 3166-1
     region), validated against an allowlist of codes this site uses.
  5. Absolute HTTPS URLs on the canonical host.
  6. Dead links: every alternate URL must resolve to a real file in the repo.
  7. Group consistency: all members of a cluster declare identical alternate
     sets (same URL set, same x-default target).
  8. Sitemap: every hreflang-carrying page's canonical URL is in sitemap.xml.

Exit 0 with "OK" when green; exit 1 with a defect list otherwise.
Run from repo root or anywhere: paths are resolved relative to this file.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HOST = "https://agiscorecard.com"

# Codes legitimately in use on this site. zh-Hans (Simplified) is the
# preferred script-qualified form per the skill; bare "zh" is flagged so the
# site stays consistent on one form.
VALID_CODES = {"en", "zh-Hans", "de", "es", "fr", "it", "ja", "ko", "pt", "x-default"}
CODE_RE = re.compile(r"^(?:[a-z]{2}(?:-[A-Z][a-z]{3})?(?:-[A-Z]{2})?|x-default)$")

HREF_RE = re.compile(
    r'<link\s+rel="alternate"\s+hreflang="([^"]+)"\s+href="([^"]+)"\s*/?>', re.I)
CANON_RE = re.compile(r'<link\s+rel="canonical"\s+href="([^"]+)"\s*/?>', re.I)

SKIP_DIRS = {".git", "tools", "share", "badge", "node_modules", ".claude", ".github"}


def url_to_file(url: str):
    """Map a canonical-host URL to a repo file, or None if it can't exist."""
    if not url.startswith(HOST):
        return None
    path = url[len(HOST):].split("#")[0].split("?")[0]
    if path in ("", "/"):
        return ROOT / "index.html"
    path = path.lstrip("/")
    cands = [ROOT / path] if path.endswith(".html") else [
        ROOT / (path + ".html"), ROOT / path / "index.html", ROOT / path]
    for c in cands:
        if c.is_file():
            return c
    return None


def scan():
    pages = {}  # file -> {"canonical": str|None, "alts": [(code,url)]}
    for f in ROOT.rglob("*.html"):
        rel = f.relative_to(ROOT)
        if rel.parts[0] in SKIP_DIRS:
            continue
        html = f.read_text(encoding="utf-8", errors="replace")
        head = html.split("</head>", 1)[0]
        alts = HREF_RE.findall(head)
        if not alts:
            continue
        m = CANON_RE.search(head)
        pages[f] = {"canonical": m.group(1) if m else None, "alts": alts}
    return pages


def main():
    pages = scan()
    errors = []
    warnings = []

    def err(f, msg):
        errors.append(f"{f.relative_to(ROOT)}: {msg}")

    # canonical-URL -> file index for return-tag checks
    canon_of = {}
    for f, info in pages.items():
        if info["canonical"]:
            canon_of[info["canonical"].rstrip("/")] = f

    sitemap_urls = set()
    sm = ROOT / "sitemap.xml"
    if sm.is_file():
        sitemap_urls = set(re.findall(r"<loc>([^<]+)</loc>", sm.read_text()))

    for f, info in sorted(pages.items()):
        canonical = info["canonical"]
        alts = info["alts"]
        if not canonical:
            err(f, "carries hreflang but has no canonical link")
            continue

        # 4/5: code + URL shape
        for code, url in alts:
            if not CODE_RE.match(code):
                err(f, f"malformed hreflang code '{code}'")
            elif code not in VALID_CODES:
                err(f, f"unexpected hreflang code '{code}' (site standard set: {sorted(VALID_CODES)})")
            if not url.startswith(HOST + "/") and url != HOST:
                err(f, f"non-absolute or wrong-host href '{url}' (code {code})")

        # duplicates within a page
        codes = [c for c, _ in alts]
        for c in set(codes):
            if codes.count(c) > 1:
                err(f, f"hreflang code '{c}' declared {codes.count(c)} times")

        # 3: exactly one x-default
        xd = [u for c, u in alts if c == "x-default"]
        if len(xd) != 1:
            err(f, f"{len(xd)} x-default tags (need exactly 1)")

        # 1: self-reference matches canonical exactly
        if canonical not in [u for _, u in alts]:
            err(f, f"missing self-referencing hreflang for canonical {canonical}")

        # 6: alternates must resolve to real files
        for code, url in alts:
            if url_to_file(url) is None:
                err(f, f"hreflang {code} points to non-existent page {url}")

        # 8: canonical in sitemap
        if sitemap_urls and canonical not in sitemap_urls:
            warnings.append(f"{f.relative_to(ROOT)}: canonical {canonical} not in sitemap.xml")

    # 2 + 7: bidirectional mesh and identical sets within each cluster
    for f, info in sorted(pages.items()):
        my_set = {(c, u) for c, u in info["alts"]}
        for code, url in info["alts"]:
            if code == "x-default":
                continue
            tf = url_to_file(url)
            if tf is None or tf == f:
                continue
            if tf not in pages:
                err(f, f"return tag missing: {url} ({code}) carries no hreflang markup at all")
                continue
            their = pages[tf]
            their_set = {(c, u) for c, u in their["alts"]}
            if my_set != their_set:
                only_mine = my_set - their_set
                only_theirs = their_set - my_set
                err(f, f"alternate set mismatch with {tf.relative_to(ROOT)}"
                       f" (missing there: {sorted(only_mine)}; extra there: {sorted(only_theirs)})")

    n_groups = len({tuple(sorted(u for _, u in i['alts'])) for i in pages.values()})
    print(f"scanned {len(pages)} hreflang-carrying pages in {n_groups} clusters")
    for w in warnings:
        print(f"WARN {w}")
    if errors:
        for e in errors:
            print(f"FAIL {e}")
        print(f"\n{len(errors)} error(s)")
        sys.exit(1)
    print("OK — hreflang graph is closed: self-refs, return tags, x-default, codes, files all valid")


if __name__ == "__main__":
    main()
