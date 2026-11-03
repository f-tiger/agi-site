"""Held-out phrasing, market isolation, ambiguity and publication boundaries."""
import json
import unittest
from datetime import datetime, timezone
from pathlib import Path
from eco_demand_model import DemandModel
import eco_evolution as evo

CATALOG = json.loads(evo.CATALOG.read_text())

class DemandTests(unittest.TestCase):
    def test_held_out_need_wording(self):
        model = DemandModel(CATALOG['tasks'])
        cases = [
            ('AU', 'hot bedroom at night', 'au-bedroom-cooling'),
            ('AU', 'air conditioner kit for my sliding window', 'au-window-kit'),
            ('NL', 'vocht in mijn slaapkamer', 'nl-ventilation'),
            ('NL', 'ramen vol condens', 'nl-ventilation'),
            ('GB', 'how to dry my clothes', 'gb-laundry-cost'),
            ('DE', 'verbrauch von einem heizlüfter', 'de-heater-electricity'),
        ]
        for country, query, expected in cases:
            with self.subTest(query=query):
                result = model.match(query, country)
                self.assertIsNotNone(result)
                self.assertEqual(result['task']['id'], expected)
                self.assertTrue(result['requires_review'])

    def test_no_market_inheritance_unknown_single_term_or_forced_ambiguity(self):
        model = DemandModel(CATALOG['tasks'])
        for country, query in [('CH', 'heizlüfter verbrauch'), ('GB', 'bedroom cooling night'), ('DE', 'meaco'), ('AU', 'the and for'), ('AU', 'football final score')]:
            self.assertIsNone(model.match(query, country))
        ambiguous = DemandModel([{'id':name, 'country':'GB', 'aliases':['damp bedroom window']} for name in ['a','b']])
        self.assertIsNone(ambiguous.match('damp bedroom window', 'GB'))

    def test_approximate_match_cannot_bypass_freshness_country_or_publication_gates(self):
        now = datetime(2026, 11, 1, tzinfo=timezone.utc)
        task = next(t for t in CATALOG['tasks'] if t['id']=='au-bedroom-cooling')
        pages = {task['target']: {'title':'Night cooling', 'country':'AU'}}
        signal = dict(text='hot bedroom at night', country='AU', source_id='rss-AU',
                      source_status='ok', captured_at=now.isoformat(), observed_at=now.isoformat(),
                      signal_kind='rss', metric='public_trending_feed_presence')
        rows, _ = evo.classify([signal], CATALOG, pages, now)
        self.assertEqual(rows[0]['reason'], 'approximate_country_intent_match_requires_review')
        self.assertFalse(rows[0]['model']['score_is_purchase_probability'])
        for flag in ('auto_publish','new_page_allowed','product_link_allowed'):
            self.assertFalse(rows[0][flag])
        for changes in [dict(observed_at='2025-11-01'), dict(source_status='failed'), dict(signal_kind='autocomplete')]:
            rows, _ = evo.classify([dict(signal, **changes)], CATALOG, pages, now)
            self.assertEqual(rows[0]['status'], 'awaiting_evidence')
            self.assertNotIn('model', rows[0])

    def test_inventory_includes_only_existing_reviewed_market_pages(self):
        pages = evo.inventory(evo.SITE, CATALOG)
        for task in CATALOG['tasks']:
            self.assertEqual(pages[task['target']]['country'], task['country'])
        profiles = json.loads(evo.MARKETS.read_text())['markets']
        for country in ('AT','CH','SE','NO','DK','FI'):
            self.assertEqual(profiles[country]['status'], 'research_required')
        self.assertEqual(profiles['AU']['currency'], 'AUD')
        self.assertEqual(profiles['GB']['currency'], 'GBP')

if __name__ == '__main__':
    unittest.main()
