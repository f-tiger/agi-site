import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';import {execFileSync} from 'node:child_process';
import {database} from '../../../tools/member-studio/test-fixtures.mjs';import {ensureMembers} from '../lib/membership.js';import {digest,seconds} from '../lib/ad-commerce.js';import {onRequestGet,onRequestPost} from '../functions/api/member.js';
const {chromium}=createRequire(new URL('../../../tools/revenue-studio/package.json',import.meta.url))('playwright'),root=fileURLToPath(new URL('../dist/',import.meta.url));
const browser=await chromium.launch({headless:true,executablePath:process.env.WORKBENCH_CHROMIUM,args:['--no-sandbox']}),db=database(),env={HITS:db,MEMBER_SITE:'bpj'};await ensureMembers(db,'bpj');const key='1'.repeat(64);db.sql.prepare('INSERT INTO wb_members(id,token_hash,created,ends_at) VALUES(?,?,?,?)').run('paid-fixture',await digest(key),seconds(),seconds()+86400);
try{const c=await browser.newContext({acceptDownloads:true,viewport:{width:390,height:844}}),errors=[],requests=[],readinessRequests=[];let checkoutReady=true,readinessFails=false;c.on('page',p=>{p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());});
 await c.route('**/*',async route=>{const req=route.request(),u=new URL(req.url());if(u.origin!=='https://baipiaoji.com')return route.abort();if(u.pathname==='/api/member'){
  const request=new Request(req.url(),{method:req.method(),headers:req.headers(),...(req.method()==='POST'?{body:req.postData()}:{})});
  if(req.method()==='GET'){
   readinessRequests.push({params:u.search,referrer:req.headers().referer,body:req.postData()});
   if(readinessFails)return route.fulfill({status:503,json:{ok:false}});
   const r=await onRequestGet({request,env});const data=await r.json();
   return route.fulfill({status:r.status,json:{...data,ready:checkoutReady}});
  }
  const r=await onRequestPost({request,env});return route.fulfill({status:r.status,headers:Object.fromEntries(r.headers),body:await r.text()});
 }if(u.pathname.startsWith('/api/')){requests.push(req.postData()||'');return route.fulfill({contentType:'application/json',body:'{"ok":true}'});}const name=u.pathname.endsWith('/')?u.pathname+'index.html':path.extname(u.pathname)?u.pathname:u.pathname+'.html',f=path.join(root,name);return fs.existsSync(f)?route.fulfill({body:fs.readFileSync(f),contentType:({'.html':'text/html','.mjs':'text/javascript','.js':'application/javascript','.json':'application/json','.css':'text/css'})[path.extname(f)]||'text/plain'}):route.fulfill({status:404});});
 for(const prefix of ['', '/en']){const p=await c.newPage();await p.goto('https://baipiaoji.com'+prefix+'/studio/testimonial-kit?__ci=1');await p.locator('#proof-kind').filter({hasText:/示例|Fictional/}).waitFor();
 const initialReads=readinessRequests.length;
 let wait=p.waitForEvent('download');await p.locator('#proof-free').click();let d=await wait;assert.match(fs.readFileSync(await d.path(),'utf8'),/虚构示例|Fictional example/);
 assert(await p.locator('#proof-offer').isHidden());assert.equal(readinessRequests.length,initialReads,'fictional downloads leave payment readiness untouched');
 await p.locator('#proof-new').click();await p.locator('#proof-title').fill('PRIVATE CLIENT');await p.locator('[data-field=quote]').fill('PRIVATE QUOTE');await p.locator('[data-field=name]').fill('PRIVATE NAME');await p.locator('#proof-free').click();assert.match(await p.locator('#proof-status').textContent(),/授权|permission/);await p.locator('[data-field=approved]').check();await p.locator('#proof-form button').filter({hasText:/更新预览|Update preview/}).click();
 assert(await p.locator('#proof-offer').isHidden());assert.equal(readinessRequests.length,initialReads,'permission and preview alone cannot trigger an offer');
 wait=p.waitForEvent('download');await p.locator('#proof-free').click();d=await wait;assert.ok(fs.readFileSync(await d.path(),'utf8').includes('Made with BPJ'));
 await p.locator('#proof-offer').waitFor({state:'visible'});
 assert.match(await p.locator('#proof-price').textContent(),/9 USDT/);
 assert.deepEqual(readinessRequests.at(-1),{params:'',referrer:undefined,body:null});
 assert.equal(c.pages().length,1,'the offer does not open the member page');
 await p.locator('#proof-csv-file').setInputFiles({name:'export.csv',mimeType:'text/csv',buffer:Buffer.from('Feedback,Customer\nPRIVATE QUOTE,PRIVATE NAME')});await p.locator('#proof-map-quote').selectOption('Feedback');await p.locator('#proof-map-name').selectOption('Customer');await p.locator('#proof-csv-apply').click();assert.equal(await p.locator('[data-field=approved]').isChecked(),false);assert.equal(await p.frameLocator('#proof-preview').locator('blockquote').textContent(),'PRIVATE QUOTE');assert(await p.locator('#proof-offer').isHidden(),'different records reset the previous offer');await p.locator('[data-field=approved]').check();
 wait=p.waitForEvent('download');await p.locator('#proof-canva').click();d=await wait;assert.ok(fs.readFileSync(await d.path(),'utf8').includes('PRIVATE QUOTE'));
 const pop=p.waitForEvent('popup');await p.locator('#proof-paid').click();const m=await pop;await m.waitForFunction(()=>document.querySelector('#payload').value.includes('PRIVATE QUOTE'));assert.equal(db.sql.prepare('SELECT COUNT(*) n FROM wb_versions').get().n,0);assert.equal(new URL(m.url()).searchParams.get('tool'),'bpj-testimonial-kit');assert(!m.url().includes('PRIVATE'));
 await m.locator('#testimonial-export').click();assert.equal(db.sql.prepare('SELECT COUNT(*) n FROM wb_orders').get().n,0);await m.locator('#key').fill(key);await m.locator('#login').click();await m.waitForFunction(()=>!document.querySelector('#login').disabled&&/Membership active|会员有效/.test(document.querySelector('#member-status').textContent));
 wait=m.waitForEvent('download');await m.locator('#testimonial-export').click();d=await wait;const f=await d.path();execFileSync('python3',['-c','import zipfile,sys;z=zipfile.ZipFile(sys.argv[1]);assert z.testzip() is None;h=z.read("index.html").decode();assert "PRIVATE QUOTE" in h;assert "Made with BPJ" not in h;assert set(z.namelist())=={"index.html","quote.svg","canva-bulk.csv","project.json","README.txt"}',f]);
 assert.ok(!JSON.stringify(requests).includes('PRIVATE'));assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await p.locator('#proof-preview').scrollIntoViewIfNeeded();await p.locator('#proof-preview').screenshot({path:'/tmp/proofkit-preview.png'});await p.screenshot({path:'/tmp/proofkit'+(prefix?'-en':'-zh')+'.png',fullPage:true});await m.close();await p.close();}
 async function ownPage(query='',privacy=false){
  const p=await c.newPage();await p.addInitScript(denied=>{if(window.top!==window)return;Object.defineProperty(navigator,'webdriver',{get:()=>false});if(denied)localStorage.setItem('fleet_ga4_choice_v1','denied');},privacy);
  await p.goto('https://baipiaoji.com/en/studio/testimonial-kit'+query);
  await p.locator('#proof-new').click();await p.locator('#proof-title').fill('PRIVATE CLIENT');await p.locator('[data-field=quote]').fill('PRIVATE QUOTE');await p.locator('[data-field=name]').fill('PRIVATE NAME');await p.locator('[data-field=approved]').check();
  return p;
 }
 const proofkitEvents=()=>requests.filter(body=>body.includes('"/proofkit/')).map(body=>JSON.parse(body));
 assert.deepEqual(proofkitEvents(),[],'QA journeys produce no demand events');
 const observed=await ownPage();
 const observedDownload=observed.waitForEvent('download');await observed.locator('#proof-svg').click();await observedDownload;
 await observed.locator('#proof-offer').waitFor({state:'visible'});
 const pop=observed.waitForEvent('popup');await observed.locator('#proof-paid').click();const observedMember=await pop;
 await observedMember.waitForFunction(()=>document.querySelector('#payload').value.includes('PRIVATE QUOTE'));
 assert.deepEqual(proofkitEvents(),['image_own','paid_offer_view','member_open'].map(action=>({p:'/proofkit/'+action,l:'en',e:'biz'})));
 await observedMember.close();await observed.close();
 const denied=await ownPage('',true);const deniedDownload=denied.waitForEvent('download');await denied.locator('#proof-free').click();await deniedDownload;
 await denied.locator('#proof-offer').waitFor({state:'visible'});assert.equal(proofkitEvents().length,3,'stored opt-out suppresses offer measurement');await denied.close();
 readinessFails=true;
 const retry=await ownPage('?__ci=1');
 await retry.evaluate(()=>{const now=Date.now;window.fixtureNowOffset=0;Date.now=()=>now()+window.fixtureNowOffset;});
 async function freeDownload(page){const pending=page.waitForEvent('download');await page.locator('#proof-free').click();await pending;}
 const failedRead=retry.waitForResponse(r=>new URL(r.url()).pathname==='/api/member'&&r.status()===503);
 await freeDownload(retry);await failedRead;
 assert(await retry.locator('#proof-offer').isHidden());
 const failedReadCount=readinessRequests.length;
 readinessFails=false;
 await freeDownload(retry);assert.equal(readinessRequests.length,failedReadCount,'rapid repeat exports reuse the failed readiness window');
 await retry.evaluate(()=>{window.fixtureNowOffset=31000;});
 await freeDownload(retry);await retry.locator('#proof-offer').waitFor({state:'visible'});
 assert.equal(readinessRequests.length,failedReadCount+1,'later valid own export recovers a transient status failure');
 await freeDownload(retry);assert.equal(readinessRequests.length,failedReadCount+1,'rapid repeat exports reuse a fresh readiness success');
 await retry.close();
 checkoutReady=false;
 const closed=await ownPage('?__ci=1');const closedRead=closed.waitForResponse(r=>new URL(r.url()).pathname==='/api/member');
 const closedDownload=closed.waitForEvent('download');await closed.locator('#proof-free').click();await closedDownload;await closedRead;
 assert(await closed.locator('#proof-offer').isHidden());assert.equal(await closed.locator('#proof-price').textContent(),'');
 const closedPopup=closed.waitForEvent('popup');await closed.locator('#proof-existing').click();const closedMember=await closedPopup;
 await closedMember.waitForFunction(()=>document.querySelector('#payload').value.includes('PRIVATE QUOTE'));
 await closedMember.locator('#key').fill(key);await closedMember.locator('#login').click();await closedMember.waitForFunction(()=>!document.querySelector('#login').disabled&&/Membership active/.test(document.querySelector('#member-status').textContent));
 const closedPackage=closedMember.waitForEvent('download');await closedMember.locator('#testimonial-export').click();assert.equal((await closedPackage).suggestedFilename(),'bpj-customer-quotes.zip');
 await closedMember.close();await closed.close();
 assert.equal(db.sql.prepare('SELECT COUNT(*) n FROM wb_orders').get().n,0);
 assert.deepEqual(errors,[]);console.log('PASS EN/ZH mobile, own/fictional and readiness offer gating, tracked opt-in, paid ZIP and active-member delivery while checkout is closed. All requests intercepted.');
}finally{await browser.close();db.sql.close();}
