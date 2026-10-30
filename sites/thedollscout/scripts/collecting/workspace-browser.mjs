import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import core from '../../js/collector-core.js';
import {matchesSeries} from '../../collector-assets/workspace.mjs';
const {chromium}=createRequire(new URL('../../../../tools/revenue-studio/package.json',import.meta.url))('playwright');
const root=fileURLToPath(new URL('../../',import.meta.url));
assert.equal(matchesSeries('SMISKI Museum Smiski Dali','smiski','museum dali','smiski'),true);
assert.equal(matchesSeries('SMISKI Museum','smiski','museum','sonny-angel'),false);
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const context=await browser.newContext({viewport:{width:390,height:844},acceptDownloads:true}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await context.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin!=='https://thedollscout.com'||u.pathname.startsWith('/api/'))return r.abort();let f=path.join(root,u.pathname);if(u.pathname.endsWith('/'))f+='index.html';else if(!path.extname(f))f+='.html';return fs.existsSync(f)?r.fulfill({body:fs.readFileSync(f),contentType:({'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.json':'application/json'})[path.extname(f)]||'application/octet-stream'}):r.fulfill({status:404});});
 for(const prefix of ['','/de','/zh']){
  await page.goto('https://thedollscout.com'+prefix+'/?__ci=1');
  await page.locator('#series-search').fill('museum');
  assert.equal(await page.locator('[data-desk-series]:visible').count(),1);
  await page.locator('#series-brand').selectOption('sonny-angel');assert.equal(await page.locator('[data-desk-empty]').isVisible(),true);
  await page.locator('[data-desk-clear]').click();assert.ok(await page.locator('[data-desk-series]:visible').count()>5);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),prefix+' mobile overflow');
 }
 await page.goto('https://thedollscout.com/series/smiski-museum?__ci=1');
 const checkbox=page.locator('[data-series-checklist] input[type=checkbox]').first();await checkbox.check();
 const raw=await page.evaluate(()=>localStorage.getItem('dollscout-collection-v1'));assert.equal(core.restore(raw).length,1);
 await page.locator('[data-checklist-print]').waitFor({state:'visible'});
 await page.evaluate(()=>{window.print=()=>{window.printCalled=true;};});await page.locator('[data-checklist-print]').click();assert.equal(await page.evaluate(()=>window.printCalled),true);
 await page.goto('https://thedollscout.com/?__ci=1');assert.equal(await page.locator('[data-desk-series="smiski-museum"] [data-desk-progress]').textContent(),'1/6');
 assert.equal(await page.evaluate(()=>localStorage.getItem('dollscout-collection-v1')),raw);
 await page.goto('https://thedollscout.com/collection-tracker?__ci=1');await page.locator('[data-items]').getByText('SMISKI', {exact:false}).first().waitFor();
 const downloadPromise=page.waitForEvent('download');await page.locator('[data-backup]').click();const download=await downloadPromise;assert.deepEqual(core.restore(fs.readFileSync(await download.path(),'utf8')),core.restore(raw));
 await page.goto('https://thedollscout.com/series/smiski-museum?__ci=1');assert.equal(await checkbox.isChecked(),true);
 await page.emulateMedia({media:'print'});await page.pdf({path:'/tmp/tds-checklist-preview.pdf',format:'A4'});await page.emulateMedia({media:'screen'});
 await page.goto('https://thedollscout.com/?__ci=1');await page.screenshot({path:'/tmp/tds-workspace-mobile.png',fullPage:false});
 await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:'/tmp/tds-workspace-desktop.png',fullPage:false});

 const fixture=[{name:'Carrot',series:'Sonny Angel Vegetable',status:'wish',quantity:1},{name:'Museum',series:'SMISKI',status:'wish',quantity:1},{name:'Owned duplicate',series:'SMISKI',status:'owned',quantity:3}];
 await page.evaluate(raw=>localStorage.setItem('dollscout-collection-v1',raw),core.backup(fixture));
 for(const prefix of ['', '/de']){
  await page.goto('https://thedollscout.com'+prefix+'/collection-tracker?__ci=1#wish');
  assert.equal(await page.locator('[data-filter]').inputValue(),'wish');assert.equal(await page.locator('.collection-item').count(),2);
  const csv=async()=>{const waiting=page.waitForEvent('download');await page.locator('[data-csv]').click();return fs.readFileSync(await (await waiting).path(),'utf8');};
  const wish=await csv();assert.ok(wish.includes('Carrot')&&wish.includes('Museum')&&!wish.includes('Owned duplicate'));
  await page.locator('[data-search]').fill('carrot');const searched=await csv();assert.ok(searched.includes('Carrot')&&!searched.includes('Museum'));
  await page.locator('[data-search]').fill('no matching figure');assert.equal((await csv()).trim(),'Name,Series,Status,Quantity');
  await page.locator('[data-search]').fill('');await page.locator('[data-filter]').selectOption('duplicates');assert.ok((await csv()).includes('Owned duplicate'));
  const backupWait=page.waitForEvent('download');await page.locator('[data-backup]').click();assert.deepEqual(core.restore(fs.readFileSync(await (await backupWait).path(),'utf8')),fixture);
 }
 await page.goto('https://thedollscout.com/?__ci=1');
 await page.evaluate(()=>localStorage.setItem('dollscout-collection-v1','invalid'));await page.reload();await page.locator('[data-desk-summary]').getByText('could not be read',{exact:false}).waitFor();assert.equal(await page.evaluate(()=>localStorage.getItem('dollscout-collection-v1')),'invalid');
 await page.locator('#series-search').fill('museum');assert.equal(await page.locator('[data-desk-series]:visible').count(),1);
 const nojs=await browser.newContext({javaScriptEnabled:false});await nojs.route('**/*',r=>{const u=new URL(r.request().url());let f=path.join(root,u.pathname.endsWith('/')?u.pathname+'index.html':u.pathname);return fs.existsSync(f)?r.fulfill({body:fs.readFileSync(f),contentType:u.pathname.endsWith('/')?'text/html':'text/css'}):r.abort();});const staticPage=await nojs.newPage();await staticPage.goto('https://thedollscout.com/');assert.ok(await staticPage.locator('[data-desk-series] a').count()>5);
 assert.deepEqual(errors,[]);console.log('PASS: EN/DE/ZH search, empty/reset states, mobile overflow, checklist save/return, backup roundtrip, print action/PDF, corrupt storage preservation, no-JS links, cross-brand wishlist/duplicate/search-filter CSV, empty CSV, and full backup preservation. All requests served locally; no production business events.');
}finally{await browser.close();}
