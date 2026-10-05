import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {database} from '../../../tools/member-studio/test-fixtures.mjs';
import {ensureMembers} from '../lib/membership.js';
import {digest,seconds} from '../lib/ad-commerce.js';
import {startupKeyAction,startupPrincipal,reserveStartupCall,refundStartupCall} from '../lib/startup-mcp-access.mjs';
import {onRequest as mcp} from '../functions/api/startup-mcp.js';
import {prepareInferenceCorpus,generatePlan,analyzePatterns} from '../lib/ai-solo-core.mjs';
import {memberAction,onRequestPost as legacyMember} from '../functions/api/member.js';
const key='1'.repeat(64),origin='https://baipiaoji.com';
const files=Object.fromEntries(['ai-solo-cases.json','ai-solo-model.json','ai-solo-hot.json'].map(p=>[p,readFileSync(new URL('../dist/'+p,import.meta.url),'utf8')]));
async function setup(){const db=database();await ensureMembers(db);const now=seconds(),member={id:'paid-fixture',token_hash:await digest(key),created:now,ends_at:now+30*86400,suspended:0};await db.prepare('INSERT INTO wb_members(id,token_hash,created,ends_at) VALUES(?,?,?,?)').bind(member.id,member.token_hash,now,member.ends_at).run();const env={HITS:db,ASSETS:{fetch:async r=>new Response(files[new URL(r.url).pathname.slice(1)]||'',{status:files[new URL(r.url).pathname.slice(1)]?200:404})}};return {db,env,member,now,close:()=>db.sql.close()};}
const msg=(method,params={},id=1)=>({jsonrpc:'2.0',id,method,params});
async function rpc(env,body,token='',extra={}){const request=new Request(origin+'/api/startup-mcp',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json, text/event-stream',...(token?{Authorization:'Bearer '+token}:{}),...extra},body:JSON.stringify(body)});const r=await mcp({env,request});return {status:r.status,headers:r.headers,body:r.status===202?null:await r.json()};}
const call=(env,name,args={},token='')=>rpc(env,msg('tools/call',{name,arguments:args}),token);
const mint=(s,label='Agent')=>startupKeyAction(s.db,s.member,{action:'startup_mcp_create',label},s.now);

test('public MCP negotiation and real data preview; no identity or payment required',async()=>{
 const s=await setup();try{
  const init=await rpc(s.env,msg('initialize',{protocolVersion:'2025-06-18'}));assert.equal(init.body.result.protocolVersion,'2025-06-18');assert.equal(init.body.result.serverInfo.version,'1.0.0');
  const list=await rpc(s.env,msg('tools/list'));assert.equal(list.body.result.tools.length,5);
  const out=await call(s.env,'startup_preview');assert.equal(out.status,200);assert(out.body.result.structuredContent.data.reviewedCount>0);assert.equal(out.body.result.structuredContent.usage,undefined);
  assert.equal((await rpc(s.env,{jsonrpc:'2.0',method:'notifications/initialized'})).status,202);
  assert.equal((await rpc(s.env,[msg('ping')])).body.error.code,-32600);
  assert.equal((await rpc(s.env,msg('ping'),'',{Origin:'https://evil.example'})).status,403);
  assert.equal((await rpc(s.env,msg('ping'),'',{'MCP-Protocol-Version':'1900-01-01'})).status,400);
  assert.equal((await rpc(s.env,{...msg('ping'),padding:'x'.repeat(17000)})).status,413);
 }finally{s.close();}
});
test('only scoped keys authenticate; member access and case evidence stay separate from radar',async()=>{
 const s=await setup();try{
  assert.equal((await call(s.env,'search_startup_cases',{},key)).status,401);
  assert.equal((await call(s.env,'search_startup_cases')).status,401);
  const credential=await mint(s),token=credential.key;
  assert(!JSON.stringify(s.db.sql.prepare('SELECT * FROM bpj_startup_keys').all()).includes(token));
  const privateRead=await legacyMember({env:s.env,request:new Request(origin+'/api/member',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({action:'list'})})});assert.equal(privateRead.status,401,'Scoped MCP key must never open cloud projects');
  const out=await call(s.env,'search_startup_cases',{query:'selfie beauty skin analysis',language:'en'},token);
  assert.equal(out.status,200);assert(out.body.result.structuredContent.data.cases.length>0);assert(out.body.result.structuredContent.data.cases.every(c=>c.classification?.job));assert.equal(out.body.result.structuredContent.usage.remaining,99);
  const radar=await call(s.env,'get_startup_radar',{focus:'all',limit:2,history:true},token);assert.equal(radar.body.result.structuredContent.data.commercialEvidence,false);assert(radar.body.result.structuredContent.data.sources.every(s=>s.items.length<=2));
  const plan=await call(s.env,'build_startup_plan',{question:'A selfie skincare beauty app',skill:'coding',language:'en',price:100,variableCost:20,fixedCost:400},token);assert.equal(plan.body.result.structuredContent.data.unitEconomics.breakEvenCustomers,5);assert(plan.body.result.structuredContent.data.matched);assert(plan.body.result.structuredContent.data.limitations.some(s=>s.startsWith('MCP inputs reach BPJ')));assert(!plan.body.result.structuredContent.data.matchedCases.some(c=>String(c.id).startsWith('hn-')));
  const state=await startupKeyAction(s.db,s.member,{action:'startup_mcp_status'});assert.equal(state.usage.used,3);assert(!JSON.stringify(state).includes(token));
  assert.equal(s.db.sql.prepare('SELECT COUNT(*) n FROM wb_orders').get().n,0,'Calls never create payments');
  assert.equal(s.db.sql.prepare('SELECT COUNT(*) n FROM wb_spaces').get().n,0,'Calls never read/write user cloud projects');
 }finally{s.close();}
});
test('invalid tools, arguments and cross-job comparisons do not consume quota',async()=>{
 const s=await setup();try{
  const {key:token}=await mint(s);
  for(const [name,args]of [['unknown',{}],['search_startup_cases',{limit:21}],['build_startup_plan',{question:'',hours:169}],['get_startup_radar',{url:'https://evil.example'}],['compare_startup_cases',{ids:['cursor','glam-up']}],['compare_startup_cases',{ids:['audiopen','cursor']}],['search_startup_cases',{category:'not-a-job'}]]){
   const r=await call(s.env,name,args,token);assert.equal(r.body.error.code,-32602,JSON.stringify(r.body));
  }
  assert.equal(s.db.sql.prepare('SELECT COUNT(*) n FROM bpj_startup_usage').get().n,0);
  s.env.ASSETS={fetch:async()=>new Response('unavailable',{status:503})};assert.equal((await call(s.env,'get_startup_radar',{},token)).status,503);assert.equal(s.db.sql.prepare('SELECT COUNT(*) n FROM bpj_startup_usage').get().n,0);
 }finally{s.close();}
});
test('scoped key count, owner isolation, revocation, expiry, suspension and main-key rotation',async()=>{
 const s=await setup();try{
  const a=await mint(s,'A'),b=await mint(s,'B'),c=await mint(s,'C');await assert.rejects(mint(s,'D'),/key_limit/);
  await startupKeyAction(s.db,s.member,{action:'startup_mcp_revoke',id:a.id});assert.equal(await startupPrincipal(s.db,a.key),null);assert.equal((await call(s.env,'get_startup_radar',{},a.key)).status,401);await mint(s,'D');
  s.db.sql.prepare('UPDATE wb_members SET ends_at=?').run(s.now-1);assert.equal((await call(s.env,'get_startup_radar',{},b.key)).status,403);await assert.rejects(mint(s),/membership_required/);
  s.db.sql.prepare('UPDATE wb_members SET ends_at=?,suspended=1').run(s.member.ends_at);assert.equal((await call(s.env,'get_startup_radar',{},b.key)).status,403);
  s.db.sql.prepare('UPDATE wb_members SET suspended=0,token_hash=?').run(await digest('2'.repeat(64)));assert.equal((await call(s.env,'get_startup_radar',{},c.key)).status,401);
  await assert.rejects(startupKeyAction(s.db,s.member,{action:'startup_mcp_status'}),/unauthorized/);
 }finally{s.close();}
});
test('real SQLite atomic quotas hold across concurrent keys, reset daily, and refund failures',async()=>{
 const s=await setup();try{
  const a=await mint(s,'A'),b=await mint(s,'B'),pa=await startupPrincipal(s.db,a.key),pb=await startupPrincipal(s.db,b.key);
  const now=Math.floor(s.now/86400)*86400+3600;
  const calls=await Promise.allSettled(Array.from({length:20},(_,i)=>reserveStartupCall(s.db,i%2?pa:pb,now)));
  assert.equal(calls.filter(x=>x.status==='fulfilled').length,10);assert.equal(calls.filter(x=>x.status==='rejected').length,10);
  await refundStartupCall(s.db,calls.find(x=>x.status==='fulfilled').value);assert.equal((await reserveStartupCall(s.db,pb,now)).n,10);
  for(let minute=1;minute<10;minute++)for(let i=0;i<10;i++)await reserveStartupCall(s.db,pa,now+minute*60);
  await assert.rejects(reserveStartupCall(s.db,pb,now+600),/quota/);
  assert.equal((await reserveStartupCall(s.db,pb,now+86400)).n,1);
  await startupKeyAction(s.db,s.member,{action:'startup_mcp_revoke',id:b.id});await assert.rejects(reserveStartupCall(s.db,pb,now+86400+60),/quota_or_access_changed/);
 }finally{s.close();}
});
test('member API action is BPJ-only and cannot manage another member key',async()=>{
 const s=await setup();try{
  const {id}=await mint(s),other={...s.member,id:'other',token_hash:await digest('3'.repeat(64))};s.db.sql.prepare('INSERT INTO wb_members(id,token_hash,created,ends_at) VALUES(?,?,?,?)').run(other.id,other.token_hash,s.now,other.ends_at);
  await startupKeyAction(s.db,other,{action:'startup_mcp_revoke',id});assert.equal(s.db.sql.prepare('SELECT revoked FROM bpj_startup_keys WHERE id=?').get(id).revoked,0);
  const r=await memberAction({request:new Request(origin+'/api/member'),env:{...s.env,MEMBER_SITE:'agi'},b:{action:'startup_mcp_status'},m:s.member});assert.equal(r.status,403);
 }finally{s.close();}
});

test('immutable inference matches the original engine and rejects a mismatched model',()=>{
 const cases=JSON.parse(files['ai-solo-cases.json']),model=JSON.parse(files['ai-solo-model.json']),profile={question:'selfie skincare app',language:'en'};
 const expected=generatePlan(cases,model,profile),inference=prepareInferenceCorpus(cases,model);
 assert.deepEqual(generatePlan(inference.cases,inference.model,profile),expected);
 assert.deepEqual(analyzePatterns(inference.cases),analyzePatterns(cases));
 assert.throws(()=>{inference.cases[0].name='mutated';},TypeError);
 assert.throws(()=>prepareInferenceCorpus(cases,{...model,contentHash:'different'}),/mismatch/);
 const changed=structuredClone(cases);changed[0].summary+=' A new material claim.';
 assert.throws(()=>prepareInferenceCorpus(changed,model),/mismatch/);
});
