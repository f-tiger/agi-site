import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join,extname} from 'node:path';
import {accountRoute} from './edge.mjs';
import {hubRoute} from './hub.mjs';
import {ensureAccounts,issueSession,now} from '../../sites/baipiaoji/lib/free-account.js';
import {onRequest as bpjAccount} from '../../sites/baipiaoji/functions/api/account.js';
const {chromium}=createRequire(new URL('../revenue-studio/package.json',import.meta.url))('playwright');
const sql=new DatabaseSync(':memory:');let queue=Promise.resolve();
const env={HITS:{prepare(s){let a=[];const q={bind(...v){a=v;return q},run(){return sql.prepare(s).run(...a)},async first(){return sql.prepare(s).get(...a)||null},async all(){return {results:sql.prepare(s).all(...a)}}};return q},batch(qs){const job=queue.then(()=>{sql.exec('BEGIN');try{const out=qs.map(q=>q.run());sql.exec('COMMIT');return out}catch(e){sql.exec('ROLLBACK');throw e}});queue=job.catch(()=>{});return job}}};
await ensureAccounts(env);sql.prepare('INSERT INTO free_accounts VALUES(?,?,?,?,?,?,?,?)').run('fixture','BrowserFixture','test-only','test-only',1,now(),now(),1);sql.prepare('INSERT INTO free_account_identities VALUES(?,?,?,?,?,?)').run('fixture','browser@example.test','BrowserFixture','browserfixture',1,now());
const bpjToken=await issueSession(env,{id:'fixture',session_version:1}),errors=[];let pendingRedirect=null;
const root=fileURLToPath(new URL('../../sites/baipiaoji/dist/',import.meta.url));
const browser=await chromium.launch({headless:true,...(process.env.PILOT_CHROMIUM?{executablePath:process.env.PILOT_CHROMIUM,args:['--no-sandbox','--disable-dev-shm-usage']}: {})});
try{
 const c=await browser.newContext({viewport:{width:390,height:844}}),p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
 const service=(url,init)=>hubRoute(new Request(url,init),env);
 await c.route('**/*',async route=>{const r=route.request(),u=new URL(r.url()),headers={...await r.allHeaders(),'CF-Connecting-IP':'192.0.2.20'},request=new Request(r.url(),{method:r.method(),headers,...(r.method()==='POST'?{body:r.postData()}: {})});let out;
  if(u.hostname==='agiscorecard.com')out=await accountRoute(request,{},service);
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
 await p.goto('https://agiscorecard.com/auth/account');await p.getByRole('link',{name:'使用 Google 继续 / Continue with Google'}).click();assert(pendingRedirect?.startsWith('https://baipiaoji.com/account?'));await p.goto(pendingRedirect);pendingRedirect=null;const confirm=p.getByRole('button',{name:'确认并返回本站 / Confirm and return'});await confirm.waitFor();assert(await confirm.isDisabled(),'Guest cannot grant access');
 // Fixture represents an existing authenticated BPJ account; real Google consent is not simulated as proof.
 await c.addCookies([{name:'__Host-bpj_account',value:bpjToken,domain:'baipiaoji.com',path:'/',secure:true,httpOnly:true,sameSite:'Lax'}]);await p.reload();await p.waitForFunction(()=>window.bpjAccount?.state.user);await p.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent.includes('Confirm and return')&&!b.disabled));await confirm.click();await p.waitForURL(u=>u.hostname==='agiscorecard.com'&&u.pathname==='/auth/callback');assert.equal(pendingRedirect,'https://agiscorecard.com/auth/account');await p.goto(pendingRedirect);pendingRedirect=null;assert((await p.locator('main').textContent()).includes('BrowserFixture'));assert.equal(await p.evaluate(()=>document.cookie.includes('fleet_account')),false);assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await p.screenshot({path:process.env.FLEET_ACCOUNT_SCREENSHOT||'/tmp/fleet-account-mobile.png',fullPage:true});await p.getByRole('button',{name:'退出本站 / Sign out'}).click();await p.getByRole('link',{name:'使用 Google 继续 / Continue with Google'}).waitFor();assert.deepEqual(errors,[]);
 console.log('PASS mobile browser: real generated BPJ page, disabled anonymous consent, explicit grant, SQLite PKCE exchange, return target, HttpOnly session and logout. Redirect boundaries are stepped offline; synthetic identity only; no real Google consent.');
}finally{await browser.close();sql.close();}
