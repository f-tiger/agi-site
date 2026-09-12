#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""站点自治升级算法 — the daily zero-AI driver.

    python3 tools/autopilot/run.py --site <name> --today YYYY-MM-DD [--check]

WHAT IT DOES (and, as importantly, what it refuses to do)
  1. Fingerprints every published page and keeps an honest content-hash ledger.
  2. Corrects <lastmod> in the sitemap — and only <lastmod>. Never the inventory.
  3. Emits the exact set of URLs whose content changed today, for IndexNow.
  4. Ranks today's rising demand against the pages that already exist and writes
     a gap queue for the judgement layer.
  5. Writes a receipt saying what it did, including every term it zeroed and why.

It writes NO prose, invents NO page, moves NO date that bytes did not move, and
blocks NO deploy. `--check` runs read-only and exits non-zero on any finding, so
the same code path is both the daily job and its own test.

KILL SWITCH: `tools/autopilot/KILLED` (or `sites/<site>/AUTOPILOT_OFF`) silences
the algorithm for everyone / for one site. Silencing it lets the site keep
shipping — this layer must never be able to reproduce the 86-hour freeze it
exists to prevent.
"""
import argparse
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import config      # noqa: E402
import demand      # noqa: E402
import ledger      # noqa: E402
import measure     # noqa: E402
import pagemap     # noqa: E402
import sitemapfix  # noqa: E402

REPO = config.REPO
RECEIPTS = os.path.join(REPO, "data", "autopilot")


def killed(site):
    for p in (os.path.join(HERE, "KILLED"),
              os.path.join(config.CONFIG_DIR, "%s.OFF" % site)):
        if os.path.exists(p):
            return p
    return None


def prior_lastmods(cfg):
    """{rel: 'YYYY-MM-DD'} from the sitemap as it stands — the site's own claim."""
    import re
    text = open(cfg.sitemap, encoding="utf-8").read()
    out = {}
    for block in re.findall(r"<url>.*?</url>", text, re.S):
        loc = re.search(r"<loc>([^<]+)</loc>", block)
        mod = re.search(r"<lastmod>([^<]*)</lastmod>", block)
        if not loc:
            continue
        rel = cfg.rel_for_url(loc.group(1).strip())
        if rel and mod:
            out[rel] = mod.group(1).strip()[:10]
    return out


def run_site(site, today, check=False, verbose=True):
    cfg = config.load(site)
    receipt = {"site": site, "today": today, "outcome": "ok", "notes": [],
               "wrote": [], "counts": {}}
    if not cfg.enabled:
        receipt["outcome"] = "disabled-in-config"
        return receipt
    k = killed(site)
    if k:
        receipt["outcome"] = "killed"
        receipt["notes"].append("kill switch present: %s" % os.path.relpath(k, REPO))
        return receipt

    rels, unresolved = pagemap.published_pages(cfg)
    if unresolved and len(unresolved) > cfg.max_unresolved:
        # A sitemap URL that maps to no file is either a dead entry crawlers are
        # being sent to, or a broken mapping. Both are findings, not warnings.
        receipt["outcome"] = "failed"
        receipt["notes"].append(
            "%d sitemap <loc> resolve to no file (max_unresolved=%d): %s"
            % (len(unresolved), cfg.max_unresolved, unresolved[:5]))
        return receipt
    receipt["counts"]["pages"] = len(rels)

    prior_mods = prior_lastmods(cfg)
    data, changed, boot = ledger.scan(cfg, rels, today, prior_lastmod=prior_mods)
    dates = {r: v["changed"] for r, v in data["pages"].items() if v.get("changed")}
    receipt["counts"].update(changed=len(changed), bootstrapped=len(boot),
                             undatable=sum(1 for v in data["pages"].values()
                                           if not v.get("changed")))
    receipt["changed_urls"] = [cfg.url_for_rel(r) for r in changed]

    # --- sitemap ---------------------------------------------------------
    if cfg.fix_sitemap:
        text = open(cfg.sitemap, encoding="utf-8").read()
        try:
            new_text, rep = sitemapfix.apply_dates(cfg, text, dates)
        except sitemapfix.SitemapError as e:
            receipt["outcome"] = "failed"
            receipt["notes"].append(str(e))
            return receipt
        receipt["counts"]["lastmod_updated"] = len(rep["updated"])
        if rep["nodate"]:
            receipt["notes"].append(
                "%d URL(s) left untouched for want of a defensible date" % len(rep["nodate"]))
        if new_text != text and not check:
            with open(cfg.sitemap, "w", encoding="utf-8") as fh:
                fh.write(new_text)
            receipt["wrote"].append(os.path.relpath(cfg.sitemap, REPO))
    else:
        receipt["notes"].append("sitemap owned by this site's own generator — not touched")

    # --- demand ----------------------------------------------------------
    terms, notes = demand.load_terms(cfg, today)
    receipt["notes"].extend(notes)
    index = pagemap.page_index(cfg, rels)
    covered, gaps, offtopic = demand.analyse(cfg, index, terms)
    receipt["counts"].update(demand_terms=len(terms), covered=len(covered),
                             gaps=len(gaps), offtopic=len(offtopic))

    # --- heat: join measured reader behaviour onto the demand rows ----------
    # Nothing here re-ranks a page or writes into one. It adds a fact per row
    # (how many humans actually arrived in the last 7 days) so the judgement
    # layer can tell "no page" (a gap) from "page nobody finds" (underserved).
    if cfg.raw.get("measure"):
        snap, why = measure.load_fresh(cfg.site, today)
        heat_note = why
    else:
        snap, heat_note = None, ("no public aggregate endpoint on this site — heat needs "
                                 "either a Worker /api/* aggregate route or the D1 read "
                                 "permission on the deploy token")
    underserved, hot_pages, first_party = [], [], {}
    if snap:
        pages = snap.get("pages") or {}
        def heat_of(rel):
            """Measured row for a publish-root-relative file, trying the URL shapes a
            site actually serves: /x.html, /x (extensionless), /dir/ (index)."""
            cands = ["/" + rel]
            if rel.endswith(".html"):
                cands.append("/" + rel[:-5])
            if rel.endswith("index.html"):
                cands.append("/" + rel[:-len("index.html")])
            for c in cands:
                if c in pages:
                    return pages[c]
            return None
        for row in covered:
            h = heat_of(row["page"]) if row.get("page") else None
            row["heat"] = h
            # A real-volume demand term (not the score-1 autocomplete fallback) that
            # maps to an existing page no human reached this week.
            if row.get("kind") == "value" and row["v"] >= 200 and (not h or h.get("n7", 0) == 0):
                underserved.append(row)
        hot_pages = sorted(({"page": k, **v} for k, v in pages.items()),
                           key=lambda r: -r.get("n7", 0))[:15]
        first_party = {k: v for k, v in (snap.get("extra") or {}).items()
                       if k in ("site_search", "search_no_result", "picks", "zero_hits")}
        heat_note = "measured %s (%d pages); %s" % (snap["fetched"], len(pages),
                    "; ".join(snap.get("notes") or []) or "no notes")
    receipt["counts"].update(underserved=len(underserved), hot_pages=len(hot_pages))
    receipt["notes"].append("heat: " + heat_note)
    queue = {
        "site": site, "generated": today, "geo": cfg.demand_geo,
        "note": ("选题输入,不是选题依据。任何由它引出的页面仍要过本站三门与硬内容规则。"
                 "本文件由 tools/autopilot 每日确定性生成,零 AI、零编造。"),
        "how_to_read": (
            "gaps = 今天有需求、站内没有页面接得住(match < %.2f);covered = 已有页面接得住。"
            "**page 字段是「词元重叠度最高的现有页面」,不是编辑判断** —— 实测它会挑错:"
            "eco 的 'luftentfeuchter bei hitze' 被它指到 kinderzimmer-kuehlen.html,而本站"
            "自己的 rail 把这条问句路由到 luftentfeuchter-ratgeber 的「它不制冷」那一节。"
            "所以 page 只当线索用,别当结论。v 是 Google 的增长值,不是搜索量;"
            "kind=autocomplete-new 的行来自配额用尽后的兜底,分值恒为 1,不可与真实增长值比较。"
            "**underserved** = 有真实增长值(v≥200、非兜底)的需求词、站内有页面接得住、但过去 7 天"
            "零真人到达 —— 这不是缺内容,是标题/首屏/内链让人找不到,是判断层最该动手的一类。"
            "hot_pages = 实测 7 天真人到达最多的页(n7)与前 7 天(p7);first_party_demand = "
            "读者在站内亲手输入的搜索词(site_search / search_no_result),对 Google 面降级的站,"
            "它是主信号不是补充。heat_source 写着度量的日期与状态;读不到就如实写读不到。"
        ) % demand.COVERED,
        "sources": cfg.demand_files, "source_notes": notes,
        "gaps": gaps[:40], "covered": covered[:40], "offtopic_dropped": offtopic[:40],
        "underserved": underserved[:20],
        "hot_pages": hot_pages,
        "first_party_demand": first_party,
        "heat_source": heat_note,
    }
    if not check:
        os.makedirs(RECEIPTS, exist_ok=True)
        ledger.save(site, data)
        qp = os.path.join(RECEIPTS, "%s-demand.json" % site)
        with open(qp, "w", encoding="utf-8") as fh:
            json.dump(queue, fh, ensure_ascii=False, indent=1, sort_keys=True)
            fh.write("\n")
        receipt["wrote"] += [os.path.relpath(ledger.ledger_path(site), REPO),
                             os.path.relpath(qp, REPO)]

    if verbose:
        print("[%s] pages=%d changed=%d bootstrapped=%d | demand: %d terms, "
              "%d covered, %d gaps, %d off-topic | heat: %d underserved, %d hot" %
              (site, len(rels), len(changed), len(boot), len(terms),
               len(covered), len(gaps), len(offtopic), len(underserved), len(hot_pages)))
        for n in receipt["notes"]:
            print("    note: %s" % n)
    return receipt


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--site", action="append", help="repeatable; default = all configured")
    ap.add_argument("--today", required=True, help="UTC date, captured ONCE by the caller")
    ap.add_argument("--check", action="store_true", help="read-only; non-zero on findings")
    args = ap.parse_args()

    sites = args.site or config.all_sites()
    receipts, failed = [], []
    for s in sites:
        try:
            r = run_site(s, args.today, check=args.check)
        except Exception as e:                      # noqa: BLE001 - report, never hide
            r = {"site": s, "outcome": "failed", "notes": ["%s: %s" % (type(e).__name__, e)]}
            print("[%s] EXCEPTION: %s: %s" % (s, type(e).__name__, e), file=sys.stderr)
        receipts.append(r)
        if r["outcome"] == "failed":
            failed.append(s)

    if not args.check:
        os.makedirs(RECEIPTS, exist_ok=True)
        with open(os.path.join(RECEIPTS, "receipt.json"), "w", encoding="utf-8") as fh:
            json.dump({"today": args.today, "runs": receipts}, fh,
                      ensure_ascii=False, indent=1, sort_keys=True)
            fh.write("\n")
        # The changed-URL set is what IndexNow may submit. Nothing else.
        with open(os.path.join(RECEIPTS, "changed-urls.json"), "w", encoding="utf-8") as fh:
            json.dump({r["site"]: r.get("changed_urls", []) for r in receipts}, fh,
                      ensure_ascii=False, indent=1, sort_keys=True)
            fh.write("\n")

    if failed:
        print("::error::autopilot failed on: %s" % ", ".join(failed), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
