import unittest
from datetime import date
from trend_radar import render


class RadarEvidenceTests(unittest.TestCase):
    def test_public_report_never_copies_raw_search_text(self):
        payload = {k: [] for k in ('pages', 'zero_hits', 'events', 'refs', 'mcp')}
        payload['zero_hits'] = [{'q': 'private@example.test <script>SECRET</script>', 'n': 3}]
        text = self.render(payload)
        self.assertIn('1 条零命中聚合记录', text)
        self.assertNotIn('private@example.test', text)
        self.assertNotIn('SECRET', text)

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


class DiscoveryMeasurementTests(unittest.TestCase):
    def payload(self, total=100, ai=1):
        return dict(pages=[], zero_hits=[], events=[], refs=[{'ref':'perplexity.ai.attacker.test','n7':999}], mcp=[{'tool':'btu_empfehlung','n':100}], affiliate_audit={'metric':'recorded_events_not_users_or_orders','timezone':'UTC','end_exclusive':'2026-11-10','weeks':[{'start':'2026-11-03','end_exclusive':'2026-11-10','page_views':total,'channels':{'ai':{'page_views':ai},'direct':{'page_views':total-ai}}}]})

    def render(self, payload):
        return render(date(2026,11,10),payload,None,'','','Winter',30)

    def test_full_denominator_ignores_raw_referrer_rows_and_requests(self):
        text=self.render(self.payload())
        self.assertIn('1/100 = 1.0%',text)
        self.assertNotIn('999',text)
        self.assertNotIn('MCP 真实调用',text)
        self.assertNotIn('有真实第三方调用即触发',text)
        self.assertIn('未验证独立采用',text)

    def test_missing_audit_does_not_fall_back_to_truncated_refs(self):
        p=self.payload();del p['affiliate_audit']
        self.assertIn('AI 引荐份额：**不可用 / 未知**',self.render(p))

    def test_tiny_sample_does_not_trigger_expansion(self):
        text=self.render(self.payload(1,1))
        self.assertIn('1/1 = 100.0%',text)
        self.assertNotIn('≥20%',text)
        self.assertNotIn('GEO 深化升为常设优先级',text)

    def test_zero_and_invalid_windows_remain_distinct(self):
        self.assertIn('AI 份额不可计算',self.render(self.payload(0,0)))
        for change in [{'page_views':-1},{'page_views':True},{'start':'2026-11-04'},{'end_exclusive':'2026-11-11'},{'channels':{}},{'channels':{'ai':{'page_views':101}}}]:
            p=self.payload();p['affiliate_audit']['weeks'][0].update(change)
            self.assertIn('AI 引荐份额：**不可用 / 未知**',self.render(p))

if __name__ == '__main__':
    unittest.main()
