#!/usr/bin/env python3
"""Seasonal homepage rotation — the automation layer of the year-round
"Raumklima" positioning.

Month-driven and deterministic: every CI deploy re-runs this, so the homepage
hero (title/meta/OG/h1/sub/badge) and the "Jetzt in der Saison" teaser strip
rotate through the four seasons with zero manual work. Push cadence (daily
routines) keeps it fresh automatically.

Seasons: Jun-Aug sommer · Sep-Okt herbst · Nov-Feb winter · Mär-Mai frühjahr.
DE gets the full rotation; EN (cooling-only content) gets badge/sub neutral-
ization off-season instead of pretending to have seasonal content it lacks.

Idempotent: all replacements are wholesale from config; the teaser strip lives
between <!--EB_SEASON--> markers. Run: python3 tools/build_season.py [--month N]
"""
import os, re, sys, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DE = os.path.join(ROOT, "site", "index.html")
EN = os.path.join(ROOT, "site", "en", "index.html")


def season_of(month):
    if month in (6, 7, 8):
        return "sommer"
    if month in (9, 10):
        return "herbst"
    if month in (11, 12, 1, 2):
        return "winter"
    return "fruehjahr"


DE_SEASONS = {
    "sommer": {
        "title": "Klimaanlage für die Hitzewelle 2026 — beste Angebote | EcoBack",
        "desc": "Klimaanlage für die Hitzewelle 2026: tragbare Klimageräte, Luftkühler und Ventilatoren im ehrlichen Vergleich — kühlen ganz ohne Installation.",
        "h1": "Übersteh die Hitzewelle — die besten Kühlgeräte ohne Installation",
        "sub": "EcoBack ist dein Raumklima- und Energie-Ratgeber für das ganze Jahr. Jetzt im Sommer: tragbare Klimaanlagen, Luftkühler und Ventilatoren, die du heute bestellst und in Minuten aufstellst — verglichen nach Preis-Leistung auf Amazon.de.",
        "badge": "🔥 Hitzewelle 2026 · wöchentlich aktualisiert",
        "teaser": [
            ("🌡️", "Hitze-Check: Wie heiß wird dein Zimmer?", "/guide/hitze-check.html"),
            ("🧮", "BTU-Rechner: Kühlleistung in 30 Sekunden", "/guide/btu-rechner.html"),
            ("❄️", "Beste tragbare Klimaanlage 2026", "/guide/beste-tragbare-klimaanlage-hitzewelle.html"),
            ("☀️", "Balkon-Check: Lohnt sich Solar bei dir?", "/guide/balkonkraftwerk-standort-check.html"),
            ("💶", "Balkonspeicher-Förderung: Wer zahlt was dazu?", "/guide/balkonspeicher-foerderung.html"),
            ("🛒", "Alle Kühlgeräte", "/kategorie/klimaanlagen.html"),
        ],
    },
    "herbst": {
        "title": "Luftentfeuchter gegen Schimmel & clever heizen | EcoBack",
        "desc": "Feuchte Wohnung im Herbst? Luftentfeuchter gegen Schimmel, Klimaanlage richtig einlagern und stromsparend heizen — Rechner und ehrliche Empfehlungen.",
        "h1": "Feuchte Wohnung im Herbst? Schimmel stoppen, clever heizen",
        "sub": "EcoBack ist dein Raumklima- und Energie-Ratgeber für das ganze Jahr. Jetzt im Herbst: Wäsche trocknet drinnen, Fenster beschlagen — die richtige Zeit für Luftentfeuchter, Geräte-Einlagerung und den Heiz-Check vor dem Winter.",
        "badge": "🍂 Herbst · Schimmel vorbeugen & Heiz-Check",
        # Targets picked from D1, not by hand — same correction the season bridge
        # got on 2026-08-27, applied to the component that fix did not touch.
        # The previous six slots were hand-chosen and, measured over 28 days,
        # carried 0 affiliate clicks between them: luftentfeuchter-gegen-schimmel
        # has never recorded a single row, keller-lueften-sommer likewise,
        # ueberwintern 11 pv / 0 aff, heizluefter-stromverbrauch 1 pv / 0 aff.
        # Two further slots pointed at Balkonspeicher, i.e. the energy section the
        # owner degraded on 2026-08-26 — the autumn hero is the wrong place to
        # re-promote it. Meanwhile the pages that actually earn in this cluster
        # were absent: luftentfeuchter-40-qm (4 pv / 3 aff — the best autumn
        # converter on the site), stinkt-schimmel (15 pv / 2 aff — the most-read
        # autumn page), mit-heizfunktion (5 pv / 1 aff, and it carries summer AC
        # owners into the heating season).
        # Two slots go to pages published 2026-08-26 that answer the largest
        # verified demand in trends-rising.json ("schimmel im keller entfernen"
        # v=108.750, "sparsamer heizlüfter" v=32.000). They have no traffic yet
        # because they are days old; a homepage link is the internal equity that
        # gets them crawled and ranked. That is the point of the slot, not a
        # reward for traffic they do not have.
        "teaser": [
            ("💧", "Luftentfeuchter für 40 m²: wie viel Liter/Tag?", "/guide/luftentfeuchter-40-qm.html"),
            ("🦠", "Schimmel im Keller entfernen", "/guide/schimmel-im-keller-entfernen.html"),
            ("🌬️", "Klimaanlage stinkt? Schimmel-Geruch loswerden", "/guide/mobile-klimaanlage-stinkt-schimmel.html"),
            ("🔥", "Heizlüfter stromsparend: welcher lohnt sich?", "/guide/heizluefter-stromsparend.html"),
            ("♨️", "Klimaanlage mit Heizfunktion: lohnt sich das?", "/guide/klimaanlage-mit-heizfunktion.html"),
            ("🛒", "Alles für Luftqualität", "/kategorie/luftqualitaet.html"),
        ],
    },
    "winter": {
        "title": "Effizient heizen 2026/27: Rechner & Empfehlungen | EcoBack",
        "desc": "Warm durch den Winter ohne Strom-Schock: Infrarotheizung, stromsparende Heizlüfter und Heizkosten-Rechner — ehrliche Empfehlungen statt Werbeversprechen.",
        "h1": "Warm durch den Winter — ohne Strom-Schock",
        "sub": "EcoBack ist dein Raumklima- und Energie-Ratgeber für das ganze Jahr. Jetzt im Winter: Welche Zusatzheizung lohnt sich wirklich, was kostet sie pro Stunde — und wo verheizt du unnötig Geld? Rechner und ehrliche Antworten.",
        "badge": "❄️ Winter · Heizkosten im Griff",
        "teaser": [
            ("🔥", "Infrarotheizung: Für wen lohnt sie sich?", "/guide/infrarotheizung-ratgeber.html"),
            ("🧮", "Watt-Rechner für Infrarotheizungen", "/guide/infrarotheizung-watt-rechner.html"),
            ("⚡", "Stromkosten-Rechner", "/guide/stromkosten-rechner.html"),
            ("🛒", "Alles zum Heizen", "/kategorie/heizen.html"),
        ],
    },
    "fruehjahr": {
        "title": "Luftreiniger gegen Pollen & Hitzeschutz planen | EcoBack",
        "desc": "Frühjahr: Luftreiniger gegen Pollen und Staub — und der beste Zeitpunkt, Hitzeschutz und Klimaanlage vor dem Sommer-Ansturm zu planen. Ehrliche Empfehlungen.",
        "h1": "Pollen draußen halten — und den Sommer früh planen",
        "sub": "EcoBack ist dein Raumklima- und Energie-Ratgeber für das ganze Jahr. Jetzt im Frühjahr: Luftreiniger gegen Pollen, Hitzeschutz ans Fenster — und Klimageräte kaufen, bevor die erste Hitzewelle die Preise treibt.",
        "badge": "🌷 Frühjahr · Pollen & früher Hitzeschutz",
        "teaser": [
            ("🌬️", "Luftreiniger gegen Pollen & Staub", "/guide/luftreiniger-ratgeber.html"),
            ("🪟", "Hitzeschutz fürs Fenster", "/guide/hitzeschutz-fenster.html"),
            ("☀️", "Balkon-Check: Lohnt sich Solar bei dir?", "/guide/balkonkraftwerk-standort-check.html"),
            ("🧮", "BTU-Rechner: jetzt in Ruhe planen", "/guide/btu-rechner.html"),
            ("🛒", "Energie sparen", "/kategorie/energie-sparen.html"),
        ],
    },
}

# Homepage video rail, rotated with the season. Independent German review
# videos (verified to exist via search); same click-to-load facade as the guide
# pages — zero external requests before the visitor clicks (GDPR + CWV safe).
# 2026-08-29 owner「首页图片和视频很少」: one slot became a three-card rail; every
# card deep-links its money page, all ids reused from the verified VIDEOS pool.
# season -> [(video_id, title, guide_href, guide_label), ×3]
DE_SEASON_VIDEOS = {
    "sommer": [
        ("l8z9FzMbpj8", "Die beste mobile Klimaanlage 2026? De'Longhi Pinguino PAC EX105 im Video-Test",
         "/guide/beste-tragbare-klimaanlage-hitzewelle.html", "Ratgeber: Beste tragbare Klimaanlage →"),
        ("7sooX2zoH0c", "De'Longhi Pinguino PAC EX105 im Test: Wie leise ist sie wirklich?",
         "/guide/pinguino-pac-ex105-test.html", "Test-Überblick: PAC EX105 →"),
        ("zIZ1kfab3LQ", "Ventilator-Test: MeacoFan 1056, Midea & Rowenta im Vergleich",
         "/guide/ventilator-kaufen-ratgeber.html", "Ratgeber: Ventilator kaufen →"),
    ],
    # Retargeted 2026-08-28: CTA targets are D1-verified read pages, not zero-pv
    # destinations. The Comfee MDDF-20DEN7 in the lead video is discussed on the
    # sizing page too, so video and destination still match.
    "herbst": [
        ("mBSS57P_rl4", "Comfee MDDF-20DEN7 Luftentfeuchter im Video-Test",
         "/guide/luftentfeuchter-40-qm.html", "Ratgeber: Luftentfeuchter für 40 m² →"),
        ("NCdYI6HdQi8", "Nie wieder Schimmel: Comfee-Luftentfeuchter im Praxiseinsatz (Video)",
         "/guide/luftentfeuchter-gegen-schimmel.html", "Ratgeber: Luftentfeuchter gegen Schimmel →"),
        ("pTbLIJzfJoQ", "Balkonkraftwerk mit Speicher: Top 5 im Test (2026)",
         "/guide/balkonkraftwerk-lohnt-sich-rechner.html", "Rechner: Lohnt sich ein Balkonkraftwerk? →"),
    ],
    "winter": [
        ("x1S_Y7b9bvc", "Infrarotheizung im Härtetest: Reichen 400 W für 8 m² im Winter?",
         "/guide/infrarotheizung-watt-rechner.html", "Watt-Rechner für Infrarotheizungen →"),
        ("NCdYI6HdQi8", "Nie wieder Schimmel: Comfee-Luftentfeuchter im Praxiseinsatz (Video)",
         "/guide/luftentfeuchter-gegen-schimmel.html", "Ratgeber: Luftentfeuchter gegen Schimmel →"),
        ("WCKVwHAHUhs", "Lüftung, Heizung und Schimmelprävention im Keller — praktische Tipps (Video)",
         "/guide/keller-lueften-sommer.html", "Ratgeber: Keller richtig lüften →"),
    ],
    "fruehjahr": [
        ("pTbLIJzfJoQ", "Balkonkraftwerk mit Speicher: Top 5 im Test (2026)",
         "/guide/balkonkraftwerk-lohnt-sich-rechner.html", "Rechner: Lohnt sich ein Balkonkraftwerk? →"),
        ("l8z9FzMbpj8", "Die beste mobile Klimaanlage 2026? De'Longhi Pinguino PAC EX105 im Video-Test",
         "/guide/beste-tragbare-klimaanlage-hitzewelle.html", "Ratgeber: Beste tragbare Klimaanlage →"),
        ("zIZ1kfab3LQ", "Ventilator-Test: MeacoFan 1056, Midea & Rowenta im Vergleich",
         "/guide/ventilator-kaufen-ratgeber.html", "Ratgeber: Ventilator kaufen →"),
    ],
}


def season_video_html(season):
    cards = ""
    for vid, title, href, label in DE_SEASON_VIDEOS[season]:
        cards += (
            '<div class="eb-video" style="flex:1 1 300px;min-width:260px;">'
            f'<button type="button" class="eb-video-fac" data-id="{vid}" aria-label="Video abspielen">'
            '<span class="eb-video-badge">▷ VIDEO</span>'
            '<span class="eb-video-play" aria-hidden="true">▶</span>'
            f'<span class="eb-video-t" style="font-size:14px;">{title}</span>'
            '<span class="eb-video-src">Externes YouTube-Video · klick zum Abspielen</span></button>'
            f'<p class="eb-video-note" style="margin-top:6px;"><a href="{href}">{label}</a></p></div>')
    return (
        '<!--EB_SEASON_VIDEO--><section style="padding:44px 0;background:#fff;">'
        '<div style="max-width:1000px;margin:0 auto;padding:0 20px;">'
        '<div class="eb-video-hd" style="font-weight:800;font-size:19px;margin:0 0 4px;">🎬 Im Video geprüft</div>'
        '<p style="margin:0 0 14px;color:#5b6b78;font-size:13.5px;">Unabhängige Testvideos zu Geräten, '
        'die wir empfehlen — wir testen nicht selbst, wir zeigen die, die es tun.</p>'
        f'<div style="display:flex;gap:16px;flex-wrap:wrap;">{cards}</div>'
        '<p class="eb-video-note">Externe Videos von YouTube. Erst beim Klick werden Daten an YouTube (Google) '
        'übertragen — siehe <a href="/datenschutz.html">Datenschutz</a>.</p>'
        '<script>(function(){var s=document.currentScript.parentNode;'
        's.querySelectorAll(".eb-video-fac").forEach(function(f){'
        'f.addEventListener("click",function(){var id=f.getAttribute("data-id");'
        'var w=document.createElement("div");w.className="eb-video-frame";'
        'w.innerHTML=\'<iframe src="https://www.youtube-nocookie.com/embed/\'+id+\'?autoplay=1" '
        'title="Video" loading="lazy" allow="autoplay; encrypted-media; picture-in-picture" '
        'allowfullscreen></iframe>\';f.parentNode.replaceChild(w,f);'
        'if(window.gtag)gtag("event","video_play",{video_id:id,source:"home"});});});})();</script>'
        '</div></section><!--/EB_SEASON_VIDEO-->')


EN_SUB = {
    "sommer": "EcoBack is your year-round home climate guide. Right now in summer: portable air conditioners, air coolers and fans you can order today and set up in minutes — compared by value on Amazon.de so you don't overpay during the shortage.",
    "other": "EcoBack is your year-round home climate guide. Off heat season is the smartest time to buy: compare portable air conditioners and coolers in peace, before the first heatwave drives prices up.",
}
EN_BADGE = {
    "sommer": "🔥 Europe Heatwave 2026 · Updated weekly",
    "other": "🧊 Plan ahead · best prices off-season",
}


def swap(html, pattern, replacement, label, count=1):
    new, n = re.subn(pattern, replacement, html, count=count, flags=re.S)
    if n == 0:
        print(f"  WARN: no match for {label}")
    return new


def teaser_html(items, head):
    links = "".join(
        f'<a href="{href}" style="display:inline-flex;align-items:center;gap:7px;background:#fff;'
        f'border:1px solid #e4ebf0;border-radius:10px;padding:9px 14px;text-decoration:none;'
        f'color:#1a2733;font-weight:700;font-size:13.5px;">{emoji} {txt}</a>'
        for emoji, txt, href in items)
    return ("<!--EB_SEASON--><section style=\"background:#f0f6fa;border-bottom:1px solid #e4ebf0;\">"
            "<div style=\"max-width:960px;margin:0 auto;padding:14px 20px;display:flex;align-items:center;"
            "gap:10px 12px;flex-wrap:wrap;\">"
            f"<strong style=\"font-size:13.5px;color:#0a4d7a;white-space:nowrap;\">{head}</strong>"
            f"{links}</div></section><!--/EB_SEASON-->")


def rotate_de(season):
    cfg = DE_SEASONS[season]
    html = open(DE, encoding="utf-8").read()
    html = swap(html, r'<title>.*?</title>', lambda m: f'<title>{cfg["title"]}</title>', "title")
    html = swap(html, r'<meta name="description" content="[^"]*"',
                lambda m: f'<meta name="description" content="{cfg["desc"]}"', "meta desc")
    html = swap(html, r'<meta property="og:title" content="[^"]*"',
                lambda m: f'<meta property="og:title" content="{cfg["title"]}"', "og:title")
    html = swap(html, r'<meta property="og:description" content="[^"]*"',
                lambda m: f'<meta property="og:description" content="{cfg["desc"]}"', "og:description")
    html = swap(html, r'(<header class="hero">.*?)<h1>.*?</h1>',
                lambda m: m.group(1) + f'<h1>{cfg["h1"]}</h1>', "hero h1")
    html = swap(html, r'<p class="sub">.*?</p>', lambda m: f'<p class="sub">{cfg["sub"]}</p>', "hero sub")
    html = swap(html, r'<span class="badge">.*?</span>',
                lambda m: f'<span class="badge">{cfg["badge"]}</span>', "badge")
    strip = teaser_html(cfg["teaser"], "Jetzt in der Saison:")
    if "<!--EB_SEASON-->" in html:
        html = re.sub(r'<!--EB_SEASON-->.*?<!--/EB_SEASON-->', lambda m: strip, html, flags=re.S)
    else:
        html = html.replace("</header>", "</header>\n" + strip, 1)
    # Video slot lives high on the page — right after the product grid, inside
    # the shopping flow — not at the bottom where nobody scrolls. Strip any
    # existing block first so the anchor can move without leaving duplicates.
    video = season_video_html(season)
    html = re.sub(r'\n?<!--EB_SEASON_VIDEO-->.*?<!--/EB_SEASON_VIDEO-->', '', html, flags=re.S)
    m = re.search(r'<section[^>]*id="situationen"', html)
    if m:
        html = html[:m.start()] + video + "\n" + html[m.start():]
    elif "<!--EB_POPULAR-->" in html:
        html = html.replace("<!--EB_POPULAR-->", video + "\n<!--EB_POPULAR-->", 1)
    else:
        print("  WARN: no anchor for season video")
    open(DE, "w", encoding="utf-8").write(html)
    print(f"DE homepage rotated to: {season}")


def rotate_en(season):
    key = "sommer" if season == "sommer" else "other"
    html = open(EN, encoding="utf-8").read()
    html = swap(html, r'<p class="sub">.*?</p>', lambda m: f'<p class="sub">{EN_SUB[key]}</p>', "EN hero sub")
    html = swap(html, r'<span class="badge">.*?</span>',
                lambda m: f'<span class="badge">{EN_BADGE[key]}</span>', "EN badge")
    open(EN, "w", encoding="utf-8").write(html)
    print(f"EN homepage rotated to: {key}")


def main():
    month = None
    if "--month" in sys.argv:
        month = int(sys.argv[sys.argv.index("--month") + 1])
    if month is None:
        month = datetime.date.today().month
    season = season_of(month)
    print(f"month={month} → season={season}")
    rotate_de(season)
    rotate_en(season)


if __name__ == "__main__":
    main()
