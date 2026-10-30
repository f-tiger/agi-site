import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';import core from '../../js/collector-core.js';
const {chromium}=createRequire(new URL('../../../../tools/revenue-studio/package.json',import.meta.url))('playwright'),root=fileURLToPath(new URL('../../',import.meta.url));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const context=await browser.newContext({viewport:{width:390,height:844},acceptDownloads:true,permissions:['clipboard-read','clipboard-write']}),page=await context.newPage(),errors=[],external=[];
 page.on('pageerror',e=>errors.push(e.message));await context.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin!=='https://thedollscout.com'||u.pathname.startsWith('/api/')){external.push(u.pathname);return r.abort();}let f=path.join(root,u.pathname);if(u.pathname.endsWith('/'))f+='index.html';else if(!path.extname(f))f+='.html';return fs.existsSync(f)?r.fulfill({body:fs.readFileSync(f),contentType:({'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.json':'application/json'})[path.extname(f)]||'application/octet-stream'}):r.fulfill({status:404});});
 for(const prefix of ['','/de','/zh']){
  await page.goto('https://thedollscout.com'+prefix+'/collecting/wish-card?__ci=1');await page.locator('[data-wish-delete]').click();
  for(const [key,value]of Object.entries({item:'SMISKI Museum / Dali',region:'Germany',budget:'20',condition:'Opened, with box',expiry:'2099-01-01'}))await page.locator('[name='+key+']').fill(value);
  await page.locator('[name=currency]').selectOption('EUR');await page.locator('[data-wish-generate]').click();assert.equal(await page.locator('[data-wish-png]').isDisabled(),true);
  await page.locator('[data-wish-review]').check();
  const take=async(selector)=>{const p=page.waitForEvent('download');await page.locator(selector).click();return fs.readFileSync(await(await p).path());};
  const txt=(await take('[data-wish-text]')).toString();assert.match(txt,/20 EUR/);assert.match(txt,/SMISKI Museum/);
  const png=await take('[data-wish-png]');assert.equal(png.subarray(1,4).toString(),'PNG');fs.writeFileSync('/tmp/tds-wish'+(prefix.replace('/','-')||'-en')+'.png',png);
  await page.locator('[data-wish-copy]').click();assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),txt);
  await page.locator('[name=budget]').fill('25');assert.equal(await page.locator('[data-wish-text]').isDisabled(),true);
  await page.locator('[data-wish-generate]').click();await page.locator('[data-wish-outcome]').selectOption('response');await page.reload();assert.equal(await page.locator('[data-wish-outcome]').inputValue(),'response');assert.equal(await page.locator('[data-wish-copy]').isDisabled(),true);
  await page.locator('[data-wish-outcome]').selectOption('fulfilled');await page.reload();assert.equal(await page.locator('[data-wish-outcome]').inputValue(),'fulfilled');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 }
 // Explicit wishlist import excludes automatic missing entries and owned duplicates.
 const collection=core.backup([{name:'Carrot',series:'Sonny Angel',status:'wish',quantity:1},{name:'Dali',series:'Museum',seriesId:'smiski-museum',styleId:core.styleId('Dali'),status:'wish',quantity:1,checklistMissing:true},{name:'Duplicate',series:'Test',status:'owned',quantity:2}]);
 await page.evaluate(raw=>localStorage.setItem('dollscout-collection-v1',raw),collection);await page.locator('[data-wish-import]').click();assert.equal(await page.locator('[data-wish-select] option').count(),2);await page.locator('[data-wish-select]').selectOption('Sonny Angel / Carrot');assert.equal(await page.locator('[name=item]').inputValue(),'Sonny Angel / Carrot');assert.equal(await page.evaluate(()=>localStorage.getItem('dollscout-collection-v1')),collection);
 // Trade intent must have an explicit offered item. Adversarial content remains plain text.
 await page.locator('[name=mode]').selectOption('swap');await page.locator('[name=offer]').fill('');await page.locator('[data-wish-generate]').click();assert.equal(await page.locator('[data-wish-copy]').isDisabled(),true);
 await page.locator('[name=offer]').fill('Only my spare Carrot');await page.locator('[name=item]').fill('<img src=x onerror=alert(1)>');await page.locator('[data-wish-generate]').click();assert.equal(await page.locator('[data-wish-preview] img').count(),0);
 await page.evaluate(()=>{const d=JSON.parse(localStorage.getItem('tds-wish-card-v1'));d.draft.expiry='2000-01-01';localStorage.setItem('tds-wish-card-v1',JSON.stringify(d));});await page.reload();assert.equal(await page.locator('[data-wish-review]').isDisabled(),true);
 await page.evaluate(()=>localStorage.setItem('tds-wish-card-v1','broken'));await page.reload();for(const [key,value]of Object.entries({item:'Dali',region:'UK',budget:'20',condition:'Opened',expiry:'2099-01-01'}))await page.locator('[name='+key+']').fill(value);await page.locator('[data-wish-generate]').click();assert.equal(await page.evaluate(()=>localStorage.getItem('tds-wish-card-v1')),'broken');await page.locator('[data-wish-review]').check();assert.equal(await page.locator('[data-wish-text]').isEnabled(),true);
 await page.screenshot({path:'/tmp/tds-wish-mobile.png',fullPage:true});await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:'/tmp/tds-wish-desktop.png',fullPage:true});
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);console.log('PASS EN/DE/ZH: preview consent, clipboard/TXT/PNG, stale/expired/closed blocking, response restore, explicit-only wishlist import, storage corruption preservation, literal hostile input, mobile layout, no external requests or collection mutation.');
}finally{await browser.close();}
