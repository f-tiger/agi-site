// Localhost regression only: real Jarvis API + SQLite + runner, with synthetic
// memberships and fixed AI/no-AI fixtures. Passing does not establish model
// quality, real repair, customer demand, payments, or production deployment.
// Run from the repository root after the Future Guide/Jarvis page generators:
// JARVIS_CHROMIUM=/usr/bin/chromium node sites/agiscorecard/tools/jarvis/handoff-browser-test.mjs
// JARVIS_PLAYWRIGHT may point to an existing Playwright index.mjs; no install.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {pathToFileURL} from 'node:url';
import {jarvisRoute} from './server.mjs';
import {database} from './test-support.mjs';
import {isJarvisPage,secureJarvisPage} from './security.mjs';
import {HANDOFF_KEY,HANDOFF_FROM,HANDOFF_TTL,makeEnvelope,planGoal} from '../../jarvis-assets/handoff.mjs';
import {COMMERCIAL_CLAIM,COMMERCIAL_VERSION,commercialEvidence} from '../../foresight-assets/commercial.mjs';

const playwright=process.env.JARVIS_PLAYWRIGHT
 ?pathToFileURL(path.resolve(process.env.JARVIS_PLAYWRIGHT)).href
 :new URL('../../../../tools/revenue-studio/node_modules/playwright/index.mjs',import.meta.url).href;
const {chromium}=await import(playwright);
const root=path.resolve('sites/agiscorecard');
const out=path.resolve(process.env.JARVIS_ARTIFACT_DIR||'/tmp/jarvis-handoff-browser');
fs.mkdirSync(out,{recursive:true});
const NOTE_KEY='agi-future-guide-v1',MEMBER_KEY='workbench-member-key:agi';
const memberToken='1'.repeat(64),fixtures=new Map(),pending=new Set(),serverErrors=[],results=[];
let base,browser,activeFixture;
function fixture(id,ai=true){
 const f={id,posts:[],modelCalls:0,modelPayloads:[],toolFetches:[],errors:[],leaks:[],env:{EVENTS:database(),MEMBER_WATCH_SECRET:'local-handoff-fixture-only'}};
 if(ai)f.env.AI={async run(_model,payload){
  f.modelCalls++;f.modelPayloads.push(JSON.parse(payload.messages.find(message=>message.role==='user').content));
  const zh=payload.messages[0].content.includes('Simplified Chinese');
  return {response:{
   summary:zh?'固定测试草稿：仍需负责人核查原始记录。':'Fixed test draft: the owner must still review the original records.',
   findings:[],
   nextActions:[{action:zh?'核对一条获准使用的脱敏失败记录。':'Compare one permitted, de-identified failed-run record.',doneWhen:zh?'记录差异与复核时间。':'Record the observed gap and review time.'}],
   uncertainties:[zh?'未执行修复，也未证明客户需求。':'No repair was performed and customer demand is unproven.']
  }};
 }};
 f.env.JARVIS_FETCH=async url=>{f.toolFetches.push(String(url));throw Error('unexpected_fixture_network');};
 fixtures.set(id,f);return f;
}
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,base);
  if(url.pathname.startsWith('/api/jarvis')){
   const f=fixtures.get(req.headers['cf-connecting-ip']);
   if(!f)throw Error('fixture_context_missing');
   const parts=[];for await(const p of req)parts.push(p);
   const body=Buffer.concat(parts);
   if(req.method==='POST')f.posts.push({pathname:url.pathname,body:JSON.parse(body.toString())});
   const response=await jarvisRoute(new Request(url,{method:req.method,headers:req.headers,...(req.method==='POST'?{body}:{})}),f.env,{waitUntil:p=>{pending.add(p);p.finally(()=>pending.delete(p));}});
   res.writeHead(response.status,Object.fromEntries(response.headers));return res.end(await response.text());
  }
  let file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
  if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
  if(!path.extname(file))file+='.html';
  if(!fs.existsSync(file))return res.writeHead(404).end();
  const type=({'.mjs':'text/javascript','.js':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'})[path.extname(file)]||'text/plain';
  let content=fs.readFileSync(file);
  if(isJarvisPage(url.pathname)){
   const nonce=crypto.randomUUID().replaceAll('-','');
   content=content.toString().replace(/<script(?=[\s>])/g,'<script nonce="'+nonce+'"');
   const response=secureJarvisPage(new Response(content,{headers:{'content-type':type}}),nonce);
   res.writeHead(200,Object.fromEntries(response.headers));return res.end(await response.text());
  }
  res.setHeader('content-type',type);res.end(content);
 }catch(error){serverErrors.push(error.stack||String(error));res.writeHead(500).end('local fixture error');}
});

async function openFixture(id,{lang='en',ai=true,width=1440}={}){
 const f=fixture(id,ai),prefix=lang==='zh'?'/zh':'';
 const context=await browser.newContext({viewport:{width,height:1000},acceptDownloads:true,extraHTTPHeaders:{'CF-Connecting-IP':id}});
 const page=await context.newPage();page.setDefaultTimeout(10000);
 page.on('pageerror',error=>f.errors.push(error.message));
 await context.route('**/*',route=>{
  const url=new URL(route.request().url());
  if(url.origin!==base){f.leaks.push(route.request().url());return route.abort();}
  return route.continue();
 });
 await page.goto(base+prefix+'/future-guide/'+COMMERCIAL_CLAIM+'?__qa=1');
 await ready(page);
 await page.evaluate(({key,token})=>sessionStorage.setItem(key,token),{key:MEMBER_KEY,token:memberToken});
 activeFixture={f,context,page,lang,prefix};console.log('RUN '+id);return activeFixture;
}
async function ready(page){await page.waitForFunction(()=>document.body.dataset.ready==='true');}
async function source(page,prefix){await page.goto(base+prefix+'/future-guide/'+COMMERCIAL_CLAIM+'?__qa=1');await ready(page);}
async function stored(page){return page.evaluate(key=>JSON.parse(localStorage.getItem(key)||'null'),NOTE_KEY);}
function original(lang){return {version:1,product:'future-guide',values:{goal:'work',saved:[COMMERCIAL_CLAIM],notes:{[COMMERCIAL_CLAIM]:{
 stance:'undecided',task:lang==='zh'?'原计划：检查每周报告':'Original plan: check the weekly report',
 action:lang==='zh'?'原计划：记录一次返工':'Original plan: record one rework',counter:lang==='zh'?'原边界：缺少许可时停止':'Original boundary: stop if permission is missing',review:'2026-10-12',done:true
 }}}};}
async function seedNote(page,value){await page.evaluate(({key,value})=>localStorage.setItem(key,JSON.stringify(value)),{key:NOTE_KEY,value});}
async function attachAndSave(s){
 const {page,prefix,lang,f}=s,old=original(lang);
 await seedNote(page,old);await source(page,prefix);
 for(const field of ['recurring','records','owner'])await page.locator('#commercial-'+field).selectOption('yes');
 assert.equal(await page.locator('#commercial-case').isVisible(),true);
 assert.deepEqual(await stored(page),old,'fit choices must not save or rewrite a plan');
 assert.equal(await page.locator('[data-plan-output=action]').textContent(),old.values.notes[COMMERCIAL_CLAIM].action);
 await page.locator('#commercial-attach').click();
 assert.deepEqual(await stored(page),old,'explicit attach changes the draft only');
 await page.locator('#plan-form [type=submit]').click();
 const saved=await stored(page),note=saved.values.notes[COMMERCIAL_CLAIM];
 assert.equal(note.commercial.version,COMMERCIAL_VERSION);
 assert.deepEqual(note.commercial.fit,{recurring:true,records:true,owner:true});
 assert.equal(note.review,old.values.notes[COMMERCIAL_CLAIM].review);
 assert.equal(note.done,false);assert.equal(f.posts.length,0);
 await page.reload();await ready(page);
 assert.deepEqual(await stored(page),saved);
 assert.equal(await page.locator('[data-plan-output=action]').textContent(),note.action);
 assertReceipt(await download(page,'#export-plan'),lang);
 return {saved,note};
}
async function download(page,selector){
 const waiting=page.waitForEvent('download');await page.locator(selector).click();
 return fs.readFileSync(await (await waiting).path(),'utf8');
}
function literalMarkdown(text){return text.replace(/\\([\\`*_{}\[\]()#+.!|~:\-])/g,'$1').replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&amp;','&');}
function assertReceipt(text,lang){
 const plain=literalMarkdown(text),e=commercialEvidence;
 for(const term of [COMMERCIAL_VERSION,e.discoveryId,e.videoId,e.method[lang],e.hypothesis[lang],e.boundary[lang],...e.rows.flatMap(row=>[row.statement[lang],row.limit[lang],row.url,row.locator])])
  assert.ok(plain.includes(term),'missing original evidence/limit: '+term);
}
async function layout(page,label){
 for(const width of [1440,360]){
  await page.setViewportSize({width,height:1000});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,label+' overflow at '+width+'px');
  await page.screenshot({path:path.join(out,label+'-'+width+'.png'),fullPage:true});
 }
}
async function preview(s){
 const {page,prefix,f}=s;
 const before=f.posts.length;await page.locator('#plan-jarvis').click();
 await page.waitForURL(url=>url.pathname===prefix+'/jarvis'&&url.searchParams.get('from')===HANDOFF_FROM);
 await ready(page);await page.locator('#workspace').waitFor({state:'visible'});
 await page.locator('#handoff-preview').waitFor({state:'visible'});
 assert.equal(await page.evaluate(key=>sessionStorage.getItem(key),HANDOFF_KEY),null,'consume handoff on preview');
 assert.equal(await page.locator('#goal').inputValue(),'');
 assert.equal(await page.locator('#cloud-consent').isChecked(),false);
 assert.equal(await page.locator('#web').isChecked(),false);
 assert.equal(await page.locator('#cadence').inputValue(),'once');
 assert.equal(f.posts.length,before,'preview must never submit Jarvis work');
 const url=new URL(page.url());assert.equal(url.searchParams.get('from'),HANDOFF_FROM);assert.ok([...url.searchParams.keys()].every(key=>['from','__qa'].includes(key)));assert.equal(url.hash,'');
 return before;
}
async function inject(s,envelope,{from=true}={}){
 const {page,prefix}=s;
 await source(page,prefix);
 await page.evaluate(({key,envelope})=>sessionStorage.setItem(key,JSON.stringify(envelope)),{key:HANDOFF_KEY,envelope});
 await page.goto(base+prefix+'/jarvis'+(from?'?from='+HANDOFF_FROM:''));
 await ready(page);await page.locator('#workspace').waitFor({state:'visible'});
}
async function assertClean(s,{goal=''}={}){
 assert.equal(await s.page.locator('#goal').inputValue(),goal);
 assert.equal(await s.page.locator('#cloud-consent').isChecked(),false);
 assert.equal(await s.page.locator('#web').isChecked(),false);
 assert.equal(await s.page.evaluate(key=>sessionStorage.getItem(key),HANDOFF_KEY),null);
 assert.equal(s.f.posts.length,0);
}
async function closeFixture(s,label){
 assert.deepEqual(s.f.errors,[],label+' page errors');
 assert.deepEqual(s.f.leaks,[],label+' attempted external browser requests');
 assert.deepEqual(s.f.toolFetches,[],label+' attempted runner source network');
 results.push({case:label,passed:true,jarvisPosts:s.f.posts.length,fixtureModelCalls:s.f.modelCalls});
 await s.context.close();activeFixture=null;console.log('PASS '+label);
}

async function happy(lang,ai){
 const label='handoff-'+lang+'-'+(ai?'fixed-ai':'no-ai'),s=await openFixture(label,{lang,ai}),{page,f,prefix}=s;
 const {saved,note}=await attachAndSave(s),goal=planGoal(makeEnvelope(note,lang).plan,lang);
 await layout(page,label+'-source');
 await preview(s);assertReceipt(await page.locator('#handoff-preview').textContent(),lang);
 for(const field of ['task','action','counter','review'])assert.ok((await page.locator('#handoff-preview').textContent()).includes(note[field]),'preview original '+field);
 await layout(page,label+'-preview');
 await page.locator('#handoff-apply').click();
 assert.equal(await page.locator('#goal').inputValue(),goal);
 assert.equal(await page.locator('#cloud-consent').isChecked(),false);
 assert.equal(await page.locator('#web').isChecked(),false);
 assert.equal(f.posts.length,0,'apply fills a local draft only');
 assert.deepEqual(await stored(page),saved,'handoff must retain the saved Future Guide plan');
 await page.locator('#start').click();
 assert.equal(f.posts.length,0,'manual start without consent must not submit');
 await page.locator('#cloud-consent').check();
 await page.locator('#start').click();await page.locator('#task-detail').waitFor({state:'visible'});
 while(pending.size)await Promise.all([...pending]);
 await page.getByRole('button',{name:lang==='zh'?'刷新':'Refresh',exact:true}).click();
 await page.waitForFunction(()=>!document.querySelector('.status-pill')?.textContent.match(/Queued|Working|等待执行|执行中/));
 assert.equal(f.posts.length,1);assert.equal(f.posts[0].body.action,'create');
 assert.equal(f.posts[0].body.goal,goal);assert.equal(f.posts[0].body.web,false);assert.equal(f.posts[0].body.consent,true);
 const row=f.env.EVENTS.sqlite.prepare('SELECT * FROM jarvis_tasks').get(),input=JSON.parse(row.input),result=JSON.parse(row.result);
 assert.equal(input.goal,goal);assert.deepEqual(input.context,makeEnvelope(note,lang).context);
 assert.deepEqual(Object.keys(input.context).sort(),['claimId','evidenceVersion','fit','kind']);
 assert.equal(row.status,ai?'completed':'limited');assert.equal(f.modelCalls,ai?1:0);
 const pinned=result.sources.filter(source=>source.pinned);assert.equal(pinned.length,3);
 for(const evidence of commercialEvidence.rows){
  const source=pinned.find(source=>source.id.endsWith('-'+evidence.id));assert.ok(source);
  assert.equal(source.evidenceVersion,COMMERCIAL_VERSION);assert.equal(source.statement,evidence.statement[lang]);assert.equal(source.limit,evidence.limit[lang]);
  assert.equal(source.method,commercialEvidence.method[lang]);assert.equal(source.hypothesis,commercialEvidence.hypothesis[lang]);assert.equal(source.boundary,commercialEvidence.boundary[lang]);
 }
 if(ai){const prompt=f.modelPayloads[0];assert.equal(prompt.goal,goal);assert.equal(prompt.context_evidence.sources.length,3);assert.equal(prompt.context_evidence.fitStatus,'self_reported_not_verified');for(const source of prompt.context_evidence.sources)assert.equal(source.boundary,commercialEvidence.boundary[lang]);}
 if(ai)assert.equal(await page.locator('.report-summary').count(),1);else {assert.equal(result.reason,'ai_unavailable');assert.equal(await page.locator('.report-summary').count(),0);}
 assertReceipt(await page.locator('#task-detail').textContent(),lang);
 const exportSelector=lang==='zh'?'button:text-is("导出结果")':'button:text-is("Export result")';
 const exported=await download(page,exportSelector);assertReceipt(exported,lang);assert.ok(literalMarkdown(exported).includes(goal.replaceAll('\n',' '))||literalMarkdown(exported).includes(goal),'export complete original plan');
 for(const field of ['task','action','counter','review'])assert.ok(literalMarkdown(exported).includes(note[field]),'export original '+field);
 await layout(page,label+'-saved');
 await page.reload();await ready(page);await page.locator('.mission-item').first().click();
 assertReceipt(await page.locator('#task-detail').textContent(),lang);
 assert.equal(await download(page,exportSelector),exported,'save/reopen/export preserves exact receipt');
 assert.equal(f.posts.length,1);assert.equal(f.modelCalls,ai?1:0);
 await source(page,prefix);assert.deepEqual(await stored(page),saved);
 await closeFixture(s,label);
}

async function editedGoal(lang){
 const label='handoff-'+lang+'-edited-goal',s=await openFixture(label,{lang,ai:false}),{page,f}=s;
 const {saved}=await attachAndSave(s);await preview(s);await page.locator('#handoff-apply').click();
 const finalGoal=lang==='zh'?'只准备我在这里最终确认的核查草稿。不要执行任何生产修改。':'Prepare only the check draft I finally approved here. Do not change production.';
 await page.locator('#goal').fill(finalGoal);await page.locator('#cloud-consent').check();await page.locator('#start').click();
 await page.locator('#task-detail').waitFor({state:'visible'});while(pending.size)await Promise.all([...pending]);
 assert.equal(f.posts.length,1);assert.equal(f.posts[0].body.goal,finalGoal);
 assert.deepEqual(Object.keys(f.posts[0].body.context).sort(),['claimId','evidenceVersion','fit','kind']);
 assert.ok(!JSON.stringify(f.posts[0].body).includes(saved.values.notes[COMMERCIAL_CLAIM].action),'no hidden original plan is submitted after user edits goal');
 assert.equal(JSON.parse(f.env.EVENTS.sqlite.prepare('SELECT input FROM jarvis_tasks').get().input).goal,finalGoal);
 await closeFixture(s,label);
}

async function freshGuest(lang){
 const label='handoff-'+lang+'-fresh-guest',s=await openFixture(label,{lang,ai:false}),{page,f}=s;
 await attachAndSave(s);
 await page.evaluate(key=>{sessionStorage.removeItem(key);localStorage.removeItem('agi-jarvis-key-v1');},MEMBER_KEY);
 await preview(s);await page.locator('#handoff-apply').click();
 assert.ok(await page.locator('#goal').inputValue());assert.equal(await page.locator('#cloud-consent').isChecked(),false);
 assert.equal(await page.locator('#trial-notice').isVisible(),true);assert.equal(f.posts.length,0);assert.equal(f.modelCalls,0);
 assert.equal(f.env.EVENTS.sqlite.prepare('SELECT COUNT(*) n FROM jarvis_tasks').get().n,0);
 await closeFixture(s,label);
}

async function negatives(lang){
 const label='handoff-'+lang+'-negative',s=await openFixture(label,{lang}),{page,f,prefix}=s;
 const {saved,note}=await attachAndSave(s),valid=()=>makeEnvelope(note,lang);
 for(const [name,change] of [
  ['unknown-envelope-version',v=>{v.schema='unknown-future-envelope';}],
  ['unknown-evidence-version',v=>{v.context.evidenceVersion='unknown-future-evidence';}],
  ['expired',v=>{v.createdAt=Date.now()-HANDOFF_TTL-1;}],
  ['future-timestamp',v=>{v.createdAt=Date.now()+60000;}],
  ['long-plan',v=>{v.plan.action='L'.repeat(1201);}],
  ['extra-context-data',v=>{v.context.selectedPlan={action:'must not be hidden in context'};}]
 ]){
  const value=valid();change(value);await inject(s,value);
  assert.equal(await page.locator('#handoff-apply').isVisible(),false,name+' fails closed');
  assert.match(await page.locator('#handoff-preview').textContent(),lang==='zh'?/交接不可用|交接已过期/:/handoff unavailable|handoff expired/i,name+' provides actionable status');
  await assertClean(s);assert.deepEqual(await stored(page),saved,name+' keeps original source plan');
 }
 // A direct visit must not apply an old handoff. A subsequent marked visit
 // must not revive it either, even though it is still within its TTL.
 await inject(s,valid(),{from:false});await assertClean(s);
 assert.equal(await page.locator('#handoff-preview').isVisible(),false);
 await page.goto(base+prefix+'/jarvis?from='+HANDOFF_FROM);await ready(page);await page.locator('#workspace').waitFor({state:'visible'});
 assert.equal(await page.locator('#handoff-apply').isVisible(),false);await assertClean(s);
 // Preview/reload consumes once, and cancel cannot resurrect the payload.
 await inject(s,valid());await page.locator('#handoff-preview').waitFor({state:'visible'});
 await page.reload();await ready(page);await page.locator('#workspace').waitFor({state:'visible'});
 assert.equal(await page.locator('#handoff-apply').isVisible(),false);await assertClean(s);
 await inject(s,valid());await page.locator('#handoff-preview').waitFor({state:'visible'});
 await page.locator('#handoff-cancel').click();assert.equal(await page.locator('#handoff-preview').isVisible(),false);await assertClean(s);
 await page.reload();await ready(page);await page.locator('#workspace').waitFor({state:'visible'});await assertClean(s);
 // The user can type while the preview is open. Apply must never overwrite.
 await inject(s,valid());await page.locator('#handoff-preview').waitFor({state:'visible'});
 const existing=lang==='zh'?'用户已经在写的目标，不可覆盖。':'The user is already writing this goal. Do not overwrite.';
 await page.locator('#goal').fill(existing);await page.locator('#handoff-apply').click();
 await assertClean(s,{goal:existing});assert.ok((await page.locator('#handoff-status').textContent()).trim());
 // Every individual no/unknown fit suppresses maintenance recommendations.
 for(const field of ['recurring','records','owner'])for(const value of [false,null]){
  const envelope=valid();envelope.context.fit[field]=value;await inject(s,envelope);
  await page.locator('#handoff-preview').waitFor({state:'visible'});
  const previewText=await page.locator('#handoff-preview').textContent();assertReceipt(previewText,lang);
  assert.match(previewText,lang==='zh'?/不推荐工作流维护方案/:/No maintenance recommendation/);
  assert.equal(await page.locator('#handoff-preview a[href*="/earn/cases/workflow-maintenance"]').count(),0);
  await page.locator('#handoff-apply').click();await assertClean(s,{goal:planGoal(envelope.plan,lang)});
 }
 // Reject an overlong source plan without truncating its saved text or leaving
 // a partial transfer; the user can retain or export the source for editing.
 const long=structuredClone(saved);long.values.notes[COMMERCIAL_CLAIM].action='LONG_PLAN_'.repeat(145);
 await seedNote(page,long);await source(page,prefix);await page.locator('#plan-jarvis').click();
 assert.equal(new URL(page.url()).pathname,prefix+'/future-guide/'+COMMERCIAL_CLAIM);
 assert.equal(await page.evaluate(key=>sessionStorage.getItem(key),HANDOFF_KEY),null);
 assert.deepEqual(await stored(page),long);assert.equal(f.posts.length,0);
 assert.ok((await page.locator('#plan-status').textContent()).trim());
 await seedNote(page,saved);
 // Logout clears both an in-memory preview and any newly stored envelope.
 await inject(s,valid());await page.locator('#handoff-preview').waitFor({state:'visible'});
 await page.evaluate(({key,value})=>sessionStorage.setItem(key,JSON.stringify(value)),{key:HANDOFF_KEY,value:valid()});
 await page.locator('#member-logout').click();
 assert.equal(await page.locator('#handoff-preview').isVisible(),false);
 assert.equal(await page.locator('#workspace').isVisible(),false);await assertClean(s);
 // Reopen as the fixture member, then simulate a different verified scope.
 await page.evaluate(({key,token})=>sessionStorage.setItem(key,token),{key:MEMBER_KEY,token:memberToken});
 await inject(s,valid());await page.locator('#handoff-preview').waitFor({state:'visible'});
 await page.evaluate(({member,key,value})=>{sessionStorage.setItem(member,'2'.repeat(64));sessionStorage.setItem(key,JSON.stringify(value));document.dispatchEvent(new Event('visibilitychange'));},{member:MEMBER_KEY,key:HANDOFF_KEY,value:valid()});
 await page.waitForFunction(()=>document.querySelector('#handoff-preview').hidden);
 await page.locator('#workspace').waitFor({state:'visible'});await assertClean(s);
 // CSV is the existing local checker: no new Jarvis flow or task submission.
 await source(page,prefix);
 const csv=new URL(await page.locator('#plan-csv').getAttribute('href'),base);
 assert.equal(csv.pathname,prefix+'/earn/delivery-lab');
 assert.equal(csv.search,'');
 await page.locator('#plan-csv').click();await page.locator('#check-mode').waitFor();
 await page.locator('#check-mode').selectOption('workflow');
 await page.locator('#check-example').click();await page.locator('#run-check').click();
 assert.ok((await page.locator('#check-results').textContent()).trim());
 assert.equal(await page.locator('#download-check').isDisabled(),false);
 assert.equal(f.posts.length,0);assert.equal(f.modelCalls,0);
 await layout(page,label+'-csv');await closeFixture(s,label);
}

try{
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 base='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({headless:true,...(process.env.JARVIS_CHROMIUM?{executablePath:process.env.JARVIS_CHROMIUM,args:['--no-sandbox','--disable-dev-shm-usage']}:{})});
 for(const lang of ['en','zh']){await happy(lang,true);await happy(lang,false);await negatives(lang);await editedGoal(lang);await freshGuest(lang);}
 assert.deepEqual(serverErrors,[]);
 fs.writeFileSync(path.join(out,'handoff-browser-results.json'),JSON.stringify({passed:true,scope:'Local synthetic fixtures only; not production, live model quality, or real workflow verification.',results},null,2)+'\n');
 console.log('PASS EN/ZH explicit fit → attach → save → single-use preview → apply → manual consent/start; fixed AI + no-AI real local API/SQLite save/reopen/export preserves original three evidence rows, versions, boundaries, and plan. Unknown/expired/repeated/direct handoff, no-overwrite, missing fits, no-truncation, logout/scope clearing, local CSV and 360px/1440px verified. Synthetic fixtures do not prove live AI semantics.');
}catch(error){
 if(activeFixture){
  const {page,f}=activeFixture;
  await page.screenshot({path:path.join(out,'FAILED-'+f.id+'.png'),fullPage:true}).catch(()=>{});
  fs.writeFileSync(path.join(out,'handoff-browser-results.json'),JSON.stringify({passed:false,failedCase:f.id,error:error.stack||String(error),pageErrors:f.errors,attemptedExternalRequests:f.leaks,serverErrors,results},null,2)+'\n');
 }else fs.writeFileSync(path.join(out,'handoff-browser-results.json'),JSON.stringify({passed:false,stage:browser?'between fixtures':'browser launch',error:error.stack||String(error),results},null,2)+'\n');
 throw error;
}finally{
 while(pending.size)await Promise.allSettled([...pending]);
 if(browser)await browser.close();
 await new Promise(resolve=>server.close(resolve));
 for(const f of fixtures.values())f.env.EVENTS.sqlite.close();
}
