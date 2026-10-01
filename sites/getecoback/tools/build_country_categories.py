#!/usr/bin/env python3
"""Bounded DE/NL/AU category expansion. Run after generic guide chrome.

Local-market editorial pages deliberately own their commerce and tracking:
only the verified DE store is affiliated; NL/AU are ordinary merchant links.
No georedirect, generated product rankings, imported ASINs or price claims.
"""
import html
import json
import re
from pathlib import Path
from urllib.parse import urlencode

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / 'site'
BASE = 'https://getecoback.com'
DATE = '2026-10-01'
DATA = json.loads((ROOT / 'data/country-categories.json').read_text())


def esc(value):
    return html.escape(str(value), quote=True)


def internal(path, label, action='guide'):
    return f'<a href="{esc(path)}" data-country-action="{action}">{esc(label)}</a>'


def merchant(c, query, label):
    params = {'k': query}
    if c['market'] == 'DE':
        params['tag'] = 'getecoback-21'
    url = 'https://www.' + c['merchant'] + '/s?' + urlencode(params)
    relation = 'sponsored noopener' if c['market'] == 'DE' else 'noopener'
    return f'<a class="shop-link" href="{esc(url)}" target="_blank" rel="{relation}" data-country-shop="{c["market"]}">{esc(label)} <span aria-hidden="true">↗</span></a>'


def shell(c, page, content, hub=False):
    path = c['path'] if hub else c['guide']['path']
    title, description, heading, intro = (page[k] for k in ('title', 'description', 'heading', 'intro'))
    url = BASE + path
    nav = ''.join(f'<a href="{x["path"]}" lang="{x["lang"]}" data-country-action="country"' +
                  (' aria-current="page"' if x['market'] == c['market'] and hub else '') +
                  f'>{esc(x["country"])}</a>' for x in DATA['countries'])
    # The hubs perform the same country-selection/category-discovery task.
    # The three distinct local guides are not translations of each other.
    alternates = ''.join(f'<link rel="alternate" hreflang="{x["lang"]}" href="{BASE+x["path"]}">\n' for x in DATA['countries']) if hub else ''
    if hub:
        alternates += f'<link rel="alternate" hreflang="x-default" href="{BASE}/wohnen.html">\n'
    schema = {'@context': 'https://schema.org', '@type': 'CollectionPage' if hub else 'Article',
              'name': title, 'headline': heading, 'description': description, 'url': url,
              'inLanguage': c['lang'], 'datePublished': DATE, 'dateModified': DATE,
              'author': {'@type': 'Organization', 'name': 'EcoBack', 'url': BASE + '/ueber-uns.html'}}
    crumbs = f'<a href="{c["path"]}">{esc(c["country"])}</a> / {esc(c["guide_label"])}' if not hub else esc(c['eyebrow'])
    sources = ''.join(f'<li><a href="{esc(s[1])}">{esc(s[0])}</a></li>' for s in c['sources'])
    return f'''<!doctype html>
<html lang="{c['lang']}"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(title)}</title><meta name="description" content="{esc(description)}">
<link rel="canonical" href="{url}">
{alternates}<meta property="og:type" content="{'website' if hub else 'article'}">
<meta property="og:title" content="{esc(title)}"><meta property="og:description" content="{esc(description)}"><meta property="og:url" content="{url}">
<meta name="twitter:card" content="summary"><link rel="icon" href="/favicon.svg">
<link rel="stylesheet" href="/assets/country-categories.css">
<script type="application/ld+json">{json.dumps(schema, ensure_ascii=False)}</script>
<script defer src="/assets/country-categories.js"></script>
</head><body data-country-market="{c['market']}">
<a class="skip" href="#main">{esc(c['skip'])}</a>
<header class="site-header"><a class="wordmark" href="/">EcoBack<span>home & energy</span></a><nav aria-label="{esc(c['country_label'])}">{nav}</nav></header>
<main id="main"><article>
<header class="intro"><p class="eyebrow">{crumbs}</p><h1>{esc(heading)}</h1><p class="lede">{esc(intro)}</p><p class="edition">{esc(c['edition'])} · <time datetime="{DATE}">{DATE}</time></p></header>
{content}
<section class="sources" id="sources"><h2>{esc(c['sources_label'])}</h2><p>{esc(c['method'])}</p><ul>{sources}</ul></section>
</article></main>
<footer class="site-footer"><p>{esc(c['disclosure'])}</p><nav><a href="/impressum.html">{esc(c['legal'])}</a><a href="/datenschutz.html">{esc(c['privacy'])}</a><a href="/wie-wir-empfehlen.html">{esc(c['about'])}</a></nav></footer>
</body></html>'''


def hub_body(c):
    sections = []
    choose = c['chooser']
    # One concrete question, with all destinations available without JavaScript.
    chooser = f'<section class="need-chooser" data-country-chooser hidden><h2>{esc(choose["title"])}</h2><label for="country-need">{esc(choose["label"])}</label><select id="country-need"><option value="">{esc(choose["placeholder"])}</option>'
    for t in c['categories']:
        chooser += f'<option value="{t["id"]}" data-path="{esc(t["related"][0][1])}" data-summary="{esc(t["summary"])}" data-label="{esc(t["related"][0][0])}">{esc(t["title"])}</option>'
    chooser += '</select><div aria-live="polite" data-country-result><p></p><a data-country-action="need_result" hidden></a></div></section>'
    jump = '<nav class="topics" aria-label="' + esc(c['topics_label']) + '">' + ''.join(
        internal('#' + t['id'], t['title'], 'category') for t in c['categories']) + '</nav>'
    for n, t in enumerate(c['categories'], 1):
        checks = ''.join('<li>' + esc(s) + '</li>' for s in t['checks'])
        links = ''.join('<li>' + internal(p, label) + '</li>' for label, p in t['related'])
        sections.append(f'''<section class="category" id="{t['id']}">
<div class="category-title"><span class="number">0{n}</span><h2>{esc(t['title'])}</h2></div>
<div class="category-detail"><p>{esc(t['summary'])}</p><h3>{esc(c['check_label'])}</h3><ul>{checks}</ul>
<ul class="reading">{links}</ul><div class="commerce"><p class="disclosure">{esc(c['shop_disclosure'])}</p>{merchant(c, t['query'], t['shop_label'])}</div></div></section>''')
    return chooser + jump + f'<aside class="decision-note"><strong>{esc(c["note_title"])}</strong><p>{esc(c["note"])}</p></aside>' + ''.join(sections)


def guide_body(c):
    g = c['guide']
    body = f'<aside class="decision-note"><strong>{esc(g["answer_title"])}</strong><p>{esc(g["answer"])}</p></aside>'
    for s in g['sections']:
        body += f'<section class="guide-section" id="{s["id"]}"><h2>{esc(s["title"])}</h2>'
        body += ''.join(f'<p>{esc(p)}</p>' for p in s.get('paragraphs', []))
        if s.get('items'):
            body += '<ul>' + ''.join(f'<li>{esc(p)}</li>' for p in s['items']) + '</ul>'
        body += '</section>'
    # Paper-friendly, client-only checklist; no measurements or answers transmitted.
    body += f'<section class="checklist" aria-labelledby="checklist-heading"><h2 id="checklist-heading">{esc(g["checklist_title"])}</h2><p>{esc(g["checklist_note"])}</p>'
    body += ''.join(f'<label><input type="checkbox"><span>{esc(t)}</span></label>' for t in g['checklist'])
    body += f'<button type="button" data-country-print hidden>{esc(c["print_label"])}</button></section>'
    body += f'<section class="guide-section"><h2>{esc(g["buy_title"])}</h2><p>{esc(g["buy_text"])}</p><p class="disclosure">{esc(c["shop_disclosure"])}</p>'
    body += merchant(c, g['query'], g['shop_label']) + '</section>'
    body += f'<section class="guide-section"><h2>{esc(c["next_label"])}</h2><ul class="reading">'
    body += ''.join('<li>' + internal(p, label) + '</li>' for label, p in g['related']) + '</ul></section>'
    return body


def write_page(path, content):
    dest = SITE / (path.lstrip('/') + ('index.html' if path.endswith('/') else ''))
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(content)


def discovery():
    """Existing owned channels: homepages + relevant category/guide landings.

    Replacing a named block prevents duplicate insertions on scheduled builds.
    No external posting is done by this generator.
    """
    targets = {
        'index.html': 'de', 'en/index.html': 'en',
        'kategorie/luftqualitaet.html': 'de', 'kategorie/energie-sparen.html': 'de',
        'guide/waesche-trocknen-wohnung.html': 'de',
        'guide/luftfeuchtigkeit-senken.html': 'de',
        'en/guide/portable-ac-tilt-and-turn-windows.html': 'en',
    }
    for rel, language in targets.items():
        p = SITE / rel
        if not p.exists():
            raise ValueError(f'Missing distribution surface: {rel}')
        s = p.read_text()
        s = re.sub(r'<!--EB_COUNTRIES-->.*?<!--/EB_COUNTRIES-->\s*', '', s, flags=re.S)
        title = 'Wohnen nach Land' if language == 'de' else 'Home comfort by country'
        desc = 'Feuchtigkeit, Wäsche und Wärme in Deutschland und den Niederlanden; Kühlung und Fensterlösungen in Australien.' if language == 'de' else 'Local buying checklists for humidity, laundry, cooling and window fit.'
        links = ' · '.join(f'<a href="{c["path"]}" lang="{c["lang"]}">{esc(c["country"])}</a>' for c in DATA['countries'])
        block = f'<!--EB_COUNTRIES--><section aria-label="{title}" style="max-width:1080px;margin:28px auto;padding:20px;box-sizing:border-box;border-top:2px solid #1768a6;background:#f0f7fc;color:#172c3d"><h2 style="margin:0 0 8px;font-size:1.35rem">{title}</h2><p>{desc}</p><p style="line-height:2">{links}</p></section><!--/EB_COUNTRIES-->\n'
        # A useful entry point near the start of homepages, after content on guides.
        if rel in ('index.html', 'en/index.html'):
            m = re.search(r'<main\b[^>]*>', s)
            if m:
                s = s[:m.end()] + '\n' + block + s[m.end():]
            else:
                s = s.replace('</header>', '</header>\n' + block, 1)
        elif '</article>' in s:
            s = s.replace('</article>', block + '</article>', 1)
        else:
            s = s.replace('</main>', block + '</main>', 1)
        if '<!--EB_COUNTRIES-->' not in s:
            raise ValueError(f'No insertion point: {rel}')
        p.write_text(s)


def main():
    for c in DATA['countries']:
        write_page(c['path'], shell(c, c, hub_body(c), True))
        write_page(c['guide']['path'], shell(c, c['guide'], guide_body(c)))
    discovery()
    print('country categories: 3 country hubs, 9 category sections, 3 local guides, 7 discovery surfaces')


if __name__ == '__main__':
    main()
