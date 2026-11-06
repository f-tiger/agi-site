import copy
import datetime as dt
import unittest
from unittest.mock import Mock, patch

import build_manifest
import google_ga4 as ga
from audit_tags import inspect_html
from report import pair, render_ga4


class GoogleTests(unittest.TestCase):
    def test_property_timezone_dates_and_dst(self):
        instant = dt.datetime(2026, 11, 6, 1, 0, tzinfo=dt.timezone.utc)
        self.assertEqual(ga.windows(instant, 'Asia/Shanghai')['yesterday'], '2026-11-05')
        dates = ga.windows(instant, 'America/Los_Angeles')
        self.assertEqual(dates['yesterday'], '2026-11-04')
        self.assertEqual(dates['last7'], {'startDate': '2026-10-29', 'endDate': '2026-11-04', 'name': 'last7'})
        self.assertEqual(dates['previous7']['endDate'], '2026-10-28')

    def test_weekly_users_requested_independently_and_events_separate(self):
        reader = Mock()
        reader.report.return_value = {'status': 'success', 'rows': []}
        dates = ga.windows(dt.datetime.now(dt.timezone.utc), 'UTC')
        ga.query_set(reader, '123', dates)
        requests = [c.args[1] for c in reader.report.call_args_list]
        self.assertEqual(requests[0]['dimensions'], [{'name': 'date'}, {'name': 'hostName'}])
        self.assertEqual(requests[1]['dimensions'], [{'name': 'hostName'}])
        self.assertEqual([r['name'] for r in requests[1]['dateRanges']], ['previous7', 'last7'])
        self.assertEqual(requests[2]['metrics'], [{'name': 'eventCount'}])
        self.assertNotIn('pageLocation', str(requests))
        self.assertNotIn('userId', str(requests))

    def test_partial_report_does_not_erase_valid_core(self):
        reader = Mock()
        reader.report.side_effect = [{'status': 'success', 'rows': [{'hostName': 'example.test'}]}, ga.ReadFailure('google_http_403_PERMISSION_DENIED'), {'status': 'success', 'rows': []}]
        dates = ga.windows(dt.datetime.now(dt.timezone.utc), 'UTC')
        result = ga.query_set(reader, '123', dates)
        self.assertEqual(result['daily']['status'], 'success')
        self.assertEqual(result['weekly']['status'], 'failure')
        self.assertEqual(result['events']['status'], 'success')

    def reader(self):
        return object.__new__(ga.GoogleReader)

    def test_only_readonly_api_allowlist(self):
        reader = self.reader()
        reader.session = Mock()
        for api, path, body in [(ga.ADMIN, 'properties/123', {}), (ga.ADMIN, 'properties/123/accessBindings', None),
                ('https://evil.invalid/', 'properties/123', None), (ga.DATA, 'properties/123:runRealtimeReport', {}),
                (ga.DATA, 'properties/123/../../evil:runReport', {})]:
            with self.subTest(path=path), self.assertRaises(ga.ReadFailure):
                reader.request(api, path, body)
        reader.session.request.assert_not_called()

    def test_errors_are_sanitized_and_redirects_are_not_followed(self):
        reader = self.reader()
        reader.session = Mock()
        reader.session.request.return_value.status_code = 403
        reader.session.request.return_value.json.return_value = {'error': {'status': 'PERMISSION_DENIED', 'message': 'sensitive@example.test token-secret'}}
        with self.assertRaisesRegex(ga.ReadFailure, '^google_http_403_PERMISSION_DENIED$'):
            reader.request(ga.ADMIN, 'properties/123')
        self.assertFalse(reader.session.request.call_args.kwargs['allow_redirects'])
        reader.session.request.side_effect = Exception('credential-token-secret')
        with self.assertRaisesRegex(ga.ReadFailure, '^google_auth_or_transport_failed$'):
            reader.request(ga.ADMIN, 'properties/123')

    @staticmethod
    def page(hosts, count):
        return {'dimensionHeaders': [{'name': 'hostName'}], 'metricHeaders': [{'name': 'activeUsers'}],
            'rowCount': count, 'rows': [{'dimensionValues': [{'value': h}], 'metricValues': [{'value': '2'}]} for h in hosts],
            'metadata': {'subjectToThresholding': True}, 'propertyQuota': {'tokensPerDay': {'consumed': 1}}}

    def test_pagination_preserves_quality_flags_and_does_not_truncate(self):
        reader = self.reader()
        reader.request = Mock(side_effect=[self.page(['a', 'b'], 3), self.page(['c'], 3)])
        with patch.object(ga, 'PAGE_SIZE', 2), patch.object(ga, 'MAX_ROWS', 10):
            result = reader.report('123', {})
        self.assertEqual(len(result['rows']), 3)
        self.assertEqual(reader.request.call_args.args[2]['offset'], '2')
        self.assertTrue(result['pages'][0]['metadata']['subjectToThresholding'])
        reader.request = Mock(return_value=self.page(['a', 'b'], 20))
        with patch.object(ga, 'PAGE_SIZE', 2), patch.object(ga, 'MAX_ROWS', 2), self.assertRaisesRegex(ga.ReadFailure, 'truncated'):
            reader.report('123', {})

    def test_changed_report_during_pagination_is_failure(self):
        reader = self.reader()
        reader.request = Mock(side_effect=[self.page(['a', 'b'], 3), self.page(['c'], 4)])
        with patch.object(ga, 'PAGE_SIZE', 2), self.assertRaisesRegex(ga.ReadFailure, 'changed_during_pagination'):
            reader.report('123', {})

    def test_listing_pagination(self):
        reader = self.reader()
        reader.request = Mock(side_effect=[{'accountSummaries': [1], 'nextPageToken': 'abc'}, {'accountSummaries': [2]}])
        self.assertEqual(reader.listing('accountSummaries', 'accountSummaries'), [1, 2])
        self.assertEqual(reader.request.call_args.kwargs['params']['pageToken'], 'abc')

    def test_missing_credentials_preserves_every_fleet_site_and_alias(self):
        manifest = build_manifest.build()
        with patch.object(ga, 'GoogleReader', side_effect=ga.ReadFailure('google_readonly_credentials_missing_or_invalid')):
            result = ga.collect_ga4(manifest)
        self.assertEqual(len(result['properties']), 8)
        self.assertEqual(len(result['sites']), 58)
        self.assertTrue(all(s['status'] in ('failure', 'unmapped') for s in result['sites']))
        text = render_ga4(result)
        self.assertIn('未知', text)
        self.assertIn('intersolar-booth-scout.netlify.app', text)
        self.assertNotIn('0 → 0', text)

    def test_known_properties_read_even_if_discovery_is_denied(self):
        manifest = build_manifest.build()
        reader = Mock()
        reader.listing.side_effect = ga.ReadFailure('google_http_403_PERMISSION_DENIED')
        reader.request.return_value = {'timeZone': 'UTC'}
        reader.report.return_value = {'status': 'success', 'rows': [], 'pages': []}
        result = ga.collect_ga4(manifest, reader)
        self.assertEqual(result['discovery']['status'], 'failure')
        self.assertEqual(sum(p['status'] == 'success' for p in result['properties'].values()), 8)
        self.assertTrue(all(s['status'] in ('no_rows_returned', 'unmapped') for s in result['sites']))

    def test_shared_hosts_aliases_and_unknown_hosts_are_not_merged(self):
        manifest = build_manifest.build()
        reader = Mock()
        reader.listing.return_value = []
        reader.request.return_value = {'timeZone': 'UTC'}
        def reports(pid, body):
            rows = [{'hostName': 'agiscorecard.com', 'activeUsers': 5}, {'hostName': 'goldrush.agiscorecard.com', 'activeUsers': 2},
                    {'hostName': 'new.agiscorecard.com', 'activeUsers': 3}] if pid == '541489054' else []
            return {'status': 'success', 'rows': rows}
        reader.report.side_effect = reports
        result = ga.collect_ga4(manifest, reader)
        gold = next(s for s in result['sites'] if s['hostname'] == 'goldrush.agiscorecard.com')
        self.assertEqual(gold['reports']['daily']['rows'][0]['activeUsers'], 2)
        self.assertEqual(result['observed_unmapped'][0]['hostname'], 'new.agiscorecard.com')
        compass = next(s for s in result['sites'] if s['hostname'] == 'compass.agiscorecard.com')
        self.assertEqual(compass['status'], 'unmapped')

    def test_listinglift_always_has_its_page_path_boundary(self):
        manifest = build_manifest.build()
        reader = Mock()
        reader.listing.return_value = []
        reader.request.return_value = {'timeZone': 'UTC'}
        reader.report.return_value = {'status': 'success', 'rows': []}
        ga.collect_ga4(manifest, reader)
        filtered = [c.args[1] for c in reader.report.call_args_list if 'dimensionFilter' in c.args[1]]
        self.assertEqual(len(filtered), 3)
        for body in filtered:
            self.assertEqual(body['dimensionFilter'], ga.path_filter('f-tiger.github.io', '/smarterFuture/launch/ai-realtor/'))

    def test_zero_and_missing_are_distinct(self):
        self.assertEqual(ga.comparison(4, 0)['note'], 'new')
        self.assertIsNone(ga.comparison(0, None)['difference'])
        self.assertEqual(ga.comparison(6, 3)['percent'], 100)
        self.assertIn('未知 → 0', pair(None, {'activeUsers': 0}, 'activeUsers'))
        self.assertIn('新增', pair({'activeUsers': 0}, {'activeUsers': 2}, 'activeUsers'))

    def test_tag_detection_does_not_count_jsonld_or_comments_as_tags(self):
        self.assertEqual(inspect_html('<!-- G-AAAAAAAAAA -->')['status'], 'no_visible_tag')
        self.assertEqual(inspect_html('<script type="application/ld+json">"G-AAAAAAAAAA"</script>')['status'], 'no_visible_tag')
        script = '<script src="/analytics-assets/consent.mjs" data-ga4-id="G-AAAAAAAAAA"></script>'
        self.assertEqual(inspect_html(script, 'G-AAAAAAAAAA')['status'], 'tag_present_not_backend_verified')
        self.assertEqual(inspect_html(script * 2, 'G-AAAAAAAAAA')['status'], 'possible_duplicate_loaders')
        self.assertEqual(inspect_html(script, 'G-BBBBBBBBBB')['status'], 'wrong_measurement_id')


if __name__ == '__main__':
    unittest.main()
