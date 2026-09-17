#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Lateral topical links between guides, weighted by the season that is coming.

Why this exists (2026-09-17), stated accurately after a correction.

The first version of this docstring claimed the site had 12 orphan pages and
that category hubs linked nothing. Both were false, and both came from the same
bug in the throwaway script that measured it: the regex only matched relative
hrefs, while this site links internally with absolute URLs as well. Measured
properly, every one of the 196 guide pages is reachable, and the four category
hubs link all 142 of their guides. There was no orphan crisis.

What the corrected measurement does show is a shape worth improving:

  * link topology is a star — guides are reached from hubs, and barely from
    each other, so the lowest pages sit on 1 to 3 distinct linking pages
    (tineco-saugt-nicht-mehr 1, luftbefeuchter-ratgeber 2)
  * 70% of internal links point at summer/cooling pages, while the site's own
    five-year demand file puts the winter terms far higher: schimmel 68.5 and
    luftentfeuchter 32.0 against mobile klimaanlage 12.3

So this adds lateral guide-to-guide links, chosen by shared slug vocabulary and
tie-broken by a seasonal weight read from data/seasonality-de.json. It gives
readers a real next step and gives crawlers paths that do not all run through
four hub pages. Internal linking is also the only ranking lever entirely inside
this repo, and it works on the index this site actually lives in: 100% of its
search traffic comes from Bing and its resellers, because Google crawls all 207
pages and ranks none of them.

Per page: up to MAX_LINKS related guides, never itself, never a link the page
already makes in either URL form, same locale only. Pages with fewer than
MIN_INBOUND topical peers get a top-up pass, capped at HARD_MAX so no block
becomes a wall of links.

Idempotent: the block lives between EB_RELATED markers and is replaced whole.

Run: python3 tools/build_related.py
"""
import datetime
import json
import os
import re
import sys
from collections import Counter, defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, "site")
SEASON = os.path.join(ROOT, "data", "seasonality-de.json")
OPEN, CLOSE = "<!--EB_RELATED-->", "<!--/EB_RELATED-->"
MAX_LINKS = 4
# Hard ceiling including rescued links. A first version grew one block to 16
# entries because the rescue pass appended without a real cap — the exact "wall
# of links" this tool's own docstring says not to build. A source that is full
# is skipped and the next-best source takes the orphan instead.
HARD_MAX = 6
MIN_INBOUND = 2  # below this a page counts as under-linked and gets rescued

# Slug words that carry no topical signal and would match everything.
STOP = {"und", "oder", "der", "die", "das", "im", "in", "mit", "ohne", "fuer",
        "von", "zu", "am", "an", "ist", "was", "wie", "wo", "man", "bei",
        "the", "a", "of", "for", "to", "and", "or", "my", "do", "i", "is",
        "test", "ratgeber", "guide", "beste", "best", "qm", "sqm", "html"}

# Which seasonality term speaks for which slug family. Only terms that exist in
# data/seasonality-de.json are used, so the weighting is measured, never guessed.
TOPIC_TERM = [
    (re.compile(r"schimmel|stockflecken|mould|mold"), "schimmel"),
    (re.compile(r"luftentfeucht|dehumidifier|entfeucht"), "luftentfeuchter"),
    (re.compile(r"heizluefter|heizlüfter|heizstrahler|electric-heater"), "heizlüfter"),
    (re.compile(r"infrarot"), "infrarotheizung"),
    (re.compile(r"luftbefeucht|humidifier"), "luftbefeuchter"),
    (re.compile(r"luftreiniger|purifier"), "luftreiniger"),
    (re.compile(r"waesche|wäsche|laundry|airer"), "wäsche trocknen wohnung"),
    (re.compile(r"beschlag|condensation|taupunkt|lueften|lüften"), "fenster beschlagen"),
    (re.compile(r"zugluft|abdicht|draught"), "zugluft"),
    (re.compile(r"heizkosten|stromkosten|strompreis"), "heizkosten sparen"),
    # Grid-outage pages share no slug word with anything on the site, which is
    # how stromausfall-heizen survived the first rescue pass as an orphan.
    # Giving them a measured topic lets the family fallback reach them.
    (re.compile(r"stromausfall|notstrom|blackout"), "heizkosten sparen"),
    # The Bodenpflege family. saugwischer scores only 3.2 in the demand file and
    # the vertical has all but failed, but these pages exist and a page nothing
    # links to cannot rank at all — the cheapest thing is to keep them attached.
    (re.compile(r"staubsauger|saugwischer|saugroboter|tineco|dreame|roborock"), "saugwischer"),
    (re.compile(r"klimaanlage|klimager|portable-ac|air-conditioner|kuehl|kühl"), "mobile klimaanlage"),
]


def season_weight(peak_month, now_month):
    """1.0 at the peak month, decaying with distance around the year.

    Demand is not a step function and neither is publishing: a page whose topic
    peaks in January is already worth promoting in November. Distance is
    measured the short way round the calendar, so December and February are
    equally close to January.
    """
    d = abs(peak_month - now_month)
    d = min(d, 12 - d)
    return max(0.0, 1.0 - d / 5.0)


def load_season_weights(now_month):
    if not os.path.exists(SEASON):
        return {}
    doc = json.load(open(SEASON, encoding="utf-8"))
    peaks = {r["term"]: (r["peak_month"], r["peak"]) for r in doc.get("terms", [])}
    top = max((p for _, p in peaks.values()), default=1) or 1
    out = {}
    for pat, term in TOPIC_TERM:
        if term in peaks:
            month, level = peaks[term]
            # Weight combines "is it in season" with "how big is it at all", so a
            # huge topic slightly out of season still beats a tiny one in season.
            out[term] = season_weight(month, now_month) * (level / top)
    return out


def topic_of(slug):
    for pat, term in TOPIC_TERM:
        if pat.search(slug):
            return term
    return None


def tokens(slug):
    return {t for t in re.split(r"[-_/]", slug) if len(t) > 3 and t not in STOP}


def main():
    now_month = datetime.date.today().month
    weights = load_season_weights(now_month)
    if not weights:
        print("no seasonality-de.json — refusing to guess a season", file=sys.stderr)
        return 1

    # Collect guide pages per locale. A German page links German pages only;
    # sending a German reader to an English guide is a worse experience than no
    # link, and hreflang already handles the language pairing.
    pages = {}
    for root, _dirs, files in os.walk(SITE):
        for fn in files:
            if not fn.endswith(".html"):
                continue
            path = os.path.join(root, fn)
            rel = "/" + os.path.relpath(path, SITE).replace(os.sep, "/")
            if "/guide/" not in rel:
                continue
            html = open(path, encoding="utf-8").read()
            if 'name="robots"' in html and "noindex" in html:
                continue
            h1 = re.search(r"<h1[^>]*>(.*?)</h1>", html, re.S)
            title = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", h1.group(1))).strip() if h1 else ""
            if not title:
                continue
            locale = "en" if rel.startswith("/en/") else ("it" if rel.startswith("/it/") else "de")
            slug = rel.rsplit("/", 1)[-1][:-5]
            pages[rel] = dict(path=path, title=title, locale=locale, slug=slug,
                              tokens=tokens(slug), topic=topic_of(slug), html=html)

    # Existing outbound links, so we never offer a link the page already makes.
    for rel, p in pages.items():
        body = re.sub(r"<(script|style)\b.*?</\1>", "", p["html"], flags=re.S)
        body = re.sub(re.escape(OPEN) + r".*?" + re.escape(CLOSE), "", body, flags=re.S)
        # Absolute form too. This site links internally both ways, and a
        # relative-only pattern made the tool blind to links the page already
        # had — which is how it would offer a duplicate. The same blind spot in
        # the throwaway analysis script that motivated this tool invented an
        # orphan crisis that did not exist (see the note at the top).
        p["existing"] = set(re.findall(
            r'href="(?:https://getecoback\.com)?(/[^"#?]*\.html)"', body))

    def score(src, dst):
        if src == dst or pages[src]["locale"] != pages[dst]["locale"]:
            return -1
        if dst in pages[src]["existing"]:
            return -1
        overlap = len(pages[src]["tokens"] & pages[dst]["tokens"])
        if overlap == 0:
            return -1
        return overlap + 2.0 * weights.get(pages[dst]["topic"], 0.0)

    chosen = {}
    inbound = Counter()
    for src in pages:
        cands = sorted(((score(src, d), d) for d in pages), reverse=True)
        picks = [d for s, d in cands if s > 0][:MAX_LINKS]
        chosen[src] = picks
        for d in picks:
            inbound[d] += 1

    # Top-up pass. Pages with fewer than MIN_INBOUND topical peers get pushed
    # into the most related page that will take them. This is NOT orphan rescue
    # — there are no orphans; every guide is linked from its category hub. It
    # exists so the thinnest pages get at least a couple of lateral paths in
    # instead of depending on the hub alone.
    topped_up = 0
    for dst in pages:
        while inbound[dst] < MIN_INBOUND:
            # Overlap first; then the topic family, because a page whose slug
            # shares no word with anything (stromausfall-heizen was the case)
            # is exactly the page that most needs rescuing, and giving up on it
            # leaves the orphan the whole pass exists to remove.
            cands = sorted(
                ((len(pages[s]["tokens"] & pages[dst]["tokens"])
                  + (0.5 if pages[s]["topic"] and pages[s]["topic"] == pages[dst]["topic"] else 0.0), s)
                 for s in pages
                 if s != dst and pages[s]["locale"] == pages[dst]["locale"]
                 and dst not in chosen[s] and dst not in pages[s]["existing"]
                 and len(chosen[s]) < HARD_MAX),
                reverse=True)
            if not cands or cands[0][0] == 0:
                break
            src = cands[0][1]
            chosen[src] = chosen[src] + [dst]
            inbound[dst] += 1
            topped_up += 1

    heading = {"de": "Passt dazu", "en": "Related guides", "it": "Guide correlate"}
    written = 0
    for src, picks in chosen.items():
        p = pages[src]
        if not picks:
            block = OPEN + CLOSE
        else:
            items = "".join(
                f'<li><a href="{d}">{pages[d]["title"]}</a></li>' for d in picks)
            block = (f'{OPEN}<nav class="eb-related" aria-label="{heading[p["locale"]]}" '
                     f'style="margin:26px 0 8px;padding:14px 16px;background:#fff;'
                     f'border:1px solid #e4ebf0;border-radius:12px;">'
                     f'<strong style="display:block;font-size:14px;color:#0a4d7a;margin-bottom:6px;">'
                     f'{heading[p["locale"]]}</strong>'
                     f'<ul style="margin:0 0 0 18px;font-size:14.5px;">{items}</ul></nav>{CLOSE}')
        html = p["html"]
        if OPEN in html:
            out = re.sub(re.escape(OPEN) + r".*?" + re.escape(CLOSE), lambda m: block, html, flags=re.S)
        elif "</article>" in html:
            out = html.replace("</article>", block + "\n</article>", 1)
        else:
            continue
        if out != html:
            open(p["path"], "w", encoding="utf-8").write(out)
            written += 1

    total = sum(inbound.values()) or 1
    # The seasonal term is a TIE-BREAKER, not a thumb on the scale: topical
    # overlap is an integer and the seasonal bonus maxes out around 0.5, so it
    # only reorders candidates that are equally related. Reporting it as a
    # share of links "in season" invited exactly the wrong reading — a first
    # version printed 0/613 because it thresholded at 0.5, a level the weights
    # cannot reach by construction. Print the weights instead.
    ranked = sorted({t: round(w, 2) for t, w in weights.items()}.items(),
                    key=lambda kv: -kv[1])[:4]
    print(f"related blocks: {written} page(s) updated, {len(pages)} guides, "
          f"{topped_up} top-up(s), {total} lateral links placed")
    print(f"  season tie-break weights (month {now_month}): "
          + ", ".join(f"{t} {w}" for t, w in ranked))
    zero = [d for d in pages if inbound[d] == 0]
    if zero:
        print(f"  still zero inbound from this block: {len(zero)} "
              f"(e.g. {', '.join(zero[:3])})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
