#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Give the site's open dataset a landing page, so a machine can find it.

Why this exists (2026-09-16). sizing-data.json has been live and CC BY 4.0
licensed since 2026-08-31 — the site's own sizing rules (340 BTU/m², the 13.500
BTU monoblock ceiling, the 60 % mould threshold, three room-size ladders). It is
served at /sizing-data.json, returns 200, and is linked from exactly ONE page
(for-agents.html).

What it does not have is any way to be discovered. There is no schema.org
Dataset markup anywhere on this site, and a bare JSON file with no HTML landing
page is invisible to Google Dataset Search — the one discovery surface built
specifically for datasets, which indexes automatically, needs no account, no
outreach and nobody's permission. For a 70-day-old domain with zero inbound
links, a surface that does not require anyone to say yes is worth more than one
that does.

This is also the only link-earning shape this site has that is not a consumer
guide. Guides do not get cited; numbers do. The dataset is the site's own
derived work — not scraped, not republished from a licensed source — so it can
be given away under CC BY, and CC BY attribution is a link by construction.

Single source of truth: every figure rendered here is read from
site/sizing-data.json at build time. The page cannot drift from the dataset
because it has no independent copy of any number — check_dataset.py asserts
that, and asserts the JSON-LD parses and carries the fields Dataset Search
requires.

Deliberately NOT included: the Google Trends seasonality files. Those are
derived from a source whose redistribution terms this repo has not verified,
and the whole point of this page is that everything on it is ours to give away.

Run: python3 tools/build_dataset_page.py   (idempotent, byte-stable)
"""
import csv
import io
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, "site")
DATA = os.path.join(SITE, "sizing-data.json")
OUT = os.path.join(SITE, "daten.html")
CSV_OUT = os.path.join(SITE, "sizing-data.csv")
BASE = "https://getecoback.com"

TITLE = "Raumklima-Dimensionierungsdaten als offener Datensatz"
DESC = ("Die Faustregeln und Größenleitern von getecoback.com als offener Datensatz: "
        "BTU je m², Watt je m², Liter pro Tag, Schimmel-Schwelle. CC BY 4.0, als JSON.")

STYLE = """  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; color:#1a2733; line-height:1.65; background:#f7fafc; }
  .wrap { max-width:820px; margin:0 auto; padding:0 20px; }
  header { background:linear-gradient(135deg,#0f6ba8,#0a4d7a); color:#fff; padding:40px 0 34px; }
  header a { color:rgba(255,255,255,.85); font-size:14px; text-decoration:none; }
  header h1 { font-size:clamp(24px,4vw,34px); margin:14px 0 8px; }
  header p { color:rgba(255,255,255,.9); }
  article { padding:36px 0 20px; }
  article h2 { font-size:21px; margin:30px 0 10px; }
  article p { margin-bottom:14px; color:#26333d; }
  article ul { margin:0 0 16px 22px; color:#26333d; }
  article li { margin-bottom:8px; }
  a { color:#0f6ba8; }
  table.ds { width:100%; border-collapse:collapse; margin:14px 0; font-size:14.5px; }
  table.ds th, table.ds td { border:1px solid #e4ebf0; padding:8px 11px; text-align:left; }
  table.ds th { background:#eef4f8; font-weight:800; }
  .lic { background:#eefaf3; border:1px solid #cdeede; border-radius:10px; padding:14px 18px; margin:18px 0; font-size:14.5px; }
  .cite { background:#fff; border:1px solid #e4ebf0; border-radius:10px; padding:14px 18px; margin:14px 0; font-size:14px; font-family:ui-monospace,SFMono-Regular,Menlo,monospace; overflow-x:auto; }
  footer { text-align:center; color:#5b6b78; font-size:13px; padding:30px 20px 50px; }
  @media(max-width:560px){ table{display:block;overflow-x:auto;max-width:100%} }
"""


def ladder_table(rows, value_key, value_head):
    head = f'<table class="ds"><tr><th>Raumgröße</th><th>{value_head}</th><th>Typischer Raum</th><th>Ratgeber</th></tr>'
    body = []
    for r in rows:
        room = r.get("room", "") or ""
        guide = r.get("guide", "")
        link = f'<a href="{guide}">Seite</a>' if guide else ""
        body.append(f'<tr><td>{r["m2"]} m²</td><td>{r[value_key]}</td><td>{room}</td><td>{link}</td></tr>')
    return head + "".join(body) + "</table>"


def refresh_dataset():
    """Regenerate sizing-data.json from its own sources before reading it.

    Ordering matters and the obvious order is wrong. This page must be built
    before build_structure.py (it needs nav/footer) and before build_sitemap.py
    (it needs to be in the sitemap), but sizing-data.json is written much later
    in the pipeline by build_agent_md.py. Reading the committed copy would mean
    that the day someone edits a sizing rule, this page ships the old number
    under a CC BY licence and check_dataset.py — which runs after both — turns
    the deploy red for a change that was perfectly legitimate.

    So call the same builder here. It is idempotent and writes only on change,
    so build_agent_md.py's own later call is a no-op and drift is structurally
    impossible rather than merely asserted.
    """
    sys.path.insert(0, os.path.join(ROOT, "tools"))
    import build_agent_md
    build_agent_md.build_dataset()


def build_csv(d):
    """Same dataset, long format, one row per fact.

    JSON is what a program wants; a spreadsheet is what a person who would
    actually credit us wants, and it is the format Dataset Search understands
    as tabular. Derived from the same file as everything else, so it cannot
    disagree with the page. Rules carry no m2; ladder rows do — one shape,
    no second truth.
    """
    buf = io.StringIO(newline="")
    w = csv.writer(buf, lineterminator="\n")
    w.writerow(["section", "key", "m2", "value", "unit", "room", "guide"])
    rules = d["rules"]
    for key, unit in (("cooling_btu_per_m2", "BTU/h per m2"),
                      ("mould_threshold_rh_percent", "% RH"),
                      ("monoblock_ceiling_btu", "BTU/h"),
                      ("cost_basis_eur_per_kwh", "EUR/kWh")):
        w.writerow(["rule", key, "", rules[key], unit, "", ""])
    lo, hi = rules["heating_w_per_m2_insulated"]
    w.writerow(["rule", "heating_w_per_m2_insulated", "", f"{lo}-{hi}", "W per m2", "", ""])
    for row in d["ladders"]["cooling_btu"]:
        w.writerow(["cooling_btu", "btu_class", row["m2"], row["btu_class"], "BTU/h", "", row["guide"]])
    for row in d["ladders"]["dehumidifier_l_per_day"]:
        w.writerow(["dehumidifier_l_per_day", "liters_per_day", row["m2"], row["liters_per_day"],
                    "L/day", row["room"], row["guide"]])
    for row in d["ladders"]["heating_watt"]:
        w.writerow(["heating_watt", "watt", row["m2"], row["watt"], "W", row["room"], row["guide"]])
    payload = buf.getvalue()
    prev = open(CSV_OUT, encoding="utf-8").read() if os.path.exists(CSV_OUT) else None
    if payload != prev:
        open(CSV_OUT, "w", encoding="utf-8", newline="").write(payload)
    return payload.count("\n") - 1


def main():
    refresh_dataset()
    d = json.load(open(DATA, encoding="utf-8"))
    rules, ladders = d["rules"], d["ladders"]
    url = f"{BASE}/daten.html"
    csv_rows = build_csv(d)

    # schema.org/Dataset — the part a machine reads. Every field here is either
    # from the dataset file or a fact about this site; nothing is invented.
    ds = {
        "@context": "https://schema.org",
        "@type": "Dataset",
        "name": d["name"],
        "description": d["description"],
        "url": url,
        "license": d["license"],
        "isAccessibleForFree": True,
        "dateModified": d["dateModified"],
        "inLanguage": "de",
        "creator": {"@type": "Organization", "@id": f"{BASE}/#org",
                    "name": "EcoBack", "url": BASE + "/"},
        "publisher": {"@type": "Organization", "@id": f"{BASE}/#org",
                      "name": "EcoBack", "url": BASE + "/"},
        "distribution": [{
            "@type": "DataDownload",
            "encodingFormat": "application/json",
            "contentUrl": f"{BASE}/sizing-data.json",
        }, {
            "@type": "DataDownload",
            "encodingFormat": "text/csv",
            "contentUrl": f"{BASE}/sizing-data.csv",
        }],
        "keywords": ["Klimaanlage", "BTU", "Luftentfeuchter", "Heizleistung",
                     "Raumklima", "Schimmel", "Dimensionierung", "Raumgröße"],
        "variableMeasured": [
            {"@type": "PropertyValue", "name": "cooling_btu_per_m2",
             "value": rules["cooling_btu_per_m2"], "unitText": "BTU/h je m²"},
            {"@type": "PropertyValue", "name": "heating_w_per_m2_insulated",
             "value": " bis ".join(str(x) for x in rules["heating_w_per_m2_insulated"]),
             "unitText": "W je m²"},
            {"@type": "PropertyValue", "name": "mould_threshold_rh_percent",
             "value": rules["mould_threshold_rh_percent"], "unitText": "% relative Luftfeuchte"},
            {"@type": "PropertyValue", "name": "monoblock_ceiling_btu",
             "value": rules["monoblock_ceiling_btu"], "unitText": "BTU/h"},
            {"@type": "PropertyValue", "name": "cost_basis_eur_per_kwh",
             "value": rules["cost_basis_eur_per_kwh"], "unitText": "EUR je kWh"},
        ],
    }

    html = f"""<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{TITLE}</title>
<meta name="description" content="{DESC}">
<link rel="canonical" href="{url}">
<meta property="og:type" content="website">
<meta property="og:title" content="{TITLE}">
<meta property="og:description" content="{DESC}">
<meta property="og:url" content="{url}">
<!-- Google Analytics (GA4) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-E2V0Q9SJ9V"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments);}}gtag('js',new Date());gtag('config','G-E2V0Q9SJ9V');</script>
<style>
{STYLE}</style>
<script type="application/ld+json">{json.dumps(ds, ensure_ascii=False)}</script>
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#0a4d7a">
</head>
<body>

<header>
  <div class="wrap">
    <a href="/">← EcoBack</a>
    <h1>Dimensionierungsdaten als offener Datensatz</h1>
    <p>Die Faustregeln hinter unseren Rechnern — nachnutzbar unter CC BY 4.0, als JSON und als Tabelle.</p>
  </div>
</header>

<div class="wrap">
<article>

  <p>Jeder Rechner und jede Größenleiter auf dieser Website rechnet mit denselben Regeln. Sie stehen hier vollständig, mit Einheiten und Stand, und liegen zusätzlich als maschinenlesbare Datei bereit: <a href="/sizing-data.json">sizing-data.json</a>. Stand der Daten: {d['dateModified']}.</p>

  <div class="lic">
    <strong>Lizenz: <a href="{d['license']}" rel="license">CC BY 4.0</a>.</strong>
    Nutzung, Veränderung und Weitergabe sind erlaubt, auch kommerziell — die einzige Bedingung ist die Nennung der Quelle. Es ist kein Konto nötig, es gibt keine Abfrage&shy;begrenzung, und es kostet nichts.
  </div>

  <h2>Die Regeln</h2>
  <table class="ds">
    <tr><th>Regel</th><th>Wert</th><th>Einheit</th></tr>
    <tr><td>Kühlleistung je Fläche</td><td>{rules['cooling_btu_per_m2']}</td><td>BTU/h je m²</td></tr>
    <tr><td>Heizleistung je Fläche (gedämmt)</td><td>{rules['heating_w_per_m2_insulated'][0]}–{rules['heating_w_per_m2_insulated'][1]}</td><td>W je m²</td></tr>
    <tr><td>Schimmel-Schwelle</td><td>{rules['mould_threshold_rh_percent']}</td><td>% relative Luftfeuchte</td></tr>
    <tr><td>Obergrenze Monoblock</td><td>{rules['monoblock_ceiling_btu']}</td><td>BTU/h</td></tr>
    <tr><td>Strompreis-Annahme</td><td>{rules['cost_basis_eur_per_kwh']}</td><td>EUR je kWh</td></tr>
  </table>

  <p><strong>Zur Obergrenze:</strong> {rules['monoblock_ceiling_note']}</p>
  <p><strong>Zu den Liter-Angaben:</strong> {rules['dehumidifier_rating_note']}</p>

  <h2>Leiter 1 — Kühlleistung nach Raumgröße</h2>
  {ladder_table(ladders['cooling_btu'], 'btu_class', 'Kühlleistung')}

  <h2>Leiter 2 — Entfeuchtung nach Raumgröße</h2>
  {ladder_table(ladders['dehumidifier_l_per_day'], 'liters_per_day', 'Liter pro Tag')}

  <h2>Leiter 3 — Heizleistung nach Raumgröße</h2>
  {ladder_table(ladders['heating_watt'], 'watt', 'Watt')}

  <h2>So zitierst du den Datensatz</h2>
  <p>CC BY 4.0 verlangt genau eine Sache: die Quelle nennen. Fertig zum Kopieren, für eine Website:</p>
  <pre>&lt;p&gt;Daten: &lt;a href="{BASE}/daten.html"&gt;EcoBack Raumklima-Dimensionierungsdaten&lt;/a&gt;,
Stand {d['dateModified']}, &lt;a href="{d['license']}"&gt;CC BY 4.0&lt;/a&gt;&lt;/p&gt;</pre>
  <p>Und als Textzeile, für alles andere:</p>
  <div class="cite">EcoBack (getecoback.com): {d['name']}. Stand {d['dateModified']}. CC BY 4.0. {BASE}/daten.html</div>

  <h2>Download</h2>
  <ul>
    <li><a href="/sizing-data.json"><code>{BASE}/sizing-data.json</code></a> — JSON, vollständig, mit den Hinweistexten</li>
    <li><a href="/sizing-data.csv"><code>{BASE}/sizing-data.csv</code></a> — CSV im Langformat ({csv_rows} Zeilen), direkt in Tabellen&shy;kalkulation und Pandas</li>
  </ul>
  <p>Beides ohne Schlüssel, ohne Anmeldung, ohne Abfrage&shy;begrenzung.</p>

  <h2>Woher die Zahlen kommen, und was sie nicht sind</h2>
  <p>Es sind <strong>Faustregeln</strong>, keine Messwerte und keine Norm. Sie stammen aus den Ratgebern dieser Website und sind dort jeweils hergeleitet; die Rechner benutzen exakt dieselben Werte, damit Seite und Datei nie auseinanderlaufen können. Wer eine belastbare Auslegung für ein konkretes Gebäude braucht, rechnet nach Norm oder fragt einen Fachbetrieb — dafür sind Faustregeln nicht gedacht.</p>
  <p>Wir testen keine Geräte selbst und geben keine Rechtsberatung. Wie wir arbeiten und womit wir Geld verdienen, steht auf <a href="/wie-wir-empfehlen.html">Wie wir empfehlen</a> und <a href="/ueber-uns.html">Über uns</a>.</p>

</article>
</div>

</body>
</html>
"""
    prev = open(OUT, encoding="utf-8").read() if os.path.exists(OUT) else None
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"{'unchanged' if prev == html else 'wrote'} {os.path.relpath(OUT, ROOT)} "
          f"({len(html)} bytes, {len(ds['variableMeasured'])} variables, "
          f"{sum(len(v) for v in ladders.values())} ladder rows)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
