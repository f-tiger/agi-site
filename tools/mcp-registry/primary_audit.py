#!/usr/bin/env python3
"""Read-only primary fleet registry and protocol checks for the existing heartbeat."""

import argparse
import concurrent.futures
import json
from pathlib import Path
import urllib.error
import urllib.parse
import urllib.request

from registry import BPJ_AI_NAME, verify_bpj_quote


INVENTORY = Path(__file__).with_name('primary-inventory.json')
ROOT = INVENTORY.resolve().parents[2]
REGISTRY = 'https://registry.modelcontextprotocol.io/v0.1/servers/'
OFFICIAL = 'io.modelcontextprotocol.registry/official'
NAMESPACE = 'io.modelcontextprotocol/'
MODERN = '2026-07-28'
LEGACY = ('2025-11-25', '2025-06-18', '2025-03-26')
CLIENT = {'name': 'fleet-qa-mcp-audit', 'version': '1.0.0'}


def load_inventory(root=ROOT, path=INVENTORY):
    sites = json.loads(path.read_text())['sites']
    names, urls = set(), set()
    for site, entry in sites.items():
        evidence = entry['license'].get('evidence')
        if not (root / entry['source']).is_dir() or (evidence and not (root / evidence).is_file()):
            raise ValueError(f'{site}: source or license evidence missing')
        if not entry['license']['scope'] or not entry['attribution'] or not entry['servers']:
            raise ValueError(f'{site}: incomplete release inventory')
        for server in entry['servers'] + entry.get('legacy_aliases', []):
            url = urllib.parse.urlsplit(server['url'])
            if url.scheme != 'https' or url.hostname != f'{site}.com' or url.query or url.fragment:
                raise ValueError(f'{site}: invalid inventory endpoint')
            if server['name'] in names or server['url'] in urls:
                raise ValueError(f'{site}: duplicate Registry id or endpoint')
            names.add(server['name'])
            urls.add(server['url'])
    return sites


def request(url, body=None, headers=None, expected_status=200):
    request_headers = {
        'User-Agent': CLIENT['name'] + '/' + CLIENT['version'],
        'Accept': 'application/json, text/event-stream',
        'DNT': '1',
        'X-Probe': CLIENT['name'],
        **(headers or {}),
    }
    data = None
    if body is not None:
        request_headers['Content-Type'] = 'application/json'
        data = json.dumps(body).encode()
    req = urllib.request.Request(url, data=data, headers=request_headers)
    try:
        response = urllib.request.urlopen(req, timeout=12)
    except urllib.error.HTTPError as error:
        if error.code != expected_status:
            raise
        response = error
    with response as stream:
        if stream.status != expected_status:
            raise ValueError(f'expected HTTP {expected_status}, got {stream.status}')
        if stream.headers.get_content_type() == 'text/event-stream':
            for line in stream:
                if line.startswith(b'data:'):
                    packet = json.loads(line[5:])
                    if 'result' in packet or 'error' in packet:
                        return packet, stream.headers
            raise ValueError('SSE response ended before its result')
        payload = stream.read()
        return json.loads(payload) if payload else None, stream.headers


def rpc(method, ident, params):
    return {'jsonrpc': '2.0', 'id': ident, 'method': method, 'params': params}


def result(packet, ident):
    if (not isinstance(packet, dict) or packet.get('jsonrpc') != '2.0'
            or type(packet.get('id')) is not type(ident) or packet['id'] != ident
            or 'error' in packet or not isinstance(packet.get('result'), dict)):
        raise ValueError('missing JSON-RPC result or mismatched request id')
    return packet['result']


def legacy_metadata(url):
    params = {'protocolVersion': LEGACY[0], 'capabilities': {}, 'clientInfo': CLIENT}
    packet, reply_headers = request(url, rpc('initialize', 1, params))
    init = result(packet, 1)
    version = init.get('protocolVersion')
    if version not in LEGACY:
        raise ValueError(f'unsupported legacy negotiation result {version!r}')
    headers = {'MCP-Protocol-Version': version}
    if reply_headers.get('Mcp-Session-Id'):
        headers['Mcp-Session-Id'] = reply_headers['Mcp-Session-Id']
    notification = {'jsonrpc': '2.0', 'method': 'notifications/initialized'}
    reply, _ = request(url, notification, headers, expected_status=202)
    if reply is not None:
        raise ValueError('initialization notification must return an empty body')
    packet, _ = request(url, rpc('tools/list', 2, {}), headers)
    if not result(packet, 2).get('tools'):
        raise ValueError('legacy tools/list was empty')
    return init['serverInfo']['version'], version


def modern_metadata(url, runtime):
    meta = {NAMESPACE + 'protocolVersion': MODERN, NAMESPACE + 'clientCapabilities': {},
            NAMESPACE + 'clientInfo': CLIENT}
    params = {'_meta': meta}
    headers = {'MCP-Protocol-Version': MODERN}
    for method in ('server/discover', 'tools/list'):
        packet, _ = request(url, rpc(method, method, params), {**headers, 'Mcp-Method': method})
        data = result(packet, method)
        if data.get('resultType') != 'complete':
            raise ValueError(f'{method} did not return a modern complete result')
        server_info = data.get('_meta', {}).get(NAMESPACE + 'serverInfo', {})
        if method == 'server/discover' and server_info.get('version') != runtime:
            raise ValueError('modern server version differs from legacy version')
        if method == 'tools/list' and (not data.get('tools') or type(data.get('ttlMs')) is not int
                                       or data['ttlMs'] < 0 or data.get('cacheScope') not in ('private', 'public')):
            raise ValueError('modern tools/list missing tools or cache policy')
    packet, _ = request(url, rpc('tools/list', 3, params), {**headers, 'Mcp-Method': 'resources/list'},
                        expected_status=400)
    if (not isinstance(packet, dict) or packet.get('id') != 3
            or packet.get('error', {}).get('code') != -32020):
        raise ValueError('modern routing header mismatch did not return -32020')


def registry_record(entry):
    name = urllib.parse.quote(entry['name'], safe='')
    row, _ = request(REGISTRY + name + '/versions/latest')
    official = row['_meta'][OFFICIAL]
    server = row['server']
    remote = {'type': 'streamable-http', 'url': entry['url']}
    if server['name'] != entry['name'] or not any(
            all(item.get(key) == value for key, value in remote.items()) for item in server.get('remotes', [])):
        raise ValueError('Registry identity or endpoint drift')
    if not official.get('isLatest'):
        raise ValueError('Registry latest receipt is not marked as latest')
    return server['version'], official['status']


def audit_server(entry, legacy_alias=False):
    registered, status = registry_record(entry)
    runtime, legacy = legacy_metadata(entry['url'])
    if legacy_alias:
        return f'legacy alias, Registry {registered} ({status}); live {runtime}, {legacy}'
    if status != 'active' or registered != runtime:
        raise ValueError(f'Registry {registered} ({status}) differs from live {runtime}')
    modern_metadata(entry['url'], runtime)
    if entry['name'] == BPJ_AI_NAME:
        verify_bpj_quote(entry['url'], require_cost_gate=True)
    return f'version {runtime}, Registry active, tested {legacy} and {MODERN}'


def observe(entry, alias, strict=False):
    name = entry['name']
    try:
        message = audit_server(entry, alias)
        print(f'{name}: {message}', flush=True)
        return True
    except urllib.error.HTTPError as error:
        transient = error.code in (429, 500, 502, 503, 504)
        print(f'::{"warning" if transient and not strict else "error"}::{name}: HTTP {error.code}', flush=True)
        return transient and not strict
    except (urllib.error.URLError, TimeoutError):
        print(f'::{"error" if strict else "warning"}::{name}: endpoint or Registry unavailable', flush=True)
        return not strict
    except (KeyError, TypeError, ValueError) as error:
        print(f'::error::{name}: {error}', flush=True)
        return False


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--validate-only', action='store_true')
    parser.add_argument('--strict', action='store_true', help='fail on unavailable endpoints as well as drift')
    parser.add_argument('--site', help='select one primary site')
    args = parser.parse_args()
    sites = load_inventory()
    if args.site and args.site not in sites:
        parser.error('unknown inventory site')
    entries = [sites[args.site]] if args.site else sites.values()
    servers = [(server, False) for site in entries for server in site['servers']]
    print(f'{len(servers)} canonical primary MCP endpoints in inventory', flush=True)
    if args.validate_only:
        return 0
    # Known aliases are tracked visibly while existing clients migrate. They do not gate canonical health.
    aliases = [(server, True) for site in entries for server in site.get('legacy_aliases', [])]
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
        results = list(pool.map(lambda row: observe(*row, strict=args.strict), servers + aliases))
    return 0 if all(results[:len(servers)]) else 1


if __name__ == '__main__':
    raise SystemExit(main())
