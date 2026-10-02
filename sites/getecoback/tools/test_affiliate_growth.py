import unittest
from affiliate_growth import observed, scenario, reconcile


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

    def test_scope_mismatch_and_shared_tags_do_not_become_site_revenue(self):
        merchant = self.report(merchant_clicks=100, net_commission=40,
            store_id='synthetic-store', tracking_id='synthetic-tag', timezone='Europe/Berlin',
            site_host='getecoback.com', tracking_scope='exclusive_site')
        site = dict(merchant, source='synthetic GA4 fixture', affiliate_click_events=49)
        result = reconcile(merchant, site)
        self.assertEqual(result['site_net_commission'], 40)
        self.assertEqual(result['merchant_epc'], .4)
        self.assertIsNone(result['channel_revenue'])
        for change in ({'period_end':'2026-09-29'}, {'currency':'USD'},
                       {'timezone':'Asia/Shanghai'}, {'tracking_id':'other-tag'}):
            result = reconcile(merchant, dict(site, **change))
            self.assertEqual(result['status'], 'not_comparable')
            self.assertIsNone(result['site_net_commission'])
        self.assertIsNone(reconcile(dict(merchant, tracking_scope='shared'), site)['site_net_commission'])
        self.assertIsNone(reconcile(self.report(net_commission=40), site)['site_net_commission'])
        with self.assertRaises(ValueError):
            reconcile(merchant, dict(site, affiliate_click_events=-1))
        with self.assertRaises(ValueError):
            observed(dict(merchant, period_end='2026-08-01'))
        with self.assertRaises(ValueError):
            observed(dict(merchant, period_start='2026-99-01'))


if __name__ == '__main__': unittest.main()
