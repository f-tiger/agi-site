#!/usr/bin/env python3
"""Gate: the tools hub lists exactly the tool pages that exist, and links only to files that exist.

Accident shapes (2026-09-22): nine tool pages existed that the hub never mentioned
(the hub is the only tool entry in the nav, so they were unreachable); the hub is a
hand-edited page, so the next added tool would have gone missing the same way.
Asserting "hub == filesystem" cannot go stale the way a hard-coded count would.

Checks
  1. every discovered tool URL is linked from the EB_TOOLS_INDEX block;
  2. every URL in the block is a discovered tool (no stale cards);
  3. no duplicate hrefs in the block;
  4. every internal href on the whole hub page (block or not) resolves to a file.
--selftest feeds the checker a hub with one missing and one stale card and expects both to be named.
"""
import os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_tools_hub as B  # noqa: E402

HREF_RE = re.compile(r'href="(/[^"#?]+\.html)')


def block_of(hub):
    if B.OPEN not in hub or B.CLOSE not in hub:
        return None
    return hub[hub.index(B.OPEN):hub.index(B.CLOSE)]


def problems(hub, tools, exists):
    out = []
    blk = block_of(hub)
    if blk is None:
        return ["EB_TOOLS_INDEX marker block missing — run tools/build_tools_hub.py"]
    linked = HREF_RE.findall(blk)
    dup = sorted({u for u in linked if linked.count(u) > 1})
    for u in dup:
        out.append(f"duplicate card: {u}")
    linked_set = set(linked)
    for u in sorted(set(tools) - linked_set):
        out.append(f"tool page not on the hub: {u}")
    for u in sorted(linked_set - set(tools)):
        out.append(f"stale card (not a tool page on disk): {u}")
    for u in sorted(set(HREF_RE.findall(hub))):
        if not exists(u):
            out.append(f"dead link on the hub: {u}")
    return out


def main():
    hub = open(B.HUB, encoding="utf-8").read()
    tools = B.discover()
    exists = lambda u: os.path.exists(os.path.join(B.SITE, u.lstrip("/")))
    bad = problems(hub, tools, exists)
    if bad:
        print("::error::tools hub does not match the filesystem:")
        for b in bad:
            print("  " + b)
        print("Fix: python3 tools/build_tools_hub.py (or remove the dead link).")
        sys.exit(1)
    print(f"check_tools_hub OK: {len(tools)} tool pages, all on the hub, no stale or dead links")


def selftest():
    tools = {"/guide/a.html": {}, "/guide/b.html": {}, "/en/guide/c.html": {}}
    good = f'{B.OPEN}<a href="/guide/a.html">A</a><a href="/guide/b.html">B</a><a href="/en/guide/c.html">C</a>{B.CLOSE}<a href="/impressum.html">i</a>'
    exists = lambda u: u in tools or u == "/impressum.html"
    assert problems(good, tools, exists) == [], problems(good, tools, exists)
    bad = f'{B.OPEN}<a href="/guide/a.html">A</a><a href="/guide/a.html">A</a><a href="/guide/old.html">old</a>{B.CLOSE}<a href="/gone.html">x</a>'
    p = problems(bad, tools, exists)
    assert any("duplicate card: /guide/a.html" in x for x in p), p
    assert any("not on the hub: /guide/b.html" in x for x in p), p
    assert any("stale card" in x and "/guide/old.html" in x for x in p), p
    assert any("dead link" in x and "/gone.html" in x for x in p), p
    assert problems("<html>no block</html>", tools, exists)[0].startswith("EB_TOOLS_INDEX marker block missing")
    # the detector itself: an injected room sizer must not turn a guide into a tool
    assert not B.is_tool("/guide/x.html", "<p>text</p>")
    assert B.is_tool("/guide/x.html", '<input type="number" id="qm">')
    assert B.is_tool("/guide/x.html", '<button data-v="3">Dach</button>')
    assert B.is_tool("/guide/x.html", '<select></select><select></select><div aria-live="polite"></div>')
    assert B.is_tool("/guide/strompreis-radar.html", "")
    stripped = B.EB_RE.sub("", '<!--EB_SIZER--><input type="number"><!--/EB_SIZER--><p>guide</p>')
    assert not B.is_tool("/guide/y.html", stripped)
    print("check_tools_hub selftest OK")


if __name__ == "__main__":
    selftest() if "--selftest" in sys.argv else main()
