import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {portfolioData,portfolioRoute} from './api.mjs';
import worker from '../analytics-worker/index.js';
const snapshot=JSON.parse(readFileSync(new URL('../../portfolio-assets/snapshot.json',import.meta.url)));
const manifest=JSON.parse(readFileSync(new URL('../../portfolio-assets/manifest.json',import.meta.url)));
const now=Date.parse(snapshot.last_success_at)+3600000;
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
test('incomplete and changed-cohort sources fail closed; no fabricated zero',async()=>{
 for(const mutate of [s=>delete s.metrics.MU,s=>delete s.entry_adjusted_close,s=>s.cohort='other']){
  const s=structuredClone(snapshot);mutate(s);const r=await portfolioRoute(new Request('https://agiscorecard.com/api/portfolio'),envFor(s));assert.equal(r.status,503);assert.equal((await r.json()).basket,undefined);
 }
});
test('real Worker HTTP and MCP routes expose the same read model',async()=>{
 const env=envFor(snapshot),ctx={waitUntil(){}};
 const call=async(method,params)=> (await worker.fetch(new Request('https://agiscorecard.com/mcp',{method:'POST',body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})}),env,ctx)).json();
 const list=await call('tools/list');const tool=list.result.tools.find(t=>t.name==='get_portfolio_returns');assert.equal(tool.annotations.readOnlyHint,true);
 const data=await (await worker.fetch(new Request('https://agiscorecard.com/api/portfolio'),env,ctx)).json();
 const result=await call('tools/call',{name:tool.name,arguments:{}});assert.deepEqual(JSON.parse(result.result.content[0].text),data);
 const bad=await call('tools/call',{name:tool.name,arguments:{include_history:'yes'}});assert.equal(bad.error.code,-32602);
});
