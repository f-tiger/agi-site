import importlib.util
import json
import unittest
from pathlib import Path
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('registry', Path(__file__).with_name('registry.py'))
registry = importlib.util.module_from_spec(spec)
spec.loader.exec_module(registry)


class ReceiptTests(unittest.TestCase):
    def setUp(self):
        self.manifest = {'name': 'io.github.f-tiger/example', 'version': '1.0.0', 'description': 'Example', 'remotes': [{'type': 'streamable-http', 'url': 'https://example.test/mcp'}]}

    def receipt(self, **overrides):
        return {'server': {**self.manifest, **overrides}, '_meta': {'io.modelcontextprotocol.registry/official': {'status': 'active'}}}

    def test_exact_version_url_encodes_namespace(self):
        self.assertIn('io.github.f-tiger%2Fexample/versions/1.0.0', registry.receipt_url(self.manifest))

    def test_wrong_endpoint_is_not_a_successful_registration(self):
        with self.assertRaises(ValueError):
            registry.verify_receipt(self.manifest, self.receipt(remotes=[{'type': 'streamable-http', 'url': 'https://other.test/mcp'}]))

    def test_missing_inactive_and_wrong_version_fail(self):
        for receipt in (None, self.receipt(version='0.9.0'), {'server': self.manifest, '_meta': {}}):
            with self.assertRaises(ValueError):
                registry.verify_receipt(self.manifest, receipt)

    def test_package_content_hash_must_match(self):
        package = {'registryType': 'mcpb', 'identifier': 'https://example.test/a.mcpb', 'fileSha256': 'a' * 64, 'transport': {'type': 'stdio'}}
        self.manifest.update(remotes=[], packages=[package])
        registry.verify_receipt(self.manifest, self.receipt())
        with self.assertRaises(ValueError):
            registry.verify_receipt(self.manifest, self.receipt(packages=[{**package, 'fileSha256': 'b' * 64}]))


class RemoteTests(unittest.TestCase):
    def setUp(self):
        self.bpj = {'name': registry.BPJ_AI_NAME, 'version': '0.5.2',
                    'remotes': [{'type': 'streamable-http', 'url': registry.BPJ_AI_ENDPOINT}]}

    def responses(self, version, **provisional):
        def result(status, missing, floor, **fields):
            return {'structuredContent': {'incoterm': 'CIF', 'quoteCurrency': 'USD',
                                          'minimumUnitPrice': floor,
                                          'costCompleteness': {'status': status, 'missing': missing}, **fields}}

        return [
            {'result': {'serverInfo': {'name': 'bpj-ai-tools', 'version': version}}},
            {'result': {'tools': [{'name': 'list_bpj_ai_tools'}]}},
            {'jsonrpc': '2.0', 'id': 3, 'result': result('costs_entered', [], 8.12)},
            {'jsonrpc': '2.0', 'id': 4,
             'result': result('provisional', ['freight', 'insurance'], 7.34, **provisional)},
        ]

    def test_bpj_uses_two_fixed_qa_marked_cif_calls(self):
        with patch.object(registry, 'request_json', side_effect=self.responses('0.5.2')) as fetch:
            registry.verify_remote(self.bpj)
        calls = [call.args for call in fetch.call_args_list]
        self.assertEqual([payload['method'] for _, payload in calls], ['initialize', 'tools/list', 'tools/call', 'tools/call'])
        fees = []
        for url, payload in calls[2:]:
            self.assertEqual(url, registry.BPJ_AI_ENDPOINT + '?__probe=1')
            self.assertEqual(payload['params']['name'], 'bpj_trade_export_quote')
            self.assertEqual(payload['params']['arguments']['incoterm'], 'CIF')
            fees.append(json.loads(payload['params']['arguments']['sellerFees']))
        self.assertEqual([line['kind'] for line in fees[0][2:]], ['freight', 'insurance'])
        self.assertEqual(fees[1], fees[0][:2])

    def test_quote_probe_scope_and_version_threshold(self):
        for name, version in [(registry.BPJ_AI_NAME, '0.5.1'), (registry.BPJ_AI_NAME, '0.5.2-rc.1'),
                              ('io.github.f-tiger/example', '9.0.0')]:
            with self.subTest(name=name, version=version):
                manifest = {**self.bpj, 'name': name, 'version': version}
                with patch.object(registry, 'request_json', side_effect=self.responses(version)) as fetch:
                    registry.verify_remote(manifest)
                    self.assertEqual(fetch.call_count, 2)
        for version in ['0.5.2', '0.5.2+fixture', '0.5.10', '1.0.0']:
            self.assertTrue(registry.requires_bpj_quote_probe({**self.bpj, 'version': version}))

    def test_registry_smoke_fails_closed_for_old_or_incorrect_production(self):
        with patch.object(registry, 'request_json', side_effect=self.responses('0.5.1')) as fetch:
            with self.assertRaisesRegex(ValueError, 'Live version does not match'):
                registry.verify_remote(self.bpj)
            self.assertEqual(fetch.call_count, 1)
        with patch.object(registry, 'request_json', side_effect=self.responses('0.5.2', costCompleteness=None)):
            with self.assertRaisesRegex(ValueError, 'synthetic CIF contract mismatch: provisional'):
                registry.verify_remote(self.bpj)
        with patch.object(registry, 'request_json') as fetch:
            with self.assertRaisesRegex(ValueError, 'canonical free MCP endpoint'):
                registry.verify_remote({**self.bpj, 'remotes': [{'url': 'https://elsewhere.test/mcp'}]})
            fetch.assert_not_called()


if __name__ == '__main__':
    unittest.main()
