// Fully intercepted proof: actual UI -> bounded first-party events and mock Google.
// No production event, customer input or merchant navigation leaves the fixture.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const site=path.resolve(__dirname,'../site'),origin='https://getecoback.com';
const dir=process.env.QA_DIR||'/tmp/eco-buyer-qa';
const routes=[['de','/guide/luftentfeuchter-ratgeber.html'],['en','/en/guide/dehumidifier-20-sqm.html']];
const excludedModes=['denied','dnt','gpc','probe','qa','ci','verify','webdriver'];
let checks=0;
const check=(ok,message)=>{assert.ok(ok,message);checks++;};
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(predicate,label){for(let i=0;i<100;i++){if(predicate())return;await pause(20);}assert.fail('Timed out: '+label);}
async function fixture(browser,pathname,mode='normal'){
 const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
 const google=[],events=[],errors=[],missing=[],merchants=[];
 await context.addInitScript(mode=>{
  Object.defineProperty(navigator,'webdriver',{get:()=>mode==='webdriver'});
  Object.defineProperty(navigator,'doNotTrack',{get:()=>mode==='dnt'?'1':'0'});
  Object.defineProperty(navigator,'globalPrivacyControl',{get:()=>mode==='gpc'});
  if(mode==='denied')localStorage.setItem('fleet_ga4_choice_v1','denied');
  // Existing dismissed promotion state keeps unrelated timed overlays from
  // intercepting the actual evidence and analytics settings interactions.
  localStorage.setItem('eb_pu_seen',String(Date.now()));
 },mode);
 await context.route('**/*',async route=>{
  const request=route.request(),u=new URL(request.url());
  if(u.hostname==='www.googletagmanager.com')return route.fulfill({contentType:'text/javascript',body:`const emit=a=>{if(a[0]==='event')fetch('https://www.google-analytics.com/g/collect',{method:'POST',body:JSON.stringify([a[1],a[2]])});};window.dataLayer.forEach(emit);const push=window.dataLayer.push.bind(window.dataLayer);window.dataLayer.push=(...args)=>{args.forEach(emit);return push(...args);};`});
  if(u.hostname.endsWith('google-analytics.com')){google.push(JSON.parse(request.postData()));return route.fulfill({status:204});}
  if(u.origin!==origin){if(/amazon\./.test(u.hostname))merchants.push(u.href);return route.abort();}
  if(u.pathname.startsWith('/api/')||u.pathname==='/auth/status'){
   if(u.pathname==='/api/ev'){try{events.push(JSON.parse(request.postData()));}catch{}}
   return route.fulfill({contentType:'application/json',body:'{"ok":true,"user":null}'});
  }
  if(request.method()!=='GET')throw Error('Unexpected fixture method: '+request.method());
  const rel=u.pathname.endsWith('/')?u.pathname+'index.html':u.pathname,file=path.join(site,rel);
  const types={'.mjs':'text/javascript','.js':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.woff2':'font/woff2'};
  if(!fs.existsSync(file)){missing.push(u.pathname);return route.fulfill({status:404,body:'Missing fixture'});}
  return route.fulfill({contentType:types[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
 });
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 const query={probe:'__probe=1',qa:'qa=1',ci:'__ci=1',verify:'utm_source=verify'}[mode]||'private_test=DO_NOT_SHARE';
 await page.goto(origin+pathname+'?'+query+'#private-fragment');
 const root=page.locator('#eb-moisture-choice'),form=root.locator('form');await form.waitFor({state:'visible'});
 await root.scrollIntoViewIfNeeded();
 // Keep the genuine trusted click and all listeners, but prevent merchant navigation.
 await root.evaluate(node=>node.addEventListener('click',event=>{if(event.target.closest('a'))event.preventDefault();}));
 return {context,page,root,form,google,events,errors,missing,merchants};
}
async function choose(f,purpose='room',temperature='warm'){
 for(const [key,value] of Object.entries({purpose,humidity:'high',temperature,market:'de'}))await f.form.locator('[name='+key+']').selectOption(value);
 await f.form.locator('[type=submit]').click();
}
const buyer=f=>f.events.filter(e=>e?.n?.startsWith('buyer_'));
const evidence=f=>buyer(f).filter(e=>e.n==='buyer_next'&&e.m.action==='evidence');
function privacyShape(f,lang,pathname){
 for(const event of buyer(f)){
  assert.deepEqual(Object.keys(event.m).sort(),['action','choice','lang'],'first-party metadata is exactly categorical');
  assert.equal(event.m.lang,lang);assert.equal(event.p,pathname);
  check(!JSON.stringify(event.m).includes('Meaco')&&!JSON.stringify(event.m).includes('Comfee')&&!JSON.stringify(event).includes('DO_NOT_SHARE'),'no model, inputs or URL query in buyer metadata');
  if(event.m.action==='evidence')check(['compare','laundry'].includes(event.m.choice),'evidence limited to candidate results');
 }
 for(const [name,fields] of f.google){
  if(name==='buyer_result'){
   assert.equal(fields.tool_id,pathname.slice(1).replace(/\.html$/,''));
   for(const forbidden of ['humidity','temperature','purpose','choice','action','market','model','link_url'])check(!Object.hasOwn(fields,forbidden),'GA4 completion excludes '+forbidden);
  }
  if(name==='affiliate_click')for(const forbidden of ['humidity','temperature','purpose','choice','action','model','link_url'])check(!Object.hasOwn(fields,forbidden),'GA4 affiliate excludes '+forbidden);
  check(!JSON.stringify(fields).includes('DO_NOT_SHARE')&&!JSON.stringify(fields).includes('private-fragment'),'GA4 never receives query or fragment');
 }
 check(!f.google.some(([name])=>['buyer_next','buyer_evidence','evidence'].includes(name)),'evidence must not introduce a GA4 event');
}
(async()=>{
 fs.mkdirSync(dir,{recursive:true});
 const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),headless:true,args:['--no-sandbox']});
 const report=[];
 try{
  for(const [lang,pathname] of routes){
   const f=await fixture(browser,pathname),{page,root,form}=f;
   assert.equal(await page.locator('#fleet-analytics-choice').count(),0,'no consent popup');checks++;
   await page.waitForFunction(()=>document.querySelector('iframe[title="Optional analytics"]')?.contentWindow.dataLayer?.length>0);
   // The static method and hidden candidate details are not an evidence action.
   await root.locator('[data-choice-method] > summary').click();
   await root.locator('[data-answer=compare] [data-choice-evidence]').first().evaluate(node=>node.open=true);
   await pause(50);assert.equal(evidence(f).length,0,'hidden/unselected evidence is not counted');checks++;
   if(lang==='en'){
    assert.equal(await form.locator('[name=market]').inputValue(),'other');
    await form.locator('[name=humidity]').selectOption('high');await form.locator('[name=temperature]').selectOption('warm');await form.locator('[type=submit]').click();
    assert.equal(await root.locator('[data-choice-evidence]:visible').count(),0,'EN default has no German model evidence cards');
    await root.locator('[data-answer=compare] [data-choice-evidence]').first().evaluate(node=>node.open=true);
    await pause(50);assert.equal(evidence(f).length,0,'hidden market evidence is not counted');checks+=3;
   }
   await choose(f);await until(()=>f.google.filter(h=>h[0]==='buyer_result').length===1,'one comparison GA4 result');
   await until(()=>buyer(f).filter(e=>e.n==='buyer_result'&&e.m.choice==='compare').length===1,'one comparison first-party result');
   await form.locator('[type=submit]').click();await pause(50);
   assert.equal(f.google.filter(h=>h[0]==='buyer_result').length,1,'same result is not counted twice');checks++;
   const details=root.locator('[data-answer=compare] [data-choice-evidence]');
   await details.nth(0).locator('summary').click();await until(()=>evidence(f).length===1,'first evidence inspection');
   await details.nth(0).locator('summary').click();await details.nth(0).locator('summary').click();await details.nth(1).locator('summary').click();
   await root.locator('[data-choice-method] > summary').click();await pause(50);
   assert.deepEqual(evidence(f).map(e=>e.m),[{lang,choice:'compare',action:'evidence'}],'two cards and repeated toggles share one bounded action');checks++;
   await choose(f,'laundry');
   assert.equal(await root.locator('[data-choice-evidence][open]').count(),0,'answer changes close stale evidence');checks++;
   await root.locator('[data-answer=laundry] [data-choice-evidence]').first().locator('summary').click();
   await until(()=>evidence(f).length===2,'laundry evidence is a distinct result action');
   assert.deepEqual(evidence(f).map(e=>e.m),[{lang,choice:'compare',action:'evidence'},{lang,choice:'laundry',action:'evidence'}]);checks++;
   await root.locator('[data-choice-action=shop]:visible').first().click();
   await until(()=>f.google.filter(h=>h[0]==='affiliate_click').length===1,'single GA4 merchant click');
   await pause(800); // Existing first-party affiliate tracker flushes its coalesced event at 700 ms.
   assert.equal(f.google.filter(h=>h[0]==='affiliate_click').length,1,'one click must remain one GA4 affiliate event');
   assert.equal(f.events.filter(e=>e?.n==='affiliate_click').length,1,'one coalesced first-party affiliate event');
   assert.equal(buyer(f).filter(e=>e.n==='buyer_next'&&e.m.action==='shop').length,1,'one buyer shop action');checks+=3;
   privacyShape(f,lang,pathname);
   // A late opt-out must suppress new result types and evidence actions too.
   await page.locator('[data-analytics-choice=denied]').click();
   const googleBefore=f.google.length,buyerBefore=buyer(f).length;
   await choose(f,'room','cold');await choose(f,'room','warm');
   await root.locator('[data-answer=compare] [data-choice-evidence]').first().locator('summary').click();
   await root.locator('[data-choice-action=shop]:visible').first().click();await pause(100);
   assert.equal(f.google.length,googleBefore,'withdrawal suppresses subsequent Google events');
   assert.equal(buyer(f).length,buyerBefore,'withdrawal suppresses subsequent buyer events');checks+=2;
   assert.deepEqual(f.errors,[]);assert.deepEqual(f.missing,[]);assert.deepEqual(f.merchants,[]);checks+=3;
   report.push({lang,pathname,mode:'normal-and-withdrawal',evidenceActions:2,affiliateClicks:1});await f.context.close();
  }
  for(const [lang,pathname] of routes)for(const mode of excludedModes){
   const f=await fixture(browser,pathname,mode);await choose(f);
   await f.root.locator('[data-answer=compare] [data-choice-evidence]').first().locator('summary').click();
   await f.root.locator('[data-choice-action=shop]:visible').first().click();await pause(100);
   assert.equal(buyer(f).length,0,lang+' '+mode+' suppresses buyer view/result/next');
   assert.equal(f.google.length,0,lang+' '+mode+' suppresses Google events');
   assert.equal(await f.page.locator('iframe[title="Optional analytics"]').count(),0,lang+' '+mode+' never loads Google frame');
   assert.deepEqual(f.errors,[],lang+' '+mode+' page errors');assert.deepEqual(f.missing,[]);assert.deepEqual(f.merchants,[]);checks+=6;
   report.push({lang,pathname,mode,buyerEvents:0,googleEvents:0});await f.context.close();
  }
  fs.writeFileSync(path.join(dir,'buyer-analytics-browser.json'),JSON.stringify({pass:true,checks,scenarios:report},null,2));
  console.log(JSON.stringify({pass:true,checks,normalRoutes:routes.length,privacyCases:routes.length*excludedModes.length,productionRequests:0}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
