const assert=require('node:assert/strict');
const {chromium}=require(process.env.NODE_PATH?'playwright':'../../../tools/revenue-studio/node_modules/playwright');
const {spawn}=require('node:child_process');
const path=require('node:path');
(async()=>{
 const base=process.env.BASE_URL||'http://127.0.0.1:8766';
 const server=process.env.BASE_URL?null:spawn('python3',['-m','http.server','8766','--directory',path.resolve(__dirname,'../site')],{stdio:'ignore'});
 let browser;let checks=0;
 try{
  for(let i=0;i<30;i++){try{await fetch(base);break;}catch{await new Promise(r=>setTimeout(r,100));}}
  browser=await chromium.launch({headless:true});
  const cases=[['/','de','kalte Füße'],['/en/','en','dry clothes'],['/nl/wonen.html','nl','vocht'],['/au/home-comfort.html','en-AU','fan'],['/fr/calculateur.html','fr','électricité'],['/es/calculadora.html','es','tarifas'],['/it/','it','freddo'],['/zh/agents/cbam-supplier-data.html','zh-CN','CBAM']];
  for(const width of [320,390,1280]){
   const c=await browser.newContext({viewport:{width,height:900},userAgent:'getecoback-ci'});
   await c.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin!==new URL(base).origin)return r.abort();if(u.pathname.startsWith('/api/'))return r.fulfill({body:'{}'});return r.continue();});
   const page=await c.newPage();
   for(const [route,lang,q] of cases){
    await page.goto(base+route+'?__ci=1');
    assert.equal(await page.locator('#eco-discovery').count(),1);
    await page.locator('#eb-search-toggle').click();
    await page.waitForFunction(()=>document.activeElement.id==='eb-search-query');
    assert.equal(await page.locator('#eb-search-toggle').getAttribute('aria-expanded'),'true');
    assert(await page.locator('[data-eco-task]').first().isVisible());
    assert(await page.locator('#eb-search-panel').evaluate(e=>{const b=e.getBoundingClientRect();return b.left>=0&&b.right<=innerWidth+1;}));
    await page.locator('#eb-search-query').fill(q);
    await page.waitForSelector('#eb-search-results a');
    assert(await page.locator('#eb-search-results a').evaluateAll((a,l)=>a.every(x=>x.hreflang===l),lang));
    await page.locator('#eb-search-query').fill('zzznomatchingneedzzz');
    await page.waitForFunction(()=>!document.querySelector('#eb-search-results a'));
    assert(await page.locator('[data-eco-task]').first().isVisible());
    await page.keyboard.press('Escape');assert(await page.locator('#eb-search-panel').isHidden());
    assert.equal(await page.evaluate(()=>document.activeElement.id),'eb-search-toggle');checks+=8;
   }
   await c.close();
  }
  const c=await browser.newContext({javaScriptEnabled:false,viewport:{width:320,height:900}});
  const page=await c.newPage();await page.goto(base+'/?__ci=1');await page.locator('#eb-search-toggle').click();
  assert(await page.locator('[data-eco-task]').first().isVisible());assert(await page.locator('#eb-search-form').isHidden());
  await c.close();checks+=2;
  const fail=await browser.newContext();await fail.route('**/search-index.json',r=>r.fulfill({status:503,body:'unavailable'}));
  const f=await fail.newPage();await f.goto(base+'/?__ci=1');await f.locator('#eb-search-toggle').click();await f.locator('#eb-search-query').fill('waesche');await f.waitForFunction(()=>document.querySelector('#eb-search-status').textContent.includes('nicht verfügbar'));
  assert(await f.locator('[data-eco-task]').first().isVisible());await fail.close();checks++;
  console.log(`PASS demand discovery: ${checks} checks, 8 locales, 3 widths, no-JS and failed-index fallback`);
 }finally{if(browser)await browser.close();if(server)server.kill();}
})().catch(e=>{console.error(e);process.exit(1)});
