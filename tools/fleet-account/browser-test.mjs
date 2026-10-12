import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {join,extname} from 'node:path';
import {accountRoute} from './edge.mjs';
import {hubRoute} from './hub.mjs';
import {ensureAccounts,issueSession,now} from '../../sites/baipiaoji/lib/free-account.js';
import {onRequest as bpjAccount} from '../../sites/baipiaoji/functions/api/account.js';
const {chromium}=process.env.PLAYWRIGHT_MODULE?await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href):createRequire(new URL('../revenue-studio/package.json',import.meta.url))('playwright');
const sql=new DatabaseSync(':memory:');let queue=Promise.resolve();
const env={HITS:{prepare(s){let a=[];const q={bind(...v){a=v;return q},run(){return sql.prepare(s).run(...a)},async first(){return sql.prepare(s).get(...a)||null},async all(){return {results:sql.prepare(s).all(...a)}}};return q},batch(qs){const job=queue.then(()=>{sql.exec('BEGIN');try{const out=qs.map(q=>q.run());sql.exec('COMMIT');return out}catch(e){sql.exec('ROLLBACK');throw e}});queue=job.catch(()=>{});return job}}};
await ensureAccounts(env);sql.prepare('INSERT INTO free_accounts VALUES(?,?,?,?,?,?,?,?)').run('fixture','BrowserFixture','test-only','test-only',1,now(),now(),1);sql.prepare('INSERT INTO free_account_identities VALUES(?,?,?,?,?,?)').run('fixture','browser@example.test','BrowserFixture','browserfixture',1,now());
const bpjToken=await issueSession(env,{id:'fixture',session_version:1}),errors=[];let pendingRedirect=null;
const root=process.env.FLEET_ACCOUNT_TEST_DIST||fileURLToPath(new URL('../../sites/baipiaoji/dist/',import.meta.url));
const browser=await chromium.launch({headless:true,...(process.env.PILOT_CHROMIUM?{executablePath:process.env.PILOT_CHROMIUM,args:['--no-sandbox','--disable-dev-shm-usage']}: {})});
try{
 const c=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
 const service=(url,init)=>hubRoute(new Request(url,init),env);
 await c.route('**/*',async route=>{const r=route.request(),u=new URL(r.url()),headers={...await r.allHeaders(),'CF-Connecting-IP':'192.0.2.20'},request=new Request(r.url(),{method:r.method(),headers,...(r.method()==='POST'?{body:r.postData()}: {})});let out;
  if(u.hostname==='agiscorecard.com'){out=await accountRoute(request,{},service);if(!out&&u.pathname==='/jarvis')out=new Response('<!doctype html><html lang="en"><body><main>Original public tool fixture</main></body></html>',{headers:{'Content-Type':'text/html'}});}
  else if(u.hostname==='baipiaoji.com'){
   if(u.pathname==='/api/account-fleet')out=await hubRoute(request,env);
   else if(u.pathname==='/api/account')out=await bpjAccount({request,env});
   else if(u.pathname.startsWith('/api/'))out=new Response(JSON.stringify({ok:true,available:false}),{headers:{'Content-Type':'application/json'}});
   else{let path=u.pathname;if(path.endsWith('/'))path+='index.html';else if(!extname(path))path+='.html';const file=join(root,path);if(existsSync(file))out=new Response(readFileSync(file),{headers:{'Content-Type':({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'})[extname(file)]||'text/plain'}});}
  }
  if(!out)return route.abort();const hs=Object.fromEntries(out.headers);if(out.headers.getSetCookie().length)hs['set-cookie']=out.headers.getSetCookie().join('\n');// Playwright redirects may leave request interception and contact production.
  // Keep this test entirely offline; real 303 contracts are tested in test.mjs.
  if(out.status===303){pendingRedirect=new URL(out.headers.get('Location'),r.url()).href;delete hs.location;return route.fulfill({status:200,headers:hs,body:'Redirect boundary fixture'});}
  return route.fulfill({status:out.status,headers:hs,body:Buffer.from(await out.arrayBuffer())});
 });
 const entry='https://agiscorecard.com/auth/account?next=%2Fjarvis&lang=en';
 // A guest can return to the original public tool without registration or a bridge marker.
 await p.goto(entry);await p.locator('[data-fleet-return]').first().click();
 assert.equal(new URL(p.url()).pathname,'/jarvis');
 assert.equal(await p.evaluate(()=>sessionStorage.getItem('workbench-member-key:agi')),null);
 await p.goto(entry);
 // Existing paid workspace access is a separate, synthetic same-tab fixture.
 await p.evaluate(()=>sessionStorage.setItem('workbench-member-key:agi','paid-fixture-existing'));
 await p.locator('[data-fleet-start]').click();
 assert(pendingRedirect?.startsWith('https://baipiaoji.com/en/account?'));
 assert.equal(new URL(pendingRedirect).searchParams.get('lang'),'en');
 await p.goto(pendingRedirect);pendingRedirect=null;
 const confirm=p.locator('#account-fleet-confirm');await confirm.waitFor();
 assert(await confirm.isDisabled(),'Guest cannot grant access');
 // Fixture represents an existing authenticated BPJ account; real Google consent is not simulated as proof.
 await c.addCookies([{name:'__Host-bpj_account',value:bpjToken,domain:'baipiaoji.com',path:'/',secure:true,httpOnly:true,sameSite:'Lax'}]);
 await p.reload();await p.waitForFunction(()=>window.bpjAccount?.state.user);
 await p.waitForFunction(()=>!document.getElementById('account-fleet-confirm').disabled);
 await confirm.click();await p.waitForURL(u=>u.hostname==='agiscorecard.com'&&u.pathname==='/auth/callback');
 const result=new URL(pendingRedirect);assert.equal(result.origin,'https://agiscorecard.com');
 assert.equal(result.pathname,'/auth/account');assert.equal(result.searchParams.get('next'),'/jarvis');assert.equal(result.searchParams.get('lang'),'en');
 await p.goto(pendingRedirect);pendingRedirect=null;
 assert((await p.locator('main').textContent()).includes('BrowserFixture'));
 assert.equal(await p.evaluate(()=>sessionStorage.getItem('workbench-member-key:agi')),'paid-fixture-existing','Completing sign-in must not replace a paid key.');
 const resume=p.locator('[data-fleet-return].fleet-button');
 assert(await resume.evaluate(a=>a.hasAttribute('data-fleet-app')),'Authenticated AGI return uses the explicit bridge.');
 await resume.click();assert.equal(new URL(p.url()).pathname,'/jarvis');
 assert.equal(await p.evaluate(()=>sessionStorage.getItem('workbench-member-key:agi')),'paid-fixture-existing','Explicit return must preserve an existing paid key.');
 // With no prior workspace key, only the explicit app action enables the free bridge.
 await p.evaluate(()=>sessionStorage.removeItem('workbench-member-key:agi'));
 await p.goto(entry);assert.equal(await p.evaluate(()=>sessionStorage.getItem('workbench-member-key:agi')),null);
 await p.locator('[data-fleet-app][href="/jarvis"]').first().click();
 assert.equal(new URL(p.url()).pathname,'/jarvis');
 assert.equal(await p.evaluate(()=>sessionStorage.getItem('workbench-member-key:agi')),'fleet');
 await p.goto(entry);assert.equal(await p.evaluate(()=>document.cookie.includes('fleet_account')),false);
 assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await p.screenshot({path:process.env.FLEET_ACCOUNT_SCREENSHOT||'/tmp/fleet-account-mobile.png',fullPage:true});await p.locator('#fleet-logout').click();await p.locator('[data-fleet-start]').waitFor();assert.deepEqual(errors,[]);
 console.log('PASS mobile browser: real generated BPJ page, disabled anonymous consent, explicit grant, SQLite PKCE exchange, English hub, guest return, explicit AGI app continuation and preserved paid key, HttpOnly session and logout. Redirect boundaries are stepped offline; synthetic identity only; no real Google consent.');
}finally{await browser.close();sql.close();}
