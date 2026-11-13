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
     REVIEWED REFERENCE HOST LINKS PRESERVED; COMMERCE LINKS DEMOTED — the Amazon-links-never-in-AI-
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
from html.parser import HTMLParser
import json
import os
import re
import sys
import datetime
from agent_sources import citation_url

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, "site")
BASE = "https://getecoback.com"

DISCLOSURE = {
    "nl": "Redactionele keuzehulp, geen eigen apparaattest. De HTML-pagina bevat gewone winkellinks; deze tekstweergave niet.",
    "en-AU": "Editorial buying guidance, not hands-on product testing. The HTML page contains ordinary retailer links; this text view does not.",
    "de": ("Hinweis: Redaktionelle Einordnung anhand der verlinkten Quellen, keine eigenen Gerätetests. "
           "Die Website finanziert sich über Amazon-Affiliate-Links auf den "
           "HTML-Seiten — diese Markdown-Ansicht enthält bewusst keine."),
    "en": ("Note: Editorial guidance based on the linked sources, not our own device tests. "
           "The site is funded via Amazon affiliate links on the HTML pages — this "
           "Markdown view deliberately contains none."),
    "it": ("Nota: Indicazioni redazionali basate sulle fonti collegate, non test propri. "
           "Il sito è finanziato con link affiliati Amazon sulle pagine HTML — "
           "questa vista Markdown non ne contiene volutamente."),
}


def buyer_method_html(fragment):
    """Keep the public method, never a product card's first details panel.

    The old deployed shape has no marker. Its two exact summary labels are
    the only legacy fallback; arbitrary unmarked details are not evidence.
    New methods contain their own checked date and references.
    """
    panels = list(re.finditer(r'<details\b([^>]*)>(.*?)</details>', fragment, re.S))
    marked = [panel for panel in panels
              if re.search(r'(?:^|\s)data-choice-method(?:\s|=|$)', panel.group(1))]
    if marked:
        if len(marked) != 1:
            raise ValueError('Buyer guide must have exactly one data-choice-method panel')
        return marked[0].group(2)
    legacy_labels = {'Warum „20 Liter“ nicht immer 20 Liter sind',
                     'Why “20 litres” does not always mean 20 litres'}
    legacy = []
    for panel in panels:
        summary = re.match(r'\s*<summary>(.*?)</summary>', panel.group(2), re.S)
        if not panel.group(1).strip() and summary and H.unescape(summary.group(1)).strip() in legacy_labels:
            legacy.append(panel)
    if len(legacy) != 1:
        return ''
    source = re.search(r'<small>(?:Quellen geprüft|Sources checked).*?</small>', fragment, re.S)
    return legacy[0].group(2) + (source.group(0) if source else '')


def retained_fragment_ids(body):
    class Targets(HTMLParser):
        def __init__(self):
            super().__init__()
            self.stack, self.ids = [], set()
        def handle_starttag(self, tag, attrs):
            attrs = dict(attrs)
            hidden = (any(item[1] for item in self.stack) or 'hidden' in attrs
                      or attrs.get('aria-hidden', '').lower() == 'true'
                      or bool(re.search(r'(?:display\s*:\s*none|visibility\s*:\s*hidden)', attrs.get('style', ''), re.I)))
            if not hidden and attrs.get('id'):
                self.ids.add(attrs['id'])
            if tag not in {'br','hr','img','input','meta','link','source','area','base','embed','param','track','wbr'}:
                self.stack.append((tag, hidden))
        def handle_endtag(self, tag):
            for i in range(len(self.stack)-1, -1, -1):
                if self.stack[i][0] == tag:
                    del self.stack[i:]
                    break
    parser = Targets()
    parser.feed(body)
    return parser.ids


def markdown_table(fragment):
    """Preserve cell boundaries; never invent headers for ambiguous layouts."""
    def text(value):
        value = re.sub(r'<br\s*/?>', ' ', value, flags=re.I)
        return re.sub(r'\s+', ' ', H.unescape(re.sub(r'<[^>]+>', '', value))).strip()
    caption = re.search(r'<caption\b[^>]*>(.*?)</caption>', fragment, re.S | re.I)
    title = text(caption[1]) + "\n\n" if caption else ''
    rows = [re.findall(r'<(th|td)\b[^>]*>(.*?)</\1>', row, re.S | re.I)
            for row in re.findall(r'<tr\b[^>]*>(.*?)</tr>', fragment, re.S | re.I)]
    rows = [row for row in rows if row]
    if not rows:
        return title + text(fragment)
    values = [[text(value) for _, value in row] for row in rows]
    simple = (len(re.findall(r'<table\b', fragment, re.I)) == 1 and len(rows) > 1 and all(tag.lower() == 'th' for tag, _ in rows[0])
              and all(len(row) == len(rows[0]) for row in rows)
              and not re.search(r'\b(?:rowspan|colspan)\s*=', fragment, re.I))
    if not simple:
        # Row order is retained, but merged/headerless cells are not asserted
        # to belong to fabricated GFM column headings.
        return title + '\n'.join('- ' + ' · '.join(row) for row in values)
    def line(row):
        return '| ' + ' | '.join(v.replace('\\', '\\\\').replace('|', '\\|') for v in row) + ' |'
    return title + '\n'.join([line(values[0]), line(['---'] * len(values[0]))]
                              + [line(row) for row in values[1:]])


def to_markdown(src_html, path_url, lang):
    m = re.search(r"<title>(.*?)</title>", src_html, re.S)
    title = H.unescape(m.group(1)).strip() if m else path_url
    m = re.search(r'name="description" content="([^"]*)"', src_html)
    desc = H.unescape(m.group(1)).strip() if m else ""
    # Later builders can nest another EB block inside this component (the
    # household link before its h2, for example). Remove the complete buyer
    # boundary before selecting the editorial body, then append only its
    # public method below. Generic EB cleanup must not unwrap hidden results.
    buyer = re.search(r'<!--EB_BUYER-->(.*?)<!--/EB_BUYER-->', src_html, re.S)
    editorial_html = re.sub(r'<!--EB_BUYER-->.*?<!--/EB_BUYER-->', '', src_html, flags=re.S)
    m = re.search(r"<article[^>]*>(.*?)</article>", editorial_html, re.S)
    body = m.group(1) if m else ""
    if not m:
        # Some authored guides use <main> rather than <article>. Keep their
        # editorial body; never fall back to the whole page's navigation/UI.
        # The article branch above remains authoritative when both are present.
        main = re.search(r'<main\b[^>]*>(.*?)</main>', editorial_html, re.S)
        if main:
            body = main.group(1)
            if path_url == '/waeschetrockner-oder-luftentfeuchter.html':
                body = re.sub(r'<header\b.*?</header>', '', body, flags=re.S)
    if path_url == '/guide/smarte-heizkoerperthermostate-lohnen-sich.html':
        # The sourced no-JS table carries the evidence. Interactive selectors
        # would otherwise become a concatenated list of unrelated valve names.
        body = re.sub(r'<div\b[^>]*data-valve-controls[^>]*>.*?</div>', '', body, flags=re.S)
        body = re.sub(r'<p\b[^>]*data-valve-share-row[^>]*>.*?</p>', '', body, flags=re.S)
        body = re.sub(r'<summary>(.*?)</summary>', r'<p><strong>\1</strong></p>', body, flags=re.S)
        body = re.sub(r'</strong><p>', '</strong><p> ', body)
        body = re.sub(r'</caption>', '</caption>\n', body)
    heater = re.search(r'<!--EB_HEATCOST-->(.*?)<!--/EB_HEATCOST-->', src_html, re.S)
    if heater:
        # Keep the examples and limitations; remove forms below as usual.
        body += re.sub(r'<button\b[^>]*>(.*?)</button>', r'<p>\1</p>', heater.group(1), flags=re.S)
    # Preserve the sourced performance explanation from the decision guide,
    # while keeping its form, hidden shopping results and affiliate URLs out.
    if buyer:
        evidence = buyer_method_html(buyer.group(1))
        if evidence:
            heading = 'Herstellerdaten vor dem Kauf prüfen' if lang == 'de' else 'Check manufacturer data before buying'
            evidence = re.sub(r'<summary>(.*?)</summary>', r'<p><strong>\1</strong></p>', evidence, flags=re.S)
            evidence = evidence.replace('</caption>', '</caption>\n')
            body += f'<h2>{heading}</h2>' + evidence
    # Preserve the visible sourced catalog while excluding its merchant actions.
    from dehum_catalog import evidence_html
    body += evidence_html(src_html)
    laundry = re.search(r'<!--EB_LAUNDRY-->(.*?)<!--/EB_LAUNDRY-->', src_html, re.S)
    if laundry:
        protocol = re.search(r'<details\b[^>]*><summary>(?:Measure one load fairly: checklist|Eine Ladung fair messen: Checkliste)</summary>(.*?)</details>', laundry.group(1), re.S)
        if protocol:
            worked = re.search(r'<p data-laundry-example>(.*?)</p>', laundry.group(1), re.S)
            if worked:
                body += '<p>' + worked.group(1) + '</p>'
            if lang == 'de':
                decisions = re.search(r'<div class="lc-evidence" id="waesche-entscheidung">(.*?)</div>', laundry.group(1), re.S)
                body += re.sub(r'<summary>(.*?)</summary>', r'<p><strong>\1</strong></p>', decisions.group(1), flags=re.S) if decisions else ''
                body += '<h2>Eine Ladung fair vergleichen</h2><p>kWh für den ganzen Durchgang × Arbeitspreis. Vorbelegte Zahlen sind Rechenbeispiele, keine Produktmessungen. Gleiche Wäschemenge und gleicher Trocknungsgrad sind Voraussetzung. PNG und CSV werden lokal erstellt; Eingaben werden nicht hochgeladen.</p>' + protocol.group(1)
            else:
                body += '<h2>Reproducible laundry cost comparison</h2><p>Whole-run kWh × unit price. Prefilled values are fictional scenarios, not product measurements. Confirm equal laundry mass and final dryness. The calculator on the HTML page exports PNG and CSV locally; inputs are not uploaded.</p>' + protocol.group(1)
    product = re.search(r'<!--EB_PRODUCT_DECISIONS-->(.*?)<!--/EB_PRODUCT_DECISIONS-->', src_html, re.S)
    if product:
        # Preserve sourced methodology/category checks, not script config or shopping UI.
        body += product.group(1).split('<script', 1)[0]
    fit = re.search(r'<!--EB_HOME_FIT-->(.*?)<!--/EB_HOME_FIT-->', src_html, re.S)
    if fit:
        body += fit.group(1).split('<script', 1)[0]
    upkeep = re.search(r'<!--EB_UPKEEP-->(.*?)<!--/EB_UPKEEP-->', src_html, re.S)
    if upkeep:
        # Keep the readable method/limits and sources. The ordinary cleanup
        # below removes interactive form controls and all commerce URLs.
        body += upkeep.group(1).split('<script', 1)[0]
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
    # The reviewed task handoff is useful answer context, unlike generic nav.
    # Include only what this HTML actually exposes; normal source/commerce
    # filtering still runs below. Never synthesize invisible next-step links.
    journey = re.search(r'<!--EB_RELATED-->\s*<nav\b[^>]*id="eb-journey-next"[^>]*>(.*?)</nav>\s*<!--/EB_RELATED-->', src_html, re.S)
    if journey:
        body += journey.group(1).replace('</a><p', '</a> <p')

    retained_ids = retained_fragment_ids(body)

    def link(mm):
        href, text = mm.group(1), re.sub(r"<[^>]+>", "", mm.group(2)).strip()
        if not text:
            return ""
        # Keep original references on exact allowed hosts. Never add a source
        # that the HTML does not cite, or carry commerce into the text view.
        rel = re.search(r"\brel=[\"']([^\"']*)[\"']", mm.group(0).split('>', 1)[0], re.I)
        source = citation_url(H.unescape(href), rel.group(1) if rel else '')
        if source:
            return f"[{text}]({source})"
        if re.match(r"^/(?!/)", href):
            return f"[{text}]({BASE}{href})"
        if href.startswith("#") and href[1:] in retained_ids:
            return f"[{text}]({BASE}{path_url}{href})"
        return text

    body = re.sub(r'<a\b[^>]*href="([^"]+)"[^>]*>(.*?)</a>', link, body, flags=re.S)
    body = re.sub(r"<h([1-6])[^>]*>(.*?)</h\1>",
                  lambda mm: "\n\n" + "#" * int(mm.group(1)) + " " + re.sub(r"<[^>]+>", "", mm.group(2)).strip() + "\n",
                  body, flags=re.S)
    body = re.sub(r"<(strong|b)\b[^>]*>(.*?)</\1>",
                  lambda mm: "**" + re.sub(r"<[^>]+>", "", mm.group(2)).strip() + "**", body, flags=re.S)
    tables = []
    def table(match):
        tables.append(markdown_table(match.group(0)))
        return f"\n\nECOMDTABLE{len(tables)-1}END\n\n"
    body = re.sub(r'<table\b[^>]*>.*?</table>', table, body, flags=re.S | re.I)
    body = re.sub(r"<li[^>]*>", "\n- ", body)
    body = re.sub(r"</t[dh]>", " | ", body)
    body = re.sub(r"</(p|div|tr|table|ul|ol|section|blockquote)>", "\n", body)
    body = re.sub(r"<[^>]+>", "", body)
    body = H.unescape(body)
    body = re.sub(r"[ \t]+", " ", body)
    body = re.sub(r" ?\n ?", "\n", body)
    body = re.sub(r"^-\s*$", "", body, flags=re.M)
    body = re.sub(r"\n{3,}", "\n\n", body).strip()

    for i, table_text in enumerate(tables):
        body = body.replace(f"ECOMDTABLE{i}END", table_text)

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
    disclosure = DISCLOSURE[lang]
    if path_url == '/en/filter-finder.html':
        disclosure = ('Source: manufacturer documentation, not a physical fit or performance test. '
                      'The HTML finder contains disclosed affiliate searches; this text view contains none.')
    tail = ["", "---",
            f"Maschinenlesbare Übersicht: {BASE}/for-agents.html · Sizing-Datensatz (CC BY 4.0): {BASE}/sizing-data.json",
            f"MCP-Server für Assistenten: {BASE}/mcp",
            disclosure]
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
        "description": ("Faustregeln für mobile Klimageräte (BTU) und elektrische Heizpaneele (Watt), "
                        "ergänzt um Prüfhinweise für Luftfeuchte und Entfeuchter. "
                        "Keine Entfeuchter-Kapazität aus der Grundfläche und keine feste Schimmelgrenze."),
        "license": "https://creativecommons.org/licenses/by/4.0/",
        "attribution": "EcoBack (getecoback.com)",
        "dateModified": "2026-11-06",
        "schema_version": 2,
        "migration_note": ("Version 2 ersetzt mould_threshold_rh_percent durch humidity_review_rh_percent: "
                           "ein Prüfsignal, keine Schimmelgrenze. Die bisherigen dehumidifier_l_per_day-Zeilen "
                           "und liters_per_day-Textfelder bleiben erhalten, enthalten aber keine aus der "
                           "Grundfläche abgeleiteten Kapazitäten mehr."),
        "rules": {
            "cooling_btu_per_m2": 340,
            "heating_w_per_m2_insulated": [60, 100],
            "humidity_review_rh_percent": 60,
            "humidity_review_note": ("Wiederholt über 60 % relative Raumluftfeuchte ist ein Anlass zum Messen "
                                     "und zur Ursachenprüfung, keine feste Schimmelgrenze. An kalten Oberflächen "
                                     "kann die relative Feuchte höher sein; Werte darunter garantieren keinen Schutz."),
            "cost_basis_eur_per_kwh": 0.30,
            "dehumidifier_rating_note": ("Liter/Tag nur zusammen mit der angegebenen Prüftemperatur und Feuchte vergleichen. "
                                          "Die Grundfläche allein bestimmt keine passende Kapazität; kein pauschaler Umrechnungsfaktor."),
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
                {"m2": e["qm"], "liters_per_day": "Nicht aus der Grundfläche ableitbar: Temperatur, Feuchte und Feuchtelast prüfen", "room": e["raumtyp"],
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
    for sub, lang in (("guide", "de"), (os.path.join("en", "guide"), "en"), ("en", "en"),
                      (os.path.join("it", "guide"), "it"), ("nl", "nl"), ("au", "en-AU"), ("", "de")):
        d = os.path.join(SITE, sub)
        if not os.path.isdir(d):
            continue
        for fn in sorted(os.listdir(d)):
            if not fn.endswith(".html"):
                continue
            if not sub and fn not in ('waeschetrockner-oder-luftentfeuchter.html', 'for-agents.html'):
                continue
            if sub == 'en' and fn != 'filter-finder.html':
                continue
            page_path = os.path.join(d, fn)
            s = open(page_path, encoding="utf-8").read()
            if 'name="robots" content="noindex' in s:
                continue
            rel = "/" + (sub.replace(os.sep, "/") + "/" if sub else "") + fn
            md_rel = rel[:-5] + ".md"
            page_lang = 'en' if not sub and fn == 'for-agents.html' else lang
            md = to_markdown(s, rel, page_lang)
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
