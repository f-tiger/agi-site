import unittest
from datetime import datetime, timezone
from check_web3_snapshot import check


class SnapshotTests(unittest.TestCase):
    now = datetime(2026, 9, 27, 8, tzinfo=timezone.utc)

    def report(self, at='2026-09-27T07:00:00Z', ok=True):
        return {'asOf': at, 'ok': ok, 'checks': [{'name': 'source', 'ok': ok}]}

    def test_current_failed_audit_is_valid_evidence(self):
        self.assertEqual(check(self.report(ok=False), self.now), 3600)

    def test_previous_run_cannot_be_uploaded_as_current(self):
        with self.assertRaisesRegex(ValueError, 'predates'):
            check(self.report(), self.now, since='2026-09-27T07:59:00Z')

    def test_stale_and_future_reports_fail(self):
        for at in ['2026-09-24T07:00:00Z', '2026-09-27T08:02:00Z']:
            with self.assertRaises(ValueError):
                check(self.report(at), self.now)

    def test_incomplete_and_naive_reports_fail(self):
        for report in [{}, {'asOf': '2026-09-27T07:00:00Z'}, self.report('2026-09-27T07:00:00')]:
            with self.assertRaises((KeyError, ValueError)):
                check(report, self.now)


if __name__ == '__main__':
    unittest.main()
