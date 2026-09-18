import importlib.util
import json
import unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('lab',Path(__file__).with_name('growth_lab.py'))
lab=importlib.util.module_from_spec(spec);spec.loader.exec_module(lab)
CONFIG=json.loads((lab.ROOT/'data/growth-lab.json').read_text())
class Tests(unittest.TestCase):
    def test_no_data_is_unknown(self):
        r=lab.report(CONFIG,{})
        self.assertEqual(r['revenue']['status'],'unknown')
        self.assertTrue(all(x['status']=='awaiting_measurement' for x in r['experiments']))
    def test_provider_click_math(self):
        r=lab.report(CONFIG,{})['provider_click_scenarios'][1]
        self.assertEqual(r['clicks_for_110'],1100);self.assertEqual(r['clicks_for_1100'],11000)
    def test_zero_traffic_is_distribution_problem(self):
        row=dict(days_live=40,qualified_landings=0,decisions=0,commerce_clicks=0,window_start='2026-09-01',window_end='2026-09-28',source='test',ci_excluded=True)
        self.assertEqual(lab.decision(CONFIG['experiments'][0],row)['status'],'distribution_review')
        row.update(qualified_landings=150,decisions=20,commerce_clicks=5)
        self.assertEqual(lab.decision(CONFIG['experiments'][0],row)['status'],'expand_one_replication')
    def test_revenue_is_not_clicks(self):
        self.assertEqual(lab.report(CONFIG,{'portfolio_revenue':{'confirmed_commission':1100}})['revenue']['status'],'unknown')
    def test_invalid_negative_count(self):
        self.assertEqual(lab.decision(CONFIG['experiments'][0],{'days_live':-1})['status'],'invalid_measurement')
    def test_product_revenue_and_fees_are_separate(self):
        row=dict(reconciled_no_double_count=True,vat_excluded=True,window_start='2026-08-20',window_end='2026-09-18',currency='EUR',source='fixture',confirmed_commission=10,recognized_product_service_sales=118,cash_received=100,refunds=5,operating_cost=20,acquisition_cost=10,payment_fees=3)
        r=lab.report(CONFIG,{'portfolio_revenue':row})['revenue']
        self.assertEqual(r['confirmed_net'],123);self.assertEqual(r['contribution_before_labor_and_tax'],90)
        self.assertEqual(r['cash_received'],100);self.assertTrue(r['target_110_met'])
        row['window_start']='2026-08-01'
        self.assertEqual(lab.report(CONFIG,{'portfolio_revenue':row})['revenue']['status'],'unknown')
    def test_pilot_requires_paid_repeat_and_fast_delivery(self):
        e=CONFIG['commercial_experiments'][0]
        row=dict(days_live=14,qualified_conversations=10,unrelated_paying_customers=3,repeat_requests=2,delivery_minutes=[30,40,45],window_start='2026-09-01',window_end='2026-09-14',source='fixture',payments_reconciled=True)
        self.assertEqual(lab.commercial_decision(e,row)['status'],'test_paid_recurring_offer')
        row['delivery_minutes']=[30,40,60]
        self.assertEqual(lab.commercial_decision(e,row)['status'],'reduce_delivery_cost')
        row.update(unrelated_paying_customers=0,repeat_requests=0,delivery_minutes=[])
        self.assertEqual(lab.commercial_decision(e,row)['status'],'revise_offer')
        row['qualified_conversations']=2
        self.assertEqual(lab.commercial_decision(e,row)['status'],'distribution_review')
    def test_pilot_rejects_unreconciled_or_inconsistent_counts(self):
        e=CONFIG['commercial_experiments'][0]
        row=dict(days_live=14,qualified_conversations=10,unrelated_paying_customers=3,repeat_requests=2,delivery_minutes=[30,40,45],window_start='2026-09-01',window_end='2026-09-14',source='fixture',payments_reconciled=False)
        self.assertEqual(lab.commercial_decision(e,row)['status'],'invalid_measurement')
        row.update(payments_reconciled=True,repeat_requests=4)
        self.assertEqual(lab.commercial_decision(e,row)['status'],'invalid_measurement')
if __name__=='__main__':unittest.main()
