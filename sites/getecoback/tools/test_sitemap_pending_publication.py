#!/usr/bin/env python3
"""A real tracked-page update may pass lastmod only with its exact pending receipt."""
import copy
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

import check_sitemap_lastmod as gate
from auto_content import substantive_hash
from build_auto_content import render_page
from test_auto_content_render import product, route


class PendingSitemapPublication(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='eco-pending-sitemap-')
        self.repo = Path(self.tmp.name)
        self.root = self.repo / 'sites/getecoback'
        self.site = self.root / 'site'
        self.route = route('DE')
        self.page = self.site / self.route.lstrip('/')
        self.data_file = self.root / 'data/auto-content.json'
        self.ledger_file = self.root / 'data/auto-content-ledger.json'
        self.receipt = self.repo / 'publication.json'
        self.today = '2026-10-17'
        self.git('init', '-b', 'main')
        self.git('config', 'user.name', 'Fixture')
        self.git('config', 'user.email', 'fixture@example.invalid')
        p = product('DE'); p['checked_at'] = '2026-10-16T01:00:00Z'; p['source_hash'] = 'a' * 64
        self.state = {'schema_version': 1, 'pages': {self.route: {'product': p, 'published': '2026-10-16', 'modified': '2026-10-16'}}}
        self.ledger = {'schema_version': 1, 'pages': {self.route: {'source_id': p['source_id'], 'name': p['name'], 'country': 'DE',
                        'created_at': '2026-10-16T01:00:00Z', 'modified_at': '2026-10-16T01:00:00Z', 'content_hash': substantive_hash(p)}},
                        'days': {'2026-10-16': {'route': self.route}}}
        self.write_state()
        self.git('add', '.')
        self.git('commit', '-m', 'previous verified content')
        self.before = self.git('rev-parse', 'HEAD')
        p['power_watts'] = 240
        p['facts'][0]['value'] = 240
        p['checked_at'] = '2026-10-17T01:00:00Z'
        p['source_hash'] = 'b' * 64
        self.state['pages'][self.route]['modified'] = self.today
        self.ledger['pages'][self.route].update(modified_at='2026-10-17T01:00:00Z', content_hash=substantive_hash(p))
        self.ledger['days'][self.today] = {'route': self.route, 'action': 'update'}
        self.write_state()
        self.payload = {'schema_version': 1, 'before_sha': self.before, 'changed': True,
                        'paths': [f.relative_to(self.repo).as_posix() for f in (self.data_file, self.ledger_file, self.page)],
                        'canonical_urls': [gate.BASE + self.route]}
        self.save_receipt()

    def tearDown(self): self.tmp.cleanup()

    def git(self, *args):
        r = subprocess.run(['git', *args], cwd=self.repo, text=True, capture_output=True)
        if r.returncode: raise AssertionError(r.stderr)
        return r.stdout.strip()

    def write_state(self):
        self.data_file.parent.mkdir(parents=True, exist_ok=True)
        self.page.parent.mkdir(parents=True, exist_ok=True)
        self.data_file.write_text(json.dumps(self.state))
        self.ledger_file.write_text(json.dumps(self.ledger))
        entry = self.state['pages'][self.route]
        self.page.write_text(render_page(entry['product'], self.route, entry['published'], entry['modified']))

    def save_receipt(self): self.receipt.write_text(json.dumps(self.payload))

    def pending(self): return gate.validated_pending(self.receipt, self.root, self.today)

    def test_exact_pending_update_passes_without_blessing_other_dirty_pages(self):
        pending = self.pending()
        self.assertEqual(pending, {str(self.page.resolve())})
        entries = [(gate.BASE + self.route, self.today), (gate.BASE + '/guide/other-stamped.html', self.today)]
        with patch.object(gate, 'SITE', str(self.site)):
            checks = (entries, self.today, lambda p: True, lambda p: '2026-10-16', lambda p: self.today)
            self.assertEqual(len(gate.violations(*checks)), 2)
            bad = gate.violations(*checks, pending)
        self.assertEqual([url for url, why in bad], [gate.BASE + '/guide/other-stamped.html'])

    def test_stale_receipt_and_incomplete_state_paths_fail(self):
        for mutation in ['sha', 'paths']:
            saved = copy.deepcopy(self.payload)
            if mutation == 'sha': self.payload['before_sha'] = 'a' * 40
            else: self.payload['paths'].remove(self.ledger_file.relative_to(self.repo).as_posix())
            self.save_receipt()
            with self.subTest(mutation=mutation), self.assertRaises((ValueError, RuntimeError)): self.pending()
            self.payload = saved

    def test_false_hash_missing_daily_transaction_or_wrong_day_fail(self):
        for mutation in ['hash', 'day', 'date']:
            saved = copy.deepcopy(self.ledger)
            if mutation == 'hash': self.ledger['pages'][self.route]['content_hash'] = 'a' * 64
            elif mutation == 'day': self.ledger['days'].pop(self.today)
            else: self.ledger['pages'][self.route]['modified_at'] = '2026-10-16T01:00:00Z'
            self.write_state()
            with self.subTest(mutation=mutation), self.assertRaises((ValueError, RuntimeError)): self.pending()
            self.ledger = saved

    def test_changed_flag_cannot_excuse_unchanged_page_or_state(self):
        self.git('restore', '--', self.page.relative_to(self.repo).as_posix())
        with self.assertRaisesRegex(RuntimeError, 'no actual file change'): self.pending()
        self.write_state()
        self.git('restore', '--', self.data_file.relative_to(self.repo).as_posix())
        with self.assertRaisesRegex(RuntimeError, 'no real change'): self.pending()

    def test_date_capture_and_metadata_refresh_without_changed_facts_is_rejected(self):
        p = self.state['pages'][self.route]['product']
        p['power_watts'] = 200
        p['facts'][0]['value'] = 200
        # checked_at, modified, source_hash and daily ledger are still new;
        # the actual specification answers match yesterday's committed page.
        self.ledger['pages'][self.route]['content_hash'] = substantive_hash(p)
        self.write_state()
        with self.assertRaisesRegex(RuntimeError, 'without substantive facts'):
            self.pending()

    def test_tampered_source_fact_body_is_rejected(self):
        self.page.write_text(self.page.read_text().replace('data-power-watts="240"', 'data-power-watts="999"'))
        with self.assertRaisesRegex(ValueError, 'power'): self.pending()

    def test_noop_receipt_does_not_bypass_lastmod(self):
        self.payload.update(changed=False, paths=[], canonical_urls=[])
        self.save_receipt()
        self.assertEqual(self.pending(), set())


if __name__ == '__main__': unittest.main()
