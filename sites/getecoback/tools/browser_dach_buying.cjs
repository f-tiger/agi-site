// Final-artifact browser regression. Local files by default; LIVE=1 for read-only QA.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../site'),origin='https://getecoback.com',live=process.env.LIVE==='1';
const out=process.env.QA_DIR||'/tmp/eco-dach-buying-qa';fs.mkdirSync(out,{recursive:true});
const routes=[
 {path:'/guide/smarte-heizkoerperthermostate-lohnen-sich.html',box:'#eb-thermostat-products',cards:'.tc-card',shops:'.tc-commerce a',names:['tado°','Bosch','FRITZ!'],source:'.tc-source a'},
 {path:'/guide/saugwischer-kaufberatung.html',box:'article[data-floorcare-guide]',cards:'.fc-card',shops:'.fc-commerce a',names:['Tineco FLOOR ONE S7 FlashDry','Dreame H14 Pro','Roborock F25 XT'],source:'.fc-sources a'}
];
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
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
 const results=[];
 try{
  for(const r of routes)for(const[width,js]of [[320,true],[390,true],[1280,true],[390,false]]){
   const context=await contextFor(browser,width,js),page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   const response=await page.goto(origin+r.path+'?__probe=1',{waitUntil:'load'});assert.equal(response.status(),200);
   const box=page.locator(r.box);assert.equal(await box.count(),1);assert.equal(await box.locator(r.cards).count(),3);
   const text=await box.innerText();for(const name of r.names)assert(text.includes(name),`${r.path}: ${name}`);
   assert.equal(await box.locator(r.shops).count(),3);assert((await box.locator(r.source).count())>=3);
   for(const a of await box.locator(r.shops).all()){
    const u=new URL(await a.getAttribute('href'));assert.equal(u.host,'www.amazon.de');assert.equal(u.pathname,'/s');assert.equal(u.searchParams.get('tag'),'getecoback-21');
    assert((await a.getAttribute('rel')).includes('sponsored'));
   }
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
   results.push({path:r.path,width,js,pass:true});await context.close();
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
})().catch(e=>{console.error(e);process.exit(1)});
