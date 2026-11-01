import test from 'node:test';
import assert from 'node:assert/strict';
import {publicProject,publicSettings,aggregatePath,inspectWorkers} from './workers_inspection.mjs';
test('diagnosis excludes credentials and deployment environment variables',()=>{
 const p=publicProject({id:'project',name:'site',deployment_configs:{production:{env_vars:{SECRET:{value:'do-not-copy'}}}},canonical_deployment:{id:'release',env_vars:{PASSWORD:'no'},deployment_trigger:{metadata:{commit_hash:'sha',commit_message:'private text'}}}});
 const s=publicSettings({bindings:[{name:'KEY',text:'secret'}],assets:{run_worker_first:true},compatibility_date:'2026-08-01'});
 assert.equal(p.deployment.commit,'sha'); assert.deepEqual(s.assets,{run_worker_first:true});
 assert.doesNotMatch(JSON.stringify([p,s]),/do-not-copy|private text|PASSWORD|bindings|secret/);
});
test('post-release aggregates query current UTC window separately and redact paths',async()=>{
 const windows=[{date:'2026-10-31',start:'2026-10-31T00:00:00.000Z',end:'2026-11-01T00:00:00.000Z',complete:true},{date:'2026-11-01',start:'2026-11-01T00:00:00.000Z',end:'2026-11-01T04:30:00.000Z',complete:false}],requests=[];
 const fetcher=async(url,options)=>{
   const q=options.body?JSON.parse(options.body):null;requests.push({url,q});
   let result={},data={};
   if(url.includes('/zones?'))result=[{id:'zone',name:'baipiaoji.com'}];
   else if(url.endsWith('/workers/scripts')||url.includes('/pages/projects?'))result=[];
   if(q?.query.includes('__type'))data={http:{fields:['clientRequestHTTPHost','clientRequestPath','clientRequestHTTPMethodName','edgeResponseStatus','requestSource'].map(name=>({name}))}};
   else if(q?.query.includes('httpRequestsAdaptiveGroups'))data={viewer:{zones:[{httpRequestsAdaptiveGroups:[{count:3,dimensions:{clientRequestPath:'/api/account/private?secret=no',datetimeHour:'2026-11-01T03:00:00Z'}}]}]}};
   return {ok:true,status:200,json:async()=>({success:true,result,data})};
 };
 const out=await inspectWorkers({account:'account',candidates:[{token:'fixture'}],windows,fetcher});
 for(const key of ['currentPaths','currentMcpHours','currentErrorHours']){
   assert.equal(out[key][0].date,'2026-11-01');assert.equal(out[key][0].complete,false);
   assert.equal(out[key][0].end,windows[1].end);assert.equal(out[key][0].rows[0].dimensions.clientRequestPath,'/api/account/*');
   assert.equal(out[key][0].row_limit,1000);
 }
 assert.equal(out.mcpClients[0].date,'2026-10-31');
 const current=requests.filter(r=>r.q?.query.includes('httpRequestsAdaptiveGroups')&&r.q.variables.s===windows[1].start);
 assert.equal(current.length,3);assert.ok(current.every(r=>r.q.variables.e===windows[1].end));
 assert.ok(current.some(r=>/datetimeHour.*userAgent/.test(r.q.query)));
 assert.doesNotMatch(JSON.stringify(out),/private\?|secret=no|fixture/);
});
test('query strings and private route identifiers do not enter aggregate report',()=>{
 assert.equal(aggregatePath('/api/account/customer-id?token=secret'),'/api/account/*');
 assert.equal(aggregatePath('/auth/callback?code=secret'),'/auth/*');
 assert.equal(aggregatePath('/public/a@example.com.json'),'/public/[redacted]');
 assert.equal(aggregatePath('/assets/app.js?v=1'),'/assets/app.js');
});
