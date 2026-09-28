#!/usr/bin/env python3
"""Build editorial task guides and synchronized discovery assets; no network, no invented freshness."""
from pathlib import Path
import argparse, csv, io, json, hashlib, html, os, re, sys
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'tools/fleet'));from lastmod import Manifest  # honest <lastmod>/dateModified from content hashes
DATA=json.loads((Path(__file__).with_name('content.json')).read_text())
H=html.escape
CSS='''@font-face{font-family:Manrope;src:url(/fonts/manrope-latin-wght-normal.woff2) format("woff2");font-display:swap}*{box-sizing:border-box}body{margin:0;background:#f7f6f1;color:#19282b;font:16px/1.75 Manrope,system-ui,sans-serif}a{color:#14605b;text-underline-offset:4px}header,main,footer{max-width:1080px;margin:auto;padding:28px}header{display:flex;justify-content:space-between;gap:24px;border-bottom:1px solid #d6ddda}header a{font-weight:700}nav{display:flex;gap:20px}h1{font-size:clamp(34px,5.5vw,62px);line-height:1.1;letter-spacing:-.045em;max-width:900px;margin:22px 0}h2{font-size:27px;line-height:1.3;margin:45px 0 15px;scroll-margin-top:24px}h3{font-size:20px}.eyebrow{font-size:12px;letter-spacing:.13em;text-transform:uppercase;color:#50706a}.deck{font-size:20px;max-width:850px;color:#4e6061}.meta{font-size:13px;color:#5a6869}.actions{display:flex;flex-wrap:wrap;align-items:center;gap:18px;margin:25px 0}.button,button{font:700 14px Manrope,system-ui,sans-serif;display:inline-block;padding:13px 19px;border-radius:7px;background:#17554b;color:white;border:1px solid #17554b;text-decoration:none;cursor:pointer}.secondary{background:transparent;color:#17554b}article{max-width:850px}article p,article li{max-width:800px}li{margin:10px 0}.table-wrap{overflow-x:auto;border:1px solid #d5dfd9;border-radius:9px;background:white}table{width:100%;border-collapse:collapse;font-size:14px}th,td{text-align:left;padding:14px;border-bottom:1px solid #dde5df;vertical-align:top}th{background:#edf1e9}pre{overflow-x:auto;padding:24px;background:#183832;color:#e8f5e7;border-radius:9px;font:13px/1.8 ui-monospace,monospace;white-space:pre-wrap;overflow-wrap:anywhere}.note,.related{background:#eaf0e6;padding:24px;border-radius:9px;margin:30px 0}.note p{margin:0}.related h2{margin-top:0}.related a{display:block;margin:12px 0}footer{border-top:1px solid #d6ddda;font-size:13px;display:flex;flex-wrap:wrap;gap:20px}.skip{position:absolute;left:-9999px}.skip:focus{left:12px;top:8px;background:white;padding:12px}input.share-link{display:block;width:100%;padding:12px;border:1px solid #cad6cc;border-radius:6px;font:14px system-ui}.share-status{font-size:13px}details{margin:20px 0}summary{cursor:pointer}a:focus-visible,button:focus-visible{outline:3px solid #de9255;outline-offset:4px}@media(max-width:600px){header,main,footer{padding:20px}header{flex-wrap:wrap}nav{font-size:13px}h1{font-size:36px}.deck{font-size:18px}th,td{padding:10px;min-width:85px}pre{padding:16px}.actions{gap:12px}}'''
CSS+='.updated{font-size:.8rem;opacity:.75;margin:2rem 0 0}'
JS='''import {acquisitionSource} from '/acquisition.mjs';
const source=acquisitionSource(location.search,document.referrer);
for(const a of document.querySelectorAll('[data-tool]')){const u=new URL(a.href);u.searchParams.set('src',source==='direct'?'example':source);a.href=u.href;}
const share=document.querySelector('[data-share]'),input=document.querySelector('.share-link'),status=document.querySelector('.share-status');
if(share)share.addEventListener('click',async()=>{input.hidden=false;input.value=document.querySelector('link[rel=canonical]').href;try{await navigator.clipboard.writeText(input.value);status.textContent='Guide link copied. Only the public guide is shared, never your input files.';}catch{input.focus();input.select();status.textContent='Copy this public guide link. It contains no uploaded data.';}});
'''
SAMPLES={
 'supplier-quotes.csv':'supplier,unit_price,moq,pack_size,freight,setup,lead_days\nSample A,2.10,500,100,250,50,28\nSample B,2.45,200,50,90,0,14\nSample C,1.90,1000,100,350,80,40\n',
 'ai-usage.csv':'project,provider,model,requests,input_tokens,output_tokens,billed_usd\nSupport,Example provider,Fast model,12000,18000000,2400000,48\nResearch,Example provider,Reasoning model,500,4000000,1000000,86\nSupport,Other provider,Backup model,800,900000,180000,6\n',
 'revenue-practice.sql':"-- Fictional educational data. Run in a new SQLite database.\nCREATE TABLE orders (id INTEGER PRIMARY KEY, customer TEXT, country TEXT, status TEXT, revenue REAL, refund REAL);\nINSERT INTO orders VALUES (1,'Ada','DE','paid',120,0),(2,'Bo','FR','paid',80,20),(3,'Ada','DE','cancelled',50,0),(4,'Cy','DE','paid',90,90),(5,'Di','FR','paid',200,0),(6,'Bo','FR','paid',40,0);\nSELECT id,customer FROM orders WHERE status='paid' ORDER BY id;\n-- Expected net_revenue: 420\nSELECT SUM(revenue-refund) AS net_revenue FROM orders WHERE status='paid';\n-- Expected: FR 300, DE 120\nSELECT country,SUM(revenue-refund) AS net_revenue FROM orders WHERE status='paid' GROUP BY country ORDER BY net_revenue DESC,country ASC;\n",
 'filing-review-checklist.txt':'FilingLens source comparison checklist\nPublic guide: https://filinglens.agiscorecard.com/sec-companyfacts-period-matching\n\nRecord: source retrieval time, numeric CIK, concept, exact start/end dates, unit, earlier and later filing cutoffs.\nKeep both values, filing dates, forms and accession links.\nMissing data is not zero. Conflicting same-day values remain ambiguous.\nA difference does not identify a restatement or its cause.\nOpen original filings before explaining a change. Not investment advice or a trading signal.\n',
 'tradecheck-example.json':(ROOT/'agents/tradecheck-mcp/examples/importer-example.json').read_text(),
 'shopify-translation-example.csv':'Type,Identification,Field,Locale,Market,Status,Default content,Translated content\nPRODUCT,1001,title,de,,untranslated,"Cedar insulated bottle, 750 ml",\nPRODUCT,1002,title,de,,translated,Cedar travel mug,Cedar Reisebecher\nPRODUCT,1003,body_html,de,,untranslated,<p>Fictional description</p>,\n'
}
def folder(site):return ROOT/'sites/localebatch/site' if site=='localebatch' else ROOT/'sites/venture-lab/site'/site
def block(text,tag,value):
 pattern=r'<!-- '+tag+r' -->[\s\S]*?<!-- /'+tag+r' -->'
 addition='<!-- '+tag+' -->'+value+'<!-- /'+tag+' -->'
 if re.search(pattern,text):return re.sub(pattern,lambda _:addition,text)
 return text.replace('</head>',addition+'</head>',1) if tag=='discovery-head' else text.replace('</main>',addition+'</main>',1)
def schema(s,title,description,url,app=False,dates=None):
 node={'@context':'https://schema.org','@type':'WebApplication' if app else 'WebPage','name':title,'description':description,'url':url,'inLanguage':'en','isAccessibleForFree':True}
 if app:node.update(applicationCategory=s['category'],operatingSystem='Web browser',browserRequirements='JavaScript required for interactive tools')
 if dates:node.update(datePublished=dates['published'],dateModified=dates['lastmod'])
 return '<script type="application/ld+json">'+json.dumps(node,ensure_ascii=False).replace('<','\\u003c')+'</script>'
def head(s,title,description,url,app=False,dates=None):
 return f'<meta property="og:type" content="website"><meta property="og:title" content="{H(title,quote=True)}"><meta property="og:description" content="{H(description,quote=True)}"><meta property="og:url" content="{url}"><meta property="og:site_name" content="{s["name"]}"><meta property="og:image" content="https://{s["host"]}/social.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="{H(s["name"])} — free tools and worked examples"><meta name="twitter:card" content="summary_large_image"><link rel="alternate" type="application/rss+xml" title="{H(s["name"])} worked examples" href="/feed.xml">'+schema(s,title,description,url,app,dates)
def run(only):
 for site,s in DATA['sites'].items():
  if only=='venture' and site=='localebatch' or only=='localebatch' and site!='localebatch':continue
  dest=folder(site);dest.mkdir(parents=True,exist_ok=True);origin='https://'+s['host'];pages=[p for p in DATA['pages'] if p['site']==site]
  (dest/'discovery.css').write_text(CSS);(dest/'discovery.mjs').write_text(JS)
  if site=='localebatch':(dest/'acquisition.mjs').write_text((ROOT/'sites/venture-lab/site/shared/acquisition.mjs').read_text())
  for p in pages:
   url=origin+'/'+p['slug'];related=''.join(f'<a href="/{x["slug"]}">{H(x["title"])}</a>' for x in pages if x!=p)
   markup=f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{H(p['title']+' | '+s['name'] if len(p['title'])+len(s['name'])+3<=60 else p['title'])}</title><meta name="description" content="{H(p['description'],quote=True)}"><link rel="canonical" href="{url}"><link rel="stylesheet" href="/discovery.css"><!-- discovery-head -->{head(s,p['title'],p['description'],url)}<!-- /discovery-head --></head><body><a class="skip" href="#main">Skip to content</a><header><a href="/">{s['name']}</a><nav aria-label="Main navigation"><a href="/guide">First-time guide</a><a href="{p['tool']}" data-tool>Open the tool ↗</a></nav></header><main id="main"><p class="eyebrow">THE WORKBOOK / {s['name']}</p><h1>{H(p['title'])}</h1><p class="deck">{H(p['deck'])}</p><p class="meta">By {s['name']} project team · Published <time datetime="{DATA['published']}">19 September 2026</time> · Fictional examples, reproducible calculations</p><div class="actions"><a class="button" href="{p['tool']}" data-tool>{H(p['cta'])} →</a><a href="/examples/{p['download']}" download>{H(p['download_label'])}</a></div><article>{p['body']}</article><aside class="note"><p>{H(s['limitations'])}</p></aside><section class="related"><h2>Keep the example. Try your own task.</h2><p>The public guide works without an account. Opening the tool does not upload a file or start a payment.</p><div class="actions"><a class="button" href="{p['tool']}" data-tool>{H(p['cta'])}</a><button class="secondary" data-share>Copy guide link</button></div><input class="share-link" aria-label="Public guide link" readonly hidden><p class="share-status" role="status"></p>{related}<a href="/guide">Read the first-time guide</a></section></main><footer><span>{s['name']} · an AGI Scorecard project</span><a href="/privacy">Privacy &amp; product status</a><a href="/feed.xml">Subscribe with RSS</a></footer><script type="module" src="/discovery.mjs"></script></body></html>'''
   (dest/(p['slug']+'.html')).write_text(markup)
   (dest/'examples').mkdir(exist_ok=True);(dest/'examples'/p['download']).write_text(SAMPLES[p['download']])
  # Add visible, relevant discovery links without rewriting product interactions.
  related='<section class="research-question" aria-label="Worked examples"><p class="eyebrow">TRY A COMPLETE WORKED EXAMPLE</p><h2>See the inputs. Check the result.</h2>'+''.join(f'<p><a href="/{p["slug"]}">{H(p["title"])}</a></p>' for p in pages)+'<p><a href="/feed.xml">Follow new worked examples with RSS</a></p></section>'
  index=dest/'index.html';t=index.read_text();t=re.sub(r'<title>.*?</title>',lambda _:'<title>'+H(s['title'])+'</title>',t,count=1,flags=re.S);t=re.sub(r'<meta name="description" content="[^"]*">',lambda _:'<meta name="description" content="'+H(s['description'],quote=True)+'">',t,count=1);index.write_text(block(t,'discovery-links',related))
  # Dates: content-hash manifest per site (tools/discovery/lastmod-<site>.json). Head/date blocks are
  # stripped before hashing, so injecting them never moves a date; CI (check mode) refuses content
  # changes that lack a dated manifest update — run `LASTMOD_MODE=update python3 tools/discovery/build.py`.
  man=Manifest(dest,Path(__file__).with_name('lastmod-'+site+'.json'),strip=('discovery-head','lastmod','lastmod-visible'))
  pairs=[]
  for f in sorted(dest.glob('*.html')):
   t=f.read_text();mm=re.search(r'<link rel="canonical" href="([^"]+)"',t)
   if mm and 'noindex' not in t:pairs.append((mm[1],f))
  dates=man.sync(pairs,os.environ.get('LASTMOD_MODE','check'),os.environ.get('LASTMOD_DATE'))
  byslug={x['slug']:x for x in pages}
  for p in sorted(dest.glob('*.html')):
   t=p.read_text();tp=byslug.get(p.stem);canonical=re.search(r'<link rel="canonical" href="([^"]+)"',t)[1]
   title=tp['title'] if tp else html.unescape(re.search(r'<title>(.*?)</title>',t,re.S)[1]);description=tp['description'] if tp else (html.unescape(re.search(r'<meta name="description" content="([^"]*)"',t)[1]) if '<meta name="description"' in t else s['summary'])
   t=block(t,'discovery-head',head(s,title,description,canonical,p.name=='index.html',dates.get(canonical)));p.write_text(t)
   if canonical in dates:man.inject(p,canonical,kinds={'visible'})
  urls=[]
  for p in dest.glob('*.html'):
   text=p.read_text();m=re.search(r'<link rel="canonical" href="([^"]+)"',text)
   if m and 'noindex' not in text:urls.append(m[1])
  (dest/'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+''.join(f'<url><loc>{H(u)}</loc></url>\n' for u in sorted(set(urls)))+'</urlset>\n')
  man.write_sitemap(dest/'sitemap.xml')
  key=hashlib.sha256(('agi-site-indexnow-'+s['host']).encode()).hexdigest()[:32]
  (dest/(key+'.txt')).write_text(key)
  # A single wildcard group keeps private API exclusions effective for every crawler.
  (dest/'robots.txt').write_text('User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: '+origin+'/sitemap.xml\n')
  (dest/'llms.txt').write_text('# '+s['name']+'\n\n> '+s['summary']+'\n\nFree browser tools. Paid features are not available.\n\n'+s['limitations']+'\n\n## Documentation\n- [Home]('+origin+'/)\n- [Guide]('+origin+'/guide)\n'+''.join('- ['+p['title']+']('+origin+'/'+p['slug']+')\n' for p in pages)+'- [Privacy and status]('+origin+'/privacy)\n')
  (dest/'feed.xml').write_text('<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>'+H(s['name'])+' worked examples</title><link>'+origin+'/</link><description>Original worked examples and free task tools.</description><language>en</language>'+''.join('<item><title>'+H(p['title'])+'</title><link>'+origin+'/'+p['slug']+'</link><guid isPermaLink="true">'+origin+'/'+p['slug']+'</guid><description>'+H(p['description'])+'</description><pubDate>Sat, 19 Sep 2026 00:00:00 GMT</pubDate></item>' for p in pages)+'</channel></rss>\n')
  print(site, len(urls),'canonical pages,',len(pages),'worked examples')
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--only',choices=['all','venture','localebatch'],default='all');run(parser.parse_args().only)
