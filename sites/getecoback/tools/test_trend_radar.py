import unittest
from datetime import date
from trend_radar import render


class RadarEvidenceTests(unittest.TestCase):
    def render(self, trend):
        return render(date(2026, 10, 1), trend, None, '', '', 'Winter', 31)

    def test_unavailable_does_not_invent_zero_or_no_growth(self):
        for payload in (None, {}, {'ok': False}, {'events': []}, 'error'):
            with self.subTest(payload=payload):
                text = self.render(payload)
                self.assertIn('不可用 / 未知', text)
                for misleading in ('本周无满足门槛', '队列为空', '本周无带 Referrer', 'MCP 调用（28天）：0'):
                    self.assertNotIn(misleading, text)

    def test_valid_empty_and_observed_events_stay_distinct(self):
        payload = {k: [] for k in ('pages', 'zero_hits', 'events', 'refs', 'mcp')}
        self.assertIn('本周无满足门槛', self.render(payload))
        payload['events'] = [{'name': 'affiliate_click', 'n7': 15, 'p7': 24}]
        self.assertIn('| affiliate_click | 24 | 15 |', self.render(payload))


if __name__ == '__main__':
    unittest.main()
