"""Exercise real Git repositories and transport failures; no production writes."""
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
GUARD = ROOT / '.github/scripts/deploy-main-guard.sh'


class GuardTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.base = Path(self.tmp.name)
        self.remote, self.author, self.runner = [self.base / p for p in ('remote.git', 'author', 'runner')]
        self.git(self.base, 'init', '--bare', '--initial-branch=main', str(self.remote))
        self.git(self.base, 'clone', str(self.remote), str(self.author))
        self.git(self.author, 'config', 'user.name', 'Guard fixture')
        self.git(self.author, 'config', 'user.email', 'guard@example.invalid')
        self.old = self.advance('old')
        self.git(self.base, 'clone', str(self.remote), str(self.runner))
        self.new = self.advance('latest')
        self.output = self.base / 'outputs'

    def git(self, cwd, *args):
        return subprocess.run(['git', *args], cwd=cwd, text=True, capture_output=True, check=True).stdout.strip()

    def advance(self, text):
        (self.author / 'page.txt').write_text(text)
        self.git(self.author, 'add', 'page.txt')
        self.git(self.author, 'commit', '-m', text)
        self.git(self.author, 'push', 'origin', 'main')
        return self.git(self.author, 'rev-parse', 'HEAD')

    def run_guard(self, mode, **env):
        return subprocess.run(['bash', str(GUARD), mode], cwd=self.runner, text=True, capture_output=True,
                              env={**os.environ, 'GITHUB_REF': 'refs/heads/main', 'GITHUB_OUTPUT': str(self.output), **env})

    def prepare(self):
        r = self.run_guard('prepare')
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual(self.output.read_text(), f'sha={self.new}\n')
        self.assertEqual(self.git(self.runner, 'rev-parse', 'HEAD'), self.new)

    def test_old_checkout_updates_to_main(self):
        self.prepare()
        self.assertEqual((self.runner / 'page.txt').read_text(), 'latest')

    def test_network_failure_keeps_old_checkout_but_blocks_deploy(self):
        self.git(self.runner, 'remote', 'set-url', 'origin', str(self.base / 'unreachable'))
        self.assertNotEqual(self.run_guard('prepare').returncode, 0)
        self.assertEqual(self.git(self.runner, 'rev-parse', 'HEAD'), self.old)
        self.assertFalse(self.output.exists())

    def test_wrong_branch_blocks_even_with_main_available(self):
        self.assertNotEqual(self.run_guard('prepare', GITHUB_REF='refs/heads/old-release').returncode, 0)
        self.assertEqual(self.git(self.runner, 'rev-parse', 'HEAD'), self.old)

    def test_prepare_refuses_tracked_edits(self):
        (self.runner / 'page.txt').write_text('keep my edits')
        self.assertNotEqual(self.run_guard('prepare').returncode, 0)
        self.assertEqual((self.runner / 'page.txt').read_text(), 'keep my edits')

    def test_predeploy_preserves_validated_generated_files(self):
        self.prepare()
        (self.runner / 'page.txt').write_text('validated generated output')
        r = self.run_guard('check', DEPLOY_SHA=self.new)
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual((self.runner / 'page.txt').read_text(), 'validated generated output')

    def test_main_advances_during_build_blocks_without_reset(self):
        self.prepare()
        self.advance('newer concurrent change')
        (self.runner / 'page.txt').write_text('validated generated output')
        r = self.run_guard('check', DEPLOY_SHA=self.new)
        self.assertNotEqual(r.returncode, 0)
        self.assertIn('refusing stale deployment', r.stderr)
        self.assertEqual(self.git(self.runner, 'rev-parse', 'HEAD'), self.new)
        self.assertEqual((self.runner / 'page.txt').read_text(), 'validated generated output')

    def test_predeploy_network_failure_blocks_despite_cached_tip(self):
        self.prepare()
        self.git(self.runner, 'remote', 'set-url', 'origin', str(self.base / 'unreachable'))
        self.assertNotEqual(self.run_guard('check', DEPLOY_SHA=self.new).returncode, 0)

    def test_missing_sha_or_checkout_change_blocks(self):
        self.prepare()
        self.assertNotEqual(self.run_guard('check', DEPLOY_SHA='').returncode, 0)
        self.git(self.runner, 'reset', '--hard', self.old)
        self.assertNotEqual(self.run_guard('check', DEPLOY_SHA=self.new).returncode, 0)

    def test_workflows_serialize_and_check_immediately_before_deploy(self):
        for site in ('agiscorecard', 'getecoback'):
            text = (ROOT / f'.github/workflows/deploy-{site}.yml').read_text()
            self.assertIn('cancel-in-progress: false', text)
            self.assertIn('ref: main', text)
            self.assertIn('".github/scripts/deploy-main-guard*"', text)
            guard = text.index('bash .github/scripts/deploy-main-guard.sh check')
            deploy = text.index('- name: Deploy to Cloudflare Workers')
            self.assertEqual(text.index('- name:', guard), deploy)
            self.assertNotIn('stale-run guard skipped', text)
            self.assertIn('DEPLOY_SHA: ${{ steps.release.outputs.sha }}', text)


if __name__ == '__main__':
    unittest.main()
