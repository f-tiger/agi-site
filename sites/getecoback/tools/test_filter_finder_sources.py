import copy
import json
from pathlib import Path
import unittest
import urllib.error

from refresh_filter_finder import DATA, SOURCE_BINDINGS, digest, evaluate_payload, refresh_document, validate_document


class FilterSourceTests(unittest.TestCase):
    def setUp(self):
        self.doc = json.loads(DATA.read_text())
        self.payloads = {}
        for item in self.doc['items']:
            # A deliberately small official-shaped fixture; never network data.
            part = '<p>' + item['part_number'] + '</p>' if item['part_number'] else ''
            description = '<p>' + item['compatibility_statement'] + '</p>' + part
            item['approved_description_sha256'] = digest(description)
            item['status'] = 'verified'
            item['checked_at'] = item['last_good_checked_at'] = '2026-10-31'
            self.payloads[item['source_product_json']] = {
                'handle': SOURCE_BINDINGS[item['id']][0], 'title': item['approved_title'],
                'description': description, 'variants': [{'sku': item['merchant_sku']}],
            }

    def fetch(self, url, timeout):
        return copy.deepcopy(self.payloads[url])

    def test_committed_contract_and_ten_exact_models(self):
        document = json.loads(DATA.read_text())
        validate_document(document)
        self.assertEqual(sum(len(i['models']) for i in document['items']), 10)
        self.assertFalse(any('300' in m or '600' in m for i in document['items'] for m in i['models']))

    def test_unchanged_sources_update_only_verification_date(self):
        result = refresh_document(self.doc, self.fetch, '2026-11-01', pause=0)
        self.assertEqual(result['updated'], self.doc['updated'])
        self.assertTrue(all(i['status'] == 'verified' and i['checked_at'] == '2026-11-01' for i in result['items']))

    def test_recommendation_navigation_cannot_supply_compatibility(self):
        item = self.doc['items'][0]
        payload = self.fetch(item['source_product_json'], 1)
        payload['description'] = '<p>Generic replacement filter</p>'
        payload['recommendations'] = item['compatibility_statement']
        self.assertEqual(evaluate_payload(item, payload)[0], 'conflict')

    def test_removing_p_suffix_is_not_an_alias(self):
        item = self.doc['items'][0]
        payload = self.fetch(item['source_product_json'], 1)
        payload['description'] = payload['description'].replace('200S-P', '200S')
        self.assertEqual(evaluate_payload(item, payload)[0], 'conflict')

    def test_added_conflicting_model_fails_even_with_original_statement(self):
        item = self.doc['items'][0]
        payload = self.fetch(item['source_product_json'], 1)
        payload['description'] += '<p>Also compatible with Core 300S-P.</p>'
        self.assertEqual(evaluate_payload(item, payload), ('conflict', 'description_changed_review_required'))

    def test_sku_or_extra_variant_change_fails(self):
        item = self.doc['items'][0]
        for variants in ([{'sku': 'CHANGED'}], [{'sku': item['merchant_sku']}, {'sku': 'ANOTHER'}]):
            payload = self.fetch(item['source_product_json'], 1)
            payload['variants'] = variants
            self.assertEqual(evaluate_payload(item, payload)[0], 'conflict')

    def test_handle_or_title_substitution_fails(self):
        item = self.doc['items'][0]
        for key in ('handle', 'title'):
            payload = self.fetch(item['source_product_json'], 1)
            payload[key] = 'Another product'
            self.assertEqual(evaluate_payload(item, payload)[0], 'conflict')

    def test_empty_and_structurally_invalid_payload_fail_closed(self):
        item = self.doc['items'][0]
        for payload in (None, [], {}, {'description': '', 'variants': []}):
            self.assertEqual(evaluate_payload(item, payload)[0], 'unavailable')

    def test_rate_limit_preserves_last_good_and_disables_verified(self):
        def limited(url, timeout):
            raise urllib.error.HTTPError(url, 429, 'Too many requests', {}, None)
        result = refresh_document(self.doc, limited, '2026-11-01', pause=0)
        self.assertEqual(result['updated'], self.doc['updated'])
        for item in result['items']:
            self.assertEqual(item['status'], 'unavailable')
            self.assertEqual(item['verification_reason'], 'rate_limited')
            self.assertEqual(item['checked_at'], '2026-10-31')
            self.assertEqual(item['last_good_checked_at'], '2026-10-31')

    def test_network_error_is_a_degraded_result_not_an_exception(self):
        for error in (TimeoutError('timeout'), urllib.error.URLError('network'), ValueError('invalid JSON')):
            def failed(url, timeout):
                raise error
            result = refresh_document(self.doc, failed, '2026-11-01', pause=0)
            self.assertTrue(all(i['status'] == 'unavailable' for i in result['items']))

    def test_source_and_identity_local_changes_are_build_errors(self):
        for field, value in (('source_product_json', 'https://example.com/data.js'), ('merchant_sku', 'BAD'), ('models', ['Core 200S'])):
            modified = copy.deepcopy(self.doc)
            modified['items'][0][field] = value
            with self.assertRaises(ValueError):
                refresh_document(modified, self.fetch, pause=0)

    def test_request_count_is_nine_and_timeout_is_bounded(self):
        calls = []
        def counted(url, timeout):
            calls.append((url, timeout))
            return self.fetch(url, timeout)
        refresh_document(self.doc, counted, pause=0)
        self.assertEqual(len(calls), 9)
        self.assertEqual(len(set(u for u, _ in calls)), 9)
        self.assertTrue(all(0 < timeout <= 6 for _, timeout in calls))

    def test_total_deadline_skips_remaining_requests(self):
        times = iter([0] + [61] * 20)
        def unexpected(url, timeout):
            self.fail('No request should start after deadline')
        result = refresh_document(self.doc, unexpected, pause=0, clock=lambda: next(times))
        self.assertTrue(all(i['verification_reason'] == 'total_deadline_exceeded' for i in result['items']))

    def test_last_good_can_recover_without_changing_facts(self):
        self.doc['items'][0]['status'] = 'unavailable'
        result = refresh_document(self.doc, self.fetch, '2026-11-02', pause=0)
        self.assertEqual(result['items'][0]['status'], 'verified')
        self.assertEqual(result['items'][0]['models'], ['Core 200S-P'])
        self.assertEqual(result['updated'], self.doc['updated'])

    def test_fresh_build_baseline_does_not_advance_or_reverse_catalog_date(self):
        def failed(url, timeout):
            raise TimeoutError('network failure')
        first = refresh_document(self.doc, failed, '2026-11-01', pause=0)
        next_build = refresh_document(self.doc, failed, '2026-11-02', pause=0)
        recovered = refresh_document(self.doc, self.fetch, '2026-11-03', pause=0)
        self.assertEqual({d['updated'] for d in (first, next_build, recovered)}, {self.doc['updated']})
        self.assertEqual(next_build['items'][0]['last_good_checked_at'], '2026-10-31')
        self.assertEqual(recovered['items'][0]['checked_at'], '2026-11-03')


if __name__ == '__main__':
    unittest.main()
