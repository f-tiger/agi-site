#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Surgical <lastmod> correction — rewrite dates, never the inventory.

设计约束(故意很窄):本模块**只改已存在 <url> 块里的 <lastmod> 文本**。绝不新增
URL、绝不删除 URL、绝不改 <loc>/<priority>/<changefreq>、绝不重排。理由:sitemap 的
清单是编辑判断(哪些页该被收录),而 lastmod 是可计算的事实。autopilot 只碰事实那一半。

<loc> 解析不到文件时:**原样保留,并计数**。超过 max_unresolved 就整轮失败——解析不
出来说明 URL→文件的映射错了,这时候"把能改的改了"等于按一个已知错误的映射去写日期。
"""
import re

LASTMOD_RE = re.compile(r"(<lastmod>)([^<]*)(</lastmod>)")
URLBLOCK_RE = re.compile(r"<url>.*?</url>", re.S)
LOC_RE = re.compile(r"<loc>([^<]+)</loc>")


class SitemapError(RuntimeError):
    pass


def apply_dates(cfg, text, dates):
    """dates: {publish-root-relative path: 'YYYY-MM-DD'}. Returns (new_text, report)."""
    updated, unchanged, unresolved, nodate = [], [], [], []

    def fix_block(m):
        block = m.group(0)
        loc = LOC_RE.search(block)
        if not loc:
            unresolved.append("<url> block with no <loc>")
            return block
        url = loc.group(1).strip()
        rel = cfg.rel_for_url(url)
        if rel is None:
            unresolved.append(url)
            return block
        date = dates.get(rel)
        if not date:
            nodate.append(url)
            return block
        if not LASTMOD_RE.search(block):
            # No <lastmod> to correct. Adding one would be changing the inventory's
            # shape, which this module does not do; report it instead.
            nodate.append(url + " (no <lastmod> element)")
            return block
        before = LASTMOD_RE.search(block).group(2).strip()
        if before[:10] == date:
            unchanged.append(url)
            return block
        updated.append((url, before, date))
        return LASTMOD_RE.sub(lambda mm: mm.group(1) + date + mm.group(3), block, count=1)

    new_text = URLBLOCK_RE.sub(fix_block, text)
    if len(unresolved) > cfg.max_unresolved:
        raise SitemapError(
            "%s: %d sitemap <loc> could not be resolved to a file (max_unresolved=%d). "
            "First few: %s. Refusing to write dates from a mapping that is wrong."
            % (cfg.site, len(unresolved), cfg.max_unresolved, unresolved[:5])
        )
    return new_text, {
        "updated": updated,
        "unchanged": len(unchanged),
        "unresolved": unresolved,
        "nodate": nodate,
    }
