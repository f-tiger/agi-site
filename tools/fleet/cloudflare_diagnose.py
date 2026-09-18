#!/usr/bin/env python3
"""Read-only growth audit. Fixed SELECTs; no deployment, raw rows, or token output.

Run locally/Actions with existing CF secrets. Output is an aggregate artifact,
not a public dashboard. SQL windows exclude today's incomplete UTC day.
"""
import datetime as dt
import json
import os
from pathlib import Path
import re
import urllib.error
import urllib.request
from html.parser import HTMLParser

from ai_referrals import SITES, ENDPOINTS

ROOT = Path(__file__).resolve().parents[2]
NOW = dt.datetime.now(dt.timezone.utc)
TODAY = NOW.date()
API = 'https://api.cloudflare.com/client/v4'
ZONES = ('agiscorecard.com', 'baipiaoji.com', 'getecoback.com', 'thedollscout.com')
TOKENS = []
for key in ('CLOUDFLARE_API_TOKEN_ZONE', 'CLOUDFLARE_API_TOKEN', 'CF_API_TOKEN'):
    value = os.environ.get(key, '').strip()
    if value and value not in [v for _, v in TOKENS]:
        TOKENS.append((key, value))


def safe_error(body):
    errors = body.get('errors') or []
    text = '; '.join(str(e.get('message', e.get('code', 'error'))) for e in errors if isinstance(e, dict))
    for _, token in TOKENS:
        text = text.replace(token, '[redacted]')
    return re.sub(r'\b[a-f0-9]{32,}\b', '[id]', text)[:350] or 'unavailable'


def request(url, token=None, body=None):
    headers = {'Accept': 'application/json', 'User-Agent': 'fleet-growth-audit/1.0'}
    if token:
        assert url.startswith(API + '/'), 'Credentials must remain at Cloudflare API'
        headers['Authorization'] = 'Bearer ' + token
    data = None
    if body is not None:
        data = json.dumps(body).encode()
        headers['Content-Type'] = 'application/json'
    req = urllib.request.Request(url, data=data, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            return json.load(response)
    except urllib.error.HTTPError as exc:
        try:
            error = json.load(exc)
            return {'success': False, 'errors': [{'message': f'HTTP {exc.code}: {safe_error(error)}'}]}
        except (ValueError, TypeError):
            return {'success': False, 'errors': [{'message': f'HTTP {exc.code}'}]}
    except (OSError, ValueError):
        return {'success': False, 'errors': [{'message': 'network_or_json_error'}]}


def route(value):
    # No arbitrary query, contact data, search terms or event labels exported.
    value = str(value or '').split('?')[0].split('#')[0]
    if re.fullmatch(r'/[a-zA-Z0-9_./-]{0,160}', value) and not value.startswith('/__'):
        return value
    return '[other]'


def safe_paths(rows):
    result = {}
    for row in rows or []:
        key = route(row.get('path'))
        result[key] = result.get(key, 0) + int(row.get('n', row.get('h', 0)) or 0)
    return [{'path': k, 'n': v} for k, v in sorted(result.items(), key=lambda x: -x[1])[:100]]


def public_reads():
    result = {}
    for site, url in ENDPOINTS.items():
        body = request(url)
        if body.get('ok') is not True:
            result[site] = {'status': 'unavailable', 'reason': safe_error(body)}
            continue
        if site == 'baipiaoji':
            snapshots = {}
            for days in (7, 14, 28, 56):
                b = body if days == 28 else request(url.replace('days=28', f'days={days}'))
                snapshots[str(days)] = {k: b.get(k) for k in ('ok', 'generated', 'since', 'until', 'window_days', 'humans_referred', 'events', 'countries')}
                snapshots[str(days)]['paths'] = safe_paths(b.get('paths'))
                # Public host-only aggregates; no arbitrary URLs or search labels.
                snapshots[str(days)]['referrers'] = [r for r in b.get('referrers', []) if re.fullmatch(r'[a-z0-9.-]{1,100}', r.get('ref', ''))]
            result[site] = {'status': 'ok', 'basis': 'referred_js_pageviews', 'partial_today_included': True, 'snapshots': snapshots}
        else:
            result[site] = {k: body.get(k) for k in ('ok', 'days', 'human_pv', 'ai_ref', 'generated')}
            result[site]['status'] = 'ok'
            result[site]['basis'] = 'js_pageviews' if site == 'thedollscout' else 'server_pageviews_ua_filtered'
            if site == 'getecoback':
                result[site]['basis'] = 'server_pageviews_human_or_legacy'
    b = request('https://agiscorecard.com/api/trends')
    # Searches intentionally not persisted; source schema differs, keep route counts only.
    result['agi_trends'] = {'status': 'ok' if b.get('ok') else 'unavailable',
                            'rising_pages': safe_paths(b.get('risingPages'))}
    return result


def edge_reads(accounts):
    result = {}
    for domain in ZONES:
        attempts = []
        for key, token in TOKENS:
            zones = request(API + '/zones?name=' + domain, token)
            matched = [z for z in zones.get('result', []) if z.get('name') == domain]
            if not matched:
                attempts.append({'credential': key, 'stage': 'zone', 'reason': safe_error(zones)})
                continue
            zone = matched[0]
            account = zone.get('account', {}).get('id')
            if account:
                accounts.add(account)
            for days in (56, 28, 7):
                query = '''query Audit($zone: String!, $since: Date!, $until: Date!) {
                  viewer { zones(filter: {zoneTag: $zone}) {
                    httpRequests1dGroups(limit: 60, filter: {date_geq: $since, date_leq: $until}, orderBy: [date_ASC]) {
                      dimensions { date }
                      sum { requests pageViews cachedRequests responseStatusMap { edgeResponseStatus requests } }
                    }
                  } }
                }'''
                variables = {'zone': zone['id'], 'since': str(TODAY - dt.timedelta(days=days)), 'until': str(TODAY - dt.timedelta(days=1))}
                b = request(API + '/graphql', token, {'query': query, 'variables': variables})
                groups = (b.get('data') or {}).get('viewer', {}).get('zones', [])
                if b.get('errors') or not groups:
                    attempts.append({'credential': key, 'days': days, 'reason': safe_error(b)})
                    continue
                result[domain] = {'status': 'ok', 'credential': key, 'requested_days': days,
                                  'basis': 'edge_requests_not_people', 'subdomains_included': True,
                                  'days': groups[0].get('httpRequests1dGroups', []), 'attempts': attempts}
                detail = '''query Detail($zone: String!, $since: DateTime!, $until: DateTime!) {
                  viewer { zones(filter: {zoneTag: $zone}) {
                    httpRequestsAdaptiveGroups(limit: 40, filter: {datetime_geq: $since, datetime_lt: $until, requestSource: "eyeball"}, orderBy: [count_DESC]) {
                      count dimensions { clientRequestHTTPHost clientRequestPath edgeResponseStatus }
                    }
                  } }
                }'''
                detail_body = request(API + '/graphql', token, {'query': detail, 'variables': {
                    'zone': zone['id'], 'since': str(TODAY - dt.timedelta(days=1)) + 'T00:00:00Z',
                    'until': str(TODAY) + 'T00:00:00Z'}})
                groups2 = (detail_body.get('data') or {}).get('viewer', {}).get('zones', [])
                result[domain]['top_requests_yesterday'] = [
                    {'host': x['dimensions']['clientRequestHTTPHost'], 'path': route(x['dimensions']['clientRequestPath']),
                     'status': x['dimensions']['edgeResponseStatus'], 'n': x['count']}
                    for x in (groups2[0].get('httpRequestsAdaptiveGroups', []) if groups2 else [])
                    if x['dimensions']['clientRequestHTTPHost'] == domain or x['dimensions']['clientRequestHTTPHost'].endswith('.' + domain)]
                result[domain]['detail_note'] = safe_error(detail_body) if detail_body.get('errors') else 'Adaptive sampled estimates; top 40 only, not exhaustive.'
                break
            if domain in result:
                break
        result.setdefault(domain, {'status': 'unavailable', 'attempts': attempts})
    return result


def sql_for(site):
    name, _, table, ref, _, agg = site
    day = 'd' if table == 'hits' else 'day'
    event = 'ev' if table == 'hits' else 'name'
    path = 'page' if name == 'getecoback' else 'path'
    ua = "'not_collected'" if table == 'hits' else "COALESCE(ua_class,'legacy')"
    ev = "'page_view'" if table == 'pageviews' else event
    start = str(TODAY - dt.timedelta(days=56))
    if name == 'thedollscout':
        start = max(start, '2026-08-30')
    # All SQL is fixed from the checked-in schema map. No user-provided SQL.
    return (f"SELECT {day} AS day, {ev} AS event, {ua} AS ua_class, "
            f"CASE WHEN COALESCE({ref},'')='' THEN 'direct_or_unknown' "
            f"WHEN {ref} LIKE '%google.%' OR {ref} LIKE '%bing.%' OR {ref} LIKE '%baidu.%' THEN 'search' "
            f"WHEN {ref} LIKE '%chatgpt%' OR {ref} LIKE '%perplexity%' OR {ref} LIKE '%claude.ai%' THEN 'ai' "
            f"WHEN {ref} LIKE '%agiscorecard.com' OR {ref} LIKE '%baipiaoji.com' OR {ref} LIKE '%getecoback.com' "
            f"OR {ref} LIKE '%thedollscout.com' THEN 'fleet_or_internal' ELSE 'other_referral' END AS channel, "
            f"{agg} AS n FROM {table} WHERE {day} >= '{start}' AND {day} < '{TODAY}' "
            f"AND {path} NOT GLOB '/__*' GROUP BY 1,2,3,4 ORDER BY 1,2,3,4")


def d1_reads(accounts):
    result = {}
    credentials = [(key, token, account) for key, token in TOKENS for account in sorted(accounts)]
    for site in SITES:
        name, dbid = site[:2]
        attempts = []
        for key, token, account in credentials:
            body = request(f'{API}/accounts/{account}/d1/database/{dbid}/query', token, {'sql': sql_for(site)})
            if body.get('success') and body.get('result'):
                chunks = body['result']
                if all(c.get('success', True) for c in chunks):
                    result[name] = {'status': 'ok', 'credential': key, 'days': [r for c in chunks for r in c.get('results', [])],
                                    'rows_read': sum(c.get('meta', {}).get('rows_read', 0) for c in chunks)}
                    break
            attempts.append({'credential': key, 'reason': safe_error(body)})
        result.setdefault(name, {'status': 'unavailable', 'attempts': attempts, 'reason': 'No usable D1 read credential/account combination'})
    return result


def routing_probes():
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, req, fp, code, msg, headers, newurl):
            return None
    class Canonical(HTMLParser):
        value = None
        def handle_starttag(self, tag, attrs):
            a = dict(attrs)
            if tag == 'link' and a.get('rel') == 'canonical':
                self.value = a.get('href')
    result = []
    for path in ('/en/tools/grok.html', '/en/tools/grok', '/tools/kimi.html', '/tools/kimi', '/stack-builder.html', '/stack-builder'):
        url = 'https://baipiaoji.com' + path + '?__probe=1'
        req = urllib.request.Request(url, headers={'User-Agent': 'curl/8 fleet-growth-routing-probe'})
        try:
            with urllib.request.build_opener(NoRedirect()).open(req, timeout=15) as response:
                parser = Canonical()
                parser.feed(response.read(300000).decode('utf-8', errors='replace'))
                result.append({'path': path, 'status': response.status, 'canonical': parser.value})
        except urllib.error.HTTPError as exc:
            result.append({'path': path, 'status': exc.code, 'location': exc.headers.get('Location', '').split('?')[0]})
        except OSError:
            result.append({'path': path, 'status': 'network_error'})
    return result


def main():
    accounts = {os.environ.get('CLOUDFLARE_ACCOUNT_ID', '').strip()} - {''}
    result = {'generated': NOW.isoformat(), 'source_commit': os.environ.get('GITHUB_SHA'),
              'sql_window': {'since': str(TODAY - dt.timedelta(days=56)), 'until_exclusive': str(TODAY)},
              'note': 'Events and views are not unique visitors; no cross-site total. Public snapshots include partial today. Missing access is not zero.'}
    result['edge'] = edge_reads(accounts)
    result['d1'] = d1_reads(accounts)
    result['public'] = public_reads()
    result['routing_probes'] = routing_probes()
    out = ROOT / 'artifacts' / 'growth-diagnosis.json'
    out.parent.mkdir(exist_ok=True)
    out.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    for group in ('edge', 'd1', 'public'):
        print(group + ': ' + ', '.join(f'{name}={data.get("status", "partial")}' for name, data in result[group].items()))


if __name__ == '__main__':
    main()
