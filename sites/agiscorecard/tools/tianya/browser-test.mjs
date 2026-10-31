import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from '../../../../tools/revenue-studio/node_modules/playwright/index.mjs';

const root=path.resolve(fileURLToPath(new URL('../../',import.meta.url)));
const out=process.env.TIANYA_ARTIFACT_DIR||'/tmp/tianya-browser';
const slot='agi-tianya-validation-v1',PRODUCT='tianya-validation';
for(const route of ['tianya.html','zh/tianya.html'])assert.ok(fs.existsSync(path.join(root,route)),'Build Tianya pages before browser testing: '+route);
fs.mkdirSync(out,{recursive:true});
// A deliberately passive, same-origin member-page fixture. It records the
// browser protocol and emits synthetic acknowledgements only when this test
// instructs it to. Real storage/entitlements are covered by member-test.mjs.
const memberFixture=`<!doctype html><html><head><meta charset="utf-8"><title>Isolated member protocol fixture</title></head><body><h1>Member fixture</h1><script>
window.__memberFixtureStarted=true;
window.addEventListener('message',event=>{
 if(event.origin!==location.origin)return;
 if(event.data?.kind==='workbench-save'&&event.source===window.opener){window.received=event.data;window.tool=event.source;}
 if(event.data?.kind==='workbench-ready'){window.restoreTool=event.source;window.restoreReady=true;}
});
window.opener?.postMessage({kind:'workbench-member-ready'},location.origin);
</script></body></html>`;
const server=http.createServer((request,response)=>{
 const url=new URL(request.url,'http://localhost');
 response.setHeader('Cache-Control','no-store');
 if(/^\/(?:zh\/)?members$/.test(url.pathname)){
  response.setHeader('Content-Type','text/html; charset=utf-8');return response.end(memberFixture);
 }
 let file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
 if(!path.extname(file))file+='.html';
 if(!file.startsWith(root+path.sep)){response.writeHead(403);return response.end();}
 try{
  response.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon'})[path.extname(file)]||'text/plain');
  response.end(fs.readFileSync(file));
 }catch{response.writeHead(404);response.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port;
let browser;
const download=async page=>{
 const pending=page.waitForEvent('download');await page.locator('#export-json').click();
 const file=await pending;assert.equal(file.suggestedFilename(),'tianya-validation.json');
 return JSON.parse(fs.readFileSync(await file.path(),'utf8'));
};
const importData=async(page,data)=>{
 await page.locator('#import-json').setInputFiles({name:'fixture.json',mimeType:'application/json',buffer:Buffer.from(typeof data==='string'?data:JSON.stringify(data))});
 await page.waitForFunction(()=>document.getElementById('import-json').value==='');
};
const formValues=page=>page.locator('#ty-form').evaluate(form=>Object.fromEntries(new FormData(form)));
const localCopy=page=>page.evaluate(key=>localStorage.getItem(key),slot);
const field=(page,name)=>page.locator('#ty-form [name="'+name+'"]');
const sendReply=async(page,popup,payload)=>{
 const count=await page.evaluate(()=>window.__fixtureSavedMessages||0);
 await popup.evaluate(data=>window.opener.postMessage(data,location.origin),payload);
 await page.waitForFunction(old=>(window.__fixtureSavedMessages||0)>old,count,{polling:100});
};
const cloudPopup=async page=>{
 let popup;const pending=page.waitForEvent('popup').then(opened=>(popup=opened));
 pending.catch(()=>{});
 try{
  // The popup and its exact protocol are awaited below. A separate implicit
  // navigation barrier can hang in headless-shell even after this click fires.
  await page.locator('#cloud-save').click({noWaitAfter:true});
  popup=await pending;
  await popup.waitForFunction(()=>window.received?.kind==='workbench-save',undefined,{polling:100});
 }
 catch(error){
  // Keep diagnostics restricted to protocol metadata from synthetic records.
  // Do not print the draft, access keys or browser storage.
  const inspect=target=>target.evaluate(()=>({path:location.pathname,readyState:document.readyState,visibility:document.visibilityState,hasOpener:!!window.opener,fixtureStarted:!!window.__memberFixtureStarted,receivedKind:window.received?.kind||null,status:document.getElementById('ty-status')?.textContent||null,events:window.__fixtureProtocolEvents||[]})).catch(failure=>({inspectionError:failure.message}));
  console.error('Tianya popup handshake diagnostics:',JSON.stringify({browser:browser?.version(),tool:await inspect(page),popup:popup?await inspect(popup):{notCreated:true}}));
  throw error;
 }
 return popup;
};
try{
 // Use Playwright's locked browser by default, including on CI hosts that also
 // provide an unrelated system Chromium. Local overrides must be explicit.
 const executablePath=process.env.TIANYA_CHROMIUM_EXECUTABLE||process.env.CHROMIUM_EXECUTABLE;
 browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{})});
 for(const lang of ['en','zh']){
  const prefix=lang==='zh'?'/zh':'',context=await browser.newContext({viewport:{width:1440,height:1100},acceptDownloads:true});
  const errors=[],external=[],uploads=[];
  context.on('page',page=>page.on('pageerror',error=>errors.push(error.message)));
  context.on('request',request=>{if(new URL(request.url()).pathname==='/api/member'&&request.method()==='POST')uploads.push(request.url());});
  await context.route('**/*',route=>{
   if(!route.request().url().startsWith(base+'/')){external.push(route.request().url());return route.abort();}
   return route.continue();
  });
  await context.addInitScript(()=>{
   const open=window.open;window.open=function(...args){const popup=open.apply(this,args);window.__fixtureLastPopup=popup;return popup;};
   window.__fixtureProtocolEvents=[];
   window.addEventListener('message',event=>{if(event.data?.kind==='workbench-saved')window.__fixtureSavedMessages=(window.__fixtureSavedMessages||0)+1;if(typeof event.data?.kind==='string'&&event.data.kind.startsWith('workbench-'))window.__fixtureProtocolEvents.push({kind:event.data.kind,origin:event.origin,fromOpener:event.source===window.opener,fromPopup:event.source===window.__fixtureLastPopup});});
  });
  const page=await context.newPage();
  await page.goto(base+prefix+'/tianya?__qa=1');
  await page.waitForFunction(()=>document.getElementById('save-local')?.onclick);
  const ids=await page.locator('[id]').evaluateAll(nodes=>nodes.map(node=>node.id));assert.equal(new Set(ids).size,ids.length,'all ids are unique');
  for(const [name,max]of Object.entries({title:100,hypothesis:1200,counter:800,outcome:1600}))assert.equal(await field(page,name).getAttribute('maxlength'),String(max),'UI limit must match normalized record: '+name);
  assert.equal(await field(page,'kind').inputValue(),'startup');
  assert.equal(await field(page,'tasks').inputValue(),'');
  assert.equal(await localCopy(page),null);
  const blank=await download(page);
  assert.equal(blank.values.tasks,null,'empty numeric input must export as null, not zero');

  await page.locator('#load-demo').click();
  assert.match(await page.locator('#ty-result').innerText(),/53\.33%/);
  assert.match(await page.locator('#ty-result').innerText(),/-985\.33/);
  assert.match(await page.locator('#ty-result').innerText(),lang==='zh'?/示例.*虚构/:/EXAMPLE.*Fictional/);
  await field(page,'majorErrors').fill('');
  await page.locator('#ty-form [type="submit"]').click();
  assert.doesNotMatch(await page.locator('#ty-result').innerText(),/53\.33%/);
  assert.equal((await download(page)).values.majorErrors,null,'an empty error count cannot silently become zero');
  await page.locator('#load-demo').click();
  await field(page,'title').fill('Synthetic startup draft '+lang);
  await field(page,'tasks').fill('51');
  await page.locator('[data-kind="invest"]').click();
  await page.locator('#load-demo').click();
  assert.match(await page.locator('#ty-result').innerText(),lang==='zh'?/纸面单位数：\s*50(?:\D|$)/:/Paper units:\s*50(?:\D|$)/);
  await field(page,'title').fill('Synthetic paper draft '+lang);
  await page.locator('[data-kind="startup"]').click();
  assert.equal(await field(page,'title').inputValue(),'Synthetic startup draft '+lang);
  assert.equal(await field(page,'tasks').inputValue(),'51');
  await page.locator('[data-kind="invest"]').click();
  assert.equal(await field(page,'title').inputValue(),'Synthetic paper draft '+lang);
  await page.locator('[data-kind="startup"]').click();
  assert.equal(await localCopy(page),null,'calculation and switching do not persist inputs');

  await page.locator('#save-local').click();
  const saved=JSON.parse(await localCopy(page));
  assert.equal(saved.product,PRODUCT);
  assert.equal(saved.values.title,'Synthetic startup draft '+lang);
  await field(page,'title').fill('Unsaved change');
  await page.locator('#restore-local').click();
  assert.equal(await field(page,'title').inputValue(),saved.values.title);
  await page.reload();await page.waitForFunction(()=>document.getElementById('save-local')?.onclick);
  assert.equal(await field(page,'title').inputValue(),'','stored private drafts are restored explicitly');
  await page.locator('#restore-local').click();
  assert.equal(await field(page,'title').inputValue(),saved.values.title);
  const beforeErase=await formValues(page);
  await page.locator('#erase-local').click();
  assert.equal(await localCopy(page),null);
  assert.deepEqual(await formValues(page),beforeErase,'deletion removes only the local copy');
  const exported=await download(page);
  assert.deepEqual(exported,saved);
  await field(page,'title').fill('Replace this unsaved draft');
  await importData(page,exported);
  assert.equal(await field(page,'title').inputValue(),saved.values.title);
  assert.equal(await localCopy(page),null,'import does not automatically write browser storage');

  const kept=await formValues(page);
  for(const bad of ['{', {...exported,version:999}, {...exported,product:'other-tool'}, {...exported,values:{...exported.values,markup:'<img src=x onerror="window.__fixtureXSS=1">'}}, {...exported,values:{...exported.values,tasks:'<script>window.__fixtureXSS=1</script>'}}]){
   await importData(page,bad);
   assert.deepEqual(await formValues(page),kept,'invalid imports keep the existing draft');
   assert.equal(await localCopy(page),null);
  }
  const xssTitle='<img src=x onerror="window.__fixtureXSS=1">';
  const textRecord={...exported,values:{...exported.values,title:xssTitle,hypothesis:'</textarea><script>window.__fixtureXSS=1</script>'}};
  await importData(page,textRecord);
  assert.equal(await field(page,'title').inputValue(),xssTitle,'valid text remains literal text');
  assert.equal(await page.locator('#ty-form img,#ty-form script,#ty-result img,#ty-result script').count(),0);
  assert.equal(await page.evaluate(()=>window.__fixtureXSS),undefined);
  assert.equal(await localCopy(page),null);
  await importData(page,exported);

  await page.locator('#ty-form [type="submit"]').click();
  await page.screenshot({path:path.join(out,'tianya-'+lang+'-desktop.png'),fullPage:true});
  for(const width of [390,360]){
   await page.setViewportSize({width,height:844});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Tianya mobile overflow '+lang+' '+width);
  }
  await page.screenshot({path:path.join(out,'tianya-'+lang+'-mobile.png'),fullPage:true});
  await page.setViewportSize({width:1440,height:1100});

  const popup=await cloudPopup(page),payload=await popup.evaluate(()=>window.received);
  assert.equal(new URL(popup.url()).pathname,prefix+'/members');
  assert.equal(new URL(popup.url()).searchParams.get('tool'),PRODUCT);
  assert.equal(new URL(popup.url()).searchParams.get('from'),base);
  assert.deepEqual(payload.data,exported);
  assert.match(payload.handoff,/^[a-f0-9]{32}$/);
  assert.equal(payload.context,null);
  assert.equal(uploads.length,0,'opening a member page must not upload or create an order');
  const handed=await page.locator('#ty-status').innerText();
  assert.match(handed,lang==='zh'?/草稿已交给会员页/:/Draft handed to the member page/);
  const cloud={id:'9'.repeat(32),revision:1,name:'Synthetic cloud workspace'};
  const reply={kind:'workbench-saved',handoff:payload.handoff,product:PRODUCT,same:true,context:cloud};
  for(const invalid of [{...reply,handoff:'0'.repeat(32)},{...reply,product:'other-tool'},{...reply,context:{...cloud,id:'not-a-member-id'}},{...reply,context:{...cloud,revision:Number.MAX_SAFE_INTEGER+1}},{...reply,context:{...cloud,name:'x'.repeat(81)}}]){
   await sendReply(page,popup,invalid);
   assert.equal(await page.locator('#ty-status').innerText(),handed,'invalid acknowledgements cannot report a saved draft');
  }
  await page.evaluate(data=>window.dispatchEvent(new MessageEvent('message',{data,origin:'https://wrong-origin.example',source:window.__fixtureLastPopup})),reply);
  assert.equal(await page.locator('#ty-status').innerText(),handed,'wrong origin rejected');
  await page.evaluate(data=>window.dispatchEvent(new MessageEvent('message',{data,origin:location.origin,source:window})),reply);
  assert.equal(await page.locator('#ty-status').innerText(),handed,'wrong source window rejected');
  await sendReply(page,popup,reply);
  assert.match(await page.locator('#ty-status').innerText(),lang==='zh'?/此版本已保存到云端工作区/:/This version was saved to your cloud workspace/);
  await field(page,'title').fill('Edit after handoff');
  await sendReply(page,popup,{...reply,context:{...cloud,revision:2}});
  assert.match(await page.locator('#ty-status').innerText(),lang==='zh'?/后续编辑可能尚未保存/:/later edits may still be unsaved/);
  const nextPopup=await cloudPopup(page);
  assert.deepEqual((await nextPopup.evaluate(()=>window.received)).context,{...cloud,revision:2});
  await nextPopup.close();

  // Restore through a genuine opener relationship, without local persistence.
  const restorePending=popup.waitForEvent('popup');
  await popup.evaluate(url=>{window.open(url,'_blank');},base+prefix+'/tianya?restore=1&__qa=1');
  const restored=await restorePending;
  await popup.waitForFunction(()=>window.restoreReady===true,undefined,{polling:100});
  await restored.waitForFunction(()=>document.getElementById('save-local')?.onclick);
  const restoreMessage={kind:'workbench-restore',data:exported,context:cloud};
  await restored.evaluate(data=>window.dispatchEvent(new MessageEvent('message',{data,origin:'https://wrong-origin.example',source:window.opener})),restoreMessage);
  assert.equal(await field(restored,'title').inputValue(),'');
  await restored.evaluate(data=>window.dispatchEvent(new MessageEvent('message',{data,origin:location.origin,source:window})),restoreMessage);
  assert.equal(await field(restored,'title').inputValue(),'');
  await popup.evaluate(data=>window.restoreTool.postMessage(data,location.origin),restoreMessage);
  await restored.waitForFunction(title=>document.querySelector('#ty-form [name="title"]').value===title,exported.values.title,{polling:100});
  assert.deepEqual(await download(restored),exported);
  assert.equal(await localCopy(restored),null,'cloud restoration does not silently persist data locally');
  const restoredPopup=await cloudPopup(restored);
  assert.deepEqual((await restoredPopup.evaluate(()=>window.received)).context,cloud,'cloud context survives restoration for the next explicit save');
  await restoredPopup.close();await restored.close();await popup.close();
  assert.deepEqual(uploads,[],'protocol fixtures never issue real member requests');
  assert.deepEqual(external,[],'the workbench tests need no external services');
  assert.deepEqual(errors,[]);
  await context.close();
  console.log(lang+': calculations, blank inputs, separate drafts, explicit local storage, JSON validation/XSS text safety, mobile layout, isolated member protocol, forged-ack rejection and restore passed. No live account or payment.');
 }
}finally{
 await browser?.close();
 await new Promise(resolve=>server.close(resolve));
}
