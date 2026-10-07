import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const root=new URL('../../../',import.meta.url),workflow=name=>readFileSync(new URL('.github/workflows/'+name,root),'utf8');
const deploy=workflow('deploy-baipiaoji.yml'),watch=workflow('bpj-ad-watch.yml'),registry=workflow('startup-mcp-registry.yml');
const step=name=>{const start=deploy.indexOf('      - name: '+name+'\n');assert.ok(start>=0,name);const end=deploy.indexOf('\n      - ',start+1);return deploy.slice(start,end<0?undefined:end);};
assert.match(deploy,/BPJ_RECEIPTS_RECOVERY: \$\{\{ github.event_name == 'push' && contains\(github.event.head_commit.message, '\[member-receipts-recovery\]'\) \}\}/);
for(const name of ['Sync payment secrets using the existing Cloudflare credential','Sync optional account providers without replacing existing settings','Codex Efficiency live surface','Verify live campaign measurement (QA excluded)','Verify live free-account lifecycle and remove synthetic account','Verify paid-app demand pilot without counting QA','Self-test first-party beacon','Self-test subscribe & unsubscribe endpoints','Self-test submit endpoint','Self-test claim endpoint'])assert.match(step(name),/if: env.BPJ_RECEIPTS_RECOVERY != 'true'/,name);
const binding=step('Preserve public account binding when reusing existing configuration');assert.match(binding,/withGoogleBinding/);assert.doesNotMatch(binding,/await configure|fetch\(/);
assert.match(step('Check existing public account configuration before maintenance'),/--account-only/);
assert.ok(deploy.indexOf('- name: Check existing public account configuration before maintenance')<deploy.indexOf('- name: Deploy to Cloudflare Pages'));
const verify=step('Verify Web3 watcher and selling after deployment');assert.match(verify,/if \[ "\$BPJ_RECEIPTS_RECOVERY" = "true" \]; then\s+node scripts\/ad-watch-v2.mjs --if-configured --member-receipts-only\s+else\s+node scripts\/ad-watch-v2.mjs --if-configured --members\s+fi/);assert.match(verify,/REQUIRE_WEB3_CONFIGURED:.*env.BPJ_RECEIPTS_RECOVERY == 'true' && 'true'/);
assert.match(step('Publish and verify startup MCP registry entry'),/if: env.BPJ_RECEIPTS_RECOVERY != 'true' &&/);
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
console.log('PASS maintenance routing, unchanged normal/scheduled behavior, credential reuse, local security gates, registry exclusion and bounded live checks');
