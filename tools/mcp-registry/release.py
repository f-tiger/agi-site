#!/usr/bin/env python3
"""Upload missing MCPB assets, verifying immutable bytes on idempotent retries."""
import argparse
import hashlib
import json
import pathlib
import subprocess
import tempfile
import urllib.error
import urllib.request


def gh(*args):
    return subprocess.check_output(['gh', *args], text=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--directory', required=True)
    parser.add_argument('--tag', required=True)
    parser.add_argument('--repository', required=True)
    parser.add_argument('--target', required=True)
    args = parser.parse_args()
    directory = pathlib.Path(args.directory)
    assets = sorted((directory / 'artifacts').glob('*.mcpb'))
    if len(assets) != 3:
        raise SystemExit('Expected exactly three validated local MCP bundles')
    endpoint = f'https://api.github.com/repos/{args.repository}/releases/tags/{args.tag}'
    try:
        with urllib.request.urlopen(urllib.request.Request(endpoint, headers={'User-Agent': 'agi-site-mcp-registration/1.0'}), timeout=30) as response:
            release = json.load(response)
    except urllib.error.HTTPError as error:
        if error.code != 404:
            raise
        with tempfile.NamedTemporaryFile(mode='w', suffix='.md') as notes:
            notes.write('Installable local MCP bundles for FilingLens, TradeCheck and EcoBack. These are local stdio tools; publication and registry listing do not establish customer adoption. Each official Registry record pins the downloaded asset SHA256.\n')
            notes.flush()
            gh('release', 'create', args.tag, '--repo', args.repository, '--target', args.target, '--title', 'Fleet local MCP packages — 2026-10-10', '--notes-file', notes.name, '--prerelease')
        release = json.loads(gh('api', f'repos/{args.repository}/releases/tags/{args.tag}'))
    existing = {asset['name']: asset for asset in release['assets']}
    for asset in assets:
        expected = hashlib.sha256(asset.read_bytes()).hexdigest()
        if asset.name not in existing:
            gh('release', 'upload', args.tag, str(asset), '--repo', args.repository)
        with tempfile.TemporaryDirectory() as temporary:
            gh('release', 'download', args.tag, '--repo', args.repository, '--pattern', asset.name, '--dir', temporary)
            actual = hashlib.sha256((pathlib.Path(temporary) / asset.name).read_bytes()).hexdigest()
        if actual != expected:
            raise SystemExit('Existing release bytes differ; refusing to replace ' + asset.name)
        print('Public artifact SHA256 verified:', asset.name, expected)


if __name__ == '__main__':
    main()
