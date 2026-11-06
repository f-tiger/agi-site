#!/usr/bin/env python3
"""Market-choice gate (historical filename retained by the release workflow).

Existing model destinations must not change on load or click. Country and
accessory tasks own their scope. Isolated tests exercise both market choices.
"""
import re
import sys
import unittest
from pathlib import Path

import build_structure as B
from test_market_choice import MarketChoice

SITE = Path(__file__).resolve().parents[1] / 'site'


def main():
    bad, pages, choices = [], 0, 0
    for path in SITE.rglob('*.html'):
        source = path.read_text()
        pages += 1
        rel = str(path.relative_to(SITE))
        if '<!--EB_USSWITCH-->' in source or 'data-eb-ussw' in source or 'window.__ebUsSwap' in source:
            bad.append(f'{rel}: obsolete automatic marketplace rewrite/swap remains')
        if not B.us_market_allowed(path.stem, source):
            for marker in ['USMARKET', 'USTOP', 'USSHELF']:
                if '<!--EB_' + marker + '-->' in source:
                    bad.append(f'{rel}: US {marker} bypasses this country/accessory task')
            if 'data-eb-popup-market="us"' in source:
                bad.append(f'{rel}: US popup bypasses this country/accessory task')
        for block in re.findall(r'<!--EB_(?:USMARKET|USTOP)-->(.*?)<!--/EB_(?:USMARKET|USTOP)-->', source, re.S):
            if re.search(r'America/|timeZone|/api/geo|localStorage|\.href\s*=', block):
                bad.append(f'{rel}: market UI infers, persists or silently rewrites the market')
        if '<!--EB_USMARKET-->' in source:
            if 'id="eb-market-us-fallback"' not in source or '<details' not in source:
                bad.append(f'{rel}: missing no-JS US alternatives')
            if 'Amazon.de (' not in source or 'Amazon.com (' not in source:
                bad.append(f'{rel}: shopping marketplaces are not explicitly named')
        if '<!--EB_USTOP-->' in source:
            choices += 1
            if source.count('id="eb-market-choice"') != 1:
                bad.append(f'{rel}: recommendations need exactly one explicit market choice')
            if '<option value="de" selected>' not in source or '<option value="us">' not in source:
                bad.append(f'{rel}: initially retain Germany and offer US explicitly')
    if not pages or not choices:
        bad.append('expected generated pages and explicit US recommendation choices')
    result = unittest.TextTestRunner(verbosity=1).run(unittest.defaultTestLoader.loadTestsFromTestCase(MarketChoice))
    print(f'check_usswitch: {pages} pages; {choices} explicit recommendation choices; no automatic market routing')
    if bad:
        print('\n'.join('FAIL ' + item for item in bad[:30]))
    return int(bool(bad) or not result.wasSuccessful())


if __name__ == '__main__':
    sys.exit(main())
