// Local fixtures only. Exercise the calculator when scripts fail or arrive late.
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const site=path.resolve(__dirname,'../site'),origin='https://getecoback.com';
const dir=process.env.QA_DIR||'/tmp/eco-laundry-readiness';
const launch=process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage']}:{};
let checks=0;const check=(ok,message)=>{assert.ok(ok,message);checks++;};

(async()=>{
 fs.mkdirSync(dir,{recursive:true});const browser=await chromium.launch({headless:true,...launch});
 const cases=[];
 try{
  for(const [lang,pathname] of [['de','/waeschetrockner-oder-luftentfeuchter.html'],['en','/en/guide/dehumidifier-drying-clothes-cost.html']]){
   for(const failure of ['no-js','module','dependency','delayed']){
    const context=await browser.newContext({javaScriptEnabled:failure!=='no-js',viewport:{width:390,height:844},serviceWorkers:'block'});
    const navigations=[],events=[],errors=[];let release;
    const delayed=new Promise(resolve=>release=resolve);
    await context.addInitScript(()=>{Object.defineProperty(navigator,'doNotTrack',{get:()=> '1'});});
    await context.route('**/*',async route=>{
     const request=route.request(),u=new URL(request.url());
     if(u.origin!==origin)return route.abort();
     if(u.pathname.startsWith('/api/')){events.push({path:u.pathname,body:request.postData()});return route.fulfill({contentType:'application/json',body:'{"ok":true,"user":null}'});}
     if(request.isNavigationRequest())navigations.push(u.href);
     if((failure==='module'&&u.pathname.endsWith('/laundry-check.mjs'))||(failure==='dependency'&&u.pathname.endsWith('/laundry-math.mjs')))return route.abort();
     if(failure==='delayed'&&u.pathname.endsWith('/laundry-math.mjs'))await delayed;
     const file=path.join(site,u.pathname.endsWith('/')?u.pathname+'index.html':u.pathname);
     if(!fs.existsSync(file))return route.fulfill({status:404,body:'Missing fixture'});
     const mime={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};
     return route.fulfill({contentType:mime[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
    });
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    await page.goto(origin+pathname+'?__probe=1',{waitUntil:failure==='delayed'?'commit':'load'});
    const root=page.locator('#laundry-check'),fallback=root.locator('[data-laundry-fallback]'),form=root.locator('form');
    await fallback.waitFor({state:'visible'});
    check(await form.isHidden(),`${lang}/${failure}: no premature input form`);
    check(await form.getAttribute('inert')!==null,`${lang}/${failure}: inert form`);
    for(const selector of ['[name=dryer]','[type=submit]','[data-example]','[data-share]'])check(await root.locator(selector).isDisabled(),`${lang}/${failure}: ${selector} disabled`);
    check((await fallback.innerText()).includes(lang==='de'?'0,525':'0.525'),`${lang}/${failure}: useful worked example`);
    check((await fallback.innerText()).includes(lang==='de'?'keine Produktmessung':'not a product measurement'),`${lang}/${failure}: honest provenance`);
    for(const width of [320,390,1280]){
     await page.setViewportSize({width,height:900});
     check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${lang}/${failure}/${width}: no horizontal overflow`);
    }
    await page.setViewportSize({width:390,height:844});
    if(failure==='no-js')await root.screenshot({path:path.join(dir,`laundry-${lang}-fallback.png`)});
    if(failure==='delayed'){
     // While the dependency is pending the user can already read the fallback.
     release();await page.waitForSelector('#laundry-check[data-laundry-ready="true"]');
     check(await fallback.isHidden(),`${lang}: remove fallback after readiness`);
     check(await form.isVisible(),`${lang}: reveal the working form`);
     check(await form.getAttribute('inert')===null,`${lang}: remove inert state`);
     check(await root.locator('[data-example]').isEnabled(),`${lang}: example enabled`);
     check(await root.locator('[data-share]').isEnabled(),`${lang}: share enabled`);
     await root.locator('[data-example]').focus();await page.keyboard.press('Enter');
     check(await root.locator('[data-results]').isVisible(),`${lang}: keyboard example calculates`);
     check(await root.locator('[data-results]').evaluate(e=>document.activeElement===e),`${lang}: explicit calculation focuses result`);
     await root.locator('[name=hours]').fill('4');
     check(await root.locator('[data-results]').isHidden(),`${lang}: stale result hidden after edit`);
     await root.locator('[type=submit]').click();
     check((await root.locator('[data-verdict]').innerText()).includes(lang==='de'?'Entfeuchter verursacht':'dehumidifier costs less'),`${lang}: recalculation works`);
     check(errors.length===0,`${lang}: no healthy module error: ${errors.join('; ')}`);
     await root.screenshot({path:path.join(dir,`laundry-${lang}-ready.png`)});
    }else{
     // The useful fallback is keyboard navigable, without a form submission.
     await fallback.locator('a').focus();await page.keyboard.press('Enter');
     await page.waitForURL('**#lc-measurement');
     check(new URL(page.url()).hash==='#lc-measurement',`${lang}/${failure}: measurement handoff`);
     await root.locator('#lc-measurement summary').click();
     check(await root.locator('#lc-measurement ol').isVisible(),`${lang}/${failure}: checklist readable`);
    }
    check(navigations.length===1,`${lang}/${failure}: no native GET navigation`);
    check(navigations.every(href=>new URL(href).search==='?__probe=1'),`${lang}/${failure}: no input values in URL`);
    // The legacy inline page tracker may request a pageview. All requests are
    // intercepted here; only its exact input-free shape is allowed. No laundry
    // action or calculation input may be sent while exercising these QA cases.
    for(const event of events.filter(e=>e.path==='/api/ev')){
     assert.deepEqual(JSON.parse(event.body),{n:'page_view',p:pathname,r:'',m:null});checks++;
    }
    check(events.filter(e=>e.path==='/api/ev').length<=1,`${lang}/${failure}: no duplicate pageview or calculator event`);
    cases.push({lang,failure,navigations:navigations.length,pass:true});
    await context.close();
   }
  }
 }finally{await browser.close();}
 const receipt={pass:true,checks,cases};fs.writeFileSync(path.join(dir,'laundry-readiness.json'),JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt));
})().catch(e=>{console.error(e);process.exit(1);});
