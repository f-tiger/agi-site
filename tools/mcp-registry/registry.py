#!/usr/bin/env python3
"""Validate, publish and read back MCP Registry records using public synthetic probes."""
import argparse
import datetime as dt
import json
import pathlib
import re
import subprocess
import time
import urllib.error
import urllib.parse
import urllib.request

REGISTRY = 'https://registry.modelcontextprotocol.io/v0.1/servers/'
SCHEMA = 'https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json'
UA = 'agi-site-mcp-registration/1.0 (metadata-only)'
BPJ_AI_NAME = 'io.github.f-tiger/bpj-ai-tools'
BPJ_AI_ENDPOINT = 'https://baipiaoji.com/api/ai-mcp'


def request_json(url, payload=None, missing_ok=False):
    headers = {'User-Agent': UA, 'Accept': 'application/json, text/event-stream', 'X-Probe': 'fleet-mcp-registration'}
    body = None if payload is None else json.dumps(payload).encode()
    if body is not None:
        headers['Content-Type'] = 'application/json'
    for attempt in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, data=body, headers=headers), timeout=30) as response:
                text = response.read().decode()
                if text.lstrip().startswith('data:') or 'event: message' in text:
                    objects = [json.loads(line[5:].strip()) for line in text.splitlines() if line.startswith('data:')]
                    return next(item for item in objects if 'result' in item or 'error' in item)
                return json.loads(text)
        except urllib.error.HTTPError as error:
            if error.code == 404 and missing_ok:
                return None
            if error.code not in (429, 500, 502, 503, 504) or attempt == 2:
                raise
        except (TimeoutError, urllib.error.URLError):
            if attempt == 2:
                raise
        time.sleep(2 ** attempt)


def receipt_url(manifest):
    return REGISTRY + urllib.parse.quote(manifest['name'], safe='') + '/versions/' + urllib.parse.quote(manifest['version'], safe='')


def verify_receipt(manifest, receipt):
    if not receipt:
        raise ValueError('exact version is not registered')
    actual = receipt.get('server', {})
    for key in ('name', 'version', 'description'):
        if actual.get(key) != manifest.get(key):
            raise ValueError('Registry mismatch: ' + key)
    expected_remote = {(item['type'], item['url']) for item in manifest.get('remotes', [])}
    actual_remote = {(item['type'], item['url']) for item in actual.get('remotes', [])}
    if expected_remote != actual_remote:
        raise ValueError('Registry remote endpoints differ')
    expected_packages = {(item['registryType'], item['identifier'], item.get('fileSha256'), item['transport']['type']) for item in manifest.get('packages', [])}
    actual_packages = {(item['registryType'], item['identifier'], item.get('fileSha256'), item['transport']['type']) for item in actual.get('packages', [])}
    if expected_packages != actual_packages:
        raise ValueError('Registry package identities or SHA256 differ')
    status = receipt.get('_meta', {}).get('io.modelcontextprotocol.registry/official', {}).get('status')
    if status != 'active':
        raise ValueError('Registry status is not active: ' + str(status))


def requires_bpj_quote_probe(manifest):
    if manifest['name'] != BPJ_AI_NAME:
        return False
    base, separator, _ = manifest['version'].split('+', 1)[0].partition('-')
    if not re.fullmatch(r'\d+\.\d+\.\d+', base):
        raise ValueError('Invalid BPJ AI Tools version')
    version = tuple(map(int, base.split('.')))
    return version > (0, 5, 2) or (version == (0, 5, 2) and not separator)


def verify_bpj_quote(url, require_cost_gate=False):
    common = {
        'incoterm': 'CIF', 'costCurrency': 'CNY', 'quoteCurrency': 'USD',
        'quotePerCostUnit': 0.14, 'quantity': 500, 'unitProductCost': 36,
        'commissionPercent': 5, 'paymentFeePercent': 2.5, 'targetMarginPercent': 20,
        'quotedUnitPrice': 8.4,
    }
    fees = [
        {'name': 'Packaging', 'amount': 350, 'currency': 'CNY'},
        {'name': 'Pre-carriage', 'amount': 650, 'currency': 'CNY'},
        {'name': 'Freight', 'amount': 250, 'currency': 'USD', 'kind': 'freight'},
        {'name': 'Insurance', 'amount': 30, 'currency': 'USD', 'kind': 'insurance'},
    ]
    cases = [
        ('costs_entered', fees, [], 8.12),
        ('provisional', fees[:2], ['freight', 'insurance'], 7.34),
    ]
    for call_id, (status, charges, missing, floor) in enumerate(cases, start=3):
        response = request_json(url + '?__probe=1', {
            'jsonrpc': '2.0', 'id': call_id, 'method': 'tools/call',
            'params': {'name': 'bpj_trade_export_quote',
                       'arguments': {**common, 'sellerFees': json.dumps(charges)}},
        })
        result = response.get('result') if isinstance(response, dict) else None
        output = result.get('structuredContent') if isinstance(result, dict) else None
        if (not isinstance(output, dict) or response.get('jsonrpc') != '2.0' or response.get('id') != call_id or
                'error' in response or result.get('isError') or output.get('incoterm') != 'CIF' or
                output.get('quoteCurrency') != 'USD' or output.get('minimumUnitPrice') != floor or
                output.get('costCompleteness') != {'status': status, 'missing': missing}):
            raise ValueError('Live BPJ synthetic CIF contract mismatch: ' + status)
        if require_cost_gate:
            quoted = output.get('quotedOrder')
            expected = True if status == 'costs_entered' else None
            if not isinstance(quoted, dict) or 'meetsTarget' not in quoted or quoted['meetsTarget'] is not expected:
                raise ValueError('Live BPJ synthetic CIF target guard mismatch: ' + status)
    print('Live BPJ synthetic CIF verified: confirmed USD 8.12 and provisional missing freight and insurance')


def verify_remote(manifest):
    """Check public metadata and the scoped BPJ synthetic CIF cases."""
    remotes = manifest.get('remotes', [])
    quote_probe = requires_bpj_quote_probe(manifest)
    if quote_probe and [remote['url'] for remote in remotes] != [BPJ_AI_ENDPOINT]:
        raise ValueError('BPJ quote preflight requires the canonical free MCP endpoint')
    for remote in remotes:
        init = request_json(remote['url'], {'jsonrpc': '2.0', 'id': 1, 'method': 'initialize', 'params': {'protocolVersion': '2025-06-18', 'capabilities': {}, 'clientInfo': {'name': 'fleet-registration-metadata', 'version': '1.0'}}})
        info = init.get('result', {}).get('serverInfo', {})
        if info.get('version') != manifest['version']:
            raise ValueError('Live version does not match manifest: ' + str(info))
        result = request_json(remote['url'], {'jsonrpc': '2.0', 'id': 2, 'method': 'tools/list', 'params': {}})
        tools = result.get('result', {}).get('tools')
        if not isinstance(tools, list) or not tools:
            raise ValueError('Live tools/list did not return tools')
        print('Live metadata verified:', manifest['name'], len(tools), 'tools')
        if quote_probe:
            verify_bpj_quote(remote['url'])


def manifests(directories):
    files = [path for directory in directories for path in sorted(pathlib.Path(directory).glob('*.json'))]
    if not files:
        raise ValueError('No manifests selected')
    items = [(path, json.loads(path.read_text())) for path in files]
    names = [item['name'] for _, item in items]
    if len(names) != len(set(names)):
        raise ValueError('Duplicate registry names')
    return items


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('mode', choices=['validate', 'live', 'publish', 'verify'])
    parser.add_argument('--manifest-dir', nargs='+', default=['tools/mcp-registry/manifests'])
    parser.add_argument('--publisher', default='mcp-publisher')
    parser.add_argument('--receipt', default='/tmp/fleet-mcp-registry-receipts.json')
    args = parser.parse_args()
    items = manifests(args.manifest_dir)
    if args.mode == 'validate':
        import jsonschema
        schema = request_json(SCHEMA)
        for path, manifest in items:
            jsonschema.validate(manifest, schema)
            if not manifest['name'].startswith('io.github.f-tiger/'):
                raise ValueError('Unexpected publisher namespace')
            if len(manifest['description']) > 100:
                raise ValueError('Description exceeds registry limit')
            print('Valid:', path, manifest['name'], manifest['version'])
        return
    receipts, failed = [], []
    for path, manifest in items:
        row = {'name': manifest['name'], 'version': manifest['version'], 'url': receipt_url(manifest)}
        try:
            if args.mode in ('live', 'publish'):
                verify_remote(manifest)
            if args.mode in ('publish', 'verify'):
                receipt = request_json(row['url'], missing_ok=True)
                if receipt is None and args.mode == 'publish':
                    try:
                        subprocess.run([args.publisher, 'publish', str(path.resolve())], check=True, timeout=120)
                    except (subprocess.CalledProcessError, subprocess.TimeoutExpired):
                        # The registry may have committed despite a lost CLI response.
                        receipt = request_json(row['url'], missing_ok=True)
                        verify_receipt(manifest, receipt)
                    for attempt in range(4):
                        receipt = request_json(row['url'], missing_ok=True)
                        if receipt:
                            break
                        time.sleep(2 ** attempt)
                    row['action'] = 'published'
                else:
                    row['action'] = 'verified_existing'
                verify_receipt(manifest, receipt)
                row['registry'] = receipt
            row['ok'] = True
        except Exception as error:
            row.update(ok=False, error=str(error))
            failed.append(manifest['name'])
        receipts.append(row)
        pathlib.Path(args.receipt).write_text(json.dumps({'checked_at': dt.datetime.now(dt.timezone.utc).isoformat(), 'servers': receipts}, ensure_ascii=False, indent=2))
        print(json.dumps({key: value for key, value in row.items() if key != 'registry'}, ensure_ascii=False))
    if failed:
        raise SystemExit('Unverified servers: ' + ', '.join(failed))


if __name__ == '__main__':
    main()
