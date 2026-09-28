import test from 'node:test';
import assert from 'node:assert/strict';
import {feedbackSender} from '../public/feedback.mjs';
const choices={frequency:'repeat',usefulness:'helped',interest:'discuss',ownCompleted:true,qa:true};
const ok=()=>new Response(JSON.stringify({saved:true}),{headers:{'Content-Type':'application/json'}});
test('feedback shares an in-flight request and suppresses repeated saved choices',async()=>{
 let calls=0,release;const held=new Promise(resolve=>release=resolve);
 const send=feedbackSender(async()=>{calls++;await held;return ok();},()=> 'fixed-id');
 const a=send(choices),b=send({...choices});assert.equal(calls,1);release();await Promise.all([a,b]);
 await send(choices);assert.equal(calls,1);
});
test('lost responses retry the identical ID; changed choices have a new identity',async()=>{
 const bodies=[];let ids=0;
 const send=feedbackSender(async(url,init)=>{bodies.push(JSON.parse(init.body));if(bodies.length===1)throw Error('Lost response');return ok();},()=> 'id-'+(++ids));
 await assert.rejects(send(choices),/Lost response/);await send(choices);
 assert.equal(bodies[0].id,bodies[1].id);
 await send({...choices,interest:'no'});assert.notEqual(bodies[2].id,bodies[1].id);
 await send(choices);assert.equal(bodies.length,3);
});
test('unconfirmed and failed feedback can retry without recording success or leaking extra fields',async()=>{
 for(const response of [new Response('unavailable',{status:503}),new Response('{"saved":false}'),new Response('invalid JSON')]){
  const bodies=[];const send=feedbackSender(async(url,init)=>{bodies.push(JSON.parse(init.body));return bodies.length===1?response:ok();},()=> 'same-id');
  await assert.rejects(send({...choices,privateRecords:'must not leave'}));await send(choices);
  assert.equal(bodies[0].id,bodies[1].id);assert.ok(!JSON.stringify(bodies).includes('must not leave'));
 }
});
