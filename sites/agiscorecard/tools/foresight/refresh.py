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
RETENTION_DAYS = 730
MAX_SOURCE_ITEMS = 120
MAX_ITEMS = 3000
AI = re.compile(r'\b(?:AI|AGI|LLM|GPT|OpenAI|Anthropic|Claude|Jev|Gemini|agentic|agents?|deepmind|machine learning|artificial intelligence)\b|人工智能|大模型|智能体|具身|人工智慧|模型训练|模型訓練', re.I)
TOPICS = {
 'work':r'\b(?:work|workers?|jobs?|code|coding|programming|software|workflows?|agents?|agentic)\b|工作|職業|职业|编程|軟體|软件|智能体|智能體',
 'learn':r'\b(?:learn\w*|education|research|science|skills?|training|teach\w*)\b|学习|學習|教育|研究|技能|科学|科學|教學|教程',
 'earn':r'\b(?:business\w*|startups?|founders?|creators?|creativity|companies|company|distribution|inference|entrepreneur\w*)\b|商业|商業|创业|創業|公司|创作|創作|收入|产业|產業',
 'family':r'\b(?:child\w*|kids?|tutor\w*|education|schools?|teachers?|parent\w*)\b|孩子|儿童|兒童|学校|學校|教育|老师|老師|家長',
 'understand':r'\b(?:models?|LLMs?|GPT\w*|Gemini|Claude|benchmark\w*|reasoning|robot\w*)\b|模型|推理|機器人|机器人|评测|評測',
 'forecast':r'\b(?:AGI|future|recursive|progress|superintelligen\w*|forecast\w*|prediction\w*)\b|未来|未來|预测|預測|进展|進展|自我改进|自我成長'
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

def video_id(link):
    try:
        u=urllib.parse.urlsplit(link)
        value=urllib.parse.parse_qs(u.query).get('v',[''])[0] if u.hostname in ('youtube.com','www.youtube.com','m.youtube.com') else u.path.lstrip('/') if u.hostname=='youtu.be' else ''
        return value if re.fullmatch(r'[\w-]{11}',value) else None
    except (TypeError,ValueError): return None

def identity(item):
    video=item.get('videoId') or video_id(item.get('url',''))
    return 'video:'+video if video else item['url']

def retained(item,now):
    published=stamp(item.get('publishedAt'))
    return bool(published and now-dt.timedelta(days=RETENTION_DAYS)<=published<=now+dt.timedelta(minutes=5)
        and safe_url(item.get('url')) and '/shorts/' not in item['url']
        and not re.search(r'#shorts\b',item.get('title',''),re.I))

def parse_feed(data, source, now):
    if len(data)>LIMIT or b'<!DOCTYPE' in data.upper() or b'<!ENTITY' in data.upper():
        raise ValueError('unsafe_or_oversize_feed')
    root=ET.fromstring(data)
    if root.tag.split('}')[-1] not in ('rss','feed'): raise ValueError('not_a_feed')
    if source.get('channelId'):
        channel=next((x.text for x in root if x.tag.split('}')[-1]=='channelId'),None)
        # YouTube's feed-level ID omits UC; entry-level IDs include it.
        if channel not in (source['channelId'],source['channelId'].removeprefix('UC')):
            raise ValueError('channel_identity_mismatch')
    entries=[e for e in root.iter() if e.tag.split('}')[-1] in ('item','entry')]
    if not entries: raise ValueError('empty_feed')
    out=[]
    for e in entries[:600]:
        fields={}
        for x in e: fields.setdefault(x.tag.split('}')[-1],x.text or '')
        title=clean(fields.get('title'))
        # Never use an updated timestamp as the original publication date.
        published=stamp(fields.get('pubDate') or fields.get('published'))
        if not title or not published or published>now+dt.timedelta(minutes=5) or now-published>dt.timedelta(days=RETENTION_DAYS): continue
        if title.lower().startswith(('[ainews]','ainews:')): continue
        description=clean(fields.get('description') or fields.get('summary') or fields.get('encoded') or next((x.text for x in e.iter() if x.tag.split('}')[-1]=='description'), ''))
        if not source['aiFocused'] and not AI.search(title+' '+description[:600]): continue
        link=next((safe_url(x.get('href')) for x in e if x.tag.split('}')[-1]=='link' and x.get('rel','alternate')=='alternate' and safe_url(x.get('href'))),None)
        link=link or safe_url(fields.get('link')) or safe_url(fields.get('guid'))
        enclosures=[x for x in e if x.tag.split('}')[-1]=='enclosure']
        media=next((x for x in enclosures if x.get('type','').startswith(('audio/','video/'))),None)
        link=link or (safe_url(media.get('url')) if media is not None else None)
        if not link: continue
        # Shorts are separate uploads, often excerpts of the same interview.
        # Do not count them toward the full video collection.
        if '/shorts/' in link or re.search(r'#shorts\b',title,re.I): continue
        video=fields.get('videoId') or video_id(link)
        if video and re.fullmatch(r'[\w-]{11}',video):
            link='https://www.youtube.com/watch?v='+video
        medium='video' if video and re.fullmatch(r'[\w-]{11}',video) else 'audio' if media is not None and media.get('type','').startswith('audio/') else 'video' if media is not None else 'text'
        tags=[k for k,pattern in TOPICS.items() if re.search(pattern,title+' '+description[:600],re.I)]
        if not tags: tags=['understand']
        out.append({'id':hashlib.sha256(link.encode()).hexdigest()[:20],'sourceId':source['id'],'title':title[:220],
          'url':link,'publishedAt':iso(published),'medium':medium,'goals':tags,'status':'discovered',
          'publisherExcerpt':excerpt(description),
          **({'audioUrl':safe_url(media.get('url'))} if medium=='audio' and media is not None and safe_url(media.get('url')) else {}),
          **({'videoId':video} if video and re.fullmatch(r'[\w-]{11}',video) else {})})
    return sorted(out,key=lambda x:(x['publishedAt'],x['id']),reverse=True)[:MAX_SOURCE_ITEMS]

def fetch(source):
    req=urllib.request.Request(source['feed'],headers={'User-Agent':'AGI-Future-Guide/1.0 (+https://agiscorecard.com/future-guide)','Accept':'application/rss+xml, application/atom+xml, application/xml, text/xml'})
    with urllib.request.urlopen(req,timeout=20) as r:
        data=r.read(LIMIT+1)
    return data

def refresh(sources,previous,loader=fetch,now=None):
    now=now or dt.datetime.now(UTC)
    previous_items={identity(x):x for x in previous.get('items',[]) if retained(x,now)}
    previous_sources={x['id']:x for x in previous.get('sources',[])}
    items=[]; states=[]
    def one(source):
        old=previous_sources.get(source['id'],{})
        state={**source,'lastAttemptAt':iso(now),'lastSuccessAt':old.get('lastSuccessAt')}
        saved={key:x for key,x in previous_items.items() if x['sourceId']==source['id']}
        try:
            current=parse_feed(loader(source),source,now)
            state.update(status='ok',lastSuccessAt=iso(now),fetchedCount=len(current))
            for item in current:
                key=identity(item)
                item['firstSeenAt']=previous_items.get(key,{}).get('firstSeenAt',iso(now))
                saved[key]=item
        except Exception as exc:
            # Never publish network exception strings: they may contain request data.
            state.update(status='error',errorCode=type(exc).__name__)
        current=sorted(saved.values(),key=lambda x:(x['publishedAt'],x['id']),reverse=True)[:MAX_SOURCE_ITEMS]
        state['count']=len(current)
        return state,current
    with cf.ThreadPoolExecutor(max_workers=6) as pool:
        for state,current in pool.map(one,sources): states.append(state);items.extend(current)
    # Video identity also deduplicates watch/share links across publishers.
    unique={}
    for item in items: unique.setdefault(identity(item),item)
    items=sorted(unique.values(),key=lambda x:(x['publishedAt'],x['id']),reverse=True)[:MAX_ITEMS]
    for state in states: state['count']=sum(x['sourceId']==state['id'] for x in items)
    return {'version':1,'checkedAt':iso(now),'cadence':'daily','retentionDays':RETENTION_DAYS,'maxItems':MAX_ITEMS,'status':'ok' if all(x['status']=='ok' for x in states) else 'partial' if any(x['status']=='ok' for x in states) else 'unavailable','sources':states,'items':items}

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
