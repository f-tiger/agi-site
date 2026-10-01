// Local fixtures only: no production analytics, APIs or clipboard are contacted.
import {createRequire} from 'node:module';
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(require.resolve('playwright',{paths:[path.resolve('tools/revenue-studio/node_modules')]}));
const root=path.resolve('sites/agiscorecard');
const launch={headless:true};
if(process.env.AGI_CHROMIUM){const c=require(process.env.AGI_CHROMIUM);launch.executablePath=await c.executablePath();launch.args=c.args.filter(a=>!['--disable-web-security','--single-process'].includes(a));}
const browser=await chromium.launch(launch);
const focused=new Set(['focus_entry','task_start','task_complete','result_copy']);
async function fixture(url,{failData=false,privacy=false,copyFail=false,width=390}={}){
  const ctx=await browser.newContext({viewport:{width,height:900}}),p=await ctx.newPage();
  let failed=false;
  await p.addInitScript(({privacy,copyFail})=>{
    window.__copied='';
    Object.defineProperty(navigator,'clipboard',{value:{writeText:async s=>{if(copyFail)throw Error('blocked');window.__copied=s;}}});
    if(privacy)Object.defineProperty(navigator,'doNotTrack',{value:'1'});
  },{privacy,copyFail});
  await p.route('**/*',async r=>{
    const u=new URL(r.request().url());if(u.origin!=='https://agiscorecard.com')return r.abort();
    if(u.pathname==='/data.json'&&failData&&!failed){failed=true;return r.fulfill({status:503,body:'unavailable'});}
    const slug=u.pathname==='/'?'/index.html':u.pathname;
    const f=path.join(root,path.extname(slug)?slug:slug+'.html');
    if(!f.startsWith(root+path.sep)||!fs.existsSync(f))return r.fulfill({status:404,body:'fixture missing'});
    const type={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml'}[path.extname(f)]||'text/plain';
    return r.fulfill({body:fs.readFileSync(f),contentType:type});
  });
  await p.goto('https://agiscorecard.com'+url);
  await p.waitForFunction(()=>document.querySelector('.focus-intro'));
  assert.equal(await p.locator('h1').count(),1);
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow');
  return {ctx,p};
}
const events=p=>p.evaluate(()=>Array.from(window.dataLayer||[]).filter(x=>x[0]==='event').map(x=>({name:x[1],params:x[2]})));
const count=async(p,n)=>(await events(p)).filter(x=>x.name===n).length;
async function assess(p){await p.locator('#gg-start').click();await p.locator('.grade-row').first().waitFor();for(let i=0;i<8;i++)await p.locator('.grade-row').nth(i).getByRole('button',{name:/^(Delivered|已兑现)$/}).click();}
try{
  for(const lang of ['en','zh']){
    const {ctx,p}=await fixture(lang==='en'?'/':'/cn');
    const errors=[];p.on('pageerror',e=>errors.push(e.message));
    await p.screenshot({path:'/tmp/agi-focus-'+lang+'-mobile.png',fullPage:false});
    await assess(p);assert.equal(await p.locator('#gg-score').textContent(),'100');
    assert.equal(await count(p,'task_start'),1);assert.equal(await count(p,'task_complete'),1);
    await p.locator('.grade-row').first().getByRole('button',{name:/^(Failed|落空)$/}).click();
    assert.equal(await p.locator('#gg-score').textContent(),'87.5');assert.equal(await count(p,'task_complete'),1);
    await p.locator('#gg-copy').click();assert.equal(await count(p,'result_copy'),1);
    assert.match(await p.evaluate(()=>window.__copied),/87\.5.*100/);assert.match(await p.evaluate(()=>window.__copied),/utm_source=reader_share/);
    for(const e of (await events(p)).filter(x=>focused.has(x.name)))assert.deepEqual(Object.keys(e.params).sort(),['label','location']);
    for(const href of await p.locator('.grade-evidence').evaluateAll(as=>as.map(a=>a.getAttribute('href'))))assert.ok(fs.existsSync(path.join(root,href+'.html')),href+' exists');
    await p.locator('#gg-reset').click();assert.ok(await p.locator('#gg-result').isHidden());
    for(let i=0;i<8;i++)await p.locator('.grade-row').nth(i).getByRole('button',{name:/^(Unresolved|未决)$/}).click();
    assert.equal(await p.locator('#gg-score').textContent(),'50');assert.equal(await count(p,'task_complete'),2);
    await p.setViewportSize({width:1365,height:950});await p.evaluate(()=>{document.documentElement.style.scrollBehavior='auto';scrollTo({top:0,behavior:'instant'});});await p.screenshot({path:'/tmp/agi-focus-'+lang+'-desktop.png',fullPage:false});
    assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);await ctx.close();
  }
  for(const options of [{url:'/?ci=1'},{url:'/?__qa=1'},{url:'/',privacy:true}]){
    const {ctx,p}=await fixture(options.url,options);await assess(p);await p.locator('#gg-copy').click();assert.equal((await events(p)).filter(x=>focused.has(x.name)).length,0);await ctx.close();
  }
  {const {ctx,p}=await fixture('/',{failData:true,copyFail:true});await p.locator('#gg-start').click();await p.getByRole('button',{name:'Retry loading'}).waitFor();assert.equal(await count(p,'task_start'),0);await assess(p);await p.locator('#gg-copy').click();assert.ok(await p.locator('#gg-copy-fallback').isVisible());assert.equal(await count(p,'result_copy'),0);await ctx.close();}
  console.log('Home focus: EN/ZH mobile and desktop, scoring, retry, edit/reset deduplication, privacy, clipboard fallback and all evidence links passed.');
}finally{await browser.close();}
