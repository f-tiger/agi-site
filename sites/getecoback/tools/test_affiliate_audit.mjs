import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {AUDIT_SQL,affiliateAudit,pageGroup} from '../src/affiliate-audit.mjs';

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
  for(const w of d.weeks) {
    assert.equal(Object.values(w.cohorts).reduce((n,x)=>n+x.affiliate_clicks,0),w.affiliate_clicks);
    assert.equal(Object.values(w.channels).reduce((n,x)=>n+x.page_views,0),w.page_views);
    assert.equal(Object.values(w.destinations).reduce((n,x)=>n+x,0),w.affiliate_clicks);
  }
  assert.equal(d.last_three_complete_days.destinations.other,2);
  assert.equal(d.last_three_complete_days.models.n90,2);
  assert.equal(d.amazon_orders,null);
  assert.equal(d.query_rows_read,30);
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

test('existing trend fails visibly when the audit query fails',async()=>{
  const {default:worker}=await import('../src/worker.js');
  const env={EVENTS:{prepare(sql){return {all:async()=>{if(sql===AUDIT_SQL)throw Error('D1 failed');return {results:[]};}};}}};
  const r=await worker.fetch(new Request('https://getecoback.com/api/trend'),env,{waitUntil(){}});
  assert.equal(r.status,503);assert.equal(r.headers.get('cache-control'),'no-store');
});
