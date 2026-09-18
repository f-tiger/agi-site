import copy
import importlib.util
import json
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('profitability', Path(__file__).with_name('profitability.py'))
profit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(profit)
SCENARIOS = json.loads((Path(__file__).resolve().parents[2] / 'data/profitability-scenarios.json').read_text())['scenarios']


class ProfitTests(unittest.TestCase):
    def setUp(self):
        self.row = copy.deepcopy(SCENARIOS[0])

    def test_losses_are_not_fixed_by_more_volume(self):
        r = profit.evaluate(SCENARIOS[1])
        self.assertFalse(r['positive_unit_contribution_after_labor'])
        self.assertIsNone(r['targets'][1]['units_for_operating_surplus_after_labor'])
        self.assertLess(r['scale_probe'][1]['operating_surplus_after_labor_eur'], r['scale_probe'][0]['operating_surplus_after_labor_eur'])

    def test_refunds_and_nonreturned_fees(self):
        self.row.update(price_eur_ex_vat=100, refund_rate=1, payment_fee_rate=.03, payment_fee_fixed_eur=.3,
                        variable_cost_eur=0, acquisition_cash_per_unit_eur=0)
        r = profit.evaluate(self.row)
        self.assertEqual(r['net_revenue_per_unit_eur'], 0)
        self.assertEqual(r['cash_contribution_per_unit_eur'], -3.3)
        self.assertIsNone(r['targets'][0]['units_for_net_revenue'])

    def test_time_is_charged_even_with_free_distribution(self):
        self.row.update(acquisition_cash_per_unit_eur=0, delivery_minutes=0, support_minutes=0, acquisition_minutes=60)
        self.assertEqual(profit.evaluate(self.row)['labor_per_unit_eur'], 30)

    def test_price_arithmetic_does_not_equal_profit(self):
        r = profit.evaluate(self.row)['targets'][1]
        self.assertGreater(r['units_for_operating_surplus_after_labor'], r['units_for_net_revenue'])

    def test_exact_click_boundary_and_missing_conversion(self):
        r = profit.evaluate(next(s for s in SCENARIOS if s['unit'] == 'provider_confirmed_click'))['targets'][1]
        self.assertEqual(r['units_for_net_revenue'], 11000)
        self.assertEqual(r['units_for_operating_surplus_after_labor'], 12250)
        self.assertIsNone(r['qualified_offer_exposures_for_surplus'])

    def test_invalid_inputs_fail_closed(self):
        for key, value in [('refund_rate',1.1), ('qualified_offer_conversion',-1), ('payment_fee_rate',float('nan')),
                           ('labor_eur_per_hour',True), ('price_eur_ex_vat',None), ('support_minutes',float('inf'))]:
            with self.subTest(key=key):
                row={**self.row,key:value}
                with self.assertRaises(ValueError):profit.evaluate(row)

    def test_basis_and_unit_are_required(self):
        for key in ['basis','unit']:
            row={**self.row};row.pop(key)
            with self.assertRaises(ValueError):profit.evaluate(row)

    def test_manual_work_grows_with_orders(self):
        r=profit.evaluate(self.row)
        self.assertEqual(r['scale_probe'][1]['hours']-r['scale_probe'][0]['hours'],90*.75)

    def test_gmv_is_not_platform_revenue_and_fees_can_apply_to_whole_gmv(self):
        self.row.update(price_eur_ex_vat=5, refund_rate=.1, payment_fee_rate=.03, payment_fee_fixed_eur=0,
                        variable_cost_eur=0, acquisition_cash_per_unit_eur=0,
                        transaction={'gmv_eur':100,'take_rate':.05,'payment_fee_basis':'gmv',
                                     'unrecovered_cost_per_refunded_unit_eur':10})
        r=profit.evaluate(self.row)
        self.assertEqual(r['net_revenue_per_unit_eur'],4.5)
        self.assertEqual(r['cash_contribution_per_unit_eur'],.5)
        self.row['transaction']['payment_fee_basis']='platform_fee'
        self.assertEqual(profit.evaluate(self.row)['cash_contribution_per_unit_eur'],3.35)

    def test_failed_attempts_and_refunds_still_cost_money(self):
        self.row['inference']={'cost_per_full_attempt_eur':2,'expected_attempts':1.5}
        self.assertEqual(profit.evaluate(self.row)['variable_cost_including_expected_retries_eur'],3.2)
        self.row['inference']['expected_attempts']=3
        with self.assertRaises(ValueError):profit.evaluate(self.row)

if __name__ == '__main__':
    unittest.main()
