#!/usr/bin/env python3
"""Static, progressively enhanced language navigation from verified alternates.

Run after all page generators. Locale directories are not evidence of a translation.
Untranslated pages offer explicitly separate language entry points, never fake pairs.
"""
from pathlib import Path
from html.parser import HTMLParser
from html import escape
from urllib.parse import urlsplit
import hashlib
import json
import re

SITE = Path(__file__).resolve().parents[1] / 'site'
BASE = 'https://getecoback.com'
NAMES = {'de': 'Deutsch', 'en': 'English', 'fr': 'Français', 'nl': 'Nederlands', 'it': 'Italiano', 'es': 'Español', 'en-AU': 'English (Australia)', 'zh-CN': '中文'}
ENTRIES = {'de': ('/', 'Startseite'), 'en': ('/en/', 'Home'), 'fr': ('/fr/calculateur.html', 'Calculateur'), 'nl': ('/nl/wonen.html', 'Wonen'), 'it': ('/it/', 'Home'), 'es': ('/es/calculadora.html', 'Calculadora'), 'en-AU': ('/au/home-comfort.html', 'Home comfort'), 'zh-CN': ('/zh/agents/cbam-supplier-data.html', 'CBAM 工具')}
COPY = {
 'de': ('Sprache', 'Diese Seite in anderen Sprachen / Regionen', 'Für diese Seite ist noch keine andere Sprachversion verfügbar.', 'Weitere Inhalte nach Sprache', 'Diese Einstiege sind keine Übersetzungen dieser Seite. Lokale Preise, Regeln und Annahmen können abweichen.'),
 'en': ('Language', 'This page in other languages / regions', 'This page is not yet available in another language.', 'Explore other languages', 'These entry points are not translations of this page. Local prices, rules and assumptions may differ.'),
 'fr': ('Langue', 'Cette page dans d’autres langues / régions', 'Cette page n’est pas encore disponible dans une autre langue.', 'Explorer les autres langues', 'Ces liens ne sont pas des traductions de cette page. Les prix, règles et hypothèses locaux peuvent différer.'),
 'nl': ('Taal', 'Deze pagina in andere talen / regio’s', 'Deze pagina is nog niet beschikbaar in een andere taal.', 'Andere talen verkennen', 'Deze ingangen zijn geen vertalingen van deze pagina. Lokale prijzen, regels en aannames kunnen verschillen.'),
 'it': ('Lingua', 'Questa pagina in altre lingue / regioni', 'Questa pagina non è ancora disponibile in un’altra lingua.', 'Esplora altre lingue', 'Questi collegamenti non sono traduzioni di questa pagina. Prezzi, regole e ipotesi locali possono variare.'),
 'es': ('Idioma', 'Esta página en otros idiomas / regiones', 'Esta página aún no está disponible en otro idioma.', 'Explorar otros idiomas', 'Estos enlaces no son traducciones de esta página. Los precios, las normas y los supuestos locales pueden variar.'),
 'zh-CN': ('语言', '本页的其他语言／地区版本', '本页暂时没有其他语言版本。', '浏览其他语言内容', '以下入口不是本页译文。各地价格、规则和计算假设可能不同。'),
}
COPY['en-AU'] = COPY['en']
BLOCK = re.compile(r'\n?<!--EB_LANGUAGE_NAV-->.*?<!--/EB_LANGUAGE_NAV-->\n?', re.S)
ASSET = re.compile(r'\n?<link rel="stylesheet" href="/assets/language-nav\.css\?v=[^"]+">\n?')

class Head(HTMLParser):
 def __init__(self, text):
  super().__init__(); self.lang=''; self.canonical=''; self.alternates={}; self.noindex=False; self.inhead=False; self.feed(text)
 def handle_starttag(self, tag, attrs):
  a=dict(attrs)
  if tag=='html': self.lang=a.get('lang','')
  if tag=='head': self.inhead=True
  if not self.inhead: return
  if tag=='meta' and a.get('name','').lower()=='robots' and 'noindex' in a.get('content','').lower(): self.noindex=True
  if tag=='link':
   if a.get('rel')=='canonical': self.canonical=a.get('href','')
   if a.get('rel')=='alternate' and a.get('hreflang') in NAMES: self.alternates[a['hreflang']]=a.get('href','')
 def handle_endtag(self, tag):
  if tag=='head': self.inhead=False

def local(url):
 u=urlsplit(url)
 if u.scheme!='https' or u.netloc!='getecoback.com' or u.query or u.fragment: return None
 return u.path or '/'

def build():
 pages={}
 for p in sorted(SITE.rglob('*.html')):
  text=p.read_text(); head=Head(text); route=local(head.canonical)
  if not route or head.noindex or any(x in route.split('/') for x in ('members','members.html','account','account.html','api')):
   clean=ASSET.sub('',BLOCK.sub('',text))
   if clean!=text:p.write_text(clean)
   continue
  canonical_file=SITE/(route.lstrip('/')+('index.html' if route.endswith('/') else ''))
  if p!=canonical_file: continue  # Redirect aliases are not public canonical pages.
  lang='en-AU' if route.startswith('/au/') else {'en-GB':'en','de-DE':'de','zh':'zh-CN'}.get(head.lang,head.lang)
  if lang not in NAMES: raise ValueError(f'Unknown public language: {p}: {lang}')
  if route in pages: raise ValueError(f'Duplicate canonical: {route}')
  pages[route]=(p,text,head,lang)
 for lang,(path,_) in ENTRIES.items():
  assert path in pages and pages[path][3]==lang, (lang,path,'missing language entry')
 version=hashlib.sha256((SITE/'assets/language-nav.css').read_bytes()).hexdigest()[:12]
 records=[]
 for route,(p,text,h,lang) in pages.items():
  copy=COPY[lang]; pairs={}
  for targetlang,url in h.alternates.items():
   target=local(url)
   if target==route: continue
   if target not in pages or pages[target][3]!=targetlang: raise ValueError(f'Invalid alternate: {route} -> {url}')
   # An explicit reciprocal relationship is required, not a matching filename.
   if h.canonical not in pages[target][2].alternates.values(): raise ValueError(f'Non-reciprocal alternate: {route} -> {target}')
   pairs[targetlang]=target
  links=''.join(f'<a href="{escape(path)}" lang="{l}" hreflang="{l}" data-language-target="page">{NAMES[l]}</a>' for l,path in pairs.items())
  available=f'<p class="eb-language-heading">{copy[1]}</p><div class="eb-language-links">{links}</div>' if pairs else f'<p>{copy[2]}</p>'
  hubs=''.join(f'<a href="{path}" lang="{l}" hreflang="{l}" data-language-target="entry">{NAMES[l]} · {escape(label)}</a>' for l,(path,label) in ENTRIES.items() if l!=lang and l not in pairs)
  others=f'<p class="eb-language-heading">{copy[3]}</p><p class="eb-language-note">{copy[4]}</p><div class="eb-language-links">{hubs}</div>' if hubs else ''
  block=f'<!--EB_LANGUAGE_NAV--><nav class="eb-language-nav" aria-label="{copy[0]} / Language"><details><summary><span aria-hidden="true">🌐</span> {NAMES[lang]} · {copy[0]}'+(' / Language' if copy[0]!='Language' else '')+f'</summary><div class="eb-language-panel">{available}{others}</div></details></nav><!--/EB_LANGUAGE_NAV-->'
  clean=ASSET.sub('',BLOCK.sub('',text))
  clean=clean.replace('</head>',f'\n<link rel="stylesheet" href="/assets/language-nav.css?v={version}">\n</head>',1)
  clean=re.sub(r'(<body\b[^>]*>)',lambda m:m[1]+'\n'+block+'\n',clean,count=1,flags=re.I)
  if clean!=text:p.write_text(clean)
  records.append({'path':route,'language':lang,'translations':pairs})
 print(json.dumps({'pages':len(records),'with_other_versions':sum(bool(r['translations']) for r in records),'without_other_versions':sum(not r['translations'] for r in records)}))
 return records

if __name__=='__main__':build()
