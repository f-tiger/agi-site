#!/usr/bin/env python3
"""Generate the agent-readable surfaces: llms-full.txt + per-page Markdown mirrors.

Everything is EXTRACTED from the shipped HTML pages (title, description, answer
capsule, FAQ) and data.json — no hand-written second copy exists, so these
surfaces cannot drift from the pages. Re-run whenever pages are added or edited
(same trigger as gen_feed.py). Page set = top-level EN entries in sitemap.xml.

Outputs:
  llms-full.txt         one file, every page's citable core, llms-full convention
  <slug>.md             one mirror per page (X-Robots-Tag: noindex is added by the
                        worker at serve time; the HTML page stays the canonical
                        and the citation surface)
"""
import html
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def text_of(fragment):
    """Strip tags, unescape entities, collapse whitespace."""
    t = re.sub(r'<[^>]+>', ' ', fragment)
    t = html.unescape(t)
    t = re.sub(r'\s+', ' ', t).strip()
    return re.sub(r'\s+([.,;:!?%)\]])', r'\1', t)

def extract(path):
    s = open(path, encoding='utf-8').read()
    def m1(pat):
        m = re.search(pat, s, re.S)
        return m.group(1) if m else ''
    title = text_of(m1(r'<title>(.*?)</title>'))
    desc = m1(r'<meta name="description" content="([^"]*)"')
    updated = text_of(m1(r'<div class="updated">(.*?)</div>'))
    cap = m1(r'<(?:div|p)[^>]*class="capsule"[^>]*>(.*?)</(?:div|p)>')
    capsule = text_of(cap) if cap else ''
    faqs = []
    for q, a in re.findall(r'<div class="faq-q">(.*?)</div>\s*<p>(.*?)</p>', s, re.S):
        faqs.append((text_of(q), text_of(a)))
    return title, html.unescape(desc), updated, capsule, faqs

def page_md(slug, url, title, desc, updated, capsule, faqs):
    out = ['# ' + title, '']
    if updated:
        out += ['_' + updated + '_', '']
    if capsule:
        out += ['**Answer:** ' + capsule, '']
    elif desc:
        out += [desc, '']
    if faqs:
        out.append('## FAQ')
        for q, a in faqs:
            out += ['', '**' + q + '**', '', a]
        out.append('')
    out += ['---',
            'Canonical page: ' + url,
            'Machine-readable verdicts: https://agiscorecard.com/data.json (CC BY 4.0)',
            'This Markdown mirror is generated from the page; the HTML page is canonical.', '']
    return '\n'.join(out)

def main():
    sm = open(os.path.join(ROOT, 'sitemap.xml'), encoding='utf-8').read()
    locs = re.findall(r'<loc>(https://agiscorecard\.com/[^<]*)</loc>', sm)
    pages = []
    for u in locs:
        slug = u.replace('https://agiscorecard.com/', '')
        if not slug or '/' in slug:          # top-level EN only; skip zh/, invest/, agi-type/ etc.
            continue
        fname = slug if slug.endswith('.html') else slug + '.html'
        fpath = os.path.join(ROOT, fname)
        if os.path.exists(fpath):
            pages.append((slug, u, fpath))

    data = json.load(open(os.path.join(ROOT, 'data.json'), encoding='utf-8'))
    tracker = data.get('thesisTracker', {})
    head = [
        '# The AGI Scorecard — full content for LLMs (llms-full.txt)',
        '',
        '> Independent tracker of the predictions in Leopold Aschenbrenner\'s "Situational',
        '> Awareness". Every page below: title, dated answer capsule, FAQ. Full dataset with',
        '> verdicts, evidence and flip conditions: https://agiscorecard.com/data.json (CC BY 4.0).',
        '> Thesis Tracker: %s/100 as of %s. Index: https://agiscorecard.com/llms.txt' % (
            tracker.get('score', ''), tracker.get('asOf', '')),
        '> Each page also has a Markdown mirror at its URL + ".md"',
        '> (e.g. https://agiscorecard.com/what-is-agi.md).',
        '',
    ]
    full = list(head)
    n_md = 0
    for slug, url, fpath in pages:
        title, desc, updated, capsule, faqs = extract(fpath)
        if not title:
            continue
        md = page_md(slug, url, title, desc, updated, capsule, faqs)
        md_name = (slug[:-5] if slug.endswith('.html') else slug) + '.md'
        open(os.path.join(ROOT, md_name), 'w', encoding='utf-8').write(md)
        n_md += 1
        full += ['## ' + title, '', 'URL: ' + url]
        if updated:
            full.append(updated)
        if capsule:
            full += ['', capsule]
        elif desc:
            full += ['', desc]
        for q, a in faqs:
            full += ['', 'Q: ' + q, 'A: ' + a]
        full += ['', '---', '']
    out = '\n'.join(full)
    open(os.path.join(ROOT, 'llms-full.txt'), 'w', encoding='utf-8').write(out)
    print('llms-full.txt: %d pages, %dKB; %d .md mirrors' % (
        len(pages), len(out.encode('utf-8')) // 1024, n_md))

if __name__ == '__main__':
    sys.exit(main())
