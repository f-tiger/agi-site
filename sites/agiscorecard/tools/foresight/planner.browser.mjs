// Local fixtures only: no production APIs, analytics or model calls.
import {createRequire} from 'node:module';import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {scenarios,actions,counters} from '../../foresight-assets/planner.mjs';
const require=createRequire(import.meta.url),{chromium}=require(require.resolve('playwright',{paths:[path.resolve('tools/revenue-studio/node_modules')]}));
const root=path.resolve('sites/agiscorecard'),slot='agi-future-guide-v1',claim='software-judgment';
const launch={headless:true};if(process.env.AGI_CHROMIUM){const c=require(process.env.AGI_CHROMIUM);launch.executablePath=await c.executablePath();launch.args=c.args.filter(a=>!['--disable-web-security','--single-process'].includes(a));}
const browser=await chromium.launch(launch);
async function fixture(lang,{legacy=null,blockSave=false}={}){
 const ctx=await browser.newContext({viewport:{width:390,height:844},timezoneId:'Asia/Shanghai'}),p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.clock.install({time:new Date('2026-10-03T15:59:00Z')});await p.clock.pauseAt(new Date('2026-10-03T15:59:01Z'));
 await p.addInitScript(({slot,legacy,blockSave})=>{if(legacy&&!localStorage.getItem(slot))localStorage.setItem(slot,JSON.stringify(legacy));if(blockSave)Storage.prototype.setItem=function(){throw Error('blocked');};},{slot,legacy,blockSave});
 await p.route('**/*',async r=>{const u=new URL(r.request().url());if(u.origin!=='https://agiscorecard.com')return r.abort();const slug=u.pathname==='/'?'/index.html':u.pathname,f=path.join(root,path.extname(slug)?slug:slug+'.html');if(!f.startsWith(root+path.sep)||!fs.existsSync(f))return r.fulfill({status:404,body:'fixture missing'});return r.fulfill({body:fs.readFileSync(f),contentType:{'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'}[path.extname(f)]||'text/plain'});});
 await p.goto('https://agiscorecard.com'+(lang==='zh'?'/zh':'')+'/future-guide/'+claim+'?goal=work&__qa=1#plan');await p.waitForFunction(()=>document.body.dataset.ready==='true');return {ctx,p,errors};
}
const stored=p=>p.evaluate(slot=>JSON.parse(localStorage.getItem(slot)),slot);
const preview=p=>p.locator('.plan-output').textContent();
try{
 for(const lang of ['en','zh']){
  const {ctx,p,errors}=await fixture(lang);assert.equal(await p.locator('#plan-form select').count(),6);assert.equal(await p.locator('#plan-form input,#plan-form textarea').count(),0);
  assert.equal(await stored(p),null,'automatic preview does not save or complete a plan');assert.ok((await preview(p)).includes(scenarios.work[0].label[lang]));
  for(const goal of Object.keys(scenarios)){
   await p.locator('#plan-goal').selectOption(goal);const task=scenarios[goal].at(-1),action=actions[goal].at(-1),counter=counters[goal].at(-1);
   await p.locator('#note-task').selectOption(task.id);await p.locator('#note-action').selectOption(action.id);await p.locator('#note-counter').selectOption(counter.id);
   assert.equal(await p.locator('[data-plan-output=task]').textContent(),task.label[lang]);assert.ok((await preview(p)).includes(task.input[lang]));assert.ok((await preview(p)).includes(counter.label[lang]));
  }
  await p.locator('#plan-goal').selectOption('work');await p.locator('#note-task').selectOption('meeting-notes');await p.locator('#note-action').selectOption('draft');await p.locator('#note-review').selectOption('3');await p.locator('#note-done').selectOption('tried');
  const shown=await preview(p);await p.locator('#plan-form [type=submit]').click();const saved=(await stored(p)).values.notes[claim];assert.equal(saved.review,'2026-10-06');assert.equal(saved.done,true);assert.ok(shown.includes(saved.action));
  await p.reload();await p.waitForFunction(()=>document.body.dataset.ready==='true');assert.ok((await preview(p)).includes(saved.action));assert.equal(await p.locator('#note-done').inputValue(),'tried');
  await p.clock.fastForward(86400000);await p.locator('#plan-form [type=submit]').click();assert.deepEqual((await stored(p)).values.notes[claim],saved,'opening and saving a day later never shifts the review date');
  await p.locator('#note-task').selectOption('customer-reply');assert.equal(await p.locator('#note-done').inputValue(),'planned','a different task is not already completed');assert.ok((await preview(p)).includes(scenarios.work[2].input[lang]));
  for(const width of [320,390,1280]){await p.setViewportSize({width,height:900});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no overflow at '+width);}
  await p.locator('#note-review').selectOption('none');await p.locator('#plan-form [type=submit]').click();assert.equal((await stored(p)).values.notes[claim].review,'');
  assert.deepEqual(errors,[]);await ctx.close();
 }
 {
  const note={stance:'disagree',task:'Custom task <script>window.injected=true</script>',action:'Keep my old handwritten action exactly.',counter:'Keep my old counterexample exactly.',review:'2026-11-01',done:true};
  const legacy={version:1,product:'future-guide',values:{goal:'work',saved:[claim],notes:{[claim]:note}}}, {ctx,p,errors}=await fixture('zh',{legacy});
  assert.ok((await preview(p)).includes(note.task));assert.equal(await p.locator('.plan-output script').count(),0);assert.equal(await p.evaluate(()=>window.injected),undefined);
  await p.locator('#plan-form [type=submit]').click();assert.deepEqual((await stored(p)).values.notes[claim],note,'all legacy fields remain byte-for-byte intact');
  await p.locator('#note-action').selectOption('check');assert.ok((await preview(p)).includes(note.task),'a new action uses the saved task, not an unrelated default');assert.equal(await p.locator('#note-done').inputValue(),'planned');
  await p.locator('#note-review').selectOption('7');await p.locator('#note-review').selectOption('saved');assert.equal(await p.locator('[data-plan-output=review]').textContent(),note.review);
  assert.deepEqual(errors,[]);await ctx.close();
 }
 {
  const {ctx,p,errors}=await fixture('zh',{blockSave:true});await p.locator('#plan-form [type=submit]').click();assert.match(await p.locator('#status').textContent(),/未能保存/);assert.equal(await stored(p),null);assert.ok((await preview(p)).includes('周报'));assert.deepEqual(errors,[]);await ctx.close();
 }
 console.log('Select-only planner: EN/ZH dependent choices, live preview, 320/390/1280px, save/reload, fixed review dates, legacy text/XSS preservation, progress reset and blocked storage passed.');
}finally{await browser.close();}
