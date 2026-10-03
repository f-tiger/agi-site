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
    note=m1(r'<!-- evidence-asset:start -->(.*?)<!-- evidence-asset:end -->')
    if note:
        answer=text_of(re.search(r'<p class="evidence-answer">(.*?)</p>',note,re.S)[1])
        stamp=text_of(re.search(r'<p class="evidence-stamp">(.*?)</p>',note,re.S)[1])
        links=re.findall(r'<a href="([^"]+)" data-evidence-action="source_open">(.*?)</a>',note,re.S)
        capsule=answer+' '+stamp+' Sources: '+'; '.join(text_of(label)+' — '+url for url,label in links)+' Older article summary: '+capsule
    faqs = []
    for q, a in re.findall(r'<(?:div|h3) class="faq-q">(.*?)</(?:div|h3)>\s*<p>(.*?)</p>', s, re.S):
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
        if not slug: slug = 'index'
        if '/' in slug and not slug.startswith(('earn/','future-guide/','zh/future-guide/')) and slug not in ('zh/jarvis','zh/future-guide','zh/progress-index','zh/ai-and-your-job','zh/will-agi-arrive-2027','zh/did-open-source-ai-fade'):          # selected published collections and evidence translations only.
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
        '> Homepage mirror: https://agiscorecard.com/index.md; selected other pages use their URL + ".md".',
        '> (e.g. https://agiscorecard.com/what-is-agi.md).',
        '',
    ]
    full = list(head)
    n_md = 0
    for slug, url, fpath in pages:
        title, desc, updated, capsule, faqs = extract(fpath)
        if slug in ('jarvis','zh/jarvis'):
            source_html = open(fpath, encoding='utf-8').read()
            faq_section = re.search(r'<section id="faq".*?>(.*?)</section>', source_html, re.S)
            if faq_section:
                faqs = [(text_of(q), text_of(a)) for q, a in re.findall(r'<summary>(.*?)</summary><p>(.*?)</p>', faq_section[1], re.S)]
        if not title:
            continue
        md = page_md(slug, url, title, desc, updated, capsule, faqs)
        if slug in ('index','cn'):
            source_html = open(fpath, encoding='utf-8').read()
            home = re.search(r'<!-- home-focus:start -->(.*?)<!-- home-focus:end -->', source_html, re.S)
            if home:
                visible = re.sub(r'<(script|style)\b[^>]*>.*?</\1>', '', home[1], flags=re.S|re.I)
                linked = re.sub(r'<a\b[^>]*href="([^"]+)"[^>]*>(.*?)</a>', lambda m: m[2]+' ('+m[1]+')', visible, flags=re.S)
                readable = text_of(linked)
                md += '\n## Videos, perspectives and next steps\n\n' + readable + '\n'
                full += ['## Videos, perspectives and next steps', '', 'URL: '+url, '', readable, '']
        if slug in ('future-guide','zh/future-guide') or slug.startswith(('future-guide/','zh/future-guide/')):
            source_html = open(fpath, encoding='utf-8').read()
            body = re.search(r'<main id="main">(.*?)</main>', source_html, re.S)
            if body:
                # Published text only; retain source URLs and the editorial/AI boundary.
                visible = re.sub(r'<(script|style)\b[^>]*>.*?</\1>', '', body.group(1), flags=re.S|re.I)
                linked = re.sub(r'<a\b[^>]*href="([^"]+)"[^>]*>(.*?)</a>', lambda m: m[2]+' ('+m[1]+')', visible, flags=re.S)
                readable = text_of(linked)
                md += '\n## Source-linked future guide\n\n' + readable + '\n'
                full += ['## Source-linked future guide', '', 'URL: '+url, '', readable, '']
        if slug == 'earn' or slug.startswith('earn/'):
            source_html = open(fpath, encoding='utf-8').read()
            body = re.search(r'<main id="main">(.*?)</main>', source_html, re.S)
            if body:
                md += '\n## Delivery guidance\n\n' + text_of(body.group(1)) + '\n'
        if slug == 'portfolio-tracker':
            source_html = open(fpath, encoding='utf-8').read()
            method = re.search(r'<section id="method">(.*?)</section>', source_html, re.S)
            if method:
                md += '\n## Registered tracking method\n\n' + text_of(method.group(1)) + '\n\nRegistered rules: https://agiscorecard.com/portfolio-assets/manifest.json\nDated performance and corrections: https://agiscorecard.com/portfolio-assets/snapshot.json\n'
        if slug == 'invest':
            source_html = open(fpath, encoding='utf-8').read()
            workbench = re.search(r'<!-- invest-research-body:start -->(.*?)<!-- invest-research-body:end -->', source_html, re.S)
            if workbench:
                # Extract only static teaching content; no user-entered browser records exist here.
                readable = text_of(workbench.group(1))
                evidence_url = 'https://agiscorecard.com/invest-research/evidence.json'
                md += '\n## Source-led research workbench\n\n' + readable + '\n\nDated examples: ' + evidence_url + '\n'
                full += ['## Investment research workflow', '', readable, '', 'Dated examples: ' + evidence_url, '']
        md_name = (slug[:-5] if slug.endswith('.html') else slug) + '.md'
        # /skill.md is the installable SKILL file the /skill page tells agents to curl
        # (hand-maintained, with frontmatter). Until 2026-09-26 this loop overwrote it
        # with the page's Markdown mirror on every deploy, so the advertised one-command
        # install delivered a mirror with no frontmatter and no instructions.
        if md_name == 'skill.md':
            continue
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
