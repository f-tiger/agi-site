// Local fixtures only; clock, source failures and playback frames are controlled.
import {createRequire} from 'node:module';
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {homeEdition} from '../../home-focus/rotation.mjs';
const require=createRequire(import.meta.url),{chromium}=require(require.resolve('playwright',{paths:[path.resolve('tools/revenue-studio/node_modules')]}));
const root=path.resolve('sites/agiscorecard'),snapshot=JSON.parse(fs.readFileSync(path.join(root,'foresight-assets/home.json')));
const launch={headless:true};if(process.env.AGI_CHROMIUM){const c=require(process.env.AGI_CHROMIUM);launch.executablePath=await c.executablePath();launch.args=c.args.filter(a=>!['--disable-web-security','--single-process'].includes(a));}
const browser=await chromium.launch(launch),day=snapshot.editionDay,before=day+'T15:59:30Z',after=day+'T16:00:30Z';
const nextDay=new Date(Date.parse(day+'T00:00:00Z')+86400000).toISOString().slice(0,10),laterDay=new Date(Date.parse(day+'T00:00:00Z')+2*86400000).toISOString().slice(0,10);
async function fixture(lang,{fail=false,width=390}={}){
 const ctx=await browser.newContext({viewport:{width,height:900},timezoneId:lang==='zh'?'Asia/Shanghai':'America/Los_Angeles'}),p=await ctx.newPage();
 await p.clock.install({time:new Date(Date.parse(before)-60000)});await p.clock.pauseAt(new Date(before));
 const state={fail,invalid:false,data:structuredClone(snapshot),requests:0,frames:0,errors:[]};p.on('pageerror',e=>state.errors.push(e.message));
 await p.route('**/*',async r=>{
  const u=new URL(r.request().url());
  if(u.hostname==='www.youtube-nocookie.com'){state.frames++;return r.fulfill({contentType:'text/html',body:'<p>Controlled player</p>'});}
  if(u.origin!=='https://agiscorecard.com')return r.abort();
  if(u.pathname==='/foresight-assets/home.json'){state.requests++;return r.fulfill({status:state.fail?503:200,contentType:'application/json',body:JSON.stringify(state.invalid?{version:1,checkedAt:'bad'}:state.data)});}
  const slug=u.pathname==='/'?'/index.html':u.pathname,f=path.join(root,path.extname(slug)?slug:slug+'.html');
  if(!f.startsWith(root+path.sep)||!fs.existsSync(f))return r.fulfill({status:404,body:'fixture missing'});
  const contentType={'.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.svg':'image/svg+xml'}[path.extname(f)]||'text/plain';
  return r.fulfill({body:fs.readFileSync(f),contentType});
 });
 await p.goto('https://agiscorecard.com'+(lang==='zh'?'/cn':'/')+'?__qa=1');
 if(!fail)await p.waitForFunction(d=>document.documentElement.dataset.homeRotationDay===d,day);
 return {ctx,p,state};
}
const actual=p=>p.evaluate(()=>({feature:document.querySelector('[data-home-feature]').dataset.homeFeature,picks:[...document.querySelectorAll('[data-home-pick]')].map(n=>n.dataset.homePick),day:document.querySelector('[data-home-edition-date]').textContent,checked:document.querySelector('.home-sync-note time').dateTime}));
const verify=async(p,lang,now)=>{const e=homeEdition(snapshot.rotation,now),a=await actual(p);assert.equal(a.feature,e.feature.video);assert.deepEqual(a.picks,e.recommendations[lang].map(v=>v.video));assert.equal(a.day,e.day);};
try{
 for(const lang of ['en','zh']){
  const {ctx,p,state}=await fixture(lang,{width:lang==='zh'?320:390});await verify(p,lang,before);
  assert.equal(state.frames,0,'no embedded player until a click');assert.equal(await p.locator('#home-feature iframe').count(),0);
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await p.clock.runFor(61000);await verify(p,lang,after);assert.equal((await actual(p)).checked,snapshot.checkedAt,'rotation does not refresh source-review dates');
  const picks=(await actual(p)).picks;await p.reload();await p.waitForFunction(d=>document.documentElement.dataset.homeRotationDay===d,nextDay);assert.deepEqual((await actual(p)).picks,picks,'same-day reload is stable');
  assert.deepEqual(state.errors,[]);await ctx.close();
 }
 {
  const {ctx,p,state}=await fixture('zh');await p.locator('[data-home-video]').click();await p.locator('#home-feature iframe').waitFor();
  const old=await actual(p),src=await p.locator('#home-feature iframe').getAttribute('src');
  await p.locator('#home-feature iframe').evaluate(n=>n.dataset.survivor='same-player');state.fail=true;
  await p.clock.runFor(61000);const next=await actual(p);
  assert.equal(next.feature,old.feature);assert.equal(await p.locator('#home-feature iframe').getAttribute('src'),src);assert.equal(await p.locator('#home-feature iframe').getAttribute('data-survivor'),'same-player');
  assert.notDeepEqual(next.picks,old.picks);assert.equal(next.day,nextDay);
  await p.clock.fastForward(86400000);assert.equal((await actual(p)).day,laterDay,'cached pool rotates despite failed source refresh');assert.ok(state.requests>=2);assert.equal(state.frames,1);assert.deepEqual(state.errors,[]);await ctx.close();
 }
 {
  const {ctx,p,state}=await fixture('en');await p.locator('.home-latest-card a').first().focus();
  const old=await actual(p);await p.clock.runFor(61000);assert.deepEqual((await actual(p)).picks,old.picks);assert.equal((await actual(p)).day,old.day,'label describes cards actually displayed while focused');
  await p.locator('h1').click();await p.clock.runFor(60000);await verify(p,'en',after);
  const checked=day+'T15:00:00Z';state.data.checkedAt=checked;state.data.locales.en.feed=state.data.locales.en.feed.replaceAll(snapshot.checkedAt,checked);
  await p.clock.runFor(180000);await p.waitForFunction(date=>document.querySelector('.home-sync-note time').dateTime===date,checked);
  const good=await actual(p);state.invalid=true;await p.clock.runFor(300000);assert.deepEqual(await actual(p),good,'invalid refresh preserves last accepted cards and source status');
  assert.deepEqual(state.errors,[]);await ctx.close();
 }
 {
  const {ctx,p,state}=await fixture('zh',{fail:true});assert.equal(await p.locator('.home-latest-card').count(),4,'published HTML remains useful on initial fetch failure');state.fail=false;
  await p.clock.runFor(300000);await p.waitForFunction(d=>document.documentElement.dataset.homeRotationDay===d,nextDay);await verify(p,'zh',after);assert.deepEqual(state.errors,[]);await ctx.close();
 }
 console.log('Daily home rotation: bilingual midnight rollover, same-day stability, 320/390px layout, focused-card protection, uninterrupted playback, source metadata refresh and failed/invalid feeds passed.');
}finally{await browser.close();}
