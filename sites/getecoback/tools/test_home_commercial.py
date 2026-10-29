import unittest
from pathlib import Path
from html.parser import HTMLParser
from build_structure import home_storage_block
class Links(HTMLParser):
    def __init__(self): super().__init__(); self.hrefs=[]
    def handle_starttag(self,tag,attrs):
        if tag=='a': self.hrefs.append(dict(attrs).get('href',''))
class BuyingChecks(unittest.TestCase):
    def test_checks_keep_existing_shops_and_resolvable_guides(self):
        text=home_storage_block(); parser=Links(); parser.feed(text)
        self.assertEqual(text.count('<strong>Vor dem Kauf:</strong>'),4)
        self.assertIn('meine kurze Kaufprüfung',text)
        self.assertNotIn('In mehreren Fachvergleichen',text)
        self.assertEqual(sum('amazon.de/' in u for u in parser.hrefs),4)
        for href in parser.hrefs:
            if href.startswith('/guide/'):
                self.assertTrue((Path(__file__).resolve().parents[1]/'site'/href.lstrip('/')).exists(),href)
if __name__=='__main__': unittest.main()
