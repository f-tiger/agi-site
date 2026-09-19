import unittest
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
if __name__=='__main__':unittest.main()
