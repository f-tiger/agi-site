#!/usr/bin/env python3
"""Check final release artifacts, including reciprocal language routes."""
import json,re
from html import unescape
from build_winter_locales import CONTENT,HUB,DE,SITE,BASE,languages,route
from build_search import collect
entries={p['u'] for p in collect()}
sitemap=(SITE/'sitemap.xml').read_text()
for i in [None,*range(7)]:
 for lang,url in languages(i).items():
  p=SITE/url.lstrip('/');s=p.read_text()
  assert f'<html lang="{lang}"' in s,(url,'lang')
  assert f'<link rel="canonical" href="{BASE+url}">' in s,(url,'canonical')
  for l,u in languages(i).items():
   assert f'hreflang="{l}" href="{BASE+u}"' in s,(url,l,'alternate')
   assert f'href="{u}"' in s,(url,l,'switch')
  assert url in entries and BASE+url in sitemap,(url,'discovery')
  if lang=='de':continue
  assert p.with_suffix('.md').exists(),(url,'markdown')
  assert not any('<!--EB_'+x+'-->' in s for x in ['SIZER','MODELS','USMARKET','EXPLAINER']),(url,'unrelated chrome')
  visible=re.findall(r'<details><summary>(.*?)</summary><p>(.*?)</p></details>',s,re.S)
  graphs=[json.loads(x) for x in re.findall(r'<script type="application/ld\+json">(.*?)</script>',s,re.S)]
  faqs=[x for g in graphs for x in g.get('@graph',[g]) if x.get('@type')=='FAQPage']
  if i is not None:
   assert len(faqs)==1 and [(x['name'],x['acceptedAnswer']['text']) for x in faqs[0]['mainEntity']]==[(unescape(q),unescape(a)) for q,a in visible],url
  for href in re.findall(r'href="(/[^"?#]*)',s):
   target=SITE/href.lstrip('/');target=target/'index.html' if href.endswith('/') else target
   assert target.exists(),(url,'link',href)
for lang in CONTENT:
 home=(SITE/lang/'index.html').read_text()
 assert home.count('<!--EB_WINTER_LOCALE-->')==1,lang
 assert all(f'href="{route(lang,i)}"' in home for i in range(7)),lang
 assert f'href="{HUB[lang]}"' in home,lang
print('PASS: 24 pages, 8 reciprocal language groups, 14 FAQ pages, 2 homepages, search/sitemap/Markdown and local links.')
