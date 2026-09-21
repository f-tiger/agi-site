#!/usr/bin/env python3
"""Generate site/llms.txt + site/llms-full.txt (llmstxt.org format).

AI 搜索层：给 ChatGPT/Perplexity/Claude 等一个免渲染、可直接解析的站点索引
（llms.txt）与全文层（llms-full.txt — 每页正文纯文本，LLM 一次抓取可读全站，
是被 AI 引擎引用的最大可提取面）。幂等，随构建同步。
"""
import os, re, html, datetime, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_season import season_of

ROOT = os.path.join(os.path.dirname(__file__), "..", "site")
BASE = "https://getecoback.com"


def body_text(path):
    """Extract readable article text: strip scripts/styles/injected chrome, keep
    heading structure as markdown-ish lines. Deterministic → idempotent output."""
    s = open(path, encoding="utf-8").read()
    m = re.search(r"<article[^>]*>(.*?)</article>", s, re.S)
    body = m.group(1) if m else re.search(r"<body[^>]*>(.*)</body>", s, re.S).group(1)
    # drop injected/interactive layers wholesale — index the editorial content only
    for pat in (r"<!--EB_MODELS-->.*?<!--/EB_MODELS-->", r"<!--EB_EXPLAINER-->.*?<!--/EB_EXPLAINER-->",
                r"<!--EB_VIDEO-->.*?<!--/EB_VIDEO-->", r"<!--EB_RADAR-->.*?<!--/EB_RADAR-->",
                r"<!--EB_TOC-->.*?<!--/EB_TOC-->", r"<!--EB_STICKY-->.*?<!--/EB_STICKY-->",
                r"<script\b.*?</script>", r"<style\b.*?</style>", r"<form\b.*?</form>"):
        body = re.sub(pat, " ", body, flags=re.S)
    body = re.sub(r"<h2[^>]*>(.*?)</h2>", lambda m: "\n\n## " + m.group(1) + "\n", body, flags=re.S)
    body = re.sub(r"<h3[^>]*>(.*?)</h3>", lambda m: "\n\n### " + m.group(1) + "\n", body, flags=re.S)
    body = re.sub(r"<li[^>]*>", "\n- ", body)
    body = re.sub(r"</(p|div|tr|table|ul|ol|section|blockquote)>", "\n", body)
    body = re.sub(r"</t[dh]>", " | ", body)
    body = re.sub(r"<[^>]+>", "", body)
    body = html.unescape(body)
    body = re.sub(r"[ \t]+", " ", body)
    body = re.sub(r" ?\n ?", "\n", body)
    body = re.sub(r"\n{3,}", "\n\n", body)
    return body.strip()


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
        "> Heizkosten) und Stromkosten. Rechner für BTU, Entfeuchtungsleistung, Heizleistung und",
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
        f"- [Alle Rechner & Checks (Tool-Übersicht)]({BASE}/tools.html): BTU-Rechner, Hitze-Check, Stromkosten-, Heizkosten- und Balkonkraftwerk-Rechner, Taupunkt- und Standort-Check.",
        f"- [Kostenlose Rechner-Widgets zum Einbinden]({BASE}/widgets.html): Stromkosten-, BTU- und Taupunkt-Rechner als kostenloses iframe-Widget für fremde Websites — ohne Registrierung, mit eigener Akzentfarbe und eigenem Ergebnis-Button; einzige Bedingung ist der Quellenlink.",
        "",
        "## Für KI-Agenten (MCP & offene APIs)",
        "",
        f"- MCP-Server (Model Context Protocol, Streamable HTTP, keine Authentifizierung): {BASE}/mcp",
        "  Tools: geraet_wahl (welches Gerät löst mein Problem), btu_empfehlung, fensterabdichtung_laenge, hitzewelle_vorschau, klimaanlage_stromkosten, heizleistung_watt,",
        "  taupunkt_lueften, balkonspeicher_foerderung sowie ratgeber_suche + ratgeber_lesen (Volltextsuche und Volltext-Abruf aller Ratgeber).",
        "  Formeln identisch mit den Rechnern dieser Website; jede Antwort enthält Quell-URL und Affiliate-Disclosure.",
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
        f"- Original-Datensatz (CC BY 4.0): {BASE}/sizing-data.json — BTU-/Liter-/Watt-Größenleitern"
        " nach Raumgröße, identisch mit Rechnern und Ratgebern, mit dateModified.",
        f"- Überblick aller Maschinen-Schnittstellen: {BASE}/for-agents.html",
        "",
    ]
    de = pages("guide")
    en = pages("en/guide")
    it = pages("it/guide")
    fr = pages("fr")
    es = pages("es")
    kat = pages("kategorie")
    lines.append("## Ratgeber (Deutsch)")
    lines.append("")
    for url, t, d in de:
        lines.append(f"- [{t}]({url}): {d}")
    lines += ["", "## Guides (English)", ""]
    for url, t, d in en:
        lines.append(f"- [{t}]({url}): {d}")
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
    lines += ["## Haushaltswerkstatt", ""]
    for slug, (title, desc) in PAGES.items():
        lines.append(f"- [{title}]({BASE}/{slug}.html): {desc}")
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
    for subdir in ("guide", "en/guide", "fr", "es", "it/guide"):
        for url, t, d in pages(subdir):
            fn = os.path.join(ROOT, subdir, url.rsplit("/", 1)[1])
            txt = body_text(fn)
            if not txt:
                continue
            full += [f"## {t}", f"URL: {url}", "", txt, "", "---", ""]
            n += 1
    open(os.path.join(ROOT, "llms-full.txt"), "w", encoding="utf-8").write("\n".join(full))
    size = os.path.getsize(os.path.join(ROOT, "llms-full.txt"))
    print(f"llms-full.txt: {n} pages, {size//1024} KB")


if __name__ == "__main__":
    main()
