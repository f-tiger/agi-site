#!/usr/bin/env python3
"""Verify generated coverage, true destination links and byte-stable rebuilding."""
from build_language_nav import SITE, Head, build, local, BLOCK
from html.parser import HTMLParser

class Navigation(HTMLParser):
 def __init__(self,s):super().__init__();self.links=[];self.feed(s)
 def handle_starttag(self,t,a):
  a=dict(a)
  if t=='a':self.links.append(a)

before={p:p.read_bytes() for p in SITE.rglob('*.html')}
rows=build()
assert all(p.read_bytes()==b for p,b in before.items()), 'Builder must be byte-stable'
for p in SITE.rglob('members.html'):
 assert not BLOCK.search(p.read_text()), f'Private member portal must not receive public navigation: {p}'
for r in rows:
 p=SITE/(r['path'].lstrip('/')+('index.html' if r['path'].endswith('/') else ''))
 s=p.read_text();blocks=BLOCK.findall(s);assert len(blocks)==1,r
 nav=Navigation(blocks[0]);h=Head(s)
 for a in nav.links:
  path=a['href'];target=SITE/(path.lstrip('/')+('index.html' if path.endswith('/') else ''))
  assert target.is_file() and local(Head(target.read_text()).canonical)==path,(r,a)
  assert not any(x in path for x in ('?','#')), 'Do not forward tool inputs or private state'
  if a['data-language-target']=='page':assert h.alternates[a['hreflang']]=='https://getecoback.com'+path
 assert len([a for a in nav.links if a['data-language-target']=='page'])==len(r['translations'])
 assert s.index('<!--EB_LANGUAGE_NAV-->')<s.index('<main') if '<main' in s else True
print(f'PASS language navigation: {len(rows)} canonical pages, links and idempotence')
