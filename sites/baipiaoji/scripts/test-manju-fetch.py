import copy, datetime, hashlib, html, json, pathlib, sys, unittest
from importlib.machinery import SourceFileLoader
m=SourceFileLoader('manju_fetch',__file__.replace('test-manju-fetch.py','manju-fetch.py')).load_module()
def fixture(date='10月5日已更新',heat='7174万热度'):
    return (date+''.join(f'<article aria-labelledby="rank-title-{i}"><h2>标题{i}</h2><span class="pc-badge-number-test">{i}</span><p class="pc-metrics-test">{heat}</p><div class="pc-categories-test"><span>都市</span></div><a href="/detail?series_id={100+i}">官方</a><picture><source type="image/webp" srcset="https://p3-novel.byteimg.com/novel-pic/a.webp"><img src="x"></picture></article>' for i in range(1,21))).encode()

def synthetic_identity_payload():
    # Locally constructed HTML using saved metadata, not a source response or a
    # replay of the rejected Nov3 payload. Network functions are never called.
    data=json.loads((pathlib.Path(__file__).parent.parent/'data/manju-insights.json').read_text())
    today=datetime.date.fromisoformat(data['reviewedAt']); cohorts=[]
    catalog=json.loads((pathlib.Path(__file__).parent.parent/'data/manju.json').read_text())
    known_urls=[r.get('url','') for c in data['cohorts'] for r in c['records']]+[x.get('destination','') for x in catalog['items']]+[e['url'] for x in catalog['items'] for e in x.get('searchEvidence',[])]
    known_ids=[int(match[1]) for url in known_urls if (match:=m.re.fullmatch(m.re.escape(m.BASE)+r'/detail\?series_id=(\d+)',url))]
    new_ids=[max(known_ids)+1,max(known_ids)+2]
    title='合成同名来源记录'+str(new_ids[0])+'第五季'
    while any(x['title']==title for x in catalog['items']): title='合成'+title
    for cohort in [c for c in data['cohorts'] if c['metric']=='snapshot_heat']:
        kind='comic-drama' if 'comic-drama' in cohort['id'] else 'ai-drama'
        records=copy.deepcopy(cohort['records'])
        if kind=='ai-drama':
            records[0]['title']=records[1]['title']=title
            for i in range(2): records[i]['url']=m.BASE+'/detail?series_id='+str(new_ids[i])
        rows=[]; pages=[]; dates=set()
        for offset in range(0,100,20):
            source=m.BASE+'/rank/hot-'+kind+('' if offset==0 else '?page='+str(offset//20+1))
            raw=(f'{today.month}月{today.day}日已更新'+''.join(
                f'<article aria-labelledby="rank-title-{r["sourceRank"]}"><h2>{html.escape(r["title"])}</h2><span class="pc-badge-number-fixture">{r["sourceRank"]}</span><p class="pc-metrics-fixture">{r["displayValue"]}热度</p><div class="pc-categories-fixture">'+''.join(f'<span>{html.escape(t)}</span>' for t in r['tags'])+f'</div><a href="{html.escape(r["url"].removeprefix(m.BASE))}">官方</a><img src="{html.escape(r["thumbnail"]["url"])}"></article>' for r in records[offset:offset+20])).encode()
            date,batch=m.parse_page(raw,source,today);dates.add(date);rows.extend(batch)
            pages.append(dict(url=source,sha256=hashlib.sha256(raw).hexdigest(),count=len(batch)))
        m.validate_snapshot(dates,rows)
        cohorts.append(dict(kind=kind,observedAt=dates.pop(),records=rows,sourcePages=pages))
    return dict(checkedAt=today.isoformat(),checkedAtTime=today.isoformat()+'T08:00:00Z',cohorts=cohorts)
class Tests(unittest.TestCase):
    def test_valid(self):
        date,rows=m.parse_page(fixture(),m.BASE+'/rank/hot-ai-drama',datetime.date(2026,10,5));self.assertEqual(date,'2026-10-05');self.assertEqual(len(rows),20);self.assertEqual(rows[0]['value'],71740000)
    def test_fail_closed(self):
        for raw in (b'<html>please wait</html>',fixture('1月1日已更新'),fixture(heat='数据待更新')):
            with self.assertRaises(ValueError):m.parse_page(raw,m.BASE,datetime.date(2026,10,5))
    def test_year_boundary(self):
        date,_=m.parse_page(fixture('12月31日已更新'),m.BASE,datetime.date(2027,1,1));self.assertEqual(date,'2026-12-31')
    def test_distinct_ids_can_share_title(self):
        cohort=synthetic_identity_payload()['cohorts'][0]
        self.assertEqual(cohort['records'][0]['title'],cohort['records'][1]['title'])
        self.assertNotEqual(cohort['records'][0]['url'],cohort['records'][1]['url'])
        m.validate_snapshot({cohort['observedAt']},cohort['records'])
    def test_snapshot_keeps_identity_and_completeness_guards(self):
        cohort=synthetic_identity_payload()['cohorts'][0]
        for variant in ('duplicate_id','count','rank','host','extra_query','date'):
            rows=copy.deepcopy(cohort['records']);dates={cohort['observedAt']}
            if variant=='duplicate_id': rows[1]['url']=rows[0]['url'];rows[1]['title']='合成另一标题'
            if variant=='count': rows.pop()
            if variant=='rank': rows[1]['sourceRank']=1
            if variant=='host': rows[1]['url']='https://example.invalid/detail?series_id=1'
            if variant=='extra_query': rows[1]['url']+='&other=1'
            if variant=='date': dates.add('2020-01-01')
            with self.subTest(variant=variant), self.assertRaises(ValueError):m.validate_snapshot(dates,rows)
if __name__=='__main__':
    if sys.argv[1:]==['--synthetic-identity-payload']:print(json.dumps(synthetic_identity_payload(),ensure_ascii=False))
    else:unittest.main()
