#!/usr/bin/env node
// BPJ ReleaseCheck 0.1.0 — MIT. Deterministic evidence runner; no model API.
import {createServer} from 'node:http';
import {createHash,createHmac,timingSafeEqual} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';

export const VERSION='0.1.0';
export const REQUIRED=['anonymous','unpaid','paid','expired','tenant-isolation','unsigned-webhook','signed-webhook','duplicate-webhook'];
const hash=v=>createHash('sha256').update(v).digest('hex');
const plain=v=>v&&typeof v==='object'&&!Array.isArray(v);
const label=v=>typeof v==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9 ._/-]{0,119}$/.test(v);
const own=(o,k)=>Object.hasOwn(o,k);
function fail(code){throw Error(code);}
function pointer(o,p){for(const k of p.slice(1).split('/').map(s=>s.replace(/~1/g,'/').replace(/~0/g,'~'))){if(!plain(o)&&!Array.isArray(o)||!own(o,k))return undefined;o=o[k];}return o;}
export function validate(m){
 if(!plain(m)||m.schema!==1||m.environment!=='isolated-test'||m.synthetic_data!==true||!label(m.project)||!label(m.revision))fail('invalid_manifest');
 let u;try{u=new URL(m.origin);}catch{fail('invalid_origin');}
 if(u.origin!==m.origin||u.username||u.password||!(u.protocol==='https:'||(u.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(u.hostname))))fail('invalid_origin');
 if(!Array.isArray(m.cases)||m.cases.length<1||m.cases.length>12)fail('invalid_cases');
 const ids=new Set();
 for(const c of m.cases){
  if(['anonymous','unpaid','expired','tenant-isolation'].includes(c.id)&&![401,403,404].includes(c.expect.status))fail('denial_case_must_expect_denial');
  if(c.id==='unsigned-webhook'&&![400,401,403].includes(c.expect.status))fail('unsigned_webhook_must_be_rejected');
  if(['paid','signed-webhook','duplicate-webhook'].includes(c.id)&&(c.expect.status<200||c.expect.status>=300))fail('success_case_must_expect_success');
  if(!plain(c)||!REQUIRED.includes(c.id)||ids.has(c.id)||!label(c.name)||!plain(c.request)||!plain(c.expect))fail('invalid_case');ids.add(c.id);
  const r=c.request;
  if(!['GET','POST'].includes(r.method)||typeof r.path!=='string'||!/^\/[a-zA-Z0-9/_-]*$/.test(r.path)||r.path.length>250)fail('invalid_request');
  if(r.method==='GET'&&r.body!==undefined||r.body!==undefined&&(typeof r.body!=='string'||Buffer.byteLength(r.body)>16000))fail('invalid_body');
  if(r.headersEnv!==undefined&&(!plain(r.headersEnv)||Object.keys(r.headersEnv).length>8))fail('invalid_headers');
  for(const [k,v]of Object.entries(r.headersEnv||{}))if(!/^(authorization|cookie|x-test-[a-z0-9-]+)$/i.test(k)||typeof v!=='string'||!/^RELEASECHECK_[A-Z0-9_]+$/.test(v))fail('invalid_headers');
  if(r.sign!==undefined&&(!plain(r.sign)||r.sign.kind!=='stripe-hmac-sha256'||!/^RELEASECHECK_[A-Z0-9_]+$/.test(r.sign.secretEnv)||r.method!=='POST'||typeof r.body!=='string'))fail('invalid_signature');
  if(!Number.isInteger(c.expect.status)||c.expect.status<200||c.expect.status>599||!Array.isArray(c.expect.json)||c.expect.json.length<1||c.expect.json.length>10)fail('invalid_expectation');
  for(const a of c.expect.json)if(!plain(a)||typeof a.pointer!=='string'||!/^\/(?:[a-zA-Z0-9_~/-]+)$/.test(a.pointer)||!own(a,'equals')||!(a.equals===null||['boolean','number','string'].includes(typeof a.equals))||JSON.stringify(a.equals).length>200)fail('invalid_assertion');
 }
 // Coverage reflects observed request types as well as user-supplied names.
 for(const c of m.cases){
  if(c.id.endsWith('webhook')&&c.request.method!=='POST')fail('invalid_webhook_case');
  if(['signed-webhook','duplicate-webhook'].includes(c.id)&&!c.request.sign)fail('signature_required');
  if(c.id==='unsigned-webhook'&&c.request.sign)fail('unsigned_case_signed');
 }
 const first=m.cases.find(c=>c.id==='signed-webhook'),again=m.cases.find(c=>c.id==='duplicate-webhook');
 if(again&&(!first||m.cases.indexOf(again)<m.cases.indexOf(first)||JSON.stringify(first.request)!==JSON.stringify(again.request)))fail('duplicate_must_replay_same_request');
 if(again){const a=first.expect.json.find(a=>a.pointer===again.effect_pointer),b=again.expect.json.find(a=>a.pointer===again.effect_pointer);if(!a||!b||!Number.isInteger(a.equals)||a.equals<1||a.equals!==b.equals)fail('duplicate_requires_unchanged_effect_count');}
 const unsigned=m.cases.find(c=>c.id==='unsigned-webhook');if(unsigned&&first&&m.cases.indexOf(unsigned)>m.cases.indexOf(first))fail('unsigned_case_must_run_first');
 return m;
}
async function limitedText(response){
 if(!response.body)return '';
 const reader=response.body.getReader();let bytes=0;const chunks=[];
 try{for(;;){const {value,done}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>1048576){await reader.cancel();fail('response_too_large');}chunks.push(Buffer.from(value));}}finally{reader.releaseLock();}
 return Buffer.concat(chunks).toString('utf8');
}
export async function run(manifest,{allowOrigin,authorized=false,allowMutations=false,env=process.env,fetcher=fetch}={}){
 const m=validate(manifest);
 if(!authorized||allowOrigin!==m.origin)fail('explicit_origin_authorization_required');
 if(m.cases.some(c=>c.request.method==='POST')&&!allowMutations)fail('test_mutations_require_opt_in');
 // Resolve every referenced secret before issuing ANY requests. Never persist values.
 for(const c of m.cases)for(const name of [...Object.values(c.request.headersEnv||{}),...(c.request.sign?[c.request.sign.secretEnv]:[])])if(typeof env[name]!=='string'||!env[name]||env[name].length>8192||/[\r\n]/.test(env[name]))fail('missing_or_invalid_test_credential');
 const started=new Date().toISOString(),results=[];
 for(const c of m.cases){
  const at=new Date().toISOString(),headers={'User-Agent':'bpj-releasecheck-isolated-test/'+VERSION,'Accept':'application/json'};
  for(const[k,v]of Object.entries(c.request.headersEnv||{}))headers[k]=env[v];
  if(c.request.body!==undefined)headers['Content-Type']='application/json';
  if(c.request.sign){const t=Math.floor(Date.now()/1000),sig=createHmac('sha256',env[c.request.sign.secretEnv]).update(t+'.'+c.request.body).digest('hex');headers['Stripe-Signature']=`t=${t},v1=${sig}`;}
  const base={id:c.id,name:c.name,at,method:c.request.method,expected_status:c.expect.status};
  try{
   const res=await fetcher(new URL(c.request.path,m.origin),{method:c.request.method,headers,body:c.request.body,redirect:'manual',signal:AbortSignal.timeout(8000)});
   const raw=await limitedText(res);let data;try{data=JSON.parse(raw);}catch{}
   const checks=c.expect.json.map(a=>({pointer:a.pointer,matched:data!==undefined&&Object.is(pointer(data,a.pointer),a.equals)}));
   const passed=res.status===c.expect.status&&checks.every(x=>x.matched);
   results.push({...base,status:passed?'pass':'fail',observed_status:res.status,response_sha256:hash(raw),assertions:checks});
  }catch{
   // Network errors can contain credentials, URLs or body excerpts. Do not copy them.
   results.push({...base,status:'error',error:'request_failed_timeout_or_oversize'});
  }
 }
 const missing=REQUIRED.filter(id=>!results.some(r=>r.id===id)),counts={pass:0,fail:0,error:0};for(const r of results)counts[r.status]++;
 return {schema:1,runner:VERSION,project:m.project,revision:m.revision,environment:m.environment,synthetic_data:true,started,finished:new Date().toISOString(),manifest_sha256:hash(JSON.stringify(m)),contract_sha256:hash(JSON.stringify(m.cases)),outcome:counts.fail||counts.error?'blocked':missing.length?'incomplete':'scoped_checks_passed',counts,missing,results,limits:['Only supplied isolated-test HTTP cases were checked.','No browser checkout, real payment, expiry clock or production assurance.','Configured policies and fixtures still require human review.','No secrets or response bodies are included; hashes are evidence fingerprints.']};
}
export function markdown(r){
 return `# BPJ ReleaseCheck evidence\n\nProject: ${r.project}\n\nRevision: ${r.revision}\n\nStarted: ${r.started}\n\nOutcome: **${r.outcome}**\n\nPass ${r.counts.pass}; fail ${r.counts.fail}; error ${r.counts.error}. Missing: ${r.missing.join(', ')||'none'}.\n\n| Case | Result | Expected HTTP | Observed HTTP |\n|---|---|---:|---:|\n${r.results.map(x=>`| ${x.id} | ${x.status} | ${x.expected_status} | ${x.observed_status??'unknown'} |`).join('\n')}\n\nManifest SHA-256: ${r.manifest_sha256}\n\n${r.limits.map(x=>'- '+x).join('\n')}\n`;
}
export async function save(r,directory){await mkdir(directory,{recursive:true});await writeFile(join(directory,'report.json'),JSON.stringify(r,null,2)+'\n',{flag:'wx',mode:0o600});await writeFile(join(directory,'report.md'),markdown(r),{flag:'wx',mode:0o600});}
export async function fixture({broken=false}={}){
 const secret='synthetic-demo-secret-not-a-real-key',seen=new Set();let grants=0;
 const server=createServer(async(req,res)=>{
  res.setHeader('Content-Type','application/json');
  const send=(status,body)=>{res.writeHead(status);res.end(JSON.stringify(body));};
  if(req.url==='/premium'){
   const role=(req.headers.authorization||'').replace('Bearer ','');
   if(!role)return send(401,{error:'unauthorized'});
   if(role==='demo-paid'||broken&&role==='demo-expired')return send(200,{access:true,plan:'pro'});
   return send(403,{error:'no_entitlement'});
  }
  if(req.url==='/tenant/beta')return send(403,{error:'tenant_denied'});
  if(req.url==='/webhook'&&req.method==='POST'){
   let raw='';for await(const part of req)raw+=part;
   const pairs=Object.fromEntries(String(req.headers['stripe-signature']||'').split(',').map(x=>x.split('='))),expected=createHmac('sha256',secret).update(pairs.t+'.'+raw).digest('hex');
   if(!/^\d+$/.test(pairs.t||'')||Math.abs(Date.now()/1000-Number(pairs.t))>300||!/^[a-f0-9]{64}$/.test(pairs.v1||'')||!timingSafeEqual(Buffer.from(pairs.v1),Buffer.from(expected)))return send(400,{error:'invalid_signature'});
   let body;try{body=JSON.parse(raw);}catch{return send(400,{error:'invalid_json'});}
   if(!seen.has(body.id)){seen.add(body.id);grants++;}
   return send(200,{received:true,grants});
  }
  return send(404,{error:'not_found'});
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin='http://127.0.0.1:'+server.address().port;
 const spec=(id,name,request,status,json)=>({id,name,request,expect:{status,json:Object.entries(json).map(([pointer,equals])=>({pointer,equals}))}});
 const access=(who)=>({method:'GET',path:'/premium',...(who?{headersEnv:{Authorization:'RELEASECHECK_'+who}}:{})});
 const signed={method:'POST',path:'/webhook',body:'{"id":"evt_demo_1"}',sign:{kind:'stripe-hmac-sha256',secretEnv:'RELEASECHECK_WEBHOOK_SECRET'}};
 const manifest={schema:1,project:'BPJ synthetic demo',revision:broken?'fixture-broken':'fixture-fixed',origin,environment:'isolated-test',synthetic_data:true,cases:[
  spec('anonymous','Anonymous access',access(),401,{'/error':'unauthorized'}),
  spec('unpaid','Unpaid account',access('UNPAID'),403,{'/error':'no_entitlement'}),
  spec('paid','Paid account',access('PAID'),200,{'/access':true,'/plan':'pro'}),
  spec('expired','Expired account',access('EXPIRED'),403,{'/error':'no_entitlement'}),
  spec('tenant-isolation','Other tenant',{method:'GET',path:'/tenant/beta',headersEnv:{Authorization:'RELEASECHECK_PAID'}},403,{'/error':'tenant_denied'}),
  spec('unsigned-webhook','Unsigned webhook',{method:'POST',path:'/webhook',body:'{"id":"evt_demo_1"}'},400,{'/error':'invalid_signature'}),
  spec('signed-webhook','Signed synthetic event',signed,200,{'/received':true,'/grants':1}),
  {...spec('duplicate-webhook','Duplicate synthetic event',structuredClone(signed),200,{'/received':true,'/grants':1}),effect_pointer:'/grants'}]};
 return {origin,manifest,env:{RELEASECHECK_PAID:'Bearer demo-paid',RELEASECHECK_UNPAID:'Bearer demo-unpaid',RELEASECHECK_EXPIRED:'Bearer demo-expired',RELEASECHECK_WEBHOOK_SECRET:secret},close:()=>new Promise(r=>server.close(r))};
}
export async function main(args){
 const [command,...rest]=args,options={};
 for(let i=0;i<rest.length;i++){const k=rest[i];if(!['--out','--manifest','--allow-origin','--authorized','--allow-mutations','--broken'].includes(k)||own(options,k))fail('unknown_or_duplicate_option');if(['--authorized','--allow-mutations','--broken'].includes(k))options[k]=true;else{if(!rest[i+1]||rest[i+1].startsWith('--'))fail('missing_option_value');options[k]=rest[++i];}}
 if(!['demo','run'].includes(command)){console.log('BPJ ReleaseCheck '+VERSION+'\nnode release-check.mjs demo --out ./demo-evidence [--broken]\nnode release-check.mjs run --manifest ./private-test.json --allow-origin https://your-isolated-test-host --authorized --allow-mutations --out ./private-evidence\nNo model API calls. No real checkout. Read README.md before adapting tests.');return 0;}
 if(!options['--out'])fail('output_directory_required');
 let r;
 if(command==='demo'){
  const f=await fixture({broken:options['--broken']===true});
  try{r=await run(f.manifest,{allowOrigin:f.origin,authorized:true,allowMutations:true,env:f.env});}finally{await f.close();}
 }else{
  if(!options['--manifest'])fail('manifest_required');const raw=await readFile(options['--manifest']);if(raw.length>65536)fail('manifest_too_large');
  r=await run(JSON.parse(raw.toString()),{allowOrigin:options['--allow-origin'],authorized:options['--authorized'],allowMutations:options['--allow-mutations']});
 }
 await save(r,resolve(options['--out']));
 console.log(JSON.stringify({outcome:r.outcome,counts:r.counts,missing:r.missing}));
 return r.outcome==='scoped_checks_passed'?0:1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){try{process.exitCode=await main(process.argv.slice(2));}catch{console.error('ReleaseCheck stopped: invalid input, missing authorization/credential, or output already exists. See README.md. No credentials are printed.');process.exitCode=2;}}
