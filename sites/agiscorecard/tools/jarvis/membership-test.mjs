import test from 'node:test';import assert from 'node:assert/strict';
import {jarvisRoute} from './server.mjs';import {execute,tick} from './engine.mjs';import {ensure} from './store.mjs';
import {database,memberID} from './test-support.mjs';import {hash,now} from '../create/store.mjs';import {memberOwner} from './membership.mjs';
import {memberRoute} from '../../../../tools/member-studio/server.mjs';import {mockChain,setupSites,fixture,transfer,KEY,TX} from '../../../../tools/member-studio/test-fixtures.mjs';
const origin='https://agiscorecard.com',key='1'.repeat(64),other='2'.repeat(64),unknown='d'.repeat(64),uid=()=>crypto.randomUUID().replaceAll('-','');
const body=(extra={})=>({action:'create',goal:'Convert 3 hours to minutes for a weekly workflow test',lang:'en',cadence:'once',web:false,publicQuery:'AI agents',consent:true,memory:[],nonce:uid(),...extra});
function env(t){const e={EVENTS:database(),MEMBER_WATCH_SECRET:'membership-test-only',AI:{async run(){return {response:{summary:'Three hours is 180 minutes.',findings:[],nextActions:[{action:'Measure one weekly task.',doneWhen:'Record its duration.'}],uncertainties:['No productivity benefit has been established.']}};}},JARVIS_FETCH(){throw Error('unexpected network');}};t.after(()=>e.EVENTS.sqlite.close());return e;}
async function call(e,b=null,token=key,headers={}){const r=await jarvisRoute(new Request(origin+(b?'/api/jarvis':'/api/jarvis/tasks'),{method:b?'POST':'GET',headers:{origin,'content-type':'application/json',authorization:'Bearer '+token,...headers},...(b?{body:JSON.stringify(b)}:{})}),e);return {status:r.status,j:await r.json()};}
test('unpaid, expired and suspended keys cannot list, create or mutate, even with forged member flags',async t=>{
 const e=env(t),id=(await call(e,body())).j.task.id;
 for(const state of ['unknown','unpaid','expired','suspended']){
  if(state!=='unknown')e.EVENTS.sqlite.prepare('UPDATE wb_members SET ends_at=?,suspended=? WHERE id=?').run(state==='unpaid'?0:state==='expired'?now()-1:now()+86400,state==='suspended'?1:0,memberID(key));
  const token=state==='unknown'?unknown:key;
  for(const b of [null,body({active:true,paid:true,member_id:memberID(other)}),...['resume','pause','delete','feedback'].map(action=>({action,id,value:'useful',membership:{active:true},site:'agi'}))]){
   const r=await call(e,b,token,{'x-member-active':'true'});assert.equal(r.status,403,state);assert.equal(r.j.code,'membership_required');assert.ok(!JSON.stringify(r.j).includes('workflow'));
  }
 }
 assert.equal(e.EVENTS.sqlite.prepare('SELECT COUNT(*) n FROM jarvis_tasks').get().n,1);assert.equal(e.EVENTS.sqlite.prepare("SELECT COUNT(*) n FROM relay_limits WHERE k IN ('ai-global','jarvis-search-global')").get().n,0);
});
test('active membership is resolved on the server and task ownership follows the member across key rotation',async t=>{
 const e=env(t),id=(await call(e,body())).j.task.id;const row=e.EVENTS.sqlite.prepare('SELECT * FROM jarvis_tasks WHERE id=?').get(id);
 assert.equal(row.member_id,memberID(key));assert.equal(row.owner,await memberOwner(memberID(key)));assert.ok(!JSON.stringify(row).includes(key));
 assert.equal((await call(e,null,other)).j.tasks.length,0);assert.equal((await call(e,{action:'delete',id,member_id:memberID(key)},other,{'x-jarvis-legacy-key':key})).status,404);
 const rotated='3'.repeat(64);e.EVENTS.sqlite.prepare('UPDATE wb_members SET token_hash=? WHERE id=?').run(await hash(rotated),memberID(key));
 assert.equal((await call(e)).status,403);assert.equal((await call(e,null,rotated)).j.tasks[0].id,id);
 await execute(e.EVENTS,e,id);assert.equal((await call(e,null,rotated)).j.tasks[0].status,'completed');
});
test('expiry before a queued run pauses it without retrieval or inference, and renewal requires an explicit resume',async t=>{
 const e=env(t),id=(await call(e,body({web:true}))).j.task.id;let calls=0;e.AI.run=e.JARVIS_FETCH=()=>{calls++;throw Error('must not run');};
 e.EVENTS.sqlite.prepare('UPDATE wb_members SET ends_at=? WHERE id=?').run(now()-1,memberID(key));await tick(e);
 let row=e.EVENTS.sqlite.prepare('SELECT * FROM jarvis_tasks WHERE id=?').get(id);assert.equal(row.status,'paused');assert.equal(row.stage,'membership_required');assert.equal(row.runs,0);assert.equal(calls,0);
 e.EVENTS.sqlite.prepare('UPDATE wb_members SET ends_at=? WHERE id=?').run(now()+86400,memberID(key));assert.equal((await tick(e)).processed,0);assert.equal((await call(e,{action:'resume',id})).status,202);
});
test('revocation during the first search prevents the second search and model call',async t=>{
 const e=env(t),id=(await call(e,body({web:true}))).j.task.id;let searches=0,models=0;e.JARVIS_FETCH=async()=>{searches++;e.EVENTS.sqlite.prepare('UPDATE wb_members SET suspended=1 WHERE id=?').run(memberID(key));return Response.json({items:[{id:1,full_name:'fixture/agent',html_url:'https://github.com/fixture/agent'}]});};e.AI.run=()=>{models++;throw Error('must not infer');};
 await execute(e.EVENTS,e,id);assert.equal(searches,1);assert.equal(models,0);assert.equal(e.EVENTS.sqlite.prepare('SELECT status FROM jarvis_tasks WHERE id=?').get(id).status,'paused');
});
test('revocation during an already-started inference prevents publishing its result or scheduling another run',async t=>{
 const e=env(t),original=e.AI.run,id=(await call(e,body({cadence:'daily'}))).j.task.id;e.AI.run=async()=>{e.EVENTS.sqlite.prepare('UPDATE wb_members SET ends_at=? WHERE id=?').run(now()-1,memberID(key));return original();};await execute(e.EVENTS,e,id);
 const row=e.EVENTS.sqlite.prepare('SELECT * FROM jarvis_tasks WHERE id=?').get(id),result=JSON.parse(row.result);assert.equal(row.status,'paused');assert.equal(row.next_run,0);assert.equal(row.runs,0);assert.equal(result.report,null);assert.equal(result.modelCalls,1);
});
test('legacy schema is upgraded, anonymous work stops, and only its private key plus membership can recover it',async t=>{
 const e=env(t);await ensure(e.EVENTS);e.EVENTS.sqlite.exec('ALTER TABLE jarvis_tasks DROP COLUMN member_id');const legacy='c'.repeat(64),id=uid(),stamp=now();
 e.EVENTS.sqlite.prepare('INSERT INTO jarvis_tasks(id,owner,nonce,ip_key,input,status,created,updated,next_run,until_at,expires) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(id,await hash('jarvis-owner:v1:'+legacy),uid(),'fixture-ip',JSON.stringify(body()),'watching',stamp,stamp,stamp,stamp+86400,stamp+86400);
 e.EVENTS={...e.EVENTS};await ensure(e.EVENTS);assert.equal(e.EVENTS.sqlite.prepare('SELECT status FROM jarvis_tasks WHERE id=?').get(id).status,'paused');
 assert.equal((await call(e,null,legacy,{'x-jarvis-legacy-key':legacy})).status,403);assert.equal((await call(e)).j.tasks.length,0);
 const recovered=await call(e,null,key,{'x-jarvis-legacy-key':legacy});assert.equal(recovered.j.tasks[0].id,id);assert.equal(recovered.j.tasks[0].status,'paused');assert.equal((await call(e,null,other,{'x-jarvis-legacy-key':legacy})).j.tasks.length,0);
 assert.equal((await tick(e)).processed,0);
});
test('membership-store failure fails closed for API and background work',async t=>{
 const e=env(t),id=(await call(e,body())).j.task.id;let calls=0;e.AI.run=e.JARVIS_FETCH=()=>{calls++;throw Error('must not run');};e.EVENTS.sqlite.exec('DROP TABLE wb_members');assert.equal((await call(e)).status,503);await execute(e.EVENTS,e,id);assert.equal(calls,0);assert.equal(e.EVENTS.sqlite.prepare('SELECT status FROM jarvis_tasks WHERE id=?').get(id).status,'paused');
});
test('real membership API with mock chain: another site, unpaid quote and forged status cannot unlock AGI; verified payment can',async()=>{
 const reset=mockChain(),all=await setupSites();
 const member=async(site,b)=>{const r=await memberRoute(new Request('https://'+(site==='agi'?'agiscorecard.com':'getecoback.com')+'/api/member',{method:'POST',headers:{origin:'https://'+(site==='agi'?'agiscorecard.com':'getecoback.com'),'content-type':'application/json',authorization:'Bearer '+KEY},body:JSON.stringify(b)}),all[site].raw,site);return {status:r.status,j:await r.json()};};
 try{
  let checkout=await member('eco',{action:'checkout',nonce:uid(),accept_terms:true,key_saved:true});assert.equal(checkout.status,200);let row=all.eco.db.sql.prepare('SELECT * FROM wb_orders').get();fixture.receipt=transfer(row);assert.equal((await member('eco',{action:'check',id:row.id,tx:TX})).j.order.state,'paid');assert.equal((await call(all.agi.raw,null,KEY)).status,403);
  checkout=await member('agi',{action:'checkout',nonce:uid(),accept_terms:true,key_saved:true,source:'jarvis'});assert.equal(checkout.status,200);assert.equal((await call(all.agi.raw,body(),KEY)).status,403);row=all.agi.db.sql.prepare('SELECT * FROM wb_orders').get();fixture.receipt=transfer(row);assert.equal((await member('agi',{action:'check',id:row.id,tx:TX})).j.order.state,'paid');
  assert.equal(all.agi.db.sql.prepare('SELECT product FROM wb_order_sources').get().product,'jarvis');assert.equal((await call(all.agi.raw,body(),KEY)).status,202);
 }finally{reset();for(const site of Object.values(all))site.db.sql.close();}
});
