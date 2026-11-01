#!/usr/bin/env python3
"""Check full canonical coverage, locale fit, privacy and repeatable generation."""
from build_search import SITE, Metadata, collect, public_pages
from build_demand_discovery import build,TASKS
import json
rows=list(public_pages());before={p:p.read_bytes() for p,_,_,_ in rows}
build()
assert all(p.read_bytes()==b for p,b in before.items()),'Discovery generation must be byte-stable'
index=json.loads((SITE/'search-index.json').read_text())
assert index==collect() and len({r['u'] for r in index})==len(rows)
for p,r,l,h in rows:
 s=p.read_text()
 for marker in ['id="eco-discovery"','id="eb-search-toggle"','id="eb-search-query"','id="eco-chrome-copy"']:
  assert s.count(marker)==1,(r,marker)
 assert '<!--EB_SEARCH-->' not in s and '/assets/eco-chrome.mjs' not in s,r
 for task in TASKS[l]['tasks']:assert 'href="'+task['url']+'"' in s,(r,task)
for p in SITE.rglob('*.html'):
 if Metadata(p.read_text()).noindex:assert 'id="eco-discovery"' not in p.read_text(),p
assert Metadata('<head><meta content="follow, NOINDEX" name="robots"></head>').noindex
assert Metadata('<head><title>A &amp; B</title></head>').title=='A & B'
print(f'PASS discovery: {len(rows)} public canonical pages, {len(TASKS)} locales, static task links, private exclusions and idempotence')
