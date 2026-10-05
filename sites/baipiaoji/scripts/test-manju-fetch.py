import datetime, unittest
from importlib.machinery import SourceFileLoader
m=SourceFileLoader('manju_fetch',__file__.replace('test-manju-fetch.py','manju-fetch.py')).load_module()
def fixture(date='10月5日已更新',heat='7174万热度'):
    return (date+''.join(f'<article aria-labelledby="rank-title-{i}"><h2>标题{i}</h2><span class="pc-badge-number-test">{i}</span><p class="pc-metrics-test">{heat}</p><div class="pc-categories-test"><span>都市</span></div><a href="/detail?series_id={100+i}">官方</a><picture><source type="image/webp" srcset="https://p3-novel.byteimg.com/novel-pic/a.webp"><img src="x"></picture></article>' for i in range(1,21))).encode()
class Tests(unittest.TestCase):
    def test_valid(self):
        date,rows=m.parse_page(fixture(),m.BASE+'/rank/hot-ai-drama',datetime.date(2026,10,5));self.assertEqual(date,'2026-10-05');self.assertEqual(len(rows),20);self.assertEqual(rows[0]['value'],71740000)
    def test_fail_closed(self):
        for raw in (b'<html>please wait</html>',fixture('1月1日已更新'),fixture(heat='数据待更新')):
            with self.assertRaises(ValueError):m.parse_page(raw,m.BASE,datetime.date(2026,10,5))
    def test_year_boundary(self):
        date,_=m.parse_page(fixture('12月31日已更新'),m.BASE,datetime.date(2027,1,1));self.assertEqual(date,'2026-12-31')
if __name__=='__main__':unittest.main()
