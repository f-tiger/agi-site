"""Google official Admin/Data API reader. Only read scopes and aggregate reports.

No Measurement Protocol, account writes, custom-dimension writes or uploads.
Credentials are used only by google-auth; never persisted with report output.
"""
import datetime as dt
import json
import os
import re
from zoneinfo import ZoneInfo

from collect import utc

SCOPE = 'https://www.googleapis.com/auth/analytics.readonly'
ADMIN = 'https://analyticsadmin.googleapis.com/v1beta/'
DATA = 'https://analyticsdata.googleapis.com/v1beta/'
METRICS = ['activeUsers', 'sessions', 'screenPageViews', 'engagedSessions']
PAGE_SIZE = 10000
MAX_ROWS = 100000


class ReadFailure(Exception):
    """Only sanitized, fixed messages may leave the API boundary."""


class GoogleReader:
    def __init__(self):
        try:
            import google.auth
            from google.auth.transport.requests import AuthorizedSession
            from google.oauth2 import service_account
        except ImportError:
            raise ReadFailure('google_auth_dependency_missing') from None
        try:
            raw = os.environ.get('GA4_SERVICE_ACCOUNT_JSON')
            if raw:
                credentials = service_account.Credentials.from_service_account_info(json.loads(raw), scopes=[SCOPE])
            else:
                credentials, _ = google.auth.default(scopes=[SCOPE])
            self.session = AuthorizedSession(credentials, max_refresh_attempts=0)
        except Exception:
            raise ReadFailure('google_readonly_credentials_missing_or_invalid') from None

    def request(self, api, path, body=None, params=None):
        allowed = (api == ADMIN and (path == 'accountSummaries' or re.fullmatch(r'properties/\d+(?:/dataStreams)?', path))) or (
            api == DATA and re.fullmatch(r'properties/\d+:runReport', path))
        if not allowed or (api == ADMIN and body is not None):
            raise ReadFailure('non_readonly_api_rejected')
        try:
            response = self.session.request('POST' if body is not None else 'GET', api + path,
                json=body, params=params, timeout=35, allow_redirects=False)
        except Exception:
            raise ReadFailure('google_auth_or_transport_failed') from None
        if not 200 <= response.status_code < 300:
            try:
                status = response.json().get('error', {}).get('status', '')
            except (ValueError, AttributeError):
                status = ''
            status = status if re.fullmatch(r'[A-Z_]{1,60}', str(status)) else 'ERROR'
            raise ReadFailure(f'google_http_{response.status_code}_{status}')
        try:
            result = response.json()
            if not isinstance(result, dict) or result.get('error'):
                raise ValueError()
            return result
        except ValueError:
            raise ReadFailure('google_invalid_json_response') from None

    def listing(self, path, field):
        result, token, seen = [], None, set()
        for _ in range(100):
            params = {'pageSize': 200}
            if token:
                params['pageToken'] = token
            page = self.request(ADMIN, path, params=params)
            result.extend(page.get(field, []))
            token = page.get('nextPageToken')
            if not token:
                return result
            if token in seen:
                break
            seen.add(token)
        raise ReadFailure('google_listing_pagination_incomplete')

    def report(self, property_id, body):
        rows, metadata, expected_count, headers = [], [], None, None
        for offset in range(0, MAX_ROWS, PAGE_SIZE):
            page = self.request(DATA, f'properties/{property_id}:runReport',
                {**body, 'offset': str(offset), 'limit': str(PAGE_SIZE), 'returnPropertyQuota': True})
            count = int(page.get('rowCount', 0))
            schema = ([d['name'] for d in page.get('dimensionHeaders', [])], [m['name'] for m in page.get('metricHeaders', [])])
            if expected_count is not None and (count != expected_count or schema != headers):
                raise ReadFailure('google_report_changed_during_pagination')
            expected_count, headers = count, schema
            metadata.append({'metadata': page.get('metadata', {}), 'propertyQuota': page.get('propertyQuota', {})})
            restrictions = page.get('metadata', {}).get('schemaRestrictionResponse', {}).get('activeMetricRestrictions', [])
            blocked = {r.get('metricName') for r in restrictions}
            values = page.get('rows', [])
            for row in values:
                dimensions = row.get('dimensionValues', [])
                metrics = row.get('metricValues', [])
                if len(dimensions) != len(schema[0]) or len(metrics) != len(schema[1]):
                    raise ReadFailure('google_invalid_row_schema')
                result = {k: v['value'] for k, v in zip(schema[0], dimensions)}
                for key, value in zip(schema[1], metrics):
                    text = value.get('value')
                    if text is None or not re.fullmatch(r'\d+', text):
                        raise ReadFailure('google_noninteger_count_metric')
                    result[key] = None if key in blocked else int(text)
                rows.append(result)
            if len(rows) == count:
                return {'status': 'success', 'rows': rows, 'row_count': count, 'pages': metadata, 'fetched_at': utc()}
            if not values or len(rows) > count:
                break
        raise ReadFailure('google_report_truncated')


def windows(now, timezone):
    today = now.astimezone(ZoneInfo(timezone)).date()
    date = lambda days: str(today - dt.timedelta(days=days))
    return {'timezone': timezone, 'today_partial': date(0), 'yesterday': date(1), 'previous_day': date(2),
            'last7': {'startDate': date(7), 'endDate': date(1), 'name': 'last7'},
            'previous7': {'startDate': date(14), 'endDate': date(8), 'name': 'previous7'},
            'daily': {'startDate': date(14), 'endDate': date(0)},
            'processing_note': 'Ended calendar days may still be processing; no settlement assumption.'}


def report_body(dates, dimensions, metrics, dimension_filter=None):
    body = {'dateRanges': dates, 'dimensions': [{'name': n} for n in dimensions],
            'metrics': [{'name': n} for n in metrics], 'keepEmptyRows': False,
            'orderBys': [{'dimension': {'dimensionName': n}} for n in dimensions]}
    if dimension_filter:
        body['dimensionFilter'] = dimension_filter
    return body


def path_filter(host, prefix):
    return {'andGroup': {'expressions': [
        {'filter': {'fieldName': 'hostName', 'stringFilter': {'matchType': 'EXACT', 'value': host, 'caseSensitive': True}}},
        {'filter': {'fieldName': 'pagePath', 'stringFilter': {'matchType': 'BEGINS_WITH', 'value': prefix, 'caseSensitive': True}}}
    ]}}


def query_set(reader, property_id, dates, dimension_filter=None):
    requests = {
        'daily': report_body([dates['daily']], ['date', 'hostName'], METRICS, dimension_filter),
        # Weekly active users are requested at the whole-window grain, never a sum of daily users.
        'weekly': report_body([dates['previous7'], dates['last7']], ['hostName'], METRICS, dimension_filter),
        'events': report_body([dates['daily']], ['date', 'hostName', 'eventName'], ['eventCount'], dimension_filter),
    }
    result = {}
    for name, body in requests.items():
        try:
            result[name] = reader.report(property_id, body)
        except ReadFailure as error:
            result[name] = {'status': 'failure', 'error': str(error), 'rows': [], 'fetched_at': utc()}
    return result


def collect_ga4(manifest, reader=None, now=None):
    now = now or dt.datetime.now(dt.timezone.utc)
    result = {'provider': 'google_official_admin_and_data_api', 'read_started_utc': utc(now.timestamp()),
              'source_generated_at': None, 'cache_age_seconds': None,
              'freshness_note': 'Direct API response; Google does not supply a report-generation timestamp or freshness guarantee.',
              'properties': {}, 'discovery': {}, 'sites': [], 'observed_unmapped': []}
    try:
        reader = reader or GoogleReader()
    except ReadFailure as error:
        result['discovery'] = {'status': 'failure', 'error': str(error)}
        for p in manifest['ga4_properties']:
            result['properties'][p['property_id']] = {**p, 'status': 'failure', 'error': str(error)}
        result['sites'] = site_rows(manifest, result['properties'])
        result['read_finished_utc'] = utc()
        return result
    try:
        accounts = reader.listing('accountSummaries', 'accountSummaries')
        discovered = [p for a in accounts for p in a.get('propertySummaries', [])]
        result['discovery'] = {'status': 'success', 'properties': discovered, 'fetched_at': utc()}
    except ReadFailure as error:
        result['discovery'] = {'status': 'failure', 'error': str(error)}
    # Explicit fleet property catalogue bounds access. Unmapped accessible properties are
    # recorded by discovery but never queried merely because the credential can read them.
    for p in manifest['ga4_properties']:
        pid = p['property_id']
        current = {**p, 'status': 'failure'}
        result['properties'][pid] = current
        try:
            detail = reader.request(ADMIN, f'properties/{pid}')
            dates = windows(now, detail['timeZone'])
            current.update(timezone=detail['timeZone'], dates=dates, property_fetched_at=utc(), currency=detail.get('currencyCode'))
            try:
                streams = reader.listing(f'properties/{pid}/dataStreams', 'dataStreams')
                current['streams'] = {'status': 'success', 'web': [s.get('webStreamData') for s in streams if s.get('webStreamData')]}
            except ReadFailure as error:
                current['streams'] = {'status': 'failure', 'error': str(error)}
            current['reports'] = query_set(reader, pid, dates)
            current['path_reports'] = {}
            for site in manifest['sites']:
                if site['ga4']['property_id'] == pid and site.get('path_prefix'):
                    current['path_reports'][site['id']] = query_set(reader, pid, dates, path_filter(site['hostname'], site['path_prefix']))
            reports = list(current['reports'].values()) + [r for group in current['path_reports'].values() for r in group.values()]
            current['status'] = 'success' if all(r['status'] == 'success' for r in reports) else 'partial'
        except (KeyError, ValueError):
            current['error'] = 'property_timezone_missing_or_invalid'
        except ReadFailure as error:
            current['error'] = str(error)
    result['sites'] = site_rows(manifest, result['properties'])
    known = {(s['ga4']['property_id'], s['hostname']) for s in manifest['sites'] + manifest.get('aliases', [])}
    for pid, prop in result['properties'].items():
        hosts = {r['hostName'] for report in prop.get('reports', {}).values() for r in report.get('rows', [])}
        for host in sorted(hosts):
            if (pid, host) not in known:
                result['observed_unmapped'].append({'property_id': pid, 'hostname': host, 'status': 'observed_unmapped',
                    'reports': scope_reports(prop['reports'], host)})
    result['read_finished_utc'] = utc()
    return result


def scope_reports(reports, host):
    result = {}
    for key, value in reports.items():
        rows = [r for r in value.get('rows', []) if r['hostName'] == host]
        result[key] = {**value, 'rows': rows, 'row_count': len(rows), 'upstream_row_count': value.get('row_count')}
    return result


def site_rows(manifest, properties):
    result = []
    for site in manifest['sites'] + manifest.get('aliases', []):
        pid = site['ga4']['property_id']
        row = {'id': site.get('id', site.get('site_id')), 'hostname': site['hostname'], 'property_id': pid,
               'kind': site.get('site_kind', site.get('kind')), 'path_prefix': site.get('path_prefix'), 'status': 'unmapped'}
        prop = properties.get(pid)
        if prop:
            row.update(status=prop['status'], timezone=prop.get('timezone'), dates=prop.get('dates'), error=prop.get('error'))
            reports = prop.get('path_reports', {}).get(site.get('id'), {}) if site.get('path_prefix') else prop.get('reports', {})
            row['reports'] = scope_reports(reports, site['hostname'])
            row['backend_rows_observed'] = any(r.get('rows') for r in row['reports'].values())
            if prop['status'] == 'success' and not row['backend_rows_observed']:
                row['status'] = 'no_rows_returned'
        result.append(row)
    return result


def comparison(current, previous):
    if current is None or previous is None:
        return {'difference': None, 'percent': None, 'note': 'unknown'}
    if previous == 0:
        return {'difference': current, 'percent': None, 'note': 'new' if current else 'zero_base'}
    return {'difference': current - previous, 'percent': round((current - previous) / previous * 100, 2)}
