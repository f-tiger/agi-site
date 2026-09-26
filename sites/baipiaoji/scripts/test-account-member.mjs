import assert from 'node:assert/strict';
import {onRequest as account} from '../functions/api/account.js';
import {onRequestPost as bridge} from '../functions/api/account-member.js';
import {onRequestPost as legacy} from '../functions/api/member.js';
import {mockChain,setupSites,fixture,transfer,KEY,TX} from '../../../tools/member-studio/test-fixtures.mjs';
import {digest,seconds} from '../lib/ad-commerce.js';
import {memberByToken} from '../lib/membership.js';
const origin='https://baipiaoji.com',password='fixture-password-very-long',nonce='a'.repeat(32),space='b'.repeat(32);
const data={version:1,product:'launchdesk',values:{project:'private fixture'}};
const request=(path,body,cookie='',extra={})=>new Request(origin+path,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,'CF-Connecting-IP':'192.0.2.1',Cookie:cookie,...extra},body:JSON.stringify(body)});
async function result(handler,env,req){const response=await handler({request:req,env});return {status:response.status,body:await response.json(),cookie:response.headers.get('Set-Cookie')?.split(';')[0]};}
const free=(env,body,cookie)=>result(account,env,request('/api/account',body,cookie));
const call=(env,user,action,extra={},headers={})=>result(bridge,env,request('/api/account-member',{action,account_id:user?.id,...extra},user?.cookie,headers));
const old=(env,key,action,extra={})=>result(legacy,env,request('/api/member',{action,...extra},'',{Authorization:'Bearer '+key}));
async function register(env,username){const j=await free(env,{action:'register',username,password,consent:true,qa:true});assert.equal(j.status,200);return {...j.body.user,cookie:j.cookie};}
async function context(){const all=await setupSites();const {env,db}=all.bpj;const a=await register(env,'account_one'),b=await register(env,'account_two');return {env,db,a,b,close(){for(const s of Object.values(all))s.db.sql.close();}};}
async function existing(db,key=KEY,id='paid-member'){await db.prepare('INSERT INTO wb_members(id,token_hash,created,ends_at) VALUES(?,?,?,?)').bind(id,await digest(key),seconds(),seconds()+86400).run();return id;}
let count=0;async function test(name,fn){const c=await context();try{await fn(c);console.log('PASS '+name);count++;}finally{c.close();}}
const reset=mockChain();
try{
 await test('cookie bridge rejects unauthenticated, mixed, cross-origin and switched identities',async({env,a,b,db})=>{
  assert.equal((await call(env,null,'status')).status,401);
  assert.equal((await call(env,a,'status',{}, {Origin:'https://evil.example'})).status,403);
  assert.equal((await call(env,a,'status',{}, {Origin:''})).status,403);
  assert.equal((await call(env,a,'status',{}, {Authorization:'Bearer '+KEY})).body.code,'mixed_authentication');
  assert.equal((await call(env,a,'status',{account_id:b.id})).body.code,'account_changed');
  assert.equal((await call(env,{cookie:a.cookie},'create_key',{password})).body.code,'account_changed');
  assert.equal((await call({...env,MEMBER_SITE:'eco'},a,'status')).body.code,'wrong_site');
  assert.equal(db.sql.prepare('SELECT COUNT(*) n FROM wb_members').get().n,0);
 });
 await test('new key requires reauthentication and backup; closed sales do not block account setup',async({env,db,a})=>{
  const off={...env,MEMBERS_ENABLED:'false'};
  assert.equal((await call(off,a,'create_key',{password:'wrong-password-value'})).status,401);
  assert.equal(db.sql.prepare('SELECT COUNT(*) n FROM wb_members').get().n,0);
  const created=await call(off,a,'create_key',{password});assert.equal(created.status,200);assert.match(created.body.key,/^[a-f0-9]{64}$/);
  assert.equal((await call(off,a,'status')).body.active,false);
  assert.equal((await call(off,a,'create_key',{password})).body.code,'already_linked');
  const checkout={nonce,accept_terms:true,key_saved:true};
  assert.equal((await call(env,a,'checkout',checkout)).body.code,'key_backup_required');
  assert.equal((await call(env,a,'confirm_backup',{key:KEY,confirmed:true})).body.code,'bad_key');
  assert.equal((await call(env,a,'confirm_backup',{key:created.body.key,confirmed:true})).status,200);
  assert.equal((await call(off,a,'checkout',checkout)).body.code,'not_ready');
  const quote=await call(env,a,'checkout',checkout);assert.equal(quote.status,200);assert.equal(quote.body.order.state,'pending');
  assert.equal((await old(env,created.body.key,'checkout',checkout)).body.order.id,quote.body.order.id);
  assert.equal((await call(env,a,'save',{id:space,revision:0,name:'Unpaid',data})).status,403);
  assert.equal(db.sql.prepare('SELECT COUNT(*) n FROM wb_spaces').get().n,0);
  const row=db.sql.prepare('SELECT * FROM wb_orders').get();fixture.receipt=transfer(row);db.sql.exec('UPDATE wb_orders SET checked_at=0');
  assert.equal((await call(env,a,'check',{id:row.id,tx:TX})).body.order.state,'paid');
  assert.equal((await call(env,a,'status')).body.active,true);
  assert.equal((await call(env,a,'save',{id:space,revision:0,name:'Paid',data})).status,200);
  assert.equal((await old(env,created.body.key,'read',{id:space,revision:1})).body.data.values.project,'private fixture');
 });
 await test('link is one-to-one, requires both credentials and preserves legacy ownership',async({env,db,a,b})=>{
  await existing(db);const other='2'.repeat(64);await existing(db,other,'other-paid');
  assert.equal((await call(env,a,'link_key',{key:KEY,key_saved:true,password:'wrong-password-value'})).status,401);
  assert.equal((await call(env,a,'link_key',{key:KEY,password})).body.code,'consent_required');
  assert.equal((await call(env,a,'link_key',{key:KEY,key_saved:true,password})).status,200);
  assert.equal((await call(env,b,'link_key',{key:KEY,key_saved:true,password})).body.code,'link_conflict');
  assert.equal((await call(env,a,'link_key',{key:other,key_saved:true,password})).body.code,'link_conflict');
  assert.equal((await call(env,b,'link_key',{key:other,key_saved:true,password})).status,200);
  assert.equal((await old(env,KEY,'status')).body.active,true);
  assert.equal((await call(env,a,'save',{id:space,revision:0,name:'Owner A',data})).status,200);
  assert.equal((await call(env,b,'read',{id:space,revision:1})).status,404);
  await call(env,b,'delete',{id:space});assert.equal(db.sql.prepare('SELECT COUNT(*) n FROM wb_spaces').get().n,1);
  assert.equal((await call(env,a,'save',{id:space,revision:0,name:'Stale',data})).status,409);
 });
 await test('racing links cannot steal a member or leave partial membership rows',async({env,db,a,b})=>{
  await existing(db);
  const attempts=await Promise.all([call(env,a,'link_key',{key:KEY,key_saved:true,password}),call(env,b,'link_key',{key:KEY,key_saved:true,password})]);
  assert.deepEqual(attempts.map(x=>x.status).sort(),[200,409]);
  assert.equal(db.sql.prepare('SELECT COUNT(*) n FROM bpj_account_members').get().n,1);
  const winner=attempts[0].status===200?a:b,loser=winner===a?b:a;
  assert.equal((await call(env,winner,'status')).body.active,true);assert.equal((await call(env,loser,'status')).body.exists,false);
  const creates=await Promise.all([call(env,loser,'create_key',{password}),call(env,loser,'create_key',{password})]);
  assert.deepEqual(creates.map(x=>x.status).sort(),[200,409]);assert.equal(db.sql.prepare('SELECT COUNT(*) n FROM wb_members').get().n,2);
 });
 await test('replacement requires password, rotates the legacy key and preserves paid dates and data',async({env,db,a})=>{
  await existing(db);await call(env,a,'link_key',{key:KEY,key_saved:true,password});
  await call(env,a,'save',{id:space,revision:0,name:'Before rotation',data});const before=(await memberByToken(db,KEY)).ends_at;
  assert.equal((await call(env,a,'rotate',{new_key:'3'.repeat(64)})).status,403);
  assert.equal((await call(env,a,'replace_key',{password:'wrong-password-value'})).status,401);
  const next=await call(env,a,'replace_key',{password});assert.equal(next.status,200);assert.notEqual(next.body.key,KEY);
  assert.equal(await memberByToken(db,KEY),null);assert.equal((await memberByToken(db,next.body.key)).ends_at,before);
  assert.equal((await call(env,a,'status')).body.key_backed_up,false);assert.equal((await call(env,a,'read',{id:space,revision:1})).status,200);
  assert.equal((await call(env,a,'confirm_backup',{key:next.body.key,confirmed:true})).status,200);
  assert.equal((await old(env,next.body.key,'rotate',{new_key:'4'.repeat(64)})).status,200);
  assert.equal((await call(env,a,'status')).body.key_backed_up,false);
 });
 await test('password change revokes the bridge session without changing paid linkage',async({env,db,a})=>{
  await existing(db);await call(env,a,'link_key',{key:KEY,key_saved:true,password});
  const changed=await free(env,{action:'change_password',account_id:a.id,old_password:password,new_password:password+'2'},a.cookie);assert.equal(changed.status,200);
  assert.equal((await call(env,a,'status')).status,401);
  const login=await free(env,{action:'login',username:a.username,password:password+'2'});assert.equal(login.status,200);
  assert.equal((await call(env,{...a,cookie:login.cookie},'status')).body.active,true);
  assert.equal(db.sql.prepare('SELECT member_id FROM bpj_account_members WHERE account_id=?').get(a.id).member_id,'paid-member');
 });
 await test('account deletion requires the current key backup and leaves paid access intact',async({env,db,a,b})=>{
  await existing(db);await call(env,a,'link_key',{key:KEY,key_saved:true,password});
  const next='5'.repeat(64);assert.equal((await old(env,KEY,'rotate',{new_key:next})).status,200);
  const deletion={action:'delete_account',account_id:a.id,password,confirm:true};
  assert.equal((await free(env,deletion,a.cookie)).body.error,'member_key_backup_required');
  assert.equal((await call(env,a,'confirm_backup',{key:next,confirmed:true})).status,200);
  assert.equal((await free(env,deletion,a.cookie)).status,200);
  assert.equal((await call(env,a,'status')).status,401);
  assert.equal((await old(env,next,'status')).body.active,true);
  assert.equal(db.sql.prepare('SELECT COUNT(*) n FROM bpj_account_members').get().n,0);
  assert.equal((await call(env,b,'link_key',{key:next,key_saved:true,password})).status,200);
 });
 await test('body cap and password rate gate fail without granting membership',async({env,a})=>{
  assert.equal((await call(env,a,'status',{padding:'x'.repeat(100001)})).status,400);
  for(let i=0;i<5;i++)assert.equal((await call(env,a,'create_key',{password:'wrong-password-value'})).status,401);
  assert.equal((await call(env,a,'create_key',{password})).status,429);
  assert.equal((await call(env,a,'status')).body.exists,false);
 });
 if(process.argv.includes('--browser')){
  const fs=await import('node:fs'),os=await import('node:os'),path=await import('node:path'),{createRequire}=await import('node:module'),{execFileSync}=await import('node:child_process');
  const {chromium}=createRequire(new URL('../../../tools/revenue-studio/package.json',import.meta.url))('playwright');
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'account-member-ui-'));
  execFileSync(process.execPath,['tools/revenue-studio/build.mjs','--site','bpj','--out',tmp],{stdio:'pipe'});
  execFileSync(process.execPath,['tools/member-studio/build.mjs','--site','bpj','--out',tmp],{stdio:'pipe'});
  const c=await context();await existing(c.db);await existing(c.db,'2'.repeat(64),'paid-two');
  await call(c.env,c.a,'link_key',{key:KEY,key_saved:true,password});await call(c.env,c.b,'link_key',{key:'2'.repeat(64),key_saved:true,password});
  await call(c.env,c.a,'save',{id:space,revision:0,name:'Private A project',data});
  const fresh=await register(c.env,'account_fresh');
  const browser=await chromium.launch({headless:true,...(process.env.WORKBENCH_CHROMIUM?{executablePath:process.env.WORKBENCH_CHROMIUM,args:['--no-sandbox','--no-zygote','--disable-dev-shm-usage','--disable-gpu']}:{})});
  try{
   const ctx=await browser.newContext(),errors=[];ctx.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
   const useCookie=async user=>{const[name,value]=user.cookie.split('=');await ctx.addCookies([{name,value,url:origin,httpOnly:true,secure:true,sameSite:'Lax'}]);};
   await ctx.route('**/*',async route=>{
    const req=route.request(),url=new URL(req.url());if(url.origin!==origin)return route.abort();
    let handler=url.pathname==='/api/account'?account:url.pathname==='/api/account-member'?bridge:null;
    if(url.pathname==='/api/member')handler=req.method()==='POST'?legacy:(await import('../functions/api/member.js')).onRequestGet;
    if(handler){const response=await handler({env:c.env,request:new Request(req.url(),{method:req.method(),headers:{...req.headers(),'CF-Connecting-IP':'192.0.2.1'},...(req.method()==='POST'?{body:req.postData()}:{})})});return route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:await response.text()});}
    if(url.pathname==='/fixture-opener')return route.fulfill({contentType:'text/html',body:'<!doctype html><title>Verified tool fixture</title><button id="open">Open membership</button>'});
    const file=path.join(tmp,url.pathname+(path.extname(url.pathname)?'':'.html'));
    if(!fs.existsSync(file))return route.fulfill({status:404,body:'fixture not found'});
    return route.fulfill({body:fs.readFileSync(file),contentType:{'.html':'text/html','.mjs':'application/javascript','.js':'application/javascript','.css':'text/css','.json':'application/json'}[path.extname(file)]||'application/octet-stream'});
   });
   await useCookie(fresh);const page=await ctx.newPage();await page.goto(origin+'/en/members');await page.waitForFunction(()=>document.querySelector('#availability').textContent.includes('Web3'));
   await page.locator('#key').fill(KEY);await page.locator('#login').click();await page.waitForFunction(()=>document.querySelector('#member-status').textContent.includes(new Date().getFullYear()));
   assert.equal(await page.locator('#account-mode').textContent(),'Current access: key');
   await page.locator('#account-use').click();await page.waitForFunction(()=>document.querySelector('#account-mode').textContent.includes('account_fresh'));
   assert.equal((await call(c.env,fresh,'status')).body.exists,false);assert.equal(await page.locator('#key').inputValue(),'');
   await page.locator('#account-password').fill(password);await page.locator('#account-create').click();await page.waitForFunction(()=>document.querySelector('#account-key').value.length===64);
   const dl=page.waitForEvent('download');await page.locator('#backup-key').click();assert.equal((await dl).suggestedFilename(),'bpj-access-key.json');
   await page.locator('#key-saved').check();await page.locator('#account-confirm').click();await page.waitForFunction(()=>document.querySelector('#notice').textContent.includes('backup confirmed'));assert.equal(c.db.sql.prepare('SELECT COUNT(*) n FROM wb_orders').get().n,0);await page.locator('#consent').check();await page.locator('#checkout').click();await page.waitForFunction(()=>document.querySelector('#orders').textContent.includes('9.'));
   assert.equal((await call(c.env,fresh,'status')).body.active,false);
   await useCookie(c.a);await page.locator('#refresh').click();await page.waitForFunction(()=>document.querySelector('#notice').textContent.includes('account_changed'));
   assert.equal(await page.locator('#orders').textContent(),'');assert.equal(await page.locator('#key').inputValue(),'');assert.equal(await page.locator('#account-key').inputValue(),'');
   await page.locator('#account-use').click();await page.waitForFunction(()=>document.querySelector('#space-list').textContent.includes('Private A project'));
   await page.locator('.workspace-item').click();await page.waitForFunction(()=>document.querySelector('#payload').value.includes('private fixture'));
   await useCookie(c.b);await page.locator('#refresh').click();await page.waitForFunction(()=>document.querySelector('#notice').textContent.includes('account_changed'));
   assert.equal(await page.locator('#payload').inputValue(),'');
   console.log('PASS browser: explicit mode, backup checkout and other-tab account changes');

   await useCookie(c.a);const opener=await ctx.newPage();await opener.goto(origin+'/fixture-opener');
   await opener.evaluate(({data,space,nonce})=>{window.ack=null;document.querySelector('#open').onclick=()=>{const target=window.open('/en/members?from='+encodeURIComponent(location.origin)+'&tool=launchdesk');window.addEventListener('message',e=>{if(e.source!==target||e.origin!==location.origin)return;if(e.data?.kind==='workbench-member-ready')target.postMessage({kind:'workbench-save',data,context:{id:space,revision:1,name:'Private A project'},handoff:nonce},location.origin);if(e.data?.kind==='workbench-saved')window.ack=e.data;});};},{data,space,nonce});
   const popup=opener.waitForEvent('popup');await opener.locator('#open').click();const portal=await popup;await portal.waitForFunction(()=>document.querySelector('#payload').value.includes('private fixture'));
   await portal.locator('#account-use').click();await portal.waitForFunction(()=>document.querySelector('#space-list').textContent.includes('Private A project'));
   await portal.locator('#save').click();await opener.waitForFunction(()=>window.ack?.context.revision===2);
   assert.equal((await opener.evaluate(()=>window.ack)).context.id,space);assert.equal((await opener.evaluate(()=>window.ack)).same,true);
   await useCookie(c.b);await portal.locator('#refresh').click();await portal.waitForFunction(()=>document.querySelector('#notice').textContent.includes('account_changed'));
   assert.ok((await portal.locator('#payload').inputValue()).includes('private fixture'));
   await portal.locator('#account-use').click();await portal.waitForFunction(()=>document.querySelector('#account-mode').textContent.includes('account_two'));
   await portal.locator('#save').click();await opener.waitForFunction(space=>window.ack?.context.id!==space,space);
   const ack=await opener.evaluate(()=>window.ack);assert.equal(ack.handoff,nonce);assert.equal(ack.same,true);assert.equal(ack.context.revision,1);
   assert.equal(c.db.sql.prepare('SELECT revision FROM wb_spaces WHERE member_id=? AND id=?').get('paid-member',space).revision,2);
   assert.equal(c.db.sql.prepare('SELECT revision FROM wb_spaces WHERE member_id=? AND id=?').get('paid-two',ack.context.id).revision,1);
   await portal.setViewportSize({width:390,height:844});assert.ok(await portal.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   assert.deepEqual(errors,[]);console.log('PASS browser: handoff revision survives login; another account receives a new owned project');
  }finally{await browser.close();c.close();fs.rmSync(tmp,{recursive:true,force:true});}
 }
 console.log(`${count} account/member bridge tests passed (real SQLite, real password KDF, mocked chain; no real funds).`);
}finally{reset();}
