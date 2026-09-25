"""Render localized tool chrome using the main site's current navigation/footer CSS.

Read literal template constants without importing the legacy site-wide builder,
which has unrelated build-time side effects.
"""
from pathlib import Path
import ast
import html
import json
import re

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / 'site'
COPY = json.loads((ROOT / 'data/eco-chrome.json').read_text())
ESC = lambda value: html.escape(str(value), quote=True)


def templates():
    names = {'NAV', 'FOOTER', 'CHROME_STYLE'}
    values = {}
    for node in ast.parse((ROOT / 'tools/build_structure.py').read_text()).body:
        if isinstance(node, ast.Assign) and len(node.targets) == 1:
            target = node.targets[0]
            if isinstance(target, ast.Name) and target.id in names:
                values[target.id] = ast.literal_eval(node.value)
    assert set(values) == names
    return values


TEMPLATES = templates()


def build_styles():
    # Keep the actual main-site nav/footer rules and homepage palette as sources.
    source = TEMPLATES['CHROME_STYLE']
    chrome = source[source.index('.eb-nav{'):source.index('.eb-cards{')]
    palette = re.search(r':root\s*\{([^}]+)\}', (SITE / 'index.html').read_text())[1]
    assert all('--' + key + ':' in palette for key in ('blue', 'blue-dark', 'amber', 'bg', 'text', 'muted'))
    extra = (ROOT / 'tools/eco_chrome_extra.css').read_text()
    (SITE / 'assets/eco-chrome.css').write_text(
        '/* Generated from ECO homepage tokens and build_structure.py navigation/footer. */\n'
        ':root{' + palette + '}\n' + chrome + '\n' + extra
    )


def link(item, css=''):
    label, path, language = item
    target = SITE / (path.lstrip('/') + ('index.html' if path.endswith('/') else ''))
    assert target.is_file(), path
    return f'<a href="{ESC(path)}" hreflang="{ESC(language)}"{css}>{ESC(label)}</a>'


def render(lang):
    t = COPY[lang]
    assert set(t) == set(COPY['en'])
    search = f'''<div class="eb-search">
<button type="button" id="eb-search-toggle" aria-label="{ESC(t['search'])}" aria-expanded="false" aria-controls="eb-search-panel"><span aria-hidden="true">🔍</span></button>
<div id="eb-search-panel" class="eb-search-panel" hidden><form id="eb-search-form" role="search"><label for="eb-search-query">{ESC(t['search'])}</label><input id="eb-search-query" type="search" placeholder="{ESC(t['searchPlaceholder'])}" autocomplete="off" maxlength="100"></form><p id="eb-search-status" role="status">{ESC(t['searchHint'])}</p><ul id="eb-search-results" aria-label="{ESC(t['searchResults'])}"></ul></div></div>'''
    if lang == 'de':
        nav = TEMPLATES['NAV']
        nav = nav.replace('<nav class="eb-nav">', f'<nav class="eb-nav" aria-label="{ESC(t["navigation"])}">')
        nav = nav.replace('class="eb-logo"', f'class="eb-logo" aria-label="{ESC(t["home"])}"')
        footer = TEMPLATES['FOOTER']
    else:
        nav = f'<nav class="eb-nav" aria-label="{ESC(t["navigation"])}"><div class="eb-nav-in"><a class="eb-logo" href="{ESC(t["homePath"])}" aria-label="{ESC(t["home"])}">❄️ EcoBack</a><div class="eb-links">'
        nav += ''.join(link(item, ' class="eb-nav-tools"' if item[1] == '/tools.html' else '') for item in t['nav'])
        nav += '</div></div></nav>'
        footer = '<footer class="eb-footer"><div class="eb-footer-in">'
        for group in t['footer']:
            footer += '<div><strong>' + ESC(group['title']) + '</strong>' + ''.join(link(item) for item in group['links']) + '</div>'
        footer += '</div><div class="eb-footer-legal">' + ESC(t['disclosure']) + ' © 2026 EcoBack</div></footer>'
    nav = nav.replace('</div></nav>', search + '</div></nav>', 1)
    nav = f'<a class="eb-skip" href="#main">{ESC(t["skip"])}</a>' + nav
    return nav, footer, t
