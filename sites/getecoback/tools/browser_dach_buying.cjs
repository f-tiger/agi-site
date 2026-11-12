// Final-artifact browser regression. Local files by default; LIVE=1 for read-only QA.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../site'),origin='https://getecoback.com',live=process.env.LIVE==='1';
const out=process.env.QA_DIR||'/tmp/eco-dach-buying-qa';
const routes=[
 {key:'thermostat',path:'/guide/smarte-heizkoerperthermostate-lohnen-sich.html',box:'#eb-thermostat-products',cards:'.tc-card',shops:'.tc-commerce a',names:['tado° Smartes Heizkörper-Thermostat X – Starter Kit','Bosch Heizkörper-Thermostat II [+M]','FRITZ!Smart Thermo 302 · Artikel 20003120'],ids:['tado-x-starter','bosch-ii-m','fritz-302'],queries:['tado Smartes Heizkörper Thermostat X Starter Kit Bridge X','Bosch Heizkörper Thermostat II +M','FRITZ Smart Thermo 302 20003120'],prefix:'thermostat-',source:'.tc-source a'},
 {key:'floorcare',path:'/guide/saugwischer-kaufberatung.html',box:'article[data-floorcare-guide]',cards:'.fc-card',shops:'.fc-commerce a',names:['Tineco FLOOR ONE S7 FlashDry','Dreame H14 Pro','Roborock F25 XT'],ids:['tineco-s7-flashdry','dreame-h14-pro','roborock-f25-xt'],queries:['Tineco FLOOR ONE S7 FlashDry','Dreame H14 Pro Nass Trockensauger','Roborock F25 XT Nass Trockenstaubsauger'],prefix:'',source:'.fc-sources a'}
];
// Independent publication expectation: never import a production renderer or
// infer freshness from the rendered page. Both catalogs use one UTC review day.
function expectedCatalogQueries(catalog,today=new Date().toISOString().slice(0,10)){
 const day=value=>{
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return NaN;
  const time=Date.parse(value+'T00:00:00Z');
  return Number.isFinite(time)&&new Date(time).toISOString().slice(0,10)===value?time/86400000:NaN;
 };
 const age=day(today)-day(catalog.checked);
 if(catalog.market!=='DE'||catalog.max_age_days!==90||!Number.isFinite(age)||age<0||age>90)return [];
 return catalog.products.filter(product=>product.status==='verified').map(product=>product.query);
}
function eligibilitySelftest(){
 const products=['first','second','third'].map(query=>({query,status:'verified'}));
 const catalog={market:'DE',max_age_days:90,checked:'2026-01-01',products};
 for(const today of ['2026-01-01','2026-04-01'])assert.deepEqual(expectedCatalogQueries(catalog,today),['first','second','third'],'Days 0 and 90 retain all verified searches');
 for(const today of ['2026-04-02','2025-12-31'])assert.deepEqual(expectedCatalogQueries(catalog,today),[],'Day 91 and future evidence withdraw all searches');
 const mixed={...catalog,products:products.map((p,i)=>({...p,status:i===1?'unverified':'verified'}))};
 assert.deepEqual(expectedCatalogQueries(mixed,'2026-04-01'),['first','third'],'Mixed verification retains only exact eligible searches');
 assert.deepEqual(expectedCatalogQueries({...catalog,products:products.map(p=>({...p,status:'unverified'}))},'2026-01-01'),[],'Unverified models never receive commerce');
 for(const change of [{checked:'2026-02-30'},{checked:'invalid'},{max_age_days:365},{market:'US'}])assert.deepEqual(expectedCatalogQueries({...catalog,...change},'2026-03-01'),[],'Invalid evidence or policy must fail closed');
}
async function assertCatalogCommerce(box,spec,catalog,today){
 assert.equal(catalog.products.length,3,'The three reviewed model records must remain present');
 assert.deepEqual(catalog.products.map(p=>p.id).sort(),[...spec.ids].sort(),'Exact model identities changed');
 const expected=expectedCatalogQueries(catalog,today),queries=[];
 assert.equal(await box.locator(spec.cards).count(),3,'Source cards must remain after commerce expires');
 assert.equal(await box.locator(spec.shops).count(),expected.length,'Missing eligible or unsuppressed stale merchant links');
 assert.equal(await box.locator('a[rel~="sponsored"]').count(),expected.length,'Unexpected sponsored link outside model actions');
 for(let i=0;i<spec.ids.length;i++){
  const product=catalog.products.find(p=>p.id===spec.ids[i]);
  assert.equal(product.name,spec.names[i]);assert.equal(product.query,spec.queries[i],'Exact variant query changed');
  const card=box.locator('#'+spec.prefix+product.id),eligible=expected.includes(spec.queries[i]);
  assert(await card.isVisible(),`Unreadable source card: ${product.id}`);
  const content=await card.innerText();assert(content.includes(spec.names[i]));assert(content.includes(product.care),'Maintenance facts must remain readable');
  assert((await card.locator(spec.source).count())>=1,`Manufacturer source missing: ${product.id}`);
  for(const source of await card.locator(spec.source).all())assert(await source.isVisible(),'Manufacturer source hidden');
  assert.equal(await card.locator('a[href*="amazon."]').count(),eligible?1:0,`Merchant eligibility mismatch: ${product.id}`);
  if(!eligible)assert.match(content,/Quellenprüfung ausstehend/,'Missing explanation for withdrawn commerce');
 }
 for(const a of await box.locator(spec.shops).all()){
  const u=new URL(await a.getAttribute('href'));assert.equal(u.host,'www.amazon.de');assert.equal(u.pathname,'/s');assert.equal(u.searchParams.get('tag'),'getecoback-21');
  assert((await a.getAttribute('rel')).split(/\s+/).includes('sponsored'));
  queries.push(u.searchParams.get('k'));
 }
 assert.deepEqual(queries.sort(),[...expected].sort(),'Wrong or duplicate eligible model searches');
 return expected.length;
}
async function contextFor(browser,width,js=true){
 const context=await browser.newContext({viewport:{width,height:900},javaScriptEnabled:js,serviceWorkers:'block'});
 if(!live)await context.route('**/*',route=>{
  const u=new URL(route.request().url());if(u.origin!==origin)return route.abort();
  if(u.pathname.startsWith('/api/'))return route.fulfill({contentType:'application/json',body:'{}'});
  const file=path.resolve(root,'.'+decodeURIComponent(u.pathname));
  if(!file.startsWith(root+'/')||!fs.existsSync(file)||!fs.statSync(file).isFile())return route.fulfill({status:404,body:'missing'});
  const contentType={'.html':'text/html; charset=utf-8','.mjs':'application/javascript','.js':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.md':'text/markdown','.png':'image/png','.jpg':'image/jpeg'}[path.extname(file)]||'application/octet-stream';
  return route.fulfill({contentType,body:fs.readFileSync(file)});
 });
 return context;
}
async function main(){
 eligibilitySelftest();
 if(process.argv.includes('--eligibility-selftest')){console.log('PASS DACH catalog eligibility: days 0/90/91, future, mixed, unverified and invalid evidence');return;}
 const {chromium}=require('playwright');fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
 const results=[];
 try{
  for(const r of routes)for(const[width,js]of [[320,true],[390,true],[1280,true],[390,false]]){
   const catalog=JSON.parse(fs.readFileSync(path.resolve(__dirname,`../data/${r.key}-catalog.json`),'utf8'));
   const today=new Date().toISOString().slice(0,10);
   const context=await contextFor(browser,width,js),page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   const response=await page.goto(origin+r.path+'?__probe=1',{waitUntil:'load'});assert.equal(response.status(),200);
   const box=page.locator(r.box);assert.equal(await box.count(),1);assert.equal(await box.locator(r.cards).count(),3);
   const text=await box.innerText();for(const name of r.names)assert(text.includes(name),`${r.path}: ${name}`);
   const eligibleSearches=await assertCatalogCommerce(box,r,catalog,today);assert((await box.locator(r.source).count())>=3);
   assert.equal(await page.locator('h1').count(),1);
   assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'),origin+r.path);
   const desc=await page.locator('meta[name=description]').getAttribute('content');assert(desc.length>=120&&desc.length<=155,desc.length);
   assert.equal(await page.locator('script[data-ga4-id="G-E2V0Q9SJ9V"]').count(),1,'GA4 missing/duplicated');
   const merchantURLs=await page.locator('a[href*="amazon."]').evaluateAll(items=>items.map(a=>a.href));
   assert(merchantURLs.every(href=>new URL(href).hostname==='www.amazon.de'),'Unverified US merchant leaked');
   assert(merchantURLs.every(href=>!/Pinguino|Comfee[ +]MPPH|Midea[ +]Duo|Whynter/i.test(decodeURIComponent(href))),'Unrelated cooling product leaked');
   for(const schema of await page.locator('script[type="application/ld+json"]').allTextContents())JSON.parse(schema);
   const dims=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));assert(dims.scroll<=width+1,JSON.stringify({route:r.path,...dims}));
   const broken=await box.evaluate(el=>[...el.querySelectorAll('a[href^="#"]')].map(a=>a.getAttribute('href').slice(1)).filter(id=>id&&!document.getElementById(id)));assert.deepEqual(broken,[],'Broken local anchor');
   assert.deepEqual(errors,[],r.path);
   if(width===390){await box.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,(r.path.includes('saugwischer')?'floorcare':'thermostat')+(js?'':'-nojs')+'.png')});}
   results.push({path:r.path,width,js,eligibleSearches,reviewDay:catalog.checked,checkedDay:today,pass:true});await context.close();
  }
  const context=await contextFor(browser,390),page=await context.newPage();
  await page.addInitScript(()=>{window.__events=[];window.addEventListener('fleet:business',e=>window.__events.push(e.detail));});
  await page.goto(origin+'/rechner.html?__probe=1#home-fit-floor');await page.waitForSelector('#home-fit[data-ready]');
  const hf=page.locator('#home-fit');
  assert.equal(await hf.locator('[data-mode=floor]').getAttribute('aria-pressed'),'true');
  const config=await page.locator('#home-fit-config').textContent(),t=JSON.parse(config).text;
  assert.equal(await hf.locator('.hf-notice').innerText(),t.example,'Deep link falsely treated defaults as personal');
  await hf.locator('select[name=surface]').selectOption('yes');assert.equal(await hf.locator('.hf-notice').innerText(),t.personal);
  await page.evaluate(()=>{location.hash='home-fit';});await page.evaluate(()=>{location.hash='home-fit-floor';});
  await page.waitForFunction(expected=>document.querySelector('#home-fit .hf-notice').textContent===expected,t.example);
  assert.equal(await hf.locator('select[name=surface]').inputValue(),'unknown');
  assert.deepEqual(await page.evaluate(()=>window.__events),[],'Probe emitted business event');
  assert.equal(await page.locator('#home-fit-floor').count(),1);
  results.push({path:'/rechner.html#home-fit-floor',exampleReset:true,probeEvents:0,pass:true});await context.close();
 }finally{await browser.close();}
 fs.writeFileSync(path.join(out,'browser-dach-buying.json'),JSON.stringify({live,cases:results},null,2));
 console.log(JSON.stringify({status:'PASS',cases:results.length,live,qa:out}));
}
module.exports={expectedCatalogQueries,eligibilitySelftest,assertCatalogCommerce,thermostatSpec:routes[0]};
if(require.main===module)main().catch(e=>{console.error(e);process.exit(1)});
