#!/usr/bin/env python3
"""Score AI-assistant landings by page shape for fleet-ai-landing-shape-1026 (zero AI, zero network).

The AI-era site review of 2026-09-27 (docs/ai-era-site-2026-09-27.md) found that the claim
"AI routes people to lists and practical fixes, and answers judgement pages in the chat" rests
on two pages (eco's tilt-window how-to pair and bpj /c/api). Inside agi, judgement pages drew as
many AI arrivals as its comparison pages. This scorer turns the out-of-sample test into
arithmetic, so settlement needs no judgement:

  * Unit = AI visit-day: one distinct (site, path, day, country) whose referrer is an AI assistant.
    Repeat hits from one reader on one day count once (eco adopted this unit for btu_calc on 09-22).
  * kagi.com is excluded: it is a search engine, like DuckDuckGo, which was never counted.
  * claude.ai is reported beside the score and never scored: the fleet is run from claude.ai/code,
    and a link clicked there carries this referrer (see tools/fleet/ai_referrals.py).
  * Labels come from data/ai-landing-labels-2026-09-27.json, written before the window opened.
    Nothing is relabelled at settlement. Unknown paths are "unlabelled", reported and not scored.
  * H = list_or_comparison + practical_fix; J = definition_or_judgement. Homes, bpj tool cards,
    the three in-sample driver pages and unlabelled paths are reported and not scored.

Settlement (2026-10-26, between 00:05 and 06:00 UTC, before any daily D1 budget exhaustion):
run SQL[site] for the three sites with the Cloudflare D1 query tool, save each result list as JSON
({"agiscorecard": [...], "baipiaoji": [...], "getecoback": [...]}) and run
    python3 tools/fleet/ai_landing_shape.py rows.json
Rows need path, day, country and host. The window is fixed in the SQL.

Usage: python3 tools/fleet/ai_landing_shape.py [--selftest | rows.json]
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
LABELS = os.path.join(ROOT, "data", "ai-landing-labels-2026-09-27.json")
WINDOW = ("2026-09-28", "2026-10-25")

# Same assistant list as tools/fleet/ai_referrals.py AI_HOSTS, without kagi (a search engine).
AI_TOKENS = ["chatgpt", "chat.openai", "perplexity", "claude.ai", "copilot", "gemini.google",
             "you.com", "poe.com", "mistral", "deepseek", "kimi", "doubao", "yiyan", "metaso"]
SELF_SUSPECT = ("claude.ai",)


def _host_pred(col):
    return "(" + " OR ".join(f"{col} LIKE '%{t}%'" for t in AI_TOKENS) + ")"


SQL = {
    "agiscorecard": (
        "SELECT path, day, country, ref_host AS host FROM pageviews WHERE ua_class='human' "
        f"AND day BETWEEN '{WINDOW[0]}' AND '{WINDOW[1]}' AND {_host_pred('ref_host')} "
        "GROUP BY path, day, country, ref_host"),
    "baipiaoji": (
        "SELECT path, d AS day, country, ref AS host FROM hits WHERE ev = '' AND ref IS NOT NULL AND ref != '' "
        f"AND d BETWEEN '{WINDOW[0]}' AND '{WINDOW[1]}' AND path NOT LIKE '/\\_\\_%' ESCAPE '\\' "
        f"AND {_host_pred('ref')} GROUP BY path, d, country, ref"),
    "getecoback": (
        "SELECT page AS path, day, country, ref AS host FROM ev WHERE name='page_view' "
        f"AND (ua_class='human' OR ua_class IS NULL) AND day BETWEEN '{WINDOW[0]}' AND '{WINDOW[1]}' "
        f"AND {_host_pred('ref')} GROUP BY page, day, country, ref"),
}

HOME_RE = re.compile(r"^/([a-z]{2}/?)?$")
MIRROR_RE = re.compile(r"^/(de|es|fr|it|ja|ko|pt|zh)(/.+)$")
BPJ_RULES = [
    (re.compile(r"^(/en)?/(c|vs)/"), "list_or_comparison"),
    (re.compile(r"^(/en)?/tools/"), "other"),
    (re.compile(r"^(/en)?/is-.+"), "definition_or_judgement"),
]
H = {"list_or_comparison", "practical_fix"}
J = {"definition_or_judgement"}


def load_labels(path=LABELS):
    return json.load(open(path, encoding="utf-8"))


def label_for(site, path, lab):
    labels = lab["labels"].get(site, {})
    if HOME_RE.match(path):
        return "home_or_about"
    if path in labels:
        return labels[path]
    if site == "agiscorecard":
        m = MIRROR_RE.match(path)
        if m and m.group(2) in labels:
            return labels[m.group(2)]
    if site == "baipiaoji":
        for rx, shape in BPJ_RULES:
            if rx.match(path):
                return shape
    return "unlabelled"


def is_ai(host):
    h = (host or "").lower()
    return any(t in h for t in AI_TOKENS) and "kagi" not in h


def score(rows_by_site, lab):
    drivers = {tuple(x.split(" ", 1)) for x in lab["excluded_drivers"]}
    seen = set()
    out = {"H": 0, "J": 0, "home": 0, "card_or_other": 0, "driver": 0, "unlabelled": 0, "claude_ai": 0,
           "by_path": {}}
    for site, rows in rows_by_site.items():
        for r in rows:
            if not is_ai(r.get("host")):
                continue
            path = r.get("path") or ""
            key = (site, path, r.get("day"), r.get("country"))
            if key in seen:
                continue  # several AI hosts on the same visit-day still count once
            seen.add(key)
            if any(t in (r.get("host") or "") for t in SELF_SUSPECT):
                out["claude_ai"] += 1
                continue
            if (site, path) in drivers:
                bucket = "driver"
            else:
                shape = label_for(site, path, lab)
                bucket = ("H" if shape in H else "J" if shape in J else "home" if shape == "home_or_about"
                          else "unlabelled" if shape == "unlabelled" else "card_or_other")
            out[bucket] += 1
            out["by_path"].setdefault(f"{site} {path}", {"bucket": bucket, "n": 0})["n"] += 1
    return out


def verdict(s):
    """Win: H >= 10 and H >= 2J. Lose: H <= J with H+J >= 12. Otherwise insufficient.
    Also insufficient when unlabelled is >= 25% of H+J+unlabelled."""
    scored = s["H"] + s["J"]
    if scored + s["unlabelled"] and s["unlabelled"] / (scored + s["unlabelled"]) >= 0.25:
        return "insufficient"
    if s["H"] >= 10 and s["H"] >= 2 * s["J"]:
        return "won"
    if scored >= 12 and s["H"] <= s["J"]:
        return "lost"
    return "insufficient"


def selftest():
    lab = load_labels()
    rows = {
        "agiscorecard": [
            {"path": "/when-will-agi-arrive", "day": "d1", "country": "US", "host": "copilot.microsoft.com"},
            {"path": "/when-will-agi-arrive", "day": "d1", "country": "US", "host": "copilot.microsoft.com"},
            {"path": "/de/when-will-agi-arrive", "day": "d2", "country": "DE", "host": "www.perplexity.ai"},
            {"path": "/how-close-is-agi", "day": "d1", "country": "IR", "host": "chatgpt.com"},
            {"path": "/", "day": "d1", "country": "US", "host": "www.perplexity.ai"},
            {"path": "/situational-awareness-summary", "day": "d1", "country": "TW", "host": "claude.ai"},
            {"path": "/brand-new-page", "day": "d3", "country": "US", "host": "chatgpt.com"},
            {"path": "/how-close-is-agi", "day": "d4", "country": "US", "host": "kagi.com"},
        ],
        "baipiaoji": [
            {"path": "/c/api", "day": "d1", "country": "CN", "host": "chatgpt.com"},
            {"path": "/en/c/writing", "day": "d1", "country": "US", "host": "www.perplexity.ai"},
            {"path": "/en/vs/a-vs-b", "day": "d2", "country": "US", "host": "www.perplexity.ai"},
            {"path": "/en/tools/groq", "day": "d2", "country": "US", "host": "www.perplexity.ai"},
            {"path": "/en/is-x-still-free", "day": "d2", "country": "TH", "host": "www.perplexity.ai"},
            {"path": "/en/", "day": "d2", "country": "TH", "host": "chatgpt.com"},
            {"path": "/en/c/writing", "day": "d5", "country": "US", "host": "www.google.com"},
        ],
        "getecoback": [
            {"path": "/en/guide/portable-ac-tilt-and-turn-windows.html", "day": "d1", "country": "DE", "host": "chatgpt.com"},
            {"path": "/guide/mobile-klimaanlage-ueberwintern.html", "day": "d1", "country": "DE", "host": "www.perplexity.ai"},
            {"path": "/guide/was-bedeutet-btu.html", "day": "d1", "country": "DE", "host": "copilot.microsoft.com"},
        ],
    }
    s = score(rows, lab)
    checks = [
        ("labels file: every label is a known shape",
         all(v in H | J | {"home_or_about", "other"} for site in lab["labels"].values() for v in site.values())),
        ("labels file: the three driver pages are listed", len(lab["excluded_drivers"]) == 3),
        ("unit: a repeated visit-day counts once", s["by_path"]["agiscorecard /when-will-agi-arrive"]["n"] == 1),
        ("mirror: /de/<p> inherits the English label", label_for("agiscorecard", "/de/when-will-agi-arrive", lab) == "list_or_comparison"),
        ("bpj rules: /c/ and /vs/ are H, /tools/ is a card, /is- is J",
         [label_for("baipiaoji", p, lab) for p in ("/en/c/writing", "/en/vs/a-vs-b", "/en/tools/groq", "/en/is-x-still-free")]
         == ["list_or_comparison", "list_or_comparison", "other", "definition_or_judgement"]),
        ("home pages are never scored", label_for("baipiaoji", "/en/", lab) == "home_or_about" and label_for("agiscorecard", "/", lab) == "home_or_about"),
        ("kagi and non-AI hosts are ignored", "baipiaoji /en/c/writing" in s["by_path"] and s["by_path"]["baipiaoji /en/c/writing"]["n"] == 1
         and all(k != "agiscorecard /how-close-is-agi" or v["n"] == 1 for k, v in s["by_path"].items())),
        ("claude.ai is reported, never scored", s["claude_ai"] == 1 and "agiscorecard /situational-awareness-summary" not in s["by_path"]),
        ("drivers are excluded", s["driver"] == 2),
        ("unknown agi path is unlabelled", s["unlabelled"] == 1),
        ("tallies: H 5, J 3 on the fixture", (s["H"], s["J"]) == (5, 3)),
        ("verdict: win needs H >= 10 and H >= 2J", verdict({"H": 10, "J": 5, "unlabelled": 0}) == "won" and verdict({"H": 10, "J": 6, "unlabelled": 0}) == "insufficient"),
        ("verdict: lose needs H <= J and H+J >= 12", verdict({"H": 6, "J": 6, "unlabelled": 0}) == "lost" and verdict({"H": 5, "J": 6, "unlabelled": 0}) == "insufficient"),
        ("verdict: >= 25% unlabelled is insufficient", verdict({"H": 12, "J": 0, "unlabelled": 4}) == "insufficient"),
        ("sql: fixed window, kagi absent, CI paths excluded on bpj",
         all(f"'{WINDOW[0]}'" in q and f"'{WINDOW[1]}'" in q and "kagi" not in q for q in SQL.values())
         and "ESCAPE" in SQL["baipiaoji"]),
    ]
    for n, ok in checks:
        print(("✅ " if ok else "❌ ") + n)
    return 0 if all(ok for _, ok in checks) else 1


def main(argv):
    if not argv or argv[0] == "--selftest":
        return selftest()
    if argv[0] == "--sql":
        print(json.dumps(SQL, indent=1))
        return 0
    lab = load_labels()
    s = score(json.load(open(argv[0], encoding="utf-8")), lab)
    s["verdict"] = verdict(s)
    print(json.dumps(s, ensure_ascii=False, indent=1))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
