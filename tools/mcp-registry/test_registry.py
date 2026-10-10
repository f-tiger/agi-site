import importlib.util
import unittest
from pathlib import Path

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


if __name__ == '__main__':
    unittest.main()
