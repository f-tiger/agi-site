#!/usr/bin/env python3
"""Bounded official-title discovery; classifications are unreviewed weak signals.

No article following, model calls, credentials, or user-supplied remote URLs.
Publication time is never inferred from discovery/check time or RSS updated time.
"""
from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from html import unescape
from html.parser import HTMLParser
import hashlib
import json
from pathlib import Path
import re
import socket
import ssl
import sys
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlsplit, urlunsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener, HTTPSHandler
import xml.etree.ElementTree as ET
import zlib

ROOT = Path(__file__).resolve().parents[2]
SNAPSHOT = ROOT / 'futures-assets' / 'snapshot.json'
MAX_BYTES = 3_000_000
TIMEOUT = 14
MAX_ITEMS_PER_FETCH = 40
SOURCE_DEFINITIONS = (
    {'id': 'openai', 'company': 'OpenAI', 'url': 'https://openai.com/news/rss.xml', 'kind': 'rss', 'hosts': ('openai.com', 'www.openai.com'), 'paths': r'^/index/[^/]+/?$'},
    {'id': 'anthropic', 'company': 'Anthropic', 'url': 'https://www.anthropic.com/news', 'kind': 'html', 'hosts': ('anthropic.com', 'www.anthropic.com'), 'paths': r'^/(?:news/[^/]+|claude-[a-z0-9-]+)/?$'},
    {'id': 'meta', 'company': 'Meta', 'url': 'https://about.fb.com/news/feed/', 'kind': 'rss', 'hosts': ('about.fb.com',), 'paths': r'^/news/20\d{2}/\d{2}/[^/]+/?$'},
    {'id': 'xai', 'company': 'xAI / SpaceX', 'url': 'https://x.ai/news', 'kind': 'html', 'hosts': ('x.ai', 'www.x.ai'), 'paths': r'^/news/[^/]+/?$'},
    {'id': 'deepmind', 'company': 'Google DeepMind', 'url': 'https://deepmind.google/blog/rss.xml', 'kind': 'rss', 'hosts': ('deepmind.google',), 'paths': r'^/(?:discover/)?blog/[^/]+/?$'},
)
SOURCES = {s['id']: s for s in SOURCE_DEFINITIONS}
SIGNALS = {'neutral', 'capability', 'infrastructure', 'constraint'}
MONTHS = r'(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)'
DATE_PATTERN = re.compile(r'(' + MONTHS + r'\.?\s+\d{1,2},?\s+20\d{2}|\d{1,2}\s+' + MONTHS + r'\s+20\d{2}|20\d{2}-\d{2}-\d{2})', re.I)


def iso(value: datetime) -> str:
    return value.astimezone(timezone.utc).isoformat(timespec='seconds').replace('+00:00', 'Z')


def parse_date(value) -> datetime | None:
    if not isinstance(value, str) or not value.strip():
        return None
    raw = value.strip()
    try:
        result = datetime.fromisoformat(raw.replace('Z', '+00:00'))
    except ValueError:
        try:
            result = parsedate_to_datetime(raw)
        except (TypeError, ValueError, OverflowError):
            result = None
            for fmt in ('%b %d, %Y', '%B %d, %Y', '%b %d %Y', '%B %d %Y', '%d %B %Y', '%d %b %Y'):
                try:
                    result = datetime.strptime(raw.replace('.', ''), fmt)
                    break
                except ValueError:
                    continue
            if result is None:
                return None
    if result.tzinfo is None:
        result = result.replace(tzinfo=timezone.utc)
    return result.astimezone(timezone.utc)


def safe_url(value: str, source: dict, *, article=False) -> str:
    if not isinstance(value, str) or re.search(r'[\x00-\x20\x7f\\]', value):
        raise ValueError('unsafe_url')
    parsed = urlsplit(urljoin(source['url'], unescape(value)))
    if parsed.scheme != 'https' or parsed.hostname not in source['hosts'] or parsed.username or parsed.password or parsed.port not in (None, 443):
        raise ValueError('unsafe_url')
    if article and not re.fullmatch(source['paths'], parsed.path):
        raise ValueError('not_article')
    if article and parsed.path.rstrip('/') in ('/news/announcements', '/news/partnerships', '/news/research', '/news/policy', '/news/company'):
        raise ValueError('not_article')
    # Official article pages have no meaningful query identity; discard all trackers.
    host = source['hosts'][0]
    return urlunsplit(('https', host, parsed.path.rstrip('/') or '/', '', ''))


def clean(value) -> str:
    return re.sub(r'\s+', ' ', unescape(re.sub(r'<[^>]*>', ' ', str(value or '')))).strip()


def classify(title: str, published_at: str | None, now: datetime) -> str:
    published = parse_date(published_at)
    if published is None or not timedelta(0) <= now - published < timedelta(days=90):
        return 'neutral'
    if re.search(r'\b(?:regulat\w*|delay\w*|shortage\w*|restriction\w*)\b|safety incident|暂停|延期', title, re.I):
        return 'constraint'
    if re.search(r'\b(?:data centers?|datacenters?|compute|chips?|energy|gpus?|gigawatts?)\b|算力', title, re.I):
        return 'infrastructure'
    model = r'\b(?:GPT[-\s]?\d|Claude\s+(?:Sonnet|Opus|Haiku|Fable|Mythos)|Gemini\s+\d|Grok\s+\d|Llama\s+\d|Muse\s+Spark)'
    if re.search(model, title, re.I) and re.search(r'introducing|announc|releas|launch|unveil|next era|new generation|now available', title, re.I):
        return 'capability'
    return 'neutral'


class NewsHTML(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.rows, self.anchor, self.heading, self.ignore = [], None, 0, 0
        self.ld, self.scripts = None, []
        self.cards, self.time_card = [], None

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in ('script', 'style'):
            self.ignore += 1
            if tag == 'script' and a.get('type') == 'application/ld+json':
                self.ld = []
            return
        if self.ignore:
            return
        for card in self.cards:
            if card['tag'] == tag:
                card['depth'] += 1
        if tag == 'article' or tag == 'li' and a.get('data-listing-row'):
            self.cards.append({'tag': tag, 'depth': 1, 'rows': [], 'date': None})
        if tag == 'time' and self.cards:
            self.time_card = self.cards[-1]
            self.time_card['time_text'] = []
            if a.get('datetime'):
                self.time_card['date'] = a['datetime']
        if tag == 'a':
            self.anchor = {'url': a.get('href', ''), 'text': [], 'head': [], 'date': None}
        if self.anchor is not None:
            if tag in ('h1', 'h2', 'h3', 'h4', 'h5', 'h6'):
                self.heading += 1
            if tag == 'time' and a.get('datetime'):
                self.anchor['date'] = a['datetime']

    def handle_data(self, data):
        if self.ld is not None:
            self.ld.append(data)
        if not self.ignore and self.time_card is not None:
            self.time_card['time_text'].append(data)
        if self.ignore or self.anchor is None:
            return
        self.anchor['text'].append(data)
        if self.heading:
            self.anchor['head'].append(data)

    def handle_endtag(self, tag):
        if tag in ('script', 'style'):
            if self.ld is not None:
                self.scripts.append(''.join(self.ld))
                self.ld = None
            self.ignore = max(0, self.ignore - 1)
            return
        if self.ignore:
            return
        if tag == 'time' and self.time_card is not None:
            self.time_card['date'] = self.time_card['date'] or clean(' '.join(self.time_card['time_text']))
            self.time_card = None
        if tag in ('h1', 'h2', 'h3', 'h4', 'h5', 'h6'):
            self.heading = max(0, self.heading - 1)
        if tag == 'a' and self.anchor is not None:
            a, self.anchor = self.anchor, None
            self.heading = 0
            text = clean(' '.join(a['text']))
            match = DATE_PATTERN.search(text)
            title = clean(' '.join(a['head'])) or DATE_PATTERN.sub('', text).strip(' ·-|')
            row = {'title': title, 'url': a['url'], 'publishedAt': a['date'] or (match.group(1) if match else None)}
            self.rows.append(row)
            if self.cards:
                self.cards[-1]['rows'].append(row)
        for card in list(self.cards):
            if card['tag'] != tag:
                continue
            card['depth'] -= 1
            if card['depth'] == 0:
                for row in card['rows']:
                    row['publishedAt'] = row['publishedAt'] or card['date']
                self.cards.remove(card)


def local_name(tag):
    return tag.rsplit('}', 1)[-1]


def rss_rows(raw: str) -> list[dict]:
    # ElementTree does not fetch external entities, and declarations are rejected too.
    if re.search(r'<!\s*(?:DOCTYPE|ENTITY)\b', raw, re.I):
        raise ValueError('unsafe_xml_declaration')
    tree = ET.fromstring(raw)
    rows = []
    for item in tree.iter():
        if local_name(item.tag) not in ('item', 'entry'):
            continue
        children = list(item)
        field = lambda key: next((''.join(x.itertext()) for x in children if local_name(x.tag) == key), None)
        links = [x for x in children if local_name(x.tag) == 'link']
        link = next((x for x in links if x.get('rel') == 'alternate'), next((x for x in links if x.get('rel') in (None, '')), None))
        url = (link.get('href') or link.text) if link is not None else None
        rows.append({'title': field('title'), 'url': url, 'publishedAt': field('pubDate') or field('published')})
    return rows


def html_rows(raw: str) -> list[dict]:
    parser = NewsHTML()
    parser.feed(raw)
    rows = []

    def visit(value, depth=0):
        if depth > 16:
            return
        if isinstance(value, list):
            for v in value:
                visit(v, depth + 1)
        elif isinstance(value, dict):
            types = value.get('@type', [])
            if isinstance(types, str):
                types = [types]
            elif not isinstance(types, list):
                types = []
            if any(t in ('Article', 'NewsArticle', 'BlogPosting', 'ListItem') for t in types):
                item = value.get('item') if isinstance(value.get('item'), dict) else value
                rows.append({'title': item.get('headline') or item.get('name'), 'url': item.get('url'), 'publishedAt': item.get('datePublished')})
            for v in value.values():
                visit(v, depth + 1)

    for script in parser.scripts:
        try:
            visit(json.loads(script))
        except (ValueError, RecursionError):
            continue
    return rows + parser.rows


def parse_source(raw: str, source: dict, checked_at: str) -> list[dict]:
    now = parse_date(checked_at)
    if now is None:
        raise ValueError('invalid_check_time')
    rows = rss_rows(raw) if source['kind'] == 'rss' else html_rows(raw)
    unique = {}
    for row in rows:
        try:
            url = safe_url(row.get('url'), source, article=True)
            title = clean(row.get('title'))
            if len(title) < 12 or len(title) > 400:
                continue
            raw_date = row.get('publishedAt')
            published = parse_date(raw_date)
            if raw_date and published is None or published is not None and published > now:
                continue
            date = iso(published) if published else None
            result = {'id': hashlib.sha256(url.encode()).hexdigest()[:24], 'company': source['company'], 'title': title[:240], 'url': url, 'publishedAt': date, 'discoveredAt': checked_at, 'signal': classify(title, date, now), 'reviewStatus': 'automatic'}
            # Prefer structured publication evidence over an undated duplicate link.
            if url not in unique or not unique[url]['publishedAt'] and date:
                unique[url] = result
        except (TypeError, ValueError):
            continue
    return sorted(unique.values(), key=lambda x: (x['publishedAt'] or '', x['url']), reverse=True)[:MAX_ITEMS_PER_FETCH]


class SafeRedirect(HTTPRedirectHandler):
    max_redirections = 4
    max_repeats = 2

    def __init__(self, source):
        self.source = source

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        safe_url(newurl, self.source)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def fetch_source(source: dict) -> str:
    # Only definitions fixed in this file can initiate requests.
    if source != SOURCES.get(source.get('id')):
        raise ValueError('unknown_source')
    safe_url(source['url'], source)
    opener = build_opener(SafeRedirect(source), HTTPSHandler(context=ssl.create_default_context()))
    request = Request(source['url'], headers={'User-Agent': 'AGIScorecard-Futures/1.0 (+https://agiscorecard.com)', 'Accept': 'application/rss+xml, application/atom+xml, text/html;q=0.9', 'Accept-Encoding': 'identity'})
    with opener.open(request, timeout=TIMEOUT) as response:
        safe_url(response.geturl(), source)
        if response.status != 200:
            raise ValueError('http_' + str(response.status))
        if int(response.headers.get('Content-Length', '0')) > MAX_BYTES:
            raise ValueError('response_too_large')
        # read1 returns after a socket read; check a wall budget between chunks.
        # One last socket operation can add TIMEOUT, so a source is bounded at
        # approximately 2 * TIMEOUT instead of allowing indefinite slow trickles.
        started, chunks, count = time.monotonic(), [], 0
        while True:
            if time.monotonic() - started > TIMEOUT:
                raise TimeoutError()
            chunk = response.read1(min(65536, MAX_BYTES + 1 - count))
            if not chunk:
                break
            count += len(chunk)
            if count > MAX_BYTES:
                raise ValueError('response_too_large')
            chunks.append(chunk)
        body = b''.join(chunks)
        # Some official feeds return gzip even when identity was requested.
        # Bound decoded output as well as transfer bytes (no decompression bomb).
        if body.startswith(b'\x1f\x8b'):
            decoder = zlib.decompressobj(16 + zlib.MAX_WBITS)
            decoded = decoder.decompress(body, MAX_BYTES + 1)
            if len(decoded) > MAX_BYTES or decoder.unconsumed_tail:
                raise ValueError('response_too_large')
            if not decoder.eof or decoder.unused_data:
                raise ValueError('invalid_compressed_response')
            body = decoded
        raw = body.decode('utf-8', errors='replace')
        if len(body) < 100 or re.search(r'<title>[^<]*(?:access denied|just a moment|attention required)|checking your browser|site unavailable', raw, re.I):
            raise ValueError('blocked_or_empty_response')
        return raw


def safe_error(error: Exception) -> str:
    if isinstance(error, HTTPError):
        return 'http_' + str(error.code)
    if isinstance(error, (TimeoutError, socket.timeout)) or isinstance(error, URLError) and isinstance(error.reason, (TimeoutError, socket.timeout)):
        return 'timeout'
    allowed = {'unsafe_url', 'unknown_source', 'response_too_large', 'blocked_or_empty_response', 'unsafe_xml_declaration', 'no_usable_items'}
    return str(error) if isinstance(error, ValueError) and str(error) in allowed else 'fetch_or_parse_failed'


def refresh(previous: dict, checked_at: str, fetcher=fetch_source) -> dict:
    now = parse_date(checked_at)
    if now is None:
        raise ValueError('invalid_check_time')
    old_sources = {s.get('id'): s for s in previous.get('sources', []) if isinstance(s, dict)}
    old_items = {}
    for row in previous.get('items', []):
        if not isinstance(row, dict):
            continue
        source = next((s for s in SOURCE_DEFINITIONS if row.get('company') == s['company']), None)
        if source is None:
            continue
        try:
            url = safe_url(row.get('url'), source, article=True)
            title = clean(row.get('title'))
            published = parse_date(row.get('publishedAt'))
            discovered = parse_date(row.get('discoveredAt'))
            if not title or discovered is None or discovered > now or row.get('publishedAt') and published is None or published and published > now:
                continue
            date = iso(published) if published else None
            old_items[url] = {'id': hashlib.sha256(url.encode()).hexdigest()[:24], 'company': source['company'], 'title': title[:240], 'url': url, 'publishedAt': date, 'discoveredAt': iso(discovered), 'signal': classify(title, date, now), 'reviewStatus': 'automatic'}
        except (ValueError, TypeError):
            continue

    def one(source):
        previous_source = old_sources.get(source['id'], {})
        last_success = parse_date(previous_source.get('lastSuccessAt'))
        health = {'id': source['id'], 'company': source['company'], 'url': source['url'], 'checkedAt': checked_at, 'lastSuccessAt': iso(last_success) if last_success and last_success <= now else None, 'ok': False, 'error': None}
        try:
            items = parse_source(fetcher(source), source, checked_at)
            if not items:
                raise ValueError('no_usable_items')
            health.update(ok=True, lastSuccessAt=checked_at)
            return health, items
        except Exception as error:
            health['error'] = safe_error(error)
            return health, []

    with ThreadPoolExecutor(max_workers=5) as pool:
        outcomes = list(pool.map(one, SOURCE_DEFINITIONS))
    for _, items in outcomes:
        for row in items:
            old = old_items.get(row['url'])
            if old:
                row['discoveredAt'] = old['discoveredAt']
                # A later index redesign cannot erase a previously published date.
                if row['publishedAt'] is None and old['publishedAt']:
                    row['publishedAt'] = old['publishedAt']
                    row['signal'] = classify(row['title'], row['publishedAt'], now)
            old_items[row['url']] = row
    return {'checkedAt': checked_at, 'sources': [health for health, _ in outcomes], 'items': sorted(old_items.values(), key=lambda x: (x['publishedAt'] or '', x['discoveredAt'], x['url']), reverse=True)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--snapshot', type=Path, default=SNAPSHOT)
    args = parser.parse_args()
    previous = json.loads(args.snapshot.read_text()) if args.snapshot.exists() else {}
    if not isinstance(previous, dict):
        raise ValueError('invalid_existing_snapshot')
    result = refresh(previous, iso(datetime.now(timezone.utc)))
    args.snapshot.parent.mkdir(parents=True, exist_ok=True)
    tmp = args.snapshot.with_suffix('.json.tmp')
    tmp.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    tmp.replace(args.snapshot)
    print(json.dumps({'checkedAt': result['checkedAt'], 'ok': sum(s['ok'] for s in result['sources']), 'total': len(result['sources']), 'items': len(result['items']), 'failures': [{'id': s['id'], 'error': s['error']} for s in result['sources'] if not s['ok']]}, ensure_ascii=False))
    # The workflow commits this honest health snapshot before its separate
    # source-health gate reports partial/all upstream failures.
    return 0


if __name__ == '__main__':
    sys.exit(main())
