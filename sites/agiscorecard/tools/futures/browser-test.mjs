import {chromium} from '../../../../tools/revenue-studio/node_modules/playwright/index.mjs';
import {normalize,SLOT,PRODUCT} from '../../futures-assets/core.mjs';
import {businessEvent} from '../../../../tools/fleet-analytics/business.mjs';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root=path.resolve('sites/agiscorecard'),out=process.env.FUTURES_ARTIFACT_DIR||'/tmp';
fs.mkdirSync(out,{recursive:true});
const snapshot=JSON.parse(fs.readFileSync(path.join(root,'futures-assets/snapshot.json'),'utf8'));
assert.ok(Number.isFinite(Date.parse(snapshot.checkedAt))&&Array.isArray(snapshot.items),'build from a real saved snapshot first');
const products=JSON.parse(fs.readFileSync(path.join(root,'member-assets/products.json'),'utf8'));
assert.ok(products.some(p=>p.id===PRODUCT),'build the actual member catalog before browser acceptance');
const serve=(req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/__foreign')return res.writeHead(200,{'Content-Type':'text/html'}).end('<!doctype html><title>Local cross-origin fixture</title>');
 let file;try{file=path.resolve(root,'.'+decodeURIComponent(url.pathname));}catch{return res.writeHead(400).end();}
 if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
 if(!path.extname(file))file+='.html';
 try{res.setHeader('Content-Type',({'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'})[path.extname(file)]||'text/plain');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}
};
const server=http.createServer(serve),foreignServer=http.createServer(serve);
await Promise.all([server,foreignServer].map(s=>new Promise((resolve,reject)=>{s.once('error',reject);s.listen(0,'127.0.0.1',resolve);})));
const base='http://127.0.0.1:'+server.address().port,foreignBase='http://127.0.0.1:'+foreignServer.address().port;
let opts={headless:true};
if(process.env.AGI_CHROMIUM_MODULE){const c=(await import(process.env.AGI_CHROMIUM_MODULE)).default;opts={headless:true,args:c.args.filter(a=>!['--disable-web-security','--single-process'].includes(a)),executablePath:await c.executablePath()};}
let browser,activePage;
const complete=page=>page.waitForFunction(()=>document.body.dataset.ready==='true'&&!document.getElementById('run').disabled);
const local=page=>page.evaluate(slot=>localStorage.getItem(slot),SLOT);
const metric=page=>page.locator('#chart-desc').textContent();
const upload=async(page,data)=>{await page.locator('#import').setInputFiles({name:'scenario.json',mimeType:'application/json',buffer:Buffer.from(typeof data==='string'?data:JSON.stringify(data))});await page.waitForFunction(()=>document.getElementById('import').value==='');};
const fits=async(page,label)=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,label);
try{
 browser=await chromium.launch(opts);
 for(const lang of ['en','zh']){
  const prefix=lang==='zh'?'/zh':'',route=prefix+'/ai-futures',events=[],errors=[],posts=[],external=[];
  const context=await browser.newContext({viewport:{width:1440,height:1100},acceptDownloads:true,reducedMotion:'reduce'});
  await context.exposeBinding('__captureFuturesEvent',({page},detail)=>events.push({pathname:new URL(page.url()).pathname,detail}));
  await context.addInitScript(()=>{
   window.__futuresMessages=[];
   window.addEventListener('fleet:business',e=>window.__captureFuturesEvent(JSON.parse(JSON.stringify(e.detail))));
   window.addEventListener('message',e=>{if(e.data?.kind==='workbench-save')window.__futuresMessages.push(JSON.parse(JSON.stringify(e.data)));});
  });
  context.on('page',page=>page.on('pageerror',e=>errors.push(e.message)));
  await context.route('**/*',async r=>{
   const request=r.request(),url=new URL(request.url());
   if(![base,foreignBase].includes(url.origin)){external.push(request.url());return r.abort();}
   if(request.method()!=='GET'){posts.push({pathname:url.pathname,method:request.method()});return r.abort();}
   if(url.pathname==='/member-assets/products.json'){
    const mapped=structuredClone(products);for(const product of mapped)for(const key of Object.keys(product.urls))product.urls[key]=product.urls[key].replace('https://agiscorecard.com',base);
    return r.fulfill({json:mapped});
   }
   if(url.pathname==='/api/member')return r.fulfill({json:{ok:true,ready:false}});
   if(url.pathname==='/auth/status')return r.fulfill({json:{ok:true,authenticated:false}});
   return r.continue();
  });
  const page=await context.newPage();activePage=page;
  await page.goto(base+route+'?__qa=1');await complete(page);
  assert.deepEqual(await page.evaluate(()=>{const ids=[...document.querySelectorAll('[id]')].map(n=>n.id);return ids.filter((id,i)=>ids.indexOf(id)!==i);}),[],'each interactive element has a unique ID');
  assert.equal(await local(page),null,'baseline render does not save a personal record');
  const baselineMetric=await metric(page);
  assert.equal(events.filter(e=>e.detail.name==='futures_run_own').length,0,'initial/example render is not an own run');
  const guideSentinel=JSON.stringify({version:1,product:'future-guide',values:{goal:'understand',saved:[],notes:{}}});
  await page.evaluate(value=>localStorage.setItem('agi-future-guide-v1',value),guideSentinel);
  for(const width of [360,390,1440]){await page.setViewportSize({width,height:width===1440?1100:844});await fits(page,`${lang} ${width}px has no document overflow`);}
  await page.evaluate(()=>{document.activeElement?.blur();scrollTo({top:0,behavior:'instant'});});
  await page.screenshot({path:path.join(out,`agi-futures-${lang}-desktop.png`)});
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(out,`agi-futures-${lang}-mobile.png`)});
  await page.setViewportSize({width:1440,height:1100});

  await page.locator('#compute').evaluate(input=>{input.value='90';input.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.locator('#horizon').selectOption('2045');
  assert.match(await page.locator('#run-state').textContent(),/not yet run|尚未运行/);
  assert.equal(await metric(page),baselineMetric,'editing controls does not silently replace the displayed run');
  await page.locator('#run').click();await complete(page);
  assert.notEqual(await metric(page),baselineMetric,'explicit scenario run updates the numeric result');
  assert.match(await page.locator('#result-title').textContent(),/2045/);
  const note=lang==='zh'?'浏览器示例：复查公开研发证据，不构成投资建议。':'Browser fixture: review public research evidence, not investment advice.';
  await page.locator('#notes').fill(note);await page.locator('#save').click();
  const saved=await local(page),savedData=normalize(JSON.parse(saved)),savedMetric=await metric(page);
  assert.equal(savedData.values.notes,note);assert.equal(savedData.values.params.compute,90);
  await page.reload();await complete(page);
  assert.equal(await page.locator('#notes').inputValue(),note);assert.equal(await metric(page),savedMetric,'saved parameters, evidence and seed reproduce the result');

  const exportEvent=page.waitForEvent('download');await page.locator('#export').click();const exported=await exportEvent;
  const backup=JSON.parse(fs.readFileSync(await exported.path(),'utf8'));
  assert.equal(exported.suggestedFilename(),'agi-futures-2045.json');assert.deepEqual(normalize(backup),savedData);
  const beforeInvalid=await local(page);
  for(const bad of ['{bad-json', {...backup,product:'future-guide'}, {...backup,values:{...backup.values,modelVersion:'unavailable'}}, {...backup,values:{...backup.values,params:{...backup.values.params,compute:101}}}]){
   await upload(page,bad);
   assert.equal(await local(page),beforeInvalid,'invalid imports never replace the local backup');
   assert.equal(await page.locator('#notes').inputValue(),note);assert.equal(await metric(page),savedMetric,'invalid imports never replace the active result');
  }
  const imported=normalize({...backup,values:{...backup.values,params:{...backup.values.params,compute:25,horizon:2030},notes:note+' Imported.'}});
  await upload(page,imported);await complete(page);
  assert.equal(await page.locator('#notes').inputValue(),imported.values.notes);
  assert.equal(await local(page),beforeInvalid,'a valid import is still an unsaved draft');
  await page.locator('#save').click();assert.deepEqual(JSON.parse(await local(page)),imported);
  await page.locator('#delete').click();assert.equal(await local(page),null);assert.equal(await page.locator('#notes').inputValue(),imported.values.notes,'clearing a local copy preserves the visible draft');
  assert.match(await page.locator('#member-readiness').textContent(),/unavailable|暂不可新购/);

  const popupEvent=page.waitForEvent('popup');await page.locator('#cloud').click();const popup=await popupEvent;
  await popup.waitForFunction(()=>document.getElementById('payload')?.value.includes('ai-futures'));
  assert.equal(new URL(popup.url()).searchParams.get('tool'),PRODUCT);assert.equal(new URL(popup.url()).searchParams.get('from'),base);
  assert.deepEqual(normalize(JSON.parse(await popup.locator('#payload').inputValue())),imported,'actual member UI receives the exact selected record');
  const handoff=await popup.evaluate(()=>window.__futuresMessages.find(m=>m.kind==='workbench-save'));
  assert.match(handoff.handoff,/^[a-f0-9]{32}$/);assert.deepEqual(posts,[],'opening membership must not submit or create an order');
  const beforeReceipt=await page.locator('#status').textContent();
  await popup.evaluate(({origin,product})=>window.opener.postMessage({kind:'workbench-saved',handoff:'0'.repeat(32),same:true,product,context:{id:'b'.repeat(32),revision:1,name:'forged'}},origin),{origin:base,product:PRODUCT});
  await page.waitForTimeout(80);assert.equal(await page.locator('#status').textContent(),beforeReceipt,'wrong-nonce save acknowledgements are ignored');
  await page.evaluate(({origin,nonce,product})=>window.dispatchEvent(new MessageEvent('message',{origin,source:window,data:{kind:'workbench-saved',handoff:nonce,same:true,product,context:{id:'b'.repeat(32),revision:1,name:'forged'}}})),{origin:base,nonce:handoff.handoff,product:PRODUCT});
  assert.equal(await page.locator('#status').textContent(),beforeReceipt,'same-origin wrong-window acknowledgements are ignored');

  const restoreEvent=popup.waitForEvent('popup');await popup.locator('#restore').click();const restored=await restoreEvent;
  await complete(restored);await restored.waitForFunction(text=>document.getElementById('notes').value===text,imported.values.notes);
  assert.equal(await local(restored),null,'cloud restore never writes local storage without the user saving');
  await restored.locator('#save').click();assert.deepEqual(JSON.parse(await local(restored)),imported);
  await restored.reload();await complete(restored);assert.equal(await restored.locator('#notes').inputValue(),imported.values.notes,'explicitly saved restoration survives reload');
  await restored.close();

  // Keep the exact expected popup WindowProxy, but send its receipt from a different local origin.
  const priorStatus=await page.locator('#status').textContent();
  await popup.goto(foreignBase+'/__foreign');
  await popup.evaluate(({origin,nonce,product})=>window.opener.postMessage({kind:'workbench-saved',handoff:nonce,same:true,product,context:{id:'b'.repeat(32),revision:1,name:'forged'}},origin),{origin:base,nonce:handoff.handoff,product:PRODUCT});
  await page.waitForTimeout(80);assert.equal(await page.locator('#status').textContent(),priorStatus,'correct-window/nonce cross-origin receipts cannot claim a cloud save');
  await popup.close();

  await page.evaluate(()=>document.addEventListener('click',e=>{if(e.target.closest?.('[data-source],#register,#research-open'))e.preventDefault();},true));
  await page.locator('[data-source]').first().click();await page.locator('#research-open').click();await page.locator('#register').click();
  await page.locator('#neural').click();await page.waitForFunction(()=>!document.getElementById('neural').disabled&&document.getElementById('neural-result').textContent.includes('RMSE'));
  const allowed=new Set(['futures_run_own','futures_export_own','futures_save_local','futures_cloud_intent','futures_source_open','futures_neural','futures_research_open','futures_register_intent']);
  const ownEvents=events.filter(e=>e.detail.name?.startsWith('futures_'));
  for(const name of allowed)assert.ok(ownEvents.some(e=>e.detail.name===name),'actual interaction emits '+name);
  for(const event of ownEvents){assert.deepEqual(Object.keys(event.detail),['name']);assert.ok(allowed.has(event.detail.name));assert.deepEqual(businessEvent('agiscorecard.com',event.pathname,event.detail),{name:event.detail.name,tool_id:PRODUCT,repeat:true});}
  assert.equal(await page.evaluate(()=>localStorage.getItem('agi-future-guide-v1')),guideSentinel,'simulation interactions never overwrite Future Guide records');
  await page.goto(base+route+'?embed=1&__qa=1');await complete(page);await page.setViewportSize({width:390,height:844});
  assert.equal(await page.locator('html').evaluate(n=>n.classList.contains('embed')),true);assert.equal(await page.locator('header').first().isVisible(),false);
  assert.equal(await page.locator('#controls').isVisible(),true);await fits(page,lang+' embed fits mobile');
  assert.deepEqual(posts,[],'no membership, account, analytics or other POST was attempted');
  assert.deepEqual(errors,[]);
  await context.close();
  console.log(`${lang}: 360/390/1440px, explicit runs, reproducibility, export/import rejection, explicit local restore, real member handoff without POST, wrong nonce/window/origin rejection, synthetic neural experiment, fixed-name events and embed passed. ${external.length} external requests blocked.`);
 }
 if(process.env.FUTURES_RENDER_SHARE){
  const context=await browser.newContext({viewport:{width:1200,height:630}});
  await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
  for(const lang of ['en','zh']){const page=await context.newPage();await page.goto(base+`/futures-assets/share-${lang}.svg`);await page.screenshot({path:path.join(root,'futures-assets',`share-${lang}.png`)});await page.close();}
  await context.close();console.log('Rendered unchanged EN/ZH SVG share cards to 1200×630 PNG.');
 }
}catch(error){if(activePage&&!activePage.isClosed())await activePage.screenshot({path:path.join(out,'agi-futures-browser-failure.png'),fullPage:true}).catch(()=>{});throw error;
}finally{await browser?.close();await Promise.all([server,foreignServer].map(s=>new Promise(resolve=>s.close(resolve))));}
