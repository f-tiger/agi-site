// Intercepted local build + real member handler + SQLite. All accounts/payments are synthetic.
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import {fileURLToPath} from 'node:url';import {createRequire} from 'node:module';import assert from 'node:assert/strict';
import {mockChain,setupSites,fixture,transfer,KEY,TX} from '../../../tools/member-studio/test-fixtures.mjs';
import {memberRoute} from '../../../tools/member-studio/server.mjs';
import {seconds} from '../lib/ad-commerce.js';
const root=fileURLToPath(new URL('../dist/',import.meta.url)),out=process.env.DECK_QA_DIR||fs.mkdtempSync(path.join(os.tmpdir(),'bpj-deck-')),{chromium}=createRequire(new URL('../../../tools/revenue-studio/package.json',import.meta.url))('playwright');fs.mkdirSync(out,{recursive:true});
const reset=mockChain(),all=await setupSites(),db=all.bpj.db;
async function memberRequest(body){
 const response=await memberRoute(new Request('https://baipiaoji.com/api/member',{method:'POST',headers:{Authorization:'Bearer '+KEY,'Content-Type':'application/json','CF-Connecting-IP':'203.0.113.7'},body:JSON.stringify(body)}),all.bpj.raw,'bpj');
 assert.equal(response.status,200);
 return response.json();
}
let browser;try{
 const {order}=await memberRequest({action:'checkout',nonce:'f'.repeat(32),accept_terms:true,key_saved:true,source:'bpj-proposal-deck'});
 assert.equal(order.state,'pending');assert.equal((await memberRequest({action:'status'})).active,false);
 const row=db.sql.prepare('SELECT * FROM wb_orders WHERE id=?').get(order.id);
 assert.equal(db.sql.prepare('SELECT product FROM wb_order_sources WHERE order_id=?').get(order.id).product,'bpj-proposal-deck');
 fixture.receipt=transfer(row);assert.equal((await memberRequest({action:'check',id:order.id,tx:TX})).order.state,'paid');
 const activated=await memberRequest({action:'status'});assert.equal(activated.active,true);
 assert.equal((await memberRequest({action:'check',id:order.id,tx:TX})).order.state,'paid');
 assert.equal((await memberRequest({action:'status'})).ends_at,activated.ends_at);
 console.log('PASS isolated checkout, ProposalDeck source, finalized fixture payment and idempotent activation');
 browser=await chromium.launch({headless:true,executablePath:process.env.WORKBENCH_CHROMIUM,args:['--no-sandbox','--disable-dev-shm-usage','--no-zygote']});const context=await browser.newContext({viewport:{width:1440,height:1050}}),errors=[];context.on('page',p=>{p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());});
await context.route('**/*',async route=>{const r=route.request(),u=new URL(r.url());if(u.origin!=='https://baipiaoji.com')return route.abort();if(u.pathname==='/api/member'){const response=await memberRoute(new Request(r.url(),{method:r.method(),headers:r.headers(),...(r.method()==='POST'?{body:r.postData()}: {})}),all.bpj.raw,'bpj');return route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:await response.text()});}let p=u.pathname;if(p.endsWith('/'))p+='index.html';else if(!path.extname(p))p+='.html';const f=path.join(root,p);if(!fs.existsSync(f))return route.fulfill({status:404,body:'Missing local fixture'});return route.fulfill({body:fs.readFileSync(f),contentType:({'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.json':'application/json'})[path.extname(f)]||'text/plain'});});
const login=async portal=>{await portal.locator('#key').fill(KEY);await portal.locator('#login').click();await portal.waitForFunction(()=>/active|有效/.test(document.querySelector('#member-status').textContent)&&!document.querySelector('#save').disabled);};
for(const [prefix,lang]of [['','zh'],['/en','en']]){
 const page=await context.newPage();await page.goto('https://baipiaoji.com'+prefix+'/studio/proposal-deck?__ci=1');await page.waitForFunction(()=>document.querySelector('#dk-list').children.length===5);await page.evaluate(()=>{window.qaEvents=[];window.bpjEv=(...args)=>window.qaEvents.push(args);});
 await page.screenshot({path:out+'/'+lang+'-desktop.png',fullPage:true});await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile overflow');await page.screenshot({path:out+'/'+lang+'-mobile.png',fullPage:true});await page.setViewportSize({width:1440,height:1050});
 let dl=page.waitForEvent('download',{timeout:10000});await page.locator('#dk-export').click();const pptx=await dl.catch(async err=>{console.error(await page.locator('#dk-status').textContent(),errors);throw err;});await pptx.saveAs(out+'/'+lang+'-proposal.pptx');
 assert(await page.locator('#dk-paid-offer').isHidden(),'a fictional export does not expose the offer');
 const bytes=fs.readFileSync(await pptx.path());assert(bytes.length>10000);assert.equal(bytes.subarray(0,2).toString(),'PK');
 const parts=await page.evaluate(async data=>{const z=await JSZip.loadAsync(new Uint8Array(data));const names=Object.keys(z.files);const texts=await Promise.all(names.filter(n=>/^ppt\/(slides|notesSlides)\/.+\.xml$/.test(n)).map(n=>z.file(n).async('string')));return {names,texts};},Array.from(bytes));assert(parts.texts.some(x=>x.includes('<a:tbl>')),'native editable table');assert(parts.names.some(x=>x.startsWith('ppt/notesSlides/notesSlide')),'speaker notes');assert(parts.texts.some(x=>x.includes('Source:')));
 await page.locator('#dk-list button').nth(2).click();await page.locator('#dk-data').fill(lang==='zh'?'阶段 | 负责人\n启动 | Edison':'Stage | Owner\nStart | Edison');assert((await page.locator('#dk-preview').textContent()).includes('Edison'));await page.screenshot({path:out+'/'+lang+'-table.png',fullPage:true});
 await page.locator('#dk-example').selectOption('review');await page.locator('#dk-sample').click();await page.locator('#dk-list button').nth(2).click();dl=page.waitForEvent('download');await page.locator('#dk-export').click();const chart=await dl;await chart.saveAs(out+'/'+lang+'-review.pptx');const chartParts=await page.evaluate(async data=>Object.keys((await JSZip.loadAsync(new Uint8Array(data))).files),Array.from(fs.readFileSync(await chart.path())));assert(chartParts.some(x=>/^ppt\/charts\/chart\d+\.xml$/.test(x)),'native editable chart');await page.screenshot({path:out+'/'+lang+'-chart.png',fullPage:true});
 await page.locator('#dk-title').fill('<img src=x onerror=alert(1)>');assert.equal(await page.locator('#dk-preview img').count(),0);assert((await page.locator('#dk-preview').textContent()).includes('<img'));await page.locator('#dk-title').fill('Client evidence '+lang);
 const name=await page.locator('#dk-name').inputValue();await page.locator('#deck-workspace details summary').click();await page.locator('#dk-paste').fill('{"product":"wrong"}');await page.locator('#dk-apply').click();assert.equal(await page.locator('#dk-name').inputValue(),name,'invalid import preserves project');
 await page.locator('#dk-local').click();await page.locator('#dk-title').fill('Temporary edit');await page.locator('#dk-load').click();assert.equal(await page.locator('#dk-title').inputValue(),'Project review'===name?'Project review':name); // load selects first slide
 dl=page.waitForEvent('download');await page.locator('#dk-export').click();await dl;await page.locator('#dk-paid-offer').waitFor({state:'visible'});
 assert.equal(await page.locator('#dk-paid-offer a').getAttribute('href'),'#dk-membership');
 await page.locator('#dk-title').fill('Cloud v1 '+lang);await page.waitForFunction(()=>!document.querySelector('#dk-cloud').disabled);const pp=page.waitForEvent('popup');await page.locator('#dk-cloud').click();const portal=await pp;await portal.waitForFunction(x=>document.querySelector('#payload')?.value.includes(x),'Cloud v1 '+lang);await login(portal);await portal.locator('#name').fill('Deck client '+lang);
 await page.locator('#dk-title').fill('Cloud v2 '+lang);await portal.locator('#save').click();await portal.waitForFunction(()=>document.querySelector('#history').children.length===1);await page.waitForFunction(()=>/earlier|先前/.test(document.querySelector('#dk-status').textContent));
 const next=page.waitForEvent('popup');await page.locator('#dk-cloud').click();const p2=await next;await p2.waitForFunction(x=>document.querySelector('#payload')?.value.includes(x),'Cloud v2 '+lang);await login(p2);await p2.locator('#save').click();await p2.waitForFunction(()=>document.querySelector('#history').children.length===2);await page.waitForFunction(()=>/This version is saved|此版本已保存/.test(document.querySelector('#dk-status').textContent));
 const restore=p2.waitForEvent('popup');await p2.locator('#restore').click();const restored=await restore;await restored.waitForFunction(x=>document.querySelector('#dk-title')?.value===x,'Cloud v2 '+lang);assert.equal(db.sql.prepare('SELECT COUNT(*) n FROM wb_spaces WHERE name=?').get('Deck client '+lang).n,1);
 await page.evaluate(()=>document.querySelector('#dk-status').textContent='sentinel');await p2.evaluate(()=>window.opener.postMessage({kind:'workbench-saved',product:'bpj-proposal-deck',handoff:'0'.repeat(32),same:true,context:{id:'a'.repeat(32),revision:9,name:'Forged'}},location.origin));await page.waitForTimeout(100);assert.equal(await page.locator('#dk-status').textContent(),'sentinel');assert.deepEqual(await page.evaluate(()=>window.qaEvents),[],'QA must not emit demand events');
 console.log('PASS '+lang+' responsive UI, native PPTX/tables/charts/notes, safe import, local restore, member login, old-snapshot guard, revision 2, cloud restore, nonce and QA exclusion');for(const p of [restored,p2,portal,page])await p.close();
}
// A stale checkout heartbeat must not take an active member's paid delivery offline.
db.sql.prepare('UPDATE wb_health SET checked_at=? WHERE id=1').run(seconds()-14401);
const closed=await context.newPage();await closed.goto('https://baipiaoji.com/en/studio/proposal-deck?__ci=1');
await closed.waitForFunction(()=>document.querySelector('#dk-ready').textContent.includes('New purchases and renewals are temporarily unavailable'));
await closed.locator('#dk-title').fill('Existing paid draft during checkout outage');
const closedDownload=closed.waitForEvent('download');await closed.locator('#dk-export').click();await closedDownload;
assert(await closed.locator('#dk-paid-offer').isHidden(),'closed checkout does not advertise a new purchase');
const closedPopup=closed.waitForEvent('popup');await closed.locator('#dk-cloud').click();const active=await closedPopup;
await active.waitForFunction(()=>document.querySelector('#payload')?.value.includes('Existing paid draft during checkout outage'));
await login(active);await closed.locator('#dk-new').click();
await closed.evaluate(()=>document.querySelector('#dk-status').textContent='new draft');
await active.locator('#save').click();await active.waitForFunction(()=>document.querySelector('#history').children.length===1);
assert.equal(await closed.locator('#dk-status').textContent(),'new draft','an older project receipt cannot retarget a new draft');
console.log('PASS active-member paid save still works during a stale checkout heartbeat');
await active.close();await closed.close();
db.sql.prepare('UPDATE wb_health SET checked_at=? WHERE id=1').run(seconds());
const measured=await context.newPage();
await measured.addInitScript(()=>Object.defineProperty(Navigator.prototype,'webdriver',{get:()=>false}));
await measured.goto('https://baipiaoji.com/en/studio/proposal-deck');
await measured.waitForFunction(()=>!document.querySelector('#dk-cloud').disabled);
await measured.evaluate(()=>{localStorage.removeItem('fleet_ga4_choice_v1');window.deckEvents=[];window.bpjEv=(...args)=>window.deckEvents.push(args);});
await measured.locator('#dk-title').fill('Edited proposal used for anonymous fixture');
for(let i=0;i<2;i++){
 const download=measured.waitForEvent('download');await measured.locator('#dk-export').click();await download;
}
assert.deepEqual((await measured.evaluate(()=>window.deckEvents)).filter(([,p])=>p.endsWith('paid-offer-view/own')),[['calc','/studio/proposal-deck/paid-offer-view/own']]);
await measured.evaluate(()=>{window.deckEvents=[];localStorage.setItem('fleet_ga4_choice_v1','denied');});
const deniedDownload=measured.waitForEvent('download');await measured.locator('#dk-export').click();await deniedDownload;
assert.deepEqual(await measured.evaluate(()=>window.deckEvents),[],'stored refusal suppresses demand events');
await measured.close();
assert.deepEqual(errors,[]);console.log('Artifacts: '+out);
}finally{if(browser)await browser.close();fixture.receipt=null;reset();for(const s of Object.values(all))s.db.sql.close();}
