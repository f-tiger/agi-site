#!/usr/bin/env python3
"""Sourced pre-purchase checks on existing URLs; no publishing-queue writes."""
import hashlib,html,json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];SITE=ROOT/'site';DATA=json.loads((ROOT/'data/home-fit.json').read_text())
PAGES={'rechner.html':('de','robot'),'en/solution-calculator.html':('en','laundry'),'nl/wonen.html':('nl','robot'),'fr/calculateur.html':('fr','floor'),'guide/midea-portasplit-kaufen.html':('de','ac'),'guide/waesche-trocknen-wohnung.html':('de','laundry'),'en/guide/dehumidifier-drying-clothes-cost.html':('en','laundry')}
ESC=lambda s:html.escape(str(s),quote=True)
VERSION=hashlib.sha256(''.join((SITE/'assets'/p).read_text() for p in ['home-fit.mjs','home-fit-model.mjs','home-fit.css']).encode()).hexdigest()[:12]
def replace(text,name,body,anchor):
 text=re.sub(rf'\s*<!--{name}-->.*?<!--/{name}-->\s*','\n',text,flags=re.S)
 assert anchor in text,anchor
 return text.replace(anchor,f'\n<!--{name}-->{body}<!--/{name}-->\n'+anchor,1)
for path,(lang,mode) in PAGES.items():
 p=SITE/path;t=DATA['text'][lang];text=p.read_text()
 # Readable factual fallback is also available to search/AI crawlers without JS.
 fallback=''.join('<h3>'+ESC(t[m])+'</h3><p>'+ESC(t[m+'Limit'])+'</p>' for m in ['robot','laundry','ac','floor'])
 sourcehtml=''.join('<li><a href="'+ESC(url)+'">'+ESC(title)+'</a></li>' for refs in DATA['sources'].values() for title,url in refs)
 config={'text':t,'sources':DATA['sources'],'mode':mode}
 body=f'<section id="home-fit" aria-labelledby="hf-heading"><h2 id="hf-heading">{ESC(t["title"])}</h2><p>{ESC(t["intro"])}</p><div data-hf-mount></div><details class="hf-reference"><summary>{ESC(t["sources"])}</summary><p>{ESC(t["reviewed"])}</p>{fallback}<p>{ESC(t["method"])}</p><ul>{sourcehtml}</ul></details></section>'
 body+='<script id="home-fit-config" type="application/json">'+json.dumps(config,ensure_ascii=False).replace('<','\\u003c')+'</script>'
 body+=f'<link rel="stylesheet" href="/assets/home-fit.css?v={VERSION}"><script type="module" src="/assets/home-fit.mjs?v={VERSION}"></script>'
 text=replace(text,'EB_HOME_FIT',body,'</article>' if '</article>' in text else '</main>')
 text=re.sub(r'\s*<!--EB_FIT_ENTRY-->.*?<!--/EB_FIT_ENTRY-->\s*','\n',text,flags=re.S)
 text=text.replace('</h1>','</h1>\n<!--EB_FIT_ENTRY--><p><a href="#home-fit">'+ESC(t[mode])+'</a></p><!--/EB_FIT_ENTRY-->\n',1);p.write_text(text)
for path,lang,target in [('index.html','de','/rechner.html'),('en/index.html','en','/en/solution-calculator.html'),('fr/index.html','fr','/fr/calculateur.html'),('tools.html','de','/rechner.html'),('wohnen.html','de','/rechner.html')]:
 p=SITE/path
 if not p.exists():continue
 t=DATA['text'][lang];txt=p.read_text();body='<aside style="max-width:980px;margin:24px auto;padding:20px;background:#eef6fa;border-left:4px solid #075d80"><h2><a href="'+target+'#home-fit">'+ESC(t['title'])+'</a></h2><p>'+ESC(' · '.join(t[m] for m in ['robot','laundry','ac','floor']))+'</p></aside>'
 p.write_text(replace(txt,'EB_FIT_DISCOVERY',body,'</main>' if '</main>' in txt else '</body>'))
print(f'Home fit: {len(PAGES)} existing pages, 4 languages, 4 decisions; no new guide URLs.')
