#!/usr/bin/env python3
"""One published, readable corpus for both MCP search and retrieval.

Run after the page/Markdown generators. The browser keeps its broader search
index; MCP only advertises canonical pages with a built, cleaned text mirror.
"""
import json
import re
from collections import Counter
from html.parser import HTMLParser
from build_agent_md import retained_fragment_ids
from build_search import SITE, collect, public_pages
from build_llmstxt import ENERGY_PATHS, checked_mirror


class SectionHeadings(HTMLParser):
    """Collect direct and labelled heading targets without following arbitrary IDREFs."""
    void = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link',
            'meta', 'param', 'source', 'track', 'wbr'}

    def __init__(self, selected):
        super().__init__()
        self.selected = selected
        self.stack = []
        self.ids = Counter()
        self.candidates = []
        self.current = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        anchor = attrs.get('id')
        if anchor:
            self.ids[anchor] += 1
        if tag in self.void:
            return
        if anchor and re.fullmatch(r'h[2-6]', tag) and not any(
                item[0] in ('template', 'script', 'style', 'noscript') for item in self.stack):
            targets = [anchor] if anchor in self.selected else []
            if self.stack:
                parent_tag, parent_id, label = self.stack[-1]
                if parent_tag == 'section' and parent_id in self.selected and label == anchor:
                    targets.append(parent_id)
            if targets and re.fullmatch(r'[a-z0-9-]{1,80}', anchor):
                self.current = (tag, anchor, targets, [])
        self.stack.append((tag, anchor, (attrs.get('aria-labelledby') or '').strip()))

    def handle_data(self, data):
        if self.current is not None:
            self.current[3].append(data)

    def handle_endtag(self, tag):
        if self.current is not None and self.current[0] == tag:
            _, anchor, targets, parts = self.current
            self.candidates.append((anchor, targets, '#' * int(tag[1]) + ' ' + ''.join(parts).strip()))
            self.current = None
        for index in range(len(self.stack) - 1, -1, -1):
            if self.stack[index][0] == tag:
                del self.stack[index:]
                break


def readable_sections(source, markdown, entry):
    selected = {row['id'] for row in entry.get('model_sections', [])}
    if entry.get('section'):
        selected.add(entry['section']['id'])
    if not selected:
        return {}
    parser = SectionHeadings(selected)
    parser.feed(source)
    parser.close()
    visible = retained_fragment_ids(source)
    headings = Counter(markdown.splitlines())
    matches = {}
    for label, targets, heading in parser.candidates:
        if label not in visible or parser.ids[label] != 1 or len(heading) > 240 or headings[heading] != 1:
            continue
        for target in targets:
            if target in visible and parser.ids[target] == 1:
                matches[target] = heading
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
