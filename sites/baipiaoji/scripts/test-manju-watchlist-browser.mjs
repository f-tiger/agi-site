import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';
import {watchlistFixture} from './manju-watchlist-fixture.mjs';
import {onRequest} from '../functions/api/manju-watchlist.js';
const {chromium}=createRequire(process.env.MANJU_PLAYWRIGHT_PACKAGE||new URL('../../../tools/revenue-studio/package.json',import.meta.url))('playwright');
const dist=fileURLToPath(new URL('../dist/',import.meta.url)),h=await watchlistFixture(),a=await h.account('browser_a'),b=await h.account('browser_b');
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||process.env.WORKBENCH_CHROMIUM,args:['--no-sandbox','--disable-dev-shm-usage']});
async function setup(user=null){
 const context=await browser.newContext({viewport:{width:1280,height:900}}),mode={user,calls:0,pause:null,fail:false},errors=[];
 await context.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());if(url.origin!=='https://baipiaoji.com')return route.abort();
  if(url.pathname==='/api/manju-watchlist'){
   mode.calls++;if(mode.fail)return route.fulfill({status:503,contentType:'application/json',body:'{"ok":false,"error":"unavailable"}'});
   const response=await onRequest({request:new Request(url,{method:req.method(),headers:{...req.headers(),...(mode.user?{Cookie:mode.user.cookie}:{})},...(req.method()==='POST'?{body:req.postData()}:{})}),env:h.env});
   const text=await response.text();if(mode.pause)await mode.pause();return route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:text});
  }
  if(url.pathname.startsWith('/api/'))throw Error('unexpected business request '+url.pathname);
  let file=url.pathname;if(file.endsWith('/'))file+='index.html';else if(!path.extname(file))file+='.html';const target=path.join(dist,file);
  if(!fs.existsSync(target))return route.fulfill({status:404});return route.fulfill({body:fs.readFileSync(target),contentType:({'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.json':'application/json'})[path.extname(target)]||'text/plain'});
 });
 const p=await context.newPage();p.on('pageerror',error=>errors.push(error.message));p.on('dialog',dialog=>dialog.accept());
 await p.goto('https://baipiaoji.com/manju/?__probe=1');await p.waitForFunction(()=>!!window.ManjuWatchlist);
 await p.evaluate(()=>{window.cloudEvents=[];document.addEventListener('manju:action',e=>{if(e.detail.startsWith('cloud_'))window.cloudEvents.push(e.detail);});});
 return {context,p,mode,errors};
}
const click=(p,action)=>p.locator('[data-cloud="'+action+'"]').click();
const status=p=>p.locator('#mj-cloud [role=status]');
const waitText=(p,text)=>p.waitForFunction(expected=>document.querySelector('#mj-cloud [role=status]').textContent.includes(expected),text);
try{
 const first=await setup();const {p,mode}=first;
 assert.equal(mode.calls,0,'public browsing must not request authenticated API');
 await p.locator('[data-save]:visible').first().click();const selected=await p.evaluate(()=>ManjuWatchlist.read());assert.equal(selected.length,1);
 assert.equal(await p.locator('[data-cloud-login]').getAttribute('href'),'/account?next=%2Fmanju%2F');
 await click(p,'check');await waitText(p,'请先登录');assert.deepEqual(await p.evaluate(()=>ManjuWatchlist.read()),selected);
 mode.user=a;await click(p,'check');await waitText(p,'账户云片单有 0 部');await click(p,'save');await waitText(p,'已保存 1 部');assert.deepEqual((await h.call(a)).body.ids,selected);
 const second=await setup(a);assert.equal(second.mode.calls,0);await click(second.p,'check');await waitText(second.p,'账户云片单有 1 部');await click(second.p,'restore');await waitText(second.p,'已恢复 1 部');assert.deepEqual(await second.p.evaluate(()=>ManjuWatchlist.read()),selected);
 // Another device changed the version: an old tab cannot clobber it.
 await click(p,'save');await waitText(p,'已保存 1 部');await click(second.p,'save');await waitText(second.p,'云片单或登录状态已变化');assert.deepEqual(await second.p.evaluate(()=>ManjuWatchlist.read()),selected);
 // Identity changed after the read: GET checks binding before applying local data.
 second.mode.user=b;await click(second.p,'check');await waitText(second.p,'账户云片单有 0 部');second.mode.user=a;await click(second.p,'restore');await waitText(second.p,'账户已切换');assert.deepEqual(await second.p.evaluate(()=>ManjuWatchlist.read()),selected);
 // Failed API and local storage both preserve the original list and emit no success.
 await click(second.p,'check');await waitText(second.p,'账户云片单有 1 部');
 await second.p.evaluate(()=>{window.realSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='bpj-manju-saved-v1')throw Error('blocked');return window.realSet.call(this,k,v);};});
 await click(second.p,'restore');await waitText(second.p,'未完成恢复');assert.deepEqual(await second.p.evaluate(()=>cloudEvents),['cloud_restore']);
 await second.p.evaluate(()=>{Storage.prototype.setItem=window.realSet;});second.mode.fail=true;await click(second.p,'save');await waitText(second.p,'操作未确认成功');assert.deepEqual(await second.p.evaluate(()=>ManjuWatchlist.read()),selected);second.mode.fail=false;
 // Restore response arrives after a local change: cancel instead of overwriting it.
 await click(second.p,'check');await waitText(second.p,'账户云片单有 1 部');
 let release,seen;const pending=new Promise(resolve=>seen=resolve);second.mode.pause=()=>{seen();return new Promise(resolve=>release=resolve);};
 await click(second.p,'restore');await pending;await second.p.locator('[data-save]:visible').nth(1).click();const changed=await second.p.evaluate(()=>ManjuWatchlist.read());release();second.mode.pause=null;await waitText(second.p,'本机片单有改动');assert.deepEqual(await second.p.evaluate(()=>ManjuWatchlist.read()),changed);
 // Account lifecycle event during an in-flight response invalidates its result.
 let releaseIdentity,seenIdentity;const identityPending=new Promise(resolve=>seenIdentity=resolve);second.mode.pause=()=>{seenIdentity();return new Promise(resolve=>releaseIdentity=resolve);};
 await click(second.p,'restore');await identityPending;await second.p.evaluate(()=>document.dispatchEvent(new CustomEvent('bpj-account-identity',{detail:{oldId:'browser_a',newId:'browser_b'}})));releaseIdentity();second.mode.pause=null;await waitText(second.p,'账户状态已变化');assert.deepEqual(await second.p.evaluate(()=>ManjuWatchlist.read()),changed);
 // A different login tab can change cookies without dispatching this page's identity event.
 await click(second.p,'check');await waitText(second.p,'账户云片单有 1 部');
 let releaseTab,seenTab;const tabPending=new Promise(resolve=>seenTab=resolve);second.mode.pause=()=>{seenTab();return new Promise(resolve=>releaseTab=resolve);};
 await click(second.p,'restore');await tabPending;await second.p.evaluate(()=>window.dispatchEvent(new Event('blur')));second.mode.user=b;await second.p.evaluate(()=>window.dispatchEvent(new Event('focus')));releaseTab();second.mode.pause=null;await waitText(second.p,'页面或账户状态已变化');assert.deepEqual(await second.p.evaluate(()=>ManjuWatchlist.read()),changed);
 // Local storage changed before its queued storage event: read/write CAS uses storage itself.
 second.mode.user=a;await click(second.p,'check');await waitText(second.p,'账户云片单有 1 部');
 let releaseStorage,seenStorage;const storagePending=new Promise(resolve=>seenStorage=resolve);second.mode.pause=()=>{seenStorage();return new Promise(resolve=>releaseStorage=resolve);};
 await click(second.p,'restore');await storagePending;await second.p.evaluate(()=>localStorage.setItem('bpj-manju-saved-v1','[]'));releaseStorage();second.mode.pause=null;await waitText(second.p,'本机片单有改动');assert.deepEqual(await second.p.evaluate(()=>ManjuWatchlist.read()),[]);
 // Malformed raw data from another tab is preserved, never treated as permission to overwrite.
 await click(second.p,'check');await waitText(second.p,'账户云片单有 1 部');
 let releaseMalformed,seenMalformed;const malformedPending=new Promise(resolve=>seenMalformed=resolve);second.mode.pause=()=>{seenMalformed();return new Promise(resolve=>releaseMalformed=resolve);};
 await click(second.p,'restore');await malformedPending;await second.p.evaluate(()=>localStorage.setItem('bpj-manju-saved-v1','{broken'));releaseMalformed();second.mode.pause=null;await waitText(second.p,'本机片单有改动');assert.equal(await second.p.evaluate(()=>localStorage.getItem('bpj-manju-saved-v1')),'{broken');
 await second.p.evaluate(()=>localStorage.setItem('bpj-manju-saved-v1',''));await click(second.p,'restore');await waitText(second.p,'无法确认本机片单存储');assert.equal(await second.p.evaluate(()=>localStorage.getItem('bpj-manju-saved-v1')),'');
 await click(p,'check');await waitText(p,'账户云片单有 1 部');await click(p,'delete');await waitText(p,'云片单已删除');assert.deepEqual(await p.evaluate(()=>ManjuWatchlist.read()),selected);assert.deepEqual((await h.call(a)).body.ids,[]);
 // Mobile panel remains inside the viewport and all operations are explicit.
 await p.setViewportSize({width:390,height:844});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await p.locator('#mj-cloud').screenshot({path:'/tmp/bpj-manju-cloud-mobile.png'});
 assert.deepEqual(first.errors,[]);assert.deepEqual(second.errors,[]);assert.deepEqual(await p.evaluate(()=>cloudEvents),['cloud_save','cloud_save','cloud_delete']);
 console.log('BPJ watchlist browser PASS: anonymous local save; contextual login; real SQLite save/restore/CAS; account switch; failed storage/API; stale response; delete; mobile. No production requests.');
}finally{await browser.close();h.sql.close();}
