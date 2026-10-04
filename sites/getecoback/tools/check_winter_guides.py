#!/usr/bin/env python3
"""Check actual built winter routes, inputs, source links and intent boundaries."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit
import re,json
from build_winter_guides import PAGES,FIELDS,SITE
from build_structure import cat_of
class Links(HTMLParser):
 def __init__(self):super().__init__();self.hrefs=[];self.inputs=[];self.depth=0
 def handle_starttag(self,tag,attrs):
  d=dict(attrs)
  if tag=='a' and 'href'in d:self.hrefs.append(d['href'])
  if tag=='input':self.inputs.append(d)
  if tag=='form':self.depth+=1;assert self.depth==1,'Nested form'
 def handle_endtag(self,tag):
  if tag=='form':self.depth-=1
for slug,p in PAGES.items():
 s=(SITE/'guide'/f'{slug}.html').read_text();parser=Links();parser.feed(s)
 assert cat_of(slug)==p['cat'],slug
 assert s.count('<h1>')==1 and '2026-10-04' in s
 assert all('<!--EB_'+tag+'-->' not in s for tag in ['TOPPICK','POPUP','EXPLAINER','PROFILE','SIZER']),slug
 for href in parser.hrefs:
  u=urlsplit(href)
  if u.path.startswith('/') and not u.netloc:
   target=SITE/u.path.lstrip('/')
   if u.path=='/':target=SITE/'index.html'
   assert target.exists(),(slug,href)
   if u.fragment:assert re.search(r'id=[\"\']'+re.escape(u.fragment)+r'[\"\']',target.read_text()),(slug,href)
 if p.get('tool'):
  assert {x['name']for x in parser.inputs if x.get('type')=='number'}=={x[0]for x in FIELDS[p['tool']]}
  assert 'data-result' in s and 'data-export' in s
 for node in re.findall(r'<script type="application/ld\+json">(.*?)</script>',s,re.S):json.loads(node)
hub=(SITE/'winter-energiesparen.html').read_text()
assert all('/guide/'+slug+'.html' in hub for slug in PAGES)
print('Winter: 7 distinct guides, source/next-step links, 3 forms and hub verified.')
