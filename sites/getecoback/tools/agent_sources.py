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
        exact = href in POLICY['reference_urls']
        # A PDF page fragment identifies a page in the same reviewed document,
        # not a new destination. Preserve only this bounded fragment syntax;
        # other anchors/queries do not inherit the exact-URL allowlist entry.
        pdf_page = (url.path.lower().endswith('.pdf')
                    and re.fullmatch(r'page=[1-9][0-9]{0,3}', url.fragment)
                    and href.split('#', 1)[0] in POLICY['reference_urls'])
        if not any(url.path.startswith(prefix) for prefix in POLICY['hosts'].get(url.hostname, [])) and not (exact or pdf_page):
            return None
        if re.search(r'%(?:00|0a|0d|2f|3a|40|5c)', url.path, re.I):
            return None
        return href
    except (ValueError, TypeError):
        return None
