// Real mobile/desktop layouts and commerce events; no external or live events.
const {chromium,webkit}=require('playwright');
const fs=require('node:fs/promises');
const path=require('node:path');
const assert=require('node:assert/strict');
const data=require('../data/country-categories.json');
const origin='https://getecoback.com', root=path.resolve('site');
(async()=>{
 const dir=process.env.QA_DIR||'/tmp/eco-country-qa'; await fs.mkdir(dir,{recursive:true});
 const records=[];
 for(const [engine,type] of [['chromium',chromium],['webkit',webkit]]){
  const browser=await type.launch();
  try {for(const width of [320,390,1280]) for(const c of data.countries) for(const url of [c.path,c.guide.path]){
   const ctx=await browser.newContext({viewport:{width,height:900},isMobile:width<600,timezoneId:c.market==='AU'?'Australia/Sydney':c.market==='NL'?'Europe/Amsterdam':'Europe/Berlin'});
   await ctx.addInitScript(()=>{
    Object.defineProperty(navigator,'webdriver',{get:()=>false});
    window.__events=[];window.__print=0;window.print=()=>window.__print++;
    navigator.sendBeacon=(url,b)=>{Promise.resolve(b.text()).then(s=>window.__events.push(JSON.parse(s)));return true;};
   });
   await ctx.route('**/*',async route=>{
    const u=new URL(route.request().url());if(u.origin!==origin)return route.abort();
    if(u.pathname.startsWith('/api/'))throw Error('No live telemetry allowed');
    const file=path.join(root,u.pathname+(u.pathname.endsWith('/')?'index.html':''));
    const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.md':'text/plain'}[path.extname(file)]||'application/octet-stream';
    try{return route.fulfill({contentType:mime,body:await fs.readFile(file)});}catch{return route.fulfill({status:404,body:'missing'});}
   });
   const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('popup',p=>p.close().catch(()=>{}));
   await page.goto(origin+url);assert.equal(await page.locator('html').getAttribute('lang'),c.lang);
   const layout=await page.evaluate(()=>({fits:document.documentElement.scrollWidth<=innerWidth+1,overflow:[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).map(e=>({tag:e.tagName,cls:e.className,text:e.textContent.slice(0,100),right:e.getBoundingClientRect().right})).slice(0,12)}));
   if(!layout.fits)await page.screenshot({path:path.join(dir,`overflow-${engine}-${c.market}-${width}-${url===c.path?'hub':'guide'}.png`),fullPage:true});
   assert(layout.fits,`${url} overflow at ${width}: ${JSON.stringify(layout.overflow)}`);
   if(url===c.path){
    for(const cat of c.categories){
     await page.locator('#country-need').selectOption(cat.id);
     const link=page.locator('[data-country-action="need_result"]');
     assert(await link.isVisible());assert.equal(await link.getAttribute('href'),cat.related[0][1]);
    }
    await page.locator('#country-need').selectOption('');assert.equal(await page.locator('[data-country-action="need_result"]').isVisible(),false);
   }else{
    const before=await page.evaluate(()=>window.__events.length);
    await page.locator('.checklist input').first().check();
    assert.equal(await page.evaluate(()=>window.__events.length),before,'Checkbox contents must stay private');
    await page.locator('[data-country-print]').click();assert.equal(await page.evaluate(()=>window.__print),1);
   }
   await page.locator('[data-country-shop]').first().click();await page.waitForTimeout(30);
   const events=await page.evaluate(()=>window.__events);
   const shops=events.filter(e=>e.m?.action==='merchant');assert.equal(shops.length,1);
   assert.equal(shops[0].n,c.market==='DE'?'affiliate_click':'outbound_choice');
   const dest=new URL(shops[0].m.link_url);assert.equal(dest.hostname,'www.'+c.merchant);
   assert.equal(dest.searchParams.get('tag'),c.market==='DE'?'getecoback-21':null);
   if(c.market!=='DE')assert(!events.some(e=>e.n==='affiliate_click'));
   assert.equal(events.filter(e=>e.n==='page_view').length,1);assert.equal(errors.length,0,errors.join(';'));
   if(engine==='chromium'&&width===390){await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(dir,`country-${c.market}-${url===c.path?'hub':'guide'}.png`),fullPage:true});}
   // Explicit QA visits and privacy preferences produce no events.
   await page.goto(origin+url+'?qa=1');assert.equal((await page.evaluate(()=>window.__events)).length,0);
   await page.locator('[data-country-shop]').first().click();await page.waitForTimeout(20);assert.equal((await page.evaluate(()=>window.__events)).length,0);
   records.push({engine,width,url,market:c.market,pass:true});await ctx.close();
  }}finally{await browser.close();}
 }
 await fs.writeFile(path.join(dir,'country-categories.json'),JSON.stringify(records,null,2));
 console.log(`PASS country categories: ${records.length} layouts/paths; one event per click; ordinary NL/AU links never counted as commissions.`);
})().catch(e=>{console.error(e);process.exit(1);});
