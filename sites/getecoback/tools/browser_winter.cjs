// Real generated pages; every request intercepted, no production analytics.
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../site'),origin='https://getecoback.com';
(async()=>{const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']}: {})});let checks=0;
try{
for(const [slug,kind,expected,lang='de']of [['smarte-heizkoerperthermostate-lohnen-sich','thermostat','7,5'],['duschen-kosten-rechner','shower','191,52'],['lichterkette-stromkosten','lights','0,71'],['smart-radiator-valves-worth-it','thermostat','7.5','en'],['shower-cost-calculator','shower','191.52','en'],['fairy-lights-electricity-cost','lights','0.71','en'],['valvole-termostatiche-smart-convengono','thermostat','7,5','it'],['costo-doccia-calcolatore','shower','191,52','it'],['consumo-luci-natalizie-timer','lights','0,71','it']]){
 const ctx=await browser.newContext({viewport:{width:390,height:844}}),hits=[],errors=[];
 await ctx.addInitScript(()=>Object.defineProperty(navigator,'webdriver',{get:()=>false}));
 await ctx.route('**/*',async route=>{const u=new URL(route.request().url());
  if(u.hostname==='www.googletagmanager.com')return route.fulfill({contentType:'text/javascript',body:`const emit=a=>{if(a[0]==='event')fetch('https://www.google-analytics.com/g/collect',{method:'POST',body:JSON.stringify([a[1],a[2]])});};window.dataLayer.forEach(emit);const push=window.dataLayer.push.bind(window.dataLayer);window.dataLayer.push=(...a)=>{a.forEach(emit);return push(...a);};`});
  if(u.hostname.endsWith('google-analytics.com')){hits.push(JSON.parse(route.request().postData()));return route.fulfill({status:204});}
  if(u.origin!==origin)return route.abort();if(u.pathname.startsWith('/api/'))return route.fulfill({contentType:'application/json',body:'{"ok":true}'});
  const file=path.join(root,u.pathname+(u.pathname.endsWith('/')?'index.html':''));
  const mime={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'};
  return fs.existsSync(file)?route.fulfill({contentType:mime[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)}):route.fulfill({status:404,body:'missing'});
 });
 const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+(lang==='de'?'':'/'+lang)+'/guide/'+slug+'.html');await page.locator('[data-winter-tool][data-ready=true]').waitFor();
 const calc=page.locator('[data-winter-tool]'),form=calc.locator('form');
 await form.locator('[type=submit]').click();assert((await calc.locator('[data-result]').innerText()).includes(expected));assert.equal(hits.length,0);checks+=2;
 await page.locator('[data-analytics-choice=granted]').click();await page.waitForFunction(()=>document.querySelector('iframe[title="Optional analytics"]')?.contentWindow.dataLayer?.length>0);
 await form.locator('[type=submit]').click();await page.waitForTimeout(80);assert.equal(hits.filter(x=>x[0]==='tool_complete').length,0);checks++;
 await form.locator('[name=own]').check();await form.locator('[name=currency]').selectOption('CHF');await form.locator('[type=submit]').click();await page.waitForTimeout(100);
 assert((await calc.locator('[data-result]').innerText()).includes('CHF'));assert.equal(hits.filter(x=>x[0]==='tool_complete').length,1);checks+=2;
 await form.locator('[type=submit]').click();await page.waitForTimeout(80);assert.equal(hits.filter(x=>x[0]==='tool_complete').length,1);checks++;
 const downloadPromise=page.waitForEvent('download');await calc.locator('[data-export]').click();const downloaded=await downloadPromise;const text=fs.readFileSync(await downloaded.path(),'utf8');assert(text.includes(lang==='de'?'Eigene Angaben':lang==='en'?'Your values':'Dati personali'));assert(text.includes('CHF'));await page.waitForTimeout(80);assert.equal(hits.filter(x=>x[0]==='tool_export').length,1);checks+=3;
 for(const [name,fields]of hits.filter(x=>['tool_complete','tool_export'].includes(x[0]))){assert.equal(fields.tool_id,(lang==='de'?'':lang+'/')+'guide/'+slug);for(const key of ['flow','price','saving','cost','currency','own','result'])assert(!Object.hasOwn(fields,key));}checks++;
 await form.locator('input[type=number]').first().fill('');assert.equal(await calc.locator('[data-result]').isVisible(),false);assert.equal(await calc.locator('[data-export]').isVisible(),false);await form.locator('[type=submit]').click();assert.equal(hits.filter(x=>x[0]==='tool_complete').length,1);checks+=3;
 await page.locator('#fleet-analytics-settings').click();await page.locator('[data-analytics-choice=denied]').click();const n=hits.length;
 await form.locator('input[type=number]').first().fill(kind==='shower'?'10':kind==='lights'?'30':'700');await form.locator('[type=submit]').click();await page.waitForTimeout(80);assert.equal(hits.length,n);checks++;
 if(lang!=='de'){
  await form.locator('[name=currency]').selectOption('GBP');await form.locator('[type=submit]').click();assert((await calc.locator('[data-result]').innerText()).includes('GBP'));checks++;
  if(kind==='shower'){await form.locator('[name=cold]').fill('38');await form.locator('[type=submit]').click();assert((await calc.locator('[data-error]').innerText()).includes(lang==='en'?'Mixed shower':'temperatura'));assert.equal(await calc.locator('[data-export]').isVisible(),false);await form.locator('[name=cold]').fill('10');checks+=2;}
  else {await form.locator('[name='+ (kind==='thermostat'?'saving':'timer')+']').fill(kind==='thermostat'?'0':'100');await form.locator('[type=submit]').click();assert((await calc.locator('[data-result]').innerText()).includes(lang==='en'?(kind==='thermostat'?'No positive':'saves no'):(kind==='thermostat'?'Nessun':'non riduce')));checks++;}
 }
 for(const width of [390,1280]){await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));checks++;}
 assert.deepEqual(errors,[]);checks++;const dir=process.env.QA_DIR||'/tmp/eco-winter-qa';fs.mkdirSync(dir,{recursive:true});await page.setViewportSize({width:390,height:844});await calc.screenshot({path:path.join(dir,'winter-'+lang+'-'+kind+'-mobile.png')});await ctx.close();
}
console.log('PASS winter: '+checks+' browser checks; 3 calculators × 3 languages, examples, own values, CHF, export, invalidation, consent, withdrawal, no answer payloads, mobile/desktop.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
