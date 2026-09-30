import unittest,json
from pathlib import Path
from data import select,extract,COMPANIES
def row(val=100,**extra):return dict(start='2024-01-01',end='2024-12-31',filed='2025-02-01',form='10-K',val=val,accn='0000000001-25-000001',**extra)
class FinancialFacts(unittest.TestCase):
 def test_quarters_future_and_units(self):
  annual=row();quarter={**row(99),'start':'2024-10-01'};future={**row(200),'filed':'2026-01-01'}
  self.assertEqual(select([annual,quarter,future],'2025-03-01')['val'],100)
  self.assertIsNone(select([quarter],'2025-03-01'))
 def test_same_day_conflict_is_not_a_number(self):
  self.assertEqual(select([row(),row(101)],'2025-03-01')['error'],'conflicting_facts')
 def test_revision_and_negative_prior(self):
  prior={**row(-10),'start':'2023-01-01','end':'2023-12-31'}
  revised={**row(105),'filed':'2025-02-20','form':'10-K/A'}
  f=select([row(),revised,prior],'2025-03-01')
  self.assertTrue(f['revised']);self.assertEqual(f['original_filed'],'2025-02-01');self.assertIsNone(f['yoy'])
 def test_no_old_tag_or_currency_substitution(self):
  raw={'cik':1045810,'facts':{'us-gaap':{'Revenues':{'units':{'USD':[row()], 'EUR':[row(999)]}},'PaymentsToAcquirePropertyPlantAndEquipment':{'units':{'USD':[{**row(),'start':'2010-01-01','end':'2010-12-31'}]}}}}}
  c=extract(raw,COMPANIES[0],'2025-03-01T00:00:00Z')
  self.assertEqual(c['facts']['revenue']['val'],100);self.assertEqual(c['facts']['capex']['error'],'different_period');self.assertIsNone(c['facts']['income'])
 def test_compare_exact_annual_periods_not_filing_fy(self):
  prior={**row(50),'start':'2023-01-01','end':'2023-12-31','fy':2025}
  f=select([row(),prior],'2025-03-01');self.assertEqual(f['yoy'],100)
  self.assertEqual(f['previous']['end'],'2023-12-31')
 def test_shipped_snapshot_has_provenance_and_aligned_periods(self):
  d=json.loads((Path(__file__).resolve().parents[2]/'infrastructure-assets/snapshot.json').read_text())
  self.assertEqual(len(d['companies']),20)
  for c in d['companies']:
   for k,f in c['facts'].items():
    if not f or 'val' not in f:continue
    self.assertEqual(f['end'],c['annual_end']);self.assertLessEqual(f['filed'],c['checked_at'][:10])
    self.assertEqual(f['unit'],'USD');self.assertIn('/'+str(c['cik'])+'/',f['source'])
    self.assertIn(f['accn']+'-index.html',f['source'])
if __name__=='__main__':unittest.main()
