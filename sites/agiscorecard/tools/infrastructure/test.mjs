import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {infrastructureRoute} from './server.mjs';
import {PRODUCT,normalize,emptyNote,baseline,changes,validateReview,stale} from '../../infrastructure-assets/core.mjs';
import {database} from '../create/test-support.mjs';
import {mockChain,setupSites,fixture,transfer,KEY,TX} from '../../../../tools/member-studio/test-fixtures.mjs';
import {memberRoute} from '../../../../tools/member-studio/server.mjs';
const data=JSON.parse(fs.readFileSync(new URL('../../infrastructure-assets/snapshot.json',import.meta.url)));for(const c of data.companies)c.checked_at=new Date().toISOString();
const c=data.companies[0],id=c.facts.revenue.id,review={checks:[{question:'How does revenue growth compare with cash collection?',sources:[id]},{question:'Which disclosures would isolate the role of AI demand?',sources:[id]}]};
function env(){return {EVENTS:database(),MEMBER_WATCH_SECRET:'test-only',ASSETS:{fetch:async()=>Response.json(data)},AI:{run:async()=>({response:review})}};}
const origin='https://agiscorecard.com',body={ticker:c.ticker,lang:'en',snapshot:data.id,consent:true};
async function call(e,b=body,ip='test-ip',extra={}){return infrastructureRoute(new Request(origin+'/api/infrastructure-review',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':ip,...extra},body:JSON.stringify(b)}),e);}
test('portable records reject unsafe structure and impossible dates; baselines track fact changes',()=>{
 const raw={version:1,product:PRODUCT,values:{selected:'NVDA',watch:['NVDA'],notes:{NVDA:{...emptyNote(),baseline:baseline(c)}}}};
 assert.deepEqual(normalize(raw),raw);assert.deepEqual(changes(c,raw.values.notes.NVDA.baseline),[]);raw.values.notes.NVDA.baseline.revenue.val=0;assert.deepEqual(changes(c,raw.values.notes.NVDA.baseline),['revenue']);
 raw.values.notes.NVDA.review='2026-02-30';assert.throws(()=>normalize(raw));raw.values.notes.NVDA.review='';raw.values.selected='UNKNOWN';assert.throws(()=>normalize(raw));assert.equal(stale({...c,checked_at:'2000-01-01'}),true);
});
test('AI citations and numeric prose fail closed',()=>{
 assert.deepEqual(validateReview(review,c),review);assert.throws(()=>validateReview({checks:[{...review.checks[0],sources:['fake']},review.checks[1]]},c));
 assert.throws(()=>validateReview({checks:[{...review.checks[0],question:'Revenue grows by 100% next year?'},review.checks[1]]},c));
});
test('model receives server facts only, never caller notes; origin, consent and stale snapshot checked before inference',async()=>{
 const e=env();let calls=0;e.AI.run=async(model,p)=>{calls++;assert.ok(!JSON.stringify(p).includes('PRIVATE NOTE'));assert.ok(JSON.stringify(p).includes(id));return {response:review};};
 assert.equal((await call(e,{...body,notes:'PRIVATE NOTE',source:'https://attacker.invalid'})).status,200);assert.equal(calls,1);
 assert.equal((await call(e,body,'test',{Origin:'https://attacker.invalid'})).status,403);
 assert.equal((await call(e,{...body,consent:false})).status,400);
 assert.equal((await call(e,{...body,snapshot:'outdated'})).status,409);assert.equal(calls,1);e.EVENTS.sqlite.close();
});
test('per-IP and global caps include failures and cannot be bypassed by concurrency',async()=>{
 const e=env();e.AI.run=async()=>{throw Error('provider error with secret');};
 const results=await Promise.all(Array.from({length:4},()=>call(e)));assert.equal(results.filter(r=>r.status===502).length,2);assert.equal(results.filter(r=>r.status===429).length,2);
 for(let i=0;i<10;i++)assert.equal((await call(e,body,'ip-'+i)).status,502);
 const response=await call(e,body,'last-ip');assert.equal(response.status,429);assert.ok(!(await response.text()).includes('secret'));e.EVENTS.sqlite.close();
});
test('invalid model output and stale server facts produce no invented fallback',async()=>{
 const e=env();e.AI.run=async()=>({response:'not JSON'});assert.equal((await call(e)).status,502);
 const old=structuredClone(data);old.companies[0].checked_at='2000-01-01';e.ASSETS.fetch=async()=>Response.json(old);assert.equal((await call(e,body,'other-ip')).status,409);e.EVENTS.sqlite.close();
});
test('new research product saves only with AGI entitlement; real membership handlers roundtrip versions',async()=>{
 const reset=mockChain(),sites=await setupSites();
 try{
  const api=async(site,b)=>{const r=await memberRoute(new Request((site==='agi'?origin:'https://ecoback.com')+'/api/member',{method:'POST',headers:{Origin:site==='agi'?origin:'https://ecoback.com','Content-Type':'application/json',Authorization:'Bearer '+KEY},body:JSON.stringify(b)}),sites[site].raw,site);return {status:r.status,data:await r.json()};};
  const record={version:1,product:PRODUCT,values:{selected:'NVDA',watch:['NVDA'],notes:{NVDA:emptyNote()}}},save={action:'save',id:'a'.repeat(32),revision:0,name:'Research QA',data:record};
  assert.equal((await api('agi',save)).status,401);
  assert.equal((await api('agi',{action:'checkout',nonce:'b'.repeat(32),source:PRODUCT,accept_terms:true,key_saved:true})).status,200);
  const order=sites.agi.db.sql.prepare('SELECT * FROM wb_orders').get();fixture.receipt=transfer(order);
  assert.equal((await api('agi',{action:'check',id:order.id,tx:TX})).data.order.state,'paid');
  assert.equal((await api('agi',save)).status,200);
  assert.deepEqual((await api('agi',{action:'read',id:save.id,revision:1})).data.data,record);
  assert.equal((await api('agi',{...save,revision:1})).status,200);
  assert.deepEqual((await api('agi',{action:'read',id:save.id,revision:2})).data.data,record);
  assert.equal((await api('agi',save)).status,409);
 }finally{reset();for(const v of Object.values(sites))v.db.sql.close();}
});
