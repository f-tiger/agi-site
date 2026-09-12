#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Reader-heat measurement from each site's own PUBLIC aggregate endpoint.

为什么走公开端点而不是 D1 REST:D1 导出需要 token 带 `Account · D1 · Read`,三个 token
2026-09-11 全试过、全是 403,那是 owner 侧一分钟的动作但至今未做。而三个站的 Worker 早就
用自己的 D1 binding 对外发布了聚合 JSON(eco /api/trend、agi /api/trends、
buysomething /api/pop)——**一把密钥都不要**。先用能用的,别等。

诚实规则(和 demand.py 同一套):
1. 抓不到 / 形状不对 → 写 ok:false + 原因,**不沿用上一次的数字**。一个冻结的热度
   标成新鲜的,比没有热度更糟。
2. 形状按端点逐个校验,不匹配就整份拒绝,绝不「能解析多少算多少」——半份数据会让
   下游把「读不到」当成「零流量」。
3. 端点的降级标记(`degraded`、`ok:false`)原样传下去。eco 的 /api/trend 失败时返回
   全空数组且**没有**错误标记,和「真的没人来」无法区分——所以对一个已知有流量的站,
   全空 pages 记为 suspect_outage,不当成零。
"""
import json
import os
import re
import sys
import urllib.request

from config import REPO

MEASURE_DIR = os.path.join(REPO, "data", "autopilot", "measure")
UA = "agi-site-autopilot-measure (+https://github.com/f-tiger/agi-site)"
TIMEOUT = 20


class ShapeError(ValueError):
    pass


def _fetch(url):
    if url.startswith("file://"):
        with open(url[len("file://"):], encoding="utf-8") as fh:
            return json.load(fh)
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
        if resp.status != 200:
            raise IOError("HTTP %s" % resp.status)
        return json.loads(resp.read().decode("utf-8"))


def _int(v, what):
    if isinstance(v, bool) or not isinstance(v, int):
        raise ShapeError("%s is not an int: %r" % (what, v))
    return v


# ---- per-endpoint normalisers: each returns (pages, extra, notes) ---------------
def eco_trend(data):
    """getecoback /api/trend -> pages {path:{n7,p7}} (human-only, 7d vs prior 7d)."""
    pages_in = data.get("pages")
    if not isinstance(pages_in, list):
        raise ShapeError("pages is not a list")
    pages = {}
    for r in pages_in:
        if not isinstance(r, dict) or not isinstance(r.get("page"), str):
            raise ShapeError("pages[] entry malformed: %r" % (r,))
        pages[r["page"]] = {"n7": _int(r.get("n7"), "n7"), "p7": _int(r.get("p7"), "p7")}
    events = {}
    for r in data.get("events") or []:
        if isinstance(r, dict) and isinstance(r.get("name"), str):
            events[r["name"]] = {"n7": _int(r.get("n7"), "n7"), "p7": _int(r.get("p7"), "p7")}
    notes = []
    if not pages:
        notes.append("suspect_outage: /api/trend returned no pages; this site has known "
                     "human traffic, and the endpoint returns empty arrays on failure "
                     "without an error flag — treated as unreadable, not as zero")
    return pages, {"events": events, "zero_hits": data.get("zero_hits") or []}, notes


def agi_trends(data):
    """agiscorecard /api/trends -> rising pages + FIRST-PARTY search demand."""
    if data.get("ok") is not True:
        raise ShapeError("endpoint reported ok:%r" % (data.get("ok"),))
    pages = {}
    for r in data.get("risingPages") or []:
        if not isinstance(r, dict) or not isinstance(r.get("path"), str):
            raise ShapeError("risingPages[] entry malformed: %r" % (r,))
        pages[r["path"]] = {"n7": _int(r.get("h"), "h"), "p7": _int(r.get("prev"), "prev")}
    def terms(key):
        out = []
        for r in data.get(key) or []:
            if isinstance(r, dict) and isinstance(r.get("label"), str):
                out.append({"q": r["label"], "n": _int(r.get("n"), "n")})
        return out
    # site_search / search_no_result are demand the site's OWN readers typed in.
    # For a site whose Google rising face is on the autocomplete fallback, this is
    # the better demand signal, not a supplement.
    return pages, {"site_search": terms("searches"), "search_no_result": terms("zeroResults")}, []


def sr_pop(data):
    """buysomething /api/pop -> per-pick opens/out-clicks (no page-level pv exposed)."""
    picks = data.get("picks")
    if not isinstance(picks, dict):
        raise ShapeError("picks is not an object")
    out = {}
    for k, v in picks.items():
        if not isinstance(v, dict):
            raise ShapeError("picks[%r] malformed" % k)
        out[k] = {"open": _int(v.get("o"), "o"), "out": _int(v.get("x"), "x")}
    notes = []
    if data.get("degraded"):
        notes.append("endpoint flagged degraded=true")
    return {}, {"picks": out, "days": data.get("days")}, notes


KINDS = {"eco-trend": eco_trend, "agi-trends": agi_trends, "sr-pop": sr_pop}


def measure(site, spec, today):
    """Return the snapshot dict (never raises; failure is a field, not an exception)."""
    kind, url = spec.get("kind"), spec.get("url")
    snap = {"site": site, "fetched": today, "kind": kind, "source": url, "ok": False,
            "pages": {}, "extra": {}, "notes": []}
    fn = KINDS.get(kind)
    if not fn or not url:
        snap["reason"] = "config: unknown kind %r or missing url" % (kind,)
        return snap
    try:
        data = _fetch(url)
    except Exception as e:                      # noqa: BLE001 - report, never hide
        snap["reason"] = "fetch failed: %s: %s" % (type(e).__name__, str(e)[:160])
        return snap
    try:
        pages, extra, notes = fn(data)
    except ShapeError as e:
        snap["reason"] = "shape rejected: %s" % e
        return snap
    snap.update(ok=True, pages=pages, extra=extra, notes=notes)
    return snap


def path_for(site, url):
    return os.path.join(MEASURE_DIR, "%s.json" % site)


def save(snap):
    os.makedirs(MEASURE_DIR, exist_ok=True)
    with open(path_for(snap["site"], None), "w", encoding="utf-8") as fh:
        json.dump(snap, fh, ensure_ascii=False, indent=1, sort_keys=True)
        fh.write("\n")


def load_fresh(site, today, max_age_days=3):
    """The snapshot if it is ok and recent, else None (and the reason why)."""
    import datetime
    p = path_for(site, None)
    if not os.path.isfile(p):
        return None, "no measurement snapshot"
    with open(p, encoding="utf-8") as fh:
        snap = json.load(fh)
    if not snap.get("ok"):
        return None, "measurement not ok: %s" % snap.get("reason", "unknown")
    try:
        age = (datetime.date.fromisoformat(today) - datetime.date.fromisoformat(snap["fetched"])).days
    except (KeyError, ValueError):
        return None, "measurement has no readable fetched date"
    if age > max_age_days:
        return None, "measurement stale (%d days)" % age
    return snap, ""


if __name__ == "__main__":
    import argparse
    import config
    ap = argparse.ArgumentParser()
    ap.add_argument("--today", required=True)
    ap.add_argument("--site", action="append")
    a = ap.parse_args()
    rc = 0
    for s in (a.site or config.all_sites()):
        cfg = config.load(s)
        spec = cfg.raw.get("measure")
        if not spec:
            continue
        snap = measure(s, spec, a.today)
        save(snap)
        print("[%s] measure %s: %s" % (s, "ok" if snap["ok"] else "FAILED",
              "%d pages" % len(snap["pages"]) if snap["ok"] else snap.get("reason")))
        for n in snap["notes"]:
            print("    note: %s" % n)
    sys.exit(rc)
