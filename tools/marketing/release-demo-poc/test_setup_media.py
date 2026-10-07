"""Offline safety tests: never install software or fetch external assets."""
import hashlib
import importlib.util
import io
import json
import shutil
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location('setup_media', Path(__file__).with_name('setup_media.py'))
media = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(media)

class Response(io.BytesIO):
    def geturl(self):
        return 'https://github.com/example/model'

class Opener:
    def __init__(self, data): self.data = data
    def open(self, *a, **kw): return Response(self.data)

class Tests(unittest.TestCase):
    def test_reject_unapproved_or_credential_url(self):
        for url in ['http://github.com/a', 'https://evil.example/a', 'https://token@github.com/a']:
            with self.assertRaises(media.GateError): media.validate_url(url)

    def test_empty_expected_hash_rejected_before_network(self):
        with tempfile.TemporaryDirectory(dir=Path(__file__).parent) as d:
            with patch.object(media.urllib.request, 'build_opener') as opener:
                with self.assertRaises(media.GateError):
                    media.fetch('https://github.com/a', Path(d)/'asset', expected_hash='')
                opener.assert_not_called()

    def test_hash_verified_download_and_cache(self):
        data = b'approved-fixture'
        digest = hashlib.sha256(data).hexdigest()
        with tempfile.TemporaryDirectory(dir=Path(__file__).parent) as d:
            path = Path(d)/'asset'
            with patch.object(media.urllib.request, 'build_opener', return_value=Opener(data)):
                self.assertEqual(media.fetch('https://github.com/example/model', path,
                    expected_hash=digest, expected_bytes=len(data)), digest)
            with patch.object(media.urllib.request, 'build_opener') as opener:
                self.assertEqual(media.fetch('https://github.com/example/model', path,
                    expected_hash=digest, expected_bytes=len(data)), digest)
                opener.assert_not_called()
            self.assertFalse(path.with_name('asset.partial').exists())

    def test_bad_download_never_becomes_asset(self):
        with tempfile.TemporaryDirectory(dir=Path(__file__).parent) as d:
            path = Path(d)/'asset'
            with patch.object(media.urllib.request, 'build_opener', return_value=Opener(b'bad')):
                with self.assertRaises(media.GateError):
                    media.fetch('https://github.com/example/model', path, expected_hash='a'*64)
            self.assertFalse(path.exists())
            self.assertFalse(path.with_name('asset.partial').exists())

    def test_runtime_requires_publisher_wheel_record(self):
        class Dist:
            def read_text(self, name): return json.dumps({'url': media.RUNTIME_URL,
                'archive_info': {'hashes': {'sha256': media.RUNTIME_SHA256}}})
        with patch.object(media.md, 'version', side_effect=lambda n: media.PINS[n]):
            with patch.object(media.md, 'distribution', return_value=Dist()):
                self.assertEqual(media.verify_runtime()['wheel_sha256'], media.RUNTIME_SHA256)
            class BadDist:
                def read_text(self, name): return '{}'
            with patch.object(media.md, 'distribution', return_value=BadDist()):
                with self.assertRaises(media.GateError): media.verify_runtime()

    def test_every_binary_has_nonempty_sha_and_size(self):
        self.assertRegex(media.RUNTIME_SHA256, r'^[0-9a-f]{64}$')
        for asset in media.ASSETS:
            self.assertRegex(asset['sha256'], r'^[0-9a-f]{64}$')
            self.assertGreater(asset['bytes'], 0)


    def _notice_fixture(self, root):
        records = []
        for filename, url, marker, normalized_hash in media.ESPEAK_UPSTREAM_NOTICE_SPECS:
            source = Path(__file__).parent / 'test-fixtures' / 'licenses' / filename
            target = root / 'licenses' / 'upstream' / filename
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source, target)
            records.append({'file': str(target.relative_to(root)), 'source_url': url,
                            'sha256': media.sha256(target)})
        return records

    def _missing_loader_license(self):
        return [{'name': 'espeakng-loader', 'version': '0.2.4',
                 'notice_files': [], 'license_metadata': ''}]

    def test_loader_fallback_requires_both_complete_official_notices(self):
        with tempfile.TemporaryDirectory(dir=Path(__file__).parent) as d:
            root = Path(d)
            records = self._notice_fixture(root)
            result = media.validate_primary_license_text(self._missing_loader_license(), records, root)
            self.assertEqual(result[0]['name'], 'espeakng-loader')
            self.assertEqual(len(result[0]['files']), 2)
            for incomplete_records in [[], records[:1], records[1:]]:
                with self.subTest(count=len(incomplete_records)):
                    with self.assertRaises(media.GateError):
                        media.validate_primary_license_text(self._missing_loader_license(), incomplete_records, root)

    def test_loader_fallback_rejects_missing_notice_file(self):
        with tempfile.TemporaryDirectory(dir=Path(__file__).parent) as d:
            root = Path(d)
            records = self._notice_fixture(root)
            (root / records[1]['file']).unlink()
            with self.assertRaises(media.GateError):
                media.validate_primary_license_text(self._missing_loader_license(), records, root)

    def test_loader_fallback_rejects_truncated_text_even_if_record_rehashed(self):
        with tempfile.TemporaryDirectory(dir=Path(__file__).parent) as d:
            root = Path(d)
            records = self._notice_fixture(root)
            path = root / records[1]['file']
            path.write_text('GNU GENERAL PUBLIC LICENSE\nVersion 3, 29 June 2007\n')
            records[1]['sha256'] = media.sha256(path)
            with self.assertRaises(media.GateError):
                media.validate_primary_license_text(self._missing_loader_license(), records, root)

    def test_loader_fallback_rejects_bad_hash_or_wrong_origin(self):
        with tempfile.TemporaryDirectory(dir=Path(__file__).parent) as d:
            root = Path(d)
            records = self._notice_fixture(root)
            for key, bad_value in [('sha256', '0'*64), ('sha256', ''),
                                   ('source_url', 'https://example.org/LICENSE')]:
                altered = [dict(row) for row in records]
                altered[0][key] = bad_value
                with self.subTest(key=key, value=bad_value):
                    with self.assertRaises(media.GateError):
                        media.validate_primary_license_text(self._missing_loader_license(), altered, root)

    def test_notice_exception_does_not_apply_to_other_dependencies(self):
        with tempfile.TemporaryDirectory(dir=Path(__file__).parent) as d:
            root = Path(d)
            records = self._notice_fixture(root)
            inventory = [{'name': 'soundfile', 'version': '0.13.1',
                          'notice_files': [], 'license_metadata': ''}]
            with self.assertRaises(media.GateError):
                media.validate_primary_license_text(inventory, records, root)

    def test_primary_license_does_not_accept_metadata_length(self):
        with tempfile.TemporaryDirectory() as d:
            row = {'name':'soundfile','version':'0.13.1','notice_files':[], 'license_metadata':'x'*1000}
            with self.assertRaises(media.GateError):media.validate_primary_license_text([row], [], Path(d))

    def test_primary_license_file_must_exist_and_match_hash(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);p=root/'licenses/installed/license.txt';p.parent.mkdir(parents=True)
            row={'name':'soundfile','version':'0.13.1','notice_files':[{'file':'installed/license.txt','sha256':'0'*64}], 'license_metadata':''}
            with self.assertRaises(media.GateError):media.validate_primary_license_text([row], [], root)
            p.write_text('Redistribution and use in source and binary forms '+('x'*300))
            with self.assertRaises(media.GateError):media.validate_primary_license_text([row], [], root)
            row['notice_files'][0]['sha256']=media.sha256(p)
            self.assertEqual(media.validate_primary_license_text([row], [], root), [])
            p.write_text('MIT')
            row['notice_files'][0]['sha256']=media.sha256(p)
            with self.assertRaises(media.GateError):media.validate_primary_license_text([row], [], root)

if __name__ == '__main__': unittest.main()
