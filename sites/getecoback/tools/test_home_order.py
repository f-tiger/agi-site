"""The daily homepage build must survive every season without losing links."""
from pathlib import Path
import re
import unittest
from build_home_order import compose
from build_season import season_of

class HomeOrderTest(unittest.TestCase):
    def test_all_months_preserve_links_and_cold_months_prioritise_german_tasks(self):
        source=(Path(__file__).resolve().parents[1]/'site/index.html').read_text()
        links=sorted(re.findall(r'href="([^"]*)"',source))
        for month in range(1,13):
            with self.subTest(month=month):
                result=compose(source,season_of(month))
                self.assertEqual(result,compose(result,season_of(month)))
                self.assertEqual(links,sorted(re.findall(r'href="([^"]*)"',result)))
                if month in (1,2,9,10,11,12):
                    winter=result.index('<!--EB_WINTER_LINK-->')
                    self.assertLess(result.index('<!--EB_SEASON-->'),winter)
                    for name in ('EB_COUNTRIES','EB_UK_PATH','EB_AU_COOLING'):
                        self.assertGreater(result.index('<!--'+name+'-->'),winter)
if __name__=='__main__': unittest.main()
