// Local browser authentication races only. API responses are controlled fixtures;
// the real identity adapter/server scope guard is covered by handoff-scope-test.
// This does not invoke a provider, production account or operational runner.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {pathToFileURL} from 'node:url';
import {isJarvisPage,secureJarvisPage} from './security.mjs';
import {HANDOFF_KEY,HANDOFF_FROM,makeEnvelope} from '../../jarvis-assets/handoff.mjs';
import {boundedPlan,COMMERCIAL_VERSION} from '../../foresight-assets/commercial.mjs';

const playwright=process.env.JARVIS_PLAYWRIGHT?pathToFileURL(path.resolve(process.env.JARVIS_PLAYWRIGHT)).href:new URL('../../../../tools/revenue-studio/node_modules/playwright/index.mjs',import.meta.url).href;
const {chromium}=await import(playwright),root=path.resolve('sites/agiscorecard'),errors=[];
let base,browser,activeContext;
const server=http.createServer((req,res)=>{
 try{
  const url=new URL(req.url,base);let file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
  if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
  if(!path.extname(file))file+='.html';
  if(!fs.existsSync(file))return res.writeHead(404).end();
  const type=({'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream';
  let content=fs.readFileSync(file);
  if(isJarvisPage(url.pathname)){
   const nonce=crypto.randomUUID().replaceAll('-','');content=content.toString().replace(/<script(?=[\s>])/g,'<script nonce="'+nonce+'"');
   const secured=secureJarvisPage(new Response(content,{headers:{'content-type':type}}),nonce);
   res.writeHead(secured.status,Object.fromEntries(secured.headers));return res.end(content);
  }
  res.writeHead(200,{'content-type':type});res.end(content);
 }catch(error){errors.push(String(error));res.writeHead(500).end('local fixture error');}
});
const membership=letter=>({scope:letter.repeat(64),member:true,trialRemaining:null,endsAt:0});
const listing=letter=>({ok:true,membership:membership(letter),tasks:[{id:letter.repeat(32),input:{goal:'PRIVATE_SCOPE_'+letter,lang:'en',cadence:'once'},status:'completed',stage:'complete',runs:0,created:1,result:{sources:[]}}]});
async function setup(lang,{handoff=false}={}){
 const context=await browser.newContext();activeContext=context;const page=await context.newPage(),requests=[],leaks=[],pageErrors=[];
 page.setDefaultTimeout(10000);page.on('pageerror',error=>pageErrors.push(error.message));
 const envelope=handoff?makeEnvelope({...boundedPlan(lang),review:'2026-10-12',commercial:{version:COMMERCIAL_VERSION,fit:{recurring:true,records:true,owner:true}}},lang):null;
 await context.addInitScript(({key,envelope})=>{
  sessionStorage.setItem('workbench-member-key:agi','fleet');if(envelope)sessionStorage.setItem(key,JSON.stringify(envelope));
  window.__jarvisResponses=0;const original=window.fetch;
  window.fetch=async(...args)=>{const response=await original(...args);if(String(args[0]).startsWith('/api/jarvis')){const json=response.json.bind(response);response.json=async()=>{const value=await json();window.__jarvisResponses++;return value;};}return response;};
 },{key:HANDOFF_KEY,envelope});
 await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin!==base){leaks.push(url.href);return route.abort();}if(url.pathname.startsWith('/api/jarvis')){requests.push(route);return;}return route.continue();});
 await page.goto(base+(lang==='zh'?'/zh':'')+'/jarvis?__qa=1'+(handoff?'&from='+HANDOFF_FROM:''));
 await page.waitForFunction(()=>document.body.dataset.ready==='true');
 async function waitForRequest(index){for(let i=0;i<100&&requests.length<=index;i++)await new Promise(resolve=>setTimeout(resolve,20));assert.ok(requests[index],'expected API request '+index);return requests[index];}
 async function reply(index,data,status=200){const route=await waitForRequest(index);await route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});}
 async function settled(count){await page.waitForFunction(n=>window.__jarvisResponses>=n,count);await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)));}
 async function refresh(){await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));}
 async function close(){assert.deepEqual(leaks,[]);assert.deepEqual(pageErrors,[]);await context.close();activeContext=null;}
 return {page,requests,waitForRequest,reply,settled,refresh,close};
}
async function lateGet(lang,{error=false}={}){
 const s=await setup(lang);await s.waitForRequest(0);await s.refresh();await s.reply(1,listing('b'));await s.settled(1);
 assert.equal(await s.page.locator('#workspace').isVisible(),true);assert.match(await s.page.locator('#task-list').textContent(),/PRIVATE_SCOPE_b/);
 await s.reply(0,error?{ok:false,code:'unauthorized'}:listing('a'),error?401:200);await s.settled(2);
 assert.equal(await s.page.locator('#workspace').isVisible(),true);assert.match(await s.page.locator('#task-list').textContent(),/PRIVATE_SCOPE_b/);assert.doesNotMatch(await s.page.locator('#task-list').textContent(),/PRIVATE_SCOPE_a/);
 assert.equal(s.requests.filter(r=>r.request().method()==='POST').length,0);await s.close();
}
async function appliedScopeChange(lang){
 const s=await setup(lang,{handoff:true});await s.reply(0,listing('a'));await s.settled(1);await s.page.locator('#handoff-apply').click();
 assert.ok((await s.page.locator('#goal').inputValue()).length>20);await s.page.locator('#cloud-consent').check();await s.page.locator('#web').check();await s.page.locator('#public-query').fill('PRIVATE_SCOPE_A_QUERY');
 await s.refresh();await s.reply(1,listing('b'));await s.settled(2);
 assert.equal(await s.page.locator('#goal').inputValue(),'');assert.equal(await s.page.locator('#public-query').inputValue(),'');
 assert.equal(await s.page.locator('#cloud-consent').isChecked(),false);assert.equal(await s.page.locator('#web').isChecked(),false);assert.equal(await s.page.locator('#handoff-preview').isVisible(),false);
 assert.equal(await s.page.evaluate(key=>sessionStorage.getItem(key),HANDOFF_KEY),null);assert.match(await s.page.locator('#task-list').textContent(),/PRIVATE_SCOPE_b/);assert.equal(s.requests.filter(r=>r.request().method()==='POST').length,0);await s.close();
}
async function writeResponse(lang,{late=false}={}){
 const s=await setup(lang,{handoff:true});await s.reply(0,listing('a'));await s.settled(1);await s.page.locator('#handoff-apply').click();await s.page.locator('#cloud-consent').check();await s.page.locator('#start').click();
 const post=await s.waitForRequest(1);assert.equal(post.request().method(),'POST');assert.equal(post.request().headers()['x-jarvis-scope'],'a'.repeat(64));assert.deepEqual(Object.keys(post.request().postDataJSON().context).sort(),['claimId','evidenceVersion','fit','kind']);
 if(late){await s.refresh();await s.reply(2,listing('b'));await s.settled(2);}
 await s.reply(1,{ok:false,code:'workspace_changed'},409);await s.settled(late?3:2);
 assert.equal(await s.page.locator('#goal').inputValue(),'');assert.equal(await s.page.locator('#cloud-consent').isChecked(),false);assert.equal(await s.page.locator('#handoff-preview').isVisible(),false);
 assert.equal(await s.page.locator('#workspace').isVisible(),late);
 if(late)assert.match(await s.page.locator('#task-list').textContent(),/PRIVATE_SCOPE_b/);else assert.match(await s.page.locator('#member-status').textContent(),lang==='zh'?/工作区已变化/:/workspace changed/);
 await s.close();
}
try{
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});base='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({headless:true,...(process.env.JARVIS_CHROMIUM?{executablePath:process.env.JARVIS_CHROMIUM,args:['--no-sandbox','--disable-dev-shm-usage']}:{})});
 for(const lang of ['en','zh']){await lateGet(lang);await lateGet(lang,{error:true});await appliedScopeChange(lang);await writeResponse(lang);await writeResponse(lang,{late:true});}
 assert.deepEqual(errors,[]);console.log('PASS EN/ZH: late first-load GET/401 cannot overwrite or lock the newer Fleet workspace; verified scope changes clear applied plans and consent; current 409 locks safely while stale 409 cannot lock a new workspace. Local controlled API fixtures only.');
}finally{if(activeContext)await activeContext.close();if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
