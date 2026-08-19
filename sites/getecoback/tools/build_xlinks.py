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


if __name__ == "__main__":
    main()
