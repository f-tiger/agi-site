// Final-artifact checks; all requests resolve to local files, never to a merchant.
import {createRequire} from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root=path.resolve(process.env.ECO_CATALOG_SITE||new URL('../site/',import.meta.url).pathname);
const data=JSON.parse(fs.readFileSync(new URL('../data/product-catalog.json',import.meta.url),'utf8'));
const requireTools=createRequire(new URL('../../../tools/revenue-studio/package.json',import.meta.url));
const {chromium}=requireTools('playwright');
const origin='https://getecoback.com',today=new Date().toISOString().slice(0,10),cases=[];
const day=value=>{const n=Date.parse(value+'T00:00:00Z');return Number.isFinite(n)&&new Date(n).toISOString().slice(0,10)===value?n/86400000:NaN;};
const expected=data.products.filter(p=>p.status==='verified'&&day(today)-day(p.checked)>=0&&day(today)-day(p.checked)<=90);
for(const route of ['index.html','wohnen.html','tools.html']){const html=fs.readFileSync(path.join(root,route),'utf8');assert(html.includes('data-product-catalog-entry')&&html.includes('href="/produkte.html"'),'Final discovery missing from '+route);}
const executablePath=process.env.CHROMIUM_PATH||process.env.PILOT_CHROMIUM;
const localTools=['luftreiniger','hygrometer','dampfreiniger','fenstersauger','nass-trockensauger','bodenstaubsauger','wasserkocher','heissluftfritteusen','kontaktgrills'];
const reusedTools={ventilatoren:'/guide/stromkosten-rechner.html',heizluefter:'/guide/heizluefter-stromverbrauch.html#eb-heater-cost',waeschetrockner:'/waeschetrockner-oder-luftentfeuchter.html#laundry-check'};
const ownCases=[
 {category:'luftreiniger',values:{length:'5',width:'4',height:'2.5',changes:'4'},expect:/200 m³\/h/},
 {category:'hygrometer',values:{readingA:'40',readingB:'55'},expect:/15 Prozentpunkte/},
 {category:'dampfreiniger',values:{approval:'unknown',sensitive:'unknown'},expect:/Unbekannt ist keine Erlaubnis/},
 {category:'fenstersauger',values:{width:'1',height:'2',panes:'3',sides:'2'},expect:/12 m²/},
 {category:'nass-trockensauger',values:{material:'hazard'},expect:/Keinen gewöhnlichen Haushaltssauger/},
 {category:'bodenstaubsauger',values:{},expect:/55 €.*pro Jahr/s},
 {category:'wasserkocher',values:{cups:'2',millilitres:'300',extra:'100'},expect:/0,7 Liter/},
 {category:'heissluftfritteusen',values:{minutesA:'20',minutesB:'30',temperatureA:'180',temperatureB:'200'},expect:/Zone A nach 10, Zone B nach 0 Minuten/},
 {category:'kontaktgrills',values:{},expect:/freie Breite und Tiefe reichen/},
];
async function resultText(page,category){
 const output=page.locator('#pc-tool-'+category+' [data-category-result]');
 await output.waitFor({state:'visible'});const text=await output.innerText();
 assert.ok(text.trim());assert.doesNotMatch(text,/NaN|Infinity/);return text;
}
async function setValues(form,values){
 for(const [name,value] of Object.entries(values)){
  const input=form.locator('[name="'+name+'"]');
  if(await input.evaluate(n=>n.tagName==='SELECT'))await input.selectOption(value);else await input.fill(value);
 }
}
const browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{}),args:['--no-sandbox']});
try{
 for(const width of [320,390,1280])for(const javaScriptEnabled of [true,false]){
  const context=await browser.newContext({viewport:{width,height:900},javaScriptEnabled,serviceWorkers:'block',userAgent:'getecoback-ci/1.0 product-catalog',extraHTTPHeaders:{DNT:'1'}});
  let writes=0;const errors=[];
  await context.addInitScript(()=>{
   window.__probe=true;window.__catalogToolEvents=[];
   const spy=(...args)=>{if(args[0]==='event'&&args[1]==='tool_complete')window.__catalogToolEvents.push(args);};
   Object.defineProperty(window,'gtag',{configurable:true,get:()=>spy,set(){}});
   Object.defineProperty(navigator,'globalPrivacyControl',{get:()=>true});
  });
  await context.route('**/*',route=>{
   const q=route.request(),u=new URL(q.url());
   if(q.method()!=='GET'){writes++;return route.abort();}
   if(u.origin!==origin)return route.abort();
   if(u.pathname.startsWith('/api/')||u.pathname==='/auth/status')return route.fulfill({contentType:'application/json',body:'{"ok":false,"user":null}'});
   const file=path.resolve(root,'.'+decodeURIComponent(u.pathname));
   if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return route.fulfill({status:404,body:'Missing fixture'});
   const contentType={'.html':'text/html; charset=utf-8','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'}[path.extname(file)]||'application/octet-stream';
   return route.fulfill({contentType,body:fs.readFileSync(file)});
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  assert.equal((await page.goto(origin+'/produkte.html?__probe=1',{waitUntil:'load'})).status(),200);
  assert.equal(await page.locator('[data-product-card]').count(),data.products.length);
  assert.equal(await page.locator('[data-product-category]').count(),data.categories.length);
  assert.equal(await page.locator('[data-product-card] a[href*="amazon.de"]').count(),expected.length);
  for(const product of data.products){
   const card=page.locator('#produkt-'+product.id);assert.equal(await card.count(),1);
   const eligible=expected.some(p=>p.id===product.id),merchant=card.locator('a[href*="amazon.de"]');
   assert.equal(await merchant.count(),eligible?1:0);
   if(eligible){const url=new URL(await merchant.getAttribute('href'));assert.equal(url.hostname,'www.amazon.de');assert.equal(url.pathname,'/s');assert.equal(url.searchParams.get('k'),product.query);assert.equal(url.searchParams.get('tag'),'getecoback-21');assert.match(await merchant.getAttribute('rel'),/sponsored/);}
   assert(await card.locator('a[href="'+product.source+'"]').count());
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  if(javaScriptEnabled){
   await page.locator('#product-filters').waitFor({state:'visible'});
   const first=data.categories[0],firstProducts=data.products.filter(p=>p.category===first.id);
   await page.locator('#product-category').selectOption(first.id);
   assert.equal(await page.locator('[data-product-card]:visible').count(),firstProducts.length);
   await page.locator('#product-query').fill('__nicht_vorhanden_743_');
   assert.equal(await page.locator('[data-product-card]:visible').count(),0);assert(await page.locator('#product-filter-empty').isVisible());
   await page.locator('#product-filters button[type=reset]').click();
   assert.equal(await page.locator('[data-product-card]:visible').count(),data.products.length);
   const example=data.products[0];await page.locator('#product-query').fill(example.name);
   assert(await page.locator('#produkt-'+example.id).isVisible());
   await page.locator('#product-filters button[type=reset]').click();
  }else{assert(await page.locator('#product-filters').isHidden());assert.equal(await page.locator('[data-product-card]:visible').count(),data.products.length);}
  // Static reading routes and fragment history must work on final built files.
  const firstGroup=data.categories[0],secondGroup=data.categories[1];
  assert.equal(await page.locator('.pc-buyer-routes').count(),data.categories.length);
  await page.locator('#kategorie-'+firstGroup.id+' .pc-buyer-routes a').first().click();
  await page.waitForTimeout(700);
  const modelHeading=page.locator('#modelle-'+firstGroup.id),headingBox=await modelHeading.boundingBox();
  const navBox=await page.locator('nav.eb-nav').boundingBox();
  assert(headingBox&&headingBox.y>=(navBox?navBox.y+navBox.height:0)+8&&headingBox.y<450,'Comparison heading obscured');
  if(javaScriptEnabled){
   await page.locator('[data-category-link="'+firstGroup.id+'"]').click();
   await page.locator('[data-category-link="'+secondGroup.id+'"]').click();
   await page.goBack();
   await page.waitForFunction(id=>document.querySelector('#product-category').value===id,firstGroup.id);
   assert.equal(await page.locator('[data-product-card]:visible').count(),data.products.filter(p=>p.category===firstGroup.id).length);
   const target=data.products.find(p=>p.category===secondGroup.id);
   await page.locator('#product-query').fill('__missing__');
   await page.evaluate(id=>location.hash='produkt-'+id,target.id);
   await page.locator('#produkt-'+target.id).waitFor({state:'visible'});
   assert.equal(await page.locator('#product-query').inputValue(),'');
   assert.equal(await page.locator('#product-category').inputValue(),secondGroup.id);
   await page.reload();
   await page.locator('#produkt-'+target.id).waitFor({state:'visible'});
   await page.goto(origin+'/produkte.html?__probe=1#%E0%A4%A');
   await page.reload();
   await page.locator('#product-filters').waitFor({state:'visible'});
   await page.locator('#product-query').fill(data.products[0].name);
   assert(await page.locator('#produkt-'+data.products[0].id).isVisible());
   assert.equal(new URL(page.url()).hash,'','Typed filters never retain a misleading model fragment');
  }
  await page.goto(origin+'/produkte.html?__probe=1');
  if(javaScriptEnabled)await page.locator('#product-filters').waitFor({state:'visible'});
  assert.equal(await page.locator('.pc-tool').count(),12);
  for(const [category,href] of Object.entries(reusedTools)){
   const tool=page.locator('#pc-tool-'+category);assert(await tool.isVisible());
   assert.equal(await tool.locator('a[href="'+href+'"]').count(),1);
   assert.match(await tool.innerText(),/Fiktives Beispiel/);
  }
  let defaultSubmissions=0,independentSubmissions=0,invalidSubmissions=0;
  if(javaScriptEnabled){
   for(const category of localTools){
    const form=page.locator('form[data-category-tool="'+category+'"]'),output=page.locator('#pc-tool-'+category+' [data-category-result]');
    assert(await form.isVisible());assert(await output.isHidden());
    // Required categorical choices have no invented initial approval.
    if(category==='dampfreiniger')await setValues(form,{approval:'unknown',sensitive:'unknown'});
    if(category==='nass-trockensauger')await setValues(form,{material:'unknown'});
    await form.locator('button[type=submit]').click();await resultText(page,category);defaultSubmissions++;
    await form.locator('button[type=reset]').click();assert(await output.isHidden());assert.equal(await output.innerText(),'');
   }
   for(const spec of ownCases){
    const form=page.locator('form[data-category-tool="'+spec.category+'"]');
    await setValues(form,spec.values);await form.locator('button[type=submit]').click();
    const text=await resultText(page,spec.category);assert.match(text,spec.expect);independentSubmissions++;
    if(spec.category==='dampfreiniger')assert.doesNotMatch(text,/weitere Prüfung nach Anleitung nicht aus/);
    if(spec.category==='luftreiniger'){await form.locator('[name=length]').fill('');assert(await page.locator('#pc-tool-luftreiniger [data-category-result]').isHidden(),'Editing inputs must withdraw an old answer');}
    await form.locator('button[type=reset]').click();
   }
   const form=page.locator('form[data-category-tool="luftreiniger"]'),output=page.locator('#pc-tool-luftreiniger [data-category-result]');
   for(const invalid of ['', '101']){
    await form.locator('[name=length]').fill(invalid);
    await form.locator('button[type=submit]').click();
    assert.equal(await form.evaluate(n=>n.checkValidity()),false);assert(await output.isHidden());invalidSubmissions++;
   }
   // A directly dispatched submission must also fail closed if native validation
   // is skipped by another script, without creating a fresh numerical answer.
   await form.evaluate(n=>n.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
   assert.match(await resultText(page,'luftreiniger'),/Bitte/);assert.doesNotMatch(await output.innerText(),/Geplantes Raumvolumen/);invalidSubmissions++;
   await form.locator('button[type=reset]').click();
   assert.deepEqual(await page.evaluate(()=>window.__catalogToolEvents),[],'QA must not emit tool_complete');
  }else{
   assert.equal(await page.locator('.pc-tool:visible').count(),12);
   assert.equal(await page.locator('form[data-category-tool]').count(),9);
   assert.equal(await page.locator('form[data-category-tool]:visible').count(),0);
   assert.equal(await page.locator('[data-category-result]:visible').count(),0);
   for(const category of localTools){
    const text=await page.locator('#pc-tool-'+category).innerText();
    assert.match(text,/Rechenweg:/);assert.match(text,/Fiktives Beispiel/);
   }
  }
  const last=data.categories.at(-1);await page.locator('a[data-category-link="'+last.id+'"]').click();
  await page.waitForURL(u=>u.hash==='#kategorie-'+last.id);
  const target=await page.locator('#kategorie-'+last.id).evaluate(n=>({top:n.getBoundingClientRect().top,nav:document.querySelector('.eb-nav')?.getBoundingClientRect().bottom||0}));
  assert(target.top>=target.nav-1,'Category anchor hidden below fixed navigation');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);
  cases.push({width,javaScriptEnabled,products:data.products.length,categories:data.categories.length,merchantSearches:expected.length,blockedWrites:writes,localTools:9,reusedTools:3,defaultSubmissions,independentSubmissions,invalidSubmissions,pass:true});
  await context.close();
 }
 console.log(JSON.stringify({pass:true,cases,productionWrites:0}));
}finally{await browser.close();}
