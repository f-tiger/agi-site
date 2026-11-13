#!/usr/bin/env python3
"""Offline regression for the two agi-odds jobs (Python stdlib + Node).

Install the existing tools/revenue-studio lockfile first. This test does not
install dependencies, fetch markets, refresh SunWatch, commit, push or deploy.
Each case starts from tracked HEAD files and the committed data snapshots;
only the workflow under test is read from the working tree. Local dependencies
are reused. No generated files from the developer's working tree are copied.
"""
import io
import datetime
import json
from pathlib import Path
import re
import shutil
import subprocess
import tarfile
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
SITE = Path('sites/agiscorecard')
WORKFLOW = ROOT / '.github/workflows/agi-odds.yml'
PREREQUISITES = (
    'npm ci --prefix tools/revenue-studio --ignore-scripts\n'
    'node tools/revenue-studio/build.mjs --site agi --out sites/agiscorecard\n'
    '(cd sites/agiscorecard && python3 tools/add_breadcrumbs.py --apply)'
)
ALLOWED = {
    'odds': {'odds-snapshot.json', 'odds-history.json',
             'agi-odds-vs-evidence.html', 'sitemap.xml'},
    'board': {'market-board.json', 'agi-consensus.json',
              'agi-prediction-markets.html', 'sunwatch-track-record.json',
              'calibration.html', 'sitemap.xml', 'llms.txt'},
}


def run(args, cwd, ok=True):
    result = subprocess.run(args, cwd=cwd, text=True, capture_output=True)
    if ok and result.returncode:
        raise AssertionError(f'{args}: {result.stdout}\n{result.stderr}')
    return result


def run_block(job, name):
    # Deliberately narrow: reject workflow layout changes rather than silently
    # running an unrelated step. No third-party YAML dependency is needed.
    match = re.search(r'^      - name: ' + re.escape(name)
                      + r'\n(?:        [^\n]*\n)*?        run: \|\n'
                      + r'((?:          [^\n]*\n)+)', job, re.M)
    if not match:
        raise AssertionError(f'Missing run block: {name}')
    return '\n'.join(line[10:] for line in match[1].splitlines())


class PrerequisitesTest(unittest.TestCase):
    def test_both_clean_jobs(self):
        workflow = WORKFLOW.read_text()
        jobs = dict(re.findall(r'^  (odds|board):\n(.*?)(?=^  \w+:|\Z)',
                               workflow, re.M | re.S))
        self.assertEqual(set(jobs), set(ALLOWED))
        deployment = (ROOT / '.github/workflows/deploy-agiscorecard.yml').read_text()
        self.assertIn(PREREQUISITES, '\n'.join(x[10:] for x in deployment.splitlines()))
        dependencies = ROOT / 'tools/revenue-studio/node_modules/sql.js'
        self.assertTrue((dependencies / 'dist/sql-wasm.wasm').is_file(),
                        'Install the existing revenue-studio lockfile first')
        # Archive tracked HEAD, not the generated working tree.
        archive = subprocess.check_output(
            ['git', 'archive', 'HEAD'],
            cwd=ROOT)
        for key, job in jobs.items():
            with self.subTest(job=key), tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp)
                with tarfile.open(fileobj=io.BytesIO(archive)) as tar:
                    tar.extractall(root, filter='data')
                site = root / SITE
                self.assertFalse((site / 'members.html').exists())
                self.assertFalse((site / 'workbench.html').exists())
                run(['git', 'init', '-q'], root)
                run(['git', 'add', '.'], root)
                # Use the index as the clean baseline; no test commit is needed.
                shutil.copytree(dependencies,
                                root / 'tools/revenue-studio/node_modules/sql.js')
                build_name = ('Render the odds-vs-evidence issue from the snapshot (ledger accumulates, never rebuilt from one point)'
                              if key == 'odds' else
                              'Build /agi-prediction-markets + agi-consensus.json + /calibration, then validate')
                build = run_block(job, build_name)
                self.assertTrue(build.endswith('python3 tools/validate.py'))
                if key == 'board':
                    # The committed board may be stale. First prove its real
                    # freshness gate still rejects it, then use identical values
                    # with a test-only fresh timestamp. Never publish this fixture.
                    board_file = site / 'market-board.json'
                    board = json.loads(board_file.read_text())
                    age = (datetime.datetime.now(datetime.timezone.utc)
                           - datetime.datetime.fromisoformat(board['fetched'].replace('Z', '+00:00'))).days
                    if age > 10:
                        stale = run(['python3', 'tools/gen_market_board.py'], site, ok=False)
                        self.assertNotEqual(stale.returncode, 0)
                        self.assertIn('拒绝出页', stale.stderr)
                    board['fetched'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
                    board_file.write_text(json.dumps(board))
                    print('board: local fixture only; historical values retained, fetched timestamp refreshed for render coverage')
                # Run the original generator sequence first, proving the same
                # failure is caused by missing routes, not an invented fixture.
                before = run(['bash', '-e', '-c', build], site, ok=False)
                self.assertNotEqual(before.returncode, 0)
                self.assertIn('54 problem(s)', before.stdout)
                self.assertIn('broken internal link /members', before.stdout)
                self.assertIn('no file for URL /workbench', before.stdout)
                prerequisite_name = 'Generate membership and workbench pages before sitemap validation'
                prerequisite = run_block(job, prerequisite_name)
                self.assertEqual(prerequisite, PREREQUISITES)
                self.assertLess(job.index(prerequisite_name), job.index(build_name))
                # Dependency installation is intentionally not executed offline.
                run(['bash', '-e', '-c', '\n'.join(prerequisite.splitlines()[1:])], root)
                after = run(['bash', '-e', '-c', build], site)
                self.assertIn('pages valid', after.stdout)
                self.assertTrue((site / 'members.html').is_file())
                self.assertTrue((site / 'zh/workbench.html').is_file())
                print(f'{key}: clean-checkout reproduction -> {after.stdout.strip()}')
                # The unchanged full validator must still reject real defects.
                home = site / 'index.html'
                original = home.read_bytes()
                home.write_bytes(original + b'\n<a href="/missing-odds-regression">broken</a>\n')
                bad = run(['python3', 'tools/validate.py'], site, ok=False)
                self.assertNotEqual(bad.returncode, 0)
                self.assertIn('broken internal link /missing-odds-regression', bad.stdout)
                home.write_bytes(original)
                # Stage only the exact existing workflow allowlist. A temporary
                # index baseline lets us compare against pristine tracked files.
                baseline = run(['git', 'write-tree'], root).stdout.strip()
                commit = run_block(job, 'Commit snapshot if changed' if key == 'odds'
                                   else 'Commit board if changed')
                staging = '\n'.join(line for line in commit.splitlines()
                                    if not line.startswith('git config ')
                                    and not line.startswith('git diff '))
                if key == 'odds':
                    expected = 'git add ' + ' '.join(str(SITE / name) for name in
                        ['odds-snapshot.json', 'odds-history.json', 'agi-odds-vs-evidence.html', 'sitemap.xml'])
                else:
                    expected = ('for f in market-board.json agi-consensus.json agi-prediction-markets.html sunwatch-track-record.json calibration.html sitemap.xml llms.txt; do\n'
                                '  [ -f "sites/agiscorecard/$f" ] && git add "sites/agiscorecard/$f" || true\ndone')
                self.assertEqual(staging, expected)
                # Ensure every allowed file is tested even when snapshots are unchanged.
                for name in ALLOWED[key]:
                    with (site / name).open('ab') as handle:
                        handle.write(b'\n')
                # Deliberate unrelated modifications must never enter the commit.
                with home.open('ab') as handle:
                    handle.write(b'\n<!-- not an odds output -->\n')
                self.assertTrue((site / '_headers').exists())
                run(['bash', '-e', '-c', staging], root)
                staged = set(run(['git', 'diff', '--cached', '--name-only', baseline], root).stdout.splitlines())
                self.assertEqual(staged, {str(SITE / name) for name in ALLOWED[key]})
                self.assertIn(str(SITE / 'index.html'), run(['git', 'diff', '--name-only'], root).stdout)
                self.assertIn(str(SITE / '_headers'), run(['git', 'ls-files', '--others', '--exclude-standard'], root).stdout)


if __name__ == '__main__':
    unittest.main()
