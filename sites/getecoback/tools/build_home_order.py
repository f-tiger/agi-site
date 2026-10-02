#!/usr/bin/env python3
"""Order the homepage's sections by season (2026-09-27).

The homepage is assembled by about a dozen injectors from different rounds
(season teaser, BTU tool, sizing table, device tiles, rising rail, autumn
block, video rail, household and workbench links, EU evidence checks, popular
and newest lists) around hand-written summer sections. Each injector picks its
own anchor, so the page order was never decided by anyone. On 2026-09-27 the
page said "Feuchte Wohnung im Herbst?" in its H1 and then spent roughly 60 % of
its height on cooling: the BTU tool, "Die besten Kühlgeräte diese Woche", the
cooling buying guide and a 34-link list of summer guides.

That matters because of who reads it. D1, 28 days to 2026-09-27: four human
page views from Germany, but chatgpt-user fetched "/" 430 times (83 % of all
its fetches on this site), duckduckbot 78, yandex 69, perplexity 47, claudebot
40, bingbot 34. The homepage is what an assistant reads when someone asks
about this site, and in autumn it was answering with summer.

This step runs after every homepage injector and before the sitemap. It splits
the region between the hero and the footer into top-level units, keys each
unit, and emits them in the order configured for the current season. Units it
does not recognise keep their relative position, attached to the unit before
them, so a new injector cannot be silently dropped. Nothing is removed and no
text is changed: the same content, in an order that matches the season.

The household entry is a primary seasonal decision path. Other-topic tools
(electricity workbench and EU evidence checks) remain in a band near the footer.

Idempotent: a second run is byte-identical. Run: python3 tools/build_home_order.py
[--month N] [--check]
"""
import datetime
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from build_season import season_of  # noqa: E402

SITE = os.path.join(os.path.dirname(HERE), "site")
INDEX = os.path.join(SITE, "index.html")
FOOTER = "<!--EB_FOOTER-->"

MARKER_OPEN = re.compile(r"<!--(EB_[A-Z_]+)-->")
EVIDENCE_OPEN, EVIDENCE_CLOSE = "<!--eco-evidence:start-->", "<!--eco-evidence:end-->"

# Order per season. Keys are marker names, section ids, or the stable class /
# first-heading keys assigned in key_of(). Anything not listed keeps its place
# relative to the unit before it.
WARM = [
    "EB_SEASON", "EB_HOMETOOL", "EB_HOUSEHOLD_LINK", "EB_HOMETABLE", "EB_DEVICE_TILES", "shop-categories",
    "deals", "disclosure", "EB_RISING_RAIL", "EB_HERBST", "EB_SEASON_VIDEO", "situationen",
    "guide", "how", "faq", "EB_POPULAR", "EB_POPLIVE", "EB_NEWEST", "TOOLS_BAND",
]
COLD = [
    "EB_SEASON", "EB_HOUSEHOLD_LINK", "EB_HERBST", "EB_HOMETABLE", "EB_DEVICE_TILES", "shop-categories",
    "EB_NEWEST", "EB_POPULAR", "EB_POPLIVE", "EB_SEASON_VIDEO", "EB_RISING_RAIL",
    "EB_HOMETOOL", "deals", "disclosure", "situationen", "guide", "how", "faq", "TOOLS_BAND",
]
ORDER = {"sommer": WARM, "frühjahr": WARM, "herbst": COLD, "winter": COLD}
# Units that belong to other topics' tools; they go into one band above the footer.
TOOLS = ("EB_ENERGY_WORKBENCH", "eu-evidence", "task-workbench")
WB_OPEN, WB_CLOSE = "<!-- task-workbench:start -->", "<!-- task-workbench:end -->"


def find_close_section(html, i):
    """Index just past the </section> that closes the <section at i."""
    depth, pos = 0, i
    tag = re.compile(r"<(/?)section\b", re.I)
    while True:
        m = tag.search(html, pos)
        if not m:
            raise ValueError("unbalanced <section> on the homepage")
        depth += -1 if m.group(1) else 1
        pos = m.end()
        if depth == 0:
            return html.index(">", m.end()) + 1


def split_units(region):
    """Top-level units as (key, text). Leading/trailing whitespace stays with a unit."""
    units, pos = [], 0
    pat = re.compile(r"<!--(EB_[A-Z_]+)-->|<!--eco-evidence:start-->|<!-- task-workbench:start -->|<section\b|<aside\b", re.I)
    while True:
        m = pat.search(region, pos)
        if not m:
            break
        start = m.start()
        if m.group(1):
            name = m.group(1)
            close = "<!--/" + name + "-->"
            end = region.index(close, m.end()) + len(close)
            key = name
        elif m.group(0) == WB_OPEN:
            end = region.index(WB_CLOSE, m.end()) + len(WB_CLOSE)
            key = "task-workbench"
        elif m.group(0).startswith("<!--eco-evidence"):
            end = region.index(EVIDENCE_CLOSE, m.end()) + len(EVIDENCE_CLOSE)
            key = "eu-evidence"
        elif m.group(0).lower().startswith("<aside"):
            end = region.index("</aside>", m.end()) + len("</aside>")
            key = None
        else:
            end = find_close_section(region, start)
            key = None
        text = region[start:end]
        if key is None:
            key = key_of(text)
        # Trailing script that belongs to the unit (tracker right after a section).
        tail = re.match(r"\s*<script>.*?</script>", region[end:], re.S)
        if tail and key not in ("EB_POPLIVE",):
            end += tail.end()
            text = region[start:end]
        gap = region[pos:start]
        units.append([key, gap + text])
        pos = end
    rest = region[pos:]
    return units, rest


def key_of(text):
    m = re.match(r'<section[^>]*\bid="([^"]+)"', text)
    if m:
        return m.group(1)
    if re.match(r'<section[^>]*class="disclosure"', text):
        return "disclosure"
    h = re.search(r"<h2[^>]*>(.*?)</h2>", text, re.S)
    head = re.sub(r"<[^>]+>", "", h.group(1)).strip() if h else ""
    if head.startswith("So funktioniert"):
        return "how"
    if "Nach Kategorie" in text:
        return "shop-categories"
    return "unknown:" + (head[:40] or text[:40])


def order_units(units, season):
    want = ORDER[season]
    # Group each unknown unit with the known unit before it.
    groups, cur = [], None
    for key, text in units:
        if key.startswith("unknown:") and cur is not None:
            cur[1] += text
            cur[2].append(key)
        else:
            cur = [key, text, [key]]
            groups.append(cur)
    tools = [g for g in groups if g[0] in TOOLS]
    rest = [g for g in groups if g[0] not in TOOLS]
    rank = {k: i for i, k in enumerate(want)}
    base = len(want)
    # Stable: listed keys by rank; unlisted keys after the listed key that
    # preceded them in the current order.
    placed, last_rank = [], -1
    for i, g in enumerate(rest):
        r = rank.get(g[0])
        if r is None:
            r = last_rank + 0.5
        else:
            last_rank = r
        placed.append((r, i, g))
    placed.sort(key=lambda t: (t[0], t[1]))
    out = [g[1] for _, _, g in placed]
    if tools:
        band = ('\n<!--EB_TOOLS_BAND--><section id="eb-tools-band" style="background:#f7fafc;'
                'border-top:1px solid #e4ebf0;padding:10px 0 18px;"><div style="max-width:1000px;margin:0 auto;padding:0 20px;">'
                '<h2 style="font-size:18px;margin:18px 0 4px;">Weitere Rechner und Werkzeuge</h2>'
                + "\n".join(g[1].strip() for g in tools) + '</div></section><!--/EB_TOOLS_BAND-->')
        tpos = rank.get("TOOLS_BAND", base)
        # insert band at its rank among the placed units
        idx = sum(1 for r, _, _ in placed if r < tpos)
        out.insert(idx, band)
    return out, [g[2] for _, _, g in placed]


def unwrap_band(region):
    """Take a previous run's tools band apart again so its units are re-keyed."""
    m = re.search(r"\n?<!--EB_TOOLS_BAND--><section[^>]*><div[^>]*>\s*<h2[^>]*>.*?</h2>(.*)</div></section><!--/EB_TOOLS_BAND-->",
                  region, re.S)
    if not m:
        return region
    return region[:m.start()] + m.group(1) + region[m.end():]


# Tool links that other injectors nest inside other blocks: the household link
# sits inside the sizing-table block (before its first <h2>), the electricity
# workbench inside the hero. Both injectors replace in place once their marker
# exists, so after one move they stay in the band.
NESTED_TOOLS = ("EB_HOUSEHOLD_LINK", "EB_ENERGY_WORKBENCH")


def pull_nested(html):
    found = []
    for name in NESTED_TOOLS:
        # Newlines on both sides go with the block: the household injector
        # writes its block with a trailing "\n", and leaving that behind would
        # add one blank line above the footer on every build.
        m = re.search(r"\n*<!--" + name + r"-->.*?<!--/" + name + r"-->\n*", html, re.S)
        if m:
            found.append([name, m.group(0).strip()])
            html = html[:m.start()] + html[m.end():]
    return html, found


def compose(html, season):
    html, nested = pull_nested(html)
    body = html.index("<body")
    hero_end = html.index("</header>", body) + len("</header>")
    foot = html.index(FOOTER, hero_end)
    region = unwrap_band(html[hero_end:foot])
    units, rest = split_units(region)
    out, _ = order_units(units + nested, season)
    if not rest.strip():
        rest = "\n\n"
    result = html[:hero_end] + "".join(out) + rest + html[foot:]
    # The promoted block is extracted on every build. Normalize its boundary
    # so adjacent units cannot donate a newline only on the first ordering.
    return re.sub(r'\n*(<!--EB_HOUSEHOLD_LINK-->.*?<!--/EB_HOUSEHOLD_LINK-->)\n*',
                  lambda m: '\n'+m.group(1)+'\n', result, flags=re.S)


def main():
    month = int(os.environ.get("EB_SEASON_MONTH") or datetime.date.today().month)
    if "--month" in sys.argv:
        month = int(sys.argv[sys.argv.index("--month") + 1])
    season = season_of(month)
    html = open(INDEX, encoding="utf-8").read()
    new = compose(html, season)
    again = compose(new, season)
    if again != new:
        print("FAIL build_home_order: second run differs — ordering is not idempotent")
        return 1
    if "--check" in sys.argv:
        print("check only:", "changes" if new != html else "no change")
        return 0
    if new != html:
        open(INDEX, "w", encoding="utf-8").write(new)
    units, _ = split_units(unwrap_band(new[new.index("</header>", new.index("<body")) + 9:new.index(FOOTER)]))
    print(f"build_home_order: season {season}; " + " → ".join(k for k, _ in units))
    return 0


if __name__ == "__main__":
    sys.exit(main())
