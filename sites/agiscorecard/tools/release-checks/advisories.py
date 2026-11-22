#!/usr/bin/env python3
"""Compare stable CLI versions to published advisories from their own GitHub repositories.

Only exact npm package records are in scope. Only explicit numeric SemVer bounds
are interpreted. An ambiguous range, incomplete source or failed fetch cannot
establish a no-match result. Advisory descriptions never enter the snapshot.
"""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import json
import operator
import re
from urllib.error import HTTPError
from urllib.request import Request, build_opener

from refresh import NoRedirect, SNAPSHOT, SOURCES

OUTPUT = SNAPSHOT.with_name('advisories.json')
PACKAGES = {'openai/codex': '@openai/codex', 'anthropics/claude-code': '@anthropic-ai/claude-code'}
PAGE_SIZE, MAX_PAGES, MAX_BYTES = 50, 4, 5_000_000
MAX_REVIEWED_LOOKUPS = 3
PART = r'(?:0|[1-9][0-9]{0,6})'
VERSION = rf'v?({PART})\.({PART})\.({PART})'
BOUND = re.compile(rf'(<=|>=|<|>|=)?\s*{VERSION}', re.ASCII)
OPS = {'<': operator.lt, '>': operator.gt, '<=': operator.le, '>=': operator.ge, '=': operator.eq}
IDENT = re.compile(r'GHSA-(?:[23456789cfghjmpqrvwx]{4}-){2}[23456789cfghjmpqrvwx]{4}')


def matches_range(version, expression):
    """True, False or unknown (None). Bare versions must stand alone."""
    version_match = re.fullmatch(VERSION, version, re.ASCII)
    if not version_match or not expression:
        return None
    actual = tuple(map(int, version_match.groups()))
    alternatives = []
    for branch in expression.split('||'):
        bounds = list(BOUND.finditer(branch))
        if not bounds or branch[:bounds[0].start()].strip() or branch[bounds[-1].end():].strip():
            return None
        valid = True
        for i, bound in enumerate(bounds):
            if i and not re.fullmatch(r'(?:\s+|\s*,\s*)', branch[bounds[i - 1].end():bound.start()]):
                return None
            op = bound[1]
            if op is None and len(bounds) != 1:
                return None
            valid &= OPS[op or '='](actual, tuple(map(int, bound.groups()[1:])))
        alternatives.append(valid)
    return any(alternatives)


def public_range(value):
    # Numeric range text and conventional SemVer punctuation only; discard prose.
    if not isinstance(value, str) or len(value) > 140:
        return None
    value = value.strip()
    chars = r'(?:[0-9xXv.,<>=~^*|+\- ]|rc|alpha|beta| and above)+'
    return value if re.fullmatch(chars, value, re.ASCII) else None


def advisory(row, repo):
    if not isinstance(row, dict) or row.get('state') != 'published':
        raise ValueError('unexpected advisory state')
    if row.get('withdrawn_at'):
        return None
    affected = row.get('vulnerabilities')
    if not isinstance(affected, list) or not affected:
        raise ValueError('missing package scope')
    ranges = []
    for item in affected:
        if not isinstance(item, dict) or not isinstance(item.get('package'), dict):
            raise ValueError('invalid package scope')
        package = item['package']
        if package.get('ecosystem') == 'npm' and package.get('name') == PACKAGES[repo]:
            ranges.append({'affected': public_range(item.get('vulnerable_version_range')),
                           'fixed': public_range(item.get('patched_versions'))})
    if not ranges:
        return None
    ident = row.get('ghsa_id')
    url = f'https://github.com/{repo}/security/advisories/{ident}'
    stamp = row.get('published_at')
    if (not isinstance(ident, str) or not IDENT.fullmatch(ident) or row.get('html_url') != url
            or not isinstance(stamp, str) or not re.fullmatch(r'\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ', stamp)):
        raise ValueError('invalid published advisory metadata')
    datetime.fromisoformat(stamp.replace('Z', '+00:00'))
    severity = row.get('severity')
    return {'id': ident, 'url': url, 'publishedAt': stamp, 'ranges': ranges,
            'severity': severity if severity in ('low', 'medium', 'moderate', 'high', 'critical') else 'unknown'}


def assess(version, bulletins, status):
    matches, unparsed = [], []
    for bulletin in bulletins:
        states = [matches_range(version, r.get('reviewedAffected', r['affected'])) for r in bulletin['ranges']]
        if True in states:
            matches.append(bulletin['id'])
        elif None in states:
            unparsed.append(bulletin['id'])
    if status != 'ok':
        # The retained positive evidence may have been revised or withdrawn.
        result = 'unknown'
    elif matches:
        result = 'affected'
    else:
        result = 'unknown' if unparsed else 'no_match'
    return {'status': result, 'matches': matches, 'unparsed': unparsed}


def read_github(url):
    req = Request(url, headers={'User-Agent': 'AGI-Scorecard-Release-Checks/1.0',
                                'Accept': 'application/vnd.github+json', 'Accept-Encoding': 'identity'})
    with build_opener(NoRedirect()).open(req, timeout=12) as response:
        body = response.read(MAX_BYTES + 1)
        if len(body) > MAX_BYTES:
            raise ValueError('response_size')
        return json.loads(body), 'rel="next"' in response.headers.get('Link', '')


def read_page(repo, page):
    if repo not in PACKAGES or not 1 <= page <= MAX_PAGES:
        raise ValueError('unsupported source')
    return read_github(f'https://api.github.com/repos/{repo}/security-advisories?state=published&per_page={PAGE_SIZE}&page={page}')


def read_reviewed(ident):
    if not IDENT.fullmatch(ident):
        raise ValueError('invalid advisory ID')
    row, _ = read_github(f'https://api.github.com/advisories/{ident}')
    return row


def reviewed_range(record, row, repo):
    """Accept a GH Reviewed normalization of the same numeric bounds and fix."""
    ident = record['id']
    url = f'https://github.com/advisories/{ident}'
    if (not isinstance(row, dict) or row.get('type') != 'reviewed' or row.get('withdrawn_at')
            or row.get('ghsa_id') != ident or row.get('html_url') != url or not row.get('github_reviewed_at')
            or row.get('source_code_location') != f'https://github.com/{repo}'):
        return
    vulnerabilities = row.get('vulnerabilities')
    if not isinstance(vulnerabilities, list):
        return
    package = {'ecosystem': 'npm', 'name': PACKAGES[repo]}
    scoped = [v for v in vulnerabilities if isinstance(v, dict) and v.get('package') == package]
    if len(scoped) != 1 or len(record['ranges']) != 1:
        return
    source = record['ranges'][0]
    affected = public_range(scoped[0].get('vulnerable_version_range'))
    fixed = public_range(scoped[0].get('first_patched_version'))
    if (not fixed or fixed != source['fixed'] or not re.fullmatch(VERSION, fixed) or not source['affected']
            or matches_range('0.0.0', affected) is None
            or re.findall(VERSION, source['affected']) != re.findall(VERSION, affected)):
        return
    source['reviewedAffected'] = affected
    record['reviewedUrl'] = url


def update_source(source, releases, old, stamp, load=read_page, review=read_reviewed):
    ident, _, repo, _ = source
    fresh = {}
    previous = {b['id']: b for b in old.get('advisories', [])}
    status, error = 'partial', 'page_limit'
    try:
        for page in range(1, MAX_PAGES + 1):
            rows, more = load(repo, page)
            if not isinstance(rows, list) or len(rows) > PAGE_SIZE or (more and not rows):
                raise ValueError('response shape')
            for row in rows:
                record = advisory(row, repo)
                if record:
                    if record['id'] in fresh or record['publishedAt'] > stamp:
                        raise ValueError('inconsistent page')
                    fresh[record['id']] = record
            if not more:
                status, error = 'ok', None
                break
    except (OSError, ValueError, EOFError) as exc:
        status = 'unavailable'
        error = f'http_{exc.code}' if isinstance(exc, HTTPError) else 'invalid_or_unavailable_source'
    # Each source has a fixed, small lookup budget. A missed normalization
    # leaves only that ambiguous bulletin unresolved after a successful listing.
    if status == 'ok':
        unresolved = [b for b in fresh.values() if len(b['ranges']) == 1 and b['ranges'][0]['affected']
                      and matches_range('0.0.0', b['ranges'][0]['affected']) is None]
        for bulletin in unresolved[:MAX_REVIEWED_LOOKUPS]:
            try:
                reviewed_range(bulletin, review(bulletin['id']), repo)
            except (OSError, ValueError, EOFError):
                pass
    # A complete current list supersedes withdrawn/corrected historical records.
    available = fresh if status == 'ok' else previous | fresh
    bulletins = sorted(available.values(), key=lambda row: (row['publishedAt'], row['id']), reverse=True)
    return {'id': ident, 'package': PACKAGES[repo], 'sourceUrl': f'https://github.com/{repo}/security/advisories',
            'checkedAt': stamp, 'lastSuccessAt': stamp if status == 'ok' else old.get('lastSuccessAt'),
            'status': status, 'error': error, 'advisories': bulletins,
            'versions': {r['version']: assess(r['version'], bulletins, status) for r in releases}}


def main():
    releases = {s['id']: s['releases'] for s in json.loads(SNAPSHOT.read_text())['sources']}
    old = {s['id']: s for s in json.loads(OUTPUT.read_text())['sources']} if OUTPUT.exists() else {}
    stamp = datetime.now(timezone.utc).isoformat(timespec='seconds').replace('+00:00', 'Z')
    with ThreadPoolExecutor(max_workers=2) as pool:
        sources = list(pool.map(lambda s: update_source(s, releases[s[0]], old.get(s[0], {}), stamp), SOURCES))
    out = {'version': 1, 'checkedAt': stamp, 'sources': sources}
    temp = OUTPUT.with_suffix('.tmp')
    temp.write_text(json.dumps(out, indent=2) + '\n', encoding='utf-8')
    temp.replace(OUTPUT)
    for s in sources:
        print(s['id'], s['status'], len(s['advisories']), 'published npm package advisories')


if __name__ == '__main__':
    main()
