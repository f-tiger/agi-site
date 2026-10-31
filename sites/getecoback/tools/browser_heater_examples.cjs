const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const requireBrowser=require('node:module').createRequire(path.resolve(__dirname,'../../../tools/revenue-studio/package.json'));
const {chromium}=requireBrowser('playwright');
const site=path.resolve(__dirname,'../site');
const html=fs.readFileSync(path.join(site,'guide/heizluefter-stromverbrauch.html'),'utf8');
const block=html.match(/<!--EB_HEATCOST-->([\s\S]*?)<!--\/EB_HEATCOST-->/)[1];
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage();
  // Fixture contains the shipped tool, no analytics bundles. Every request is intercepted.
  await page.route('**/*',route=>{
   const url=new URL(route.request().url());
   if(url.origin!=='https://eco.test')throw Error('Unexpected external request');
   if(url.pathname.startsWith('/assets/'))return route.fulfill({path:path.join(site,url.pathname),contentType:url.pathname.endsWith('.mjs')?'text/javascript':'text/css'});
   return route.fulfill({contentType:'text/html',body:`<!doctype html><html lang="de"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/assets/demand-tools.css"></head><body style="max-width:720px;margin:auto">${block}<script>window.events=[];window.gtag=(...args)=>events.push(args);Object.defineProperty(navigator,'webdriver',{get:()=>false});</script><script type="module" src="/assets/demand-tools.mjs"></script></body></html>`});
  });
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('https://eco.test/');
  const root=page.locator('#eb-heater-cost'),out=root.locator('[data-result]');
  await out.waitFor({state:'visible'});
  assert.match(await out.innerText(),/0,27 € pro Tag/);
  assert.equal(await page.evaluate(()=>events.length),0);
  await root.locator('[type=submit]').click();
  assert.equal(await page.evaluate(()=>events.length),0);
  assert.match(await out.innerText(),/Rechenbeispiel/);
  for(const [key,cost]of [['2h','1,60'],['4h','3,20'],['20min','0,27']]){
   await root.locator(`[data-heater-example="${key}"]`).click();
   assert((await out.innerText()).includes(cost+' € pro Tag'));
   assert.match(await out.innerText(),/Rechenbeispiel/);
   await root.locator('[type=submit]').click();
   assert.equal(await page.evaluate(()=>events.length),0);
  }
  assert.equal(await page.evaluate(()=>events.length),0);
  await root.locator('summary').click();
  await root.locator('[name=hours]').fill('2');
  await root.locator('[name=tariff]').fill('0.30');
  assert(await out.isHidden());
  await root.locator('[type=submit]').click();
  assert.match(await out.innerText(),/1,20 € pro Tag/);
  assert.equal(await page.evaluate(()=>events.filter(x=>x[1]==='stromkosten_calc').length),1);
  for(const width of [320,390,1280]){
   await page.setViewportSize({width,height:900});
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  }
  assert.deepEqual(errors,[]);
  console.log('PASS heater scenarios: fractional time, editable tariff, no example completion events, 3 widths');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
