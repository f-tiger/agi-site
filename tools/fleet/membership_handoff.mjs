import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {exact, fail, timestamp, validateSnapshot} from './membership_schema.mjs';
export const REPOSITORY='f-tiger/agi-site', REPOSITORY_ID=1339564759;
export const WORKFLOW='.github/workflows/bpj-ad-watch.yml', WORKFLOW_ID=355815232;
export const PREFIX='fleet-membership-aggregate-', CLAIM_PREFIX='fleet-membership-claim-';
// 24h plus a 5-minute collection/clock safety margin. Claims survive 30 days.
export const CLAIM_WINDOW=24*3600e3+5*60e3, CLAIM_LIFETIME=2*60e3;
export const MAX_PUBLISH_DELAY=5*60e3;
export const MAX_AGE=36*3600e3, MAX_BYTES=32768;
const BASE=`https://api.github.com/repos/${REPOSITORY}`;
export function trustedRun(run) {
  if(!Number.isSafeInteger(run.id)||run.id<=0||run.repository?.id!==REPOSITORY_ID||run.repository?.full_name!==REPOSITORY||run.head_repository?.id!==REPOSITORY_ID||run.head_repository?.full_name!==REPOSITORY||run.head_branch!=='main'||run.path!==WORKFLOW||run.workflow_id!==WORKFLOW_ID||!['schedule','workflow_dispatch'].includes(run.event)||run.run_attempt!==1||!/^[a-f0-9]{40}$/.test(run.head_sha))fail();
  timestamp(run.created_at);return run;
}
export function provenance(run) { trustedRun(run);return {repository:REPOSITORY,workflow:WORKFLOW,run_id:run.id,run_attempt:1,head_sha:run.head_sha}; }
export function validateProvenance(value,run) {exact(value,['repository','workflow','run_id','run_attempt','head_sha']);if(Object.entries(provenance(run)).some(([key,expected])=>value[key]!==expected))fail();}
export function claimName(run) {return CLAIM_PREFIX+run.id+'-1';}
export function aggregateName(run) {return PREFIX+run.id+'-1';}
export function trustedArtifact(artifact,run,name,{now=Date.now(),maxAge=MAX_AGE}={}) {
  trustedRun(run); const wr=artifact.workflow_run;
  if(artifact.name!==name||!Number.isSafeInteger(artifact.id)||artifact.id<=0||artifact.expired!==false||!Number.isSafeInteger(artifact.size_in_bytes)||artifact.size_in_bytes<=0||artifact.size_in_bytes>MAX_BYTES||wr?.id!==run.id||wr?.repository_id!==REPOSITORY_ID||wr?.head_repository_id!==REPOSITORY_ID||wr?.head_branch!=='main'||wr?.head_sha!==run.head_sha)fail();
  const created=timestamp(artifact.created_at),age=now-created;
  if(age<0||age>maxAge||created<timestamp(run.created_at)||timestamp(artifact.expires_at)<=now)fail();
  return artifact;
}
export function apiClient(token,request=fetch) {
  if(!token)fail();
  return async route=>{
    // Caller supplies only fixed same-repository Actions metadata paths.
    if(!/^\/actions\/(?:runs|artifacts|workflows\/355815232\/runs)(?:[/?]|$)/.test(route)||route.includes('..'))fail();
    const r=await request(BASE+route,{headers:{Accept:'application/vnd.github+json',Authorization:`Bearer ${token}`,'X-GitHub-Api-Version':'2022-11-28'},redirect:'error',signal:AbortSignal.timeout(10000)});
    if(!r.ok)fail();const text=await r.text();if(Buffer.byteLength(text)>2e6)fail();return JSON.parse(text);
  };
}
export async function listAll(api,route,key) {
  const items=[];let total;
  for(let page=1;page<=5;page++) {
    const result=await api(`${route}${route.includes('?')?'&':'?'}per_page=100&page=${page}`);
    if(!Number.isSafeInteger(result.total_count)||result.total_count<0||!Array.isArray(result[key])||result[key].length>100)fail();
    if(total===undefined)total=result.total_count; else if(total!==result.total_count)fail();
    items.push(...result[key]);
    if(items.length===total) {if(new Set(items.map(item=>item.id)).size!==items.length)fail();return items;}
    if(items.length>total||result[key].length<100)fail();
  }
  fail(); // Never make a budget decision with incomplete pagination.
}
export async function recentRuns(api,now) {
  const since=new Date(now-48*3600e3).toISOString();
  return listAll(api,`/actions/workflows/${WORKFLOW_ID}/runs?branch=main&created=${encodeURIComponent('>='+since)}`,'workflow_runs');
}
export async function dailyClaim(api,current,{now=Date.now()}={}) {
  trustedRun(current); const age=now-timestamp(current.created_at);
  if(age<0||age>3600e3)fail(); // Old queued/manual reruns cannot escape the lookback.
  const runs=await recentRuns(api,now);
  if(!runs.some(run=>run.id===current.id))fail();
  for(const candidate of runs) {
    // Unexpected metadata is a fail-closed result, never grounds to ignore a claim.
    if(!Number.isSafeInteger(candidate.run_attempt)||candidate.run_attempt<1)fail();
    trustedRun({...candidate,run_attempt:1});
    {
      const artifacts=await listAll(api,`/actions/runs/${candidate.id}/artifacts`,'artifacts');
      for(const artifact of artifacts.filter(a=>a.name.startsWith(CLAIM_PREFIX))) {
        // Rerunning a run changes latest run_attempt metadata. Its durable claim
        // remains blocking even if the latest run is attempt 2 or was cancelled.
        const original={...candidate,run_attempt:1};
        trustedArtifact(artifact,original,claimName(original),{now,maxAge:48*3600e3});
        if(now-timestamp(artifact.created_at)<CLAIM_WINDOW||artifact.created_at.slice(0,10)===new Date(now).toISOString().slice(0,10))return null;
      }
    }
  }
  return {schema_version:1,provenance:provenance(current),issued_at:new Date(Math.floor(now/1000)*1000).toISOString()};
}
export async function verifyClaim(api,current,claim,artifactId,{now=Date.now()}={}) {
  exact(claim,['schema_version','provenance','issued_at']);if(claim.schema_version!==1)fail();validateProvenance(claim.provenance,current);
  const age=now-timestamp(claim.issued_at);if(age<0||age>CLAIM_LIFETIME)fail();
  const artifact=await api(`/actions/artifacts/${artifactId}`);
  trustedArtifact(artifact,current,claimName(current),{now,maxAge:CLAIM_LIFETIME});
  if(timestamp(artifact.created_at)<timestamp(claim.issued_at))fail();
  // Record a 30-day claim; platform truncation below the budget horizon blocks reads.
  if(timestamp(artifact.expires_at)-timestamp(artifact.created_at)<CLAIM_WINDOW)fail();
  return artifact;
}
export async function selectAggregate(api,{now=Date.now()}={}) {
  const candidates=[];
  for(const raw of await recentRuns(api,now)) {
    // Report can accept a successful aggregate despite unrelated watcher failure.
    // Artifacts from incomplete or rerun attempts are deliberately not consumed.
    if(raw.status!=='completed'||raw.run_attempt!==1)continue;
    const run=trustedRun(raw);
    const artifacts=await listAll(api,`/actions/runs/${run.id}/artifacts`,'artifacts');
    for(const artifact of artifacts.filter(a=>a.name===aggregateName(run))) {
      if(now-timestamp(artifact.created_at)>MAX_AGE)continue;
      trustedArtifact(artifact,run,aggregateName(run),{now});
      candidates.push({run,artifact});
    }
  }
  candidates.sort((a,b)=>timestamp(b.artifact.created_at)-timestamp(a.artifact.created_at));
  if(!candidates.length)fail();
  return candidates[0];
}
export function consumeEnvelope(envelope,selection,{now=Date.now()}={}) {
  exact(envelope,['schema_version','provenance','snapshot']);if(envelope.schema_version!==1)fail();
  trustedArtifact(selection.artifact,selection.run,aggregateName(selection.run),{now});
  validateProvenance(envelope.provenance,selection.run);
  validateSnapshot(envelope.snapshot,{now});
  const observed=timestamp(envelope.snapshot.generated);
  if(observed<timestamp(selection.run.created_at)||observed>timestamp(selection.artifact.created_at)||timestamp(selection.artifact.created_at)-observed>MAX_PUBLISH_DELAY)fail();
  return envelope.snapshot; // Preserve observation time; no Date.now relabeling.
}
export function readiness() {
  const value=JSON.parse(fs.readFileSync(new URL('./membership_readiness.json',import.meta.url),'utf8'));
  return value.enabled===true&&!!value.evidence;
}
function output(key,value) {if(process.env.GITHUB_OUTPUT)fs.appendFileSync(process.env.GITHUB_OUTPUT,`${key}=${value}\n`);}
async function main() {
  const [mode,dir,artifactId]=process.argv.slice(2);
  if(!dir)fail();fs.mkdirSync(dir,{recursive:true});
  if(mode==='claim') {
    if(!readiness()){console.log('Live aggregate collection is disabled pending per-endpoint D1 rows-read evidence.');return;}
    if(process.env.GITHUB_REPOSITORY!==REPOSITORY||process.env.GITHUB_REF!=='refs/heads/main'||process.env.GITHUB_RUN_ATTEMPT!=='1')fail();
    const api=apiClient(process.env.GH_TOKEN);
    const run=await api(`/actions/runs/${process.env.GITHUB_RUN_ID}`);
    const claim=await dailyClaim(api,run);
    if(!claim){console.log('Daily aggregate polling budget already claimed.');return;}
    fs.writeFileSync(path.join(dir,'membership-claim.json'),JSON.stringify(claim)+'\n');
    output('name',claimName(run));output('eligible','true');
  } else if(mode==='select') {
    const selection=await selectAggregate(apiClient(process.env.GH_TOKEN));
    fs.writeFileSync(path.join(dir,'selection.json'),JSON.stringify(selection)+'\n');
    output('run_id',selection.run.id);output('artifact_id',selection.artifact.id);
  } else if(mode==='verify-claim') {
    const api=apiClient(process.env.GH_TOKEN);
    const run=await api(`/actions/runs/${process.env.GITHUB_RUN_ID}`);
    await verifyClaim(api,run,JSON.parse(fs.readFileSync(path.join(dir,'membership-claim.json'),'utf8')),Number(artifactId));
  } else fail();
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(()=>{console.error('::error::Membership handoff unavailable: readiness, daily claim or trusted metadata check failed.');process.exitCode=1;});
