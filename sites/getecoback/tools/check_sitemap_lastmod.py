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
A supplied --publication-receipt may additionally prove the exact source-backed
content update awaiting this run's narrow commit. The receipt is checked against
HEAD, both changed durable state files, the daily ledger, content hash, canonical,
source facts and visible body; general dirty files remain rejected.
Anything else is red. --selftest exercises both directions with stubs.
"""
import argparse, datetime, json, os, re, subprocess, sys
from pathlib import Path
from build_sitemap import git_commit_date

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
    return git_commit_date(path)


def page_modified(path):
    try:
        m = MODIFIED_RE.search(open(path, encoding="utf-8").read())
    except OSError:
        return None
    return m.group(1) if m else None


def violations(entries, today, tracked, committed, modified, pending=None):
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
        if pending and os.path.realpath(p) in pending and modified(p) == today:
            continue                      # exact validated transaction commits later in this run
        why = ("JSON-LD dateModified says today but nobody committed the file today"
               if modified(p) == today else
               "no editorial date and the file was not committed today (mtime leak?)")
        out.append((url, why))
    return out


def validated_pending(receipt_path, root=ROOT, today=None):
    """Allow only a real, source-backed update awaiting this run's narrow commit.

    Dirty files or an arbitrary dateModified are insufficient. The same strict
    publication receipt, ownership, source/hash, body and date validations used
    by the publisher must pass, and both durable state files must actually change.
    """
    from commit_auto_content import DATA, Rejected, git, validate_receipt
    from auto_content import read_state
    from check_auto_content_release import check_document
    root = Path(root).resolve()
    repo = Path(git(root, 'rev-parse', '--show-toplevel'))
    before = git(repo, 'rev-parse', 'HEAD')
    receipt = json.loads(Path(receipt_path).read_text())
    paths, urls = validate_receipt(repo, receipt, before)
    if not receipt['changed']:
        return set()
    if not DATA.issubset(paths):
        raise Rejected('Pending publication must include both durable state files')
    changed = set(git(repo, 'diff', '--name-only', 'HEAD', '--', *paths).splitlines())
    untracked = set(git(repo, 'ls-files', '--others', '--exclude-standard', '--', *paths).splitlines())
    if not DATA.issubset(changed | untracked):
        raise Rejected('Pending publication state files have no real change')
    state, ledger = read_state(root)
    ledger_relative = (root / 'data/auto-content-ledger.json').relative_to(repo).as_posix()
    old_ledger = (json.loads(git(repo, 'show', 'HEAD:' + ledger_relative))
                  if git(repo, 'ls-tree', '--name-only', 'HEAD', '--', ledger_relative)
                  else {'pages': {}})
    if not isinstance(old_ledger, dict) or not isinstance(old_ledger.get('pages'), dict):
        raise Rejected('Committed automatic content ledger is invalid')
    today = today or datetime.datetime.now(datetime.timezone.utc).date().isoformat()
    pending = set()
    for url in urls:
        route = url[len(BASE):]
        entry, owned = state['pages'][route], ledger['pages'][route]
        if route in old_ledger['pages']:
            previous = old_ledger['pages'][route]
            if not isinstance(previous, dict) or not previous.get('content_hash'):
                raise Rejected('Committed content hash missing for the pending update')
            if previous['content_hash'] == owned.get('content_hash'):
                raise Rejected('Pending publication changes dates or metadata without substantive facts')
        if entry['modified'] != today or ledger.get('days', {}).get(today, {}).get('route') != route:
            raise Rejected('Pending publication is not the ledger transaction for today')
        file = root / 'site' / route.lstrip('/')
        relative = file.relative_to(repo).as_posix()
        if relative not in changed | untracked:
            raise Rejected('Pending publication page has no actual file change')
        check_document(file.read_text(), route, entry, owned)
        pending.add(str(file.resolve()))
    return pending


def main(receipt_path=None):
    today = os.environ.get("SITEMAP_TODAY") or datetime.datetime.now(datetime.timezone.utc).date().isoformat()
    xml = open(os.path.join(SITE, "sitemap.xml"), encoding="utf-8").read()
    entries = ENTRY_RE.findall(xml)
    pending = validated_pending(receipt_path, today=today) if receipt_path else set()
    bad = violations(entries, today, is_tracked, commit_date, page_modified, pending)
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
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--selftest', action='store_true')
    parser.add_argument('--publication-receipt')
    args = parser.parse_args()
    try:
        selftest() if args.selftest else main(args.publication_receipt)
    except (ValueError, RuntimeError, OSError, KeyError, TypeError) as error:
        print('::error::sitemap pending-publication validation failed: ' + str(error))
        sys.exit(1)
