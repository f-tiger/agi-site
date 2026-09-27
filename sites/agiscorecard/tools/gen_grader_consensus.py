#!/usr/bin/env python3
"""/grader-consensus — does anyone else grade Situational Awareness the way we do? (2026-09-27)

Why (owner, 2026-09-26/27: 「类似比特币的共识算法…成为 ai 时代信仰」, second round): the 09-26 audit
found the Thesis Tracker is recomputable arithmetic on top of *one editor's* verdicts. Bitcoin's
answer to "why trust one node" is "don't — check it against independent nodes". The honest,
token-free version of that for a grading site is: put our verdicts next to every independent,
public, dated grading of the same predictions, quote each grader verbatim, and count where we
agree and where we do not — including where we disagree.

Inputs: data.json (our verdicts) + independent-grades.json (hand-curated; every grade is a
verbatim sentence from the grader's own post with URL and read date; the only judgement added is
a mapping onto a five-value scale, shown next to the sentence). Output: grader-consensus.html +
grader-consensus.json. Deterministic; `--check` recomputes and byte-compares the JSON.
Rules: silence is never agreement; a grader who did not address a prediction has no row;
agreement is computed by a fixed rule printed on the page.
Selftest: python3 tools/gen_grader_consensus.py --selftest
"""
import datetime as dt
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gen_lib as g

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SLUG = "grader-consensus"
OUT_HTML = os.path.join(ROOT, SLUG + ".html")
OUT_JSON = os.path.join(ROOT, SLUG + ".json")
PUBLISHED = "2026-09-27"
SUPPORTIVE = {"ahead", "on_track"}
NOT_DELIVERED = {"behind", "unresolved"}
RULE = ("Two labels agree exactly when they are the same. They agree in direction when both are supportive "
        "(ahead or on track) or both say 'not delivered yet' (behind or unresolved). Anything else — including "
        "any pairing with 'wrong' that is not 'wrong' on both sides — is a disagreement.")
LABEL_TXT = {"ahead": "Ahead", "on_track": "On track", "behind": "Behind", "wrong": "Wrong", "unresolved": "Unresolved"}
_WORDS = {1: "one", 2: "two", 3: "three", 4: "four", 5: "five", 6: "six", 7: "seven", 8: "eight", 9: "nine", 10: "ten"}


def words(n):
    return _WORDS.get(n, str(n))


def plural(n, word):
    return f"{n} {word}{'' if n == 1 else 's'}"


def disagreements(c):
    """Every outright disagreement, generated from the data (2026-09-27: the prose used to say "no outright
    disagreement" by hand, and went stale the day a grader who disagrees was added)."""
    gmap = {x["id"]: x for x in c["graders"]}
    return [(r, e, gmap[e["grader"]]) for r in c["rows"] for e in r["external"] if e["relation"] == "disagree"]


def disagreement_sentence(c, html=True):
    em = (lambda t: f"<em>{t}</em>") if html else (lambda t: t)
    dis = disagreements(c)
    if not dis:
        return "Under the counting rule there is no outright disagreement today."
    head = "one outright disagreement" if len(dis) == 1 else f"{words(len(dis))} outright disagreements"
    parts = "; ".join(f"on {em(r['prediction'])}, {gr['author']} reads the evidence as {em(LABEL_TXT[e['label']].lower())} "
                      f"where this site says {em(r['ours'])}" for r, e, gr in dis)
    return f"Under the counting rule there is {head}: {parts}."


def thin_text(c):
    n0 = sum(1 for r in c["rows"] if not r["external"])
    n1 = sum(1 for r in c["rows"] if len(r["external"]) == 1)
    bits = ([f"{n0} of our {len(c['rows'])} predictions have no independent grade"] if n0 else []) + \
           ([f"{n1} {'has' if n1 == 1 else 'have'} only one"] if n1 else [])
    return " and ".join(bits)


def relation(a, b):
    if a == b:
        return "exact"
    if (a in SUPPORTIVE and b in SUPPORTIVE) or (a in NOT_DELIVERED and b in NOT_DELIVERED):
        return "direction"
    return "disagree"


def compute(data, ig):
    """Pure: → the consensus object."""
    graders = {x["id"]: x for x in ig["graders"]}
    rows = []
    counts = {"exact": 0, "direction": 0, "disagree": 0}
    for p in data["predictions"]:
        ours = ig["self_map"].get(p["verdict"])
        if ours is None:
            raise SystemExit(f"no self_map entry for verdict {p['verdict']!r}")
        ext = []
        for gr in ig["grades"]:
            if gr["prediction"] != p["id"]:
                continue
            if gr["grader"] not in graders or gr["label"] not in LABEL_TXT:
                raise SystemExit(f"bad grade row: {gr}")
            rel = relation(ours, gr["label"])
            counts[rel] += 1
            ext.append({"grader": gr["grader"], "label": gr["label"], "relation": rel, "quote": gr["quote"]})
        rows.append({"id": p["id"], "prediction": p["prediction"], "ours": p["verdict"], "ours_label": ours,
                     "external": ext})
    graded = [r for r in rows if r["external"]]
    return {
        "name": "Grader consensus — Situational Awareness",
        "url": "https://agiscorecard.com/" + SLUG,
        "license": "CC BY 4.0 (compilation); quotes remain their authors' words",
        "our_verdicts_asOf": data.get("dateModified"),
        "graders": ig["graders"],
        "rule": RULE,
        "counts": counts,
        "predictions_with_external_grade": len(graded),
        "predictions_without_external_grade": [r["id"] for r in rows if not r["external"]],
        "rows": rows,
        "not_on_this_site": ig.get("not_on_this_site", []),
    }


def render(c):
    gmap = {x["id"]: x for x in c["graders"]}
    k = c["counts"]
    total = sum(k.values())
    body_rows = ""
    for r in c["rows"]:
        if not r["external"]:
            body_rows += (f"<tr><td>{r['prediction']}</td><td class='nowrap'><strong>{r['ours']}</strong></td>"
                          f"<td colspan='2' class='muted'>No independent public grade found — nobody else has graded this one yet.</td></tr>")
            continue
        for i, e in enumerate(r["external"]):
            gr = gmap[e["grader"]]
            rel = {"exact": "agrees", "direction": "same direction", "disagree": "<strong>disagrees</strong>"}[e["relation"]]
            first = (f"<td rowspan='{len(r['external'])}'>{r['prediction']}</td>"
                     f"<td rowspan='{len(r['external'])}' class='nowrap'><strong>{r['ours']}</strong></td>") if i == 0 else ""
            body_rows += (f"<tr>{first}<td><a href=\"{gr['url']}\" rel=\"nofollow noopener\">{gr['author']}</a> "
                          f"({gr['venue']}, {gr['published']}): “{e['quote']}”</td>"
                          f"<td class='nowrap'>{LABEL_TXT[e['label']]} · {rel}</td></tr>")
    extra = "".join(
        f"<li><strong>{x['topic']}</strong> — {gmap[x['grader']]['author']}: “{x['quote']}”</li>" for x in c["not_on_this_site"])
    graders = "".join(
        f"<li><a href=\"{x['url']}\" rel=\"nofollow noopener\">{x['title']}</a> — {x['author']}, {x['venue']}, "
        f"published {x['published']}, read {x['read']}. <em>Scope:</em> {x['scope']}</li>" for x in c["graders"])
    return f"""<h2>Our verdicts next to every independent grading we could find</h2>
<p>Our verdicts are as of <strong>{c['our_verdicts_asOf']}</strong>. Each outside grade is a verbatim sentence from the
grader's own post; the label beside it is our mapping of that sentence, which you can check against the quote.
Tally over {total} comparisons: <strong>{k['exact']}</strong> exact agreements, <strong>{k['direction']}</strong> same
direction, <strong>{k['disagree']}</strong> {'disagreement' if k['disagree'] == 1 else 'disagreements'}. {len(c['predictions_without_external_grade'])} of our
{len(c['rows'])} predictions have no independent grade at all.</p>
<table><thead><tr><th>Prediction</th><th>Our verdict</th><th>Independent grader (verbatim)</th><th>Their grade · vs ours</th></tr></thead>
<tbody>{body_rows}</tbody></table>
<h2>How agreement is counted</h2>
<p>{RULE} A grader who did not address a prediction has no row for it: silence is never counted as agreement.</p>
<h2>What this does and does not show</h2>
<p>{words(len(c['graders'])).capitalize()} {'grader' if len(c['graders']) == 1 else 'graders'} is still a small panel, and they graded at different times
({min(x['published'] for x in c['graders'])} to {max(x['published'] for x in c['graders'])}), so part of any difference is time,
not judgement. What the table does show is the thing a single scorecard cannot show about itself: where an outside reader,
looking at the same essay, landed somewhere else. {disagreement_sentence(c)} A disagreement stays on this page; it is what the
table exists to show. Agreement with {words(len(c['graders']))} {'grader' if len(c['graders']) == 1 else 'graders'} who read the same public evidence is weak evidence of
being right — it mostly rules out that our verdicts are idiosyncratic.</p>
<h2>Graders</h2><ul>{graders}</ul>
<h2>Graded elsewhere, not one of our eight</h2><ul>{extra}</ul>
<p>Know of another dated, public grading of <em>Situational Awareness</em>? It goes in this table on the same terms:
verbatim sentence, link, date, and a mapping you can argue with. Machine-readable:
<a href="/grader-consensus.json">/grader-consensus.json</a> (sources in <a href="/independent-grades.json">/independent-grades.json</a>).</p>"""


# The bet agi-grader-consensus-1127 settled "won" on 2026-09-27 (four independent graders); its pre-registered win
# branch puts the counts on /situational-awareness-predictions as a live number. The block sits between markers and
# is rewritten from grader-consensus.json on every run; --check fails if the page shows other numbers than the JSON.
PRED_PAGE = os.path.join(ROOT, "situational-awareness-predictions.html")
PRED_START, PRED_END = "<!-- grader-consensus:start -->", "<!-- grader-consensus:end -->"
PRED_ANCHOR = "  <h2>Every prediction and its current verdict</h2>"


def predictions_block(c):
    k = c["counts"]
    return (f'{PRED_START}<p class="grader-line" style="margin:-0.75rem 0 1.75rem;font-size:14px;color:var(--muted);">'
            f'Outside check: <strong>{words(len(c["graders"]))}</strong> independent public gradings of these predictions, '
            f'{sum(k.values())} comparisons — <strong>{k["exact"]}</strong> agree with our verdict, <strong>{k["direction"]}</strong> '
            f'point the same direction, <strong>{plural(k["disagree"], "outright disagreement")}</strong>. '
            f'<a href="/grader-consensus" onclick="gtag(\'event\',\'index_click\',{{location:\'predictions_graders_live\'}});">'
            f'Every quote, side by side →</a></p>{PRED_END}')


def patched_predictions_page(c, page):
    block = predictions_block(c)
    if PRED_START in page and PRED_END in page:
        a, b = page.index(PRED_START), page.index(PRED_END) + len(PRED_END)
        return page[:a] + block + page[b:]
    if page.count(PRED_ANCHOR) != 1:
        sys.exit("gen_grader_consensus: cannot place the live counts on situational-awareness-predictions.html (anchor moved)")
    return page.replace(PRED_ANCHOR, "  " + block + "\n" + PRED_ANCHOR, 1)


LLMS = os.path.join(ROOT, "llms.txt")
LLMS_PREFIX = "- [Grader consensus: who else graded Situational Awareness?](https://agiscorecard.com/grader-consensus): "


def llms_line(c):
    k = c["counts"]
    venues = ", ".join(f"{x['venue']} {x['published']}" for x in sorted(c["graders"], key=lambda x: x["published"]))
    nog = len(c["predictions_without_external_grade"])
    return (LLMS_PREFIX + f"Our 8 verdicts next to every independent, dated public grading we could find ({venues}), each quoted "
            f"verbatim, with a fixed agreement rule: {k['exact']} exact, {k['direction']} same-direction, "
            f"{plural(k['disagree'], 'disagreement')}; {nog} prediction{'' if nog == 1 else 's'} nobody else has graded. "
            f"Data: /grader-consensus.json.")


def patched_llms(c, text):
    lines = text.split("\n")
    hits = [i for i, l in enumerate(lines) if l.startswith(LLMS_PREFIX)]
    if len(hits) != 1:
        sys.exit("gen_grader_consensus: expected exactly one grader-consensus line in llms.txt")
    lines[hits[0]] = llms_line(c)
    return "\n".join(lines)


def selftest():
    data = {"dateModified": "2026-09-06", "predictions": [
        {"id": "a", "prediction": "A", "verdict": "Exceeded"}, {"id": "b", "prediction": "B", "verdict": "Open"},
        {"id": "c", "prediction": "C", "verdict": "Wrong"}, {"id": "d", "prediction": "D", "verdict": "Pending"}]}
    ig = {"self_map": {"Exceeded": "ahead", "On track": "on_track", "Wrong": "wrong", "Open": "unresolved", "Pending": "unresolved"},
          "graders": [{"id": "x", "author": "X", "title": "T", "venue": "V", "url": "https://example.org/p", "published": "2026-01-01", "read": "2026-09-27", "scope": "s"}],
          "grades": [{"prediction": "a", "grader": "x", "label": "on_track", "quote": "q1"},
                     {"prediction": "b", "grader": "x", "label": "behind", "quote": "q2"},
                     {"prediction": "c", "grader": "x", "label": "on_track", "quote": "q3"}], "not_on_this_site": []}
    c = compute(data, ig)
    html = render(c)
    checks = [
        ("ahead vs on_track = same direction", c["rows"][0]["external"][0]["relation"] == "direction"),
        ("unresolved vs behind = same direction", c["rows"][1]["external"][0]["relation"] == "direction"),
        ("wrong vs on_track = disagree", c["rows"][2]["external"][0]["relation"] == "disagree"),
        ("silence is not agreement (d has no row, listed as ungraded)", c["predictions_without_external_grade"] == ["d"] and sum(c["counts"].values()) == 3),
        ("deterministic", json.dumps(c, sort_keys=True) == json.dumps(compute(data, ig), sort_keys=True)),
        ("external links nofollow", len(re.findall(r'href="https?://(?!agiscorecard)', html)) == html.count('rel="nofollow noopener"')),
        ("quotes rendered verbatim", "q1" in html and "q2" in html and "q3" in html),
        ("rule printed", RULE[:40] in html),
        # 2026-09-27: every count in the prose is generated (the hand-written "two graders … no outright disagreement"
        # went stale the day two more graders, one of them disagreeing, were added)
        ("prose counts graders from the data", "One grader is still a small panel" in html and "Agreement with one grader who" in html),
        ("an outright disagreement is named, not denied", "one outright disagreement" in html and "no outright disagreement" not in html
         and "on <em>C</em>" in html),
        ("thin panel text from the data", thin_text(c) == "1 of our 4 predictions have no independent grade and 3 have only one"),
        ("singular disagreement in the tally", "</strong> disagreement." in html),
        ("live counts block: inserted once at the anchor, then replaced in place",
         (lambda p1: p1.count(PRED_START) == 1 and patched_predictions_page(c, p1) == p1 and PRED_ANCHOR in p1)(
             patched_predictions_page(c, "<p>x</p>\n" + PRED_ANCHOR + "\n"))),
        ("live counts come from the data", ">3</strong> comparisons" not in predictions_block(c) and
         "3 comparisons" in predictions_block(c) and "1 outright disagreement" in predictions_block(c)),
    ]
    for n, ok in checks:
        print(("  ok   " if ok else "  FAIL ") + n)
    try:
        compute({"predictions": [{"id": "z", "prediction": "Z", "verdict": "Partial"}]}, ig)
        print("  FAIL unknown verdict not refused"); return 1
    except SystemExit:
        print("  ok   unknown verdict refused")
    return 0 if all(ok for _, ok in checks) else 1


def main(argv):
    if "--selftest" in argv:
        return selftest()
    data = json.load(open(os.path.join(ROOT, "data.json"), encoding="utf-8"))
    ig = json.load(open(os.path.join(ROOT, "independent-grades.json"), encoding="utf-8"))
    c = compute(data, ig)
    out = json.dumps(c, ensure_ascii=False, indent=1) + "\n"
    if "--check" in argv:
        have = open(OUT_JSON, encoding="utf-8").read() if os.path.exists(OUT_JSON) else ""
        if have != out:
            sys.exit("grader-consensus.json is stale — rerun tools/gen_grader_consensus.py")
        page = open(PRED_PAGE, encoding="utf-8").read()
        if patched_predictions_page(c, page) != page:
            sys.exit("situational-awareness-predictions.html shows other grader counts than grader-consensus.json — rerun tools/gen_grader_consensus.py")
        lt = open(LLMS, encoding="utf-8").read()
        if patched_llms(c, lt) != lt:
            sys.exit("llms.txt shows other grader counts than grader-consensus.json — rerun tools/gen_grader_consensus.py")
        print("grader-consensus.json recompute matches (and the live counts on /situational-awareness-predictions)")
        return 0
    open(OUT_JSON, "w", encoding="utf-8").write(out)
    page = open(PRED_PAGE, encoding="utf-8").read()
    new_page = patched_predictions_page(c, page)
    if new_page != page:
        open(PRED_PAGE, "w", encoding="utf-8").write(new_page)
    lt = open(LLMS, encoding="utf-8").read()
    if patched_llms(c, lt) != lt:
        open(LLMS, "w", encoding="utf-8").write(patched_llms(c, lt))
    k = c["counts"]
    day = max(ig["dateModified"], data.get("dateModified") or PUBLISHED)
    faqs = [
        ("Does anyone else grade Situational Awareness the same way as the AGI Scorecard?",
         f"Across {sum(k.values())} comparisons with {words(len(c['graders']))} independent, dated public gradings, {k['exact']} agree exactly, "
         f"{k['direction']} agree in direction and {k['disagree']} disagree. {len(c['predictions_without_external_grade'])} of our "
         f"{len(c['rows'])} predictions have no independent grade yet."),
        ("Who are the independent graders?",
         "; ".join(f"{x['author']} ({x['venue']}, {x['published']})" for x in c["graders"]) +
         ". Each grade on this page is a verbatim sentence from their own post, linked."),
        ("Where do the graders disagree with this site?",
         disagreement_sentence(c, html=False) + " Differences between ahead and on track (for example on capex), or between "
         "behind and unresolved, are counted as same-direction, not as disagreements."),
        ("Why publish disagreement with your own verdicts?",
         "Because a scorecard graded by one editor is only as trustworthy as that editor. Putting every independent grading "
         "next to ours, with the quotes, is the cheapest way for a reader to check whether our verdicts are idiosyncratic."),
    ]
    html = g.build(
        slug=SLUG,
        title="Grader Consensus: Who Else Graded Situational Awareness?",
        desc=(f"Our 8 Situational Awareness verdicts beside {words(len(c['graders']))} independent public gradings, quoted verbatim: "
              f"{k['exact']} agree, {k['direction']} same direction, {plural(k['disagree'], 'disagreement')}."),
        og_title="Grader consensus — our verdicts vs every independent grading",
        eyebrow="Accountability",
        h1="Who else graded Situational Awareness — and where they disagree with us",
        capsule=(f'<span class="verdict">{"No outright disagreement" if k["disagree"] == 0 else plural(k["disagree"], "outright disagreement")} '
                 f'across {sum(k.values())} comparisons{(" — but " + thin_text(c) + ", so the panel is thin") if thin_text(c) else ""}.</span> '
                 f'{k["exact"]} exact agreements and {k["direction"]} same-direction '
                 f'(ahead vs on track, behind vs unresolved) against {words(len(c["graders"]))} independent, dated gradings, every one quoted verbatim.'),
        body_html=render(c), faqs=faqs,
        related=[("/situational-awareness-predictions", "All 8 predictions, graded"), ("/progress-index", "AGI-2027 Thesis Tracker"),
                 ("/calibration", "How we score our own predictions"), ("/two-year-scorecard.html", "Two-year scorecard")],
    )
    html = html.replace('"datePublished": "2026-06-30", "dateModified": "2026-06-30"',
                        f'"datePublished": "{PUBLISHED}", "dateModified": "{day}"')
    html = html.replace("Last updated: June 30, 2026", "Last updated: " + dt.date.fromisoformat(day).strftime("%B %-d, %Y"))
    open(OUT_HTML, "w", encoding="utf-8").write(html)
    print(f"{SLUG}.html + .json written · {k}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
