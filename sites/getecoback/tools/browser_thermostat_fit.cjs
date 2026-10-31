// All requests are intercepted. No production analytics or affiliate navigation.
const {createRequire}=require('node:module'),path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const requireTools=createRequire(path.resolve(__dirname,'../../../tools/revenue-studio/package.json'));
const {chromium}=requireTools('playwright');
const root=path.resolve(__dirname,'../site'),origin='https://getecoback.com',routePath='/guide/smarte-heizkoerperthermostate-lohnen-sich.html';
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']}: {})});let checks=0;
 const context=async options=>{
  const ctx=await browser.newContext(options);
  await ctx.route('**/*',route=>{
   const u=new URL(route.request().url());
   if(u.origin!==origin||u.pathname.startsWith('/api/'))return route.fulfill({status:204});
   const file=path.join(root,u.pathname+(u.pathname.endsWith('/')?'index.html':''));
   const mime={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json'};
   return fs.existsSync(file)?route.fulfill({contentType:mime[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)}):route.fulfill({status:404,body:'missing'});
  });
  await ctx.addInitScript(()=>{
   window.fixedEvents=[];window.copied=[];window.copyFail=false;
   window.addEventListener('fleet:business',event=>window.fixedEvents.push(event.detail));
   Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{if(window.copyFail)throw Error('denied');window.copied.push(text);}}});
  });return ctx;
 };
 try{
  const ctx=await context({viewport:{width:390,height:844}}),page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+routePath);await page.locator('[data-valve-check][data-ready=true]').waitFor();
  assert.equal((await page.evaluate(()=>window.fixedEvents)).filter(x=>x.name.startsWith('eco_valve')).length,0);checks++;
  const result=page.locator('[data-valve-result]');
  const reference=page.locator('[data-valve-check] details');assert.equal(await reference.getAttribute('open'),null);checks++;
  await page.selectOption('[name=valve-model]','tado-v3');await page.selectOption('[name=valve-connection]','herz-m28');
  assert.match(await result.innerText(),/Stiftverlängerung/);checks++;
  await page.selectOption('[name=valve-connection]','oventrop-uni-l');assert.match(await result.innerText(),/nicht im tado°-Lieferumfang/);checks++;
  await page.selectOption('[name=valve-connection]','oventrop-uni-lv');assert.match(await result.innerText(),/30,5-mm-Klemme/);checks++;
  await page.selectOption('[name=valve-model]','tado-x');assert.equal(await result.getAttribute('data-status'),'unverified');assert.match(await result.innerText(),/gelten hier nicht/);checks+=2;
  await page.selectOption('[name=valve-model]','tado-v3');await page.selectOption('[name=valve-connection]','manual-rtl');assert.equal(await result.getAttribute('data-status'),'stop');checks++;
  await page.selectOption('[name=valve-connection]','heimeier-m30');
  // Prevent navigation while preserving the explicit user click; no official request is made.
  await result.locator('a').evaluate(el=>el.addEventListener('click',e=>e.preventDefault()));await result.locator('a').click();
  await page.click('[data-valve-share]');assert.match(await page.locator('[data-valve-share-status]').innerText(),/Link kopiert/);
  let events=(await page.evaluate(()=>window.fixedEvents)).filter(x=>x.name.startsWith('eco_valve'));
  assert.equal(events.filter(x=>x.name==='eco_valve_official').length,1);assert.equal(events.filter(x=>x.name==='eco_valve_share').length,1);assert.ok(events.every(x=>Object.keys(x).join(',')==='name'));checks+=4;
  const share=await page.evaluate(()=>window.copied[0]);assert.equal(share,origin+routePath+'#ventilcheck=tado-v3:heimeier-m30');checks++;
  await page.evaluate(()=>window.copyFail=true);await page.click('[data-valve-share]');assert.match(await page.locator('[data-valve-share-status]').innerText(),/nicht verfügbar/);
  assert.equal(await page.evaluate(()=>window.fixedEvents.filter(x=>x.name==='eco_valve_share').length),1);checks+=2;
  await page.evaluate(()=>localStorage.setItem('fleet_ga4_choice_v1','denied'));let count=await page.evaluate(()=>window.fixedEvents.filter(x=>x.name.startsWith('eco_valve')).length);
  await page.selectOption('[name=valve-connection]','danfoss-ra');await page.evaluate(()=>window.copyFail=false);await page.click('[data-valve-share]');
  assert.equal(await page.evaluate(()=>window.fixedEvents.filter(x=>x.name.startsWith('eco_valve')).length),count);checks++;
  // Existing amortisation remains functional and separate from compatibility.
  await page.locator('[data-winter-tool="thermostat"] button[type=submit]').click();assert.match(await page.locator('[data-winter-tool] [data-result]').innerText(),/7,5/);checks++;
  await reference.locator('summary').click();assert.notEqual(await reference.getAttribute('open'),null);checks++;
  for(const width of [320,390,1280]){await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));checks++;if(width<620){assert(await page.locator('[data-valve-check] tbody th,[data-valve-check] tbody td').evaluateAll(cells=>cells.every(cell=>{const r=cell.getBoundingClientRect();return r.width>0&&r.left>=0&&r.right<=innerWidth;})));checks++;}}
  assert.deepEqual(errors,[]);checks++;await ctx.close();
  const sharedContext=await context({viewport:{width:390,height:844}}),sharedPage=await sharedContext.newPage();await sharedPage.goto(share);await sharedPage.locator('[data-valve-check][data-ready=true]').waitFor();
  assert.equal(await sharedPage.inputValue('[name=valve-connection]'),'heimeier-m30');assert.equal(await sharedPage.evaluate(()=>window.fixedEvents.filter(x=>x.name.startsWith('eco_valve')).length),0);checks+=2;await sharedContext.close();
  const nojs=await context({javaScriptEnabled:false,viewport:{width:320,height:844}}),fallback=await nojs.newPage();await fallback.goto(origin+routePath);
  assert.notEqual(await fallback.locator('[data-valve-check] details').getAttribute('open'),null);assert(await fallback.locator('[data-valve-check] tbody th,[data-valve-check] tbody td').evaluateAll(cells=>cells.every(cell=>{const r=cell.getBoundingClientRect();return r.width>0&&r.left>=0&&r.right<=innerWidth;})));checks+=2;assert.equal(await fallback.locator('[data-valve-controls]').isVisible(),false);assert.equal(await fallback.locator('[data-winter-tool=thermostat] form').isVisible(),false);checks++;assert.equal(await fallback.locator('[data-valve-check] table tbody tr').count(),6);assert.match(await fallback.locator('[data-valve-check]').innerText(),/Keine eigenen Montage/);assert(await fallback.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));checks+=4;await nojs.close();
  console.log(`PASS thermostat fit: ${checks} browser checks; sourced branches, preserved payback, no-input selectors, copy success/failure, opt-out, no payloads, no-JS, 320/390/1280px.`);
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
