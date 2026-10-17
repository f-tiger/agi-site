#!/usr/bin/env python3
"""Publish discovery links from the validated content registry, without network I/O."""
import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MARKER = 'EB_AUTO_DISCOVERY'
ROUTE = re.compile(r'^/(?:en/)?guide/[a-z0-9]+(?:-[a-z0-9]+)*\.html$')

def entries(data, site):
    found = []
    for route, entry in data.get('pages', {}).items():
        if not ROUTE.fullmatch(route):
            raise ValueError('Invalid generated route')
        product = entry['product']
        country = product['country']
        if country not in ('DE', 'GB') or route.startswith('/en/') != (country == 'GB'):
            raise ValueError('Country and public route disagree')
        target = Path(site) / route.lstrip('/')
        if not target.is_file() or target.is_symlink():
            raise ValueError('Generated page is missing or symlinked')
        found.append((entry['modified'], route, str(product['name']), country))
    return sorted(found, reverse=True)

def block(rows, country):
    chosen = [row for row in rows if row[3] == country][:6]
    if not chosen:
        return ''
    de = country == 'DE'
    title = 'Gerätedaten verstehen, Betriebskosten vergleichen' if de else 'Understand model specifications and running costs'
    desc = 'Herstellerangaben mit ihren Messbedingungen und nachvollziehbaren Rechenbeispielen. Keine eigenen Gerätetests.' if de else 'Manufacturer specifications, test conditions and transparent cost scenarios. No hands-on device tests.'
    cards = ''.join(f'<li><a href="{html.escape(route, quote=True)}#auto-product-tool">{html.escape(name)}</a></li>' for _, route, name, _ in chosen)
    return (f'<!--{MARKER}--><section id="auto-product-guides" aria-labelledby="auto-product-guides-heading" '
            'style="max-width:1000px;margin:24px auto;padding:20px;border:1px solid #d4e2dd;border-radius:16px;background:#f4f8f6;color:#203a32">'
            f'<h2 id="auto-product-guides-heading">{title}</h2><p>{desc}</p><ul>{cards}</ul></section><!--/{MARKER}-->')

def inject(text, addition):
    text = re.sub(r'\s*<!--'+MARKER+r'-->.*?<!--/'+MARKER+r'-->\s*', '', text, flags=re.S)
    if not addition:
        return text
    anchor = '</article>' if '</article>' in text else '</main>' if '</main>' in text else '</body>'
    if anchor not in text:
        raise ValueError('Discovery target has no closing content element')
    return text.replace(anchor, '\n'+addition+'\n'+anchor, 1)

def build(root=ROOT):
    root = Path(root)
    path = root/'data/auto-content.json'
    data = json.loads(path.read_text()) if path.exists() else {'pages': {}}
    rows = entries(data, root/'site')
    targets = {'index.html':'DE', 'rechner.html':'DE', 'en/index.html':'GB',
               'guide/luftentfeuchter-ratgeber.html':'DE', 'guide/trotec-luftentfeuchter-test.html':'DE',
               'en/guide/uk-damp-and-heating-decisions.html':'GB', 'en/guide/12l-vs-20l-dehumidifier-uk.html':'GB'}
    changed = 0
    for relative, country in targets.items():
        file = root/'site'/relative
        if not file.exists():
            continue
        source = file.read_text()
        result = inject(source, block(rows, country))
        if result != source:
            file.write_text(result)
            changed += 1
    return changed

if __name__ == '__main__':
    print(f'Autonomous content discovery: {build()} surfaces updated.')
