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

test('seasonal comparison and guide click counts use complete human days outside the affiliate totals', async () => {
 const script = `import json,sqlite3,sys
db=sqlite3.connect(':memory:');db.row_factory=sqlite3.Row
db.execute('CREATE TABLE ev(day,name,page,ref,ua_class,meta)')
path='/waeschetrockner-oder-luftentfeuchter.html'
def add(day, action, page=path, ua='human'):
 db.execute('INSERT INTO ev VALUES(?,?,?,?,?,?)',(day,action,page,'',ua,''))
add('2026-11-25','eco_laundry_season_check')
add('2026-11-24','eco_laundry_season_guide',ua='bot')
add('2026-11-24','eco_laundry_season_guide',page='/wrong.html')
add('2026-11-25','page_view')
add('2026-11-26','eco_laundry_season_check')
add('2026-11-26','eco_laundry_season_guide')
add('2026-11-26','affiliate_click')
add('2026-11-27','eco_laundry_season_guide')
query=sys.stdin.read().replace("date('now'","date('2026-11-27'")
print(json.dumps([dict(r) for r in db.execute(query)]))`;
 const input=spawnSync('python3',['-c',script],{input:AUDIT_SQL,encoding:'utf8'});
 assert.equal(input.status,0,input.stderr);
 const rows=JSON.parse(input.stdout);
 const report=await affiliateAudit(dbFor(rows),()=> 'direct');
 const week=report.weeks.at(-1);
 assert.deepEqual(week.laundry_season,{first_recorded_day:'2026-11-25',measured_comparisons:2,model_guide_clicks:1});
 assert.equal(week.page_views,1);
 assert.equal(week.affiliate_clicks,1);
 assert.equal(report.weeks.at(-2).laundry_season,null);
 const noClick=await affiliateAudit(dbFor(rows.filter(row=>row.name!=='eco_laundry_season_guide')),()=> 'direct');
 assert.equal(noClick.weeks.at(-1).laundry_season.model_guide_clicks,null);
});

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
  assert.equal(d.weeks.at(-1).window_reddit_referrals,null);
});

test('one bounded SQLite query counts exact Reddit arrivals only on eligible window guide events', async () => {
  const script = `import json,sqlite3,sys
db=sqlite3.connect(':memory:');db.row_factory=sqlite3.Row
db.execute('CREATE TABLE ev(day,name,page,ref,ua_class,meta)')
db.execute('CREATE INDEX ev_day ON ev(day)')
guide='/guide/fenster-beschlagen-innen.html'
def add(day,ref='',ua='human',page=guide,name='page_view'):
 db.execute('INSERT INTO ev VALUES(?,?,?,?,?,?)',(day,name,page,ref,ua,''))
add('2026-11-08')
add('2026-11-15','www.google.de')
add('2026-11-15','m.reddit.com',None)
add('2026-11-22','www.reddit.com')
add('2026-11-22','www.reddit.com',None)
add('2026-11-22','old.reddit.com')
add('2026-11-22','old.reddit.com','ci')
add('2026-11-22','reddit.com.evil.test')
add('2026-11-22','fake-reddit.com')
add('2026-11-22')
add('2026-11-22','reddit.com',page='/guide/richtig-lueften-im-winter.html')
add('2026-11-22','reddit.com',name='affiliate_click')
add('2026-11-24','reddit.com')
q=sys.stdin.read().replace("date('now'","date('2026-11-24'")
print(json.dumps([dict(r) for r in db.execute(q)]))`;
  const fixture = spawnSync('python3',['-c',script],{input:AUDIT_SQL,encoding:'utf8'});
  assert.equal(fixture.status,0,fixture.stderr);
  const report = await affiliateAudit(dbFor(JSON.parse(fixture.stdout)),()=> 'social');
  const expected = {human_classified_page_views:5,page_views_with_referrer:4,reddit_page_views:2};
  assert.deepEqual(report.weeks.at(-1).window_reddit_referrals,expected);
  assert.deepEqual(report.last_three_complete_days.window_reddit_referrals,expected);
  const rivalWeek = {human_classified_page_views:1,page_views_with_referrer:1,reddit_page_views:0};
  assert.deepEqual(report.weeks.at(-2).window_reddit_referrals,rivalWeek);
  assert.deepEqual(report.same_weekdays_previous_week.window_reddit_referrals,rivalWeek);
  assert.deepEqual(report.weeks.at(-3).window_reddit_referrals,
    {human_classified_page_views:1,page_views_with_referrer:0,reddit_page_views:null});
  assert.equal(report.weeks.at(-1).page_views,7);
  assert.equal(report.weeks.at(-1).affiliate_clicks,1);
  assert.equal(report.amazon_orders,null);
  assert.doesNotMatch(JSON.stringify(report),/reddit\.com|google\.de|evil\.test|fenster-beschlagen-innen\.html/);
});

test('the marked window TikTok evidence uses only complete post-launch dates and preserves legacy totals',async()=>{
  const script=`import json,sqlite3,sys
db=sqlite3.connect(':memory:');db.row_factory=sqlite3.Row
db.execute('CREATE TABLE ev(day,name,page,ref,ua_class,meta)')
db.execute('CREATE INDEX ev_day ON ev(day)')
guide='/guide/fenster-beschlagen-innen.html'
products='/produkte.html'
def add(day,name,page,marker=None,link=None,ua='human',mcp=None):
 meta={k:v for k,v in dict(window_tiktok_entry=marker,link_url=link,mcp_window_entry=mcp).items() if v is not None}
 db.execute('INSERT INTO ev VALUES(?,?,?,?,?,?)',(day,name,page,'example.test',ua,json.dumps(meta)))
add('2026-11-22','page_view',guide,1)
add('2026-11-23','page_view',guide,1)
add('2026-11-23','page_view',guide,1)
add('2026-11-23','page_view',guide,'1')
add('2026-11-23','page_view',guide,1,ua='bot')
add('2026-11-24','eco_window_width_check',products,1)
add('2026-11-24','eco_window_width_check',products,True)
add('2026-11-24','eco_window_width_check',guide,1)
add('2026-11-24','page_view',products,mcp=1)
add('2026-11-24','affiliate_click',products,1,'https://www.amazon.de/s?tag=getecoback-21')
add('2026-11-24','affiliate_click',products,1,'https://amazon.de.evil.test/s')
add('2026-11-25','page_view',guide,1)
q=sys.stdin.read().replace("date('now'","date('2026-11-25'")
print(json.dumps([dict(r) for r in db.execute(q)]))`;
  const fixture=spawnSync('python3',['-c',script],{input:AUDIT_SQL,encoding:'utf8'});
  assert.equal(fixture.status,0,fixture.stderr);
  const rows=JSON.parse(fixture.stdout).reverse();
  const result=await affiliateAudit(dbFor(rows),()=> 'self');
  const expected={start:'2026-11-23',end_exclusive:'2026-11-25',first_recorded_day:'2026-11-23',
    tagged_landing_views:2,width_checks:1,model_search_clicks:1};
  assert.deepEqual(result.weeks.at(-1).window_tiktok,expected);
  assert.deepEqual(result.last_three_complete_days.window_tiktok,expected);
  assert.equal(result.weeks.at(-2).window_tiktok,null);
  assert.equal(result.weeks.at(-1).page_views,5);
  assert.equal(result.weeks.at(-1).affiliate_clicks,2);
  assert.deepEqual(result.weeks.at(-1).channels.self,{page_views:5,affiliate_clicks:2});
  assert.deepEqual(result.weeks.at(-1).mcp_window_entry,{first_recorded_day:'2026-11-24',page_views:1,model_search_clicks:0});
  assert.equal(result.amazon_orders,null);
  const missing=await affiliateAudit(dbFor(rows.filter(r=>r.name!=='affiliate_click')),()=> 'self');
  assert.equal(missing.weeks.at(-1).window_tiktok.model_search_clicks,null);
  assert.doesNotMatch(JSON.stringify(result),/example\.test|amazon\.|window_tiktok_entry|getecoback-21/);
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
    // folded into the fixed buying paths just because names overlap.
    ...[floor+'-unreviewed',floor+'?private=value','/en'+floor,
      '/guide/tineco-saugt-nicht-mehr.html','/guide/heizluefter-stromverbrauch.html']
      .map(path=>row('2026-11-10',path,'page_view',11)),
  ];
  const audit=await affiliateAudit(dbFor(rows),()=> 'search');
  const emptyLaterPaths={robot:{page_views:0,affiliate_clicks:0},humidifier:{page_views:0,affiliate_clicks:0}};
  const expectedRecent={smart_thermostat:{page_views:7,affiliate_clicks:2},saugwischer:{page_views:5,affiliate_clicks:1},...emptyLaterPaths};
  const expectedPrior={smart_thermostat:{page_views:3,affiliate_clicks:0},saugwischer:{page_views:0,affiliate_clicks:4},...emptyLaterPaths};
  assert.deepEqual(audit.last_three_complete_days.buying_paths,expectedRecent);
  assert.deepEqual(audit.same_weekdays_previous_week.buying_paths,expectedPrior);
  assert.deepEqual(audit.weeks.at(-1).buying_paths,expectedRecent);
  assert.deepEqual(audit.weeks.at(-2).buying_paths,expectedPrior);
  for(const w of audit.weeks.slice(0,-2)) {
    assert.deepEqual(w.buying_paths,{smart_thermostat:{page_views:0,affiliate_clicks:0},saugwischer:{page_views:0,affiliate_clicks:0},...emptyLaterPaths});
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

test('robot and humidifier buying paths stay exact, independent and additive across comparison windows',async()=>{
  const robot='/guide/saugroboter-kaufberatung.html';
  const humidifier='/guide/luftbefeuchter-ratgeber.html';
  const row=(day,page,name,n)=>({day,page,name,n,ref:'private-ref.test',
    link:'https://www.amazon.de/s?k=private-model',source:'body',end_exclusive:'2026-11-12'});
  const rows=[
    row('2026-11-10',robot,'page_view',8),
    row('2026-11-10',robot,'affiliate_click',2),
    row('2026-11-11',humidifier,'page_view',6),
    row('2026-11-11',humidifier,'affiliate_click',3),
    row('2026-11-03',robot,'affiliate_click',1),
    row('2026-11-03',humidifier,'page_view',4),
    ...[robot+'-unreviewed',robot+'?private=value',robot+'#modelle','/en'+robot,
      '/guide/luftbefeuchter-stromverbrauch.html','/guide/luftentfeuchter-ratgeber.html',
      '/guide/luftbefeuchter-ratgeber.md','/guide/saugwischer-kaufberatung.html']
      .map(path=>row('2026-11-10',path,'page_view',11)),
  ];
  const audit=await affiliateAudit(dbFor(rows),()=> 'search');
  const recent={smart_thermostat:{page_views:0,affiliate_clicks:0},saugwischer:{page_views:11,affiliate_clicks:0},
    robot:{page_views:8,affiliate_clicks:2},humidifier:{page_views:6,affiliate_clicks:3}};
  const prior={smart_thermostat:{page_views:0,affiliate_clicks:0},saugwischer:{page_views:0,affiliate_clicks:0},
    robot:{page_views:0,affiliate_clicks:1},humidifier:{page_views:4,affiliate_clicks:0}};
  assert.deepEqual(audit.last_three_complete_days.buying_paths,recent);
  assert.deepEqual(audit.weeks.at(-1).buying_paths,recent);
  assert.deepEqual(audit.same_weekdays_previous_week.buying_paths,prior);
  assert.deepEqual(audit.weeks.at(-2).buying_paths,prior);
  for(const path of [robot,humidifier]) {
    const expected=path===robot?'other_guides':'humidity';
    assert.equal(pageGroup(path),expected);
    assert.equal(pageGroupV2(path),expected);
  }
  assert.deepEqual(audit.last_three_complete_days.cohorts,{
    other_guides:{page_views:63,affiliate_clicks:2},humidity:{page_views:39,affiliate_clicks:3}});
  assert.deepEqual(audit.last_three_complete_days.cohorts_v2,audit.last_three_complete_days.cohorts);
  assert.equal(audit.cohorts_v2_version,'task-path-v2-2026-11-06');
  for(const section of [...audit.weeks,audit.last_three_complete_days,audit.same_weekdays_previous_week]) {
    assert.deepEqual(Object.keys(section.buying_paths),['smart_thermostat','saugwischer','robot','humidifier']);
    for(const field of ['page_views','affiliate_clicks']) {
      assert.equal(Object.values(section.cohorts).reduce((n,c)=>n+c[field],0),section[field]);
      assert.equal(Object.values(section.cohorts_v2).reduce((n,c)=>n+c[field],0),section[field]);
    }
  }
  assert.doesNotMatch(JSON.stringify(audit),/\/guide\/|private-|private=|amazon\./);
  assert.equal(audit.amazon_orders,null);
});

test('cellar totals and catalog destinations count only their own page and surface', async () => {
  const cellar = '/guide/luftentfeuchter-keller.html';
  const rows = [
    [cellar, 'page_view', '', '', 10],
    [cellar, 'affiliate_click', 'models','/dp/EXAMPLE', 3],
    [cellar, 'affiliate_click', 'models','/s?k=example', 2],
    [cellar, 'affiliate_click', 'body','/dp/EXAMPLE', 1],
    ['/guide/luftentfeuchter-ratgeber.html','affiliate_click','models','/dp/EXAMPLE', 4],
  ].map(([page,name,source,path,n]) => ({
    day:'2026-09-30',end_exclusive:'2026-10-01',page,name,source,link:'https://www.amazon.de'+path,n,ref:'',
  }));
  const audit = await affiliateAudit(dbFor(rows), () => 'direct');
  assert.deepEqual(audit.weeks.at(-1).cellar_catalog, {
    page_views:10, affiliate_clicks:6, catalog_product_clicks:3, catalog_search_clicks:2,
  });
});

test('N90 guide rows distinguish exact German tagged product, search and other pages',async()=>{
  const model='/guide/delonghi-pac-n90-test.html',family='/guide/delonghi-pinguino-vergleich.html';
  const dp='https://www.amazon.de/dp/B07NC5CP6F?tag=getecoback-21';
  const rows=[
    [model,'page_view','',3],[model,'affiliate_click',dp,2],[model,'affiliate_click',dp.replace('.de/', '.com/'),1],
    [family,'affiliate_click',dp.replace('/dp/', '/gp/product/'),1],[family,'affiliate_click','https://www.amazon.de/s?tag=getecoback-21',2],
    [family,'affiliate_click',dp.replace('getecoback-21','other'),1],['/','affiliate_click',dp,4],
  ].map(([page,name,link,n])=>({day:'2026-09-30',end_exclusive:'2026-10-01',page,name,link,n,source:'body',ref:''}));
  const audit=await affiliateAudit(dbFor(rows),()=> 'direct');
  assert.deepEqual(audit.weeks.at(-1).n90_guides,{
    model:{page_views:3,affiliate_clicks:3,exact_product_clicks:2},
    family:{page_views:0,affiliate_clicks:4,exact_product_clicks:1},
  });
});

test('tagged cellar cohorts reflect only instrumented complete UTC days and preserve all ordinary counts',async()=>{
  const script = `import json,sqlite3,sys
db=sqlite3.connect(':memory:'); db.row_factory=sqlite3.Row
db.execute('CREATE TABLE ev(day,name,page,ref,ua_class,meta)')
cellar='/guide/luftentfeuchter-keller.html'
def add(day,name,page=cellar,ua='human',tag=1):
 db.execute('INSERT INTO ev VALUES (?,?,?,?,?,?)',(day,name,page,'',ua,json.dumps({'mcp_drain_entry':tag})))
add('2026-11-19','page_view')
add('2026-11-20','page_view'); add('2026-11-20','affiliate_click')
add('2026-11-20','page_view',tag=0); add('2026-11-20','affiliate_click',ua=None)
add('2026-11-21','affiliate_click',page='/guide/other.html'); add('2026-11-21','page_view',ua='bot')
sql=sys.stdin.read().replace("date('now'","date('2026-11-22'")
print(json.dumps([dict(r) for r in db.execute(sql)]))`;
  const data=spawnSync('python3',['-c',script],{input:AUDIT_SQL,encoding:'utf8'});
  assert.equal(data.status,0,data.stderr);
  const audit=await affiliateAudit(dbFor(JSON.parse(data.stdout)),()=>'direct');
  assert.equal(audit.weeks.at(-2).mcp_drain_entry,null);
  assert.deepEqual(audit.weeks.at(-1).mcp_drain_entry,{start:'2026-11-20',end_exclusive:'2026-11-22',page_views:1,affiliate_clicks:1});
  assert.deepEqual(audit.last_three_complete_days.mcp_drain_entry,audit.weeks.at(-1).mcp_drain_entry);
  assert.deepEqual(audit.weeks.at(-1).cellar_catalog,{page_views:3,affiliate_clicks:2,catalog_product_clicks:0,catalog_search_clicks:0});
});

test('window evidence counts fixed recorded events without inferring evidence for empty periods',async()=>{
  const fixture = `import json,sqlite3,sys
db=sqlite3.connect(':memory:'); db.row_factory=sqlite3.Row
db.execute('CREATE TABLE ev(day,name,page,ref,ua_class,meta)')
def add(day,name,marker,page='/produkte.html',ua='human'):
 db.execute('INSERT INTO ev VALUES (?,?,?,?,?,?)',(day,name,page,'',ua,json.dumps({'mcp_window_entry':marker})))
add('2026-11-21','page_view',1)
add('2026-11-22','affiliate_click',1)
add('2026-11-22','page_view',True)
add('2026-11-22','page_view','1')
add('2026-11-22','page_view',1,page='/guide/other.html')
add('2026-11-22','page_view',1,ua=None)
add('2026-11-23','page_view',1)
sql=sys.stdin.read().replace("date('now'","date('2026-11-23'")
print(json.dumps([dict(r) for r in db.execute(sql)]))`;
  const result=spawnSync('python3',['-c',fixture],{input:AUDIT_SQL,encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  const audit=await affiliateAudit(dbFor(JSON.parse(result.stdout).reverse()),()=>'direct');
  assert.deepEqual(audit.last_three_complete_days.mcp_window_entry,{
    first_recorded_day:'2026-11-21',page_views:1,model_search_clicks:1,
  });
  assert.equal(audit.last_three_complete_days.page_views,5);
  assert.equal(audit.weeks.at(-2).mcp_window_entry,null);
  assert.equal(audit.same_weekdays_previous_week.mcp_window_entry,null);
  assert.doesNotMatch(JSON.stringify(audit),/produkte\.html|eco-mcp|amazon\.de/);
});

test('PortaSplit entry counts only validated metadata in complete days and preserves the other cohorts',async()=>{
  const fixture = `import json,sqlite3,sys
db=sqlite3.connect(':memory:'); db.row_factory=sqlite3.Row
db.execute('CREATE TABLE ev(day,name,page,ref,ua_class,meta)')
porta='/guide/midea-portasplit-ausverkauft-alternativen.html'
def add(day,name,meta,page=porta,ua='human'):
 db.execute('INSERT INTO ev VALUES (?,?,?,?,?,?)',(day,name,page,'',ua,json.dumps(meta)))
add('2026-11-21','page_view',{'mcp_portasplit_entry':1})
add('2026-11-22','affiliate_click',{'mcp_portasplit_entry':1,'link_url':'https://www.amazon.de/s?tag=getecoback-21'})
add('2026-11-22','page_view',{'mcp_portasplit_entry':True})
add('2026-11-22','page_view',{'mcp_portasplit_entry':'1'})
add('2026-11-22','affiliate_click',{},page=porta)
add('2026-11-22','page_view',{'mcp_portasplit_entry':1},page='/guide/other.html')
add('2026-11-22','page_view',{'mcp_portasplit_entry':1},ua=None)
add('2026-11-22','page_view',{'mcp_portasplit_entry':1},ua='bot')
add('2026-11-22','page_view',{'mcp_window_entry':1},page='/produkte.html')
add('2026-11-22','page_view',{'mcp_drain_entry':1},page='/guide/luftentfeuchter-keller.html')
add('2026-11-23','page_view',{'mcp_portasplit_entry':1})
sql=sys.stdin.read().replace("date('now'","date('2026-11-23'")
print(json.dumps([dict(r) for r in db.execute(sql)]))`;
  const result=spawnSync('python3',['-c',fixture],{input:AUDIT_SQL,encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  const audit=await affiliateAudit(dbFor(JSON.parse(result.stdout)),()=>'direct');
  const recorded={first_recorded_day:'2026-11-21',page_views:1,model_search_clicks:1};
  assert.deepEqual(audit.last_three_complete_days.mcp_portasplit_entry,recorded);
  assert.deepEqual(audit.weeks.at(-1).mcp_portasplit_entry,recorded);
  assert.equal(audit.weeks.at(-2).mcp_portasplit_entry,null);
  assert.equal(audit.same_weekdays_previous_week.mcp_portasplit_entry,null);
  assert.deepEqual(audit.last_three_complete_days.mcp_window_entry,{first_recorded_day:'2026-11-22',page_views:1,model_search_clicks:0});
  assert.equal(audit.last_three_complete_days.mcp_drain_entry.page_views,1);
  assert.equal(audit.last_three_complete_days.affiliate_clicks,2);
  assert.doesNotMatch(JSON.stringify(audit),/midea-portasplit-ausverkauft|amazon\.de|\?mcp_entry=/);
});


test('German compact cellar entries require the exact marker and normalized model search; the original drain cohort is independent',async()=>{
  const script=`import json,sqlite3,sys
db=sqlite3.connect(':memory:'); db.row_factory=sqlite3.Row
db.execute('CREATE TABLE ev(day,name,page,ref,ua_class,meta)')
cellar='/guide/luftentfeuchter-keller.html'
search='https://www.amazon.de/s?tag=getecoback-21'
def add(day,name,meta,ua='human',page=cellar):
 db.execute('INSERT INTO ev VALUES(?,?,?,?,?,?)',(day,name,page,'www.bing.com',ua,meta if isinstance(meta,str) else json.dumps(meta)))
add('2026-11-21','page_view',{'mcp_drain_entry':1})
add('2026-11-23','page_view',{'mcp_cellar_entry':1})
add('2026-11-24','affiliate_click',{'mcp_cellar_entry':1,'link_url':search})
add('2026-11-24','affiliate_click',{'mcp_drain_entry':1,'link_url':search})
for invalid in [search.replace('.de','.com'),search.replace('getecoback-21','bad'),search+'&k=other',search.replace('/s?', '/dp/B07NC5CP6F?')]:
 add('2026-11-23','affiliate_click',{'mcp_cellar_entry':1,'link_url':invalid})
for marker in [True,'1',0,None]: add('2026-11-24','page_view',{'mcp_cellar_entry':marker})
add('2026-11-24','page_view','{broken'); add('2026-11-24','page_view',{'mcp_cellar_entry':1},page=cellar+'-copy')
for ua in [None,'ci','bot','other']: add('2026-11-24','page_view',{'mcp_cellar_entry':1},ua=ua)
add('2026-11-25','page_view',{'mcp_cellar_entry':1})
sql=sys.argv[1].replace("date('now'", "date('2026-11-25'")
print(json.dumps([dict(r) for r in db.execute(sql)]))`;
  const result=spawnSync('python3',['-c',script,AUDIT_SQL],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  const audit=await affiliateAudit(dbFor(JSON.parse(result.stdout)),()=>'search');
  const observed={first_recorded_day:'2026-11-23',page_views:1,model_search_clicks:1};
  assert.deepEqual(audit.weeks.at(-1).mcp_cellar_entry,observed);
  assert.deepEqual(audit.last_three_complete_days.mcp_cellar_entry,observed);
  assert.equal(audit.weeks.at(-2).mcp_cellar_entry,null);
  assert.equal(audit.same_weekdays_previous_week.mcp_cellar_entry,null);
  assert.equal(audit.weeks.at(-1).mcp_drain_entry.page_views,1);
  assert.equal(audit.weeks.at(-1).mcp_drain_entry.affiliate_clicks,1);
  assert.equal(audit.weeks.at(-1).mcp_window_entry,null);
  assert.equal(audit.weeks.at(-1).mcp_portasplit_entry,null);
  assert.equal(audit.weeks.at(-1).affiliate_clicks,6);
});

test('N90 entry counts only human tagged guide views and the exact marked product detail in complete UTC dates', async () => {
  const script = `import json,sqlite3,sys
db=sqlite3.connect(':memory:'); db.row_factory=sqlite3.Row
db.execute('CREATE TABLE ev(day,name,page,ref,meta,ua_class)')
model='/guide/delonghi-pac-n90-test.html'
family='/guide/delonghi-pinguino-vergleich.html'
dp='https://www.amazon.de/dp/B07NC5CP6F?tag=getecoback-21'
def add(day,name,meta,ua='human',page=model):
 db.execute('INSERT INTO ev VALUES(?,?,?,?,?,?)',(day,name,page,'',meta if isinstance(meta,str) else json.dumps(meta),ua))
view={'mcp_n90_entry':1}
click={**view,'link_url':dp}
add('2026-11-24','affiliate_click',click); add('2026-11-23','page_view',view)
add('2026-11-22','page_view',{}); add('2026-11-22','affiliate_click',{'link_url':dp})
for marker in [0,2,True,'1',None]: add('2026-11-21','page_view',{'mcp_n90_entry':marker})
for link in [dp.replace('NC5CP6F','KJYD1ZP'),dp.replace('/dp/','/gp/product/'),dp+'&foo=bar','https://www.amazon.de/s?tag=getecoback-21']:
 add('2026-11-21','affiliate_click',{**click,'link_url':link})
for ua in [None,'ci','bot','other']: add('2026-11-21','page_view',view,ua=ua)
add('2026-11-21','page_view','{broken'); add('2026-11-21','affiliate_click',click,page=family)
add('2026-11-25','page_view',view); add('2026-11-17','affiliate_click',{**click,'mcp_n90_entry':False})
sql=sys.argv[1].replace("date('now'", "date('2026-11-25'")
print(json.dumps([dict(row) for row in db.execute(sql)]))`;
  const fixture=spawnSync('python3',['-c',script,AUDIT_SQL],{encoding:'utf8'});
  assert.equal(fixture.status,0,fixture.stderr);
  const audit=await affiliateAudit(dbFor(JSON.parse(fixture.stdout)),()=>'direct');
  const observed={first_recorded_day:'2026-11-23',page_views:1,exact_product_clicks:1};
  assert.deepEqual(audit.weeks.at(-1).mcp_n90_entry,observed);
  assert.deepEqual(audit.last_three_complete_days.mcp_n90_entry,observed);
  assert.equal(audit.weeks.at(-2).mcp_n90_entry,null);
  assert.equal(audit.same_weekdays_previous_week.mcp_n90_entry,null);
  assert.equal(audit.weeks.at(-1).n90_guides.model.exact_product_clicks,3);
  assert.equal(audit.weeks.at(-1).n90_guides.family.exact_product_clicks,1);
  assert.equal(audit.weeks.at(-1).mcp_cellar_entry,null);
});
