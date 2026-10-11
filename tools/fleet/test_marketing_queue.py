import copy, datetime as dt, json, pathlib, re, subprocess, unittest
from urllib.parse import urlsplit, parse_qs
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
 def test_tds_entries_use_canonicals_and_parser_accepted_external_links(self):
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
    if row['id'] in ids:
     self.assertEqual(row['blockers'],[]);self.assertEqual(row['state'],'draft_ready')
     self.assertFalse(row['distribution_authorized']);self.assertFalse(row['published'])
     self.assertEqual(row['url'],'https://thedollscout.com'+expected_paths[row['id']])
     for variant in row['external_drafts']:
      self.assertEqual(variant['state'],'prepared_not_authorized');self.assertFalse(variant['published'])
      self.assertIn('specific_publication_authorization_required',variant['blockers'])
      query=parse_qs(urlsplit(variant['url']).query)
      self.assertEqual(set(query),{'utm_source','utm_medium','utm_campaign'})
      self.assertEqual(query['utm_campaign'],['free-tools'])
      self.assertEqual(urlsplit(variant['url']).path,expected_paths[row['id']])
      # Execute the production parser: passing a Python allowlist alone cannot
      # prove that the website will retain all three campaign labels.
      script="import {campaignFields} from './tools/fleet-analytics/campaign.mjs'; console.log(JSON.stringify(campaignFields(new URL(process.argv[1]).search)));"
      parsed=json.loads(subprocess.check_output(['node','--input-type=module','-e',script,variant['url']],cwd=root,text=True))
      self.assertEqual(parsed,{'campaign_source':variant['source'],'campaign_medium':variant['medium'],'campaign_name':'free-tools'})
   self.assertEqual(plan['sends'],0);self.assertIsNone(plan['measurement']['net_revenue'])
 def test_collection_policy_is_scoped_and_fail_closed(self):
  root=pathlib.Path(__file__).resolve().parents[2]
  catalog=json.loads((root/'data/marketing/campaigns.json').read_text())
  c=next(c for c in catalog['campaigns'] if c.get('link_policy'))
  catalog['campaigns']=[c]
  for change in [{'link_policy':'typo'},{'site':'bpj'},{'url':'https://thedollscout.com/image-compressor'},
                 {'url':c['url']+'?utm_source=wrong'},{'url':c['url']+'#private'},
                 {'url':'https://thedollscout.com:443'+urlsplit(c['url']).path}]:
   broken=copy.deepcopy(catalog);broken['campaigns'][0].update(change)
   with self.subTest(change=change),self.assertRaises(ValueError):compile_plan(broken,{},'2026-10-11')
  expired=compile_plan(catalog,{},'2026-11-11')['campaigns'][0]
  self.assertEqual(expired['state'],'blocked')
  for variant in expired['external_drafts']:self.assertIn('review_stale',variant['blockers'])
 def test_legacy_drafts_unchanged_when_collection_policy_added(self):
  root=pathlib.Path(__file__).resolve().parents[2]
  catalog=json.loads((root/'data/marketing/campaigns.json').read_text())
  old=[c for c in catalog['campaigns'] if not c.get('link_policy')]
  expected=compile_plan({**catalog,'campaigns':old},{},'2026-10-11')['campaigns']
  actual=[c for c in compile_plan(catalog,{},'2026-10-11')['campaigns'] if c['id'] in {x['id'] for x in old}]
  self.assertEqual(expected,actual)
if __name__=='__main__':unittest.main()
