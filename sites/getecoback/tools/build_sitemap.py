#!/usr/bin/env python3
"""Rebuild site/sitemap.xml from the filesystem.

Scans site/ for .html files, skips noindex pages, derives the canonical URL
(from the <link rel="canonical"> tag, falling back to the path), assigns
priority/changefreq by URL shape, and writes a fresh sitemap.

Run manually (`python tools/build_sitemap.py`) or in CI before deploy so the
sitemap always matches whatever pages actually exist — no manual edits when a
new category or page is generated.

Each URL gets its own lastmod, in this order of trust:
  1. the page's own dateModified in JSON-LD (the editorial date);
  2. the date of the last git commit that touched the file;
  3. datePublished in JSON-LD;
  4. the fallback date (today, or the CLI argument).
The two homepages are the exception and always carry today's date: the
rising-demand rail and the season block genuinely change every day.

Why the git date and not the file's mtime (2026-09-22): CI deploys from a fresh
checkout, where every file's mtime is the checkout time. Every page without a
JSON-LD date — tools, agents, creator kits, calculators — was therefore stamped
with the deploy date on every deploy, i.e. the sitemap told Bing that a dozen
pages changed on each of the ~6 deploys a day. Stamping every URL with today's
date is exactly the noisy freshness signal that devalues the ones that are
real, and this site lives on Bing's index. tools/check_sitemap_lastmod.py
asserts the accident shape after every rebuild.

Usage: python tools/build_sitemap.py [YYYY-MM-DD] [--selftest]
  optional arg = fallback lastmod for pages with no date signal at all
"""
import os, re, sys, datetime, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, "site")
BASE = "https://getecoback.com"
CANON_RE = re.compile(r'<link\s+rel="canonical"\s+href="([^"]+)"', re.I)
MODIFIED_RE = re.compile(r'"dateModified"\s*:\s*"(\d{4}-\d{2}-\d{2})')
PUBLISHED_RE = re.compile(r'"datePublished"\s*:\s*"(\d{4}-\d{2}-\d{2})')
NOINDEX_RE = re.compile(r'<meta[^>]+name="robots"[^>]+noindex', re.I)
DAILY = {f"{BASE}/", f"{BASE}/en/"}


def git_commit_date(path):
    """UTC date (YYYY-MM-DD) of the last commit touching *path*, or None.

    None for untracked files, for files outside a git checkout, and when git is
    missing. A shallow clone returns the boundary commit's date for older files;
    that is still a real past date, never "today", which is the failure this
    function exists to avoid. CI checks out with fetch-depth 0, so there it is
    exact.
    """
    try:
        out = subprocess.run(
            ["git", "log", "-1", "--format=%ct", "--", path],
            cwd=os.path.dirname(path) or ".", capture_output=True, text=True, timeout=20,
        )
    except (OSError, subprocess.SubprocessError):
        return None
    stamp = out.stdout.strip()
    if out.returncode != 0 or not re.fullmatch(r"\d+", stamp):
        return None
    # %cs preserves the committer's offset. Near midnight it can disagree with
    # the UTC build date even when the commit was made moments ago.
    return datetime.datetime.fromtimestamp(int(stamp), datetime.timezone.utc).date().isoformat()


def page_lastmod(html, path, fallback, url=None):
    """Return (lastmod, source) for one page; see module docstring for the order."""
    if url in DAILY:
        return fallback, "daily"
    m = MODIFIED_RE.search(html)
    if m:
        return m.group(1), "dateModified"
    d = git_commit_date(path)
    if d:
        return d, "git"
    m = PUBLISHED_RE.search(html)
    if m:
        return m.group(1), "datePublished"
    return fallback, "fallback"


def priority_and_freq(url):
    path = url[len(BASE):] or "/"
    if path == "/":
        return "1.0", "daily"
    if path == "/en/":
        return "0.7", "daily"
    if path.startswith("/en/") or path.startswith("/it/"):
        return "0.6", "weekly"
    if path.startswith("/guide/"):
        return "0.9", "weekly"
    return "0.8", "weekly"


def main():
    args = [a for a in sys.argv[1:] if a != "--selftest"]
    lastmod = args[0] if args else datetime.datetime.now(datetime.timezone.utc).date().isoformat()
    urls = []
    sources = {}
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
            mod, src = page_lastmod(html, full, lastmod, url)
            sources[src] = sources.get(src, 0) + 1
            urls.append((url, mod))
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
    today = sum(1 for _, m in urls if m == lastmod)
    print(f"sitemap.xml rebuilt: {len(urls)} URLs, {len(dates)} distinct lastmod dates "
          f"({dates[0]} … {dates[-1]}); lastmod sources {sources}; {today} URL(s) dated {lastmod}")


def selftest():
    """The three date sources resolve in the documented order; mtime is never used."""
    import tempfile
    today = "2099-01-01"
    with tempfile.TemporaryDirectory() as td:
        p = os.path.join(td, "a.html")
        open(p, "w").write('{"datePublished":"2026-07-01","dateModified":"2026-08-15"}')
        assert page_lastmod(open(p).read(), p, today) == ("2026-08-15", "dateModified")
        open(p, "w").write('{"datePublished":"2026-07-01"}')
        # outside any git repo: no commit date → datePublished, never the fresh mtime
        assert page_lastmod(open(p).read(), p, today) == ("2026-07-01", "datePublished"), "untracked undated page must not get today's date"
        open(p, "w").write("<html></html>")
        assert page_lastmod(open(p).read(), p, today) == (today, "fallback")
        assert page_lastmod("<html></html>", p, today, url=f"{BASE}/") == (today, "daily")
    # a tracked, undated page in this repo resolves to a real commit date, not today
    tracked = os.path.join(SITE, "tools.html")
    if os.path.exists(tracked) and git_commit_date(tracked):
        mod, src = page_lastmod("<html></html>", tracked, today)
        assert src == "git" and mod != today, (mod, src)
    # Exercise real git output at both sides of UTC midnight. The runner must
    # compare UTC dates, regardless of the offset retained in the commit.
    with tempfile.TemporaryDirectory() as td:
        subprocess.run(["git", "init", "-q", td], check=True)
        env = {**os.environ, "GIT_AUTHOR_NAME": "Sitemap test",
               "GIT_AUTHOR_EMAIL": "sitemap@example.invalid",
               "GIT_COMMITTER_NAME": "Sitemap test",
               "GIT_COMMITTER_EMAIL": "sitemap@example.invalid"}
        for i, (stamp, expected) in enumerate([
            ("2026-09-24T21:45:43-04:00", "2026-09-25"),
            ("2026-09-25T01:15:00+14:00", "2026-09-24"),
        ]):
            path = os.path.join(td, f"page-{i}.html")
            open(path, "w").write("<html></html>")
            subprocess.run(["git", "-C", td, "add", path], check=True)
            subprocess.run(["git", "-C", td, "commit", "-qm", "date fixture"],
                           env={**env, "GIT_AUTHOR_DATE": stamp, "GIT_COMMITTER_DATE": stamp}, check=True)
            assert git_commit_date(path) == expected, (stamp, git_commit_date(path), expected)
    print("build_sitemap selftest OK")


if __name__ == "__main__":
    if "--selftest" in sys.argv:
        selftest()
    else:
        main()
