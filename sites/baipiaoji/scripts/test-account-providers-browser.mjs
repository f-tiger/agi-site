import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {buildAccountPages} from './account-pages.mjs';

// Exercise the production page builder and account.js. Provider/account HTTP
// replies and the GIS library are local mocks: no credentials, mail or network.
const {chromium}=createRequire(new URL('../../../tools/revenue-studio/package.json',import.meta.url))('playwright');
const ORIGIN='https://baipiaoji.com',PASSWORD='provider browser fixture password',TOKEN='T'.repeat(43),RECOVERY='R'.repeat(43);
const USER={id:'provider-fixture-user',username:'Provider_Test',email:'provider@example.test',email_verified:true};
const accountScript=fs.readFileSync(new URL('../assets/account.js',import.meta.url),'utf8');
function pageHTML(lang){
 let html;
 buildAccountPages({LOCALE:{code:lang},BASE:lang==='en'?'/en':'',esc:String,pushPage(){},write(_,value){html=value;},layout({body}){
  return `<!doctype html><html lang="${lang}"><head><script>window.__headObservedHash=location.hash;window.__headObservedReceipt=window.__bpjMailReceipt||null;</script><script defer src="/assets/account.js"></script></head><body>${body}</body></html>`;
 }});
 assert(html.startsWith('<!doctype html>'));return html;
}
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};
const gis=`window.__gisInitializations=[];window.google={accounts:{id:{initialize(options){window.__gisOptions=options;window.__gisInitializations.push(options.nonce);},renderButton(box){const button=document.createElement('button');button.type='button';button.textContent='Mock Google';box.append(button);}}}};`;
let browser;const errors=[];
async function fixture({lang='en',user=null,google=null,resetFailure=false,holdReset=false,holdCredential=false}={}){
 const context=await browser.newContext({acceptDownloads:true}),calls=[],release=deferred(),entered=deferred();
 let serverUser=user,resetDone=false;
 context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
 await context.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.href==='https://accounts.google.com/gsi/client')return route.fulfill({contentType:'text/javascript',body:gis});
  assert.equal(url.origin,ORIGIN,'Unexpected external request');
  const json=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  if(url.pathname.startsWith('/api/')){
   const body=request.method()==='POST'?request.postDataJSON():null;calls.push({path:url.pathname,method:request.method(),body});
   if(url.pathname==='/api/account'){
    if(!body){if(resetDone&&resetFailure)return json({ok:false,error:'unavailable'},503);return json({ok:true,user:serverUser,favorites:[]});}
    if(body.action==='login'){serverUser=USER;return json({ok:true,user:USER,favorites:[]});}
    if(body.action==='logout'){serverUser=null;return json({ok:true});}
    throw Error('Unexpected account action '+body.action);
   }
   if(url.pathname==='/api/account-email'){
    if(!body)return json({ok:true,available:true});
    if(body.action==='reset'){
     assert.equal(body.token,TOKEN);assert.equal(body.new_password,PASSWORD);serverUser=null;resetDone=true;entered.resolve();if(holdReset)await release.promise;
     return json({ok:true,sign_in_required:true,email:USER.email,recovery_code:RECOVERY});
    }
    throw Error('Unexpected email action '+body.action);
   }
   if(url.pathname==='/api/account-google'){
    if(!body)return json({ok:true,available:!!google,...(google?.onboarding?{onboarding:google.onboarding}:{})});
    if(body.action==='start')return json({ok:true,client_id:'test-client.apps.googleusercontent.com',nonce:'N'.repeat(43)});
    if(body.action==='credential'){
     serverUser=USER;entered.resolve();if(holdCredential)await release.promise;
     return json({ok:true,state:'signed_in',user:USER,favorites:[]});
    }
    if(body.action==='link'){
     assert.equal(body.account_id,USER.id);assert.equal(body.password,PASSWORD);assert.equal(body.confirmed,true);
     return json({ok:true,state:'linked',user:USER});
    }
    throw Error('Unexpected Google action '+body.action);
   }
   throw Error('Unexpected API '+url.pathname);
  }
  if(url.pathname==='/assets/account.js')return route.fulfill({contentType:'text/javascript',body:accountScript});
  if(url.pathname.endsWith('/directory.json'))return json({tools:[]});
  if(url.pathname.endsWith('/changes.json'))return json({changes:[]});
  if(url.pathname.endsWith('/account'))return route.fulfill({contentType:'text/html',body:pageHTML(lang)});
  return route.fulfill({status:404,body:'Fixture route unavailable'});
 });
 const page=await context.newPage();
 const f={context,page,calls,entered,release,async open(fragment=''){
  await page.goto(ORIGIN+(lang==='en'?'/en':'')+'/account?__ci=1'+fragment);
  await page.waitForFunction(()=>window.bpjAccount?.state.loaded);
  await page.waitForFunction(()=>document.getElementById('account-mail-availability').textContent.length>0);
 },posts(action){return calls.filter(x=>x.body?.action===action);},gets(){return calls.filter(x=>x.path==='/api/account'&&!x.body).length;}};
 return f;
}
async function checkRecovery(f){
 await f.page.locator('#account-recovery').waitFor({state:'visible'});
 assert.equal(await f.page.locator('#account-recovery-code').textContent(),RECOVERY);
 assert.equal(await f.page.evaluate(()=>window.bpjAccount.state.user),null);
 const download=f.page.waitForEvent('download');await f.page.locator('#account-recovery-download').click();
 const text=fs.readFileSync(await (await download).path(),'utf8');assert(text.includes(USER.email));assert(text.includes(RECOVERY));
 assert.equal(await f.page.evaluate(()=>Object.values(localStorage).some(v=>v.includes('R'.repeat(43))||v.includes('T'.repeat(43)))),false);
}
try{
 const executablePath=process.env.PILOT_CHROMIUM||process.env.WORKBENCH_CHROMIUM;
 browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--no-zygote','--disable-gpu']});
 let groups=0;
 for(const lang of ['zh','en']){
  const f=await fixture({lang,user:USER,holdReset:true});await f.open('#email-action=reset&token='+TOKEN);
  assert.deepEqual(await f.page.evaluate(()=>({hash:location.hash,observed:window.__headObservedHash,receipt:window.__headObservedReceipt,remaining:window.__bpjMailReceipt})),{hash:'',observed:'',receipt:{action:'reset',token:TOKEN},remaining:undefined});
  await f.page.locator('#email-reset-password').fill(PASSWORD);await f.page.locator('#account-email-reset button').click();await f.entered.promise;
  const count=f.gets();await f.page.evaluate(async()=>{window.dispatchEvent(new Event('focus'));await window.bpjAccount.refresh();});
  assert.equal(f.gets(),count,'Focus must not observe the provider mutation before its response is consumed');
  assert.equal(await f.page.evaluate(()=>window.bpjAccount.state.user.id),USER.id);
  f.release.resolve();await checkRecovery(f);assert.equal(f.posts('reset').length,1);await f.context.close();groups++;
 }
 {
  const f=await fixture({user:USER,resetFailure:true});await f.open('#email-action=reset&token='+TOKEN);
  await f.page.locator('#email-reset-password').fill(PASSWORD);await f.page.locator('#account-email-reset button').click();
  await checkRecovery(f);assert.equal(await f.page.evaluate(()=>window.bpjAccount.state.error),true);await f.context.close();groups++;
 }
 {
  const f=await fixture({google:{onboarding:{state:'onboarding',email:USER.email}}});await f.open();
  await f.page.waitForFunction(()=>document.getElementById('register-email').readOnly);
  assert.equal(await f.page.locator('#register-email').inputValue(),USER.email);assert.equal(f.posts('start').length,0,'Reload must not invalidate an onboarding proof');
  await f.page.evaluate(async()=>{window.dispatchEvent(new Event('focus'));await window.bpjAccount.refresh();});
  assert.equal(f.posts('start').length,0);await f.context.close();groups++;
 }
 for(const signedIn of [false,true]){
  const f=await fixture({user:signedIn?USER:null,google:{onboarding:{state:'needs_link',email:USER.email}}});await f.open();
  if(!signedIn){
   await f.page.locator('#account-login').waitFor({state:'visible'});assert.equal(await f.page.locator('#login-email').inputValue(),USER.email);
   await f.page.locator('#login-password').fill(PASSWORD);await f.page.locator('#account-login button').click();
   await f.page.waitForFunction(()=>window.bpjAccount.state.user?.id==='provider-fixture-user');
  }
  await f.page.locator('details.account-panel summary').click();await f.page.locator('#account-confirm-google').waitFor({state:'visible'});
  assert.equal(f.posts('start').length,0,'Password sign-in/reload must preserve the pending Google proof');
  await f.page.locator('#google-link-password').fill(PASSWORD);await f.page.locator('#account-confirm-google button').click();
  await f.page.waitForFunction(()=>document.getElementById('account-status').textContent.includes('Google linked'));
  assert.equal(f.posts('link').length,1);assert.equal(f.posts('start').length,0);await f.context.close();groups++;
 }
 {
  const f=await fixture({google:{},holdCredential:true});await f.open();await f.page.waitForFunction(()=>!!window.__gisOptions);
  await f.page.evaluate(()=>{window.__credentialCallback=window.__gisOptions.callback({credential:'mock-credential'});});await f.entered.promise;
  const count=f.gets();await f.page.evaluate(async()=>{window.dispatchEvent(new Event('focus'));await window.bpjAccount.refresh();});assert.equal(f.gets(),count);
  f.release.resolve();await f.page.evaluate(()=>window.__credentialCallback);
  await f.page.waitForFunction(()=>window.bpjAccount.state.user?.id==='provider-fixture-user');
  assert.equal(await f.page.locator('#account-status').textContent(),'Signed in with Google.');assert.equal(f.posts('credential').length,1);await f.context.close();groups++;
 }
 assert.deepEqual(errors,[]);console.log(`PASS ${groups} provider browser groups: EN/ZH early fragment removal, signed-in reset/focus, reset/read failure recovery backup, pending Google onboarding/link retention and Google sign-in/focus.`);
}finally{if(errors.length)console.error('Provider browser errors:',errors);await browser?.close();}
