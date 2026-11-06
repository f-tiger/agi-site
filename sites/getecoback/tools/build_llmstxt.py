#!/usr/bin/env python3
"""Generate site/llms.txt + site/llms-full.txt (llmstxt.org format).

AI 搜索层：给 ChatGPT/Perplexity/Claude 等一个免渲染、可直接解析的站点索引
（llms.txt）与全文层（llms-full.txt — 每页正文纯文本，LLM 一次抓取可读全站，
是被 AI 引擎引用的最大可提取面）。幂等，随构建同步。
"""
import os, re, html, datetime, sys, json
from pathlib import Path
from urllib.parse import urljoin

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_season import season_of
from build_agent_md import to_markdown, DISCLOSURE

ROOT = os.path.join(os.path.dirname(__file__), "..", "site")
BASE = "https://getecoback.com"


ENERGY_PATHS = {row['path'] for row in json.loads(
    (Path(__file__).resolve().parents[1] / 'data/energy-workbench.json').read_text()).values()}
NOINDEX = re.compile(r'<meta\b[^>]*name=["\']robots["\'][^>]*content=["\'][^"\']*noindex', re.I)
URL_RE = re.compile(r'https?://[^\s<>\])]+')


def assert_no_commerce(text, route):
    if re.search(r'https?://[^\s)]*(?:amazon\.|amzn\.)|tag=getecoback-21|ecoback0d-20', text, re.I):
        raise ValueError(f'{route}: affiliate link in agent text')


def checked_mirror(path, source, route):
    """Dedicated locale/tool generators already emit their own Markdown.

    Reuse it only when its identity, references, dates and prose are supported
    by current HTML. This prevents a stale checkout mirror from silently
    replacing newly generated content; no mtime or deploy-date freshness claim.
    """
    mirror = path.with_suffix('.md')
    if not mirror.is_file():
        raise ValueError(f'{route}: required Markdown mirror is missing; run its page generator first')
    text = mirror.read_text(encoding='utf-8')
    if BASE + route not in text or not text.startswith('# '):
        raise ValueError(f'{route}: mirror identity does not match current HTML')
    assert_no_commerce(text, route)
    urls = {urljoin(BASE + route, html.unescape(href))
            for href in re.findall(r'\bhref=["\']([^"\']+)', source, re.I)}
    urls.add(BASE + route)
    # Dedicated tools render some source lists/checklist explanations from
    # embedded JSON. Validate against that current payload as well, without
    # executing scripts, fetching references or accepting arbitrary JS strings.
    configured = []
    def collect(value):
        if isinstance(value, str):
            configured.append(value)
            if value.startswith(('https://', 'http://')):
                urls.add(value)
        elif isinstance(value, list):
            for item in value:
                collect(item)
        elif isinstance(value, dict):
            for item in value.values():
                collect(item)
    for payload in re.findall(r'<script\b[^>]*type=["\']application/json["\'][^>]*>(.*?)</script>', source, re.S | re.I):
        collect(json.loads(payload))
    for url in URL_RE.findall(text):
        if html.unescape(url) not in urls:
            raise ValueError(f'{route}: mirror citation absent from current HTML: {url}')
    def normalize(value):
        return re.sub(r'[^\w]+', '', html.unescape(value)).casefold()
    visible = re.sub(r'<(?:script|style)\b[^>]*>.*?</(?:script|style)>', '', source, flags=re.S | re.I)
    metadata = ' '.join(re.findall(r'<meta\b[^>]*content=["\']([^"\']+)', source, re.I))
    visible = normalize(re.sub(r'<[^>]+>', ' ', visible) + metadata + ' '.join(configured))
    for line in text.splitlines():
        if not line.strip() or line.startswith(('<!--', 'Canonical')):
            continue
        # Bare URL/list labels identify links; their destinations were checked
        # above. Linked prose and all ordinary sentences still need a match.
        if URL_RE.search(line) and '](' not in line:
            continue
        plain = re.sub(r'\[([^\]]+)\]\([^)]*\)', r'\1', line)
        fragment = normalize(plain)
        if fragment and fragment not in visible:
            raise ValueError(f'{route}: stale mirror text absent from current HTML: {plain[:100]}')
    return text


def body_text(path):
    """Use the same cited, commerce-free document as the per-page agent view."""
    path = Path(path)
    source = path.read_text(encoding='utf-8')
    if NOINDEX.search(source):
        return ''
    relative = path.resolve().relative_to(Path(ROOT).resolve()).as_posix()
    route = '/' + relative
    if relative in ENERGY_PATHS or relative.startswith(('fr/', 'es/', 'zh/agents/', 'en/agents/')):
        return checked_mirror(path, source, route)
    language = re.search(r'<html\b[^>]*lang=["\']([^"\']+)', source, re.I)
    lang = language.group(1) if language else ''
    # These English sections already use the English disclosure in the
    # per-page builder. Retain their country-specific text and canonical URL.
    lang = {'en-GB': 'en', 'en-US': 'en'}.get(lang, lang)
    if lang not in DISCLOSURE:
        raise ValueError(f'{route}: unsupported agent language {lang!r}; do not invent a translation')
    result = to_markdown(source, route, lang)
    assert_no_commerce(result, route)
    return result


def meta(path):
    s = open(path, encoding="utf-8").read()
    t = re.search(r"<title>(.*?)</title>", s, re.S)
    d = re.search(r'name="description" content="([^"]*)"', s)
    return (html.unescape(t.group(1)).strip() if t else "",
            html.unescape(d.group(1)).strip() if d else "")


def pages(subdir):
    out = []
    d = os.path.join(ROOT, subdir)
    if not os.path.isdir(d):
        return out
    for fn in sorted(os.listdir(d)):
        if fn.endswith(".html"):
            if NOINDEX.search(Path(d, fn).read_text(encoding='utf-8')):
                continue
            t, desc = meta(os.path.join(d, fn))
            out.append((f"{BASE}/{subdir}/{fn}", t, desc))
    return out


# The blockquote is the one paragraph an assistant reads to decide what this
# site is for, and it described a cooling-only site all year — while the
# homepage, nav and footer have rotated through the seasons since 2026-08.
# Heading into autumn that meant the AI-citation channel (chatgpt/perplexity/
# copilot, ~9 % of arrivals and the one channel that spreads without anyone
# forwarding a link) was told this site answers heatwave questions, at the exact
# moment the demand moves to Schimmel, Luftentfeuchter and Heizen — all of which
# this site already covers in depth. Season comes from build_season.season_of so
# there is one definition of "which season is it", not two that drift apart.
SEASON_FOCUS = {
    "sommer": "Schwerpunkt in dieser Jahreszeit: Hitzewelle, mobile Klimaanlagen, Fensterabdichtung, Luftkühler.",
    "herbst": "Schwerpunkt in dieser Jahreszeit: Feuchte und Schimmel, Luftentfeuchter nach Raumgröße, Klimagerät einlagern, Heiz-Check vor dem Winter.",
    "winter": "Schwerpunkt in dieser Jahreszeit: Heizkosten, Infrarotheizung, stromsparende Heizlüfter, Schimmel durch Kondens an kalten Wänden.",
    "fruehjahr": "Schwerpunkt in dieser Jahreszeit: Luftreiniger gegen Pollen, Hitzeschutz am Fenster, Kühlung planen vor der ersten Hitzewelle.",
}


def main():
    season = season_of(datetime.date.today().month)
    lines = [
        "# EcoBack — Kühlen, Heizen & Energie sparen",
        "",
        "> Unabhängiger deutschsprachiger Ratgeber (mit englischem Bereich) rund ums Raumklima",
        "> in Wohnungen ohne feste Installation — das ganze Jahr: Kühlen (tragbare Klimaanlagen,",
        "> Fensterabdichtung für Kippfenster/Dachfenster, Luftkühler, Ventilatoren), Luftqualität",
        "> (Luftentfeuchter, Schimmel, Taupunkt, Luftreiniger), Heizen (Infrarotheizung, Heizlüfter,",
        "> Heizkosten) und Stromkosten. Feuchte-Entscheidungshilfen und Rechner für BTU, Heizleistung und",
        "> Taupunkt mit offengelegten Formeln. Finanziert über Amazon-Affiliate-Links;",
        "> Empfehlungen fassen öffentliche Tests zusammen (kein eigenes Labor).",
        "",
        f"{SEASON_FOCUS[season]}",
        "",
        "Sprachen: Deutsch (/guide/), Englisch (/en/guide/), Französisch (/fr/), Spanisch (/es/), Italienisch (/it/guide/).",
        f"Volltext aller Ratgeber: {BASE}/llms-full.txt",
        "",
        "## Interaktive Tools & Widgets",
        "",
        f"- [Alle Rechner & Checks (Tool-Übersicht)]({BASE}/tools.html): BTU-Rechner, Hitze-Check, Stromkosten- und Heizkostenvergleich, Taupunkt- und Wäsche-Checks.",
        f"- [Kostenlose Rechner-Widgets zum Einbinden]({BASE}/widgets.html): Stromkosten-, BTU- und Taupunkt-Rechner als kostenloses iframe-Widget für fremde Websites — ohne Registrierung, mit eigener Akzentfarbe und eigenem Ergebnis-Button; einzige Bedingung ist der Quellenlink.",
        "",
        "## Für KI-Agenten (MCP & offene APIs)",
        "",
        f"- MCP-Server (Model Context Protocol, Streamable HTTP, keine Authentifizierung): {BASE}/mcp",
        "  Neun Tools: geraet_wahl (nächster Schritt; bei Feuchte erst messen, Ursachen klären und Bedingungen prüfen), btu_empfehlung, fensterabdichtung_laenge, hitzewelle_vorschau, klimaanlage_stromkosten, heizleistung_watt,",
        "  taupunkt_lueften sowie ratgeber_suche + ratgeber_lesen (Volltextsuche und Volltext-Abruf aller Ratgeber).",
        "  Veröffentlichte Formeln und Entscheidungsregeln mit Annahmen und Grenzen; Antworten enthalten Quell-URLs und Finanzierungshinweis.",
        "  geraet_wahl: problem=feucht_schimmel; optionale Kategorien purpose=room|laundry|damage, humidity=unknown|normal|high, temperature=unknown|warm|cold. Fehlende Messangaben führen zuerst zum Messen, nicht zur Liter-Empfehlung.",
        f"  Entscheidungshilfe im Browser: {BASE}/guide/luftentfeuchter-ratgeber.html#eb-moisture-choice — MCP-Argumente werden dagegen auf dem Server verarbeitet.",
        "  Offizielles MCP Registry: io.github.f-tiger/hvac-btu-heat-klimaanlage (dort suchbar unter btu, hvac, heat, klima).",
        f"  Doku & Client-Konfiguration: {BASE}/mcp.html — Discovery: {BASE}/.well-known/mcp.json",
        "- Markdown statt HTML: Jeder Ratgeber hat einen direkt verlinkbaren Markdown-Zwilling unter",
        "  derselben URL mit .md statt .html (z. B. /guide/btu-rechner.md) — Navigation, Shop-Karten und",
        "  Skripte entfernt, interne Links erhalten, gedacht zum Zitieren. Zusätzlich liefert jede Seite",
        "  dasselbe Markdown per Content Negotiation, wenn der Request `Accept: text/markdown` sendet",
        "  (`Vary: Accept`).",
        f"  Beispiel: curl -H 'Accept: text/markdown' {BASE}/guide/btu-rechner.html",
        f"- Offene Aggregat-APIs (JSON, keine personenbezogenen Daten): {BASE}/api/heat (Live-Hitze- und Frostvorschau DE: 3-Tage-Maximum und 7-Tage-Minimum, beides mit Warnstufen), "
        f"{BASE}/api/feuchte (aktueller Taupunkt DE, ungünstigster von drei Orten, stündlich, mit Lüftungsurteil gegen kalte Wand ~15 °C und Kellerwand ~13 °C; ok:false = keine Messung, nie geraten), "
        f"{BASE}/api/strom (heutige Börsen-Stundenpreise DE, EPEX über aWATTar/SMARD), "
        f"{BASE}/api/top (meistgelesene Ratgeber), {BASE}/api/trend (Wochentrends), "
        f"{BASE}/search-index.json (Titel + Beschreibung + Sprache aller Seiten, ein Array).",
        f"- Original-Datensatz (CC BY 4.0): {BASE}/sizing-data.json — BTU-/Watt-Faustregeln"
        " mit Annahmen und dateModified. Keine Entfeuchter-Literzahl aus Fläche allein; wiederholt über 60 % RH ist ein Prüfsignal, keine Schimmelsicherheitsgrenze.",
        f"- Überblick aller Maschinen-Schnittstellen: {BASE}/for-agents.html",
        "",
    ]
    de = pages("guide")
    en = pages("en/guide")
    it = pages("it/guide")
    fr = pages("fr")
    es = pages("es")
    kat = pages("kategorie")
    lines += ["## EU product evidence checks / 欧盟产品证据检查", ""]
    for subdir in ("en/agents", "zh/agents"):
        for url, t, d in pages(subdir):
            if "cbam-supplier-data" in url or "eudr-geolocation-evidence" in url:
                lines.append(f"- [{t}]({url}): {d}")
    lines += ["", "These checks prepare local supplier questions. They do not verify evidence or submit official declarations. Paid evidence-service checkout is not available.", ""]
    lines.append("## Ratgeber (Deutsch)")
    lines.append("")
    for url, t, d in de:
        lines.append(f"- [{t}]({url}): {d}")
    lines += ["", "## Guides (English)", ""]
    for url, t, d in en:
        lines.append(f"- [{t}]({url}): {d}")
    finder = os.path.join(ROOT, "en", "filter-finder.html")
    if os.path.isfile(finder):
        title, description = meta(finder)
        lines += ["", "## US air purifier replacement filters", "",
                  f"- [{title}]({BASE}/en/filter-finder.html): {description}",
                  "  Exact US model names and dated manufacturer sources; no inference between model variants."]
    if it:
        lines += ["", "## Guide (Italiano)", ""]
        for url, t, d in it:
            lines.append(f"- [{t}]({url}): {d}")
    if fr:
        lines += ["", "## Calculateur (Français)", ""]
        for url, t, d in fr:
            lines.append(f"- [{t}]({url}): {d}")
    if es:
        lines += ["", "## Calculadora (Español)", ""]
        for url, t, d in es:
            lines.append(f"- [{t}]({url}): {d}")
    for sub, label in (("nl", "Wonen in Nederland"), ("au", "Australian home comfort")):
        lines += ["", "## " + label, ""]
        for url, t, d in pages(sub):
            lines.append(f"- [{t}]({url}): {d}")
    lines += ["", f"- [Wohnen in Deutschland]({BASE}/wohnen.html): Messen, Wäsche und Wärme — lokale Kauf-Checklisten.", ""]
    lines += ["", "## Kategorien", ""]
    for url, t, d in kat:
        lines.append(f"- [{t}]({url}): {d}")
    lines += [
        "",
        "## Über die Website",
        "",
        f"- [Über uns]({BASE}/ueber-uns.html): Wer hinter EcoBack steht und wie wir uns finanzieren.",
        f"- [Wie wir empfehlen]({BASE}/wie-wir-empfehlen.html): Auswahl-Methodik der Produktempfehlungen.",
        f"- [Kontakt]({BASE}/kontakt.html): Kontaktmöglichkeit.",
        "",
    ]
    from build_household import PAGES
    from build_family_workshop import DATA as FAMILY
    lines += ["## Pool, Garten und kleine Reparaturen", ""]
    for t in FAMILY.values():
        lines.append(f"- [{t['title']}]({BASE}/{t['path']}): {t['desc']}")
    lines += ["", "## Haushaltswerkstatt", ""]
    for slug, (title, desc) in PAGES.items():
        lines.append(f"- [{title}]({BASE}/{slug}.html): {desc}")
    lines.append("")
    energy = json.load(open(os.path.join(ROOT, "..", "data", "energy-workbench.json"), encoding="utf-8"))
    lines += ["## European electricity tariff workbench", ""]
    for t in energy.values():
        lines.append(f"- [{t['title']}]({BASE}/{t['path']}): {t['meta']}")
    lines.append("")
    out = os.path.join(ROOT, "llms.txt")
    open(out, "w", encoding="utf-8").write("\n".join(lines))
    print(f"llms.txt: {len(de)} DE + {len(en)} EN + {len(it)} IT guides, {len(kat)} categories")

    # ---- llms-full.txt: full readable text of every guide, one fetch for LLMs ----
    full = ["# EcoBack — Volltext aller Ratgeber (llms-full.txt)",
            "",
            "> Vollständiger Text aller EcoBack-Ratgeber für KI-Assistenten. Quelle und",
            "> zitierfähige URL steht über jedem Abschnitt. Stand: siehe sitemap.xml.",
            ""]
    n = 0
    for subdir in ("guide", "en/guide", "fr", "es", "it/guide", "nl", "au", "en/agents", "zh/agents"):
        for url, t, d in pages(subdir):
            if subdir.endswith("agents") and not any(slug in url for slug in ("cbam-supplier-data", "eudr-geolocation-evidence")):
                continue
            fn = os.path.join(ROOT, subdir, url.rsplit("/", 1)[1])
            txt = body_text(fn)
            if not txt:
                continue
            full += [txt.rstrip(), "", "---", ""]
            n += 1
    for lang in ("de", "en", "it"):
        t = energy[lang]
        full += [body_text(os.path.join(ROOT, t["path"])).rstrip(), "", "---", ""]
        n += 1
    if os.path.isfile(finder):
        title, _ = meta(finder)
        full += [body_text(finder).rstrip(), "", "---", ""]
        n += 1
    open(os.path.join(ROOT, "llms-full.txt"), "w", encoding="utf-8").write("\n".join(full))
    size = os.path.getsize(os.path.join(ROOT, "llms-full.txt"))
    print(f"llms-full.txt: {n} pages, {size//1024} KB")


if __name__ == "__main__":
    main()
