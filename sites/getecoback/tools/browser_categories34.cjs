// Final-artifact regression for both remaining DACH categories. No merchant clicks.
// Local files by default. LIVE=1 checks production with QA events suppressed.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createRequire}=require('node:module');
// The deployment container uses the workbench's locked browser dependency.
const requireTools=createRequire(path.resolve(__dirname,'../../../tools/revenue-studio/package.json'));
const {chromium}=requireTools('playwright');
const root=path.resolve(__dirname,'../site'),origin='https://getecoback.com';
const live=process.env.LIVE==='1',proxyTLSException=live&&process.env.QA_IGNORE_HTTPS_ERRORS==='1';
const out=process.env.QA_DIR||'/tmp/eco-categories34-qa';fs.mkdirSync(out,{recursive:true});
const categoryPaths=[
 '/guide/smarte-heizkoerperthermostate-lohnen-sich.html',
 '/guide/saugwischer-kaufberatung.html',
 '/guide/saugroboter-kaufberatung.html',
 '/guide/luftbefeuchter-ratgeber.html'
];
// Expected exact identities/selectors are fixed independently of the runtime catalog.
const pages=[
 {key:'robot',path:categoryPaths[2],box:'article[data-robot-guide]',cards:'.rb-card',shops:'.rb-commerce a',sources:'.rb-sources a',names:['Dreame D10 Plus Gen 2','Dreame L10s Ultra Gen 2','Roborock Saros 10R'],queries:['Dreame D10 Plus Gen 2','Dreame L10s Ultra Gen 2','Roborock Saros 10R'],ids:['dreame-d10-plus-gen2','dreame-l10s-ultra-gen2','roborock-saros-10r'],datedSources:true},
 {key:'humidifier',path:categoryPaths[3],box:'#eb-humidifier-products',cards:'.hc-card',shops:'.hc-commerce a',sources:'.hc-source a',names:['Stadler Form Oskar weiß O-020','Beurer LB 200','Beurer LB 55'],queries:['Stadler Form Oskar O-020 weiß','Beurer LB 200 10069','Beurer LB 55 68605'],ids:['oskar-o020','beurer-lb200','beurer-lb55'],cardPrefix:'humidifier-'}
];
// Independent publication oracle: do not import either production render helper.
// Humidifiers record one catalog review date; robots additionally date every model/source.
function evidenceAllows(product,catalog,today,datedSources=false){
 const day=value=>{
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return NaN;
  const time=Date.parse(value+'T00:00:00Z');return Number.isFinite(time)&&new Date(time).toISOString().slice(0,10)===value?time/86400000:NaN;
 };
 if(catalog.market!=='DE'||catalog.max_age_days!==90||product.status!=='verified'||!Array.isArray(product.sources)||!product.sources.length)return false;
 if(product.sources.some(key=>!catalog.sources?.[key]))return false;
 const records=datedSources?[catalog,product,...product.sources.map(key=>catalog.sources[key])]:[catalog];
 const now=day(today);
 return records.every(record=>{
  const age=now-day(record.checked);
  return (!datedSources||record===catalog||record.status==='verified')&&Number.isFinite(age)&&age>=0&&age<=90;
 });
}
function eligibilitySelftest(){
 const catalog={market:'DE',max_age_days:90,checked:'2026-01-01',sources:{manual:{status:'verified',checked:'2026-01-01'}}};
 const product={status:'verified',checked:'2026-01-01',sources:['manual']};
 for(const dated of [false,true]){
  assert(evidenceAllows(product,catalog,'2026-04-01',dated),'Day90 must still be eligible');
  assert(!evidenceAllows(product,catalog,'2026-04-02',dated),'Day91 must withdraw commerce');
  assert(!evidenceAllows(product,catalog,'2025-12-31',dated),'Future evidence must withdraw commerce');
  assert(!evidenceAllows({...product,status:'conflict'},catalog,'2026-01-01',dated),'Conflicted model must withdraw commerce');
  assert(!evidenceAllows({...product,sources:['missing']},catalog,'2026-01-01',dated),'Missing source must withdraw commerce');
  assert(!evidenceAllows(product,{...catalog,checked:'2026-02-30'},'2026-03-01',dated),'Invalid date must withdraw commerce');
 }
 assert(!evidenceAllows(product,{...catalog,sources:{manual:{status:'unverified',checked:'2026-01-01'}}},'2026-01-01',true),'Unverified robot source must withdraw commerce');
 assert(!evidenceAllows(product,{...catalog,checked:'2026-04-02'},'2026-04-02',true),'Refreshing only catalog date must not renew robot sources');
}
eligibilitySelftest();
if(process.argv.includes('--eligibility-selftest')){console.log('PASS categories34 independent freshness boundaries');process.exit(0);}
async function contextFor(browser,width,javaScriptEnabled=true){
 const context=await browser.newContext({viewport:{width,height:900},javaScriptEnabled,serviceWorkers:'block',ignoreHTTPSErrors:proxyTLSException});
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
async function discoveryCheck(page,label){
 const hrefs=await page.locator('#dach-kaufhilfe a[href]').evaluateAll(links=>links.map(a=>new URL(a.href).pathname));
 for(const href of categoryPaths)assert(hrefs.includes(href),`${label}: missing category discovery ${href}`);
}
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
 const results=[];
 try{
  for(const spec of pages)for(const[width,js]of [[320,true],[390,true],[1280,true],[390,false]]){
   assert.equal(spec.names.length,3,'QA must define three independently expected model identities');
   const catalog=JSON.parse(fs.readFileSync(path.resolve(__dirname,`../data/${spec.key}-catalog.json`),'utf8'));
   const today=new Date().toISOString().slice(0,10),expected=[];
   for(let i=0;i<spec.ids.length;i++){
    const product=catalog.products.find(p=>p.id===spec.ids[i]);assert(product,`Missing exact model record ${spec.ids[i]}`);
    assert.equal(product.name,spec.names[i]);assert.equal(product.query,spec.queries[i]);
    expected.push({id:spec.ids[i],query:spec.queries[i],eligible:evidenceAllows(product,catalog,today,spec.datedSources)});
   }
   const context=await contextFor(browser,width,js),page=await context.newPage(),errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   const response=await page.goto(origin+spec.path+'?__probe=1',{waitUntil:'load'});assert.equal(response.status(),200);
   const box=page.locator(spec.box);assert.equal(await box.count(),1);assert.equal(await box.locator(spec.cards).count(),3);
   const text=await box.innerText();for(const name of spec.names)assert(text.includes(name),`${spec.path}: missing model ${name}`);
   const expectedQueries=expected.filter(model=>model.eligible).map(model=>model.query);
   assert.equal(await box.locator(spec.shops).count(),expectedQueries.length,'Missing eligible or unsuppressed stale catalog merchant links');
   for(const model of expected){
    const card=box.locator('#'+(spec.cardPrefix||'')+model.id);
    assert.equal(await card.locator('a[href*="amazon."]').count(),model.eligible?1:0,`Merchant eligibility mismatch: ${model.id}`);
    if(!model.eligible)assert(/pausiert/i.test(await card.innerText()),`Missing paused explanation: ${model.id}`);
   }
   assert((await box.locator(spec.sources).count())>=3,'Official model sources missing');
   assert(/Affiliate|Amazon-Partner/.test(text),'Commercial disclosure absent');
   assert(/keine? eigene[nr]? (Geräte|Produkt)?tests?|nicht selbst getestet/i.test(await page.locator('body').innerText()),'Editorial/test limitation absent');
   const queries=[];
   for(const a of await box.locator(spec.shops).all()){
    const u=new URL(await a.getAttribute('href'));
    assert.equal(u.host,'www.amazon.de');assert.equal(u.pathname,'/s');assert.equal(u.searchParams.get('tag'),'getecoback-21');
    assert(u.searchParams.get('k')?.trim(),'Empty merchant search');
    queries.push(u.searchParams.get('k'));
    assert((await a.getAttribute('rel')).split(/\s+/).includes('sponsored'));
   }
   assert.deepEqual(queries.sort(),expectedQueries.sort(),'Exact eligible model or article number lost in merchant search');
   if(spec.key==='robot')assert.equal(await box.locator('#eufy-c10').count(),0,'Rejected C10 candidate returned');
   const merchantURLs=await page.locator('a[href*="amazon."]').evaluateAll(items=>items.map(a=>a.href));
   assert(merchantURLs.every(href=>new URL(href).hostname==='www.amazon.de'),'Unverified merchant market leaked');
   assert(merchantURLs.every(href=>!/Pinguino|Comfee[ +]M[DP]|Midea[ +]Duo|Whynter|MeacoDry|BPACT14WT|Luftentfeuchter/i.test(decodeURIComponent(href))),'Wrong-category commerce leaked');
   assert.equal(await page.locator('#eb-toppick,#eb-models,#eb-popup,#eb-sticky').count(),0,'Generic purchase overlay returned');
   assert.equal(await page.locator('h1').count(),1);
   assert.equal(await page.locator('html').getAttribute('lang'),'de');
   assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'),origin+spec.path);
   const desc=await page.locator('meta[name=description]').getAttribute('content');assert(desc.length>=120&&desc.length<=155,`Meta length ${desc.length}`);
   assert.equal(await page.locator('script[data-ga4-id="G-E2V0Q9SJ9V"]').count(),1,'GA4 missing or duplicated');
   for(const schema of await page.locator('script[type="application/ld+json"]').allTextContents())JSON.parse(schema);
   const dims=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));assert(dims.scroll<=width+1,JSON.stringify({path:spec.path,...dims}));
   const broken=await box.evaluate(el=>[...el.querySelectorAll('a[href^="#"]')].map(a=>a.getAttribute('href').slice(1)).filter(id=>id&&!document.getElementById(id)));assert.deepEqual(broken,[],'Broken catalog anchor');
   const localArticleLinks=await page.locator('article a[href]').evaluateAll(links=>links.map(a=>new URL(a.href)).filter(u=>u.origin===location.origin&&u.pathname.endsWith('.html')).map(u=>u.pathname));
   for(const href of new Set(localArticleLinks))assert(fs.existsSync(path.join(root,href)),`${spec.path}: missing local article destination ${href}`);
   await discoveryCheck(page,spec.path);assert.deepEqual(errors,[],spec.path);
   if(width===390){
    await page.evaluate(()=>scrollTo({top:0,left:0,behavior:'instant'}));await page.screenshot({path:path.join(out,`${spec.key}${js?'':'-nojs'}-top.png`)});
    await box.locator(spec.cards).first().evaluate(el=>{
     const obstructing=[...document.querySelectorAll('header,nav')].filter(node=>['sticky','fixed'].includes(getComputedStyle(node).position)&&node.getBoundingClientRect().top<=1);
     const headerBottom=Math.max(0,...obstructing.map(node=>node.getBoundingClientRect().bottom));
     scrollTo({top:el.getBoundingClientRect().top+scrollY-headerBottom-16,left:0,behavior:'instant'});
    });
    await page.screenshot({path:path.join(out,`${spec.key}${js?'':'-nojs'}-catalog.png`)});
   }
   results.push({path:spec.path,width,js,eligibleMerchantLinks:expectedQueries.length,pass:true});await context.close();
  }
  const context=await contextFor(browser,390),page=await context.newPage();
  await page.addInitScript(()=>{window.__qaBusinessEvents=[];window.addEventListener('fleet:business',e=>window.__qaBusinessEvents.push(e.detail));});
  await page.goto(origin+'/rechner.html?__probe=1#home-fit-robot');await page.waitForSelector('#home-fit[data-ready]');
  const hf=page.locator('#home-fit'),config=JSON.parse(await page.locator('#home-fit-config').textContent());
  assert.equal(await hf.locator('[data-mode=robot]').getAttribute('aria-pressed'),'true');
  assert.equal(await hf.locator('.hf-notice').innerText(),config.text.example,'Robot defaults presented as a personal assessment');
  await hf.locator('select[name=threshold]').selectOption('high');assert.equal(await hf.locator('.hf-notice').innerText(),config.text.personal);
  assert((await hf.locator('#hf-result').innerText()).includes(config.text.rHigh),'High threshold warning missing');
  await page.evaluate(()=>{location.hash='home-fit-floor';});
  await page.waitForFunction(()=>document.querySelector('#home-fit [data-mode=floor]').getAttribute('aria-pressed')==='true');
  await page.evaluate(()=>{location.hash='home-fit-robot';});
  await page.waitForFunction(expected=>document.querySelector('#home-fit .hf-notice').textContent===expected,config.text.example);
  assert.equal(await hf.locator('select[name=threshold]').inputValue(),'unknown');
  assert.equal(await hf.locator('select[name=dock]').inputValue(),'unknown');
  assert.deepEqual(await page.evaluate(()=>window.__qaBusinessEvents),[],'Probe emitted business event');
  assert.equal(await page.locator('#home-fit-robot').count(),1);await discoveryCheck(page,'calculator');
  results.push({path:'/rechner.html#home-fit-robot',exampleReset:true,probeEvents:0,pass:true});
  for(const pathname of ['/wohnen.html','/tools.html']){
   assert.equal((await page.goto(origin+pathname+'?__probe=1')).status(),200);await discoveryCheck(page,pathname);
   results.push({path:pathname,allFourCategoriesDiscoverable:true,pass:true});
  }
  await context.close();
 }finally{await browser.close();}
 const report={live,proxyTLSException,cases:results};
 if(proxyTLSException)report.tlsNote='This isolated QA context ignored HTTPS errors for the managed proxy CA. It does not verify production certificate trust; perform a separate normally verified HTTPS read.';
 fs.writeFileSync(path.join(out,'browser-categories34.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify({status:'PASS',cases:results.length,live,proxyTLSException,qa:out}));
})().catch(error=>{console.error(error);process.exit(1);});
