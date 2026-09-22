#!/usr/bin/env python3
"""Fill the tools hub (/tools.html) from the filesystem, not from memory.

Why (2026-09-22 tools audit): the hub was a hand-written list. Other sessions had
added at least nine tool pages (household tools, the DE/EN/ES/FR/IT decision
calculators, four winter guides with dew-point calculators, ...) that never made it
onto it, and the hub is the only tool entry in the site nav. A tool nobody can
reach and a tool nobody wants read the same in D1.

What counts as a tool page (detection on the *authored* HTML, EB_ blocks stripped,
so injected components like the room sizer never make a guide "a tool"):
  - at least one <input type="number"|"range">, or
  - quiz buttons carrying data-v (the heat checks), or
  - two or more <select> plus an aria-live result region (the balcony site check), or
  - a slug in EXTRA (live-data tools with no inputs, e.g. the price radar).
Excluded: noindex pages, /widgets/ embeds, index pages, the hub itself.

Output: the <!--EB_TOOLS_INDEX--> block in site/tools.html — one section per family,
families ordered by the current season (heating and humidity first from September
to February), cards sorted by title so the output is byte-stable. Card text comes
from each page's own <h1> and meta description, so nothing here is written twice.
tools/check_tools_hub.py asserts hub == filesystem after every build.
"""
import datetime, html, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, "site")
HUB = os.path.join(SITE, "tools.html")
OPEN, CLOSE = "<!--EB_TOOLS_INDEX-->", "<!--/EB_TOOLS_INDEX-->"
EB_RE = re.compile(r"<!--(EB_[A-Z_]+)-->.*?<!--/\1-->", re.S)
NOINDEX_RE = re.compile(r'<meta[^>]+name="robots"[^>]+noindex', re.I)
EXTRA = {"/guide/strompreis-radar.html"}          # live data, no inputs
SKIP_PREFIX = ("/widgets/", "/workbench", "/member")

FAMILIES = [
    # key, heading, emoji, slug regex
    ("feuchte", "💧 Feuchte, Schimmel & Lüften", "💧", r"taupunkt|lueft|feucht|schimmel|dehumid|airer|mould|condens|desiccant|wasser|keller|damp"),
    ("heizen", "🔥 Heizen", "🔥", r"heiz|infrarot|watt|stromausfall|heater"),
    ("strom", "⚡ Stromkosten & Haushalt", "⚡", r"strom|energie|kosten|geraete|messprot|waesche|trockner|austausch"),
    ("solar", "☀️ Balkon-Solar & Speicher", "☀️", r"balkon|speicher|solar|standort|bkw|kraftwerk"),
    ("kuehlen", "❄️ Kühlen & Hitze", "❄️", r"btu|klima|hitze|heat|cool|fenster|panel|abdicht"),
    ("laender", "🌍 Länder-Vergleichsrechner (DE · EN · ES · FR · IT)", "🌍", r"^/(rechner\.html|en/solution-calculator\.html|es/calculadora\.html|fr/calculateur\.html|it/calcolatore\.html)$"),
    ("pro", "🧰 Pro-Werkzeuge & Agenten", "🧰", r"pro-werkzeuge|/agents/"),
    ("english", "🇬🇧 English tools", "🇬🇧", r"^/en/"),
]
SEASON_ORDER = {
    "herbst":    ["feuchte", "heizen", "strom", "solar", "kuehlen", "laender", "pro", "english"],
    "winter":    ["heizen", "feuchte", "strom", "solar", "kuehlen", "laender", "pro", "english"],
    "fruehjahr": ["solar", "feuchte", "kuehlen", "strom", "heizen", "laender", "pro", "english"],
    "sommer":    ["kuehlen", "strom", "solar", "feuchte", "heizen", "laender", "pro", "english"],
}


def season_of(month):
    if month in (6, 7, 8):
        return "sommer"
    if month in (9, 10):
        return "herbst"
    if month in (11, 12, 1, 2):
        return "winter"
    return "fruehjahr"


def text_of(fragment):
    return html.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", fragment))).strip()


def card_summary(desc, limit=140):
    d = text_of(desc)
    if len(d) <= limit:
        return d
    cut = d[:limit].rsplit(" ", 1)[0].rstrip(" ,;:-–—")
    return cut + " …"


def is_tool(url, authored):
    if url in EXTRA:
        return True
    if re.search(r'<input[^>]+type="(number|range)"', authored):
        return True
    if re.search(r'<button[^>]+data-v=', authored):
        return True
    if len(re.findall(r"<select\b", authored)) >= 2 and re.search(r'aria-live|role="status"|id="(res|verdict)"|id="[^"]*(ergebnis|result)[^"]*"', authored):
        return True
    return False


def discover():
    """Return {url: {"title", "blurb", "family"}} for every tool page on disk."""
    tools = {}
    for dirpath, _dirs, files in os.walk(SITE):
        for fn in sorted(files):
            if not fn.endswith(".html"):
                continue
            path = os.path.join(dirpath, fn)
            url = "/" + os.path.relpath(path, SITE).replace(os.sep, "/")
            if url.endswith("/index.html") or url == "/index.html" or url == "/tools.html" or url == "/404.html":
                continue
            if url.startswith(SKIP_PREFIX):
                continue
            h = open(path, encoding="utf-8").read()
            if NOINDEX_RE.search(h):
                continue
            authored = EB_RE.sub("", h)
            if not is_tool(url, authored):
                continue
            h1 = re.search(r"<h1[^>]*>(.*?)</h1>", authored, re.S)
            title = text_of(h1.group(1)) if h1 else text_of(re.search(r"<title>(.*?)</title>", h, re.S).group(1)).split("|")[0].strip()
            desc = re.search(r'<meta\s+name="description"\s+content="([^"]*)"', h)
            blurb = card_summary(desc.group(1)) if desc else ""
            tools[url] = {"title": title, "blurb": blurb, "family": family_of(url)}
    return tools


def family_of(url):
    slug = url.lower()
    # explicit groups first: the country calculators, the pro toolbox, then any English page
    for key, _h, _e, rx in FAMILIES:
        if key in ("laender", "pro") and re.search(rx, slug):
            return key
    if slug.startswith("/en/"):
        return "english"
    for key, _h, _e, rx in FAMILIES:
        if key in ("laender", "pro", "english"):
            continue
        if re.search(rx, slug):
            return key
    return "strom"


def render(tools, month=None):
    month = month or datetime.date.today().month
    order = SEASON_ORDER[season_of(month)]
    meta = {k: (h, e) for k, h, e, _ in FAMILIES}
    out = [OPEN]
    for key in order:
        items = sorted(((v["title"], u, v) for u, v in tools.items() if v["family"] == key), key=lambda x: (x[0].lower(), x[1]))
        if not items:
            continue
        heading, emoji = meta[key]
        out.append(f"  <h2>{heading}</h2>\n  <div class=\"tgrid\">")
        for title, url, v in items:
            out.append(f'    <a class="tcard" href="{url}"><span class="em">{emoji}</span><strong>{html.escape(title, quote=False)}</strong>'
                       f'<span>{html.escape(v["blurb"], quote=False)}</span></a>')
        out.append("  </div>")
    out.append(f'  <p style="margin-top:18px;font-size:13px;color:#7a8b98;">{len(tools)} Tools, automatisch aus den Seiten selbst gelistet — fehlt hier eines, ist das ein Fehler, kein Feature.</p>')
    out.append(CLOSE)
    return "\n".join(out)


def main():
    if not os.path.exists(HUB):
        sys.exit("build_tools_hub: site/tools.html missing")
    hub = open(HUB, encoding="utf-8").read()
    if OPEN not in hub or CLOSE not in hub:
        sys.exit("build_tools_hub: marker block missing in tools.html")
    tools = discover()
    block = render(tools)
    new = hub[: hub.index(OPEN)] + block + hub[hub.index(CLOSE) + len(CLOSE):]
    if new != hub:
        open(HUB, "w", encoding="utf-8").write(new)
    fam = {}
    for v in tools.values():
        fam[v["family"]] = fam.get(v["family"], 0) + 1
    print(f"tools hub: {len(tools)} tool pages listed ({', '.join(f'{k} {n}' for k, n in sorted(fam.items()))}); {'rewritten' if new != hub else 'unchanged'}")


if __name__ == "__main__":
    main()
