#!/usr/bin/env python3
"""Render the authored diagnostic guide with ECO chrome, no generic device shelves."""
from pathlib import Path
import hashlib, html, json, re
from eco_brand import render, build_styles
ROOT=Path(__file__).resolve().parents[1]; SITE=ROOT/'site'
SLUG='balkonspeicher-anker-solarbank-probleme'
TITLE='Anker Solarbank lädt nicht? Probleme gezielt eingrenzen'
DESCRIPTION='Anker Solarbank lädt nicht oder zeigt 0 W? Prüfe Modell, Modus und Update-Status. Mit Support-Checkliste und passenden nächsten Schritten vor einem Neukauf.'
URL='https://getecoback.com/guide/'+SLUG+'.html'
def build():
    build_styles(); nav,footer,chrome=render('de')
    body=(ROOT/'data/solarbank-guide.html').read_text()
    # Broken internal links must never be silently shipped in a generated guide.
    for link in re.findall(r'href="(/[^"#]+)',body):
        assert (SITE/link.lstrip('/')).exists(), link
    version=lambda file:hashlib.sha256((SITE/'assets'/file).read_bytes()).hexdigest()[:12]
    schema={'@context':'https://schema.org','@type':'Article','headline':TITLE,'description':DESCRIPTION,'mainEntityOfPage':URL,'inLanguage':'de','datePublished':'2026-09-25','dateModified':'2026-09-25','author':{'@type':'Organization','name':'EcoBack','@id':'https://getecoback.com/#org'},'publisher':{'@type':'Organization','name':'EcoBack','@id':'https://getecoback.com/#org'}}
    doc=f'''<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{TITLE}</title><meta name="description" content="{DESCRIPTION}"><link rel="canonical" href="{URL}"><link rel="alternate" hreflang="de" href="{URL}"><link rel="alternate" type="text/markdown" href="{URL.replace('.html','.md')}"><meta property="og:type" content="article"><meta property="og:title" content="{TITLE}"><meta property="og:description" content="{DESCRIPTION}"><meta property="og:url" content="{URL}"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/assets/eco-chrome.css?v={version('eco-chrome.css')}"><link rel="stylesheet" href="/assets/revenue-guide.css?v={version('revenue-guide.css')}"><script type="application/ld+json">{json.dumps(schema,ensure_ascii=False)}</script></head><body>{nav}<header class="hero"><div class="wrap"><p><a href="/">Startseite</a> / <a href="/kategorie/energie-sparen.html">Energie sparen</a></p><h1>{TITLE}</h1><p>Erst eingrenzen, dann entscheiden, ob ein Kauf nötig ist.</p></div></header><main id="main" class="revenue-guide" tabindex="-1"><article>{body}</article></main>{footer}<script id="eco-chrome-copy" type="application/json">{json.dumps({k:v for k,v in chrome.items() if k.startswith('search')},ensure_ascii=False)}</script><script type="module" src="/assets/eco-chrome.mjs?v={version('eco-chrome.mjs')}"></script><script type="module" src="/assets/revenue-guide.mjs?v={version('revenue-guide.mjs')}"></script></body></html>'''
    (SITE/'guide'/f'{SLUG}.html').write_text(doc)
    # Relevant existing entrances, not a site-wide promotional block.
    block=f'<!--EB_STORAGE_DIAGNOSIS--><aside style="margin:24px 0;padding:18px;border-left:4px solid #0f6ba8;background:#f7fafc;color:#1a2733"><a href="/guide/{SLUG}.html" style="color:#0f6ba8;font-weight:700">Anker Solarbank lädt nicht? Modell, Modus und Update prüfen</a><p style="color:#1a2733;margin:8px 0 0">Mit Protokoll für den Support und Kaufoptionen erst nach der Diagnose.</p></aside><!--/EB_STORAGE_DIAGNOSIS-->\n'
    for name in ['growatt-noah-2000-probleme','balkonspeicher-winter-frost','balkonkraftwerk-speicher-nachruesten']:
        path=SITE/'guide'/f'{name}.html';s=path.read_text()
        s=re.sub(r'<!--EB_STORAGE_DIAGNOSIS-->.*?<!--/EB_STORAGE_DIAGNOSIS-->\n?','',s,flags=re.S)
        assert '</article>' in s,name
        path.write_text(s.replace('</article>',block+'</article>',1))
    print('Built Solarbank diagnosis guide and 3 relevant entrances.')
if __name__=='__main__':build()
