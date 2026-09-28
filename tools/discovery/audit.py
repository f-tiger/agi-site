#!/usr/bin/env python3
"""Bounded read-only public audit. Reachability is not indexing; PV is not people."""
import concurrent.futures as cf, datetime as dt, json, os, re, urllib.request, urllib.error, urllib.robotparser
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
ROOT=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SNAP_SITE={'agiscorecard.com':'agiscorecard','getecoback.com':'getecoback','thedollscout.com':'thedollscout','baipiaoji.com':'baipiaoji'}
def snapshot_traffic(host):
 try:
  snap=json.load(open(os.path.join(ROOT,'data','fleet-traffic-sources.json'),encoding='utf-8'))
  site=next((x for x in snap.get('sites',[]) if x.get('site')==SNAP_SITE.get(host)),None)
  if not site:return {'available':False,'basis':'committed snapshot data/fleet-traffic-sources.json has no row for this site'}
  out={k:site[k] for k in ['human_pv','by_source','unattributed','via'] if k in site}
  out['generated']=snap.get('generated');out['basis']='committed heartbeat snapshot (data/fleet-traffic-sources.json), not a live read; live cross-site reads were removed 2026-09-26 for the D1 read budget'
  return out
 except Exception as e:return {'available':False,'basis':'snapshot unreadable: '+str(e)}
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
 if host in ['agiscorecard.com','getecoback.com','thedollscout.com','baipiaoji.com']:
  # 2026-09-26 D1 读预算:跨站的 /api/pulse 与 bpj /api/reach 不再在部署时现打(每次 ≈90k–150k 行扫描),
  # 改读 heartbeat 每日提交的快照 data/fleet-traffic-sources.json;快照日期写进 basis。
  row['traffic']=snapshot_traffic(host)
 elif host.split('.')[0] in ['rfqdesk','modelmeter','querysprint','filinglens']:
  r=get(origin+'/api/pulse')
  try:
   d=json.loads(r.get('body',''));row['traffic']={k:d[k] for k in ['site','days','metric','rows'] if k in d}
  except:row['traffic']={'status':r['status'],'available':False}
 return row
if __name__=='__main__':
 rows=list(cf.ThreadPoolExecutor(max_workers=6).map(audit,HOSTS));out={'checked':dt.datetime.now(dt.timezone.utc).isoformat(),'note':'No GSC/Bing indexing or ranking data. Crawl probes and aggregate traffic only. No cross-site people total.','sites':rows};Path('/tmp/discovery-audit.json').write_text(json.dumps(out,indent=2));print(json.dumps(out,indent=2))
