#!/usr/bin/env node
// Runs only in the already-privileged bpj-ad-watch job after a durable daily
// claim. Existing handlers can initialize schema. No payment/watch/admin writes.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {memberSecret} from '../member-studio/ops.mjs';
import {ORIGINS, COUNTERS, count, unavailable, snapshot, validateSnapshot, fail} from './membership_schema.mjs';
import {REPOSITORY, apiClient, verifyClaim, provenance, readiness, MAX_BYTES} from './membership_handoff.mjs';

function countOrNull(value) {
  if(typeof value!=='number'&&!(typeof value==='string'&&/^\d+$/.test(value)))return null;
  return count(Number(value))?Number(value):null;
}
async function jsonFetch(request,url,options={}) {
  const response=await request(url,{...options,headers:{'User-Agent':'fleet-membership-aggregate-ci/1',...options.headers},redirect:'error',signal:AbortSignal.timeout(20000)});
  // Never deserialize or log an error response, and never follow auth redirects.
  if(!response.ok)fail();
  const text=await response.text();if(Buffer.byteLength(text)>MAX_BYTES)fail();
  const body=JSON.parse(text);if(!body||body.ok!==true)fail();return body;
}
export async function collect({request=fetch,env=process.env,now=()=>Date.now()}={}) {
  // GitHub artifact metadata has second precision; round down, never forward.
  const observed=new Date(Math.floor(now()/1000)*1000).toISOString();
  const rows=await Promise.all(Object.keys(ORIGINS).map(async site=>{
    const row=unavailable(site);
    try {
      const body=await jsonFetch(request,`${ORIGINS[site]}/api/member`);
      const price=countOrNull(body.plan?.price_units),days=countOrNull(body.plan?.days);
      if(body.site!==site||typeof body.ready!=='boolean'||typeof body.auto_renew!=='boolean'||price===null||days===null)fail();
      row.public={ok:true,ready:body.ready,site,auto_renew:body.auto_renew,plan_price_units:price,plan_days:days};
    } catch {row.errors.push('public:unavailable');}
    let secret;
    try {secret=memberSecret(site,env);}catch {row.errors.push('admin:auth_unavailable');return row;}
    try {
      const body=await jsonFetch(request,`${ORIGINS[site]}/api/member-admin`,{
        method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${secret}`,'User-Agent':'fleet-membership-aggregate-ci/1'},body:JSON.stringify({action:'stats'})
      });
      if(typeof body.recurring_billing!=='boolean')fail();
      row.admin={ok:true,...Object.fromEntries(COUNTERS.map(key=>[key,countOrNull(body[key])])),recurring_billing:body.recurring_billing};
    }catch {row.errors.push('admin:unavailable');}
    return row;
  }));
  return validateSnapshot(snapshot(rows,observed),{now:now()});
}
async function main() {
  const [claimPath,artifactId,out]=process.argv.slice(2);
  if(!readiness())fail();
  if(!claimPath||!out||!/^\d+$/.test(artifactId||'')||process.env.GITHUB_REPOSITORY!==REPOSITORY||process.env.GITHUB_REF!=='refs/heads/main'||process.env.GITHUB_RUN_ATTEMPT!=='1')fail();
  const api=apiClient(process.env.GH_TOKEN),run=await api(`/actions/runs/${process.env.GITHUB_RUN_ID}`);
  await verifyClaim(api,run,JSON.parse(fs.readFileSync(claimPath,'utf8')),Number(artifactId));
  const envelope={schema_version:1,provenance:provenance(run),snapshot:await collect()};
  const encoded=JSON.stringify(envelope,null,2)+'\n';if(Buffer.byteLength(encoded)>MAX_BYTES)fail();
  fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,encoded);
  console.log('Sanitized membership aggregate prepared; no private response data logged.');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(()=>{console.error('::error::Membership aggregate unavailable; no unvalidated output published.');process.exitCode=1;});
