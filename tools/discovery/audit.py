#!/usr/bin/env python3
"""Bounded read-only public audit. Reachability is not indexing; PV is not people."""
import concurrent.futures as cf, datetime as dt, json, re, urllib.request, urllib.error, urllib.robotparser
from html.parser import HTMLParser
from pathlib import Path
HOSTS=['agiscorecard.com','baipiaoji.com','getecoback.com','thedollscout.com','goldrush.agiscorecard.com','play.agiscorecard.com','source.agiscorecard.com','games.agiscorecard.com','35.agiscorecard.com','learn.agiscorecard.com','fanzha.agiscorecard.com','firstjob.agiscorecard.com','codeword.agiscorecard.com','powerbill.agiscorecard.com','localebatch.agiscorecard.com','rfqdesk.agiscorecard.com','modelmeter.agiscorecard.com','querysprint.agiscorecard.com','filinglens.agiscorecard.com']
class HTML(HTMLParser):
 def __init__(self,t):super().__init__();self.canonical=None;self.robots=[];self.feed(t)
 def handle_starttag(self,tag,attrs):
  d=dict(attrs)
  if tag=='link' and d.get('rel')=='canonical':self.canonical=d.get('href')
  if tag=='meta' and d.get('name','').lower()=='robots':self.robots.append(d.get('content'))
def get(url,ua='agi-site-ci-discovery/1.0'):
 try:
  with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':ua}),timeout=12) as r:
   body=r.read(2000000).decode('utf8',errors='replace');return {'status':r.status,'final_url':r.url,'x_robots':r.headers.get('X-Robots-Tag'),'body':body}
 except urllib.error.HTTPError as e:return {'status':e.code,'error':'HTTP error'}
 except Exception as e:return {'status':0,'error':str(e)[:100]}
def audit(host):
 origin='https://'+host;home=get(origin+'/?__probe=1');robot=get(origin+'/robots.txt');sitemap=get(origin+'/sitemap.xml');row={'host':host,'home_status':home['status'],'robots_status':robot['status'],'sitemap_status':sitemap['status']}
 if home.get('body'):
  doc=HTML(home['body']);row.update(canonical=doc.canonical,x_robots=home['x_robots'])
 if robot.get('body'):
  p=urllib.robotparser.RobotFileParser();p.parse(robot['body'].splitlines());row['robots_allow']={ua:p.can_fetch(ua,origin+'/') for ua in ['Googlebot','bingbot','OAI-SearchBot','PerplexityBot']}
 locs=re.findall(r'<loc>\s*([^<]+)\s*</loc>',sitemap.get('body',''));row['sitemap_loc_count']=len(locs)
 # Three revenue-relevant existing entry paths plus each new task page in the release smoke.
 if host=='baipiaoji.com':
  row['entry_routes']=[]
  for path in ['/en/tools/grok','/tools/kimi','/stack-builder']:
   r=get(origin+path+'?__probe=1');doc=HTML(r.get('body',''));row['entry_routes'].append({'path':path,'status':r['status'],'canonical':doc.canonical,'canonical_matches':doc.canonical==origin+path})
 if host in ['agiscorecard.com','getecoback.com','thedollscout.com']:
  r=get(origin+'/api/pulse');
  try:
   d=json.loads(r.get('body',''));row['traffic']={k:d[k] for k in ['ok','days','human_pv','ai_ref','generated'] if k in d};row['traffic']['basis']='legacy endpoint aggregate; filtered page views are not verified humans or users'
  except:row['traffic']={'status':r['status'],'available':False}
 elif host=='baipiaoji.com':
  r=get(origin+'/api/reach?days=28')
  try:
   d=json.loads(r.get('body',''));row['traffic']={k:d[k] for k in ['ok','generated','window_days','humans_referred','calc','go','sub_ok','referrers','paths'] if k in d};row['traffic']['basis']='referred JS page views and separate event totals; not unique users';row['traffic']['paths']=row['traffic'].get('paths',[])[:8]
  except:row['traffic']={'status':r['status'],'available':False}
 elif host.split('.')[0] in ['rfqdesk','modelmeter','querysprint','filinglens']:
  r=get(origin+'/api/pulse')
  try:
   d=json.loads(r.get('body',''));row['traffic']={k:d[k] for k in ['site','days','metric','rows'] if k in d}
  except:row['traffic']={'status':r['status'],'available':False}
 return row
if __name__=='__main__':
 rows=list(cf.ThreadPoolExecutor(max_workers=6).map(audit,HOSTS));out={'checked':dt.datetime.now(dt.timezone.utc).isoformat(),'note':'No GSC/Bing indexing or ranking data. Crawl probes and aggregate traffic only. No cross-site people total.','sites':rows};Path('/tmp/discovery-audit.json').write_text(json.dumps(out,indent=2));print(json.dumps(out,indent=2))
