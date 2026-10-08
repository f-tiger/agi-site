import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {REPOSITORY,REPOSITORY_ID,WORKFLOW,WORKFLOW_ID,CLAIM_WINDOW,CLAIM_LIFETIME,claimName,aggregateName,provenance,trustedRun,trustedArtifact,dailyClaim,verifyClaim,selectAggregate,listAll,apiClient,readiness} from './membership_handoff.mjs';
const NOW=Date.parse('2026-10-08T01:00:00Z');
const iso=time=>new Date(time).toISOString(),clone=value=>structuredClone(value);
function run(id=100,created=NOW-60000){return {id,repository:{id:REPOSITORY_ID,full_name:REPOSITORY},head_repository:{id:REPOSITORY_ID,full_name:REPOSITORY},head_branch:'main',path:WORKFLOW,workflow_id:WORKFLOW_ID,run_attempt:1,head_sha:'a'.repeat(40),created_at:iso(created),event:'schedule',status:'completed',conclusion:'failure'};}
function artifact(r,created=NOW-30000,prefix='claim'){return {id:r.id+1000,name:prefix==='claim'?claimName(r):aggregateName(r),expired:false,size_in_bytes:1000,created_at:iso(created),expires_at:iso(created+30*86400e3),workflow_run:{id:r.id,repository_id:REPOSITORY_ID,head_repository_id:REPOSITORY_ID,head_branch:'main',head_sha:r.head_sha}};}
function apiMock(runs,artifacts={}) {const calls=[];const api=async route=>{calls.push(route);if(route.startsWith(`/actions/workflows/${WORKFLOW_ID}/runs?`))return {total_count:runs.length,workflow_runs:runs};const m=route.match(/^\/actions\/runs\/(\d+)\/artifacts\?/);if(m){const rows=artifacts[m[1]]||[];return {total_count:rows.length,artifacts:rows};}const id=route.match(/^\/actions\/artifacts\/(\d+)$/);if(id)return Object.values(artifacts).flat().find(a=>a.id===Number(id[1]));throw Error('Unexpected metadata route');};return {api,calls};}

test('same-repo exact main workflow and attempt provenance is mandatory',()=>{
  trustedRun(run());
  for(const mutate of [r=>r.repository.id++,r=>r.repository.full_name='evil/repo',r=>r.head_repository.id++,r=>r.head_repository.full_name='evil/repo',r=>r.head_branch='feature',r=>r.path='.github/workflows/other.yml',r=>r.workflow_id++,r=>r.run_attempt=2,r=>r.event='pull_request',r=>r.head_sha='bad',r=>r.id=0]){const v=run();mutate(v);assert.throws(()=>trustedRun(v));}
});
test('exact name, same run/sha/branch/repo, bounded size, nonexpired creation metadata are mandatory',()=>{
  const r=run(),a=artifact(r);trustedArtifact(a,r,claimName(r),{now:NOW});
  for(const mutate of [v=>v.name+='-evil',v=>v.workflow_run.id++,v=>v.workflow_run.repository_id++,v=>v.workflow_run.head_repository_id++,v=>v.workflow_run.head_branch='evil',v=>v.workflow_run.head_sha='b'.repeat(40),v=>v.expired=true,v=>v.size_in_bytes=40000,v=>v.created_at=iso(NOW+1),v=>v.created_at=iso(NOW-37*3600e3),v=>v.expires_at=iso(NOW)]){const v=clone(a);mutate(v);assert.throws(()=>trustedArtifact(v,r,claimName(r),{now:NOW}));}
});
test('delayed schedule may claim at any UTC hour when no prior daily claim exists',async()=>{
  for(const hour of [0,3,11,23]){const now=Date.parse(`2026-10-08T${String(hour).padStart(2,'0')}:41:00Z`),r=run(100,now-30000),m=apiMock([r]);const value=await dailyClaim(m.api,r,{now});assert.equal(value.provenance.run_id,r.id);assert.equal(value.issued_at,iso(now));}
});
test('claim time is rounded down to GitHub second precision',async()=>{
  const current=run(),claim=await dailyClaim(apiMock([current]).api,current,{now:NOW+999});assert.equal(claim.issued_at,iso(NOW));
});
test('a persisted recent claim blocks a second run, including failed collection and cancellation',async()=>{
  const current=run(),previous=run(99,NOW-3600e3),a=artifact(previous,NOW-3500e3);
  for(const status of ['completed','cancelled','in_progress']){previous.status=status;previous.conclusion='failure';const m=apiMock([current,previous],{99:[a]});assert.equal(await dailyClaim(m.api,current,{now:NOW}),null);}
});
test('UTC date change does not bypass 24h plus safety margin',async()=>{
  const current=run(),previous=run(99,NOW-2*3600e3),a=artifact(previous,NOW-90*60e3),m=apiMock([current,previous],{99:[a]});assert.notEqual(a.created_at.slice(0,10),iso(NOW).slice(0,10));assert.equal(await dailyClaim(m.api,current,{now:NOW}),null);
});
test('24h claim window boundary is conservative and deterministic',async()=>{
  const current=run(),previous=run(99,NOW-CLAIM_WINDOW-60000);
  for(const [age,blocked] of [[CLAIM_WINDOW-1,true],[CLAIM_WINDOW,false]]){const m=apiMock([current,previous],{99:[artifact(previous,NOW-age)]});assert.equal((await dailyClaim(m.api,current,{now:NOW}))===null,blocked);}
});
test('rerun cannot collect again, and an original claim still blocks if its run was rerun',async()=>{
  const current=run(),rerun={...run(),run_attempt:2};await assert.rejects(()=>dailyClaim(apiMock([rerun]).api,rerun,{now:NOW}));
  const previous=run(99,NOW-3600e3),claim=artifact(previous,NOW-3500e3);previous.run_attempt=2;assert.equal(await dailyClaim(apiMock([current,previous],{99:[claim]}).api,current,{now:NOW}),null);
});
test('old queued run, missing current run, malformed claim metadata or API failure fail closed',async()=>{
  await assert.rejects(()=>dailyClaim(apiMock([]).api,run(),{now:NOW}));
  const old=run(90,NOW-3600e3-1);await assert.rejects(()=>dailyClaim(apiMock([old]).api,old,{now:NOW}));
  const r=run(),a=artifact(r);a.workflow_run.head_branch='evil';await assert.rejects(()=>dailyClaim(apiMock([r],{100:[a]}).api,r,{now:NOW}));
  await assert.rejects(()=>dailyClaim(async()=>{throw Error('network');},r,{now:NOW}));
});
test('unexpected branch or malformed run-attempt metadata cannot hide a blocking claim',async()=>{
  for(const mutate of [r=>r.head_branch=null,r=>r.head_branch='feature',r=>r.run_attempt=0,r=>r.run_attempt='2',r=>r.run_attempt=null,r=>r.path='other-workflow.yml']){
    const current=run(),previous=run(99,NOW-3600e3),a=artifact(previous,NOW-3500e3);mutate(previous);
    await assert.rejects(()=>dailyClaim(apiMock([current,previous],{99:[a]}).api,current,{now:NOW}));
  }
});
test('claim must be uploaded, visible and retained before any collection is eligible',async()=>{
  const r=run(),claim={schema_version:1,provenance:provenance(r),issued_at:iso(NOW-40000)},a=artifact(r),api=apiMock([r],{100:[a]}).api;
  assert.equal((await verifyClaim(api,r,claim,a.id,{now:NOW})).id,a.id);
  await assert.rejects(()=>verifyClaim(api,r,claim,999999,{now:NOW}));
  await assert.rejects(()=>verifyClaim(api,r,{...claim,issued_at:iso(NOW-CLAIM_LIFETIME-1)},a.id,{now:NOW}));
  const short={...a,expires_at:iso(NOW+3600e3)};await assert.rejects(()=>verifyClaim(apiMock([r],{100:[short]}).api,r,claim,a.id,{now:NOW}));
});
test('pagination is complete or fails closed on cap, short page, changing total and duplicates',async()=>{
  const records=Array.from({length:101},(_,i)=>({id:i+1}));let pages=0;
  assert.equal((await listAll(async()=>({total_count:101,artifacts:pages++===0?records.slice(0,100):records.slice(100)}),'/actions/artifacts','artifacts')).length,101);
  for(const result of [{total_count:101,artifacts:[]},{total_count:2,artifacts:[{id:1},{id:1}]},{total_count:-1,artifacts:[]}])await assert.rejects(()=>listAll(async()=>result,'/actions/artifacts','artifacts'));
  pages=0;await assert.rejects(()=>listAll(async()=>{const start=pages++*100;return {total_count:501,artifacts:Array.from({length:100},(_,i)=>({id:start+i+1}))};},'/actions/artifacts','artifacts'));assert.equal(pages,5);
  pages=0;await assert.rejects(()=>listAll(async()=>({total_count:101+pages,artifacts:pages++===0?records.slice(0,100):records.slice(100)}),'/actions/artifacts','artifacts'));
});
test('consumer can use completed aggregate despite unrelated watcher failure; never rerun or in-progress artifact',async()=>{
  const r=run(),a=artifact(r,NOW-30000,'aggregate');const selected=await selectAggregate(apiMock([r],{100:[a]}).api,{now:NOW});assert.equal(selected.run.conclusion,'failure');
  for(const bad of [{...r,status:'in_progress'},{...r,run_attempt:2}])await assert.rejects(()=>selectAggregate(apiMock([bad],{100:[a]}).api,{now:NOW}));
});
test('consumer chooses newest exact aggregate and refuses stale or fork metadata',async()=>{
  const first=run(90,NOW-3600e3),last=run(),artifacts={90:[artifact(first,NOW-3500e3,'aggregate')],100:[artifact(last,NOW-30000,'aggregate')]};assert.equal((await selectAggregate(apiMock([first,last],artifacts).api,{now:NOW})).run.id,100);
  const fork=run();fork.head_repository.id++;await assert.rejects(()=>selectAggregate(apiMock([fork],artifacts).api,{now:NOW}));
  const old=run(90,NOW-37*3600e3);await assert.rejects(()=>selectAggregate(apiMock([old],{90:[artifact(old,NOW-37*3600e3+1,'aggregate')]}).api,{now:NOW}));
});
test('stale 36–48h artifact cannot veto a newer fresh aggregate',async()=>{
  const old=run(90,NOW-40*3600e3),fresh=run(),artifacts={90:[artifact(old,NOW-39*3600e3,'aggregate')],100:[artifact(fresh,NOW-30000,'aggregate')]};
  assert.equal((await selectAggregate(apiMock([old,fresh],artifacts).api,{now:NOW})).run.id,100);
});
test('GitHub token is sent only to fixed same-repo API metadata, with no redirects or writes',async()=>{
  let calls=0;const api=apiClient('unit-test-only',async(url,options)=>{calls++;assert.ok(url.startsWith(`https://api.github.com/repos/${REPOSITORY}/actions/`));assert.equal(options.redirect,'error');assert.equal(options.method,undefined);return new Response('{}');});
  await api('/actions/runs/100');assert.equal(calls,1);
  for(const route of ['https://evil.test','/secrets','/actions/workflows/355815232/dispatches','/actions/../secrets'])await assert.rejects(()=>api(route));assert.equal(calls,1);
});
test('source readiness is closed; producer and claim CLI make no production calls or credential assumptions',()=>{
  assert.equal(readiness(),false);
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'membership-gate-'));
  try{
    const claim=spawnSync(process.execPath,[fileURLToPath(new URL('./membership_handoff.mjs',import.meta.url)),'claim',tmp],{encoding:'utf8',env:{PATH:process.env.PATH}});assert.equal(claim.status,0);assert.match(claim.stdout,/disabled/);assert.deepEqual(fs.readdirSync(tmp),[]);
    const producer=spawnSync(process.execPath,[fileURLToPath(new URL('./membership_producer.mjs',import.meta.url)),path.join(tmp,'claim.json'),'1',path.join(tmp,'out.json')],{encoding:'utf8',env:{PATH:process.env.PATH}});assert.equal(producer.status,1);assert.deepEqual(fs.readdirSync(tmp),[]);
  }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
