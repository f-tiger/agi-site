#!/usr/bin/env python3
"""Compose the homepage around a task, then its seasonal buying guidance.

Independent injectors own all content. This final pass only moves their whole
blocks and folds secondary directories into native, keyboard-operable details.
The household tasks and existing-device upkeep precede merchant shelves;
summer keeps cooling prominent. No links or unknown future modules are removed.

Some injectors originally appended discovery blocks after the footer. Extract
only those named blocks, leaving account, consent and analytics scripts in place.
Every wrapper is reversible before the next composition, including a season
change, so generators can continue replacing their original markers in place.

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
    "EB_HOMETOOL", "EB_HOUSEHOLD_LINK", "EB_HOME_UPKEEP", "EB_SEASON",
    "EB_TOPPICK", "EB_DEVICE_TILES", "deals", "disclosure", "EB_HOME_COOLING_GUIDES",
    "EB_HOME_DECISIONS", "EB_HOME_REFERENCE", "EB_HOME_COLD",
    "EB_HOME_READING", "how", "faq", "EB_HOME_COUNTRIES", "EB_TOOLS_BAND",
]
COLD = [
    "EB_HOUSEHOLD_LINK", "EB_HOME_UPKEEP", "EB_SEASON", "EB_WINTER_LINK",
    "EB_TOPPICK", "EB_HERBST", "EB_DEVICE_TILES", "EB_HOME_DECISIONS", "EB_HOME_REFERENCE",
    "EB_HOME_COOLING", "EB_HOME_READING", "how", "faq", "EB_HOME_COUNTRIES", "EB_TOOLS_BAND",
]
# season_of emits ASCII; preserve the spelling used by existing callers too.
ORDER = {"sommer": WARM, "fruehjahr": WARM, "frühjahr": WARM, "herbst": COLD, "winter": COLD}
# Units that belong to other topics' tools; they go into one band above the footer.
TOOLS = ("EB_ENERGY_WORKBENCH", "eu-evidence", "task-workbench")
WB_OPEN, WB_CLOSE = "<!-- task-workbench:start -->", "<!-- task-workbench:end -->"

# These are whole modules, never page scripts or the footer. Only these known
# late-injected markers may be recovered from the footer's tail.
DISCOVERY = ("EB_PRODUCT_DISCOVERY", "EB_FIT_DISCOVERY", "EB_UPKEEP_DISCOVERY",
             "EB_AUTO_DISCOVERY", "EB_FAMILY_DISCOVERY")
COMMON_DETAILS = (
    ("EB_HOME_UPKEEP", "home-upkeep", "Vorhandenes Gerät pflegen oder reparieren",
     ("EB_UPKEEP_DISCOVERY",)),
    ("EB_HOME_DECISIONS", "home-decisions", "Weitere Entscheidungen: Gerätewahl, Folgekosten und Werkstatt",
     ("EB_FIT_DISCOVERY", "EB_PRODUCT_DISCOVERY", "EB_AUTO_DISCOVERY", "EB_FAMILY_QUICK", "EB_FAMILY_DISCOVERY")),
    ("EB_HOME_REFERENCE", "home-reference", "Raumgröße und Gerätearten nachschlagen",
     ("EB_HOMETABLE", "shop-categories")),
    ("EB_HOME_READING", "home-reading", "Ratgeber entdecken: neue Beiträge, häufig gelesen und Videos",
     ("EB_NEWEST", "EB_POPULAR", "EB_POPLIVE", "EB_RISING_RAIL", "EB_SEASON_VIDEO")),
    ("EB_HOME_COUNTRIES", "home-countries", "Wohnen in anderen Ländern: lokale Ratgeber",
     ("EB_COUNTRIES", "EB_UK_PATH", "EB_AU_COOLING")),
    ("EB_TOOLS_BAND", "eb-tools-band", "Weitere Rechner und Werkzeuge", TOOLS),
)
COLD_DETAILS = (
    ("EB_HOME_COOLING", "home-cooling", "Kühlung für warme Tage planen: Rechner und Gerätevergleich",
     ("EB_HOMETOOL", "deals", "disclosure", "situationen", "guide")),
)
WARM_DETAILS = (
    ("EB_HOME_COOLING_GUIDES", "home-cooling-guides", "Kühlung vertiefen: Wohnsituationen und Ratgeber",
     ("situationen", "guide")),
    ("EB_HOME_COLD", "home-cold", "Feuchtigkeit und Heizkosten prüfen",
     ("EB_WINTER_LINK", "EB_HERBST")),
)
DETAIL_MARKERS = tuple(g[0] for g in COMMON_DETAILS + COLD_DETAILS + WARM_DETAILS)


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
    detail_specs = COMMON_DETAILS + (WARM_DETAILS if want is WARM else COLD_DETAILS)
    known = set(want) | {k for spec in detail_specs for k in spec[3]}
    # Keep an unrecognised future module with its predecessor, including modules
    # with their own ids. A new injector must not disappear into a catch-all.
    groups, cur = [], None
    for key, content in units:
        if key not in known and cur is not None:
            cur[1] += "\n" + content.strip()
            cur[2].append(key)
        else:
            cur = [key, content.strip(), [key]]
            groups.append(cur)

    # Fold existing modules instead of adding another competing task board.
    # The original marker/content pairs remain intact for their own injectors.
    for marker, section_id, label, members in detail_specs:
        selected = [g for key in members for g in groups if g[0] == key]
        if not selected:
            continue
        groups = [g for g in groups if g[0] not in members]
        content = "\n".join(g[1] for g in selected)
        wrapper = (f'<!--{marker}--><details id="{section_id}" class="home-editorial-details" '
                   'style="max-width:1000px;box-sizing:border-box;margin:18px auto;'
                   'padding:16px 20px;border:1px solid #dbe6ef;border-radius:12px;background:#f7fafc;">'
                   '<summary style="cursor:pointer;color:#174b75;font-weight:700;line-height:1.5;">'
                   f'{label}</summary>\n{content}\n</details><!--/{marker}-->')
        groups.append([marker, wrapper, [k for g in selected for k in g[2]]])

    rank = {k: i for i, k in enumerate(want)}
    # Stable ordering also preserves a leading unknown module, if one exists.
    placed, last_rank = [], -1
    for i, g in enumerate(groups):
        r = rank.get(g[0])
        if r is None:
            r = last_rank + 0.5
        else:
            last_rank = r
        placed.append((r, i, g))
    placed.sort(key=lambda t: (t[0], t[1]))
    out = ["\n" + g[1] + "\n" for _, _, g in placed]
    return out, [g[2] for _, _, g in placed]


def unwrap_band(region):
    """Undo our wrappers before re-keying, including the previous tools band."""
    for marker in DETAIL_MARKERS:
        region = re.sub(
            r'<!--' + marker + r'--><details\b[^>]*><summary\b[^>]*>.*?</summary>\s*(.*?)\s*</details><!--/' + marker + r'-->',
            lambda m: "\n" + m.group(1) + "\n", region, flags=re.S)
    m = re.search(r"\n?<!--EB_TOOLS_BAND--><section[^>]*><div[^>]*>\s*<h2[^>]*>.*?</h2>(.*)</div></section><!--/EB_TOOLS_BAND-->",
                  region, re.S)
    if not m:
        return region
    return region[:m.start()] + m.group(1) + region[m.end():]


# Existing injectors nest the household link in the sizing table and the energy
# workbench in the hero. The hero's family-workshop shortcuts and merchant chips
# also need their proper editorial position, after the household task entry.
# Extract complete marker pairs; no hand-written or future hero text is changed.
NESTED_BLOCKS = ("EB_HOUSEHOLD_LINK", "EB_ENERGY_WORKBENCH", "EB_FAMILY_QUICK", "EB_TOPPICK")


def pull_nested(html):
    found = []
    for name in NESTED_BLOCKS:
        # Newlines on both sides go with the block: the household injector
        # writes its block with a trailing "\n", and leaving that behind would
        # add one blank line above the footer on every build.
        m = re.search(r"\n*<!--" + name + r"-->.*?<!--/" + name + r"-->\n*", html, re.S)
        if m:
            found.append([name, m.group(0).strip()])
            html = html[:m.start()] + html[m.end():]
    return html, found


def compose(html, season):
    for name in DISCOVERY:
        if html.count("<!--" + name + "-->") > 1:
            raise ValueError(f"duplicate homepage discovery marker: {name}")
    html, nested = pull_nested(html)
    body = html.index("<body")
    hero_end = html.index("</header>", body) + len("</header>")
    foot = html.index(FOOTER, hero_end)
    # Do not parse the tail as page units: that would attach consent stylesheet
    # and account/analytics scripts to the following discovery block.
    tail, recovered = html[foot:], []
    for name in DISCOVERY:
        pattern = r'\n*<!--' + name + r'-->.*?<!--/' + name + r'-->\n*'
        matches = list(re.finditer(pattern, tail, re.S))
        if len(matches) > 1:
            raise ValueError(f"duplicate homepage discovery marker: {name}")
        if matches:
            recovered.append([name, matches[0].group(0).strip()])
            tail = tail[:matches[0].start()] + "\n" + tail[matches[0].end():]
    region = unwrap_band(html[hero_end:foot])
    units, rest = split_units(region)
    present = {key for key, _ in units}
    if any(key in present for key, _ in recovered):
        raise ValueError("homepage discovery marker exists before and after footer")
    out, _ = order_units(units + nested + recovered, season)
    if not rest.strip():
        rest = "\n\n"
    result = html[:hero_end] + "".join(out) + rest + tail
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
