import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {AFFILIATE_SQL, affiliateMetrics} from '../src/affiliate-metrics.mjs';

function rows(fixture='') {
  const python = `import sqlite3,json,sys
db=sqlite3.connect(':memory:');db.row_factory=sqlite3.Row
db.execute('CREATE TABLE ev(day,name,page,ua_class,meta)')
def add(days,link='https://www.amazon.de/dp/B07NC5CP6F?tag=getecoback-21',ua='human',page='/guide/test.html',meta=None):
 m=json.dumps(dict(link_url=link,source='us-market')) if meta is None else meta
 db.execute("INSERT INTO ev VALUES(date('now',?), 'affiliate_click',?,?,?)",(str(days)+' days',page,ua,m))
${fixture}
print(json.dumps([dict(r) for r in db.execute(sys.stdin.read())]))`;
  const r=spawnSync('python3',['-c',python],{input:AFFILIATE_SQL,encoding:'utf8'});
  assert.equal(r.status,0,r.stderr);return JSON.parse(r.stdout);
}
const dbFor = results => ({prepare(sql){assert.equal(sql,AFFILIATE_SQL);return {all:async()=>({results})};}});

test('real SQLite separates complete windows, excludes bots/CI, and safely classifies malformed and misleading links',async()=>{
  const data=rows(`
add(0)
add(-1)
add(-7,'https://www.amazon.de/s?k=https://example.test/dp/nested')
add(-8,'https://www.amazon.com/dp/B000000000?tag=ecoback0d-20')
add(-14,'https://www.amazon.de/primegratistesten?tag=getecoback-21')
add(-28,meta='{truncated')
add(-29)
add(1)
add(-1,ua='bot');add(-1,ua='ci');add(-1,ua='other');add(-1,page='/__ci/affiliate')
add(-1,'https://amazon.com.evil.test/dp/B000000000')
add(-1,'https://amazon.de/s?k=hygrometer',ua=None)
add(-1,'https://www.amazon.de/help?next=/dp/B000000000')
`);
  const m=await affiliateMetrics(dbFor(data)),d=m.affiliate_diagnostics;
  assert.equal(m.affiliate_click_28d,9);
  assert.equal(m.affiliate_click_us_market_28d,8);
  assert.equal(m.affiliate_click_amazon_com_28d,1);
  assert.equal(d.complete_28d.clicks,8);
  assert.equal(d.recent_7d.clicks,5);assert.equal(d.previous_7d.clicks,2);assert.equal(d.today_partial,1);
  assert.deepEqual(d.markets_28d,{de:5,us:1,unknown:2});
  assert.deepEqual(d.destinations_28d,{product:2,search:2,prime_trial:1,other_or_unknown:3});
  assert.equal(d.recent_7d.start,d.previous_7d.end_exclusive);
  assert.equal(d.amazon_ordered_items,null);assert.equal(d.amazon_commission,null);
});

test('a valid empty window is zero, an absent or failed aggregate is unknown',async()=>{
  const m=await affiliateMetrics(dbFor(rows()));
  assert.equal(m.affiliate_click_28d,0);assert.equal(m.affiliate_diagnostics.complete_28d.clicks,0);
  await assert.rejects(affiliateMetrics(dbFor([])),/missing/);
  await assert.rejects(affiliateMetrics(dbFor([{}])),/invalid/);
  await assert.rejects(affiliateMetrics({prepare(){throw Error('D1 unavailable');}}),/unavailable/);
});

test('worker exposes diagnostics through existing pulse, independent of a failed subscriber query',async()=>{
  const {default:worker}=await import('../src/worker.js');
  const env={EVENTS:{prepare(sql){
    if(sql===AFFILIATE_SQL)return {all:async()=>({results:rows('add(-1)')})};
    if(sql.includes('FROM subs'))throw Error('subs unavailable');
    return {all:async()=>({results:[]})};
  }}};
  const response=await worker.fetch(new Request('https://getecoback.com/api/pulse'),env,{waitUntil(){}});
  const d=await response.json();
  assert.equal(d.ok,true);assert.equal(d.money.affiliate_diagnostics.recent_7d.clicks,1);
  assert.equal(d.money.subs_total,null);assert.deepEqual(d.money.member_orders_by_state,{});
  env.EVENTS.prepare=()=>({all:async()=>{throw Error('database unavailable');}});
  const failed=await worker.fetch(new Request('https://getecoback.com/api/pulse'),env,{waitUntil(){}});
  assert.equal(failed.status,500);assert.equal((await failed.json()).ok,false);
});
