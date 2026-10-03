"""Fixed-entry, same-window paper basket; no trading or model calls."""
import concurrent.futures, datetime as dt, hashlib, json, math, urllib.request
from pathlib import Path
from zoneinfo import ZoneInfo
ROOT=Path(__file__).resolve().parents[2]
MANIFEST=ROOT/'portfolio-assets/manifest.json'
OUT=ROOT/'portfolio-assets/snapshot.json'
NY=ZoneInfo('America/New_York')

def digest(x):
    return hashlib.sha256(json.dumps(x,sort_keys=True,separators=(',',':')).encode()).hexdigest()

def parse_chart(j, ticker, now):
    r=j['chart']['result'][0]; m=r['meta']
    if m.get('symbol')!=ticker or m.get('currency')!='USD': raise ValueError('identity_or_currency')
    if m.get('instrumentType') not in ('EQUITY','ETF'): raise ValueError('instrument_type')
    if ticker=='SPCX' and not any(x in (m.get('longName','')+' '+m.get('shortName','')).lower() for x in ('spacex','space exploration')): raise ValueError('spcx_identity')
    values=r['indicators']['adjclose'][0]['adjclose']; timestamps=r['timestamp']
    if len(values)!=len(timestamps): raise ValueError('ragged_series')
    points={}
    for stamp,v in zip(timestamps,values):
        session=dt.datetime.fromtimestamp(stamp,NY).date()
        # Conservative 16:30 NY gate also excludes incomplete regular-session bars.
        if now.astimezone(NY)<dt.datetime.combine(session,dt.time(16,30),NY): continue
        if v is None: continue
        if not isinstance(v,(int,float)) or not math.isfinite(v) or v<=0: raise ValueError('invalid_price')
        day=session.isoformat()
        if day in points: raise ValueError('duplicate_session')
        points[day]=v
    if not points: raise ValueError('no_completed_prices')
    return points

def fetch(ticker,entry,now):
    start=int(dt.datetime.fromisoformat(entry).replace(tzinfo=NY).timestamp())
    url=f'https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?period1={start}&period2={int(now.timestamp())}&interval=1d&events=div%2Csplits'
    request=urllib.request.Request(url,headers={'User-Agent':'AGIScorecard-PortfolioResearch/1.0'})
    with urllib.request.urlopen(request,timeout=25) as r: j=json.load(r)
    return parse_chart(j,ticker,now)

def calculate(manifest,prices):
    tickers=[x['ticker'] for x in manifest['stocks']+manifest['benchmarks']]
    entry=manifest['entry_session']
    if any(entry not in prices.get(t,{}) for t in tickers): raise ValueError('missing_entry')
    # Do not silently skip a hole: SPY defines observed sessions; every symbol must cover them.
    dates=sorted(d for d in prices['SPY'] if d>=entry)
    if any(d not in prices[t] for t in tickers for d in dates): raise ValueError('incomplete_shared_window')
    if any(max(prices[t])!=dates[-1] for t in tickers): raise ValueError('unequal_latest_dates')
    series={t:[prices[t][d]/prices[t][entry]*100 for d in dates] for t in tickers}
    series['basket']=[sum(series[x['ticker']][i] for x in manifest['stocks'])/len(manifest['stocks']) for i in range(len(dates))]
    metrics={}
    for key,arr in series.items():
        peak=arr[0]; drawdown=0
        for v in arr: peak=max(peak,v); drawdown=min(drawdown,(v/peak-1)*100)
        metrics[key]={'return_pct':round(arr[-1]-100,6),'max_drawdown_pct':round(drawdown,6),'excess_spy_pp':round(arr[-1]-series['SPY'][-1],6)}
    return {'entry_adjusted_close':{t:prices[t][entry] for t in tickers},'dates':dates,'series':{t:[round(v,8) for v in arr] for t,arr in series.items()},'metrics':metrics,'as_of':dates[-1]}

def refresh(manifest,previous,now,fetcher=fetch):
    h=digest(manifest)
    if previous and previous['manifest_sha256']!=h: raise ValueError('Registered rules changed: use a new cohort, never overwrite this one.')
    out=dict(previous or {'version':1,'cohort':manifest['id'],'manifest_sha256':h,'dates':[],'series':{},'metrics':{},'as_of':None,'revisions':[]})
    out['attempted_at']=now.isoformat();out['errors']=[]
    out['provider']='Yahoo Finance adjusted daily closes';out['registered_date']=manifest['registered_date'];out['entry_session']=manifest['entry_session']
    if now.astimezone(NY)<dt.datetime.combine(dt.date.fromisoformat(manifest['entry_session']),dt.time(16,30),NY):
        out['status']='awaiting_entry';return out
    prices={}
    def one(t): return t,fetcher(t,manifest['entry_session'],now)
    tickers=[x['ticker'] for x in manifest['stocks']+manifest['benchmarks']]
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        futures={pool.submit(one,t):t for t in tickers}
        for f in concurrent.futures.as_completed(futures):
            try: t,p=f.result();prices[t]=p
            except Exception: out['errors'].append(futures[f])
    out['errors'].sort()
    try:
        if out['errors']: raise ValueError('provider_unavailable')
        calculated=calculate(manifest,prices)
        if (now.astimezone(NY).date()-dt.date.fromisoformat(calculated['as_of'])).days>4: raise ValueError('stale_prices')
        if previous and previous.get('as_of') and calculated['as_of']<previous['as_of']: raise ValueError('would_roll_back')
        changed=[]
        for i,d in enumerate(out['dates']):
            if d not in calculated['dates']: raise ValueError('lost_history')
            j=calculated['dates'].index(d)
            for k,arr in out['series'].items():
                if abs(arr[i]-calculated['series'][k][j])>0.00001: changed.append({'date':d,'series':k,'old':arr[i],'new':calculated['series'][k][j]})
        if changed: out['revisions']=out['revisions']+[{'at':now.isoformat(),'reason':'Vendor historical adjustment; not a strategy change','changes':changed}]
        out.update(calculated);out['status']='tracking';out['last_success_at']=now.isoformat()
    except ValueError as e:
        out['status']='stale' if out.get('as_of') else 'data_unavailable'
        out['failure_reason']=str(e)
        return out
    out.pop('failure_reason',None)
    return out

if __name__=='__main__':
    manifest=json.loads(MANIFEST.read_text());previous=json.loads(OUT.read_text()) if OUT.exists() else None
    out=refresh(manifest,previous,dt.datetime.now(dt.timezone.utc))
    OUT.write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
    print('Portfolio:',out['status'],'as_of:',out['as_of'],'unavailable:',','.join(out['errors']))
