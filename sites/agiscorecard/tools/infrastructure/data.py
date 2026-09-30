"""Conservative SEC annual facts. Never sum quarters or substitute a missing tag."""
from datetime import date

COMPANIES = [
 ('NVDA',1045810,'NVIDIA','compute'),('AMD',2488,'AMD','compute'),
 ('AVGO',1730168,'Broadcom','compute'),('MRVL',1835632,'Marvell','compute'),
 ('MU',723125,'Micron','memory'),('INTC',50863,'Intel','memory'),
 ('DELL',1571996,'Dell','systems'),('SMCI',1375365,'Supermicro','systems'),
 ('HPE',1645590,'HPE','systems'),('ANET',1596532,'Arista Networks','systems'),
 ('VRT',1674101,'Vertiv','power'),('ETN',1551182,'Eaton','power'),
 ('MSFT',789019,'Microsoft','cloud'),('AMZN',1018724,'Amazon','cloud'),
 ('GOOGL',1652044,'Alphabet','cloud'),('META',1326801,'Meta','cloud'),
 ('ORCL',1341439,'Oracle','cloud'),('EQIX',1101239,'Equinix','facilities'),
 ('DLR',1297996,'Digital Realty','facilities'),('SNPS',883241,'Synopsys','compute')]

TAGS = {
 'revenue':['RevenueFromContractWithCustomerExcludingAssessedTax','Revenues','SalesRevenueNet'],
 'income':['NetIncomeLoss'],
 'ocf':['NetCashProvidedByUsedInOperatingActivities'],
 'capex':['PaymentsToAcquirePropertyPlantAndEquipment'],
 'inventory':['InventoryNet']}

def days(a,b): return (date.fromisoformat(b)-date.fromisoformat(a)).days

def valid_fact(r,cutoff,instant=False):
 try:
  return (r.get('form') in ('10-K','10-K/A') and r['filed']<=cutoff and
   r['end']<=r['filed'] and isinstance(r['val'],(int,float)) and
   abs(r['val'])<=9_007_199_254_740_991 and
   (not r.get('start') if instant else 330<=days(r['start'],r['end'])<=400))
 except (KeyError,ValueError,TypeError): return False

def select(rows,cutoff,instant=False):
 eligible=[r for r in rows if valid_fact(r,cutoff,instant)]
 if not eligible:return None
 end=max(r['end'] for r in eligible)
 latest=[r for r in eligible if r['end']==end]
 filed=max(r['filed'] for r in latest)
 last=[r for r in latest if r['filed']==filed]
 # Conflicting same-day facts or different duration contexts are ambiguous.
 if len({(r.get('start'),r['val']) for r in last})!=1:return {'error':'conflicting_facts','end':end}
 r=sorted(last,key=lambda r:r['accn'])[-1]
 same=[x for x in latest if x.get('start')==r.get('start')]
 original=min(x['filed'] for x in same)
 orig={x['val'] for x in same if x['filed']==original}
 out={k:r[k] for k in ('end','filed','val','accn','form')}
 out.update(start=r.get('start'),original_filed=original,revised=len(orig)==1 and next(iter(orig))!=r['val'])
 prior=[x for x in eligible if x['end']<end and 330<=days(x['end'],end)<=400 and
        (instant or abs(days(x['start'],x['end'])-days(r['start'],end))<=7)]
 if prior:
  previous=select(prior,cutoff,instant)
  if previous and 'error' not in previous:
   out['previous']={k:previous[k] for k in ('start','end','val','filed','accn')}
   out['yoy']=(r['val']/previous['val']-1)*100 if previous['val']>0 else None
 return out

def extract(raw,company,checked_at):
 ticker,cik,name,layer=company
 if int(raw['cik'])!=cik:raise ValueError('CIK mismatch')
 facts={};cutoff=checked_at[:10]
 for metric,tags in TAGS.items():
  choices=[]
  for tag in tags:
   f=select(raw.get('facts',{}).get('us-gaap',{}).get(tag,{}).get('units',{}).get('USD',[]),cutoff,metric=='inventory')
   if f:choices.append((f['end'],tag,f))
  if not choices:facts[metric]=None;continue
  # Most recent period wins; listed tag precedence only breaks date ties.
  end=max(c[0] for c in choices)
  _,tag,f=next(c for c in choices if c[0]==end)
  if 'error' in f:facts[metric]={'error':f['error'],'end':f['end'],'tag':tag};continue
  f.update(tag=tag,unit='USD',basis='US GAAP',kind='instant' if metric=='inventory' else 'annual',
    id=f'{ticker}:{metric}:{f["end"]}:{f["accn"]}',
    source=f'https://www.sec.gov/Archives/edgar/data/{cik}/{f["accn"].replace("-", "")}/{f["accn"]}-index.html')
  facts[metric]=f
 annual_ends=[f['end'] for k,f in facts.items() if k!='inventory' and f and 'val' in f]
 annual_end=max(annual_ends) if annual_ends else None
 for k,f in facts.items():
  if f and 'val' in f and f['end']!=annual_end:
   facts[k]={'error':'different_period','end':f['end'],'tag':f['tag']}
 return dict(ticker=ticker,cik=cik,name=name,entity=raw.get('entityName',name),layer=layer,checked_at=checked_at,annual_end=annual_end,
   source=f'https://data.sec.gov/api/xbrl/companyfacts/CIK{cik:010d}.json',facts=facts)
