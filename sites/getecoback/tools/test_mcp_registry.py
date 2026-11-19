import copy
import io
from contextlib import redirect_stdout
import json
from pathlib import Path
from unittest import TestCase, main
from unittest.mock import Mock, patch
from urllib.error import HTTPError, URLError

from check_mcp_registry import OFFICIAL, check, read_latest


MANIFEST = json.loads((Path(__file__).resolve().parents[1] / 'mcp/server.json').read_text())


def listing():
    return {'server': copy.deepcopy(MANIFEST), '_meta': {OFFICIAL: {'status': 'active', 'isLatest': True}}}


class RegistryCheck(TestCase):
    def setUp(self):
        output = redirect_stdout(io.StringIO())
        output.__enter__()
        self.addCleanup(output.__exit__, None, None, None)

    def test_registry_404_json_and_proxy_errors_are_distinguished(self):
        url = 'https://registry.modelcontextprotocol.io/v0.1/servers/example/versions/latest'
        error = HTTPError(url, 404, 'Not Found', {}, io.BytesIO(b'{"title":"Not Found","status":404,"detail":"Server not found"}'))
        with patch('check_mcp_registry.urlopen', side_effect=error):
            self.assertIsNone(read_latest(url))
        proxy = HTTPError(url, 404, 'Not Found', {}, io.BytesIO(b'unavailable'))
        with patch('check_mcp_registry.urlopen', side_effect=proxy), self.assertRaises(ValueError):
            read_latest(url)
        self.assertFalse(check(MANIFEST, False, Mock(side_effect=[None, URLError('offline'), URLError('offline')]), Mock()))

    def test_active_canonical_name_version_endpoint_and_exact_query(self):
        read = Mock(return_value=listing())
        self.assertTrue(check(MANIFEST, True, read, Mock()))
        read.assert_called_once_with('https://registry.modelcontextprotocol.io/v0.1/servers/io.github.f-tiger%2Fhvac-btu-heat-klimaanlage/versions/latest')

    def test_deploy_accepts_active_prior_version_and_release_waits_for_new_version(self):
        old = listing()
        old['server']['version'] = '0.0.1'
        self.assertTrue(check(MANIFEST, False, Mock(return_value=old), Mock()))
        self.assertFalse(check(MANIFEST, True, Mock(return_value=old), Mock()))
        reader = Mock(side_effect=[None, old, listing()])
        self.assertTrue(check(MANIFEST, True, reader, Mock()))
        self.assertEqual(reader.call_count, 3)

    def test_absent_superseded_deprecated_inactive_latest_or_wrong_remote_cannot_pass(self):
        wrong_name, deprecated, stale, wrong_remote = (listing() for _ in range(4))
        wrong_name['server']['name'] = 'io.github.f-tiger/getecoback-climate-weather'
        deprecated['_meta'][OFFICIAL]['status'] = 'deprecated'
        stale['_meta'][OFFICIAL]['isLatest'] = False
        wrong_remote['server']['remotes'][0]['url'] = 'https://getecoback.com/mcp-old'
        for payload in (None, wrong_name, deprecated, stale, wrong_remote):
            for release in (False, True):
                with self.subTest(payload=payload, release=release):
                    self.assertFalse(check(MANIFEST, release, Mock(return_value=payload), Mock()))

    def test_unavailable_or_unknown_payload_is_a_warning_only_on_deploy(self):
        for reader in (Mock(side_effect=URLError('offline')), Mock(return_value={'unexpected': True})):
            self.assertTrue(check(MANIFEST, False, reader, Mock()))
            self.assertFalse(check(MANIFEST, True, reader, Mock()))


if __name__ == '__main__':
    main()
