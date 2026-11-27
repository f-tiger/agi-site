import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {AUDIT_SQL,affiliateAudit,pageGroup,pageGroupV2,COHORTS_V2_VERSION} from '../src/affiliate-audit.mjs';
import worker from '../src/worker.js';

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

test('thermostat package collector accepts only the exact site action and stores no context', async () => {
 const origin = 'https://getecoback.com';
 const page = '/guide/smarte-heizkoerperthermostate-lohnen-sich.html';
 const name = 'eco_thermostat_package_bosch';
 const writes = [];
 const env = {EVENTS:{prepare(sql) {
   assert.match(sql,/INSERT INTO ev /);
   return {bind(...values) { return {async run(){ writes.push(values); }}; }};
 }}};
 async function send(body, extras={}, query='') {
   const response = await worker.fetch(new Request(origin + '/api/ev' + query, {
     method:'POST',
     headers:{Origin:origin,'Content-Type':'application/json','User-Agent':'Mozilla/5.0 Chrome/142.0','CF-IPCountry':'DE',...extras},
     body:JSON.stringify(body),
   }),env,{});
   return [response.status,await response.json()];
 }
 const action = {n:name,p:page};
 for (const body of [{...action,r:'https://example.test/private'},{...action,m:{}},{...action,p:'/produkte.html'}]) {
   assert.deepEqual(await send(body),[400,{ok:false,error:'invalid_thermostat_package_event'}]);
 }
 assert.deepEqual(await send(action,{Origin:'https://example.test'}),[400,{ok:false,error:'invalid_thermostat_package_event'}]);
 for (const headers of [{DNT:'1'},{'Sec-GPC':'1'},{'X-Probe':'1'},{'User-Agent':'getecoback-ci/test'}]) {
   assert.deepEqual(await send(action,headers),[200,{ok:true,skipped:true}]);
 }
 assert.deepEqual(await send(action,{},'?__probe=1'),[200,{ok:true,skipped:true}]);
 assert.deepEqual(writes,[]);
 assert.deepEqual(await send(action),[200,{ok:true}]);
 assert.deepEqual(await send({...action,n:'eco_thermostat_package_fritz'}),[200,{ok:true}]);
 assert.deepEqual(writes.map(row=>row.slice(1)),[
   [name,page,'','','','human'],
   ['eco_thermostat_package_fritz',page,'','','','human'],
 ]);
});

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

test('trend rankings skip malformed metadata while preserving valid events and affiliate counts', async () => {
  const fixture = `import json, sqlite3, sys
db = sqlite3.connect(':memory:')
db.row_factory = sqlite3.Row
db.execute('CREATE TABLE ev(day,name,page,ref,ua_class,meta)')
db.executemany("INSERT INTO ev VALUES(date('now','-1 day'),?,?,'','human',?)", [
 ('site_search','/','{"q":"Fenster","hits":0}'),
 ('site_search','/','{"q":"Heizen","hits":1}'),
 ('site_search','/',''), ('site_search','/','{"q":'),
 ('mcp_call','/mcp','{"tool":"ratgeber_suche"}'),
 ('mcp_call','/mcp','{}'), ('mcp_call','/mcp',''), ('mcp_call','/mcp','{"tool":'),
 ('affiliate_click','/guide/test.html','{"link_url":"https://www.amazon.de/s?tag=getecoback-21"}'),
])
print(json.dumps([dict(row) for row in db.execute(sys.stdin.read())]))`;
  const env = {EVENTS:{prepare(sql) { return {all() {
    const result = spawnSync('python3',['-c',fixture],{input:sql,encoding:'utf8'});
    if (result.status !== 0) throw new Error(result.stderr);
    return {results:JSON.parse(result.stdout)};
  }}; }}};
  const response = await worker.fetch(new Request('https://getecoback.com/api/trend'),env,{});
  assert.equal(response.status,200);
  const report = await response.json();
  assert.deepEqual(report.zero_hits,[{q:'Fenster',n:1}]);
  assert.equal(report.mcp.length,2);
  assert.deepEqual(report.mcp.find(row=>row.tool==='ratgeber_suche'),{tool:'ratgeber_suche',n:1});
  assert.deepEqual(report.mcp.find(row=>row.tool===null),{tool:null,n:1});
  assert.equal(report.mcp_complete_week.completed_calls,4);
  assert.equal(report.affiliate_audit.weeks.at(-1).affiliate_clicks,1);

  const statements = [];
  const auditDb = {prepare(sql) {
    statements.push(sql);
    if (sql !== AUDIT_SQL) throw Error('Auxiliary query unavailable');
    return env.EVENTS.prepare(sql);
  }};
  const base = 'https://getecoback.com/api/trend';
  const audit = await worker.fetch(new Request(base + '?view=affiliate_audit'),{EVENTS:auditDb},{});
  assert.equal(audit.status,200);
  assert.equal(audit.headers.get('access-control-allow-origin'),'*');
  assert.deepEqual(await audit.json(),{affiliate_audit:report.affiliate_audit});
  assert.deepEqual(statements,[AUDIT_SQL]);
  const full = await worker.fetch(new Request(base),{EVENTS:auditDb},{});
  assert.equal(full.status,503);
  assert.deepEqual(await full.json(),{ok:false,error:'query_failed'});
});

test('the affiliate trend view and default response have separate canonical cache keys', async t => {
  const entries = new Map();
  const descriptor = Object.getOwnPropertyDescriptor(globalThis,'caches');
  Object.defineProperty(globalThis,'caches',{configurable:true,value:{default:{
    match(key) { return entries.get(key.url)?.clone(); },
    put(key,response) { entries.set(key.url,response); },
  }}});
  t.after(() => {
    if (descriptor) Object.defineProperty(globalThis,'caches',descriptor);
    else delete globalThis.caches;
  });
  const base = 'https://getecoback.com/api/trend';
  const env = {EVENTS:{prepare() { return {all:async () => ({results:[]})}; }}};
  const read = (suffix,bindings=env) => worker.fetch(new Request(base + suffix),bindings,{});
  const view = '?view=affiliate_audit';
  const responseFailure = {EVENTS:{prepare(sql) {
    assert.equal(sql,AUDIT_SQL);
    return {all:async () => ({success:false,error:'D1 failed',results:[]})};
  }}};
  for (const [bindings,error] of [
    [{},'no_db'],
    [{EVENTS:{prepare() { throw Error('D1 failed'); }}},'query_failed'],
    [responseFailure,'query_failed'],
  ]) {
    const failure = await read(view,bindings);
    assert.equal(failure.status,503);
    assert.equal(failure.headers.get('cache-control'),'no-store');
    assert.equal(failure.headers.get('access-control-allow-origin'),'*');
    assert.deepEqual(await failure.json(),{ok:false,error});
  }
  assert.equal(entries.size,0);
  assert.deepEqual(Object.keys(await (await read(view)).json()),['affiliate_audit']);
  assert.equal((await read(view + '&__probe=1',{})).status,200);
  const full = await (await read('')).json();
  assert.ok(Array.isArray(full.events));
  const nonGet = await worker.fetch(new Request(base + view,{method:'POST'}),{},{});
  assert.deepEqual(await nonGet.json(),full);
  for (const suffix of ['?view=unknown','?view=affiliate_audit&view=other']) {
    assert.deepEqual(await (await read(suffix,{})).json(),full);
  }
  assert.deepEqual([...entries.keys()].sort(),[base+'?v=dev',base+'?v=dev&view=affiliate_audit']);
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

test('PortaSplit entry separates original product clicks and legacy searches in complete days',async()=>{
  const fixture = `import json,sqlite3,sys
db=sqlite3.connect(':memory:'); db.row_factory=sqlite3.Row
db.execute('CREATE TABLE ev(day,name,page,ref,ua_class,meta)')
porta='/guide/midea-portasplit-ausverkauft-alternativen.html'
def add(day,name,meta,page=porta,ua='human'):
 db.execute('INSERT INTO ev VALUES (?,?,?,?,?,?)',(day,name,page,'',ua,json.dumps(meta)))
add('2026-11-21','page_view',{'mcp_portasplit_entry':1})
add('2026-11-22','affiliate_click',{'mcp_portasplit_entry':1,'link_url':'https://www.amazon.de/s?tag=getecoback-21'})
add('2026-11-22','affiliate_click',{'mcp_portasplit_entry':1,'link_url':'https://www.amazon.de/dp/B0D3PP64JS?tag=getecoback-21'})
add('2026-11-22','affiliate_click',{'link_url':'https://www.amazon.de/dp/B0D3PP64JS?tag=getecoback-21'},page='/guide/midea-portasplit-kaufen.html')
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
  const recorded={first_recorded_day:'2026-11-21',page_views:1,model_search_clicks:1,exact_product_clicks:1};
  assert.deepEqual(audit.last_three_complete_days.mcp_portasplit_entry,recorded);
  assert.deepEqual(audit.weeks.at(-1).mcp_portasplit_entry,recorded);
  assert.equal(audit.weeks.at(-2).mcp_portasplit_entry,null);
  assert.equal(audit.same_weekdays_previous_week.mcp_portasplit_entry,null);
  assert.deepEqual(audit.last_three_complete_days.mcp_window_entry,{first_recorded_day:'2026-11-22',page_views:1,model_search_clicks:0});
  assert.equal(audit.last_three_complete_days.mcp_drain_entry.page_views,1);
  assert.equal(audit.last_three_complete_days.affiliate_clicks,4);
  assert.equal(audit.last_three_complete_days.models.portasplit_original,2);
  assert.doesNotMatch(JSON.stringify(audit),/midea-portasplit-ausverkauft|amazon\.de|B0D3PP64JS|\?mcp_entry=/);
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

test('vacuum catalogue reports fixed model search events only on complete measured UTC days', async () => {
  const script = `import json,sqlite3,sys
db=sqlite3.connect(':memory:');db.row_factory=sqlite3.Row
db.execute('CREATE TABLE ev(day,name,page,ref,ua_class,meta)')
page='/produkte.html'
link='https://www.amazon.de/s?tag=getecoback-21'
def add(day, name='affiliate_click', model='miele-guard-s1', destination=link, route=page, ua='human', raw=None):
 meta=raw if raw is not None else json.dumps(dict(vacuum_model=model,link_url=destination,source='body'))
 db.execute('INSERT INTO ev VALUES(?,?,?,?,?,?)',(day,name,route,'',ua,meta))
add('2026-11-25','page_view')
add('2026-11-25')
add('2026-11-26','page_view');add('2026-11-26','page_view')
add('2026-11-26','page_view',route='/unrelated.html')
for model in ['miele-guard-s1','miele-guard-s1','miele-guard-m1-parquet-flex','bosch-bgbs2ba1p']:
 add('2026-11-26',model=model)
add('2026-11-26',model='private-model')
add('2026-11-26',raw='{invalid json')
add('2026-11-26',destination='https://www.amazon.de/s')
add('2026-11-26',destination='https://www.amazon.de/dp/B07NC5CP6F?tag=getecoback-21')
add('2026-11-26',route='/unrelated.html')
add('2026-11-26',ua=None);add('2026-11-26',ua='ci');add('2026-11-26',ua='bot')
add('2026-11-27','page_view');add('2026-11-27')
sql=sys.stdin.read().replace("date('now'","date('2026-11-27'")
print(json.dumps([dict(r) for r in db.execute(sql)]))`;
  const fixture = spawnSync('python3',['-c',script],{input:AUDIT_SQL,encoding:'utf8'});
  assert.equal(fixture.status,0,fixture.stderr);
  const report = await affiliateAudit(dbFor(JSON.parse(fixture.stdout)),()=> 'direct');
  const models = {'miele-guard-s1':2,'miele-guard-m1-parquet-flex':1,'bosch-bgbs2ba1p':1};
  const expected = {start:'2026-11-26',end_exclusive:'2026-11-27',
    catalogue_page_views:2,model_search_clicks:4,models};
  assert.deepEqual(report.weeks.at(-1).vacuum_catalog,expected);
  assert.deepEqual(report.last_three_complete_days.vacuum_catalog,expected);
  assert.equal(report.weeks.at(-2).vacuum_catalog,null);
  assert.equal(report.same_weekdays_previous_week.vacuum_catalog,null);
  assert.equal(report.weeks.at(-1).page_views,4);
  assert.equal(report.weeks.at(-1).affiliate_clicks,11);
  assert.doesNotMatch(JSON.stringify(report),/private-model|unrelated\.html|www\.amazon\.de|invalid json/);

  const launch = await affiliateAudit(dbFor([]),()=> 'direct',new Date('2026-11-26T08:00Z'));
  assert.equal(launch.weeks.at(-1).vacuum_catalog,null);
  const empty = await affiliateAudit(dbFor([]),()=> 'direct',new Date('2026-11-27T08:00Z'));
  assert.deepEqual(empty.weeks.at(-1).vacuum_catalog,{...expected,catalogue_page_views:0,
    model_search_clicks:0,models:{'miele-guard-s1':0,'miele-guard-m1-parquet-flex':0,'bosch-bgbs2ba1p':0}});
});

test('Comfee base-model catalogue clicks use the three human guide paths and preserve legacy populations', async () => {
  const cellar = '/guide/luftentfeuchter-keller.html';
  const overview = '/guide/luftentfeuchter-ratgeber.html';
  const laundry = '/guide/waesche-trocknen-wohnung.html';
  const outside = '/guide/comfee-geraete-test.html';
  const product = 'https://www.amazon.de/dp/B07KJX6RDK?tag=getecoback-21';
  const search = 'https://www.amazon.de/s?tag=getecoback-21';
  const inputs = [];
  function view(day,page,ua='human') {
    inputs.push([day,'page_view',page,'',ua,'']);
  }
  function click(day,page,{ua='human',source='models',link=product,raw}={}) {
    inputs.push([day,'affiliate_click',page,'',ua,raw ?? JSON.stringify({source,link_url:link})]);
  }

  view('2026-11-25',cellar);
  click('2026-11-25',cellar);
  view('2026-11-26',overview);
  view('2026-11-26',overview,null);
  click('2026-11-26',cellar,{link:search});
  view('2026-11-28',cellar);
  view('2026-11-28',laundry);
  click('2026-11-28',overview);
  for (const ua of ['human','human',null,'bot','ci']) click('2026-12-02',cellar,{ua});
  click('2026-12-02',laundry);
  click('2026-12-02',laundry,{ua:null});
  click('2026-12-02',cellar,{source:'body'});
  for (const link of [
    product.replace('getecoback-21','incorrect'),product.replace('.de/','.com/'),
    product.replace('/dp/','/gp/product/'),product.replace('B07KJX6RDK','B07NC5CP6F'),
    product + '&unexpected=1',search,
  ]) click('2026-12-02',cellar,{link});
  click('2026-12-02',cellar,{raw:'{invalid json'});
  click('2026-12-02',outside);
  click('2026-12-02','/en' + cellar);
  click('2026-12-02','/__ci/preview');
  view('2026-12-03',outside);
  view('2026-12-05',laundry);
  click('2026-12-05',laundry);

  const sqlFixture = `import json,sqlite3,sys
args=json.load(sys.stdin)
db=sqlite3.connect(':memory:');db.row_factory=sqlite3.Row
db.execute('CREATE TABLE ev(day,name,page,ref,ua_class,meta)')
db.executemany('INSERT INTO ev VALUES(?,?,?,?,?,?)',args['events'])
sql=args['sql'].replace("date('now'","date('"+args['end']+"'")
print(json.dumps([dict(row) for row in db.execute(sql)]))`;
  function readRows(end,events=inputs) {
    const query = spawnSync('python3',['-c',sqlFixture],{
      input:JSON.stringify({end,events,sql:AUDIT_SQL}),encoding:'utf8',
    });
    assert.equal(query.status,0,query.stderr);
    return JSON.parse(query.stdout);
  }
  const rows = readRows('2026-12-05');
  const mixed = rows.find(row => row.day === '2026-12-02' && row.page === laundry &&
    row.source === 'models' && row.link === product);
  assert.equal(mixed.n,2);
  assert.equal(mixed.comfee_human_events,1);
  const report = await affiliateAudit(dbFor(rows),()=> 'direct');
  const observed = (start,end_exclusive,views,clicks) => ({
    start,end_exclusive,human_guide_page_view_events:views,base_product_detail_click_events:clicks,
  });
  const week = report.weeks.at(-1);
  const recent = report.last_three_complete_days;
  const prior = report.same_weekdays_previous_week;
  assert.deepEqual(week.comfee_catalog,observed('2026-11-28','2026-12-05',2,4));
  assert.deepEqual(recent.comfee_catalog,observed('2026-12-02','2026-12-05',null,3));
  assert.deepEqual(prior.comfee_catalog,observed('2026-11-26','2026-11-28',1,0));
  assert.deepEqual(report.weeks.at(-2).comfee_catalog,prior.comfee_catalog);
  assert.equal(report.weeks.at(-3).comfee_catalog,null);
  assert.deepEqual([recent.page_views,recent.affiliate_clicks],[1,15]);
  assert.deepEqual(recent.destinations,{product:13,search:1,prime_trial:0,other:1});
  assert.deepEqual(recent.models,{ex105:0,n90:1,portasplit_original:0,other:14});
  assert.deepEqual(recent.cellar_catalog,{
    page_views:0,affiliate_clicks:11,catalog_product_clicks:8,catalog_search_clicks:1,
  });
  assert.deepEqual(recent.channels.direct,{page_views:1,affiliate_clicks:15});
  assert.equal(report.amazon_orders,null);
  assert.doesNotMatch(JSON.stringify(report),/B07KJX6RDK|incorrect|invalid json|comfee-geraete-test/);

  const before = await affiliateAudit(dbFor(readRows('2026-11-26')),()=> 'direct');
  assert.equal(before.weeks.at(-1).comfee_catalog,null);
  const noMatch = readRows('2026-12-05',[
    ['2026-12-04','page_view',outside,'','human',''],
    ['2026-12-04','page_view',cellar,'',null,''],
    ['2026-12-04','affiliate_click',cellar,'','human',JSON.stringify({source:'models',link_url:search})],
  ]);
  const noEvidence = await affiliateAudit(dbFor(noMatch),()=> 'direct');
  assert.equal(noEvidence.last_three_complete_days.comfee_catalog,null);
  const empty = await affiliateAudit(dbFor([]),()=> 'direct',new Date('2026-12-05T10:00Z'));
  assert.equal(empty.weeks.at(-1).comfee_catalog,null);
});

test('thermostat package handoffs count only exact human actions on complete UTC days and leave the affiliate funnel unchanged', async () => {
  const fixture = `import sqlite3,json,sys
db=sqlite3.connect(':memory:'); db.row_factory=sqlite3.Row
db.execute('CREATE TABLE ev(day,name,page,ref,ua_class,meta)')
guide='/guide/smarte-heizkoerperthermostate-lohnen-sich.html'
bosch='eco_thermostat_package_bosch'
fritz='eco_thermostat_package_fritz'
def add(day,name,page=guide,ua='human',meta=''):
 db.execute('INSERT INTO ev VALUES(?,?,?,?,?,?)',(day,name,page,'',ua,meta))

add('2026-11-26',fritz)
add('2026-11-27',bosch); add('2026-11-27',bosch)
add('2026-12-01',bosch)
add('2026-12-03',fritz); add('2026-12-04',fritz)
add('2026-12-05',bosch)
for ua in [None,'ci','bot','other']: add('2026-12-03',bosch,ua=ua)
for page in ['/en'+guide,'/produkte.html','/__ci/preview']: add('2026-12-03',bosch,page=page)
for meta in ['{"private":"handoff-fixture-secret"}','{malformed','["unexpected"]']:
 add('2026-12-03',bosch,meta=meta)
add('2026-12-03','eco_thermostat_package_other')
add('2026-12-03','page_view')
add('2026-12-03','affiliate_click',meta=json.dumps({'source':'body','link_url':'https://www.amazon.de/s?tag=getecoback-21'}))
sql=sys.stdin.read().replace("date('now'","date('2026-12-05'")
print(json.dumps([dict(row) for row in db.execute(sql)]))`;
  const query = spawnSync('python3',['-c',fixture],{input:AUDIT_SQL,encoding:'utf8'});
  assert.equal(query.status,0,query.stderr);
  const report = await affiliateAudit(dbFor(JSON.parse(query.stdout)),()=> 'direct');
  const week = report.weeks.at(-1);
  const recent = report.last_three_complete_days;
  const previous = report.same_weekdays_previous_week;
  assert.deepEqual(week.thermostat_package_handoffs,{
    first_recorded_day:'2026-12-01',bosch_ii_m:1,fritz_302:2,
  });
  assert.deepEqual(recent.thermostat_package_handoffs,{
    first_recorded_day:'2026-12-03',bosch_ii_m:null,fritz_302:2,
  });
  assert.deepEqual(previous.thermostat_package_handoffs,{
    first_recorded_day:'2026-11-27',bosch_ii_m:2,fritz_302:null,
  });
  assert.equal(report.weeks.at(-3).thermostat_package_handoffs,null);
  for (const range of [week,recent]) {
    assert.deepEqual(range.buying_paths.smart_thermostat,{page_views:1,affiliate_clicks:1});
    assert.deepEqual(range.channels.direct,{page_views:1,affiliate_clicks:1});
    assert.equal(range.page_views,1);
    assert.equal(range.affiliate_clicks,1);
    assert.deepEqual(range.destinations,{product:0,search:1,prime_trial:0,other:0});
  }
  assert.equal(previous.page_views,0);
  assert.equal(previous.affiliate_clicks,0);
  assert.equal(report.daily.reduce((sum,row) => sum + row.affiliate_clicks,0),1);
  assert.equal(report.amazon_orders,null);
  assert.doesNotMatch(JSON.stringify(report),/handoff-fixture-secret|malformed/);

  const empty = await affiliateAudit(dbFor([]),()=> 'direct',new Date('2026-12-05T08:00:00Z'));
  assert.equal(empty.weeks.at(-1).thermostat_package_handoffs,null);
});

test('laundry keeps tagged arrivals separate and leaves missing coverage unknown', async () => {
  const now=new Date('2026-11-29T00:00:00Z');
  const day='2026-11-28', page='/waeschetrockner-oder-luftentfeuchter.html';
  const fixture=(rows)=>({prepare(sql) {
    assert.match(sql,/AS laundry_mcp_entry/);
    return {all:async()=>({results:rows})};
  }});
  const event={day,page,name:'page_view',n:3,end_exclusive:'2026-11-29',ref:''};
  const bare=await affiliateAudit(fixture([event]),()=> 'direct',now);
  assert.equal(bare.weeks.at(-1).mcp_laundry_entry,null);
  const tagged=await affiliateAudit(fixture([
    {...event,laundry_mcp_entry:1},
    {...event,n:2},
  ]),()=> 'direct',now);
  assert.deepEqual(tagged.weeks.at(-1).mcp_laundry_entry,{
    first_recorded_day:day,tagged_landing_views:3,
  });
  assert.equal(tagged.weeks.at(-2).mcp_laundry_entry,null);
  assert.equal(tagged.weeks.at(-1).page_views,5);
});
