"""Regression tests for truthful, current membership reports; no network calls."""
import copy
import json
import subprocess
import sys
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path
from check_membership_snapshot import COUNTERS, SITES, check, summary
NOW = datetime(2026, 10, 7, 16, 0, tzinfo=timezone.utc)
ROOT = Path(__file__).resolve().parents[2]

def fixture():
    return {'schema_version': 1, 'generated': '2026-10-07T16:00:00Z', 'ok': True, 'counters_complete': True,
            'sites': [{'site': site, 'public': {'ok': True, 'ready': True}, 'admin': {'ok': True, **dict.fromkeys(COUNTERS, 0)}} for site in sorted(SITES)],
            'totals': dict.fromkeys(COUNTERS, 0)}

class MembershipSnapshotTests(unittest.TestCase):
    def test_current_complete_observed_zero(self):
        self.assertEqual(check(fixture(), now=NOW, since=NOW.isoformat()), 0)
        self.assertIn('paid_orders=0', summary(fixture()))

    def test_current_failed_reads_are_valid_unavailable_evidence(self):
        report = fixture()
        for row in report['sites']: row['admin'] = {'ok': False}
        report['totals'] = dict.fromkeys(COUNTERS, None)
        report['counters_complete'] = False
        check(report, now=NOW)
        self.assertIn('paid_orders=unavailable', summary(report))
        self.assertNotIn('paid_orders=0', summary(report))

    def test_partial_counts_do_not_become_fleet_totals(self):
        report = fixture()
        report['sites'][0]['admin'] = {'ok': False}
        report['totals'] = dict.fromkeys(COUNTERS, None)
        report['counters_complete'] = False
        check(report, now=NOW)
        report['totals']['paid_members'] = 0
        with self.assertRaises(ValueError): check(report, now=NOW)

    def test_missing_one_counter_remains_unknown(self):
        report = fixture()
        report['sites'][0]['admin']['paid_orders'] = None
        report['totals']['paid_orders'] = None
        report['counters_complete'] = False
        check(report, now=NOW)

    def test_missing_duplicate_sites_and_malformed_counts_fail(self):
        mutations = [lambda r: r['sites'].pop(), lambda r: r['sites'].append(copy.deepcopy(r['sites'][0]))]
        for value in [False, -1, 0.5, '0', 9007199254740992]:
            mutations.append(lambda r, value=value: r['sites'][0]['admin'].update(paid_orders=value))
        for mutate in mutations:
            report = fixture()
            mutate(report)
            with self.assertRaises(ValueError): check(report, now=NOW)

    def test_stale_future_timezone_naive_and_previous_run_fail(self):
        for generated in ['2026-09-24T07:47:56Z', '2026-10-07T16:02:00Z', '2026-10-07T16:00:00']:
            report = fixture()
            report['generated'] = generated
            with self.assertRaises(ValueError): check(report, now=NOW)
        with self.assertRaises(ValueError): check(fixture(), now=NOW, since='2026-10-07T16:00:01Z')

    def test_completeness_and_readiness_flags_must_match(self):
        for key in ['ok', 'counters_complete']:
            report = fixture()
            report[key] = False
            with self.assertRaises(ValueError): check(report, now=NOW)
        report = fixture()
        report['ok'] = False
        report['sites'][0]['public']['ready'] = False
        check(report, now=NOW)

    def test_cli_preserves_incomplete_evidence_then_enforces_health(self):
        report = fixture()
        report['generated'] = datetime.now(timezone.utc).isoformat()
        report['sites'][0]['admin'] = {'ok': False}
        report['totals'] = dict.fromkeys(COUNTERS, None)
        report['counters_complete'] = False
        with tempfile.TemporaryDirectory() as tmp:
            report_path, summary_path = Path(tmp) / 'snapshot.json', Path(tmp) / 'summary.md'
            report_path.write_text(json.dumps(report))
            command = [sys.executable, str(ROOT / 'tools/fleet/check_membership_snapshot.py'), '--path', str(report_path)]
            saved = subprocess.run(command + ['--summary', str(summary_path)], capture_output=True, text=True)
            self.assertEqual(saved.returncode, 0, saved.stdout + saved.stderr)
            self.assertIn('unavailable', summary_path.read_text())
            failed = subprocess.run(command + ['--require-available'], capture_output=True, text=True)
            self.assertEqual(failed.returncode, 1)
            self.assertEqual(json.loads(report_path.read_text()), report)

    def test_public_read_failure_is_unknown_and_fails_final_gate(self):
        report = fixture()
        report['generated'] = datetime.now(timezone.utc).isoformat()
        report['sites'][0]['public'] = {'ok': False}
        report['ok'] = False
        check(report)
        self.assertIn('ready=unavailable', summary(report))
        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp) / 'snapshot.json'
            output.write_text(json.dumps(report))
            command = [sys.executable, str(ROOT / 'tools/fleet/check_membership_snapshot.py'), '--path', str(output), '--require-available']
            self.assertEqual(subprocess.run(command, capture_output=True).returncode, 1)
            report['sites'][0]['public'] = {'ok': True, 'ready': False}
            output.write_text(json.dumps(report))
            self.assertEqual(subprocess.run(command, capture_output=True).returncode, 0)

    def test_workflow_keeps_reporting_independent_and_narrow(self):
        autopilot = (ROOT / '.github/workflows/fleet-autopilot.yml').read_text()
        report = (ROOT / '.github/workflows/fleet-membership-report.yml').read_text()
        membership_job = autopilot.split('  membership-report:\n', 1)[1]
        self.assertNotIn('needs:', membership_job)
        self.assertIn('uses: ./.github/workflows/fleet-membership-report.yml', membership_job)
        self.assertNotIn('membership_snapshot.mjs', autopilot)
        self.assertNotIn('test_evolution.py', report)
        self.assertNotIn('evolution.py', report)
        self.assertIn("github.event_name != 'pull_request' && github.ref == 'refs/heads/main' && inputs.dry_run != true", report)
        self.assertIn('git add -- data/fleet-evolution/membership.json', report)
        self.assertNotIn('git add data/', report)
        self.assertNotIn('git push --force', report)
        self.assertNotIn('  schedule:', report)
        self.assertNotIn('data/fleet-evolution', report.split('permissions:', 1)[0])
        self.assertNotIn('member-watch', report)
        self.assertLess(report.index('Preserve only this run'), report.index('--require-available'))
        self.assertLess(report.index('Commit only the validated'), report.index('--require-available'))

if __name__ == '__main__': unittest.main()
