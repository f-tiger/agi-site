const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const browserRequire=require('node:module').createRequire(path.resolve(__dirname,'../../../tools/revenue-studio/package.json'));
const {chromium}=browserRequire('playwright');
const site=path.resolve(__dirname,'../site'),html=fs.readFileSync(path.join(site,'guide/heizdecke-stromverbrauch.html'),'utf8');
const article=html.match(/<article[^>]*>[\s\S]*?<\/article>/)[0];
const assets=html.match(/<!--EB_PERSONAL_WARMTH_ASSETS-->([\s\S]*?)<!--\/EB_PERSONAL_WARMTH_ASSETS-->/)[1];
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>{
   const url=new URL(route.request().url());
   assert.equal(url.origin,'https://eco.test');
   if(url.pathname.startsWith('/assets/'))return route.fulfill({path:path.join(site,url.pathname),contentType:url.pathname.endsWith('.mjs')?'text/javascript':'text/css'});
   return route.fulfill({contentType:'text/html',body:`<!doctype html><html lang="de"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{max-width:720px;margin:auto;padding:20px;font:16px sans-serif}</style></head><body>${article}<script>window.events=[];window.copied='';window.addEventListener('fleet:business',e=>events.push(e.detail));Object.defineProperty(navigator,'webdriver',{get:()=>false});Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{window.copied=text;}}});</script>${assets}</body></html>`});
  });
  await page.goto('https://eco.test/guide/heizdecke-stromverbrauch.html');
  const root=page.locator('#waerme-rechner'),out=root.locator('[data-warmth-result]');
  await page.waitForFunction(()=>document.querySelector('[data-warmth-result]').textContent.includes('1 Nutzungstag'));
  assert.match(await out.innerText(),/220 Wh = 0,22 kWh/);assert.equal(await page.evaluate(()=>events.length),0);
  await root.locator('[type=submit]').click();assert.equal(await page.evaluate(()=>events.length),0);
  for(const [key,energy] of [['short','55 Wh'],['desk','330 Wh'],['sofa','220 Wh']]){
   await root.locator(`[data-warmth-example=${key}]`).click();assert((await out.innerText()).includes(energy));
   await root.locator('[type=submit]').click();
  }
  assert.equal(await page.evaluate(()=>events.filter(e=>e.name==='eco_warmth_calculate').length),0);
  await root.locator('summary').click();
  await root.locator('[name=country]').selectOption('CH');assert(await out.isHidden());
  await root.locator('[type=submit]').click();assert.match(await out.innerText(),/CHF/);
  assert.equal(await page.evaluate(()=>events.filter(e=>e.name==='eco_warmth_calculate').length),0);
  await root.locator('[name=hours]').fill('2.5');await root.locator('[name=watts]').fill('80');
  await root.locator('[name=tariff]').fill('0.30');await root.locator('[name=days]').fill('30');
  assert(await root.locator('[data-warmth-copy]').isDisabled());
  await root.locator('[type=submit]').click();assert.match(await out.innerText(),/Eigene Annahmen/);assert.match(await out.innerText(),/1,80/);
  assert.equal(await page.evaluate(()=>events.filter(e=>e.name==='eco_warmth_calculate').length),1);
  await root.locator('[data-warmth-copy]').click();assert.match(await page.evaluate(()=>copied),/CHF/);
  assert.equal(await page.evaluate(()=>events.filter(e=>e.name==='eco_warmth_share').length),1);
  assert(await page.evaluate(()=>events.every(e=>Object.keys(e).length===1&&Object.keys(e)[0]==='name')));
  const before=await page.evaluate(()=>events.length);await page.evaluate(()=>localStorage.setItem('fleet_ga4_choice_v1','denied'));
  await root.locator('[data-warmth-example=short]').click();await root.locator('[data-warmth-copy]').click();assert.equal(await page.evaluate(()=>events.length),before);
  await page.evaluate(()=>{localStorage.removeItem('fleet_ga4_choice_v1');navigator.clipboard.writeText=async()=>{throw Error('blocked')};});
  await root.locator('[data-warmth-copy]').click();assert(await root.locator('[data-warmth-fallback]').isVisible());assert.equal(await page.evaluate(()=>events.length),before);
  for(const width of [320,390,1280]){await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
  assert.deepEqual(errors,[]);
  const noJS=await browser.newPage({javaScriptEnabled:false});
  const noJSRequests=[];
  await noJS.route('**/*',route=>{noJSRequests.push(route.request().url());return route.fulfill({contentType:'text/html',body:`<!doctype html><html lang="de"><body>${article}${assets}</body></html>`});});
  await noJS.goto('https://eco.test/guide/heizdecke-stromverbrauch.html');
  const staticTool=noJS.locator('#waerme-rechner');
  assert(await staticTool.locator('form').isHidden());
  assert(await staticTool.locator('[data-warmth-example=sofa]').isDisabled());
  assert(await staticTool.locator('[data-warmth-copy]').isDisabled());
  assert.match(await staticTool.locator('table').innerText(),/220 Wh/);
  assert(noJSRequests.every(url=>!url.includes('?country=')&&!url.includes('&watts=')));
  assert.equal(noJS.url(),'https://eco.test/guide/heizdecke-stromverbrauch.html');
  await noJS.close();
  await page.goto('https://eco.test/guide/heizdecke-stromverbrauch.html?qa=1');
  await root.locator('[data-warmth-example=desk]').click();assert.equal(await page.evaluate(()=>events.length),0);
  console.log('PASS warmth: no-input examples, explicit own calculation, CHF, successful-copy only, privacy withdrawal, fallback, no-JS input isolation, 3 widths');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1)});
