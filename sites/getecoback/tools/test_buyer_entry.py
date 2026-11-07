"""Two reading speeds keep comparison evidence and actionable reading accessible."""
from pathlib import Path
from urllib.parse import urlsplit
import re
import unittest

import moisture_decision as M
from test_buyer_comparison import Document


SITE = Path(__file__).resolve().parents[1] / 'site'


class BuyerEntry(unittest.TestCase):
    def test_direct_entry_is_a_real_link_to_one_readable_static_comparison(self):
        for en in (False, True):
            doc = Document(M.block(en)).root
            direct = doc.find('a', 'data-choice-direct')
            self.assertEqual(len(direct), 1)
            self.assertEqual(direct[0].attrs['href'], '#eb-choice-method')
            self.assertEqual(direct[0].text(), 'Compare model data directly' if en else 'Modelle direkt vergleichen')
            ids = [e.attrs['id'] for e in doc.find(attr='id')]
            self.assertEqual(len(ids), len(set(ids)))
            method = doc.find('details', 'data-choice-method')[0]
            self.assertEqual(method.attrs['id'], 'eb-choice-method')
            self.assertIn('open', method.attrs, 'No-JS direct entry must land on readable evidence')
            self.assertNotIn('hidden', method.attrs)
            self.assertEqual(len(method.find('tbody')[0].find('tr')), 2)
            self.assertNotIn('data-choice-action', direct[0].attrs, 'Direct opening owns its distinct bounded event')

    def test_both_needs_entries_return_to_the_existing_context_not_another_quiz(self):
        for en in (False, True):
            doc = Document(M.block(en)).root
            needs = doc.find('a', 'data-choice-needs')
            self.assertEqual(len(needs), 2)
            self.assertTrue(all(a.attrs['href'] == '#eb-choice-context' for a in needs))
            context = next(e for e in doc.find(attr='id') if e.attrs['id'] == 'eb-choice-context')
            self.assertEqual(len(context.find('form')), 1)
            self.assertEqual(len(context.find(attr='data-choice-fallback')), 1)
            note = doc.find(attr='data-choice-direct-note')[0]
            self.assertIn('hidden', note.attrs)
            self.assertIn('purchase need has not been assessed' if en else 'Kaufbedarf noch nicht geprüft', note.text())
            self.assertIn('leaks' if en else 'Leck', note.text())
            self.assertIn('wet building materials' if en else 'nassen Bauteilen', note.text())

    def test_measure_and_wait_each_have_one_real_monitoring_step_without_merchants(self):
        for en, slugs in M.PATHS.items():
            for slug in slugs:
                doc = Document(M.block(en, slug)).root
                for state in ('measure', 'wait'):
                    answer = next(a for a in doc.find(attr='data-answer') if a.attrs['data-answer'] == state)
                    links = answer.find('a')
                    self.assertEqual(len(links), 1)
                    self.assertEqual(links[0].attrs['data-choice-action'], 'guide')
                    url = urlsplit(links[0].attrs['href'])
                    self.assertEqual(url.netloc, '')
                    target = SITE / url.path.lstrip('/')
                    self.assertTrue(target.is_file())
                    target_doc = Document(target.read_text()).root
                    if url.fragment:
                        self.assertIn(url.fragment, [n.attrs['id'] for n in target_doc.find(attr='id')])
                    self.assertIn('do not yet justify buying' if en and state == 'measure' else
                                  'No dehumidifier purchase indicated yet' if en else
                                  'noch nicht begründet' if state == 'measure' else 'Vorerst keinen Entfeuchter', answer.text())

    def test_cold_keller_route_uses_real_same_page_anchor_in_both_insertion_paths(self):
        real = Document((SITE / 'guide/luftentfeuchter-keller.html').read_text()).root
        self.assertIn('kalter-keller', [n.attrs['id'] for n in real.find(attr='id')])
        for en, slugs in M.PATHS.items():
            for slug in slugs:
                for marker in ('', '<!--EB_MODELS-->'):
                    source = '<article><h1>Guide</h1>' + marker + '<h2 id="kalter-keller">Cold-room advice</h2></article>'
                    doc = Document(M.inject(source, slug, en)).root
                    cold = next(a for a in doc.find(attr='data-answer') if a.attrs['data-answer'] == 'cold')
                    href = cold.find('a')[0].attrs['href']
                    expected = ('/en/guide/desiccant-vs-compressor-dehumidifier.html' if en else
                                '#kalter-keller' if slug == 'luftentfeuchter-keller' else
                                '/guide/luftentfeuchter-keller.html#kalter-keller')
                    self.assertEqual(href, expected)

    def test_candidates_frame_a_verifiable_tradeoff_before_the_source_and_offer(self):
        for en in (False, True):
            doc = Document(M.block(en)).root
            result = next(a for a in doc.find(attr='data-answer') if a.attrs['data-answer'] == 'compare')
            cards = [e for e in result.find('div') if e.attrs.get('class') == 'choice-candidate']
            tradeoffs = [next(e for e in card.find('div') if e.attrs.get('class') == 'choice-tradeoff') for card in cards]
            for tradeoff in tradeoffs:
                self.assertEqual(len(tradeoff.find('p')), 2)
                self.assertIn('Worth checking when' if en else 'Weiter prüfen, wenn', tradeoff.text())
                self.assertIn('Before buying, verify' if en else 'Vor dem Kauf klären', tradeoff.text())
            self.assertIn('missing here' if en else 'fehlen hier', tradeoffs[0].text())
            self.assertIn('3-litre' if en else '3-Liter', tradeoffs[0].text())
            self.assertIn('60% RH' if en else '60 % RH', tradeoffs[1].text())
            self.assertIn('One 20L', tradeoffs[1].text())

    def test_all_six_built_guides_relocate_choice_before_contents_and_preserve_the_intro(self):
        for en, slugs in M.PATHS.items():
            for slug in slugs:
                route = SITE / ('en/guide' if en else 'guide') / (slug + '.html')
                source = route.read_text()
                updated = M.inject(source, slug, en)
                self.assertEqual(M.inject(updated, slug, en), updated)
                self.assertEqual(updated.count('<!--EB_BUYER-->'), 1)
                self.assertGreater(updated.index('<!--EB_BUYER-->'), updated.index('<article'), slug)
                self.assertLess(updated.index('<!--EB_BUYER-->'), updated.index('<!--EB_TOC-->'), slug)
                # Introductory copy and disclosure before the original TOC are
                # preserved byte-for-byte apart from the relocated buyer block.
                clean = lambda s: re.sub(r'<!--EB_BUYER-->.*?<!--/EB_BUYER-->\n?', '', s, flags=re.S)
                self.assertEqual(clean(updated).split('<!--EB_TOC-->')[0], clean(source).split('<!--EB_TOC-->')[0])
                for form in Document(updated).root.find('form'):
                    self.assertFalse(form.find('form'), slug + ' must not nest calculator forms')

    def test_earliest_article_anchor_wins_and_headings_inside_forms_are_skipped(self):
        fixtures = [
            ('<!--EB_TOC--><nav>Contents</nav><h2>Advice</h2><!--EB_MODELS-->', '<!--EB_TOC-->'),
            ('<!--EB_MODELS--><h2>Models</h2><!--EB_TOC-->', '<!--EB_MODELS-->'),
            ('<!--EB_LAUNDRY--><section><h2>Calculator</h2><form></form></section>', '<!--EB_LAUNDRY-->'),
            ('<form><h2>Other form heading</h2></form><h2>Article advice</h2>', '<h2>Article advice</h2>'),
        ]
        for body, target in fixtures:
            intro = '<nav><h2>Site navigation</h2></nav><article><p>Introduction and disclosure.</p>'
            source = intro + body + '</article>'
            updated = M.inject(source, 'waesche-trocknen-wohnung')
            self.assertEqual(M.inject(updated, 'waesche-trocknen-wohnung'), updated)
            expected_position = source.index(target)
            self.assertEqual(updated[:updated.index('<!--EB_BUYER-->')], source[:expected_position])
            for form in Document(updated).root.find('form'):
                self.assertFalse(form.find('form'))

    def test_nested_generated_regions_cannot_swallow_the_buyer_in_a_later_replacement(self):
        from demand_tools import inject as inject_demand
        for en, slug in ((False, 'luftentfeuchter-20-qm'), (True, 'dehumidifier-20-sqm')):
            source = ('<article><!--EB_PROFILE--><script>const heading="<h2>Profile</h2>";</script><!--/EB_PROFILE-->'
                      '<!--EB_DEMAND_MARKET--><aside><p>Old market notice</p><!--EB_TOC--><nav>Contents</nav>'
                      '<!--/EB_TOC--></aside><!--/EB_DEMAND_MARKET--><h2>Authored advice</h2></article></body>')
            updated = M.inject(source, slug, en)
            self.assertGreater(updated.index('<!--EB_BUYER-->'), updated.index('<!--/EB_PROFILE-->'))
            self.assertLess(updated.index('<!--EB_BUYER-->'), updated.index('<!--EB_DEMAND_MARKET-->'))
            # Reproduce the real build order that used to remove both 20 m² tools.
            updated = inject_demand(updated, slug, en)
            updated = re.sub(r'<!--EB_PROFILE-->.*?<!--/EB_PROFILE-->', '', updated, flags=re.S)
            self.assertEqual(updated.count('id="eb-moisture-choice"'), 1)
            self.assertEqual(updated.count('data-choice-direct>'), 1)
            self.assertIn('<h2>Authored advice</h2>', updated)

    def test_unknown_nested_and_parameterized_markers_are_protected_without_a_name_allowlist(self):
        source = ('<article><p>Introduction</p><!--EB_FUTURE:example--><div><!--EB_INNER-->'
                  '<section><h2>Generated advice</h2></section><!--/EB_INNER--></div><!--/EB_FUTURE-->'
                  '<h2>Authored advice</h2></article>')
        updated = M.inject(source, 'luftentfeuchter-ratgeber')
        self.assertLess(updated.index('<!--EB_BUYER-->'), updated.index('<!--EB_FUTURE:example-->'))
        self.assertEqual(M.inject(updated, 'luftentfeuchter-ratgeber'), updated)
        stripped = re.sub(r'<!--EB_FUTURE:example-->.*?<!--/EB_FUTURE-->', '', updated, flags=re.S)
        self.assertEqual(stripped.count('id="eb-moisture-choice"'), 1)

    def test_unpaired_insert_sentinel_is_not_an_enclosing_generated_region(self):
        source = '<header><!--EB_CRUMB--><p>Breadcrumb</p></header><article><p>Introduction</p><h2>Advice</h2></article>'
        updated = M.inject(source, 'luftentfeuchter-ratgeber')
        self.assertGreater(updated.index('<!--EB_BUYER-->'), updated.index('<article>'))
        self.assertEqual(updated[:updated.index('<!--EB_BUYER-->')], source[:source.index('<h2>')])

    def test_actual_six_guides_survive_the_following_demand_and_profile_replacements(self):
        from demand_tools import inject as inject_demand
        for en, slugs in M.PATHS.items():
            for slug in slugs:
                source = (SITE / ('en/guide' if en else 'guide') / (slug + '.html')).read_text()
                for _ in range(2):
                    source = inject_demand(M.inject(source, slug, en), slug, en)
                    for marker in ('EB_STICKY', 'EB_PROFILE'):
                        source = re.sub(r'<!--' + marker + r'-->.*?<!--/' + marker + r'-->', '', source, flags=re.S)
                    self.assertEqual(source.count('id="eb-moisture-choice"'), 1, slug)
                    self.assertEqual(source.count('data-choice-direct>'), 1, slug)
                    for form in Document(source).root.find('form'):
                        self.assertFalse(form.find('form'), slug)


if __name__ == '__main__':
    unittest.main()
