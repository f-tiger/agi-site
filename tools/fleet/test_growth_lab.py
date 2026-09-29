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
class AcquisitionTests(unittest.TestCase):
    def fixture(self):
        e=json.loads((lab.ROOT/'data/marketing/traffic-experiment.json').read_text())
        e['distribution']={'connection':'verified','source':'github','scope_reference':'fixture-only'}
        e['delivery']={'campaign_id':e['id'],'source':'github','provider':'test','receipt_reference':'local-fixture',
                      'status':'published','verification':'provider_readback','post_url':'https://github.com/example/example',
                      'published_at':'2026-09-13T12:00:00Z','verified_at':'2026-09-28T12:00:00Z'}
        e['cost']={'operator_minutes':80,'cash_spend':0}
        m={'ok':True,'measurement_version':'bpj-growth-v1','generated':'2026-09-28T12:00:00Z',
           'window':{'start':'2026-09-14','end_exclusive':'2026-09-28','complete_days':14,'date_basis':'UTC'},
           'campaigns':[{'id':e['id'],'rows':[{'source':'github','arrival':'external_referrer','arrivals':65,'qualified':50,'action_sessions':5}]}]}
        return e,m
    def review(self,e,m):return lab.acquisition_decision(e,m,'2026-09-28')
    def test_no_channel_or_post_is_not_a_win_even_with_high_counts(self):
        e,m=self.fixture();e['distribution']['connection']='unverified'
        self.assertEqual(self.review(e,m)['status'],'awaiting_channel')
        e['distribution']['connection']='verified';e['delivery']=None
        self.assertEqual(self.review(e,m)['status'],'awaiting_delivery')
    def test_scheduled_stale_and_wrong_campaign_receipts(self):
        for changes in [{'status':'scheduled'},{'status':'accepted'},{'campaign_id':'other'},{'verified_at':'2026-09-01T12:00:00Z'},{'post_url':'http://example.test'}]:
            e,m=self.fixture();e['delivery'].update(changes)
            self.assertEqual(self.review(e,m)['status'],'delivery_unverified')
    def test_measurement_failure_is_not_zero(self):
        e,m=self.fixture()
        for value in [None,{},dict(m,ok=False),dict(m,generated='2026-09-20T12:00:00Z')]:
            self.assertEqual(self.review(e,value)['status'],'awaiting_measurement')
        m['campaigns'][0]['rows']=[]
        self.assertEqual(self.review(e,m)['status'],'distribution_review')
    def test_wrong_window_or_impossible_counts(self):
        for field,value in [('qualified',70),('action_sessions',51),('arrivals',True),('qualified',-1)]:
            e,m=self.fixture();m['campaigns'][0]['rows'][0][field]=value
            self.assertEqual(self.review(e,m)['status'],'awaiting_measurement')
        e,m=self.fixture();m['window']['date_basis']='Pacific'
        self.assertEqual(self.review(e,m)['status'],'awaiting_measurement')
        e,m=self.fixture();m['window'].update(start='2026-08-14',end_exclusive='2026-08-28')
        self.assertEqual(self.review(e,m)['status'],'awaiting_measurement','fresh export cannot relabel an old window')
    def test_prepublication_is_not_complete_observation(self):
        e,m=self.fixture();e['delivery']['published_at']='2026-09-20T12:00:00Z'
        self.assertEqual(self.review(e,m)['status'],'collecting_evidence')
    def test_fleet_search_and_other_sources_do_not_inflate_gate(self):
        e,m=self.fixture();row=m['campaigns'][0]['rows'][0];row['arrival']='fleet'
        m['campaigns'][0]['rows'].append(dict(row,source='x',arrival='external_referrer'))
        result=self.review(e,m)
        self.assertEqual(result['status'],'distribution_review');self.assertEqual(result['metrics']['qualified'],0)
        self.assertEqual(result['metrics']['excluded_arrivals'],65)
    def test_one_signal_requires_cost_and_is_not_a_case(self):
        e,m=self.fixture();r=self.review(e,m)
        self.assertEqual(r['status'],'replicate_once');self.assertEqual(r['claim'],'source_associated_signal_not_causal_lift')
        e['cost']['operator_minutes']=None;self.assertEqual(self.review(e,m)['status'],'cost_missing')
        m['campaigns'][0]['rows'][0]['action_sessions']=4
        self.assertEqual(self.review(e,m)['status'],'landing_review')
    def test_tag_only_is_explicit_and_duplicate_groups_rejected(self):
        e,m=self.fixture();row=m['campaigns'][0]['rows'][0];row['arrival']='tag_only'
        self.assertEqual(self.review(e,m)['metrics']['tag_only_arrivals'],65)
        m['campaigns'][0]['rows'].append(dict(row))
        self.assertEqual(self.review(e,m)['status'],'awaiting_measurement')
if __name__=='__main__':unittest.main()
