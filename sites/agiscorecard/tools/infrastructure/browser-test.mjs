import {chromium} from '../../../../tools/revenue-studio/node_modules/playwright/index.mjs';
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const data=JSON.parse(fs.readFileSync(path.join(root,'infrastructure-assets/snapshot.json')));
const server=http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost');let f=path.join(root,decodeURIComponent(u.pathname));if(!path.extname(f))f+='.html';if(!f.startsWith(root+path.sep)){res.writeHead(403).end();return;}try{const body=fs.readFileSync(f);res.setHeader('Content-Type',({'.html':'text/html','.mjs':'text/javascript','.css':'text/css','.json':'application/json'})[path.extname(f)]||'text/plain');res.end(body);}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true});
try{
 for(const lang of ['en','zh']){
  const context=await browser.newContext({viewport:{width:1365,height:1000},acceptDownloads:true});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await context.route('**/*',async route=>{
   const url=route.request().url();if(!url.startsWith(base))return route.abort();
   if(url.includes('/api/infrastructure-review')){const b=route.request().postDataJSON();assert.deepEqual(Object.keys(b).sort(),['consent','lang','snapshot','ticker']);const c=data.companies.find(x=>x.ticker===b.ticker);const id=c.facts.revenue.id;return route.fulfill({json:{ok:true,ticker:b.ticker,snapshot:data.id,model:'test-fixture',generated_at:new Date().toISOString(),review:{checks:[{question:lang==='zh'?'应如何核对收入增长是否转化为经营现金流？':'Does revenue growth translate into operating cash flow?',sources:[id]},{question:lang==='zh'?'哪些附注有助于区分整体收入与人工智能需求？':'Which disclosures separate company revenue from AI demand?',sources:[id]}]}}});}
   if(url.includes('/api/member'))return route.fulfill({json:{ok:true,ready:false}});
   return route.continue();
  });
  await page.goto(base+(lang==='zh'?'/zh':'')+'/ai-infrastructure?__qa=1');await page.locator('#company-name').filter({hasText:'NVIDIA'}).waitFor();assert.equal(await page.locator('.company-option').count(),20);
  await page.locator('#search').fill('MU');assert.equal(await page.locator('.company-option').count(),1);await page.locator('[data-ticker=MU]').click();assert.match(await page.locator('#company-name').textContent(),/Micron/);await page.locator('#search').fill('');
  await page.locator('#watch').click();await page.locator('#watched-only').check();assert.equal(await page.locator('.company-option').count(),1);await page.locator('#watched-only').uncheck();await page.locator('[data-ticker=NVDA]').click();await page.locator('#watch').click();assert.equal(await page.locator('#comparison').isVisible(),true);assert.equal(await page.locator('#compare-head th').count(),3);await page.locator('[data-ticker=MU]').click();
  await page.locator('#note-thesis').fill('Test thesis <script>not executable</script>');await page.locator('#note-counter').fill('Needs original filing review');await page.locator('#note-review').fill('2027-01-15');await page.locator('#baseline').click();await page.locator('#save-local').click();assert.ok(await page.evaluate(()=>localStorage.getItem('agi-infrastructure-v1')));
  await page.locator('#ai-run').click();assert.match(await page.locator('#ai-status').textContent(),lang==='zh'?/授权/:/consent/);await page.locator('#ai-consent').check();await page.locator('#ai-run').click();await page.locator('#ai-result li').first().waitFor();assert.equal(await page.locator('#ai-result li').count(),2);
  const dp=page.waitForEvent('download');await page.locator('#export-json').click();const dl=await dp,record=JSON.parse(fs.readFileSync(await dl.path(),'utf8'));assert.equal(record.product,'ai-infrastructure');assert.equal(record.values.notes.MU.review,'2027-01-15');
  const mp=page.waitForEvent('download');await page.locator('#export-md').click();const md=await mp;assert.match(fs.readFileSync(await md.path(),'utf8'),/sec.gov/);
  await page.locator('#note-thesis').fill('changed');await page.locator('#import-json').setInputFiles({name:'notes.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(record))});await page.waitForFunction(()=>document.getElementById('note-thesis').value.startsWith('Test thesis'));assert.match(await page.locator('#note-thesis').inputValue(),/Test thesis/);
  await page.locator('#note-thesis').fill('version two');await page.locator('#save-local').click();await page.locator('#local-history').selectOption('0');await page.locator('#restore-version').click();assert.match(await page.locator('#note-thesis').inputValue(),/Test thesis/);
  // Use the real membership portal bridge; assert no implicit save/upload.
  const uploads=[];context.on('request',r=>{if(r.url().includes('/api/member')&&r.method()==='POST')uploads.push(r);});
  const popupPromise=page.waitForEvent('popup');await page.locator('#save-cloud').click();const popup=await popupPromise;await popup.locator('#payload').waitFor();await popup.waitForFunction(()=>document.getElementById('payload').value.includes('ai-infrastructure'));assert.equal(uploads.length,0);assert.match(await popup.locator('#payload').inputValue(),/Test thesis/);await popup.close();
  await page.evaluate(()=>scrollTo(0,0));const dir=process.env.INFRA_ARTIFACT_DIR||'/tmp';await page.screenshot({path:path.join(dir,'infrastructure-'+lang+'-desktop.png')});
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>scrollTo(0,0));assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:path.join(dir,'infrastructure-'+lang+'-mobile.png')});
  await page.locator('#erase-local').click();assert.equal(await page.evaluate(()=>localStorage.getItem('agi-infrastructure-v1')),null);
  await page.goto(base+(lang==='zh'?'/zh':'')+'/ai-infrastructure?embed=1&__qa=1');await page.locator('#company-name').filter({hasText:'NVIDIA'}).waitFor();assert.equal(await page.locator('header').isVisible(),false);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.deepEqual(errors,[]);await context.close();console.log(lang+': search, watch, evidence, notes, source-linked AI fixture, save/versions/import/export, real member handoff, mobile and embed passed');
 }
}finally{await browser.close();server.close();}
