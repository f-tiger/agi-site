#!/usr/bin/env python3
"""Mark the two documented EcoBack aliases deprecated and verify exact receipts."""

import argparse
import json
from pathlib import Path
import subprocess
import time
import urllib.parse
import urllib.request


ROOT = Path(__file__).resolve().parents[1]
REGISTRY = 'https://registry.modelcontextprotocol.io/v0.1/servers/'
OFFICIAL = 'io.modelcontextprotocol.registry/official'
NOTICE = 'Use io.github.f-tiger/hvac-btu-heat-klimaanlage at https://getecoback.com/mcp/v1. This legacy URL remains compatible.'
ALIASES = ('getecoback-climate-weather.json', 'getecoback-raumklima.json')


def status(manifest):
    encoded = urllib.parse.quote(manifest['name'], safe='')
    version = urllib.parse.quote(manifest['version'], safe='')
    with urllib.request.urlopen(f'{REGISTRY}{encoded}/versions/{version}', timeout=15) as response:
        info = json.load(response)
    official = info['_meta'][OFFICIAL]
    server = info['server']
    if (server['name'] != manifest['name'] or server['version'] != manifest['version']
            or server['remotes'] != manifest['remotes']):
        raise ValueError('Registry identity or endpoint differs from the alias manifest')
    return official['status']


def deprecate(manifest, publisher):
    existing = status(manifest)
    if existing == 'active':
        subprocess.run([publisher, 'status', '--status', 'deprecated', '--message', NOTICE,
                        manifest['name'], manifest['version']], check=True, timeout=60)
    elif existing != 'deprecated':
        raise ValueError(f'Unexpected status {existing} for {manifest["name"]}')
    for attempt in range(5):
        if status(manifest) == 'deprecated':
            print(f'{manifest["name"]} {manifest["version"]}: verified deprecated')
            return
        time.sleep(attempt + 1)
    raise ValueError(f'Could not verify deprecation of {manifest["name"]}')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--publisher', default='mcp-publisher')
    args = parser.parse_args()
    for file in ALIASES:
        manifest = json.loads((ROOT / 'mcp' / 'superseded' / file).read_text())
        deprecate(manifest, args.publisher)


if __name__ == '__main__':
    main()
