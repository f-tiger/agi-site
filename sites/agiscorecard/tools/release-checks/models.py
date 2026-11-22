#!/usr/bin/env python3
"""Derive named model launches from the existing AGI publisher snapshot.

Match a launch verb and an entire named model phrase, or a named model followed
by 'is now available'. A vendor name, feature announcement or passing mention
is insufficient. Unknown naming patterns wait for review. An article describing
multiple models counts once. Publisher dates say nothing about CLI defaults.
"""
from datetime import date, datetime, timezone
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'futures-assets' / 'snapshot.json'
OUTPUT = ROOT / 'futures-assets/release-checks' / 'models.json'
VENDORS = {
    'OpenAI': (
        'https://openai.com/news/rss.xml',
        re.compile(r'https://(?:www\.)?openai\.com(/index/[a-z0-9-]+)/?'),
    ),
    'Anthropic': (
        'https://www.anthropic.com/news',
        re.compile(r'https://(?:www\.)?anthropic\.com(/(?:news/[a-z0-9-]+|claude-[a-z0-9-]+))/?'),
    ),
}
VERSION = r'\d+(?:\.\d+)*'
OPENAI_EDITION = r'(?:Astra|Sol|Terra|Luna|mini|nano|pro|Codex(?:-Max)?|Turbo)'
OPENAI_MODEL = rf'(?:GPT[- ]{VERSION}o?(?:[- ]{OPENAI_EDITION})?|(?:OpenAI )?o\d(?:-mini|-pro)?)'
CLAUDE_EDITION = r'(?:Opus|Sonnet|Haiku|Fable|Mythos)'
CLAUDE_MODEL = rf'Claude (?:{CLAUDE_EDITION}(?: and {CLAUDE_EDITION})? {VERSION}|{VERSION}(?: {CLAUDE_EDITION})?)'
JOIN = r'(?:,? and | & |, )'
PHRASES = {
    'OpenAI': rf'{OPENAI_MODEL}(?:{JOIN}(?:{OPENAI_MODEL}|{OPENAI_EDITION}))*',
    'Anthropic': rf'{CLAUDE_MODEL}(?:{JOIN}(?:{CLAUDE_MODEL}|{CLAUDE_EDITION} {VERSION}))*',
}
LAUNCH_TITLES = {
    company: re.compile(
        rf'(?:(?:Introducing|Announcing|Unveiling|Meet) {phrase}|{phrase} (?:is|are) now available)[.!]?',
        re.IGNORECASE,
    ) for company, phrase in PHRASES.items()
}


def article_url(company, url):
    if company not in VENDORS or not isinstance(url, str):
        return None
    match = VENDORS[company][1].fullmatch(url)
    if not match:
        return None
    host = 'openai.com' if company == 'OpenAI' else 'anthropic.com'
    return 'https://' + host + match[1]


def publication_day(value, checked_at):
    if not isinstance(value, str):
        return None
    try:
        if len(value) == 10:
            day = date.fromisoformat(value)
            return day.isoformat() if day <= checked_at.date() else None
        stamp = datetime.fromisoformat(value.replace('Z', '+00:00'))
        if stamp.tzinfo and stamp <= checked_at:
            return stamp.astimezone(timezone.utc).date().isoformat()
    except ValueError:
        pass
    return None


def derive(snapshot, previous):
    checked_at = datetime.fromisoformat(snapshot['checkedAt'].replace('Z', '+00:00'))
    if checked_at.tzinfo is None:
        raise ValueError('Missing source timezone')
    sources = []
    for vendor, (source_url, _) in VENDORS.items():
        health = next((row for row in snapshot['sources']
                       if row.get('company') == vendor and row.get('url') == source_url), {})
        sources.append({'vendor': vendor, 'url': source_url, 'ok': health.get('ok') is True,
                        'checkedAt': health.get('checkedAt'), 'lastSuccessAt': health.get('lastSuccessAt')})

    by_url = {}

    def update(row, vendor):
        url = article_url(vendor, row.get('url'))
        if not url:
            return
        title = row.get('title')
        day = publication_day(row.get('publishedAt'), checked_at)
        if isinstance(title, str) and LAUNCH_TITLES[vendor].fullmatch(title) and day:
            by_url[url] = {'vendor': vendor, 'title': title, 'url': url, 'publishedAt': day}
        else:
            # A publisher correction supersedes the previously retained headline.
            by_url.pop(url, None)

    for row in previous.get('models', []):
        update(row, row.get('vendor'))
    for row in snapshot['items']:
        update(row, row.get('company'))
    models = sorted(by_url.values(), key=lambda row: (row['publishedAt'], row['url']), reverse=True)
    return {'version': 1, 'checkedAt': snapshot['checkedAt'], 'sources': sources, 'models': models}


def main():
    previous = json.loads(OUTPUT.read_text()) if OUTPUT.exists() else {}
    result = derive(json.loads(SOURCE.read_text()), previous)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    tmp = OUTPUT.with_suffix('.json.tmp')
    tmp.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    tmp.replace(OUTPUT)
    print(f"{len(result['models'])} model announcements from publisher snapshot {result['checkedAt']}")


if __name__ == '__main__':
    main()
