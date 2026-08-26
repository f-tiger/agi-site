#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""首页「Meistgesucht diese Woche」爆品轨(2026-08-25,owner:「eco的爆品方向需要
增加,扩大联盟点击」)。

数据源 = data/trends-rising.json(每日 04:30 runner 实抓的德区 rising 关联查询,
一手、带日期)。该文件每日提交会触发本站 deploy → 本脚本在部署链里重跑 → 轨道
**每天自动换新**,不需要任何人工选品。首页是全站流量第一(53 pv/28d)却只有 2 次
联盟点击的最大漏水面——这个轨就是补它的。

诚实规则(比选品逻辑更重要,红线):
1. 标注写明「Nachfrage-Signale aus unserer täglichen Google-Trends-Abfrage,
   keine Testurteile」+ 数据日期 + Affiliate 披露。热度是需求事实,不是推荐结论。
2. **警示映射优先于购买链接**:查询命中本站已发 Faktencheck/科普判定的主题时,
   chip 链到那篇文章而不是 Amazon——一边警告 EpiCooler 一边挂它的购买链是自打脸。
3. 促销/短保质期词(lidl/angebot)直接丢弃——快反规则 08-23 已判过这类。
幂等:EB_RISING_RAIL 标记间整段替换。挂在 deploy 链 build_season 之后。
"""
import json, os, re, sys, urllib.parse
from datetime import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "data", "trends-rising.json")
PAGE = os.path.join(ROOT, "site", "index.html")
TAG = "getecoback-21"
MIN_V = 7000          # 只收强信号
MAX_CHIPS = 8

# 查询关键词 → 站内判定页(诚实映射,购买链让位)
GUIDE_MAP = [
    (re.compile(r"epicooler|coolizi|air zuma", re.I),
     "/guide/epicooler-erfahrungen.html", "Faktencheck lesen statt kaufen"),
    (re.compile(r"ohne (abluft)?schlauch", re.I),
     "/guide/klimaanlage-ohne-abluftschlauch.html", "Erst die Physik, dann der Kauf"),
    (re.compile(r"schimmel.*keller.*entfernen|keller.*schimmel|schimmel im keller", re.I),
     "/guide/schimmel-im-keller-entfernen.html", "Anleitung mit ehrlicher Grenze"),
    (re.compile(r"testsieger", re.I),
     "/guide/luftentfeuchter-keller.html", "Warum wir keinen Testsieger küren"),
]
DROP = re.compile(r"lidl|angebot|aldi|action\b", re.I)


def main():
    if not os.path.exists(SRC):
        print("rising rail: no trends-rising.json — leaving page untouched")
        return
    data = json.load(open(SRC, encoding="utf-8"))
    stand = data.get("fetched", "")
    rows = []
    for seed, v in data.get("seeds", {}).items():
        for r in v.get("rising", []):
            q, val = str(r.get("q", "")).strip(), r.get("v", 0)
            if not q or not isinstance(val, int) or val < MIN_V or DROP.search(q):
                continue
            rows.append((val, q))
    rows.sort(reverse=True)
    seen, chips = set(), []
    for val, q in rows:
        key = q.lower()
        if key in seen:
            continue
        seen.add(key)
        guide = next(((url, note) for pat, url, note in GUIDE_MAP if pat.search(q)), None)
        if guide:
            url, note = guide
            chips.append(
                f'<a href="{url}" style="display:inline-flex;flex-direction:column;gap:2px;background:#fff;'
                f'border:1px solid #cfe0ea;border-radius:12px;padding:9px 14px;margin:0 8px 8px 0;'
                f'text-decoration:none;"><span style="font-weight:700;color:#0a4d7a;font-size:13.5px;">{q}</span>'
                f'<span style="font-size:11.5px;color:#5b6b78;">📖 {note} →</span></a>')
        else:
            k = urllib.parse.quote_plus(q)
            chips.append(
                f'<a href="https://www.amazon.de/s?k={k}&tag={TAG}" target="_blank" rel="sponsored noopener" '
                f'style="display:inline-flex;flex-direction:column;gap:2px;background:#fff;border:1px solid #cfe0ea;'
                f'border-radius:12px;padding:9px 14px;margin:0 8px 8px 0;text-decoration:none;">'
                f'<span style="font-weight:700;color:#1a2733;font-size:13.5px;">{q}</span>'
                f'<span style="font-size:11.5px;color:#c47b08;font-weight:700;">Preis auf Amazon prüfen →</span></a>')
        if len(chips) == MAX_CHIPS:
            break

    html = open(PAGE, encoding="utf-8").read()
    if not chips:
        # 没有过线信号就整段移除(留标记),绝不显示旧数据
        block = "<!--EB_RISING_RAIL--><!--/EB_RISING_RAIL-->"
    else:
        stand_de = ".".join(reversed(stand.split("-"))) if stand else ""
        block = (
            '<!--EB_RISING_RAIL--><section id="eb-rising" style="border-top:1px solid #eef2f5;">'
            '<div style="max-width:1000px;margin:0 auto;padding:26px 20px;">'
            '<h2 style="margin:0 0 4px;">🔥 Meistgesucht diese Woche</h2>'
            f'<p style="margin:0 0 12px;font-size:13.5px;color:#5b6b78;max-width:74ch;">Nachfrage-Signale aus unserer '
            f'täglichen Google-Trends-Abfrage (Stand {stand_de}) — keine Testurteile, nicht selbst getestet. '
            'Wo wir zu einem Suchbegriff einen Faktencheck haben, verlinken wir den statt eines Kauf-Links. '
            'Kauf-Links sind Affiliate-Links — für dich derselbe Preis.</p>'
            '<div>' + "".join(chips) + '</div></div></section>'
            '<script>(function(){var s=document.getElementById("eb-rising");if(!s)return;'
            's.querySelectorAll(\'a[href*="amazon."]\').forEach(function(a){a.addEventListener("click",function(){'
            'if(window.gtag)gtag("event","affiliate_click",{source:"home-rising",link_url:a.href});});});'
            's.querySelectorAll(\'a[href^="/guide/"]\').forEach(function(a){a.addEventListener("click",function(){'
            'if(window.gtag)gtag("event","rising_guide",{target:a.getAttribute("href")});});});})();</script>'
            '<!--/EB_RISING_RAIL-->')

    if "<!--EB_RISING_RAIL-->" in html:
        html = re.sub(r"<!--EB_RISING_RAIL-->[\s\S]*?<!--/EB_RISING_RAIL-->", lambda m: block, html, count=1)
    elif "<!--EB_HERBST-->" in html:
        html = html.replace("<!--EB_HERBST-->", block + "\n<!--EB_HERBST-->", 1)
    elif "<!--EB_HOMESTORAGE-->" in html:
        html = html.replace("<!--EB_HOMESTORAGE-->", block + "\n<!--EB_HOMESTORAGE-->", 1)
    else:
        print("FAIL: no anchor for rising rail", file=sys.stderr)
        sys.exit(1)
    open(PAGE, "w", encoding="utf-8").write(html)
    print(f"rising rail: {len(chips)} chips (Stand {stand})")


if __name__ == "__main__":
    main()
