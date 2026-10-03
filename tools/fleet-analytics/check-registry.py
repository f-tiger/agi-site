#!/usr/bin/env python3
"""Reject deployment workflows that omit the fleet measurement release contract."""
import json,re
from pathlib import Path
root=Path(__file__).resolve().parents[2]
cfg=json.loads((root/'tools/fleet-analytics/registry.json').read_text())
site_keys={Path(c['root']).parts[1]:k for k,c in cfg.items()}
seen=set();hosts=set()
for key,c in cfg.items():
 for host in c['hosts']:
  assert host not in hosts, f'Duplicate hostname: {host}'
  hosts.add(host)
 assert re.fullmatch(r'G-[A-Z0-9]+',c['id']),key
for file in (root/'.github/workflows').glob('deploy-*.yml'):
 text=file.read_text()
 if not re.search(r'wrangler-action|pages deploy',text):continue
 sites=set(re.findall(r'sites/([a-z0-9-]+)(?:/|\n|\s)',text))
 # A workflow can import shared libraries from another site. Its filename
 # identifies its publishing owner; publication must use a registered owner.
 owner=file.stem.removeprefix('deploy-')
 if not sites:continue
 assert owner in site_keys, f'Unregistered deployment: {file.name}'
 key=site_keys[owner];seen.add(key)
 assert f'coverage.py --site {key}' in text, f'Missing final coverage: {owner}'
 assert f'verify-live.mjs {key}' in text, f'Missing live verification: {owner}'
 assert 'tools/fleet-analytics/**' in text, f'Missing shared trigger: {owner}'
 assert 'deploy-main-guard.sh check' in text, f'Missing freshness check: {owner}'
 assert 'cancel-in-progress: true' not in text, f'Non-serial production release: {owner}'
assert seen==set(cfg),f'Unverified registered releases: {set(cfg)-seen}'
print(f'GA4 release contract: {len(seen)} deployments, {len(hosts)} explicit hostnames')
