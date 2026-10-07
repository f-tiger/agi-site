import copy,json,unittest
from pathlib import Path
from run import check_config,hash_obj
class ConfigTests(unittest.TestCase):
 def setUp(self):self.cfg=json.loads(Path(__file__).with_name('demo.json').read_text())
 def test_baseline(self):check_config(self.cfg)
 def test_approved_revision_changes_fingerprint(self):
  old=hash_obj(self.cfg);self.cfg['scenes'][0]['narration']='Turn this draft into a PowerPoint you can edit.';check_config(self.cfg);self.assertNotEqual(old,hash_obj(self.cfg))
 def test_unsupported_claim_rejected(self):
  self.cfg['scenes'][0]['narration']='Guaranteed customers and ten hours saved.'
  with self.assertRaisesRegex(ValueError,'UNSUPPORTED'):check_config(self.cfg)
 def test_false_pdf_claim_rejected(self):
  self.cfg['feature']='pdf-export'
  with self.assertRaises(ValueError):check_config(self.cfg)
 def test_timeline_edit_rejected(self):
  self.cfg['scenes'][0]['duration']=6
  with self.assertRaises(ValueError):check_config(self.cfg)
 def test_missing_scene_rejected(self):
  self.cfg['scenes'].pop()
  with self.assertRaises(ValueError):check_config(self.cfg)
if __name__=='__main__':unittest.main()
