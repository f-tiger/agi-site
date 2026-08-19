#!/usr/bin/env python3
"""On-page structure layer learned from ranking German test/comparison sites
(competitor research 2026-07-15): every big Ratgeber page ships (1) an
Inhaltsverzeichnis with anchor jump links — which Google surfaces as jump
links/sitelinks in the SERP (documented ~18% CTR uplift, lower pogo-sticking)
— and (2) a visible "Aktualisiert am" date (freshness/trust signal; ours only
lived in JSON-LD where users can't see it).

Two idempotent injections for every guide page (DE + EN):

  EB_TOC      — table of contents built from the page's <h2> headings
                (adds slug ids to h2s that lack one; >=4 h2s required)
  EB_UPDATED  — visible "🗓 Aktualisiert am <date>" badge sourced from the
                page's own JSON-LD dateModified; re-runs keep it in sync

Run: python3 tools/build_onpage.py   (safe to re-run; new pages auto-covered)
"""
import glob
import html as htmllib
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DE_GUIDE = os.path.join(ROOT, "site", "guide")
EN_GUIDE = os.path.join(ROOT, "site", "en", "guide")

MIN_H2 = 4

DE_MONTHS = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli",
             "August", "September", "Oktober", "November", "Dezember"]
EN_MONTHS = ["January", "February", "March", "April", "May", "June", "July",
             "August", "September", "October", "November", "December"]


def slugify(text):
    t = htmllib.unescape(re.sub(r"<[^>]+>", "", text)).strip().lower()
    for a, b in (("ä", "ae"), ("ö", "oe"), ("ü", "ue"), ("ß", "ss")):
        t = t.replace(a, b)
    t = re.sub(r"[^a-z0-9]+", "-", t).strip("-")
    return t[:60] or "abschnitt"


def date_modified(html):
    m = re.search(r'"dateModified":\s*"(\d{4})-(\d{2})-(\d{2})"', html)
    return (int(m.group(1)), int(m.group(2)), int(m.group(3))) if m else None


def build_updated(html, en):
    dm = date_modified(html)
    if not dm:
        return None
    y, mo, d = dm
    if en:
        label = f"Updated {EN_MONTHS[mo - 1]} {d}, {y} · EcoBack editorial team"
    else:
        label = f"Aktualisiert am {d}. {DE_MONTHS[mo - 1]} {y} · EcoBack Redaktion"
    return ("<!--EB_UPDATED-->"
            f'<p style="font-size:13px;color:#5b6b78;margin:0 0 14px;">🗓 {label}</p>'
            "<!--/EB_UPDATED-->\n")


def inject_updated(html, en):
    badge = build_updated(html, en)
    if not badge:
        return html
    if "<!--EB_UPDATED-->" in html:
        return re.sub(r"<!--EB_UPDATED-->.*?<!--/EB_UPDATED-->\n?", badge, html, flags=re.S)
    m = re.search(r"<article>\s*", html)
    if not m:
        return html
    return html[:m.end()] + badge + "  " + html[m.end():]


def inject_toc(html, en):
    # collect h2s inside <article>
    art = re.search(r"<article>(.*?)</article>", html, re.S)
    if not art:
        return html
    body = art.group(1)
    h2s = list(re.finditer(r"<h2([^>]*)>(.*?)</h2>", body, re.S))
    if len(h2s) < MIN_H2:
        return html

    # ensure ids (only touch h2s without one), build entries
    seen, entries, new_body, last = {}, [], [], 0
    for m in h2s:
        attrs, inner = m.group(1), m.group(2)
        idm = re.search(r'id="([^"]+)"', attrs)
        if idm:
            hid = idm.group(1)
            replacement = m.group(0)
        else:
            hid = slugify(inner)
            n = seen.get(hid, 0)
            seen[hid] = n + 1
            if n:
                hid = f"{hid}-{n + 1}"
            replacement = f'<h2 id="{hid}"{attrs}>{inner}</h2>'
        label = re.sub(r"\s+", " ", htmllib.unescape(re.sub(r"<[^>]+>", "", inner))).strip()
        entries.append((hid, label))
        new_body.append(body[last:m.start()])
        new_body.append(replacement)
        last = m.end()
    new_body.append(body[last:])
    body = "".join(new_body)

    title = "On this page" if en else "Inhaltsverzeichnis"
    items = "\n".join(
        f'    <li style="margin:4px 0;"><a href="#{hid}" style="text-decoration:none;">{htmllib.escape(lbl)}</a></li>'
        for hid, lbl in entries)
    toc = ("<!--EB_TOC-->\n"
           '  <nav style="background:#fff;border:1px solid #e4ebf0;border-radius:12px;'
           'padding:16px 20px;margin:20px 0;font-size:14.5px;" aria-label="' + title + '">\n'
           f"    <strong style=\"display:block;margin-bottom:8px;\">{title}</strong>\n"
           '    <ol style="margin:0 0 0 20px;">\n'
           f"{items}\n"
           "    </ol>\n"
           "  </nav>\n"
           "<!--/EB_TOC-->\n")

    # place after the disclosure box when present, else after the intro <p>
    if "<!--EB_TOC-->" in body:
        body = re.sub(r"<!--EB_TOC-->.*?<!--/EB_TOC-->\n?", toc, body, flags=re.S)
    else:
        disc = re.search(r'<div class="disclosure">.*?</div>\s*', body, re.S)
        if disc:
            body = body[:disc.end()] + "\n  " + toc + body[disc.end():]
        else:
            p = re.search(r"</p>\s*", body)
            if not p:
                return html
            body = body[:p.end()] + "\n  " + toc + body[p.end():]

    return html[:art.start(1)] + body + html[art.end(1):]


def main():
    toc_n = upd_n = 0
    for path in sorted(glob.glob(os.path.join(DE_GUIDE, "*.html")) +
                       glob.glob(os.path.join(EN_GUIDE, "*.html"))):
        en = os.sep + "en" + os.sep in path
        html = open(path, encoding="utf-8").read()
        new = inject_toc(html, en)
        if new != html:
            toc_n += 1
        newer = inject_updated(new, en)
        if newer != new:
            upd_n += 1
        if newer != html:
            open(path, "w", encoding="utf-8").write(newer)
    print(f"toc injected/updated: {toc_n} | updated-badge injected/updated: {upd_n}")


if __name__ == "__main__":
    main()
