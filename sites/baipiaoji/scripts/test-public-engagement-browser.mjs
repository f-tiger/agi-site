import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const {chromium}=createRequire(new URL('../../../tools/revenue-studio/package.json',import.meta.url))('playwright');
const root=fileURLToPath(new URL('../dist/',import.meta.url));
const origin='https://baipiaoji.com';
const real=process.env.BPJ_REAL_GTAG;
const browser=await chromium.launch({headless:true,executablePath:process.env.WORKBENCH_CHROMIUM,args:['--no-sandbox','--disable-dev-shm-usage']});
async function fixture(routePath, mode='normal') {
  const context=await browser.newContext(),hits=[],errors=[];
  await context.addInitScript(mode=>{
    Object.defineProperty(navigator,'webdriver',{get:()=>mode==='webdriver'});
    if(mode==='dnt')Object.defineProperty(navigator,'doNotTrack',{get:()=> '1'});
    if(mode==='gpc')Object.defineProperty(navigator,'globalPrivacyControl',{get:()=>true});
    if(mode==='denied')localStorage.setItem('fleet_ga4_choice_v1','denied');
    if (window.top !== window.self) return;
    window.__focused=true; window.__visible=true;
    Object.defineProperty(document,'hasFocus',{value:()=>window.__focused});
    Object.defineProperty(document,'visibilityState',{get:()=>window.__visible?'visible':'hidden'});
    Object.defineProperty(document,'hidden',{get:()=>!window.__visible});
  },mode);
  await context.route('**/*',async route=>{
    const req=route.request(),u=new URL(req.url());
    if(u.hostname==='www.googletagmanager.com')return route.fulfill({contentType:'text/javascript',body:real?fs.readFileSync(real):''});
    if(u.hostname.endsWith('google-analytics.com')){hits.push({url:u.href,body:req.postData()||''});return route.fulfill({status:204});}
    if(u.origin!==origin || req.method()!=='GET')return route.abort();
    if(u.pathname==='/done')return route.fulfill({contentType:'text/html',body:'Done'});
    if(u.pathname.startsWith('/api/'))return route.fulfill({contentType:'application/json',body:'{"ok":true,"user":null,"available":false}'});
    const rel=u.pathname.endsWith('/')?u.pathname+'index.html':path.extname(u.pathname)?u.pathname:u.pathname+'.html';
    const file=path.join(root,rel);
    if(!fs.existsSync(file))return route.fulfill({status:404});
    return route.fulfill({body:fs.readFileSync(file),contentType:{'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json'}[path.extname(file)]||'text/html'});
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  if(!real)await page.clock.install();
  await page.goto(origin+routePath,{referer:'https://www.google.com/search?q=SECRET_REFERRER'});
  const rows=()=>page.evaluate(()=>Array.from(document.querySelector('iframe[title="Optional analytics"]')?.contentWindow.dataLayer||[]).map(x=>Array.from(x)));
  const engage=async()=> (await rows()).filter(x=>x[1]==='bpj_page_engagement');
  const blur=()=>page.evaluate(()=>{window.__focused=false;window.dispatchEvent(new Event('blur'));});
  return {context,page,hits,errors,rows,engage,blur};
}
try {
  for(const route of ['/tools/kimi','/en/tools/grok']) {
    const f=await fixture(route+'?private=SECRET_QUERY#SECRET_HASH');
    await f.page.waitForFunction(()=>document.querySelector('iframe[title="Optional analytics"]')?.contentWindow.dataLayer?.some(x=>x[0]==='config'));
    await f.page.evaluate(()=>{document.title='SECRET_TITLE';const input=document.createElement('input');input.value='SECRET_INPUT';document.body.append(input);});
    if(real) {
      await f.page.waitForTimeout(1800); await f.blur();
      await f.page.goto(origin+'/done'); await f.page.waitForTimeout(1200);
      const wire=f.hits.flatMap(h=>(h.body?h.body.split('\n'):['']).map(line=>Object.fromEntries(new URLSearchParams(new URL(h.url).search+'&'+line))));
      const engagement=wire.filter(x=>x.en==='bpj_page_engagement');
      assert.equal(engagement.length,1,JSON.stringify(wire));
      assert(Number(engagement[0]._et)>=1000 && Number(engagement[0]._et)<6000);
      assert.equal(engagement[0].dr,'https://www.google.com/'); assert.equal(engagement[0].dl,origin+route);
      assert.equal(wire.filter(x=>x.en==='page_view').length,1);
      assert(!JSON.stringify(wire).includes('SECRET'));
    } else {
      await f.page.clock.runFor(6000); assert.equal((await f.engage()).length,0,'No periodic keep-alive');
      await f.blur(); const first=(await f.engage())[0];assert(first);assert(first[2].engagement_time_msec>=6000);
      await f.page.evaluate(()=>{window.__visible=false;document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new Event('pagehide'));});
      assert.equal((await f.engage()).length,1,'blur/hide/navigation must not count the same interval again');
      await f.page.clock.runFor(20000);assert.equal((await f.engage()).length,1);
      await f.page.evaluate(()=>{window.__visible=true;window.__focused=true;window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));});
      await f.page.clock.runFor(3000);await f.blur();
      assert(Math.abs((await f.engage()).at(-1)[2].engagement_time_msec-3000)<100,'BFCache excludes suspended time');
      await f.page.evaluate(()=>{window.__focused=true;window.dispatchEvent(new Event('focus'));});
      await f.page.clock.runFor(2000);await f.page.locator('[data-analytics-choice="denied"]').click();
      await f.blur();assert.equal((await f.rows()).length,0,'Withdrawal removes the collector and discards pending duration');
      await f.page.clock.runFor(9000);await f.page.locator('[data-analytics-choice="granted"]').click();
      await f.page.waitForFunction(()=>document.querySelector('iframe[title="Optional analytics"]')?.contentWindow.dataLayer?.some(x=>x[0]==='config'));
      assert.equal((await f.rows()).filter(x=>x[1]==='page_view').length,0);
      await f.page.evaluate(()=>{window.__focused=true;window.dispatchEvent(new Event('focus'));});
      await f.page.clock.runFor(2500);await f.blur();
      const events=await f.engage();assert.equal(events.length,1);assert(Math.abs(events[0][2].engagement_time_msec-2500)<100,'No pre-opt-in replay');
      assert.equal(events[0][2].page_referrer,'https://www.google.com/');assert.equal(events[0][2].page_location,origin+route);
      assert.deepEqual(Object.keys(events[0][2]).sort(),['engagement_time_msec','page_location','page_referrer','page_title','send_to','transport_type']);
      assert(!JSON.stringify(events).includes('SECRET'));
    }
    assert.deepEqual(f.errors,[]);await f.context.close();
  }
  if(!real)for(const mode of ['denied','webdriver','dnt','gpc','qa','__qa','__ci','__probe','ci','verify','private']) {
    const route=mode==='private'?'/account?save=kimi':['qa','__qa','__ci','__probe','ci'].includes(mode)?'/tools/kimi?'+mode+'=1':mode==='verify'?'/tools/kimi?utm_source=verify':'/tools/kimi';
    const f=await fixture(route,mode);await f.page.clock.runFor(6000);await f.blur();
    assert.equal((await f.engage()).length,0,mode);assert.equal(await f.page.locator('iframe[title="Optional analytics"]').count(),0,mode);
    if(mode==='private')assert.equal(await f.page.locator('script[src*="bpj-engagement"]').count(),0);
    await f.context.close();
  }
  console.log(JSON.stringify({ok:true,realGoogleTag:!!real,collectionIntercepted:true,foregroundOnly:true,noKeepAlive:true,noPrivateMarkers:true,referrerOriginPreserved:true}));
} finally {await browser.close();}
