import copy, datetime as dt, json, pathlib, re, unittest
from urllib.parse import urlsplit
from marketing_queue import compile_plan
class MarketingQueueTests(unittest.TestCase):
 def catalog(self):return {'reviewed_at':'2026-09-19','max_age_days':30,'campaigns':[{'id':'ad','site':'bpj','url':'https://baipiaoji.com/advertise.html','goal':'paid','requires_checkout':True,'status':'approved_entry','draft':'See actual reach','channel':'owned'}]}
 def test_blocked_payments_and_test_mode(self):
  for doctor in [{},{'ok':True,'selling':False,'mode':'live'},{'ok':True,'selling':True,'mode':'test'}]:
   r=compile_plan(self.catalog(),doctor,'2026-09-19');self.assertEqual(r['campaigns'][0]['state'],'blocked');self.assertEqual(r['sends'],0);self.assertIsNone(r['measurement']['net_revenue'])
 def test_stale_and_duplicate(self):
  doctor={'ok':True,'selling':True,'mode':'live'}
  r=compile_plan(self.catalog(),doctor,'2026-09-20');r2=compile_plan(self.catalog(),doctor,'2026-09-21');self.assertEqual(r['campaigns'][0]['dedupe_key'],r2['campaigns'][0]['dedupe_key']);self.assertEqual(r['campaigns'][0]['state'],'draft_ready')
  self.assertEqual(compile_plan(self.catalog(),doctor,'2026-11-20')['campaigns'][0]['state'],'blocked')
 def test_foreign_destination_rejected(self):
  c=self.catalog();c['campaigns'][0]['url']='https://example.org/'
  with self.assertRaises(ValueError):compile_plan(c,{},'2026-09-19')
 def test_entry_review_does_not_refresh_other_campaigns(self):
  catalog=self.catalog();old=copy.deepcopy(catalog['campaigns'][0])
  fresh=copy.deepcopy(old);fresh.update(id='fresh',reviewed_at='2026-10-11')
  catalog['campaigns'].append(fresh);doctor={'ok':True,'selling':True,'mode':'live'}
  rows=compile_plan(catalog,doctor,'2026-10-20')['campaigns']
  self.assertEqual(rows[0]['blockers'],['review_stale']);self.assertEqual(rows[1]['blockers'],[])
  self.assertEqual(catalog['reviewed_at'],'2026-09-19');self.assertEqual(catalog['campaigns'][0],old)
  baseline=self.catalog()
  for offset in [-1,0,30,31]:
   date=(dt.date(2026,9,19)+dt.timedelta(days=offset)).isoformat()
   self.assertEqual(compile_plan(catalog,doctor,date)['campaigns'][0],compile_plan(baseline,doctor,date)['campaigns'][0])
 def test_entry_review_future_expiry_and_malformed_fail_closed(self):
  catalog=self.catalog();catalog['campaigns'][0]['reviewed_at']='2026-10-11'
  doctor={'ok':True,'selling':True,'mode':'live'}
  for date,blocked in [('2026-10-10',True),('2026-11-10',False),('2026-11-11',True)]:
   with self.subTest(date=date):self.assertEqual('review_stale' in compile_plan(catalog,doctor,date)['campaigns'][0]['blockers'],blocked)
  catalog['campaigns'][0]['reviewed_at']='invalid'
  with self.assertRaises(ValueError):compile_plan(catalog,doctor,'2026-10-11')
 def test_tracking_blocker_is_explicit_and_preserves_unset_behavior(self):
  catalog=self.catalog();doctor={'ok':True,'selling':True,'mode':'live'}
  self.assertEqual(compile_plan(catalog,doctor,'2026-09-19')['campaigns'][0]['state'],'draft_ready')
  catalog['campaigns'][0]['campaign_tracking_ready']=False
  row=compile_plan(catalog,doctor,'2026-09-19')['campaigns'][0]
  self.assertEqual(row['blockers'],['tracking_not_registered']);self.assertEqual(row['state'],'blocked');self.assertFalse(row['published'])
  catalog['campaigns'][0]['campaign_tracking_ready']=True
  self.assertEqual(compile_plan(catalog,doctor,'2026-09-19')['campaigns'][0]['state'],'draft_ready')
 def test_new_tds_entries_are_real_english_canonicals_but_not_tracking_ready(self):
  root=pathlib.Path(__file__).resolve().parents[2]
  catalog=json.loads((root/'data/marketing/campaigns.json').read_text())
  ids={'tds-smiski-checklist-20261011','tds-sonny-checklist-20261011','tds-collection-backup-20261011'}
  expected_paths={'tds-smiski-checklist-20261011':'/series/smiski-museum','tds-sonny-checklist-20261011':'/series/sonny-angel-snack-series','tds-collection-backup-20261011':'/collection-tracker'}
  entries=[c for c in catalog['campaigns'] if c['id'] in ids];self.assertEqual(len(entries),3)
  for c in entries:
   with self.subTest(id=c['id']):
    self.assertEqual(c['site'],'tds');self.assertEqual(c['language'],'en');self.assertFalse(c['requires_checkout'])
    self.assertEqual(urlsplit(c['url']).path,expected_paths[c['id']])
    path=root/'sites/thedollscout'/(urlsplit(c['url']).path.lstrip('/')+'.html')
    html=path.read_text();self.assertIn('<html lang="en"',html)
    self.assertRegex(html,r'<link[^>]*rel="canonical"[^>]*href="'+re.escape(c['url'])+'"')
  for day in ['2026-10-11','2026-10-20']:
   plan=compile_plan(catalog,{},day)
   for row in plan['campaigns']:
    if row['id'] in ids:self.assertEqual(row['blockers'],['tracking_not_registered'])
   self.assertEqual(plan['sends'],0);self.assertIsNone(plan['measurement']['net_revenue'])
if __name__=='__main__':unittest.main()
