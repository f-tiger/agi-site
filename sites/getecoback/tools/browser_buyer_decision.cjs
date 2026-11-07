// Public-page fixtures only: no production/API calls or merchant navigation.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const origin='https://getecoback.com',site=path.resolve(__dirname,'../site');
const dir=process.env.QA_DIR||'/tmp/eco-buyer-qa';
const launch=process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage']}:{};
const pages=[
 ['de','/guide/luftentfeuchter-ratgeber.html'],['de','/guide/waesche-trocknen-wohnung.html'],
 ['de','/guide/luftentfeuchter-20-qm.html'],['de','/guide/luftentfeuchter-keller.html'],
 ['en','/en/guide/dehumidifier-20-sqm.html'],['en','/en/guide/dehumidifier-drying-clothes-cost.html']
];
const cases=[
 ['room','unknown','unknown','measure'],['room','normal','warm','wait'],
 ['damage','high','warm','cause'],['room','high','cold','cold'],
 ['laundry','high','warm','laundry'],['room','high','warm','compare']
];
const candidates=[
 {name:'Comfee MDDF-20DEN7',href:'https://www.amazon.de/dp/B07KJX6RDK?tag=getecoback-21',sources:[
  'https://www.feelcomfee.com/de/produkte/klimatisieren-heizen/mddf-20den7',
  'https://www.feelcomfee.com/content/dam/comfee-aem/de/produkte/klimatisieren-heizen/mddf-20den7/comfee-MDDF-20DEN7-Datenblatt.pdf#page=2',
  'https://www.feelcomfee.com/content/dam/comfee-aem/global/products/heating-cooling/dehumidifier-mddf-20den7/DF-Owners-Manual.pdf']},
 {name:'MeacoDry Arete One 20L',href:'https://www.amazon.de/s?k=MeacoDry+Arete+One+20L&tag=getecoback-21',sources:[
  'https://www.meaco.com/products/meacodry-arete-one-20l-dehumidifier-and-air-purifier']}
];
let checks=0;
function check(value,message){assert.ok(value,message);checks++;}
async function fixture(browser,{javaScriptEnabled=true,moduleAbort=false}={}){
 const context=await browser.newContext({javaScriptEnabled,viewport:{width:390,height:844},timezoneId:'America/New_York',serviceWorkers:'block'});
 const events=[],errors=[],missing=[],navigations=[],merchants=[];
 await context.addInitScript(()=>{
  Object.defineProperty(navigator,'globalPrivacyControl',{get:()=>true});
  Object.defineProperty(navigator,'doNotTrack',{get:()=> '1'});
  Object.defineProperty(navigator,'clipboard',{value:{writeText:async()=>{}}});
  window.__probe=true;
 });
 await context.route('**/*',async route=>{
  const request=route.request(),u=new URL(request.url());
  if(request.isNavigationRequest())navigations.push(u.href);
  if(u.origin!==origin){if(/amazon\./.test(u.hostname))merchants.push(u.href);return route.abort();}
  if(moduleAbort&&u.pathname==='/assets/moisture-decision.mjs')return route.abort();
  if(u.pathname.startsWith('/api/')||u.pathname==='/auth/status'){
   if(u.pathname==='/api/ev'){try{events.push(JSON.parse(request.postData()));}catch{}}
   return route.fulfill({contentType:'application/json',body:'{"ok":true,"user":null}'});
  }
  if(request.method()!=='GET')throw Error('Unexpected non-GET fixture request: '+request.method()+' '+u.pathname);
  const rel=u.pathname.endsWith('/')?u.pathname+'index.html':u.pathname,file=path.join(site,rel);
  if(!fs.existsSync(file)){missing.push(u.pathname);return route.fulfill({status:404,body:'Missing fixture'});}
  const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.woff2':'font/woff2','.png':'image/png','.webp':'image/webp'};
  return route.fulfill({contentType:mime[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
 });
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 return {context,page,events,errors,missing,navigations,merchants};
}
async function choose(root,[purpose,humidity,temperature,expected]){
 for(const [name,value] of Object.entries({purpose,humidity,temperature}))await root.locator('[name='+name+']').selectOption(value);
 await root.locator('[type=submit]').click();
 assert.deepEqual(await root.locator('[data-answer]:visible').evaluateAll(nodes=>nodes.map(n=>n.dataset.answer)),[expected]);checks++;
}
async function layout(page,label){
 const sizes=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth,body:document.body.scrollWidth}));
 check(sizes.document<=sizes.viewport+1&&sizes.body<=sizes.viewport+1,label+' horizontal page overflow: '+JSON.stringify(sizes));
}
async function cards(root,lang,label){
 const visible=root.locator('.choice-candidate:visible');assert.equal(await visible.count(),2,label+' exactly two visible candidates');checks++;
 const headings=[];
 for(let i=0;i<2;i++){
  const card=visible.nth(i),expected=candidates[i];
  assert.equal((await card.locator('h4').innerText()).trim(),expected.name,label+' candidate identity');
  assert.equal(await card.locator('[data-choice-action=shop]').getAttribute('href'),expected.href,label+' original offer mapping');
  const rel=(await card.locator('[data-choice-action=shop]').getAttribute('rel')).split(/\s+/);
  check(rel.includes('sponsored')&&rel.includes('nofollow')&&rel.includes('noopener'),label+' affiliate disclosure attributes');
  check((await card.innerText()).includes(lang==='de'?'kein eigener Test':'not hands-on tested'),label+' manufacturer evidence disclosure');
  check((await card.innerText()).includes(lang==='de'?'06.11.2026':'6 November 2026'),label+' evidence check date');
  const labels=await card.locator('.choice-facts dt').allTextContents();headings.push(labels);
  check(labels.includes('20 °C / 60 % RH')&&labels.includes('10 °C / 60 % RH'),label+' same comparison conditions');
  const details=card.locator('[data-choice-evidence]');assert.equal(await details.count(),1);checks++;
  await details.locator('summary').click();check(await details.getAttribute('open')!==null,label+' evidence disclosure opens');
  const sources=await details.locator('a').evaluateAll(links=>links.map(a=>a.href));assert.deepEqual(sources,expected.sources,label+' primary source URLs');checks++;
  if(i===0){
   const unknown=await card.locator('.choice-facts dd').allTextContents();
   check(unknown.slice(1,3).every(text=>text.includes(lang==='de'?'nicht verifiziert':'not verified')),label+' missing Comfee condition figures are explicit');
   check(unknown[0].includes('WF'),label+' Comfee model suffix boundary');
  }else{
   const text=await card.innerText();
   check(text.includes('8.5')&&text.includes('216 W')&&text.includes('3.4')&&text.includes('180 W'),label+' Meaco condition values');
   check(text.includes('Arete Two')&&text.includes('25L'),label+' Meaco generation and size boundary');
  }
  await details.locator('summary').click();
 }
 assert.deepEqual(headings[0],headings[1],label+' same facts in both cards');checks++;
}
(async()=>{
 fs.mkdirSync(dir,{recursive:true});const browser=await chromium.launch({headless:true,...launch});
 const report=[];
 try{
  for(const [lang,pathname] of pages){
   const f=await fixture(browser),{page}=f;
   await page.goto(origin+pathname+'?__probe=1&private_test=not-for-sharing');
   const root=page.locator('#eb-moisture-choice');await root.locator('form').waitFor({state:'visible'});
   check(await root.locator('[data-choice-fields]').isEnabled(),pathname+' enabled after module initialization');
   check(!await root.locator('form').evaluate(form=>form.inert),pathname+' initialized form not inert');
   check(!await root.locator('[data-choice-fallback]').isVisible(),pathname+' fallback hidden only after initialization');
   assert.equal(await root.locator('[name=market]').inputValue(),lang==='en'?'other':'de',pathname+' language must not infer Germany');checks++;
   for(const width of [320,390,1280]){
    await page.setViewportSize({width,height:900});
    await root.locator('[name=market]').selectOption(lang==='en'?'other':'de');
    for(const branch of cases){
     await choose(root,branch);const buying=['compare','laundry'].includes(branch[3]);
     const shops=await root.locator('[data-choice-action=shop]:visible').count();
     assert.equal(shops,buying&&lang==='de'?2:0,pathname+' '+branch[3]+' '+width+' market/need gate');checks++;
     if(!buying)assert.equal(await root.locator('.choice-candidate:visible').count(),0,pathname+' non-buy branch cannot reveal candidates');
    }
    if(lang==='en')check(await root.locator('[data-market-other]:visible').isVisible(),pathname+' advice-only market explanation');
    // Explicit market change must invalidate the previous answer immediately.
    await root.locator('[name=market]').selectOption(lang==='en'?'de':'other');
    check(!await root.locator('[data-results]').isVisible(),pathname+' market edit hides result');
    await root.locator('[name=market]').selectOption('de');
    for(const state of ['compare','laundry']){
     await choose(root,cases.find(row=>row[3]===state));await cards(root,lang,pathname+' '+state+' '+width);
     await layout(page,pathname+' '+state+' '+width);
    }
    const method=root.locator('[data-choice-method]');assert.equal(await method.count(),1);checks++;
    await method.locator('summary').click();
    check((await method.innerText()).includes(lang==='de'?'keine eigenen Messungen':'not our own measurements'),pathname+' visible method limitation');
    await layout(page,pathname+' method '+width);await method.locator('summary').click();
    await root.locator('[data-copy]').click();assert.equal(await root.locator('[data-share]').inputValue(),origin+pathname+'#eb-moisture-choice');checks++;
    await root.screenshot({path:path.join(dir,'buyer-'+path.basename(pathname,'.html')+'-'+width+'.png')});
    report.push({pathname,lang,width,branches:6,candidates:2});
   }
   // Each existing answer field invalidates a displayed answer; no new submit is needed.
   for(const [name,value] of [['purpose','damage'],['humidity','unknown'],['temperature','cold'],['market','other']]){
    await root.locator('[name=market]').selectOption('de');await choose(root,cases[5]);
    await root.locator('[name='+name+']').selectOption(value);
    check(!await root.locator('[data-results]').isVisible(),pathname+' '+name+' edit immediately hides result');
    assert.equal(await root.locator('[data-choice-evidence][open]').count(),0,pathname+' stale evidence closes');checks++;
   }
   assert.deepEqual(f.errors,[],pathname+' page errors');assert.deepEqual(f.missing,[],pathname+' fixture completeness');
   assert.deepEqual(f.merchants,[],pathname+' merchant navigation forbidden');
   assert.equal(f.events.filter(e=>e?.n?.startsWith('buyer_')).length,0,pathname+' QA events suppressed');checks+=4;
   await f.context.close();
  }
  for(const [lang,pathname] of pages)for(const mode of ['no-js','module-abort']){
   const f=await fixture(browser,{javaScriptEnabled:mode!=='no-js',moduleAbort:mode==='module-abort'}),{page}=f;
   await page.goto(origin+pathname+'?__probe=1');
   const root=page.locator('#eb-moisture-choice'),form=root.locator('form');
   check(await root.locator('[data-choice-fallback]').isVisible(),pathname+' '+mode+' useful fallback visible');
   check(!await form.isVisible(),pathname+' '+mode+' no exposed native form');
   check(await form.evaluate(f=>f.hidden&&f.inert&&f.querySelector('fieldset').disabled&&[...f.querySelectorAll('select,button')].every(n=>n.matches(':disabled'))&&[...new FormData(f)].length===0),pathname+' '+mode+' disabled fields cannot serialize answers');
   check(!await root.locator('[data-copy]').isVisible(),pathname+' '+mode+' no dead copy action');
   const before=page.url();await root.locator('[data-choice-method] > summary').click();await page.keyboard.press('Enter');
   assert.equal(page.url(),before,pathname+' '+mode+' reading fallback cannot submit');checks++;
   const links=await root.locator('[data-choice-fallback] a').evaluateAll(nodes=>nodes.map(a=>a.href));
   assert.equal(links.length,3);checks++;
   for(const href of links){
    const u=new URL(href),samePageAnchor=u.pathname===pathname&&!!u.hash;
    check(u.origin===origin&&(!u.search||(samePageAnchor&&u.search===new URL(before).search))&&fs.existsSync(path.join(site,u.pathname)),pathname+' '+mode+' usable local fallback');
    if(u.hash)check(fs.readFileSync(path.join(site,u.pathname),'utf8').includes('id="'+u.hash.slice(1)+'"'),pathname+' '+mode+' actual fallback anchor');
   }
   const destination=links[0];await root.locator('[data-choice-fallback] a').first().click();await page.waitForURL(destination);
   check(f.navigations.every(href=>!['purpose','humidity','temperature','market'].some(k=>new URL(href).searchParams.has(k))),pathname+' '+mode+' no answers in navigation URLs');
   assert.deepEqual(f.errors,[],pathname+' '+mode+' page errors');assert.deepEqual(f.merchants,[]);checks+=2;
   await f.context.close();
  }
  fs.writeFileSync(path.join(dir,'buyer-decision-browser.json'),JSON.stringify({pass:true,checks,scenarios:report,failureModes:pages.length*2},null,2));
  console.log(JSON.stringify({pass:true,checks,pages:pages.length,viewports:[320,390,1280],failureModes:pages.length*2}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
