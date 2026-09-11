#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Demand ingestion and matching — turn rising queries into a ranked gap queue.

诚实约束(照抄 eco build_rising_rail.py 打出来的规矩,它是舰队唯一跑通的需求→页面链路):
1. **时间戳取各 seed 的最小值**,不是文件顶层的 fetched。种子是轮转的(全池 2/次),
   顶层日期会比轨道上最旧的那条数据新——那正是 rail 自己的诚实规则禁止的。
2. 超过 10 天的需求文件直接判 UNAVAILABLE 并写明原因,**绝不当新鲜的用**。10 天 =
   全池轮转一圈的周期(20 seeds ÷ 2/run),也是行情板拒绝旧快照的同一个阈值。
3. **niche 词表守门**。2026-08-29 实测:seed 太小的时候 Google 会拿全国热搜填充
   related_queries——"akku staubsauger" 回来的是 belstaff / lululemon,而且分值都在阈值
   之上。不在本站词汇表里的词不存在。
4. 本模块**只输出队列,不碰任何页面**。它回答的是「今天有需求、而站内没有页面接得住」,
   这是给第②层(会判断的那一层)的排好序的选题输入,不是替它做决定。
"""
import datetime
import json
import os
import re

MAX_AGE_DAYS = 10
WORD = re.compile(r"[0-9a-zà-öø-ÿÀ-ɏ]{3,}", re.I)
DROP = re.compile(r"\b(lidl|aldi|angebot|gutschein|coupon|amazon|ebay|temu|shein)\b", re.I)


BREAKOUT = 1_000_000      # sorts above any real volume, and is labelled as a flag,
                          # never printed as if it were a measured number.


def parse_value(row, source):
    """Return (score, kind) or (None, reason-it-was-dropped).

    Google reports a rising query either as a growth percentage (an int) or as the
    literal "Breakout" / "new" when growth exceeds its scale. The fleet's fetchers
    also fall back to an autocomplete diff when the Trends quota is spent, and that
    fallback emits v="new" too — but a term newly appearing in autocomplete is a far
    weaker claim than a Trends breakout. `source` is what tells them apart, so it is
    read rather than assumed, and the two are never pooled into one ranking.
    """
    v = row.get("v")
    if isinstance(v, bool):
        return None, "boolean v"
    if isinstance(v, int):
        return v, "value"
    if isinstance(v, str):
        if v.strip().lower() in ("new", "breakout"):
            if "autocomplete" in str(source).lower():
                return 1, "autocomplete-new"
            return BREAKOUT, "breakout"
        if v.strip().isdigit():
            return int(v.strip()), "value"
    return None, "unparseable v=%r" % (v,)


def _d(s):
    try:
        return datetime.date.fromisoformat(str(s)[:10])
    except (ValueError, TypeError):
        return None


def load_terms(cfg, today):
    """Return (terms, notes). terms = [{q, v, seed, stand}] sorted by v desc."""
    notes, terms = [], []
    today_d = _d(today)
    for relpath in cfg.demand_files:
        path = os.path.join(os.path.dirname(os.path.dirname(
            os.path.dirname(os.path.abspath(__file__)))), relpath)
        if not os.path.isfile(path):
            notes.append("%s: absent" % relpath)
            continue
        try:
            with open(path, encoding="utf-8") as fh:
                data = json.load(fh)
        except (OSError, ValueError) as e:
            notes.append("%s: unreadable (%s)" % (relpath, e))
            continue
        if data.get("ok") is False:
            notes.append("%s: producer reported ok:false (%s)"
                         % (relpath, str(data.get("error", ""))[:80]))
            continue
        seeds = data.get("seeds") or {}
        if not isinstance(seeds, dict) or not seeds:
            notes.append("%s: no seeds block — not a rising file" % relpath)
            continue
        # The age gate is PER SEED, not per file. These files accumulate: each seed
        # keeps its own last-good rows and its own `fetched` date, because the pool
        # rotates 2 seeds per run. buysomething's rising.json carries seeds dated
        # 2026-08-25 through 09-10 in one file — a file-level gate on the oldest
        # seed threw away seventeen fresh ones. (eco's rail does use min() across
        # seeds, correctly, because it prints ONE visible "Stand" date for the whole
        # rail and must not overstate it. A queue has no single date to overstate;
        # every row carries the date of the seed it came from.)
        fresh_seeds = stale_seeds = undated = dropped_rows = 0
        unparsed, degraded_seeds = {}, set()
        for seed, v in seeds.items():
            if not isinstance(v, dict) or v.get("polluted"):
                continue
            stand = _d(v.get("fetched"))
            if not stand:
                undated += 1
                continue
            age = (today_d - stand).days if today_d else 999
            if age > MAX_AGE_DAYS:
                stale_seeds += 1
                continue
            fresh_seeds += 1
            src = v.get("source", "")
            for row in v.get("rising") or []:
                q = str(row.get("q", "")).strip()
                if not q:
                    dropped_rows += 1
                    continue
                if DROP.search(q):
                    dropped_rows += 1
                    continue
                score, kind = parse_value(row, src)
                if score is None:
                    unparsed.setdefault(kind, 0)
                    unparsed[kind] += 1
                    continue
                if kind == "autocomplete-new":
                    degraded_seeds.add(seed)
                terms.append({"q": q, "v": score, "kind": kind, "seed": seed,
                              "source": src, "stand": stand.isoformat()})
        if unparsed:
            notes.append("%s: %d rising row(s) had a value this tool cannot read (%s) "
                         "— counted, not guessed" % (relpath, sum(unparsed.values()),
                                                     "; ".join(sorted(unparsed))))
        if degraded_seeds:
            notes.append("%s: %d seed(s) are on the AUTOCOMPLETE FALLBACK, not Google "
                         "Trends rising (%s). Those rows are scored 1, not ranked "
                         "against real volume — the demand face for them is degraded, "
                         "not working." % (relpath, len(degraded_seeds),
                                           ", ".join(sorted(degraded_seeds))[:120]))
        if fresh_seeds == 0:
            notes.append("%s: every seed is older than %d days (%d stale, %d undated) "
                         "— nothing used, nothing reused as if fresh"
                         % (relpath, MAX_AGE_DAYS, stale_seeds, undated))
        elif stale_seeds or undated:
            notes.append("%s: %d fresh seed(s) used; %d stale and %d undated dropped"
                         % (relpath, fresh_seeds, stale_seeds, undated))
    terms.sort(key=lambda t: -t["v"])
    return terms, notes


def in_vocabulary(cfg, q):
    """A term the site has no vocabulary for is not this site's demand."""
    if not cfg.vocabulary:
        return True
    low = q.lower()
    return any(v.lower() in low for v in cfg.vocabulary)


def best_page(index, q):
    """Highest token-overlap page for a query, or (None, 0.0).

    Overlap is normalised by the query's own length, so a two-word query needs
    both words rather than being satisfied by one common one.
    """
    qtokens = [w.lower() for w in WORD.findall(q)]
    if not qtokens:
        return None, 0.0
    best, best_score = None, 0.0
    for rel, rec in index.items():
        tok = rec["tokens"]
        hit = sum(1 for w in qtokens if w in tok)
        if not hit:
            continue
        weight = sum(min(tok.get(w, 0), 6) for w in qtokens) / (6.0 * len(qtokens))
        score = (hit / len(qtokens)) * 0.7 + weight * 0.3
        if score > best_score:
            best, best_score = rel, score
    return best, round(best_score, 3)


COVERED = 0.60      # a page that scores this high already answers the query


def analyse(cfg, index, terms):
    """Split demand into covered / gaps. Deterministic, no clock, no network."""
    covered, gaps, offtopic = [], [], []
    for t in terms:
        if not in_vocabulary(cfg, t["q"]):
            offtopic.append(t["q"])
            continue
        rel, score = best_page(index, t["q"])
        row = dict(t, page=rel, match=score)
        (covered if score >= COVERED else gaps).append(row)
    return covered, gaps, offtopic
