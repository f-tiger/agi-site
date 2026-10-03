#!/usr/bin/env python3
"""Bounded, keyless discovery from publisher RSS/Atom. Never generates claims.

Keeps publication dates, first discovery and successful checks distinct. A failed
source retains its own last good items and success timestamp. No page crawling,
transcript download, paid API, rehosting or model calls.
"""
import concurrent.futures as cf
import datetime as dt
import email.utils
import hashlib
import html
import json
from pathlib import Path
import re
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[2] / 'foresight-assets'
UTC = dt.timezone.utc
LIMIT = 5_000_000
AI = re.compile(r'\b(?:AI|AGI|LLM|GPT|OpenAI|Anthropic|Claude|Jev|Gemini|agentic|agents?|deepmind|machine learning|artificial intelligence)\b|人工智能|大模型|智能体|具身|人工智慧|模型训练|模型訓練', re.I)
TOPICS = {
 'work':r'work|job|code|coding|programming|software|workflow|agent|工作|職業|职业|编程|軟體|软件|智能体',
 'learn':r'learn|education|research|science|skill|学习|教育|研究|技能|科学',
 'earn':r'business|startup|founder|creat|company|distribution|inference|商业|创业|公司|创作|收入|产业',
 'family':r'child|kid|tutor|education|school|teacher|孩子|儿童|学校|教育|老师',
 'forecast':r'AGI|future|recursive|progress|superintelligen|forecast|未来|预测|进展|自我改进'
}

def clean(value):
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]*>', ' ', value or ''))).strip()

def excerpt(value):
    """A short attributed publisher excerpt, never an inferred viewpoint."""
    value = clean(value)
    value = re.sub(r'https?://\S+', '', value).strip()
    if not value: return ''
    if re.search(r'[\u4e00-\u9fff]', value):
        return value[:60].rstrip() + ('…' if len(value)>60 else '')
    words = value.split()
    return ' '.join(words[:24]) + ('…' if len(words)>24 else '')

def safe_url(value):
    try:
        u = urllib.parse.urlsplit(html.unescape(value or ''))
        if u.scheme != 'https' or not u.hostname or u.username or u.password:
            return None
        if u.hostname in ('localhost','127.0.0.1','::1') or re.match(r'^\d+\.\d+\.\d+\.\d+$',u.hostname):
            return None
        q = [(k,v) for k,v in urllib.parse.parse_qsl(u.query) if not k.startswith('utm_')]
        return urllib.parse.urlunsplit((u.scheme,u.netloc,u.path,urllib.parse.urlencode(q),''))
    except (TypeError,ValueError):
        return None

def stamp(value):
    if not value: return None
    try: result = dt.datetime.fromisoformat(value.replace('Z','+00:00'))
    except ValueError:
        try: result = email.utils.parsedate_to_datetime(value)
        except (ValueError,TypeError): return None
    if result.tzinfo is None: result = result.replace(tzinfo=UTC)
    return result.astimezone(UTC)

def iso(value): return value.astimezone(UTC).isoformat(timespec='seconds').replace('+00:00','Z')

def parse_feed(data, source, now):
    if len(data)>LIMIT or b'<!DOCTYPE' in data.upper() or b'<!ENTITY' in data.upper():
        raise ValueError('unsafe_or_oversize_feed')
    root=ET.fromstring(data)
    if root.tag.split('}')[-1] not in ('rss','feed'): raise ValueError('not_a_feed')
    entries=[e for e in root.iter() if e.tag.split('}')[-1] in ('item','entry')]
    if not entries: raise ValueError('empty_feed')
    out=[]
    for e in entries[:600]:
        fields={}
        for x in e: fields.setdefault(x.tag.split('}')[-1],x.text or '')
        title=clean(fields.get('title'))
        # Never use an updated timestamp as the original publication date.
        published=stamp(fields.get('pubDate') or fields.get('published'))
        if not title or not published or published>now+dt.timedelta(minutes=5) or now-published>dt.timedelta(days=180): continue
        if title.lower().startswith(('[ainews]','ainews:')): continue
        description=clean(fields.get('description') or fields.get('summary') or fields.get('encoded') or next((x.text for x in e.iter() if x.tag.split('}')[-1]=='description'), ''))
        if not source['aiFocused'] and not AI.search(title+' '+description[:600]): continue
        link=next((safe_url(x.get('href')) for x in e if x.tag.split('}')[-1]=='link' and x.get('rel','alternate')=='alternate' and safe_url(x.get('href'))),None)
        link=link or safe_url(fields.get('link')) or safe_url(fields.get('guid'))
        enclosures=[x for x in e if x.tag.split('}')[-1]=='enclosure']
        media=next((x for x in enclosures if x.get('type','').startswith(('audio/','video/'))),None)
        link=link or (safe_url(media.get('url')) if media is not None else None)
        if not link: continue
        video=fields.get('videoId')
        medium='video' if video and re.fullmatch(r'[\w-]{11}',video) else 'audio' if media is not None and media.get('type','').startswith('audio/') else 'video' if media is not None else 'text'
        tags=[k for k,pattern in TOPICS.items() if re.search(pattern,title+' '+description[:600],re.I)]
        if not tags: tags=['understand']
        out.append({'id':hashlib.sha256(link.encode()).hexdigest()[:20],'sourceId':source['id'],'title':title[:220],
          'url':link,'publishedAt':iso(published),'medium':medium,'goals':tags,'status':'discovered',
          'publisherExcerpt':excerpt(description),
          **({'audioUrl':safe_url(media.get('url'))} if medium=='audio' and media is not None and safe_url(media.get('url')) else {}),
          **({'videoId':video} if video and re.fullmatch(r'[\w-]{11}',video) else {})})
    return sorted(out,key=lambda x:(x['publishedAt'],x['id']),reverse=True)[:12]

def fetch(source):
    req=urllib.request.Request(source['feed'],headers={'User-Agent':'AGI-Future-Guide/1.0 (+https://agiscorecard.com/future-guide)','Accept':'application/rss+xml, application/atom+xml, application/xml, text/xml'})
    with urllib.request.urlopen(req,timeout=20) as r:
        data=r.read(LIMIT+1)
    return data

def refresh(sources,previous,loader=fetch,now=None):
    now=now or dt.datetime.now(UTC)
    previous_items={x['id']:x for x in previous.get('items',[])}
    previous_sources={x['id']:x for x in previous.get('sources',[])}
    items=[]; states=[]
    def one(source):
        old=previous_sources.get(source['id'],{})
        state={**source,'lastAttemptAt':iso(now),'lastSuccessAt':old.get('lastSuccessAt')}
        try:
            current=parse_feed(loader(source),source,now)
            state.update(status='ok',lastSuccessAt=iso(now),count=len(current))
            for item in current: item['firstSeenAt']=previous_items.get(item['id'],{}).get('firstSeenAt',iso(now))
        except Exception as exc:
            # Never publish network exception strings: they may contain request data.
            state.update(status='error',errorCode=type(exc).__name__)
            current=[x for x in previous_items.values() if x['sourceId']==source['id'] and stamp(x['publishedAt']) and now-stamp(x['publishedAt'])<=dt.timedelta(days=180)]
            state['count']=len(current)
        return state,current
    with cf.ThreadPoolExecutor(max_workers=4) as pool:
        for state,current in pool.map(one,sources): states.append(state);items.extend(current)
    # Exact canonical URL identity deduplicates cross-feed references.
    unique={}
    for item in items: unique.setdefault(item['id'],item)
    items=sorted(unique.values(),key=lambda x:(x['publishedAt'],x['id']),reverse=True)[:120]
    return {'version':1,'checkedAt':iso(now),'cadence':'daily','status':'ok' if all(x['status']=='ok' for x in states) else 'partial' if any(x['status']=='ok' for x in states) else 'unavailable','sources':states,'items':items}

def main():
    sources=json.loads((ROOT/'sources.json').read_text())
    path=ROOT/'discovery.json'
    previous=json.loads(path.read_text()) if path.exists() else {}
    result=refresh(sources,previous)
    temp=path.with_suffix('.tmp');temp.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');temp.replace(path)
    print(f"Discovery: {len(result['items'])} items; {sum(x['status']=='ok' for x in result['sources'])}/{len(sources)} sources checked successfully; {result['checkedAt']}")
    # The workflow commits and deploys visible error states before its final gate.
    return result

if __name__=='__main__': main()
