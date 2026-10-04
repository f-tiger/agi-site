#!/usr/bin/env python3
"""Prevent drift in sourced UK decisions, links and release discovery."""
from build_uk_opportunities import SITE,BASE,HUB,COMPARE
import re,json
from urllib.parse import urlsplit
index={x['u']:x for x in json.loads((SITE/'search-index.json').read_text())}
for path in [HUB,COMPARE]:
 f=SITE/path;s=f.read_text()
 assert s.count('<h1>')==1 and f'href="{BASE}/{path}"' in s,path
 assert f.with_suffix('.md').exists(),path
 assert '/'+path in index,path
 for name in ['sitemap.xml','llms.txt']:assert BASE+'/'+path in (SITE/name).read_text(),(path,name)
 assert not any(x in s for x in ['<!--EB_MODELS-->','amazon.','getecoback-21','ecoback0d-20']),path
 for href in re.findall(r'href="(/[^" ]*)',s):
  u=urlsplit(href);target=SITE/u.path.lstrip('/');target=target/'index.html' if u.path.endswith('/') else target
  assert target.exists(),(path,href)
  if u.fragment:assert f'id="{u.fragment}"' in target.read_text(),(path,href)
s=(SITE/COMPARE).read_text()
for v in ['1.95 L/day','3.4 L/day','5.23 L/day','8.5 L/day','130 W','180 W','151 W','216 W']:assert v in s,v
for path in ['index.html','en/index.html','en/guide/heated-airer-vs-dehumidifier.html','en/guide/keep-warm-working-from-home.html']:
 assert (SITE/path).read_text().count('<!--EB_UK_PATH-->')==1,path
s=(SITE/'en/guide/heated-airer-vs-dehumidifier.html').read_text()
assert 'Everything beyond that condenses' not in s
assert 'surface temperature and dew point' in s
assert (SITE/'en/guide/dehumidifier-drying-clothes-cost.html').read_text().count('id="eb-moisture-choice"')==1
print('PASS UK: sources, condition-matched figures, scope, local links, homepage entries and SEO/GEO discovery.')
