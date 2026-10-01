import unittest
from affiliate_growth import observed, scenario


class EvidenceBoundaries(unittest.TestCase):
    def report(self, **extra):
        return dict(period_start='2026-09-01', period_end='2026-09-30', market='DE',
                    currency='EUR', source='synthetic merchant fixture', **extra)

    def test_missing_commission_is_not_zero(self):
        d=observed(self.report(merchant_clicks=100))
        self.assertIsNone(d['net_commission']); self.assertIsNone(d['merchant_epc'])
        self.assertEqual(d['status'],'unknown')

    def test_site_events_cannot_be_merchant_epc_denominator(self):
        self.assertIsNone(observed(self.report(site_click_events=100,net_commission=40))['merchant_epc'])

    def test_explicit_zero_and_returns_preserved(self):
        self.assertEqual(observed(self.report(merchant_clicks=100,net_commission=0))['merchant_epc'],0)
        self.assertEqual(observed(self.report(merchant_clicks=100,net_commission=-4))['merchant_epc'],-.04)

    def test_nonfinite_or_missing_provenance_rejected(self):
        with self.assertRaises(ValueError): observed(self.report(net_commission=float('nan')))
        with self.assertRaises(ValueError): observed({'merchant_clicks':100})
        with self.assertRaises(ValueError): scenario(1000,.2,0,8)

    def test_illustrative_base_case_is_not_a_forecast(self):
        d=scenario(1000,.25,.05,8)
        self.assertEqual(d['required_monthly_visits'],10000)
        self.assertEqual(d['required_merchant_clicks'],2500)
        self.assertIn('not observed',d['evidence'])


if __name__ == '__main__': unittest.main()
