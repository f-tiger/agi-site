import test from 'node:test';
import assert from 'node:assert/strict';
import {jarvisRoute} from './server.mjs';
import {database} from './test-support.mjs';
import {agiMemberRequest} from '../../../../tools/fleet-account/agi-bridge.mjs';
import {SESSION_COOKIE} from '../../../../tools/fleet-account/config.mjs';
import {COMMERCIAL_CLAIM,COMMERCIAL_VERSION} from '../../foresight-assets/commercial.mjs';

// In-memory identity-boundary tests only. The Fleet hub is a local function;
// no production request, model, runner/tick, credential or browser is used.
const origin='https://agiscorecard.com',guestA='c'.repeat(64),guestB='d'.repeat(64),memberB='2'.repeat(64);
const context=()=>({kind:'future-guide-plan-v1',claimId:COMMERCIAL_CLAIM,evidenceVersion:COMMERCIAL_VERSION,fit:{recurring:true,records:true,owner:true}});
const body=()=>({action:'create',goal:'ACCOUNT_A_PRIVATE_HANDOFF_PLAN: prepare a reviewable draft.',lang:'en',cadence:'once',web:false,publicQuery:'',memory:[],consent:true,nonce:crypto.randomUUID().replaceAll('-',''),context:context()});
function fixture(t){
 const db=database();t.after(()=>db.sqlite.close());
 return {db,env:{EVENTS:db,MEMBER_WATCH_SECRET:'local-scope-fixture-only',JARVIS_FETCH(){throw Error('unexpected external read');}}};
}
async function direct(env,{token=guestA,body:input,scope}={}){
 const response=await jarvisRoute(new Request(origin+(input?'/api/jarvis':'/api/jarvis/tasks'),{method:input?'POST':'GET',headers:{origin,authorization:'Bearer '+token,'content-type':'application/json','CF-Connecting-IP':'synthetic-scope',...(scope===undefined?{}:{'x-jarvis-scope':scope})},...(input?{body:JSON.stringify(input)}:{})}),env);
 return {status:response.status,body:await response.json()};
}
function counts(db){return Object.fromEntries(['jarvis_tasks','jarvis_trials','jarvis_trial_ips'].map(name=>[name,db.sqlite.prepare('SELECT count(*) n FROM '+name).get().n]));}

test('a handoff prepared under guest A cannot be admitted under guest B or consume either trial',async t=>{
 const {db,env}=fixture(t),a=await direct(env),before=counts(db);
 assert.equal(a.status,200);
 const rejected=await direct(env,{token:guestB,scope:a.body.membership.scope,body:body()});
 assert.equal(rejected.status,409);assert.equal(rejected.body.code,'workspace_changed');
 assert.deepEqual(counts(db),before);
 assert.equal((await direct(env)).body.membership.trialRemaining,1);
 assert.equal((await direct(env,{token:guestB})).body.membership.trialRemaining,1);
});

test('the verified scope admits one handoff and preserves nonce reuse and trial accounting',async t=>{
 const {db,env}=fixture(t),a=await direct(env),input=body(),scope=a.body.membership.scope;
 const created=await direct(env,{scope,body:input});assert.equal(created.status,202);
 assert.deepEqual(created.body.task.input.context,context());
 assert.deepEqual(Object.keys(created.body.task.input.context).sort(),['claimId','evidenceVersion','fit','kind']);
 const again=await direct(env,{scope,body:input});assert.equal(again.status,200);assert.equal(again.body.reused,true);assert.equal(again.body.task.id,created.body.task.id);
 assert.equal(counts(db).jarvis_tasks,1);assert.equal(counts(db).jarvis_trials,1);
 assert.equal((await direct(env)).body.membership.trialRemaining,0);
});

test('context-bearing create requires an expected scope and cannot silently use the legacy admission path',async t=>{
 const {db,env}=fixture(t);await direct(env);const before=counts(db);
 const rejected=await direct(env,{body:body()});
 assert.equal(rejected.status,409);assert.equal(rejected.body.code,'workspace_changed');assert.deepEqual(counts(db),before);
 assert.equal((await direct(env)).body.membership.trialRemaining,1);
});

test('the expected-scope boundary rejects every other task mutation before changing a different workspace',async t=>{
 const {db,env}=fixture(t),a=await direct(env),b=await direct(env,{token:memberB}),scope=b.body.membership.scope;
 const created=await direct(env,{token:memberB,scope,body:body()});assert.equal(created.status,202);
 const id=created.body.task.id,before=db.sqlite.prepare('SELECT * FROM jarvis_tasks WHERE id=?').get(id);
 for(const input of [{action:'delete',id},{action:'pause',id},{action:'resume',id},{action:'feedback',id,value:'useful'},{action:'action_progress',id,run:1,index:0,value:'done'}]){
  const rejected=await direct(env,{token:memberB,scope:a.body.membership.scope,body:input});
  assert.equal(rejected.status,409,input.action);assert.equal(rejected.body.code,'workspace_changed',input.action);
  assert.deepEqual(db.sqlite.prepare('SELECT * FROM jarvis_tasks WHERE id=?').get(id),before,input.action);
 }
 assert.equal(db.sqlite.prepare('SELECT count(*) n FROM jarvis_action_progress').get().n,0);
});

test('a shared Fleet cookie switching accounts cannot submit the prior account handoff with the same literal browser credential',async t=>{
 const {db,env}=fixture(t);let identity='account-A',hubCalls=0;
 const service=async(url,init)=>{
  assert.equal(url,'https://baipiaoji.com/api/account-fleet');assert.equal(init.redirect,'manual');
  assert.deepEqual(JSON.parse(init.body),{action:'session',host:'agiscorecard.com'});
  hubCalls++;return Response.json({ok:true,user:{id:identity}});
 };
 async function fleet(input,scope){
  const request=new Request(origin+(input?'/api/jarvis':'/api/jarvis/tasks'),{method:input?'POST':'GET',headers:{origin,authorization:'Fleet',cookie:SESSION_COOKIE+'='+'f'.repeat(43),'content-type':'application/json','CF-Connecting-IP':'synthetic-scope',...(scope===undefined?{}:{'x-jarvis-scope':scope})},...(input?{body:JSON.stringify(input)}:{})});
  assert.equal(request.headers.get('authorization'),'Fleet');
  const adapted=await agiMemberRequest(request,env,service);assert.ok(adapted instanceof Request);
  const response=await jarvisRoute(adapted,env);return {status:response.status,body:await response.json()};
 }
 const a=await fleet();assert.equal(a.status,200);const input=body(),before=counts(db);
 identity='account-B';
 // This is the window before a delayed visibility-refresh GET tells the UI
 // that its unchanged "fleet" credential now represents another owner.
 const rejected=await fleet(input,a.body.membership.scope);
 assert.equal(rejected.status,409);assert.equal(rejected.body.code,'workspace_changed');assert.deepEqual(counts(db),before);
 const b=await fleet();assert.equal(b.status,200);assert.notEqual(b.body.membership.scope,a.body.membership.scope);assert.deepEqual(b.body.tasks,[]);
 const accepted=await fleet({...body(),goal:'ACCOUNT_B_VISIBLE_GOAL: prepare my own reviewed draft.'},b.body.membership.scope);
 assert.equal(accepted.status,202);assert.deepEqual(accepted.body.task.input.context,context());
 assert.equal((await fleet()).body.tasks.some(task=>task.input.goal.includes('ACCOUNT_A_PRIVATE')),false);
 assert.equal(hubCalls,5);
});

test('legacy callers without an expected scope preserve the existing non-context API contract',async t=>{
 const {env}=fixture(t),input=body();delete input.context;
 const accepted=await direct(env,{body:input});assert.equal(accepted.status,202);assert.equal(Object.hasOwn(accepted.body.task.input,'context'),false);
});
