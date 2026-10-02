import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../dist/',import.meta.url));
const {chromium}=createRequire(new URL('../../../tools/revenue-studio/package.json',import.meta.url))('playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.WORKBENCH_CHROMIUM,args:['--no-sandbox','--disable-dev-shm-usage']});
try {
for(const prefix of ['', '/en'])for(const mode of ['normal','qa','webdriver','dnt','gpc']) {
 const context=await browser.newContext({viewport:{width:390,height:844}}),hits=[],errors=[],tags=[];
 await context.addInitScript(mode=>{Object.defineProperty(navigator,'webdriver',{get:()=>mode==='webdriver'});if(mode==='dnt')Object.defineProperty(navigator,'doNotTrack',{get:()=> '1'});if(mode==='gpc')Object.defineProperty(navigator,'globalPrivacyControl',{get:()=>true});},mode);
 await context.route('**/*',async route=>{
  const req=route.request(),u=new URL(req.url());
  if(u.hostname==='www.googletagmanager.com'){tags.push(u.href);return route.fulfill({contentType:'text/javascript',body:''});}
  if(u.origin!=='https://baipiaoji.com')return route.abort();
  if(u.pathname==='/api/hit'){hits.push(req.postDataJSON());return route.fulfill({status:204});}
  if(u.pathname.startsWith('/api/'))return route.fulfill({contentType:'application/json',body:'{}'});
  const rel=u.pathname.endsWith('/')?u.pathname+'index.html':path.extname(u.pathname)?u.pathname:u.pathname+'.html',file=path.join(root,rel);
  if(!fs.existsSync(file))return route.fulfill({status:404});
  return route.fulfill({body:fs.readFileSync(file),contentType:{'.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json'}[path.extname(file)]||'text/html'});
 });
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto('https://baipiaoji.com'+prefix+'/?'+(mode==='qa'?'qa=1&':'')+'private=SECRET_QUERY#SECRET_HASH');
 await page.evaluate(()=>document.addEventListener('click',e=>{if(e.target.closest('a'))e.preventDefault()},true));
 const click=()=>page.locator('.bpj-primary-cta').click();
 await click();assert.equal(tags.length,0,'No Google loader before consent');
 if(mode==='normal'){
  await page.locator('[data-analytics-choice="granted"]').click();
  await page.waitForFunction(()=>document.querySelector('iframe[title="Optional analytics"]')?.contentWindow.dataLayer?.length>0);
  await click();await click();
  await page.waitForFunction(()=>Array.from(document.querySelector('iframe[title="Optional analytics"]').contentWindow.dataLayer).filter(x=>x[1]==='home_click').length===2);
  const events=await page.evaluate(()=>Array.from(document.querySelector('iframe[title="Optional analytics"]').contentWindow.dataLayer).map(x=>Array.from(x)));
  assert.equal(events.filter(x=>x[1]==='home_view').length,1);assert.equal(events.filter(x=>x[1]==='page_view').length,1);
  assert.equal(events.filter(x=>x[1]==='home_click').length,2,'Do not deduplicate real repeat clicks');
  for(const e of events.filter(x=>x[1]==='home_click')){assert.equal(e[2].home_destination,'tool-directory');assert.equal(e[2].home_block,'hero');}
  assert(!JSON.stringify(events).includes('SECRET'));assert.equal(tags.length,1);
  assert.equal(hits.filter(x=>x.e==='home'&&x.p.startsWith('/home/hero')).length,3,'D1 keeps its separate pre-consent count');
  await page.locator('#fleet-analytics-settings').click();await page.locator('[data-analytics-choice="denied"]').click();
  await click();assert.equal(await page.locator('iframe[title="Optional analytics"]').count(),0);
  await page.locator('#fleet-analytics-settings').click();await page.locator('[data-analytics-choice="granted"]').click();
  await page.waitForFunction(()=>document.querySelector('iframe[title="Optional analytics"]')?.contentWindow.dataLayer?.length>0);
  await click();await page.waitForFunction(()=>Array.from(document.querySelector('iframe[title="Optional analytics"]').contentWindow.dataLayer).some(x=>x[1]==='home_click'));
  const again=await page.evaluate(()=>Array.from(document.querySelector('iframe[title="Optional analytics"]').contentWindow.dataLayer).map(x=>Array.from(x)));
  assert.equal(again.filter(x=>x[1]==='home_view'||x[1]==='page_view').length,0,'Regrant does not duplicate views');
  for(const width of [390,768,1440]){
   await page.setViewportSize({width,height:900});await page.evaluate(()=>scrollTo(0,0));
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),prefix+' overflow '+width);
   if(width===390){const top=await page.locator('.bpj-primary-cta').evaluate(e=>e.getBoundingClientRect().top);assert(top<390,'Mobile primary action should be visible early');}
   if(process.env.BPJ_SCREENSHOTS){fs.mkdirSync(process.env.BPJ_SCREENSHOTS,{recursive:true});await page.screenshot({path:path.join(process.env.BPJ_SCREENSHOTS,(prefix?'en':'zh')+'-'+width+'.png')});}
  }
 } else {assert.equal(await page.locator('#fleet-analytics-choice').count(),0);assert.equal(hits.filter(x=>x.e==='home'&&x.p.startsWith('/home/')).length,0);}
 assert.deepEqual(errors,[]);await context.close();
}
console.log('PASS homepage consent, repeat clicks, withdrawal/regrant, no query leakage, bilingual responsive layouts, QA/DNT/GPC/automation exclusion. All network intercepted.');
} finally {await browser.close();}
