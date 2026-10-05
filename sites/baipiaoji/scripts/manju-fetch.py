"""Bounded public ranking fetch; no login, player requests, or image downloads."""
import datetime, hashlib, json, re, sys, time, urllib.request, urllib.robotparser
from html.parser import HTMLParser
BASE = 'https://hongguoduanju.com'
UA = 'BPJManjuDirectory/1.0 (+https://baipiaoji.com/manju/method)'
class Node:
    def __init__(self, tag='', attrs=()): self.tag, self.attrs, self.children = tag, dict(attrs), []
    def text(self): return ''.join(c.text() if isinstance(c, Node) else c for c in self.children)
    def find(self, tag=None, prefix=None):
        out=[]
        for c in self.children:
            if isinstance(c, Node):
                if (tag is None or c.tag == tag) and (prefix is None or c.attrs.get('class','').startswith(prefix)): out.append(c)
                out.extend(c.find(tag, prefix))
        return out
class Document(HTMLParser):
    def __init__(self, html):
        super().__init__(convert_charrefs=True); self.root=Node(); self.stack=[self.root]; self.feed(html)
    def handle_starttag(self, tag, attrs):
        n=Node(tag,attrs); self.stack[-1].children.append(n)
        if tag not in ('area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'): self.stack.append(n)
    def handle_endtag(self, tag):
        for i in range(len(self.stack)-1,0,-1):
            if self.stack[i].tag==tag: self.stack=self.stack[:i]; break
    def handle_data(self, data): self.stack[-1].children.append(data)
class SameOrigin(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, url):
        if not url.startswith(BASE+'/'): raise ValueError('Unexpected redirect origin')
        return super().redirect_request(req,fp,code,msg,headers,url)
def fetch(url):
    opener=urllib.request.build_opener(SameOrigin())
    with opener.open(urllib.request.Request(url,headers={'User-Agent':UA}),timeout=30) as r:
        raw=r.read(4_000_001)
        if len(raw)>4_000_000: raise ValueError('Oversized source')
        return raw

def parse_page(raw, url, today):
    root=Document(re.sub(r'[\x00-\x1f]|\\u0000', '', raw.decode('utf-8'))).root
    m=re.search(r'(\d{1,2})月(\d{1,2})日已更新',root.text())
    if not m: raise ValueError('Missing source freshness label')
    date=datetime.date(today.year,int(m[1]),int(m[2]))
    if date>today: date=date.replace(year=date.year-1)
    if (today-date).days>7: raise ValueError('Source snapshot over seven days old')
    cards=[c for c in root.find('article') if c.attrs.get('aria-labelledby','').startswith('rank-title-')]
    if len(cards)!=20: raise ValueError('Unexpected ranking page shape')
    rows=[]
    for c in cards:
        title=c.find('h2')[0].text().strip()
        rank=int(c.find(prefix='pc-badge-number-')[0].text())
        heat=re.search(r'([\d.]+)万热度',c.find(prefix='pc-metrics-')[0].text().replace('\\x00',''))
        if not heat: raise ValueError('Missing heat')
        tags=[x.text().strip() for x in c.find(prefix='pc-categories-')[0].find('span')]
        tags=[x for x in tags if re.fullmatch(r'[\u4e00-\u9fff]{2,8}',x)]
        link=next(x.attrs['href'] for x in c.find('a') if re.fullmatch(r'/detail\?series_id=\d+',x.attrs.get('href','')))
        webp=next((x.attrs['srcset'] for x in c.find('source') if x.attrs.get('type')=='image/webp'),None)
        thumb=webp or c.find('img')[0].attrs['src']
        rows.append(dict(title=title,sourceRank=rank,value=round(float(heat[1])*10000),displayValue=heat[1]+'万',url=BASE+link,tags=tags,thumbnail=dict(url=thumb,source=url,checkedAt=today.isoformat(),attribution='红果公开榜单封面',mode='remote')))
    return date.isoformat(), rows

def main():
    today=datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=8))).date()
    robots=fetch(BASE+'/robots.txt').decode('utf-8')
    if not re.search(r'^User-agent:',robots,re.I|re.M): raise ValueError('Unrecognized robots response')
    rp=urllib.robotparser.RobotFileParser();rp.parse(robots.splitlines())
    result=[]
    for kind in ('ai-drama','comic-drama'):
        rows=[]; pages=[]; dates=set()
        for page in range(1,6):
            url=BASE+'/rank/hot-'+kind+('' if page==1 else '?page='+str(page))
            if not rp.can_fetch(UA,url): raise ValueError('Source robots disallows ranking fetch')
            time.sleep(1)
            raw=fetch(url); date, batch=parse_page(raw,url,today)
            rows.extend(batch);dates.add(date);pages.append(dict(url=url,sha256=hashlib.sha256(raw).hexdigest(),count=len(batch)))
        if len(dates)!=1 or [r['sourceRank'] for r in rows]!=list(range(1,101)) or len({r['url'] for r in rows})!=100 or len({r['title'] for r in rows})!=100: raise ValueError('Incomplete or inconsistent snapshot')
        result.append(dict(kind=kind,observedAt=dates.pop(),records=rows,sourcePages=pages))
    print(json.dumps(dict(checkedAt=today.isoformat(),checkedAtTime=datetime.datetime.now(datetime.timezone.utc).isoformat(),cohorts=result),ensure_ascii=False))
if __name__=='__main__': main()
