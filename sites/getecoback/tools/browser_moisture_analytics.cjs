// Fully intercepted browser proof: real form -> consent channel -> mock Google.
// No production events, merchant navigation or customer inputs leave the browser.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../site'),origin='https://getecoback.com';
(async()=>{
 const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),headless:true,args:['--no-sandbox']});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844}}),hits=[],errors=[];
  await context.addInitScript(()=>Object.defineProperty(navigator,'webdriver',{get:()=>false}));
  await context.route('**/*',async route=>{
   const u=new URL(route.request().url());
   if(u.hostname==='www.googletagmanager.com')return route.fulfill({contentType:'application/javascript',body:`const emit=a=>{if(a[0]==='event')fetch('https://www.google-analytics.com/g/collect',{method:'POST',body:JSON.stringify([a[1],a[2]])});};window.dataLayer.forEach(emit);const push=window.dataLayer.push.bind(window.dataLayer);window.dataLayer.push=(...args)=>{args.forEach(emit);return push(...args);};`});
   if(u.hostname.endsWith('google-analytics.com')){hits.push(JSON.parse(route.request().postData()));return route.fulfill({status:204});}
   if(u.origin!==origin)return route.abort();
   if(u.pathname.startsWith('/api/'))return route.fulfill({contentType:'application/json',body:'{"ok":true}'});
   let rel=u.pathname.slice(1);if(!rel||rel.endsWith('/'))rel+='index.html';
   const f=path.join(root,rel),types={'.mjs':'text/javascript','.js':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json'};
   return fs.existsSync(f)?route.fulfill({contentType:types[path.extname(f)]||'application/octet-stream',body:fs.readFileSync(f)}):route.fulfill({status:404,body:'missing'});
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/guide/luftentfeuchter-ratgeber.html');
  const form=page.locator('#eb-moisture-choice form');
  assert.equal(await page.locator('#fleet-analytics-choice').count(),0,'no popup');

  await page.waitForFunction(()=>document.querySelector('iframe[title="Optional analytics"]')?.contentWindow.dataLayer?.length>0);
  await form.locator('[name=humidity]').selectOption('high');await form.locator('[name=temperature]').selectOption('warm');
  await form.locator('button').click();await page.waitForTimeout(100);
  assert.equal(hits.filter(h=>h[0]==='buyer_result').length,1);
  const fields=hits.find(h=>h[0]==='buyer_result')[1];assert.equal(fields.tool_id,'guide/luftentfeuchter-ratgeber');
  for(const forbidden of ['humidity','temperature','choice','action','market'])assert(!Object.hasOwn(fields,forbidden));
  await form.locator('button').click();await page.waitForTimeout(100);assert.equal(hits.filter(h=>h[0]==='buyer_result').length,1,'same result not counted twice');
  await page.evaluate(()=>document.querySelector('#eb-moisture-choice').addEventListener('click',e=>{if(e.target.closest('a'))e.preventDefault();}));
  await page.locator('#eb-moisture-choice [data-choice-action=shop]:visible').first().click();await page.waitForTimeout(100);
  assert.equal(hits.filter(h=>h[0]==='affiliate_click').length,1,'one merchant click despite legacy callbacks');
  await page.locator('[data-analytics-choice=denied]').click();
  const count=hits.length;await form.locator('[name=temperature]').selectOption('cold');await form.locator('button').click();await page.waitForTimeout(100);assert.equal(hits.length,count,'withdrawal suppresses future results');
  assert.deepEqual(errors,[]);console.log('Moisture analytics: completion, deduplication, privacy, withdrawal and single affiliate click passed (intercepted).');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
