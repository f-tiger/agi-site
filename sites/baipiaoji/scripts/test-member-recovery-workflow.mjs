import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const root=new URL('../../../',import.meta.url),workflow=name=>readFileSync(new URL('.github/workflows/'+name,root),'utf8');
const deploy=workflow('deploy-baipiaoji.yml'),watch=workflow('bpj-ad-watch.yml'),registry=workflow('startup-mcp-registry.yml');
const step=name=>{const start=deploy.indexOf('      - name: '+name+'\n');assert.ok(start>=0,name);const end=deploy.indexOf('\n      - ',start+1);return deploy.slice(start,end<0?undefined:end);};
assert.match(deploy,/BPJ_RECEIPTS_RECOVERY: \$\{\{ github.event_name == 'push' && contains\(github.event.head_commit.message, '\[member-receipts-recovery\]'\) \}\}/);
// Check the guard's behavior, not its parentheses or formatting. The grammar is
// deliberately limited to these local boolean conditions; never evaluate code.
function allows(expression,{recovery=false,readOnly=false,publish=true}={}){
 const values={'env.BPJ_RECEIPTS_RECOVERY':String(recovery),'env.OUTCOME_READ_ONLY_RELEASE':String(readOnly),'steps.startup_registry.outputs.publish':String(publish)};
 const tokens=expression.match(/!=|==|&&|\|\||[()!]|'(?:true|false)'|[A-Za-z_][A-Za-z0-9_.]*/g)||[];
 assert.equal(tokens.join(''),expression.replace(/\s/g,''),'Unsupported workflow guard syntax');
 let index=0;
 function atom(){
  const token=tokens[index++];
  if(token==='!')return !atom();
  if(token==='('){const value=or();assert.equal(tokens[index++],')','Unclosed guard group');return value;}
  if(token==='true'||token==='false')return token==='true';
  assert.ok(Object.hasOwn(values,token),'Unknown guard variable: '+token);
  const operator=tokens[index++],value=tokens[index++];
  assert.ok(operator==='=='||operator==='!=','Unsupported guard comparison');
  assert.ok(value==="'true'"||value==="'false'",'Unsupported guard value');
  return operator==='=='?values[token]===value.slice(1,-1):values[token]!==value.slice(1,-1);
 }
 function combine(next,operator){let value=next();while(tokens[index]===operator){index++;const right=next();value=operator==='&&'?value&&right:value||right;}return value;}
 function and(){return combine(atom,'&&');}
 function or(){return combine(and,'||');}
 const result=or();assert.equal(index,tokens.length,'Trailing guard tokens');return result;
}
function guardOf(name){const match=step(name).match(/^\s+if:\s*(.+)$/m);assert.ok(match,name+' needs an explicit guard');return match[1];}
function checkGuard(expression,{readOnlySafe=false,needsPublish=false}={}){
 for(const recovery of [false,true])for(const readOnly of [false,true])for(const publish of [false,true]){
  assert.equal(allows(expression,{recovery,readOnly,publish}),!recovery&&(readOnlySafe||!readOnly)&&(!needsPublish||publish),JSON.stringify({expression,recovery,readOnly,publish}));
 }
}
const guardedSteps=['Sync payment secrets using the existing Cloudflare credential','Sync optional account providers without replacing existing settings','Codex Efficiency live surface','Verify live campaign measurement (QA excluded)','Verify live free-account lifecycle and remove synthetic account','Verify paid-app demand pilot without counting QA','Self-test first-party beacon','Self-test subscribe & unsubscribe endpoints','Self-test submit endpoint','Self-test claim endpoint'];
// Codex's existing live-surface check performs GET only. Preserve that exception;
// configuration changes and synthetic event/account writes skip both safe modes.
for(const name of guardedSteps)checkGuard(guardOf(name),{readOnlySafe:name==='Codex Efficiency live surface'});
const strict="(env.BPJ_RECEIPTS_RECOVERY != 'true') && env.OUTCOME_READ_ONLY_RELEASE != 'true'";
checkGuard(strict);
assert.throws(()=>checkGuard("env.OUTCOME_READ_ONLY_RELEASE != 'true'"),assert.AssertionError,'Removing recovery protection must fail');
assert.throws(()=>checkGuard("env.BPJ_RECEIPTS_RECOVERY != 'true'"),assert.AssertionError,'Removing read-only protection must fail');
assert.throws(()=>checkGuard(strict.replace('&&','||')),assert.AssertionError,'OR must not weaken either protection');
assert.throws(()=>checkGuard(strict,{needsPublish:true}),assert.AssertionError,'Registry publication still requires the publish output');
for(const expression of ["env.UNKNOWN == 'true'","env.BPJ_RECEIPTS_RECOVERY != 'true';","contains(env.BPJ_RECEIPTS_RECOVERY, 'true')","(env.BPJ_RECEIPTS_RECOVERY != 'true'"]){assert.throws(()=>allows(expression),assert.AssertionError,'Unknown or malformed syntax must fail closed');}
const binding=step('Preserve public account binding when reusing existing configuration');assert.match(binding,/withGoogleBinding/);assert.doesNotMatch(binding,/await configure|fetch\(/);
assert.match(step('Check existing public account configuration before maintenance'),/--account-only/);
assert.ok(deploy.indexOf('- name: Check existing public account configuration before maintenance')<deploy.indexOf('- name: Deploy to Cloudflare Pages'));
const verify=step('Verify Web3 watcher and selling after deployment');assert.match(verify,/if \[ "\$BPJ_RECEIPTS_RECOVERY" = "true" \]; then\s+node scripts\/ad-watch-v2.mjs --if-configured --member-receipts-only\s+else\s+node scripts\/ad-watch-v2.mjs --if-configured --members\s+fi/);assert.match(verify,/REQUIRE_WEB3_CONFIGURED:.*env.BPJ_RECEIPTS_RECOVERY == 'true' && 'true'/);
checkGuard(guardOf('Publish and verify startup MCP registry entry'),{needsPublish:true});
assert.match(registry,/!contains\(github.event.head_commit.message, '\[member-receipts-recovery\]'\)/);assert.match(registry,/!contains\(github.event.workflow_run.head_commit.message, '\[member-receipts-recovery\]'\)/);
assert.match(watch,/cron: '7 \*\/2 \* \* \*'/);assert.match(watch,/options: \[watch, ads-only, receipts-only, inspect\]/);
assert.equal((watch.match(/inputs.mode == 'receipts-only'/g)||[]).length,1);assert.equal((watch.match(/inputs.mode == 'ads-only'/g)||[]).length,1);
assert.equal((watch.match(/github.event_name != 'workflow_dispatch' \|\| inputs.mode == 'watch'/g)||[]).length,3);
for(const name of ['Verify free-account password hashing in actual Cloudflare runtime','Checkout and delivery integration (SQLite, no network)','Paid save path in a real browser','Verify fleet account security'])assert.doesNotMatch(step(name),/BPJ_RECEIPTS_RECOVERY/,name);
const live=new URL('./verify-member-recovery-live.mjs',import.meta.url).href;
const result=spawnSync(process.execPath,['--input-type=module','-e',`
 globalThis.fetch=async(url,options={})=>{
  const u=new URL(url),method=options.method||'GET';
  if(method==='POST'){if(u.pathname!=='/api/bpj-member-recovery'||options.headers.Authorization)throw Error('Unexpected mutation');return Response.json({ok:false},{status:401});}
  if(u.pathname==='/api/account-google')return Response.json({available:true,client_id:'fixture.apps.googleusercontent.com'});
  if(u.pathname==='/api/account'){if(u.searchParams.get('readiness')!=='1')throw Error('No account operation');return Response.json({ok:true,ready:true,user:null});}
  if(!['/members','/en/members','/account','/en/account'].includes(u.pathname))throw Error('Unexpected source');
  return new Response('<html></html>');
 };await import(${JSON.stringify(live)});
`],{encoding:'utf8',env:{...process.env,GOOGLE_CLIENT_ID:'fixture.apps.googleusercontent.com'}});assert.equal(result.status,0,result.stderr);
console.log('PASS recovery/read-only/publish guard truth tables and unsafe mutations; maintenance routing, unchanged normal/scheduled behavior, credential reuse, local security gates, registry exclusion and bounded live checks');
