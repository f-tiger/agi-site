const assert=require('node:assert/strict');
const {chromium}=require(process.env.NODE_PATH?'playwright':'../../../tools/revenue-studio/node_modules/playwright');
const {spawn}=require('node:child_process');
const path=require('node:path');
const searchAsset='/assets/search-index.json';
function trackIndexRequests(page,origin){
 const requests=[];
 page.on('request',request=>{
  const url=new URL(request.url());
  if(url.origin===origin&&(url.pathname===searchAsset||url.pathname==='/search-index.json'))requests.push(url.pathname);
 });
 return requests;
}

async function checkGermanLaundryDiscovery(browser,base){
 const destination='/waeschetrockner-oder-luftentfeuchter.html#luftentfeuchter-waesche-kosten';
 const positive=['Was kostet eine Ladung Wäsche nur mit meinem Luftentfeuchter?','Stromkosten Luftentfeuchter Wäsche'];
 const ordinary=[
  ['Trockner oder Luftentfeuchter Stromkosten Wäsche','/waeschetrockner-oder-luftentfeuchter.html'],
  ['Luftentfeuchter Keller','/guide/luftentfeuchter-keller.html'],
  ['Stromtarif','/stromtarif-werkstatt.html'],
  ['Wäsche trocknen','/waeschetrockner-oder-luftentfeuchter.html'],
  ['Was kostet ein Luftentfeuchter im Keller zum Wäschetrocknen?'],
  ['Welcher Stromtarif passt zum Wäschetrocknen mit Luftentfeuchter?'],
 ];
 let checks=0;
 const check=(value,message)=>{assert.ok(value,message);checks++;};
 const equal=(actual,expected,message)=>{assert.deepEqual(actual,expected,message);checks++;};
 for(const width of [320,390]){
  const context=await browser.newContext({viewport:{width,height:900}});
  const page=await context.newPage();
  await page.goto(base+'/tools.html?__ci=1');
  await page.locator('#eb-search-toggle').click();
  const input=page.locator('#eb-search-query'),results=page.locator('#eb-search-results a');
  await input.waitFor({state:'visible'});
  const requests=[];
  page.on('request',request=>requests.push({method:request.method(),url:request.url(),body:request.postData()}));
  const search=async query=>{
   await input.fill('');
   await input.press('Enter');
   await page.waitForFunction(()=>{
    const copy=JSON.parse(document.getElementById('eco-chrome-copy').textContent);
    return document.getElementById('eb-search-status').textContent===copy.searchHint;
   });
   await input.fill(query);
   await input.press('Enter');
   await page.waitForFunction(()=>{
    const copy=JSON.parse(document.getElementById('eco-chrome-copy').textContent);
    const status=document.getElementById('eb-search-status').textContent;
    return status===copy.searchEmpty||!!document.querySelector('#eb-search-results a');
   });
   return results.evaluateAll(links=>links.map(link=>({href:link.getAttribute('href'),language:link.hreflang})));
  };
  for(const query of positive){
   const matches=await search(query);
   equal(matches[0],{href:destination,language:'de'},'The first result opens the German single-method answer');
  }
  for(const [query,previousDestination] of ordinary){
   const matches=await search(query);
   check(matches.every(match=>match.href!==destination),'A different buying or information intent does not lead to the single-method tool: '+query);
   if(previousDestination)equal(matches[0]?.href,previousDestination,'Existing searches keep their first destination: '+query);
  }
  equal((await search('Welcher Ersatzfilter passt in meinen Beurer LR 401?'))[0],{href:'/ersatzfilter.html#beurer-lr401',language:'de'},'Beurer model reaches the audited exact filter');
  equal((await search('Welchen Filter brauche ich für meinen Levoit Core 300S ohne Pro?'))[0],{href:'/ersatzfilter.html#levoit-core-300s',language:'de'},'Core 300S reaches its exact standard filter');
  const ventilation='Soll ich meinen Keller lüften? Innen 16 °C und 75 %, draußen 8 °C und 90 %, Wand 12 °C.';
  equal((await search(ventilation))[0],{href:'/guide/keller-lueften-sommer.html#taupunkt',language:'de'},'Paired cellar readings lead to the measured ventilation check');
  const hose='Kann ich den Schlauch vom MeacoDry Arete One 20L nach oben in das Waschbecken legen?';
  equal((await search(hose))[0],{href:'/guide/luftentfeuchter-keller.html#ablauf-vor-kauf',language:'de'},'A higher sink leads to the German drainage section');
  await search('eco-local-privacy-marker-6381');
  equal(await results.count(),0,'An arbitrary private phrase yields no result');
  await search(positive[1]);
  equal(requests,[{method:'GET',url:base+searchAsset,body:null}],'Typing searches only the static local index and makes no request with the terms');
  await results.first().focus();
  await page.keyboard.press('Enter');
  await page.waitForURL(base+destination);
  check(await page.locator('#luftentfeuchter-waesche-kosten').getByRole('heading').isVisible(),'Keyboard navigation reaches the actual answer');
  await context.close();
 }

 const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:320,height:900}});
 const page=await context.newPage();
 for(const route of ['/tools.html','/guide/waesche-trocknen-wohnung.html']){
  await page.goto(base+route+'?__ci=1');
  const link=page.locator('a[href="'+destination+'"]:visible').first();
  check(await link.isVisible(),'A reader can find the task with JavaScript disabled on '+route);
  await link.focus();
  await page.keyboard.press('Enter');
  await page.waitForURL(base+destination);
  check(await page.locator('#luftentfeuchter-waesche-kosten').getByRole('heading').isVisible(),'The clean static link reaches the same section');
  check(await page.locator('#luftentfeuchter-waesche-kosten form').isHidden(),'The no-script reader does not submit a form');
 }
 await context.close();
 return checks;
}

(async()=>{
 const base=process.env.BASE_URL||'http://127.0.0.1:8766';
 const origin=new URL(base).origin;
 const server=process.env.BASE_URL?null:spawn('python3',['-m','http.server','8766','--directory',path.resolve(__dirname,'../site')],{stdio:'ignore'});
 let browser;let checks=0;
 try{
  let ready = false;
  for (let attempt = 0; attempt < 30 && !ready; attempt++) {
   // Read response headers only. The full HTML is checked by Chromium below.
   ready = await fetch(base, {method: 'HEAD', signal: AbortSignal.timeout(1000)})
    .then(response => response.ok, () => false);
   if (!ready) await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert(ready, 'Search preview did not start');
  browser=await chromium.launch({headless:true});
  const createContext=browser.newContext.bind(browser);
  browser.newContext=async options=>{
   const context=await createContext({...options,userAgent:'getecoback-ci'});
   context.setDefaultTimeout(15000);
   await context.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin!==new URL(base).origin||r.request().method()!=='GET')return r.abort();if(u.pathname.startsWith('/api/'))return r.fulfill({body:'{}'});return r.continue();});
   return context;
  };
  const cases=[['/','de','kalte Füße'],['/en/','en','dry clothes'],['/nl/wonen.html','nl','vocht'],['/au/home-comfort.html','en-AU','fan'],['/fr/calculateur.html','fr','électricité'],['/es/calculadora.html','es','tarifas'],['/it/','it','freddo'],['/zh/agents/cbam-supplier-data.html','zh-CN','CBAM']];
  for(const width of [320,390,1280]){
   const c=await browser.newContext({viewport:{width,height:900},userAgent:'getecoback-ci'});
   await c.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin!==new URL(base).origin||r.request().method()!=='GET')return r.abort();if(u.pathname.startsWith('/api/'))return r.fulfill({body:'{}'});return r.continue();});
   const page=await c.newPage();
   const indexRequests=trackIndexRequests(page,origin);
   for(const [route,lang,q] of cases){
    indexRequests.length=0;
    await page.goto(base+route+'?__ci=1');
    assert.equal(await page.locator('#eco-discovery').count(),1);
    await page.locator('#eb-search-toggle').click();
    await page.waitForFunction(()=>document.activeElement.id==='eb-search-query');
    assert.equal(await page.locator('#eb-search-toggle').getAttribute('aria-expanded'),'true');
    assert(await page.locator('[data-eco-task]').first().isVisible());
    assert(await page.locator('#eb-search-panel').evaluate(e=>{const b=e.getBoundingClientRect();return b.left>=0&&b.right<=innerWidth+1;}));
    await page.locator('#eb-search-query').fill(q);
    await page.waitForSelector('#eb-search-results a');
    assert.deepEqual(indexRequests,[searchAsset],`Static search index request for ${lang} at ${width}px`);
    assert(await page.locator('#eb-search-results a').evaluateAll((a,l)=>a.every(x=>x.hreflang===l),lang));
    await page.locator('#eb-search-query').fill('zzznomatchingneedzzz');
    await page.waitForFunction(()=>!document.querySelector('#eb-search-results a'));
    assert(await page.locator('[data-eco-task]').first().isVisible());
    await page.keyboard.press('Escape');assert(await page.locator('#eb-search-panel').isHidden());
    assert.equal(await page.evaluate(()=>document.activeElement.id),'eb-search-toggle');checks+=9;
   }
   await c.close();
  }
  // The live fleet account tools can wrap the search into a new desktop row.
  // Test that composition as well as the static-build layout, including no JS.
  for(const javaScriptEnabled of [true,false]){
   const wrapped=await browser.newContext({javaScriptEnabled,viewport:{width:1280,height:900},userAgent:'getecoback-ci'});
   const page=await wrapped.newPage();await page.goto(base+'/?__ci=1');
   await page.evaluate(css=>{const style=document.createElement('style');style.textContent=css;document.head.append(style);},'.eb-nav-in{display:flex!important;flex-wrap:wrap!important}.eb-nav-in>.eb-links{flex-basis:100%!important}');
   await page.locator('#eb-search-toggle').click();
   assert(await page.locator('#eb-search-panel').evaluate(e=>{const b=e.getBoundingClientRect();return b.left>=0&&b.right<=innerWidth+1;}),'wrapped fleet header must keep the full panel visible');
   await wrapped.close();checks++;
  }
  const c=await browser.newContext({javaScriptEnabled:false,viewport:{width:320,height:900}});
  const page=await c.newPage();await page.goto(base+'/?__ci=1');await page.locator('#eb-search-toggle').click();
  assert(await page.locator('[data-eco-task]').first().isVisible());assert(await page.locator('#eb-search-form').isHidden());
  await c.close();checks+=2;
  const fail=await browser.newContext();
  const staticIndexRequest=url=>url.origin===origin&&url.pathname===searchAsset;
  await fail.route(staticIndexRequest,r=>r.fulfill({status:503,body:'unavailable'}));
  const f=await fail.newPage(),failedIndexRequests=trackIndexRequests(f,origin);
  await f.goto(base+'/?__ci=1');await f.locator('#eb-search-toggle').click();await f.locator('#eb-search-query').fill('waesche trocknen');await f.waitForFunction(()=>document.querySelector('#eb-search-status').textContent.includes('nicht verfügbar'));
  assert.deepEqual(failedIndexRequests,[searchAsset]);
  assert(await f.locator('[data-eco-task]').first().isVisible());
  assert.equal(await f.locator('#eb-search-results a').count(),0);
  await fail.unroute(staticIndexRequest);
  await f.locator('#eb-search-query').press('Enter');
  await f.locator('#eb-search-results a[href="/waeschetrockner-oder-luftentfeuchter.html"]').waitFor({state:'visible'});
  assert.deepEqual(failedIndexRequests,[searchAsset,searchAsset]);
  await fail.close();checks+=5;
  checks+=await checkGermanLaundryDiscovery(browser,base);
  console.log(`PASS demand discovery: ${checks} checks, 8 locales, 3 widths, no-JS and static-index failure/retry`);
 }finally{if(browser)await browser.close();if(server)server.kill();}
})().catch(e=>{console.error(e);process.exit(1)});
