"""Read the canonical ECO listing from the official MCP Registry."""
import argparse
import json
from pathlib import Path
import time
from urllib.error import HTTPError
from urllib.parse import quote
from urllib.request import Request, urlopen


OFFICIAL = 'io.modelcontextprotocol.registry/official'


def read_latest(url):
    request = Request(url, headers={'Accept': 'application/json', 'User-Agent': 'getecoback-ci'})
    try:
        with urlopen(request, timeout=15) as response:
            return json.load(response)
    except HTTPError as error:
        # A proxy error page alone does not confirm removal from the registry.
        if error.code == 404:
            body = json.load(error)
            if isinstance(body, dict) and body.get('status') == 404:
                return None
        raise


def latest_url(name):
    return 'https://registry.modelcontextprotocol.io/v0.1/servers/' + quote(name, safe='') + '/versions/latest'


def listing_issue(manifest, listing, release):
    if listing is None:
        return 'canonical listing not found'
    server = listing['server']
    official = listing['_meta'][OFFICIAL]
    if server['name'] != manifest['name'] or official['status'] != 'active' or official['isLatest'] is not True:
        return 'identity or active/latest metadata does not match'
    if server['remotes'] != manifest['remotes']:
        return 'canonical remote does not match'
    if release and server['version'] != manifest['version']:
        return 'latest version is ' + server['version'] + ', expected ' + manifest['version']
    return None


def already_published(manifest, read=read_latest):
    """Only a positive exact readback makes a publication run redundant."""
    try:
        listing = read(latest_url(manifest['name']))
        return listing_issue(manifest, listing, release=True) is None
    except (OSError, ValueError, KeyError, TypeError):
        return False


def check(manifest, release, read=read_latest, pause=time.sleep):
    name = manifest['name']
    url = latest_url(name)
    confirmed_issue = None
    for attempt in range(3):
        try:
            listing = read(url)
            issue = listing_issue(manifest, listing, release)
            if issue is None:
                print('OK registry listing present:', name, listing['server']['version'], url)
                return True
            confirmed_issue = issue
        except (OSError, ValueError, KeyError, TypeError) as error:
            issue = 'registry unavailable or returned an unrecognized response: ' + str(error)
        if attempt < 2:
            pause(5 * (attempt + 1))
    warn = confirmed_issue is None and not release
    print(('::warning::' if warn else '::error::') + name + ': ' + (confirmed_issue or issue))
    return warn


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument('--release', action='store_true', help='Require positive confirmation of this release version.')
    mode.add_argument('--already-published', action='store_true', help='Require one exact positive readback before skipping publication.')
    args = parser.parse_args()
    manifest = json.loads((Path(__file__).resolve().parents[1] / 'mcp/server.json').read_text())
    if args.already_published:
        raise SystemExit(0 if already_published(manifest) else 1)
    raise SystemExit(0 if check(manifest, args.release) else 1)
