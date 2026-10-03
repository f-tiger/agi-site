"""Regressions for the audited customer journeys, including repeated builds."""
import json,re,unittest
from pathlib import Path
import build_structure as B
from demand_tools import inject,PROTECTED,WINDOW_DE,WINDOW_EN
SITE=Path(__file__).resolve().parents[1]/'site'
class DemandTest(unittest.TestCase):
 def test_market_protection_survives_legacy_injectors(self):
  for p in SITE.glob('**/*.html'):
   if p.stem not in PROTECTED:continue
   en='/en/' in str(p);s=p.read_text()
   for marker in ['USSWITCH','USMARKET','USTOP','USSHELF','POPUP']:
    self.assertNotIn('<!--EB_'+marker+'-->',s,str(p))
   mutated=B.inject_usswitch(B.inject_usmarket(s,p.stem))
   fixed=inject(mutated,p.stem,en)
   self.assertEqual(fixed,inject(fixed,p.stem,en),p.name)
   self.assertNotIn('<!--EB_USSWITCH-->',fixed)
   if p.stem in WINDOW_DE|WINDOW_EN:
    self.assertEqual(fixed.count('id="eb-seal-fit"'),1)
    self.assertIn('value="none" selected',fixed)
 def test_one_source_for_model_advice_and_metadata(self):
  italy=(SITE/'en/guide/best-portable-air-conditioner-italy.html').read_text()
  for stale in ['N90','AEG ChillFlex','Our default pick','<!--EB_MODELS-->']:
   self.assertNotIn(stale,italy)
  for rel in ['guide/luftentfeuchter-20-qm.html','en/guide/dehumidifier-20-sqm.html']:
   s=(SITE/rel).read_text()
   self.assertEqual(s.count('id="eb-moisture-choice"'),1)
   self.assertNotIn('<!--EB_MODELS-->',s)
   for raw in re.findall(r'<script[^>]*type="application/ld\+json"[^>]*>(.*?)</script>',s,re.S):
    d=json.loads(raw)
    for node in d.get('@graph',[d]):
     if node.get('@type')=='Article':self.assertEqual(node['dateModified'],'2026-10-02')
     if node.get('@type')=='FAQPage':
      self.assertNotIn('16–20',json.dumps(node,ensure_ascii=False))
if __name__=='__main__':unittest.main()
