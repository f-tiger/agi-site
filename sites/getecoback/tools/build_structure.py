#!/usr/bin/env python3
"""Turn the page collection into a *structured, professional* site.

Two jobs, both idempotent (safe to re-run, covers future pages automatically):

1. Generate category hub pages (site/kategorie/*.html) from the guide articles,
   grouped by category — real browsable landing pages + internal-link hubs.
2. Inject site-wide chrome into every German page: a sticky top navigation, a
   rich multi-column footer (categories / about / legal), and <head> polish
   (favicon, web manifest, theme-color). Markers make re-runs replace-in-place
   instead of duplicating.

English pages under /en/ and the standalone 404 are left untouched.

Run: python3 tools/build_structure.py   (then python3 tools/build_sitemap.py)
"""
import os, re, glob, json, urllib.parse, html as htmllib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, "site")
GUIDE = os.path.join(SITE, "guide")
KAT = os.path.join(SITE, "kategorie")
GA4 = "G-E2V0Q9SJ9V"

CATEGORIES = [
    ("klimaanlagen", "Klimaanlagen & Kühlen",
     "Tragbare Klimaanlagen, Ventilatoren, Luftkühler und Kühlung ohne Bohren — für Mietwohnung und Altbau: nach Fenstertyp, Raumgröße und Budget."),
    ("heizen", "Heizen",
     "Effizient heizen: Klimaanlagen mit Heizfunktion, stromsparende Heizlüfter und Infrarotheizung."),
    ("luftqualitaet", "Luftqualität",
     "Luftentfeuchter gegen Schimmel, Luftreiniger gegen Pollen und Staub sowie die richtige Gerätepflege."),
    ("energie-sparen", "Energie sparen",
     "Stromkosten senken mit Balkonkraftwerk & Speicher, Hitzeschutz am Fenster und clevere Energiespar-Maßnahmen für den Haushalt."),
]
CAT_TITLE = {k: t for k, t, _ in CATEGORIES}
CAT_DESC = {k: d for k, _, d in CATEGORIES}
CAT_SHORT = {"klimaanlagen": "Klimaanlagen", "heizen": "Heizen",
             "luftqualitaet": "Luftqualität", "energie-sparen": "Energie sparen"}
# Entity anchoring for AI engines: verifiable Wikipedia URLs only (no invented QIDs).
CAT_WIKI = {"klimaanlagen": "https://de.wikipedia.org/wiki/Klimaanlage",
            "heizen": "https://de.wikipedia.org/wiki/Heizung",
            "luftqualitaet": "https://de.wikipedia.org/wiki/Luftqualit%C3%A4t",
            "energie-sparen": "https://de.wikipedia.org/wiki/Energieeinsparung"}

# explicit assignments; everything else in /guide → klimaanlagen
CAT_OF = {
    # Bodenpflege pages file under Luftqualität until the family is big enough
    # for its own category (>=4 pages): floor dust IS indoor air quality, and
    # that bridge is why the vertical lives on this domain at all.
    "tineco-saugt-nicht-mehr": "luftqualitaet",
    "klimaanlage-mit-heizfunktion": "heizen",
    "heizluefter-stromsparend": "heizen",
    "heizkosten-senken-als-mieter": "heizen",
    "infrarotheizung-ratgeber": "heizen",
    "luftentfeuchter-ratgeber": "luftqualitaet",
    "wohnmobil-feuchtigkeit-winter": "luftqualitaet",
    "fenster-beschlagen-innen": "luftqualitaet",
    "luftreiniger-ratgeber": "luftqualitaet",
    "klimaanlage-reinigen": "luftqualitaet",
    "klimaanlage-stromkosten": "energie-sparen",
    "treiben-rechenzentren-die-strompreise": "energie-sparen",
    "strom-sparen-haushalt": "energie-sparen",
    "thermovorhang-ratgeber": "energie-sparen",
    "hitzeschutz-fenster": "energie-sparen",
    "balkon-terrasse-beschatten": "energie-sparen",
}

NAV = ("<!--EB_NAV--><nav class=\"eb-nav\"><div class=\"eb-nav-in\">"
       "<a class=\"eb-logo\" href=\"/\">❄️ EcoBack</a>"
       "<div class=\"eb-links\">"
       "<a href=\"/kategorie/heizen.html\">Heizen</a>"
       "<a href=\"/kategorie/luftqualitaet.html\">Luftqualität</a>"
       "<a href=\"/kategorie/klimaanlagen.html\">Klimaanlagen</a>"
       "<a href=\"/kategorie/energie-sparen.html\">Energie sparen</a>"
       "<a class=\"eb-nav-tools\" href=\"/tools.html\">🧮 Tools</a>"
       "</div></div></nav><!--/EB_NAV-->\n")

FOOTER = ("<!--EB_FOOTER--><footer class=\"eb-footer\"><div class=\"eb-footer-in\">"
          "<div><strong>Kategorien</strong>"
          "<a href=\"/kategorie/heizen.html\">Heizen</a>"
          "<a href=\"/kategorie/luftqualitaet.html\">Luftqualität</a>"
          "<a href=\"/kategorie/klimaanlagen.html\">Klimaanlagen &amp; Kühlen</a>"
          "<a href=\"/kategorie/energie-sparen.html\">Energie sparen</a></div>"
          "<div><strong>EcoBack</strong>"
          "<a href=\"/tools.html\">🧮 Alle Rechner &amp; Checks</a>"
          "<a href=\"/widgets.html\">🧩 Widgets für deine Website</a>"
          "<a href=\"/hitze-radar.html\">🌡️ Hitze-Radar</a>"
          "<a href=\"/ueber-uns.html\">Über uns</a>"
          "<a href=\"/wie-wir-empfehlen.html\">Wie wir empfehlen</a>"
          "<a href=\"/kontakt.html\">Kontakt</a></div>"
          "<div><strong>Rechtliches</strong>"
          "<a href=\"/impressum.html\">Impressum</a>"
          "<a href=\"/datenschutz.html\">Datenschutz</a></div>"
          "</div><div class=\"eb-footer-legal\">Als Amazon-Partner verdient EcoBack an "
          "qualifizierten Käufen. Produktlinks sind Affiliate-Links — du zahlst denselben "
          "Preis. © 2026 EcoBack</div></footer><!--/EB_FOOTER-->")

RADAR = (
    "<!--EB_RADAR--><section style=\"max-width:720px;margin:26px auto 0;padding:0 20px;\">"
    "<div style=\"background:#eaf6ff;border:1px solid #cfe6fa;border-radius:12px;padding:18px 20px;\">"
    "<p style=\"font-weight:800;margin:0 0 4px;font-size:16px;\">🌡️ Kostenloser Hitze-Radar</p>"
    "<p style=\"margin:0 0 12px;color:#26333d;font-size:14.5px;\">Sei vor der nächsten Hitzewelle da: "
    "E-Mail-Alarm, bevor die Geräte ausverkauft sind — plus Preis-Alarm für empfohlene Modelle. <strong>Ehrlich vorab:</strong> Der Versand ist noch im Aufbau. Bis er steht, bekommst du keine E-Mails von uns — du stehst dann aber von der ersten Warnung an auf der Liste.</p>"
    "<form class=\"eb-radar\" data-source=\"guide-inline\" novalidate>"
    "<div style=\"display:flex;gap:8px;flex-wrap:wrap;\">"
    "<input type=\"email\" required placeholder=\"du@beispiel.de\" autocomplete=\"email\" "
    "style=\"flex:1 1 200px;padding:10px 12px;border:1px solid #cfd8e0;border-radius:8px;font-size:16px;\">"
    "<button type=\"submit\" style=\"background:#f59e0b;color:#1a2733;border:none;padding:10px 18px;"
    "border-radius:8px;font-weight:800;font-size:15px;cursor:pointer;white-space:nowrap;\">Anmelden</button></div>"
    "<label style=\"display:flex;gap:8px;align-items:flex-start;margin-top:10px;font-size:12.5px;color:#455;\">"
    "<input type=\"checkbox\" required style=\"margin-top:3px;flex:none;\">"
    "<span class=\"eb-radar-consent-text\">Ja, schickt mir den kostenlosen Hitze-Radar per E-Mail. "
    "Jederzeit abbestellbar. <a href=\"/datenschutz.html\" target=\"_blank\" rel=\"noopener\">Datenschutz</a>.</span></label>"
    "<p class=\"eb-radar-msg\" style=\"display:none;margin-top:10px;font-size:14px;\" role=\"status\" aria-live=\"polite\"></p>"
    "</form></div></section>\n<script src=\"/js/radar.js\" defer></script><!--/EB_RADAR-->\n")

EN_RADAR = (
    "<!--EB_RADAR--><section style=\"max-width:720px;margin:26px auto 0;padding:0 20px;\">"
    "<div style=\"background:#eaf6ff;border:1px solid #cfe6fa;border-radius:12px;padding:18px 20px;\">"
    "<p style=\"font-weight:800;margin:0 0 4px;font-size:16px;\">🌡️ Free Heat Radar</p>"
    "<p style=\"margin:0 0 12px;color:#26333d;font-size:14.5px;\">Be ready before the next heatwave: "
    "an email alert before units sell out — plus a price alert on recommended models. <strong>Straight up:</strong> sending is still being built. Until it is you will get no emails from us — but you will be on the list from the very first alert.</p>"
    "<form class=\"eb-radar\" data-locale=\"en\" data-source=\"guide-inline-en\" novalidate>"
    "<div style=\"display:flex;gap:8px;flex-wrap:wrap;\">"
    "<input type=\"email\" required placeholder=\"you@example.com\" autocomplete=\"email\" "
    "style=\"flex:1 1 200px;padding:10px 12px;border:1px solid #cfd8e0;border-radius:8px;font-size:16px;\">"
    "<button type=\"submit\" style=\"background:#f59e0b;color:#1a2733;border:none;padding:10px 18px;"
    "border-radius:8px;font-weight:800;font-size:15px;cursor:pointer;white-space:nowrap;\">Sign up</button></div>"
    "<label style=\"display:flex;gap:8px;align-items:flex-start;margin-top:10px;font-size:12.5px;color:#455;\">"
    "<input type=\"checkbox\" required style=\"margin-top:3px;flex:none;\">"
    "<span class=\"eb-radar-consent-text\">Yes, email me the free Heat Radar. "
    "Unsubscribe anytime. <a href=\"/datenschutz.html\" target=\"_blank\" rel=\"noopener\">Privacy</a>.</span></label>"
    "<p class=\"eb-radar-msg\" style=\"display:none;margin-top:10px;font-size:14px;\" role=\"status\" aria-live=\"polite\"></p>"
    "</form></div></section>\n<script src=\"/js/radar.js\" defer></script><!--/EB_RADAR-->\n")

EN_NAV = ("<!--EB_NAV--><nav class=\"eb-nav\"><div class=\"eb-nav-in\">"
          "<a class=\"eb-logo\" href=\"/en/\">❄️ EcoBack</a>"
          "<div class=\"eb-links\">"
          "<a href=\"/en/\">All Guides</a>"
          "<a class=\"eb-nav-tools\" href=\"/tools.html\">🧮 Tools</a>"
          "<a href=\"/\">🇩🇪 Deutsch</a>"
          "</div></div></nav><!--/EB_NAV-->\n")

EN_FOOTER = ("<!--EB_FOOTER--><footer class=\"eb-footer\"><div class=\"eb-footer-in\">"
             "<div><strong>EcoBack</strong>"
             "<a href=\"/tools.html\">🧮 All calculators</a>"
             "<a href=\"/en/heat-radar.html\">🌡️ Heat Radar</a>"
             "<a href=\"/en/\">All Guides</a>"
             "<a href=\"/\">Deutsche Version</a></div>"
             "<div><strong>Legal</strong>"
             "<a href=\"/impressum.html\">Impressum</a>"
             "<a href=\"/datenschutz.html\">Datenschutz / Privacy</a></div>"
             "</div><div class=\"eb-footer-legal\">As an Amazon Associate EcoBack earns "
             "from qualifying purchases. Product links are affiliate links — you pay the "
             "same price. © 2026 EcoBack</div></footer><!--/EB_FOOTER-->")

# Resource hints for the only render-path third party (GA4 gtag): warm up the
# DNS + TCP + TLS handshake early so the analytics script — and anything it
# gates — connects faster. Pure connection-setup win, no effect on data capture.
PERF_HINTS = ("<!--eb-perf-->"
              "<link rel=\"preconnect\" href=\"https://www.googletagmanager.com\" crossorigin>"
              "<link rel=\"dns-prefetch\" href=\"https://www.googletagmanager.com\">\n")

# The site-wide chrome stylesheet. Replaced in-place on every run (see
# inject_chrome) so new rules — e.g. the transaction layer below — propagate to
# all already-built pages, not just freshly created ones.
CHROME_STYLE = ("<style id=\"eb-chrome\">"
              # Comparison tables overflowed a 390 px viewport (found 2026-08-31 on
              # split-klimaanlage-ohne-kernbohrung: 412 px table, 390 px screen, so
              # the whole page scrolled sideways). 45 pages carry table.cmp, and a
              # comparison table is this site's most-cited element type — letting it
              # scroll inside its own box beats letting it drag the page with it.
              # .cmp itself is defined per page, so the fix belongs in the one
              # stylesheet that is injected everywhere and replaced in place.
              # ...and it is not only table.cmp: the most-cited page on the site
              # (klimaanlage-reinigen, 109 citations) overflowed on an UNCLASSED
              # maintenance table added on 08-28. This site has no layout tables,
              # so every table is a content table and every one of them may scroll
              # inside its own box rather than drag the page sideways.
              "@media(max-width:560px){table{display:block;overflow-x:auto;max-width:100%}}"
              ".eb-nav{position:sticky;top:0;z-index:100;background:#0a4d7a}"
              ".eb-nav-in{max-width:1000px;margin:0 auto;padding:10px 20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px 16px}"
              ".eb-nav a{text-decoration:none}"
              ".eb-logo{color:#fff;font-weight:800;font-size:18px}"
              ".eb-links{display:flex;gap:14px;flex-wrap:wrap}"
              ".eb-links a{color:rgba(255,255,255,.9);font-size:14px}"
              ".eb-links a:hover{color:#fff;text-decoration:underline}"
              ".eb-links a.eb-nav-tools{background:#f59e0b;color:#1a2733;font-weight:800;padding:5px 12px;border-radius:8px}"
              ".eb-links a.eb-nav-tools:hover{background:#e08c05;color:#1a2733;text-decoration:none}"
              ".eb-footer{background:#0a2a40;color:#cdd9e3;padding:36px 20px 30px;margin-top:40px}"
              ".eb-footer-in{max-width:1000px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:24px}"
              ".eb-footer-in strong{color:#fff;display:block;margin-bottom:8px;font-size:15px}"
              ".eb-footer-in a{color:#cdd9e3;text-decoration:none;display:block;margin:5px 0;font-size:14px}"
              ".eb-footer-in a:hover{color:#fff}"
              ".eb-footer-legal{max-width:1000px;margin:24px auto 0;border-top:1px solid #1c3d54;padding-top:16px;font-size:13px;color:#8ea6b6}"
              ".eb-cards{margin:18px 0}"
              ".eb-card{background:#fff;border:1px solid #e4ebf0;border-radius:12px;padding:16px 18px;margin:12px 0}"
              ".eb-card a{font-weight:700;text-decoration:none}"
              ".eb-card p{margin:6px 0 0;color:#5b6b78;font-size:14px}"
              # --- transaction layer (breadcrumb / trust bar / sticky CTA / shop grid) ---
              ".eb-crumb{max-width:1000px;margin:0 auto;padding:10px 20px 0;font-size:13px;color:#5b6b78}"
              ".eb-crumb a{color:#0f6ba8;text-decoration:none}.eb-crumb a:hover{text-decoration:underline}"
              ".eb-crumb span{color:#9aa7b2;margin:0 3px}"
              ".eb-trust{max-width:1000px;margin:8px auto 0;padding:8px 20px;display:flex;flex-wrap:wrap;gap:4px 14px;align-items:center;font-size:12.5px;color:#4a5a67;border-bottom:1px solid #eef2f5}"
              ".eb-trust b{font-weight:700;color:#2f6b3f}"
              ".eb-trust a{color:#0f6ba8;text-decoration:none;font-weight:700}.eb-trust a:hover{text-decoration:underline}"
              ".eb-sticky{position:fixed;left:0;right:0;bottom:0;z-index:200;background:#0a4d7a;color:#fff;display:none;align-items:center;gap:10px;padding:9px 14px;box-shadow:0 -2px 12px rgba(0,0,0,.2)}"
              ".eb-sticky strong{font-size:13px;font-weight:700;flex:1;line-height:1.25}"
              ".eb-sticky a.eb-sticky-cta{background:#f59e0b;color:#1a2733;font-weight:800;padding:9px 14px;border-radius:8px;text-decoration:none;font-size:13.5px;white-space:nowrap}"
              ".eb-sticky button{background:transparent;border:none;color:rgba(255,255,255,.7);font-size:22px;line-height:1;cursor:pointer;padding:0 2px}"
              "@media(max-width:720px){.eb-sticky.on{display:flex}body.eb-has-sticky{padding-bottom:62px}}"
              ".eb-shop{max-width:1000px;margin:0 auto;padding:8px 20px 0}"
              ".eb-shop h2,.eb-shop .eb-shop-h{font-size:21px;font-weight:800;margin:20px 0 4px}"
              ".eb-shop .eb-shop-sub{color:#5b6b78;font-size:14px;margin:0 0 16px}"
              ".eb-shop-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px}"
              ".eb-shop-card{background:#fff;border:1px solid #e4ebf0;border-radius:14px;overflow:hidden;display:flex;flex-direction:column;transition:box-shadow .15s,transform .15s}"
              ".eb-shop-card:hover{box-shadow:0 10px 24px rgba(15,107,168,.13);transform:translateY(-3px)}"
              ".eb-shop-card .th{height:120px;display:flex;align-items:center;justify-content:center;position:relative}"
              ".eb-shop-card .th svg{width:74px;height:74px}"
              ".eb-shop-card .rl{position:absolute;top:9px;left:9px;background:rgba(255,255,255,.92);color:#0a4d7a;font-size:11px;font-weight:800;padding:3px 10px;border-radius:20px}"
              ".eb-shop-card .bd{padding:12px 14px 14px;display:flex;flex-direction:column;flex:1}"
              ".eb-shop-card .bd h3{font-size:15px;margin:0 0 3px}"
              ".eb-shop-card .bd .ds{color:#5b6b78;font-size:12.5px;margin:0 0 9px;flex:1;line-height:1.45}"
              ".eb-shop-card .pr{font-weight:800;color:#2ea86b;font-size:14px;margin-bottom:9px}"
              ".eb-shop-card .go{display:block;text-align:center;background:#f59e0b;color:#1a2733;padding:9px;border-radius:8px;font-weight:800;text-decoration:none;font-size:13.5px}"
              ".eb-shop-card .go:hover{background:#e08c05}"
              # --- micro-animations on device line-art (reduced-motion safe) ---
              ".eb-spin,.eb-drip{transform-box:fill-box;transform-origin:center}"
              "@media(prefers-reduced-motion:no-preference){"
              ".eb-spin{animation:ebspin 3.6s linear infinite}"
              ".eb-flow{stroke-dasharray:5 6;animation:ebflow 1.3s linear infinite}"
              ".eb-wave{animation:ebwave 2.2s ease-in-out infinite}"
              ".eb-wave:nth-of-type(2){animation-delay:.3s}"
              ".eb-drip{animation:ebdrip 2.6s ease-in-out infinite}"
              ".eb-ex .out{transform-box:fill-box;animation:ebout 2.2s ease-in infinite}"
              ".eb-ex .out2{transform-box:fill-box;animation:ebout 2.2s ease-in infinite;animation-delay:1.1s}"
              ".eb-ex .in{transform-box:fill-box;animation:ebin 2.6s ease-out infinite}"
              ".eb-ex .in2{transform-box:fill-box;animation:ebin 2.6s ease-out infinite;animation-delay:1.3s}"
              ".eb-ex .drop{transform-box:fill-box;animation:ebdropfall 2.2s ease-in infinite}"
              ".eb-ex .drop2{transform-box:fill-box;animation:ebdropfall 2.2s ease-in infinite;animation-delay:1.1s}"
              ".eb-ex .blade{transform-box:fill-box;transform-origin:center;animation:ebspin 1.4s linear infinite}"
              ".eb-ex .puff{transform-box:fill-box;animation:ebpuff 2.4s ease-out infinite}"
              ".eb-ex .puff2{transform-box:fill-box;animation:ebpuff 2.4s ease-out infinite;animation-delay:.8s}"
              ".eb-ex .puff3{transform-box:fill-box;animation:ebpuff 2.4s ease-out infinite;animation-delay:1.6s}"
              "}"
              "@keyframes ebspin{to{transform:rotate(360deg)}}"
              "@keyframes ebflow{to{stroke-dashoffset:-11}}"
              "@keyframes ebwave{0%,100%{transform:translateY(0)}50%{transform:translateY(-2px)}}"
              "@keyframes ebdrip{0%,55%{transform:translateY(0);opacity:1}82%{transform:translateY(4px);opacity:.35}100%{transform:translateY(0);opacity:1}}"
              "@keyframes ebout{0%{opacity:0;transform:translateX(0)}25%{opacity:1}100%{opacity:0;transform:translateX(24px)}}"
              "@keyframes ebin{0%{opacity:0;transform:translateX(0)}25%{opacity:1}100%{opacity:0;transform:translateX(-42px)}}"
              "@keyframes ebdropfall{0%{opacity:0;transform:translateY(0)}25%{opacity:1}100%{opacity:0;transform:translateY(18px)}}"
              "@keyframes ebpuff{0%{opacity:0;transform:translateX(0) scale(.7)}30%{opacity:.9}100%{opacity:0;transform:translateX(-46px) scale(1.1)}}"
              # --- animated explainer ("video-like") ---
              ".eb-explainer{max-width:1000px;margin:10px auto 0;padding:0 20px}"
              ".eb-explainer .ex-card{background:#fff;border:1px solid #e4ebf0;border-radius:14px;padding:16px 18px;display:flex;gap:18px;align-items:center;flex-wrap:wrap}"
              ".eb-explainer svg{width:300px;max-width:100%;height:auto;flex:0 0 auto}"
              ".eb-explainer .cap{flex:1 1 240px}"
              ".eb-explainer .ex-badge{display:inline-block;font-size:11px;font-weight:800;color:#0a4d7a;background:#eaf6ff;border-radius:20px;padding:3px 11px;margin-bottom:7px}"
              ".eb-explainer .cap strong{display:block;font-size:16px;margin-bottom:4px}"
              ".eb-explainer .cap p{font-size:13.5px;color:#5b6b78;margin:0;line-height:1.5}"
              # --- click-to-load YouTube facade (no external request until click) ---
              ".eb-video{max-width:1000px;margin:12px auto 0;padding:0 20px}"
              ".eb-video-hd{font-weight:800;font-size:16px;margin:0 0 8px}"
              ".eb-video-fac{display:block;position:relative;width:100%;aspect-ratio:16/9;background:radial-gradient(ellipse at 30% 18%,#17364d,#050d15 78%);border:none;border-radius:14px;cursor:pointer;overflow:hidden;padding:0;text-align:left}"
              ".eb-video-fac::after{content:\"\";position:absolute;left:0;right:0;bottom:0;height:52%;background:linear-gradient(transparent,rgba(0,0,0,.78))}"
              ".eb-video-fac:hover .eb-video-play{transform:translate(-50%,-58%) scale(1.08);background:#ff0000}"
              ".eb-video-play{position:absolute;top:46%;left:50%;transform:translate(-50%,-58%);display:flex;align-items:center;justify-content:center;width:76px;height:52px;border-radius:14px;background:#e62117;color:#fff;font-size:23px;box-shadow:0 8px 26px rgba(0,0,0,.5);transition:transform .15s,background .15s;z-index:2}"
              ".eb-video-badge{position:absolute;top:12px;left:12px;background:rgba(0,0,0,.55);color:#fff;font-size:11.5px;font-weight:800;letter-spacing:.5px;padding:4px 11px;border-radius:999px;z-index:2}"
              ".eb-video-t{position:absolute;left:16px;right:16px;bottom:32px;color:#fff;font-size:16.5px;font-weight:800;line-height:1.35;text-shadow:0 1px 3px rgba(0,0,0,.65);z-index:2}"
              ".eb-video-src{position:absolute;left:16px;bottom:11px;font-size:12px;color:rgba(255,255,255,.75);z-index:2}"
              "@media(max-width:560px){.eb-video-t{font-size:14px;bottom:30px}.eb-video-play{width:62px;height:44px;font-size:19px}}"
              ".eb-video-note{font-size:12px;color:#5b6b78;margin:8px 0 0}"
              ".eb-video-frame{position:relative;width:100%;aspect-ratio:16/9;border-radius:14px;overflow:hidden;background:#000}"
              ".eb-video-frame iframe{position:absolute;inset:0;width:100%;height:100%;border:0}"
              # Self-made data visuals (no external libs, no tracking, print-safe).
              # Categorical pair #0f6ba8/#e08c05 validated for CVD separation; the
              # low-contrast warm tone always carries a visible value label.
              ".eb-viz{background:#fff;border:1px solid #e4ebf0;border-radius:12px;padding:16px 18px;margin:18px 0}"
              ".eb-viz-t{font-size:14px;font-weight:800;margin:0 0 12px;color:#1a2733}"
              ".eb-viz-row{display:grid;grid-template-columns:132px 1fr;gap:10px;align-items:center;margin:9px 0;font-size:13.5px}"
              ".eb-viz-lab{color:#4a5a67;font-weight:700}"
              ".eb-viz-track{background:#f0f4f7;border-radius:5px;height:22px;position:relative;overflow:hidden}"
              ".eb-viz-fill{height:100%;border-radius:0 5px 5px 0;display:flex;align-items:center;justify-content:flex-end;padding-right:8px;color:#fff;font-weight:800;font-size:12.5px;white-space:nowrap}"
              ".eb-viz-a{background:#0f6ba8}.eb-viz-b{background:#e08c05;color:#1a2733}"
              ".eb-viz-note{font-size:12px;color:#5b6b78;margin:10px 0 0}"
              ".eb-thresh{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0}"
              ".eb-thresh div{border-radius:10px;padding:12px 14px;font-size:13.5px;line-height:1.5}"
              ".eb-thresh .lo{background:#eef7f1;border:1px solid #cdeede}"
              ".eb-thresh .hi{background:#fdf3ea;border:1px solid #f3ddc0}"
              ".eb-thresh b{display:block;font-size:15px;margin-bottom:3px}"
              "@media(max-width:560px){.eb-thresh{grid-template-columns:1fr}.eb-viz-row{grid-template-columns:96px 1fr;font-size:12.5px}}"
              "</style>\n")

HEAD_EXTRA = ("<link rel=\"icon\" href=\"/favicon.svg\" type=\"image/svg+xml\">\n"
              "<link rel=\"manifest\" href=\"/site.webmanifest\">\n"
              "<link rel=\"alternate\" type=\"application/rss+xml\" title=\"EcoBack Ratgeber\" href=\"/feed.xml\">\n"
              "<meta name=\"theme-color\" content=\"#0a4d7a\">\n"
              + CHROME_STYLE)

# --- Reusable SVG device line-art (no copyrighted product photos) ---
SVG = {
 "ac": '<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="16" y="10" width="26" height="44" rx="4" fill="#fff" stroke="#0f6ba8" stroke-width="2.5"/><rect x="21" y="15" width="16" height="8" rx="2" fill="#dce9f2"/><path d="M21 30h16M21 36h16M21 42h16" stroke="#9cc3dd" stroke-width="2" stroke-linecap="round"/><path class="eb-flow" d="M42 18c8 0 8 6 8 12v10" stroke="#0f6ba8" stroke-width="2.5" stroke-linecap="round"/></svg>',
 "mobileac": '<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="16" y="8" width="28" height="42" rx="4" fill="#fff" stroke="#0f6ba8" stroke-width="2.5"/><rect x="21" y="13" width="18" height="8" rx="2" fill="#dce9f2"/><path d="M21 28h18M21 34h18M21 40h18" stroke="#9cc3dd" stroke-width="2" stroke-linecap="round"/><circle cx="22" cy="54" r="3" fill="#0f6ba8"/><circle cx="38" cy="54" r="3" fill="#0f6ba8"/><path class="eb-flow" d="M44 16c6 0 6 5 6 9" stroke="#0f6ba8" stroke-width="2.5" stroke-linecap="round"/></svg>',
 "cooler": '<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="18" y="12" width="28" height="40" rx="4" fill="#fff" stroke="#0f6ba8" stroke-width="2.5"/><path d="M23 20h18M23 26h18" stroke="#9cc3dd" stroke-width="2" stroke-linecap="round"/><path class="eb-wave" d="M24 40q4-5 8 0t8 0" stroke="#2ea6c9" stroke-width="2.5" fill="none" stroke-linecap="round"/><path class="eb-wave" d="M24 46q4-5 8 0t8 0" stroke="#2ea6c9" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>',
 "fan": '<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="32" cy="24" r="17" fill="#eaf6ff" stroke="#0f6ba8" stroke-width="2.5"/><g class="eb-spin"><circle cx="32" cy="24" r="4" fill="#0f6ba8"/><path d="M32 24c-6-3-10-1-10 3M32 24c3-6 1-10-3-10M32 24c6 3 10 1 10-3M32 24c-3 6-1 10 3 10" stroke="#0f6ba8" stroke-width="2" stroke-linecap="round"/></g><path d="M32 41v9M25 52h14" stroke="#0f6ba8" stroke-width="2.5" stroke-linecap="round"/></svg>',
 "dehum": '<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="18" y="12" width="28" height="40" rx="4" fill="#fff" stroke="#0f6ba8" stroke-width="2.5"/><path d="M23 19h12" stroke="#9cc3dd" stroke-width="2" stroke-linecap="round"/><path class="eb-drip" d="M32 30c-4 5-6 8-6 11a6 6 0 0012 0c0-3-2-6-6-11z" fill="#bfe3f5" stroke="#0f6ba8" stroke-width="2"/></svg>',
 "heater": '<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="12" y="16" width="40" height="26" rx="4" fill="#fff" stroke="#c2410c" stroke-width="2.5"/><path d="M18 22v14M26 22v14M34 22v14M42 22v14" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round"/><path d="M20 50c0-3 3-4 3-7M32 50c0-3 3-4 3-7M44 50c0-3 3-4 3-7" stroke="#c2410c" stroke-width="2" stroke-linecap="round"/></svg>',
 "purifier": '<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="20" y="10" width="24" height="44" rx="6" fill="#fff" stroke="#0f6ba8" stroke-width="2.5"/><circle cx="32" cy="34" r="8" fill="none" stroke="#2ea86b" stroke-width="2.5"/><path d="M32 30v8M28 34h8" stroke="#2ea86b" stroke-width="2" stroke-linecap="round"/><path d="M26 16h12" stroke="#9cc3dd" stroke-width="2" stroke-linecap="round"/></svg>',
 "battery": '<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="14" y="18" width="36" height="34" rx="5" fill="#fff" stroke="#2f7d4f" stroke-width="2.5"/><path d="M24 18v-4h16v4" stroke="#2f7d4f" stroke-width="2.5"/><path class="eb-flow" d="M32 24l-6 10h5l-4 10 11-13h-6l5-7z" fill="#f59e0b" stroke="#c47b08" stroke-width="1.5" stroke-linejoin="round"/><circle cx="52" cy="14" r="7" fill="#ffd47a"/><path d="M52 4v3M52 21v3M42 14h3M59 14h3" stroke="#e0a92e" stroke-width="2" stroke-linecap="round"/></svg>',
 "shade": '<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="14" y="12" width="36" height="40" rx="3" fill="#fff" stroke="#0f6ba8" stroke-width="2.5"/><rect x="14" y="12" width="36" height="16" rx="3" fill="#dce9f2"/><path d="M20 28v22M28 28v22M36 28v22M44 28v22" stroke="#9cc3dd" stroke-width="2"/><path d="M12 12h40" stroke="#0f6ba8" stroke-width="3" stroke-linecap="round"/></svg>',
}

# Per-category "shop by type" grid: (svg-key, role-badge, title, desc, price, amazon-search-q, bg-gradient)
CAT_SHOP = {
 "klimaanlagen": [
   ("ac", "Echte Kühlung", "Tragbare Klimaanlage", "Senkt die Temperatur wirklich — Abluft übers Fenster.", "ab 250 €", "tragbare+klimaanlage", "#eaf6ff,#cfe6f7"),
   ("cooler", "Günstig", "Luftkühler", "Kein Abluftschlauch nötig — ideal bei trockener Hitze.", "ab 60 €", "luftk%C3%BChler", "#e6f6fb,#c6e9f4"),
   ("fan", "Ab 30 €", "Ventilator", "Turm & Stand — schnelle Abkühlung fürs kleine Budget.", "ab 30 €", "turmventilator", "#eef4ff,#d5e2f6"),
   ("dehum", "Gegen Schwüle", "Luftentfeuchter", "Trockenere Luft fühlt sich kühler an — besserer Schlaf.", "ab 120 €", "luftentfeuchter", "#eaf6ff,#cfe6f7"),
 ],
 "heizen": [
   ("heater", "Effizient", "Infrarotheizung", "Wärmt Flächen statt Luft — angenehm & sparsam.", "ab 90 €", "infrarotheizung", "#fff4e8,#ffe6cc"),
   ("heater", "Schnell warm", "Heizlüfter", "Sofort warm für Bad & Übergang — stromsparende Modelle.", "ab 25 €", "heizl%C3%BCfter+stromsparend", "#fff4e8,#ffe6cc"),
   ("ac", "2-in-1", "Klima mit Heizfunktion", "Kühlt im Sommer, heizt im Winter — ganzjährig nutzbar.", "ab 300 €", "klimaanlage+mit+heizfunktion", "#eaf6ff,#cfe6f7"),
 ],
 "luftqualitaet": [
   ("dehum", "Gegen Schimmel", "Luftentfeuchter", "Stoppt Feuchte & Schimmel in Wohnung, Keller, Bad.", "ab 120 €", "luftentfeuchter", "#eaf6ff,#cfe6f7"),
   ("purifier", "Gegen Pollen", "Luftreiniger", "Filtert Pollen, Staub & Gerüche — HEPA-Modelle.", "ab 80 €", "luftreiniger+hepa", "#eefaf3,#cdeede"),
 ],
 "energie-sparen": [
   ("battery", "Strom speichern", "Balkonkraftwerk-Speicher", "Solarstrom abends nutzen statt verschenken — nachrüstbar.", "ab 550 €", "balkonkraftwerk+speicher", "#eefaf3,#d4ecd9"),
   ("shade", "Hitzeschutz", "Thermo-Rollo & Vorhang", "Sperrt Hitze aus, bevor der Raum sich aufheizt.", "ab 20 €", "thermo+rollo+verdunkelung", "#eef4ff,#d5e2f6"),
   ("shade", "Fenster", "Hitzeschutzfolie", "Reflektiert Sonne am Fenster — spürbar kühler.", "ab 15 €", "hitzeschutzfolie+fenster", "#eefaf3,#cdeede"),
 ],
}

def meta(html, name):
    m = re.search(rf'<meta name="{name}" content="([^"]*)"', html)
    return m.group(1) if m else ""

def canonical(html):
    m = re.search(r'<link rel="canonical" href="([^"]+)"', html)
    return m.group(1) if m else ""

def h1(html):
    m = re.search(r'<h1[^>]*>(.*?)</h1>', html, re.S)
    return re.sub(r'\s+', ' ', re.sub('<[^>]+>', '', m.group(1))).strip() if m else ""

def first_sentence(text):
    text = text.strip()
    m = re.search(r'^(.*?[.:!?])(\s|$)', text)
    return (m.group(1) if m else text)[:160]

def collect_articles():
    arts = {k: [] for k, _, _ in CATEGORIES}
    for path in sorted(glob.glob(os.path.join(GUIDE, "*.html"))):
        slug = os.path.basename(path)[:-5]
        html = open(path, encoding="utf-8").read()
        cat = (CAT_OF.get(slug)
               or ("heizen" if slug.startswith(("heizung-", "heizluefter-", "infrarotheizung-", "heizkosten-")) else None)
            or ("energie-sparen" if slug.startswith(("balkonkraftwerk-", "balkonspeicher-", "growatt-", "zendure-", "strompreis-", "stromvergleich-")) else None)
               or ("luftqualitaet" if slug.startswith(("luftentfeuchter-", "luftbefeuchter-", "keller-", "schimmel-")) else None)
               or "klimaanlagen")
        arts[cat].append({
            "slug": slug, "url": canonical(html) or f"https://getecoback.com/guide/{slug}.html",
            "title": h1(html) or slug, "desc": first_sentence(meta(html, "description")),
        })
    return arts

STYLE = """  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; color:#1a2733; line-height:1.65; background:#f7fafc; }
  .wrap { max-width:760px; margin:0 auto; padding:0 20px; }
  header.hero { background:linear-gradient(135deg,#0f6ba8,#0a4d7a); color:#fff; padding:40px 0 34px; }
  header.hero a { color:rgba(255,255,255,0.85); font-size:14px; text-decoration:none; }
  header.hero h1 { font-size:clamp(24px,4vw,34px); margin:14px 0 8px; }
  header.hero p { color:rgba(255,255,255,0.9); }
  article { padding:34px 0 20px; }
  article > p { margin-bottom:14px; color:#26333d; }
  .related { background:#fff; border:1px solid #e4ebf0; border-radius:12px; padding:18px 20px; margin:26px 0; }
  .related a { display:block; margin:6px 0; color:#0f6ba8; }
  a { color:#0f6ba8; }"""

def hub_page(key, arts):
    title = CAT_TITLE[key]
    desc = CAT_DESC[key]
    url = f"https://getecoback.com/kategorie/{key}.html"
    shop = shop_section(key)
    cards = "\n".join(
        f'    <div class="eb-card"><a href="{a["url"]}">{htmllib.escape(a["title"])}</a>'
        f'<p>{htmllib.escape(a["desc"])}</p></div>' for a in arts)
    others = "\n".join(
        f'    <a href="/kategorie/{k}.html">{t} →</a>'
        for k, t, _ in CATEGORIES if k != key)
    items = ",".join(
        f'{{"@type":"ListItem","position":{i+1},"url":"{a["url"]}","name":"{htmllib.escape(a["title"])}"}}'
        for i, a in enumerate(arts))
    jsonld = ('{"@context":"https://schema.org","@graph":['
              f'{{"@type":"CollectionPage","name":"{title}","description":"{desc}","url":"{url}","inLanguage":"de",'
              f'"about":{{"@type":"Thing","name":"{title}","sameAs":"{CAT_WIKI[key]}"}}}},'
              '{"@type":"BreadcrumbList","itemListElement":['
              '{"@type":"ListItem","position":1,"name":"EcoBack","item":"https://getecoback.com/"},'
              f'{{"@type":"ListItem","position":2,"name":"{title}","item":"{url}"}}]}},'
              f'{{"@type":"ItemList","itemListElement":[{items}]}}]}}')
    return f"""<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title}: Ratgeber 2026 | EcoBack</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{url}">
<link rel="alternate" hreflang="de" href="{url}">
<meta property="og:type" content="website">
<meta property="og:title" content="{title} – EcoBack">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{url}">
<!-- Google Analytics (GA4) -->
<script async src="https://www.googletagmanager.com/gtag/js?id={GA4}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments);}}gtag('js',new Date());gtag('config','{GA4}');</script>
<style>
{STYLE}
</style>
<script type="application/ld+json">{jsonld}</script>
</head>
<body>
<header class="hero">
  <div class="wrap">
    <a href="/">← EcoBack</a>
    <h1>{title}</h1>
    <p>{desc}</p>
  </div>
</header>
<nav class="eb-crumb" aria-label="Breadcrumb"><a href="/">Startseite</a><span>›</span>{title}</nav>
<div class="eb-trust"><b>🛡️ Unabhängig ausgewählt</b><span>·</span>Werbefinanziert über Amazon-Links<span>·</span><a href="/wie-wir-empfehlen.html#nachrechnen">Rechenwege offengelegt →</a></div>
{shop}
<div class="wrap">
<article>
  <p>Alle EcoBack-Ratgeber aus dem Bereich <strong>{title}</strong> auf einen Blick — mit ehrlichen Kaufkriterien und konkreten Modell-Empfehlungen nach Einsatzzweck.</p>
  <div class="eb-cards">
{cards}
  </div>
  <div class="related">
    <strong>Weitere Kategorien</strong>
{others}
  </div>
</article>
</div>
<footer><p><a href="/">← Zurück zur Startseite</a></p></footer>
</body>
</html>
"""

FEED_LINK = ('<link rel="alternate" type="application/rss+xml" '
             'title="EcoBack Ratgeber" href="/feed.xml">\n')


def cat_of(slug):
    """Map a guide slug to its category key (same rules as collect_articles)."""
    return (CAT_OF.get(slug)
            or ("heizen" if slug.startswith(("heizung-", "heizluefter-", "infrarotheizung-", "heizkosten-")) else None)
            or ("energie-sparen" if slug.startswith(("balkonkraftwerk-", "balkonspeicher-", "growatt-", "zendure-", "strompreis-", "stromvergleich-")) else None)
            or ("luftqualitaet" if slug.startswith(("luftentfeuchter-", "luftbefeuchter-", "keller-", "schimmel-")) else None)
            or "klimaanlagen")


# Mobile-only sticky purchase bar: JS wires the CTA to the first Amazon link
# already on the page (always correct, never a fabricated target) and only shows
# it after the reader scrolls past the fold. Dismissible. GA4 affiliate_click.
# Werbekennzeichnung. The toppick strip has carried this since it moved above
# the article's own disclosure, on the reasoning written there: "the label
# belongs at the ad, not 600 px further down the page." That reasoning applies
# to every block that carries an affiliate link, and an audit on 2026-08-27
# found it had only ever been applied to the toppick: the sticky bar (139
# pages), the model grid (90), the exit popup (131), the BTU result panel (54)
# and the homepage autumn block all carried Amazon links with no ad label at
# all. Some of them said "Affiliate-Links" in body text, which is a disclosure
# but not a Werbekennzeichnung, and the sticky bar and popup are exactly the
# floating/teaser surfaces where an in-article label does not reach.
AD_LABEL = {False: "Anzeige · Affiliate-Links — für dich derselbe Preis",
            True: "Ad · affiliate links — same price for you"}
AD_SHORT = {False: "Anzeige", True: "Ad"}


def sticky_bar(label, cta, en=False):
    return (
        "<!--EB_STICKY--><div class=\"eb-sticky\" id=\"eb-sticky\">"
        f"<strong>🔥 {label}</strong>"
        f"<span style=\"font-size:10.5px;color:#8a99a6;letter-spacing:.3px;\">{AD_SHORT[en]}</span>"
        "<a class=\"eb-sticky-cta\" id=\"eb-sticky-cta\" href=\"#\" target=\"_blank\" rel=\"sponsored noopener\">"
        f"{cta}</a>"
        "<button type=\"button\" id=\"eb-sticky-x\" aria-label=\"schließen\">×</button></div>"
        "<script>(function(){var b=document.getElementById('eb-sticky');if(!b)return;"
        "var l=document.querySelectorAll('a[href*=\"amazon.\"]');if(!l.length)return;"
        "var c=document.getElementById('eb-sticky-cta');c.href=l[0].href;"
        "document.body.classList.add('eb-has-sticky');var off=false;"
        "document.getElementById('eb-sticky-x').addEventListener('click',function(){b.classList.remove('on');off=true;});"
        "c.addEventListener('click',function(){if(window.gtag)gtag('event','affiliate_click',{link_url:c.href,source:'sticky'});});"
        "function k(){if(off)return;if(window.scrollY>600)b.classList.add('on');else b.classList.remove('on');}"
        "window.addEventListener('scroll',k,{passive:true});k();})();</script><!--/EB_STICKY-->\n")

STICKY = sticky_bar("Passendes Gerät finden", "Preis auf Amazon prüfen →")
EN_STICKY = sticky_bar("Find the right unit", "Check price on Amazon →", en=True)


def crumb_trust(cat_key, title, en=False):
    """Visible breadcrumb + honest trust bar, injected right under the nav."""
    # h1() hands back the heading's inner HTML, entities included; unescape
    # before re-escaping or "&amp;" in a heading shows up as a literal "&amp;"
    # in the crumb (8 pages, caught by check_crumb_parity 2026-09-04).
    t = htmllib.unescape(re.sub(r'\s+', ' ', re.sub('<[^>]+>', '', title)).strip())
    if en:
        crumb = ('<!--EB_CRUMB--><nav class="eb-crumb" aria-label="Breadcrumb">'
                 '<a href="/en/">Home</a><span>›</span><a href="/en/">All&nbsp;Guides</a>'
                 f'<span>›</span>{htmllib.escape(t)}</nav>')
        trust = ('<div class="eb-trust"><b>🛡️ Independently selected</b>'
                 '<span>·</span>Ad-funded via Amazon links'
                 '<span>·</span><a href="/en/how-we-recommend.html#check-the-maths">Our maths is public →</a>'
                 '</div><!--/EB_TRUST-->')
    else:
        cn = CAT_SHORT[cat_key]
        crumb = ('<!--EB_CRUMB--><nav class="eb-crumb" aria-label="Breadcrumb">'
                 '<a href="/">Startseite</a><span>›</span>'
                 f'<a href="/kategorie/{cat_key}.html">{cn}</a>'
                 f'<span>›</span>{htmllib.escape(t)}</nav>')
        trust = ('<div class="eb-trust"><b>🛡️ Unabhängig ausgewählt</b>'
                 '<span>·</span>Werbefinanziert über Amazon-Links'
                 '<span>·</span><a href="/wie-wir-empfehlen.html#nachrechnen">Rechenwege offengelegt →</a>'
                 '</div><!--/EB_TRUST-->')
    return crumb + trust + "\n"


def breadcrumb_node(cat_key, title, url, en=False):
    """The BreadcrumbList node alone (no @context), for splicing into a page
    that already carries an @graph."""
    t = htmllib.unescape(re.sub(r'\s+', ' ', re.sub('<[^>]+>', '', title)).strip())
    if en:
        items = ('{"@type":"ListItem","position":1,"name":"Home","item":"https://getecoback.com/en/"},'
                 f'{{"@type":"ListItem","position":2,"name":{jstr(t)},"item":{jstr(url)}}}')
    else:
        items = ('{"@type":"ListItem","position":1,"name":"Startseite","item":"https://getecoback.com/"},'
                 f'{{"@type":"ListItem","position":2,"name":{jstr(CAT_SHORT[cat_key])},"item":"https://getecoback.com/kategorie/{cat_key}.html"}},'
                 f'{{"@type":"ListItem","position":3,"name":{jstr(t)},"item":{jstr(url)}}}')
    return '{"@type":"BreadcrumbList","itemListElement":[' + items + ']}'


def breadcrumb_jsonld(cat_key, title, url, en=False):
    node = breadcrumb_node(cat_key, title, url, en)
    # node starts with {"@type":…}; the standalone script carries @context first.
    return ('<script type="application/ld+json" id="eb-crumb-ld">'
            '{"@context":"https://schema.org",' + node[1:] + '</script>\n')


LD_SCRIPT_RE = re.compile(r'<script\b[^>]*type="application/ld\+json"[^>]*>(.*?)</script>', re.S)


def replace_breadcrumb_ld(html, cat_key, title, url, en=False):
    """Replace-in-place, never insert-only (2026-09-04): the breadcrumb JSON-LD
    was inserted once and then frozen, so 165 of 171 guide pages carried a
    BreadcrumbList that disagreed with the visible crumb (old "Guides →
    /en/#guides" trails, stale titles). Three shapes exist on the site:
      1. our own <script … id="eb-crumb-ld"> → replaced whole;
      2. a BreadcrumbList node inside a page's @graph (Article + FAQPage +
         BreadcrumbList, 119 pages) → only that node is spliced, byte-for-byte
         around it, so the Article/FAQ nodes and their formatting survive;
      3. a standalone BreadcrumbList script without our id → replaced whole;
      4. none → inserted before </head>.
    check_crumb_parity.py asserts the result matches the visible nav."""
    node = breadcrumb_node(cat_key, title, url, en)
    m = re.search(r'<script\b[^>]*id="eb-crumb-ld"[^>]*>.*?</script>\n?', html, re.S)
    if m:
        return html[:m.start()] + breadcrumb_jsonld(cat_key, title, url, en) + html[m.end():]
    for m in LD_SCRIPT_RE.finditer(html):
        body = m.group(1)
        if "BreadcrumbList" not in body:
            continue
        try:
            data = json.loads(body)
        except ValueError:
            continue
        if isinstance(data, dict) and isinstance(data.get("@graph"), list):
            # Locate the node's exact text span: the nearest "{" before the
            # "BreadcrumbList" literal that decodes to that node.
            dec = json.JSONDecoder()
            hit = body.find('"BreadcrumbList"')
            pos = body.rfind("{", 0, hit)
            while pos >= 0:
                try:
                    obj, end = dec.raw_decode(body, pos)
                except ValueError:
                    obj, end = None, None
                if isinstance(obj, dict) and obj.get("@type") == "BreadcrumbList":
                    new_body = body[:pos] + node + body[end:]
                    start = m.start(1)
                    return html[:start] + new_body + html[start + len(body):]
                pos = body.rfind("{", 0, pos)
            continue  # shape not understood — leave it, try the next script
        if isinstance(data, dict) and data.get("@type") == "BreadcrumbList":
            return html[:m.start()] + breadcrumb_jsonld(cat_key, title, url, en).rstrip("\n") + html[m.end():]
    return html.replace("</head>", breadcrumb_jsonld(cat_key, title, url, en) + "</head>", 1)


def jstr(s):
    """JSON-encode a string for inline JSON-LD."""
    return '"' + s.replace('\\', '\\\\').replace('"', '\\"') + '"'


# --- Where the money links actually land. All 40 affiliate clicks measured so
# far went to an Amazon *search results* page, not to a product page: without
# PA-API (gated behind the first three sales) we refuse to invent ASINs, so
# every link is a search by model name. That costs a click and a decision at
# exactly the moment the reader is ready to buy, and the 24-hour cookie starts
# at the search page either way.
#
# The gap closes the moment someone pastes a real ASIN here — one visit to each
# product page, eight lines, no API. Until then the search link stays, so the
# site is never broken and nothing is ever fabricated: an empty string means
# "we don't know it", and the code falls back rather than guessing.
# How to fill it in: docs/amazon-asin-howto.md
# Filled 2026-08-28 by cross-source verification (owner: 「链接你用其他手段验证」
# — direct amazon.de fetches are bot-walled for both the sandbox and GitHub
# runners, two runs on record). Acceptance rule, pre-registered: an ASIN ships
# only when >=2 independent domains tie it to the exact model with ZERO
# conflicts; a camelcamelcamel.de hit counts double-weight because it mirrors
# the amazon.de listing title verbatim. Full evidence in the 2026-08-28 session
# report; per-row provenance below.
MODEL_ASIN = {
    # CLOSED 2026-08-31 — do not reopen. Two independent observations now say
    # B0BZWP26GD does not give the EX105 on amazon.de: on 08-28 the listing
    # titled itself "PACEX93" (8900 BTU, filed under "Musical Instruments &
    # DJ"), and today the owner opening it landed on the Pinguino GentleJet
    # PAC AP98 at /dp/B0F3XL6LK6?th=1 — the ?th= parameter Amazon adds when it
    # redirects a variant ASIN to the currently selected child.
    #
    # The search link is not a fallback here, it is the CORRECT form: it
    # survives variant churn, whereas a /dp/ link to this ASIN would land the
    # reader on a different product. That is the standing exception to "a
    # search link costs conversion" — it only costs conversion when the direct
    # link would actually reach the product named on the page.
    #
    # Withdrawn hypothesis, recorded so nobody re-derives it: Geizhals showing
    # the EX105 at EUR 932-1999 from eBay resellers looked like end-of-life
    # price inflation, but billiger.de lists the brand-new GentleJet at EUR
    # 1199 too — the price shape is these comparison sites' data, not a
    # discontinuation signal. EX105 remains live on heise/Geizhals/
    # MediaMarkt.at. Whether it is still stocked on amazon.de specifically is
    # unknown from here and cannot be read off the owner's screenshots while
    # their amazon.de delivery country is set to the United States.
    "De'Longhi Pinguino PAC EX105": "",
    # 2026-08-31, owner screenshot of the amazon.de listing (first-party, the
    # strongest source available here): B0F3XL6LK6 is the De'Longhi Pinguino
    # GentleJet PAC AP98 — 11.500 BTU/h, R290, A+, 2,7 kW, style "for rooms up
    # to 37,5 m²". Recorded so the ASIN is not lost, but DELIBERATELY UNUSED:
    # no page names this model yet, and it must not be recommended on 3,5 stars
    # from 25 reviews with no public test coverage — that is not the consensus
    # this site requires. The same screenshot shows a dispatch warning and two
    # sibling styles "currently unavailable", which a screenshot cannot resolve
    # (it may reflect the owner's own delivery address, not German stock).
    "De'Longhi Pinguino GentleJet PAC AP98": "B0F3XL6LK6",
    # amazon.de direct listing + .nl/.es/.be/.co.uk + two affiliate sites
    "De'Longhi PAC N90 ECO Silent": "B07NC5CP6F",
    # de.camelcamelcamel mirrors the amazon.de German title verbatim
    # ("Comfee Mobiles Klimagerät MPPH-09CRN7, 3-in-1 …") + amazon.de promo
    # redirectAsin + es.CCC + ubuy + webprice.eu
    "Comfee MPPH-09CRN7": "B07KJYD1ZP",
    "AEG ChillFlex Pro": "",
    # amazon.de direct ("… 12000BTU/h - Anthracite") + amazon.es + webprice.eu
    "Klarstein Kraftwerk Smart 12K": "B08VWSP8FW",
    "Midea PortaSplit": "",
    "MeacoFan 1056": "",
    "Rowenta VU5690 Eole Infinite": "",
    # de.camelcamelcamel mirrors the amazon.de German title verbatim
    # ("COMFEE' Luftentfeuchter 20L/Tag … MDDF-20DEN7") — non-WF confirmed —
    # + amazon.es/.ae/.co.uk + ubuy
    "Comfee MDDF-20DEN7": "B07KJX6RDK",
    "Marstek Venus E": "",
    "Anker Solarbank 3 E2700 Pro": "",
    "Anker Solarbank 2 E1600 Pro": "",
    "Zendure SolarFlow 800 Pro": "",
}
ASIN_RE = re.compile(r"^B[0-9A-Z]{9}$")


# Live product data from Amazon's own API (tools/product_intel/, 2026-09-11).
# Absent or stale, every page renders exactly as before — the file is an
# overlay, never a dependency. An entry is used only when its status is "ok"
# (the listing title contained the model token, see refresh.mjs TITLE MATCH)
# and it is younger than 24 h, which is both Amazon's display rule for prices
# and the honest minimum: a price the reader cannot still get is not a price.
LIVE_PRODUCTS = {}
LIVE_MAX_AGE_H = 24
try:
    import datetime as _dt
    _pj = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "products.json")
    if os.path.exists(_pj):
        _raw = json.load(open(_pj, encoding="utf-8"))
        _now = _dt.datetime.now(_dt.timezone.utc)
        for _term, _e in (_raw.get("items") or {}).items():
            if _e.get("status") != "ok" or not _e.get("fetched_at"):
                continue
            _t = _dt.datetime.fromisoformat(_e["fetched_at"].replace("Z", "+00:00"))
            if (_now - _t).total_seconds() <= LIVE_MAX_AGE_H * 3600:
                LIVE_PRODUCTS[_term] = _e
except Exception:
    LIVE_PRODUCTS = {}


def live_product(q):
    """Fresh, title-verified live entry for a shelf search term, or None."""
    return LIVE_PRODUCTS.get(urllib.parse.unquote_plus(q or ""))


def live_price_text(e, en=False):
    """'289,99 € · Stand 11.09.' — the amount and the day it was true."""
    if not e or e.get("price_cents") is None:
        return ""
    amt = e["price_cents"] / 100
    cur = "€" if (e.get("currency") or "EUR") == "EUR" else (e.get("currency") or "")
    d = e["fetched_at"][:10]
    day = f"{d[8:10]}.{d[5:7]}."
    if en:
        return f"{cur}{amt:,.2f} · as of {day}".replace(",", "X").replace(".", ",").replace("X", ".") if cur != "€" else f"{amt:.2f} € · as of {day}"
    return f"{amt:.2f}".replace(".", ",") + f" {cur} · Stand {day}"


def amazon_url(q, name=None):
    """Product page when we know the ASIN, search by model name otherwise.

    Order: a fresh, title-verified ASIN from Amazon's API beats the hand-kept
    MODEL_ASIN, which beats the search link. The live one wins because it is
    re-verified every run against the listing title — the static list is what
    let the EX105 point at a different product for weeks."""
    live = live_product(q)
    if live and ASIN_RE.match((live.get("asin") or "").upper()):
        return f"https://www.amazon.de/dp/{live['asin'].upper()}?tag=getecoback-21"
    asin = (MODEL_ASIN.get(name or "") or "").strip().upper()
    if ASIN_RE.match(asin):
        return f"https://www.amazon.de/dp/{asin}?tag=getecoback-21"
    return f"https://www.amazon.de/s?k={q}&tag=getecoback-21"


def shop_card(entry):
    svg_key, role, title, desc, price, q, grad = entry
    # amazon_url() — not a hand-built search URL: this card names a model, and
    # a verified model must land on its product page (2026-08-31 leak).
    url = amazon_url(q, title)
    return (f'<div class="eb-shop-card"><div class="th" style="background:linear-gradient(135deg,{grad});">'
            f'<span class="rl">{role}</span>{SVG[svg_key]}</div>'
            f'<div class="bd"><h3>{title}</h3><p class="ds">{desc}</p>'
            f'<div class="pr">{price}</div>'
            f'<a class="go" href="{url}" target="_blank" rel="sponsored noopener">Preis auf Amazon prüfen →</a>'
            '</div></div>')


def shop_section(cat_key):
    cards = "".join(shop_card(e) for e in CAT_SHOP[cat_key])
    return ('<section class="eb-shop"><h2>Nach Gerätetyp shoppen</h2>'
            '<p class="eb-shop-sub">Direkt zum passenden Gerät auf Amazon.de — '
            'Auswahl aus öffentlichen Tests zusammengestellt, nicht selbst getestet. '
            'Symbolbilder, keine echten Produktfotos.</p>'
            f'<div class="eb-shop-grid">{cards}</div></section>\n')


# --- 图文 recommended-model cards (image+text) injected into guide pages that
# don't already recommend a specific model. Only station-validated models are
# named (see CLAUDE.md decision records); other cards are honest use-case cards
# linking to a targeted Amazon search. Prices are bands, never live values. ---
SVG_GRAD = {"ac": "#eaf6ff,#cfe6f7", "mobileac": "#e6f7f2,#c8ece0", "cooler": "#e6f6fb,#c6e9f4",
            "fan": "#eef4ff,#d5e2f6", "dehum": "#eaf6ff,#cfe6f7", "heater": "#fff4e8,#ffe6cc",
            "purifier": "#eefaf3,#cdeede", "shade": "#eef4ff,#d5e2f6",
            "battery": "#eefaf3,#d4ecd9"}

# (title, role-badge, one-liner, price-band, amazon-search-q, svg-key)
DEVICE_MODELS = {
 "ac": [
   ("De'Longhi Pinguino PAC EX105", "Allrounder", "Starke Kühlung, oft in der Testsieger-Linie.", "€€€ · ca. 400–550 €", "De%27Longhi+Pinguino+PAC+EX105", "ac"),
   ("De'Longhi PAC N90 ECO Silent", "Am leisesten", "Monoblock-Testsieger der Stiftung Warentest, Silent-Modus, Kältemittel R290.", "Preis vor Ort prüfen", "De%27Longhi+PAC+N90+ECO+Silent", "ac"),
   ("Comfee MPPH-09CRN7", "Preis-Leistung", "Günstig für kleine Schlaf- & Arbeitszimmer — dafür deutlich hörbar.", "€€ · ca. 250–320 €", "Comfee+MPPH-09CRN7", "ac"),
   ("AEG ChillFlex Pro", "Leise & gut ausgestattet", "Angenehm fürs Schlafzimmer, solide Ausstattung.", "€€€ · ca. 350–500 €", "AEG+ChillFlex+Pro", "ac"),
   ("Klarstein Kraftwerk Smart 12K", "Für große Räume", "In öffentlichen Vergleichen die stärkste Kühlleistung der Runde.", "Preis vor Ort prüfen", "Klarstein+Kraftwerk+Smart+12K", "ac"),
   ("Bosch Cool 5000", "Einfach aufgestellt", "Plug-and-Play — schnell startklar, unkomplizierte Bedienung.", "Preis vor Ort prüfen", "Bosch+Cool+5000+Klimager%C3%A4t", "ac"),
   ("Suntec Impuls 2.0+", "Leicht & mobil", "Leichtgewicht — lässt sich gut zwischen Räumen umstellen.", "Preis vor Ort prüfen", "Suntec+Impuls+2.0%2B", "ac"),
   ("Midea PortaSplit", "Split ohne Bohren", "Quick-Connect-Split: leise und effizient, ohne Kernbohrung.", "€€€€ · Preis vor Ort prüfen", "Midea+PortaSplit", "mobileac"),
 ],
 "fan": [
   ("Rowenta VU5690 Eole Infinite", "Kraftvoll", "Starker Turmventilator mit viel Luftstrom.", "€€ · ca. 70–100 €", "Rowenta+VU5690", "fan"),
   ("MeacoFan 1056", "Besonders leise", "Sehr leise — ideal fürs Schlafzimmer.", "€€ · ca. 90–120 €", "MeacoFan+1056", "fan"),
   ("Standventilator", "Fürs große Zimmer", "Höhenverstellbar, kräftiger Luftstrom.", "ab 30 €", "standventilator+leise", "fan"),
 ],
 # Autumn/winter product ladders, 2026-08-28. Until today "dehum" carried one
 # real model and "heater" carried none at all — three category labels with
 # generic search links — while the ac ladder had eight named models. That is
 # backwards for the season we are entering, and it runs on exactly the pattern
 # this site's own 2026-07 competitor study called the conversion weak point
 # (generic search box) versus what converts (named model + role label).
 # The models added below are the ones DE rising demand actually names, each
 # verified as a real German-market product before it was written down:
 # meaco arete one 20l v=36.350 · midea heizlüfter v=71.400 ·
 # schmidbauer infrarotheizung v=62.950. No ASINs, no invented prices, no test
 # scores — by-name search links and role labels only, same as every other card.
 "dehum": [
   ("Comfee MDDF-20DEN7", "Preis-Leistung", "Bewährter Entfeuchter für Wohnräume.", "€€ · ca. 150–200 €", "Comfee+MDDF-20DEN7", "dehum"),
   ("MeacoDry Arete One 20L", "Leise & für Wäsche", "Herstellerangabe 20 l/Tag, HEPA-Filter und Wäschetrocknungs-Modus; in öffentlichen Tests vor allem für den leisen Betrieb gelobt.", "€€€ · Preis vor Ort prüfen", "MeacoDry+Arete+One+20L", "dehum"),
   # Same line, one size up. "meacodry arete one 25l" is its own rising query
   # (21.350, 09-11) and this shelf only offered the 20 L. Note that the 20 L
   # above is the category's largest demand term this week (49.800) — its zero
   # clicks over 60 days are an out-of-season zero, not a bad pick, which is why
   # nothing was retired from this shelf.
   ("MeacoDry Arete One 25L", "Dieselbe Reihe, größerer Raum", "Gleiche Baureihe wie oben, eine Stufe größer — eigener Nachfragebegriff in unserer Trends-Abfrage (Stand 11.09.). Nicht selbst getestet.", "Preis vor Ort prüfen", "MeacoDry+Arete+One+25L", "dehum"),
   ("Für den Keller", "Dauerbetrieb", "Modelle mit Ablaufschlauch für Dauerbetrieb.", "je nach Raumgröße", "luftentfeuchter+keller+ablaufschlauch", "dehum"),
 ],
 "purifier": [
   ("Levoit (HEPA)", "Gegen Pollen", "HEPA-Filter gegen Pollen, Staub & Gerüche.", "€€ · ca. 90–160 €", "Levoit+Luftreiniger+HEPA", "purifier"),
   ("Für große Räume", "Hohe Leistung", "Höhere Filterleistung (CADR) fürs Wohnzimmer.", "€€€", "luftreiniger+gro%C3%9Fe+r%C3%A4ume+HEPA", "purifier"),
 ],
 "heater": [
   ("Schmidbauer Hybrid Pro 600 W", "Kleine Räume", "Infrarot plus Konvektion mit stufenlosem Thermostat; der Hersteller nennt 6–12 m² als Einsatzbereich.", "€€ · Preis vor Ort prüfen", "Schmidbauer+Hybrid+Pro+600+W+Infrarotheizung", "heater"),
   ("Schmidbauer ISP T 700 W", "Auch fürs Bad", "700 W, laut Hersteller für Feuchträume geeignet — die Antwort auf „Heizung fürs Bad“, ohne Heizlüfter-Dauerlauf.", "€€ · Preis vor Ort prüfen", "Schmidbauer+ISP+T+700+Infrarotheizung", "heater"),
   # 2026-09-11 Nachfrage-Abgleich (data/trends-rising.json, geo=DE, 09-11,
   # Seed nicht polluted): "heizlüfter 300 watt" ist mit 50.650 die größte
   # produktförmige Anfrage beider Herbst-Seeds, und dieses Regal hatte nichts
   # unter 600 W. Der ehrliche Eintrag ist nicht "hier ist ein billiger Heizer",
   # sondern was 300 W leisten und was nicht — das kann diese Seite mit ihrer
   # eigenen veröffentlichten Rechnung beantworten.
   ("Heizlüfter 300 Watt", "Die meistgesuchte Kleinstklasse", "Meistgesuchte Leistungsklasse dieser Woche in unserer Google-Trends-Abfrage (Stand 11.09.) — Nachfrage-Signal, kein Testurteil, nicht selbst getestet. Ehrlich dazu: 300 W wärmen die Person davor, keinen Raum.", "Preis vor Ort prüfen", "heizl%C3%BCfter+300+watt", "heater"),
   ("Midea NTH20-17BR", "Schnell warm, nicht sparsam", "Keramik-Heizlüfter mit zwei Stufen (1.200 / 2.000 W) — für kurzes Aufheizen, nicht für den Dauerbetrieb. Zur zweitgrößten Anfrage der Woche, „energiesparender Heizlüfter“ (48.600): sparsam macht ihn nicht das Gerät, sondern die Abschaltung — 2.000 W kosten 2.000 W, solange sie laufen.", "€ · Preis vor Ort prüfen", "Midea+NTH20-17BR+Heizl%C3%BCfter", "heater"),
   ("Klima mit Heizfunktion", "2-in-1", "Kühlt im Sommer, heizt im Winter.", "ab 300 €", "klimaanlage+mit+heizfunktion", "ac"),
 ],
 # Balcony storage is the highest-basket category on this site — and the one
 # place where the cards used to contradict our own calculator. Sorting the grid
 # by €/kWh put a 5,12-kWh unit in the first slot, while /guide/balkonspeicher-
 # rechner.html tells the same reader that above ~2,7 kWh nothing pays off on an
 # 800-W balcony plant. €/kWh is the right metric only when capacity is free to
 # grow; here usefulness is capped, so the order below follows the recommended
 # capacity band (1,6–2,7 kWh) and the oversized unit is kept, but labelled for
 # the reader it actually fits. Capacities are the manufacturers' figures as
 # quoted in the public 2026 comparisons; prices stay "check on site".
 "storage": [
   ("Zendure SolarFlow 800 Pro", "Sweet Spot 1,9 kWh", "1,92 kWh — genau die Größe, die unser Rechner für ein 800-Watt-Balkonkraftwerk empfiehlt. TÜV-zertifiziert.", "1,92 kWh · Preis vor Ort prüfen", "Zendure+SolarFlow+800+Pro", "battery"),
   ("Anker Solarbank 3 E2700 Pro", "Obergrenze der Empfehlung", "2,7 kWh — mehr rechnet sich an 800 Watt selten. Ausgereifte App und passende Smart Plugs aus einer Hand.", "2,7 kWh · ca. 370 €/kWh", "Anker+Solarbank+3+E2700", "battery"),
   # EcoFlow removed 2026-08-28 — owner instruction: do not recommend EcoFlow
   # products. Sitewide rule, recorded in CLAUDE.md; the storage ladder keeps
   # four models, which still spans the 1,6-5,1 kWh range the pages discuss.
   ("Anker Solarbank 2 E1600 Pro", "Kleinste sinnvolle Größe", "1,6 kWh mit vier MPPT-Eingängen — reicht meist, wenn du tagsüber zu Hause bist, und lässt sich später erweitern.", "1,6 kWh · Preis vor Ort prüfen", "Anker+Solix+Solarbank+2+E1600+Pro", "battery"),
   ("Marstek Venus E", "Nur wenn es mehr als Balkon ist", "5,12 kWh zum niedrigsten Preis pro Kilowattstunde 2026 — aber rund doppelt so viel Kapazität, wie sich an einem 800-Watt-Balkonkraftwerk rechnet. Sinnvoll mit Dachanlage oder hohem Abendverbrauch.", "5,12 kWh · ca. 215 €/kWh", "Marstek+Venus+E+Balkonkraftwerk+Speicher", "battery"),
 ],
 "shade": [
   ("Lichtblick Thermo-Rollo", "Hitzeschutz", "Sperrt Hitze am Fenster aus, bevor der Raum heiß wird.", "ab 25 €", "Lichtblick+Thermo+Rollo", "shade"),
   ("Hitzeschutzfolie", "Fürs Fenster", "Reflektiert Sonne am Glas — spürbar kühler.", "ab 15 €", "hitzeschutzfolie+fenster", "shade"),
 ],
}

DEVICE_MODELS_EN = {
 "ac": [
   ("De'Longhi Pinguino PAC EX105", "All-rounder", "Strong cooling, often in the test-winner line.", "€€€ · approx. €400–550", "De%27Longhi+Pinguino+PAC+EX105", "ac"),
   ("Comfee MPPH-09CRN7", "Best value", "Affordable for small bedrooms & offices — but clearly audible.", "€€ · approx. €250–320", "Comfee+MPPH-09CRN7", "ac"),
   # This card used to be labelled "MeacoFan / quiet pick" while linking an AEG
   # search — a fan brand standing in for an air conditioner. Named properly now.
   ("AEG ChillFlex Pro", "Quiet pick", "Comfortable in the bedroom, well equipped.", "€€€ · approx. €350–500", "AEG+ChillFlex+Pro", "ac"),
   ("De'Longhi PAC N90 ECO Silent", "Quietest", "Monoblock test winner at Stiftung Warentest, silent mode, R290 refrigerant.", "check price locally", "De%27Longhi+PAC+N90+ECO+Silent", "ac"),
   ("Klarstein Kraftwerk Smart 12K", "For large rooms", "Strongest cooling of its group in public comparisons.", "check price locally", "Klarstein+Kraftwerk+Smart+12K", "ac"),
 ],
 "fan": [
   ("MeacoFan 1056", "Extra quiet", "Very quiet — ideal for the bedroom.", "€€ · approx. €90–120", "MeacoFan+1056", "fan"),
   ("Rowenta VU5690", "Powerful", "Strong tower fan with lots of airflow.", "€€ · approx. €70–100", "Rowenta+VU5690", "fan"),
 ],
 "dehum": [
   ("Comfee MDDF-20DEN7", "Best value", "Proven dehumidifier for living spaces.", "€€ · approx. €150–200", "Comfee+MDDF-20DEN7", "dehum"),
   ("MeacoDry Arete One 20L", "Quiet & for laundry", "Manufacturer rating 20 l/day, HEPA filter and laundry mode; public tests praise it mainly for quiet running.", "€€€ · check price locally", "MeacoDry+Arete+One+20L", "dehum"),
   ("For the basement", "Continuous", "Models with a drain hose for continuous use.", "by room size", "dehumidifier+basement+drain+hose", "dehum"),
 ],
 # EN heater ladder (2026-08-28, with the EN qm series): same verified models as
 # the German set — names, search terms and manufacturer claims identical, only
 # the card copy is English.
 "heater": [
   ("Schmidbauer Hybrid Pro 600 W", "Small rooms", "Infrared plus convection with a stepless thermostat; the manufacturer names 6–12 m² as its range.", "€€ · check price locally", "Schmidbauer+Hybrid+Pro+600+W+Infrarotheizung", "heater"),
   ("Schmidbauer ISP T 700 W", "Bathroom-capable", "700 W and rated by the manufacturer for damp rooms — the answer to bathroom heating without running a fan heater for hours.", "€€ · check price locally", "Schmidbauer+ISP+T+700+Infrarotheizung", "heater"),
   ("Midea NTH20-17BR", "Fast heat", "Ceramic fan heater with two stages (1,200 / 2,000 W) — for quick warm-ups, not for continuous heating.", "€ · check price locally", "Midea+NTH20-17BR+Heizl%C3%BCfter", "heater"),
 ],
}


def device_of(slug):
    s = slug
    if s.startswith(("balkonkraftwerk-", "balkonspeicher-", "growatt-", "zendure-")):
        return "storage"
    if "ventilator" in s:
        return "fan"
    if ("luftentfeuchter" in s or "dehumidifier" in s
            or "waesche-trocknen" in s or s.startswith("keller-")
            or "beschlagen" in s or "taupunkt" in s
            # The RV winter-damp page is a humidity page whose slug carries none of
            # the usual tokens; without this it would fall through to "ac" and get
            # the cooling components on a page about a parked, unheated vehicle.
            or "feuchtigkeit-winter" in s
            # Mould pages are humidity pages (2026-09-09). Without this the
            # "schimmel-" family fell through to "ac": schimmel-im-keller-entfernen
            # was live carrying the heatwave band and cooling products on a page
            # about mould in an unheated cellar. Found while adding three more.
            # Prefix, not substring: mobile-klimaanlage-stinkt-schimmel is a
            # page about an air conditioner that smells, whose reader owns an AC
            # and needs filters and cleaner. A substring test would have moved
            # this site's best search-driven page into the wrong device family.
            or s.startswith(("schimmel-", "stockflecken-"))
            # Humidifier pages live in the humidity family too: routing them to
            # "dehum" keeps every ac-only component (sizer, heat-energy box,
            # climate box) off the page; the card grid itself is overridden by
            # CONTEXT_MODELS, and the dehumidifier quick-pick router is blocked
            # by keyword in inject_quickpick — a reader whose air is too DRY
            # must never be routed to a dehumidifier picker.
            or "luftbefeuchter" in s):
        return "dehum"
    if "luftreiniger" in s:
        return "purifier"
    # Bodenpflege family (vertical replication #1, 2026-08-28): a distinct key
    # so every ac-only component (sizer, heat-energy box, climate box, AC
    # quickpick) skips these pages by construction. DEVICE_MODELS has no
    # "vacuum" table yet — early pages are troubleshooting-shaped and carry
    # their parts via CONTEXT_MODELS; a curated model table comes only when a
    # buying-intent page earns it.
    if ("staubsauger" in s or "saugwischer" in s or "tineco" in s
            or "dreame" in s or "saugroboter" in s):
        return "vacuum"
    # Note: there is deliberately no "cooler" branch. DEVICE_MODELS has no cooler
    # family, and the lookup falls back to "ac", so adding one would be dead code
    # that changes nothing. The page that mattered — bester-luftkuehler, holder of
    # this site's highest citation share (52 % on "leenon 9l mobiler luftkühler
    # reinigen") — is handled by CONTEXT_MODELS instead, which offers the wear
    # parts its own cleaning chapter is about. klimaanlage-vs-luftkuehler keeps
    # the AC set on purpose: there it is a buying comparison, and naming cooler
    # models we have not seen endorsed anywhere would be invention.
    if ("infrarotheizung" in s or "heizluefter" in s
            or s.startswith(("heizung-", "heizkosten-", "electric-heater-"))
            # Tenant winter page: reversible measures, not a device page. It must
            # land in "heater" so the cooling components stay off it; its own
            # CONTEXT_MODELS overrides the card grid with the renter product set.
            or "senken-als-mieter" in s
            or "heizfunktion" in s or "heizdecke" in s or "heizkissen" in s):
        return "heater"
    if "thermovorhang" in s or "hitzeschutz" in s or "beschatten" in s:
        return "shade"
    return "ac"


# Named models already endorsed on curated pages — if a page already mentions
# one, skip injection so recommendations never double up.
CANON_NAMES = ["De'Longhi", "De%27Longhi", "Comfee", "AEG ChillFlex", "Midea PortaSplit",
               "MeacoFan", "Rowenta", "Levoit", "Lichtblick"]
# Interactive tool pages carry their own widgets/CTAs — no model grid there.
# Also skip pages whose real product (car sunshade, cooling mat, myth-buster)
# doesn't match any device set, so cards never look irrelevant.
SKIP_MODELS = {"btu-rechner", "stromkosten-rechner", "infrarotheizung-watt-rechner",
               "hitze-check", "was-bedeutet-btu",
               # The product here is the seal, not an air conditioner — AC model
               # cards (and the AC popup) would sell past the reader's intent.
               "fensterabdichtung-klimaanlage", "window-seal-portable-ac",
               "fensterabdichtung-selber-bauen",
               "auto-bei-hitze-kuehlen", "haustier-hitze-kuehlen",
               "ventilator-mit-eis", "richtig-lueften-bei-hitze", "pc-ueberhitzt-sommer"}
# EN qm twins were briefly in SKIP_MODELS on 2026-08-28 (DEVICE_MODELS_EN had
# no heater set, and models_block falls back to AC cards). Same day the EN
# dehum/heater card sets were added, so the injectors now serve these pages
# the verified model ladders — the proven toppick+grid double hook.


# --- Pages whose reader wants a real product, just not the one device_of()
# infers. Until now these had two failure modes, both visible in the funnel:
# klimaanlage-wohnmobil got the generic household-AC grid at the very top of the
# page while its own text explains a monoblock is usually too bulky for a camper
# (the strongest product block on the page contradicted the article under it),
# and auto-/haustier- were dropped into SKIP_MODELS, so pages with clear buying
# intent showed no visual product block at all — only text links far down.
#
# The queries below are the ones already used in each page's own body copy, so
# this promotes what the article itself recommends into the card grid, the top
# strip and the exit prompt. No new selection judgement, no named model whose
# trade-off we can't back — generic category cards, exactly as the dehumidifier
# and shade sets already do. ---
CONTEXT_MODELS = {
 # growatt-noah-2000-probleme (2026-08-28). Live gap: the site's hottest current
 # page (11 pv in the last 4 days) showed 0 affiliate clicks — because its top
 # pitch was three €1.000 REPLACEMENT batteries aimed at a reader who is
 # TROUBLESHOOTING the battery they already own. Category-corrected to the
 # diagnostic tools the page's own sections imply (Ausgangsleistung → measure at
 # the socket; App/WLAN → an app-independent meter), which are the 6%-band cheap
 # durables this site's A-grade data shows converting. One switch-instead-of-fix
 # chip stays, honestly labelled, because the page has an explicit
 # "Alternativen im Blick" section.
 # Split-Cluster (2026-08-31). The site's highest-ticket path was selling the
 # cheapest device on it. The BTU calculator's fourth tier routes every room
 # above 13.500 BTU here because a monoblock is genuinely at its limit — and
 # split-klimaanlage-ohne-kernbohrung, portasplit-vs-monoblock and
 # midea-portasplit-kaufen then showed that reader the same monoblock cards as
 # a 15 m² page (EX105 / PAC N90 / Comfee / Klarstein). The whole cluster is
 # built around the Midea PortaSplit, which this site already documents as sold
 # out, so its own premise had no current answer.
 #
 # Correction to a first reading of this cluster: the tower-fan and portable-AC
 # links on midea-portasplit-kaufen are NOT a mis-sell. Both sit inside the
 # "for whom is this not worth it" section ("only hot on a few days — then a fan
 # is enough", "a portable at ~250 € is louder and less efficient but available
 # today"). That is this site's honest ordering doing its job. Left alone.
 #
 # Two contradictions resolve at once: a CONTEXT_MODELS page also drops out of
 # EB_SIZER, and the sizer's top band was recommending a monoblock on the page
 # whose thesis is that a monoblock has run out of room.
 #
 # Quick-Connect is the German term for what this cluster is about: pre-filled,
 # self-sealing lines, so no flaring tool and no vacuum pump. Models confirmed
 # on amazon.de listings, with public comparison coverage (homeandsmart,
 # klimaanlagentest.de; notebookcheck reported the 9.000 BTU set at 449 €).
 # SEARCH LINKS BY NAME, NO ASIN — candidates exist (B0F7XDNQRN, B0F7XC611X)
 # but today's EX105 closure is exactly why a listing title read through a
 # search index is not verification. They go in when someone opens the listing.
 #
 # Honest order, not commission order: 9.000 BTU first because most readers of
 # this site size below 25 m²; the 12.000 for the rooms the fourth tier sends
 # here; KESSER third because two competing listings for the same model make it
 # the least unambiguous of the three.
 **{slug: [
   ("TCL BreezeIn Quick Connect 9.000 BTU", "Quick-Connect, bis ca. 25 m²",
    "Vorgefüllte Leitungen mit Schnellkupplung — kein Bördeln, kein Vakuumieren. 2,6 kW, R32, kühlt und heizt. In öffentlichen Vergleichen als besonders leise geführt.",
    "€€€ · ab ca. 450 €", "TCL+BreezeIn+Quick+Connect+9000+BTU", "ac"),
   ("TCL BreezeIn Quick Connect 12.000 BTU", "Für die großen Räume",
    "3,4 kW — die Klasse, in die dich der BTU-Rechner oberhalb von 13.500 BTU schickt, weil ein Monoblock dort ausläuft. R32, App- und Sprachsteuerung.",
    "€€€ · Preis vor Ort prüfen", "TCL+BreezeIn+Quick+Connect+12000+BTU", "ac"),
   ("KESSER Split Quick Connect 12.000 BTU", "Mit Heizfunktion im Set",
    "3,4 kW, R32, Montagematerial im Lieferumfang. Achte beim Kauf auf die Variante — von diesem Modell stehen mehrere Angebote nebeneinander.",
    "€€€ · Preis vor Ort prüfen", "KESSER+Split+Klimaanlage+Quick+Connect+12000+BTU", "ac"),
 ] for slug in ("split-klimaanlage-ohne-kernbohrung",
                "portasplit-vs-monoblock",
                "midea-portasplit-kaufen")},

 "growatt-noah-2000-probleme": [
   ("Energiemessgerät (Steckdose)", "Erst messen", "Zeigt, was der NOAH wirklich liefert — die Grundlage für jede Ausgangsleistungs-Diagnose, unabhängig von der App.", "€ · ca. 10–20 €", "energiekostenmessger%C3%A4t+steckdose", "battery"),
   ("WLAN-Messsteckdose", "App-unabhängig loggen", "Protokolliert die Einspeisung auch dann, wenn die Growatt-App gerade streikt — mit eigener Verlaufskurve.", "€ · ca. 15–30 €", "wlan+steckdose+strommessung", "battery"),
   ("Anker Solarbank 2 E1600 Pro", "Wenn tauschen statt reparieren", "Die kleinste sinnvolle Alternative, falls du das Kapitel NOAH beendest — Details im Abschnitt „Alternativen im Blick“.", "1,6 kWh · Preis vor Ort prüfen", "Anker+Solix+Solarbank+2+E1600+Pro", "battery"),
 ],

 # Mieter-Winterlinie (2026-08-28). The site's audience is 79 % renter-leaning by
 # landing-page intent (money line 19:1), and until today every one of its 33
 # tenant-facing pages was about cooling. These four are the reversible measures a
 # renter may fit without permission, and the ORDER IS THE PAGE'S HONEST RANKING,
 # not the commission: the thermostat head first because the schedule is the real
 # lever, the reflector foil last with its own ceiling written into the card
 # (ZVSHK: max ~4 %, only in poorly insulated buildings). A card that oversold the
 # foil would earn the same few cents and cost the thing this site actually has.
 "heizkosten-senken-als-mieter": [
   ("Programmierbarer Thermostatkopf", "Der größte Hebel", "Spart über die Absenkung, nicht über das Gerät — nur sinnvoll, wenn du sie wirklich einstellst. Alten Kopf aufheben und beim Auszug wieder anschrauben.", "€ · ca. 20–80 €", "heizk%C3%B6rperthermostat+programmierbar", "heater"),
   ("Türdichtung / Zugluftstopper", "Wirkt sofort", "Für Türen, an denen du den Luftzug spürst. Billigste Maßnahme mit sofort spürbarem Effekt.", "€ · ab ca. 10 €", "t%C3%BCrdichtung+zugluftstopper", "heater"),
   ("Fenster-Isolierfolie", "Nur bei Einfachglas", "Deutlich nur auf echter Einfachverglasung. Auf Doppel-/Dreifachverglasung bringt sie wenig — vorher prüfen.", "€ · ca. 15–30 €", "fenster+isolierfolie+w%C3%A4rme", "shade"),
   ("Reflektorfolie", "Zuletzt, nicht zuerst", "Laut Branchenverband max. ~4 % und nur in schlecht gedämmten Gebäuden; praktisch 1–3 % im Raum. Altbau mit alten Rippenheizkörpern: ja. Neubau: kaum messbar.", "€ · ab ca. 10 €", "heizk%C3%B6rper+reflektorfolie", "heater"),
 ],

 # Wohnmobil × Winterfeuchte (2026-08-28). The device decision on this page is
 # bauart-first (adsorption works cold, compressor does not, granulate needs no
 # power), so the three cards ARE the three answers — not three brands of the
 # same thing. Deliberately no named model: we have verified no public test that
 # ranks RV-specific dehumidifiers, and naming one would be invention. Category
 # searches are the honest form here, and they are all low-price durables — the
 # band this site's own PartnerNet data shows converting with zero returns.
 "wohnmobil-feuchtigkeit-winter": [
   ("Adsorptionstrockner", "Wenn Strom anliegt", "Arbeitet im Gegensatz zum Kompressor-Gerät auch bei niedrigen Temperaturen — die übliche Empfehlung für den Standwinter.", "€€ · Preis vor Ort prüfen", "adsorptionstrockner+luftentfeuchter", "dehum"),
   ("Granulat-Entfeuchter", "Ohne Strom", "Passiv, temperaturunabhängig — die einzige Bauart, die am Stellplatz ohne Anschluss überhaupt wirkt. Aufnahme ist begrenzt, lieber mehrere kleine verteilen.", "€ · ab ca. 10 €", "luftentfeuchter+granulat+wohnmobil", "dehum"),
   ("Hygrometer", "Damit du es merkst", "Zeigt beim nächsten Besuch, ob die Maßnahme reicht. Zielbereich 50–60 % relative Luftfeuchte.", "€ · ab ca. 10 €", "hygrometer+innen+wohnmobil", "dehum"),
 ],

 # A page whose entire job is "the bestseller is sold out, what else?" — the
 # strongest purchase intent on the site — was offering three unrelated monoblocs
 # while its own text names two specific alternatives and a fallback. 11 views,
 # zero clicks. Every model and figure below is quoted from the article itself.
 "midea-portasplit-ausverkauft-alternativen": [
   ("Clima Butler Split 2 (CB-3500)", "Option 1: gleiches Prinzip", "Split ohne Bohren, ca. 3,5 kW, Inverter — die direkteste Entsprechung zur PortaSplit.", "Preis vor Ort prüfen", "Clima+Butler+Split+2+CB-3500", "ac"),
   ("Remko RKL-DC-Serie", "Option 2: die stärkere", "Ca. 4,3 kW laut Datenblatt, ebenfalls Split ohne Festinstallation — für größere Räume.", "Preis vor Ort prüfen", "Remko+RKL+DC+Klimaanlage", "ac"),
   ("Midea PortaSplit", "Falls wieder lieferbar", "Midea hat die Produktion laut Branchenberichten auf 6.000 Geräte/Tag verdoppelt — Verfügbarkeit schwankt täglich.", "Preis vor Ort prüfen", "Midea+PortaSplit", "ac"),
   ("Fensterabdichtung", "Option 3: Monoblock sofort", "Der Monoblock ist sofort lieferbar und günstiger — aber nur, wenn die Abdichtung stimmt. Ohne sie verpufft der Unterschied.", "Preis vor Ort prüfen", "klimaanlage+fensterabdichtung", "shade"),
 ],
 # ---- Autumn/first-sale iteration (2026-08-17) -------------------------------
 # Driven by three findings that survived adversarial review: the PartnerNet
 # milestone is a COUNT of qualifying sales (a 12 € seal counts like a 500 €
 # unit); returns void a qualifying sale, so cheap durable items beat
 # high-consideration appliances; and German portable-AC demand ends within
 # weeks while the account's 180-day clock runs into winter. Every product below
 # is one the page's own body already recommends — no new claims, no invented
 # prices. Price bands are quoted only where the page itself states one.
 "klimaanlage-kippfenster": [
   ("Fensterabdichtung (Klett, universal)", "Das Teil, das wirklich fehlt", "Ohne dichtes Fenster verliert der Monoblock den Großteil seiner Leistung — das ist das meistgekaufte Zubehörteil überhaupt.", "Preis vor Ort prüfen", "klimaanlage+fensterabdichtung+klett", "shade"),
   ("Abluftdüse für Kippfenster", "Für den Schlauch", "Führt den Abluftschlauch sauber durch den Kippspalt, statt ihn frei einzuklemmen.", "Preis vor Ort prüfen", "fensterabluftd%C3%BCse+kippfenster", "ac"),
   ("XPS-/Hohlkammerplatte", "Für die dichteste Lösung", "Zugeschnittene Platte statt Stoff — die dichteste Variante, wenn du einmal zuschneiden willst.", "Preis vor Ort prüfen", "xps+platte+zuschnitt", "shade"),
 ],
 "klimaanlage-dachfenster": [
   ("Dachfenster-Abdichtung", "Für Velux & Co.", "Schräge Fenster brauchen eine eigene Form — die Standard-Schiebefenster-Sets passen nicht.", "Preis vor Ort prüfen", "fensterabdichtung+dachfenster+klimaanlage", "shade"),
   ("Abluftschlauch-Verlängerung", "Wenn der Weg weit ist", "Beim Dachfenster liegt der Auslass oft höher als das Gerät — kurze Serienschläuche reichen dann nicht.", "Preis vor Ort prüfen", "abluftschlauch+verl%C3%A4ngerung+klimaanlage", "ac"),
   ("Alu-Klebeband (hitzebeständig)", "Für die Übergänge", "Normales Paketband löst sich am warmen Schlauch — hitzebeständiges Alu-Band hält.", "Preis vor Ort prüfen", "alu+klebeband+hitzebest%C3%A4ndig", "shade"),
 ],
 "fensterabdichtung-klimaanlage": [
   ("Fensterabdichtung (Klett, universal)", "Für die meisten Fenster", "Passt an Dreh-Kipp-Fenster und ist rückstandsfrei wieder abnehmbar — die Standardlösung zur Miete.", "Preis vor Ort prüfen", "fensterabdichtung+mobile+klimaanlage+klett", "shade"),
   ("Abluft-Panel für Kippfenster", "Feste Variante", "Starres Panel statt Stoff: dichtet besser ab, will aber einmal passend gemacht werden.", "Preis vor Ort prüfen", "kippfenster+abluft+panel+klimaanlage", "ac"),
   ("Dachfenster-Abdichtung", "Für schräge Fenster", "Eigene Form für Velux-artige Fenster — Schiebefenster-Sets passen dort nicht.", "Preis vor Ort prüfen", "dachfenster+abdichtung+klimaanlage", "shade"),
 ],
 "fensterabdichtung-selber-bauen": [
   ("Hohlkammerplatte zum Zuschneiden", "Das Grundmaterial", "Leicht, stabil, mit Cutter zu schneiden — die Basis der selbstgebauten Platte.", "Preis vor Ort prüfen", "hohlkammerplatte+zuschnitt", "shade"),
   ("Magnetband, selbstklebend", "Abnehmbar befestigen", "Hält die Platte im Rahmen und lässt sie zum Lüften in Sekunden abnehmen.", "Preis vor Ort prüfen", "magnetband+selbstklebend", "shade"),
   ("Schaumstoff-Dichtungsband", "Gegen die Restspalte", "Schließt die Fuge zwischen Platte und Rahmen — dort geht sonst die meiste Kühlleistung verloren.", "Preis vor Ort prüfen", "fensterdichtung+schaumstoffband", "shade"),
 ],
 "abluftschlauch-verlaengern": [
   ("Abluftschlauch-Verlängerung", "Mehr Länge", "Passende Verlängerung statt Eigenbau — Durchmesser vorher am Gerät messen.", "Preis vor Ort prüfen", "abluftschlauch+verl%C3%A4ngerung+klimaanlage", "ac"),
   ("Adapter / Verbinder", "Zwei Schläuche koppeln", "Verbindet zwei Schläuche dicht miteinander; ohne Adapter zieht die Kopplung warme Luft.", "Preis vor Ort prüfen", "abluftschlauch+adapter+verbinder", "ac"),
   ("Schlauch-Isolierung", "Gegen Rückwärme", "Der lange Schlauch heizt den Raum, den er kühlen soll — Isolierung ist bei Verlängerung Pflicht.", "Preis vor Ort prüfen", "isolierschlauch+mobile+klimaanlage", "shade"),
 ],
 "mobile-klimaanlage-tropft-wasser": [
   ("Kondensat-Ablaufschlauch", "Dauerablauf statt Eimer", "Führt das Kondensat kontinuierlich ab, statt dass der Tank überläuft.", "Preis vor Ort prüfen", "kondensatschlauch+mobile+klimaanlage", "dehum"),
   ("Kleine Wasserwaage", "Die häufigste Ursache", "Steht das Gerät schief, läuft das Wasser an der falschen Stelle heraus — zuerst prüfen, bevor du etwas kaufst.", "Preis vor Ort prüfen", "wasserwaage+klein", "purifier"),
   ("Kondensatpumpe", "Wenn kein Gefälle da ist", "Nötig, wenn der Ablauf höher liegt als das Gerät — sonst läuft nichts ab.", "Preis vor Ort prüfen", "kondensatpumpe+klimaanlage", "dehum"),
 ],
 "mobile-klimaanlage-kuehlt-nicht": [
   ("Fensterabdichtung", "Die größte versteckte Ursache", "Ein offener Fensterspalt frisst den Großteil der Kühlleistung — das ist häufiger die Ursache als ein schwaches Gerät.", "Preis vor Ort prüfen", "klimaanlage+fensterabdichtung", "shade"),
   ("Ersatz-Filter", "Wenn der Luftstrom schwach ist", "Ein zugesetzter Filter drosselt den Luftstrom spürbar; waschen hilft, irgendwann hilft nur tauschen.", "Preis vor Ort prüfen", "klimaanlage+ersatzfilter+universal", "purifier"),
   ("Schlauch-Adapter", "Gegen Leckluft am Schlauch", "Undichte Übergänge blasen warme Luft zurück in den Raum.", "Preis vor Ort prüfen", "abluftschlauch+adapter+verbinder", "ac"),
 ],
 "mobile-klimaanlage-zu-laut": [
   ("Antivibrationsmatte", "Gegen Körperschall", "Entkoppelt das Gerät vom Boden — gegen das Brummen, das durch die Decke zieht.", "10–20 €", "antivibrationsmatte+klimaanlage", "shade"),
   ("Ersatz-Filter", "Wenn das Gebläse pfeift", "Ein verstopfter Filter zwingt das Gebläse auf höhere Drehzahl — und die hört man.", "Preis vor Ort prüfen", "klimaanlage+ersatzfilter+universal", "purifier"),
 ],
 "klimaanlage-nachts-laufen-lassen": [
   ("WLAN-Steckdose mit Zeitschaltung", "Statt durchlaufen zu lassen", "Schaltet das Gerät nachts ab und morgens wieder an. Wichtig: Nicht jedes Modell startet nach Stromunterbrechung selbst wieder — vorher am eigenen Gerät testen.", "Preis vor Ort prüfen", "wlan+steckdose+zeitschaltuhr", "purifier"),
   ("Fensterabdichtung", "Damit die Nacht reicht", "Was nachts gekühlt wurde, hält nur bei dichtem Fenster bis zum Morgen.", "Preis vor Ort prüfen", "klimaanlage+fensterabdichtung", "shade"),
 ],
 "bester-luftkuehler": [
   ("Entkalker / Antikalk", "Der häufigste Wartungsfehler", "Kalk auf den Matten kostet Verdunstungsleistung — der Tank will regelmäßig entkalkt werden.", "Preis vor Ort prüfen", "antikalk+luftk%C3%BChler", "dehum"),
   ("Ersatz-Filtermatte", "Wenn es muffelt", "Die Matte ist Verschleißteil; riecht sie nach dem Trocknen weiter, hilft nur Tausch.", "Preis vor Ort prüfen", "filtermatte+zuschnitt+luftk%C3%BChler", "purifier"),
   ("Kühlakkus für den Tank", "Für ein paar Grad mehr", "Viele Geräte liefern Akkus mit; Nachkaufen bringt spürbar kältere Ausblasluft.", "Preis vor Ort prüfen", "k%C3%BChlakku+luftk%C3%BChler", "cooler"),
 ],
 "mobile-klimaanlage-ueberwintern": [
   ("Abdeckhaube", "Schritt 6: staubfrei lagern", "Staub im Lüfterrad ist der Grund, warum das Gerät im Mai muffelt.", "10–15 €", "abdeckhaube+klimager%C3%A4t", "shade"),
   ("Ersatz-Filter", "Sauber einlagern", "Mit frischem Filter einlagern heißt: im Frühjahr einschalten statt erst putzen.", "Preis vor Ort prüfen", "klimaanlage+ersatzfilter+universal", "purifier"),
   ("Reinigungs-Schaum für den Verdampfer", "Vor dem Einlagern", "Feuchter Verdampfer + Monate Stillstand = Schimmelgeruch im Frühjahr.", "Preis vor Ort prüfen", "klimaanlagen+reiniger+schaum+verdampfer", "ac"),
 ],
 # Category-strategy round 2026-08-25 (owner: research fees/conversion, pick
 # categories, then build). Decision memo: docs/amazon-category-strategy-2026-08.md.
 # The autumn dehumidifier cluster leads the matrix; these two device hub pages
 # had NO purchase surface at all. "Meistgesucht" is a first-party demand signal
 # (trends-rising.json, dated), explicitly NOT a test verdict.
 # Heating cluster surfaces (2026-08-25, owner: expand hot-product directions).
 # Schmidbauer chip = demand signal from our own trends data (v=62.950), labeled
 # as such; the thermostat search is the exact term that already earned a click
 # on heizung-40-qm (D1). Nothing here is a test verdict.
 # Fast-strike 2026-08-26 (rising "infrarotheizung für garage" v=44.050): the
 # page's own verdict is spot-heat yes / frost guard cheaper / whole-room no —
 # the three chips ARE those three answers, nothing beyond the article's claims.
 # Bodenpflege #1 (2026-08-28). Troubleshooting page: the reader owns the
 # device, so the cards are the parts its own diagnosis chapters end in —
 # never a replacement unit. Search links by part name (ASIN convention:
 # verified ASINs only, and consumables have none verified yet).
 "tineco-saugt-nicht-mehr": [
   ("Ersatzfilter-Set (Tineco-kompatibel)", "Die häufigste Ursache", "Zugesetzte Filterlamellen sind laut den verlinkten Anleitungen der Grund Nr. 1 für schwache Saugleistung — Wechselrhythmus schlägt Nachkaufen im Defektfall.", "Preis vor Ort prüfen", "tineco+ersatzfilter", "purifier"),
   ("Ersatz-Bürstenrolle", "Wenn die Walze blockiert", "Haare und Fasern um die Walze bremsen den Luftstrom, bevor irgendetwas defekt ist — eine Reserve-Rolle macht die Reinigung zur 5-Minuten-Sache.", "Preis vor Ort prüfen", "tineco+b%C3%BCrstenrolle+ersatz", "purifier"),
   ("Reinigungslösung für Waschsauger", "Schont Schlauch & Dichtungen", "Zu scharfe Reiniger nennt die verlinkte Schlauch-Anleitung als eine Ursache für Materialermüdung — die freigegebene Lösung ist die billigere Versicherung.", "Preis vor Ort prüfen", "tineco+reinigungsl%C3%B6sung", "purifier"),
 ],
 "infrarotheizung-garage": [
   ("Infrarot-Heizstrahler (Wand/Decke)", "Punktwärme am Arbeitsplatz", "Wärmt dich und die Werkbank direkt statt der Garagenluft — der Einsatzfall, für den Infrarot in der ungedämmten Garage gebaut ist.", "Preis vor Ort prüfen", "infrarot+heizstrahler+werkstatt+wandmontage", "heater"),
   ("Frostwächter mit Thermostat", "Nur frostfrei halten", "Springt erst unterhalb der eingestellten Temperatur an — für reinen Frostschutz die sparsamere Lösung als ein Panel im Dauerbetrieb.", "Preis vor Ort prüfen", "frostw%C3%A4chter+thermostat", "heater"),
   ("Steckdosen-Thermostat", "Abschaltung nachrüsten", "Schaltet einen vorhandenen Strahler temperaturgesteuert — Dauerbetrieb ist laut der Rechnung auf dieser Seite der teuerste Fehler.", "Preis vor Ort prüfen", "steckdosen+thermostat+heizung", "heater"),
 ],
 "schimmel-wand-kommt-wieder": [
   ("Hygrometer (innen)", "Die Zahl vor jedem Kauf", "Erst messen, dann kaufen: entscheidend ist der Wert an der kalten Stelle, nicht in der Raummitte. Rund 10 €.", "Preis vor Ort prüfen", "hygrometer+innen", "purifier"),
   ("Infrarot-Thermometer", "Wie kalt ist die Ecke wirklich", "Misst die Oberflächentemperatur der Wand — genau die Größe, um die es auf dieser Seite geht.", "Preis vor Ort prüfen", "thermometer+infrarot+oberfl%C3%A4che", "purifier"),
   ("Luftentfeuchter", "Vorbeugen, nicht heilen", "Hält die Raumfeuchte unten, damit an der kalten Stelle gar nichts kondensiert. Vorhandenen Bewuchs entfernt er nicht.", "Preis vor Ort prüfen", "luftentfeuchter", "dehum"),
 ],
 "schimmel-bad-fugen": [
   ("Duschabzieher", "Die wirksamste Minute", "Das Wasser von Fliesen und Fuge zu ziehen ist laut dieser Seite der wirksamste Einzelschritt — und der billigste.", "Preis vor Ort prüfen", "duschabzieher+abzieher+dusche", "purifier"),
   ("Sanitärsilikon", "Wenn die Fuge erneuert wird", "Sobald der Belag im Silikon sitzt, hilft kein Reiniger mehr — dann wird die Fuge gezogen und neu gesetzt.", "Preis vor Ort prüfen", "sanit%C3%A4r+silikon+schimmelresistent", "purifier"),
   ("Hygrometer (innen)", "Der Spitzenwert nach dem Duschen", "Zeigt, ob die Feuchte in der halben Stunde danach wirklich runtergeht. Rund 10 €.", "Preis vor Ort prüfen", "hygrometer+innen", "purifier"),
 ],
 "schimmel-kleiderschrank": [
   ("Hygrometer (innen)", "Messen, wo es zählt", "Der Wert hinter und im Schrank entscheidet, nicht der in der Raummitte. Rund 10 €.", "Preis vor Ort prüfen", "hygrometer+innen", "purifier"),
   ("Luftentfeuchter-Granulat", "Für den Schrank selbst", "Passiv, klein, für ein geschlossenes Möbel — der elektrische Entfeuchter ist für den Raum, nicht für den Schrank.", "Preis vor Ort prüfen", "luftentfeuchter+granulat", "dehum"),
   ("Granulat-Nachfüllpack", "Der laufende Posten", "Granulat ist ein Verbrauchsmaterial — das gehört in die Rechnung, bevor du dich dafür entscheidest.", "Preis vor Ort prüfen", "raumentfeuchter+granulat+nachf%C3%BCll", "dehum"),
 ],
 "infrarotheizung-badezimmer": [
   ("Infrarotheizung fürs Bad", "Der Normalfall", "Panel auf die freie Wandfläche. Die Watt-Tabelle oben nennt für ein 6-m²-Bad je nach Dämmung 360 bis 600 W — nicht selbst getestet.", "Preis vor Ort prüfen", "infrarotheizung+bad", "heater"),
   ("Spiegelheizung", "Wenn keine Wand frei ist", "Löst das eigentliche Bad-Problem, den Platz. Schutzart und Montage stehen in der Produktangabe und gehören dort geprüft.", "Preis vor Ort prüfen", "spiegelheizung+bad", "heater"),
   ("Steckdosen-Thermostat mit Timer", "Damit es nur morgens läuft", "Die Gegenrechnung auf dieser Seite betrifft das vergessene Panel — die Abschaltung ist der billigste Schutz davor.", "Preis vor Ort prüfen", "steckdosen+thermostat+heizung", "heater"),
 ],
 "infrarotheizung-standgeraet": [
   ("Infrarotheizung als Standgerät", "Ohne Bohren, ohne Erlaubnis", "Aufstellen, einstecken, beim Auszug rückstandslos mitnehmen — der eine echte Vorteil dieser Bauform.", "Preis vor Ort prüfen", "infrarotheizung+standger%C3%A4t", "heater"),
   ("Steckdosen-Thermostat mit Timer", "Damit es nicht den Abend durchläuft", "Die Rechnung auf dieser Seite zeigt: teuer wird der Dauerbetrieb, nicht die Wattzahl.", "Preis vor Ort prüfen", "steckdosen+thermostat+heizung", "heater"),
   ("Energiekostenmessgerät", "Erst messen, dann glauben", "Zeigt, was das Gerät wirklich zieht — glaub keiner Rechnung, auch unserer nicht.", "Preis vor Ort prüfen", "energiekostenmessger%C3%A4t+steckdose", "purifier"),
 ],
 "infrarotheizung-decke-oder-wand": [
   ("Infrarotheizung zur Deckenmontage", "Wenn keine Wand mehr frei ist", "Strahlt nach unten auf die Zone darunter. Befestigungsmaterial und zulässiger Untergrund stehen in der Montageanleitung.", "Preis vor Ort prüfen", "infrarotheizung+deckenmontage", "heater"),
   ("Bildheizung", "Dasselbe Gerät mit Motiv", "Reine Optikfrage — die Wattzahl entscheidet, nicht das Bild. Die Auswahl an Größen ist kleiner als bei schlichten Panels.", "Preis vor Ort prüfen", "infrarotheizung+bild", "heater"),
   ("Infrarotheizung mit Thermostat", "Die sinnvolle Grundausstattung", "Ohne Thermostat läuft das Panel durch — egal, ob es an der Wand oder an der Decke hängt.", "Preis vor Ort prüfen", "infrarotheizung+mit+thermostat", "heater"),
 ],
 "infrarotheizung-ratgeber": [
   ("Schmidbauer Infrarotheizung", "Meistgesucht diese Woche", "Die aktuell meistgesuchte Marke in unserer täglichen Google-Trends-Abfrage (Stand 25.08.). Nachfrage-Signal, kein Testurteil — nicht selbst getestet.", "Preis vor Ort prüfen", "Schmidbauer+Infrarotheizung", "heater"),
   ("Infrarotheizung mit Thermostat", "Die sinnvolle Grundausstattung", "Ohne Thermostat läuft die Paneele durch — mit schaltet sie nur, wenn der Raum es braucht.", "Preis vor Ort prüfen", "infrarotheizung+mit+thermostat", "heater"),
   ("Energiekostenmessgerät", "Erst messen, dann glauben", "Steckdosen-Messgerät zeigt, was die Heizung wirklich zieht — glaub keiner Rechnung, auch unserer nicht.", "Preis vor Ort prüfen", "energiekostenmessger%C3%A4t+steckdose", "purifier"),
 ],
 "heizluefter-stromsparend": [
   ("Heizlüfter mit Thermostat & Timer", "Das Sparmerkmal", "Der Stromspar-Hebel ist nicht das Gerät, sondern die Abschaltung — Thermostat und Timer machen den Unterschied.", "Preis vor Ort prüfen", "heizl%C3%BCfter+thermostat+timer", "heater"),
   ("Energiekostenmessgerät", "Erst messen", "Zeigt, was der Heizlüfter wirklich kostet — die Rechnung dazu steht auf dieser Seite.", "Preis vor Ort prüfen", "energiekostenmessger%C3%A4t+steckdose", "purifier"),
   ("Infrarotheizung", "Die Alternative für längere Laufzeiten", "Wer täglich stundenlang heizt, fährt mit Strahlungswärme oft besser — der Vergleich steht im Ratgeber.", "Preis vor Ort prüfen", "infrarotheizung+mit+thermostat", "heater"),
 ],
 "luftentfeuchter-ratgeber": [
   ("Pro Breeze Luftentfeuchter 20 L", "Meistgesucht diese Woche", "Das aktuell meistgesuchte Einzelmodell in unserer täglichen Google-Trends-Abfrage (Stand 25.08.). Nachfrage-Signal, kein Testurteil — nicht selbst getestet.", "Preis vor Ort prüfen", "pro+breeze+luftentfeuchter+20l", "dehum"),
   ("Comfee MDDF-20DEN7", "Der Keller-Favorit", "In mehreren Fachvergleichen der Keller-Favorit — 20 L/Tag, Hygrostat, Dauerablauf-Anschluss.", "Preis vor Ort prüfen", "Comfee+MDDF-20DEN7+Luftentfeuchter", "dehum"),
   ("Hygrometer", "Erst messen", "Ob und wie stark du entfeuchten musst, entscheidet der Messwert — über 60 % wird es kritisch.", "Preis vor Ort prüfen", "hygrometer+innen", "purifier"),
 ],
 "luftentfeuchter-gegen-schimmel": [
   ("Luftentfeuchter mit Hygrostat", "Das eigentliche Werkzeug", "Hält die Luftfeuchte automatisch unter der Schimmelschwelle — genau das, was dieser Ratgeber erklärt.", "Preis vor Ort prüfen", "luftentfeuchter+mit+hygrostat", "dehum"),
   ("Pro Breeze Luftentfeuchter 20 L", "Meistgesucht diese Woche", "Das aktuell meistgesuchte Einzelmodell in unserer täglichen Google-Trends-Abfrage (Stand 25.08.). Nachfrage-Signal, kein Testurteil — nicht selbst getestet.", "Preis vor Ort prüfen", "pro+breeze+luftentfeuchter+20l", "dehum"),
   ("Hygrometer", "Kontrolle statt Hoffnung", "Nach der Entfernung zeigt nur der Messwert, ob die Ursache wirklich weg ist.", "Preis vor Ort prüfen", "hygrometer+luftfeuchtigkeit+innen", "purifier"),
 ],
 "luftentfeuchter-granulat-oder-elektrisch": [
   ("Granulat-Nachfüllpacks", "Der laufende Posten", "Die Nachfüllpacks sind der eigentliche Kostenfaktor — Granulatgeräte selbst kosten fast nichts.", "Preis vor Ort prüfen", "luftentfeuchter+granulat+nachf%C3%BCll", "dehum"),
   ("Raumentfeuchter (Granulat)", "Für Schrank & Bad", "Ohne Strom, ohne Geräusch — für kleine geschlossene Räume die einfachste Lösung.", "Preis vor Ort prüfen", "raumentfeuchter+granulat", "dehum"),
   ("Hygrometer", "Erst messen", "Ohne Messwert weißt du nicht, ob du überhaupt entfeuchten musst — über 60 % wird es kritisch.", "Preis vor Ort prüfen", "hygrometer+innen", "purifier"),
 ],
 "waesche-trocknen-wohnung": [
   ("Luftentfeuchter fürs Wäschetrocknen", "Das eigentliche Werkzeug", "Zieht die Feuchte aus der Luft, die sonst an den Außenwänden landet.", "Preis vor Ort prüfen", "luftentfeuchter+w%C3%A4schetrocknen", "dehum"),
   ("Hygrometer", "Die Warnschwelle", "Über 60 % relativer Feuchte beginnt das Schimmelrisiko — ohne Messgerät merkst du es zu spät.", "Preis vor Ort prüfen", "hygrometer+innen", "purifier"),
   ("Standtrockner", "Mehr Fläche, schneller trocken", "Je mehr Wäsche frei hängt, desto schneller ist sie trocken und desto kürzer die feuchte Phase.", "Preis vor Ort prüfen", "w%C3%A4schest%C3%A4nder+standtrockner", "shade"),
 ],
 "luftentfeuchter-keller": [
   ("Hygrometer", "Vor jedem Kauf", "Im Keller entscheidet der Messwert, ob Lüften hilft oder schadet — rate nicht.", "Preis vor Ort prüfen", "hygrometer+innen", "purifier"),
   ("Raumentfeuchter (Granulat)", "Für kleine Kellerräume", "Kein Strom, kein Schlauch — für abgeschlossene kleine Räume oft ausreichend.", "Preis vor Ort prüfen", "raumentfeuchter+granulat", "dehum"),
   ("Luftentfeuchter mit Schlauchanschluss", "Dauerbetrieb ohne Eimer", "Im Keller will niemand täglich den Tank leeren — Schlauchanschluss in den Ablauf.", "Preis vor Ort prüfen", "luftentfeuchter+mit+schlauch", "dehum"),
 ],
 "klimaanlage-balkonkraftwerk": [
   ("Balkonkraftwerk-Speicher", "Macht die Kombination erst tragfähig", "Ohne Speicher fällt die Solarleistung genau dann weg, wenn die Wohnung am wärmsten ist — mit Speicher kühlst du auch abends aus der Sonne.", "ab ca. 215 €/kWh", "balkonkraftwerk+speicher", "battery"),
   ("Energiekostenmessgerät", "Erst messen, dann rechnen", "Steckdosen-Messgerät zeigt, was dein Gerät wirklich zieht — glaub keiner Rechnung (auch unserer nicht), bevor du deinen eigenen Wert kennst.", "ab ca. 15 €", "energiekostenmessger%C3%A4t+steckdose", "purifier"),
   ("Ventilator", "Läuft wirklich mit 800 W", "Ein Ventilator zieht 30–60 W statt 1.000 — das ist der Verbraucher, den ein Balkonkraftwerk tatsächlich den ganzen Tag trägt.", "ab ca. 70 €", "ventilator+leise+standventilator", "fan"),
 ],
 # Fast-strike 2026-08-25 (rising: "schimmel im keller entfernen" v=108.750).
 # Every product type below is named in the article body itself; the third item
 # is the page's core judgement (removal without dehumidifying = subscription
 # to mold), funneling into the keller money cluster.
 "schimmel-im-keller-entfernen": [
   ("Schimmelentferner (chlorfrei)", "Für den Keller erste Wahl", "Wasserstoffperoxid-Basis — wirkt gegen den Belag, ohne Chlordämpfe im schlecht belüfteten Keller.", "Preis vor Ort prüfen", "schimmelentferner+chlorfrei", "purifier"),
   ("Hygrometer", "Erst messen, dann schrubben", "Ob der Keller überhaupt im kritischen Feuchtebereich liegt, entscheidet der Messwert — nicht die Nase.", "Preis vor Ort prüfen", "hygrometer+innen", "purifier"),
   ("Luftentfeuchter mit Schlauchanschluss", "Damit er nicht wiederkommt", "Entfernen ohne Entfeuchten ist ein Abo auf Schimmel — Dauerablauf in den Bodenablauf, fertig.", "Preis vor Ort prüfen", "luftentfeuchter+mit+schlauch", "dehum"),
 ],
 "mobile-klimaanlage-stinkt-schimmel": [
   ("Klimaanlagen-Reiniger (Schaum)", "An die Quelle", "Der Geruch sitzt im Biofilm auf dem Verdampfer — Sprühschaum kommt dorthin, wo Wischen nicht hinreicht.", "ab ca. 10 €", "klimaanlagen+reiniger+schaum+verdampfer", "ac"),
   ("Ersatz-Filter", "Wenn der Geruch bleibt", "Ein Filter, der nach dem Waschen und Trocknen weiter riecht, ist durch — dann hilft nur Tauschen.", "ab ca. 12 €", "klimaanlage+ersatzfilter+universal", "purifier"),
   ("Hygrometer", "Vorbeugen statt nachputzen", "Der Geruch kommt aus Restfeuchte. Wer die Luftfeuchte im Blick hat, merkt früher, wann Nachtrocknen nötig ist.", "ab ca. 10 €", "hygrometer+luftfeuchtigkeit+innen", "dehum"),
 ],
 "klimaanlage-reinigen": [
   ("Klimaanlagen-Reiniger (Schaum)", "Gegen muffigen Geruch", "Sprühschaum für Verdampfer und Lamellen — löst den Biofilm, der den Geruch verursacht.", "ab ca. 10 €", "klimaanlagen+reiniger+schaum+verdampfer", "ac"),
   ("Ersatz-Filter", "Wenn Waschen nicht mehr reicht", "Filter altern: Ist das Vlies grau und bleibt es nach dem Trocknen grau, ist Tauschen billiger als Nachkaufen von Kühlleistung.", "ab ca. 12 €", "klimaanlage+ersatzfilter+universal", "purifier"),
   ("Entkalker für den Wassertank", "Luftkühler & Verdunster", "Zitronensäure oder Haushaltsentkalker gegen die Kalkschicht im Tank und auf den Matten.", "ab ca. 8 €", "zitronens%C3%A4ure+entkalker+haushalt", "dehum"),
   ("Lamellenkamm & Reinigungsbürste", "Verbogene Lamellen", "Richtet gedrückte Lamellen wieder auf und kommt zwischen die Rippen, wo ein Tuch nicht hinkommt.", "ab ca. 9 €", "lamellenkamm+k%C3%BChlrippen+b%C3%BCrste", "fan"),
 ],
 "klimaanlage-wohnmobil": [
   ("12V-Campingventilator", "Autark & nachts", "Wenige Watt — läuft die ganze Nacht über die Bordbatterie, auch ohne Landstrom.", "ab 25 €", "campingventilator+12v", "fan"),
   ("Thermomatte für die Frontscheibe", "Hitze abhalten", "Außen angebracht, bevor der Innenraum sich aufheizt — die günstigste wirksame Maßnahme.", "ab 40 €", "thermomatte+wohnmobil+aussen", "shade"),
   ("Dachklimaanlage fürs Reisemobil", "Echte Kühlung", "Kühlt zuverlässig, braucht aber Landstrom — 25–35 kg, Dachlast im Fahrzeugschein prüfen.", "€€€€ · ab ca. 1.500 €", "dachklimaanlage+wohnmobil", "ac"),
   ("Mobiles Gerät fürs Camping", "Fester Stellplatz", "Günstiger Einstieg mit 230 V und Abluftweg — mit Softstart/Inverter gegen die 6-A-Sicherung.", "€€ · ab ca. 250 €", "mobile+klimaanlage+camping", "mobileac"),
 ],
 "auto-bei-hitze-kuehlen": [
   ("Sonnenschutz Frontscheibe", "Wirkt am meisten", "Hält die Sonne vor der Scheibe — das Auto heizt sich gar nicht erst auf.", "ab 15 €", "auto+sonnenschutz+frontscheibe", "shade"),
   ("Sonnenschutz Seitenscheibe", "Für die Rückbank", "Netz oder Rollo für hinten — wichtig, wenn Kinder mitfahren.", "ab 12 €", "sonnenschutz+seitenscheibe+auto", "shade"),
   ("Auto-Ventilator 12V", "Luft in Bewegung", "Über den Zigarettenanzünder — bewegt Luft, kühlt sie nicht.", "ab 20 €", "auto+ventilator+12v", "fan"),
 ],
 # device_of() falls through to "ac" for every strom-* slug, so three energy
 # pages were topped with air-conditioner cards and a BTU sizing tool: someone
 # reading "Strom sparen im Haushalt" is not shopping for a Klimagerät. The
 # queries below are the ones each page's own body copy already links.
 "strom-sparen-haushalt": [
   ("Strommessgerät für die Steckdose", "Erst messen", "Zeigt, welches Gerät wirklich zieht — ohne Messung ist jede Sparmaßnahme geraten.", "ab 15 €", "strommessgeraet+steckdose", "battery"),
   ("Schaltbare Steckdosenleiste", "Standby killen", "Ein Schalter trennt Fernseher, Konsole und Netzteile komplett vom Netz.", "ab 12 €", "schaltbare+steckdosenleiste", "battery"),
   ("Zeitschaltuhr / Smart-Steckdose", "Automatisch sparen", "Läuft nur dann, wenn es nötig ist — und mit dynamischem Tarif dann, wenn Strom billig ist.", "ab 10 €", "zeitschaltuhr+digital", "battery"),
 ],
 "stromvergleich-check": [
   ("Strommessgerät für die Steckdose", "Ursache finden", "Wenn der Verbrauch über dem Stromspiegel liegt, zeigt die Messung, welches Gerät schuld ist.", "ab 15 €", "strommessgeraet+steckdose", "battery"),
   ("Schaltbare Steckdosenleiste", "Standby killen", "Dauerverbraucher am Schreibtisch und an der Medienwand komplett trennen.", "ab 12 €", "steckdosenleiste+schaltbar", "battery"),
 ],
 "strompreis-radar": [
   ("Smarte Steckdose mit Messfunktion", "Last verschieben", "Schaltet Verbraucher in die billigen Stunden — die Voraussetzung, um vom dynamischen Tarif zu profitieren.", "ab 15 €", "smart+home+steckdose+messfunktion", "battery"),
   ("Balkonkraftwerk-Speicher", "Billige Stunden speichern", "Speichert Sonnenstrom oder günstige Stunden für den teuren Abend — Modelle im Vergleich unten.", "ab ca. 215 €/kWh", "balkonkraftwerk+speicher", "battery"),
 ],
 # Condensation on the inside of windows: the reader needs to know their
 # humidity, then lower it. The page's own body links the hygrometer search
 # already; the dehumidifier is the site's endorsed pick; the window vacuum is
 # the category Germans actually use against morning condensation.
 # The electric-blanket cost page: category cards matching its own buying
 # criteria. No named models — no public-test consensus verified, so honest
 # category searches, like the dehumidifier and shade families.
 "heizdecke-stromverbrauch": [
   ("Heizdecke mit Abschaltautomatik", "Fürs Bett & Sofa", "Das wichtigste Merkmal zuerst: schaltet nach 1–3 h selbst ab — zum Einschlafen gemacht.", "ab ca. 40 €", "heizdecke+abschaltautomatik+waschbar", "heater"),
   ("Heizkissen", "Nacken & Rücken", "40–60 W reichen für die Zone, die wirklich friert — die kleinste Wärmequelle im Haus.", "ab ca. 20 €", "heizkissen+abschaltautomatik", "heater"),
   ("Wärmeunterbett", "Vorheizen", "Wärmt das Bett vor dem Schlafen vor — ausschalten, einschlafen, Heizung bleibt unten.", "ab ca. 35 €", "waermeunterbett+abschaltautomatik", "heater"),
 ],
 # The humidifier cost page: measurement gate first (its own body insists on
 # the hygrometer before any purchase), then the two build types the article
 # itself recommends. No named models — no public-test consensus verified, so
 # honest category searches. Prices only where the page states them.
 "luftbefeuchter-stromverbrauch": [
   ("Hygrometer (innen, Min/Max)", "Erst messen", "Zeigt in zwei Tagen, ob die Luft wirklich dauerhaft unter 40 % liegt — ohne Messung ist jeder Befeuchter geraten.", "ab 10 €", "hygrometer+innen+min+max", "dehum"),
   ("Verdunster-Luftbefeuchter", "Sparsam im Dauerbetrieb", "Kaltverdunstung mit Lüfter, wenige Watt — überfeuchtet konstruktionsbedingt kaum.", "Preis vor Ort prüfen", "luftbefeuchter+verdunster+leise", "dehum"),
   ("Ultraschall mit Hygrostat", "Schnell & leise", "Schaltet am Zielwert ab. Bei hartem Wasser destilliertes Wasser nutzen — sonst Kalkstaub.", "Preis vor Ort prüfen", "ultraschall+luftbefeuchter+hygrostat", "dehum"),
 ],
 # The balcony-PV mounting page: its products are the mounts themselves, not
 # the battery family the storage default would show. Category cards matching
 # the page's three mounting routes.
 "balkonkraftwerk-ohne-bohren": [
   ("Gitterbalkon-Halterung", "Stab- & Gittergeländer", "Haken/Klemmen um die Querstreben — rückstandsfrei, in Minuten montiert. Streben-Abstand vorher messen.", "ab ca. 30 €", "balkonkraftwerk+halterung+gitterbalkon", "battery"),
   ("Klemmhalterung Betonbrüstung", "Massive Brüstung", "Umgreift die Mauerkrone mit Gegenplatte — klemmt statt dübelt. Auf Gummiauflagen achten.", "ab ca. 40 €", "balkonkraftwerk+halterung+beton+ohne+bohren", "battery"),
   ("Ballast-Aufständerung", "Boden & Flachdach", "Frei neigbar für den besten Ertrag — hält über Gewicht statt über das Geländer.", "ab ca. 35 €", "solarmodul+aufstaenderung+ballast", "battery"),
 ],
 "fenster-beschlagen-innen": [
   ("Hygrometer (innen, Min/Max)", "Erst messen", "Zeigt, ob die Luftfeuchte wirklich über 60 % liegt — ohne Messung ist jede Maßnahme geraten.", "ab 10 €", "hygrometer+innen+min+max", "dehum"),
   ("Comfee MDDF-20DEN7", "Dauerhaft trocknen", "Bewährter Entfeuchter für Wohnräume — senkt die Luftfeuchte unter die Kondensationsgrenze.", "€€ · ca. 150–200 €", "Comfee+MDDF-20DEN7", "dehum"),
   ("Fenstersauger", "Morgens abziehen", "Zieht das Kondenswasser ab, bevor es in die Dichtung läuft — Symptombekämpfung, aber wirksam.", "ab 30 €", "fenstersauger", "dehum"),
 ],
 "haustier-hitze-kuehlen": [
   ("Kühlmatte für Hund & Katze", "Ohne Strom", "Gel- oder Druckaktivierung — das Tier legt sich drauf, wenn es will.", "ab 20 €", "k%C3%BChlmatte+hund", "cooler"),
   ("Trinkbrunnen", "Mehr trinken", "Fließendes Wasser wird von Katzen deutlich besser angenommen als der Napf.", "ab 25 €", "trinkbrunnen+katze", "dehum"),
   ("Leiser Ventilator", "Nicht direkt anblasen", "Bewegte Luft im Raum, ohne das Tier direkt anzublasen.", "ab 30 €", "ventilator+leise", "fan"),
 ],
}
# The default sub-line warns about window sealing — true for a monoblock in a
# flat, meaningless in a camper or a car. One honest sentence per context page.
CONTEXT_SUB = {
 "midea-portasplit-ausverkauft-alternativen": ("Genau die Optionen aus dem Text oben, in derselben "
                                              "Reihenfolge — keine anderen Geräte. Verfügbarkeit schwankt "
                                              "täglich. Nicht selbst getestet. Symbolbilder."),
 "klimaanlage-kippfenster": ("Zubehör statt neuem Gerät: Wer hier landet, hat das Klimagerät schon und "
                             "scheitert am Fenster. Produkttypen, nicht selbst getestet. Symbolbilder."),
 "klimaanlage-dachfenster": ("Für schräge Fenster gilt anderes Zubehör als für Schiebefenster — deshalb "
                             "diese Auswahl statt neuer Geräte. Nicht selbst getestet. Symbolbilder."),
 "fensterabdichtung-klimaanlage": ("Nach Bauart sortiert, nicht nach Preis: Die Abdichtung entscheidet über "
                                   "die halbe Kühlleistung. Nicht selbst getestet. Symbolbilder."),
 "fensterabdichtung-selber-bauen": ("Die Materialliste zur Anleitung oben — drei Teile, alle im Baumarkt-Format. "
                                    "Nicht selbst getestet. Symbolbilder."),
 "abluftschlauch-verlaengern": ("Verlängern heißt: Adapter und Isolierung mitdenken, sonst heizt der Schlauch "
                                "zurück. Nicht selbst getestet. Symbolbilder."),
 "mobile-klimaanlage-tropft-wasser": ("Erst die Ursache eingrenzen, dann kaufen — die Wasserwaage kostet am "
                                      "wenigsten und klärt am meisten. Nicht selbst getestet. Symbolbilder."),
 "mobile-klimaanlage-kuehlt-nicht": ("Nach den häufigsten Ursachen sortiert: In den meisten Fällen fehlt "
                                     "Dichtung, nicht Leistung. Nicht selbst getestet. Symbolbilder."),
 "mobile-klimaanlage-zu-laut": ("Gegen Körperschall und Gebläse-Pfeifen — ein neues Gerät ist selten die "
                                "Antwort auf Lärm. Nicht selbst getestet. Symbolbilder."),
 "klimaanlage-nachts-laufen-lassen": ("Passend zur Empfehlung oben, das Gerät nicht durchlaufen zu lassen. "
                                      "Nicht selbst getestet. Symbolbilder."),
 "bester-luftkuehler": ("Verschleiß- und Pflegeteile für den Luftkühler, den du schon hast — das ist der "
                        "Grund, warum die Leistung nachlässt. Nicht selbst getestet. Symbolbilder."),
 "mobile-klimaanlage-ueberwintern": ("Passend zu den sechs Schritten oben: sauber, trocken, staubfrei "
                                     "einlagern. Nicht selbst getestet. Symbolbilder."),
 "luftentfeuchter-granulat-oder-elektrisch": ("Der laufende Posten bei Granulat sind die Nachfüllpacks — "
                                              "deshalb stehen sie hier vorn. Nicht selbst getestet. Symbolbilder."),
 "waesche-trocknen-wohnung": ("Gegen die Feuchte, die beim Trocknen in der Wohnung bleibt. Nicht selbst "
                              "getestet. Symbolbilder."),
 "luftentfeuchter-keller": ("Im Keller entscheidet der Messwert vor dem Kauf — deshalb steht das Hygrometer "
                            "zuerst. Nicht selbst getestet. Symbolbilder."),
 "klimaanlage-balkonkraftwerk": ("Passend zur Rechnung oben, nicht dagegen: Ein Monoblock sprengt die 800 W "
                                "meistens — deshalb stehen hier Speicher, Messgerät und der Verbraucher, der "
                                "wirklich mit Solarstrom läuft. Nicht selbst getestet. Symbolbilder."),
 "schimmel-im-keller-entfernen": ("Entfernen ist der kleinere Teil der Arbeit — deshalb stehen hier Mittel, "
                                  "Messgerät und das Gerät gegen die Ursache. Nicht selbst getestet. Symbolbilder."),
 "infrarotheizung-ratgeber": ("„Meistgesucht“ ist ein Nachfrage-Signal aus unserer Trends-Abfrage, kein "
                              "Testurteil. Nicht selbst getestet. Symbolbilder."),
 "heizluefter-stromsparend": ("Das Sparmerkmal ist die Abschaltung, nicht die Marke — deshalb stehen hier "
                              "Merkmale und Messgerät. Nicht selbst getestet. Symbolbilder."),
 "luftentfeuchter-ratgeber": ("„Meistgesucht“ ist ein Nachfrage-Signal aus unserer täglichen Google-Trends-"
                              "Abfrage, kein Testurteil. Nicht selbst getestet. Symbolbilder."),
 "luftentfeuchter-gegen-schimmel": ("Das Werkzeug gegen die Ursache zuerst — „meistgesucht“ ist ein Nachfrage-"
                                    "Signal, kein Testurteil. Nicht selbst getestet. Symbolbilder."),
 "mobile-klimaanlage-stinkt-schimmel": ("Der Geruch ist ein Reinigungsproblem, kein Kaufgrund — deshalb "
                                        "stehen hier Mittel gegen die Ursache statt neuer Geräte. Produkttypen, "
                                        "nicht selbst getestet, Preise vor Ort prüfen. Symbolbilder."),
 "klimaanlage-reinigen": ("Wer hier landet, hat das Gerät schon — deshalb stehen hier Reinigungsmittel und "
                         "Verschleißteile statt neuer Klimageräte. Produkttypen, keine Testsieger: Nicht selbst "
                         "getestet, Preise vor Ort prüfen. Symbolbilder."),
 "klimaanlage-wohnmobil": ("Nach Stromquelle sortiert, nicht nach Preis — im Camper entscheidet zuerst, "
                           "ob Landstrom da ist. Nicht selbst getestet, Preise vor Ort prüfen. Symbolbilder."),
 "auto-bei-hitze-kuehlen": ("Im Auto gibt es keine echte Kühlung ohne laufenden Motor — was hilft, ist "
                            "Sonne abhalten und Luft bewegen. Nicht selbst getestet. Symbolbilder."),
 "haustier-hitze-kuehlen": ("Tiere regeln Wärme anders als wir — die Auswahl setzt auf Schatten, Wasser und "
                            "Luftbewegung statt auf Kältegeräte. Nicht selbst getestet. Symbolbilder."),
 "heizdecke-stromverbrauch": ("Wärme zum Körper statt in den Raum — alle drei arbeiten mit einem Bruchteil "
                              "der Leistung eines Heizlüfters. Nicht selbst getestet. Symbolbilder."),
 "luftbefeuchter-stromverbrauch": ("Erst messen, dann befeuchten — der echte Fall ist dauerhaft unter 40 %. "
                                   "Über 60 %? Dann brauchst du das Gegenteil: einen Entfeuchter. "
                                   "Nicht selbst getestet. Symbolbilder."),
 "balkonkraftwerk-ohne-bohren": ("Nach Balkontyp sortiert — alle drei kommen ohne Bohrung aus. Windlast-Freigabe "
                                 "des Herstellers beachten. Nicht selbst montiert. Symbolbilder."),
 "fenster-beschlagen-innen": ("Erst die Luftfeuchte messen, dann senken — beschlagene Scheiben sind ein "
                              "Feuchte-Symptom, kein Fensterproblem. Nicht selbst getestet. Symbolbilder."),
 "strom-sparen-haushalt": ("Erst messen, dann kaufen — diese drei kosten zusammen weniger als eine Monatsrechnung "
                           "und zeigen bzw. beenden die größten Dauerverbraucher. Nicht selbst getestet. Symbolbilder."),
 "stromvergleich-check": ("Liegt dein Verbrauch über dem Stromspiegel, hilft kein neues Gerät, sondern erst die "
                          "Messung. Nicht selbst getestet. Symbolbilder."),
 "strompreis-radar": ("Von schwankenden Börsenpreisen profitierst du nur mit verschiebbarer Last oder Speicher — "
                      "beides hier. Nicht selbst getestet, Preise vor Ort prüfen. Symbolbilder."),
}



# English mirror of CONTEXT_MODELS. Same amazon.de queries on purpose: the tag
# is a German-programme tag and the EN pages have always linked amazon.de. Non
# German-speaking countries produced 21 of the last 48 affiliate clicks, so
# leaving these pages selling air conditioners to someone whose unit is already
# leaking was the largest remaining instance of the mismatch.
CONTEXT_MODELS_EN = {
 "portable-ac-tilt-and-turn-windows": [
   ("Window seal kit (hook-and-loop)", "The part that is actually missing", "The box kit fits sliding windows. Without a sealed tilt window the unit loses most of its cooling.", "check price locally", "klimaanlage+fensterabdichtung+klett", "shade"),
   ("Tilt-window outlet plate", "For the hose", "Guides the exhaust hose through the tilt gap instead of wedging it in the opening.", "check price locally", "fensterabluftd%C3%BCse+kippfenster", "ac"),
   ("Cut-to-size panel (XPS)", "The tightest seal", "A rigid panel instead of fabric — the best seal if you are willing to cut once.", "check price locally", "xps+platte+zuschnitt", "shade"),
 ],
 "window-seal-portable-ac": [
   ("Window seal kit (hook-and-loop)", "Fits most windows", "Works on tilt-and-turn windows and comes off without residue — the standard answer for a rented flat.", "check price locally", "fensterabdichtung+mobile+klimaanlage+klett", "shade"),
   ("Roof-window seal", "For skylights", "Sloped windows need their own shape; sliding-window kits do not fit them.", "check price locally", "fensterabdichtung+dachfenster+klimaanlage", "shade"),
   ("Foam sealing tape", "For the leftover gaps", "Closes the joint between seal and frame, which is where most of the cooling escapes.", "check price locally", "fensterdichtung+schaumstoffband", "shade"),
 ],
 "portable-ac-hose-extension": [
   ("Exhaust hose extension", "More length", "A proper extension rather than a DIY joint — measure your unit's diameter first.", "check price locally", "abluftschlauch+verl%C3%A4ngerung+klimaanlage", "ac"),
   ("Hose adapter / coupler", "To join two hoses", "Couples two hoses tightly; without one the joint pulls warm air back in.", "check price locally", "abluftschlauch+adapter+verbinder", "ac"),
   ("Hose insulation", "Against re-heating", "A long hose heats the room it is meant to cool — insulation is not optional once you extend it.", "check price locally", "isolierschlauch+mobile+klimaanlage", "shade"),
 ],
 "portable-ac-leaking-water": [
   ("Condensate drain hose", "Continuous drain instead of a tank", "Drains the condensate continuously so the tank cannot overflow.", "check price locally", "kondensatschlauch+mobile+klimaanlage", "dehum"),
   ("Small spirit level", "The most common cause", "If the unit stands at a slope the water leaves at the wrong place — check this before buying anything.", "check price locally", "wasserwaage+klein", "purifier"),
   ("Condensate pump", "When there is no fall", "Needed when the drain sits higher than the unit; without it nothing drains.", "check price locally", "kondensatpumpe+klimaanlage", "dehum"),
 ],
 "portable-ac-not-cooling": [
   ("Window seal kit", "The biggest hidden cause", "An open window gap eats most of the cooling — more often the cause than an underpowered unit.", "check price locally", "klimaanlage+fensterabdichtung", "shade"),
   ("Replacement filter", "When airflow is weak", "A clogged filter throttles airflow noticeably; washing helps until it does not.", "check price locally", "klimaanlage+ersatzfilter+universal", "purifier"),
   ("Hose adapter", "Against leaks at the hose", "Loose joints blow warm air straight back into the room.", "check price locally", "abluftschlauch+adapter+verbinder", "ac"),
 ],
 "portable-ac-smells-musty": [
   ("Evaporator foam cleaner", "At the source", "The smell sits in the biofilm on the evaporator — foam reaches where wiping cannot.", "check price locally", "klimaanlagen+reiniger+schaum+verdampfer", "ac"),
   ("Replacement filter", "When the smell stays", "A filter that still smells after washing and drying is finished.", "check price locally", "klimaanlage+ersatzfilter+universal", "purifier"),
   ("Hygrometer", "Prevention instead of scrubbing", "The smell comes from residual moisture; watching humidity tells you when to dry it out.", "check price locally", "hygrometer+innen", "dehum"),
 ],
 "how-to-clean-portable-air-conditioner": [
   ("Evaporator foam cleaner", "Against musty smell", "Spray foam for evaporator and fins — dissolves the biofilm that causes the smell.", "check price locally", "klimaanlagen+reiniger+schaum+verdampfer", "ac"),
   ("Replacement filter", "When washing no longer helps", "Filters age: if the fleece stays grey after drying, replacing beats buying back lost cooling.", "check price locally", "klimaanlage+ersatzfilter+universal", "purifier"),
   ("Descaler for the water tank", "Coolers and evaporators", "Citric acid or household descaler against the scale in the tank and on the mats.", "check price locally", "zitronens%C3%A4ure+entkalker+haushalt", "dehum"),
   ("Fin comb and brush", "Bent fins", "Straightens pressed fins and reaches between the ribs where a cloth cannot.", "check price locally", "lamellenkamm+k%C3%BChlrippen+b%C3%BCrste", "fan"),
 ],
}

CONTEXT_SUB_EN = {
 "portable-ac-tilt-and-turn-windows": ("Accessories, not a new unit: if you are here you already own the air conditioner and are stuck at the window. Product types, not lab-tested. Symbolic images."),
 "window-seal-portable-ac": ("Sorted by window type rather than price — the seal decides about half the cooling. Not lab-tested. Symbolic images."),
 "portable-ac-hose-extension": ("Extending means adapter and insulation too, or the hose heats the room back up. Not lab-tested. Symbolic images."),
 "portable-ac-leaking-water": ("Narrow down the cause before buying — the spirit level costs least and settles most. Not lab-tested. Symbolic images."),
 "portable-ac-not-cooling": ("Ordered by the most common causes: usually what is missing is a seal, not capacity. Not lab-tested. Symbolic images."),
 "portable-ac-smells-musty": ("The smell is a cleaning problem, not a reason to buy a new unit. Not lab-tested. Symbolic images."),
 "how-to-clean-portable-air-conditioner": ("If you are here you already own the unit — so these are cleaning supplies and wear parts, not new appliances. Not lab-tested. Symbolic images."),
}

def context_entries(slug, en=False):
    """Per-page product set. Both languages now: the English guides carry the
    same accessory-intent traffic and were still being shown air conditioners."""
    return (CONTEXT_MODELS_EN if en else CONTEXT_MODELS).get(slug)


# The review-site convention German buyers expect before clicking anywhere: a
# pro and a con per model, stated plainly. Sourced from the same public-test
# consensus the cards already cite — a model whose trade-off we can't back
# simply gets no line. Keyed by name so the card tuples stay untouched.
MODEL_PROCON = {
    "De'Longhi Pinguino PAC EX105": ("Starke Kühlung, gute Effizienz", "Groß & schwer"),
    "De'Longhi PAC N90 ECO Silent": ("Leisester Monoblock im Vergleich", "Teurer als der Preistipp"),
    "Comfee MPPH-09CRN7": ("Günstig, kompakt", "Deutlich hörbar (~63 dB)"),
    "AEG ChillFlex Pro": ("Sehr leise, gute Ausstattung", "Höherer Preis"),
    "Klarstein Kraftwerk Smart 12K": ("Stärkste Kühlleistung der Runde", "Läuft hörbar"),
    "Bosch Cool 5000": ("Plug-and-Play, einfach", "Mittelfeld bei der Leistung"),
    "Suntec Impuls 2.0+": ("Leicht, gut umstellbar", "Für kleine Räume gedacht"),
    "Midea PortaSplit": ("Sehr leise & effizient, kein Bohren", "Teurer, braucht Außenplatz"),
    "Rowenta VU5690 Eole Infinite": ("Viel Luftstrom", "Auf hoher Stufe hörbar"),
    "Rowenta VU5690": ("Viel Luftstrom", "Auf hoher Stufe hörbar"),
    "MeacoFan 1056": ("Sehr leise — fürs Schlafzimmer", "Kein Kühleffekt, bewegt nur Luft"),
    "Comfee MDDF-20DEN7": ("Bewährt, gutes Preis-Leistungs-Verhältnis", "Im Betrieb hörbar"),
    "Levoit (HEPA)": ("HEPA-Filter, leiser Nachtmodus", "Filter sind Folgekosten"),
    "Lichtblick Thermo-Rollo": ("Sperrt Hitze vor der Scheibe aus", "Verdunkelt den Raum"),
    # Storage was the only device family whose cards had no trade-off line — on
    # the most expensive products of all. Sourced from the same public 2026
    # comparisons the price bands come from.
    "Marstek Venus E": ("Mit Abstand günstigster Preis pro kWh", "Für ein Balkonkraftwerk meist überdimensioniert"),
    "Anker Solarbank 3 E2700 Pro": ("Reifes Ökosystem, gute App", "Teurer pro kWh, Cloud für den vollen Funktionsumfang"),
    "Zendure SolarFlow 800 Pro": ("Passende Größe zum kleinsten Gesamtpreis", "Höherer Preis pro kWh als große Speicher"),
    "Anker Solarbank 2 E1600 Pro": ("Vier MPPT-Eingänge, später erweiterbar", "1,6 kWh sind knapp, wenn tagsüber niemand da ist"),
}
MODEL_PROCON_EN = {
    "De'Longhi Pinguino PAC EX105": ("Strong cooling, good efficiency", "Big & heavy"),
    "De'Longhi PAC N90 ECO Silent": ("Quietest monoblock in its group", "Pricier than the value pick"),
    "Comfee MPPH-09CRN7": ("Cheap, compact", "Clearly audible (~63 dB)"),
    "AEG ChillFlex Pro": ("Very quiet, well equipped", "Higher price"),
    "Klarstein Kraftwerk Smart 12K": ("Strongest cooling of its group", "Audibly loud"),
    "MeacoFan 1056": ("Very quiet — for the bedroom", "Moves air, doesn't cool it"),
    "Rowenta VU5690": ("Lots of airflow", "Audible on high"),
    "Comfee MDDF-20DEN7": ("Proven, good value", "Audible in operation"),
}


def model_card(entry, en=False, url=None):
    """`url` overrides the marketplace. The US shelf passes an amazon.com link
    with the US associates tag; everything else keeps the .de default."""
    name, role, why, price, q, svg_key = entry
    url = url or amazon_url(q, name)
    live_txt = live_price_text(live_product(q), en=en)
    if live_txt:
        price = f'<span data-eb-live="1">{live_txt}</span>'
    grad = SVG_GRAD.get(svg_key, "#eaf6ff,#cfe6f7")
    pc = (MODEL_PROCON_EN if en else MODEL_PROCON).get(name)
    pcline = ""
    if pc:
        pcline = ('<p class="ds" style="margin:0 0 9px;">'
                  f'<span style="color:#177245;">✓ {pc[0]}</span><br>'
                  f'<span style="color:#9a3412;">✕ {pc[1]}</span></p>')
    return (f'<div class="eb-shop-card"><div class="th" style="background:linear-gradient(135deg,{grad});">'
            f'<span class="rl">{role}</span>{SVG[svg_key]}</div>'
            f'<div class="bd"><h3>{name}</h3><p class="ds">{why}</p>{pcline}'
            f'<div class="pr">{price}</div>'
            # The card takes `en` for its pro/con text but the button was hard-coded
            # German, so every English guide page shipped a German call to action —
            # on the pages that produce 36% of this site's affiliate clicks.
            f'<a class="go" href="{url}" target="_blank" rel="sponsored noopener">'
            f'{"Check the price on Amazon →" if en else "Preis auf Amazon prüfen →"}</a>'
            '</div></div>')


def models_block(device, en=False, slug=None):
    table = DEVICE_MODELS_EN if en else DEVICE_MODELS
    ctx = context_entries(slug, en)
    entries = ctx or table.get(device) or table["ac"]
    cards = "".join(model_card(e, en=en) for e in entries)
    # The "no drilling, no installer" line is true of the default monoblock
    # grid only. CONTEXT grids (Quick-Connect split, camper, accessory sets)
    # and the fan/shade/heater families get a neutral fallback instead —
    # the split pages carry an F-Gas clause that says the opposite.
    monoblock_grid = (device == "ac" and not ctx)
    # The single most common cause of "bringt nichts" disappointment in community
    # threads is an unsealed window: the exhaust builds negative pressure and pulls
    # the hot air straight back in. Say it at the buying moment, not three pages later.
    if en and monoblock_grid:
        head, sub = ("Recommended models",
                     "Every portable unit here: <strong>no drilling, no installer</strong>, usually "
                     '<a href="/en/guide/portable-ac-rented-apartment.html">no landlord permission</a> — '
                     "hose to the window, seal around it, running in about 10 minutes, and it moves out with you. "
                     'The one condition: without a <a href="/en/guide/portable-ac-tilt-and-turn-windows.html">sealed window</a> '
                     "every portable AC loses most of its effect — hot air gets pulled straight back in. "
                     "Compiled from public tests & customer reviews — not tested by us. "
                     "Prices vary; check the current price on Amazon. Illustrations, not product photos. "
                     # A third of all clicks come from outside the DACH region, and the
                     # EU-English readers among them often don't know amazon.de will
                     # serve them in English — that unknown is checkout friction.
                     "Amazon.de ships to most EU countries, with site and checkout available in English.")
    elif en:
        head, sub = ("Recommended models",
                     "Compiled from public tests & customer reviews — not tested by us. "
                     "Prices vary; check the current price on Amazon. Illustrations, not product photos. "
                     "Amazon.de ships to most EU countries, with site and checkout available in English.")
    elif not monoblock_grid:
        head, sub = ("Empfohlene Modelle",
                     "Aus öffentlichen Tests & Kundenbewertungen zusammengestellt — nicht selbst getestet. "
                     "Preise schwanken, aktuellen Preis auf Amazon prüfen. Symbolbilder.")
    else:
        # 2026-09-05, owner: "the real need behind an air conditioner is
        # no installation." The site's own numbers agree — its top-earning
        # pages are the camper, the tilt-and-turn window, the roof window, the
        # split-without-drilling — yet this line opened with a WARNING about
        # window sealing. Same facts, need first, condition second. Every
        # figure and claim here is already published on the linked pages
        # ("in 10 Minuten erledigt", "kein Bohren, rückstandslos", "mobil ohne
        # Bohren geht ohne Erlaubnis"); nothing new is asserted.
        head, sub = ("Empfohlene Modelle",
                     "Alle Monoblöcke hier: <strong>kein Bohren, kein Installateur</strong>, in der Regel "
                     '<a href="/guide/klimaanlage-mietwohnung.html">ohne Erlaubnis des Vermieters</a> — '
                     "Schlauch ans Fenster, Abdichtung drum, in rund 10 Minuten läuft es, und beim Auszug "
                     "nimmst du es rückstandslos mit. Die eine Bedingung: Ohne "
                     '<a href="/guide/klimaanlage-kippfenster.html">dichte Fensterabdichtung</a> '
                     "verliert jeder Monoblock den Großteil seiner Wirkung — die warme Luft wird sonst direkt zurückgesaugt. "
                     "Aus öffentlichen Tests & Kundenbewertungen zusammengestellt — nicht selbst getestet. "
                     "Preise schwanken, aktuellen Preis auf Amazon prüfen. Symbolbilder.")
    # The default sub warns about window sealing — right for every monoblock,
    # nonsense under battery cards. Storage gets the one sentence that actually
    # protects this buyer: most subsidy programmes void the grant if the
    # invoice predates the application.
    if device == "storage" and not en:
        # On the subsidy page itself the same sentence stays, minus the self-link.
        foerder = ('der <a href="/guide/balkonspeicher-foerderung.html">Antrag vor dem Kauf</a>'
                   if slug != "balkonspeicher-foerderung" else "der Antrag <strong>vor</strong> dem Kauf")
        # Sorted by the capacity that pays off, not by €/kWh — the cheapest
        # kilowatt-hour comes in a box twice as big as an 800-W balcony plant
        # ever fills, so the reader needs the size question answered first.
        groesse = ('' if slug == "balkonspeicher-rechner" else
                   ' Welche Größe zu deinem Balkonkraftwerk passt, rechnet der '
                   '<a href="/guide/balkonspeicher-rechner.html">Balkonspeicher-Rechner</a> aus.')
        sub = ("Aus öffentlichen Vergleichen 2026 zusammengestellt — nicht selbst getestet. "
               "Sortiert nach der Kapazität, die sich rechnet — nicht nach dem billigsten Preis pro kWh. "
               "Aktuellen Preis auf Amazon prüfen. Symbolbilder. "
               f"Vorab das Wichtigste: Viele Kommunen bezuschussen Speicher mit 100–500 € — aber fast immer nur, "
               f"wenn {foerder} gestellt wird.{groesse}")
    # Same correction for the humidity and heating families (2026-08-28, found
    # while enabling the EN qm cards): the default sub tells a dehumidifier or
    # heater buyer about window sealing for monoblocks — nonsense advice under
    # these cards on 13 DE pages since the band shipped. One device-true
    # sentence each instead.
    if device == "dehum":
        sub = (("Compiled from public tests & customer reviews — not tested by us. "
                "Prices vary; check the current price on Amazon. Illustrations, not product photos. "
                "One thing first: what matters is the litres/day rating plus a humidistat — it switches "
                "off at the target humidity, which is where the electricity saving is. "
                "Amazon.de ships to most EU countries, with site and checkout available in English.")
               if en else
               ("Aus öffentlichen Tests & Kundenbewertungen zusammengestellt — nicht selbst getestet. "
                "Preise schwanken, aktuellen Preis auf Amazon prüfen. Symbolbilder. "
                "Vorab das Wichtigste: Entscheidend sind Liter/Tag-Leistung und ein Hygrostat — "
                "er schaltet bei Zielfeuchte ab, das spart am meisten Strom."))
    if device == "heater":
        sub = (("Compiled from public tests & customer reviews — not tested by us. "
                "Prices vary; check the current price on Amazon. Illustrations, not product photos. "
                "One thing first: size the wattage to the room (60–100 W per m² depending on insulation) "
                "and let a thermostat cycle it — running flat out is the expensive mistake. "
                "Amazon.de ships to most EU countries, with site and checkout available in English.")
               if en else
               ("Aus öffentlichen Tests & Kundenbewertungen zusammengestellt — nicht selbst getestet. "
                "Preise schwanken, aktuellen Preis auf Amazon prüfen. Symbolbilder. "
                "Vorab das Wichtigste: Watt nach Raumgröße wählen (60–100 W pro m² je nach Dämmung) "
                "und per Thermostat takten lassen — Dauerlauf ist der teure Fehler."))
    if en and slug in CONTEXT_SUB_EN:
        head, sub = "What actually helps here", CONTEXT_SUB_EN[slug]
    elif slug in CONTEXT_SUB and not en:
        head, sub = "Was hier wirklich hilft", CONTEXT_SUB[slug]
    # Heading is a styled <div>, not <h2>, so build_onpage's TOC (which slugs
    # every <h2> in <article>) leaves it alone — keeps the two injectors idempotent.
    return (f'<!--EB_MODELS--><section class="eb-shop eb-models" id="eb-models">'
            f'<div class="eb-shop-h">{head}</div>'
            f'<p class="eb-shop-sub" style="margin-bottom:6px;"><span style="font-size:11px;color:#8a99a6;">'
            f'{AD_LABEL[en]}</span></p>'
            f'<p class="eb-shop-sub">{sub}</p>'
            f'<div class="eb-shop-grid">{cards}</div></section><!--/EB_MODELS-->\n')


# The English pages sell the wrong country's goods (2026-09-15, owner: expand
# the German vertical into other countries and sell different goods there,
# "especially the US side where the traffic is largest").
#
# Measured: over 28 days the United States is the second country on this site,
# 124 human page views against Germany's 280, and the English troubleshooting
# pages are where its search traffic actually lands (portable-ac-leaking-water
# 8 of 10 views from search). Yet an American on those pages meets a grid of
# De'Longhi, AEG, Klarstein and Schmidbauer — European machines. Since 09-06
# the switch rewrites the LINK to a US category, so the card promises a named
# model and delivers a category page. US converts at 6.5 % against Germany's
# 15.4 %, and this is the most obvious reason why.
#
# US_MODELS already holds picks cross-verified against named US outlets, but
# only inside the EB_USMARKET text bridge — never in the grid, which is what
# actually converts (the German grid runs 37.8 clicks per 100 pages).
#
# So the grid itself changes country. Both grids ship; the European one is
# visible by default, which is correct with no JS and for the EU majority, and
# the same three-path geo gate as the switch reveals the US one. When it does,
# the bridge is hidden too: its text says "the units below are the European
# models", and that sentence becomes false the moment the swap happens.
US_SHELF_TERM = {"ac": "portable air conditioner", "dehum": "dehumidifier", "heater": "space heater"}
US_SHELF_SVG = {"ac": "ac", "dehum": "dehum", "heater": "heater"}


def us_shelf_block(device):
    """Hidden US grid for an English page whose default shelf is European."""
    term = US_SHELF_TERM.get(device)
    picks = US_MODELS.get(term) or []
    if not picks:
        return ""
    svg = US_SHELF_SVG.get(device, "ac")
    cards = "".join(
        model_card((name, role, note, "Check the current price", urllib.parse.quote_plus(name), svg),
                   en=True,
                   # By-name search on the US marketplace with the US tag. No
                   # ASIN: this site has verified none on amazon.com, and a
                   # guessed one is the EX105 mistake in a new country.
                   url=f"https://www.amazon.com/s?k={urllib.parse.quote_plus(name)}&tag={US_TAG}")
        for name, role, note in picks)
    # Same honesty as every other shelf on this site, in the US register: these
    # are what named US outlets keep picking, not anything we tested.
    sub = ("These are the models US reviewers keep picking — compiled from public "
           "tests, not tested by us. Prices change; check the current price on "
           "Amazon. Illustrations, not product photos.")
    return (f'<!--EB_USSHELF--><section class="eb-shop eb-models" id="eb-usshelf" hidden>'
            f'<div class="eb-shop-h">Recommended in the US</div>'
            f'<p class="eb-shop-sub" style="margin-bottom:6px;"><span style="font-size:11px;color:#8a99a6;">'
            f'{AD_LABEL[True]}</span></p>'
            f'<p class="eb-shop-sub">{sub}</p>'
            f'<div class="eb-shop-grid">{cards}</div></section>'
            + US_SHELF_JS + '<!--/EB_USSHELF-->\n')


# Reuses the switch's gate verbatim in shape: America/* decides with no network,
# Europe/* (the majority here) decides with no network, and only an ambiguous
# clock asks the edge. Clicks in this grid report source "us-shelf" so the kill
# line can be read without guessing which grid produced them.
US_SHELF_JS = (
    '<script>(function(){var tz="";'
    'try{tz=Intl.DateTimeFormat().resolvedOptions().timeZone||"";}catch(e){tz="";}'
    'var NA=["US","CA","MX","PR"];'
    'var swap=function(){'
    'var us=document.getElementById("eb-usshelf");if(!us)return;'
    'var eu=document.getElementById("eb-models");if(eu)eu.hidden=true;'
    'var br=document.getElementById("eb-usmarket");if(br)br.hidden=true;'
    'us.hidden=false;'
    'us.addEventListener("click",function(e){'
    'var a=e.target&&e.target.closest&&e.target.closest(\'a[href*="amazon."]\');if(!a)return;'
    'if(window.gtag)gtag("event","affiliate_click",{source:"us-shelf",page:location.pathname,link_url:a.href});},true);};'
    'if(tz.indexOf("America/")===0){swap();}'
    'else if(tz.indexOf("Europe/")===0){return;}'
    'else{try{fetch("/api/geo").then(function(r){return r.json();}).then(function(d){'
    'if(d&&d.c&&NA.indexOf(d.c)>=0)swap();}).catch(function(){});}catch(e){}}'
    '})();</script>')


def inject_us_shelf(html, slug):
    """English default-shelf pages only. A CONTEXT page sells parts for the
    problem on that page (a drain hose, a spirit level) and those are already
    switched to US search terms by EB_USSWITCH — swapping in whole appliances
    there would answer a question the reader did not ask."""
    if context_entries(slug, en=True):
        return re.sub(r'<!--EB_USSHELF-->.*?<!--/EB_USSHELF-->\n?', '', html, flags=re.S)
    blk = us_shelf_block(device_of(slug))
    if not blk:
        return re.sub(r'<!--EB_USSHELF-->.*?<!--/EB_USSHELF-->\n?', '', html, flags=re.S)
    if "<!--EB_USSHELF-->" in html:
        return re.sub(r'<!--EB_USSHELF-->.*?<!--/EB_USSHELF-->\n?', lambda m: blk, html, flags=re.S)
    if "<!--/EB_MODELS-->" in html:
        return html.replace("<!--/EB_MODELS-->\n", "<!--/EB_MODELS-->\n" + blk, 1)
    return html


def inject_models(html, slug, en=False):
    """Add the 图文 model grid before the first content <h2>, unless the page is a
    tool page or already recommends a named model. Idempotent via marker."""
    ctx = context_entries(slug, en)
    # Skipped pages: strip any previously-injected block, then leave alone.
    # A page with its own context set is never skipped — that set exists
    # precisely because the generic one was wrong for it.
    if slug in SKIP_MODELS and not ctx:
        return re.sub(r'<!--EB_MODELS-->.*?<!--/EB_MODELS-->\n?', '', html, flags=re.S)
    block = models_block(device_of(slug), en, slug)
    if "<!--EB_MODELS-->" in html:
        return re.sub(r'<!--EB_MODELS-->.*?<!--/EB_MODELS-->\n?', lambda m: block, html, flags=re.S)
    # The canon-name guard prevents doubling up on curated pages; a context set
    # replaces those recommendations by design, so it overrides the guard.
    if not ctx and any(n in html for n in CANON_NAMES):
        return html
    if re.search(r'<h2\b', html):
        return re.sub(r'(<h2\b)', lambda m: block + m.group(1), html, count=1)
    if "<!--EB_RADAR-->" in html:
        return html.replace("<!--EB_RADAR-->", block + "<!--EB_RADAR-->", 1)
    return html


# --- Above-the-fold shortcut to the actual products. The full model grid sits
# before the first <h2>, which on a phone is still a nav bar, a breadcrumb, a
# trust row, an H1, an intro and a table of contents away — a German reader
# arriving from a "welche Klimaanlage für 30 qm" search has to scroll before
# seeing a single device. This strip puts three named picks one tap from the top
# and links down to the full grid for everyone who wants the reasoning first. ---
TOPPICK_HEAD = {False: ("Direkt zur Empfehlung", "Alle Modelle mit Begründung ↓"),
                True: ("Straight to the picks", "All models with reasoning ↓")}



# The room-size series recommends size-appropriate models in its body copy
# (10 m² → Comfee, 25 → EX105, 40 → Klarstein 14000, 50 → PortaSplit), but the
# top-pick strip — the first commercial element on the page — showed the same
# global trio everywhere, so a 40 m² reader's first suggestion was a 9,000 BTU
# unit. Bing's AI report made this expensive: "klimaanlage für 40 m2" is the
# top Commercial grounding query (24 % citation share) and lands exactly here.
# Chips are chosen per size band, from models the pages already endorse.
def qm_toppick(slug):
    m = re.match(r'klimaanlage-(\d+)-qm$', slug or '')
    if not m:
        return None
    qm = int(m.group(1))
    if qm <= 15:
        return [
            ("Comfee MPPH-09CRN7", "Passend & günstig", "", "", "Comfee+MPPH-09CRN7", "ac"),
            ("De'Longhi PAC N90 ECO Silent", "Am leisesten", "", "", "De%27Longhi+PAC+N90+ECO+Silent", "ac"),
            ("AEG ChillFlex Pro", "Fürs Schlafzimmer", "", "", "AEG+ChillFlex+Pro", "ac"),
        ]
    if qm <= 25:
        return [
            ("De'Longhi Pinguino PAC EX105", "Allrounder", "", "", "De%27Longhi+Pinguino+PAC+EX105", "ac"),
            ("De'Longhi PAC N90 ECO Silent", "Am leisesten", "", "", "De%27Longhi+PAC+N90+ECO+Silent", "ac"),
            ("Comfee MPPH-09CRN7", "Preis-Leistung", "", "", "Comfee+MPPH-09CRN7", "ac"),
        ]
    if qm <= 30:
        return [
            ("De'Longhi Pinguino PAC EX105", "Allrounder", "", "", "De%27Longhi+Pinguino+PAC+EX105", "ac"),
            ("Klarstein Kraftwerk Smart 12K", "Mehr Reserve", "", "", "Klarstein+Kraftwerk+Smart+12K", "ac"),
            ("De'Longhi PAC N90 ECO Silent", "Am leisesten", "", "", "De%27Longhi+PAC+N90+ECO+Silent", "ac"),
        ]
    # 40 m² and up: monoblocks below ~12k BTU are undersized — the honest chips
    # are the high-BTU class and the quiet-split option the body itself argues for.
    return [
        ("Monoblock ab 14.000 BTU", "Passende Leistungsklasse", "", "", "mobile+klimaanlage+14000+BTU", "ac"),
        ("Midea PortaSplit", "Leiser Split, ohne Kernbohrung", "", "", "Midea+PortaSplit", "ac"),
        ("Klarstein Kraftwerk Smart 12K", "Obergrenze Monoblock", "", "", "Klarstein+Kraftwerk+Smart+12K", "ac"),
    ]


def toppick_block(device, en=False, slug=None):
    table = DEVICE_MODELS_EN if en else DEVICE_MODELS
    ctx = context_entries(slug, en)
    entries = (ctx or (None if en else qm_toppick(slug))
               or table.get(device) or table["ac"])[:3]
    head, more = TOPPICK_HEAD[en]
    # Need-first framing (2026-09-05): every device in the default AC set is a
    # monoblock or the Quick-Connect PortaSplit — "ohne Bohren" is true of all
    # of them. CONTEXT pages are excluded on purpose: the split cluster's
    # sets carry an installer clause, and a blanket promise there would
    # contradict the page's own refrigerant section.
    if device == "ac" and not ctx:
        head = head + (" — all without drilling" if en else " — alle ohne Bohren")
    pills = ""
    for name, role, _why, _price, q, _svg in entries:
        url = amazon_url(q, name)
        pills += ('<a href="' + url + '" target="_blank" rel="sponsored noopener" data-eb-tp="1" '
                  'style="display:inline-flex;align-items:center;gap:7px;background:#fff;border:1px solid #cfe0ea;'
                  'border-radius:22px;padding:6px 13px;margin:0 7px 7px 0;text-decoration:none;font-size:13.5px;">'
                  '<span style="background:#0f6ba8;color:#fff;font-size:11px;font-weight:800;border-radius:12px;'
                  f'padding:2px 8px;">{role}</span>'
                  f'<strong style="color:#0a4d7a;">{name}</strong>'
                  '<span style="color:#7a8b98;">→</span></a>')
    # The strip now sits above the article's own disclosure, so it carries its
    # own Werbekennzeichnung. That is the stricter reading anyway: the label
    # belongs at the ad, not 600 px further down the page.
    ad = AD_LABEL[en]
    return ('<!--EB_TOPPICK--><section style="max-width:1000px;margin:0 auto 4px;padding:0 20px;">'
            '<div style="background:#f7fafc;border:1px solid #e4ebf0;border-radius:12px;padding:12px 15px;">'
            '<div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:8px;">'
            '<strong style="font-size:12.5px;text-transform:uppercase;letter-spacing:.4px;color:#5b6b78;">'
            f'{head}</strong>'
            f'<span style="font-size:11px;color:#8a99a6;">{ad}</span></div>{pills}'
            f'<a href="#eb-models" style="font-size:12.5px;color:#0f6ba8;font-weight:700;text-decoration:none;">{more}</a>'
            '</div></section>\n'
            '<script>(function(){var s=document.currentScript.previousElementSibling;if(!s)return;'
            's.querySelectorAll("[data-eb-tp]").forEach(function(a){a.addEventListener("click",function(){'
            'if(window.gtag)gtag("event","affiliate_click",{source:"toppick",link_url:a.href});});});'
            '})();</script><!--/EB_TOPPICK-->\n')


def inject_toppick(html, slug, en=False):
    """Idempotently put three named picks at the very top of buying pages.

    Always removed and re-placed rather than replaced in situ: the first cut put
    the strip after the intro and the disclosure, which on a phone still meant
    scrolling past ~600 px of prose before seeing a product. Replacing in place
    would have frozen it there forever.
    """
    html = re.sub(r'<!--EB_TOPPICK-->.*?<!--/EB_TOPPICK-->\n?', '', html, flags=re.S)
    ctx = context_entries(slug, en)
    eligible = (slug not in SKIP_MODELS or ctx) and (
        "<!--EB_MODELS-->" in html or any(n in html for n in CANON_NAMES))
    if not eligible:
        return html
    block = toppick_block(device_of(slug), en, slug)
    m = re.search(r'<article[^>]*>', html)
    if m:
        return html[:m.end()] + block + html[m.end():]
    for anchor in ("<!--EB_TOC-->", "<!--EB_MODELS-->"):
        if anchor in html:
            return html.replace(anchor, block + anchor, 1)
    if re.search(r'<h2\b', html):
        return re.sub(r'(<h2\b)', lambda m2: block + m2.group(1), html, count=1)
    return html


# --- Why buying before the wave beats buying during it. The honest version of
# urgency: no countdown, no invented stock counter, no "climate emergency, buy
# now" — an air conditioner does not fix the climate, it raises consumption, and
# claiming otherwise would be both false and, under German competition law,
# risky. What is true and checkable is the DWD/UBA record: days above 30 °C have
# gone from rare to routine, and every wave empties the shelves. That is a real
# reason to decide early, and it is sourced. ---
CLIMATE_BOX = (
    '<!--EB_CLIMATE--><section style="max-width:1000px;margin:16px auto 0;padding:0 20px;">'
    '<div style="background:#fdf6ec;border:1px solid #f0dcc0;border-radius:12px;padding:16px 18px;">'
    '<strong style="font-size:15.5px;display:block;margin-bottom:6px;">Warum sich das Thema nicht mehr '
    '„aussitzen" lässt</strong>'
    '<p style="margin:0 0 10px;font-size:14px;color:#4a4335;">Als <strong>Hitzetag</strong> zählt beim '
    'Deutschen Wetterdienst ein Tag über 30&nbsp;°C. Deren Zahl hat sich in Deutschland von der Ausnahme '
    'zur Regel entwickelt:</p>'
    '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px;">'
    '<div style="flex:1 1 150px;background:#fff;border:1px solid #f0dcc0;border-radius:10px;padding:11px 13px;">'
    '<div style="font-size:22px;font-weight:800;color:#b26a17;">3 von 50</div>'
    '<div style="font-size:12.5px;color:#6b6250;">Sommer mit mehr als 10 Hitzetagen — 1951–2000</div></div>'
    '<div style="flex:1 1 150px;background:#fff;border:1px solid #f0dcc0;border-radius:10px;padding:11px 13px;">'
    '<div style="font-size:22px;font-weight:800;color:#b23c17;">12 von 25</div>'
    '<div style="font-size:12.5px;color:#6b6250;">dasselbe seit dem Jahr 2000</div></div>'
    '<div style="flex:1 1 150px;background:#fff;border:1px solid #f0dcc0;border-radius:10px;padding:11px 13px;">'
    '<div style="font-size:22px;font-weight:800;color:#b23c17;">11,1</div>'
    '<div style="font-size:12.5px;color:#6b6250;">Hitzetage im Mittel 2025 — 2018 waren es rund 20</div></div>'
    '</div>'
    '<p style="margin:0 0 10px;font-size:14px;color:#4a4335;"><strong>Was daraus folgt — und was nicht.</strong> '
    'Ein Klimagerät löst das Klimaproblem nicht, es verbraucht zusätzlich Strom; ehrlicher ist die Reihenfolge '
    # /guide/wohnung-kuehlen-ohne-klimaanlage.html has never existed — this anchor
    # 404'd on all 55 pages carrying the block, three of them in the site's top six.
    # The anchor promises two things, so it now points at the two pages that
    # actually deliver them instead of one page that delivers neither.
    'erst <a href="/guide/hitzeschutz-fenster.html" style="color:#0f6ba8;">beschatten</a> und '
    '<a href="/guide/richtig-lueften-bei-hitze.html" style="color:#0f6ba8;">lüften</a>, '
    'dann kühlen, und den Verbrauch <a href="/guide/klimaanlage-stromkosten.html" style="color:#0f6ba8;">'
    'vorher durchrechnen</a>. Was sich aber jedes Jahr wiederholt: In der Welle sind die guten Geräte innerhalb '
    'weniger Tage vergriffen oder teurer. Wer <em>vor</em> der Welle entscheidet, hat die Auswahl — das ist der '
    'einzige Zeitdruck, den wir hier behaupten.</p>'
    '<p style="margin:0;font-size:12px;color:#7a7260;">Zahlen: Deutscher Wetterdienst / Umweltbundesamt '
    '(Hitzetage ≥ 30 °C, Flächenmittel Deutschland). '
    '<a href="https://www.umweltbundesamt.de/daten/umweltzustand-trends/klima/trends-der-lufttemperatur" '
    'target="_blank" rel="noopener nofollow" style="color:#0f6ba8;">UBA-Zeitreihe</a></p>'
    '</div></section><!--/EB_CLIMATE-->\n')

CLIMATE_SKIP = {"btu-rechner", "stromkosten-rechner", "hitze-check", "was-bedeutet-btu",
                "auto-bei-hitze-kuehlen", "haustier-hitze-kuehlen"}


# --- The purchase prompt. A popup, but deliberately not the kind Google demotes
# and German readers close on reflex: it never appears on arrival, never covers
# the article, and never blocks the page. It slides up from the bottom once
# someone has actually read (deep scroll + dwell) or is about to leave, shows
# what they themselves calculated if they saved a room, and stays gone for a
# week once dismissed. No countdown and no invented stock number — the only
# urgency claimed is the one that is true, that waves empty the shelves. ---
def popup_block(device, en=False, slug=None):
    table = DEVICE_MODELS_EN if en else DEVICE_MODELS
    ctx = context_entries(slug, en)
    entries = (ctx or table.get(device) or table["ac"])[:3]
    rows = ""
    for name, role, _why, price, q, _svg in entries:
        url = amazon_url(q, name)
        rows += ('<a href="' + url + '" target="_blank" rel="sponsored noopener" data-eb-pu="pick" '
                 'style="display:flex;align-items:center;gap:10px;padding:9px 11px;border:1px solid #e4ebf0;'
                 'border-radius:10px;margin-bottom:7px;text-decoration:none;background:#fff;">'
                 '<span style="background:#0f6ba8;color:#fff;font-size:10.5px;font-weight:800;border-radius:12px;'
                 f'padding:3px 8px;white-space:nowrap;">{role}</span>'
                 f'<span style="flex:1;color:#1a2733;font-weight:700;font-size:13.5px;">{name}</span>'
                 f'<span style="color:#7a8b98;font-size:11.5px;white-space:nowrap;">{price}</span>'
                 '<span style="color:#0f6ba8;font-weight:800;">→</span></a>')
    if en:
        head = "Before you go: which one actually fits?"
        sub = ("Picked from public tests, not tested by us. Links are affiliate links — "
               "the price stays the same for you.")
        close, calc = "Close", "Work out my room size →"
    else:
        head = "Bevor du gehst: Welches Gerät passt wirklich?"
        sub = ("Auswahl aus öffentlichen Tests, nicht selbst getestet. Links sind Affiliate-Links — "
               "für dich bleibt der Preis gleich.")
        close, calc = "Schließen", "Kühlleistung für meinen Raum berechnen →"
    calc_href = "/en/guide/how-many-btu-do-i-need.html" if en else "/#eb-ht-qm"
    if ctx:
        # A BTU-per-square-metre calculator answers nothing for a camper, a car
        # or a dog — drop the line rather than send the reader somewhere useless.
        head, calc = "Bevor du gehst: Was hier wirklich hilft", ""
    return ('<!--EB_POPUP--><div id="eb-pu" style="display:none;position:fixed;left:0;right:0;bottom:0;z-index:210;'
            'padding:0 10px 10px;pointer-events:none;">'
            '<div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #cfe0ea;'
            'border-radius:14px 14px 12px 12px;box-shadow:0 -6px 28px rgba(10,45,70,.22);padding:15px 16px 13px;'
            'pointer-events:auto;">'
            '<div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:4px;">'
            f'<strong style="flex:1;font-size:15.5px;line-height:1.3;">{head}</strong>'
            f'<button type="button" id="eb-pu-x" aria-label="{close}" style="background:none;border:none;'
            'font-size:20px;line-height:1;color:#8a99a6;cursor:pointer;padding:0 2px;">×</button></div>'
            '<p id="eb-pu-room" style="margin:0 0 9px;font-size:13px;color:#0a4d7a;font-weight:700;display:none;"></p>'
            f'{rows}'
            + (f'<a href="{calc_href}" data-eb-pu="calc" style="display:block;text-align:center;font-size:13px;'
               f'color:#0f6ba8;font-weight:700;text-decoration:none;margin-top:2px;">{calc}</a>' if calc else "") +
            f'<p style="margin:8px 0 0;font-size:11px;color:#8a99a6;">{AD_LABEL[en]}<br>{sub}</p>'
            '</div></div>\n<script>(function(){'
            'var K="eb_pu_seen",box=document.getElementById("eb-pu");if(!box)return;'
            'try{var t=parseInt(localStorage.getItem(K)||"0",10);'
            'if(t&&(Date.now()-t)<604800000)return;}catch(e){}'
            'var shown=false,start=Date.now();'
            # The sticky CTA is also pinned to the bottom edge; two of them would
            # sit on top of each other. The popup wins while it is open, the bar
            # comes back the moment it is dismissed.
            'var sticky=document.getElementById("eb-sticky");'
            'function hide(reason){box.style.display="none";'
            'if(sticky&&window.scrollY>600)sticky.classList.add("on");'
            'try{localStorage.setItem(K,String(Date.now()));}catch(e){}'
            'if(window.gtag)gtag("event","popup_close",{reason:reason});}'
            'function show(trigger){if(shown)return;shown=true;'
            'var r=window.ebReadRoom&&window.ebReadRoom();'
            'if(r&&r.qm){var p=document.getElementById("eb-pu-room");if(p){'
            'p.textContent=(document.documentElement.lang==="en"?("Your room: "+r.qm+" m² · approx. "+r.btu+" BTU")'
            ':("Dein Raum: "+r.qm+" m² · ca. "+Number(r.btu).toLocaleString("de-DE")+" BTU"));'
            'p.style.display="block";}}'
            'if(sticky)sticky.classList.remove("on");'
            'box.style.display="block";'
            'if(window.gtag)gtag("event","popup_view",{trigger:trigger});}'
            'document.getElementById("eb-pu-x").addEventListener("click",function(){hide("x");});'
            'document.addEventListener("keydown",function(e){if(e.key==="Escape"&&shown)hide("esc");});'
            'box.querySelectorAll("[data-eb-pu]").forEach(function(a){a.addEventListener("click",function(){'
            'try{localStorage.setItem(K,String(Date.now()+15552000000));}catch(e){}'
            'if(window.gtag)gtag("event","popup_click",{target:a.getAttribute("data-eb-pu")});});});'
            # Deep scroll plus real dwell: the reader has to have read something
            # first. Exit intent only on devices with a mouse.
            'function depth(){var d=document.documentElement;'
            'return (window.scrollY+window.innerHeight)/Math.max(1,d.scrollHeight);}'
            'window.addEventListener("scroll",function(){'
            'if(depth()>0.65&&(Date.now()-start)>25000)show("scroll");},{passive:true});'
            'if(window.matchMedia&&window.matchMedia("(pointer:fine)").matches){'
            'document.addEventListener("mouseout",function(e){'
            'if(!e.relatedTarget&&e.clientY<=0&&(Date.now()-start)>8000)show("exit");});}'
            '})();</script><!--/EB_POPUP-->\n')


POPUP_SKIP = {"impressum", "datenschutz", "kontakt", "radar-bestaetigt"}


def inject_popup(html, slug, en=False):
    """Idempotently add the bottom-sheet purchase prompt on buying pages."""
    ctx = context_entries(slug, en)
    eligible = ((slug not in SKIP_MODELS or ctx) and slug not in POPUP_SKIP
                and ("<!--EB_MODELS-->" in html or any(n in html for n in CANON_NAMES)))
    if not eligible:
        return re.sub(r'<!--EB_POPUP-->.*?<!--/EB_POPUP-->\n?', '', html, flags=re.S)
    block = popup_block(device_of(slug), en, slug)
    if "<!--EB_POPUP-->" in html:
        return re.sub(r'<!--EB_POPUP-->.*?<!--/EB_POPUP-->\n?', lambda m: block, html, flags=re.S)
    if "<!--EB_TRACK-->" in html:
        return html.replace("<!--EB_TRACK-->", block + "<!--EB_TRACK-->", 1)
    return html.replace("</body>", block + "</body>", 1)


# The homepage's "Beliebteste Ratgeber" list was hardcoded from a GSC snapshot in
# July — a self-refresh gap: the site could not surface shifting demand without a
# human editing the list. Now the block reorders itself from /api/top (the site's
# own first-party funnel, aggregate paths+counts only). Honest mechanics: only
# links that already exist in the block are reordered and badged — the API can
# never inject a link, and when it returns nothing the block stays exactly as
# built. Zero layout shift beyond the reorder itself, no third parties.
# Site search. The box serves the reader; the telemetry serves the automation
# loop: each query is keyword research from the site's own audience, and a query
# with zero hits is unmet demand stated verbatim — the daily routine reads those
# from D1 as its topic queue. Index is lazy-loaded on first focus, so the search
# costs nothing on pages where nobody searches. Queries are truncated to 80
# chars and stored without any user identifier, same contract as every event.
SEARCH = ('<!--EB_SEARCH--><div id="eb-se" style="position:relative;">'
          '<button type="button" id="eb-se-t" aria-label="Suche" style="background:none;border:1px solid '
          'rgba(255,255,255,.35);color:#fff;border-radius:8px;padding:4px 11px;font-size:14px;cursor:pointer;">🔍</button>'
          '<div id="eb-se-p" style="display:none;position:absolute;right:0;top:38px;z-index:300;width:min(340px,86vw);'
          'background:#fff;border:1px solid #cfe0ea;border-radius:12px;box-shadow:0 10px 30px rgba(10,45,70,.25);padding:10px;">'
          '<input id="eb-se-q" type="search" placeholder="Ratgeber durchsuchen …" autocomplete="off" '
          'style="width:100%;padding:9px 12px;border:1px solid #cfd8e0;border-radius:8px;font-size:16px;color:#1a2733;">'
          '<div id="eb-se-r" style="margin-top:6px;max-height:320px;overflow-y:auto;"></div></div></div>\n'
          '<script>(function(){'
          'var t=document.getElementById("eb-se-t"),p=document.getElementById("eb-se-p"),'
          'q=document.getElementById("eb-se-q"),r=document.getElementById("eb-se-r");'
          'if(!t||!p||!q||!r)return;'
          'var EN=document.documentElement.lang==="en";'
          'if(EN)q.placeholder="Search guides …";'
          'var idx=null,loading=false,timer=null,sent={};'
          'function norm(s){return s.toLowerCase().replace(/ä/g,"ae").replace(/ö/g,"oe").replace(/ü/g,"ue").replace(/ß/g,"ss");}'
          'function load(){if(idx||loading)return;loading=true;'
          'fetch("/search-index.json").then(function(x){return x.json();}).then(function(d){idx=d;}).catch(function(){loading=false;});}'
          'function score(e,words){var ht=norm(e.t),hd=norm(e.d||"");var s=0;'
          'for(var i=0;i<words.length;i++){var w=words[i];if(!w)continue;'
          'if(ht.indexOf(w)>-1)s+=3;else if(hd.indexOf(w)>-1)s+=1;else return 0;}'
          'return s+(e.l===(EN?"en":"de")?1:0);}'
          'function tele(term,hits){var k=term+"|"+hits;if(sent[k])return;sent[k]=1;'
          'if(window.gtag)gtag("event","site_search",{q:term.slice(0,80),hits:hits});}'
          'function run(){var v=q.value.trim();if(v.length<3||!idx){r.innerHTML="";return;}'
          'var words=norm(v).split(/\\s+/);'
          'var hits=idx.map(function(e){return[score(e,words),e];}).filter(function(x){return x[0]>0;})'
          '.sort(function(a,b){return b[0]-a[0];}).slice(0,6);'
          'tele(v,hits.length);'
          'if(!hits.length){r.innerHTML=\'<div style="padding:10px 6px;font-size:13.5px;color:#5b6b78;">\'+'
          '(EN?"Nothing found — we noted the topic.":"Nichts gefunden — wir haben uns das Thema notiert.")+\'</div>\';return;}'
          'r.innerHTML=hits.map(function(x){var e=x[1];'
          'return \'<a href="\'+e.u+\'" data-eb-se="1" style="display:block;padding:9px 8px;border-radius:8px;'
          'text-decoration:none;color:#1a2733;font-size:14px;line-height:1.35;">\'+'
          '\'<strong style="color:#0f6ba8;">\'+e.t+\'</strong>\'+'
          '(e.d?\'<br><span style="color:#5b6b78;font-size:12.5px;">\'+e.d.slice(0,90)+\'…</span>\':"")+\'</a>\';}).join("");'
          'r.querySelectorAll("[data-eb-se]").forEach(function(a){a.addEventListener("click",function(){'
          'if(window.gtag)gtag("event","site_search",{q:q.value.trim().slice(0,80),hits:-1,pick:a.getAttribute("href")});});});}'
          't.addEventListener("click",function(){var open=p.style.display!=="none";'
          'p.style.display=open?"none":"block";if(!open){load();q.focus();}});'
          'q.addEventListener("focus",load);'
          'q.addEventListener("input",function(){clearTimeout(timer);timer=setTimeout(run,350);});'
          'document.addEventListener("click",function(e){'
          'if(!p.contains(e.target)&&e.target!==t)p.style.display="none";});'
          'document.addEventListener("keydown",function(e){if(e.key==="Escape")p.style.display="none";});'
          '})();</script><!--/EB_SEARCH-->\n')


def inject_search(html):
    """Idempotently add the search toggle inside the nav bar."""
    if "<!--EB_SEARCH-->" in html:
        return re.sub(r'<!--EB_SEARCH-->.*?<!--/EB_SEARCH-->\n?', lambda m: SEARCH, html, flags=re.S)
    # Inside the nav's flex row (.eb-nav-in), as its last child — works for both
    # the DE and EN nav, whose link lists differ.
    if "</div></nav><!--/EB_NAV-->" in html:
        return html.replace("</div></nav><!--/EB_NAV-->",
                            SEARCH + "</div></nav><!--/EB_NAV-->", 1)
    return html


def poplive_block():
    # Build-time slug→title map from each guide's own H1, so the live script can
    # render a card for ANY page the funnel surfaces — with the page's real
    # title, never an invented one. A first cut only reordered links already in
    # the block, which in practice matched nothing: the funnel's top pages are
    # exactly the ones a July snapshot did not anticipate.
    titles = {}
    for path in sorted(glob.glob(os.path.join(GUIDE, "*.html"))):
        slug = os.path.basename(path)[:-5]
        if slug == "404":
            continue
        h = open(path, encoding="utf-8").read()
        t = h1(h)
        if t:
            titles["/guide/" + slug + ".html"] = t
    payload = json.dumps(titles, ensure_ascii=False)
    return ('<!--EB_POPLIVE--><script type="application/json" id="eb-popmap">' + payload + '</script>\n'
            '<script>(function(){'
            'var mapEl=document.getElementById("eb-popmap");if(!mapEl)return;'
            'var titles={};try{titles=JSON.parse(mapEl.textContent);}catch(e){return;}'
            'fetch("/api/top").then(function(r){return r.json();}).then(function(d){'
            'if(!d||!d.pages)return;'
            'var known=d.pages.filter(function(p){return titles[p.page];}).slice(0,6);'
            # Fewer than 3 real entries would make the block look emptier than the
            # hand-picked list it replaces — keep the built version then.
            'if(known.length<3)return;'
            'var grid=null;document.querySelectorAll("section").forEach(function(s){'
            'if(!grid&&s.textContent.indexOf("Beliebteste Ratgeber")>-1)grid=s.querySelector("div");});'
            'if(!grid)return;'
            'var htmlOut="";'
            'known.forEach(function(p,i){'
            'var badge=i<3?\'<span style="display:inline-block;background:#fdece7;color:#b23c17;font-size:11px;font-weight:800;border-radius:12px;padding:2px 9px;margin-bottom:6px;">🔥 gerade gefragt</span><br>\':"";'
            'htmlOut+=\'<a href="\'+p.page+\'" style="display:block;background:#fff;border:1px solid #e4ebf0;'
            'border-radius:12px;padding:16px 18px;text-decoration:none;color:#1a2733;">\'+badge+'
            '\'<strong style="color:#0f6ba8;">\'+titles[p.page]+\'</strong></a>\';});'
            'grid.innerHTML=htmlOut;'
            '}).catch(function(){});})();</script><!--/EB_POPLIVE-->\n')


def inject_poplive(html):
    """Idempotently make the homepage popular block rank itself from live data."""
    blk = poplive_block()
    if "<!--EB_POPLIVE-->" in html:
        return re.sub(r'<!--EB_POPLIVE-->.*?<!--/EB_POPLIVE-->\n?', lambda m: blk, html, flags=re.S)
    if "<!--/EB_POPULAR-->" in html:
        return html.replace("<!--/EB_POPULAR-->", "<!--/EB_POPULAR-->" + blk, 1)
    return html


def inject_home_toppick(html, en=False):
    """Same strip on the homepage, directly under the hero — products before prose."""
    html = re.sub(r'<!--EB_TOPPICK-->.*?<!--/EB_TOPPICK-->\n?', '', html, flags=re.S)
    block = toppick_block("ac", en)
    # Inside the hero, right after the promise and before the generic buttons.
    # Placing it after the hero put it at 1453 px on a phone — the hero alone is
    # 880 px and the season teaser another 495 — so "under the fold" again.
    m = re.search(r'<div class="hero-btns">', html)
    if m:
        return html[:m.start()] + block + html[m.start():]
    for anchor in ("<!--/EB_SEASON-->", "<!--EB_HOMETOOL-->"):
        if anchor in html:
            if anchor.startswith("<!--/"):
                return html.replace(anchor, anchor + block, 1)
            return html.replace(anchor, block + anchor, 1)
    if "</header>" in html:
        return html.replace("</header>", "</header>" + block, 1)
    return html


def inject_climate(html, slug):
    """Idempotently add the sourced heat-day trend to cooling pages."""
    if device_of(slug) != "ac" or slug in CLIMATE_SKIP:
        return re.sub(r'<!--EB_CLIMATE-->.*?<!--/EB_CLIMATE-->\n?', '', html, flags=re.S)
    if "<!--EB_CLIMATE-->" in html:
        return re.sub(r'<!--EB_CLIMATE-->.*?<!--/EB_CLIMATE-->\n?', lambda m: CLIMATE_BOX, html, flags=re.S)
    if "<!--EB_RADAR-->" in html:
        return html.replace("<!--EB_RADAR-->", CLIMATE_BOX + "<!--EB_RADAR-->", 1)
    return html


# --- Energy cross-sell: cost-pain pages get a bridge to the high-AOV storage
# cluster ("offset the running costs with balcony solar"). Idempotent marker. ---
ENERGY_PAGES = {"klimaanlage-stromkosten", "ventilator-stromverbrauch",
                "heizluefter-stromverbrauch", "strom-sparen-haushalt",
                "klimaanlage-nachts-laufen-lassen"}

ENERGY_BOX = (
    '<!--EB_ENERGY--><section style="max-width:1000px;margin:14px auto 0;padding:0 20px;">'
    '<div style="background:#eefaf3;border:1px solid #cdeede;border-radius:12px;padding:16px 18px;'
    'display:flex;gap:14px;align-items:center;flex-wrap:wrap;">'
    '<div style="font-size:28px;line-height:1;">🔋</div>'
    '<div style="flex:1 1 260px;"><strong style="font-size:15px;display:block;">Laufende Kosten mit '
    'Solarstrom senken</strong><span style="font-size:13.5px;color:#3d5748;">Ein Balkonkraftwerk mit '
    'Speicher deckt einen Teil genau dieser Stromkosten — nachrüstbar, ohne Handwerker, 0 % MwSt.</span></div>'
    '<div style="display:flex;gap:8px;flex-wrap:wrap;">'
    '<a href="/guide/balkonspeicher-rechner.html" style="background:#2f7d4f;color:#fff;font-weight:800;'
    'padding:9px 14px;border-radius:8px;text-decoration:none;font-size:13.5px;white-space:nowrap;">Speicher-Rechner →</a>'
    '<a href="/guide/balkonkraftwerk-speicher-nachruesten.html" style="background:#fff;color:#2f7d4f;'
    'border:1px solid #9fd4b4;font-weight:700;padding:9px 14px;border-radius:8px;text-decoration:none;'
    'font-size:13.5px;white-space:nowrap;">Nachrüsten-Guide →</a>'
    '</div></div></section><!--/EB_ENERGY-->\n')


# Pages that carry an interactive calculator. Whoever reaches one of these has
# already shown they find the tool useful — that is the cheapest place to tell
# them they can put it on their own site, so embeds no longer depend on outreach.
TOOL_PAGES = {"btu-rechner", "stromkosten-rechner", "infrarotheizung-watt-rechner",
              "heizkosten-vergleich-rechner", "stromvergleich-check", "hitze-check",
              "keller-lueften-sommer", "balkonspeicher-rechner",
              "balkonkraftwerk-lohnt-sich-rechner", "balkonkraftwerk-standort-check"}

# Only these calculators actually exist as an embeddable widget, so only their
# pages may promise "this calculator". The rest link to what is really on offer.
WIDGET_OF = {"btu-rechner": "BTU-Rechner", "keller-lueften-sommer": "Taupunkt-Rechner",
             "stromkosten-rechner": "Stromkosten-Rechner"}


def embed_box(slug):
    if slug in WIDGET_OF:
        head = "Diesen Rechner auf der eigenen Website?"
        body = ("Kostenlos einbinden — in deiner Farbe, ohne Registrierung. Betriebe setzen den "
                "Ergebnis-Button auf ihr eigenes Kontaktformular: Wer rechnet, landet dann bei ihnen.")
    else:
        head = "Einen Rechner auf der eigenen Website?"
        body = ("Stromkosten-, Taupunkt- und BTU-Rechner gibt es als fertigen Einbau-Code — "
                "kostenlos, in deiner Farbe, ohne Registrierung. Betriebe setzen den Ergebnis-Button "
                "auf ihr eigenes Kontaktformular: Wer rechnet, landet dann bei ihnen.")
    return (
        '<!--EB_EMBED--><section style="max-width:1000px;margin:22px auto 0;padding:0 20px;">'
        '<div style="background:#f4f8fb;border:1px solid #d8e6f0;border-radius:12px;padding:15px 18px;'
        'display:flex;gap:14px;align-items:center;flex-wrap:wrap;">'
        '<div style="font-size:26px;line-height:1;">🧩</div>'
        f'<div style="flex:1 1 280px;"><strong style="font-size:14.5px;display:block;">{head}</strong>'
        f'<span style="font-size:13px;color:#4a5a67;">{body}</span></div>'
        '<a href="/widgets.html" style="background:#0f6ba8;color:#fff;font-weight:800;padding:9px 14px;'
        'border-radius:8px;text-decoration:none;font-size:13.5px;white-space:nowrap;">Widget-Code holen →</a>'
        '</div></section><!--/EB_EMBED-->\n')


# Cooling and energy are two clusters on this site that the reader experiences as
# one problem: a heatwave is when cooling demand peaks and — because the grid is
# full of solar at midday — when power is at its cheapest. Nobody in the cooling
# SERP mentions the price side and nobody in the tariff SERP mentions cooling, so
# this box carries the connection onto every page about a device that actually
# draws meaningful power. Fans, shading and the energy pages themselves are left
# out: for a 50 W fan the argument does not matter, and on the energy pages it
# would be circular.
HEATENERGY_SKIP = {"klimaanlage-balkonkraftwerk", "strompreis-radar", "klimaanlage-stromkosten",
                   "stromkosten-rechner", "stromvergleich-check"}

HEATENERGY_BOX = (
    '<!--EB_HEATENERGY--><section style="max-width:1000px;margin:18px auto 0;padding:0 20px;">'
    '<div style="background:#fff8ec;border:1px solid #f3ddc0;border-radius:12px;padding:16px 18px;'
    'display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap;">'
    '<div style="font-size:26px;line-height:1;">☀️</div>'
    '<div style="flex:1 1 300px;"><strong style="font-size:15px;display:block;margin-bottom:4px;">'
    'Kühlen ist mittags am billigsten</strong>'
    '<span style="font-size:13.5px;color:#5a5340;">Genau bei Hitze steckt am meisten Solarstrom im Netz — '
    'die Börsenpreise sind dann typischerweise am niedrigsten und abends am höchsten. Wer die Wohnung '
    '<strong>mittags vorkühlt</strong> statt abends gegenzuhalten, verschiebt den Verbrauch in die '
    'günstige Stunde. Ein Klimagerät ist damit genau der steuerbare Verbraucher, an dem sich ein '
    'dynamischer Tarif überhaupt erst rechnet.</span>'
    '<div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;">'
    '<a href="/guide/strompreis-radar.html" style="background:#e08c05;color:#1a2733;font-weight:800;'
    'padding:8px 13px;border-radius:8px;text-decoration:none;font-size:13px;">Aktuelle Preiskurve →</a>'
    '<a href="/guide/stromkosten-rechner.html" style="background:#fff;color:#8a6410;border:1px solid #f0cf9a;'
    'font-weight:700;padding:8px 13px;border-radius:8px;text-decoration:none;font-size:13px;">Was kostet mein Gerät? →</a>'
    '<a href="/guide/klimaanlage-balkonkraftwerk.html" style="background:#fff;color:#8a6410;border:1px solid #f0cf9a;'
    'font-weight:700;padding:8px 13px;border-radius:8px;text-decoration:none;font-size:13px;">Mit eigenem Solarstrom? →</a>'
    '</div>'
    # Twenty-one pages advise pre-cooling on a timer; none of the cooling
    # cluster linked the accessory that does it. With the honest catch stated:
    # a smart plug only works if the unit powers back on by itself.
    # Werbekennzeichnung at the ad itself (check_adlabel.py, denylist since
    # 2026-09-04 — this block shipped 69 pages without one).
    f'<p style="margin:10px 0 0;font-size:11px;color:#8a99a6;">{AD_LABEL[False]}</p>'
    '<p style="margin:4px 0 0;font-size:12.5px;color:#5a5340;">Vorkühlen automatisieren: eine '
    '<a href="https://www.amazon.de/s?k=wlan+steckdose+zeitschaltuhr&amp;tag=getecoback-21" target="_blank" '
    'rel="sponsored noopener" style="color:#0f6ba8;font-weight:700;">WLAN-Steckdose mit Timer</a> (ab ~10&nbsp;€) '
    'schaltet das Gerät mittags ein — <strong>funktioniert nur, wenn dein Gerät nach Stromzufuhr von selbst '
    'wieder anläuft</strong> (Auto-Restart, steht im Handbuch).</p>'
    '</div></div></section><!--/EB_HEATENERGY-->\n')


# A shop answers "which one do I need?" with faceted navigation. This site cannot
# show live prices or land people on a product page — it links by model name — so
# the decision has to be finished before the click. These facets are built only
# from pages that already exist, so nothing here is a promise we cannot keep.
QUICKPICK = {
    "ac": [
        ("Nach Raumgröße", [(f"{n} m²", f"/guide/klimaanlage-{n}-qm.html") for n in (10, 15, 20, 25, 30, 40, 50)]),
        ("Nach Fenstertyp", [("Kippfenster", "/guide/klimaanlage-kippfenster.html"),
                             ("Dachfenster", "/guide/klimaanlage-dachfenster.html"),
                             ("Kein Fenster", "/guide/raum-ohne-fenster-kuehlen.html"),
                             ("Schlauch zu kurz", "/guide/abluftschlauch-verlaengern.html")]),
        ("Nach Situation", [("Schlafzimmer", "/guide/beste-tragbare-klimaanlage-schlafzimmer.html"),
                            ("Dachgeschoss", "/guide/dachgeschoss-kuehlen.html"),
                            ("Ohne Abluftschlauch", "/guide/klimaanlage-ohne-abluftschlauch.html")]),
    ],
    "dehum": [
        ("Nach Raumgröße", [(f"{n} m²", f"/guide/luftentfeuchter-{n}-qm.html") for n in (10, 15, 20, 25, 30, 40)]),
        ("Nach Einsatzort", [("Keller", "/guide/luftentfeuchter-keller.html"),
                             ("Wäsche trocknen", "/guide/waesche-trocknen-wohnung.html"),
                             ("Gegen Schimmel", "/guide/luftentfeuchter-gegen-schimmel.html")]),
        ("Nach Bauart", [("Granulat oder elektrisch", "/guide/luftentfeuchter-granulat-oder-elektrisch.html"),
                         ("Dauerbetrieb-Kosten", "/guide/luftentfeuchter-dauerbetrieb-stromkosten.html")]),
    ],
    "heater": [
        ("Nach Raumgröße", [(f"{n} m²", f"/guide/heizung-{n}-qm.html") for n in (10, 15, 20, 25, 30, 40, 50)]),
        ("Nach Gerätetyp", [("Infrarotheizung", "/guide/infrarotheizung-ratgeber.html"),
                            ("Heizlüfter", "/guide/heizluefter-stromsparend.html")]),
        ("Nach Betriebskosten", [("Watt-Rechner", "/guide/infrarotheizung-watt-rechner.html"),
                                 ("Heizkosten vergleichen", "/guide/heizkosten-vergleich-rechner.html")]),
    ],
}


QUICKPICK_EN = {
    "ac": [
        ("By window type", [("Tilt-and-turn", "/en/guide/portable-ac-tilt-and-turn-windows.html"),
                            ("Skylight / roof", "/en/guide/portable-ac-skylight-roof-window.html"),
                            ("No window", "/en/guide/vent-portable-ac-without-window.html"),
                            ("Hose too short", "/en/guide/portable-ac-hose-extension.html")]),
        ("By room", [("Bedroom", "/en/guide/best-portable-air-conditioner-for-bedroom.html"),
                     ("How many BTU?", "/en/guide/how-many-btu-do-i-need.html"),
                     ("BTU calculator", "/en/guide/btu-calculator.html")]),
        ("Compare options", [("Portable AC vs air cooler", "/en/guide/portable-ac-vs-air-cooler.html"),
                             ("Evaporative cooler vs fan", "/en/guide/evaporative-cooler-vs-fan.html"),
                             ("Cheapest way to cool", "/en/guide/cheapest-way-to-cool-a-room-without-installation.html"),
                             ("Running cost", "/en/guide/portable-ac-running-cost.html")]),
    ],
}


def quickpick_box(device, slug, en=False):
    table = QUICKPICK_EN if en else QUICKPICK
    heading = "Find the right unit fast" if en else "Schnell zum passenden Gerät"
    cols = []
    for title, items in table[device]:
        links = "".join(
            f'<a href="{href}" style="display:inline-block;background:#fff;border:1px solid #cfe0ea;'
            f'color:#0a4d7a;border-radius:20px;padding:5px 12px;margin:0 6px 6px 0;text-decoration:none;'
            f'font-size:13px;font-weight:700;">{label}</a>'
            for label, href in items if not href.endswith(f"/{slug}.html"))
        if not links:
            continue
        cols.append(
            f'<div style="flex:1 1 220px;"><strong style="display:block;font-size:12.5px;'
            f'text-transform:uppercase;letter-spacing:.4px;color:#5b6b78;margin-bottom:7px;">{title}</strong>'
            f'<div>{links}</div></div>')
    if not cols:
        return ""
    return ('<!--EB_QUICKPICK--><section style="max-width:1000px;margin:14px auto 0;padding:0 20px;">'
            '<div style="background:#f7fafc;border:1px solid #e4ebf0;border-radius:12px;padding:16px 18px;">'
            f'<strong style="font-size:15px;display:block;margin-bottom:10px;">{heading}</strong>'
            '<div style="display:flex;gap:18px;flex-wrap:wrap;">' + "".join(cols) +
            '</div></div></section><!--/EB_QUICKPICK-->\n')


# The homepage linked to the calculators instead of carrying one, so using a tool
# cost a page load — and the first-party analytics recorded zero tool events. This
# puts the question every buyer has to answer first directly on the page, and then
# routes the answer onward: room size in, cooling capacity out, matching size guide
# and endorsed model next to it. Formula, thresholds and size mapping are copied
# line for line from /guide/btu-rechner.html, and the two inputs left out here are
# fixed at that calculator's own defaults (standard ceiling, two people, no open
# kitchen), so the homepage and the full calculator never disagree.
HOME_TOOL = '''<!--EB_HOMETOOL--><section style="background:#fff;border-bottom:1px solid #e4ebf0;">
<div style="max-width:960px;margin:0 auto;padding:26px 20px;">
<div style="background:#f7fafc;border:1px solid #cfe0ea;border-radius:14px;padding:20px 22px;">
<strong style="font-size:19px;display:block;margin-bottom:3px;">Welche Kühlleistung braucht dein Raum?</strong>
<p style="margin:0 0 14px;color:#5b6b78;font-size:14px;">Die eine Zahl, die vor jedem Kauf zählt — hier direkt ausrechnen, ohne Seitenwechsel.</p>
<div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;">
<div style="flex:1 1 150px;"><label for="eb-ht-qm" style="display:block;font-weight:700;font-size:12.5px;margin-bottom:4px;">Raumgröße (m²)</label>
<input id="eb-ht-qm" type="number" value="20" min="4" max="120" inputmode="numeric" style="width:100%;padding:10px 12px;border:1px solid #cfd8e0;border-radius:8px;font-size:16px;background:#fff;color:#1a2733;"></div>
<div style="flex:1 1 210px;"><label for="eb-ht-sun" style="display:block;font-weight:700;font-size:12.5px;margin-bottom:4px;">Sonneneinstrahlung</label>
<select id="eb-ht-sun" style="width:100%;padding:10px 12px;border:1px solid #cfd8e0;border-radius:8px;font-size:16px;background:#fff;color:#1a2733;font-family:inherit;">
<option value="0.9">Wenig (Nord, schattig)</option><option value="1" selected>Normal</option><option value="1.2">Stark (Süd/West, Dachlage)</option></select></div>
<div style="flex:0 0 auto;"><button type="button" id="eb-ht-go" style="background:#0f6ba8;color:#fff;border:none;padding:12px 22px;border-radius:8px;font-size:15px;font-weight:800;cursor:pointer;">Berechnen</button></div>
</div>
<div id="eb-ht-res" style="display:none;margin-top:16px;background:#eaf6ff;border:1px solid #cfe6fa;border-radius:10px;padding:16px 18px;"></div>
</div></div></section>
<script>(function(){
var q=document.getElementById("eb-ht-qm"),s=document.getElementById("eb-ht-sun"),
    b=document.getElementById("eb-ht-go"),r=document.getElementById("eb-ht-res");
if(!q||!b||!r)return;
function calc(){
  var qm=Math.max(4,Math.min(120,parseFloat(q.value)||20));
  var sun=parseFloat(s.value)||1;
  // same as /guide/btu-rechner.html with its defaults: ceiling 1, 2 people, no open kitchen
  var btu=Math.round(qm*340*sun/500)*500;
  var model,term,url,label;
  if(btu<=9000){model="Comfee MPPH-09CRN7";term="Comfee+MPPH-09CRN7";url=A_COMFEE;label="bis ca. 9.000 BTU";}
  else if(btu<=11000){model="De'Longhi Pinguino PAC EX105";term="De%27Longhi+Pinguino+PAC+EX105";url=A_PINGUINO;label="9.000–11.000 BTU";}
  else if(btu<=13500){model="Klarstein Kraftwerk Smart 12K";term="Klarstein+Kraftwerk+Smart+12K";url=A_KLARSTEIN;label="11.000–13.500 BTU";}
  // Über ~13.500 BTU nennen wir kein Modell, weil wir keines haben: das größte tragbare
  // Gerät in DEVICE_MODELS["ac"] ist der 12K-Klarstein. Einem Leser, der gerade 20.500 BTU
  // ausgerechnet hat, ein 12.000-BTU-Gerät zu verkaufen, wäre schlicht gelogen.
  else{model="";term="";url="";label="über 13.500 BTU";}
  var qp=qm<=12?10:qm<=17?15:qm<=22?20:qm<=27?25:qm<=35?30:40;
  r.innerHTML='<div style="font-size:13.5px;color:#4a5a67;">Empfohlene Kühlleistung für '+qm+' m²</div>'+
    '<div style="font-size:30px;font-weight:800;color:#0a4d7a;line-height:1.2;">ca. '+btu.toLocaleString("de-DE")+' BTU</div>'+
    (model?'<div style="margin:8px 0 0;font-size:14.5px;">Passende Geräteklasse ('+label+'): <strong>'+model+'</strong> — kein Bohren: Schlauch ans Fenster, Abdichtung drum.</div>':'<div style="margin:8px 0 0;font-size:14.5px;">Klasse: <strong>'+label+'</strong> — hier ist ein tragbarer Monoblock am Limit. Ehrlich empfehlen können wir dafür keines unserer Geräte; realistisch sind ein <a href="/guide/split-klimaanlage-ohne-kernbohrung.html">Splitgerät ohne Kernbohrung</a> oder zwei kleinere Geräte.</div>')+
    '<div style="margin:12px 0 0;display:flex;gap:9px;flex-wrap:wrap;">'+
    (model?'<a href="'+url+'" target="_blank" rel="sponsored noopener" style="background:#f59e0b;color:#1a2733;font-weight:800;padding:10px 16px;border-radius:8px;text-decoration:none;font-size:14px;">Preis auf Amazon prüfen →</a>':'')+
    '<a href="/guide/klimaanlage-'+qp+'-qm.html" style="background:#fff;color:#0a4d7a;border:1px solid #cfe0ea;font-weight:700;padding:10px 16px;border-radius:8px;text-decoration:none;font-size:14px;">Alle Empfehlungen für '+qp+' m² →</a>'+
    '<a href="/guide/btu-rechner.html" style="background:#fff;color:#0a4d7a;border:1px solid #cfe0ea;font-weight:700;padding:10px 16px;border-radius:8px;text-decoration:none;font-size:14px;">Decke, Personen, Küche einrechnen →</a>'+
    '<button type="button" id="eb-ht-save" style="background:#fff;color:#0a4d7a;border:1px solid #cfe0ea;font-weight:700;padding:10px 16px;border-radius:8px;font-size:14px;cursor:pointer;">📌 Diesen Raum merken</button>'+
    '<button type="button" id="eb-ht-share" style="background:#fff;color:#0a4d7a;border:1px solid #cfe0ea;font-weight:700;padding:10px 16px;border-radius:8px;font-size:14px;cursor:pointer;">↗ Ergebnis teilen</button></div>'+
    '<p id="eb-ht-perma" style="margin:8px 0 0;font-size:12px;color:#5b6b78;"></p>'+
    '<div id="eb-ht-sub" style="margin:14px 0 0;padding:14px 0 0;border-top:1px solid #cfe6fa;">'+
    '<strong style="font-size:14.5px;display:block;">Sollen wir dich erinnern, bevor es wieder heiß wird?</strong>'+
    '<span style="font-size:13px;color:#4a5a67;display:block;margin:2px 0 9px;">Eine Nachricht vor der nächsten Hitzewelle — und wenn '+(model?'<strong>'+model+'</strong>':'ein passendes Gerät')+' im Preis fällt. Dein Raum ('+qm+' m²) ist dann schon hinterlegt.</span>'+
    '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">'+
    '<input id="eb-ht-mail" type="email" placeholder="deine@email.de" autocomplete="email" style="flex:1 1 220px;padding:10px 12px;border:1px solid #cfd8e0;border-radius:8px;font-size:15px;background:#fff;color:#1a2733;">'+
    '<button type="button" id="eb-ht-sub-go" style="background:#0a4d7a;color:#fff;border:none;padding:11px 18px;border-radius:8px;font-weight:800;font-size:14px;cursor:pointer;">Erinnere mich</button></div>'+
    '<label style="display:block;margin:9px 0 0;font-size:12px;color:#5b6b78;"><input type="checkbox" id="eb-ht-consent" style="margin-right:6px;">Ja, schickt mir den kostenlosen Hitze-Radar per E-Mail. Jederzeit abbestellbar — <a href="/datenschutz.html" style="color:#0f6ba8;">Datenschutz</a>.</label>'+
    '<p style="margin:7px 0 0;font-size:11.5px;color:#7a8b98;">Der Versand ist noch im Aufbau: Bis dahin bekommst du keine E-Mails, stehst aber ab der ersten Warnung auf der Liste.</p>'+
    '<p id="eb-ht-sub-msg" style="margin:7px 0 0;font-size:13px;"></p></div>'+
    '<p style="margin:10px 0 0;font-size:12px;color:#5b6b78;">Richtwert nach 340 BTU/m². Modelle nicht selbst getestet — Auswahl nach öffentlichen Tests, Links sind Affiliate-Links.</p>';
  r.style.display="block";
  var link=location.origin+"/?qm="+qm+"&sun="+sun;
  var pl=document.getElementById("eb-ht-perma");
  if(pl)pl.innerHTML='Ergebnis zum Wiederfinden: <a href="'+link+'" style="color:#0f6ba8;">'+link+'</a>';
  var shb=document.getElementById("eb-ht-share");
  if(shb)shb.addEventListener("click",function(){
    if(!window.ebShare)return;
    window.ebShare({title:"Wie viel BTU braucht mein Raum?",
      text:"Für "+qm+" m² sind es ca. "+btu.toLocaleString("de-DE")+" BTU — hier für deinen Raum nachrechnen:",
      url:link,src:"home-tool",
      done:function(m){shb.textContent=m==="copy"?"✓ Link kopiert":"✓ Geteilt";}});
  });
  var sv=document.getElementById("eb-ht-save");
  if(sv)sv.addEventListener("click",function(){
    if(window.ebSaveRoom)window.ebSaveRoom({qm:qm,btu:btu,model:model,term:term,qp:qp});
    sv.textContent="✅ Gemerkt — steht ab jetzt auf jeder Seite";
  });
  var mb=document.getElementById("eb-ht-sub-go");
  if(mb)mb.addEventListener("click",function(){
    var mail=(document.getElementById("eb-ht-mail")||{}).value||"";
    var ok=(document.getElementById("eb-ht-consent")||{}).checked;
    var msg=document.getElementById("eb-ht-sub-msg");
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)){msg.textContent="Bitte eine gültige E-Mail-Adresse eintragen.";msg.style.color="#c0392b";return;}
    if(!ok){msg.textContent="Bitte die Einwilligung bestätigen.";msg.style.color="#c0392b";return;}
    msg.textContent="…";msg.style.color="#5b6b78";
    fetch("/api/subscribe",{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({email:mail,consent:true,locale:"de",source:"home-tool",topics:["heatwave","price"],
        region:String(qm)+" qm",
        consent_text:"Ja, schickt mir den kostenlosen Hitze-Radar per E-Mail. Jederzeit abbestellbar."})})
      .then(function(x){return x.json();}).then(function(j){
        if(j&&j.ok){msg.textContent="✅ Eingetragen. Du hörst von uns, bevor es wieder heiß wird.";msg.style.color="#1f8a4c";
          if(window.gtag)gtag("event","subscribe",{method:"home-tool",locale:"de"});}
        else{msg.textContent="Das hat nicht geklappt — bitte später noch einmal versuchen.";msg.style.color="#c0392b";}
      }).catch(function(){msg.textContent="Das hat nicht geklappt — bitte später noch einmal versuchen.";msg.style.color="#c0392b";});
  });
  if(window.gtag)gtag("event","btu_calc",{source:"home",qm:qm,btu:btu});
}
b.addEventListener("click",calc);
q.addEventListener("keydown",function(e){if(e.key==="Enter")calc();});
// A shared or bookmarked result recomputes itself, so the link is a real way back.
try{var sp=new URLSearchParams(location.search);
if(sp.get("qm")){q.value=String(Math.max(4,Math.min(120,parseFloat(sp.get("qm"))||20)));
var sv2=sp.get("sun");if(sv2==="0.9"||sv2==="1"||sv2==="1.2")s.value=sv2;calc();}
else{var saved=window.ebReadRoom&&window.ebReadRoom();
 if(saved&&saved.qm){q.value=String(saved.qm);}}}catch(e){}
})();</script><!--/EB_HOMETOOL-->
'''

# The homepage tool's three picks resolve through the same amazon_url() helper as
# every server-rendered card: a verified ASIN becomes a product page, an
# unverified model keeps an honest search link. Substituted here because
# HOME_TOOL is a plain literal — before this, the JS built its own s?k= URL and
# the homepage sent buyers of two ASIN-verified models to a search box.
HOME_TOOL = (HOME_TOOL
    .replace("A_COMFEE", json.dumps(amazon_url("Comfee+MPPH-09CRN7", "Comfee MPPH-09CRN7")))
    .replace("A_PINGUINO", json.dumps(amazon_url("De%27Longhi+Pinguino+PAC+EX105", "De'Longhi Pinguino PAC EX105")))
    .replace("A_KLARSTEIN", json.dumps(amazon_url("Klarstein+Kraftwerk+Smart+12K", "Klarstein Kraftwerk Smart 12K"))))


# Retention without an account and without email. A visitor who has worked out the
# cooling capacity for their room has produced something worth keeping, and until
# now it vanished on the next page load. Saving it — only when they ask — makes
# every later page speak to their actual room, which is the whole point of coming
# back. Stored in localStorage: no account, no server, no personal data, and a
# clear way to delete it. The site cannot send email, so this is retention we can
# actually deliver rather than a promise waiting on infrastructure.
PROFILE = ('<!--EB_PROFILE--><div id="eb-profile"></div>\n<script>(function(){'
           'var K="eb_room",host=document.getElementById("eb-profile");if(!host)return;'
           'var EN=document.documentElement.lang==="en";'
           'function read(){try{var v=JSON.parse(localStorage.getItem(K)||"null");'
           'return(v&&v.qm&&v.btu)?v:null;}catch(e){return null;}}'
           'function ev(n,m){if(window.gtag)gtag("event",n,m||{});}'
           'function render(){'
           'var p=read();if(!p){host.innerHTML="";return;}'
           'var sizeHref=EN?"/en/guide/how-many-btu-do-i-need.html":"/guide/klimaanlage-"+p.qp+"-qm.html";'
           'var sizeText=EN?("Guide for "+p.qm+" m²"):("Empfehlungen für "+p.qp+" m²");'
           'var lead=EN?"Your room":"Dein Raum";'
           'var forget=EN?"forget":"vergessen";'
           # The saved room stores the model the calculator picked; if that model
           # has a verified ASIN, this bar must open its product page too. The map
           # is emitted at build time from MODEL_ASIN, so the two never drift.
           'var DP=' + json.dumps({q: a for q, a in (
               ("Comfee+MPPH-09CRN7", MODEL_ASIN.get("Comfee MPPH-09CRN7", "")),
               ("De%27Longhi+Pinguino+PAC+EX105", MODEL_ASIN.get("De'Longhi Pinguino PAC EX105", "")),
               ("Klarstein+Kraftwerk+Smart+12K", MODEL_ASIN.get("Klarstein Kraftwerk Smart 12K", "")),
           ) if ASIN_RE.match((a or "").strip().upper())}) + ';'
           'var amazon=DP[p.term]?("https://www.amazon.de/dp/"+DP[p.term]+"?tag=getecoback-21")'
           # p.term is stored ALREADY in query form ("Comfee+MPPH-09CRN7"), so
           # encodeURIComponent() double-encoded it — the EX105 fallback searched
           # amazon for the literal string "De%27Longhi+Pinguino+PAC+EX105".
           # Found 2026-08-31 in the Playwright check of the fix above.
           ':("https://www.amazon.de/s?k="+(p.term?String(p.term):encodeURIComponent("tragbare klimaanlage"))+"&tag=getecoback-21");'
           'var shop=EN?"Check price on Amazon →":"Preis auf Amazon prüfen →";'
           'host.innerHTML=\'<div style="max-width:1000px;margin:0 auto;padding:9px 20px;display:flex;'
           'gap:8px 14px;align-items:center;flex-wrap:wrap;font-size:13.5px;background:#eaf6ff;'
           'border-bottom:1px solid #cfe6fa;">\'+'
           '\'<span style="font-weight:800;color:#0a4d7a;">\'+lead+\': \'+p.qm+\' m² · ca. \'+'
           'Number(p.btu).toLocaleString(EN?"en-GB":"de-DE")+\' BTU</span>\'+'
           '(p.model?\'<span style="color:#4a5a67;">\'+p.model+\'</span>\':"")+'
           '\'<a href="\'+sizeHref+\'" data-eb-p="size" style="color:#0f6ba8;font-weight:700;text-decoration:none;">\'+sizeText+\' →</a>\'+'
           # Werbekennzeichnung (2026-08-29): this bar renders an affiliate link on
           # every page it appears on and carried no label for its whole life — it
           # was simply missing from check_adlabel's BLOCKS list, so nothing looked.
           '\'<span style="font-size:11px;font-weight:800;color:#7a8b98;letter-spacing:.3px;">\'+(EN?"Ad":"Anzeige")+\'</span>\'+'
           '\'<a href="\'+amazon+\'" target="_blank" rel="sponsored noopener" data-eb-p="shop" '
           'style="color:#0f6ba8;font-weight:700;text-decoration:none;">\'+shop+\'</a>\'+'
           '\'<button type="button" id="eb-p-x" style="margin-left:auto;background:none;border:none;'
           'color:#7a8b98;font-size:12.5px;cursor:pointer;text-decoration:underline;">\'+forget+\'</button></div>\';'
           'var x=document.getElementById("eb-p-x");'
           'if(x)x.addEventListener("click",function(){try{localStorage.removeItem(K);}catch(e){}'
           'ev("profile_clear");render();});'
           'host.querySelectorAll("[data-eb-p]").forEach(function(a){'
           'a.addEventListener("click",function(){ev("profile_use",{target:a.getAttribute("data-eb-p"),qm:p.qm});});});'
           'ev("profile_use",{target:"shown",qm:p.qm});}'
           'window.ebSaveRoom=function(p){try{localStorage.setItem(K,JSON.stringify(p));}catch(e){}'
           'ev("profile_save",{qm:p.qm,btu:p.btu});render();};'
           'window.ebReadRoom=read;render();})();</script><!--/EB_PROFILE-->\n')


# Cross-border marketplaces as a second buying path. We link, we do not import:
# putting Chinese electricals on the German market ourselves would make this site
# the manufacturer in the eyes of the ElektroG — Stiftung EAR registration before
# the first sale, annual insolvency security, disposal fees, plus LUCID, GPSR and
# a 14-day right of withdrawal, with fines and a sales ban for getting it wrong.
# Linking carries none of that: the marketplace is the seller.
# Tracking IDs are empty until the owner registers; the links work either way and
# become affiliate links the moment these constants are filled in.
ALI_TRACKING = ""      # AliExpress Portals tracking id
TEMU_TRACKING = ""     # Temu affiliate id


def cb_link(platform, query):
    from urllib.parse import quote_plus
    q = quote_plus(query)
    if platform == "ali":
        url = f"https://de.aliexpress.com/w/wholesale-{q}.html"
        if ALI_TRACKING:
            url += f"?aff_trace_key={ALI_TRACKING}"
    else:
        url = f"https://www.temu.com/search_result.html?search_key={q}"
        if TEMU_TRACKING:
            url += f"&_p_rfs={TEMU_TRACKING}"
    return url


# Weather-reactive band. The seasonal rotation only knows the month, so on the
# days demand actually spikes — a real heatwave — the site read the same as any
# other July day. This asks the Worker (which caches the forecast at the edge)
# and speaks up only when it is genuinely getting hot. Renders nothing otherwise,
# so there is no noise and no layout shift on a normal day.
HEATNOW = ('<!--EB_HEATNOW--><div id="eb-heatnow"></div>\n<script>(function(){'
           'var h=document.getElementById("eb-heatnow");if(!h)return;'
           'fetch("/api/heat").then(function(r){return r.json();}).then(function(d){'
           'if(!d)return;'
           'if(!d.level||!d.temp){if(d.cold&&d.cold.level&&d.cold.temp!==null){renderCold(d.cold);}return;}'
           'var hot=d.level>=2;'
           'var when="";try{if(d.day){var dt=new Date(d.day+"T12:00:00");'
           'when=" am "+["So","Mo","Di","Mi","Do","Fr","Sa"][dt.getDay()]+".";}}catch(e){}'
           'var head=hot?("🔥 Hitzewelle im Anmarsch: bis "+Math.round(d.temp)+" °C in "+d.region+when)'
           ':("🌡️ Es wird heiß: bis "+Math.round(d.temp)+" °C in "+d.region+when);'
           'var sub=hot?"Erfahrungsgemäß sind mobile Klimageräte dann innerhalb weniger Tage vergriffen."'
           ':"Jetzt ist die ruhige Zeit zum Vergleichen — nicht erst, wenn es 35 °C hat.";'
           'h.innerHTML=\'<div style="background:\'+(hot?"#fdece7":"#fff8ec")+\';border-bottom:1px solid \'+(hot?"#f3c4b4":"#f3ddc0")+\';">\'+'
           '\'<div style="max-width:1000px;margin:0 auto;padding:10px 20px;display:flex;gap:8px 14px;'
           'align-items:center;flex-wrap:wrap;font-size:13.5px;">\'+'
           '\'<strong style="color:\'+(hot?"#b23c17":"#8a6410")+\';">\'+head+\'</strong>\'+'
           '\'<span style="color:#5a5340;">\'+sub+\'</span>\'+'
           '\'<a href="/#eb-ht-qm" data-eb-h="tool" style="color:#0f6ba8;font-weight:700;text-decoration:none;">Kühlleistung berechnen →</a>\'+'
           '\'<a href="/guide/beste-tragbare-klimaanlage-hitzewelle.html" data-eb-h="guide" '
           'style="color:#0f6ba8;font-weight:700;text-decoration:none;">Aktuelle Empfehlungen →</a>\'+'
           '\'<button type="button" id="eb-hn-share" style="background:none;border:1px solid \'+(hot?"#e0a690":"#e3c99a")+\';'
           'color:\'+(hot?"#b23c17":"#8a6410")+\';border-radius:20px;padding:4px 12px;font-size:12.5px;font-weight:700;'
           'cursor:pointer;font-family:inherit;">↗ Weitersagen</button>\'+'
           '\'</div></div>\';'
           'var sh=document.getElementById("eb-hn-share");'
           'if(sh)sh.addEventListener("click",function(){'
           'if(!window.ebShare){return;}'
           'window.ebShare({title:"Hitzewelle: was jetzt wirklich hilft",'
           'text:head+" — was jetzt wirklich hilft (ohne Klimaanlage anfangen):",'
           'url:location.origin+"/guide/beste-tragbare-klimaanlage-hitzewelle.html",src:"heatnow",'
           'done:function(m){sh.textContent=m==="copy"?"✓ Link kopiert":"✓ Geteilt";}});'
           'if(window.gtag)gtag("event","heat_now",{click:"share",level:d.level});});'
           'if(window.gtag)gtag("event","heat_now",{level:d.level,region:d.region});'
           'h.querySelectorAll("[data-eb-h]").forEach(function(a){a.addEventListener("click",function(){'
           'if(window.gtag)gtag("event","heat_now",{click:a.getAttribute("data-eb-h"),level:d.level});});});'
           '}).catch(function(){});'
           # 冷触发(2026-08-20):同一反应带的冬季档。/api/heat 的 cold 字段由 worker
           # 计算(3 城 7 天最低温,0°C/-6°C 两档)。蓝色系,链去供暖成本对比与省电
           # Heizlüfter 指南——两页都带联盟卡,触发即接交易。埋点 cold_now(已入白名单)。
           'function renderCold(c){'
           'var frosty=c.level>=2;'
           'var when="";try{if(c.day){var dt=new Date(c.day+"T12:00:00");'
           'when=" am "+["So","Mo","Di","Mi","Do","Fr","Sa"][dt.getDay()]+".";}}catch(e){}'
           'var head=frosty?("🥶 Strenger Frost im Anmarsch: bis "+Math.round(c.temp)+" °C in "+c.region+when)'
           ':("❄️ Erste Frostnächte: bis "+Math.round(c.temp)+" °C in "+c.region+when);'
           'var sub=frosty?"Jetzt zählt jede Kilowattstunde — vergleiche, was dein Raum wirklich braucht."'
           ':"Die ruhige Zeit zum Vergleichen ist jetzt — nicht in der ersten kalten Nacht.";'
           'h.innerHTML=\'<div style="background:#eef4fb;border-bottom:1px solid #c9dcf0;">\'+'
           '\'<div style="max-width:1000px;margin:0 auto;padding:10px 20px;display:flex;gap:8px 14px;'
           'align-items:center;flex-wrap:wrap;font-size:13.5px;">\'+'
           '\'<strong style="color:#0a4d7a;">\'+head+\'</strong>\'+'
           '\'<span style="color:#41546a;">\'+sub+\'</span>\'+'
           '\'<a href="/guide/heizkosten-vergleich-rechner.html" data-eb-c="tool" style="color:#0f6ba8;font-weight:700;text-decoration:none;">Heizkosten vergleichen →</a>\'+'
           '\'<a href="/guide/heizluefter-stromsparend.html" data-eb-c="guide" '
           'style="color:#0f6ba8;font-weight:700;text-decoration:none;">Sparsame Heizlüfter →</a>\'+'
           '\'</div></div>\';'
           'if(window.gtag)gtag("event","cold_now",{level:c.level,region:c.region});'
           'h.querySelectorAll("[data-eb-c]").forEach(function(a){a.addEventListener("click",function(){'
           'if(window.gtag)gtag("event","cold_now",{click:a.getAttribute("data-eb-c"),level:c.level});});});'
           '}'
           '})();</script><!--/EB_HEATNOW-->\n')


# EN twin of the weather band (上量队列③ 2026-08-28): the AI-referral TOP
# landing pages are EN (tilt-and-turn is the single biggest chatgpt.com landing
# in D1), and the six-piece rule says a cited page needs a live number above the
# fold — the DE pages have had one since the band shipped, the EN pages never
# did. Same /api/heat, same heat_now/cold_now events; cold links point to the
# EN qm ladder that shipped the same day (electric-heater / dehumidifier).
HEATNOW_EN = ('<!--EB_HEATNOW--><div id="eb-heatnow"></div>\n<script>(function(){'
              'var h=document.getElementById("eb-heatnow");if(!h)return;'
              'fetch("/api/heat").then(function(r){return r.json();}).then(function(d){'
              'if(!d)return;'
              'if(!d.level||!d.temp){if(d.cold&&d.cold.level&&d.cold.temp!==null){renderCold(d.cold);}return;}'
              'var hot=d.level>=2;'
              'var when="";try{if(d.day){var dt=new Date(d.day+"T12:00:00");'
              'when=" on "+["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][dt.getDay()]+".";}}catch(e){}'
              'var head=hot?("🔥 Heatwave incoming: up to "+Math.round(d.temp)+" °C in "+d.region+when)'
              ':("🌡️ Getting hot: up to "+Math.round(d.temp)+" °C in "+d.region+when);'
              'var sub=hot?"Portable AC units typically sell out within days once it hits."'
              ':"The quiet window to compare units is now — not at 35 °C.";'
              'h.innerHTML=\'<div style="background:\'+(hot?"#fdece7":"#fff8ec")+\';border-bottom:1px solid \'+(hot?"#f3c4b4":"#f3ddc0")+\';">\'+'
              '\'<div style="max-width:1000px;margin:0 auto;padding:10px 20px;display:flex;gap:8px 14px;'
              'align-items:center;flex-wrap:wrap;font-size:13.5px;">\'+'
              '\'<strong style="color:\'+(hot?"#b23c17":"#8a6410")+\';">\'+head+\'</strong>\'+'
              '\'<span style="color:#5a5340;">\'+sub+\'</span>\'+'
              '\'<a href="/en/guide/how-many-btu-do-i-need.html" data-eb-h="tool" style="color:#0f6ba8;font-weight:700;text-decoration:none;">Which size do I need? →</a>\'+'
              '\'<a href="/en/guide/best-portable-air-conditioner-europe-heatwave.html" data-eb-h="guide" '
              'style="color:#0f6ba8;font-weight:700;text-decoration:none;">Current picks →</a>\'+'
              '\'<button type="button" id="eb-hn-share" style="background:none;border:1px solid \'+(hot?"#e0a690":"#e3c99a")+\';'
              'color:\'+(hot?"#b23c17":"#8a6410")+\';border-radius:20px;padding:4px 12px;font-size:12.5px;font-weight:700;'
              'cursor:pointer;font-family:inherit;">↗ Share</button>\'+'
              '\'</div></div>\';'
              'var sh=document.getElementById("eb-hn-share");'
              'if(sh)sh.addEventListener("click",function(){'
              'if(!window.ebShare){return;}'
              'window.ebShare({title:"Heatwave: what actually helps",'
              'text:head+" — what actually helps (start without an AC):",'
              'url:location.origin+"/en/guide/best-portable-air-conditioner-europe-heatwave.html",src:"heatnow-en",'
              'done:function(m){sh.textContent=m==="copy"?"✓ Link copied":"✓ Shared";}});'
              'if(window.gtag)gtag("event","heat_now",{click:"share",level:d.level});});'
              'if(window.gtag)gtag("event","heat_now",{level:d.level,region:d.region});'
              'h.querySelectorAll("[data-eb-h]").forEach(function(a){a.addEventListener("click",function(){'
              'if(window.gtag)gtag("event","heat_now",{click:a.getAttribute("data-eb-h"),level:d.level});});});'
              '}).catch(function(){});'
              'function renderCold(c){'
              'var frosty=c.level>=2;'
              'var when="";try{if(c.day){var dt=new Date(c.day+"T12:00:00");'
              'when=" on "+["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][dt.getDay()]+".";}}catch(e){}'
              'var head=frosty?("🥶 Hard frost incoming: down to "+Math.round(c.temp)+" °C in "+c.region+when)'
              ':("❄️ First frost nights: down to "+Math.round(c.temp)+" °C in "+c.region+when);'
              'var sub=frosty?"Every kilowatt-hour counts now — check what your room actually needs."'
              ':"The quiet time to compare is now — not in the first cold night.";'
              'h.innerHTML=\'<div style="background:#eef4fb;border-bottom:1px solid #c9dcf0;">\'+'
              '\'<div style="max-width:1000px;margin:0 auto;padding:10px 20px;display:flex;gap:8px 14px;'
              'align-items:center;flex-wrap:wrap;font-size:13.5px;">\'+'
              '\'<strong style="color:#0a4d7a;">\'+head+\'</strong>\'+'
              '\'<span style="color:#41546a;">\'+sub+\'</span>\'+'
              '\'<a href="/en/guide/electric-heater-20-sqm.html" data-eb-c="tool" style="color:#0f6ba8;font-weight:700;text-decoration:none;">What wattage for your room? →</a>\'+'
              '\'<a href="/en/guide/dehumidifier-20-sqm.html" data-eb-c="guide" style="color:#0f6ba8;font-weight:700;text-decoration:none;">Damp room this autumn? →</a>\'+'
              '\'</div></div>\';'
              'if(window.gtag)gtag("event","cold_now",{level:c.level,region:c.region});'
              'h.querySelectorAll("[data-eb-c]").forEach(function(a){a.addEventListener("click",function(){'
              'if(window.gtag)gtag("event","cold_now",{click:a.getAttribute("data-eb-c"),level:c.level});});});}'
              '})();</script><!--/EB_HEATNOW-->\n')


# Live exchange-price band for the storage family (上量队列③ 2026-08-28).
# The weather band is the wrong live number for a balcony-PV page — the number
# that IS the page's economics is the electricity price a self-generated kWh
# replaces. /api/strom already serves today's EPEX hourly prices edge-cached;
# this renders the day average + the current hour above the fold, labelled
# honestly as the exchange price without taxes and levies. Renders nothing if
# the feed is down (ok:false) — no fabricated numbers, no layout shift.
STROMNOW = ('<!--EB_STROMNOW--><div id="eb-stromnow"></div>\n<script>(function(){'
            'var h=document.getElementById("eb-stromnow");if(!h)return;'
            'fetch("/api/strom").then(function(r){return r.json();}).then(function(d){'
            'if(!d||!d.ok||!d.hours||d.hours.length<6)return;'
            'var sum=0;for(var i=0;i<d.hours.length;i++){sum+=d.hours[i].ct;}'
            'var avg=sum/d.hours.length;'
            'var nowH=new Date().getUTCHours(),cur=null;'
            'for(var k=0;k<d.hours.length;k++){if(d.hours[k].h===nowH){cur=d.hours[k].ct;break;}}'
            'function f(x){return (Math.round(x*10)/10).toLocaleString("de-DE",{minimumFractionDigits:1,maximumFractionDigits:1});}'
            'var head="⚡ Börsenstrom heute: Ø "+f(avg)+" ct/kWh"+(cur===null?"":" · jetzt "+f(cur)+" ct/kWh");'
            'h.innerHTML=\'<div style="background:#fff8ec;border-bottom:1px solid #f3ddc0;">\'+'
            '\'<div style="max-width:1000px;margin:0 auto;padding:10px 20px;display:flex;gap:8px 14px;'
            'align-items:center;flex-wrap:wrap;font-size:13.5px;">\'+'
            '\'<strong style="color:#8a6410;">\'+head+\'</strong>\'+'
            '\'<span style="color:#5a5340;">Börsenpreis ohne Steuern und Abgaben (EPEX). Jede selbst erzeugte Kilowattstunde ersetzt Netzstrom.</span>\'+'
            '\'<a href="/guide/balkonkraftwerk-lohnt-sich-rechner.html" data-eb-s="rechner" style="color:#0f6ba8;font-weight:700;text-decoration:none;">Lohnt sich deins? Rechner →</a>\'+'
            '\'<a href="/guide/balkonspeicher-foerderung.html" data-eb-s="foerder" style="color:#0f6ba8;font-weight:700;text-decoration:none;">Förderung im Bundesland →</a>\'+'
            '\'</div></div>\';'
            'if(window.gtag)gtag("event","strom_now",{avg:Math.round(avg*10)/10});'
            'h.querySelectorAll("[data-eb-s]").forEach(function(a){a.addEventListener("click",function(){'
            'if(window.gtag)gtag("event","strom_now",{click:a.getAttribute("data-eb-s")});});});'
            '}).catch(function(){});'
            '})();</script><!--/EB_STROMNOW-->\n')


# US-visitor marketplace switch on EN pages (上量队列⑥ 2026-08-28; owner added
# getecoback.com to the US Associates site list the same day, which un-gates
# this). 28-day D1: 24 of 95 affiliate clicks came from US+GB and went to
# amazon.de, where those visitors realistically do not order. This rewrites
# ONLY category-level search links, via an exact-term allowlist — a German
# category term searched on amazon.com returns empty/garbage, so each term maps
# to its plain English category (no spec-qualifier translation: litres→pints
# would be inventing a conversion). Named EU model links are deliberately NOT
# rewritten: searching "De'Longhi Pinguino" on amazon.com is a dead result, and
# those visitors are already served named US models by the EB_USMARKET bridge.
# GB stays unfixed (no .co.uk tag — owner side).
# Wrapped in DOMContentLoaded (2026-09-04): the block is injected above
# EB_TRACK, i.e. before the closing </body> but also before any block that a later
# injector appends below it — and querySelectorAll at parse time cannot see
# anchors the parser has not reached yet, so those links were never switched.
US_TAG = "ecoback0d-20"

# US marketplace switch. Measured defect (2026-09-06): 15 of 107 affiliate
# clicks in 28 days came from the United States and every one of them landed on
# amazon.de, where the visitor cannot buy — amazon.de prices in euro and ships
# within the EU. The switch already existed but carried a hand-written map of
# eleven German terms (dehumidifier and infrared-heater sizes only). It covered
# 22 of the 398 Amazon links in the English section, and not one of the terms US
# readers actually clicked: "De'Longhi Pinguino PAC EX105" (6 clicks), "Comfee
# MPPH-09CRN7" (4), Klarstein, Midea PortaSplit, Fensterabdichtung,
# Kondensatpumpe, Luftkühler. A fixed list of product names cannot keep up with
# 252 distinct search terms across the site, so classification moves to ordered
# keyword rules — specific accessory rules first, broad category rules last.
#
# The rules map to CATEGORIES, never to a substitute model. A reader who clicked
# a named European unit is sent to the US category, not to some other maker's box
# relabelled as their choice; naming US models is the job of the EB_USMARKET
# bridge above, where every pick is attributed to a named US outlet. Terms with
# no US counterpart — balcony solar plants, battery storage, cut-to-size acrylic
# — deliberately match nothing and keep their amazon.de link.

US_SWITCH_RULES = [
    ('fensterabdichtung|fensterdichtung|abdichtung|abdicht|schaumstoffband|fensterabluft|kippfenster|hohlkammerplatte|xps platte|seal kit', 'portable ac window seal kit'),
    ('abluftschlauch|isolierschlauch|abluft|schlauchadapter', 'portable ac exhaust hose'),
    ('kondensatpumpe', 'condensate removal pump'),
    ('kondensatschlauch|ablaufschlauch|mit schlauch|drain hose', 'dehumidifier drain hose'),
    ('reiniger|verdampfer|schimmelentferner|coil cleaner', 'air conditioner coil cleaner'),
    ('lamellenkamm|kühlrippen', 'air conditioner fin comb'),
    ('ersatzfilter|filtermatte|hepa filter', 'replacement air filter'),
    ('abdeckhaube', 'air conditioner cover'),
    ('antivibrationsmatte|vibrationsd', 'anti vibration pad'),
    ('kühlakku', 'cooler ice pack'),
    ('antikalk|entkalker|zitronens', 'citric acid descaler'),
    ('dachklimaanlage', 'rv rooftop air conditioner'),
    ('thermomatte', 'rv windshield cover'),
    ('granulat', 'moisture absorber'),
    ('hygrometer|hygrostat', 'indoor hygrometer'),
    ('thermometer', 'indoor outdoor thermometer'),
    ('luftbefeuchter|verdunster', 'cool mist humidifier'),
    ('luftreiniger|air purifier|ac2887', 'hepa air purifier'),
    ('fenstersauger', 'window vacuum'),
    ('dreame|bissel|saugwischer', 'wet dry vacuum'),
    ('tineco', 'tineco filter'),
    ('hitzeschutzfolie|sonnenschutzfolie|isolierfolie|reflektorfolie', 'window insulation film'),
    ('rollo|jalousie', 'blackout roller shade'),
    ('thermovorhang|verdunkelungsvorhang|hitzeschutz.*vorhang', 'thermal blackout curtain'),
    ('türdichtung|zugluftstopper', 'door draft stopper'),
    ('markise|sonnensegel|ampelschirm', 'patio shade sail'),
    ('sonnenschutz.*(scheibe|auto)|auto sonnenschutz', 'car sun shade'),
    ('sonnenschutz', 'sun shade'),
    ('kühlmatte hund|kühlweste hund', 'dog cooling mat'),
    ('trinkbrunnen katze', 'cat water fountain'),
    ('wäscheständer|standtrockner|waeschest', 'clothes drying rack'),
    ('heizdecke|heizkissen|wärmeunterbett|waermeunterbett', 'electric heated blanket'),
    ('handtuchheizk', 'electric towel warmer'),
    ('frostwächter', 'frost protection heater'),
    ('heizstrahler|infrarot heiz|infrarotheizung|schmidbauer|spiegelheizung|bildheizung', 'infrared panel heater'),
    ('heizlüfter|heizluefter|nth20', 'space heater'),
    ('thermostat', 'plug in thermostat'),
    ('energiekostenmess|strommessger|messfunktion|strommessung', 'electricity usage monitor'),
    ('steckdose|steckdosenleiste|zeitschaltuhr', 'smart plug'),
    ('wasserwaage', 'small spirit level'),
    ('magnetband', 'self adhesive magnetic tape'),
    ('klebeband', 'aluminum foil tape'),
    ('fenstergriff|abus f', 'window security lock'),
    ('adsorptionstrockner|luftentfeuchter|entfeuchter|meacodry|trotec ttk|pro breeze|dehumidifier', 'dehumidifier'),
    ('luftkühler|luftkuehler|air cooler', 'evaporative air cooler'),
    ('turmventilator|tower fan', 'tower fan'),
    ('standventilator', 'pedestal fan'),
    ('12v|campingventilator', '12v fan'),
    ('deckenventilator', 'ceiling fan'),
    ('ventilator|meacofan|rowenta', 'room fan'),
    ('klimaanlage|klimager|pinguino|chillflex|portasplit|breezein|quick connect|suntec|bosch cool|remko|clima butler|air conditioner|split', 'portable air conditioner'),
]

USSWITCH = ('<!--EB_USSWITCH--><script>(function(){var tz="";'
            'try{tz=Intl.DateTimeFormat().resolvedOptions().timeZone||"";}catch(e){tz="";}'
            'var NA=["US","CA","MX","PR","BR","AR","CL","CO","PE"];'
            # Rendered from US_SWITCH_RULES rather than duplicated here; the gate
            # reads the Python list, so a second copy would be a gate that lies.
            'var R=' + json.dumps([[a, b] for a, b in US_SWITCH_RULES],
                                  ensure_ascii=True, separators=(',', ':')) + ';'
            'var sw=function(a){if(!a||!a.href||a.href.indexOf("amazon.de/s?k=")<0)return;'
            'try{var u=new URL(a.href);var k=(u.searchParams.get("k")||"").toLowerCase();if(!k)return;'
            'for(var i=0;i<R.length;i++){if(R[i][0]&&R[i][0].test(k)){'
            'a.href="https://www.amazon.com/s?k="+encodeURIComponent(R[i][1])+"&tag=ecoback0d-20";'
            'a.setAttribute("data-eb-ussw","1");return;}}}catch(e){}};'
            # Everything that touches the page happens here, so it runs once and only
            # for a reader who can actually buy on amazon.com.
            'var run=function(){'
            'for(var i=0;i<R.length;i++){try{R[i][0]=new RegExp(R[i][0]);}catch(e){R[i][0]=null;}}'
            'var pass=function(){try{document.querySelectorAll(\'a[href*="amazon.de/s?k="]\').forEach(sw);}catch(e){}};'
            'if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",pass);else pass();'
            # Several components build their Amazon links after load (the sticky bar, the
            # sizer, the window calculator), so the sweep cannot see them. Catch those at
            # click time in the capture phase: this block sits above EB_TRACK, so its
            # listener runs first and the tracker records the rewritten URL.
            'document.addEventListener("click",function(e){'
            'try{var a=e.target&&e.target.closest&&e.target.closest(\'a[href*="amazon.de/s?k="]\');if(a)sw(a);}catch(err){}},true);};'
            # Cheapest path first. America/* decides alone, no network. Europe/* is 84 % of
            # this site's traffic and is decided the same way, so it never pays for a
            # request. Everything else — UTC, Etc/*, empty, an exotic zone — is the
            # ambiguous case that was failing silently (a US reader on a UTC-reporting
            # browser, 2026-09-08), and only those ask the edge which country they are in.
            'if(tz.indexOf("America/")===0){run();}'
            'else if(tz.indexOf("Europe/")===0){return;}'
            'else{try{fetch("/api/geo").then(function(r){return r.json();}).then(function(d){'
            'if(d&&d.c&&NA.indexOf(d.c)>=0)run();}).catch(function(){});}catch(e){}}'
            '})();</script><!--/EB_USSWITCH-->\n')


def inject_usswitch(html):
    """Idempotently add the US marketplace switch (DE + EN guide pages)."""
    if "<!--EB_USSWITCH-->" in html:
        return re.sub(r'<!--EB_USSWITCH-->.*?<!--/EB_USSWITCH-->\n?', lambda m: USSWITCH, html, flags=re.S)
    if "<!--EB_TRACK-->" in html:
        return html.replace("<!--EB_TRACK-->", USSWITCH + "<!--EB_TRACK-->", 1)
    return html


# Nothing on this site was ever forwardable. The one moment a Raumklima page is
# worth passing on is the moment it is genuinely hot — someone in a flat at 34 °C
# sending "what actually helps" into a family chat is the only kind of spread this
# site can honestly earn. So the share affordance lives exactly where that moment
# is detected (the live heat band) and on the one output a reader produces
# themselves (their room's BTU result), and nowhere else. First-party only: the
# native share sheet where the browser has one, clipboard otherwise. No share
# buttons that phone home to a network before anyone clicks.
SHARE = ('<!--EB_SHARE--><script>(function(){'
         'window.ebShare=function(o){'
         'var url=o.url||location.href,text=o.text||"",title=o.title||document.title;'
         'function ev(m){if(window.gtag)gtag("event","share",{method:m,src:o.src||""});}'
         'function done(m){ev(m);if(o.done)o.done(m);}'
         'if(navigator.share){navigator.share({title:title,text:text,url:url})'
         '.then(function(){done("native");}).catch(function(){});return;}'
         'var full=text?(text+" "+url):url;'
         'if(navigator.clipboard&&navigator.clipboard.writeText){'
         'navigator.clipboard.writeText(full).then(function(){done("copy");}).catch(function(){legacy();});'
         '}else{legacy();}'
         'function legacy(){try{var t=document.createElement("textarea");t.value=full;'
         't.style.position="fixed";t.style.opacity="0";document.body.appendChild(t);t.select();'
         'document.execCommand("copy");document.body.removeChild(t);done("copy");}catch(e){}}'
         '};})();</script><!--/EB_SHARE-->\n')


# North-American readers on the EN pages are the one segment the amazon.de
# contract genuinely fails. 28 days, /en/ pages: US 16 + CA 2 affiliate clicks
# into a store that will not serve them. The EU-English readers this section was
# actually designed for (IT/ES/NL/PT/AT/CH — amazon.de ships the EU and offers an
# English checkout) are served correctly and are deliberately left alone.
#
# The naive fix — repoint the EN links at amazon.com with the US tag — was
# rejected on evidence (2026-08-28): the units these pages recommend (Comfee
# MPPH-09CRN7, AEG ChillFlex Pro, De'Longhi Pinguino PAC EX105, Klarstein
# Kraftwerk, MeacoFan 1056) are European-market models, so a .com search for them
# returns nothing. Sending a US reader into an empty search is worse than today,
# and quietly swapping a named model card for a generic .com search would be a
# bait-and-switch. So this block says the true thing instead: these are the
# European models, they will not reach you, here is the right store for your
# market — and it links a category, not a specific model we have not verified is
# sold there.
#
# The signal is the browser's own timezone: device-local, nothing is sent
# anywhere to obtain it, and it needs no consent. Renders nothing for everyone
# else (zero CLS, zero noise), which is why it is safe on every EN guide page.

# 2026-08-28: the bridge shipped pointing at a bare category search because we had
# verified no US-market model. That gap is now closed for portable ACs — these
# three are the recurring picks across named US outlets (RTINGS, NBC Select,
# Forbes Vetted, TechGearLab), i.e. the same "compiled from public tests, not
# tested by us" standard the German cards run on. By-name search links, no ASINs,
# no prices, no invented test scores. Devices where we have verified nothing for
# the US market keep the honest category link — an empty ladder is better than a
# guessed one, and that is exactly why the EU models are not reused here.
US_MODELS = {
    # Autumn/winter families added 2026-08-28 (owner: deepen categories BY
    # COUNTRY). The US bridge launched with named models only for portable ACs —
    # the season that is ending. Dehumidifiers are a far larger US category
    # (basement culture) and the coming season's demand. Only cross-verified
    # picks are named: Midea Cube 50-Pint (Wirecutter + Consumer Reports #1),
    # Frigidaire FFAP5034W1 (RTINGS basement pick, built-in pump); heaters:
    # Vornado VH200 (Wirecutter small-room pick, passes safety tests),
    # Lasko FH500 (multi-outlet tested top tower). Two named per family plus the
    # category link — an empty slot beats a guessed one.
    "dehumidifier": [
        ("Midea Cube 50-Pint", "the overall pick",
         "The recurring #1 across US tests — pulls rooms from damp to dry faster than the field, and the cube folds for storage."),
        ("Frigidaire FFAP5034W1", "for basements",
         "RTINGS' basement pick: 50-pint with a built-in pump, so it drains uphill to a sink without bucket duty."),
    ],
    "space heater": [
        ("Vornado VH200", "small rooms",
         "The common small-room pick in US tests — circulates heat through the whole room instead of roasting one spot, and passes tip-over safety testing."),
        ("Lasko FH500", "tower + summer fan",
         "Tested top among towers; doubles as a tower fan in summer, which is rare honesty in this category."),
    ],
    "portable air conditioner": [
        ("Midea Duo MAP14HS1TBL", "the dual-hose one",
         "Dual-hose inverter — it takes its exhaust air from outside instead of from your room, which is the flaw single-hose units have. Repeatedly the overall pick in US tests."),
        ("Whynter NEX ARC-1230WN", "for large rooms",
         "Rated for noticeably larger rooms than the usual portable unit."),
        ("Black+Decker BPACT14WT", "the budget pick",
         "The common budget recommendation; US reviewers note it struggles in big or west-facing rooms."),
    ],
}


def us_term(slug):
    s = slug.lower()
    # German slug tokens included since 2026-08-28: US visitors read the German
    # section too (110 pv / 1 click in 28 days — the second-largest country x
    # section cell, monetised at ~0%), so the bridge now runs there as well and
    # must not map a Luftentfeuchter page to air conditioners.
    if any(k in s for k in ("dehumidif", "damp", "musty", "mold", "mould", "drying-clothes", "humid",
                            "luftentfeuchter", "waesche-trocknen", "schimmel", "taupunkt", "beschlagen", "keller")):
        return "dehumidifier", "dehumidifiers"
    if "fan" in s or "ventilator" in s:
        return "tower fan", "tower fans"
    if any(k in s for k in ("heater", "heating", "radiator", "heiz", "infrarot")):
        return "space heater", "space heaters"
    return "portable air conditioner", "portable air conditioners"


def usmarket_html(slug):
    term, plural = us_term(slug)
    url = f"https://www.amazon.com/s?k={term.replace(' ', '+')}&tag={US_TAG}"
    picks = US_MODELS.get(term) or []
    if picks:
        # The rows are embedded inside a single-quoted JS string in the injected
        # script; a bare apostrophe in any name/role/note terminates that string
        # and silently kills the whole block (found 2026-08-28: "RTINGS' basement
        # pick" blanked the bridge on every dehumidifier page, DE and EN).
        # Escape programmatically — copy must never have to know about quoting.
        j = lambda t: t.replace("\\", "\\\\").replace("'", "\\'")
        rows = "".join(
            '+\'<li style="margin:0 0 7px;"><a href="https://www.amazon.com/s?k='
            + urllib.parse.quote_plus(name) + '&tag=' + US_TAG + '" target="_blank" '
            'rel="sponsored noopener" style="font-weight:700;">' + j(name) + '</a> '
            '<span style="color:#4a5a67;">— <em>' + j(role) + '</em>. ' + j(note) + '</span></li>\''
            for name, role, note in picks)
        body = (
            '+\'<p style="margin:0 0 8px;font-size:13.5px;color:#4a5a67;line-height:1.5;">'
            'The units recommended below are the European models — Amazon.de prices and ships within '
            'the EU, so they are a poor fit for you. We have not tested any of these ourselves; '
            'these are the models US reviewers keep picking:</p>\''
            '+\'<ul style="margin:0 0 10px 18px;font-size:13.5px;line-height:1.5;">\''
            + rows + '+\'</ul>\''
            '+\'<a href="' + url + '" target="_blank" rel="sponsored noopener" '
            'style="font-size:13.5px;font-weight:700;">See all ' + plural + ' on Amazon.com →</a>\'')
    else:
        body = (
            '+\'<p style="margin:0 0 10px;font-size:13.5px;color:#4a5a67;line-height:1.5;">'
            'The units recommended below are the European models — they are what the public tests we '
            'summarise actually cover, and Amazon.de prices and ships within the EU, so they are a poor '
            'fit for you. We have not tested the US market, so we point you at the category rather than '
            'name a model we cannot vouch for.</p>\''
            '+\'<a href="' + url + '" target="_blank" rel="sponsored noopener" '
            'style="display:inline-block;background:#f59e0b;color:#1a2733;font-weight:800;padding:10px 16px;'
            'border-radius:8px;text-decoration:none;font-size:14px;">Browse ' + plural + ' on Amazon.com →</a>\'')
    return (
        '<!--EB_USMARKET--><div id="eb-usmarket"></div>'
        '<script>(function(){'
        'var el=document.getElementById("eb-usmarket");if(!el)return;'
        'var tz="";try{tz=Intl.DateTimeFormat().resolvedOptions().timeZone||"";}catch(e){return;}'
        'if(tz.indexOf("America/")!==0)return;'
        'el.innerHTML=\'<div style="max-width:1000px;margin:10px auto 0;padding:0 20px;">\''
        '+\'<div style="background:#fff8ed;border:1px solid #f3ddc0;border-radius:12px;padding:14px 16px;">\''
        '+\'<div style="font-size:11px;font-weight:800;color:#7a6f4e;letter-spacing:.3px;margin-bottom:6px;">'
        'Ad · affiliate link — same price for you</div>\''
        '+\'<strong style="display:block;font-size:15px;margin-bottom:4px;">Looks like you are in North America</strong>\''
        + body +
        '+\'</div></div>\';'
        '})();</script><!--/EB_USMARKET-->\n')


def inject_usmarket(html, slug):
    """Idempotently add the North-America market notice. EN guide pages only."""
    blk = usmarket_html(slug)
    if "<!--EB_USMARKET-->" in html:
        return re.sub(r'<!--EB_USMARKET-->.*?<!--/EB_USMARKET-->\n?', lambda m: blk, html, flags=re.S)
    if "<!--EB_MODELS-->" in html:
        return html.replace("<!--EB_MODELS-->", blk + "<!--EB_MODELS-->", 1)
    if "<!--/EB_TRUST-->" in html:
        return html.replace("<!--/EB_TRUST-->", "<!--/EB_TRUST-->\n" + blk, 1)
    return html


def inject_share(html):
    """Idempotently expose window.ebShare. Renders nothing on its own."""
    if "<!--EB_SHARE-->" in html:
        return re.sub(r'<!--EB_SHARE-->.*?<!--/EB_SHARE-->\n?', lambda m: SHARE, html, flags=re.S)
    if "<!--/EB_NAV-->" in html:
        return html.replace("<!--/EB_NAV-->", "<!--/EB_NAV-->\n" + SHARE, 1)
    return html


# Autumn live number (2026-08-31). The site's one "a chat answer cannot hold
# this" hook is EB_HEATNOW, which renders only from 28 °C and sits on 11 of the
# 12 top-earning pages — so it goes dark for eight months exactly as the
# humidity season opens, and luftentfeuchter-40-qm (the best autumn converter)
# never had a live number at all.
#
# What makes this citable rather than decorative: the verdict FLIPS on today's
# dew point, and it flips against the COLD SURFACE, not the room air. An
# assistant can state the rule; only this page can state today's number. And on
# level 3 the dehumidifier is not an upsell — airing genuinely cannot remove
# water any more, which is the honest reason the link is there.
#
# No Amazon link in this block on purpose: it routes to the site's own guide.
# A weather-triggered band that pointed straight at a product would read as
# engineered, and the physics is the asset here.
# Mould and cellar pages the dew-point band belongs on even though device_of()
# does not call them dehumidifier pages — the reader's question there IS the
# ventilation question. keller-lueften-sommer is the classic case this site
# already documents: airing a cellar on a mild damp day makes it wetter.
FEUCHTE_EXTRA = {
    "schimmel-im-keller-entfernen",
    "keller-lueften-sommer",
    "mobile-klimaanlage-stinkt-schimmel",
    "richtig-lueften-bei-hitze",
    "waesche-trocknen-wohnung",
}


FEUCHTENOW = ('<!--EB_FEUCHTENOW--><div id="eb-feuchtenow"></div>\n<script>(function(){'
              'var h=document.getElementById("eb-feuchtenow");if(!h)return;'
              'fetch("/api/feuchte").then(function(r){return r.json();}).then(function(d){'
              'if(!d||!d.ok||d.dew===null||d.dew===undefined)return;'
              'var L=d.level,dew=d.dew;'
              'var bg=L===3?"#eaf3fb":L===2?"#fff8ec":"#eefaf1";'
              'var bd=L===3?"#c3dcef":L===2?"#f3ddc0":"#cbe9d5";'
              'var fg=L===3?"#0f5c8a":L===2?"#8a6410":"#1c6b41";'
              'var head=L===3?("💧 Lüften trocknet gerade nicht: Taupunkt draußen "+dew+" °C")'
              ':L===2?("🌬️ Wohnraum ja, Keller nein: Taupunkt draußen "+dew+" °C")'
              ':("🌬️ Gutes Lüftungsfenster: Taupunkt draußen "+dew+" °C");'
              'var sub=L===3?("Das liegt über jeder kalten Wand (~"+d.wall_ref+" °C) — feuchte Luft von draußen '
              'schlägt sich dort nieder. Wasser rausholen kann jetzt nur ein Entfeuchter.")'
              ':L===2?("Für eine kalte Kellerwand (~"+d.cellar_ref+" °C) ist das zu feucht — im geheizten Zimmer '
              '(kalte Ecke ~"+d.wall_ref+" °C) trocknet Lüften noch.")'
              ':("Trockener als jede kalte Wand im Haus — jetzt bringt Querlüften am meisten.");'
              'var link=L===3?\'<a href="/guide/luftentfeuchter-40-qm.html" data-eb-f="guide" '
              'style="color:#0f6ba8;font-weight:700;text-decoration:none;">Entfeuchter nach Raumgröße →</a>\':'
              '\'<a href="/guide/luftentfeuchter-40-qm.html" data-eb-f="guide" '
              'style="color:#0f6ba8;font-weight:700;text-decoration:none;">Entfeuchter nach Raumgröße →</a>\';'
              'h.innerHTML=\'<div style="background:\'+bg+\';border-bottom:1px solid \'+bd+\';">\'+'
              '\'<div style="max-width:1000px;margin:0 auto;padding:10px 20px;display:flex;gap:8px 14px;'
              'align-items:center;flex-wrap:wrap;font-size:13.5px;">\'+'
              '\'<strong style="color:\'+fg+\';">\'+head+\'</strong>\'+'
              '\'<span style="color:#4a5a67;">\'+sub+\'</span>\'+link+'
              '\'<a href="/guide/keller-lueften-sommer.html#taupunkt" data-eb-f="tool" '
              'style="color:#0f6ba8;font-weight:700;text-decoration:none;">Eigene Wand messen →</a>\'+'
              '\'<span style="color:#7a8b98;font-size:12px;flex-basis:100%;">Quelle: open-meteo, stündlich, '
              'ungünstigster von drei Orten (\'+d.region+\', \'+Math.round(d.temp)+\' °C / \'+Math.round(d.rh)+\' % rF). '
              'Annahme: kalte Zimmerecke ~\'+d.wall_ref+\' °C, Kellerwand ~\'+d.cellar_ref+\' °C — '
              'deine eigene Wand misst du selbst.</span>\'+'
              '\'</div></div>\';'
              'if(window.gtag)gtag("event","feuchte_now",{level:L,dew:dew,region:d.region});'
              '}).catch(function(){});'
              '})();</script><!--/EB_FEUCHTENOW-->\n')


def strip_feuchtenow(html):
    """Remove the band again. An injector that can only add leaves dead blocks
    on pages that later stop qualifying — the failure mode this repo has already
    recorded three times (nav, sticky, radar)."""
    return re.sub(r'<!--EB_FEUCHTENOW-->.*?<!--/EB_FEUCHTENOW-->\n?', '', html, flags=re.S)


def inject_feuchtenow(html):
    """Idempotently add the autumn dew-point band on the humidity/mould family."""
    if "<!--EB_FEUCHTENOW-->" in html:
        return re.sub(r'<!--EB_FEUCHTENOW-->.*?<!--/EB_FEUCHTENOW-->\n?',
                      lambda m: FEUCHTENOW, html, flags=re.S)
    if "<!--/EB_PROFILE-->" in html:
        return html.replace("<!--/EB_PROFILE-->", "<!--/EB_PROFILE-->\n" + FEUCHTENOW, 1)
    return html


def strip_heatnow(html):
    """Remove the live heat band. Needed because inject_heatnow only ever
    inserts or replaces: when a page changes device family the old band stays
    for ever. schimmel-im-keller-entfernen was live with a heatwave banner on a
    page about mould in an unheated cellar, and reclassifying it to the humidity
    family on 2026-09-09 did not clean it — the band had to be removed too. It
    also blocks EB_FEUCHTENOW, which is skipped whenever EB_HEATNOW is present,
    so the page got neither the right band nor the wrong one removed."""
    return re.sub(r'<!--EB_HEATNOW-->.*?<!--/EB_HEATNOW-->\n?', '', html, flags=re.S)


def inject_heatnow(html, slug=None):
    """Idempotently add the live heat band. Cooling-relevant pages and the homepage."""
    if "<!--EB_HEATNOW-->" in html:
        return re.sub(r'<!--EB_HEATNOW-->.*?<!--/EB_HEATNOW-->\n?', lambda m: HEATNOW, html, flags=re.S)
    if "<!--/EB_PROFILE-->" in html:
        return html.replace("<!--/EB_PROFILE-->", "<!--/EB_PROFILE-->\n" + HEATNOW, 1)
    return html


def inject_heatnow_en(html):
    """EN twin of inject_heatnow — same marker, EN copy and EN link targets."""
    if "<!--EB_HEATNOW-->" in html:
        return re.sub(r'<!--EB_HEATNOW-->.*?<!--/EB_HEATNOW-->\n?', lambda m: HEATNOW_EN, html, flags=re.S)
    if "<!--/EB_PROFILE-->" in html:
        return html.replace("<!--/EB_PROFILE-->", "<!--/EB_PROFILE-->\n" + HEATNOW_EN, 1)
    return html


def inject_stromnow(html):
    """Idempotently add the live exchange-price band on storage-family pages."""
    if "<!--EB_STROMNOW-->" in html:
        return re.sub(r'<!--EB_STROMNOW-->.*?<!--/EB_STROMNOW-->\n?', lambda m: STROMNOW, html, flags=re.S)
    if "<!--/EB_PROFILE-->" in html:
        return html.replace("<!--/EB_PROFILE-->", "<!--/EB_PROFILE-->\n" + STROMNOW, 1)
    return html


def inject_profile(html):
    """Idempotently add the saved-room bar. Renders nothing until a room is saved."""
    if "<!--EB_PROFILE-->" in html:
        return re.sub(r'<!--EB_PROFILE-->.*?<!--/EB_PROFILE-->\n?', lambda m: PROFILE, html, flags=re.S)
    if "<!--/EB_NAV-->" in html:
        return html.replace("<!--/EB_NAV-->", "<!--/EB_NAV-->\n" + PROFILE, 1)
    return html


# Balcony storage is the highest-basket category on this site and, since
# Intersolar 2026, the one growing on installation-free hardware — the same
# reason portable ACs work for this audience. It had ten guide pages and a
# single tile on the homepage, no products at all. This lifts it to a pillar
# next to cooling without displacing the seasonal hero: it sits below the
# cooling grid, so summer traffic still lands on what converts today.
def home_storage_block():
    """2026-08-26 owner decision (「eco站点去掉能源板块」): the homepage energy
    pillar is DEMOTED — replaced by the autumn Feuchte/Schimmel/Heizen block,
    the section the category matrix (docs/amazon-category-strategy-2026-08.md)
    ranks first on demand x fee x returns. Energy pages stay live (quarterly
    maintenance, one demoted link line below); every claim in the cards is
    established on-site. Function name kept so call sites stay untouched."""
    drip = ('<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'
            '<rect x="18" y="12" width="28" height="40" rx="4" fill="#fff" stroke="#0f6ba8" stroke-width="2.5"/>'
            '<path d="M23 19h12" stroke="#9cc3dd" stroke-width="2" stroke-linecap="round"/>'
            '<path class="eb-drip" d="M32 30c-4 5-6 8-6 11a6 6 0 0012 0c0-3-2-6-6-11z" fill="#bfe3f5" stroke="#0f6ba8" stroke-width="2"/></svg>')
    heat = ('<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'
            '<rect x="14" y="16" width="36" height="32" rx="4" fill="#fff" stroke="#c2410c" stroke-width="2.5"/>'
            '<path d="M22 22v20M32 22v20M42 22v20" stroke="#fdba74" stroke-width="3" stroke-linecap="round"/>'
            '<path d="M20 54h24" stroke="#c2410c" stroke-width="2.5" stroke-linecap="round"/></svg>')
    hyg = ('<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'
           '<rect x="20" y="10" width="24" height="44" rx="6" fill="#fff" stroke="#0f6ba8" stroke-width="2.5"/>'
           '<circle cx="32" cy="34" r="8" fill="none" stroke="#2ea86b" stroke-width="2.5"/>'
           '<path d="M32 30v8M28 34h8" stroke="#2ea86b" stroke-width="2" stroke-linecap="round"/></svg>')
    def card(badge, bg, svg, title, desc, pros, cons, term):
        return ('<div class="eb-shop-card"><div class="th" style="background:' + bg + ';"><span class="rl">' + badge + '</span>' + svg + '</div>'
                '<div class="bd"><h3>' + title + '</h3><p class="ds">' + desc + '</p>'
                '<p class="ds" style="margin:0 0 9px;"><span style="color:#177245;">✓ ' + pros + '</span><br>'
                '<span style="color:#9a3412;">✕ ' + cons + '</span></p>'
                '<div class="pr">Preis vor Ort prüfen</div>'
                '<a class="go" href="' + amazon_url(term, title) + '" target="_blank" rel="sponsored noopener">Preis auf Amazon prüfen →</a></div></div>')
    cards = (
        card('Der Keller-Favorit', 'linear-gradient(135deg,#eaf6ff,#cfe6f7)', drip, 'Comfee MDDF-20DEN7',
             'In mehreren Fachvergleichen der Keller-Favorit — 20 L/Tag, Hygrostat, Dauerablauf-Anschluss.',
             'Hygrostat &amp; Schlauchanschluss an Bord', 'Kompressor verliert unter ca. 10–15 °C Leistung',
             'Comfee+MDDF-20DEN7+Luftentfeuchter')
        + card('Meistgesucht diese Woche', 'linear-gradient(135deg,#eaf6ff,#cfe6f7)', drip, 'Pro Breeze Luftentfeuchter 20 L',
               'Das aktuell meistgesuchte Einzelmodell in unserer täglichen Google-Trends-Abfrage. Nachfrage-Signal, kein Testurteil.',
               'Starke reale Nachfrage', 'Nicht selbst getestet',
               'pro+breeze+luftentfeuchter+20l')
        + card('Heizen ohne Dauerlauf', 'linear-gradient(135deg,#fff7ed,#fed7aa)', heat, 'Infrarotheizung mit Thermostat',
               'Strahlungswärme für Bad, Büro oder Garage — mit Thermostat schaltet sie nur, wenn der Raum es braucht.',
               'Thermostat = der eigentliche Spar-Hebel', 'Watt-Bedarf vorher rechnen (Rechner oben)',
               'infrarotheizung+mit+thermostat')
        + card('Vor jedem Kauf', 'linear-gradient(135deg,#eefaf3,#cdeede)', hyg, 'Hygrometer',
               'Ob Keller, Bad oder Schlafzimmer zu feucht sind, entscheidet der Messwert — nicht die Nase.',
               'Wenige Euro, beantwortet die erste Frage', 'Ersetzt keine Ursachen-Behebung',
               'hygrometer+innen'))
    tools = [
        ('💧', 'Taupunkt-Check: Lüften — hilft es gerade oder schadet es?', '/guide/keller-lueften-sommer.html'),
        ('🔥', 'Heizkosten-Vergleich: Was kostet welche Heizart?', '/guide/heizkosten-vergleich-rechner.html'),
        ('📐', 'Infrarot-Watt-Rechner: Wie viel Watt braucht dein Raum?', '/guide/infrarotheizung-watt-rechner.html'),
    ]
    toolrow = "".join(
        '<a href="' + href + '" data-eb-hb="tool" style="display:inline-flex;align-items:center;gap:7px;'
        'background:#fff;border:1px solid #f3ddc0;border-radius:10px;padding:9px 14px;margin:0 8px 8px 0;'
        'text-decoration:none;color:#1a2733;font-weight:700;font-size:13.5px;">' + icon + ' ' + label + '</a>'
        for icon, label, href in tools)
    return (
        '<!--EB_HERBST--><section id="eb-herbst" style="background:#fbf7f0;border-top:1px solid #f3ddc0;border-bottom:1px solid #f3ddc0;">'
        '<div style="max-width:1000px;margin:0 auto;padding:30px 20px;">'
        '<h2 style="margin:0 0 6px;">Feuchte, Schimmel &amp; Heizen — der Herbst-Schwerpunkt</h2>'
        '<p style="margin:0 0 14px;max-width:74ch;">Wenn die Kühl-Saison endet, beginnen die beiden Themen, die deutsche '
        'Wohnungen im Herbst wirklich beschäftigen: Kondenswasser an kühlen Wänden (und der Schimmel, der daraus wird) — '
        'und die Frage, womit sich einzelne Räume effizient heizen lassen. Erst messen und rechnen, dann kaufen.</p>'
        '<div style="margin-bottom:16px;">' + toolrow + '</div>'
        '<div class="eb-shop-h" style="margin-bottom:2px;">Was jetzt wirklich hilft</div>'
        '<p class="eb-shop-sub" style="margin-bottom:4px;"><span style="font-size:11px;color:#8a99a6;">'
        + AD_LABEL[False] + '</span></p>'
        '<p class="eb-shop-sub">„Meistgesucht“ ist ein Nachfrage-Signal aus unserer täglichen Google-Trends-Abfrage, '
        'kein Testurteil. Nicht selbst getestet, Preise vor Ort prüfen. Symbolbilder, Affiliate-Links.</p>'
        '<div class="eb-shop-grid">' + cards + '</div>'
        '<p style="margin:14px 0 0;font-size:13.5px;">📖 Mehr dazu: '
        '<a href="/guide/schimmel-im-keller-entfernen.html">Schimmel im Keller entfernen</a> · '
        '<a href="/guide/luftentfeuchter-keller.html">Luftentfeuchter für den Keller</a> · '
        '<a href="/guide/heizluefter-stromsparend.html">Heizlüfter stromsparend</a> · '
        '<a href="/kategorie/luftqualitaet.html">Alles zu Luftqualität</a></p>'
        '<p style="margin:10px 0 0;font-size:13px;color:#5b6b78;">🔋 Balkonspeicher &amp; Solar (Sommerhalbjahr-Schwerpunkt): '
        '<a href="/kategorie/energie-sparen.html">alle Ratgeber &amp; Modelle →</a></p>'
        '</div></section>'
        '<script>(function(){var s=document.getElementById("eb-herbst");if(!s)return;'
        's.querySelectorAll(\'a[href*="amazon."]\').forEach(function(a){a.addEventListener("click",function(){'
        'if(window.gtag)gtag("event","affiliate_click",{source:"home-herbst",link_url:a.href});});});'
        's.querySelectorAll("[data-eb-hb]").forEach(function(a){a.addEventListener("click",function(){'
        'if(window.gtag)gtag("event","herbst_home",{target:a.getAttribute("href")});});});})();</script>'
        '<!--/EB_HERBST-->')


def inject_home_storage(html):
    """Idempotently place the autumn Herbst pillar above the persona section.
    Legacy EB_HOMESTORAGE blocks (pre-2026-08-26 energy pillar) are removed."""
    blk = home_storage_block()
    html = re.sub(r'<!--EB_HOMESTORAGE-->.*?<!--/EB_HOMESTORAGE-->\n?', '', html, flags=re.S)
    if "<!--EB_HERBST-->" in html:
        return re.sub(r'<!--EB_HERBST-->.*?<!--/EB_HERBST-->',
                      lambda m: blk, html, flags=re.S)
    anchor = "Findest du dich wieder?"
    i = html.find(anchor)
    if i < 0:
        return html
    j = html.rfind("<section", 0, i)
    if j < 0:
        return html
    return html[:j] + blk + "\n" + html[j:]


def inject_home_tool(html):
    """Idempotently put a working calculator on the homepage, under the season bar."""
    if "<!--EB_HOMETOOL-->" in html:
        return re.sub(r'<!--EB_HOMETOOL-->.*?<!--/EB_HOMETOOL-->\n?',
                      lambda m: HOME_TOOL, html, flags=re.S)
    if "<!--/EB_SEASON-->" in html:
        return html.replace("<!--/EB_SEASON-->", "<!--/EB_SEASON-->\n" + HOME_TOOL, 1)
    return html


# --- Homepage device-family strip (2026-08-29, owner「首页图片和视频很少,吸引力
# 不够」). Four compact animated SVG tiles in the site's established illustration
# language (the eb-spin/eb-wave/eb-drip keyframes already ship in eb-chrome CSS),
# each routing to that family's money hub. Honest visuals — device physics, not
# stock photos.
DEVICE_TILES = [
    ("Kühlen", "Mobile Klimaanlagen — echte Kälte mit Abluftschlauch",
     "/guide/beste-tragbare-klimaanlage-hitzewelle.html",
     '<svg viewBox="0 0 120 90" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Mobile Klimaanlage">'
     '<rect x="18" y="22" width="44" height="56" rx="6" fill="#fff" stroke="#0f6ba8" stroke-width="2.5"/>'
     '<rect x="25" y="30" width="30" height="10" rx="2" fill="#dce9f2"/>'
     '<path d="M25 50h30M25 58h30M25 66h30" stroke="#9cc3dd" stroke-width="2.5"/>'
     '<path d="M62 34 C82 34 84 26 100 26" stroke="#cd7f3a" stroke-width="5" fill="none" stroke-linecap="round"/>'
     '<g fill="#2ea6c9"><path class="eb-drip" d="M12 46 l-7 -3 l7 -3 z"/><path class="eb-drip" d="M12 62 l-7 -3 l7 -3 z"/></g>'
     '</svg>'),
    ("Entfeuchten", "Luftentfeuchter — unter 60 % rF hat Schimmel keine Basis",
     "/guide/luftentfeuchter-ratgeber.html",
     '<svg viewBox="0 0 120 90" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Luftentfeuchter">'
     '<rect x="38" y="20" width="44" height="58" rx="8" fill="#fff" stroke="#0f6ba8" stroke-width="2.5"/>'
     '<circle cx="60" cy="42" r="12" fill="#eaf6ff" stroke="#0f6ba8" stroke-width="2"/>'
     '<rect x="46" y="62" width="28" height="10" rx="2" fill="#dcedf7" stroke="#9cc3dd" stroke-width="1.5"/>'
     '<g fill="#2ea6c9"><path class="eb-drip" d="M60 36 c3 4 5 6 5 9 a5 5 0 1 1 -10 0 c0 -3 2 -5 5 -9 z"/></g>'
     '<g fill="#bfe3f5"><circle class="eb-wave" cx="24" cy="34" r="4"/><circle class="eb-wave" cx="18" cy="52" r="3"/><circle class="eb-wave" cx="28" cy="66" r="3"/></g>'
     '</svg>'),
    ("Heizen", "Infrarot-Panels — Strahlungswärme ohne Installation",
     "/kategorie/heizen.html",
     '<svg viewBox="0 0 120 90" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Infrarotheizung">'
     '<rect x="22" y="24" width="76" height="42" rx="6" fill="#fff" stroke="#0f6ba8" stroke-width="2.5"/>'
     '<rect x="28" y="30" width="64" height="30" rx="3" fill="#fdf3ea" stroke="#f3ddc0" stroke-width="1.5"/>'
     '<g stroke="#e08c05" stroke-width="2.5" fill="none" stroke-linecap="round">'
     '<path class="eb-wave" d="M38 78 q3 -5 0 -10"/><path class="eb-wave" d="M60 78 q3 -5 0 -10"/><path class="eb-wave" d="M82 78 q3 -5 0 -10"/></g>'
     '</svg>'),
    ("Luft bewegen", "Ventilatoren — der ehrliche Personen-Kühler",
     "/guide/ventilator-kaufen-ratgeber.html",
     '<svg viewBox="0 0 120 90" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Ventilator">'
     '<circle cx="60" cy="42" r="26" fill="#fff" stroke="#0f6ba8" stroke-width="2.5"/>'
     '<g class="eb-spin"><path d="M60 42 L60 20 A22 22 0 0 1 74 32 z" fill="#9cc3dd"/>'
     '<path d="M60 42 L79 52 A22 22 0 0 1 52 62 z" fill="#9cc3dd"/>'
     '<path d="M60 42 L41 52 A22 22 0 0 1 46 26 z" fill="#9cc3dd"/><circle cx="60" cy="42" r="5" fill="#0f6ba8"/></g>'
     '<rect x="54" y="68" width="12" height="8" fill="#dce9f2" stroke="#9cc3dd" stroke-width="1.5"/>'
     '</svg>'),
]


def home_tiles_block():
    tiles = "".join(
        f'<a href="{href}" style="flex:1 1 200px;min-width:170px;background:#fff;border:1px solid #e4ebf0;'
        'border-radius:14px;padding:16px 14px;text-decoration:none;text-align:center;'
        'transition:box-shadow .15s,transform .15s;" '
        'onmouseover="this.style.boxShadow=\'0 10px 24px rgba(15,107,168,.13)\';this.style.transform=\'translateY(-3px)\';" '
        'onmouseout="this.style.boxShadow=\'none\';this.style.transform=\'none\';">'
        f'<span style="display:block;max-width:120px;margin:0 auto 8px;">{svg}</span>'
        f'<strong style="display:block;color:#0a4d7a;font-size:15.5px;margin-bottom:3px;">{name}</strong>'
        f'<span style="display:block;color:#5b6b78;font-size:12.5px;line-height:1.45;">{desc}</span></a>'
        for name, desc, href, svg in DEVICE_TILES)
    return ('<!--EB_DEVICE_TILES--><section style="padding:38px 0 6px;background:#f7fafc;">'
            '<div style="max-width:1000px;margin:0 auto;padding:0 20px;">'
            '<h2 style="font-size:21px;margin:0 0 4px;">Welches Gerät wofür?</h2>'
            '<p style="margin:0 0 14px;color:#5b6b78;font-size:13.5px;">Vier Gerätefamilien, vier ehrliche '
            'Einsatzzwecke — so funktioniert das jeweils, und dahinter steht der passende Ratgeber.</p>'
            f'<div style="display:flex;gap:14px;flex-wrap:wrap;">{tiles}</div>'
            '</div></section><!--/EB_DEVICE_TILES-->')


def inject_home_tiles(html):
    """Idempotently put the illustrated device-family strip on the homepage,
    directly under the homepage tool."""
    blk = home_tiles_block()
    if "<!--EB_DEVICE_TILES-->" in html:
        return re.sub(r'<!--EB_DEVICE_TILES-->.*?<!--/EB_DEVICE_TILES-->\n?',
                      lambda m: blk, html, flags=re.S)
    if "<!--/EB_HOMETOOL-->" in html:
        return html.replace("<!--/EB_HOMETOOL-->", "<!--/EB_HOMETOOL-->\n" + blk, 1)
    return html


# The window seal is the biggest cluster on this site and the one thing every
# portable-AC owner has to buy, yet not one page here ever said how long a seal
# has to be. The market says the same: a German manufacturer exists whose entire
# business is made-to-measure seals, and the cheap ones fail on exactly two
# things — wrong length and adhesive that lets go in the heat. This answers the
# question before the purchase, which is the only part of the transaction this
# site can actually control.
SEALFIT_DE = ("Passt die Fensterabdichtung an dein Fenster?",
              "Miss den <strong>Flügel</strong> (den beweglichen Teil), nicht den Rahmen — das ist der häufigste Fehler.",
              "Flügelbreite (cm)", "Flügelhöhe (cm)", "Fenstertyp",
              [("kipp", "Kippfenster (oben gekippt)"), ("dreh", "Drehkippfenster (ganz offen)"),
               ("dach", "Dachfenster / Velux")],
              "Länge berechnen")
SEALFIT_EN = ("Will a window seal fit your window?",
              "Measure the <strong>sash</strong> (the part that moves), not the frame — that is the mistake people make.",
              "Sash width (cm)", "Sash height (cm)", "Window type",
              [("kipp", "Tilt window (tilted at the top)"), ("dreh", "Tilt-and-turn (fully open)"),
               ("dach", "Roof window / skylight")],
              "Calculate length")


def sealfit_block(en=False):
    t = SEALFIT_EN if en else SEALFIT_DE
    opts = "".join(f'<option value="{v}">{lbl}</option>' for v, lbl in t[5])
    return ('<!--EB_SEALFIT--><section style="max-width:1000px;margin:18px auto 0;padding:0 20px;">'
            '<div style="background:#fff;border:2px solid #0f6ba8;border-radius:14px;padding:18px 20px;">'
            f'<strong style="font-size:17px;display:block;margin-bottom:3px;">{t[0]}</strong>'
            # The result panel renders an Amazon link, so the label sits on the
            # box itself (check_adlabel.py inspects this block since 2026-09-04).
            f'<p style="margin:0 0 6px;font-size:11px;color:#8a99a6;">{AD_LABEL[en]}</p>'
            f'<p style="margin:0 0 12px;color:#5b6b78;font-size:13.5px;">{t[1]}</p>'
            '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;">'
            f'<div style="flex:1 1 130px;"><label for="eb-sf-w" style="display:block;font-weight:700;font-size:12.5px;margin-bottom:4px;">{t[2]}</label>'
            '<input id="eb-sf-w" type="number" value="60" min="20" max="300" inputmode="numeric" style="width:100%;padding:9px 11px;border:1px solid #cfd8e0;border-radius:8px;font-size:16px;background:#fff;color:#1a2733;"></div>'
            f'<div style="flex:1 1 130px;"><label for="eb-sf-h" style="display:block;font-weight:700;font-size:12.5px;margin-bottom:4px;">{t[3]}</label>'
            '<input id="eb-sf-h" type="number" value="140" min="20" max="300" inputmode="numeric" style="width:100%;padding:9px 11px;border:1px solid #cfd8e0;border-radius:8px;font-size:16px;background:#fff;color:#1a2733;"></div>'
            f'<div style="flex:1 1 190px;"><label for="eb-sf-t" style="display:block;font-weight:700;font-size:12.5px;margin-bottom:4px;">{t[4]}</label>'
            f'<select id="eb-sf-t" style="width:100%;padding:9px 11px;border:1px solid #cfd8e0;border-radius:8px;font-size:16px;background:#fff;color:#1a2733;font-family:inherit;">{opts}</select></div>'
            f'<div><button type="button" id="eb-sf-go" style="background:#0f6ba8;color:#fff;border:none;padding:11px 20px;border-radius:8px;font-weight:800;font-size:15px;cursor:pointer;">{t[6] if len(t)>6 else t[-1]}</button></div>'
            '</div><div id="eb-sf-res" style="display:none;margin-top:14px;background:#eaf6ff;border:1px solid #cfe6fa;border-radius:10px;padding:15px 17px;"></div>'
            '</div></section>\n<script>(function(){'
            'var w=document.getElementById("eb-sf-w"),hh=document.getElementById("eb-sf-h"),'
            'ty=document.getElementById("eb-sf-t"),b=document.getElementById("eb-sf-go"),r=document.getElementById("eb-sf-res");'
            'if(!b||!r)return;var EN=' + ("true" if en else "false") + ';'
            'b.addEventListener("click",function(){'
            'var W=Math.max(20,Math.min(300,parseFloat(w.value)||60));'
            'var H=Math.max(20,Math.min(300,parseFloat(hh.value)||140));'
            # A seal is fixed around the whole sash opening, so the length needed
            # is that perimeter. Sizes are sold in fixed lengths, so round up.
            'var need=2*(W+H)/100;'
            'var sizes=[2.0,2.8,3.0,4.0,5.0];var fit=null;'
            'for(var i=0;i<sizes.length;i++){if(sizes[i]>=need){fit=sizes[i];break;}}'
            'var t=ty.value;'
            'var head=EN?("You need at least <strong>"+need.toFixed(2).replace(".",".")+" m</strong> of seal")'
            ':("Du brauchst mindestens <strong>"+need.toFixed(2).replace(".",",")+" m</strong> Abdichtung");'
            'var size=fit?(EN?("The common size that fits is <strong>"+(fit*100)+" cm</strong> — anything shorter leaves a gap.")'
            ':("Die passende Konfektionsgröße ist <strong>"+(fit*100)+" cm</strong> — kürzer lässt eine Lücke offen.")):'
            '(EN?"Larger than the usual off-the-shelf sizes — look for made-to-measure."'
            ':"Größer als die üblichen Konfektionsgrößen — hier hilft nur Maßanfertigung.");'
            'var note=t==="dach"?(EN?"On a roof window the seal also has to shed rain: check that the opening points downward and that water cannot run in along the hose."'
            ':"Am Dachfenster muss die Abdichtung auch Regen abhalten: Öffnung nach unten führen und prüfen, dass kein Wasser am Schlauch entlangläuft."):'
            '(t==="dreh"?(EN?"Fully opened, the sash perimeter is what counts — not the tilt gap."'
            ':"Ganz geöffnet zählt der Flügelumfang — nicht der Kippspalt."):'
            '(EN?"Tilted, the gap runs around three sides, but the seal is still fixed around the whole sash."'
            ':"Gekippt läuft der Spalt über drei Seiten, befestigt wird die Abdichtung trotzdem um den ganzen Flügel."));'
            'var warn=EN?"The usual failure is not the fabric but the adhesive strip: in direct sun it lets go and leaves residue. Where you can, clamp or use the frame rather than relying on glue."'
            ':"Der übliche Schwachpunkt ist nicht der Stoff, sondern das Klebeband: in der Sonne löst es sich und hinterlässt Rückstände. Wo möglich klemmen statt kleben.";'
            'r.innerHTML=\'<div style="font-size:17px;">\'+head+\'</div>\'+'
            '\'<div style="margin:6px 0 0;font-size:14.5px;">\'+size+\'</div>\'+'
            '\'<div style="margin:8px 0 0;font-size:13.5px;color:#4a5a67;">\'+note+\'</div>\'+'
            '\'<div style="margin:8px 0 0;font-size:13.5px;color:#8a6410;background:#fff8ec;border:1px solid #f3ddc0;border-radius:8px;padding:9px 11px;">⚠️ \'+warn+\'</div>\'+'
            '\'<div style="margin:12px 0 0;display:flex;gap:8px;flex-wrap:wrap;">\'+'
            '\'<a href="https://www.amazon.de/s?k=\'+(fit?("fensterabdichtung+mobile+klimaanlage+"+(fit*100)+"+cm"):"fensterabdichtung+klimaanlage+massanfertigung")+\'&tag=getecoback-21" target="_blank" rel="sponsored noopener" '
            'style="background:#f59e0b;color:#1a2733;font-weight:800;padding:9px 14px;border-radius:8px;text-decoration:none;font-size:13.5px;">\'+(fit?(EN?"Find this size on Amazon →":"Diese Größe auf Amazon suchen →"):(EN?"Look for made-to-measure →":"Maßanfertigung suchen →"))+\'</a>\'+'
            '\'<a href="/guide/klimaanlage-zubehoer-guenstig.html" style="background:#fff;color:#0a4d7a;border:1px solid #cfe0ea;font-weight:700;padding:9px 14px;border-radius:8px;text-decoration:none;font-size:13.5px;">\'+(EN?"Cheaper cross-border options →":"Günstigere Bezugswege →")+\'</a></div>\';'
            'r.style.display="block";'
            'if(window.gtag)gtag("event","seal_fit",{len:Math.round(need*100),type:t});});'
            '})();</script><!--/EB_SEALFIT-->\n')


SEALFIT_PAGES_DE = {"klimaanlage-kippfenster", "klimaanlage-dachfenster", "klimaanlage-zubehoer-guenstig",
                    "fensterabdichtung-klimaanlage"}
SEALFIT_PAGES_EN = {"portable-ac-tilt-and-turn-windows", "portable-ac-skylight-roof-window",
                    "window-seal-portable-ac"}


def inject_sealfit(html, slug, en=False):
    """Idempotently add the seal-length calculator on the window-sealing cluster."""
    pages = SEALFIT_PAGES_EN if en else SEALFIT_PAGES_DE
    if slug not in pages:
        return re.sub(r'<!--EB_SEALFIT-->.*?<!--/EB_SEALFIT-->\n?', '', html, flags=re.S)
    blk = sealfit_block(en=en)
    if "<!--EB_SEALFIT-->" in html:
        return re.sub(r'<!--EB_SEALFIT-->.*?<!--/EB_SEALFIT-->\n?', lambda m: blk, html, flags=re.S)
    if re.search(r'<h2\b', html):
        return re.sub(r'(<h2\b)', lambda m: blk + m.group(1), html, count=1)
    return html


# The exhaust-hose pages are the same shape of problem as the window seal, and
# the D1 funnel put one of them at the top of the site: five visits, eight Amazon
# links, zero clicks. The page explains the 2 m rule in prose and then sends
# people to a generic search — but the two things a buyer has to know before
# clicking are how many metres they actually need and which diameter fits their
# unit, and the word "Länge" did not appear on the page once. This turns the rule
# into an answer for the reader's own room and hands over a diameter-matched
# search instead of a mixed results page. Pure arithmetic, no invented specs.
HOSEFIT_DE = ("Wie viel Schlauch brauchst du wirklich?",
              "Miss vom <strong>Anschluss am Gerät</strong> bis zur Fensteröffnung — dort, wo der Schlauch später "
              "wirklich langläuft, nicht Luftlinie.",
              "Abstand Gerät → Fenster (cm)", "Vorhandener Schlauch (cm)", "Durchmesser",
              [("150", "150 mm (häufigster)"), ("130", "130 mm"), ("?", "Weiß ich nicht")],
              "Länge berechnen")
HOSEFIT_EN = ("How much hose do you actually need?",
              "Measure from the <strong>outlet on the unit</strong> to the window opening — along the path the hose "
              "will really take, not in a straight line.",
              "Unit → window (cm)", "Hose you already have (cm)", "Diameter",
              [("150", "150 mm (most common)"), ("130", "130 mm"), ("?", "Not sure")],
              "Calculate length")


def hosefit_block(en=False):
    t = HOSEFIT_EN if en else HOSEFIT_DE
    opts = "".join(f'<option value="{v}">{lbl}</option>' for v, lbl in t[5])
    return ('<!--EB_HOSEFIT--><section style="max-width:1000px;margin:18px auto 0;padding:0 20px;">'
            '<div style="background:#fff;border:2px solid #0f6ba8;border-radius:14px;padding:18px 20px;">'
            f'<strong style="font-size:17px;display:block;margin-bottom:3px;">{t[0]}</strong>'
            # Same rule as the seal calculator: the verdict links to Amazon.
            f'<p style="margin:0 0 6px;font-size:11px;color:#8a99a6;">{AD_LABEL[en]}</p>'
            f'<p style="margin:0 0 12px;color:#5b6b78;font-size:13.5px;">{t[1]}</p>'
            '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;">'
            f'<div style="flex:1 1 150px;"><label for="eb-hf-d" style="display:block;font-weight:700;font-size:12.5px;margin-bottom:4px;">{t[2]}</label>'
            '<input id="eb-hf-d" type="number" value="250" min="30" max="900" inputmode="numeric" style="width:100%;padding:9px 11px;border:1px solid #cfd8e0;border-radius:8px;font-size:16px;background:#fff;color:#1a2733;"></div>'
            f'<div style="flex:1 1 150px;"><label for="eb-hf-s" style="display:block;font-weight:700;font-size:12.5px;margin-bottom:4px;">{t[3]}</label>'
            '<input id="eb-hf-s" type="number" value="150" min="0" max="600" inputmode="numeric" style="width:100%;padding:9px 11px;border:1px solid #cfd8e0;border-radius:8px;font-size:16px;background:#fff;color:#1a2733;"></div>'
            f'<div style="flex:1 1 170px;"><label for="eb-hf-t" style="display:block;font-weight:700;font-size:12.5px;margin-bottom:4px;">{t[4]}</label>'
            f'<select id="eb-hf-t" style="width:100%;padding:9px 11px;border:1px solid #cfd8e0;border-radius:8px;font-size:16px;background:#fff;color:#1a2733;font-family:inherit;">{opts}</select></div>'
            f'<div><button type="button" id="eb-hf-go" style="background:#0f6ba8;color:#fff;border:none;padding:11px 20px;border-radius:8px;font-weight:800;font-size:15px;cursor:pointer;">{t[6]}</button></div>'
            '</div><div id="eb-hf-res" style="display:none;margin-top:14px;background:#eaf6ff;border:1px solid #cfe6fa;border-radius:10px;padding:15px 17px;"></div>'
            '</div></section>\n<script>(function(){'
            'var d=document.getElementById("eb-hf-d"),s=document.getElementById("eb-hf-s"),'
            'ty=document.getElementById("eb-hf-t"),b=document.getElementById("eb-hf-go"),r=document.getElementById("eb-hf-res");'
            'if(!b||!r)return;var EN=' + ("true" if en else "false") + ';'
            'function m(x){var v=(x/100).toFixed(1);return EN?v:v.replace(".",",");}'
            'b.addEventListener("click",function(){'
            'var D=Math.max(30,Math.min(900,parseFloat(d.value)||250));'
            'var S=Math.max(0,Math.min(600,parseFloat(s.value)||0));'
            # The hose is corrugated and has to bend at both ends, so the run is
            # always longer than the straight-line distance. 20 cm of slack is the
            # allowance, and it is stated in the result rather than hidden.
            'var total=D+20;'
            # Extensions are sold in fixed lengths; round the gap up to the next
            # half metre so the answer is something you can actually buy.
            'var gap=Math.max(0,total-S);var buy=Math.ceil(gap/50)*50;'
            'var dia=ty.value;'
            'var head=gap<=0?(EN?"Your existing hose is long enough — <strong>no extension needed</strong>."'
            ':"Dein vorhandener Schlauch reicht — <strong>keine Verlängerung nötig</strong>."):'
            '(EN?("You need about <strong>"+m(total)+" m</strong> of hose in total, so an extension of about <strong>"+m(buy)+" m</strong>.")'
            ':("Du brauchst insgesamt rund <strong>"+m(total)+" m</strong> Schlauch, also eine Verlängerung von etwa <strong>"+m(buy)+" m</strong>."));'
            'var slack=EN?"(includes 20 cm of slack for the bends at both ends)":"(inkl. 20 cm Zuschlag für die Bögen an beiden Enden)";'
            'var verdict,tone;'
            'if(total<=200){verdict=EN?"That is inside the range these units are designed for — expect no measurable loss."'
            ':"Das liegt im Bereich, für den die Geräte ausgelegt sind — spürbaren Verlust gibt es hier nicht.";tone="ok";}'
            'else if(total<=350){verdict=EN?"Beyond the 2 m this page recommends. It still works, but only straight, without tight bends, and insulated — and you will notice some loss."'
            ':"Über den ~2 m, die hier empfohlen werden. Machbar, aber nur gerade verlegt, ohne enge Knicke und isoliert — etwas Leistung kostet es.";tone="warn";}'
            'else{verdict=EN?"Too long. At this distance moving the unit closer beats any extension, and a split-style unit with a thin refrigerant line is the real fix."'
            ':"Zu lang. Auf diese Distanz ist Umstellen besser als jede Verlängerung — und die eigentliche Lösung ist ein Split-Gerät mit dünner Leitung statt Schlauch.";tone="stop";}'
            # Nothing to buy is a legitimate answer, and it has to read like one:
            # no diameter advice, no shopping link, just the thing that actually
            # costs cooling power at this distance.
            'var dnote=gap<=0?(EN?"Nothing to buy here. What still costs you cooling at this distance is a sagging run and an unsealed window — fix those instead."'
            ':"Hier gibt es nichts zu kaufen. Was dich auf diese Distanz trotzdem Leistung kostet, ist ein durchhängender Schlauch und ein undichtes Fenster — das lohnt sich zu beheben.")'
            ':dia==="?"?(EN?"Measure straight across the opening of the outlet on the unit: 130 mm and 150 mm are the two standard sizes. Never step down to a smaller diameter — that chokes the exhaust fan."'
            ':"Miss quer über die Öffnung des Anschlussstutzens am Gerät: 130 mm und 150 mm sind die beiden Standardmaße. Nie auf einen kleineren Durchmesser reduzieren — das würgt das Gebläse ab.")'
            ':(EN?("Buy the extension in <strong>"+dia+" mm</strong> — the same size as your hose. Any step down costs more than the extra metre does.")'
            ':("Kauf die Verlängerung in <strong>"+dia+" mm</strong> — im selben Maß wie dein Schlauch. Jede Verengung kostet mehr als der Extra-Meter."));'
            'var q=dia==="?"?"abluftschlauch+verl%C3%A4ngerung+klimaanlage":("abluftschlauch+verl%C3%A4ngerung+"+dia+"+mm");'
            'var cta=EN?(dia==="?"?"Find extensions on Amazon →":("Find "+dia+" mm extensions →")):(dia==="?"?"Verlängerungen auf Amazon suchen →":(dia+" mm Verlängerung suchen →"));'
            'var second=total>350?(EN?["/en/guide/best-portable-air-conditioner-europe-heatwave.html","Split-style units without a hose →"]'
            ':["/guide/split-klimaanlage-ohne-kernbohrung.html","Split ohne Kernbohrung →"])'
            ':(EN?["/en/guide/portable-ac-tilt-and-turn-windows.html","Seal the window too →"]'
            ':["/guide/klimaanlage-kippfenster.html","Fenster dazu abdichten →"]);'
            'var col=tone==="ok"?"#0a6b3d":(tone==="warn"?"#8a6410":"#b23c17");'
            'var bg=tone==="ok"?"#eaf7ef":(tone==="warn"?"#fff8ec":"#fdece7");'
            'var bd=tone==="ok"?"#bfe3cd":(tone==="warn"?"#f3ddc0":"#f3c4b4");'
            'r.innerHTML=\'<div style="font-size:17px;">\'+head+\'</div>\'+'
            '(gap>0?\'<div style="margin:4px 0 0;font-size:12.5px;color:#7a8b98;">\'+slack+\'</div>\':"")+'
            '\'<div style="margin:8px 0 0;font-size:14px;color:\'+col+\';background:\'+bg+\';border:1px solid \'+bd+\';border-radius:8px;padding:9px 11px;">\'+verdict+\'</div>\'+'
            '\'<div style="margin:8px 0 0;font-size:13.5px;color:#4a5a67;">\'+dnote+\'</div>\'+'
            '\'<div style="margin:12px 0 0;display:flex;gap:8px;flex-wrap:wrap;">\'+'
            '((total>350||gap<=0)?"":\'<a href="https://www.amazon.de/s?k=\'+q+\'&tag=getecoback-21" target="_blank" rel="sponsored noopener" '
            'style="background:#f59e0b;color:#1a2733;font-weight:800;padding:9px 14px;border-radius:8px;text-decoration:none;font-size:13.5px;">\'+cta+\'</a>\')+'
            '\'<a href="\'+second[0]+\'" style="background:#fff;color:#0a4d7a;border:1px solid #cfe0ea;font-weight:700;padding:9px 14px;border-radius:8px;text-decoration:none;font-size:13.5px;">\'+second[1]+\'</a></div>\';'
            'r.style.display="block";'
            'if(window.gtag)gtag("event","hose_fit",{cm:Math.round(total),dia:dia});});'
            '})();</script><!--/EB_HOSEFIT-->\n')


HOSEFIT_PAGES_DE = {"abluftschlauch-verlaengern"}
HOSEFIT_PAGES_EN = {"portable-ac-hose-extension"}


def inject_hosefit(html, slug, en=False):
    """Idempotently add the hose-length calculator on the exhaust-hose pages."""
    pages = HOSEFIT_PAGES_EN if en else HOSEFIT_PAGES_DE
    if slug not in pages:
        return re.sub(r'<!--EB_HOSEFIT-->.*?<!--/EB_HOSEFIT-->\n?', '', html, flags=re.S)
    blk = hosefit_block(en=en)
    if "<!--EB_HOSEFIT-->" in html:
        return re.sub(r'<!--EB_HOSEFIT-->.*?<!--/EB_HOSEFIT-->\n?', lambda m: blk, html, flags=re.S)
    if re.search(r'<h2\b', html):
        return re.sub(r'(<h2\b)', lambda m: blk + m.group(1), html, count=1)
    return html


def inject_quickpick(html, slug, en=False):
    """Idempotently add the facet router on pages where a device is being chosen.

    Buying intent means the page recommends a concrete unit — either through the
    injected product cards or by naming an endorsed model in its own text. The
    first cut only looked for the cards, which silently skipped the curated
    flagship pages, and those are exactly the pages that convert. Size-series
    pages stay out: build_xlinks already gives them sibling navigation.
    """
    table = QUICKPICK_EN if en else QUICKPICK
    # device_of() reads German keywords, so English slugs fall through to "ac".
    # Catch the ones that are not about buying a cooling unit before that happens.
    if en and any(k in slug for k in ("dehumidifier", "fan-with-ice", "heat-check")):
        return re.sub(r'<!--EB_QUICKPICK-->.*?<!--/EB_QUICKPICK-->\n?', '', html, flags=re.S)
    # Someone whose unit leaks or smells already owns one, and a page about coping
    # without a unit should not be answered with "here is how to pick one".
    if any(k in slug for k in ("tropft", "stinkt", "zu-laut", "kuehlt-nicht", "reinigen",
                               "saugt-nicht",
                               "leaking", "not-cooling", "smells-musty", "how-to-clean",
                               "without-ac", "ohne-klimaanlage", "mit-eis",
                               # Humidifier pages route to the "dehum" family for
                               # component gating, but the dehumidifier picker is
                               # the exact opposite of what this reader needs.
                               "luftbefeuchter")):
        return re.sub(r'<!--EB_QUICKPICK-->.*?<!--/EB_QUICKPICK-->\n?', '', html, flags=re.S)
    device = device_of(slug)
    buying = "<!--EB_MODELS-->" in html or any(n in html for n in CANON_NAMES)
    eligible = (device in table and buying
                and not re.match(r'^(klimaanlage|luftentfeuchter|heizung)-\d+-qm$', slug))
    box = quickpick_box(device, slug, en=en) if eligible else ""
    if not box:
        return re.sub(r'<!--EB_QUICKPICK-->.*?<!--/EB_QUICKPICK-->\n?', '', html, flags=re.S)
    if "<!--EB_QUICKPICK-->" in html:
        return re.sub(r'<!--EB_QUICKPICK-->.*?<!--/EB_QUICKPICK-->\n?', lambda m: box, html, flags=re.S)
    if "<!--EB_MODELS-->" in html:
        return html.replace("<!--EB_MODELS-->", box + "<!--EB_MODELS-->", 1)
    # Curated pages have no card marker — put the router before the first content
    # heading so the reader meets it before the recommendations.
    if re.search(r'<h2\b', html):
        return re.sub(r'(<h2\b)', lambda m: box + m.group(1), html, count=1)
    return html


def inject_heatenergy(html, slug):
    """Idempotently connect the cooling cluster to the energy cluster."""
    if device_of(slug) != "ac" or slug in HEATENERGY_SKIP:
        return re.sub(r'<!--EB_HEATENERGY-->.*?<!--/EB_HEATENERGY-->\n?', '', html, flags=re.S)
    if "<!--EB_HEATENERGY-->" in html:
        return re.sub(r'<!--EB_HEATENERGY-->.*?<!--/EB_HEATENERGY-->\n?',
                      lambda m: HEATENERGY_BOX, html, flags=re.S)
    if "<!--EB_FOOTER-->" in html:
        return html.replace("<!--EB_FOOTER-->", HEATENERGY_BOX + "<!--EB_FOOTER-->", 1)
    return html


def inject_embed(html, slug):
    """Idempotently offer the embed code at the foot of calculator pages."""
    if slug not in TOOL_PAGES:
        return re.sub(r'<!--EB_EMBED-->.*?<!--/EB_EMBED-->\n?', '', html, flags=re.S)
    box = embed_box(slug)
    if "<!--EB_EMBED-->" in html:
        return re.sub(r'<!--EB_EMBED-->.*?<!--/EB_EMBED-->\n?', lambda m: box, html, flags=re.S)
    if "<!--EB_FOOTER-->" in html:
        return html.replace("<!--EB_FOOTER-->", box + "<!--EB_FOOTER-->", 1)
    return html


def inject_energy(html, slug):
    """Idempotently add the storage cross-sell box on cost-pain pages, after the
    model grid / explainer if present, else before the first content <h2>."""
    if slug not in ENERGY_PAGES:
        return re.sub(r'<!--EB_ENERGY-->.*?<!--/EB_ENERGY-->\n?', '', html, flags=re.S)
    if "<!--EB_ENERGY-->" in html:
        return re.sub(r'<!--EB_ENERGY-->.*?<!--/EB_ENERGY-->\n?', lambda m: ENERGY_BOX, html, flags=re.S)
    for anchor in ("<!--/EB_EXPLAINER-->", "<!--/EB_MODELS-->"):
        if anchor in html:
            return html.replace(anchor, anchor + "\n" + ENERGY_BOX, 1)
    if re.search(r'<h2\b', html):
        return re.sub(r'(<h2\b)', lambda m: ENERGY_BOX + m.group(1), html, count=1)
    return html


# --- Self-made animated SVG explainers ("video-like", zero copyright, tiny). ---
EX_AC = ('<svg class="eb-ex" viewBox="0 0 300 150" xmlns="http://www.w3.org/2000/svg" '
         'role="img" aria-label="Funktionsweise mobile Klimaanlage">'
         '<rect x="6" y="16" width="250" height="120" rx="8" fill="#f7fafc" stroke="#cfe0ea" stroke-width="2"/>'
         '<rect x="248" y="44" width="18" height="66" fill="#dcedf7" stroke="#0f6ba8" stroke-width="2"/>'
         '<line x1="257" y1="44" x2="257" y2="110" stroke="#0f6ba8" stroke-width="1.5"/>'
         '<circle cx="284" cy="30" r="11" fill="#ffd47a"/>'
         '<rect x="196" y="66" width="36" height="60" rx="5" fill="#fff" stroke="#0f6ba8" stroke-width="2"/>'
         '<rect x="202" y="72" width="24" height="11" rx="2" fill="#dce9f2"/>'
         '<path d="M202 94h24M202 102h24M202 110h24" stroke="#9cc3dd" stroke-width="2"/>'
         '<path d="M232 80 H248" stroke="#cd7f3a" stroke-width="4" fill="none" stroke-linecap="round"/>'
         '<g fill="#e4572e"><path class="out" d="M250 62 l9 4 l-9 4 z"/><path class="out2" d="M250 96 l9 4 l-9 4 z"/></g>'
         '<g fill="#2ea6c9"><path class="in" d="M190 84 l-9 -4 l9 -4 z"/><path class="in2" d="M190 112 l-9 -4 l9 -4 z"/></g>'
         '<g fill="#bfe3f5"><circle cx="60" cy="66" r="4"/><circle cx="95" cy="104" r="3"/><circle cx="45" cy="110" r="3"/></g>'
         '</svg>')

EX_FAN = ('<svg class="eb-ex" viewBox="0 0 300 150" xmlns="http://www.w3.org/2000/svg" '
          'role="img" aria-label="Funktionsweise Ventilator">'
          '<rect x="6" y="16" width="288" height="120" rx="8" fill="#f7fafc" stroke="#cfe0ea" stroke-width="2"/>'
          '<circle cx="228" cy="70" r="34" fill="#eaf6ff" stroke="#0f6ba8" stroke-width="2.5"/>'
          '<g class="blade"><circle cx="228" cy="70" r="7" fill="#0f6ba8"/>'
          '<path d="M228 70c-12-6-20-2-20 6M228 70c6-12 2-20-6-20M228 70c12 6 20 2 20-6M228 70c-6 12-2 20 6 20" '
          'stroke="#0f6ba8" stroke-width="3" fill="none" stroke-linecap="round"/></g>'
          '<path d="M228 104v20M210 126h36" stroke="#0f6ba8" stroke-width="3" stroke-linecap="round"/>'
          '<g fill="none" stroke="#7fc7e6" stroke-width="3" stroke-linecap="round">'
          '<path class="puff" d="M182 54 q-22 -6 -44 0"/><path class="puff2" d="M182 74 q-22 -6 -44 0"/>'
          '<path class="puff3" d="M182 94 q-22 -6 -44 0"/></g>'
          '<circle cx="60" cy="58" r="13" fill="#cfe0ea"/><rect x="45" y="74" width="30" height="50" rx="13" fill="#cfe0ea"/>'
          '</svg>')

EX_DEHUM = ('<svg class="eb-ex" viewBox="0 0 300 150" xmlns="http://www.w3.org/2000/svg" '
            'role="img" aria-label="Funktionsweise Luftentfeuchter">'
            '<rect x="6" y="16" width="288" height="120" rx="8" fill="#f7fafc" stroke="#cfe0ea" stroke-width="2"/>'
            '<g fill="#bfe3f5"><circle cx="70" cy="58" r="4"/><circle cx="100" cy="98" r="3"/><circle cx="55" cy="110" r="3"/>'
            '<circle cx="220" cy="66" r="3"/><circle cx="240" cy="100" r="4"/></g>'
            '<rect x="130" y="40" width="46" height="86" rx="6" fill="#fff" stroke="#0f6ba8" stroke-width="2.5"/>'
            '<path d="M138 50h30" stroke="#9cc3dd" stroke-width="2"/>'
            '<g fill="#2ea6c9"><circle class="drop" cx="153" cy="70" r="4"/><circle class="drop2" cx="153" cy="70" r="4"/></g>'
            '<rect x="140" y="104" width="28" height="16" rx="2" fill="#dcedf7" stroke="#0f6ba8" stroke-width="1.5"/>'
            '<path d="M143 113h22" stroke="#2ea6c9" stroke-width="3" stroke-linecap="round"/>'
            '</svg>')

EXPLAINER = {
 "ac": (EX_AC, "So funktioniert's", "Mobile Klimaanlage",
        "Sie saugt warme Raumluft an, kühlt sie ab und gibt sie zurück — die Abwärme geht über den Fensterschlauch nach draußen. Echte Kühlung, kein bloßer Umluft-Effekt."),
 "fan": (EX_FAN, "So funktioniert's", "Ventilator",
         "Ein Ventilator senkt nicht die Raumtemperatur, sondern beschleunigt die Verdunstung auf der Haut — der Luftstrom lässt dich spürbar kühler fühlen."),
 "dehum": (EX_DEHUM, "So funktioniert's", "Luftentfeuchter",
           "Er entzieht der Luft Feuchtigkeit und sammelt sie im Tank — trockenere Luft fühlt sich kühler an und beugt Schimmel vor."),
}
EXPLAINER_EN = {
 "ac": (EX_AC, "How it works", "Portable air conditioner",
        "It draws in warm room air, cools it and returns it — the waste heat leaves through the window hose. Real cooling, not just moving air around."),
 "fan": (EX_FAN, "How it works", "Fan",
         "A fan doesn't lower the room temperature — it speeds up evaporation on your skin, so the airflow makes you feel noticeably cooler."),
 "dehum": (EX_DEHUM, "How it works", "Dehumidifier",
           "It pulls moisture from the air into its tank — drier air feels cooler and helps prevent mould."),
}


def explainer_block(dev, en=False):
    svg, badge, title, desc = (EXPLAINER_EN if en else EXPLAINER).get(
        dev, (EXPLAINER_EN if en else EXPLAINER)["ac"])
    return (f'<!--EB_EXPLAINER--><section class="eb-explainer"><div class="ex-card">{svg}'
            f'<div class="cap"><span class="ex-badge">{badge}</span><strong>{title}</strong>'
            f'<p>{desc}</p></div></div></section><!--/EB_EXPLAINER-->\n')


# Click-to-load YouTube facade on money pages: how-to videos where installation
# doubt blocks the purchase, independent review videos where third-party
# endorsement builds trust (embedding freely accessible YouTube videos via the
# official player is legal per EuGH/BGH framing case law; iframe only loads on
# click, so no data flows pre-consent and no CWV cost).
# slug -> (video_id, title[, heading]). Videos verified to exist via search.
VIDEOS = {
 "klimaanlage-kippfenster": ("DqjrdUiaftc", "Fensterabdichtung für die mobile Klimaanlage anbringen (Anleitung)"),
 "klimaanlage-dachfenster": ("DqjrdUiaftc", "Abluftschlauch am Fenster abdichten — Schritt-für-Schritt (Video)"),
 "abluftschlauch-verlaengern": ("DqjrdUiaftc", "Abluftschlauch & Fensterabdichtung richtig anbringen (Video)"),
 "beste-tragbare-klimaanlage-hitzewelle": ("l8z9FzMbpj8", "Die beste mobile Klimaanlage 2026? De'Longhi Pinguino PAC EX105 im Video-Test", "Unabhängiger Test im Video"),
 "beste-tragbare-klimaanlage-schlafzimmer": ("7sooX2zoH0c", "De'Longhi Pinguino PAC EX105 im Test: Wie leise ist sie wirklich?", "Unabhängiger Test im Video"),
 "ventilator-kaufen-ratgeber": ("zIZ1kfab3LQ", "Ventilator-Test: MeacoFan 1056, Midea & Rowenta im Vergleich", "Unabhängiger Test im Video"),
 "luftentfeuchter-gegen-schimmel": ("mBSS57P_rl4", "Comfee MDDF-20DEN7 Luftentfeuchter im Video-Test", "Unabhängiger Test im Video"),
 "balkonkraftwerk-speicher-nachruesten": ("pTbLIJzfJoQ", "Balkonkraftwerk mit Speicher: Top 5 im Test (2026)", "Unabhängiger Test im Video"),
 "balkonkraftwerk-lohnt-sich-rechner": ("z7RO0E8ZAJ8", "Rechnet sich ein Balkonkraftwerk mit Speicher wirklich? (Video)", "Unabhängiger Test im Video"),
 "luftentfeuchter-keller": ("NCdYI6HdQi8", "Nie wieder Schimmel: Comfee-Luftentfeuchter im Praxiseinsatz (Video)", "Unabhängiger Test im Video"),
 "keller-lueften-sommer": ("WCKVwHAHUhs", "Lüftung, Heizung und Schimmelprävention im Keller — praktische Tipps (Video)", "Video-Anleitung"),
}

# English money pages hold the site's strongest real traffic (GA4: tilt-turn is
# the #1 non-home landing page, incl. ChatGPT/Perplexity referrals) but had no
# video layer. English videos only — never German videos on /en/ pages.
VIDEOS_EN = {
 "portable-ac-tilt-and-turn-windows": ("MWSMPhJUGxc", "Step-by-step: sealing a tilt window for a portable AC (video tutorial)", "Video tutorial"),
 "best-portable-air-conditioner-europe-heatwave": ("R2dA7C4l6p4", "De'Longhi Pinguino PAC N82 review: unboxing & noise test", "Independent test on video"),
 "best-portable-air-conditioner-for-bedroom": ("R2dA7C4l6p4", "How loud is it at night? De'Longhi Pinguino noise test (video)", "Independent test on video"),
}


def video_block(video_id, title, heading="Video-Anleitung", en=False):
    label = "Play video" if en else "Video abspielen"
    src = ("External YouTube video · click to play" if en
           else "Externes YouTube-Video · klick zum Abspielen")
    note = ('External video from YouTube. Clicking loads the player and transfers data to YouTube (Google) — '
            'see <a href="/datenschutz.html">privacy policy</a>.' if en else
            'Externes Video von YouTube. Beim Klick werden Daten an YouTube (Google) '
            'übertragen — siehe <a href="/datenschutz.html">Datenschutz</a>.')
    return (
        f'<!--EB_VIDEO--><section class="eb-video"><div class="eb-video-hd">🎬 {heading}</div>'
        f'<button type="button" class="eb-video-fac" data-id="{video_id}" aria-label="{label}">'
        '<span class="eb-video-badge">▷ VIDEO</span>'
        '<span class="eb-video-play" aria-hidden="true">▶</span>'
        f'<span class="eb-video-t">{title}</span>'
        f'<span class="eb-video-src">{src}</span></button>'
        f'<p class="eb-video-note">{note}</p>'
        '<script>(function(){var f=document.currentScript.parentNode.querySelector(".eb-video-fac");'
        'if(!f)return;f.addEventListener("click",function(){var id=f.getAttribute("data-id");'
        'var w=document.createElement("div");w.className="eb-video-frame";'
        'w.innerHTML=\'<iframe src="https://www.youtube-nocookie.com/embed/\'+id+\'?autoplay=1" '
        'title="Video" loading="lazy" allow="autoplay; encrypted-media; picture-in-picture" '
        'allowfullscreen></iframe>\';f.parentNode.replaceChild(w,f);'
        'if(window.gtag)gtag("event","video_play",{video_id:id});});})();</script>'
        '</section><!--/EB_VIDEO-->\n')


def inject_video(html, slug, en=False):
    """Add the click-to-load video facade on flagship pages (idempotent)."""
    table = VIDEOS_EN if en else VIDEOS
    if slug not in table:
        return re.sub(r'<!--EB_VIDEO-->.*?<!--/EB_VIDEO-->\n?', '', html, flags=re.S)
    block = video_block(*table[slug], en=en)
    if "<!--EB_VIDEO-->" in html:
        return re.sub(r'<!--EB_VIDEO-->.*?<!--/EB_VIDEO-->\n?', lambda m: block, html, flags=re.S)
    if "<!--/EB_EXPLAINER-->" in html:
        return html.replace("<!--/EB_EXPLAINER-->", "<!--/EB_EXPLAINER-->\n" + block, 1)
    if "<!--/EB_MODELS-->" in html:
        return html.replace("<!--/EB_MODELS-->", "<!--/EB_MODELS-->\n" + block, 1)
    if re.search(r'<h2\b', html):
        return re.sub(r'(<h2\b)', lambda m: block + m.group(1), html, count=1)
    return html


def inject_explainer(html, slug, en=False):
    """Add an animated explainer after the model grid (or before the first content
    <h2>), only for device pages where it teaches the product. Idempotent."""
    dev = device_of(slug)
    if dev not in ("ac", "fan", "dehum") or slug in SKIP_MODELS:
        return re.sub(r'<!--EB_EXPLAINER-->.*?<!--/EB_EXPLAINER-->\n?', '', html, flags=re.S)
    block = explainer_block(dev, en)
    if "<!--EB_EXPLAINER-->" in html:
        return re.sub(r'<!--EB_EXPLAINER-->.*?<!--/EB_EXPLAINER-->\n?', lambda m: block, html, flags=re.S)
    if "<!--/EB_MODELS-->" in html:
        return html.replace("<!--/EB_MODELS-->", "<!--/EB_MODELS-->\n" + block, 1)
    if re.search(r'<h2\b', html):
        return re.sub(r'(<h2\b)', lambda m: block + m.group(1), html, count=1)
    return html


# Delegated affiliate-click tracker: inline Amazon links (model cards, CTA
# boxes, in-text links) predate per-link gtag handlers, so their clicks were
# invisible in GA4. One listener per page catches them all, and it stands down
# whenever another handler on the page already reported the same click.
TRACK = ('<!--EB_TRACK--><script>(function(){'
         # First-party beacon: same-origin, no cookies, no ids. Mirrors every
         # gtag event into our own D1 so the funnel stays measurable without a
         # third-party analytics subscription.
         'var send=function(n,m){try{var b=JSON.stringify({n:n,p:location.pathname,r:document.referrer,m:m||null});'
         'if(navigator.sendBeacon){navigator.sendBeacon("/api/ev",new Blob([b],{type:"text/plain"}));}'
         'else{fetch("/api/ev",{method:"POST",keepalive:true,headers:{"Content-Type":"text/plain"},body:b});}}catch(e){}};'
         # One click, one row. Three independent code paths can report the same
         # affiliate click — the page's own tracker, a component listener
         # (toppick/sticky/model card) and the delegated fallback below — and each
         # produced its own beacon, so D1 counted component-carrying clicks twice
         # while splitting the useful fields across the two rows (one carried
         # link_url, the other carried source). The 08-05 fix only silenced the
         # fallback, and only when the other path went through gtag.
         #
         # Coalescing at the beacon layer catches all of them regardless of how
         # they report: buffer affiliate_click briefly, merge the params, emit one
         # row that now carries both source and link_url. A genuinely different
         # link inside the window flushes the pending one first, so two real
         # clicks stay two rows. Affiliate links open in a new tab, so the delay
         # is invisible; pagehide flushes anything still buffered.
         # 78 % of affiliate clicks arrived with no source at all: 114 pages carry
         # a hand-written delegated tracker that fires on any Amazon link and
         # reports only link_url. Rewriting those pages would be a large,
         # risk-bearing diff for a telemetry field, so the surface is derived
         # here instead — a capture-phase listener runs before any page tracker
         # and records which component the clicked link sits in. Clicks that
         # already name their source keep it; only the blanks get filled.
         'var surf="";'
         'document.addEventListener("click",function(e){'
         'var a=e.target&&e.target.closest&&e.target.closest(\'a[href*="amazon."]\');'
         'if(!a){surf="";return;}'
         'surf=a.closest("#eb-usmarket")?"us-market":'
         'a.closest("#eb-herbst")?"home-herbst":'
         'a.hasAttribute("data-eb-tp")?"toppick":'
         'a.closest("#eb-models")?"models":'
         'a.closest("#eb-ac-finder")?"ac-finder":'
         'a.closest(".eb-shop-grid")?"grid":'
         'a.closest("article")?"body":"other";'
         '},true);'
         'var raw=send,pend=null,pt=0;'
         'var flush=function(){if(pt){clearTimeout(pt);pt=0;}if(pend){var p=pend;pend=null;raw("affiliate_click",p);}};'
         'send=function(n,m){if(n!=="affiliate_click")return raw(n,m);m=m||{};'
         'if(!m.source&&surf)m.source=surf;'
         'var u=m.link_url||"",pu=pend&&(pend.link_url||"");'
         'if(pend&&u&&pu&&u!==pu)flush();'
         'if(pend){for(var k in m){if(m[k]!=null&&pend[k]==null)pend[k]=m[k];}}else{pend={};'
         'for(var k2 in m){if(m[k2]!=null)pend[k2]=m[k2];}}'
         'if(pt)clearTimeout(pt);pt=setTimeout(flush,700);};'
         'window.addEventListener("pagehide",flush);'
         'document.addEventListener("visibilitychange",function(){if(document.hidden)flush();});'
         'window.ebSend=send;raw("page_view");var lastAff=0;'
         'var g=window.gtag;window.gtag=function(){try{if(g)g.apply(null,arguments);}catch(e){}'
         'if(arguments[0]==="event"){if(arguments[1]==="affiliate_click")lastAff=+new Date();'
         'send(arguments[1],arguments[2]);}};'
         # Delegated affiliate-click fallback for inline Amazon links that have no
         # handler of their own. Most pages already carry a page-level tracker and
         # the sticky bar has its own, so this defers one tick and stands down if
         # an affiliate_click was just reported — one click is never counted twice.
         'document.addEventListener("click",function(e){'
         'var a=e.target.closest&&e.target.closest(\'a[href*="amazon."]\');if(!a)return;'
         # The capture-phase listener above has already worked out which component
         # the link sits in; this fallback used to throw that away and stamp every
         # click "inline", so any block without its own handler was invisible in
         # the funnel — it reported the default even for links the tracker had just
         # identified. Use the computed surface, keep "inline" only as the genuine
         # fallback, and carry link_url so the 500 ms de-duplication can compare
         # actual URLs instead of two blanks.
         'setTimeout(function(){if(+new Date()-lastAff<500)return;'
         'if(window.gtag)gtag("event","affiliate_click",{source:surf||"inline",page:location.pathname,link_url:a.href});},0);'
         '});})();</script><!--/EB_TRACK-->')


def inject_track(html):
    if "<!--EB_TRACK-->" in html:
        return re.sub(r'<!--EB_TRACK-->.*?<!--/EB_TRACK-->', lambda m: TRACK, html, flags=re.S)
    return html.replace("</body>", TRACK + "\n</body>", 1)


def inject_chrome(html, nav=NAV, footer=FOOTER):
    # Replace the chrome stylesheet in-place so new rules reach existing pages.
    if 'id="eb-chrome"' in html:
        html = re.sub(r'<style id="eb-chrome">.*?</style>', lambda m: CHROME_STYLE.rstrip("\n"),
                      html, count=1, flags=re.S)
    else:
        html = html.replace("</head>", HEAD_EXTRA + "</head>", 1)
    if 'application/rss+xml' not in html:
        html = html.replace("</head>", FEED_LINK + "</head>", 1)
    if "<!--eb-perf-->" not in html:
        html = html.replace("</head>", PERF_HINTS + "</head>", 1)
    if "<!--EB_NAV-->" in html:
        # 2026-08-26: refresh existing navs too (they were insert-only before,
        # so reorders never reached已 chromed pages).
        html = re.sub(r'<!--EB_NAV-->.*?<!--/EB_NAV-->\n?', lambda m: nav, html, count=1, flags=re.S)
    else:
        html = re.sub(r'(<body[^>]*>)', r'\1\n' + nav, html, count=1)
    if "<!--EB_FOOTER-->" in html:
        html = re.sub(r'<!--EB_FOOTER-->.*?<!--/EB_FOOTER-->', lambda m: footer, html, flags=re.S)
    elif re.search(r'<footer\b.*?</footer>', html, re.S):
        html = re.sub(r'<footer\b.*?</footer>', lambda m: footer, html, count=1, flags=re.S)
    else:
        html = html.replace("</body>", footer + "\n</body>", 1)
    return html


def inject_crumb_trust(html, cat_key, title, url, en=False):
    """Idempotently add breadcrumb + trust bar under the nav, plus breadcrumb JSON-LD."""
    block = crumb_trust(cat_key, title, en)
    if "<!--EB_CRUMB-->" in html:
        html = re.sub(r'<!--EB_CRUMB-->.*?<!--/EB_TRUST-->\n?', lambda m: block, html, flags=re.S)
    elif "<!--/EB_NAV-->" in html:
        html = html.replace("<!--/EB_NAV-->", "<!--/EB_NAV-->\n" + block, 1)
    else:
        return html
    return replace_breadcrumb_ld(html, cat_key, title, url, en)


def inject_sticky(html, sticky=STICKY):
    """Replace in place, not insert-only.

    This was insert-only, so every later change to the sticky bar silently
    never reached the 139 pages that already had one — the same failure the
    nav injector had (fixed 2026-08-26). It was found by an ad-labelling audit
    whose new Werbekennzeichnung reached 0 of 139 pages for this reason.
    """
    if "<!--EB_STICKY-->" in html:
        return re.sub(r'<!--EB_STICKY-->.*?<!--/EB_STICKY-->\n?', lambda m: sticky, html, flags=re.S)
    return html.replace("</body>", sticky + "</body>", 1)

# --- The site owns a dozen calculators and almost nobody uses them: 28 days of
# first-party data show 170 page views against 4 btu_calc, and every one of those
# 4 came from the homepage tool. The calculators are not weak, they are one
# navigation step away from the reader — a guide page answers "which model" while
# the number that decides it lives on /guide/btu-rechner.html.
#
# So the sizing question moves onto the guide page itself, directly above the
# model grid: compute, then buy. Same formula as /guide/btu-rechner.html at its
# own defaults (the homepage tool was verified against it model-for-model), so
# the three surfaces can never disagree. Area pages arrive pre-filled from their
# own slug.
#
# It is also the honest bridge to the MCP server: the tool a reader just used is
# literally the tool an AI assistant can call (btu_empfehlung, the one tool that
# actually gets called), so the pointer sits under a result rather than in a
# banner nobody asked for. ---
SIZER_TXT = {
    False: {
        "h": "Passt die Kühlleistung zu deinem Raum?",
        "sub": "Die Zahl, an der jeder Kauf hängt — unten steht sie schon. Raumgröße anpassen, wenn sie nicht stimmt.",
        "qm": "Raumgröße (m²)", "sun": "Sonneneinstrahlung",
        "opts": [("0.9", "Wenig (Nord, schattig)"), ("1", "Normal"), ("1.2", "Stark (Süd/West, Dachlage)")],
        "go": "Berechnen", "for": "Empfohlene Kühlleistung für", "cls": "Passende Geräteklasse",
        "nodrill": "kein Bohren: Schlauch ans Fenster, Abdichtung drum",
        "amz": "Preis auf Amazon prüfen →", "grid": "Alle Empfehlungen auf dieser Seite ↓",
        "area": "Alle Empfehlungen für %d m² →", "full": "Decke, Personen, Küche einrechnen →",
        "note": ("Anzeige · Richtwert nach 340 BTU/m². Modelle nicht selbst getestet — Auswahl nach "
                 "öffentlichen Tests, Links sind Affiliate-Links."),
        "mcp": ('Dieselbe Rechnung kann auch dein KI-Assistent direkt aufrufen — '
                '<a href="/mcp.html" style="color:#0f6ba8;">MCP-Server einrichten →</a>'),
        "bands": [(9000, "bis ca. 9.000 BTU"), (11000, "9.000–11.000 BTU"),
                  (13500, "11.000–13.500 BTU"), (0, "über 13.500 BTU")],
        # Over ~13,500 BTU we name no model, because we have none to name: the
        # largest portable in DEVICE_MODELS["ac"] is the 12K Klarstein. Handing a
        # reader who just computed 20,500 BTU a 12,000 BTU unit is the calculator
        # contradicting its own arithmetic — seven of the 39 calculations recorded
        # in D1 landed above this line and every one of them got that unit.
        "big": ("Bei dieser Raumgröße ist ein mobiler Monoblock am Limit — wir haben hier "
                "kein Gerät, das wir guten Gewissens empfehlen könnten. Realistisch sind ein "
                "fest installiertes Split-Gerät oder zwei kleinere Geräte."),
        "bigcta": ("/guide/split-klimaanlage-ohne-kernbohrung.html",
                   "Split ohne Kernbohrung: was wirklich geht →"),
    },
    True: {
        "h": "Is the cooling capacity right for your room?",
        "sub": "The one number every purchase hangs on — it is already worked out below. Adjust the room size if it is off.",
        "qm": "Room size (m²)", "sun": "Sun exposure",
        "opts": [("0.9", "Low (north-facing, shaded)"), ("1", "Normal"), ("1.2", "Strong (south/west, top floor)")],
        "go": "Calculate", "for": "Recommended cooling capacity for", "cls": "Matching class",
        "nodrill": "no drilling: hose to the window, seal around it",
        "amz": "Check the price on Amazon →", "grid": "All picks on this page ↓",
        "area": "All picks for %d m² →", "full": "Add ceiling height, people, kitchen →",
        "note": ("Ad · Rule of thumb: 340 BTU/m². Models not tested by us — compiled from public "
                 "tests, links are affiliate links."),
        "mcp": ('Your AI assistant can call this same calculation — '
                '<a href="/mcp.html" style="color:#0f6ba8;">set up the MCP server →</a>'),
        "bands": [(9000, "up to approx. 9,000 BTU"), (11000, "9,000–11,000 BTU"),
                  (13500, "11,000–13,500 BTU"), (0, "over 13,500 BTU")],
        "big": ("At this room size a portable monoblock is at its limit — we have no unit "
                "here we could honestly recommend for it. A fitted split system or two "
                "smaller units are the realistic options."),
        # No EN split guide exists yet, so the EN result routes nowhere and says so.
        "bigcta": None,
    },
}


def sizer_block(en=False, prefill=20):
    t = SIZER_TXT[en]
    opts = "".join(f'<option value="{v}"{" selected" if v == "1" else ""}>{lbl}</option>'
                   for v, lbl in t["opts"])
    full = "/en/guide/how-many-btu-do-i-need.html" if en else "/guide/btu-rechner.html"
    loc = "en-GB" if en else "de-DE"
    b0, b1, b2, b3 = [x[1] for x in t["bands"]]
    # "ca." is German; the EN panel had been printing it since the sizer shipped.
    APPROX = repr("approx. " if en else "ca. ")
    _bc = t.get("bigcta")
    BIGCTA_HTML = (f'<a href="{_bc[0]}" style="background:#0f6ba8;color:#fff;font-weight:800;'
                   f'padding:9px 15px;border-radius:8px;text-decoration:none;font-size:13.5px;">'
                   f'{_bc[1]}</a>') if _bc else ""
    return ('<!--EB_SIZER--><section style="max-width:1000px;margin:18px auto 0;padding:0 20px;">'
            '<div style="background:#f7fafc;border:1px solid #cfe0ea;border-radius:12px;padding:16px 18px;">'
            f'<strong style="font-size:16.5px;display:block;margin-bottom:2px;">{t["h"]}</strong>'
            f'<p style="margin:0 0 12px;color:#5b6b78;font-size:13.5px;">{t["sub"]}</p>'
            '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;">'
            f'<div style="flex:1 1 130px;"><label for="eb-sz-qm" style="display:block;font-weight:700;'
            f'font-size:12px;margin-bottom:4px;">{t["qm"]}</label>'
            f'<input id="eb-sz-qm" type="number" value="{prefill}" min="4" max="120" inputmode="numeric" '
            'style="width:100%;padding:9px 11px;border:1px solid #cfd8e0;border-radius:8px;font-size:16px;'
            'background:#fff;color:#1a2733;"></div>'
            f'<div style="flex:1 1 200px;"><label for="eb-sz-sun" style="display:block;font-weight:700;'
            f'font-size:12px;margin-bottom:4px;">{t["sun"]}</label>'
            '<select id="eb-sz-sun" style="width:100%;padding:9px 11px;border:1px solid #cfd8e0;'
            'border-radius:8px;font-size:16px;background:#fff;color:#1a2733;font-family:inherit;">'
            f'{opts}</select></div>'
            '<div style="flex:0 0 auto;"><button type="button" id="eb-sz-go" style="background:#0f6ba8;'
            'color:#fff;border:none;padding:11px 20px;border-radius:8px;font-size:14.5px;font-weight:800;'
            f'cursor:pointer;">{t["go"]}</button></div></div>'
            '<div id="eb-sz-res" style="display:none;margin-top:13px;background:#eaf6ff;'
            'border:1px solid #cfe6fa;border-radius:10px;padding:14px 16px;"></div>'
            '</div></section>\n<script>(function(){'
            'var q=document.getElementById("eb-sz-qm"),s=document.getElementById("eb-sz-sun"),'
            'b=document.getElementById("eb-sz-go"),r=document.getElementById("eb-sz-res");'
            'if(!q||!b||!r)return;'
            'function calc(user){'
            'var qm=Math.max(4,Math.min(120,parseFloat(q.value)||20)),sun=parseFloat(s.value)||1;'
            # identical to /guide/btu-rechner.html at its own defaults
            'var btu=Math.round(qm*340*sun/500)*500,model,term,url,test,label,big=false;'
            # url is resolved HERE, at build time, through amazon_url() — the same
            # helper the server-rendered cards use. Before 2026-08-29 this block
            # concatenated its own s?k= search URL in the browser, which is why the
            # ASIN pass of 2026-08-28 (261 card links) never reached the tool
            # results: a verified product page existed and the widget with 95 % of
            # all measured tool use still shipped readers to a search box.
            # test = the model's own Test-Überblick, so the pick carries evidence at
            # the moment of decision. German only: no EN test pages exist, and we do
            # not link a reader to a page they cannot read.
            'if(btu<=9000){model="Comfee MPPH-09CRN7";term="Comfee+MPPH-09CRN7";'
            'url=' + repr(amazon_url("Comfee+MPPH-09CRN7", "Comfee MPPH-09CRN7")) + ';'
            + ('test="";' if en else 'test="/guide/comfee-mpph-09crn7-test.html";')
            + 'label=' + repr(b0) + ';}'
            'else if(btu<=11000){model="De\'Longhi Pinguino PAC EX105";term="De%27Longhi+Pinguino+PAC+EX105";'
            'url=' + repr(amazon_url("De%27Longhi+Pinguino+PAC+EX105", "De'Longhi Pinguino PAC EX105")) + ';'
            + ('test="";' if en else 'test="/guide/pinguino-pac-ex105-test.html";')
            + 'label=' + repr(b1) + ';}'
            'else if(btu<=13500){model="Klarstein Kraftwerk Smart 12K";'
            'term="Klarstein+Kraftwerk+Smart+12K";'
            'url=' + repr(amazon_url("Klarstein+Kraftwerk+Smart+12K", "Klarstein Kraftwerk Smart 12K")) + ';'
            + ('test="";' if en else 'test="/guide/klarstein-kraftwerk-smart-12k-test.html";')
            + 'label=' + repr(b2) + ';}'
            # Above the ladder we sell nothing. term="" switches the result panel
            # from an Amazon button to the honest sentence (+ a route, where one exists).
            'else{model="";term="";url="";test="";big=true;label=' + repr(b3) + ';}'
            'var qp=qm<=12?10:qm<=17?15:qm<=22?20:qm<=27?25:qm<=35?30:40;'
            'var grid=document.getElementById("eb-models");'
            'var second=grid?\'<a href="#eb-models" style="background:#fff;color:#0a4d7a;border:1px solid '
            '#cfe0ea;font-weight:700;padding:9px 14px;border-radius:8px;text-decoration:none;font-size:13.5px;">\''
            '+' + repr(t["grid"]) + '+\'</a>\':' +
            ('""' if en else
             '\'<a href="/guide/klimaanlage-\'+qp+\'-qm.html" style="background:#fff;color:#0a4d7a;'
             'border:1px solid #cfe0ea;font-weight:700;padding:9px 14px;border-radius:8px;'
             'text-decoration:none;font-size:13.5px;">\'+' + repr(t["area"]) + '.replace("%d",qp)+\'</a>\'') + ';'
            'r.innerHTML=\'<div style="font-size:13px;color:#4a5a67;">\'+' + repr(t["for"]) + '+\' \'+qm+\' m²</div>\''
            '+\'<div style="font-size:26px;font-weight:800;color:#0a4d7a;line-height:1.2;">\'+' + APPROX
            + f'+btu.toLocaleString("{loc}")+\' BTU</div>\''
            '+(big?(\'<div style="margin:7px 0 0;font-size:14px;">\'+' + repr(t["cls"]) + '+\' (\'+label+\')</div>\''
            '+\'<p style="margin:7px 0 0;font-size:13.5px;color:#3d4d5a;">\'+' + repr(t["big"]) + '+\'</p>\')'
            ':(\'<div style="margin:7px 0 0;font-size:14px;">\'+' + repr(t["cls"]) + '+\' (\'+label+\'): <strong>\'+model+\'</strong>\''
            '+\' — \'+' + repr(t["nodrill"]) +
            '+(test?\' · <a href="\'+test+\'" style="font-size:13px;color:#0f6ba8;">Was sagen die Tests?</a>\':"")+\'</div>\'))'
            '+\'<div style="margin:11px 0 0;display:flex;gap:8px;flex-wrap:wrap;">\''
            '+(big?' + repr(BIGCTA_HTML) + ':\'<a href="\'+url+\'" target="_blank" '
            'rel="sponsored noopener" style="background:#f59e0b;color:#1a2733;font-weight:800;padding:9px 15px;'
            'border-radius:8px;text-decoration:none;font-size:13.5px;">\'+' + repr(t["amz"]) + '+\'</a>\')'
            '+second'
            f'+\'<a href="{full}" style="background:#fff;color:#0a4d7a;border:1px solid #cfe0ea;font-weight:700;'
            'padding:9px 14px;border-radius:8px;text-decoration:none;font-size:13.5px;">\'+' + repr(t["full"]) + '+\'</a></div>\''
            '+\'<p style="margin:9px 0 0;font-size:11.5px;color:#5b6b78;">\'+' + repr(t["note"]) + '+\'</p>\''
            '+\'<p style="margin:5px 0 0;font-size:11.5px;color:#5b6b78;">\'+' + repr(t["mcp"]) + '+\'</p>\';'
            'r.style.display="block";'
            # Telemetry only for a calculation the reader asked for. The block
            # renders one on load so the answer is simply there, and counting
            # that as a "tool use" would turn every page view into a fake one.
            'if(user&&window.gtag)gtag("event","btu_calc",{source:"guide",qm:qm,btu:btu});}'
            'b.addEventListener("click",function(){calc(true);});'
            'q.addEventListener("keydown",function(e){if(e.key==="Enter")calc(true);});'
            's.addEventListener("change",function(){calc(true);});'
            # A reader who already saved a room shouldn't retype it.
            'try{var saved=window.ebReadRoom&&window.ebReadRoom();if(saved&&saved.qm)q.value=String(saved.qm);}catch(e){}'
            # Show the answer without being asked. Every tool use ever recorded
            # on this site happened on the dedicated calculator page; the inline
            # forms on the homepage and on 64 guide pages produced zero in a
            # week, because a reader on a guide page wants an answer, not a
            # form. So the block computes for the prefilled size on load and the
            # field becomes a way to adjust it, not a gate in front of it.
            'calc(false);'
            '})();</script><!--/EB_SIZER-->\n')


# Pages that already run their own calculator (seal length, hose length, BTU) —
# a second one competes for the same attention instead of adding an answer.
SIZER_SKIP = {"btu-rechner", "btu-calculator", "wie-viel-btu-fuer-wie-viel-qm"}


def inject_sizer(html, slug, en=False):
    """Idempotently put the room-sizing tool right above the model grid on
    air-conditioner guide pages."""
    # Membership is tested against the page sets, not against injected markers:
    # the seal/hose tools are injected later in the same pass, so a marker test
    # would answer differently on the first and second run.
    own_tool = (SEALFIT_PAGES_EN | HOSEFIT_PAGES_EN) if en else (SEALFIT_PAGES_DE | HOSEFIT_PAGES_DE)
    eligible = (device_of(slug) == "ac" and slug not in SKIP_MODELS and slug not in SIZER_SKIP
                and slug not in CONTEXT_MODELS and slug not in own_tool)
    if not eligible:
        return re.sub(r'<!--EB_SIZER-->.*?<!--/EB_SIZER-->\n?', '', html, flags=re.S)
    m = re.search(r'-(\d{1,3})-qm$', slug)
    prefill = int(m.group(1)) if m and 4 <= int(m.group(1)) <= 120 else 20
    block = sizer_block(en, prefill)
    if "<!--EB_SIZER-->" in html:
        return re.sub(r'<!--EB_SIZER-->.*?<!--/EB_SIZER-->\n?', lambda mm: block, html, flags=re.S)
    if "<!--EB_MODELS-->" in html:
        return html.replace("<!--EB_MODELS-->", block + "<!--EB_MODELS-->", 1)
    if re.search(r'<h2\b', html):
        return re.sub(r'(<h2\b)', lambda mm: block + mm.group(1), html, count=1)
    return html


def inject_radar(html, radar=RADAR):
    """Idempotently add the compact Hitze-Radar opt-in just above the footer."""
    if "<!--EB_RADAR-->" in html:
        # Was insert-only, and it was the last injector still returning the page
        # untouched — the same bug fixed for the nav (2026-08-26) and the sticky
        # bar (2026-08-27). The cost here was an honesty one, not a cosmetic one:
        # the "Der Versand ist noch im Aufbau — bis er steht, bekommst du keine
        # E-Mails" disclaimer was added to this opt-in on 2026-08-06 and never
        # reached a single already-built page, so 85 of the 112 radar-bearing
        # German guide pages kept promising heat alerts the site cannot yet send.
        return re.sub(r'<!--EB_RADAR-->.*?<!--/EB_RADAR-->\n?', lambda m: radar, html, flags=re.S)
    if "<!--EB_FOOTER-->" in html:
        return html.replace("<!--EB_FOOTER-->", radar + "<!--EB_FOOTER-->", 1)
    return html.replace("</body>", radar + "</body>", 1)

def main():
    os.makedirs(KAT, exist_ok=True)
    arts = collect_articles()
    for key, _, _ in CATEGORIES:
        open(os.path.join(KAT, f"{key}.html"), "w", encoding="utf-8").write(hub_page(key, arts[key]))
    print(f"hubs: " + ", ".join(f"{k}({len(arts[k])})" for k, _, _ in CATEGORIES))

    processed = 0
    targets = ([os.path.join(SITE, f) for f in os.listdir(SITE) if f.endswith(".html") and f != "404.html"]
               + glob.glob(os.path.join(GUIDE, "*.html"))
               + glob.glob(os.path.join(KAT, "*.html")))
    for path in targets:
        html = open(path, encoding="utf-8").read()
        new = inject_chrome(html)
        new = inject_search(new)
        new = inject_track(new)
        new = inject_profile(new)
        new = inject_share(new)
        if os.path.basename(path) == "index.html" and os.path.dirname(path) == SITE:
            new = inject_heatnow(new)
            new = inject_home_toppick(new)
            new = inject_home_tool(new)
            new = inject_home_tiles(new)
            new = inject_home_storage(new)
            new = inject_poplive(new)
        # Transaction layer + compact opt-in only on guide pages (where SEO
        # traffic lands), not on the homepage, legal pages, or /hitze-radar.html.
        if os.path.dirname(path) == GUIDE:
            slug = os.path.basename(path)[:-5]
            title = h1(new) or slug
            url = canonical(new) or f"https://getecoback.com/guide/{slug}.html"
            new = inject_crumb_trust(new, cat_of(slug), title, url)
            new = inject_usmarket(new, slug)
            new = inject_usswitch(new)
            new = inject_models(new, slug)
            new = inject_sizer(new, slug)
            new = inject_toppick(new, slug)
            new = inject_explainer(new, slug)
            new = inject_energy(new, slug)
            new = inject_video(new, slug)
            if device_of(slug) == "ac":
                new = inject_heatnow(new, slug)
            else:
                new = strip_heatnow(new)
            if device_of(slug) == "storage":
                new = inject_stromnow(new)
            # The humidity/mould family gets the autumn live number. Deliberately
            # NOT the ac pages: they already carry EB_HEATNOW, and two weather
            # bands stacked on one page is noise, not information.
            # device_of() reads "klimaanlage"/"hitze" first, so some of the mould
            # pages come back as ac and would have ended up with both bands —
            # caught in the build, not in review.
            if (device_of(slug) == "dehum" or slug in FEUCHTE_EXTRA) and "<!--EB_HEATNOW-->" not in new:
                new = inject_feuchtenow(new)
            else:
                new = strip_feuchtenow(new)
            new = inject_sealfit(new, slug)
            new = inject_hosefit(new, slug)
            new = inject_quickpick(new, slug)
            new = inject_embed(new, slug)
            new = inject_heatenergy(new, slug)
            new = inject_sticky(new)
            new = inject_radar(new)
            new = inject_climate(new, slug)
            new = inject_popup(new, slug)
        # The US switch is not part of the transaction layer, and sitting inside
        # that guide-only block is what kept it off 127 amazon.de links for the
        # twelve days after it shipped (2026-08-28 → 09-09): the English homepage
        # (11 links, where North-American readers actually land), the German
        # homepage (25) and the four category hubs (16). It exists so a reader in
        # America is not handed a German storefront, which is true wherever an
        # amazon.de search link appears — so the condition is the link, not the
        # directory. Idempotent, and inert on pages without such a link.
        if "amazon.de/s?k=" in new:
            new = inject_usswitch(new)
        if new != html:
            open(path, "w", encoding="utf-8").write(new)
            processed += 1
    print(f"chrome injected/updated on {processed} German pages (404 skipped)")

    en_processed = 0
    en_targets = glob.glob(os.path.join(SITE, "en", "*.html")) + glob.glob(os.path.join(SITE, "en", "guide", "*.html"))
    for path in en_targets:
        html = open(path, encoding="utf-8").read()
        new = inject_chrome(html, nav=EN_NAV, footer=EN_FOOTER)
        new = inject_search(new)
        new = inject_track(new)
        new = inject_profile(new)
        new = inject_share(new)
        # Transaction layer + English opt-in only on /en/guide/ pages.
        if os.path.dirname(path) == os.path.join(SITE, "en", "guide"):
            slug = os.path.basename(path)[:-5]
            title = h1(new) or slug
            url = canonical(new) or f"https://getecoback.com/en/guide/{slug}.html"
            new = inject_crumb_trust(new, "klimaanlagen", title, url, en=True)
            if device_of(slug) == "ac":
                new = inject_heatnow_en(new)
            new = inject_usmarket(new, slug)
            new = inject_usswitch(new)
            new = inject_models(new, slug, en=True)
            new = inject_us_shelf(new, slug)
            new = inject_sizer(new, slug, en=True)
            new = inject_toppick(new, slug, en=True)
            new = inject_explainer(new, slug, en=True)
            new = inject_sealfit(new, slug, en=True)
            new = inject_hosefit(new, slug, en=True)
            new = inject_quickpick(new, slug, en=True)
            new = inject_video(new, slug, en=True)
            new = inject_sticky(new, EN_STICKY)
            new = inject_radar(new, radar=EN_RADAR)
            new = inject_popup(new, slug, en=True)
        # Same reason as in the German loop: the switch follows the amazon.de
        # link, not the /en/guide/ directory — the English homepage carries 11 of
        # them and had none of it until 2026-09-09.
        if "amazon.de/s?k=" in new:
            new = inject_usswitch(new)
        if new != html:
            open(path, "w", encoding="utf-8").write(new)
            en_processed += 1
    print(f"English chrome injected/updated on {en_processed} /en/ pages")

if __name__ == "__main__":
    main()
