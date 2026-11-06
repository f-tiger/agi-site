import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {requestWatchJSON,WatchRequestError,watchFailureSummary} from './watch-request.mjs';
import {watchSite} from './ops.mjs';
const endpoint='https://fixture.invalid/api/member-watch',options={method:'POST',headers:{Authorization:'Bearer fixture-secret'}};
const failure=(stage='chain_probe',reason='rpc_http_503',status=503)=>Response.json({ok:false,stage,reason},{status});
let calls=0,delays=[];
const recovered=await requestWatchJSON(endpoint,options,{retryProbes:true,wait:async ms=>delays.push(ms),request:async(url,init)=>{
 assert.equal(url,endpoint);assert.equal(init.redirect,'manual');assert.equal(init.headers.Authorization,'Bearer fixture-secret');
 return ++calls<3?failure():Response.json({ok:true,processed:0});
}});
assert.equal(recovered.ok,true);assert.equal(calls,3);assert.deepEqual(delays,[5000,10000]);
calls=0;
await assert.rejects(()=>requestWatchJSON(endpoint,options,{retryProbes:true,wait:async()=>{},request:async()=>{calls++;return failure('log_probe','rpc_timeout');}}),/HTTP 503; log_probe; rpc_timeout/);
assert.equal(calls,3,'Persistent probe failures stay bounded and fail closed');
for(const [stage,reason,status] of [
 ['chain_probe','rpc_http_503',401],['configuration','not_configured',503],['schema','database_schema',503],
 ['orders_scan','rpc_timeout',503],['health_write','database_error',503],['cleanup','database_limit',503],
 ['chain_probe','wrong_chain',503],['chain_probe','token_precision',503],['chain_probe','rpc_rejected',503],
]){
 calls=0;await assert.rejects(()=>requestWatchJSON(endpoint,options,{retryProbes:true,request:async()=>{calls++;return failure(stage,reason,status);}}));
 assert.equal(calls,1,`${stage}/${reason}/${status} must not retry`);
}
calls=0;await assert.rejects(()=>requestWatchJSON(endpoint,options,{request:async()=>{calls++;return failure();}}));assert.equal(calls,1,'Other requests do not gain retries');
for(const request of [async()=>{throw Error('secret https://private.example/token');},async()=>new Response('private SQL'),async()=>Response.json(null),async()=>Response.json([]),async()=>Response.json({processed:0}),async()=>Response.json({ok:false,stage:'private SQL',reason:'customer@example.org'},{status:503})]){
 let attempts=0;
 await assert.rejects(()=>requestWatchJSON(endpoint,options,{retryProbes:true,request:async(...args)=>{attempts++;return request(...args);}}),error=>{
  const summary=watchFailureSummary(error);assert.doesNotMatch(summary,/secret|private|customer|https:/);return error instanceof WatchRequestError;
 });
 assert.equal(attempts,1,'Unknown response/transport outcomes never repeat uncertain writes');
}
const realNow=Date.now;let now=realNow();calls=0;
try{Date.now=()=>now;await assert.rejects(()=>requestWatchJSON(endpoint,options,{retryProbes:true,request:async()=>{calls++;now+=116000;return failure();}}));assert.equal(calls,1,'All retries share the original 120-second request budget');}finally{Date.now=realNow;}
assert.doesNotMatch(watchFailureSummary(Error('private customer secret')),/private|customer|secret/);
const originalFetch=globalThis.fetch;
try{
 for(const scenario of ['stale','wrong_site','missing_ok','invalid_processed']){
  const requests=[];
  globalThis.fetch=async(url,init)=>{
   requests.push({url,init});
   return url.endsWith('/api/member-watch')?Response.json({ok:scenario==='missing_ok'?undefined:true,processed:scenario==='invalid_processed'?null:0}):Response.json({ok:true,site:scenario==='wrong_site'?'tds':'eco',ready:scenario!=='stale'});
  };
  await assert.rejects(()=>watchSite('eco',{ADS_WATCH_SECRET:'s'.repeat(64)}));
  if(['stale','wrong_site'].includes(scenario))assert.equal(requests.length,2,'Successful maintenance must check public readiness');
  else assert.equal(requests.length,1);
 }
}finally{globalThis.fetch=originalFetch;}
// Exercise the real aggregate runner: keep processing other sites, preserve the
// classified diagnosis and never print hostile response fields or raw failures.
const runner=new URL('./ops.mjs',import.meta.url).href;
for(const mode of ['watch-all','receipts-all']){
 const code=`
 globalThis.fetch=async(url)=>url.includes('agiscorecard')?Response.json({ok:false,stage:'orders_read',reason:'database_schema',message:'secret customer SQL'},{status:503}):url.includes('getecoback')?Response.json({ok:true,mode:'receipts-only',site:'eco',processed:0,ready:true}):Response.json({ok:false,stage:'private SQL',reason:'customer@example.org'},{status:503});
 process.argv=[process.execPath,new URL(${JSON.stringify(runner)}).pathname,${JSON.stringify(mode)}];
 await import(${JSON.stringify(runner)});
 `;
 const result=spawnSync(process.execPath,['--input-type=module','-e',code],{encoding:'utf8',env:{...process.env,ADS_WATCH_SECRET:'fixture-watch-secret-32-characters-long'}});
 assert.equal(result.status,1);assert.match(result.stderr,/agi: .*HTTP 503; orders_read; database_schema/);
 assert.match(result.stderr,/tds: .*unknown; unspecified/);assert.match(result.stdout,/"site":"eco"/);
 assert.doesNotMatch(result.stderr,/private|customer|secret|SQL/);
}
console.log('PASS bounded pre-write probe retries, strict failure, redirect/auth safety and sanitized per-site runner diagnostics');
