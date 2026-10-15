import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {collect} from './membership_producer.mjs';
import {ORIGINS, validateSnapshot} from './membership_schema.mjs';
import {memberSecret} from '../member-studio/ops.mjs';
import {consumeEnvelope, REPOSITORY, REPOSITORY_ID, WORKFLOW, WORKFLOW_ID, provenance, aggregateName} from './membership_handoff.mjs';

// No inherited credentials or real network. Dependencies are explicitly injected.
globalThis.fetch=()=>{throw Error('Tests must not use live services');};
const NOW=Date.parse('2026-10-08T01:00:00Z'),SECRET='fixture-only-secret-not-a-real-credential-000';
const env={ADS_WATCH_SECRET:SECRET};
const clone=value=>structuredClone(value);
function mock(mode='zero',auth=env) {
  const calls=[];
  const request=async(url,options)=>{
    calls.push({url,options});
    const parsed=new URL(url),site=Object.keys(ORIGINS).find(s=>ORIGINS[s]===parsed.origin);
    assert.ok(site);assert.equal(options.redirect,'error');assert.match(options.headers['User-Agent'],/ci/);
    const admin=parsed.pathname==='/api/member-admin';
    if(!admin)assert.equal(parsed.pathname,'/api/member');
    if(admin){assert.equal(options.method,'POST');assert.equal(options.body,'{"action":"stats"}');assert.equal(options.headers.Authorization,`Bearer ${memberSecret(site,auth)}`);}
    if(mode==='throw')throw Error(`${SECRET} private customer support https://private.invalid`);
    const body=admin?{ok:true,paid_orders:0,paid_members:0,active_members:0,unexpired_pending:0,recurring_billing:false,gross_usdt_micro:0,net_revenue:null,unknown_private:{email:'private@example.test',secret:SECRET}}:{ok:true,ready:true,site,auto_renew:false,plan:{price_units:9000000,days:30},token:'USDT',private:SECRET};
    if(mode==='partial'&&admin&&site==='agi')return new Response('secret body '+SECRET,{status:401});
    if(mode==='public-failed'&&!admin)return new Response('secret body '+SECRET,{status:503});
    if(mode==='not-ready'&&!admin)body.ready=false;
    if(mode==='malformed'&&admin)body.paid_orders='oops '+SECRET;
    if(mode==='wrong-site'&&!admin)body.site='private-customer-name';
    if(mode==='oversized')return new Response(JSON.stringify({...body,extra:'x'.repeat(33000)}));
    return new Response(JSON.stringify(body));
  };
  return {calls,run:()=>collect({request,env:auth,now:()=>NOW})};
}
test('observed zero needs every authenticated read, using exactly four fixed origins and eight calls',async()=>{
  const m=mock(),report=await m.run();assert.equal(m.calls.length,8);assert.equal(report.counters_complete,true);assert.deepEqual(Object.values(report.totals),[0,0,0,0]);assert.equal(report.generated,new Date(NOW).toISOString());
  assert.ok(!JSON.stringify(report).includes(SECRET));assert.ok(!JSON.stringify(report).includes('private'));
});
test('existing CF fallback derives site subkeys; raw CF credential is never transmitted',async()=>{
  const m=mock('zero',{CLOUDFLARE_API_TOKEN:SECRET});await m.run();assert.equal(m.calls.length,8);assert.ok(m.calls.every(c=>!JSON.stringify(c).includes(SECRET)));
});
test('observation time rounds down to artifact metadata precision',async()=>{
  const report=await collect({env:{},now:()=>NOW+999,request:async()=>{throw Error('fixture unavailable');}});assert.equal(report.generated,new Date(NOW).toISOString());
});
test('missing auth gives explicit nulls with four public calls only',async()=>{
  const m=mock('zero',{}),report=await m.run();assert.equal(m.calls.length,4);assert.equal(report.counters_complete,false);assert.deepEqual(Object.values(report.totals),[null,null,null,null]);
});
test('individual failures never produce fleet zero, but other sites still collect',async()=>{
  const m=mock('partial'),report=await m.run();assert.equal(m.calls.length,8);assert.equal(report.sites[0].admin.paid_orders,0);assert.equal(report.sites[1].admin.paid_orders,null);assert.deepEqual(Object.values(report.totals),[null,null,null,null]);
});
test('malformed counter is null, without losing valid independently observed counters',async()=>{
  const report=await mock('malformed').run();assert.equal(report.counters_complete,false);assert.equal(report.totals.paid_orders,null);assert.equal(report.totals.paid_members,0);
});
test('errors, wrong site names, failed/oversized responses cannot leak arbitrary strings',async()=>{
  for(const mode of ['throw','wrong-site','public-failed','oversized']){
    const m=mock(mode),report=await m.run();assert.equal(m.calls.length,8);assert.equal(report.ok,false);const text=JSON.stringify(report);assert.ok(!text.includes(SECRET));assert.ok(!text.includes('customer'));assert.ok(!text.includes('https://private'));validateSnapshot(report,{now:NOW});
  }
});
test('not-ready is separate from unavailable reads or counter completeness',async()=>{const report=await mock('not-ready').run();assert.equal(report.ok,false);assert.equal(report.counters_complete,true);assert.ok(report.sites.every(r=>r.public.ok));});
test('strict public schema rejects unknown, private, raw-error and secret fields anywhere',async()=>{
  const report=await mock().run();
  for(const mutate of [r=>r.private=SECRET,r=>r.sites[0].public.extra=SECRET,r=>r.sites[1].admin.customer_id='1',r=>r.sites[2].errors=[SECRET],r=>r.sites[3].origin='https://evil.test',r=>r.sites[0].public.site='customer',r=>r.totals.extra=0,r=>r.generated='yesterday',r=>r.sites.push(r.sites[0]),r=>r.sites[0].admin.paid_orders=false,r=>r.totals.paid_orders=1,r=>r.counters_complete=false]){
    const value=clone(report);mutate(value);assert.throws(()=>validateSnapshot(value,{now:NOW}));
  }
});
function selection(){
  const run={id:101,repository:{id:REPOSITORY_ID,full_name:REPOSITORY},head_repository:{id:REPOSITORY_ID,full_name:REPOSITORY},head_branch:'main',path:WORKFLOW,workflow_id:WORKFLOW_ID,run_attempt:1,head_sha:'a'.repeat(40),created_at:new Date(NOW-120e3).toISOString(),event:'schedule',status:'completed'};
  const artifact={id:102,name:aggregateName(run),expired:false,size_in_bytes:2000,created_at:new Date(NOW+1e3).toISOString(),expires_at:new Date(NOW+30*86400e3).toISOString(),workflow_run:{id:run.id,repository_id:REPOSITORY_ID,head_repository_id:REPOSITORY_ID,head_branch:'main',head_sha:run.head_sha}};
  return {run,artifact};
}
test('consumer preserves exact observation time and rejects stale, future, private or mismatched provenance',async()=>{
  const chosen=selection(),report=await mock().run(),envelope={schema_version:1,provenance:provenance(chosen.run),snapshot:report};
  assert.equal(consumeEnvelope(envelope,chosen,{now:NOW+2e3}).generated,report.generated);
  for(const mutate of [e=>e.provenance.run_attempt=2,e=>e.provenance.repository='other/repo',e=>e.provenance.extra=SECRET,e=>e.snapshot.sites[0].errors=[SECRET],e=>e.snapshot.generated=new Date(NOW+3e3).toISOString(),e=>e.snapshot.generated=new Date(NOW-121e3).toISOString()]){const value=clone(envelope);mutate(value);assert.throws(()=>consumeEnvelope(value,chosen,{now:NOW+2e3}));}
  assert.throws(()=>consumeEnvelope(envelope,chosen,{now:NOW+37*3600e3}));
});
test('consumer CLI parses only one fixed JSON file, never executes artifacts, and cannot overwrite on failure',async()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'membership-consumer-'));
  try{
    const src=path.join(tmp,'source');fs.mkdirSync(src);const out=path.join(tmp,'out.json'),meta=path.join(tmp,'selection.json');fs.writeFileSync(out,'old observation');fs.writeFileSync(meta,JSON.stringify(selection()));
    const script=fileURLToPath(new URL('./membership_snapshot.mjs',import.meta.url));
    for(const files of [['evil.mjs'],['membership-aggregate.json','extra.txt'],['membership-aggregate.json']]){
      for(const f of fs.readdirSync(src))fs.unlinkSync(path.join(src,f));for(const f of files)fs.writeFileSync(path.join(src,f),`process.exit(0); ${SECRET}`);
      const r=spawnSync(process.execPath,[script,'--input',src,'--selection',meta,'--out',out],{encoding:'utf8',env:{PATH:process.env.PATH}});
      assert.equal(r.status,1);assert.equal(fs.readFileSync(out,'utf8'),'old observation');assert.ok(!r.stderr.includes(SECRET));
    }
  }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
