#!/usr/bin/env python3
"""/calibration — the evidence layer's own report card (v1 2026-08-08; v2 2026-09-26, generated from data).

v1 hard-coded every number and a DATE of 2026-08-08, then sat frozen for seven weeks while
the ledger it described kept moving. A calibration page that cannot update itself is the
opposite of what it claims to be. v2 reads:
  * sunwatch-track-record.json  — dated snapshot of invest.agiscorecard.com/api/track-record
                                   (refreshed by agi-odds.yml on the runner; never hand-edited)
  * data.json                    — the 8 verdicts and the Thesis Tracker
  * ots/manifest.json            — OpenTimestamps proofs (which records are anchored, status)
and states the one number v1 never stated: how many scored calls carry a structured
probability, i.e. the Brier-eligible n. NEVER pad n, NEVER show a curve before n>=20.
Rerun after any ledger change: python3 tools/gen_calibration.py
"""
import datetime as dt
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gen_lib as g

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLISHED = "2026-08-08"
BRIER_N = 20


def load():
    sw = json.load(open(os.path.join(ROOT, "sunwatch-track-record.json"), encoding="utf-8"))
    d = json.load(open(os.path.join(ROOT, "data.json"), encoding="utf-8"))
    man = {}
    mp = os.path.join(ROOT, "ots", "manifest.json")
    if os.path.exists(mp):
        man = json.load(open(mp, encoding="utf-8")).get("files", {})
    return sw, d, man


def stats(sw, d):
    """Pure: the numbers the page shows, all derived, none typed in."""
    ents = sw.get("entries", [])
    scored = [e for e in ents if e.get("verdict") in ("hit", "miss")]
    hits = [e for e in scored if e["verdict"] == "hit"]
    pending = [e for e in ents if e.get("verdict") == "pending"]
    brier_eligible = [e for e in scored if isinstance(e.get("odds"), (int, float))]
    open_odds = [e for e in pending if isinstance(e.get("odds"), (int, float))]
    tally = {}
    for p in d["predictions"]:
        tally[p["verdict"]] = tally.get(p["verdict"], 0) + 1
    with_flip = sum(1 for p in d["predictions"] if p.get("flip"))
    n = len(scored)
    rate = round(100 * len(hits) / n) if n else None
    # Wilson 95% interval for the hit rate (same statistic v1 quoted by hand)
    lo = hi = None
    if n:
        z = 1.96
        ph = len(hits) / n
        den = 1 + z * z / n
        cen = (ph + z * z / (2 * n)) / den
        half = z * ((ph * (1 - ph) / n + z * z / (4 * n * n)) ** 0.5) / den
        lo, hi = round(100 * (cen - half)), round(100 * (cen + half))
    return {"n_scored": n, "n_hit": len(hits), "n_pending": len(pending), "hit_rate": rate, "wilson": (lo, hi),
            "brier_eligible": len(brier_eligible), "open_odds": len(open_odds),
            "open_odds_range": (min(e["odds"] for e in open_odds), max(e["odds"] for e in open_odds)) if open_odds else None,
            "tally": tally, "with_flip": with_flip, "n_pred": len(d["predictions"]),
            "tracker": d["thesisTracker"]["score"], "tracker_asof": d["thesisTracker"]["asOf"],
            "ledger_asof": sw.get("asOf"), "fetched": sw.get("fetched", "")[:10]}


def render(s, man):
    tally = " · ".join(f"{v} {k.lower()}" for k, v in sorted(s["tally"].items(), key=lambda kv: -kv[1]))
    wl, wh = s["wilson"]
    rng = s["open_odds_range"]
    ots_rows = ""
    for fname, ents in sorted(man.items()):
        if not ents:
            continue
        last = ents[-1]
        ots_rows += (f"<tr><td><a href='/{fname}'>{fname}</a></td><td class='nowrap'>{len(ents)}</td>"
                     f"<td class='nowrap'>{last['stamped']}</td><td>{last['status']}</td>"
                     f"<td><a href='/ots/{last['proof']}'>{last['proof']}</a></td></tr>")
    ots_html = ""
    if ots_rows:
        ots_html = f"""<h2>Timestamp proofs (can this history be backdated?)</h2>
<p>No. Every version of the files below is anchored in Bitcoin through
<a href="https://opentimestamps.org/" rel="nofollow noopener">OpenTimestamps</a>: the file's SHA-256 is committed to a
Bitcoin block via public calendars, so anyone can prove the record existed, byte for byte, before that block, without
trusting this site or its git history. A proof shows <em>pending</em> until the calendar's aggregate transaction confirms,
then <em>bitcoin</em>. It proves timing only, never that a verdict is right. Index: <a href="/ots/manifest.json">/ots/manifest.json</a>.</p>
<table><thead><tr><th>Record</th><th>Versions</th><th>Latest stamped</th><th>Status</th><th>Proof</th></tr></thead><tbody>{ots_rows}</tbody></table>
<p style="font-size:13px;color:var(--muted);">Verify: <code>ots verify &lt;proof&gt; -f &lt;file&gt;</code> (client at opentimestamps.org). We issue no coin, hold no coin and pay nothing; the calendars are free public services.</p>"""
    return f"""<h2>What we grade, today</h2>
<table><thead><tr><th>Ledger</th><th>Type</th><th>Current state</th></tr></thead><tbody>
<tr><td><a href="/situational-awareness-predictions">{s['n_pred']} Situational Awareness verdicts</a></td><td>Categorical verdicts; {s['with_flip']} of {s['n_pred']} carry a written flip condition, the rest a resolution date or a stated blocker (all in <a href="/data.json">data.json</a>)</td><td>{tally} → <a href="/progress-index">Thesis Tracker {s['tracker']}/100</a> as of {s['tracker_asof']}</td></tr>
<tr><td><a href="https://invest.agiscorecard.com/track-record">SunWatch market-call ledger</a></td><td>Dated, falsifiable market calls</td><td>{s['n_scored']} scored, {s['n_hit']} hits ({s['hit_rate']}%), {s['n_pending']} pending, ledger as of {s['ledger_asof']}. n={s['n_scored']} is small: the Wilson 95% interval is roughly {wl}–{wh}%, so this is a work-in-progress sample, not proof of skill.</td></tr>
<tr><td><a href="https://invest.agiscorecard.com/red-team">Red-team survival odds</a></td><td>Editorial probabilities on open calls</td><td>{s['open_odds']} open calls carry a stated probability{f' ({rng[0]}–{rng[1]}%)' if rng else ''}; confidence cuts are published the day counter-evidence lands.</td></tr>
<tr><td><a href="/agi-prediction-markets">AGI consensus board</a></td><td>Third-party forecasts, not ours</td><td>Cross-venue median and spread, recomputable from the published snapshot; it is a reference we quote, not a call we are scored on.</td></tr>
</tbody></table>
<h2>The number nobody wants to print: Brier-eligible n = {s['brier_eligible']}</h2>
<p>A Brier score needs a stated probability <em>and</em> an outcome. Of the {s['n_scored']} scored calls, <strong>{s['brier_eligible']}</strong>
carried a structured probability at the time they were made; the rest were graded as categorical hit/miss. The {s['open_odds']} calls
that do carry a probability are still open. So the honest reading is: the hit rate above is real, the calibration curve
does not exist yet, and it cannot exist until {BRIER_N} probability-bearing calls have resolved. Every new call on the
ledger now has to carry a probability for exactly this reason.</p>
<h2>The commitment</h2>
<p>When the pool of <em>scored probability calls</em> reaches <strong>n≥{BRIER_N}</strong>, this page publishes a Brier score and a
calibration curve (stated probability vs realized frequency), recomputed on every ledger change — the same way the
<a href="/progress-index">Thesis Tracker</a> recomputes on every verdict change. The commitment is itself pre-registered
as a dated line in the public bet ledger of this site's repository; if the pool never gets there, the line settles as
<em>insufficient</em> and says so here. The forecast ledger is public and timestamped, so anyone can compute it before we do.</p>
{ots_html}
<h2>Why this page exists</h2>
<p>Every AI-era answer engine can generate confident takes; almost none can show you a scored history. Being auditable —
misses kept on the page next to hits, flip conditions registered before outcomes, probabilities graded against reality,
records anchored so they cannot be quietly rewritten — is this network's entire moat. This page is that moat made
explicit, including the part where the sample is still too small.</p>"""


def main():
    sw, d, man = load()
    s = stats(sw, d)
    day = s["fetched"] or dt.date.today().isoformat()
    faqs = [
        ("What is a Brier score?",
         "A measure of probability-forecast accuracy: the mean squared difference between stated probabilities and outcomes "
         "(0 = perfect, 0.25 = coin-flip guessing on binary events). We publish ours once scored probability calls reach n≥20."),
        ("Why not publish a calibration curve now?",
         f"Because the Brier-eligible sample is {s['brier_eligible']}: the {s['n_scored']} scored calls were graded hit/miss "
         f"without a structured probability, and the {s['open_odds']} probability-bearing calls have not resolved. Publishing a curve "
         "from that would be theater. The raw ledger is public and timestamped, so nothing is hidden in the meantime."),
        ("Who grades the calls?",
         "Outcomes are graded against pre-registered falsification conditions written before the outcome, with dated multi-source "
         "verification, and misses stay published with their lesson. The grading rules are public in the eight-layer method, "
         "including the red-team layer."),
        ("How do I check that a record was not backdated?",
         "Each version of data.json, index-history.json, the consensus board and the odds history is timestamped through "
         "OpenTimestamps; the proofs are served under /ots/ and verify against the Bitcoin blockchain with the free client. "
         "That proves when a file existed, not that it is correct."),
    ]
    related = [("/progress-index", "AGI-2027 Thesis Tracker"),
               ("/prediction-receipts", "Every dated AGI call, on the clock"),
               ("/agi-prediction-markets", "AGI consensus board"),
               ("/forecaster-leaderboard", "Forecaster leaderboard")]
    html = g.build(
        slug="calibration",
        title="Calibration: We Score Our Own Predictions in Public",
        desc=(f"Every probability the AGI Scorecard network states, inventoried: {s['n_pred']} graded verdicts, a {s['n_scored']}-call "
              f"market ledger ({s['n_hit']} hits, n small), Brier-eligible n={s['brier_eligible']}, records timestamped in Bitcoin. "
              "Brier score published at n≥20."),
        og_title="Calibration — the evidence layer's own report card",
        eyebrow="Accountability",
        h1="Calibration: we score our own predictions in public",
        capsule=('<span class="verdict">We score our own predictions in public — and the sample is still small.</span> '
                 'This page inventories every probability-shaped claim the AGI Scorecard network makes, states how many of '
                 f'them can actually be Brier-scored today (<strong>{s["brier_eligible"]}</strong>), and pre-commits to publishing a '
                 f'Brier score and calibration curve once scored probability calls reach n≥{BRIER_N}. '
                 'We would rather show a small honest n than a big fake curve.'),
        body_html=render(s, man), faqs=faqs, related=related,
    )
    html = html.replace('"datePublished": "2026-06-30", "dateModified": "2026-06-30"',
                        f'"datePublished": "{PUBLISHED}", "dateModified": "{day}"')
    visible = dt.date.fromisoformat(day).strftime("%B %-d, %Y")
    html = html.replace("Last updated: June 30, 2026", f"Last updated: {visible}")
    open(os.path.join(ROOT, "calibration.html"), "w", encoding="utf-8").write(html)
    print(f"calibration.html written · scored {s['n_scored']} · brier-eligible {s['brier_eligible']} · as of {day}")


if __name__ == "__main__":
    main()
