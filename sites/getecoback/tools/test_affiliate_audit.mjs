import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {AUDIT_SQL,affiliateAudit,pageGroup,pageGroupV2,COHORTS_V2_VERSION} from '../src/affiliate-audit.mjs';

const fixture=`import sqlite3,json,sys
db=sqlite3.connect(':memory:');db.row_factory=sqlite3.Row
db.execute('CREATE TABLE ev(day,name,page,ref,ua_class,meta)')
db.execute('CREATE INDEX ev_day ON ev(day)')
def add(d,name='affiliate_click',page='/guide/klimaanlage-40-qm.html',ua='human',meta=None):
 db.execute('INSERT INTO ev VALUES(?,?,?,?,?,?)',(d,name,page,'www.bing.com',ua,meta or json.dumps({'link_url':'https://www.amazon.de/dp/B07NC5CP6F?tag=getecoback-21','source':'toppick'})))
for d in ['2026-08-05','2026-08-06','2026-09-02','2026-09-21','2026-09-23','2026-09-24','2026-09-28','2026-09-30','2026-10-01','2026-10-02']:add(d)
add('2026-09-28','page_view');add('2026-09-28','page_view')
add('2026-09-28',page='/guide/luftentfeuchter-25-qm.html',meta='{bad')
add('2026-09-28',ua=None,meta=json.dumps({'link_url':'https://amazon.de.evil.test/dp/x','source':'private-query'}))
for ua in ['ci','bot','other']:add('2026-09-28',ua=ua)
add('2026-09-28',page='/__ci/affiliate');add('2026-09-28','subscribe')
sql=sys.stdin.read().replace("date('now'","date('2026-10-01'")
print(json.dumps({'rows':[dict(r) for r in db.execute(sql)],'plan':[r[3] for r in db.execute('EXPLAIN QUERY PLAN '+sql)]}))`;
function data(){const r=spawnSync('python3',['-c',fixture],{input:AUDIT_SQL,encoding:'utf8'});assert.equal(r.status,0,r.stderr);return JSON.parse(r.stdout);}
const dbFor=rows=>({prepare(sql){assert.equal(sql,AUDIT_SQL);return {all:async()=>({results:rows,meta:{rows_read:30}})};}});

test('real SQLite: bounded complete dates, fixed weekdays, truthful gaps, conserved cohorts, private values absent',async()=>{
  const {rows,plan}=data();assert.ok(plan.some(x=>/SEARCH ev USING INDEX ev_day/.test(x)),plan.join('\n'));
  const d=await affiliateAudit(dbFor(rows),()=> 'search');
  assert.equal(d.start,'2026-08-06');assert.equal(d.end_exclusive,'2026-10-01');
  assert.equal(d.daily.length,56);assert.equal(d.weeks.length,8);
  assert.equal(d.daily.reduce((n,x)=>n+x.affiliate_clicks,0),9);
  assert.equal(d.daily.reduce((n,x)=>n+x.page_views,0),2);
  assert.equal(d.daily.filter(x=>x.known_collection_gap).length,3);
  assert.equal(d.last_three_complete_days.affiliate_clicks,4);
  assert.equal(d.same_weekdays_previous_week.affiliate_clicks,2);
  assert.equal(d.last_three_complete_days.start,'2026-09-28');
  assert.equal(d.same_weekdays_previous_week.start,'2026-09-21');
  for(const w of [...d.weeks,d.last_three_complete_days,d.same_weekdays_previous_week]) {
    for(const dimension of ['cohorts','cohorts_v2']) for(const field of ['page_views','affiliate_clicks']) {
      assert.equal(Object.values(w[dimension]).reduce((n,x)=>n+x[field],0),w[field]);
    }
    assert.equal(Object.values(w.channels).reduce((n,x)=>n+x.page_views,0),w.page_views);
    assert.equal(Object.values(w.destinations).reduce((n,x)=>n+x,0),w.affiliate_clicks);
  }
  assert.equal(d.last_three_complete_days.destinations.other,2);
  assert.equal(d.last_three_complete_days.models.n90,2);
  assert.equal(d.amazon_orders,null);
  assert.equal(d.query_rows_read,30);
  assert.equal(d.cohorts_v2_version,'task-path-v2-2026-11-06');
  assert.doesNotMatch(JSON.stringify(d),/bing\.com|amazon\.|40-qm|private-query|getecoback-21/);
});

test('missing DB results reject; valid empty days remain zero without claiming recovered data',async()=>{
  await assert.rejects(affiliateAudit(dbFor(undefined),()=> 'search'),/missing/);
  await assert.rejects(affiliateAudit(dbFor([{day:'bogus',n:1,end_exclusive:'2026-10-01'}]),()=> 'search'),/invalid/);
  const d=await affiliateAudit(dbFor([]),()=> 'direct',new Date('2026-10-01T09:00Z'));
  assert.equal(d.daily.reduce((n,x)=>n+x.affiliate_clicks,0),0);
  assert.equal(d.known_collection_gaps.length,3);
});

test('cohorts keep summer repair distinct from winter demand and retired storage',()=>{
  assert.equal(pageGroup('/guide/mobile-klimaanlage-stinkt-schimmel.html'),'cooling_other');
  assert.equal(pageGroup('/guide/luftentfeuchter-stinkt.html'),'humidity');
  assert.equal(pageGroup('/guide/heizluefter-stromverbrauch.html'),'heating');
  assert.equal(pageGroup('/en/energy-tariff-workbench.html'),'tools_and_other');
  assert.equal(pageGroup('/guide/klimaanlage-balkonkraftwerk.html'),'retired_storage');
});

test('v2 corrects reviewed humidity tasks while preserving the original experiment cohorts',()=>{
  const cases=[
    ['/guide/meacodry-arete-one-test.html','other_guides'],
    ['/en/guide/meaco-meacodry-arete-one-10l-running-cost.html','other_guides'],
    ['/waeschetrockner-oder-luftentfeuchter.html','tools_and_other'],
    ['/nl/ventilatie-of-luchtontvochtiger.html','tools_and_other'],
    ['/guide/trotec-ttk-30-e-betriebskosten.html','other_guides'],
    ['/guide/trotec-ttk-127-e-betriebskosten.html','other_guides'],
  ];
  for(const [path,legacy] of cases) {
    assert.equal(pageGroup(path),legacy,path);
    assert.equal(pageGroupV2(path),'humidity',path);
  }
  const unchanged=[
    ['/guide/mobile-klimaanlage-stinkt-schimmel.html','cooling_other'],
    ['/guide/klimaanlage-balkonkraftwerk.html','retired_storage'],
    ['/guide/heizluefter-stromverbrauch.html','heating'],
    ['/guide/comfee-geraete-test.html','cooling_other'],
    ['/guide/meaco-air-purifier-test.html','other_guides'],
    ['/guide/trotec-ttk-30-e-betriebskosten.html-unreviewed','other_guides'],
    ['/guide/trotec-ttk-999-e-betriebskosten.html','other_guides'],
    ['/en/energy-tariff-workbench.html','tools_and_other'],
    ['/','home'],
  ];
  for(const [path,expected] of unchanged) assert.equal(pageGroupV2(path),expected,path);
});

test('v1 and v2 conserve all sections and old scorecard output stays identical without raw details',async()=>{
  const paths=[
    '/guide/meacodry-arete-one-test.html',
    '/waeschetrockner-oder-luftentfeuchter.html',
    '/nl/ventilatie-of-luchtontvochtiger.html',
    '/guide/trotec-ttk-96-e-betriebskosten.html',
  ];
  const rows=Array.from({length:56},(_,i)=>{
    const day=new Date(Date.UTC(2026,7,6+i)).toISOString().slice(0,10);
    return ['page_view','affiliate_click'].map(name=>({
      day,name,page:paths[i%paths.length],ref:'private-ref.test',n:i+1,
      link:'https://www.amazon.de/s?k=private-search&tag=private-tag',source:'body',
      end_exclusive:'2026-10-01',country:'PRIVATE_COUNTRY',
    }));
  }).flat();
  const audit=await affiliateAudit(dbFor(rows),()=> 'search');
  assert.equal(audit.cohorts_v2_version,COHORTS_V2_VERSION);
  for(const section of [...audit.weeks,audit.last_three_complete_days,audit.same_weekdays_previous_week]) {
    for(const field of ['page_views','affiliate_clicks']) {
      for(const dimension of ['cohorts','cohorts_v2']) {
        assert.equal(Object.values(section[dimension]).reduce((n,c)=>n+c[field],0),section[field]);
      }
      assert.equal(section.cohorts_v2.humidity[field],section[field]);
    }
    assert.equal(section.cohorts.humidity,undefined);
  }
  assert.doesNotMatch(JSON.stringify(audit),/meacodry|waeschetrockner|ventilatie|trotec|private-|amazon\.|PRIVATE_COUNTRY|country/);
  // Exercise the real existing consumer rather than duplicating its parser.
  const check=`import copy,importlib.util,json,sys
from datetime import date
spec=importlib.util.spec_from_file_location('legacy_monitor',sys.argv[1])
monitor=importlib.util.module_from_spec(spec);spec.loader.exec_module(monitor)
audit=json.load(sys.stdin);legacy=copy.deepcopy(audit)
legacy.pop('cohorts_v2_version')
for section in legacy['weeks']+[legacy['last_three_complete_days'],legacy['same_weekdays_previous_week']]:section.pop('cohorts_v2')
new_result=monitor.traffic({'affiliate_audit':audit},date(2026,10,1))
old_result=monitor.traffic({'affiliate_audit':legacy},date(2026,10,1))
assert new_result['status']=='current',new_result
assert new_result==old_result,'Additive v2 changed the legacy scorecard'
print(new_result['status'])`;
  const result=spawnSync('python3',['-c',check,fileURLToPath(new URL('../../../tools/affiliate-growth/monitor.py',import.meta.url))],{input:JSON.stringify(audit),encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  assert.equal(result.stdout.trim(),'current');
});

test('existing trend fails visibly when the audit query fails',async()=>{
  const {default:worker}=await import('../src/worker.js');
  const env={EVENTS:{prepare(sql){return {all:async()=>{if(sql===AUDIT_SQL)throw Error('D1 failed');return {results:[]};}};}}};
  const r=await worker.fetch(new Request('https://getecoback.com/api/trend'),env,{waitUntil(){}});
  assert.equal(r.status,503);assert.equal(r.headers.get('cache-control'),'no-store');
});

test('buying paths count exact pilot pages without changing frozen buckets or leaking paths',async()=>{
  const thermostat='/guide/smarte-heizkoerperthermostate-lohnen-sich.html';
  const floor='/guide/saugwischer-kaufberatung.html';
  const row=(day,page,name,n)=>({day,page,name,n,ref:'private-ref.test',
    link:'https://www.amazon.de/s?k=private-model',source:'body',end_exclusive:'2026-11-12'});
  const rows=[
    row('2026-11-10',thermostat,'page_view',7),
    row('2026-11-10',thermostat,'affiliate_click',2),
    row('2026-11-11',floor,'page_view',5),
    row('2026-11-11',floor,'affiliate_click',1),
    row('2026-11-03',thermostat,'page_view',3),
    row('2026-11-03',floor,'affiliate_click',4),
    // Prefixes, localized paths, maintenance pages and queries must not be
    // folded into the fixed two-page experiment just because names overlap.
    ...[floor+'-unreviewed',floor+'?private=value','/en'+floor,
      '/guide/tineco-saugt-nicht-mehr.html','/guide/heizluefter-stromverbrauch.html']
      .map(path=>row('2026-11-10',path,'page_view',11)),
  ];
  const audit=await affiliateAudit(dbFor(rows),()=> 'search');
  const expectedRecent={smart_thermostat:{page_views:7,affiliate_clicks:2},saugwischer:{page_views:5,affiliate_clicks:1}};
  const expectedPrior={smart_thermostat:{page_views:3,affiliate_clicks:0},saugwischer:{page_views:0,affiliate_clicks:4}};
  assert.deepEqual(audit.last_three_complete_days.buying_paths,expectedRecent);
  assert.deepEqual(audit.same_weekdays_previous_week.buying_paths,expectedPrior);
  assert.deepEqual(audit.weeks.at(-1).buying_paths,expectedRecent);
  assert.deepEqual(audit.weeks.at(-2).buying_paths,expectedPrior);
  for(const w of audit.weeks.slice(0,-2)) {
    assert.deepEqual(w.buying_paths,{smart_thermostat:{page_views:0,affiliate_clicks:0},saugwischer:{page_views:0,affiliate_clicks:0}});
  }
  for(const path of [thermostat,floor]) {
    const expected=path===thermostat?'heating':'other_guides';
    assert.equal(pageGroup(path),expected);
    assert.equal(pageGroupV2(path),expected);
  }
  assert.deepEqual(audit.last_three_complete_days.cohorts,{heating:{page_views:18,affiliate_clicks:2},other_guides:{page_views:49,affiliate_clicks:1}});
  assert.deepEqual(audit.last_three_complete_days.cohorts_v2,audit.last_three_complete_days.cohorts);
  assert.equal(audit.cohorts_v2_version,'task-path-v2-2026-11-06');
  assert.doesNotMatch(JSON.stringify(audit),/\/guide\/|private-|private=|amazon\./);
  assert.equal(audit.amazon_orders,null);
});
