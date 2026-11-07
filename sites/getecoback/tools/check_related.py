#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Gate for the lateral related-links layer (2026-09-17).

Three ways this block can quietly turn from an asset into a liability, none of
which changes how the page looks:

1. A wall of links. An early version of build_related.py grew one block to 16
   entries because its top-up pass appended without a real cap. Link blocks that
   read as a wall are ignored by readers and discounted by engines.
2. Duplicate links. The builder skips targets a page already links to, but it
   reads those with a regex, and the first version of that regex matched only
   relative hrefs while this site also links with absolute URLs. Same blind spot
   produced a phantom "orphan crisis" in the analysis that motivated the tool.
   So assert on the OUTPUT: generic suggestions may not repeat targets outside
   the block. Reviewed task handoffs have a different contract: their exact
   reasons and destinations must match the shared renderer, even when an
   explanatory paragraph already cites the same destination.
3. Self-links, which waste a slot and look broken.

Run: python3 tools/check_related.py
"""
import os
import re
import sys
from pathlib import Path
from urllib.parse import unquote, urlsplit

from moisture_journeys import GUIDE_NEXT, render_next_steps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, "site")
HARD_MAX = 6
# Both URL forms, deliberately — see reason 2 above.
LINK = re.compile(r'href="(?:https://getecoback\.com)?(/[^"#?]*\.html)"')
BLOCK = re.compile(r"<!--EB_RELATED-->(.*?)<!--/EB_RELATED-->", re.S)
HANDOFF_ID = re.compile(r'''\bid\s*=\s*["']eb-journey-next["']''')


def check_curated_block(route, html):
    """Validate a reviewed handoff, not a general duplicate-link exemption."""
    if route not in GUIDE_NEXT:
        return [f"{route}: curated handoff is not an approved route"]
    bad = []
    steps = GUIDE_NEXT[route]
    if not 1 <= len(steps) <= 2:
        bad.append(f"{route}: curated handoff needs one or two reviewed steps")
    destinations = []
    for step in steps:
        if not step.get("label", "").strip() or not step.get("why", "").strip():
            bad.append(f"{route}: curated step is missing its label or reason")
        url = urlsplit(step.get("href", ""))
        destinations.append(url.path)
        if (url.scheme or url.netloc or url.query or not url.path.startswith("/")
                or ".." in Path(url.path).parts):
            bad.append(f"{route}: curated step must target a local page")
            continue
        if url.path == route:
            bad.append(f"{route}: curated handoff links to itself")
        target = Path(SITE) / url.path.lstrip("/")
        if not target.is_file():
            bad.append(f"{route}: curated target does not exist: {step['href']}")
        elif url.fragment and not re.search(
                r'''\bid=["']''' + re.escape(unquote(url.fragment)) + r'''["']''',
                target.read_text(encoding="utf-8")):
            bad.append(f"{route}: curated target fragment does not exist: {step['href']}")
    if len(destinations) != len(set(destinations)):
        bad.append(f"{route}: curated handoff repeats a target")
    if bad:
        return bad

    matches = list(BLOCK.finditer(html))
    if (len(matches) != 1 or html.count("<!--EB_RELATED-->") != 1
            or html.count("<!--/EB_RELATED-->") != 1):
        bad.append(f"{route}: expected exactly one complete curated handoff block")
        return bad
    if len(HANDOFF_ID.findall(html)) != 1:
        bad.append(f"{route}: expected exactly one curated handoff id")

    # build_onpage adds this heading anchor; country builders retain the
    # existing action attribute. These are the only permitted render variants.
    heading_id = "next-step" if route.startswith("/en/") else "dein-naechster-schritt"
    expected = set()
    for country_actions in (False, True):
        rendered = render_next_steps(route, country_actions=country_actions)
        expected.add(rendered)
        expected.add(rendered.replace("<h2 ", f'<h2 id="{heading_id}" ', 1))
    if matches[0].group(0) not in expected:
        bad.append(f"{route}: curated handoff differs from its reviewed links, labels or reasons")
    return bad


def main():
    bad, blocks, links = [], 0, 0
    for root, _dirs, files in os.walk(SITE):
        for fn in files:
            if not fn.endswith(".html"):
                continue
            path = os.path.join(root, fn)
            rel = "/" + os.path.relpath(path, SITE).replace(os.sep, "/")
            html = Path(path).read_text(encoding="utf-8")
            if rel in GUIDE_NEXT:
                bad.extend(check_curated_block(rel, html))
                blocks += len(BLOCK.findall(html))
                links += sum(len(LINK.findall(block)) for block in BLOCK.findall(html))
                continue
            if HANDOFF_ID.search(html):
                bad.append(f"{rel}: curated handoff is not an approved route")
            m = BLOCK.search(html)
            if not m:
                continue
            blocks += 1
            inside = LINK.findall(m.group(1))
            links += len(inside)
            if len(inside) > HARD_MAX:
                bad.append(f"{rel}: related block has {len(inside)} links (max {HARD_MAX}) — a wall, not a suggestion")
            if rel in inside:
                bad.append(f"{rel}: related block links to itself")
            if len(inside) != len(set(inside)):
                bad.append(f"{rel}: related block repeats a link inside itself")
            rest = re.sub(r"<(script|style)\b.*?</\1>", "", html[:m.start()] + html[m.end():], flags=re.S)
            dupes = set(inside) & set(LINK.findall(rest))
            if dupes:
                bad.append(f"{rel}: related block repeats {len(dupes)} link(s) the page already makes "
                           f"(e.g. {sorted(dupes)[0]})")
    if blocks == 0:
        bad.append("no page carries EB_RELATED — the lateral link layer is gone")
    print(f"check_related: {blocks} block(s), {links} lateral links")
    if bad:
        print("FAIL check_related:")
        for b in bad[:20]:
            print("  -", b)
        return 1
    print("check_related OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
