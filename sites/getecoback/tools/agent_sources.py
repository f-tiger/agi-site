"""Same exact citation policy as the edge converter; never fetch a destination."""
import json
import re
from pathlib import Path
from urllib.parse import urlsplit

POLICY = json.loads((Path(__file__).resolve().parents[1] / 'data/agent-source-policy.json').read_text())

def citation_url(href, rel=''):
    if not isinstance(href, str) or re.search(r'''[\s\\<>"'()]''', href) or 'sponsored' in rel.lower():
        return None
    try:
        if not re.match(r'^https://[^/?#:@]+/', href):
            return None
        url = urlsplit(href)
        if url.scheme != 'https' or url.username or url.password or url.port:
            return None
        exact = href in POLICY['reference_urls']
        if url.query and (not exact or url.geturl() != href or url.fragment):
            return None
        # A PDF page fragment identifies a page in the same reviewed document,
        # not a new destination. Preserve only this bounded fragment syntax;
        # other anchors/queries do not inherit the exact-URL allowlist entry.
        pdf_page = (url.path.lower().endswith('.pdf')
                    and re.fullmatch(r'page=[1-9][0-9]{0,3}', url.fragment)
                    and href.split('#', 1)[0] in POLICY['reference_urls'])
        if not any(url.path.startswith(prefix) for prefix in POLICY['hosts'].get(url.hostname, [])) and not (exact or pdf_page):
            return None
        # The Registry expects its reviewed namespace and server in one path segment.
        registry_entry = (exact and url.hostname == 'registry.modelcontextprotocol.io'
                          and re.fullmatch(r'/v0\.1/servers/io\.github\.f-tiger%2F[a-z0-9-]+/versions/latest', url.path))
        if not registry_entry and re.search(r'%(?:00|0a|0d|2f|3a|40|5c)', url.path, re.I):
            return None
        return href
    except (ValueError, TypeError):
        return None
