# -*- coding: utf-8 -*-
"""Weekly sample: what share of the newest Steam releases carry a generative-AI
content disclosure? Runs in CI (Steam unreachable from the session sandbox).

Method (documented on the tracker page, auditable):
1. Pull the newest releases from the public storefront search (Released_DESC).
2. Keep type=game via appdetails (drops DLC/soundtracks/tools).
3. For each game, fetch the store page (age-gate cookies set) and detect the
   'AI Generated Content Disclosure' section Valve renders for disclosing games.
4. Pages we cannot classify (age-gate loops, errors) are counted as 'unknown'
   and EXCLUDED from the denominator — never guessed either way.
Output appends one dated sample to data/ai-disclosures.json (keeps 104 weeks).
"""
import json, os, re, sys, time, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "ai-disclosures.json")
SEARCH = ("https://store.steampowered.com/search/results/?query&start=0&count=100"
          "&sort_by=Released_DESC&category1=998&infinite=1&l=english")
DETAILS = "https://store.steampowered.com/api/appdetails?appids={aid}&l=english&filters=basic"
STORE = "https://store.steampowered.com/app/{aid}/?l=english"
HDRS = {"User-Agent": "Mozilla/5.0 (compatible; gamesledger-sampler/1.0)",
        "Cookie": "birthtime=252460801; lastagecheckage=1-January-1978; wants_mature_content=1"}
MARK = re.compile(r"AI\s*Generated\s*Content\s*Disclosure", re.I)
SAMPLE_N = 60  # games classified per weekly sample; small but honest and stated


def get(url):
    req = urllib.request.Request(url, headers=HDRS)
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.read().decode("utf-8", "replace")


def main():
    html = json.loads(get(SEARCH)).get("results_html", "")
    appids = []
    for m in re.finditer(r'data-ds-appid="(\d+)"', html):
        aid = m.group(1)
        if aid not in appids:
            appids.append(aid)
    print(f"search returned {len(appids)} unique appids")
    if len(appids) < 20:
        sys.exit("too few appids from search — endpoint may have changed; refusing to sample")

    classified = []
    unknown = 0
    for aid in appids:
        if len(classified) >= SAMPLE_N:
            break
        try:
            d = json.loads(get(DETAILS.format(aid=aid))).get(aid, {})
            if not (d.get("success") and d.get("data", {}).get("type") == "game"):
                continue
            name = d["data"].get("name", f"app{aid}")
            page = get(STORE.format(aid=aid))
            if "agecheck" in page[:3000] and "AI Generated" not in page:
                unknown += 1
                continue
            disclosed = bool(MARK.search(page))
            classified.append({"appid": int(aid), "name": name[:80], "ai": disclosed})
            print(f"  {name[:40]}: {'DISCLOSED' if disclosed else 'no'}")
        except Exception as e:
            unknown += 1
            print(f"  app{aid}: unknown ({e})", file=sys.stderr)
        time.sleep(1.2)

    n = len(classified)
    if n < 30:
        sys.exit(f"only {n} classified — sample too small to publish, aborting without write")
    disclosed_n = sum(1 for c in classified if c["ai"])
    share = round(100 * disclosed_n / n, 1)
    store = {"note": "Weekly own-sample of newest Steam game releases; written only by CI.", "samples": []}
    if os.path.exists(OUT):
        store = json.load(open(OUT, encoding="utf-8"))
    day = time.strftime("%Y-%m-%d", time.gmtime())
    entry = {"d": day, "classified": n, "disclosed": disclosed_n, "share_pct": share,
             "unknown_excluded": unknown,
             "disclosed_names": [c["name"] for c in classified if c["ai"]][:20]}
    samples = [s for s in store["samples"] if s["d"] != day] + [entry]
    store["samples"] = samples[-104:]
    store["generated"] = day
    json.dump(store, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"sample {day}: {disclosed_n}/{n} = {share}% disclosed ({unknown} unknown excluded)")


if __name__ == "__main__":
    main()
