import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {sites,hubHost} from '../public/catalog.mjs';
import {csvExamples,csvRows,publicMetadata} from '../public/experience.mjs';
import {run} from '../public/engine.mjs';
import {feedbackSender} from '../public/feedback.mjs';
import worker from '../worker.mjs';
const env={ASSETS:{fetch:async request=>{
 try{return new Response(await readFile('dist'+new URL(request.url).pathname));}
 catch{return new Response('Missing',{status:404});}
}}};
const get=(host,path)=>worker.fetch(new Request('https://'+host+path),env);
for(const site of sites)test(site.id+': downloadable preparation inputs reproduce the real engine result',async()=>{
 const input=structuredClone(site.sample),templates=csvExamples(site.id);
 for(const item of templates){
  const response=await get(site.host,item.path);
  assert.equal(response.status,200);
  assert.match(response.headers.get('Content-Type'),/text\/csv/);
  assert.match(response.headers.get('Content-Disposition'),/^attachment;/);
  assert.equal(response.headers.get('X-Robots-Tag'),'noindex');
  input[item.group]=csvRows(await response.text(),site.sample[item.group][0]);
  assert.deepEqual(input[item.group],site.sample[item.group]);
  assert.equal((await get(hubHost,item.path)).status,404);
 }
 assert.deepEqual(run(site.id,input),run(site.id,site.sample));
 for(const page of ['guide.html','examples.html']){
  const html=await(await get(site.host,'/'+page)).text();
  assert.ok(html.includes('id="prepare-records"'));
  assert.ok(html.includes('href="/#editor-details"'));
  for(const item of templates)assert.ok(html.includes('href="'+item.path+'"'));
  if(!templates.length)assert.match(html,/individual settings/);
 }
 assert.equal(publicMetadata(site.id).csvTemplates.length,templates.length);
 assert.equal((await get(site.host,'/examples/unknown-template.csv')).status,404);
 assert.equal((await get(site.host,'/examples/'+site.id+'/../private-template.csv')).status,404);
});
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
