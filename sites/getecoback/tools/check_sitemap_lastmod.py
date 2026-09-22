#!/usr/bin/env python3
"""Gate: the sitemap may only say "changed today" about pages that did.

Accident shape (found 2026-09-22): build_sitemap fell back to the file mtime for
every page without a JSON-LD dateModified, and CI builds from a fresh checkout,
so a dozen tool/agent/calculator URLs were stamped with the deploy date on every
deploy (six deploys a day). Combined with an IndexNow step that resubmitted every
injector-rewritten file, the site was telling Bing "everything changed, again"
several times a day — while the 19 newest guides had been fetched by bingbot once
in twelve days. This site lives on Bing's index, so that signal is the one thing
it cannot afford to waste.

For every <url> whose lastmod is today, exactly one of these must hold:
  - it is a homepage (/ or /en/): the rising rail and the season block change daily;
  - the file is untracked in git (generated during this deploy);
  - the last commit touching the file is today (a real change shipped today);
  - the page's JSON-LD dateModified is today AND the file was committed today.
    (dateModified == today on a file nobody committed today means an injector
    stamped the editorial date — the "everything is fresh" lie, only wearing a
    schema hat.)
Anything else is red. --selftest exercises both directions with stubs.
"""
import datetime, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, "site")
BASE = "https://getecoback.com"
HOMES = {f"{BASE}/", f"{BASE}/en/"}
ENTRY_RE = re.compile(r"<loc>([^<]+)</loc>\s*(?:<lastmod>([^<]*)</lastmod>)?")
MODIFIED_RE = re.compile(r'"dateModified"\s*:\s*"(\d{4}-\d{2}-\d{2})')


def path_of(url):
    rel = url[len(BASE):].lstrip("/")
    if rel == "" or rel.endswith("/"):
        rel += "index.html"
    return os.path.join(SITE, rel)


def is_tracked(path):
    r = subprocess.run(["git", "ls-files", "--error-unmatch", path], cwd=ROOT,
                       capture_output=True, text=True)
    return r.returncode == 0


def commit_date(path):
    r = subprocess.run(["git", "log", "-1", "--format=%cs", "--", path], cwd=ROOT,
                       capture_output=True, text=True)
    d = r.stdout.strip()
    return d if r.returncode == 0 and re.fullmatch(r"\d{4}-\d{2}-\d{2}", d) else None


def page_modified(path):
    try:
        m = MODIFIED_RE.search(open(path, encoding="utf-8").read())
    except OSError:
        return None
    return m.group(1) if m else None


def violations(entries, today, tracked, committed, modified):
    """entries: [(url, lastmod)]; the three callables take a file path."""
    out = []
    for url, lastmod in entries:
        if lastmod != today or url in HOMES:
            continue
        p = path_of(url)
        if not tracked(p):
            continue                      # generated during this deploy
        if committed(p) == today:
            continue                      # a real change shipped today
        why = ("JSON-LD dateModified says today but nobody committed the file today"
               if modified(p) == today else
               "no editorial date and the file was not committed today (mtime leak?)")
        out.append((url, why))
    return out


def main():
    today = os.environ.get("SITEMAP_TODAY") or datetime.date.today().isoformat()
    xml = open(os.path.join(SITE, "sitemap.xml"), encoding="utf-8").read()
    entries = ENTRY_RE.findall(xml)
    bad = violations(entries, today, is_tracked, commit_date, page_modified)
    n_today = sum(1 for _, lm in entries if lm == today)
    if bad:
        print(f"::error::sitemap claims {len(bad)} page(s) changed today that this deploy did not change:")
        for url, why in bad:
            print(f"  {url} — {why}")
        print("Fix the date source (build_sitemap.py) or the injector that stamps dateModified; "
              "do not paper over it by committing the file.")
        sys.exit(1)
    print(f"check_sitemap_lastmod OK: {len(entries)} URLs, {n_today} dated {today}, all justified")


def selftest():
    today = "2026-09-22"
    tracked = lambda p: "untracked" not in p
    committed = lambda p: today if "committed-today" in p else "2026-09-01"
    modified = lambda p: today if "stamped" in p else None
    entries = [
        (f"{BASE}/", today),                                  # home: allowed
        (f"{BASE}/en/", today),                               # en home: allowed
        (f"{BASE}/workbench/untracked-tool.html", today),     # generated: allowed
        (f"{BASE}/guide/committed-today.html", today),        # shipped today: allowed
        (f"{BASE}/guide/old-page.html", "2026-07-10"),        # not today: ignored
        (f"{BASE}/tools.html", today),                        # mtime leak: RED
        (f"{BASE}/guide/stamped.html", today),                # injector stamp: RED
    ]
    bad = violations(entries, today, tracked, committed, modified)
    urls = [u for u, _ in bad]
    assert urls == [f"{BASE}/tools.html", f"{BASE}/guide/stamped.html"], bad
    assert "mtime" in bad[0][1] and "dateModified" in bad[1][1], bad
    assert violations(entries[:5], today, tracked, committed, modified) == []
    print("check_sitemap_lastmod selftest OK")


if __name__ == "__main__":
    selftest() if "--selftest" in sys.argv else main()
