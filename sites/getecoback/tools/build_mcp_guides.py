#!/usr/bin/env python3
"""One published, readable corpus for both MCP search and retrieval.

Run after the page/Markdown generators. The browser keeps its broader search
index; MCP only advertises canonical pages with a built, cleaned text mirror.
"""
import json
from build_search import SITE, collect, public_pages
from build_llmstxt import ENERGY_PATHS, checked_mirror


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
