// Real DOM journey regression using published HTML/assets as local fixtures.
// Every request is intercepted: no merchant visit or production analytics write.
// ECO_SITE_DIR also accepts a downloaded production mirror; this is not a claim
// that the fixture proves server-side analytics receipt or real conversion lift.
const {chromium}=require(process.env.NODE_PATH?'playwright':'../../../tools/revenue-studio/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const origin='https://getecoback.com';
const site=path.resolve(process.env.ECO_SITE_DIR||path.join(__dirname,'../site'));
const data=JSON.parse(fs.readFileSync(process.env.ECO_JOURNEY_DATA||path.join(__dirname,'../data/moisture-journeys.json'),'utf8'));
const dir=process.env.QA_DIR||'/tmp/eco-moisture-journeys';
const launch=process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{};
let checks=0;
const report=[];
function check(value,message){assert.ok(value,message);checks++;}
function equal(actual,expected,message){assert.deepEqual(actual,expected,message);checks++;}
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(predicate,label){for(let i=0;i<100;i++){if(predicate())return;await pause(20);}assert.fail('Timed out: '+label);}
function fileFor(route){const u=new URL(route,origin);return path.join(site,u.pathname.endsWith('/')?u.pathname+'index.html':u.pathname);}
function destination(href,label){
 const u=new URL(href,origin);equal(u.origin,origin,label+' same-site destination');
 check(fs.existsSync(fileFor(href)),label+' destination exists: '+u.pathname);
 if(u.hash){const html=fs.readFileSync(fileFor(href),'utf8'),id=decodeURIComponent(u.hash.slice(1));check(html.includes('id="'+id+'"')||html.includes("id='"+id+"'"),label+' fragment exists: '+u.hash);}
}
async function fixture(browser,{width=390,mode='qa',javaScriptEnabled=true}={}){
 const context=await browser.newContext({javaScriptEnabled,viewport:{width,height:900},serviceWorkers:'block'});
 const events=[],google=[],errors=[],missing=[],merchants=[],navigations=[];
 await context.addInitScript(mode=>{
  Object.defineProperty(navigator,'webdriver',{get:()=>mode==='webdriver'});
  Object.defineProperty(navigator,'doNotTrack',{get:()=>mode==='dnt'?'1':'0'});
  Object.defineProperty(navigator,'globalPrivacyControl',{get:()=>mode==='gpc'});
  if(mode==='denied')localStorage.setItem('fleet_ga4_choice_v1','denied');
  localStorage.setItem('eb_pu_seen',String(Date.now()));
  window.__journeyCompletions=[];
  window.addEventListener('fleet:business',event=>window.__journeyCompletions.push(event.detail));
 },mode);
 await context.route('**/*',async route=>{
  const request=route.request(),u=new URL(request.url());
  if(request.isNavigationRequest())navigations.push(u.href);
  if(u.hostname==='www.googletagmanager.com')return route.fulfill({contentType:'text/javascript',body:`const emit=a=>{if(a[0]==='event')fetch('https://www.google-analytics.com/g/collect',{method:'POST',body:JSON.stringify([a[1],a[2]])});};window.dataLayer.forEach(emit);const push=window.dataLayer.push.bind(window.dataLayer);window.dataLayer.push=(...args)=>{args.forEach(emit);return push(...args);};`});
  if(u.hostname.endsWith('google-analytics.com')){try{google.push(JSON.parse(request.postData()));}catch{}return route.fulfill({status:204});}
  if(u.origin!==origin){if(/amazon\./.test(u.hostname))merchants.push(u.href);return route.abort();}
  if(u.pathname.startsWith('/api/')||u.pathname==='/auth/status'){
   if(u.pathname==='/api/ev'){try{events.push(JSON.parse(request.postData()));}catch{}}
   return route.fulfill({contentType:'application/json',body:'{"ok":true,"user":null}'});
  }
  if(request.method()!=='GET')throw Error('Unexpected fixture method: '+request.method());
  const file=fileFor(u.href);
  if(!fs.existsSync(file)){missing.push(u.pathname);return route.fulfill({status:404,body:'Missing fixture'});}
  const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.woff2':'font/woff2','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg'};
  return route.fulfill({contentType:mime[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
 });
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 const goto=async pathname=>{const u=new URL(pathname,origin);if(mode==='qa')u.searchParams.set('eco_qa','1');if(mode==='qa')u.searchParams.set('qa','1');await page.goto(u.href);};
 return {context,page,goto,events,google,errors,missing,merchants,navigations};
}
async function layout(page,label){
 const sizes=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth,body:document.body.scrollWidth}));
 check(sizes.document<=sizes.viewport+1&&sizes.body<=sizes.viewport+1,label+' horizontal overflow: '+JSON.stringify(sizes));
 const duplicates=await page.locator('[id]').evaluateAll(nodes=>{const seen=new Set(),duplicates=[];for(const n of nodes){if(seen.has(n.id))duplicates.push(n.id);seen.add(n.id);}return duplicates;});
 equal(duplicates,[],label+' duplicate IDs');
}
async function complete(f,label){
 equal(f.errors,[],label+' JavaScript errors');equal(f.missing,[],label+' missing static assets');equal(f.merchants,[],label+' no merchant navigation');
 await f.context.close();
}
async function home(browser,width){
 const f=await fixture(browser,{width});await f.goto('/');const {page}=f;
 const primary=page.locator('#eb-household-entry'),foot=page.locator('footer.eb-footer');
 check(await primary.isVisible(),'home '+width+' primary tasks visible');
 check(!await primary.evaluate(node=>!!node.closest('details:not([open])')),'home primary tasks are not folded');
 check(await primary.evaluate(node=>!!(node.compareDocumentPosition(document.querySelector('footer.eb-footer'))&Node.DOCUMENT_POSITION_FOLLOWING)),'home primary tasks precede footer');
 const taskLinks=await primary.locator('a').evaluateAll(nodes=>nodes.map(n=>n.href));
 check(taskLinks.some(h=>h.includes('/guide/luftfeuchtigkeit-richtig-messen.html')),'home offers the measurement-first moisture task');
 check(taskLinks.some(h=>h.includes('/waeschetrockner-oder-luftentfeuchter.html')),'home offers laundry cost task');
 check(taskLinks.some(h=>h.includes('/guide/heizkosten-vergleich-rechner.html')),'home offers heating running-cost comparison');
 for(const href of taskLinks)destination(href,'home task');
 const groups=page.locator('details.home-editorial-details');check(await groups.count()>=6,'home has folded existing secondary directories');
 for(let i=0;i<await groups.count();i++){
  const group=groups.nth(i),id=await group.getAttribute('id');
  equal(await group.getAttribute('open'),null,id+' starts closed');
  check(await group.evaluate(node=>!!(node.compareDocumentPosition(document.querySelector('footer.eb-footer'))&Node.DOCUMENT_POSITION_FOLLOWING)),id+' before footer');
  const summary=group.locator(':scope > summary');await summary.focus();await page.keyboard.press('Enter');
  check(await group.getAttribute('open')!==null,id+' keyboard expansion works');
  check(await group.locator('a').count()>0,id+' contains retained usable paths');
  await layout(page,'home '+width+' '+id+' open');
  await summary.click();
 }
 check(await page.locator('#home-upkeep #upkeep-tools').count()===1,'existing upkeep discovery reused once');
 check(await foot.count()===1,'one shared footer');
 await primary.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(dir,'journey-home-'+width+'.png')});
 await layout(page,'home '+width);report.push({page:'/',width,secondaryGroups:await groups.count()});await complete(f,'home '+width);
}
async function category(browser,width){
 const f=await fixture(browser,{width});await f.goto('/kategorie/luftqualitaet.html');const {page}=f;
 const root=page.locator('#eb-air-decisions.eco-moisture-journeys');equal(await root.count(),1,'one task-led air category');
 equal(await root.locator('.eco-journey-group').evaluateAll(nodes=>nodes.map(n=>n.id)),data.category.groups.map(g=>g.id),'category task group order');
 const jumps=root.locator('nav.eco-journey-nav');equal(await jumps.count(),1,'category offers direct task navigation');
 equal(await jumps.locator('a').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('href'))),data.category.groups.map(g=>'#'+g.id),'task shortcuts reach every existing group');
 for(const group of data.category.groups){
  await jumps.locator('a[href="#'+group.id+'"]').click();await page.waitForURL(u=>u.hash==='#'+group.id);
  await pause(100);
  const position=await page.locator('#'+group.id+' h2').evaluate(node=>({top:node.getBoundingClientRect().top,bottom:node.getBoundingClientRect().bottom,navBottom:document.querySelector('.eb-nav').getBoundingClientRect().bottom,viewport:innerHeight}));
  check(position.top>=position.navBottom-1&&position.bottom<=position.viewport,group.id+' task shortcut exposes its heading below sticky navigation: '+JSON.stringify(position));
 }
 for(const group of data.category.groups){
  const section=root.locator('#'+group.id);check(await section.isVisible(),group.id+' visible primary task');
  check(!await section.evaluate(node=>!!node.closest('header')),'category task '+group.id+' outside hero');
  for(const slug of group.slugs)equal(await section.locator('[data-journey-article="'+slug+'"]').count(),1,slug+' in intended task group');
 }
 const more=root.locator('#weitere-luftqualitaet-ratgeber');equal(await more.getAttribute('open'),null,'secondary article inventory initially folded');
 check(await more.locator('[data-journey-article]').count()>0,'secondary inventory retained');
 await more.locator(':scope > summary').focus();await page.keyboard.press('Enter');check(await more.getAttribute('open')!==null,'secondary inventory keyboard expansion');
 const slugs=await root.locator('[data-journey-article]').evaluateAll(nodes=>nodes.map(n=>n.dataset.journeyArticle));equal(new Set(slugs).size,slugs.length,'every category article represented exactly once');
 const visibleInventory=await root.locator('[data-journey-article] h3 a').evaluateAll(nodes=>nodes.map(n=>({url:n.href,name:n.textContent.trim()})));
 const structuredInventory=await page.locator('script[type="application/ld+json"]').evaluateAll(nodes=>{
  const graphs=nodes.flatMap(n=>{const parsed=JSON.parse(n.textContent);return parsed['@graph']||[parsed];});
  const list=graphs.find(n=>n['@type']==='ItemList');
  return list?.itemListElement.map(n=>({url:n.url,name:n.name}));
 });
 equal(structuredInventory,visibleInventory,'category ItemList matches rendered article order and honest titles');
 for(const href of await root.locator('a').evaluateAll(nodes=>nodes.map(n=>n.href)))destination(href,'category route');
 await layout(page,'category '+width+' expanded');await more.locator(':scope > summary').click();
 await root.evaluate(node=>window.scrollTo(0,node.getBoundingClientRect().top+window.scrollY-145));
 await page.screenshot({path:path.join(dir,'journey-category-'+width+'.png')});
 report.push({page:'/kategorie/luftqualitaet.html',width,articles:slugs.length,groups:data.category.groups.length});await complete(f,'category '+width);
}
async function editorialRoutes(browser){
 const f=await fixture(browser);
 for(const [route,meta] of Object.entries(data.routes)){
  await f.goto(route);const next=f.page.locator('#eb-journey-next');equal(await next.count(),1,route+' one contextual next-step block');
  const anchors=next.locator('a');equal(await anchors.count(),meta.next_steps.length,route+' exact next-step count');check(meta.next_steps.length<=2,route+' at most two reasoned next steps');
  const text=await next.innerText();
  for(const step of meta.next_steps){
   const u=new URL(step.href,origin);check(u.pathname!==route,route+' no self-reloading next step');destination(step.href,route+' next step');
   check(text.includes(step.label)&&text.includes(step.why),route+' visible label and reason');
   equal(await anchors.filter({hasText:step.label}).getAttribute('href'),step.href,route+' exact destination');
  }
  if(meta.commerce_policy==='defer_generic'){
   const source=fs.readFileSync(fileFor(route),'utf8');
   for(const marker of ['EB_TOPPICK','EB_MODELS','EB_POPUP','EB_STICKY','EB_PROFILE','EB_QUICKPICK'])check(!source.includes('<!--'+marker+'-->'),route+' no generic '+marker+' promotion');
  }
  if(meta.commerce_policy==='qualified_comparison'){
   const buyer=f.page.locator('#eb-moisture-choice'),toc=f.page.locator('nav[aria-label="Inhaltsverzeichnis"], nav[aria-label="On this page"]');
   equal(await buyer.count(),1,route+' one buying helper');equal(await toc.count(),1,route+' one article contents navigation');
   check(await buyer.evaluate(node=>!!(node.compareDocumentPosition(document.querySelector('nav[aria-label="Inhaltsverzeichnis"], nav[aria-label="On this page"]'))&Node.DOCUMENT_POSITION_FOLLOWING)),route+' decision entry before lengthy contents navigation');
  }
  await layout(f.page,route);report.push({page:route,role:meta.role,nextSteps:meta.next_steps.length});
 }
 await complete(f,'editorial route graph');
}
async function directComparison(browser,pathname,lang,width,mode='normal'){
 const f=await fixture(browser,{width,mode});await f.goto(pathname);const {page}=f,root=page.locator('#eb-moisture-choice');
 equal(await root.count(),1,pathname+' published buyer entry survives the complete generator chain');
 await root.locator('form').waitFor({state:'visible'});
 const before=await root.locator('select').evaluateAll(nodes=>nodes.map(n=>[n.name,n.value]));
 const direct=root.locator('[data-choice-direct]');equal(await direct.getAttribute('href'),'#eb-choice-method','direct link has real no-JS destination');
 await direct.click();
 equal(await root.locator('[data-answer]:visible').evaluateAll(nodes=>nodes.map(n=>n.dataset.answer)),['compare'],'direct comparison uses existing compare result');
 equal(await root.locator('select').evaluateAll(nodes=>nodes.map(n=>[n.name,n.value])),before,'direct opening does not invent form answers');
 check(await root.locator('[data-choice-direct-note]').isVisible(),'direct mode discloses unassessed need');
 equal(await root.locator('.choice-candidate:visible').count(),lang==='de'?2:0,'direct comparison preserves market boundary');
 if(lang==='en'){
  check(await root.locator('[data-choice-method]').getAttribute('open')!==null,'advice-only direct mode reveals static evidence');
  equal(await root.locator('[data-choice-action=shop]:visible').count(),0,'EN other market has no German shops');
 }else{
  equal(await root.locator('.choice-candidate:visible h4').allTextContents(),['Comfee MDDF-20DEN7','MeacoDry Arete One 20L'],'direct comparison retains same model identities');
  await root.locator('[data-answer=compare] [data-choice-evidence]').first().locator('summary').click();
  check(await root.locator('[data-answer=compare] [data-choice-evidence]').first().getAttribute('open')!==null,'direct candidate evidence opens');
 }
 if(mode==='normal'){
  await until(()=>f.events.some(e=>e?.n==='buyer_next'&&e.m?.action==='direct'),'one direct action');
  await direct.click(); // Repeat entry must not count another result or direct action.
 }
 await pause(100);
 const buyer=f.events.filter(e=>e?.n?.startsWith('buyer_'));
 equal(buyer.filter(e=>e.n==='buyer_result'),[],'direct opening emits no first-party questionnaire completion');
 equal(await page.evaluate(()=>window.__journeyCompletions.filter(e=>e.name==='legacy:buyer_result')),[],'direct opening emits no Google completion signal');
 equal(f.google.filter(([name])=>name==='buyer_result'),[],'direct opening sends no Google questionnaire completion');
 if(mode==='normal'){
  equal(buyer.filter(e=>e.n==='buyer_next'&&e.m.action==='direct').map(e=>e.m),[{lang,choice:'compare',action:'direct'}],'fixed direct categorical event');
  equal(buyer.filter(e=>e.n==='buyer_view').map(e=>e.m),[{lang,choice:'none',action:'none'}],'shared entry exposure counted once for a direct reader');
 }
 else equal(buyer,[],'privacy/QA mode suppresses all buyer events: '+mode);
 await layout(page,'direct '+lang+' '+width+' '+mode);
 if(mode==='normal')await root.screenshot({path:path.join(dir,'journey-direct-'+lang+'-'+width+'.png')});
 await root.locator('[data-choice-needs]').first().click();
 check(!await root.locator('[data-results]').isVisible(),'return to needs restores unassessed form');
 equal(await root.locator('select').evaluateAll(nodes=>nodes.map(n=>[n.name,n.value])),before,'return to needs retains original inputs');
 await pause(50);
 if(mode==='normal')equal(f.events.filter(e=>e?.n==='buyer_view').length,1,'switching entry does not duplicate exposure');
 report.push({page:pathname,width,mode,direct:'no-completion'});await complete(f,'direct '+lang+' '+mode);
}
async function coldAndMeasure(browser){
 const f=await fixture(browser);await f.goto('/guide/luftentfeuchter-keller.html');const {page}=f,root=page.locator('#eb-moisture-choice');
 await root.locator('form').waitFor({state:'visible'});
 for(const [key,value] of Object.entries({purpose:'room',humidity:'high',temperature:'cold'}))await root.locator('[name='+key+']').selectOption(value);
 await root.locator('[type=submit]').click();
 const cold=root.locator('[data-answer=cold] a');equal(await cold.getAttribute('href'),'#kalter-keller','cold result targets body section on same page');
 const navigations=f.navigations.length,answers=await root.locator('select').evaluateAll(nodes=>nodes.map(n=>[n.name,n.value]));
 await cold.click();await page.waitForURL(u=>u.hash==='#kalter-keller');
 equal(f.navigations.length,navigations,'cold section navigation does not reload document');
 equal(await root.locator('select').evaluateAll(nodes=>nodes.map(n=>[n.name,n.value])),answers,'cold section preserves input values');
 check(await root.locator('[data-answer=cold]').isVisible(),'cold answer remains available after section jump');
 await root.locator('[name=humidity]').selectOption('unknown');await root.locator('[type=submit]').click();
 const measure=root.locator('[data-answer=measure] a');equal(await measure.count(),1,'measurement answer has a real next step');
 const href=await measure.getAttribute('href');check(href.includes('/guide/luftfeuchtigkeit-richtig-messen.html'),'measurement answer reaches measurement guide');destination(href,'measurement guide');
 await measure.click();await page.waitForURL(u=>u.pathname==='/guide/luftfeuchtigkeit-richtig-messen.html');
 check(await page.locator('h1').count()===1,'measurement destination renders its actual article');
 await complete(f,'cold and measure journeys');
}
async function acquisitionPath(browser,width){
 // Follow actual owned links rather than just opening each page separately.
 // GPC keeps the whole multi-page journey excluded even after queryless links.
 const f=await fixture(browser,{width,mode:'gpc'});await f.goto('/');const {page}=f;
 await page.locator('#eb-household-entry a[href="/guide/luftfeuchtigkeit-richtig-messen.html"]').click();
 await page.waitForURL(u=>u.pathname==='/guide/luftfeuchtigkeit-richtig-messen.html');
 await page.locator('#eb-journey-next a[href="/guide/luftfeuchtigkeit-senken.html#moisture-check"]').click();
 await page.waitForURL(u=>u.pathname==='/guide/luftfeuchtigkeit-senken.html');
 check(await page.locator('#moisture-check').count()===1,'acquired reader reaches the real diagnosis tool');
 await page.locator('#eb-journey-next a[href="/guide/luftentfeuchter-ratgeber.html#eb-moisture-choice"]').click();
 await page.waitForURL(u=>u.pathname==='/guide/luftentfeuchter-ratgeber.html');
 const root=page.locator('#eb-moisture-choice');await root.locator('form').waitFor({state:'visible'});await root.locator('[data-choice-direct]').click();
 const candidates=root.locator('.choice-candidate:visible');equal(await candidates.count(),2,'acquired reader can reach the same two-model comparison');
 await candidates.first().locator('[data-choice-evidence] > summary').click();
 check(await candidates.first().locator('[data-choice-evidence]').getAttribute('open')!==null,'acquired reader can inspect model evidence before shopping');
 const shop=candidates.first().locator('[data-choice-action=shop]');check((await shop.getAttribute('href')).startsWith('https://www.amazon.de/'),'comparison ends at the existing German offer');
 await root.evaluate(node=>node.addEventListener('click',event=>{if(event.target.closest('a[data-choice-action="shop"]'))event.preventDefault();}));
 const before=f.navigations.length;await shop.click();await pause(100);equal(f.navigations.length,before,'merchant click is exercised without leaving the fixture');
 equal(f.events.filter(e=>e?.n?.startsWith('buyer_')),[],'GPC stays respected across the complete acquisition path');
 await layout(page,'acquisition path '+width);report.push({journey:['home','measure','diagnose','compare','evidence','merchant-intent'],width,merchantNavigation:false});
 await complete(f,'acquisition path '+width);
}
async function noJavaScript(browser){
 const f=await fixture(browser,{javaScriptEnabled:false});await f.goto('/guide/luftentfeuchter-ratgeber.html');const {page}=f,root=page.locator('#eb-moisture-choice');
 const direct=root.locator('[data-choice-direct]');check(await direct.isVisible(),'no-JS direct reading entry visible');await direct.click();await page.waitForURL(u=>u.hash==='#eb-choice-method');
 check(await root.locator('[data-choice-method]').getAttribute('open')!==null,'no-JS comparison table readable');
 check(!await root.locator('form').isVisible(),'no-JS cannot submit incomplete questionnaire');
 await layout(page,'no-JS direct reading');await complete(f,'no-JS direct reading');
}
(async()=>{
 fs.mkdirSync(dir,{recursive:true});const browser=await chromium.launch({headless:true,...launch,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const width of [390,1280]){await home(browser,width);await category(browser,width);await directComparison(browser,'/guide/luftentfeuchter-ratgeber.html','de',width);await directComparison(browser,'/en/guide/dehumidifier-20-sqm.html','en',width);}
  await editorialRoutes(browser);await coldAndMeasure(browser);await noJavaScript(browser);
  for(const width of [390,1280])await acquisitionPath(browser,width);
  for(const mode of ['denied','dnt','gpc','qa','webdriver'])await directComparison(browser,'/guide/luftentfeuchter-ratgeber.html','de',390,mode);
  fs.writeFileSync(path.join(dir,'moisture-journeys-browser.json'),JSON.stringify({pass:true,checks,fixtureRoot:site,scenarios:report},null,2));
  console.log(JSON.stringify({pass:true,checks,viewports:[390,1280],scenarios:report.length}));
 }finally{await browser.close();}
})().catch(error=>{
 fs.mkdirSync(dir,{recursive:true});
 fs.writeFileSync(path.join(dir,'moisture-journeys-browser.json'),JSON.stringify({pass:false,checks,fixtureRoot:site,scenarios:report,error:error.message},null,2));
 console.error(error);process.exit(1);
});
