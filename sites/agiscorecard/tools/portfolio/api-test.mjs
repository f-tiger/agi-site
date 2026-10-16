import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {portfolioData,portfolioRoute} from './api.mjs';
import worker from '../analytics-worker/index.js';
const manifest=JSON.parse(readFileSync(new URL('../../portfolio-assets/manifest.json',import.meta.url)));
// Fixed synthetic observations, not the daily publication. A failed refresh can
// advance attempted_at without advancing last_success_at; those are two clocks.
const tickers=[...manifest.stocks,...manifest.benchmarks].map(x=>x.ticker);
const snapshot={version:1,cohort:manifest.id,
 manifest_sha256:'cdffeaf5be9e7a54ca8a792a1b33d7808c48f6320d65ccd0308655b8040a6912',
 entry_session:manifest.entry_session,status:'tracking',provider:'synthetic-test-only',
 attempted_at:'2026-10-06T00:00:00Z',last_success_at:'2026-10-06T00:00:00Z',
 as_of:'2026-10-05',dates:[manifest.entry_session,'2026-10-05'],
 entry_adjusted_close:Object.fromEntries(tickers.map((k,i)=>[k,100+i])),
 series:Object.fromEntries([...tickers,'basket'].map(k=>[k,[100,110]])),
 metrics:Object.fromEntries([...tickers,'basket'].map(k=>[k,{return_pct:10,max_drawdown_pct:0,excess_spy_pp:0}]))};
const now=Date.parse('2026-10-06T01:00:00Z');
const freeze=(t,time=now)=>t.mock.timers.enable({apis:['Date'],now:time});
const envFor=s=>({ASSETS:{fetch:async r=>Response.json(r.url.endsWith('manifest.json')?manifest:s)},EVENTS:{prepare:()=>({bind:()=>({run:async()=>{}})})}});
test('public result preserves all source returns, entry prices and optional history',async()=>{
 const d=await portfolioData(envFor(snapshot),{now});assert.equal(d.stocks.length,12);assert.equal(d.benchmarks.length,3);
 assert.deepEqual(d.basket.return_pct,snapshot.metrics.basket.return_pct);assert.equal(d.entry_session,'2026-10-02');assert.equal(d.as_of,snapshot.as_of);
 assert.equal(d.stocks[0].entry_adjusted_close,snapshot.entry_adjusted_close.AMD);assert.equal(d.series,undefined);
 const h=await portfolioData(envFor(snapshot),{now,include_history:true});assert.deepEqual(h.series,snapshot.series);assert.equal(h.valuation_id,d.valuation_id);
});
test('attempt timestamps do not create a new valuation; actual corrected data does',async()=>{
 const d=await portfolioData(envFor(snapshot),{now});const s=structuredClone(snapshot);s.attempted_at=new Date(now).toISOString();s.last_success_at=s.attempted_at;
 assert.equal((await portfolioData(envFor(s),{now})).valuation_id,d.valuation_id);
 s.entry_adjusted_close.AMD+=1;assert.notEqual((await portfolioData(envFor(s),{now})).valuation_id,d.valuation_id);
});
test('expired success is stale even when static source says tracking',async()=>{
 const d=await portfolioData(envFor(snapshot),{now:now+5*86400000});assert.equal(d.status,'stale');assert.equal(d.basket.return_pct,snapshot.metrics.basket.return_pct);
});
test('failed refresh advances attempt time without hiding stale success or changing valuation',async()=>{
 const time=now+5*86400000,s={...snapshot,status:'stale',attempted_at:new Date(time).toISOString(),failure_reason:'synthetic_source_unavailable'};
 const before=structuredClone(s),d=await portfolioData(envFor(s),{now:time});
 assert.equal(d.valuation_id,(await portfolioData(envFor(snapshot),{now})).valuation_id);
 assert.equal(d.attempted_at,s.attempted_at);assert.equal(d.last_success_at,snapshot.last_success_at);
 assert.equal(d.status,'stale');assert.equal(d.freshness.expired,true);assert.deepEqual(s,before);
});
for(const [label,age,expired] of [['exactly 96h',4*86400000,false],['over 96h',4*86400000+1,true]]){
 test('success freshness boundary: '+label,async()=>{
  const d=await portfolioData(envFor(snapshot),{now:Date.parse(snapshot.last_success_at)+age});
  assert.equal(d.freshness.expired,expired);assert.equal(d.status,expired?'stale':'tracking');
 });
}
test('missing success timestamp cannot imply fresh recovered data',async()=>{
 const s={...snapshot};delete s.last_success_at;
 assert.equal((await portfolioData(envFor(s),{now})).status,'stale');
});
test('attempt clock permits exactly five minutes of skew, not one millisecond more',async()=>{
 const s={...snapshot,attempted_at:new Date(now+300000).toISOString()};
 assert.equal((await portfolioData(envFor(s),{now})).status,'tracking');
 s.attempted_at=new Date(now+300001).toISOString();
 await assert.rejects(portfolioData(envFor(s),{now}),/future_record/);
});
test('a future valuation date is rejected even with an acceptable attempt timestamp',async()=>{
 const s={...snapshot,as_of:'2026-10-07',dates:[manifest.entry_session,'2026-10-07']};
 await assert.rejects(portfolioData(envFor(s),{now}),/future_record/);
});
test('incomplete and changed-cohort sources fail closed; no fabricated zero',async t=>{
 freeze(t);
 for(const mutate of [s=>delete s.metrics.MU,s=>delete s.entry_adjusted_close,s=>s.cohort='other']){
  const s=structuredClone(snapshot);mutate(s);const r=await portfolioRoute(new Request('https://agiscorecard.com/api/portfolio'),envFor(s));assert.equal(r.status,503);assert.equal((await r.json()).basket,undefined);
 }
});
test('real Worker HTTP and MCP routes expose the same successful read model',async t=>{
 freeze(t);
 const env=envFor(snapshot),ctx={waitUntil(){}};
 const call=async(method,params)=> (await worker.fetch(new Request('https://agiscorecard.com/mcp',{method:'POST',body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})}),env,ctx)).json();
 const list=await call('tools/list');const tool=list.result.tools.find(t=>t.name==='get_portfolio_returns');assert.equal(tool.annotations.readOnlyHint,true);
 const response=await worker.fetch(new Request('https://agiscorecard.com/api/portfolio'),env,ctx);assert.equal(response.status,200);
 const data=await response.json();assert.equal(data.status,'tracking');assert.equal(data.stocks.length,12);assert.match(data.valuation_id,/^[a-f0-9]{64}$/);
 const result=await call('tools/call',{name:tool.name,arguments:{}});assert.equal(result.error,undefined);assert.notEqual(result.result.isError,true);assert.deepEqual(JSON.parse(result.result.content[0].text),data);
 const bad=await call('tools/call',{name:tool.name,arguments:{include_history:'yes'}});assert.equal(bad.error.code,-32602);
});
test('the HTTP route still fails closed for future data under a frozen clock',async t=>{
 freeze(t);
 for(const s of [{...snapshot,attempted_at:new Date(now+300001).toISOString()},
  {...snapshot,as_of:'2026-10-07',dates:[manifest.entry_session,'2026-10-07']}]){
  const r=await portfolioRoute(new Request('https://agiscorecard.com/api/portfolio'),envFor(s));
  assert.equal(r.status,503);const body=await r.json();assert.equal(body.status,'data_unavailable');assert.equal(body.basket,undefined);
 }
});
