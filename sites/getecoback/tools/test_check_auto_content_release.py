#!/usr/bin/env python3
"""Mutation fixtures prove release checks catch missing facts and false handoffs."""
import contextlib
import copy
import io
import json
from pathlib import Path
import tempfile
import unittest
import urllib.error

import check_auto_content_release as gate
from auto_content import substantive_hash
from build_agent_md import to_markdown
from build_auto_content import render_page
from test_auto_content_render import product, route


class AutomaticReleaseTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='eco-auto-release-')
        self.root = Path(self.tmp.name)
        self.state = {'schema_version': 1, 'pages': {}}
        self.ledger = {'schema_version': 1, 'pages': {}}
        self.docs = {}
        self.make('DE'); self.make('GB')
        self.write('data/auto-content.json', self.state)
        self.write('data/auto-content-ledger.json', self.ledger)
        self.write('site/search-index.json', [{'u': path} for path in self.docs])
        all_links = ''.join('<a href="' + path + '#auto-product-tool">Model</a>' for path in self.docs)
        self.write('site/tools.html', all_links)
        self.write('site/sitemap.xml', '\n'.join(gate.BASE + path for path in self.docs))
        self.write('site/llms.txt', '\n'.join(gate.BASE + path for path in self.docs))
        for country, home, parent in [('DE', 'index.html', 'guide/luftentfeuchter-ratgeber.html'), ('GB', 'en/index.html', 'en/guide/uk-damp-and-heating-decisions.html')]:
            links = '<a href="/tools.html">Tools</a><a href="' + route(country) + '#auto-product-tool">Model</a>'
            self.write('site/' + home, links)
            self.write('site/' + parent, links)

    def tearDown(self): self.tmp.cleanup()

    def write(self, name, value):
        file = self.root / name
        file.parent.mkdir(parents=True, exist_ok=True)
        file.write_text(json.dumps(value) if isinstance(value, (dict, list)) else value, encoding='utf-8')

    def make(self, country):
        p = product(country); p['source_hash'] = 'a' * 64
        entry = {'product': p, 'published': '2026-10-16', 'modified': '2026-10-17'}
        self.state['pages'][route(country)] = entry
        self.ledger['pages'][route(country)] = {'source_id': p['source_id'], 'name': p['name'], 'country': country,
                                              'created_at': '2026-10-16T02:00:00Z', 'modified_at': '2026-10-17T02:00:00Z',
                                              'content_hash': substantive_hash(p)}
        html = render_page(p, route(country), entry['published'], entry['modified'])
        self.docs[route(country)] = html
        self.write('site' + route(country), html)
        self.write('site' + route(country).replace('.html', '.md'), to_markdown(html, gate.BASE + route(country), 'de' if country == 'DE' else 'en'))

    def check(self, country='DE', html=None, entry=None, ledger=None):
        return gate.check_document(html or self.docs[route(country)], route(country), entry or self.state['pages'][route(country)], ledger or self.ledger['pages'][route(country)])

    def test_full_local_discovery_and_markdown_pass_both_markets(self):
        with contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(gate.local(self.root), 2)

    def test_empty_registry_is_valid_without_fake_growth(self):
        with tempfile.TemporaryDirectory() as empty, contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(gate.local(Path(empty)), 0)
            self.assertEqual(gate.live(Path(empty), fetcher=lambda url: self.fail('empty registry must not fetch')), 0)

    def test_metadata_tool_fact_and_source_mutations_fail(self):
        original = self.docs[route()]
        mutations = [
            (original.replace(gate.MARKER, ''), 'marker'),
            (original.replace('<h1>', '<h1>Duplicated</h1><h1>'), 'H1'),
            (original.replace('rel="canonical"', 'rel="alternate"'), 'canonical'),
            (original.replace('<html lang="de">', '<html lang="en-GB">'), 'language'),
            (original.replace('index,follow', 'noindex,follow'), 'indexable'),
            (original.replace('id="auto-product-tool"', 'id="missing-tool"'), 'anchor'),
            (original.replace('/assets/auto-product.mjs', '/assets/missing.mjs'), 'module'),
            (original.replace('data-currency="EUR"', 'data-currency="GBP"'), 'currency'),
            (original.replace('data-power-watts="200"', 'data-power-watts="250"'), 'power'),
            (original.replace('data-cost-formula', 'data-missing-formula'), 'formula'),
            (original.replace('data-power-limit', 'data-missing-limit'), 'limits'),
            (original.replace('data-fact-key="tank_l"', 'data-fact-key="missing_tank"'), 'row missing'),
            (original.replace('2.5 L', '25 L'), 'fact value'),
            (original.replace('href="https://de.trotec.com/shop/ttk-50-test.html"', 'href="https://evil.example/"'), 'reference'),
            (original.replace('</article>', '<a href="https://www.amazon.de/dp/FAKE?tag=getecoback-21">Buy</a></article>'), 'external/affiliate'),
        ]
        for html, message in mutations:
            with self.subTest(message=message), self.assertRaisesRegex(gate.ReleaseError, message):
                self.check(html=html)

    def test_insufficient_independent_facts_cannot_pass_as_four_rows(self):
        html = self.docs[route()]
        for key in ('tank_l', 'noise_db', 'extraction_l_per_day'):
            html = html.replace('data-fact-key="' + key + '"', 'data-irrelevant-row="' + key + '"')
        with self.assertRaisesRegex(gate.ReleaseError, 'independent'):
            self.check(html=html)

    def test_ledger_identity_hash_and_dates_are_checked(self):
        for key, value, message in [('source_id', 'wrong', 'identity'), ('content_hash', 'b' * 64, 'hash'), ('created_at', '2026-10-15T00:00:00Z', 'dates')]:
            owned = copy.deepcopy(self.ledger['pages'][route()]); owned[key] = value
            with self.subTest(key=key), self.assertRaisesRegex(gate.ReleaseError, message): self.check(ledger=owned)
        html = self.docs[route()].replace('"dateModified":"2026-10-17"', '"dateModified":"2026-10-16"')
        with self.assertRaisesRegex(gate.ReleaseError, 'Article dates'): self.check(html=html)
        html = self.docs[route()].replace('<time datetime="2026-10-16">2026-10-16</time>', '<time>Unknown</time>')
        with self.assertRaisesRegex(gate.ReleaseError, 'not visible'): self.check(html=html)

    def test_missing_discovery_or_stripped_markdown_blocks_release(self):
        mutations = [('site/search-index.json', '[]', 'search'), ('site/tools.html', '', 'tool hub'),
                     ('site/sitemap.xml', '', 'sitemap'), ('site/llms.txt', '', 'llms'),
                     ('site/index.html', '<a href="/tools.html">Tools</a>', 'homepage'),
                     ('site/guide/luftentfeuchter-ratgeber.html', '', 'existing guide'),
                     ('site' + route().replace('.html', '.md'), 'Sources stripped', 'Markdown')]
        for name, replacement, message in mutations:
            file = self.root / name; before = file.read_text(); file.write_text(replacement)
            try:
                with self.subTest(name=name), self.assertRaisesRegex(gate.ReleaseError, message): gate.local(self.root)
            finally: file.write_text(before)

    def test_live_receipt_only_fetches_the_actual_owned_changes(self):
        receipt = self.root / 'publication.json'
        receipt.write_text(json.dumps({'schema_version': 1, 'changed': True, 'canonical_urls': [gate.BASE + route('GB')]}))
        calls = []
        def fetch(url): calls.append(url); return self.docs[url[len(gate.BASE):]]
        with contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(gate.live(self.root, receipt, fetcher=fetch), 1)
        self.assertEqual(calls, [gate.BASE + route('GB')])
        receipt.write_text(json.dumps({'schema_version': 1, 'changed': False, 'canonical_urls': []}))
        with contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(gate.live(self.root, receipt, fetcher=lambda url: self.fail('no changed URL')), 0)

    def test_live_rejects_foreign_unknown_or_query_urls_before_fetch(self):
        for url in ['https://getecoback.com.evil.test' + route(), 'http://getecoback.com' + route(), gate.BASE + '/guide/unknown.html', gate.BASE + route() + '?private=1']:
            receipt = {'schema_version': 1, 'changed': True, 'canonical_urls': [url]}
            with self.subTest(url=url), self.assertRaises(gate.ReleaseError): gate.live_targets(self.state, receipt)

    def test_live_has_bounded_retries_and_detects_old_content(self):
        calls = []
        def fail(url): calls.append(url); raise urllib.error.URLError('offline')
        with self.assertRaisesRegex(gate.ReleaseError, 'live verification failed'):
            gate.live(self.root, fetcher=fail, pause=lambda seconds: None)
        self.assertEqual(len(calls), 3)
        def old(url): return self.docs[url[len(gate.BASE):]].replace('data-power-watts="200"', 'data-power-watts="150"')
        with self.assertRaisesRegex(gate.ReleaseError, 'power'):
            gate.live(self.root, fetcher=old, pause=lambda seconds: None)


if __name__ == '__main__': unittest.main()
