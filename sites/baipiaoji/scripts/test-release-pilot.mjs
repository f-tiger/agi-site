import assert from 'node:assert/strict';
import {mock} from 'node:test';
import {DatabaseSync} from 'node:sqlite';
import {onRequest} from '../functions/api/release-pilot.js';
import {OFFER,CLOSES,qualified} from '../lib/release-pilot.js';
const db=new DatabaseSync(':memory:');
const HITS={prepare(sql){let args=[];const x={bind(...v){args=v;return x;},async run(){return db.prepare(sql).run(...args);},async first(){return db.prepare(sql).get(...args)||null;},async all(){return {results:db.prepare(sql).all(...args)};}};return x;},async batch(q){return Promise.all(q.map(x=>x.run()));}};
const env={HITS,ADS_WATCH_SECRET:'test-operator-secret-at-least-thirty-two'};
const body={action:'apply',offer:OFFER,id:crypto.randomUUID(),receipt:crypto.randomUUID(),session:crypto.randomUUID(),email:'fixture@example.test',consent:true,role:'owner',task:'plans',frequency:'two-plus',timing:'14days',stack:'stripe-external',budget:'299',hours:'over3',source:'coding',lang:'en',qa:false};
const call=(b,headers={},e=env)=>onRequest({request:new Request('https://baipiaoji.com/api/release-pilot',{method:'POST',headers:{Origin:'https://baipiaoji.com','CF-Connecting-IP':'192.0.2.1','Content-Type':'application/json',...headers},body:JSON.stringify(b)}),env:e});
// Test intake while open regardless of the machine date. This does not extend the offer.
// SQLite keeps its own clock: its relative 30-day cleanup/cap checks remain exercised.
const closesAt=Date.parse(CLOSES);
assert.ok(Number.isFinite(closesAt));
mock.timers.enable({apis:['Date'],now:closesAt-60_000});
try {
assert.equal((await call(body,{Origin:'https://evil.test'})).status,403);
assert.equal((await call({...body,consent:false})).status,400);
assert.equal((await call({...body,email:'bad'})).status,400);
assert.equal((await call({...body,role:'admin'})).status,400);
assert.equal((await call({...body,offer:'wrong'})).status,400);
assert.equal((await call({...body,extra:'x'.repeat(5000)})).status,400);
assert.equal((await call(body,{},{})).status,503);
assert.equal((await call(body)).status,200);
assert.equal((await call(body)).status,200);
assert.equal((await call({...body,task:'auth'})).status,409);
assert.equal(db.prepare('SELECT COUNT(*) n FROM release_pilot_applications').get().n,1);
assert.equal(db.prepare('SELECT qualified FROM release_pilot_applications').get().qualified,1);
assert.equal(qualified({...body,role:'developer'}),false);
assert.equal(qualified({...body,budget:'no'}),false);
assert.equal((await call({action:'list'})).status,401);
const listed=await (await call({action:'list'},{Authorization:'Bearer '+env.ADS_WATCH_SECRET})).json();assert.equal(listed.applications[0].email,'fixture@example.test');
const event={...body,action:'event',event:'price_seen'};assert.equal((await call(event)).status,200);assert.equal((await call(event)).status,200);assert.equal(db.prepare('SELECT COUNT(*) n FROM release_pilot_events').get().n,1);
assert.equal((await call({...event,event:'made_up'})).status,400);
const qa={...body,id:crypto.randomUUID(),receipt:crypto.randomUUID(),session:crypto.randomUUID()};await call(qa,{'User-Agent':'bpj-ci-selftest'});assert.equal(db.prepare('SELECT qa FROM release_pilot_applications WHERE id=?').get(qa.id).qa,1);
const stats=await (await call({action:'stats'},{Authorization:'Bearer '+env.ADS_WATCH_SECRET})).json();assert.ok(!JSON.stringify(stats).includes('fixture@example.test'));assert.equal(stats.checkout,false);
await call({action:'withdraw',id:body.id,receipt:crypto.randomUUID()});assert.ok(db.prepare('SELECT id FROM release_pilot_applications WHERE id=?').get(body.id));
await call({action:'withdraw',id:body.id,receipt:body.receipt});assert.equal(db.prepare('SELECT id FROM release_pilot_applications WHERE id=?').get(body.id),undefined);
// Real SQLite constraint/cap: no false success when capacity is exhausted.
for(let i=0;i<50;i++)assert.equal((await call({...body,email:'fixture'+i+'@example.test',session:crypto.randomUUID(),id:crypto.randomUUID(),receipt:crypto.randomUUID()},{'CF-Connecting-IP':'192.0.2.'+(i+10)})).status,200);
assert.equal((await call({...body,email:'last@example.test',session:crypto.randomUUID(),id:crypto.randomUUID(),receipt:crypto.randomUUID()},{'CF-Connecting-IP':'192.0.2.200'})).status,429);
db.prepare("UPDATE release_pilot_applications SET created=datetime('now','-31 days')").run();await onRequest({request:new Request('https://baipiaoji.com/api/release-pilot'),env});assert.equal(db.prepare('SELECT COUNT(*) n FROM release_pilot_applications').get().n,0);
console.log('PASS release pilot: validation, same-origin, real SQLite persistence/idempotency, QA isolation, private operator reads, withdrawal, intake cap and expiry.');

await call({action:'pause',paused:true},{Authorization:'Bearer '+env.ADS_WATCH_SECRET});assert.equal((await call(body)).status,410);await call({action:'pause',paused:false},{Authorization:'Bearer '+env.ADS_WATCH_SECRET});
for(let i=0;i<5;i++)assert.equal((await call({...body,email:'rate'+i+'@example.test',session:crypto.randomUUID(),id:crypto.randomUUID(),receipt:crypto.randomUUID()})).status,200);assert.equal((await call({...body,email:'rate6@example.test',session:crypto.randomUUID(),id:crypto.randomUUID(),receipt:crypto.randomUUID()})).status,429);
console.log('PASS conflict rejection, GET cleanup, pause control and per-network intake limit.');

// The published deadline is exclusive: one millisecond before it accepts, at/after it closes.
const getStatus=()=>onRequest({request:new Request('https://baipiaoji.com/api/release-pilot'),env});
const deadlineApplication={...body,email:'deadline@example.test',session:crypto.randomUUID(),id:crypto.randomUUID(),receipt:crypto.randomUUID()};
const deadlineEvent={...event,event:'view',id:crypto.randomUUID(),session:crypto.randomUUID()};
mock.timers.setTime(closesAt-1);
assert.equal((await (await getStatus()).json()).accepting,true);
assert.equal((await call(deadlineApplication,{'CF-Connecting-IP':'192.0.2.250'})).status,200);
assert.equal((await call(deadlineEvent)).status,200);
const beforeClosed={applications:db.prepare('SELECT COUNT(*) n FROM release_pilot_applications').get().n,events:db.prepare('SELECT COUNT(*) n FROM release_pilot_events').get().n};
for(const now of [closesAt,closesAt+1]){
 mock.timers.setTime(now);
 const status=await (await getStatus()).json();assert.equal(status.accepting,false);assert.equal(status.closes,CLOSES);assert.equal(status.checkout,false);
 for(const payload of [{...deadlineApplication,id:crypto.randomUUID(),session:crypto.randomUUID(),email:'closed@example.test'},{...deadlineEvent,id:crypto.randomUUID(),session:crypto.randomUUID()}]){
  const response=await call(payload,{'CF-Connecting-IP':'192.0.2.251'});assert.equal(response.status,410);assert.equal((await response.json()).code,'closed');
 }
 assert.equal(db.prepare('SELECT COUNT(*) n FROM release_pilot_applications').get().n,beforeClosed.applications);
 assert.equal(db.prepare('SELECT COUNT(*) n FROM release_pilot_events').get().n,beforeClosed.events);
}
// Closing intake must not remove operator access or the applicant's withdrawal capability.
assert.equal((await call({action:'stats'},{Authorization:'Bearer '+env.ADS_WATCH_SECRET})).status,200);
const confirmation=await call({action:'confirm',id:deadlineApplication.id,receipt:deadlineApplication.receipt});assert.equal(confirmation.status,200);assert.equal((await confirmation.json()).saved,true);
assert.equal((await call({action:'withdraw',id:deadlineApplication.id,receipt:deadlineApplication.receipt})).status,200);
assert.equal(db.prepare('SELECT id FROM release_pilot_applications WHERE id=?').get(deadlineApplication.id),undefined);
console.log('PASS deadline: open just before CLOSES, closed at/after it, no rejected writes, private operator access and withdrawal remain available.');
} finally {
 mock.timers.reset();
 db.close();
}
