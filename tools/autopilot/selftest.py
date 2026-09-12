#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Self-test for the autopilot. Every case is a RED FIXTURE.

舰队 2026-09-04 教训:自检要能红,否则和没有一样。所以这里每一条断言都配一个「如果
这个不变式坏了会怎样」的具体反例——不是「跑通了就算过」。重点覆盖两类会说谎的 bug:
① 日期在内容没变的情况下前进;② 一个错的 URL→文件映射让我们照样写日期。
"""
import json
import os
import shutil
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import config, demand, ledger, measure, pagemap, sitemapfix  # noqa: E402

FAILED = []


def check(name, cond, detail=""):
    print(("  ok  " if cond else "  FAIL") + "  " + name + (("  — " + detail) if detail and not cond else ""))
    if not cond:
        FAILED.append(name)


class Fixture:
    """A throwaway site: two pages, a sitemap, a config."""

    def __init__(self, page_b="<html><head><title>B</title></head><body><h1>B</h1><p>beta</p></body></html>"):
        self.dir = tempfile.mkdtemp(prefix="autopilot-selftest-")
        self.pub = os.path.join(self.dir, "site")
        os.makedirs(self.pub)
        self.write("a.html", "<html><head><title>A</title></head><body><h1>A</h1><p>alpha</p>"
                             "<!--CHROME--><nav>v1</nav><!--/CHROME--></body></html>")
        self.write("b.html", page_b)
        self.sitemap = os.path.join(self.pub, "sitemap.xml")
        with open(self.sitemap, "w", encoding="utf-8") as fh:
            fh.write('<?xml version="1.0" encoding="UTF-8"?><urlset>'
                     '<url><loc>https://x.test/a.html</loc><lastmod>2026-01-01</lastmod></url>'
                     '<url><loc>https://x.test/b.html</loc><lastmod>2026-01-02</lastmod></url>'
                     '</urlset>')
        raw = {"site": "fixture", "url_base": "https://x.test",
               "publish_root": os.path.relpath(self.pub, config.REPO),
               "sitemap": os.path.relpath(self.sitemap, config.REPO),
               "normalize": [r"<!--CHROME-->.*?<!--/CHROME-->"], "vocabulary": ["alpha", "beta"]}
        self.cfg = config.SiteConfig(raw, "fixture")

    def write(self, rel, text):
        with open(os.path.join(self.pub, rel), "w", encoding="utf-8") as fh:
            fh.write(text)

    def scan(self, today, prior=None, prior_lastmod=None):
        rels, _ = pagemap.published_pages(self.cfg)
        return ledger.scan(self.cfg, rels, today,
                           prior=prior if prior is not None else {"site": "fixture", "pages": {}},
                           prior_lastmod=prior_lastmod or {"a.html": "2026-01-01", "b.html": "2026-01-02"})

    def close(self):
        shutil.rmtree(self.dir, ignore_errors=True)


def main():
    print("autopilot self-test")

    # 1. Bootstrap must NOT invent freshness. Day one keeps the site's own claim.
    f = Fixture()
    data, changed, boot = f.scan("2026-09-11")
    check("bootstrap keeps the sitemap's own date, never today",
          data["pages"]["a.html"]["changed"] == "2026-01-01" and not changed,
          "got %r" % data["pages"]["a.html"])

    # 2. A second run over identical bytes must move nothing. This is the invariant
    #    that a daily cron cannot be allowed to break: re-running is not an edit.
    data2, changed2, _ = f.scan("2026-09-12", prior=json.loads(json.dumps(data)))
    check("re-run on identical bytes changes no date",
          not changed2 and data2["pages"]["a.html"]["changed"] == "2026-01-01")

    # 3. A real content edit must advance the date — and only that page's.
    f.write("b.html", "<html><head><title>B</title></head><body><h1>B</h1><p>beta REWRITTEN</p></body></html>")
    data3, changed3, _ = f.scan("2026-09-13", prior=json.loads(json.dumps(data2)))
    check("a real edit advances that page's date to today",
          changed3 == ["b.html"] and data3["pages"]["b.html"]["changed"] == "2026-09-13",
          "changed=%r" % changed3)
    check("an untouched page keeps its old date while a sibling changes",
          data3["pages"]["a.html"]["changed"] == "2026-01-01")

    # 4. RED FIXTURE: rewriting injected chrome is NOT a content change. Without the
    #    normalize step this fires on all 176 eco pages at once and claims a site-wide
    #    refresh that never happened.
    f.write("a.html", "<html><head><title>A</title></head><body><h1>A</h1><p>alpha</p>"
                      "<!--CHROME--><nav>v2 COMPLETELY DIFFERENT NAV</nav><!--/CHROME--></body></html>")
    data4, changed4, _ = f.scan("2026-09-14", prior=json.loads(json.dumps(data3)))
    check("a nav/chrome rewrite does NOT count as a content change",
          "a.html" not in changed4, "changed=%r" % changed4)

    # 5. RED FIXTURE: a sitemap URL that maps to no file must REFUSE the whole write.
    with open(f.sitemap, "a", encoding="utf-8") as fh:
        pass
    txt = open(f.sitemap, encoding="utf-8").read().replace(
        "</urlset>", "<url><loc>https://x.test/ghost.html</loc><lastmod>2026-01-03</lastmod></url></urlset>")
    open(f.sitemap, "w", encoding="utf-8").write(txt)
    refused = False
    try:
        sitemapfix.apply_dates(f.cfg, txt, {"a.html": "2026-09-14"})
    except sitemapfix.SitemapError:
        refused = True
    check("an unresolvable <loc> makes the sitemap write fail, not half-apply", refused)

    # 6. The write itself is surgical: only <lastmod> text moves.
    txt2 = txt.replace("<url><loc>https://x.test/ghost.html</loc><lastmod>2026-01-03</lastmod></url>", "")
    new, rep = sitemapfix.apply_dates(f.cfg, txt2, {"a.html": "2026-09-14", "b.html": "2026-01-02"})
    check("only the intended <lastmod> changes",
          new.count("<loc>") == txt2.count("<loc>")
          and "2026-09-14" in new and len(rep["updated"]) == 1,
          "updated=%r" % rep["updated"])
    check("a page whose date did not move is not rewritten", rep["unchanged"] == 1)
    f.close()

    # 7. Demand: a stale seed is dropped, never reused as if fresh.
    f2 = Fixture()
    src = os.path.join(f2.pub, "rising.json")
    with open(src, "w", encoding="utf-8") as fh:
        json.dump({"seeds": {
            "fresh": {"fetched": "2026-09-10", "rising": [{"q": "alpha guide", "v": 900}]},
            "old":   {"fetched": "2026-01-01", "rising": [{"q": "beta guide", "v": 5000}]},
            "dirty": {"fetched": "2026-09-10", "polluted": True, "rising": [{"q": "alpha x", "v": 99999}]},
        }}, fh)
    f2.cfg.demand_files = [os.path.relpath(src, config.REPO)]
    terms, notes = demand.load_terms(f2.cfg, "2026-09-11")
    qs = [t["q"] for t in terms]
    check("a stale seed contributes nothing", "beta guide" not in qs, "terms=%r" % qs)
    check("a fresh seed in the same file still contributes", "alpha guide" in qs)
    check("a seed the fetcher flagged polluted is dropped", "alpha x" not in qs)
    check("dropping a stale seed is reported, not silent", any("stale" in n for n in notes))

    # 8. RED FIXTURE: v="new" from the autocomplete fallback must not outrank real
    #    volume, and must be labelled degraded. Pooling them is how a quota outage
    #    starts looking like a demand spike.
    with open(src, "w", encoding="utf-8") as fh:
        json.dump({"seeds": {
            "real": {"fetched": "2026-09-10", "source": "trends", "rising": [{"q": "alpha real", "v": 700}]},
            "fb":   {"fetched": "2026-09-10", "source": "autocomplete-diff",
                     "rising": [{"q": "alpha fallback", "v": "new"}]},
        }}, fh)
    terms, notes = demand.load_terms(f2.cfg, "2026-09-11")
    check("autocomplete 'new' does not outrank measured volume",
          terms and terms[0]["q"] == "alpha real", "order=%r" % [t["q"] for t in terms])
    check("a degraded demand source says so out loud",
          any("AUTOCOMPLETE FALLBACK" in n for n in notes))

    # 9. A term with no vocabulary overlap is off-topic, not a gap. This is the guard
    #    against Google padding related_queries with national trending garbage.
    rels, _ = pagemap.published_pages(f2.cfg)
    idx = pagemap.page_index(f2.cfg, rels)
    cov, gaps, off = demand.analyse(f2.cfg, idx, [{"q": "belstaff jacket", "v": 99999, "stand": "2026-09-10"}])
    check("an off-vocabulary term is dropped, never queued as a gap",
          not gaps and off == ["belstaff jacket"])
    f2.close()

    # 10. Measurement: a wrong shape is REJECTED whole, never half-parsed; a fetch
    #     failure is a field, never a reuse of the last good numbers.
    fx = tempfile.mkdtemp(prefix="autopilot-measure-")
    good = os.path.join(fx, "good.json"); bad = os.path.join(fx, "bad.json")
    json.dump({"pages": [{"page": "/guide/a.html", "n7": 12, "p7": 3}],
               "events": [{"name": "affiliate_click", "n7": 4, "p7": 1}]}, open(good, "w"))
    json.dump({"pages": [{"page": "/guide/a.html", "n7": "twelve"}]}, open(bad, "w"))
    ok = measure.measure("fx", {"kind": "eco-trend", "url": "file://" + good}, "2026-09-12")
    check("a well-formed measurement is accepted with its pages",
          ok["ok"] and ok["pages"]["/guide/a.html"]["n7"] == 12)
    rej = measure.measure("fx", {"kind": "eco-trend", "url": "file://" + bad}, "2026-09-12")
    check("a malformed measurement is rejected whole, not half-parsed",
          not rej["ok"] and rej["pages"] == {} and "shape rejected" in rej.get("reason", ""),
          "got %r" % rej.get("reason"))
    gone = measure.measure("fx", {"kind": "eco-trend", "url": "file://" + fx + "/missing.json"}, "2026-09-12")
    check("a failed fetch is ok:false with a reason, and carries no pages",
          not gone["ok"] and gone["pages"] == {} and "fetch failed" in gone.get("reason", ""))
    agi = measure.measure("fx", {"kind": "agi-trends", "url": "file://" + good}, "2026-09-12")
    check("an endpoint without ok:true is not trusted", not agi["ok"])
    empty = os.path.join(fx, "empty.json"); json.dump({"pages": [], "events": []}, open(empty, "w"))
    sus = measure.measure("fx", {"kind": "eco-trend", "url": "file://" + empty}, "2026-09-12")
    check("an all-empty eco trend is flagged suspect_outage, not read as zero readers",
          sus["ok"] and any("suspect_outage" in n for n in sus["notes"]))
    shutil.rmtree(fx, ignore_errors=True)

    if FAILED:
        print("::error::autopilot self-test FAILED: %s" % ", ".join(FAILED))
        return 1
    print("all autopilot self-test cases passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
