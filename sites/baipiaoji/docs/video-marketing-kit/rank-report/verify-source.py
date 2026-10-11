#!/usr/bin/env python3
"""Public source ownership chain check; uses inherited proxy and CA trust.

Run explicitly when a fresh public-network check is wanted. No credentials,
account login, analytics, publication, or mutation of the source site.
"""
import argparse
import datetime
import hashlib
import html
import json
import pathlib
import re
import urllib.request

APP = 'https://apps.apple.com/cn/app/id6451407032'
DEVELOPER = 'https://novelquickapp.com/hongguo'
HOME = 'https://hongguoduanju.com/'

def fetch(url):
    redirects = []
    class Recorder(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, req, fp, code, msg, headers, newurl):
            redirects.append({'url':req.full_url, 'status':code, 'location':newurl})
            return super().redirect_request(req, fp, code, msg, headers, newurl)
    with urllib.request.build_opener(Recorder).open(urllib.request.Request(url, headers={'User-Agent':'Mozilla/5.0'}), timeout=40) as r:
        data = r.read()
        return data.decode('utf-8','replace'), {'requestedUrl':url, 'finalUrl':r.url, 'status':r.status, 'redirects':redirects, 'responseSha256':hashlib.sha256(data).hexdigest(), 'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat()}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=pathlib.Path, required=True,
                        help='Write a fresh receipt to this path; preserve the archived receipt separately.')
    args = parser.parse_args()
    app, a = fetch(APP)
    _, b = fetch(DEVELOPER)
    home, c = fetch(HOME)
    developer_links = []
    for match in re.finditer(r'<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)</a>', app):
        label = html.unescape(re.sub('<[^>]+>','',match.group(2))).strip()
        if '开发者网站' in label:
            developer_links.append({'label':label, 'href':html.unescape(match.group(1))})
    facts = {
        'appStoreDeveloperLinks':developer_links,
        'appStoreProviderMatches': '北京笔墨留香科技有限公司' in app,
        'developerRedirectReachesRankingDomain': b['finalUrl'] == HOME,
        'rankingDomainHomeCompanyMatches': '北京笔墨留香科技有限公司' in home,
        'displayedIcp': sorted(set(re.findall(r'京ICP备[0-9]+号-?[0-9]*', home))),
    }
    checks = [any(link['href']==DEVELOPER for link in developer_links), facts['appStoreProviderMatches'], facts['developerRedirectReachesRankingDomain'], facts['rankingDomainHomeCompanyMatches']]
    result = {
        'status':'ownership_chain_verified' if all(checks) else 'inconclusive',
        'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'receipts':[a,b,c], 'facts':facts,
        'conclusion':('The current App Store product listing links to the developer website, whose HTTP redirects reach hongguoduanju.com; provider and destination company names agree. This supports describing the ranking source as the Hongguo official website.' if all(checks) else 'The current source ownership chain could not be fully verified. Inspect the failed checks; do not infer official provenance from this receipt.'),
        'limitations':['This is current cross-link verification, not an independent corporate or MIIT registration audit.','Website provenance does not certify numeric heat accuracy, permission to redistribute artwork, BPJ partnership, full historical consistency, or playback rights.','Historical page hash records cannot themselves prove source ownership at the time of capture.'],
    }
    output = args.output
    output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'path':str(output),'status':result['status'],'facts':facts},ensure_ascii=False))
    if not all(checks):
        raise SystemExit(1)

if __name__ == '__main__':
    main()
