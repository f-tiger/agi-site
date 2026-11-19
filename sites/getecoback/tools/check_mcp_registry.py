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


def check(manifest, release, read=read_latest, pause=time.sleep):
    name = manifest['name']
    url = 'https://registry.modelcontextprotocol.io/v0.1/servers/' + quote(name, safe='') + '/versions/latest'
    confirmed_issue = None
    for attempt in range(3):
        try:
            listing = read(url)
            if listing is None:
                issue = 'canonical listing not found'
            else:
                server = listing['server']
                official = listing['_meta'][OFFICIAL]
                if server['name'] != name or official['status'] != 'active' or official['isLatest'] is not True:
                    issue = 'identity or active/latest metadata does not match'
                elif server['remotes'] != manifest['remotes']:
                    issue = 'canonical remote does not match'
                elif release and server['version'] != manifest['version']:
                    issue = 'latest version is ' + server['version'] + ', expected ' + manifest['version']
                else:
                    print('OK registry listing present:', name, server['version'], url)
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
    parser.add_argument('--release', action='store_true', help='Require positive confirmation of this release version.')
    args = parser.parse_args()
    manifest = json.loads((Path(__file__).resolve().parents[1] / 'mcp/server.json').read_text())
    raise SystemExit(0 if check(manifest, args.release) else 1)
