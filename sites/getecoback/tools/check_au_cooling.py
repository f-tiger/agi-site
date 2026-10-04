#!/usr/bin/env python3
import re,json
from html import unescape
from urllib.parse import urlsplit
from build_au_cooling import PAGES,SITE,BASE,FIELDS
index={x['u']:x for x in json.loads((SITE/'search-index.json').read_text())}
sitemap=(SITE/'sitemap.xml').read_text();llms=(SITE/'llms.txt').read_text()
for slug,p in PAGES.items():
 url='/au/'+slug+'.html';file=SITE/url.lstrip('/');s=file.read_text()
 assert '<html lang="en-AU">' in s and s.count('<h1>')==1,url
 assert f'<link rel="canonical" href="{BASE+url}">' in s,url
 assert f'hreflang="en-AU" href="{BASE+url}"' in s,url
 assert index[url]['l']=='en-AU' and BASE+url in sitemap and BASE+url in llms,url
 assert file.with_suffix('.md').exists(),url
 assert not any(x in s for x in ['<!--EB_MODELS-->','<!--EB_USMARKET-->','tag=getecoback-21','ecoback0d-20']),url
 faq=[x for g in re.findall(r'<script type="application/ld\+json">(.*?)</script>',s,re.S) for x in json.loads(g).get('@graph',[]) if x.get('@type')=='FAQPage']
 assert len(faq)==1,url
 visible=[(unescape(q),unescape(a)) for q,a in re.findall(r'<details><summary>(.*?)</summary><p>(.*?)</p></details>',s,re.S)]
 assert visible==[(x['name'],x['acceptedAnswer']['text']) for x in faq[0]['mainEntity']],url
 for href in re.findall(r'href="(/[^" ]*)',s):
  u=urlsplit(href);target=SITE/u.path.lstrip('/');target=target/'index.html' if u.path.endswith('/') else target
  assert target.exists(),(url,href)
  if u.fragment:assert f'id="{u.fragment}"' in target.read_text(),(url,href)
 if p.get('tool'):
  assert s.count('<form>')==1 and set(re.findall(r'<input required name="([^"]+)"',s))=={x[0] for x in FIELDS},url
for path in ['au/home-comfort.html','au/portable-air-conditioner-window-kit.html','index.html','en/index.html']:
 s=(SITE/path).read_text();assert s.count('<!--EB_AU_COOLING-->')==1,path
 if path=='au/home-comfort.html':assert all('/au/'+x+'.html' in s for x in PAGES),path
 else:assert '/au/portable-air-conditioner-running-cost.html' in s,path
print('PASS Australia: 5 guides, 2 forms, 4 surviving entry blocks, FAQ parity, local links and SEO/GEO discovery.')
