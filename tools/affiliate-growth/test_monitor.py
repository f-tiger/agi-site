import contextlib
from copy import deepcopy
from datetime import date, timedelta
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('monitor', Path(__file__).with_name('monitor.py'))
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
AS_OF = date(2026, 11, 5)


def snapshot():
    start = AS_OF - timedelta(days=56)
    daily = [{'day': str(start + timedelta(days=i)), 'page_views': 10, 'affiliate_clicks': 1,
              'known_collection_gap': i == 0} for i in range(56)]
    weeks = [{'start': str(start + timedelta(days=i * 7)), 'end_exclusive': str(start + timedelta(days=(i + 1) * 7)),
              'page_views': 70, 'affiliate_clicks': 7,
              'cohorts': {'humidity': {'page_views': 70, 'affiliate_clicks': 7}},
              'channels': {'search': {'page_views': 70, 'affiliate_clicks': 7}},
              'destinations': {'product': 7}, 'surfaces': {'body': 7}} for i in range(8)]
    return {'affiliate_audit': {'start': str(start), 'end_exclusive': str(AS_OF),
                                'timezone': 'UTC', 'daily': daily, 'weeks': weeks}}


def evidence():
    reports = []
    for market, currency in [('DE', 'EUR'), ('US', 'USD')]:
        reports.append({'period_start': '2026-10-06', 'period_end': '2026-11-04',
                        'market': market, 'currency': currency, 'source': 'SYNTHETIC TEST ONLY',
                        'store_id': 'fixture-store-' + market, 'tracking_id': 'fixture-exclusive-' + market,
                        'timezone': 'UTC', 'site_host': 'getecoback.com', 'tracking_scope': 'exclusive_site',
                        'scope_evidence_ref': 'synthetic scope proof', 'evidence_ref': 'synthetic report proof',
                        'statement_status': 'confirmed_net', 'merchant_clicks': 100, 'net_commission': 50,
                        'cash_received': 0, 'fx_to_usd': {'rate': 1.1, 'date': '2026-11-04', 'source': 'synthetic FX'}})
    return {'reports': reports}


class ScorecardEvidenceTests(unittest.TestCase):
    def test_complete_window_and_gaps_are_preserved(self):
        result = m.traffic(snapshot(), AS_OF)
        self.assertEqual(result['status'], 'current')
        self.assertEqual(result['last_30d']['affiliate_clicks'], 30)
        self.assertEqual(result['last_28d']['affiliate_clicks'], 28)
        self.assertEqual(len(result['previous_28d']['known_gap_days']), 1)

    def test_missing_date_duplicate_date_and_disagreeing_week_fail_closed(self):
        for mutate in (lambda a: a['daily'].pop(),
                       lambda a: a['daily'].__setitem__(1, a['daily'][0]),
                       lambda a: a['weeks'][0].update(affiliate_clicks=100),
                       lambda a: a['daily'][0].update(page_views=True),
                       lambda a: a['weeks'][0].update(cohorts={})):
            d = snapshot(); mutate(d['affiliate_audit'])
            result = m.traffic(d, AS_OF)
            self.assertEqual(result['status'], 'invalid')
            self.assertEqual(result['daily'], [])

    def test_unknown_and_stale_are_not_zero_or_current(self):
        self.assertEqual(m.traffic({'status': 'failure', 'body': snapshot()}, AS_OF)['status'], 'unknown')
        self.assertEqual(m.traffic({}, AS_OF)['daily'], [])
        self.assertEqual(m.traffic(snapshot(), AS_OF + timedelta(days=1))['status'], 'stale')

    def test_missing_merchant_is_unknown_at_every_milestone(self):
        r = m.revenue(None, AS_OF)
        self.assertIsNone(r['site_net_usd'])
        self.assertEqual([x['status'] for x in r['milestones']], ['unknown'] * 3)

    def test_fx_cash_and_milestones_are_distinct(self):
        r = m.revenue(evidence(), AS_OF)
        self.assertEqual(r['site_net_usd'], 105)
        self.assertEqual(r['cash_received_usd'], 0)
        self.assertEqual([x['status'] for x in r['milestones']], ['met'] * 3)

    def test_known_shared_tags_cannot_be_relabelled_exclusive(self):
        d = evidence(); d['reports'][0]['tracking_id'] = 'getecoback-21'
        r = m.revenue(d, AS_OF)
        self.assertIsNone(r['site_net_usd'])
        self.assertIn('DE:known_shared_tag', r['blockers'])

    def test_shared_scope_stale_fx_pending_and_partial_coverage_block_revenue(self):
        mutations = [lambda d: d['reports'].pop(),
                     lambda d: d['reports'][0].update(tracking_scope='shared'),
                     lambda d: d['reports'][0].update(period_start='2026-10-05'),
                     lambda d: d['reports'][0].update(statement_status='pending'),
                     lambda d: d['reports'][0].update(fx_to_usd={}),
                     lambda d: d['reports'][0].update(evidence_ref=None),
                     lambda d: d['reports'][0].update(net_commission=None)]
        for mutate in mutations:
            d = evidence(); mutate(d)
            self.assertIsNone(m.revenue(d, AS_OF)['site_net_usd'])

    def test_returns_can_remove_a_current_milestone_and_zero_is_real(self):
        d = evidence()
        for row in d['reports']:
            row['net_commission'] = 0
        self.assertEqual(m.revenue(d, AS_OF)['site_net_usd'], 0)
        d['reports'][0]['net_commission'] = -5
        r = m.revenue(d, AS_OF)
        self.assertEqual(r['site_net_usd'], -5.5)
        self.assertEqual([x['status'] for x in r['milestones']], ['not_yet'] * 3)

    def test_overlapping_snapshots_and_nonfinite_values_are_rejected(self):
        d = evidence(); d['reports'].append(deepcopy(d['reports'][0]))
        with self.assertRaises(ValueError): m.revenue(d, AS_OF)
        d = evidence(); d['reports'][0]['fx_to_usd']['rate'] = 'NaN'
        with self.assertRaises(ValueError): m.revenue(d, AS_OF)

    def test_html_escapes_external_group_and_provenance_text(self):
        r = m.revenue(evidence(), AS_OF)
        r['markets'][0]['issues'] = ['<script>alert(1)</script>']
        rendered = m.render({'as_of': str(AS_OF), 'traffic': m.traffic(snapshot(), AS_OF),
                             'revenue': r, 'scenarios': [], 'operations': {'experiments': [], 'blockers': []}})
        self.assertNotIn('<script>', rendered)
        self.assertIn('&lt;script&gt;', rendered)

    def test_cli_writes_private_history_and_never_prints_financial_data(self):
        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp); source = base / 'input.json'; source.write_text(json.dumps(snapshot()))
            args = ['monitor.py', '--snapshot', str(source), '--out', str(base / 'out'), '--as-of', str(AS_OF)]
            with patch('sys.argv', args), contextlib.redirect_stdout(io.StringIO()) as stdout:
                self.assertEqual(m.main(), 0)
            self.assertNotIn('page_views', stdout.getvalue())
            self.assertTrue((base / 'out/history/2026-11-05.json').exists())
            self.assertTrue((base / 'out/dashboard.html').exists())
            with patch('sys.argv', args + ['--health-only']), contextlib.redirect_stdout(io.StringIO()) as stdout:
                self.assertEqual(m.main(), 0)
            status = json.loads(stdout.getvalue())
            self.assertEqual(status, {'traffic_source_status': 'current', 'merchant_source_status': 'not_connected', 'revenue_milestones': 'unknown'})

    def test_public_worktree_output_is_rejected(self):
        with self.assertRaises(ValueError):
            m.collector.private_path(m.ROOT / 'private-report')


if __name__ == '__main__':
    unittest.main()
