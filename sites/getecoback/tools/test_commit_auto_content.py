#!/usr/bin/env python3
"""Real isolated Git remotes exercise the automatic publication transaction."""
import contextlib
import io
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

import commit_auto_content as publish


class CommitAutoContentTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='eco-content-commit-')
        self.base = Path(self.tmp.name)
        self.repo = self.base / 'work'
        self.repo.mkdir()
        self.remote = self.base / 'remote.git'
        self.git('init', '--bare', str(self.remote))
        self.git('init', '-b', 'main')
        self.git('config', 'user.name', 'Fixture')
        self.git('config', 'user.email', 'fixture@example.invalid')
        self.git('remote', 'add', 'origin', str(self.remote))
        self.route = '/guide/verified-scenario.html'
        self.html_path = publish.SITE + self.route
        self.write('other-generated.html', 'previous generated output\n')
        self.write(publish.PREFIX + 'data/auto-content.json', {'pages': {}})
        self.write(publish.PREFIX + 'data/auto-content-ledger.json', {'pages': {}})
        self.git('add', '.')
        self.git('commit', '-m', 'baseline')
        self.git('push', '-u', 'origin', 'main')
        self.before = self.git('rev-parse', 'HEAD')
        self.receipt = self.base / 'publication.json'
        self.env_file = self.base / 'env'
        self.output_file = self.base / 'output'
        self.env = {'GITHUB_ENV': str(self.env_file), 'GITHUB_OUTPUT': str(self.output_file)}
        self.draft()

    def tearDown(self):
        self.tmp.cleanup()

    def git(self, *args, cwd=None):
        result = subprocess.run(['git', *args], cwd=cwd or self.repo, capture_output=True, text=True)
        if result.returncode:
            raise AssertionError(result.stdout + result.stderr)
        return result.stdout.strip()

    def write(self, name, value):
        path = self.repo / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(value) + '\n' if isinstance(value, (dict, list)) else value, encoding='utf-8')

    def draft(self):
        self.write(publish.PREFIX + 'data/auto-content.json', {'pages': {self.route: {'name': 'Verified scenario'}}})
        self.write(publish.PREFIX + 'data/auto-content-ledger.json', {'pages': {self.route: {'source_id': 'fixture'}}})
        self.write(self.html_path, '<html><head><link rel="canonical" href="' + publish.BASE + self.route + '"></head><body>' + publish.MARKER + '<h1>Verified scenario</h1></body></html>')
        self.payload = {'schema_version': 1, 'before_sha': self.before, 'changed': True,
                        'paths': sorted(publish.DATA) + [self.html_path], 'canonical_urls': [publish.BASE + self.route]}
        self.save_receipt()

    def save_receipt(self):
        self.receipt.write_text(json.dumps(self.payload), encoding='utf-8')

    def persist(self):
        with contextlib.redirect_stdout(io.StringIO()):
            return publish.persist(self.repo, self.receipt, self.env)

    def assertNoRelease(self):
        self.assertFalse(self.env_file.exists())
        self.assertFalse(self.output_file.exists())

    def test_success_preserves_unrelated_unstaged_output_and_updates(self):
        self.write('other-generated.html', 'validated current build\n')
        self.write('do-not-stage.txt', 'unrelated\n')
        after = self.persist()
        self.assertEqual(after, self.git('--git-dir=' + str(self.remote), 'rev-parse', 'main'))
        files = self.git('diff-tree', '--no-commit-id', '--name-only', '-r', after).splitlines()
        self.assertEqual(set(files), set(self.payload['paths']))
        self.assertEqual(self.git('diff', '--name-only'), 'other-generated.html')
        self.assertEqual(self.git('ls-files', '--others', '--exclude-standard'), 'do-not-stage.txt')
        self.assertEqual((self.repo / 'other-generated.html').read_text(), 'validated current build\n')
        self.assertIn('DEPLOY_SHA=' + after, self.env_file.read_text())
        self.assertIn('ECO_AUTO_BEFORE=' + self.before, self.env_file.read_text())
        self.assertIn('ECO_AUTO_AFTER=' + after, self.env_file.read_text())
        # A retry from the persisted state must not create a second commit.
        self.payload.update(before_sha=after, changed=False, paths=[], canonical_urls=[])
        self.save_receipt()
        self.assertEqual(after, self.persist())
        # An existing generated page update remains in the real diff for IndexNow.
        self.payload.update(before_sha=after, changed=True, paths=[self.html_path], canonical_urls=[publish.BASE + self.route])
        self.write(self.html_path, (self.repo / self.html_path).read_text().replace('Verified scenario', 'Verified updated scenario'))
        self.save_receipt()
        updated = self.persist()
        self.assertEqual(self.git('diff', '--name-only', after, updated), self.html_path)

    def test_preexisting_staged_files_block_narrow_commit(self):
        self.write('other-generated.html', 'someone else staged this\n')
        self.git('add', 'other-generated.html')
        with self.assertRaisesRegex(publish.Rejected, 'Pre-existing staged'):
            self.persist()
        self.assertEqual(self.git('rev-parse', 'HEAD'), self.before)
        self.assertNoRelease()

    def test_concurrent_main_stops_without_rebase_or_local_rewrite(self):
        other = self.base / 'other'
        self.git('clone', '--branch', 'main', str(self.remote), str(other))
        self.git('config', 'user.name', 'Concurrent', cwd=other)
        self.git('config', 'user.email', 'concurrent@example.invalid', cwd=other)
        (other / 'concurrent.txt').write_text('new main\n')
        self.git('add', '.', cwd=other)
        self.git('commit', '-m', 'concurrent contributor', cwd=other)
        self.git('push', cwd=other)
        page_before = (self.repo / self.html_path).read_bytes()
        with self.assertRaisesRegex(publish.Rejected, 'Main advanced'):
            self.persist()
        self.assertEqual(self.git('rev-parse', 'HEAD'), self.before)
        self.assertEqual((self.repo / self.html_path).read_bytes(), page_before)
        self.assertFalse((self.repo / 'concurrent.txt').exists())
        self.assertNoRelease()

    def test_rejected_push_never_yields_release_sha(self):
        hook = self.repo / '.git/hooks/pre-push'
        hook.write_text('#!/bin/sh\nexit 1\n')
        hook.chmod(0o755)
        with self.assertRaisesRegex(publish.Rejected, 'push failed'):
            self.persist()
        self.assertEqual(self.git('--git-dir=' + str(self.remote), 'rev-parse', 'main'), self.before)
        self.assertNoRelease()

    def test_source_receipt_must_match_build(self):
        self.payload['before_sha'] = 'a' * 40
        self.save_receipt()
        with self.assertRaisesRegex(publish.Rejected, 'validated source SHA'):
            self.persist()
        self.assertNoRelease()

    def test_receipt_cannot_expand_controlled_surface(self):
        for path in ['.github/workflows/evil.yml', 'sites/getecoback/site/index.html', 'sites/getecoback/site/guide/../../outside.html']:
            with self.subTest(path=path):
                self.write(path, '<html>unrelated</html>')
                self.payload['paths'] = [path]
                self.payload['canonical_urls'] = []
                self.save_receipt()
                with self.assertRaises(publish.Rejected):
                    self.persist()
                self.assertNoRelease()

    def test_html_must_be_owned_and_have_matching_canonical(self):
        variants = [
            ('ledger', {'pages': {}}, 'not owned'),
            ('facts', {'pages': {}}, 'not owned'),
            ('html', '<html>unmarked</html>', 'marker missing'),
            ('html', publish.MARKER + '<link rel="canonical" href="https://evil.example/">', 'canonical'),
        ]
        for kind, value, error in variants:
            with self.subTest(kind=kind, error=error):
                self.draft()
                name = self.html_path if kind == 'html' else publish.PREFIX + 'data/auto-content' + ('-ledger' if kind == 'ledger' else '') + '.json'
                self.write(name, value)
                with self.assertRaisesRegex(publish.Rejected, error):
                    self.persist()
                self.assertNoRelease()

    def test_symlinks_are_not_published(self):
        page = self.repo / self.html_path
        saved = page.read_text()
        page.unlink()
        external = self.base / 'external.html'
        external.write_text(saved)
        page.symlink_to(external)
        with self.assertRaises(publish.Rejected):
            self.persist()
        self.assertNoRelease()

    def test_changed_and_canonical_receipts_must_be_consistent(self):
        for key, value in [('changed', False), ('changed', 'true'), ('canonical_urls', []), ('paths', [self.html_path, self.html_path])]:
            with self.subTest(key=key):
                self.draft()
                self.payload[key] = value
                self.save_receipt()
                with self.assertRaises(publish.Rejected):
                    self.persist()
                self.assertNoRelease()

    def test_noop_cannot_discard_changed_ledger(self):
        self.payload.update(changed=False, paths=[], canonical_urls=[])
        self.save_receipt()
        with self.assertRaisesRegex(publish.Rejected, 'metadata is absent'):
            self.persist()
        self.assertNoRelease()

    def test_branch_must_be_main(self):
        self.git('checkout', '-b', 'feature')
        with self.assertRaisesRegex(publish.Rejected, 'main branch'):
            self.persist()
        self.assertNoRelease()


if __name__ == '__main__':
    unittest.main()
