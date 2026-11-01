import test from 'node:test';
import assert from 'node:assert/strict';
import {configureRelay} from './configure-relay.mjs';
const env={CLOUDFLARE_API_TOKEN:'synthetic-local-only',CLOUDFLARE_ACCOUNT_ID:'fixture-account'};
test('same scoped credential, only named service binding, existing bot metadata preserved',async()=>{
 const seen=[],names={agiscorecard:['MEMBER_WATCH_SECRET'],sunwatch:['TELEGRAM_BOT_TOKEN','TELEGRAM_CHAT_ID','ROADMAP_VERIFY_KEY']};
 const request=async(url,options)=>{
  const script=new URL(url).pathname.split('/').at(-2);assert.ok(Object.hasOwn(names,script));
  seen.push([script,options.method]);
  if(options.method==='PUT'){
   const body=JSON.parse(options.body);assert.equal(body.name,'CAPITAL_RADAR_RELAY_KEY');assert.equal(body.type,'secret_text');assert.match(body.text,/^[a-f0-9]{64}$/);assert.notEqual(body.text,env.CLOUDFLARE_API_TOKEN);
   seen.push(body.text);names[script].push(body.name);
  }
  return Response.json({success:true,result:names[script].map(name=>({name,type:'secret_text'}))});
 };
 assert.deepEqual(await configureRelay(env,request),{configured:true,workers:2});
 assert.deepEqual(seen.slice(0,2),[['agiscorecard','GET'],['sunwatch','GET']]);
 const values=seen.filter(x=>typeof x==='string');assert.equal(values.length,2);assert.equal(values[0],values[1]);
});
test('missing credentials or inaccessible existing worker stop before any write',async()=>{
 await assert.rejects(configureRelay({},()=>assert.fail('no request')),/credentials required/);
 const methods=[];
 await assert.rejects(configureRelay(env,async(url,options)=>{methods.push(options.method);return Response.json({success:false},{status:403});}),/HTTP 403/);
 assert.deepEqual(methods,['GET']);
});
test('lost pre-existing binding fails verification, without exposing its value',async()=>{
 let count=0;
 await assert.rejects(configureRelay(env,async()=>Response.json({success:true,result:++count<=2?[{name:'existing'}]:[]})),/verification failed/);
});
