// Explicit store choice must survive timezone, delayed surfaces and link clicks.
// All fixtures are local; APIs, analytics and merchant navigation are intercepted.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const root=path.resolve(__dirname,'../site'),origin='https://getecoback.com';
const directory=process.env.QA_DIR||'/tmp/eco-market-choice';
const timezones=['Europe/Paris','America/Toronto','America/New_York'];
const generic='/en/guide/portable-ac-vs-air-cooler.html';
const restricted=[
 '/en/guide/portable-air-conditioner-france.html',
 '/en/guide/best-portable-air-conditioner-italy.html',
 '/en/guide/heated-airer-vs-dehumidifier.html',
 '/en/guide/12l-vs-20l-dehumidifier-uk.html',
 '/en/guide/window-seal-portable-ac.html',
];
const managed='#eb-toppick a[href*="amazon."],#eb-ustop a[href*="amazon."],#eb-models a[href*="amazon."],#eb-usshelf a[href*="amazon."],#eb-pu [data-eb-pu="pick"]';
let checks=0;const records=[];
function verify(condition,message){checks++;assert(condition,message);}
function equal(actual,expected,message){checks++;assert.deepEqual(actual,expected,message);}

async function fixtureContext(browser,{timezoneId,width=390,javaScriptEnabled=true}){
 const context=await browser.newContext({timezoneId,viewport:{width,height:900},javaScriptEnabled,serviceWorkers:'block'});
 const requests=[],errors=[];
 await context.addInitScript(()=>{
  Object.defineProperty(navigator,'webdriver',{get:()=>false});
  window.__marketEvents=[];
  navigator.sendBeacon=function(url,body){
   if(String(url).includes('/api/ev'))Promise.resolve(body instanceof Blob?body.text():String(body)).then(text=>window.__marketEvents.push(JSON.parse(text)));
   return true;
  };
 });
 await context.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.origin!==origin)return route.abort();
  if(url.pathname.startsWith('/api/')){
   requests.push(url.pathname);
   return route.fulfill({contentType:'application/json',body:'{"ok":false}'});
  }
  if(request.method()!=='GET')return route.abort();
  const file=path.join(root,url.pathname);
  const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'};
  try{return route.fulfill({contentType:mime[path.extname(file)]||'application/octet-stream',body:await fs.readFile(file)});}
  catch{return route.fulfill({status:404,body:'Missing local fixture'});}
 });
 const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));page.on('popup',popup=>popup.close().catch(()=>{}));
 if(javaScriptEnabled)await page.clock.install();
 return {context,page,requests,errors};
}

async function hrefs(page){return page.locator(managed).evaluateAll(links=>links.map(link=>link.href));}
async function surfaces(page){
 return page.evaluate(()=>{
  const visible=e=>!!e&&!e.hidden&&e.getClientRects().length>0&&getComputedStyle(e).visibility!=='hidden';
  const top=[...document.querySelectorAll('#eb-toppick,#eb-ustop')].find(visible);
  const shelf=[...document.querySelectorAll('#eb-models,#eb-usshelf')].find(visible);
  const links=e=>e?[...e.querySelectorAll('a[href*="amazon."]')].map(a=>a.href):[];
  const popup=document.getElementById('eb-pu');
  return {top:links(top),shelf:links(shelf),sticky:document.querySelector('#eb-sticky-cta')?.href,
   popupVisible:visible(popup),popup:popup?[...popup.querySelectorAll('[data-eb-pu="pick"]')].filter(visible).map(a=>a.href):[],
   documentOverflow:document.documentElement.scrollWidth>innerWidth+1,
   popupOverflow:visible(popup)?popup.firstElementChild.scrollWidth-popup.firstElementChild.clientWidth:0,
   stacked:visible(popup)&&visible(document.getElementById('eb-sticky'))};
 });
}
async function assertMarket(page,market,label,{requireShelf=true}={}){
 const result=await surfaces(page),hostname='www.amazon.'+(market==='us'?'com':'de'),tag=market==='us'?'ecoback0d-20':'getecoback-21';
 verify(result.top.length>0,label+' has a visible top pick');
 if(requireShelf)verify(result.shelf.length>0,label+' has a visible shelf');
 for(const href of [...result.top,...result.shelf,...result.popup,result.sticky]){
  verify(!!href,label+' has a sticky target');const url=new URL(href);
  equal(url.hostname,hostname,label+' store');equal(url.searchParams.get('tag'),tag,label+' tag');
 }
 equal(result.sticky,result.top[0],label+' sticky follows visible top');
 if(result.popupVisible){
  equal(result.popup,(result.shelf.length?result.shelf:result.top).slice(0,3),label+' popup follows visible recommendations');
  verify(!result.stacked,label+' floating CTAs do not stack');verify(result.popupOverflow<=1,label+' popup fits');
 }
 verify(!result.documentOverflow,label+' fits viewport');return result;
}
async function choose(page,market){
 await page.locator('#eb-market-choice').selectOption(market);
 await page.clock.runFor(100);
}
async function showPopup(page){
 await page.clock.fastForward(30000);
 await page.evaluate(()=>scrollTo({top:Math.max(700,document.documentElement.scrollHeight*.7),behavior:'instant'}));
 await page.clock.runFor(1000);await page.locator('#eb-pu').waitFor({state:'visible'});
}
async function clickWithoutNavigation(page,selector){
 const link=page.locator(selector).first();const before=await link.getAttribute('href');
 await link.evaluate(a=>a.addEventListener('click',event=>event.preventDefault(),{once:true}));
 await link.click();await page.clock.runFor(1000);await page.waitForTimeout(30);
 equal(await link.getAttribute('href'),before,'Click never rewrites an authored href');return before;
}

(async()=>{
 await fs.mkdir(directory,{recursive:true});
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']}: {})});
 try{
  for(const timezoneId of timezones)for(const width of [320,390,1280]){
   const {context,page,requests,errors}=await fixtureContext(browser,{timezoneId,width});
   await page.goto(origin+generic);await page.locator('#eb-market-choice').waitFor({state:'visible'});
   equal(await page.locator('#eb-market-choice').inputValue(),'de','Default store is explicit DE in '+timezoneId);
   const originals=await hrefs(page);
   await assertMarket(page,'de',timezoneId+' default');
   const fallback=page.locator('details').filter({has:page.locator('a[href*="amazon.com"]')}).first();
   verify(await fallback.count()===1,'Independent US fallback exists');
   await fallback.locator('summary').click();await page.clock.runFor(100);
   await assertMarket(page,'de','Opening US fallback does not select US');
   await fallback.locator('summary').click();await page.clock.runFor(100);
   await assertMarket(page,'de','Closed US fallback cannot capture the sticky CTA');
   await choose(page,'us');await assertMarket(page,'us','Explicit US before popup');
   await showPopup(page);await assertMarket(page,'us','Explicit US after popup');
   for(const market of ['de','us','de']){await choose(page,market);await assertMarket(page,market,'Repeated '+market);}
   equal(await hrefs(page),originals,'Switching changes visibility, never authored destinations');
   const before=await page.evaluate(()=>window.__marketEvents.filter(event=>event.n==='affiliate_click').length);
   const clicked=await clickWithoutNavigation(page,'#eb-pu [data-eb-pu="pick"]:visible');
   const events=(await page.evaluate(()=>window.__marketEvents.filter(event=>event.n==='affiliate_click'))).slice(before);
   equal(events.length,1,'One explicit purchase click produces one intercepted event');
   equal(events[0].m.link_url,clicked,'Event destination matches visible selected market');
   await page.locator('#eb-pu-x').click();await choose(page,'us');
   // A German link inserted or edited later remains an explicit German link,
   // even while the reader has selected the US recommendation surfaces.
   const initial='https://www.amazon.de/s?k=MeacoDry+Arete+One&tag=getecoback-21';
   await page.evaluate(href=>{const a=document.createElement('a');a.id='market-dynamic-fixture';a.href=href;a.textContent='Explicit Amazon.de fixture';a.style.cssText='position:fixed;top:160px;left:20px;z-index:99999;background:white;padding:12px;max-width:calc(100vw - 40px)';document.body.append(a);},initial);
   await page.clock.runFor(100);equal(await page.locator('#market-dynamic-fixture').getAttribute('href'),initial,'Inserted href is untouched');
   const edited='https://www.amazon.de/s?k=Turmventilator&tag=getecoback-21';
   await page.locator('#market-dynamic-fixture').evaluate((a,href)=>a.href=href,edited);await page.clock.runFor(100);
   equal(await page.locator('#market-dynamic-fixture').getAttribute('href'),edited,'Edited href is untouched');
   await clickWithoutNavigation(page,'#market-dynamic-fixture');
   await page.locator('#market-dynamic-fixture').evaluate(a=>a.remove());
   equal(requests.filter(url=>url==='/api/geo'),[],'Shopping does not request geo');equal(errors,[],'No runtime errors');
   if(width===390&&timezoneId==='America/Toronto'){
    await page.locator('#eb-market-choice').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(directory,'explicit-store-390.png')});
   }
   records.push({route:generic,timezoneId,width,choices:['de','us','de','us','de'],clickEvents:events.length});await context.close();
  }
  // The bedroom guide has no requirement to grow an artificial model grid.
  {
   const {context,page,requests,errors}=await fixtureContext(browser,{timezoneId:'America/Toronto'});
   const route='/en/guide/best-portable-air-conditioner-for-bedroom.html';await page.goto(origin+route);await page.locator('#eb-market-choice').waitFor({state:'visible'});
   for(const market of ['de','us','de']){await choose(page,market);await assertMarket(page,market,'Bedroom '+market,{requireShelf:false});}
   await showPopup(page);await assertMarket(page,'de','Bedroom popup',{requireShelf:false});equal(requests.filter(url=>url==='/api/geo'),[]);equal(errors,[]);records.push({route,timezoneId:'America/Toronto',width:390});await context.close();
  }
  for(const timezoneId of timezones)for(const route of restricted){
   const {context,page,requests,errors}=await fixtureContext(browser,{timezoneId});await page.goto(origin+route);await page.clock.runFor(100);
   equal(await page.locator('#eb-market-choice,#eb-ustop,#eb-usshelf,#eb-usmarket,#eb-market-us-fallback,#eb-pu [data-eb-popup-market="us"]').count(),0,route+' has no US generic buying surface');
   // A task-specific accessory tool may itself offer an explicit US store.
   // Its authored destinations must not be confused with a generic US shelf.
   equal(requests.filter(url=>url==='/api/geo'),[],route+' has no geo shopping request');equal(errors,[],route+' runtime');records.push({route,timezoneId,width:390,restricted:true});await context.close();
  }
  for(const width of [320,390,1280]){
   const {context,page}=await fixtureContext(browser,{timezoneId:'America/New_York',width,javaScriptEnabled:false});await page.goto(origin+generic);
   verify(!await page.locator('#eb-market-choice').isVisible(),'No unusable selector without JavaScript');
   verify(await page.locator('#eb-toppick').isVisible(),'DE recommendations remain available without JavaScript');
   verify(!await page.locator('#eb-ustop').isVisible(),'US top does not appear automatically without JavaScript');
   const fallback=page.locator('details').filter({has:page.locator('a[href*="amazon.com"]')}).first();
   verify(/Amazon\.com|United States|US\b/.test(await fallback.locator('summary').innerText()),'Fallback labels its US market');
   await fallback.locator('summary').click();verify(await fallback.locator('a[href*="amazon.com"]').first().isVisible(),'US links work as a native no-JS fallback');
   for(const href of await fallback.locator('a[href*="amazon.com"]').evaluateAll(links=>links.map(a=>a.href)))equal(new URL(href).searchParams.get('tag'),'ecoback0d-20');
   verify(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No-JS fallback fits '+width);
   records.push({route:generic,width,javaScriptEnabled:false});await context.close();
  }
  for(const javaScriptEnabled of [true,false]){
   const {context,page,requests,errors}=await fixtureContext(browser,{timezoneId:'Europe/Paris',javaScriptEnabled});await page.goto(origin+'/en/filter-finder.html');
   verify(/US/i.test(await page.title()),'Exact US filter directory retains its market');equal(await page.locator('#eb-market-choice').count(),0,'US directory is not a generic-market shelf');
   if(javaScriptEnabled){await page.locator('#model-options button').first().click();verify(await page.locator('#model-result').isVisible(),'Exact US model selection still works');}
   else verify(await page.locator('#model-table').isVisible(),'US official-source directory remains readable without JavaScript');
   equal(requests.filter(url=>url==='/api/geo'),[]);equal(errors,[]);records.push({route:'/en/filter-finder.html',javaScriptEnabled});await context.close();
  }
  await fs.writeFile(path.join(directory,'market-choice.json'),JSON.stringify({checks,records},null,2));
  console.log(`PASS market choice: ${records.length} scenarios, ${checks} assertions; Paris/Toronto/New York, explicit switches, stable hrefs, one click/one event, country guards and no-JS fallback. No production requests.`);
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
