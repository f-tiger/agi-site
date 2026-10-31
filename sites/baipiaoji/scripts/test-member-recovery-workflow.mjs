import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const root=new URL('../../../',import.meta.url),workflow=name=>readFileSync(new URL('.github/workflows/'+name,root),'utf8');
const deploy=workflow('deploy-baipiaoji.yml'),watch=workflow('bpj-ad-watch.yml'),registry=workflow('startup-mcp-registry.yml'),videoRegistry=workflow('video-mcp-registry.yml');
const step=name=>{const start=deploy.indexOf('      - name: '+name+'\n');assert.ok(start>=0,name);const end=deploy.indexOf('\n      - ',start+1);return deploy.slice(start,end<0?undefined:end);};
assert.match(deploy,/BPJ_RECEIPTS_RECOVERY: \$\{\{ github.event_name == 'push' && contains\(github.event.head_commit.message, '\[member-receipts-recovery\]'\) \}\}/);
// Check the guard's behavior, not its parentheses or formatting. The grammar is
// deliberately limited to these local boolean conditions; never evaluate code.
function allows(expression,{recovery=false,readOnly=false,publish=true,event='push',ref='refs/heads/main',message='',readonlyInput=false,sourceMessage='',sourceEvent='push',sourceTitle='',repository='f-tiger/agi-site',sourceRepository='f-tiger/agi-site',sourceBranch='main',conclusion='success',mode='watch'}={}){
 const values={'inputs.mode':mode,'env.BPJ_RECEIPTS_RECOVERY':String(recovery),'env.OUTCOME_READ_ONLY_RELEASE':String(readOnly),'steps.startup_registry.outputs.publish':String(publish),'github.event_name':event,'github.ref':ref,'github.event.head_commit.message':message,'inputs.readonly_release':readonlyInput,'github.repository':repository,'github.event.workflow_run.head_commit.message':sourceMessage,'github.event.workflow_run.head_repository.full_name':sourceRepository,'github.event.workflow_run.head_branch':sourceBranch,'github.event.workflow_run.conclusion':conclusion,'github.event.workflow_run.event':sourceEvent,'github.event.workflow_run.display_title':sourceTitle};
 const tokens=expression.match(/!=|==|&&|\|\||[!(),]|'[^']*'|[A-Za-z_][A-Za-z0-9_.]*/g)||[];
 assert.equal(tokens.join(''),expression.replace(/'[^']*'|\s+/g,token=>token.startsWith("'")?token:''),'Unsupported workflow guard syntax');
 let index=0;
 function value(){
  const token=tokens[index++];
  if(token==='('){const value=or();assert.equal(tokens[index++],')','Unclosed guard group');return value;}
  if(token==='true'||token==='false')return token==='true';
  if(token==='!'){const operand=value();assert.equal(typeof operand,'boolean');return !operand;}
  if(token?.startsWith("'"))return token.slice(1,-1);
  if(token==='always'){assert.equal(tokens[index++],'(');assert.equal(tokens[index++],')');return true;}
  if(token==='contains'){
   assert.equal(tokens[index++],'(','Expected contains arguments');const source=value();
   assert.equal(tokens[index++],',','Expected contains separator');const search=value();
   assert.equal(tokens[index++],')','Expected contains closing group');
   assert.equal(typeof source,'string');assert.equal(typeof search,'string');return source.includes(search);
  }
  assert.ok(Object.hasOwn(values,token),'Unknown guard variable: '+token);
  return values[token];
 }
 function atom(){
  const left=value(),operator=tokens[index];
  if(operator==='=='||operator==='!='){index++;const right=value();return operator==='=='?left===right:left!==right;}
  assert.equal(typeof left,'boolean','Bare guard must be boolean');return left;
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
for(const expression of ["!env.BPJ_RECEIPTS_RECOVERY == 'true'","env.UNKNOWN == 'true'","env.BPJ_RECEIPTS_RECOVERY != 'true';","startsWith(env.BPJ_RECEIPTS_RECOVERY, 'true')","contains(env.BPJ_RECEIPTS_RECOVERY 'true')","(env.BPJ_RECEIPTS_RECOVERY != 'true'"]){assert.throws(()=>allows(expression),assert.AssertionError,'Unknown or malformed syntax must fail closed');}
// An explicit, default-off main dispatch must reproduce the existing product
// release gates without turning into a daily crawl, lifecycle test or send.
assert.match(deploy,/workflow_dispatch:\s+inputs:\s+readonly_release:\s+description:[^\n]+\s+type: boolean\s+default: false/);
const readonlyTitle='BPJ read-only product release';
assert.match(deploy,/^run-name: \$\{\{ github\.event_name == 'workflow_dispatch' && inputs\.readonly_release == true && 'BPJ read-only product release' \|\| '' \}\}$/m);
const releaseGuard=deploy.match(/^\s+OUTCOME_READ_ONLY_RELEASE: \$\{\{ (.+) \}\}$/m)?.[1];
const jobGuard=deploy.match(/^    if: >-\n((?:      [^\n]+\n)+)    steps:/m)?.[1]?.trim();
const concurrencyGuard=deploy.match(/^  group: \$\{\{ (.+) && 'deploy-baipiaoji' \|\| format\('skip-baipiaoji-\{0\}', github.run_id\) \}\}$/m)?.[1];
assert.ok(releaseGuard);assert.ok(jobGuard);assert.ok(concurrencyGuard);
const refreshSteps=[
 'Verify tool links & refresh dates (scheduled runs only)',
 'Discover new tool candidates (scheduled runs only)',
 'Source-page drift check (scheduled runs only)',
 'Export reach snapshot from /api/reach (scheduled runs only)',
 'Export vendor claims from /api/claim (scheduled runs only)',
 'Probe official pricing pages for paid-tier gaps (scheduled runs only)',
 'MCP discovery probe (scheduled runs only)',
 'Monitor AI Solo sources for editorial recheck',
 'Monitor startup launches and discussion signals',
 'Read pilot evidence (aggregates only)',
 'Export traffic snapshot from D1',
 'Commit traffic snapshot',
 'Dispatch verified changes to watch webhooks',
 'Probe AI crawler reachability',
 'Commit AI crawler probe result',
 'Ping IndexNow (Bing/Yandex/Naver instant indexing)',
 'Archive key pages to Wayback Machine',
 'Commit page change manifest',
 'Ping RSS aggregators',
 'Ensure custom domain bound (baipiaoji.com)',
 'Ensure DNS records point at Pages',
];
const markerSteps={
 'Discover, validate and expand GitHub and MCP catalogues':['[catalog-sync]'],
 'Refresh official manju rankings and expand the directory':['[manju-sync]'],
 'Commit refreshed data':['[catalog-sync]','[manju-sync]'],
};
const productSteps=['Paid save path in a real browser','Verify homepage consent and Manju search measurement','Notify only changed canonical pages to IndexNow'];
for(const event of ['push','schedule','workflow_dispatch'])for(const ref of ['refs/heads/main','refs/heads/feature','refs/tags/test'])for(const readonlyInput of [undefined,false,true])for(const message of ['', '[deploy]', '[deploy] [outcome-readonly-release]', '[deploy] [catalog-sync] [manju-sync]']){
 const context={event,ref,readonlyInput,message};
 const readOnly=(event==='push'&&message.includes('[outcome-readonly-release]'))||(event==='workflow_dispatch'&&ref==='refs/heads/main'&&readonlyInput===true);
 assert.equal(allows(releaseGuard,context),readOnly,'release mode '+JSON.stringify(context));
 const admitted=(event!=='workflow_dispatch'||readonlyInput!==true||ref==='refs/heads/main')&&(event!=='push'||message.includes('[deploy]'));
 assert.equal(allows(jobGuard,context),admitted,'job admission '+JSON.stringify(context));
 assert.equal(allows(concurrencyGuard,context),admitted,'Rejected events must not displace pending releases '+JSON.stringify(context));
 for(const name of refreshSteps)assert.equal(allows(guardOf(name),{...context,readOnly}),event!=='push'&&!readOnly,name+' '+JSON.stringify(context));
 for(const [name,markers]of Object.entries(markerSteps))assert.equal(allows(guardOf(name),{...context,readOnly}),(event!=='push'||markers.some(marker=>message.includes(marker)))&&!readOnly,name+' '+JSON.stringify(context));
 for(const name of productSteps)assert.equal(allows(guardOf(name),{...context,readOnly}),event==='push'||readOnly,name+' '+JSON.stringify(context));
}
// Mutations prove that the matrix does not accept a branch dispatch downgrade,
// a missing daily-export exclusion or a browser gate left push-only.
const dispatch={event:'workflow_dispatch',ref:'refs/heads/main',readonlyInput:true,readOnly:true};
assert.equal(allows(releaseGuard,dispatch),true);
assert.equal(allows(jobGuard,{...dispatch,ref:'refs/heads/feature'}),false);
assert.equal(allows("github.event_name != 'push'",dispatch),true,'Old refresh condition would run extra work');
assert.equal(allows("github.event_name == 'push'",dispatch),false,'Old product condition would omit browser gates');
for(const name of ['Guard — pin current main before building','Guard — verify BPJ release inputs immediately before deployment']){
 assert.equal(guardOf(name),"github.ref == 'refs/heads/main'");
}
assert.match(step('Guard — pin current main before building'),/deploy-main-guard\.sh prepare/);
assert.match(step('Guard — verify BPJ release inputs immediately before deployment'),/node sites\/baipiaoji\/scripts\/check-release-inputs\.mjs/);
const releaseCheck=deploy.indexOf('run: node sites/baipiaoji/scripts/check-release-inputs.mjs');
assert.equal(deploy.indexOf('      - name:',releaseCheck),deploy.indexOf('      - name: Deploy to Cloudflare Pages'),'No mutation may follow freshness verification before upload');
assert.match(deploy,/cancel-in-progress: false/);
// Explicit Eco/AGI maintenance modes must remain isolated from each other and
// the wider scheduled job. No watcher is executed by these truth tables.
function watchStep(source,name){
 assert.equal(source.split('      - name: '+name+'\n').length-1,1,'Each maintenance step must be unique: '+name);
 const start=source.indexOf('      - name: '+name+'\n');assert.ok(start>=0,name);
 const end=source.indexOf('\n      - ',start+1);return source.slice(start,end<0?undefined:end);
}
function checkTargetedIsolation(source,site){
 const label=site==='agi'?'AGI':'Eco',other=site==='agi'?'Eco':'AGI',modeName=site+'-watch';
 const target=watchStep(source,'Recover '+label+' membership only (manual, current main)');
 const run=target.match(/^        run: (.+)$/m)?.[1];
 const commands=run==='|'?[...target.split('        run: |')[1].matchAll(/^          (\S.*)$/gm)].map(m=>m[1]):[run];
 assert.deepEqual(commands,['node tools/member-studio/ops.mjs watch '+site,...(site==='agi'?['node sites/agiscorecard/tools/member-release-health.mjs']:[])]);
 assert.match(target,/^        timeout-minutes: 5$/m);
 assert.match(target,/^        working-directory: \$\{\{ github.workspace \}\}$/m);
 const names=['Inspect incoming tokens (manual, read-only)','Recover ad payment watcher only (manual)','Recover ads and membership receipts only (manual)','Match on-chain payments to pending ad slots','Recover '+other+' membership only (manual, current main)','Check each independent site membership','Continue bounded Jarvis missions'];
 const guard=block=>{const match=block.match(/^        if: (.+)$/m);assert.ok(match);return match[1];};
 for(const event of ['push','schedule','workflow_dispatch'])for(const ref of ['refs/heads/main','refs/heads/feature','refs/tags/test'])for(const mode of ['watch','ads-only','receipts-only','eco-watch','agi-watch','inspect','unknown']){
  const context={event,ref,mode};
  assert.equal(allows(guard(target),context),event==='workflow_dispatch'&&ref==='refs/heads/main'&&mode===modeName,label+' admission '+JSON.stringify(context));
  if(event==='workflow_dispatch'&&mode===modeName)for(const name of names)assert.equal(allows(guard(watchStep(source,name)),context),false,label+' must not run '+name);
 }
}
for(const site of ['eco','agi']){
 checkTargetedIsolation(watch,site);
 const mode=site+'-watch';
 for(const mutated of [
  watch.replace(" && github.ref == 'refs/heads/main' && inputs.mode == '"+mode+"'"," && inputs.mode == '"+mode+"'"),
  watch.replace('node tools/member-studio/ops.mjs watch '+site,'node tools/member-studio/ops.mjs watch-all'),
  watch.replace("inputs.mode == 'watch'","inputs.mode == '"+mode+"'"),
  watch.replace("inputs.mode == '"+mode+"'","inputs.mode == 'watch'"),
 ])assert.throws(()=>checkTargetedIsolation(mutated,site),assert.AssertionError,site+' isolation regression must fail');
}
for(const name of ['Verify free-account password hashing in actual Cloudflare runtime','Checkout and delivery integration (SQLite, no network)','Build site','Build and validate practical tool workbench','Verify fleet account security','Complete and verify GA4 coverage after all page generators','Deploy to Cloudflare Pages','Verify live GA4 coverage and analytics asset version','Check startup MCP registry version'])assert.doesNotMatch(step(name),/^\s+if:/m,name+' must remain mandatory');
const readOnlySkipped=['Check legacy membership obligations before isolation','Verify homepage click breakdown and labels','Verify live AI tools and free MCP','Verify search experiment and conversion stages on live site','Verify Web3 watcher and selling after deployment','Verify membership checkout and protected routes','Read membership migration totals (no account data)','Self-test agent API','Self-test watch endpoint','Self-test earning-pack registration wall','Self-test reach endpoint'];
for(const name of readOnlySkipped)for(const readOnly of [false,true])assert.equal(allows(guardOf(name),{readOnly}),!readOnly,name);
assert.match(step('Notify only changed canonical pages to IndexNow'),/indexnow\.mjs --changed-only/);
assert.ok(deploy.indexOf('- name: Deploy to Cloudflare Pages')<deploy.indexOf('- name: Notify only changed canonical pages to IndexNow'));
const marker=step('Verify read-only dispatch source marker');
assert.equal(allows(guardOf('Verify read-only dispatch source marker'),dispatch),true);
assert.equal(allows(guardOf('Verify read-only dispatch source marker'),{event:'workflow_dispatch',readOnly:false}),false);
assert.match(marker,/git show -s --format=%B "\$GITHUB_SHA"/);
assert.doesNotMatch(marker,/github\.event\.inputs|git (?:log|show)[^\n]*(?:origin\/main|\bHEAD\b)/);
assert.ok(deploy.indexOf('- name: Verify read-only dispatch source marker')<deploy.indexOf('- name: Guard — pin current main before building'));
const markerRun=marker.split('        run: |\n')[1].split('\n').map(line=>line.replace(/^          /,'')).join('\n');
for(const sourceMessage of ['', 'ordinary commit', '[outcome-readonly-release] [skip ci]']){
 const result=spawnSync('bash',['-eu','-c',`git(){ [[ "$*" == "show -s --format=%B $GITHUB_SHA" ]] || return 91; printf '%s' "$FIXTURE_SOURCE_MESSAGE"; }\n${markerRun}`],{encoding:'utf8',env:{PATH:process.env.PATH,GITHUB_SHA:'a'.repeat(40),FIXTURE_SOURCE_MESSAGE:sourceMessage}});
 assert.ifError(result.error);assert.equal(result.status,sourceMessage.includes('[outcome-readonly-release]')?0:1,result.stderr);
}
const registryGuard=source=>{const match=source.match(/^    if: >-\n((?:      [^\n]+\n)+)    runs-on:/m);assert.ok(match);return match[1].trim();};
for(const source of [registry,videoRegistry]){
 assert.match(source,/workflows: \["Daily update & deploy"\]/);
 assert.match(source,/branches: \[main\]/);
 const guard=registryGuard(source);
 for(const sourceMessage of ['', 'ordinary commit', '[outcome-readonly-release] [skip ci]'])for(const sourceEvent of ['push','schedule','workflow_dispatch'])for(const sourceTitle of ['',readonlyTitle])for(const conclusion of ['success','failure','cancelled'])for(const sourceRepository of ['f-tiger/agi-site','attacker/fork']){
  const excluded=sourceMessage.includes('[outcome-readonly-release]')&&(sourceEvent==='push'||(sourceEvent==='workflow_dispatch'&&sourceTitle===readonlyTitle));
  assert.equal(allows(guard,{event:'workflow_run',sourceMessage,sourceEvent,sourceTitle,sourceRepository,conclusion}),conclusion==='success'&&sourceRepository==='f-tiger/agi-site'&&!excluded,'registry successor source boundary');
 }
 assert.equal(allows(guard,{event:'workflow_dispatch'}),true,'Explicit default registry dispatch is unchanged');
}
assert.equal(allows(registryGuard(registry),{event:'push',message:'[outcome-readonly-release]'}),false,'Direct startup registry push must also skip product-only releases');
const binding=step('Preserve public account binding when reusing existing configuration');assert.match(binding,/withGoogleBinding/);assert.doesNotMatch(binding,/await configure|fetch\(/);
assert.match(step('Check existing public account configuration before maintenance'),/--account-only/);
assert.ok(deploy.indexOf('- name: Check existing public account configuration before maintenance')<deploy.indexOf('- name: Deploy to Cloudflare Pages'));
const verify=step('Verify Web3 watcher and selling after deployment');assert.match(verify,/if \[ "\$BPJ_RECEIPTS_RECOVERY" = "true" \]; then\s+node scripts\/ad-watch-v2.mjs --if-configured --member-receipts-only\s+else\s+node scripts\/ad-watch-v2.mjs --if-configured --members\s+fi/);assert.match(verify,/REQUIRE_WEB3_CONFIGURED:.*env.BPJ_RECEIPTS_RECOVERY == 'true' && 'true'/);
checkGuard(guardOf('Publish and verify startup MCP registry entry'),{needsPublish:true});
assert.match(registry,/!contains\(github.event.head_commit.message, '\[member-receipts-recovery\]'\)/);assert.match(registry,/!contains\(github.event.workflow_run.head_commit.message, '\[member-receipts-recovery\]'\)/);
assert.match(watch,/cron: '7 \*\/2 \* \* \*'/);assert.match(watch,/options: \[watch, ads-only, receipts-only, eco-watch, agi-watch, inspect\]/);
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
`],{encoding:'utf8',env:{...process.env,GOOGLE_CLIENT_ID:'fixture.apps.googleusercontent.com'}});assert.ifError(result.error);assert.equal(result.status,0,result.stderr);
console.log('PASS recovery/read-only/publish truth tables; main-only isolated Eco/AGI maintenance modes; product dispatch with full gates, no extra daily refresh/lifecycle writes, unchanged default modes, current-main guards, changed-only IndexNow, credential reuse and bounded fixture checks');
