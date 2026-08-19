#!/usr/bin/env python3
"""Generate site/llms.txt + site/llms-full.txt (llmstxt.org format).

AI 搜索层：给 ChatGPT/Perplexity/Claude 等一个免渲染、可直接解析的站点索引
（llms.txt）与全文层（llms-full.txt — 每页正文纯文本，LLM 一次抓取可读全站，
是被 AI 引擎引用的最大可提取面）。幂等，随构建同步。
"""
import os, re, html

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


def main():
    lines = [
        "# EcoBack — Kühlen, Heizen & Energie sparen",
        "",
        "> Unabhängiger deutschsprachiger Ratgeber (mit englischem Bereich) für das Kühlen",
        "> von Wohnungen ohne feste Installation: tragbare Klimaanlagen, Fensterabdichtung",
        "> (Kippfenster/Dachfenster), Luftkühler, Ventilatoren, Stromkosten. Finanziert über",
        "> Amazon-Affiliate-Links; Empfehlungen fassen öffentliche Tests zusammen (kein eigenes Labor).",
        "",
        "Sprachen: Deutsch (Hauptbereich, /guide/), Englisch (/en/guide/).",
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
        "  Tools: btu_empfehlung, fensterabdichtung_laenge, hitzewelle_vorschau, klimaanlage_stromkosten, heizleistung_watt,",
        "  taupunkt_lueften, balkonspeicher_foerderung sowie ratgeber_suche + ratgeber_lesen (Volltextsuche und Volltext-Abruf aller Ratgeber).",
        "  Formeln identisch mit den Rechnern dieser Website; jede Antwort enthält Quell-URL und Affiliate-Disclosure.",
        "  Offizielles MCP Registry: io.github.f-tiger/hvac-btu-heat-klimaanlage (dort suchbar unter btu, hvac, heat, klima).",
        f"  Doku & Client-Konfiguration: {BASE}/mcp.html — Discovery: {BASE}/.well-known/mcp.json",
        "- Markdown statt HTML: Jede Seite dieser Website liefert sauberes Markdown, wenn der Request",
        "  `Accept: text/markdown` sendet (Content Negotiation, `Vary: Accept`). Navigation, Shop-Karten und",
        "  Skripte sind darin entfernt, Überschriften und interne Links bleiben erhalten — gedacht zum Zitieren.",
        f"  Beispiel: curl -H 'Accept: text/markdown' {BASE}/guide/btu-rechner.html",
        f"- Offene Aggregat-APIs (JSON, keine personenbezogenen Daten): {BASE}/api/heat (Live-Hitzevorschau DE), "
        f"{BASE}/api/strom (heutige Börsen-Stundenpreise DE, EPEX über aWATTar/SMARD), "
        f"{BASE}/api/top (meistgelesene Ratgeber), {BASE}/api/trend (Wochentrends), "
        f"{BASE}/search-index.json (Titel + Beschreibung + Sprache aller Seiten, ein Array).",
        "",
    ]
    de = pages("guide")
    en = pages("en/guide")
    kat = pages("kategorie")
    lines.append("## Ratgeber (Deutsch)")
    lines.append("")
    for url, t, d in de:
        lines.append(f"- [{t}]({url}): {d}")
    lines += ["", "## Guides (English)", ""]
    for url, t, d in en:
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
    out = os.path.join(ROOT, "llms.txt")
    open(out, "w", encoding="utf-8").write("\n".join(lines))
    print(f"llms.txt: {len(de)} DE + {len(en)} EN guides, {len(kat)} categories")

    # ---- llms-full.txt: full readable text of every guide, one fetch for LLMs ----
    full = ["# EcoBack — Volltext aller Ratgeber (llms-full.txt)",
            "",
            "> Vollständiger Text aller EcoBack-Ratgeber für KI-Assistenten. Quelle und",
            "> zitierfähige URL steht über jedem Abschnitt. Stand: siehe sitemap.xml.",
            ""]
    n = 0
    for subdir in ("guide", "en/guide"):
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
