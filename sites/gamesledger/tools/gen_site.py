# -*- coding: utf-8 -*-
"""Generate the Games Ledger static site from official Steam data.

Every page is a dated verdict with a pre-registered flip rule, built only from
data/concurrents.json (Valve official API, written by CI) + data/games.json
(curated metadata + per-game honesty caveat). Games without a valid sample are
excluded, never estimated. SITE_URL is the single point to change when the
owner attaches the real domain.
"""
import json, os, html, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, "site")
SITE_URL = "https://gamesledger.tuoqiantu.workers.dev"  # ← swap once when domain lands
SITE_NAME = "Games Ledger"
TODAY = datetime.datetime.utcnow().strftime("%Y-%m-%d")

BANDS = [
    (100000, "Emphatically alive", "No — emphatically not dead."),
    (20000, "Alive and healthy", "No — not dead."),
    (2000, "Alive, mid-size population", "No — not dead, with a mid-size population."),
    (300, "Small but active", "Not dead, but it is small."),
    (50, "Niche — expect slower matchmaking", "Mostly — a niche population remains."),
    (0, "Nearly empty on Steam", "On Steam, effectively yes."),
]


def band_of(n):
    for floor, label, verdict in BANDS:
        if n >= floor:
            return label, verdict
    return BANDS[-1][1], BANDS[-1][2]


STYLE = """*{box-sizing:border-box;margin:0;padding:0}
body{background:#0b0c0e;color:#e8e9ec;font-family:Inter,-apple-system,'Segoe UI',sans-serif;font-size:16px;line-height:1.7}
a{color:#6ea8fe;text-decoration:none}a:hover{opacity:.85}
header{border-bottom:1px solid rgba(255,255,255,.08);padding:14px 20px;display:flex;gap:10px;align-items:center}
.dot{width:9px;height:9px;border-radius:50%;background:#41d18f}
main{max-width:760px;margin:0 auto;padding:2.2rem 1.2rem 4rem}
h1{font-size:clamp(1.5rem,4vw,2.1rem);line-height:1.2;margin-bottom:1rem}
h2{font-size:1.15rem;margin:2rem 0 .8rem}
p{margin-bottom:.9rem}
.capsule{background:#121418;border:1px solid rgba(255,255,255,.09);border-left:3px solid #41d18f;border-radius:0 10px 10px 0;padding:1rem 1.2rem;margin-bottom:1.4rem}
.big{font-size:34px;font-weight:800;font-variant-numeric:tabular-nums}
.muted{color:#9aa1ad;font-size:13px}
table{width:100%;border-collapse:collapse;font-size:14px;background:#121418;border:1px solid rgba(255,255,255,.08);border-radius:10px;overflow:hidden;margin:1rem 0}
th,td{text-align:left;padding:9px 11px;border-bottom:1px solid rgba(255,255,255,.07)}
th{color:#9aa1ad;font-size:11px;text-transform:uppercase;letter-spacing:.05em}
tr:last-child td{border-bottom:none}
.num{font-variant-numeric:tabular-nums;text-align:right}
.faq-q{font-weight:600;margin:1.1rem 0 .3rem}
footer{border-top:1px solid rgba(255,255,255,.08);color:#9aa1ad;font-size:12px;text-align:center;padding:22px}
.warn{background:rgba(232,160,64,.08);border:1px solid rgba(232,160,64,.35);border-radius:10px;padding:.8rem 1rem;margin:1rem 0;font-size:14px}
@media(max-width:640px){table{display:block;overflow-x:auto;white-space:nowrap}}"""


def head(title, desc, path, ld):
    return f"""<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{html.escape(title)}</title>
<meta name="description" content="{html.escape(desc)}">
<link rel="canonical" href="{SITE_URL}{path}">
<meta property="og:site_name" content="{SITE_NAME}"><meta property="og:title" content="{html.escape(title)}">
<meta property="og:description" content="{html.escape(desc)}"><meta property="og:type" content="article">
<meta property="og:url" content="{SITE_URL}{path}">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%230b0c0e'/%3E%3Ccircle cx='16' cy='16' r='6' fill='%2341d18f'/%3E%3C/svg%3E">
<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>
<style>{STYLE}</style></head><body>
<header><span class="dot"></span><a href="/" style="color:#e8e9ec;font-weight:600">{SITE_NAME}</a>
<span class="muted">· official numbers or no numbers</span></header><main>"""

FOOT = f"""</main><footer>{SITE_NAME} · Every count is Valve's official API or it is not published here ·
<a href="/methodology">Methodology</a> · Not affiliated with Valve or any studio</footer></body></html>"""


def stats(hist):
    ns = [h["n"] for h in hist]
    last = hist[-1]
    n7 = ns[-7:]
    return {"now": last["n"], "t": last.get("t", last["d"]), "d7_avg": round(sum(n7) / len(n7)),
            "d7_min": min(n7), "d7_max": max(n7), "days": len(ns)}


def game_page(g, rec):
    s = stats(rec["history"])
    label, verdict = band_of(s["d7_avg"])
    name, slug = g["name"], g["slug"]
    title = f"Is {name} Dead? Official Steam Numbers ({TODAY[:4]})"
    desc = (f"{verdict} {name} averaged {s['d7_avg']:,} concurrent Steam players over the last "
            f"{min(s['days'],7)} sample day(s) (Valve official API). Graded verdict with flip rule.")[:155]
    faq = [
        (f"Is {name} dead?",
         f"{verdict} Over the last {min(s['days'],7)} sampled day(s), {name} averaged {s['d7_avg']:,} concurrent players "
         f"in-game on Steam (latest sample: {s['now']:,} at {s['t']} UTC), measured by Valve's official API. "
         f"Verdict band: {label}. {g['caveat']}"),
        (f"How many people play {name} right now?",
         f"The latest official sample is {s['now']:,} concurrent Steam players ({s['t']} UTC). This page re-samples daily "
         f"and never publishes estimates: if Valve's API returns no number, this page says so instead."),
        ("Why do other sites show different player counts?",
         "Most 'player count' sites publish unlabeled estimates or invented monthly-active figures with no source. "
         "This ledger uses one source only — Valve's public GetNumberOfCurrentPlayers API — and states platform "
         "coverage limits explicitly instead of guessing."),
    ]
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "Article", "headline": f"Is {name} dead? Official Steam numbers", "datePublished": "2026-08-22",
         "dateModified": TODAY, "author": {"@type": "Organization", "name": SITE_NAME},
         "publisher": {"@type": "Organization", "name": SITE_NAME, "url": SITE_URL + "/"}, "description": desc},
        {"@type": "FAQPage", "mainEntity": [
            {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faq]},
    ]}
    rows = "".join(f"<tr><td>{h['d']}</td><td class='num'>{h['n']:,}</td></tr>" for h in rec["history"][-14:][::-1])
    faq_html = "".join(f"<div class='faq-q'>{html.escape(q)}</div><p>{html.escape(a)}</p>" for q, a in faq)
    return head(title, desc, f"/is-{slug}-dead", ld) + f"""
<h1>Is {name} dead?</h1>
<div class="muted" style="margin-bottom:1rem">Updated {TODAY} · re-sampled daily · verdict flips only when the 7-day average crosses a published band</div>
<div class="capsule"><strong>{verdict}</strong><br>
<span class="big">{s['now']:,}</span> <span class="muted">players in-game on Steam · official Valve API · {s['t']} UTC</span><br>
<span class="muted">7-day sampled average {s['d7_avg']:,} (range {s['d7_min']:,}–{s['d7_max']:,}) · band: <strong>{label}</strong></span></div>
<div class="warn"><strong>What this number does not cover:</strong> {html.escape(g['caveat'])}</div>
<h2>Recent official samples</h2>
<table><thead><tr><th>Date (UTC)</th><th class="num">Concurrent players</th></tr></thead><tbody>{rows}</tbody></table>
<p class="muted">Source: Valve, ISteamUserStats/GetNumberOfCurrentPlayers (public API), sampled once daily by this site's
pipeline. History depth grows daily; {s['days']} sample day(s) on record so far. No estimates, no third-party numbers.</p>
<h2>The verdict rule (pre-registered)</h2>
<p>The verdict re-grades automatically when the 7-day average crosses a band boundary:
≥100k emphatic · ≥20k healthy · ≥2k mid-size · ≥300 small-but-active · ≥50 niche · &lt;50 nearly empty (Steam).
{html.escape(g['genre'].capitalize())}, released {g['released']}. A verdict change shows up here the day it happens — no
editorial discretion involved.</p>
<h2>Frequently asked questions</h2>{faq_html}
<h2>More verdicts</h2><p><a href="/">All games on the ledger →</a></p>""" + FOOT


def index_page(entries):
    rows = "".join(
        f"<tr><td><a href='/is-{e['slug']}-dead'><b>{html.escape(e['name'])}</b></a></td>"
        f"<td class='num'>{e['now']:,}</td><td class='num'>{e['d7_avg']:,}</td><td>{html.escape(e['label'])}</td></tr>"
        for e in sorted(entries, key=lambda x: -x["d7_avg"]))
    desc = f"Live 'is it dead?' verdicts for {len(entries)} games from Valve's official concurrent-player API. No estimates — official numbers or no numbers."
    ld = {"@context": "https://schema.org", "@type": "Dataset", "name": "Games Ledger — official Steam concurrent players",
          "description": desc, "url": SITE_URL + "/", "license": "https://creativecommons.org/licenses/by/4.0/",
          "creator": {"@type": "Organization", "name": SITE_NAME}, "dateModified": TODAY}
    return head(f"Is It Dead? Official Steam Player Verdicts — {SITE_NAME}", desc, "/", ld) + f"""
<h1>Is it dead? Official numbers or no numbers.</h1>
<p>Most player-count sites publish invented estimates. This ledger publishes one thing: <strong>Valve's official
concurrent-player API</strong>, sampled daily, with a graded verdict and a pre-registered flip rule per game — and an
explicit note on what each number does <em>not</em> cover (consoles, other launchers).</p>
<div class="capsule">Updated <strong>{TODAY}</strong> · {len(entries)} games tracked · <a href="/methodology">methodology & bands</a> · raw data: <a href="/concurrents.json">concurrents.json</a> (CC BY 4.0)</div>
<table><thead><tr><th>Game</th><th class="num">Now</th><th class="num">7-day avg</th><th>Verdict band</th></tr></thead><tbody>{rows}</tbody></table>
<p class="muted">"Now" = latest daily sample, not a live socket. Console/other-launcher populations are explicitly out of
scope per game — see each page's coverage note.</p>""" + FOOT


def methodology_page():
    desc = "One source (Valve's official API), one sample cadence, published verdict bands, and an exclusion rule instead of estimates."
    ld = {"@context": "https://schema.org", "@type": "Article", "headline": "Games Ledger methodology",
          "dateModified": TODAY, "description": desc,
          "publisher": {"@type": "Organization", "name": SITE_NAME, "url": SITE_URL + "/"}}
    bands = "".join(f"<tr><td class='num'>≥{floor:,}</td><td>{label}</td></tr>" for floor, label, _ in BANDS[:-1]) \
        + f"<tr><td class='num'>&lt;50</td><td>{BANDS[-1][1]}</td></tr>"
    return head("Methodology — official numbers or no numbers", desc, "/methodology", ld) + f"""
<h1>Methodology</h1>
<p><strong>One source.</strong> Every number is Valve's public <code>GetNumberOfCurrentPlayers</code> endpoint, sampled
once daily by an auditable pipeline (open repo). If the API returns an error for a game, that game's page is excluded
that day — we never interpolate, estimate, or copy third-party figures.</p>
<p><strong>Concurrent ≠ monthly.</strong> We publish concurrent in-game players — the only number Valve makes public.
Sites quoting "monthly active users" for Steam games without a publisher source are guessing; that is the supply this
ledger exists to displace.</p>
<p><strong>Coverage limits are stated, not hidden.</strong> Steam numbers exclude consoles and other PC launchers.
Every game page carries an explicit note on what its number does not cover.</p>
<h2>Verdict bands (7-day sampled average)</h2>
<table><thead><tr><th class="num">Average</th><th>Band</th></tr></thead><tbody>{bands}</tbody></table>
<p>Bands are fixed and public; verdicts re-grade automatically when the average crosses a boundary. Disagreements with
the banding are arguments about the rule — which is exactly where such arguments belong.</p>
<p class="muted">Data: <a href="/concurrents.json">concurrents.json</a>, CC BY 4.0 with attribution to {SITE_NAME}.</p>""" + FOOT


def main():
    games = json.load(open(os.path.join(ROOT, "data", "games.json"), encoding="utf-8"))["games"]
    store = json.load(open(os.path.join(ROOT, "data", "concurrents.json"), encoding="utf-8"))
    os.makedirs(SITE, exist_ok=True)
    entries = []
    skipped = []
    for g in games:
        rec = store["samples"].get(str(g["appid"]))
        if not rec or not rec.get("history"):
            skipped.append(g["slug"])
            continue
        s = stats(rec["history"])
        label, _ = band_of(s["d7_avg"])
        entries.append({**g, **s, "label": label})
        open(os.path.join(SITE, f"is-{g['slug']}-dead.html"), "w", encoding="utf-8").write(game_page(g, rec))
    open(os.path.join(SITE, "index.html"), "w", encoding="utf-8").write(index_page(entries))
    open(os.path.join(SITE, "methodology.html"), "w", encoding="utf-8").write(methodology_page())
    # machine-readable surfaces
    json.dump(store, open(os.path.join(SITE, "concurrents.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    urls = ["/", "/methodology"] + [f"/is-{e['slug']}-dead" for e in entries]
    open(os.path.join(SITE, "sitemap.xml"), "w", encoding="utf-8").write(
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "".join(f"  <url><loc>{SITE_URL}{u}</loc><lastmod>{TODAY}</lastmod></url>\n" for u in urls) + "</urlset>\n")
    open(os.path.join(SITE, "robots.txt"), "w", encoding="utf-8").write(
        f"User-agent: *\nAllow: /\nSitemap: {SITE_URL}/sitemap.xml\n")
    open(os.path.join(SITE, "llms.txt"), "w", encoding="utf-8").write(
        f"# {SITE_NAME}\n\n> Dated 'is this game dead?' verdicts from Valve's official concurrent-player API — "
        "one source, daily samples, published verdict bands, explicit platform-coverage notes, no estimates ever. "
        "Raw dataset at /concurrents.json (CC BY 4.0).\n\n"
        + "".join(f"- [{e['name']}]({SITE_URL}/is-{e['slug']}-dead): {e['d7_avg']:,} avg concurrent (7d, Steam official), band: {e['label']}\n" for e in sorted(entries, key=lambda x: -x['d7_avg'])))
    print(f"built {len(entries)} game pages (+index/methodology), skipped (no valid data): {skipped or 'none'}")


if __name__ == "__main__":
    main()
