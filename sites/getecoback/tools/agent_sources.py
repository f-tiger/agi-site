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
        if url.scheme != 'https' or url.username or url.password or url.port or url.query:
            return None
        if not any(url.path.startswith(prefix) for prefix in POLICY['hosts'].get(url.hostname, [])) and href not in POLICY['reference_urls']:
            return None
        if re.search(r'%(?:00|0a|0d|2f|3a|40|5c)', url.path, re.I):
            return None
        return href
    except (ValueError, TypeError):
        return None
