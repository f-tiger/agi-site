#!/usr/bin/env python3
"""Validate generated discovery contracts and downloadable worked examples."""
import argparse, json, re, struct, sqlite3
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit
from xml.etree import ElementTree as ET
ROOT=Path(__file__).resolve().parents[2]
DATA=json.loads(Path(__file__).with_name('content.json').read_text())
class Page(HTMLParser):
 def __init__(self,text):
  super().__init__();self.links=[];self.ids=set();self.canonical=[];self.h1=0;self.feed(text)
 def handle_starttag(self,tag,attrs):
  d=dict(attrs)
  if 'id' in d:self.ids.add(d['id'])
  if tag=='h1':self.h1+=1
  if tag in ('a','script','link'):
   if d.get('href') or d.get('src'):self.links.append(d.get('href') or d['src'])
  if tag=='link' and d.get('rel')=='canonical':self.canonical.append(d['href'])
def run(only):
 total=0
 for site,s in DATA['sites'].items():
  if only=='venture' and site=='localebatch' or only=='localebatch' and site!='localebatch':continue
  folder=ROOT/'sites/localebatch/site' if site=='localebatch' else ROOT/'sites/venture-lab/site'/site
  sitemap={x.text for x in ET.parse(folder/'sitemap.xml').iter('{http://www.sitemaps.org/schemas/sitemap/0.9}loc')}
  titles=set()
  for file in folder.glob('*.html'):
   text=file.read_text();doc=Page(text);assert doc.h1==1,(file,'H1 count');assert len(doc.canonical)==1,(file,'canonical count')
   url=doc.canonical[0];assert url in sitemap,(file,'orphan sitemap');assert not url.endswith('.html'),url
   title=re.search(r'<title>(.*?)</title>',text,re.S)[1];assert title not in titles,(file,'duplicate title');titles.add(title)
   for m in re.finditer(r'<script type="application/ld\+json">(.*?)</script>',text,re.S):json.loads(m[1])
   assert 'og:image' in text and 'summary_large_image' in text,file
   for link in doc.links:
    u=urlsplit(link)
    if u.netloc and u.netloc!=s['host'] or u.scheme not in ('','http','https'):continue
    path=u.path or urlsplit(url).path
    if path.startswith('/api/'):continue
    path=path.removeprefix('./');path='/'+path if not path.startswith('/') else path
    target=folder/(path.lstrip('/') or 'index.html')
    if not target.exists():target=folder/(path.strip('/')+'.html')
    # Shared product assets are copied at build time.
    shared=ROOT/'sites/venture-lab/site/shared'/path.lstrip('/')
    if not target.exists() and shared.exists():target=shared
    if '/fonts/' in path or path in ['/tradecheck.js','/filing-engine.mjs','/agent-example.json','/tradecheck-NOTICES.txt','/filinglens-NOTICES.txt'] or path.startswith('/downloads/'):continue
    assert target.is_file(),(file,link,'missing target')
    if u.fragment and target.suffix=='.html':assert u.fragment in Page(target.read_text()).ids,(file,link,'missing anchor')
   total+=1
  png=(folder/'social.png').read_bytes();assert png[:8]==b'\x89PNG\r\n\x1a\n';assert struct.unpack('>II',png[16:24])==(1200,630)
  ET.parse(folder/'feed.xml')
  for p in [p for p in DATA['pages'] if p['site']==site]:assert (folder/'examples'/p['download']).stat().st_size>100
 if only!='localebatch':
  db=sqlite3.connect(':memory:');db.executescript((ROOT/'sites/venture-lab/site/querysprint/examples/revenue-practice.sql').read_text());assert db.execute("SELECT SUM(revenue-refund) FROM orders WHERE status='paid'").fetchone()[0]==420
 print(f'PASS discovery: {total} pages, canonical URLs, schema JSON, links/anchors, feed XML, PNG dimensions and worked SQL.')
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--only',choices=['all','venture','localebatch'],default='all');run(p.parse_args().only)
