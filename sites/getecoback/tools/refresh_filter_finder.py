#!/usr/bin/env python3
"""Fail-closed check of nine approved US Levoit filter facts; no Amazon requests.

The approved facts are curated, not discovered by this job. A changed source
requires review before updating its fingerprint. Network failures are data
statuses (exit 0), so the next site build removes obsolete purchase buttons.
"""
import argparse
import copy
from datetime import datetime, timezone
import hashlib
import html
import json
from pathlib import Path
import re
import signal
import time
import unicodedata
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data/filter-finder.json'
MAX_BYTES = 1_000_000
REQUEST_TIMEOUT = 6
TOTAL_TIMEOUT = 60
SOURCE_BINDINGS = {
    'core-200s-p': ('core-200s-p-replacement-filter', 'HEACAFLVNUS0105Y', ['Core 200S-P'], ''),
    'core-400s-p': ('core-400s-p-3-stage-replacement-filter', 'HEACAFLVNUS0051A', ['Core 400S-P'], ''),
    'vital-100': ('vital100-air-purifier-replacement-filter', 'HEACAFLVNUS0018', ['Vital 100'], 'Vital 100-RF'),
    'vital-100s-p': ('vital-100s-replacement-filter', 'HEACAFLVNUS0089B', ['Vital 100S-P'], ''),
    'vital-200s-p': ('vital-200s-replacement-filter', 'HEACAFLVNUS0084A', ['Vital 200S-P'], ''),
    'lv-h132': ('lv-h132-air-purifier-replacement-filter', 'HEACAFLVNUS0003', ['LV-H132'], 'LV-H132-RF'),
    'lv-h133': ('lv-h133-air-purifier-tower-replacement-filter', 'HEACAFLVNUS0008', ['LV-H133'], 'LV-H133-RF'),
    'lv-pur131': ('lv-pur131-air-purifier-replacement-filter', 'HEACAFLVNUS0002', ['LV-PUR131', 'LV-PUR131S'], 'LV-PUR131-RF'),
    'vista-200': ('vista-200-replacement-filter', 'HEACAFLVNUS0011', ['Vista 200'], 'Vista 200-RF'),
}


def normalize(value):
    """Only the product description, never page navigation or recommendations."""
    value = re.sub(r'<(script|style)\b[^>]*>.*?</\1>', '', value, flags=re.I | re.S)
    value = html.unescape(re.sub(r'<[^>]+>', ' ', value))
    value = unicodedata.normalize('NFKC', value).replace('\ufeff', '').replace('\u200b', '')
    return re.sub(r'\s+', ' ', value).strip().casefold()


def digest(value):
    return hashlib.sha256(normalize(value).encode()).hexdigest()


def validate_document(document):
    if not isinstance(document, dict) or document.get('schema_version') != 1 or document.get('market') != 'US':
        raise ValueError('Expected schema_version 1 and market US')
    items = document.get('items')
    if not isinstance(items, list) or len(items) != len(SOURCE_BINDINGS):
        raise ValueError('Exactly nine approved source records are required')
    ids = [item.get('id') for item in items if isinstance(item, dict)]
    if len(ids) != len(items) or len(set(ids)) != len(ids) or set(ids) != set(SOURCE_BINDINGS):
        raise ValueError('Missing, duplicate or unapproved item id')
    if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', str(document.get('updated', ''))):
        raise ValueError('Missing semantic content date')
    for item in items:
        handle, sku, models, part = SOURCE_BINDINGS[item['id']]
        canonical = 'https://levoit.com/products/' + handle
        if item.get('source_url') != canonical or item.get('source_product_json') != canonical + '.js':
            raise ValueError('Source binding mismatch: ' + item['id'])
        if item.get('merchant_sku') != sku or item.get('models') != models or item.get('part_number') != part:
            raise ValueError('Approved identity mismatch: ' + item['id'])
        if item.get('brand') != 'Levoit' or item.get('name') != item.get('approved_title'):
            raise ValueError('Approved title/brand mismatch: ' + item['id'])
        if not isinstance(item.get('name'), str) or not item['name'].strip():
            raise ValueError('Missing title: ' + item['id'])
        if not re.fullmatch('[a-f0-9]{64}', str(item.get('approved_description_sha256', ''))):
            raise ValueError('Missing approved description fingerprint: ' + item['id'])
        statement = item.get('compatibility_statement', '')
        if not isinstance(statement, str) or not statement.strip() or any(normalize(m) not in normalize(statement) for m in models):
            raise ValueError('Missing exact compatibility statement: ' + item['id'])
        if item.get('status') not in ('verified', 'conflict', 'unavailable'):
            raise ValueError('Invalid status: ' + item['id'])
        for field in ('checked_at', 'last_good_checked_at'):
            if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', str(item.get(field, ''))):
                raise ValueError('Missing source date: ' + item['id'])
        query = item.get('amazon_query', '')
        if not isinstance(query, str) or 'Levoit' not in query or models[0] not in query:
            raise ValueError('Search query must preserve brand and exact model')


def evaluate_payload(item, payload):
    """Return status and a fixed reason; never promote changed compatibility."""
    if not isinstance(payload, dict):
        return 'unavailable', 'invalid_json_object'
    description = payload.get('description')
    variants = payload.get('variants')
    if not isinstance(description, str) or not normalize(description) or not isinstance(variants, list) or not variants:
        return 'unavailable', 'missing_product_fields'
    handle, expected_sku, _, part = SOURCE_BINDINGS[item['id']]
    if payload.get('handle') != handle or payload.get('title') != item['approved_title']:
        return 'conflict', 'product_identity_changed'
    if any(not isinstance(v, dict) for v in variants) or [v.get('sku') for v in variants] != [expected_sku]:
        return 'conflict', 'variant_sku_changed'
    scope = normalize(description)
    if normalize(item['compatibility_statement']) not in scope:
        return 'conflict', 'exact_compatibility_statement_missing'
    if part and re.sub(r'\s+', '', normalize(part)) not in re.sub(r'\s+', '', scope):
        return 'conflict', 'consumer_part_number_missing'
    if digest(description) != item['approved_description_sha256']:
        return 'conflict', 'description_changed_review_required'
    return 'verified', 'official_description_and_sku_unchanged'


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise urllib.error.HTTPError(req.full_url, code, 'Source redirected; review required', headers, fp)


def fetch_payload(url, timeout=REQUEST_TIMEOUT):
    """One request, no redirect or retry; bounded body and wall clock on Linux."""
    def expired(signum, frame):
        raise TimeoutError('Source request deadline exceeded')
    timer_supported = hasattr(signal, 'setitimer')
    previous = signal.getsignal(signal.SIGALRM) if timer_supported else None
    if timer_supported:
        signal.signal(signal.SIGALRM, expired)
        signal.setitimer(signal.ITIMER_REAL, timeout)
    try:
        request = urllib.request.Request(url, headers={'User-Agent': 'EcoBackFilterSourceCheck/1.0 (+https://getecoback.com/)', 'Accept': 'application/json'})
        opener = urllib.request.build_opener(NoRedirect)
        with opener.open(request, timeout=timeout) as response:
            if response.status != 200 or response.geturl() != url:
                raise ValueError('Unexpected source response')
            body = response.read(MAX_BYTES + 1)
            if len(body) > MAX_BYTES:
                raise ValueError('Source response too large')
            return json.loads(body)
    finally:
        if timer_supported:
            signal.setitimer(signal.ITIMER_REAL, 0)
            signal.signal(signal.SIGALRM, previous)


def refresh_document(document, fetcher=fetch_payload, today=None, pause=0.2, clock=time.monotonic, sleeper=time.sleep):
    validate_document(document)
    output = copy.deepcopy(document)
    today = today or datetime.now(timezone.utc).date().isoformat()
    started = clock()
    for index, item in enumerate(output['items']):
        remaining = TOTAL_TIMEOUT - (clock() - started)
        item['last_attempt_at'] = today
        if remaining <= 0:
            status, reason = 'unavailable', 'total_deadline_exceeded'
        else:
            try:
                payload = fetcher(item['source_product_json'], timeout=min(REQUEST_TIMEOUT, remaining))
                status, reason = evaluate_payload(item, payload)
            except urllib.error.HTTPError as error:
                status, reason = 'unavailable', ('rate_limited' if error.code == 429 else 'source_http_error')
            except (OSError, TimeoutError, ValueError, urllib.error.URLError):
                status, reason = 'unavailable', 'source_fetch_failed'
        item['status'], item['verification_reason'] = status, reason
        if status == 'verified':
            item['checked_at'] = today
            item['last_good_checked_at'] = today
        # Failure preserves checked_at/last_good and the last approved facts.
        # Consumers MUST gate purchase links on status == verified.
        if index < len(output['items']) - 1 and pause and clock() - started + pause < TOTAL_TIMEOUT:
            sleeper(pause)
    # This is the manually reviewed catalog-facts revision, not a live status
    # timestamp. Builds restart from versioned approved facts and do not retain
    # a cross-run outage history; only the check-specific dates advance here.
    return output


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--data', type=Path, default=DATA)
    args = parser.parse_args()
    # Invalid local structure is a build error, not a network degradation.
    document = json.loads(args.data.read_text())
    result = refresh_document(document)
    args.data.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    counts = {state: sum(i['status'] == state for i in result['items']) for state in ('verified', 'conflict', 'unavailable')}
    print(json.dumps({'records': len(result['items']), 'status_counts': counts, 'content_updated': result['updated']}))


if __name__ == '__main__':
    main()
