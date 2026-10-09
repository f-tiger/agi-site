// All requests are locally fulfilled or aborted, including the Google transport
// stub. This checks frontend routing, not production GA4 backend receipt.
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(process.env.ECO_TEST_ROOT||path.join(__dirname,'../site'));
const origin='https://getecoback.com',id='G-E2V0Q9SJ9V';
const paths={de:'/waeschetrockner-oder-luftentfeuchter.html',en:'/en/guide/dehumidifier-drying-clothes-cost.html'};
const types={'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'};
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
 let checks=0;
 async function fixture(lang,{query='',choice='',privacy={},holdConsent=false,holdCollector=false}={}){
  const context=await browser.newContext({serviceWorkers:'block',viewport:{width:390,height:844}}),ga=[],d1=[],errors=[];let holdFirstCollector=holdCollector;
  await context.addInitScript(({choice,privacy})=>{
   for(const [key,value]of Object.entries({webdriver:false,...privacy}))Object.defineProperty(navigator,key,{get:()=>value});
   // Seed only the top-level visit. Same-origin analytics frames must not
   // rewrite this choice and trigger withdrawal via the parent's storage event.
   if(choice&&window===window.top)localStorage.setItem('fleet_ga4_choice_v1',choice);
   window.__laundryBusiness=[];window.addEventListener('fleet:business',e=>window.__laundryBusiness.push(e.detail));
   window.addEventListener('message',e=>{if(e.isTrusted&&e.origin==='https://getecoback.com'&&e.source===document.querySelector('iframe[title="Optional analytics"]')?.contentWindow&&e.data?.type==='fleet-ga4-started')window.__laundryStartedFrame=e.source;});
  },{choice,privacy});
  await context.route('**/*',async r=>{
   const req=r.request(),u=new URL(req.url());
   if(u.hostname==='www.googletagmanager.com'&&u.pathname==='/gtag/js')return r.fulfill({contentType:'text/javascript',body:`const send=a=>{if(a[0]==='event')fetch('https://www.google-analytics.com/g/collect',{method:'POST',body:JSON.stringify({name:a[1],fields:a[2]})});};for(const a of window.dataLayer||[])send(a);const push=window.dataLayer.push.bind(window.dataLayer);window.dataLayer.push=(...items)=>{items.forEach(send);return push(...items);};`});
   if(u.hostname==='www.google-analytics.com'&&u.pathname==='/g/collect'){ga.push(JSON.parse(req.postData()));return r.fulfill({status:204});}
   if(u.origin!==origin)return r.abort();
   if(u.pathname.startsWith('/api/')){if(u.pathname==='/api/ev'){try{d1.push(JSON.parse(req.postData()));}catch{}}return r.fulfill({contentType:'application/json',body:'{"ok":true}'});}
   let rel=u.pathname.slice(1);if(!rel||rel.endsWith('/'))rel+='index.html';else if(!path.extname(rel))rel+='.html';
   const f=path.resolve(root,rel);if(!f.startsWith(root+path.sep)||!fs.existsSync(f))return r.fulfill({status:404,body:'missing fixture'});
   const body=fs.readFileSync(f);if(holdFirstCollector&&u.pathname==='/analytics-assets/collector.mjs'){holdFirstCollector=false;return r.fulfill({contentType:'text/javascript',body:`await new Promise(resolve=>window.parent.__releaseLaundryCollector=resolve);\n${body}`});}return r.fulfill({contentType:types[path.extname(f)]||'application/octet-stream',body:holdConsent&&u.pathname==='/analytics-assets/consent.mjs'?`await new Promise(resolve=>window.__releaseLaundryAnalytics=resolve);\n${body}`:body});
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(origin+paths[lang]+query,{referer:'https://www.google.com/search?q=SECRET_REFERRER',waitUntil:'commit'});await page.locator('#eco-tool-experience[data-ready="true"]').waitFor();
  const calc=page.locator('#laundry-check'),submit=()=>calc.locator('[type=submit]').click();
  const settle=()=>page.waitForTimeout(100),until=async predicate=>{for(let n=0;n<50;n++){if(predicate())return;await page.waitForTimeout(100);}assert(predicate(),'Timed out waiting for intercepted analytics');};
  const events=()=>ga.filter(e=>['tool_complete','tool_export'].includes(e.name)),first=()=>d1.filter(e=>e?.n?.startsWith('laundry_'));
  const ready=()=>page.waitForFunction(()=>{const frame=document.querySelector('iframe[title="Optional analytics"]');return frame&&window.__laundryStartedFrame===frame.contentWindow;});
  const download=async selector=>{const pending=page.waitForEvent('download');await calc.locator(selector).click();await pending;await settle();};
  return {context,page,calc,submit,settle,until,ga,d1,events,first,errors,ready,download};
 }
 try{
  for(const lang of ['de','en']){
   const f=await fixture(lang,{query:'?private=SECRET_QUERY#SECRET_FRAGMENT'}),{page,calc}=f;await f.ready();await calc.scrollIntoViewIfNeeded();await f.settle();
   assert.equal(f.events().length,0,'automatic preview is not a completion');checks++;
   await calc.locator('form').evaluate(form=>form.requestSubmit());await page.waitForTimeout(10);await calc.locator('form').evaluate(form=>form.requestSubmit());await calc.locator('[data-csv]').evaluate(el=>el.click());await f.settle();assert.equal(f.events().length,0,'programmatic trusted submit and synthetic export are not visitor actions');checks++;
   await calc.locator('[name=method]').selectOption('measured');await calc.locator('[name=comparable]').check();await calc.locator('[data-csv]').evaluate(el=>el.click());await f.settle();assert.equal(f.events().length,0,'stale result cannot export');checks++;
   await calc.locator('[name=dryer]').fill('21');await f.submit();await f.settle();assert.equal(f.events().length,0,'math validation failure is not a completion');checks++;
   await calc.locator('[name=dryer]').fill('1.5');await f.submit();await f.until(()=>f.events().length===1);assert.equal(f.events()[0].name,'tool_complete');assert.equal(f.first().at(-1).m.input,'example','mode/equality alone is not an input edit');checks++;
   await calc.locator('[name=dehum]').fill('1.234567');await f.submit();await f.submit();await f.settle();assert.equal(f.events().length,1);assert.equal(f.first().at(-1).m.input,'edited');checks++;
   for(const selector of ['[data-csv]','[data-card]'])for(let n=0;n<2;n++)await f.download(selector);
   assert.deepEqual(f.events().map(e=>e.name),['tool_complete','tool_export'],'CSV and PNG share one per-page generic export');assert.deepEqual([...new Set(f.first().filter(e=>e.n==='laundry_export').map(e=>e.m.action))].sort(),['card','csv']);checks++;
   await calc.locator('[data-share]').click();await page.evaluate(()=>document.querySelector('[data-laundry-next]').addEventListener('click',e=>e.preventDefault()));await calc.locator('[data-laundry-next]').click();await f.settle();assert.equal(f.events().length,2);assert(!f.ga.some(e=>e.name.startsWith('laundry_')),'detailed states remain in D1');checks++;
   for(const e of f.events()){
    assert.equal(e.fields.send_to,id);assert.equal(e.fields.tool_id,paths[lang].slice(1).replace(/\.html$/,''));assert.equal(e.fields.page_location,origin+paths[lang]);
    assert.deepEqual(Object.keys(e.fields).sort(),['send_to','tool_id','page_location','page_title','page_referrer'].sort());assert.equal(e.fields.page_referrer,'https://www.google.com/');
   }
   const details=await page.evaluate(()=>window.__laundryBusiness.filter(e=>e.name.startsWith('legacy:tool_')));assert.equal(details.length,2);for(const detail of details)assert.deepEqual(Object.keys(detail),['name']);
   assert(!JSON.stringify(f.ga).includes('SECRET'));assert(!JSON.stringify(f.ga).includes('1.23456'));assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(f.errors,[]);checks+=4;await f.context.close();
  }
  // Native/preset examples have one event owner and never automatically complete.
  for(const lang of ['de','en']){
   const f=await fixture(lang);await f.ready();await f.calc.locator('[data-example]').click();await f.until(()=>f.ga.filter(e=>e.name==='eco_tool_example').length===1);assert.equal(f.events().length,0);checks++;
   await f.page.locator('#eco-tool-experience > .eco-actions').first().locator('button').nth(1).click();await f.until(()=>f.ga.filter(e=>e.name==='eco_tool_example').length===2);assert.equal(f.events().length,0);assert.equal(await f.calc.locator('[name=price]').inputValue(),'0.2');checks++;
   // Explicit actions on preset input count as actions, without asserting authorship.
   await f.calc.locator('[name=hours]').press('Enter');await f.until(()=>f.events().some(e=>e.name==='tool_complete'));await f.download('[data-csv]');assert.deepEqual(f.events().map(e=>e.name),['tool_complete','tool_export']);assert.deepEqual(f.errors,[]);checks++;await f.context.close();
   const values={dryer:'1.5',dryerBasis:'cycle',method:'estimate',watts:'250',hours:'5',dehum:'2',price:'0.4',loads:'3',purchase:'0',currency:'EUR',comparable:false};
   const shared=await fixture(lang,{query:'#eco-v1='+encodeURIComponent(JSON.stringify({path:paths[lang],values}))});await shared.ready();await shared.settle();assert.equal(await shared.calc.locator('[name=hours]').inputValue(),'5');assert.equal(shared.events().length,0);assert.equal(shared.ga.filter(e=>e.name==='eco_tool_example').length,0);checks++;
   await shared.submit();await shared.until(()=>shared.events().length===1);await shared.download('[data-csv]');assert.deepEqual(shared.events().map(e=>e.name),['tool_complete','tool_export']);assert.deepEqual(shared.errors,[]);checks++;await shared.context.close();
  }
  // Denied or pre-channel operations are not replayed or consumed by local dedup.
  for(const holdConsent of [false,true]){
   console.log('Laundry channel availability:',holdConsent?'delayed consent module':'stored denial then grant');
   const f=await fixture('en',holdConsent?{holdConsent:true}:{choice:'denied'});await f.calc.locator('[name=hours]').fill('4');await f.submit();await f.download('[data-csv]');assert.equal(f.events().length,0);checks++;
   if(holdConsent){await f.page.waitForFunction(()=>typeof window.__releaseLaundryAnalytics==='function');await f.page.evaluate(()=>window.__releaseLaundryAnalytics());}else await f.page.locator('[data-analytics-choice="granted"]').click();
   await f.ready();await f.settle();assert.equal(f.events().length,0,'no replay on availability');await f.submit();await f.until(()=>f.events().length===1);await f.download('[data-csv]');assert.equal(f.events().length,2);checks++;
   await f.page.locator('[data-analytics-choice="denied"]').click();await f.calc.locator('[name=hours]').fill('5');await f.submit();await f.download('[data-csv]');await f.page.locator('[data-analytics-choice="granted"]').click();await f.ready();await f.submit();await f.download('[data-csv]');assert.equal(f.events().length,2,'dedup survives regrant for already-counted actions');assert.equal(f.ga.filter(e=>e.name==='page_view').length,1);assert.deepEqual(f.errors,[]);checks++;await f.context.close();
  }
  // An inserted frame is not ready: withdrawal discards its pending queue.
  {
   const f=await fixture('en',{holdCollector:true});await f.page.waitForFunction(()=>typeof window.__releaseLaundryCollector==='function');
   await f.submit();await f.download('[data-csv]');assert.equal(f.events().length,0);assert.equal(await f.page.evaluate(()=>window.__laundryBusiness.filter(e=>e.name.startsWith('legacy:tool_')).length),0,'unstarted frame must not consume local dedup');checks++;
   await f.page.locator('[data-analytics-choice="denied"]').click();await f.page.locator('[data-analytics-choice="granted"]').click();await f.ready();await f.settle();assert.equal(f.events().length,0,'discarded startup actions are never replayed');checks++;
   await f.submit();await f.until(()=>f.events().length===1);await f.download('[data-csv]');assert.deepEqual(f.events().map(e=>e.name),['tool_complete','tool_export']);assert.deepEqual(f.errors,[]);checks++;await f.context.close();
  }
  // Async PNG completion is discarded on failure, stale inputs or withdrawal.
  {
   const f=await fixture('en');await f.ready();await f.calc.locator('[name=hours]').fill('4');await f.submit();await f.until(()=>f.events().length===1);
   await f.page.evaluate(()=>{window.__originalLaundryToBlob=HTMLCanvasElement.prototype.toBlob;HTMLCanvasElement.prototype.toBlob=function(done){window.__finishLaundryPNG=done;};});
   await f.calc.locator('[data-card]').click();await f.page.evaluate(()=>window.__finishLaundryPNG(null));await f.settle();assert.equal(f.events().length,1);checks++;
   await f.calc.locator('[data-card]').click();await f.calc.locator('[name=hours]').fill('5');await f.page.evaluate(()=>window.__finishLaundryPNG(new Blob(['stale'])));await f.settle();assert.equal(f.events().length,1);checks++;
   await f.submit();await f.calc.locator('[data-card]').click();await f.page.locator('[data-analytics-choice="denied"]').click();await f.page.locator('[data-analytics-choice="granted"]').click();await f.ready();await f.page.evaluate(()=>window.__finishLaundryPNG(new Blob(['withdrawn'])));await f.settle();assert.equal(f.events().length,1);checks++;
   await f.page.evaluate(()=>{HTMLCanvasElement.prototype.toBlob=window.__originalLaundryToBlob;});await f.download('[data-card]');assert.equal(f.events().length,2);assert.deepEqual(f.errors,[]);checks++;await f.context.close();
  }
  for(const lang of ['de','en'])for(const options of [{query:'?__probe=1'},{query:'?__qa=1'},{privacy:{doNotTrack:'1'}},{privacy:{globalPrivacyControl:true}},{privacy:{webdriver:true}}]){
   const f=await fixture(lang,options);await f.calc.scrollIntoViewIfNeeded();await f.submit();await f.download('[data-csv]');assert.equal(f.ga.length,0);assert.equal(f.first().length,0);
   if(options.query==='?__probe=1')assert.equal(f.d1.length,0,'__probe suppresses every /api/ev request: '+JSON.stringify(f.d1.map(e=>e?.n)));
   assert.deepEqual(f.errors,[]);checks++;await f.context.close();
  }
  console.log(JSON.stringify({pass:true,checks,definition:'visitor-initiated valid calculation/export, not measured or self-entered data',network:'all requests fulfilled locally or aborted',realGoogleTag:false,backendReceiptVerified:false}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
