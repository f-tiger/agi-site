const {chromium}=require('playwright'),assert=require('node:assert/strict');
const base=process.env.BASE_URL||'http://127.0.0.1:8765',route='/en/guide/12l-vs-20l-dehumidifier-uk.html';
(async()=>{const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage']}:{} )});let checks=0;try{
 const page=await browser.newPage({viewport:{width:320,height:850}}),errors=[];
 await page.route('**/*',r=>new URL(r.request().url()).origin===new URL(base).origin?r.continue():r.abort());
 await page.addInitScript(()=>{window.__careEvents=[];window.addEventListener('fleet:business',e=>window.__careEvents.push(e.detail));Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{window.__copiedCare=text;}}});});
 page.on('pageerror',e=>errors.push(e.message));await page.goto(base+route+'?__probe=1');const root=page.locator('#meaco-care');await root.locator('form').waitFor({state:'visible'});
 await root.locator('[type=submit]').click();assert.match(await root.locator('[data-care-title]').innerText(),/Match the label/);checks++;
 for(const [name,value]of [['generation','two'],['size','12'],['purpose','air']])await root.locator(`[name=${name}]`).selectOption(value);
 await root.locator('[type=submit]').click();assert.match(await root.locator('[data-care-title]').innerText(),/lists this model/);checks++;
 await root.locator('[data-care-copy]').click();assert.match(await page.evaluate(()=>window.__copiedCare),/£39.99.*£59.98/);checks++;
 await root.locator('[name=size]').selectOption('20');assert(!await root.locator('[data-care-result]').isVisible());await root.locator('[type=submit]').click();assert.match(await root.locator('[data-care-text]').innerText(),/not verified here/);assert(!await root.locator('[data-care-cost-link]').isVisible());checks+=2;
 await root.locator('[name=size]').selectOption('12');await root.locator('[name=purpose]').selectOption('dry');await root.locator('[type=submit]').click();assert.match(await root.locator('[data-care-title]').innerText(),/optional/);checks++;
 // Explicitly exercise clipboard-denial recovery in a fresh context.
 for(const width of [320,390,1280]){await page.setViewportSize({width,height:850});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));checks++;}
 assert.deepEqual(await page.evaluate(()=>window.__careEvents),[]);assert.deepEqual(errors,[]);checks+=2;await page.close();
 const denied=await browser.newPage();await denied.route('**/*',r=>new URL(r.request().url()).origin===new URL(base).origin?r.continue():r.abort());await denied.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:async()=>{throw Error('denied');}}}));await denied.goto(base+route+'?__probe=1');await denied.locator('#meaco-care [type=submit]').click();await denied.locator('#meaco-care [data-care-copy]').click();assert(await denied.locator('#meaco-care [data-care-fallback]').isVisible());assert.match(await denied.locator('#meaco-care [data-care-status]').innerText(),/unavailable/);checks+=2;await denied.close();
 const nojs=await browser.newPage({javaScriptEnabled:false});await nojs.route('**/*',r=>new URL(r.request().url()).origin===new URL(base).origin?r.continue():r.abort());await nojs.goto(base+route);assert(await nojs.locator('#meaco-care-cost').isVisible());assert(!await nojs.locator('#meaco-care form').isVisible());assert.match(await nojs.locator('#meaco-care').innerText(),/£59.98/);checks+=3;await nojs.close();
 // Local-only event contract: all network destinations outside the fixture are blocked.
 // Override automation flags only in this isolated test; the earlier probe test retains them.
 const measured=await browser.newPage();await measured.route('**/*',r=>{const u=new URL(r.request().url());return u.origin===new URL(base).origin&&!u.pathname.startsWith('/api/')?r.continue():r.abort();});
 await measured.addInitScript(()=>{for(const [key,value]of [['webdriver',false],['doNotTrack',null],['globalPrivacyControl',false]])Object.defineProperty(navigator,key,{value});window.__careEvents=[];window.addEventListener('fleet:business',e=>window.__careEvents.push(e.detail));Object.defineProperty(navigator,'clipboard',{value:{writeText:async()=>{}}});});
 await measured.goto(base+route);const mr=measured.locator('#meaco-care'),decisionCount=()=>measured.evaluate(()=>window.__careEvents.filter(e=>e.name==='eco_upkeep_decision').length);
 await mr.locator('[type=submit]').click();assert.equal(await decisionCount(),0);checks++;
 await mr.locator('[data-care-copy]').click();assert.equal(await measured.evaluate(()=>window.__careEvents.filter(e=>e.name==='eco_upkeep_share').length),1);assert.equal(await decisionCount(),0);checks+=2;
 await mr.locator('[name=generation]').selectOption('other');await mr.locator('[type=submit]').click();assert.equal(await decisionCount(),0);checks++;
 await mr.locator('[name=size]').selectOption('20');await mr.locator('[type=submit]').click();assert.equal(await decisionCount(),0);checks++;
 await mr.locator('[name=purpose]').selectOption('dry');await mr.locator('[type=submit]').click();assert.equal(await decisionCount(),1);assert.match(await mr.locator('[data-care-text]').innerText(),/not verified here/);checks+=2;
 await mr.locator('[type=submit]').click();assert.equal(await decisionCount(),1);assert(await measured.evaluate(()=>window.__careEvents.every(e=>Object.keys(e).join(',')==='name')));checks+=2;await measured.close();
 console.log(JSON.stringify({pass:true,checks}));
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
