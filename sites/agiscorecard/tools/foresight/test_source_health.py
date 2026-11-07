import copy
import unittest
from source_health import source_health

class SourceHealthTests(unittest.TestCase):
    def fixtures(self):
        return ({'checkedAt':'2026-11-07T00:00:00Z','sources':[{'id':'interview','status':'ok'}],'items':[]}, {'checkedAt':'2026-11-07T00:00:00Z','sources':[{'id':'xai','ok':True}],'items':[{'title':'Last verified content','publishedAt':'2026-11-01'}]})
    def test_success(self):
        self.assertEqual(source_health(*self.fixtures()),{'status':'healthy','unavailable':[]})
    def test_outage_preserves_snapshot_and_reports_degradation(self):
        first, second=self.fixtures();second['sources'][0]['ok']=False
        before=copy.deepcopy((first,second))
        self.assertEqual(source_health(first,second),{'status':'degraded','unavailable':['company:xai']})
        self.assertEqual((first,second),before)
        first['sources'][0]['status']='error'
        self.assertEqual(source_health(first,second)['unavailable'],['interview','company:xai'])
    def test_corruption_still_blocks(self):
        for replacement in [None,{}, {'checkedAt':'now','items':[],'sources':[]}, {'checkedAt':'now','items':[],'sources':[{'id':'x','status':'unknown'}]}, {'checkedAt':'now','items':[],'sources':[{'id':'x\n::error::','status':'ok'}]}]:
            with self.assertRaises(ValueError): source_health(replacement,self.fixtures()[1])

if __name__=='__main__':unittest.main()
