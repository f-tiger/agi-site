import html
import json
from pathlib import Path
import re
import unittest
from build_upkeep_decisions import build, PAGES, ROOT
from build_onpage import inject_toc, inject_updated, MIN_H2

class UpkeepPages(unittest.TestCase):
 def test_generator_is_idempotent(self):
  for slug in PAGES:
   source=(ROOT/'site/guide'/(slug+'.html')).read_text()
   generated=build(slug,source)
   self.assertEqual(build(slug,generated),generated)

 def test_onpage_composition_is_stable_without_duplicate_dates(self):
  # Onpage owns the final date badge and table of contents. Its decorated
  # output is intentionally different from the upkeep builder's input stage.
  for slug in PAGES:
   source=(ROOT/'site/guide'/(slug+'.html')).read_text()
   def pipeline(value):
    return inject_updated(inject_toc(build(slug,value),False),False)
   output=pipeline(source)
   self.assertEqual(pipeline(output),output)
   self.assertEqual(output.count('<!--EB_UPDATED-->'),1)
   self.assertEqual(output.count('<!--/EB_UPDATED-->'),1)
   self.assertEqual(output.count('Aktualisiert am 17. Oktober 2026'),1)
   article=re.search(r'<article>(.*?)</article>',output,re.S)[1]
   expected_toc=int(len(re.findall(r'<h2\b',article))>=MIN_H2)
   self.assertEqual(output.count('<!--EB_TOC-->'),expected_toc)
   self.assertEqual(output.count('id="upkeep-check"'),1)

 def test_faq_is_visible_and_matches_schema(self):
  for slug,cfg in PAGES.items():
   source=(ROOT/'site/guide'/(slug+'.html')).read_text()
   schemas=[json.loads(x) for x in re.findall(r'<script type="application/ld\+json">(.*?)</script>',source,re.S)]
   nodes=[n for data in schemas for n in data.get('@graph',[data])]
   faq=next(n for n in nodes if n.get('@type')=='FAQPage')
   visible=html.unescape(re.sub('<[^>]+>',' ',re.sub(r'<script\b.*?</script>','',source,flags=re.S)))
   self.assertEqual(len(faq['mainEntity']),len(cfg['faq']))
   for q in faq['mainEntity']:
    self.assertIn(q['name'],visible);self.assertIn(q['acceptedAnswer']['text'],visible)
   self.assertIn('https://getecoback.com/guide/'+slug+'.html',source)

 def test_tool_is_unique_not_defaulted_and_has_no_js_fallback(self):
  for slug in PAGES:
   source=(ROOT/'site/guide'/(slug+'.html')).read_text()
   self.assertEqual(source.count('id="upkeep-check"'),1)
   block=re.search(r'<!--EB_UPKEEP-->(.*?)<!--/EB_UPKEEP-->',source,re.S)[1]
   self.assertNotRegex(block,r'<input[^>]+checked')
   self.assertIn('<noscript>',block);self.assertIn('<form hidden>',block)
   self.assertNotIn('type="text"',block)
   self.assertNotIn('form action=',block)
   for name in ['TOPPICK','MODELS','PROFILE','USMARKET','STICKY','POPUP','USSWITCH']:self.assertNotIn('<!--EB_'+name+'-->',source)

 def test_no_default_unsupported_parts_or_savings_claims(self):
  tineco=(ROOT/'site/guide/tineco-saugt-nicht-mehr.html').read_text()
  self.assertNotIn('tineco+ersatzfilter',tineco);self.assertNotIn('tineco+b%C3%BCrstenrolle',tineco)
  self.assertNotIn('Die häufigste Ursache',tineco);self.assertNotIn('mit etwas Essig abwischen',tineco)
  curtain=(ROOT/'site/guide/thermovorhang-ratgeber.html').read_text()
  self.assertIn('data-shop hidden',curtain);self.assertIn('rel="sponsored noopener"',curtain)
  self.assertIn('Suchergebnisse sind keine Passformempfehlung',curtain)

if __name__=='__main__':unittest.main()
