"""Offline regression for TDS's current collector demand filter."""
import json
import pathlib
import types
import unittest

from demand import in_vocabulary

ROOT = pathlib.Path(__file__).resolve().parents[2]


class TDSVocabularyTests(unittest.TestCase):
    def test_eight_brands_and_unrelated_queries(self):
        raw = json.loads((ROOT / 'data/autopilot/config/thedollscout.json').read_text())
        cfg = types.SimpleNamespace(vocabulary=raw['vocabulary'])
        self.assertEqual(cfg.vocabulary[:4], ['smiski', 'sonny angel', 'jellycat', 'labubu'])
        self.assertEqual(len(cfg.vocabulary), len(set(cfg.vocabulary)))
        for query in ['smiski living series', 'sonny angel vegetables', 'jellycat bunny',
                      'labubu authenticity', 'skullpanda figures', 'hirono figures',
                      'hirono toys', 'hirono blind box collection',
                      'pop mart hirono collection', 'popmart hirono collection',
                      'dimoo animal kingdom', 'mega molly collection']:
            with self.subTest(query=query):
                self.assertTrue(in_vocabulary(cfg, query))
        for query in ['PDF remediation', 'Molly Mae interview', 'Senator Mazie Hirono',
                      'Mazie Hirono Senate hearing', 'world series',
                      'real estate odds', 'UV stamp checker', 'macaron recipe',
                      'secret santa', 'probability checker']:
            with self.subTest(query=query):
                self.assertFalse(in_vocabulary(cfg, query))


if __name__ == '__main__':
    unittest.main()
