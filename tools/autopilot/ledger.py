#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""The content-hash ledger — the only honest way a machine can date a page.

WHY THIS EXISTS
2026-09-11 审计:agiscorecard 的 sitemap 里 **60 条 URL 写着 lastmod 2026-06-30,而
git 显示这 60 个文件全部在 2026-09-06 被改过**。504 条 URL 里大部分的 lastmod 是手打
的字面量,一冻就是两个多月。这不是"日期不准"这么轻——sitemap 的 lastmod 是爬虫决定
重抓优先级的主要输入,把 9 月 6 日的改动报成 6 月 30 日,等于自己把重抓请求撤回。

为什么不能简单地"每天盖今天"
舰队红线:**不许把日期往前推而内容没变**(诚实新鲜度)。一个每天盖今天的 cron 会把
全站 500 条 URL 每天都报成"刚改过",两周内爬虫就学会不信这个 sitemap。

为什么不能直接用 `git log -1`
可以用来引导,但不能当日常真相:一次给 176 个页面统一注入导航的提交会把全站日期一起
推到那天,而那天其实一个字的内容都没变。

所以:**按内容哈希记账**。每天算一次规范化后的页面哈希;哈希变了才把日期推到今天,
没变就沿用台账里记的那一天。日期因此**在结构上不可能**比真实内容新——它只能在字节
真的不同的那天前进。同一次计算顺带产出"今天真的变了的 URL 集合",这正是 IndexNow
该提交的东西(全量重提被 IndexNow 自己的 FAQ 判为垃圾信号)。
"""
import hashlib
import json
import os
import re

from config import REPO

LEDGER_DIR = os.path.join(REPO, "data", "autopilot")
HASH_LEN = 16


def content_hash(cfg, abs_path):
    """sha256 of the page with injected chrome blanked out."""
    with open(abs_path, "rb") as fh:
        raw = fh.read()
    text = raw.decode("utf-8", errors="replace")
    for pat in cfg.normalize:
        text = pat.sub("", text)
    # Trailing-whitespace / CRLF churn is not a content change.
    text = "\n".join(line.rstrip() for line in text.splitlines())
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:HASH_LEN]


def bootstrap_date(prior_lastmod, today):
    """Day-one date for a page we have never hashed before.

    NOT git. `git log -1 -- <path>` looks authoritative and is wrong here, three
    ways, all verified 2026-09-11:
      1. 8 of 9 deploy workflows use a bare `actions/checkout@v4` (depth 1), so
         inside those jobs git has no per-file history to return at all.
      2. Commit 3fe8104 ("chore: record daily metrics", 2026-09-06) added **2744
         files as new**, 229 of them agiscorecard pages. git therefore believes
         those pages last changed on 2026-09-06. They did not — that is a repo
         operation, not an edit. Bootstrapping from git would have stamped 208
         agiscorecard URLs with a freshness claim nobody earned.
      3. This clone is shallow (173 commits, back to 2026-08-28), so there is no
         deeper history to appeal to even when it would help.

    So the floor is the site's OWN previous public claim — the <lastmod> already
    in the sitemap — clamped to today. Day one moves no date. From day two the
    hash is the authority and every real edit dates itself correctly, forever.
    Understating freshness is allowed; inventing it is not.
    """
    d = (prior_lastmod or "")[:10]
    if not re.match(r"^\d{4}-\d{2}-\d{2}$", d):
        return ""          # no defensible date -> caller omits <lastmod> entirely
    return min(d, today)


def ledger_path(site):
    return os.path.join(LEDGER_DIR, "%s.json" % site)


def load(site):
    p = ledger_path(site)
    if not os.path.isfile(p):
        return {"site": site, "pages": {}}
    with open(p, encoding="utf-8") as fh:
        data = json.load(fh)
    # Reject rather than repair: a malformed ledger would otherwise silently
    # re-bootstrap every page to today and fabricate 500 freshness claims.
    if not isinstance(data.get("pages"), dict):
        raise ValueError("%s: malformed ledger (pages is not an object)" % p)
    return data


def save(site, data):
    os.makedirs(LEDGER_DIR, exist_ok=True)
    with open(ledger_path(site), "w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=1, sort_keys=True)
        fh.write("\n")


def scan(cfg, pages, today, prior=None, prior_lastmod=None):
    """Return (ledger, changed_rels, bootstrapped_rels).

    pages: publish_root-relative paths to track.
    today: 'YYYY-MM-DD' (UTC) — passed in, never read from the clock here, so the
           whole run is reproducible and testable.
    """
    prior_lastmod = prior_lastmod or {}
    data = prior if prior is not None else load(cfg.site)
    known = data.get("pages", {})
    changed, bootstrapped = [], []
    seen = set()
    for rel in sorted(pages):
        seen.add(rel)
        abs_path = os.path.join(cfg.publish_root, rel)
        h = content_hash(cfg, abs_path)
        entry = known.get(rel)
        if entry is None:
            date = bootstrap_date(prior_lastmod.get(rel), today)
            known[rel] = {"h": h, "changed": date, "origin": "bootstrap"}
            bootstrapped.append(rel)
        elif entry.get("h") != h:
            known[rel] = {"h": h, "changed": today, "origin": "observed"}
            changed.append(rel)
        # unchanged: entry keeps its stored date. This is the honesty guarantee.
    # Pages that disappeared stop being tracked, but we record that they went so a
    # silent mass-deletion is visible in the diff rather than just absent.
    dropped = sorted(set(known) - seen)
    for rel in dropped:
        known.pop(rel, None)
    data["site"] = cfg.site
    data["pages"] = known
    data["generated"] = today
    data["dropped_last_run"] = dropped
    return data, changed, bootstrapped
