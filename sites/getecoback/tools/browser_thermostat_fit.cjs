// All requests are intercepted. No production analytics or affiliate navigation.
const {createRequire}=require('node:module'),path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const requireTools=createRequire(path.resolve(__dirname,'../../../tools/revenue-studio/package.json'));
const {chromium}=requireTools('playwright');
const root=path.resolve(__dirname,'../site'),origin='https://getecoback.com',routePath='/guide/smarte-heizkoerperthermostate-lohnen-sich.html';
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']}: {})});let checks=0;
 const context=async (options,onPackageRequest)=>{
  const ctx=await browser.newContext(options);
  await ctx.route('**/*',route=>{
   const u=new URL(route.request().url());
   if(onPackageRequest&&u.origin===origin&&u.pathname==='/api/ev'){
    const raw=route.request().postData();
    if(raw&&raw.includes('eco_thermostat_package_')){
     onPackageRequest({method:route.request().method(),url:u.href,body:JSON.parse(raw)});
    }
   }
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
 async function checkPackageEvents(){
  const received=[];
  const viewport={width:390,height:844};
  const packages=[
   ['bosch-ii-m-danfoss-adapter','thermostat-bosch-ii-m','eco_thermostat_package_bosch'],
   ['fritz-302-danfoss-adapter','thermostat-fritz-302','eco_thermostat_package_fritz'],
  ];
  const link=(page,[source,target])=>page.locator('#'+source+' a[href="#'+target+'"]');
  const human=await context({viewport},request=>received.push(request));
  await human.addInitScript(()=>Object.defineProperty(navigator,'webdriver',{get:()=>false}));
  const base=origin+routePath;
  const ready=async(page,url)=>{
   await page.goto(url);
   await page.locator('[data-valve-check][data-ready=true]').waitFor();
  };
  const page=await human.newPage();
  await ready(page,base+'#thermostat-bosch-ii-m');
  await link(page,packages[0]).evaluate(anchor=>anchor.click());
  await page.waitForLoadState('networkidle');
  assert.deepEqual(received,[],'A shared fragment and a scripted click produce no package action');
  for(const item of packages){
   const [,target,name]=item;
   const captured=page.waitForRequest(request=>
    request.url()===origin+'/api/ev'&&(request.postData()||'').includes(name),{timeout:5000});
   if(item===packages[0])await link(page,item).press('Enter');
   else await link(page,item).click();
   await captured;
   await page.waitForURL(base+'#'+target);
   await link(page,item).press('Enter');
  }
  await page.waitForLoadState('networkidle');
  assert.deepEqual(received,packages.map(([, ,name])=>({
   method:'POST',url:origin+'/api/ev',body:{n:name,p:routePath},
  })),'Two trusted package handoffs carry only fixed fields and deduplicate per document');
  checks+=2;
  await page.close();
  for(const mode of ['dnt','gpc','opt-out','probe','automation']){
   const automated=mode==='automation';
   const ctx=automated?await context({viewport},request=>received.push(request)):human;
   const quiet=await ctx.newPage();
   await quiet.addInitScript(mode=>{
    if(mode==='dnt')Object.defineProperty(navigator,'doNotTrack',{get:()=>'1'});
    if(mode==='gpc')Object.defineProperty(navigator,'globalPrivacyControl',{get:()=>true});
    if(mode==='opt-out')localStorage.setItem('fleet_ga4_choice_v1','denied');
    else localStorage.removeItem('fleet_ga4_choice_v1');
   },mode);
   const url=base+(mode==='probe'?'?__probe=1':'');
   await ready(quiet,url+'#'+packages[0][0]);
   await link(quiet,packages[0]).press('Enter');
   await quiet.waitForURL(url+'#'+packages[0][1]);
   await quiet.waitForLoadState('networkidle');
   assert.equal(received.length,2,mode+' must suppress package events while navigation works');
   checks++;
   await quiet.close();
   if(automated)await ctx.close();
  }
  await human.close();
 }
 try{
  await checkPackageEvents();
  const ctx=await context({viewport:{width:390,height:844}}),page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+routePath+'#danfoss-altventil');await page.locator('[data-valve-check][data-ready=true]').waitFor();
  const oldValve=page.locator('section[aria-labelledby=danfoss-altventil]');
  assert.match(await oldValve.innerText(),/RA-click.*34 mm bei RAV.*26 mm bei RAVL/s);
  assert.equal(await page.locator('#danfoss-altventil').evaluate(heading=>getComputedStyle(heading).scrollMarginTop),'260px');
  assert.equal(await page.locator('#valve-model').inputValue(),'unknown');
  assert.equal(await page.locator('#valve-connection').inputValue(),'unknown');
  assert.equal(await oldValve.locator('a[rel~=sponsored]').count(),0);
  checks+=5;
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
  for(const width of [320,390,1280]){await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));checks++;if(width<620){assert(await page.locator('[data-valve-check] details tbody th,[data-valve-check] details tbody td').evaluateAll(cells=>cells.every(cell=>{const r=cell.getBoundingClientRect();return r.width>0&&r.left>=0&&r.right<=innerWidth;})));checks++;}}
  assert.deepEqual(errors,[]);checks++;await ctx.close();
  const sharedContext=await context({viewport:{width:390,height:844}}),sharedPage=await sharedContext.newPage();await sharedPage.goto(share);await sharedPage.locator('[data-valve-check][data-ready=true]').waitFor();
  assert.equal(await sharedPage.inputValue('[name=valve-connection]'),'heimeier-m30');assert.equal(await sharedPage.evaluate(()=>window.fixedEvents.filter(x=>x.name.startsWith('eco_valve')).length),0);checks+=2;await sharedContext.close();
  const boschContext=await context({viewport:{width:390,height:844}});
  const boschPage=await boschContext.newPage();
  const boschShare=origin+routePath+'#ventilcheck=bosch-ii-m:danfoss-ravl';
  await boschPage.goto(boschShare);
  await boschPage.locator('[data-valve-check][data-ready=true]').waitFor();
  const model=boschPage.locator('[name=valve-model]'),valve=boschPage.locator('[name=valve-connection]');
  const boschResult=boschPage.locator('[data-valve-result]');
  assert.equal(await model.inputValue(),'bosch-ii-m');
  assert.equal(await valve.inputValue(),'danfoss-ravl');
  assert.deepEqual(await boschPage.evaluate(()=>window.fixedEvents.filter(event=>event.name.startsWith('eco_valve'))),[]);
  checks+=3;
  for(const selected of ['danfoss-ravl','danfoss-ra','danfoss-rav']){
   await valve.selectOption(selected);
   assert.equal(await boschResult.getAttribute('data-status'),'adapter');
   const text=await boschResult.innerText();
   const manufacturer=new URL(await boschResult.locator('a[data-valve-official]').getAttribute('href'));
   assert.equal(manufacturer.protocol,'https:');
   assert.match(manufacturer.hostname,/(^|\.)bosch-smarthome\.com$/);
   if(selected==='danfoss-rav'){
    assert.match(text,/separat|Zubehör/i);
    assert.match(text,/8750002600/);
    assert.match(text,/4062321692636/);checks+=3;
   }else{
    assert.match(text,/liegt bei|enthalten|beiliegend|mitgeliefert/i);
    assert.doesNotMatch(text,/8750002600|4062321692636/);checks+=2;
   }
   checks+=3;
  }
  for(const selected of ['unknown','heimeier-m30']){
   await valve.selectOption(selected);
   assert.equal(await boschResult.getAttribute('data-status'),'unverified');
   assert.doesNotMatch(await boschResult.innerText(),/8750002600|4062321692636/);
   checks+=2;
  }
  await valve.selectOption('danfoss-ravl');
  await boschPage.locator('[data-valve-share]').click();
  assert.deepEqual(await boschPage.evaluate(()=>window.copied),[boschShare]);
  assert(await boschPage.evaluate(()=>window.fixedEvents.filter(event=>event.name.startsWith('eco_valve')).every(event=>Object.keys(event).join(',')==='name')));
  checks+=2;
  await boschContext.close();
  const fritzContext=await context({viewport:{width:390,height:844}});
  const fritzPage=await fritzContext.newPage();
  const fritzShare=origin+routePath+'#ventilcheck=fritz-302:danfoss-ravl';
  await fritzPage.goto(fritzShare);
  await fritzPage.locator('[data-valve-check][data-ready=true]').waitFor();
  const fritzModel=fritzPage.locator('[name=valve-model]'),fritzValve=fritzPage.locator('[name=valve-connection]');
  const fritzResult=fritzPage.locator('[data-valve-result]');
  assert.equal(await fritzModel.inputValue(),'fritz-302');
  assert.equal(await fritzValve.inputValue(),'danfoss-ravl');
  assert.deepEqual(await fritzPage.evaluate(()=>window.fixedEvents.filter(event=>event.name.startsWith('eco_valve'))),[]);
  checks+=3;
  async function assertFritzSource(){
   const manufacturer=new URL(await fritzResult.locator('a[data-valve-official]').getAttribute('href'));
   assert.equal(manufacturer.protocol,'https:');
   assert.match(manufacturer.hostname,/(^|\.)(?:avm\.de|fritz\.com)$/);checks+=2;
  }
  for(const selected of ['danfoss-ravl','danfoss-ra','danfoss-rav']){
   await fritzValve.selectOption(selected);
   const copy=await fritzResult.innerText();
   assert.equal(await fritzResult.getAttribute('data-status'),'adapter');checks++;
   await assertFritzSource();
   if(selected==='danfoss-ra'){
    assert.match(copy,/liegt bei|enthalten|beiliegend|mitgeliefert/i);checks++;
   }else{
    assert.match(copy,/separat|nicht im Lieferumfang|nicht mitgeliefert/i);
    assert.deepEqual((copy.match(/\b\d{8,14}\b/g)||[]).filter(number=>number!=='20003120'),[]);checks+=2;
   }
   if(selected==='danfoss-rav'){assert.match(copy,/Stift|Verlängerung|Stößel|\bPin\b/i);checks++;}
  }
  for(const selected of ['unknown','heimeier-m30']){
   await fritzValve.selectOption(selected);
   assert.equal(await fritzResult.getAttribute('data-status'),'unverified');
   assert.doesNotMatch(await fritzResult.innerText(),/8750002600|4062321692636/);checks+=2;
   await assertFritzSource();
  }
  await fritzValve.selectOption('danfoss-ravl');
  await fritzPage.locator('[data-valve-share]').click();
  assert.deepEqual(await fritzPage.evaluate(()=>window.copied),[fritzShare]);
  await fritzModel.selectOption('bosch-ii-m');
  assert.equal(await fritzValve.inputValue(),'danfoss-ravl');
  assert.match(await fritzResult.innerText(),/liegt bei|enthalten|beiliegend|mitgeliefert/i);
  assert.match(new URL(await fritzResult.locator('a[data-valve-official]').getAttribute('href')).hostname,/(^|\.)bosch-smarthome\.com$/);
  assert(await fritzPage.evaluate(()=>window.fixedEvents.filter(event=>event.name.startsWith('eco_valve')).every(event=>Object.keys(event).join(',')==='name')));
  checks+=5;
  await fritzContext.close();
  const nojs=await context({javaScriptEnabled:false,viewport:{width:320,height:844}}),fallback=await nojs.newPage();await fallback.goto(origin+routePath);
  assert.notEqual(await fallback.locator('[data-valve-check] details').getAttribute('open'),null);assert(await fallback.locator('[data-valve-check] details tbody th,[data-valve-check] details tbody td').evaluateAll(cells=>cells.every(cell=>{const r=cell.getBoundingClientRect();return r.width>0&&r.left>=0&&r.right<=innerWidth;})));checks+=2;assert.equal(await fallback.locator('[data-valve-controls]').isVisible(),false);assert.equal(await fallback.locator('[data-winter-tool=thermostat] form').isVisible(),false);checks++;assert.equal(await fallback.locator('[data-valve-check] details table tbody tr').count(),6);assert.match(await fallback.locator('[data-valve-check]').innerText(),/Keine eigenen Montage/);assert(await fallback.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));checks+=4;
  const boschAnchor='#bosch-ii-m-danfoss-adapter';
  await fallback.goto(origin+routePath+boschAnchor);
  const staticAnswer=fallback.locator(boschAnchor);
  assert(await staticAnswer.getByRole('heading').first().isVisible());
  const staticText=await staticAnswer.innerText();
  for(const evidence of [/8750002861/,/8750002600/,/4062321692636/,/Danfoss RA\b/,/Danfoss RAVL\b/,/Danfoss RAV\b/,/25,5 mm/,/34 mm/,/Maße als Hinweis/])assert.match(staticText,evidence);
  const reddit=staticAnswer.locator('a[href^="https://www.reddit.com/submit?"]');
  assert(await reddit.isVisible());
  const composer=new URL(await reddit.getAttribute('href'));
  assert.equal(composer.origin+composer.pathname,'https://www.reddit.com/submit');
  assert.equal(composer.searchParams.get('url'),origin+routePath+boschAnchor);
  assert.deepEqual([...composer.searchParams.keys()].sort(),['title','url']);
  assert((composer.searchParams.get('title')||'').trim());
  assert(await fallback.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await staticAnswer.locator('a[href="#thermostat-bosch-ii-m"]').press('Enter');
  await fallback.waitForURL(origin+routePath+'#thermostat-bosch-ii-m');
  assert(await fallback.locator('#thermostat-bosch-ii-m').getByRole('heading').isVisible());
  checks+=18;
  const fritzAnchor='#fritz-302-danfoss-adapter';
  await fallback.goto(origin+routePath+fritzAnchor);
  const fritzAnswer=fallback.locator(fritzAnchor);
  assert(await fritzAnswer.getByRole('heading').first().isVisible());
  const fritzText=await fritzAnswer.innerText();
  for(const evidence of [/20003120/,/FRITZ!DECT\s*302/,/Danfoss RA\b/,/Danfoss RAV\b/,/Danfoss RAVL\b/,/Stift|Verlängerung|Stößel|\bPin\b/])assert.match(fritzText,evidence);
  assert.doesNotMatch(fritzText,/8750002600|4062321692636/);
  const fritzReddit=fritzAnswer.locator('a[href^="https://www.reddit.com/submit?"]');
  assert(await fritzReddit.isVisible());
  const fritzComposer=new URL(await fritzReddit.getAttribute('href'));
  assert.equal(fritzComposer.origin+fritzComposer.pathname,'https://www.reddit.com/submit');
  assert.equal(fritzComposer.searchParams.get('url'),origin+routePath+fritzAnchor);
  assert.deepEqual([...fritzComposer.searchParams.keys()].sort(),['title','url']);
  assert((fritzComposer.searchParams.get('title')||'').trim());
  assert(await fallback.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await fritzAnswer.locator('a[href="#thermostat-fritz-302"]').press('Enter');
  await fallback.waitForURL(origin+routePath+'#thermostat-fritz-302');
  assert.match(await fallback.locator('#thermostat-fritz-302').getByRole('heading').textContent(),/20003120/);
  checks+=16;
  await nojs.close();
  console.log(`PASS thermostat fit: ${checks} browser checks; sourced branches, preserved payback, no-input selectors, copy success/failure, opt-out, no payloads, no-JS, 320/390/1280px.`);
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
