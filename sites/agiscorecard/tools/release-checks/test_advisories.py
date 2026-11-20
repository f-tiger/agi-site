import unittest

from advisories import matches_range, SOURCES, update_source

SOURCE = SOURCES[0]
STAMP = '2026-11-20T14:00:00Z'
EARLIER = '2026-11-19T12:00:00Z'
RELEASES = [{'version': '1.12.0'}, {'version': '2.0.0'}]


def record():
    ident = 'GHSA-w5fx-fh39-j5rw'
    return {'ghsa_id': ident, 'state': 'published', 'severity': 'high', 'published_at': EARLIER,
            'html_url': f'https://github.com/openai/codex/security/advisories/{ident}',
            'description': 'do not publish source body', 'vulnerabilities': [
                {'package': {'ecosystem': 'npm', 'name': '@openai/codex'},
                 'vulnerable_version_range': '>= 1.10.0, < 1.13.0', 'patched_versions': '1.13.0'}]}


def snapshot(rows, old=None, more=False):
    return update_source(SOURCE, RELEASES, old or {}, STAMP, lambda repo, page: (rows, more))


class AdvisoryTests(unittest.TestCase):
    def test_numeric_comparison_and_unknown(self):
        for expr, result in [
            ('>= 1.9.0, < 1.13.0', True), ('> 1.12.0', False), ('<v1.12.1', True),
            ('1.12.0', True), ('<1.0.0 || >=1.12.0', True), ('> 1.9.0 < 2.0.0', True),
            ('0.2.0 <= 0.38.0', None), ('^1.0.0', None), ('< 1.12.0-beta', None),
            ('>= 1.0.0 garbage', None), ('<2.0.0 || ', None), ('1.x', None),
            ('1.12.0 - 1.14.0', None), ('<1.0.0,', None), ('<1.1.1<2.2.2', None),
        ]:
            with self.subTest(expr=expr):
                self.assertIs(matches_range('1.12.0', expr), result)

    def test_exact_source_and_package_no_prose(self):
        baseline = snapshot([record()])
        self.assertEqual(baseline['versions']['1.12.0']['status'], 'affected')
        self.assertEqual(baseline['versions']['2.0.0']['status'], 'no_match')
        self.assertNotIn('do not publish', str(baseline))
        row = record()
        row['vulnerabilities'][0]['package']['ecosystem'] = 'other'
        self.assertEqual(snapshot([row])['advisories'], [])
        row = record()
        row['html_url'] = 'https://elsewhere.example/'
        self.assertEqual(snapshot([row])['status'], 'unavailable')
        row = record()
        row['vulnerabilities'][0]['vulnerable_version_range'] = 'Arbitrary prose'
        result = snapshot([row])
        self.assertNotIn('Arbitrary prose', str(result))
        self.assertEqual(result['versions']['2.0.0']['status'], 'unknown')

    def test_failed_or_partial_refresh_retains_last_good_and_marks_unknown(self):
        old = snapshot([record()])
        old['lastSuccessAt'] = EARLIER

        def fail(repo, page):
            raise OSError()
        for load, expected in [(fail, 'unavailable'),
                               (lambda repo, page: ([dict(record(), vulnerabilities=[{
                                   'package': {'ecosystem': 'npm', 'name': 'other'}}])], True), 'partial')]:
            result = update_source(SOURCE, RELEASES, old, STAMP, load)
            self.assertEqual(result['status'], expected)
            self.assertEqual(result['lastSuccessAt'], EARLIER)
            self.assertEqual(result['advisories'], old['advisories'])
            self.assertTrue(all(row['status'] == 'unknown' for row in result['versions'].values()))

    def test_github_reviewed_bounds_require_shared_package_repo_id_and_fix(self):
        raw = record()
        raw['vulnerabilities'][0].update(vulnerable_version_range='0.2.0 <= 0.38.0', patched_versions='0.39.0')
        value = {'type': 'reviewed', 'withdrawn_at': None, 'ghsa_id': raw['ghsa_id'], 'github_reviewed_at': EARLIER,
                 'html_url': 'https://github.com/advisories/' + raw['ghsa_id'], 'source_code_location': 'https://github.com/openai/codex',
                 'vulnerabilities': [{'package': {'ecosystem': 'npm', 'name': '@openai/codex'},
                                      'vulnerable_version_range': '>= 0.2.0, <= 0.38.0', 'first_patched_version': '0.39.0'}]}
        releases = [{'version': v} for v in ('0.1.0', '0.38.0', '0.171.0')]
        def check(review):
            return update_source(SOURCE, releases, {}, STAMP, lambda repo, page: ([raw], False), lambda ident: review)
        good = check(value)
        self.assertEqual([x['status'] for x in good['versions'].values()], ['no_match', 'affected', 'no_match'])
        self.assertEqual(good['advisories'][0]['reviewedUrl'], value['html_url'])
        ranged = good['advisories'][0]['ranges'][0]
        self.assertEqual(ranged['affected'], '0.2.0 <= 0.38.0')
        self.assertEqual(ranged['reviewedAffected'], '>= 0.2.0, <= 0.38.0')
        for wrong in [dict(value, type='unreviewed'), dict(value, withdrawn_at=STAMP),
                      dict(value, ghsa_id='other'), dict(value, source_code_location='https://github.com/other/codex'),
                      dict(value, vulnerabilities=[dict(value['vulnerabilities'][0], package={'name': 'wrong'})]),
                      dict(value, vulnerabilities=[dict(value['vulnerabilities'][0], first_patched_version='0.50.0')]),
                      dict(value, vulnerabilities=[dict(value['vulnerabilities'][0], vulnerable_version_range='<= 9.0.0')])]:
            with self.subTest(wrong=wrong):
                self.assertEqual(check(wrong)['versions']['0.171.0']['status'], 'unknown')

    def test_successful_complete_refresh_supersedes_withdrawals(self):
        result = snapshot([dict(record(), withdrawn_at=STAMP)], snapshot([record()]))
        self.assertEqual(result['advisories'], [])
        self.assertEqual(result['versions']['1.12.0']['status'], 'no_match')


if __name__ == '__main__':
    unittest.main()
