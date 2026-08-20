#!/usr/bin/env python3
"""Idempotent cross-link injector for the programmatic room-size pages.

Site-audit finding (2026-07-15): 33/86 guide pages are near-orphans (only the
kategorie hub links them). The worst offenders are the money pages that already
rank pos 7-13: the klimaanlage/heizung/luftentfeuchter X-qm series. This tool
injects a compact contextual link block into each series page:

  - adjacent sizes in the same series (10 <-> 15 <-> 20 ...)
  - the same size in the other two series (cross-category, same buyer)
  - the series' pillar guide (BTU guide / Infrarot guide / Entfeuchter guide)

Markers <!--EB_XLINKS-->...<!--/EB_XLINKS--> make re-runs replace-in-place.
Run: python3 tools/build_xlinks.py   (wired into deploy via build_structure flow)
"""
import os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GUIDE = os.path.join(ROOT, "site", "guide")

SIZES = [10, 15, 20, 25, 30, 40, 50]
SERIES = {
    "klimaanlage": {
        "slug": "klimaanlage-{qm}-qm",
        "label": "Klimaanlage für {qm} m²",
        "pillar": ("wie-viel-btu-brauche-ich", "Wie viel BTU brauche ich? (alle Raumgrößen)"),
        "cross_title": "Gleicher Raum, andere Jahreszeit",
    },
    "heizung": {
        "slug": "heizung-{qm}-qm",
        "label": "Heizung für {qm} m²",
        "pillar": ("infrarotheizung-ratgeber", "Infrarotheizung: Watt-Bedarf & Kosten"),
        "cross_title": "Gleicher Raum, andere Jahreszeit",
    },
    "luftentfeuchter": {
        "slug": "luftentfeuchter-{qm}-qm",
        "label": "Luftentfeuchter für {qm} m²",
        "pillar": ("luftentfeuchter-ratgeber", "Luftentfeuchter-Kaufberatung"),
        "cross_title": "Gleicher Raum, anderes Problem",
    },
}


def block(series_key, qm):
    s = SERIES[series_key]
    links = []
    # adjacent sizes, same series
    i = SIZES.index(qm)
    for j in (i - 1, i + 1):
        if 0 <= j < len(SIZES):
            q2 = SIZES[j]
            links.append((f"/guide/{s['slug'].format(qm=q2)}.html",
                          s["label"].format(qm=q2) + " →"))
    # same size, other series (cross-category)
    for other_key, o in SERIES.items():
        if other_key == series_key:
            continue
        path = os.path.join(GUIDE, o["slug"].format(qm=qm) + ".html")
        if os.path.exists(path):
            links.append((f"/guide/{o['slug'].format(qm=qm)}.html",
                          o["label"].format(qm=qm) + " →"))
    # pillar guide
    links.append((f"/guide/{s['pillar'][0]}.html", s["pillar"][1] + " →"))

    inner = "\n".join(f'    <a href="{h}">{t}</a>' for h, t in links)
    return ("<!--EB_XLINKS-->\n"
            '  <div class="related"><strong>Passende Ratgeber für deine Raumgröße</strong>\n'
            f"{inner}\n"
            "  </div>\n"
            "<!--/EB_XLINKS-->\n")


def inject(path, blk):
    html = open(path, encoding="utf-8").read()
    if "<!--EB_XLINKS-->" in html:
        new = re.sub(r"<!--EB_XLINKS-->.*?<!--/EB_XLINKS-->\n?", blk, html, flags=re.S)
    elif "<!--EB_RADAR-->" in html:
        new = html.replace("<!--EB_RADAR-->", blk + "<!--EB_RADAR-->", 1)
    else:
        new = html.replace("</body>", blk + "</body>", 1)
    if new != html:
        open(path, "w", encoding="utf-8").write(new)
        return True
    return False


# --- Orphan rescue: curated links from strong pages to under-linked ones -------
# Crawlers reach pages through links, and a page nobody links to leans entirely on
# the sitemap. These targets were picked from two signals: pages unreachable from
# the homepage, and pages the first-party analytics shows are already being visited
# while having almost no internal support. Anchors are descriptive on purpose —
# a generic "read more" carries no relevance.
XREF = {
    "guide/balkonspeicher-rechner.html": [
        ("/guide/growatt-noah-2000-probleme.html", "Growatt NOAH 2000: bekannte Probleme und Abhilfe"),
        ("/guide/balkonspeicher-winter-frost.html", "Balkonspeicher im Winter: Frostschutz richtig einstellen"),
    ],
    "guide/balkonkraftwerk-speicher-nachruesten.html": [
        ("/guide/growatt-noah-2000-probleme.html", "Growatt NOAH 2000: bekannte Probleme und Abhilfe"),
        ("/guide/balkonspeicher-winter-frost.html", "Balkonspeicher im Winter: Frostschutz richtig einstellen"),
    ],
    "guide/beste-tragbare-klimaanlage-schlafzimmer.html": [
        ("/guide/mobile-klimaanlage-zu-laut.html", "Mobile Klimaanlage zu laut? Was wirklich hilft"),
        ("/guide/guenstige-klimaanlage-unter-300-euro.html", "Günstige Klimaanlagen unter 300 €"),
    ],
    "guide/bei-hitze-schlafen.html": [
        ("/guide/mobile-klimaanlage-zu-laut.html", "Mobile Klimaanlage zu laut? Was wirklich hilft"),
        ("/guide/klimaanlage-oder-ventilator.html", "Klimaanlage oder Ventilator — was lohnt sich?"),
    ],
    "guide/klimaanlage-kippfenster.html": [
        ("/guide/klimaanlage-fenster-einbruchschutz.html", "Fenster abdichten ohne Einbruchrisiko"),
        ("/guide/klimaanlage-zubehoer-guenstig.html", "Zubehör günstig: Amazon oder Direktimport?"),
    ],
    "guide/abluftschlauch-verlaengern.html": [
        ("/guide/klimaanlage-zubehoer-guenstig.html", "Zubehör günstig: Amazon oder Direktimport?"),
    ],
    "guide/beste-tragbare-klimaanlage-hitzewelle.html": [
        ("/guide/guenstige-klimaanlage-unter-300-euro.html", "Günstige Klimaanlagen unter 300 €"),
        ("/guide/klimaanlage-oder-ventilator.html", "Klimaanlage oder Ventilator — was lohnt sich?"),
    ],
}


def xref_block(items):
    links = "".join(
        f'<a href="{href}" style="display:block;margin:5px 0;color:#0f6ba8;'
        f'text-decoration:none;font-size:14px;">{text} →</a>' for href, text in items)
    return ('<!--EB_XREF--><section style="max-width:1000px;margin:18px auto 0;padding:0 20px;">'
            '<div style="background:#fff;border:1px solid #e4ebf0;border-radius:12px;padding:16px 18px;">'
            '<strong style="font-size:14.5px;display:block;margin-bottom:6px;">Passend dazu</strong>'
            + links + '</div></section><!--/EB_XREF-->\n')


def inject_xref(path, blk):
    html = open(path, encoding="utf-8").read()
    if "<!--EB_XREF-->" in html:
        new = re.sub(r"<!--EB_XREF-->.*?<!--/EB_XREF-->\n?", blk, html, flags=re.S)
    elif "<!--EB_FOOTER-->" in html:
        new = html.replace("<!--EB_FOOTER-->", blk + "<!--EB_FOOTER-->", 1)
    else:
        return False
    if new != html:
        open(path, "w", encoding="utf-8").write(new)
        return True
    return False


def main():
    changed = 0
    for key, s in SERIES.items():
        for qm in SIZES:
            path = os.path.join(GUIDE, s["slug"].format(qm=qm) + ".html")
            if not os.path.exists(path):
                continue
            if inject(path, block(key, qm)):
                changed += 1
    print(f"xlinks injected/updated on {changed} room-size pages")
    xrefs = 0
    for src, items in XREF.items():
        path = os.path.join(SITE, src) if 'SITE' in globals() else os.path.join(GUIDE, os.path.basename(src))
        if not os.path.exists(path):
            print(f"  xref source missing: {src}")
            continue
        for href, _ in items:
            if not os.path.exists(os.path.join(GUIDE, os.path.basename(href))):
                raise SystemExit(f"xref target does not exist: {href}")
        if inject_xref(path, xref_block(items)):
            xrefs += 1
    print(f"xref blocks injected/updated on {xrefs} pages")




# --- Season bridge (2026-08-19): the affiliate winners are summer SCENARIO pages
# (kippfenster/wohnmobil/italy/tilt-turn...), which sit outside the X-qm series
# and its built-in cross-season links. When Germany cools in September this
# funnel dries up on its own; the bridge hands the same reader the autumn
# problem set (storing the AC, damp/mould, heating cost) while they are still
# here. List-driven and idempotent like XREF; targets are validated to exist.
SEASON_DE = [
    "klimaanlage-wohnmobil.html",
    "klimaanlage-kippfenster.html",
    "split-klimaanlage-ohne-kernbohrung.html",
    "mobile-klimaanlage-zu-laut.html",
    "guenstige-klimaanlage-unter-300-euro.html",
    "homeoffice-buero-kuehlen.html",
    "turmventilator-vs-standventilator.html",
    "ventilator-mit-eis.html",
]
SEASON_DE_LINKS = [
    ("/guide/mobile-klimaanlage-ueberwintern.html", "Mobile Klimaanlage überwintern: in 6 Schritten richtig lagern"),
    ("/guide/luftentfeuchter-gegen-schimmel.html", "Herbstfeuchte: Hilft ein Luftentfeuchter wirklich gegen Schimmel?"),
    ("/guide/heizkosten-vergleich-rechner.html", "Heizkosten-Vergleich: Heizlüfter, Infrarot oder Klima mit Heizfunktion?"),
]
SEASON_EN = [
    "best-portable-air-conditioner-italy.html",
    "best-portable-air-conditioner-spain.html",
    "best-portable-air-conditioner-europe-heatwave.html",
    "portable-ac-tilt-and-turn-windows.html",
    "portable-ac-rented-apartment.html",
]
SEASON_EN_LINKS = [
    ("/en/guide/how-to-clean-portable-air-conditioner.html", "Before you store it: clean the portable AC so it doesn't smell in spring"),
    ("/en/guide/dehumidifier-drying-clothes-cost.html", "Drying laundry indoors this autumn: what a dehumidifier actually costs"),
]


def season_block(links, title):
    inner = "".join(
        f'<a href="{href}" style="display:block;margin:5px 0;color:#0f6ba8;'
        f'text-decoration:none;font-size:14px;">{text} →</a>' for href, text in links)
    return ('<!--EB_SEASON--><section style="max-width:1000px;margin:18px auto 0;padding:0 20px;">'
            '<div style="background:#fff;border:1px solid #e4ebf0;border-radius:12px;padding:16px 18px;">'
            f'<strong style="font-size:14.5px;display:block;margin-bottom:6px;">{title}</strong>'
            + inner + '</div></section><!--/EB_SEASON-->\n')


def inject_season(path, blk):
    html = open(path, encoding="utf-8").read()
    if "<!--EB_SEASON-->" in html:
        new = re.sub(r"<!--EB_SEASON-->.*?<!--/EB_SEASON-->\n?", blk, html, flags=re.S)
    elif "<!--EB_XREF-->" in html:
        new = html.replace("<!--EB_XREF-->", blk + "<!--EB_XREF-->", 1)
    elif "<!--EB_FOOTER-->" in html:
        new = html.replace("<!--EB_FOOTER-->", blk + "<!--EB_FOOTER-->", 1)
    else:
        return False
    if new != html:
        open(path, "w", encoding="utf-8").write(new)
        return True
    return False


def season_main():
    for links, base in ((SEASON_DE_LINKS, GUIDE), (SEASON_EN_LINKS, os.path.join(ROOT, "site"))):
        for href, _ in links:
            tgt = os.path.join(ROOT, "site", href.lstrip("/"))
            if not os.path.exists(tgt):
                raise SystemExit(f"season bridge target does not exist: {href}")
    n = 0
    for fn in SEASON_DE:
        p = os.path.join(GUIDE, fn)
        if os.path.exists(p) and inject_season(p, season_block(SEASON_DE_LINKS, "Nach der Kühl-Saison: was jetzt ansteht")):
            n += 1
    for fn in SEASON_EN:
        p = os.path.join(ROOT, "site", "en", "guide", fn)
        if os.path.exists(p) and inject_season(p, season_block(SEASON_EN_LINKS, "After the cooling season")):
            n += 1
    print(f"season bridge injected/updated on {n} pages")




# --- Lead-intent probe (2026-08-20, research-driven; worker already whitelists
# `lead_intent`). German home-energy lead marketplaces pay EUR 8-120 per
# installer inquiry — two orders of magnitude above an Amazon commission.
# Before wiring any pipeline we measure honest demand: a button that states
# plainly the service is being evaluated. Decision line: >=10 clicks/28d ->
# owner wires a lead buyer; fewer -> archived as refuted, zero sunk cost.
LEAD_PAGES = [f"heizung-{q}-qm.html" for q in (10, 15, 20, 25, 30, 40, 50)] + [
    "infrarotheizung-ratgeber.html",
    "infrarotheizung-watt-rechner.html",
    "heizkosten-vergleich-rechner.html",
]


def lead_block():
    return ('<!--EB_LEADPROBE--><section style="max-width:1000px;margin:18px auto 0;padding:0 20px;">'
            '<div style="background:#f4f9f4;border:1px solid #d7e8d7;border-radius:12px;padding:16px 18px;">'
            '<strong style="font-size:14.5px;display:block;margin-bottom:4px;">Feste Heizungsinstallation geplant?</strong>'
            '<p style="margin:0 0 10px;font-size:13.5px;color:#4a5a67;">Wir pr\u00fcfen gerade, ob wir kostenlose '
            'Angebots-Vermittlung an gepr\u00fcfte Betriebe anbieten. Noch gibt es sie nicht \u2014 mit einem Klick '
            'zeigst du unverbindlich Interesse und hilfst uns zu entscheiden, ob wir sie bauen.</p>'
            '<button type="button" onclick="if(window.gtag)gtag(\'event\',\'lead_intent\',{page:location.pathname});'
            'this.disabled=true;this.textContent=\'Danke \u2014 Interesse notiert (nichts wird gesendet)\';" '
            'style="background:#2e7d32;color:#fff;border:none;font-weight:700;padding:9px 16px;border-radius:8px;'
            'font-size:13.5px;cursor:pointer;">Ja, Angebote w\u00fcrden mich interessieren</button>'
            '</div></section><!--/EB_LEADPROBE-->\n')


def inject_lead(path):
    html = open(path, encoding="utf-8").read()
    blk = lead_block()
    if "<!--EB_LEADPROBE-->" in html:
        new = re.sub(r"<!--EB_LEADPROBE-->.*?<!--/EB_LEADPROBE-->\n?", blk, html, flags=re.S)
    elif "<!--EB_XREF-->" in html:
        new = html.replace("<!--EB_XREF-->", blk + "<!--EB_XREF-->", 1)
    elif "<!--EB_FOOTER-->" in html:
        new = html.replace("<!--EB_FOOTER-->", blk + "<!--EB_FOOTER-->", 1)
    else:
        return False
    if new != html:
        open(path, "w", encoding="utf-8").write(new)
        return True
    return False


def lead_main():
    n = 0
    for fn in LEAD_PAGES:
        p = os.path.join(GUIDE, fn)
        if os.path.exists(p) and inject_lead(p):
            n += 1
    print(f"lead-intent probe injected/updated on {n} pages")


if __name__ == "__main__":
    main()
    season_main()
    lead_main()
