const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../site'),origin='https://getecoback.com';
(async()=>{const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']}: {})});let checks=0;
try{for(const [slug,expected]of [['portable-air-conditioner-running-cost','63.00'],['fan-running-cost','3.15']]){
 const ctx=await browser.newContext({viewport:{width:390,height:844},locale:'en-AU',timezoneId:'Australia/Sydney'}),hits=[],errors=[];
 await ctx.addInitScript(()=>Object.defineProperty(navigator,'webdriver',{get:()=>false}));
 await ctx.route('**/*',async route=>{const u=new URL(route.request().url());
  if(u.hostname==='www.googletagmanager.com')return route.fulfill({contentType:'text/javascript',body:`const emit=a=>{if(a[0]==='event')fetch('https://www.google-analytics.com/g/collect',{method:'POST',body:JSON.stringify([a[1],a[2]])});};window.dataLayer.forEach(emit);const push=window.dataLayer.push.bind(window.dataLayer);window.dataLayer.push=(...a)=>{a.forEach(emit);return push(...a);};`});
  if(u.hostname.endsWith('google-analytics.com')){hits.push(JSON.parse(route.request().postData()));return route.fulfill({status:204});}
  if(u.origin!==origin)return route.abort();if(u.pathname.startsWith('/api/'))throw Error('Unexpected telemetry');
  const file=path.join(root,u.pathname+(u.pathname.endsWith('/')?'index.html':'')),mime={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'};
  return fs.existsSync(file)?route.fulfill({contentType:mime[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)}):route.fulfill({status:404,body:'missing'});
 });
 const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(origin+'/au/'+slug+'.html');await page.locator('[data-au-cost][data-ready=true]').waitFor();const calc=page.locator('[data-au-cost]'),form=calc.locator('form');
 await form.locator('[type=submit]').click();assert((await calc.locator('[data-result]').innerText()).includes('AUD '+expected));assert.equal(hits.filter(x=>x[0]==='tool_complete').length,0);checks+=2;
 await page.waitForFunction(()=>document.querySelector('iframe[title="Optional analytics"]')?.contentWindow.dataLayer?.length>0);
 await form.locator('[type=submit]').click();await page.waitForTimeout(80);assert.equal(hits.filter(x=>x[0]==='tool_complete').length,0);checks++;
 await form.locator('[name=own]').check();await form.locator('[type=submit]').click();await page.waitForTimeout(100);assert.equal(hits.filter(x=>x[0]==='tool_complete').length,1);checks++;
 await form.locator('[type=submit]').click();await page.waitForTimeout(80);assert.equal(hits.filter(x=>x[0]==='tool_complete').length,1);checks++;
 const d=page.waitForEvent('download');await calc.locator('[data-export]').click();const downloaded=await d;const text=fs.readFileSync(await downloaded.path(),'utf8');assert(text.includes('Your checked inputs'));assert(text.includes('Australian cents/kWh'));assert(text.includes('AUD '+expected));await page.waitForTimeout(80);assert.equal(hits.filter(x=>x[0]==='tool_export').length,1);checks+=4;
 for(const [name,fields]of hits.filter(x=>['tool_complete','tool_export'].includes(x[0]))){assert.equal(fields.tool_id,'au/'+slug);for(const k of ['watts','hours1','cents1','days','own','result'])assert(!Object.hasOwn(fields,k));}checks++;
 await form.locator('[name=hours1]').fill('23');await form.locator('[type=submit]').click();assert((await calc.locator('[data-error]').innerText()).includes('24 hours'));assert.equal(await calc.locator('[data-export]').isVisible(),false);assert.equal(hits.filter(x=>x[0]==='tool_complete').length,1);checks+=3;
 await page.locator('[data-analytics-choice=denied]').click();const n=hits.length;
 await form.locator('[name=hours1]').fill('4');await form.locator('[name=watts]').fill('0');await form.locator('[type=submit]').click();await page.waitForTimeout(80);assert((await calc.locator('[data-result]').innerText()).includes('AUD 0.00'));assert.equal(hits.length,n);checks+=2;
 await form.locator('[name=watts]').fill('');assert.equal(await calc.locator('[data-result]').isVisible(),false);checks++;
 for(const width of [320,390,1280]){await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));checks++;}
 await form.locator('[name=watts]').fill(slug.startsWith('fan')?'50':'1000');await form.locator('[type=submit]').click();assert.deepEqual(errors,[]);checks++;await page.setViewportSize({width:390,height:844});const dir=process.env.QA_DIR||'/tmp/eco-au-qa';fs.mkdirSync(dir,{recursive:true});await calc.screenshot({path:path.join(dir,slug+'.png')});await ctx.close();
}console.log('PASS Australia: '+checks+' browser checks, two AUD calculators, privacy, export, time limits, zero and mobile layouts.');}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
