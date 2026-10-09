// Entirely intercepted fixtures: no request reaches ECO, D1, Google or a merchant.
// The Google tag is a transport stub, not proof of GA4 backend receipt.
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(process.env.ECO_TEST_ROOT||path.join(__dirname,'../site'));
const origin='https://getecoback.com',id='G-E2V0Q9SJ9V';
const paths={de:'/waeschetrockner-oder-luftentfeuchter.html',en:'/en/guide/dehumidifier-drying-clothes-cost.html'};
const types={'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'};
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
 let checks=0;
 async function fixture(lang,{query='',choice='',privacy={}}={}){
  const context=await browser.newContext({serviceWorkers:'block',viewport:{width:390,height:844}}),ga=[],d1=[],blocked=[],errors=[];
  await context.addInitScript(({choice,privacy})=>{
   for(const [key,value]of Object.entries({webdriver:false,...privacy}))Object.defineProperty(navigator,key,{get:()=>value});
   if(choice)localStorage.setItem('fleet_ga4_choice_v1',choice);
  },{choice,privacy});
  await context.route('**/*',async r=>{
   const req=r.request(),u=new URL(req.url());
   if(u.hostname==='www.googletagmanager.com'&&u.pathname==='/gtag/js')return r.fulfill({contentType:'text/javascript',body:`const send=a=>{if(a[0]==='event')fetch('https://www.google-analytics.com/g/collect',{method:'POST',body:JSON.stringify({name:a[1],fields:a[2]})});};for(const a of window.dataLayer||[])send(a);const push=window.dataLayer.push.bind(window.dataLayer);window.dataLayer.push=(...items)=>{items.forEach(send);return push(...items);};`});
   if(u.hostname==='www.google-analytics.com'&&u.pathname==='/g/collect'){ga.push(JSON.parse(req.postData()));return r.fulfill({status:204});}
   if(u.origin!==origin){blocked.push(u.origin);return r.abort();}
   if(u.pathname.startsWith('/api/')){try{d1.push(JSON.parse(req.postData()));}catch{}return r.fulfill({contentType:'application/json',body:'{"ok":true}'});}
   let rel=u.pathname.slice(1);if(!rel||rel.endsWith('/'))rel+='index.html';else if(!path.extname(rel))rel+='.html';
   const f=path.resolve(root,rel);if(!f.startsWith(root+path.sep)||!fs.existsSync(f))return r.fulfill({status:404,body:'missing fixture'});
   return r.fulfill({contentType:types[path.extname(f)]||'application/octet-stream',body:fs.readFileSync(f)});
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(origin+paths[lang]+query,{referer:'https://www.google.com/search?q=SECRET_REFERRER'});
  const calc=page.locator('#laundry-check'),submit=()=>calc.locator('[type=submit]').click();
  const settle=()=>page.waitForTimeout(100),events=()=>ga.filter(e=>e.name.startsWith('laundry_')),first=()=>d1.filter(e=>e?.n?.startsWith('laundry_'));
  return {context,page,calc,submit,settle,ga,d1,events,first,errors,blocked};
 }
 try{
  for(const lang of ['de','en']){
   const f=await fixture(lang,{query:'?private=SECRET_QUERY#SECRET_FRAGMENT'}),{page,calc}=f;
   await page.waitForFunction(()=>document.querySelector('iframe[title="Optional analytics"]')?.contentWindow.dataLayer?.length>0);
   await calc.scrollIntoViewIfNeeded();await f.settle();
   // The existing experience layer runs an uncounted illustrative preview.
   assert.equal(f.events().filter(e=>e.name.startsWith('laundry_compare_')).length,0);checks++;
   await calc.locator('[name=method]').selectOption('measured');await calc.locator('[name=method]').selectOption('estimate');
   await calc.locator('[data-csv]').evaluate(el=>el.click());await f.settle();assert.equal(f.events().filter(e=>e.name.startsWith('laundry_export_')).length,0);checks++;
   await f.submit();await f.settle();let hit=f.events().filter(e=>e.name.startsWith('laundry_compare_')).at(-1);
   assert.equal(hit.fields.laundry_input,'example');assert.equal(hit.fields.laundry_method,'estimate');assert.equal(hit.fields.laundry_equal,'no');checks++;
   await calc.locator('[name=method]').selectOption('measured');await f.submit();await f.settle();hit=f.events().filter(e=>e.name.startsWith('laundry_compare_')).at(-1);
   assert.equal(hit.fields.laundry_input,'example');assert.equal(hit.fields.laundry_method,'measured');checks++;
   await calc.locator('[name=comparable]').check();await f.submit();await f.settle();hit=f.events().filter(e=>e.name.startsWith('laundry_compare_')).at(-1);assert.equal(hit.fields.laundry_input,'example');assert.equal(hit.fields.laundry_equal,'yes');checks++;
   await calc.locator('[name=dehum]').fill('1.234567');await calc.locator('[data-csv]').evaluate(el=>el.click());await f.settle();assert.equal(f.events().filter(e=>e.name.startsWith('laundry_export_')).length,0);checks++;await f.submit();await f.settle();hit=f.events().filter(e=>e.name.startsWith('laundry_compare_')).at(-1);assert.equal(hit.fields.laundry_input,'edited');checks++;
   const before=f.events().length,d1before=f.first().length;await f.submit();await calc.locator('[name=dehum]').fill('1.234568');await f.submit();await f.settle();assert.equal(f.events().length,before);assert.equal(f.first().length,d1before);checks++;
   for(const selector of ['[data-csv]','[data-card]']){
    for(let n=0;n<2;n++){const download=page.waitForEvent('download');await calc.locator(selector).click();await download;await f.settle();}
   }
   assert.deepEqual(f.events().filter(e=>e.name.startsWith('laundry_export_')).map(e=>e.fields.laundry_action).sort(),['card','csv']);checks++;
   await calc.locator('[data-share]').click();await calc.locator('[data-share]').click();
   await page.evaluate(()=>document.querySelector('[data-laundry-next]').addEventListener('click',e=>e.preventDefault()));await calc.locator('[data-laundry-next]').click();await f.settle();
   assert.deepEqual(f.events().filter(e=>e.name.startsWith('laundry_next_')).map(e=>e.fields.laundry_action).sort(),['guide','share']);checks++;
   await page.evaluate(()=>{for(const detail of [{name:'eco_laundry:compare:en:edited:measured:yes:compare:onsite:none',price:'SECRET_PRICE'},{name:'eco_laundry:compare:en:SECRET:measured:yes:compare:onsite:none'},{name:'legacy:laundry_compare'}])window.dispatchEvent(new CustomEvent('fleet:business',{detail}));});
   await f.settle();assert.equal(f.events().length,before+4);checks++;
   await page.locator('[data-analytics-choice="denied"]').click();const denied=f.events().length;
   await calc.locator('[name=comparable]').uncheck();await f.submit();await f.settle();assert.equal(f.events().length,denied);assert.equal(f.first().at(-1).m.equal,'no');checks++;
   await page.locator('[data-analytics-choice="granted"]').click();await f.settle();assert.equal(f.events().length,denied);assert.equal(f.ga.filter(e=>e.name==='page_view').length,1);await f.submit();await f.settle();assert.equal(f.events().length,denied+1);checks++;
   await calc.locator('[name=method]').selectOption('estimate');await calc.locator('[name=hours]').fill('5');await f.submit();await f.settle();assert.equal(f.events().length,denied+2);checks++;
   const valid=f.events().length;await calc.locator('[name=dryer]').fill('2001');await f.submit();await f.settle();assert.equal(f.events().length,valid);checks++;
   for(const e of f.events()){
    assert.equal(e.fields.send_to,id);assert.equal(e.fields.site_edition,lang);assert.equal(e.fields.page_location,origin+paths[lang]);
    assert.deepEqual(Object.keys(e.fields).sort(),['send_to','tool_id','site_edition','laundry_input','laundry_method','laundry_equal','laundry_action','laundry_source','laundry_evidence','page_location','page_title','page_referrer'].sort());
    assert.equal(e.fields.page_referrer,'https://www.google.com/');assert.equal(e.fields.laundry_source,'onsite');assert.equal(e.fields.laundry_evidence,'none');
   }
   assert(!JSON.stringify(f.ga).includes('SECRET'));assert(!JSON.stringify(f.ga).includes('1.23456'));
   assert(f.first().some(e=>e.n==='laundry_view'));assert(f.events().some(e=>e.name.startsWith('laundry_view_')));
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(f.errors,[]);checks+=4;
   await f.context.close();
  }
  for(const options of [{query:'?__probe=1'},{query:'?__qa=1'},{choice:'denied'},{privacy:{doNotTrack:'1'}},{privacy:{globalPrivacyControl:true}},{privacy:{webdriver:true}}]){
   const f=await fixture('en',options);await f.calc.scrollIntoViewIfNeeded();await f.submit();await f.settle();assert.equal(f.ga.length,0);
   if(options.query==='?__probe=1')assert.equal(f.d1.length,0);
   if(options.choice==='denied')assert(f.first().some(e=>e.n==='laundry_compare'));else assert.equal(f.first().length,0);
   assert.deepEqual(f.errors,[]);checks++;await f.context.close();
  }
  console.log(JSON.stringify({pass:true,checks,network:'all requests fulfilled locally or aborted',realGoogleTag:false,backendReceiptVerified:false}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
