#!/usr/bin/env python3
"""Final public discovery layer; run after generators, never infer translations."""
from html import escape
import hashlib,json,re
from build_search import ROOT,SITE,public_pages,main as search_index
BLOCK=re.compile(r'<!--EB_DEMAND_DISCOVERY-->.*?<!--/EB_DEMAND_DISCOVERY-->',re.S)
ASSETS=re.compile(r'<(?:link|script)\b[^>]*(?:/assets/demand-discovery\.(?:css|mjs)|/assets/eco-chrome\.mjs)[^>]*>(?:</script>)?')
COPY=json.loads((ROOT/'data/eco-chrome.json').read_text())
TASKS=json.loads((ROOT/'data/demand-discovery.json').read_text())
COPY['en-AU']=COPY['en']
COPY['nl']=dict(COPY['en'],search='Zoeken in EcoBack',searchPlaceholder='Zoek een gids of hulpmiddel …',searchHint='Kies een onderwerp of voer minstens twee tekens in.',searchResults='Zoekresultaten',searchFound='Resultaten: {n}',searchEmpty='Geen resultaten. Kies een onderwerp hieronder.',searchLoading='Zoeken …',searchError='Zoeken is niet beschikbaar. Gebruik de links hieronder.')
COPY['zh-CN']=dict(COPY['en'],search='搜索 EcoBack',searchPlaceholder='搜索指南与工具…',searchHint='选择下方主题，或输入至少两个字符。',searchResults='搜索结果',searchFound='找到 {n} 项结果',searchEmpty='暂无结果，请选择下方主题。',searchLoading='正在搜索…',searchError='暂时无法搜索，请使用下方链接。')
def build():
 pages=list(public_pages());known={r:l for _,r,l,_ in pages}
 for l,g in TASKS.items():
  for t in g['tasks']:assert known.get(t['url'])==l,('Missing/wrong-language task',l,t)
 version=hashlib.sha256(b''.join((SITE/'assets'/f'demand-discovery.{e}').read_bytes() for e in ['css','mjs'])).hexdigest()[:12]
 for path,route,lang,_ in pages:
  if lang not in TASKS:raise ValueError(f'Unreviewed locale: {lang}')
  text=path.read_text();clean=BLOCK.sub('',text)
  clean=re.sub(r'<!--EB_DEMAND_HUB-->.*?<!--/EB_DEMAND_HUB-->','',clean,flags=re.S)
  clean=re.sub(r'<!--EB_SEARCH-->.*?<!--/EB_SEARCH-->\s*','',clean,flags=re.S)
  clean=re.sub(r'<div class="eb-search">\s*<button.*?<ul id="eb-search-results".*?</ul></div></div>','',clean,flags=re.S)
  clean=re.sub(r'<script id="eco-chrome-copy".*?</script>','',clean,flags=re.S)
  clean=ASSETS.sub('',clean)
  t=COPY[lang];g=TASKS[lang]
  links=''.join(f'<a data-eco-task href="{escape(x["url"])}" hreflang="{lang}">{escape(x["label"])}</a>' for x in g['tasks'])
  copy=json.dumps({k:v for k,v in t.items() if k.startswith('search')},ensure_ascii=False).replace('<','\\u003c')
  block=f'''<!--EB_DEMAND_DISCOVERY--><details class="eb-search eco-discovery" id="eco-discovery"><summary id="eb-search-toggle" aria-label="{escape(t['search'])}" aria-expanded="false" aria-controls="eb-search-panel"><span aria-hidden="true">⌕</span> {escape(t['search'])}</summary><div id="eb-search-panel" class="eco-discovery-panel"><form hidden id="eb-search-form" role="search"><label for="eb-search-query">{escape(t['search'])}</label><input id="eb-search-query" type="search" placeholder="{escape(t['searchPlaceholder'])}" autocomplete="off" maxlength="100"></form><p id="eb-search-status" role="status" aria-live="polite"></p><ul id="eb-search-results" aria-label="{escape(t['searchResults'])}"></ul><p class="eco-needs-heading">{escape(g['heading'])}</p><div class="eco-needs-links">{links}</div></div></details><script id="eco-chrome-copy" type="application/json">{copy}</script><!--/EB_DEMAND_DISCOVERY-->'''
  target=re.search(r'<div class="eb-nav-in"[^>]*>',clean) or re.search(r'<(?:nav|header)\b(?![^>]*class="eb-language-nav")[^>]*>',clean)
  if target:clean=clean[:target.end()]+block+clean[target.end():]
  else:clean=re.sub(r'(<body\b[^>]*>)',lambda m:m[1]+block,clean,count=1)
  clean=clean.replace('</head>',f'<link rel="stylesheet" href="/assets/demand-discovery.css?v={version}"><script type="module" src="/assets/demand-discovery.mjs?v={version}"></script></head>',1)
  hubs={'/kategorie/heizen.html':[2,3],'/kategorie/luftqualitaet.html':[0,1],'/kategorie/klimaanlagen.html':[5],'/kategorie/energie-sparen.html':[4,1]}
  if route in hubs:
   chosen=[TASKS['de']['tasks'][i] for i in hubs[route]]
   hub='<section class="eco-demand-hub" aria-labelledby="eco-demand-title"><h2 id="eco-demand-title">Was möchtest du lösen?</h2><p>Starte mit deiner Aufgabe. Die Hilfen sind kostenlos und ohne Konto nutzbar.</p>'+''.join(f'<a data-eco-task href="{escape(x["url"])}">{escape(x["label"])}</a>' for x in chosen)+'</section>'
   clean=re.sub(r'(</h1>)',lambda m:m[1]+'<!--EB_DEMAND_HUB-->'+hub+'<!--/EB_DEMAND_HUB-->',clean,count=1)
  if clean!=text:path.write_text(clean)
 search_index()
 print(json.dumps({'public_pages':len(pages),'locales':len(TASKS),'version':version,'raw_query_collection':False}))
 return len(pages)
if __name__=='__main__':build()
