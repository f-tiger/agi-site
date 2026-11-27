import unittest
from unittest.mock import patch

import primary_audit as audit


class PrimaryAuditTests(unittest.TestCase):
    def test_committed_inventory_covers_nine_canonical_servers(self):
        sites = audit.load_inventory()
        self.assertEqual(set(sites), {'agiscorecard', 'baipiaoji', 'getecoback', 'thedollscout'})
        self.assertEqual(sum(len(entry['servers']) for entry in sites.values()), 9)
        self.assertEqual(len(sites['getecoback']['legacy_aliases']), 2)

    def test_legacy_propagates_negotiated_version_and_session(self):
        def reply(ident, result):
            return {'jsonrpc': '2.0', 'id': ident, 'result': result}

        init = reply(1, {'protocolVersion': '2025-06-18', 'serverInfo': {'version': '1.2.3'}})
        listing = reply(2, {'tools': [{'name': 'example'}]})
        with patch.object(audit, 'request', side_effect=[(init, {'Mcp-Session-Id': 'fixture'}), (None, {}), (listing, {})]) as probe:
            self.assertEqual(audit.legacy_metadata('https://example.test/mcp'), ('1.2.3', '2025-06-18'))
        _, notification, headers = probe.call_args_list[1].args
        self.assertNotIn('id', notification)
        self.assertEqual(headers, {'MCP-Protocol-Version': '2025-06-18', 'Mcp-Session-Id': 'fixture'})
        self.assertEqual(probe.call_args_list[1].kwargs, {'expected_status': 202})

    def test_legacy_success_cannot_hide_registry_version_drift(self):
        entry = {'name': 'io.github.f-tiger/example', 'url': 'https://example.test/mcp'}
        with patch.object(audit, 'legacy_metadata', return_value=('0.2.0', '2025-11-25')), \
                patch.object(audit, 'registry_record', return_value=('1.0.0', 'active')), \
                patch.object(audit, 'modern_metadata') as modern:
            with self.assertRaisesRegex(ValueError, 'differs from live'):
                audit.audit_server(entry)
            self.assertIn('legacy alias', audit.audit_server(entry, legacy_alias=True))
            modern.assert_not_called()

    def test_modern_probe_rejects_legacy_result_and_wrong_cache_policy(self):
        server = {audit.NAMESPACE + 'serverInfo': {'version': '1.2.3'}}
        discover = {'jsonrpc': '2.0', 'id': 'server/discover', 'result': {'resultType': 'complete', '_meta': server}}
        data = {'resultType': 'complete', 'ttlMs': 0, 'cacheScope': 'private', 'tools': [{'name': 'fixture'}]}
        listing = {'jsonrpc': '2.0', 'id': 'tools/list', 'result': data}
        mismatch = {'jsonrpc': '2.0', 'id': 3, 'error': {'code': -32020}}
        with patch.object(audit, 'request', side_effect=[(discover, {}), (listing, {}), (mismatch, {})]):
            audit.modern_metadata('https://example.test/mcp', '1.2.3')
        for changed in ({'tools': data['tools']}, {**data, 'cacheScope': 'unknown'}):
            with patch.object(audit, 'request', side_effect=[(discover, {}), ({**listing, 'result': changed}, {})]):
                with self.assertRaises(ValueError):
                    audit.modern_metadata('https://example.test/mcp', '1.2.3')

    def test_string_and_integer_ids_are_not_interchangeable(self):
        with self.assertRaises(ValueError):
            audit.result({'jsonrpc': '2.0', 'id': 3, 'result': {}}, '3')


if __name__ == '__main__':
    unittest.main()
