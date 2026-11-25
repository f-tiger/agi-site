#!/usr/bin/env python3
"""Generate the agent-readable surfaces: llms-full.txt + per-page Markdown mirrors.

Render the public tool evidence from existing catalog and publisher snapshots.
Extract the mirrors from shipped HTML (title, description, answer capsule, FAQ
and selected source records). Re-run whenever pages or shipped snapshots change.

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
from urllib.parse import urljoin, urlsplit

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORIGIN = 'https://agiscorecard.com'
REVIEWED_PAGES = {
    'will-agi-arrive-2027', 'zh/will-agi-arrive-2027',
    'did-open-source-ai-fade', 'zh/did-open-source-ai-fade', 'agi-2027-resolution',
}


def read_json(name):
    with open(os.path.join(ROOT, name), encoding='utf-8') as src:
        return json.load(src)


def write_region(document, key, body):
    start = '<!-- ' + key + ':start -->'
    end = '<!-- ' + key + ':end -->'
    pattern = re.escape(start) + r'.*?' + re.escape(end)
    result, count = re.subn(pattern, lambda _: start + '\n' + body + '\n' + end, document, flags=re.S)
    if count != 1:
        raise ValueError(f'Expected one {key} region, got {count}')
    return result


def https_link(url):
    parsed = urlsplit(url)
    if parsed.scheme != 'https' or not parsed.hostname or parsed.username or parsed.password:
        raise ValueError(f'Invalid public source URL: {url}')
    return html.escape(url, quote=True)


def snapshot_time(value, zh):
    if not value:
        return '未知' if zh else 'Unknown'
    return html.escape(value.replace('T', ' ').removesuffix('Z')) + ' UTC'


def build_tool_evidence():
    catalog = read_json('mcp-directory-assets/catalog.json')
    reviewed = [entry for entry in catalog['entries'] if entry.get('featured')]
    releases = read_json('futures-assets/release-checks/releases.json')['sources']
    advisory_sources = {source['id']: source for source in read_json('futures-assets/release-checks/advisories.json')['sources']}
    for locale in ('', 'zh/'):
        zh = bool(locale)
        directory_path = os.path.join(ROOT, locale, 'agents/index.html')
        with open(directory_path, encoding='utf-8') as src:
            directory = src.read()
        rows = []
        for entry in reviewed[:6]:
            title = html.escape(entry['title'])
            description = html.escape(entry['noteZh' if zh else 'note'])
            docs = https_link(entry['documentationUrl'])
            source = https_link(entry['sourceUrl'])
            mode = {'remote': '远程托管' if zh else 'Hosted', 'local': '本地安装' if zh else 'Local installation'}
            transports = ' · '.join(mode[item] for item in entry['transports'])
            docs_label = '发布方接入文档' if zh else 'Publisher setup guide'
            source_label = '条目来源' if zh else 'Registry source'
            rows.append(
                '<li class="directory-result">'
                f'<h3>{title}</h3><p>{description}</p><p>{transports}</p>'
                f'<p class="directory-links"><a href="{docs}" rel="noreferrer" data-catalog-action="docs">{docs_label}</a>'
                f'<a href="{source}" rel="noreferrer" data-catalog-action="source">{source_label}</a></p></li>'
            )
        directory = write_region(directory, 'catalog-evidence', '\n'.join(rows))
        snapshot_date = html.escape(catalog['asOf'])
        counts = (f'共收录 {len(catalog["entries"]):,} 个服务，已核对 {len(reviewed)} 个发布方的文档。'
                  if zh else f'{len(catalog["entries"]):,} servers in the snapshot, including {len(reviewed)} with publisher docs reviewed.')
        directory = write_region(directory, 'catalog-summary', counts)
        directory = write_region(directory, 'catalog-date', f'<time datetime="{snapshot_date}">{snapshot_date}</time>')
        with open(directory_path, 'w', encoding='utf-8') as dest:
            dest.write(directory)

        tools_path = os.path.join(ROOT, locale, 'ai-tools.html')
        with open(tools_path, encoding='utf-8') as src:
            tools = src.read()
        for source in releases:
            latest = next(iter(source['releases']), None)
            if latest:
                version = html.escape(latest['version'])
                label = '快照中的最新稳定版' if zh else 'Newest stable version in snapshot'
                date = snapshot_time(latest['publishedAt'], zh)
                release = f'{label} <a href="{https_link(latest["url"])}">{version}</a> · {date}'
            else:
                release = '版本未知' if zh else 'Version unknown'
            status = {
                'ok': '已核对来源' if zh else 'Release source checked',
                'partial': '版本来源覆盖不完整' if zh else 'Partial release source coverage',
                'unavailable': '版本来源暂不可读' if zh else 'Release source unavailable',
            }[source['status']]
            checked = snapshot_time(source['checkedAt'], zh)
            freshness = status + ' · ' + checked
            if source['status'] != 'ok' and source.get('lastSuccessAt'):
                previous = '上次成功读取' if zh else 'Last successful read'
                freshness += f'<br>{previous} · {snapshot_time(source["lastSuccessAt"], zh)}'
            advisory = advisory_sources[source['id']]
            advisory_label = '发布方安全公告' if zh else 'Publisher security advisories'
            advisory_status = {
                'ok': '最近一次读取成功' if zh else 'last read succeeded',
                'unavailable': '本次读取不可用，适用性未知' if zh else 'latest read unavailable, applicability unknown',
            }.get(advisory['status'], '覆盖未知' if zh else 'coverage unknown')
            advisory_date = snapshot_time(advisory.get('checkedAt'), zh)
            body = '\n'.join([
                f'<p class="rc-latest">{release}</p>',
                f'<p class="rc-freshness">{freshness}</p>',
                f'<p class="rc-advisory"><a href="{https_link(advisory["sourceUrl"])}">{advisory_label}</a> · {advisory_status} · {advisory_date}</p>',
            ])
            tools = write_region(tools, 'release-' + source['id'], body)
        with open(tools_path, 'w', encoding='utf-8') as dest:
            dest.write(tools)


def linked_text(fragment, url):
    def retain_link(match):
        return match[2] + ' (' + urljoin(url, html.unescape(match[1])) + ')'
    linked = re.sub(r'<a\b[^>]*href="([^"]+)"[^>]*>(.*?)</a>', retain_link, fragment, flags=re.S)
    return text_of(linked)


def tool_source_summary(slug, url, fpath):
    with open(fpath, encoding='utf-8') as src:
        source = src.read()
    zh = slug.startswith('zh/')
    if slug in ('ai-tools', 'zh/ai-tools'):
        intro = re.search(r'<p class="rc-intro">(.*?)</p>', source, re.S)[1]
        parts = [text_of(intro)]
        for name in ('codex', 'claude-code'):
            card = re.search(r'<div class="rc-client" data-repo="' + name + r'">(.*?)</div>', source, re.S)[1]
            parts.append(linked_text(card, url))
        evidence = re.search(r'<p class="rc-datasets">(.*?)</p>', source, re.S)[1]
        parts.append(linked_text(evidence, url))
        return ('## AI 编程助手版本核验' if zh else '## AI coding assistant release checks'), '\n\n'.join(parts)
    if slug in ('agents/', 'zh/agents/'):
        date = text_of(re.search(r'<p class="directory-date"[^>]*>(.*?)</p>', source, re.S)[1])
        count = text_of(re.search(r'<p class="directory-status"[^>]*>(.*?)</p>', source, re.S)[1])
        rows = re.search(r'<!-- catalog-evidence:start -->(.*?)<!-- catalog-evidence:end -->', source, re.S)[1]
        entries = ['- ' + linked_text(row, url) for row in re.findall(r'<li\b[^>]*>(.*?)</li>', rows, re.S)]
        datasets = re.search(r'<ul class="directory-sources">(.*?)</ul>', source, re.S)[1]
        datasets = re.sub(r'<li\b[^>]*\bhidden\b[^>]*>.*?</li>', '', datasets, flags=re.S)
        heading = '## MCP 工具目录来源' if zh else '## MCP directory source records'
        return heading, '\n\n'.join([date, count, '\n'.join(entries), linked_text(datasets, url)])
    if slug == 'for-agents':
        native = re.search(r'<h2>MCP server \(native tool access\)</h2>(.*?)<h2\b', source, re.S)[1]
        parts = [linked_text(paragraph, url) for paragraph in re.findall(r'<p>(.*?)</p>', native, re.S)[:2]]
        return '## Native MCP', '\n\n'.join(parts)
    return None

def text_of(fragment):
    """Strip tags, unescape entities, collapse whitespace."""
    t = re.sub(r'<[^>]+>', ' ', fragment)
    t = html.unescape(t)
    t = re.sub(r'\s+', ' ', t).strip()
    return re.sub(r'\s+([.,;:!?%)\]])', r'\1', t)

def extract(path, reviewed=False):
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
        summary_label = ' Page summary: ' if reviewed else ' Older article summary: '
        capsule=answer+' '+stamp+' Sources: '+'; '.join(text_of(label)+' — '+url for url,label in links)+summary_label+capsule
    roadmap = m1(r'<!-- roadmap-body:start -->(.*?)<!-- roadmap-body:end -->')
    if roadmap:
        capsule = text_of(re.search(r'<div class="rm-verdict">(.*?)</div>', roadmap, re.S)[1])
        updated = 'Editorial route review: ' + m1(r'"dateModified":\s*"(20[0-9-]+)"')
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
    build_tool_evidence()
    sm = open(os.path.join(ROOT, 'sitemap.xml'), encoding='utf-8').read()
    locs = re.findall(r'<loc>(https://agiscorecard\.com/[^<]*)</loc>', sm)
    pages = []
    for u in locs:
        slug = u.replace('https://agiscorecard.com/', '')
        if not slug: slug = 'index'
        if '/' in slug and not slug.startswith(('earn/','future-guide/','zh/future-guide/')) and slug not in ('agents/','zh/agents/','zh/ai-tools','zh/ai-infrastructure','zh/tianya','zh/tianya-research','zh/ai-futures','zh/invest','zh/jarvis','zh/future-guide','zh/progress-index','zh/ai-and-your-job','zh/will-agi-arrive-2027','zh/did-open-source-ai-fade'):          # selected published collections and evidence translations only.
            continue
        fname = slug + 'index.html' if slug.endswith('/') else (slug if slug.endswith('.html') else slug + '.html')
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
        title, desc, updated, capsule, faqs = extract(fpath, reviewed=slug in REVIEWED_PAGES)
        if slug in ('jarvis','zh/jarvis'):
            source_html = open(fpath, encoding='utf-8').read()
            faq_section = re.search(r'<section id="faq".*?>(.*?)</section>', source_html, re.S)
            if faq_section:
                faqs = [(text_of(q), text_of(a)) for q, a in re.findall(r'<summary>(.*?)</summary><p>(.*?)</p>', faq_section[1], re.S)]
        if not title:
            continue
        md = page_md(slug, url, title, desc, updated, capsule, faqs)
        tool_evidence = tool_source_summary(slug, url, fpath) if slug in (
            'ai-tools', 'zh/ai-tools', 'agents/', 'zh/agents/', 'for-agents'
        ) else None
        if tool_evidence and not slug.endswith('/'):
            heading, body = tool_evidence
            md += '\n' + heading + '\n\n' + body + '\n'
        if slug in REVIEWED_PAGES:
            with open(fpath, encoding='utf-8') as src:
                review = re.findall(r'<section id="review-(\d{4}-\d{2}-\d{2})"[^>]*>(.*?)</section>', src.read(), re.S)
            if not review:
                raise ValueError(f'Missing dated evidence review on {slug}')
            date, evidence = max(review, key=lambda item: item[0])
            heading = ('证据核对' if slug.startswith('zh/') else 'Evidence review') + ' · ' + date
            archive_url = url + '#review-' + date
            paragraphs = re.findall(r'<(p|li)\b[^>]*>(.*?)</\1>', evidence, re.S)
            review_text = '\n\n'.join(('- ' if tag == 'li' else '') + linked_text(body, url) for tag, body in paragraphs)
            md += '\n## ' + heading + '\n\n' + archive_url + '\n\n' + review_text + '\n'
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
                # A conditional business destination is not an unconditional mirror recommendation.
                body_text = re.sub(r'<a\b(?=[^>]*id="commercial-case")[^>]*>.*?</a>', '', body.group(1), flags=re.S)
                visible = re.sub(r'<(script|style)\b[^>]*>.*?</\1>', '', body_text, flags=re.S|re.I)
                linked = re.sub(r'<a\b[^>]*href="([^"]+)"[^>]*>(.*?)</a>', lambda m: m[2]+' ('+m[1]+')', visible, flags=re.S)
                readable = text_of(linked)
                md += '\n## Source-linked future guide\n\n' + readable + '\n'
                full += ['## Source-linked future guide', '', 'URL: '+url, '', readable, '']
        if slug in ('tianya','zh/tianya','zh/tianya-research'):
            source_html = open(fpath, encoding='utf-8').read()
            pattern = r'<aside class="research-context"[^>]*>(.*?)</aside>' if slug == 'zh/tianya-research' else r'<main\b[^>]*>(.*?)</main>'
            body = re.search(pattern, source_html, re.S)
            if body:
                linked = re.sub(r'<a\b[^>]*href="([^"]+)"[^>]*>(.*?)</a>', lambda m: m[2]+' ('+m[1]+')', body.group(1), flags=re.S)
                readable = text_of(linked)
                md += '\n## Tianya Echo — scope and evidence\n\n' + readable + '\n'
                full += ['## Tianya Echo — scope and evidence', '', 'URL: '+url, '', readable, '']
            if slug == 'zh/tianya-research':
                md += '\nSnapshot: 2026-10-05. All 60 curated claims remain strictly unknown. Migration is not a forecast refresh.\nEvidence: https://agiscorecard.com/tianya-research/analysis.json\nFrozen ledger: https://agiscorecard.com/tianya-research/practice-ledger.json\n'
        if slug in ('ai-futures','zh/ai-futures'):
            md = md.replace('Machine-readable verdicts: https://agiscorecard.com/data.json (CC BY 4.0)', 'Dated company sources: https://agiscorecard.com/futures-assets/snapshot.json\nConditional model baseline: https://agiscorecard.com/futures-assets/forecast.json (not calibrated probabilities)')
            source_html = open(fpath, encoding='utf-8').read()
            body = re.search(r'<main\b[^>]*>(.*?)</main>', source_html, re.S)
            if body:
                # Keep the static method and source links; never invent client-side results.
                visible = re.sub(r'<(script|style)\b[^>]*>.*?</\1>', '', body.group(1), flags=re.S|re.I)
                linked = re.sub(r'<a\b[^>]*href="([^"]+)"[^>]*>(.*?)</a>', lambda m: m[2]+' ('+m[1]+')', visible, flags=re.S)
                readable = text_of(linked)
                md += '\n## Conditional AI future simulation\n\n' + readable + '\n'
                full += ['## Conditional AI future simulation', '', 'URL: '+url, '', readable, '']
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
        if slug in ('invest','zh/invest'):
            source_html = open(fpath, encoding='utf-8').read()
            roadmap = re.search(r'<!-- roadmap-body:start -->(.*?)<!-- roadmap-body:end -->', source_html, re.S)
            if roadmap:
                linked = re.sub(r'<a\b[^>]*href="([^"]+)"[^>]*>(.*?)</a>', lambda m: m[2]+' ('+m[1]+')', roadmap[1], flags=re.S)
                readable = text_of(linked)
                md += '\n## AI industry roadmap and source evidence\n\n' + readable + '\n'
                full += ['## AI industry roadmap and source evidence', '', 'URL: '+url, '', readable, '']
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
        if not slug.endswith('/'):
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
        if tool_evidence:
            heading, body = tool_evidence
            full += ['', heading, '', body]
        if slug in REVIEWED_PAGES:
            full += ['', heading, archive_url, '', review_text]
        full += ['', '---', '']
    out = '\n'.join(full)
    open(os.path.join(ROOT, 'llms-full.txt'), 'w', encoding='utf-8').write(out)
    print('llms-full.txt: %d pages, %dKB; %d .md mirrors' % (
        len(pages), len(out.encode('utf-8')) // 1024, n_md))

if __name__ == '__main__':
    sys.exit(main())
