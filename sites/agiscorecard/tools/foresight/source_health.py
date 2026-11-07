"""Report cached publisher availability separately from release correctness."""
import json
import os
import re
from pathlib import Path


def source_health(discovery, companies):
    unavailable = []
    for snapshot, company in [(discovery, False), (companies, True)]:
        if not isinstance(snapshot, dict) or not isinstance(snapshot.get('sources'), list) or not snapshot['sources'] or not isinstance(snapshot.get('items'), list) or not isinstance(snapshot.get('checkedAt'), str):
            raise ValueError('Invalid source-health snapshot')
        for source in snapshot['sources']:
            if not isinstance(source, dict) or not isinstance(source.get('id'), str) or not re.fullmatch(r'[A-Za-z0-9_-]+', source['id']):
                raise ValueError('Invalid source-health record')
            state = source.get('ok') if company else source.get('status')
            if (company and not isinstance(state, bool)) or (not company and state not in ['ok', 'error']):
                raise ValueError('Invalid source-health status')
            if state != (True if company else 'ok'):
                unavailable.append(('company:' if company else '') + source['id'])
    return {'status': 'degraded' if unavailable else 'healthy', 'unavailable': unavailable}


def main():
    root = Path(__file__).resolve().parents[2]
    result = source_health(json.loads((root/'foresight-assets/discovery.json').read_text()), json.loads((root/'futures-assets/snapshot.json').read_text()))
    # IDs originate in the fixed source registry; escape workflow-command syntax.
    safe_ids = ', '.join(result['unavailable']).replace('%', '%25').replace('\r', '%0D').replace('\n', '%0A')
    message = 'Publisher source health: ' + result['status'] + '. '
    if safe_ids:
        message += 'Unavailable: ' + safe_ids + '. Last verified content retained; freshness is not renewed for failed sources.'
        print('::warning::' + message)
    else:
        print(message)
    if os.environ.get('GITHUB_STEP_SUMMARY'):
        with open(os.environ['GITHUB_STEP_SUMMARY'], 'a') as output:
            output.write(message + '\n')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
