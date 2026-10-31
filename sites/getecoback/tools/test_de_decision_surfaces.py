"""Readable decision evidence survives repeated builds without commerce links."""
from pathlib import Path
import unittest
from build_agent_md import to_markdown
from demand_tools import inject as heat_inject
from laundry_decision import inject as laundry_inject
SITE=Path(__file__).resolve().parents[1]/'site'
class DecisionSurfaceTest(unittest.TestCase):
 def test_valve_mirror_retains_distinct_supported_cases_without_select_control_noise(self):
  from build_winter_guides import page, PAGES
  slug='smarte-heizkoerperthermostate-lohnen-sich'
  md=to_markdown(page(slug,PAGES[slug]),'/guide/'+slug+'.html','de')
  for phrase in ['Herz 7230/7235/7260/7262','Stiftverlängerung','Uni LV','30,5-mm-Klemme','Nicht auf tado° X','September 2021']:
   self.assertIn(phrase,md)
  for noise in ['ThermostatkopfModell noch','Generationtado° X','Prüfschritt-Link kopieren','**Gilt für']:
   self.assertNotIn(noise,md)
  self.assertNotIn('amazon.de',md)
 def test_examples_and_no_purchase_paths_survive_without_affiliate_links(self):
  cases=[('guide/heizluefter-stromverbrauch.html',heat_inject,['20 Minuten','0,27 €','keine garantierte Thermostat-Ersparnis']),('waeschetrockner-oder-luftentfeuchter.html',laundry_inject,['bereits einen Trockner','wenig Platz','dauerhaft feucht','Eine Ladung fair vergleichen'])]
  for route,inject,phrases in cases:
   path=SITE/route
   html=inject(path.read_text(),path.stem,False)
   self.assertEqual(html,inject(html,path.stem,False))
   md=to_markdown(html,'/'+route,'de')
   for phrase in phrases:self.assertIn(phrase,md)
   self.assertNotIn('https://www.amazon.',md)
   self.assertNotIn('tag=getecoback',md)
   self.assertNotIn('<form',md)
   self.assertEqual(md.count('Canonical (HTML'),1)
   self.assertNotIn('0,27 €2 Stunden',md)
   self.assertNotIn('TrocknerVergleiche',md)
if __name__=='__main__':unittest.main()
