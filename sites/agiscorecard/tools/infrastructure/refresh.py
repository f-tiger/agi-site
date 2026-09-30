#!/usr/bin/env python3
"""Fetch sequentially with fair access; failures preserve dated last-good entries."""
import json,sys,time,urllib.request,hashlib
from pathlib import Path
from datetime import datetime,timezone
from data import COMPANIES,extract

ROOT=Path(__file__).resolve().parents[2]
DEST=ROOT/'infrastructure-assets/snapshot.json'
def main():
 old=json.loads(DEST.read_text()) if DEST.exists() else {'companies':[]}
 previous={x['ticker']:x for x in old['companies']}
 stamp=datetime.now(timezone.utc).isoformat(timespec='seconds').replace('+00:00','Z')
 companies=[];failures=[]
 for c in COMPANIES:
  try:
   req=urllib.request.Request(f'https://data.sec.gov/api/xbrl/companyfacts/CIK{c[1]:010d}.json',headers={'User-Agent':'AGIScorecard research https://agiscorecard.com/about','Accept':'application/json'})
   with urllib.request.urlopen(req,timeout=35) as r:raw=json.load(r)
   row=extract(raw,c,stamp)
   if not any(f and 'val' in f for f in row['facts'].values()):raise ValueError('no usable annual facts')
   companies.append(row);print(c[0]+': refreshed',flush=True)
  except Exception as e:
   failures.append(c[0]);print(c[0]+': unavailable; retain original check date',flush=True)
   if c[0] in previous:companies.append({**previous[c[0]],'refresh_failed':True})
  time.sleep(.25)
 if len(companies)!=len(COMPANIES):raise SystemExit('Incomplete first snapshot; no output published')
 payload={'version':1,'attempted_at':stamp,'failed':failures,'companies':companies}
 payload['id']=hashlib.sha256(json.dumps(companies,sort_keys=True).encode()).hexdigest()[:20]
 DEST.parent.mkdir(exist_ok=True);DEST.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n')
 print(f'{len(companies)} companies; {len(failures)} refresh failures; snapshot {payload["id"]}')
 if len(failures)==len(COMPANIES):print('::warning::All SEC fetches failed; serving dated cached facts')
if __name__=='__main__':main()
