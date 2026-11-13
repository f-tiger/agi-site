#!/usr/bin/env python3
"""Offline regression fixtures: no GitHub, Cloudflare or IndexNow requests."""
import io
import stat
import zipfile
import importlib.util
import json
import os
from pathlib import Path
import socket
import subprocess
import tempfile
import unittest
from unittest.mock import patch

SCRIPT = Path(__file__).with_name('agi-deployment-receipt.py')
spec = importlib.util.spec_from_file_location('receipt', SCRIPT)
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
ROOT = SCRIPT.parents[2]
A, B = 'a' * 40, 'b' * 40
DEPLOY = {'id': 38232122776, 'run_attempt': 1, 'head_sha': A,
          'repository': {'full_name': m.REPO}, 'head_repository': {'full_name': m.REPO},
          'path': m.WORKFLOW, 'head_branch': 'main', 'event': 'schedule',
          'status': 'completed', 'conclusion': 'success',
          'run_started_at': '2026-10-12T09:00:00Z', 'updated_at': '2026-10-12T09:55:00Z'}
RECEIPT = {'schema': 1, 'repository': m.REPO, 'workflow': m.WORKFLOW,
           'run_id': DEPLOY['id'], 'run_attempt': 1, 'run_head_sha': A,
           'deployed_sha': B, 'worker_version': '829e5f0f-562a-4891-81d1-f23363c89a8b',
           'live_checks': 'passed'}


class Contract(unittest.TestCase):
    def test_late_generated_commit_is_effective_release(self):
        self.assertEqual(m.validate_receipt(RECEIPT, DEPLOY), B)
        self.assertNotEqual(B, DEPLOY['head_sha'])

    def test_unsuccessful_untrusted_runs_fail_closed(self):
        mutations = {'status': 'in_progress', 'conclusion': 'failure', 'head_branch': 'feature',
                     'event': 'pull_request', 'path': '.github/workflows/other.yml',
                     'repository': {'full_name': 'other/repo'},
                     'head_repository': {'full_name': 'other/repo'},
                     'id': 0, 'run_attempt': True, 'head_sha': 'main'}
        for field, value in mutations.items():
            with self.subTest(field=field), self.assertRaises(ValueError):
                m.validate_receipt(RECEIPT, {**DEPLOY, field: value})
        for conclusion in ('cancelled', 'skipped', None):
            with self.assertRaises(ValueError):
                m.validate_receipt(RECEIPT, {**DEPLOY, 'conclusion': conclusion})

    def test_missing_bad_receipts_fail_closed(self):
        for field in RECEIPT:
            r = dict(RECEIPT); del r[field]
            with self.subTest(missing=field), self.assertRaises(ValueError):
                m.validate_receipt(r, DEPLOY)
        for field, value in {'run_id': 99, 'run_attempt': 2, 'run_head_sha': B,
                             'live_checks': 'pending', 'deployed_sha': '--help',
                             'worker_version': '', 'repository': 'other/repo',
                             'schema': True}.items():
            with self.subTest(field=field), self.assertRaises(ValueError):
                m.validate_receipt({**RECEIPT, field: value}, DEPLOY)

    def check_fixture(self, artifact=None, receipt=RECEIPT, latest=DEPLOY):
        artifact = artifact if artifact is not None else {
            'total_count': 1, 'artifacts': [{'name': m.artifact_name(DEPLOY['id'], 1),
                                           'expired': False, 'workflow_run': {'id': DEPLOY['id']}}]}
        with patch.object(m, 'latest_attempt', side_effect=[DEPLOY, latest]), \
             patch.object(m, 'api', return_value=artifact), \
             patch.object(m, 'download_receipt', return_value=receipt) as download, \
             patch.object(m, 'check_source') as source:
            m.check()
            source.assert_called_once_with(B)
        return download.call_args_list

    def test_authenticated_run_download_only(self):
        self.assertEqual(len(self.check_fixture()), 1)

    def test_missing_expired_wrong_artifact_rejected(self):
        for artifact in ({'total_count': 0, 'artifacts': []},
                         {'total_count': 2, 'artifacts': []},
                         {'total_count': 1, 'artifacts': [{'name': 'wrong', 'expired': False}]},
                         {'total_count': 1, 'artifacts': [{'name': m.artifact_name(DEPLOY['id'], 1), 'expired': True}]},
                         {'total_count': 1, 'artifacts': [{'name': m.artifact_name(DEPLOY['id'], 1), 'expired': False, 'workflow_run': {'id': 99}}]}):
            with self.assertRaises(ValueError): self.check_fixture(artifact=artifact)

    def test_deploy_race_or_retry_rejected(self):
        for latest in ({**DEPLOY, 'id': 99}, {**DEPLOY, 'run_attempt': 2},
                       {**DEPLOY, 'status': 'in_progress'}):
            with self.assertRaises(ValueError): self.check_fixture(latest=latest)

    def test_missing_run_and_read_failure_not_fallback(self):
        with patch.object(m, 'api', return_value={'total_count': 0, 'workflow_runs': []}), self.assertRaises(ValueError):
            m.check()
        with patch.object(m, 'api', side_effect=OSError('GitHub unavailable')), self.assertRaises(OSError):
            m.check()

    def test_complete_history_detects_old_failed_or_running_rerun(self):
        old = {**DEPLOY, 'id': 10, 'run_attempt': 2,
               'run_started_at': '2026-10-12T10:00:00Z', 'updated_at': '2026-10-12T10:05:00Z'}
        for changed in ({'conclusion': 'failure'}, {'status': 'in_progress'}, {'status': 'queued'}):
            with patch.object(m, 'api', return_value={'total_count': 2, 'workflow_runs': [DEPLOY, {**old, **changed}]}), self.assertRaises(ValueError):
                m.latest_attempt()
        with patch.object(m, 'api', return_value={'total_count': 2, 'workflow_runs': [DEPLOY, old]}):
            self.assertEqual(m.latest_attempt()['id'], 10)
        overlapping = {**old, 'run_started_at': '2026-10-12T09:30:00Z'}
        with patch.object(m, 'api', return_value={'total_count': 2, 'workflow_runs': [DEPLOY, overlapping]}), self.assertRaises(ValueError):
            m.latest_attempt()

    def test_non_main_attempts_and_same_second_ambiguity(self):
        other = {**DEPLOY, 'id': 99, 'head_branch': 'feature', 'event': 'workflow_dispatch',
                 'run_started_at': '2026-10-12T10:00:00Z', 'updated_at': '2026-10-12T10:05:00Z'}
        for run in (other, {**other, 'status': 'in_progress'}, {**other, 'status': 'queued'}):
            with patch.object(m, 'api', return_value={'total_count': 2, 'workflow_runs': [DEPLOY, run]}), self.assertRaises(ValueError):
                m.latest_attempt()
        earlier = {**other, 'run_started_at': '2026-10-12T08:00:00Z', 'updated_at': '2026-10-12T08:05:00Z'}
        with patch.object(m, 'api', return_value={'total_count': 2, 'workflow_runs': [DEPLOY, earlier]}):
            self.assertEqual(m.latest_attempt()['id'], DEPLOY['id'])
        equal = {**earlier, 'updated_at': DEPLOY['run_started_at']}
        with patch.object(m, 'api', return_value={'total_count': 2, 'workflow_runs': [DEPLOY, equal]}), self.assertRaises(ValueError):
            m.latest_attempt()

    def test_history_budget_incomplete_duplicate_and_pagination_drift(self):
        for response in ({'total_count': 1001, 'workflow_runs': [DEPLOY]},
                         {'total_count': 2, 'workflow_runs': [DEPLOY, DEPLOY]}):
            with patch.object(m, 'api', return_value=response), self.assertRaises(ValueError): m.latest_attempt()
        with patch.object(m, 'api', side_effect=[{'total_count': 2, 'workflow_runs': [DEPLOY]},
                                               {'total_count': 2, 'workflow_runs': []}]), self.assertRaises(ValueError): m.latest_attempt()
        with patch.object(m, 'api', side_effect=[{'total_count': 2, 'workflow_runs': [DEPLOY]},
                                               {'total_count': 3, 'workflow_runs': [DEPLOY]}]), self.assertRaises(ValueError): m.latest_attempt()

    def zip_bytes(self, entries):
        output = io.BytesIO()
        with zipfile.ZipFile(output, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
            for name, content, mode in entries:
                info = zipfile.ZipInfo(name); info.external_attr = mode << 16
                archive.writestr(info, content)
        return output.getvalue()

    def test_zip_payload_bounds_and_exact_entry(self):
        normal = ('agi-deployment-receipt.json', json.dumps(RECEIPT), stat.S_IFREG | 0o600)
        self.assertEqual(m.read_receipt_zip(self.zip_bytes([normal])), RECEIPT)
        cases = [[], [normal, normal], [('extra.txt', '{}', 0), normal],
                 [('../agi-deployment-receipt.json', '{}', 0)],
                 [('/agi-deployment-receipt.json', '{}', 0)],
                 [('agi-deployment-receipt.json/', '{}', stat.S_IFDIR)],
                 [('agi-deployment-receipt.json', '{}', stat.S_IFLNK | 0o777)],
                 [('agi-deployment-receipt.json', 'x' * 4097, 0)],
                 [('agi-deployment-receipt.json', '{bad', 0)],
                 [('agi-deployment-receipt.json', '[]', 0)]]
        for entries in cases:
            with self.subTest(entries=[e[0] for e in entries]), self.assertRaises((ValueError, zipfile.BadZipFile)):
                m.read_receipt_zip(self.zip_bytes(entries))
        for raw in (b'broken', b'x' * (m.MAX_ZIP + 1)):
            with self.assertRaises((ValueError, zipfile.BadZipFile)): m.read_receipt_zip(raw)

    def test_artifact_id_and_download_size_bound(self):
        for artifact in ({'id': True, 'size_in_bytes': 10}, {'id': -1, 'size_in_bytes': 10},
                         {'id': '1', 'size_in_bytes': 10}, {'id': 1, 'size_in_bytes': m.MAX_ZIP + 1}):
            with self.assertRaises(ValueError): m.download_receipt(artifact)
        from unittest.mock import MagicMock
        process = MagicMock(); process.__enter__.return_value = process
        process.stdout.read.return_value = self.zip_bytes([('agi-deployment-receipt.json', json.dumps(RECEIPT), 0)])
        process.wait.return_value = 0
        with patch.object(m.subprocess, 'Popen', return_value=process) as popen:
            self.assertEqual(m.download_receipt({'id': 123, 'size_in_bytes': 700}), RECEIPT)
            self.assertEqual(popen.call_args.args[0], ['gh', 'api', f'repos/{m.REPO}/actions/artifacts/123/zip'])
            process.stdout.read.return_value = b'x' * (m.MAX_ZIP + 1)
            with self.assertRaises(ValueError): m.download_receipt({'id': 123, 'size_in_bytes': 700})
            process.kill.assert_called_once()

    def test_record_requires_unique_worker_version_and_matching_checkout(self):
        env = {'GITHUB_REPOSITORY': m.REPO, 'GITHUB_REF': 'refs/heads/main', 'DEPLOY_SHA': B,
               'GITHUB_RUN_ID': str(DEPLOY['id']), 'GITHUB_RUN_ATTEMPT': '1', 'GITHUB_SHA': A,
               'WRANGLER_OUTPUT': 'Current Version ID: ' + RECEIPT['worker_version'] + '\n'}
        with tempfile.TemporaryDirectory() as d, patch.dict(os.environ, env, clear=True), \
             patch.object(m, 'run', return_value=B), patch.object(m.Path, 'write_text') as write:
            m.record()
            self.assertEqual(json.loads(write.call_args.args[0]), RECEIPT)
            for output in ('', env['WRANGLER_OUTPUT'] * 2, 'Current Version ID: bad'):
                with patch.dict(os.environ, {'WRANGLER_OUTPUT': output}), self.assertRaises(ValueError): m.record()
            with patch.object(m, 'run', return_value=A), self.assertRaises(ValueError): m.record()

    def test_workflow_receipt_is_after_all_live_checks(self):
        deploy = (ROOT / m.WORKFLOW).read_text()
        self.assertLess(deploy.index('Post-deploy smoke'), deploy.index('Record the effective'))
        self.assertLess(deploy.index('Record the effective'), deploy.index('Preserve the verified'))
        tail = deploy[deploy.index('      - name: Record the effective'):deploy.index('\n  relay-ai:')]
        self.assertNotIn('if: always()', tail)
        self.assertIn('steps.release.outputs.sha', tail)
        self.assertIn('steps.worker_deploy.outputs.command-output', tail)
        self.assertIn('github.run_attempt', tail)
        consumer = (ROOT / '.github/workflows/agi-indexnow.yml').read_text()
        self.assertIn('agi-deployment-receipt.py check', consumer)
        self.assertNotIn('.workflow_runs[0].head_sha', consumer)


class GitRegression(unittest.TestCase):
    def test_generated_commit_passes_but_real_source_change_still_blocks(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            def git(*args): return subprocess.check_output(['git', *args], cwd=root, text=True, stderr=subprocess.PIPE).strip()
            git('init', '-q'); git('config', 'user.email', 'fixture@example.invalid'); git('config', 'user.name', 'Fixture')
            path = root / 'sites/agiscorecard/foresight-assets/discovery.json'
            path.parent.mkdir(parents=True); path.write_text('{"checkedAt":"old"}')
            git('add', '.'); git('commit', '-qm', 'trigger'); trigger = git('rev-parse', 'HEAD')
            path.write_text('{"checkedAt":"new"}'); git('commit', '-qam', 'generated discovery'); deployed = git('rev-parse', 'HEAD')
            (root/'other-site.txt').write_text('unrelated'); git('add', '.'); git('commit', '-qm', 'other site')
            # Original gate demonstrably rejects the successfully deployed generated source.
            with self.assertRaises(subprocess.CalledProcessError): m.check_source(trigger, cwd=root)
            m.check_source(deployed, cwd=root)
            for source in m.SOURCES:
                changed = root / source / 'changed.txt'; changed.parent.mkdir(parents=True, exist_ok=True); changed.write_text('real change')
                git('add', '.'); git('commit', '-qm', 'source changed')
                with self.subTest(source=source), self.assertRaises(subprocess.CalledProcessError): m.check_source(deployed, cwd=root)
                git('revert', '--no-edit', 'HEAD')
            with self.assertRaises(subprocess.CalledProcessError): m.check_source('f' * 40, cwd=root)


if __name__ == '__main__':
    with patch.object(socket, 'create_connection', side_effect=AssertionError('Network forbidden')):
        unittest.main()
