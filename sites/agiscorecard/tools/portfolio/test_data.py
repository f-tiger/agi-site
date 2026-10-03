import copy,datetime as dt,json,unittest
from refresh import calculate,refresh,parse_chart,MANIFEST
M=json.loads(MANIFEST.read_text());NOW=dt.datetime(2026,10,7,23,tzinfo=dt.timezone.utc)
def prices():
 return {x['ticker']:{'2026-10-05':100,'2026-10-06':110,'2026-10-07':99} for x in M['stocks']+M['benchmarks']}
class Tests(unittest.TestCase):
 def test_weekend_has_no_returns_or_price_requests(self):
  s=refresh(M,None,dt.datetime(2026,10,3,5,tzinfo=dt.timezone.utc),lambda *a:self.fail('fetch before entry'))
  self.assertEqual(s['status'],'awaiting_entry');self.assertEqual(s['metrics'],{})
 def test_buy_hold_not_rebalanced(self):
  p=prices();p['AMD']['2026-10-06']=200;p['AMD']['2026-10-07']=100
  r=calculate(M,p);self.assertAlmostEqual(r['series']['basket'][-1],(100+11*99)/12,places=6)
  self.assertEqual(r['metrics']['SPY']['return_pct'],-1);self.assertEqual(r['metrics']['SPY']['max_drawdown_pct'],-10)
  self.assertAlmostEqual(r['metrics']['basket']['excess_spy_pp'],1/12,places=5)
 def test_no_lookahead_baseline(self):
  p=prices();p['AMD'].pop('2026-10-05')
  with self.assertRaisesRegex(ValueError,'missing_entry'):calculate(M,p)
 def test_missing_middle_or_stale_last_day_blocks_all(self):
  for date in ['2026-10-06','2026-10-07']:
   p=prices();p['SPCX'].pop(date)
   with self.assertRaises(ValueError):calculate(M,p)
 def test_failure_preserves_old_record_and_success_time(self):
  s=refresh(M,None,NOW,lambda t,*a:prices()[t]);before=copy.deepcopy(s)
  def fail(*args):raise RuntimeError('private provider error')
  r=refresh(M,s,NOW+dt.timedelta(days=1),fail)
  self.assertEqual(r['status'],'stale');self.assertEqual(r['metrics'],s['metrics']);self.assertEqual(r['last_success_at'],s['last_success_at']);self.assertEqual(s,before)
 def test_locked_rules(self):
  s=refresh(M,None,NOW,lambda t,*a:prices()[t]);changed=copy.deepcopy(M);changed['entry_session']='2026-10-06'
  with self.assertRaisesRegex(ValueError,'Registered rules'):refresh(changed,s,NOW)
 def test_vendor_corrections_recorded(self):
  s=refresh(M,None,NOW,lambda t,*a:prices()[t]);p=prices();p['MU']['2026-10-06']=150
  r=refresh(M,s,NOW,lambda t,*a:p[t]);self.assertEqual(len(r['revisions']),1);self.assertTrue(any(x['series']=='MU' for x in r['revisions'][0]['changes']))
 def test_identity_completed_session_and_adjusted_series(self):
  stamp=int(dt.datetime(2026,10,7,14,tzinfo=dt.timezone.utc).timestamp())
  r={'meta':{'symbol':'SPCX','currency':'USD','instrumentType':'EQUITY','longName':'Space Exploration Technologies'},'timestamp':[stamp],'indicators':{'adjclose':[{'adjclose':[100]}]}}
  j={'chart':{'result':[r]}};self.assertEqual(parse_chart(j,'SPCX',NOW),{'2026-10-07':100})
  r['meta']['longName']='An unrelated ETF'
  with self.assertRaisesRegex(ValueError,'spcx_identity'):parse_chart(j,'SPCX',NOW)
  r['meta']['longName']='SpaceX'
  with self.assertRaisesRegex(ValueError,'no_completed'):parse_chart(j,'SPCX',NOW.replace(hour=18))
  r['meta']['currency']='EUR'
  with self.assertRaisesRegex(ValueError,'identity_or_currency'):parse_chart(j,'SPCX',NOW)
if __name__=='__main__':unittest.main()
