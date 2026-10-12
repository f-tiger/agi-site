// Local fixtures only: all requests, including Google and account routes, are intercepted.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || '../revenue-studio/node_modules/playwright/index.mjs');
const registry = JSON.parse(fs.readFileSync(new URL('./registry.json',import.meta.url),'utf8'));
const allowed = Object.fromEntries(Object.values(registry).flatMap(site=>site.hosts.map(host=>[host,site.id])));
const browser = await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{})});
let checks = 0;
async function fixture({host='agiscorecard.com',pathname='/entry',query='',privacy={},declined=false,embedded=false}={}) {
 const origin='https://'+host,id=allowed[host]||'G-FZXLMBB5QB',hits=[],unexpected=[],errors=[];
 const context=await browser.newContext({viewport:{width:390,height:844}});
 await context.addInitScript(({privacy,declined})=>{
  Object.defineProperty(navigator,'webdriver',{get:()=>false});
  for(const [name,value]of Object.entries(privacy))Object.defineProperty(navigator,name,{get:()=>value});
  if(declined)localStorage.setItem('fleet_ga4_choice_v1','denied');
 },{privacy,declined});
 await context.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.hostname==='www.googletagmanager.com')return route.fulfill({contentType:'text/javascript',body:`const send=a=>{if(a[0]==='event')fetch('https://www.google-analytics.com/g/collect?en='+a[1],{method:'POST',body:JSON.stringify(a[2])});};for(const a of window.dataLayer||[])send(a);const push=window.dataLayer.push.bind(window.dataLayer);window.dataLayer.push=(...rows)=>{rows.forEach(send);return push(...rows);};`});
  if(url.hostname==='www.google-analytics.com'){hits.push({name:url.searchParams.get('en'),body:request.postData()});return route.fulfill({status:204});}
  if(url.origin!==origin){unexpected.push(url.href);return route.abort();}
  if(url.pathname.startsWith('/analytics-assets/')) {
   const name=url.pathname.slice('/analytics-assets/'.length);
   const body=name==='registry.mjs'?'export const allowed='+JSON.stringify(allowed)+';':fs.readFileSync(new URL('./'+name,import.meta.url));
   return route.fulfill({contentType:name.endsWith('.html')?'text/html':'text/javascript',body});
  }
  if(url.pathname==='/outer')return route.fulfill({contentType:'text/html',body:'<iframe src="'+pathname+'"></iframe>'});
  if(url.pathname!==pathname)return route.fulfill({status:404,body:'local fixture route only'});
  return route.fulfill({contentType:'text/html',body:`<!doctype html><html lang="en"><head><title>Public fixture</title></head><body>
   <nav><div class="fleet-account-entry"><a id="shared" href="/auth/account?next=SECRET_RETURN&amp;lang=en#SECRET_HASH">Join / Sign in</a></div>
   <a id="native" data-fleet-account-entry href="/auth/account?next=SECRET_RETURN">Native entry</a>
   <a id="unmarked" href="/auth/account">Unmarked</a>
   <a id="external" data-fleet-account-entry href="https://unknown.example/auth/account">Outside</a>
   <a id="wrong" data-fleet-account-entry href="/auth/google">Wrong route</a></nav>
   <footer></footer><script>document.addEventListener('click',e=>{if(e.target.closest('a')){window.preventedBeforeTest=e.defaultPrevented;e.preventDefault();}});</script>
   <script type="module" src="/analytics-assets/consent.mjs?v=test" data-ga4-id="${id}" data-ga4-host="${host}" data-ga4-page="${origin+pathname}" data-ga4-title="Public fixture"></script>
   </body></html>`});
 });
 const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
 await page.goto(origin+(embedded?'/outer':pathname)+query);
 return {context,page,hits,unexpected,errors};
}
try {
 const f=await fixture({query:'?private=SECRET_QUERY#SECRET_FRAGMENT'});
 await f.page.waitForFunction(()=>document.querySelector('iframe[title="Optional analytics"]')?.contentWindow.dataLayer?.length>0);
 const originalHref=await f.page.locator('#shared').getAttribute('href');
 await f.page.locator('#shared').click();await f.page.locator('#native').click();
 await f.page.waitForFunction(()=>document.querySelector('iframe[title="Optional analytics"]')?.contentWindow.dataLayer?.filter(row=>row[1]==='fleet_account_entry').length===2);
 await f.page.evaluate(()=>document.getElementById('shared').click());
 for(const selector of ['#unmarked','#external','#wrong'])await f.page.locator(selector).click();
 await f.page.waitForTimeout(100);
 assert.equal(f.hits.filter(hit=>hit.name==='fleet_account_entry').length,2);
 assert.equal(await f.page.locator('#shared').getAttribute('href'),originalHref);
 assert.equal(await f.page.evaluate(()=>window.preventedBeforeTest),false,'analytics must not cancel navigation');
 assert(!JSON.stringify(f.hits).includes('SECRET'));
 for(const hit of f.hits.filter(hit=>hit.name==='fleet_account_entry'))assert.deepEqual(Object.keys(JSON.parse(hit.body)).sort(),['page_location','page_referrer','page_title','send_to','tool_id']);
 await f.page.locator('[data-analytics-choice="denied"]').click();
 await f.page.locator('#shared').click();await f.page.waitForTimeout(50);
 assert.equal(f.hits.filter(hit=>hit.name==='fleet_account_entry').length,2);
 assert.deepEqual(f.unexpected,[]);assert.deepEqual(f.errors,[]);await f.context.close();checks++;
 for(const config of [{declined:true},{privacy:{doNotTrack:'1'}},{privacy:{globalPrivacyControl:true}},{query:'?__qa=1'},{embedded:true}]) {
  const f=await fixture(config);await f.page.waitForTimeout(100);
  const content=config.embedded?f.page.frames().find(frame=>frame.parentFrame()):f.page;
  await content.locator('#shared').click();await f.page.waitForTimeout(50);
  assert.equal(f.hits.length,0,JSON.stringify(config));assert.deepEqual(f.unexpected,[]);assert.deepEqual(f.errors,[]);
  await f.context.close();checks++;
 }
 for(const config of [{host:'baipiaoji.com'},{host:'unknown.example'},{pathname:'/auth/account'},{pathname:'/en/account.html'},{pathname:'/api/private'}]) {
  const f=await fixture(config);await f.page.waitForTimeout(150);await f.page.locator('#shared').click();await f.page.waitForTimeout(50);
  assert.equal(f.hits.filter(hit=>hit.name==='fleet_account_entry').length,0,JSON.stringify(config));
  assert.deepEqual(f.unexpected,[]);assert.deepEqual(f.errors,[]);await f.context.close();checks++;
 }
 console.log(`PASS: ${checks} intercepted browser cases, fixed fleet intent, no private context, no navigation changes, opt-out/DNT/GPC/QA/frame exclusions`);
}finally{await browser.close();}
