#!/usr/bin/env python3
import json
import re
import unittest
from html import unescape
from urllib.robotparser import RobotFileParser
from build_discovery import ROOT, answers, render

class Discovery(unittest.TestCase):
    def test_visible_answers_and_schema_match_source(self):
        data=json.loads((ROOT/'data.json').read_text())
        for name,zh in [('index.html',False),('cn.html',True)]:
            s=(ROOT/name).read_text();self.assertEqual(s.count('<h1 ')+s.count('<h1>'),1)
            blocks=re.findall(r'<script type="application/ld\+json">(.*?)</script>',s,re.S)
            graph=[o for b in blocks for o in json.loads(b).get('@graph',[])]
            faq=[o for o in graph if o['@type']=='FAQPage'];self.assertEqual(len(faq),1)
            expected=answers(data,zh)
            self.assertEqual([(o['name'],o['acceptedAnswer']['text']) for o in faq[0]['mainEntity']],expected)
            visible=re.findall(r'<h3 class="faq-q">(.*?)</h3><p>(.*?)</p>',s,re.S)
            self.assertEqual([(unescape(q),unescape(a)) for q,a in visible],expected)
            dataset=next(o for o in graph if o['@type']=='Dataset')
            self.assertEqual(dataset['dateModified'],data['dateModified'])
            self.assertEqual(dataset['measurementTechnique'],data['thesisTracker']['method'])
            self.assertEqual(dataset['distribution'][0]['contentUrl'],'https://agiscorecard.com/data.json')
            self.assertTrue(any(o['@type']=='WebPage' for o in graph))
            for attr in ['og:image','twitter:image']:
                value=re.search(rf'<meta (?:property|name)="{attr}" content="([^"]+)"',s)[1]
                self.assertTrue((ROOT/value.replace('https://agiscorecard.com/','')).exists())

    def test_shared_crawler_rules(self):
        robots=RobotFileParser();robots.parse((ROOT/'robots.txt').read_text().splitlines())
        for bot in ['Googlebot','Bingbot','OAI-SearchBot','PerplexityBot','Claude-SearchBot','GPTBot','UnknownBot']:
            for path in ['/','/cn','/progress-index','/data.json','/index.md']:
                self.assertTrue(robots.can_fetch(bot,'https://agiscorecard.com'+path),(bot,path))
            for path in ['/tools/a.py','/CLAUDE.md','/OPT-LOG.md']:
                self.assertFalse(robots.can_fetch(bot,'https://agiscorecard.com'+path),(bot,path))
        self.assertIn('https://agiscorecard.com/video-sitemap.xml',robots.site_maps())

    def test_generation_is_idempotent(self):
        for path,text in render().items():self.assertEqual(path.read_text(),text,path.name)

if __name__=='__main__':unittest.main()
