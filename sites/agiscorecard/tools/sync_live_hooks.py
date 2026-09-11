# -*- coding: utf-8 -*-
"""Keep every deep page's LIVE-NUMBER hook in sync with data.json.

Why this exists (2026-09-10). CLAUDE.md requires every judgement-type page to carry
"一个带日期、会变、可逐条审计的活数字" on the first screen — the one thing a chat answer
goes stale on. Seven pages carry that hook. On 2026-09-10 SIX of them were showing
`as of 2026-08-08` while data.json said `2026-09-06`: 29 days stale, on the pages that
earn the site's citations (/situational-awareness-summary alone is 42% of them).

The 2026-09-06 run fixed the generator bug that froze /progress-index's own visible
date, and fixed the one deep page it happened to look at — but nothing swept the rest,
because gen_index.py only ever wrote progress-index.html. So the hooks were always
going to drift, and the drift is invisible: the number still looks live.

A hook that advertises freshness while being a month stale is worse than no hook.
This script is the sweep, gen_index.py calls it, and validate.py fails the build if a
hook ever disagrees with data.json again.
"""
import io, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# "as of <strong>YYYY-MM-DD</strong>" (EN) / "截至 <strong>YYYY-MM-DD</strong>" (zh)
DATE_RE = re.compile(r"((?:as of|截至) *<strong>)(\d{4}-\d{2}-\d{2})(</strong>)")
# the big number itself: >62.5<span ...>/100</span>
SCORE_RE = re.compile(r"(>)(\d+(?:\.\d+)?)(<span [^>]*>/100</span>)")


def tracker():
    d = json.load(io.open(os.path.join(ROOT, "data.json"), encoding="utf-8"))["thesisTracker"]
    s = d["score"]
    return d["asOf"], (str(int(s)) if float(s) == int(s) else str(s))


def hook_pages():
    """Pages carrying a live hook: an index_click handler AND a /100 score."""
    out = []
    for rel in sorted(os.listdir(ROOT)) + ["zh/" + f for f in sorted(os.listdir(os.path.join(ROOT, "zh")))]:
        if not rel.endswith(".html"):
            continue
        p = os.path.join(ROOT, rel)
        if not os.path.isfile(p):
            continue
        s = io.open(p, encoding="utf-8", errors="ignore").read()
        if "index_click" in s and SCORE_RE.search(s) and DATE_RE.search(s):
            out.append((rel, p, s))
    return out


def check():
    """Returns a list of complaints; empty means every hook agrees with data.json."""
    as_of, score = tracker()
    bad = []
    for rel, _p, s in hook_pages():
        for _, d, _ in DATE_RE.findall(s):
            if d != as_of:
                bad.append("%s: live hook says as-of %s, data.json says %s" % (rel, d, as_of))
        for _, v, _ in SCORE_RE.findall(s):
            if v != score:
                bad.append("%s: live hook shows %s/100, data.json says %s" % (rel, v, score))
    return sorted(set(bad))


def sync():
    as_of, score = tracker()
    changed = []
    for rel, p, s in hook_pages():
        out = DATE_RE.sub(lambda m: m.group(1) + as_of + m.group(3), s)
        out = SCORE_RE.sub(lambda m: m.group(1) + score + m.group(3), out)
        if out != s:
            io.open(p, "w", encoding="utf-8").write(out)
            changed.append(rel)
    return as_of, score, changed


if __name__ == "__main__":
    if "--check" in sys.argv:
        problems = check()
        for c in problems:
            print("STALE", c)
        print("live hooks OK" if not problems else "%d stale hook(s)" % len(problems))
        sys.exit(1 if problems else 0)
    a, sc, ch = sync()
    print("live hooks synced to %s/100 as of %s" % (sc, a))
    for c in ch:
        print("  updated", c)
    if not ch:
        print("  (already in sync)")
