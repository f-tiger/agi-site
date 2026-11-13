#!/usr/bin/env python3
"""Index all public canonical pages; searches stay in the visitor's browser."""
from pathlib import Path
import json
from build_language_nav import Head, local
ROOT=Path(__file__).resolve().parents[1]
SITE=ROOT/'site'
PRIVATE={'auth','api','account','account.html','members','members.html','widgets','analytics-assets','member-assets'}
class Metadata(Head):
 def __init__(self,text):
  self.title='';self.description='';self.intitle=False
  super().__init__(text)
 def handle_starttag(self,tag,attrs):
  super().handle_starttag(tag,attrs);a=dict(attrs)
  if self.inhead and tag=='title':self.intitle=True
  if self.inhead and tag=='meta' and a.get('name','').lower()=='description':self.description=a.get('content','')
 def handle_endtag(self,tag):
  if tag=='title':self.intitle=False
  super().handle_endtag(tag)
 def handle_data(self,text):
  if self.intitle:self.title+=text

def public_pages():
 for path in sorted(SITE.rglob('*.html')):
  h=Metadata(path.read_text());route=local(h.canonical)
  if not route or h.noindex or PRIVATE.intersection(route.split('/')):continue
  if path!=SITE/(route.lstrip('/')+('index.html' if route.endswith('/') else '')):continue
  lang='en-AU' if route.startswith('/au/') else {'en-GB':'en','de-DE':'de','zh':'zh-CN'}.get(h.lang,h.lang)
  yield path,route,lang,h

def collect():
 tasks=json.loads((ROOT/'data/demand-discovery.json').read_text())
 aliases={(l,t['url']):t['label']+' '+t['aliases'] for l,g in tasks.items() for t in g['tasks']}
 out=[]
 for path,route,lang,h in public_pages():
  if not h.title.strip():raise ValueError(f'Missing title: {route}')
  desc=' '.join(h.description.split())
  text=path.read_text()
  if 'id="home-fit-config"' in text:
   import re
   match=re.search(r'<script id="home-fit-config" type="application/json">(.*?)</script>',text,re.S)
   fit=json.loads(match[1])['text'];desc=' · '.join(fit[k] for k in ['robot','laundry','ac','floor'])+'. '+desc
  extra=aliases.get((lang,route),'')
  if route=='/produkte.html':
   catalog=json.loads((ROOT/'data/product-catalog.json').read_text())
   extra=' '.join([extra]+[c['name'] for c in catalog['categories']]+[p['name']+' '+p['variant'] for p in catalog['products']])
  out.append({'u':route,'t':' '.join(h.title.split()),'d':desc[:320],'l':lang,'a':extra})
 return out

def main():
 entries=collect();payload=json.dumps(entries,ensure_ascii=False,separators=(',',':'));p=SITE/'search-index.json'
 if not p.exists() or p.read_text()!=payload:p.write_text(payload)
 print(f'search-index.json: {len(entries)} public canonical pages; search terms stay local')
if __name__=='__main__':main()
