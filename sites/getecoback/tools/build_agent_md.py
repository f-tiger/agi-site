#!/usr/bin/env python3
"""Agent-readable surfaces (AI 时代站点轮, 2026-08-29, owner「eco站点做成ai时代站点」).

Three outputs, all EXTRACTED from shipped HTML — no second hand-written copy,
so nothing can drift (agi gen_agent_surfaces precedent, ported fleet-wide per
the 站点互相学习 directive):

  1. site/guide/<slug>.md (+ en/guide, it/guide): a per-page Markdown mirror an
     agent can be *linked to* — until now Markdown existed only behind
     `Accept: text/markdown` content negotiation, which nothing can link to or
     discover. Conversion mirrors the worker's htmlToMarkdown contract:
     injected commerce/chrome stripped, internal links kept as Markdown links,
     EXTERNAL LINKS DEMOTED TO PLAIN TEXT — the Amazon-links-never-in-AI-
     surfaces red line is enforced structurally AND by the hard gate below.
  2. A <link rel="alternate" type="text/markdown"> tag injected idempotently
     into each page head (after canonical), so the .md twin is discoverable.
  3. site/sizing-data.json: the site's original sizing ladders (BTU/Liter/Watt)
     as a CC-BY-4.0 dataset with dateModified — original data is the #1
     citation magnet (citation-growth skill).

HARD GATE: any generated .md containing an amazon link or the affiliate tag
fails the build. HTML stays canonical; the worker serves .md with
X-Robots-Tag: noindex so the mirrors never compete with the pages.
Idempotent: byte-stable on re-run. Wired into deploy after build_llmstxt.
"""
import html as H
import json
import os
import re
import sys
import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, "site")
BASE = "https://getecoback.com"

DISCLOSURE = {
    "de": ("Hinweis: EcoBack testet nicht selbst; Empfehlungen fassen öffentliche Tests "
           "zusammen. Die Website finanziert sich über Amazon-Affiliate-Links auf den "
           "HTML-Seiten — diese Markdown-Ansicht enthält bewusst keine."),
    "en": ("Note: EcoBack does not test devices itself; picks summarise public tests. "
           "The site is funded via Amazon affiliate links on the HTML pages — this "
           "Markdown view deliberately contains none."),
    "it": ("Nota: EcoBack non testa i prodotti in proprio; le scelte riassumono test "
           "pubblici. Il sito è finanziato con link affiliati Amazon sulle pagine HTML — "
           "questa vista Markdown non ne contiene volutamente."),
}


def to_markdown(src_html, path_url, lang):
    m = re.search(r"<title>(.*?)</title>", src_html, re.S)
    title = H.unescape(m.group(1)).strip() if m else path_url
    m = re.search(r'name="description" content="([^"]*)"', src_html)
    desc = H.unescape(m.group(1)).strip() if m else ""
    m = re.search(r"<article[^>]*>(.*?)</article>", src_html, re.S)
    body = m.group(1) if m else ""
    # Detect the live-number bands BEFORE they are stripped below. They are
    # JavaScript-rendered, so a crawler or this Markdown view sees an empty
    # div — and the whole point of a live number (citation-growth item six:
    # "a figure a chat answer cannot hold") is lost on exactly the reader it
    # was meant for. One honest line tells the agent the number exists and
    # where the JSON is. Added 2026-09-05.
    live = [ep for marker, ep in (("<!--EB_FEUCHTENOW-->", "/api/feuchte"),
                                  ("<!--EB_HEATNOW-->", "/api/heat"),
                                  ("<!--EB_STROMNOW-->", "/api/strom")) if marker in src_html]
    for pat in (r"<!--EB_[A-Z_]+-->.*?<!--/EB_[A-Z_]+-->", r"<script\b.*?</script>",
                r"<style\b.*?</style>", r"<nav\b.*?</nav>", r"<form\b.*?</form>"):
        body = re.sub(pat, " ", body, flags=re.S)

    def link(mm):
        href, text = mm.group(1), re.sub(r"<[^>]+>", "", mm.group(2)).strip()
        if not text:
            return ""
        # Internal links survive as Markdown links; anything external becomes
        # plain text so this surface never carries an outbound link without
        # its page context (worker htmlToMarkdown contract).
        if re.match(r"^/(?!/)", href):
            return f"[{text}]({BASE}{href})"
        if href.startswith("#"):
            return text
        return text

    body = re.sub(r'<a\b[^>]*href="([^"]+)"[^>]*>(.*?)</a>', link, body, flags=re.S)
    body = re.sub(r"<h([1-6])[^>]*>(.*?)</h\1>",
                  lambda mm: "\n\n" + "#" * int(mm.group(1)) + " " + re.sub(r"<[^>]+>", "", mm.group(2)).strip() + "\n",
                  body, flags=re.S)
    body = re.sub(r"<(strong|b)\b[^>]*>(.*?)</\1>",
                  lambda mm: "**" + re.sub(r"<[^>]+>", "", mm.group(2)).strip() + "**", body, flags=re.S)
    body = re.sub(r"<li[^>]*>", "\n- ", body)
    body = re.sub(r"</t[dh]>", " | ", body)
    body = re.sub(r"</(p|div|tr|table|ul|ol|section|blockquote)>", "\n", body)
    body = re.sub(r"<[^>]+>", "", body)
    body = H.unescape(body)
    body = re.sub(r"[ \t]+", " ", body)
    body = re.sub(r" ?\n ?", "\n", body)
    body = re.sub(r"^-\s*$", "", body, flags=re.M)
    body = re.sub(r"\n{3,}", "\n\n", body).strip()

    head = [f"# {title}", ""]
    if desc:
        head += [f"> {desc}", ""]
    head += [f"Canonical (HTML, zitierfähig): {BASE}{path_url}", ""]
    if live:
        eps = " · ".join(f"{BASE}{e}" for e in live)
        if lang == "de":
            head += [f"Live-Daten auf dieser Seite (stündlich, JavaScript-gerendert, in dieser "
                     f"Markdown-Ansicht nicht enthalten): {eps}", ""]
        else:
            head += [f"Live data on this page (hourly, rendered in the browser, not included in "
                     f"this Markdown view): {eps}", ""]
    tail = ["", "---",
            f"Maschinenlesbare Übersicht: {BASE}/for-agents.html · Sizing-Datensatz (CC BY 4.0): {BASE}/sizing-data.json",
            f"MCP-Server für Assistenten: {BASE}/mcp",
            DISCLOSURE[lang]]
    # The extra newline is the paragraph break between the header block and
    # the body. It was missing since the mirrors were first built: the head
    # list ends with "" so join() yields one trailing newline, and the body is
    # strip()ped — so the canonical line ran straight into the first
    # paragraph. Harmless to a human, but an assistant reading Markdown treats
    # a missing blank line as "same paragraph". Fixed 2026-09-05.
    return "\n".join(head) + "\n" + body + "\n" + "\n".join(tail) + "\n"


MD_LINK_RE = re.compile(r'[ \t]*<link rel="alternate" type="text/markdown" href="[^"]*">\n?')
CANON_RE = re.compile(r'<link rel="canonical" href="([^"]+)">')


def inject_md_link(page_html, md_url):
    tag = f'<link rel="alternate" type="text/markdown" href="{md_url}">\n'
    stripped = MD_LINK_RE.sub("", page_html)
    m = CANON_RE.search(stripped)
    if not m:
        return page_html, False
    at = stripped.index("\n", m.end()) + 1
    new = stripped[:at] + tag + stripped[at:]
    return new, new != page_html


def build_dataset():
    """Original sizing data, extracted from the same JSONs the pages are built
    from (single source of truth) — dateModified tracks content changes, not
    build time, so re-runs are byte-stable."""
    dehum = json.load(open(os.path.join(ROOT, "tools", "content_entfeuchter_qm.json"), encoding="utf-8"))
    heat = json.load(open(os.path.join(ROOT, "tools", "content_heizung_qm.json"), encoding="utf-8"))
    data = {
        "name": "EcoBack Raumklima-Dimensionierungsdaten",
        "description": ("Faustregeln und Größenleitern für mobile Klimageräte (BTU), "
                        "Luftentfeuchter (Liter/Tag) und elektrische Heizpaneele (Watt) "
                        "nach Raumgröße — identisch mit den Rechnern und Ratgebern auf getecoback.com."),
        "license": "https://creativecommons.org/licenses/by/4.0/",
        "attribution": "EcoBack (getecoback.com)",
        "dateModified": "2026-08-31",
        "rules": {
            "cooling_btu_per_m2": 340,
            "heating_w_per_m2_insulated": [60, 100],
            "mould_threshold_rh_percent": 60,
            "cost_basis_eur_per_kwh": 0.30,
            "dehumidifier_rating_note": ("Hersteller-Liter/Tag sind bei 30 °C/80 % rF gemessen; "
                                          "reale Entzugsleistung liegt typisch bei etwa der Hälfte."),
            # Published 2026-08-31. This is the site's own decision rule and it
            # existed only inside the calculator's JavaScript, where nothing
            # could cite it. Above this cooling load no portable monoblock in
            # our tables covers the room, so the honest answer stops being a
            # model and becomes a device class.
            "monoblock_ceiling_btu": 13500,
            "monoblock_ceiling_note": ("Oberhalb von rund 13.500 BTU deckt kein tragbarer Monoblock "
                                       "den Raum noch ab; ab dort ist die ehrliche Empfehlung eine "
                                       "Quick-Connect-Splitanlage, nicht ein größeres mobiles Gerät. "
                                       "Quick-Connect-Sets enthalten überwiegend das fluorierte "
                                       "Kältemittel R32 — die Installationsklausel des Anbieters vor "
                                       "dem Kauf lesen."),
        },
        "ladders": {
            "cooling_btu": [
                {"m2": qm, "btu_class": c, "guide": f"{BASE}/guide/klimaanlage-{qm}-qm.html"}
                for qm, c in ((10, "5.000–7.000"), (15, "7.000–9.000"), (20, "9.000"),
                              (25, "10.000–12.000"), (30, "12.000–13.000"), (40, "14.000+ / Split"))
            ],
            "dehumidifier_l_per_day": [
                {"m2": e["qm"], "liters_per_day": e["liter"], "room": e["raumtyp"],
                 "guide": f"{BASE}/guide/luftentfeuchter-{e['qm']}-qm.html"}
                for e in dehum["entries"]
            ],
            "heating_watt": [
                {"m2": e["qm"], "watt": e["watt"], "room": e["raumtyp"],
                 "guide": f"{BASE}/guide/heizung-{e['qm']}-qm.html"}
                for e in heat["entries"]
            ],
        },
    }
    out = os.path.join(SITE, "sizing-data.json")
    payload = json.dumps(data, ensure_ascii=False, indent=1) + "\n"
    old = open(out, encoding="utf-8").read() if os.path.exists(out) else ""
    if payload != old:
        open(out, "w", encoding="utf-8").write(payload)
    return out


def main():
    n_md, n_link, bad = 0, 0, []
    for sub, lang in (("guide", "de"), (os.path.join("en", "guide"), "en"),
                      (os.path.join("it", "guide"), "it")):
        d = os.path.join(SITE, sub)
        if not os.path.isdir(d):
            continue
        for fn in sorted(os.listdir(d)):
            if not fn.endswith(".html"):
                continue
            page_path = os.path.join(d, fn)
            s = open(page_path, encoding="utf-8").read()
            if 'name="robots" content="noindex' in s:
                continue
            rel = "/" + sub.replace(os.sep, "/") + "/" + fn
            md_rel = rel[:-5] + ".md"
            md = to_markdown(s, rel, lang)
            low = md.lower()
            # Red line = no affiliate LINKS on the AI surface. Plain-text brand
            # mentions ("Preis auf Amazon.de ansehen") are page copy, not links.
            if (re.search(r"\]\(https?://[^)]*amazon", low)
                    or re.search(r"https?://(www\.)?amazon\.", low)
                    or "tag=getecoback-21" in low or "ecoback0d-20" in low):
                bad.append(md_rel)
                continue
            md_path = page_path[:-5] + ".md"
            old = open(md_path, encoding="utf-8").read() if os.path.exists(md_path) else ""
            if md != old:
                open(md_path, "w", encoding="utf-8").write(md)
            n_md += 1
            new_html, changed = inject_md_link(s, BASE + md_rel)
            if changed:
                open(page_path, "w", encoding="utf-8").write(new_html)
                n_link += 1
    if bad:
        print("build_agent_md: AFFILIATE LEAK into .md surface (red line):")
        for b in bad:
            print("  -", b)
        return 1
    build_dataset()
    print(f"agent surfaces: {n_md} .md mirrors (link tags rewritten: {n_link}) · sizing-data.json OK · 0 affiliate leaks")
    return 0


if __name__ == "__main__":
    sys.exit(main())
