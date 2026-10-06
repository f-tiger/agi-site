import test from 'node:test';import assert from 'node:assert/strict';
import {jarvisRoute} from './server.mjs';import {execute,tick} from './engine.mjs';import {ensure} from './store.mjs';
import {database,memberID} from './test-support.mjs';import {hash,now} from '../create/store.mjs';import {memberOwner} from './membership.mjs';
const origin='https://agiscorecard.com',key='1'.repeat(64),other='2'.repeat(64),unknown='d'.repeat(64),uid=()=>crypto.randomUUID().replaceAll('-','');
const body=(extra={})=>({action:'create',goal:'Convert 3 hours to minutes for a weekly workflow test',lang:'en',cadence:'once',web:false,publicQuery:'AI agents',consent:true,memory:[],nonce:uid(),...extra});
function env(t){const e={EVENTS:database(),MEMBER_WATCH_SECRET:'membership-test-only',AI:{async run(){return {response:{summary:'Three hours is 180 minutes.',findings:[],nextActions:[{action:'Measure one weekly task.',doneWhen:'Record its duration.'}],uncertainties:['No productivity benefit has been established.']}};}},JARVIS_FETCH(){throw Error('unexpected network');}};t.after(()=>e.EVENTS.sqlite.close());return e;}
async function call(e,b=null,token=key,headers={}){const r=await jarvisRoute(new Request(origin+(b?'/api/jarvis':'/api/jarvis/tasks'),{method:b?'POST':'GET',headers:{origin,'content-type':'application/json',authorization:'Bearer '+token,...headers},...(b?{body:JSON.stringify(b)}:{})}),e);return {status:r.status,j:await r.json()};}
test('anonymous, unpaid and expired callers can use private tasks without buying membership',async t=>{
 for(const state of ['anonymous','unpaid','expired']){
  const e=env(t),token=state==='anonymous'?unknown:key;
  if(state!=='anonymous')e.EVENTS.sqlite.prepare('UPDATE wb_members SET ends_at=? WHERE id=?').run(state==='unpaid'?0:now()-1,memberID(key));
  const created=await call(e,body({paid:true,member_id:memberID(other)}),token);assert.equal(created.status,202,state);const id=created.j.task.id;
  const read=await call(e,null,token);assert.equal(read.status,200);assert.equal(read.j.tasks[0].id,id);assert.equal(read.j.membership.member,state!=='anonymous');
  assert.equal((await call(e,null,other)).j.tasks.length,0);assert.equal((await call(e,{action:'delete',id},other)).status,404);
  await execute(e.EVENTS,e,id);assert.equal((await call(e,null,token)).j.tasks[0].status,'completed');
  assert.equal((await call(e,{action:'feedback',id,value:'not_useful_sources'},token)).status,200);
  assert.equal((await call(e,null,token)).j.tasks[0].feedback,'not_useful_sources');
  assert.equal((await call(e,{action:'feedback',id,value:'private free text'},token)).status,400);
  assert.equal((await call(e,{action:'delete',id},token)).status,200);assert.equal((await call(e,null,token)).j.tasks.length,0);
 }
});
test('active membership is resolved on the server and task ownership follows the member across key rotation',async t=>{
 const e=env(t),id=(await call(e,body())).j.task.id;const row=e.EVENTS.sqlite.prepare('SELECT * FROM jarvis_tasks WHERE id=?').get(id);
 assert.equal(row.member_id,memberID(key));assert.equal(row.owner,await memberOwner(memberID(key)));assert.ok(!JSON.stringify(row).includes(key));
 assert.equal((await call(e,null,other)).j.tasks.length,0);assert.equal((await call(e,{action:'delete',id,member_id:memberID(key)},other,{'x-jarvis-legacy-key':key})).status,404);
 const rotated='3'.repeat(64);e.EVENTS.sqlite.prepare('UPDATE wb_members SET token_hash=? WHERE id=?').run(await hash(rotated),memberID(key));
 assert.equal((await call(e)).j.tasks.length,0);assert.equal((await call(e,null,rotated)).j.tasks[0].id,id);
 await execute(e.EVENTS,e,id);assert.equal((await call(e,null,rotated)).j.tasks[0].status,'completed');
});
test('membership expiry no longer stops queued work or daily background follow-up',async t=>{
 const e=env(t),id=(await call(e,body({cadence:'daily'}))).j.task.id;
 e.EVENTS.sqlite.prepare('UPDATE wb_members SET ends_at=? WHERE id=?').run(now()-1,memberID(key));await tick(e);
 const row=e.EVENTS.sqlite.prepare('SELECT * FROM jarvis_tasks WHERE id=?').get(id);assert.equal(row.status,'watching');assert.equal(row.runs,1);assert.equal(JSON.parse(row.result).modelCalls,1);assert.ok(row.next_run>now());
});
test('revocation during the first search prevents the second search and model call',async t=>{
 const e=env(t),id=(await call(e,body({web:true}))).j.task.id;let searches=0,models=0;e.JARVIS_FETCH=async()=>{searches++;e.EVENTS.sqlite.prepare('UPDATE wb_members SET suspended=1 WHERE id=?').run(memberID(key));return Response.json({items:[{id:1,full_name:'fixture/agent',html_url:'https://github.com/fixture/agent'}]});};e.AI.run=()=>{models++;throw Error('must not infer');};
 await execute(e.EVENTS,e,id);assert.equal(searches,1);assert.equal(models,0);assert.equal(e.EVENTS.sqlite.prepare('SELECT status FROM jarvis_tasks WHERE id=?').get(id).status,'paused');
});
test('revocation during an already-started inference prevents publishing its result or scheduling another run',async t=>{
 const e=env(t),original=e.AI.run,id=(await call(e,body({cadence:'daily'}))).j.task.id;e.AI.run=async()=>{e.EVENTS.sqlite.prepare('UPDATE wb_members SET suspended=1 WHERE id=?').run(memberID(key));return original();};await execute(e.EVENTS,e,id);
 const row=e.EVENTS.sqlite.prepare('SELECT * FROM jarvis_tasks WHERE id=?').get(id),result=JSON.parse(row.result);assert.equal(row.status,'paused');assert.equal(row.next_run,0);assert.equal(row.runs,0);assert.equal(result.report,null);assert.equal(result.modelCalls,1);
});
test('legacy anonymous tasks remain private and optional member-key recovery requires the original key',async t=>{
 const e=env(t);await ensure(e.EVENTS);e.EVENTS.sqlite.exec('DROP TRIGGER jarvis_trial_receipt; ALTER TABLE jarvis_tasks DROP COLUMN member_id');const legacy='c'.repeat(64),id=uid(),stamp=now();
 e.EVENTS.sqlite.prepare('INSERT INTO jarvis_tasks(id,owner,nonce,ip_key,input,status,created,updated,next_run,until_at,expires) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(id,await hash('jarvis-owner:v1:'+legacy),uid(),'fixture-ip',JSON.stringify(body()),'watching',stamp,stamp,stamp,stamp+86400,stamp+86400);
 e.EVENTS={...e.EVENTS};await ensure(e.EVENTS);assert.equal(e.EVENTS.sqlite.prepare('SELECT status FROM jarvis_tasks WHERE id=?').get(id).status,'watching');
 assert.equal((await call(e,null,legacy,{'x-jarvis-legacy-key':legacy})).j.tasks[0].id,id);assert.equal((await call(e)).j.tasks.length,0);
 const recovered=await call(e,null,key,{'x-jarvis-legacy-key':legacy});assert.equal(recovered.j.tasks[0].id,id);assert.equal(recovered.j.tasks[0].status,'paused');assert.equal((await call(e,null,other,{'x-jarvis-legacy-key':legacy})).j.tasks.length,0);
 assert.equal((await tick(e)).processed,0);
});
test('membership-store failure fails closed for API and background work',async t=>{
 const e=env(t),id=(await call(e,body())).j.task.id;let calls=0;e.AI.run=e.JARVIS_FETCH=()=>{calls++;throw Error('must not run');};e.EVENTS.sqlite.exec('DROP TABLE wb_members');assert.equal((await call(e)).status,503);await execute(e.EVENTS,e,id);assert.equal(calls,0);assert.equal(e.EVENTS.sqlite.prepare('SELECT status FROM jarvis_tasks WHERE id=?').get(id).status,'paused');
});
test('suspended member keys remain blocked and fresh browser keys cannot claim their tasks',async t=>{
 const e=env(t),id=(await call(e,body())).j.task.id;e.EVENTS.sqlite.prepare('UPDATE wb_members SET suspended=1 WHERE id=?').run(memberID(key));
 for(const b of [null,body(),{action:'resume',id}]){const r=await call(e,b);assert.equal(r.status,403);assert.equal(r.j.code,'access_blocked');}
 assert.equal((await call(e,null,unknown,{'x-jarvis-legacy-key':key})).j.tasks.length,0);assert.equal((await call(e,{action:'delete',id},unknown)).status,404);
});
test('rotating guest keys cannot gain a second IP trial or consume more model quota',async t=>{
 const e=env(t),first=await call(e,body(),unknown);assert.equal(first.status,202);await execute(e.EVENTS,e,first.j.task.id);
 for(const digit of ['c','e','f']){const denied=await call(e,body(),digit.repeat(64));assert.equal(denied.status,403);assert.equal(denied.j.code,'registration_required');}
 assert.equal(e.EVENTS.sqlite.prepare("SELECT n FROM relay_limits WHERE k='ai-global'").get().n,1);assert.equal(e.EVENTS.sqlite.prepare('SELECT COUNT(*) n FROM jarvis_tasks').get().n,1);
});

test('one guest submission survives retries and deletion; new IP and forged registration do not reset it',async t=>{
 const e=env(t),input=body(),first=await call(e,input,unknown);assert.equal(first.status,202);
 assert.equal((await call(e,input,unknown)).j.task.id,first.j.task.id);
 assert.equal((await call(e,null,unknown)).j.membership.trialRemaining,0);
 const denied=await call(e,body({registered:true,member_id:memberID(key),trialRemaining:1}),unknown);assert.equal(denied.j.code,'registration_required');
 await call(e,{action:'delete',id:first.j.task.id},unknown);
 assert.equal((await call(e,body(),unknown,{'CF-Connecting-IP':'a-different-network'})).j.code,'registration_required');
 assert.equal(e.EVENTS.sqlite.prepare('SELECT COUNT(*) n FROM jarvis_trials').get().n,1);
 assert.equal(e.EVENTS.sqlite.prepare('SELECT COUNT(*) n FROM jarvis_tasks').get().n,0);
 assert.equal(e.EVENTS.sqlite.prepare("SELECT n FROM relay_limits WHERE k='ai-global'").get(),undefined);
});
test('invalid input and unregistered daily requests do not consume the one-task trial',async t=>{
 const e=env(t);assert.equal((await call(e,body({nonce:'bad'}),unknown)).status,400);
 assert.equal((await call(e,body({cadence:'daily'}),unknown)).j.code,'registration_required');
 assert.equal((await call(e,null,unknown)).j.membership.trialRemaining,1);
 assert.equal((await call(e,body(),unknown)).status,202);
});
test('concurrent guest submissions admit one task; same-nonce retries return that task',async t=>{
 for(const sameNonce of [true,false]){
  const e=env(t);await call(e,null,unknown);const a=body(),b=sameNonce?a:body();
  const replies=await Promise.all([call(e,a,unknown),call(e,b,unknown)]);
  assert.equal(e.EVENTS.sqlite.prepare('SELECT COUNT(*) n FROM jarvis_tasks').get().n,1);
  assert.equal(e.EVENTS.sqlite.prepare('SELECT COUNT(*) n FROM jarvis_trials').get().n,1);
  assert.equal(e.EVENTS.sqlite.prepare('SELECT COUNT(*) n FROM jarvis_trial_ips').get().n,1);
  if(sameNonce){assert.deepEqual(replies.map(r=>r.status).sort(),[200,202]);assert.equal(replies[0].j.task.id,replies[1].j.task.id);}
  else assert.deepEqual(replies.map(r=>r.status).sort(),[202,403]);
 }
});
test('two fresh browser keys on one network cannot race the guest IP guard',async t=>{
 const e=env(t);await call(e,null,unknown);const replies=await Promise.all([call(e,body(),unknown),call(e,body(),'e'.repeat(64))]);
 assert.deepEqual(replies.map(r=>r.status).sort(),[202,403]);assert.equal(e.EVENTS.sqlite.prepare('SELECT COUNT(*) n FROM jarvis_tasks').get().n,1);
});
test('task expiry removes content but keeps its minimal trial receipt; IP guard expires separately',async t=>{
 const e=env(t),id=(await call(e,body(),unknown)).j.task.id;e.EVENTS.sqlite.prepare('UPDATE jarvis_tasks SET expires=0 WHERE id=?').run(id);
 e.EVENTS.sqlite.exec('UPDATE jarvis_trial_ips SET expires=0');await tick(e,{executeDue:false});
 assert.equal(e.EVENTS.sqlite.prepare('SELECT COUNT(*) n FROM jarvis_tasks').get().n,0);assert.equal(e.EVENTS.sqlite.prepare('SELECT COUNT(*) n FROM jarvis_trial_ips').get().n,0);
 assert.equal((await call(e,body(),unknown)).j.code,'registration_required');assert.equal((await call(e,body(),'e'.repeat(64))).status,202);
 const receipt=JSON.stringify(e.EVENTS.sqlite.prepare('SELECT * FROM jarvis_trials LIMIT 1').get());assert.ok(!receipt.includes(unknown)&&!receipt.includes('goal')&&!receipt.includes('ip'));
});
test('guest recovery can finish its first occurrence but cannot start another',async t=>{
 const e=env(t),id=(await call(e,body(),unknown)).j.task.id;
 await execute(e.EVENTS,e,id,{interactive:true,budgetMs:0});await call(e,{action:'pause',id},unknown);
 assert.equal((await call(e,{action:'resume',id},unknown)).status,202);await tick(e);
 const task=(await call(e,null,unknown)).j.tasks[0];assert.equal(task.status,'completed');assert.equal(task.runs,1);assert.equal(task.result.modelCalls,1);assert.equal(task.nextRun,0);
 assert.equal((await call(e,{action:'resume',id},unknown)).j.code,'registration_required');assert.equal((await call(e,{action:'feedback',id,value:'useful'},unknown)).status,200);
});
test('legacy guest daily history is read-only until registration, including the background runner',async t=>{
 const e=env(t),id=(await call(e,body(),unknown)).j.task.id;let models=0;e.AI.run=()=>{models++;throw Error('must not infer');};
 e.EVENTS.sqlite.prepare("UPDATE jarvis_tasks SET status='watching',runs=1,next_run=0,input=? WHERE id=?").run(JSON.stringify(body({cadence:'daily'})),id);
 await tick(e);const task=(await call(e,null,unknown)).j.tasks[0];assert.equal(task.status,'paused');assert.equal(task.stage,'registration_required');assert.equal(task.runs,1);assert.equal(models,0);
});
test('failed quota-receipt persistence rolls back task insertion and leaves the guest trial available',async t=>{
 const e=env(t);await call(e,null,unknown);e.EVENTS.sqlite.exec("CREATE TRIGGER fixture_receipt_failure BEFORE INSERT ON jarvis_trials BEGIN SELECT RAISE(ABORT,'synthetic storage failure'); END");
 assert.equal((await call(e,body(),unknown)).status,503);assert.equal(e.EVENTS.sqlite.prepare('SELECT COUNT(*) n FROM jarvis_tasks').get().n,0);assert.equal(e.EVENTS.sqlite.prepare('SELECT COUNT(*) n FROM jarvis_trial_ips').get().n,0);
 e.EVENTS.sqlite.exec('DROP TRIGGER fixture_receipt_failure');assert.equal((await call(e,null,unknown)).j.membership.trialRemaining,1);assert.equal((await call(e,body(),unknown)).status,202);
});
test('existing free AGI registration restores the trial privately without payment or new model allowance',async t=>{
 const {communityRoute}=await import('../community/server.mjs');const e=env(t),id=(await call(e,body(),unknown)).j.task.id;
 await execute(e.EVENTS,e,id);const token='e'.repeat(64);
 const registration=await communityRoute(new Request(origin+'/api/discuss?lang=en',{method:'POST',headers:{origin,'content-type':'application/json',authorization:'Bearer '+token},body:JSON.stringify({action:'register',handle:'Synthetic Reader',key_saved:true,agree:true,source:'internal'})}),e);
 assert.equal(registration.status,200);assert.equal(e.EVENTS.sqlite.prepare('SELECT ends_at FROM wb_members WHERE token_hash=?').get(await hash(token)).ends_at,0);
 const restored=await call(e,null,token,{'x-jarvis-legacy-key':unknown});assert.equal(restored.j.membership.member,true);assert.equal(restored.j.tasks[0].id,id);assert.equal(restored.j.tasks[0].status,'completed');
 assert.equal((await call(e,null,unknown)).j.tasks.length,0);assert.equal((await call(e,null,other,{'x-jarvis-legacy-key':unknown})).j.tasks.length,0);
 assert.equal((await call(e,body(),unknown,{'CF-Connecting-IP':'different-network'})).j.code,'registration_required');
 assert.equal((await call(e,body({cadence:'daily'}),token)).status,202);
 assert.equal(e.EVENTS.sqlite.prepare("SELECT n FROM relay_limits WHERE k='ai-global'").get().n,1);
});
