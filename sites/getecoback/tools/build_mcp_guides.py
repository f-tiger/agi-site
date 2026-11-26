#!/usr/bin/env python3
"""One published, readable corpus for both MCP search and retrieval.

Run after the page/Markdown generators. The browser keeps its broader search
index; MCP only advertises canonical pages with a built, cleaned text mirror.
"""
import json
import re
from collections import Counter
from html import unescape
from build_search import SITE, collect, public_pages
from build_llmstxt import ENERGY_PATHS, checked_mirror


def readable_sections(source, markdown, entry):
    selected = {row['id'] for row in entry.get('model_sections', [])}
    if entry.get('section'):
        selected.add(entry['section']['id'])
    if not selected:
        return {}
    wrapped_sections = {
        '/guide/fenster-beschlagen-innen.html': 'fenstersauger-gegen-kondenswasser',
        '/guide/richtig-lueften-im-winter.html': 'lueften-vorher-nachher',
    }
    wrapper = wrapped_sections.get(entry['u'])
    labels = {}
    if wrapper in selected:
        label = re.search(r'<section id="' + re.escape(wrapper) + r'" aria-labelledby="([a-z0-9-]{1,80})">', source)
        if label:
            labels[label[1]] = wrapper
            selected.add(label[1])
    headings = Counter(markdown.splitlines())
    matches = {}
    for depth, attrs, body in re.findall(r'<h([2-6])\b([^>]*)>(.*?)</h\1>', source, re.S):
        anchor = re.search(r'\sid="([a-z0-9-]{1,80})"', attrs)
        if anchor is None or anchor[1] not in selected:
            continue
        text = unescape(re.sub(r'<[^>]+>', '', body)).strip()
        heading = '#' * int(depth) + ' ' + text
        if len(heading) <= 240 and headings[heading] == 1:
            matches[labels.get(anchor[1], anchor[1])] = heading
    return matches


def collect_guides():
    searchable = {entry['u']: entry for entry in collect()}
    entries = []
    for page, route, lang, head in public_pages():
        if not route.endswith('.html'):
            continue
        mirror = page.with_suffix('.md')
        if not mirror.is_file():
            continue
        text = mirror.read_text()
        # Standard mirrors come from the editorial/source-policy converter.
        # Dedicated locale/tools use their existing HTML-evidence validator.
        canonical = f'Canonical (HTML, zitierfähig): https://getecoback.com{route}'
        if canonical not in text.splitlines():
            if route.lstrip('/') not in ENERGY_PATHS and not route.startswith(('/fr/', '/es/', '/zh/agents/', '/en/agents/')):
                continue
            text = checked_mirror(page, page.read_text(), route)
            candidates = [f'Canonical: https://getecoback.com{route}',
                          f'Canonical (HTML): https://getecoback.com{route}',
                          f'https://getecoback.com{route}']
            canonical = next((line for line in candidates if line in text.splitlines()), None)
        if not text.startswith('# ') or not canonical:
            continue
        entry = dict(searchable[route])
        # Task navigation belongs in navigation, never in a source summary.
        entry['d'] = ' '.join(head.description.split())[:320]
        entry['m'] = route[:-5] + '.md'
        entry['c'] = canonical
        if entry.get('section') or entry.get('model_sections'):
            sections = readable_sections(page.read_text(), text, entry)
            if sections:
                entry['readable_sections'] = sections
        entries.append(entry)
    return entries


def main():
    entries = collect_guides()
    if not entries:
        raise ValueError('No canonical Markdown guides available for MCP')
    path = SITE / 'mcp-guides.json'
    payload = json.dumps(entries, ensure_ascii=False, separators=(',', ':')) + '\n'
    if not path.exists() or path.read_text() != payload:
        path.write_text(payload)
    print(f'MCP corpus: {len(entries)} published canonical pages with readable Markdown')


if __name__ == '__main__':
    main()
