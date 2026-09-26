import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {onRequest} from '../functions/api/account.js';
import {ensureAccounts,getAccount,consumeRate,hash,PASSWORD_COST,ACCOUNT_COOKIE,issueSession} from '../lib/free-account.js';
import tools from '../data/tools.json' with {type:'json'};
function setup(){const sql=new DatabaseSync(':memory:');sql.exec("PRAGMA foreign_keys=ON; CREATE TABLE hits (id INTEGER PRIMARY KEY); INSERT INTO hits(id) VALUES(1)");const HITS={prepare(query){let values=[];const q={bind(...args){values=args;return q;},async run(){return sql.prepare(query).run(...values);},async first(){return sql.prepare(query).get(...values)||null;},async all(){return {results:sql.prepare(query).all(...values)};}};return q;},async batch(queries){sql.exec('BEGIN');try{const out=[];for(const q of queries)out.push(await q.run());sql.exec('COMMIT');return out;}catch(error){sql.exec('ROLLBACK');throw error;}}};return {sql,env:{HITS}};}
const password='correct horse battery 47';const newPassword='new strong password 2026';
function request(body,{cookie='',origin='https://baipiaoji.com',ip='192.0.2.10',headers={}}={}){return new Request('https://baipiaoji.com/api/account',{method:body?'POST':'GET',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':ip,...(cookie?{Cookie:cookie}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})});}
const call=async(env,body,options)=>{if(body&&options?.cookie&&!Object.hasOwn(body,'account_id')){const user=await getAccount(request(null,options),env);body={...body,account_id:user?.id};}return onRequest({env,request:request(body,options)});};
const cookieOf=res=>res.headers.get('Set-Cookie')?.split(';')[0];
async function register(env,username,options={}){const res=await call(env,{action:'register',username,password,consent:true,...options});assert.equal(res.status,200,await res.clone().text());return {cookie:cookieOf(res),body:await res.json(),res};}
assert.equal((await call({},null)).status,200,'Anonymous requests need no database');
assert.equal((await getAccount(request(),{HITS:{batch(){throw Error('anonymous request must not hit DB')}}})),null);
assert.deepEqual(PASSWORD_COST,{N:32768,r:8,p:3,maxmem:64*1024*1024});
{
 const {env,sql}=setup();assert.equal((await call(env)).status,200);assert.equal((await(await call(env)).json()).user,null);
 assert.equal((await call(env,{action:'register',username:'alice',password,consent:true},{origin:'https://evil.example'})).status,403);
 assert.equal((await call(env,{action:'register',username:'alice',password,consent:true},{headers:{'Content-Type':'text/plain'}})).status,400);
 assert.equal((await call(env,{action:'login',username:'alice',password:'x'.repeat(5000)})).status,400);
 assert.equal((await call(env,{action:'register',username:'中文',password,consent:true})).status,400);
 assert.equal((await call(env,{action:'register',username:'alice',password:'short',consent:true})).status,400);
 assert.equal((await call(env,{action:'register',username:'alice',password})).status,400);
 const a=await register(env,'  Alice_One  ');assert.equal(a.body.user.username,'alice_one');assert.equal(a.body.recovery_code.length,43);
 for(const property of ['HttpOnly','Secure','SameSite=Lax','Path=/'])assert(a.res.headers.get('Set-Cookie').includes(property));assert(a.cookie.startsWith(ACCOUNT_COOKIE+'='));assert(!a.res.headers.get('Set-Cookie').includes('Domain='));
 const stored=sql.prepare('SELECT * FROM free_accounts').get();assert.equal(stored.qa,0);assert(stored.password_hash.startsWith('scrypt-v1$'));assert(!stored.password_hash.includes(password));assert.equal(stored.recovery_hash,hash(a.body.recovery_code));
 const session=sql.prepare('SELECT * FROM free_account_sessions').get();assert.equal(session.token_hash,hash(a.cookie.split('=')[1]));
 const me=await(await call(env,null,{cookie:a.cookie})).json();assert.equal(me.user.id,a.body.user.id);assert(!JSON.stringify(me).includes('hash'));assert(!JSON.stringify(me).includes(a.body.recovery_code));
 assert.equal((await call(env,{action:'login',username:'alice_one',password:'wrong password long enough'})).status,401);
 const login=await call(env,{action:'login',username:'ALICE_ONE',password});assert.equal(login.status,200);const second=cookieOf(login);assert.notEqual(second,a.cookie);
 assert.equal((await call(env,{action:'favorite_add',slug:tools[0].slug},{cookie:a.cookie})).status,200);
 assert.equal((await call(env,{action:'favorite_add',slug:'not-a-tool'},{cookie:a.cookie})).status,400);
 assert.equal((await call(env,{action:'favorite_add',slug:tools[0].slug},{cookie:a.cookie,origin:'https://evil.example'})).status,403);
 assert.equal((await call(env,{action:'favorite_add',slug:tools[0].slug})).status,401);
 const b=await register(env,'bob_two',{qa:true});assert.deepEqual((await(await call(env,null,{cookie:b.cookie})).json()).favorites,[]);assert.equal(sql.prepare('SELECT qa FROM free_accounts WHERE username=?').get('bob_two').qa,1);
 await call(env,{action:'favorite_remove',slug:tools[0].slug},{cookie:b.cookie});assert.deepEqual((await(await call(env,null,{cookie:a.cookie})).json()).favorites,[tools[0].slug]);
 await call(env,{action:'logout'},{cookie:second});assert.equal((await(await call(env,null,{cookie:second})).json()).user,null);assert((await(await call(env,null,{cookie:a.cookie})).json()).user);
 const reset=await call(env,{action:'recover',username:'alice_one',recovery_code:a.body.recovery_code,new_password:newPassword});assert.equal(reset.status,200);const recovered=await reset.json();assert.notEqual(recovered.recovery_code,a.body.recovery_code);
 assert.equal((await(await call(env,null,{cookie:a.cookie})).json()).user,null);assert.equal((await call(env,{action:'recover',username:'alice_one',recovery_code:a.body.recovery_code,new_password:password})).status,401);
 assert.equal((await call(env,{action:'login',username:'alice_one',password})).status,401);
 const renewed=await call(env,{action:'login',username:'alice_one',password:newPassword});assert.equal(renewed.status,200);const renewedCookie=cookieOf(renewed);
 assert.equal((await call(env,{action:'change_password',old_password:'incorrect password',new_password:password},{cookie:renewedCookie})).status,401);
 assert.equal((await call(env,{action:'change_password',old_password:newPassword,new_password:password},{cookie:renewedCookie})).status,200);
 assert.equal(await getAccount(request(null,{cookie:renewedCookie}),env),null);
 // Paid/subscriber ledgers are independent and must survive deleting a free account.
 sql.exec("CREATE TABLE wb_orders(id TEXT); INSERT INTO wb_orders VALUES('paid-preserve'); CREATE TABLE subs(email TEXT); INSERT INTO subs VALUES('preserve@example.test')");
 const latest=await call(env,{action:'login',username:'alice_one',password});const latestCookie=cookieOf(latest);assert.equal(latest.status,200);
 assert.equal((await call(env,{action:'delete_account',password},{cookie:latestCookie,ip:'192.0.2.44'})).status,400);
 sql.exec('CREATE TABLE wb_members(id TEXT PRIMARY KEY,token_hash TEXT); CREATE TABLE bpj_account_members(account_id TEXT PRIMARY KEY REFERENCES free_accounts(id) ON DELETE CASCADE,member_id TEXT,backup_hash TEXT)');
 sql.prepare('INSERT INTO wb_members VALUES(?,?)').run('member-preserve','current-key-hash');
 sql.prepare('INSERT INTO bpj_account_members VALUES(?,?,?)').run(a.body.user.id,'member-preserve','old-key-hash');
 assert.equal((await call(env,{action:'delete_account',password,confirm:true},{cookie:latestCookie,ip:'192.0.2.44'})).status,409,'Cannot strand a paid member without a current key backup');
 sql.prepare('UPDATE bpj_account_members SET backup_hash=?').run('current-key-hash');
 assert.equal((await call(env,{action:'delete_account',password,confirm:true},{cookie:latestCookie,ip:'192.0.2.44'})).status,200);
 assert.equal(sql.prepare('SELECT COUNT(*) n FROM free_accounts WHERE username=?').get('alice_one').n,0);assert.equal(sql.prepare('SELECT COUNT(*) n FROM free_account_favorites WHERE account_id=?').get(a.body.user.id).n,0);
 assert.equal(sql.prepare('SELECT COUNT(*) n FROM wb_members').get().n,1);assert.equal(sql.prepare('SELECT COUNT(*) n FROM bpj_account_members').get().n,0);assert.equal(sql.prepare('SELECT COUNT(*) n FROM wb_orders').get().n,1);assert.equal(sql.prepare('SELECT COUNT(*) n FROM subs').get().n,1);
 assert((await(await call(env,null,{cookie:b.cookie})).json()).user);
 console.log('PASS: registration, secure cookie, hashed credentials, CSRF, isolated users, QA, logout, single-use recovery, password rotation and deletion isolation.');
}
{
 const {env,sql}=setup();await ensureAccounts(env);
 // SQL UPSERT limit under simultaneous contenders, with different application-level awaits.
 const rates=await Promise.all(Array.from({length:25},()=>consumeRate(env,'test','same-key',5,900)));assert.equal(rates.filter(Boolean).length,5);assert.equal(sql.prepare('SELECT count FROM free_account_rates').get().count,5);
 const a=await register(env,'capacity_test');
 // D1 batches are transactions; serialize schema setup in this SQLite shim, then test the
 // actual single-statement capacity guard under concurrent endpoint calls below.
 env.HITS.batch=async qs=>{const out=[];for(const q of qs)out.push(await q.run());return out;};
 const responses=await Promise.all(tools.slice(0,45).map(t=>call(env,{action:'favorite_add',slug:t.slug},{cookie:a.cookie})));
 assert.equal(responses.filter(r=>r.status===200).length,40);assert.equal(responses.filter(r=>r.status===409).length,5);assert.equal(sql.prepare('SELECT COUNT(*) n FROM free_account_favorites').get().n,40);
 assert.equal((await call(env,{action:'favorite_add',slug:tools[0].slug},{cookie:a.cookie})).status,200);
 await call(env,{action:'favorite_remove',slug:tools[0].slug},{cookie:a.cookie});assert.equal((await call(env,{action:'favorite_add',slug:tools[44].slug},{cookie:a.cookie})).status,200);
 sql.prepare('UPDATE free_account_sessions SET expires=0').run();assert.equal((await(await call(env,null,{cookie:a.cookie})).json()).user,null);
 console.log('PASS: concurrent atomic rate limit, 40-item capacity, idempotent additions, removal/re-add and expired sessions.');
}
{
 const {env}=setup();await ensureAccounts(env);
 for(let i=0;i<20;i++)assert(await consumeRate(env,'auth-ip','192.0.2.10',20,900));
 // No KDF/account creation can begin after the IP ceiling is consumed.
 assert.equal((await call(env,{action:'register',username:'blocked_user',password,consent:true})).status,429);
 console.log('PASS: KDF admission limited before registration work.');
}
{
 const {env,sql}=setup();const a=await register(env,'race_recovery');const before=await getAccount(request(null,{cookie:a.cookie}),env);
 env.HITS.batch=async queries=>{const out=[];for(const q of queries)out.push(await q.run());return out;};
 const results=await Promise.all([1,2].map(()=>call(env,{action:'recover',username:'race_recovery',recovery_code:a.body.recovery_code,new_password:newPassword})));
 assert.deepEqual(results.map(r=>r.status).sort(),[200,401],'Single recovery code must have exactly one successful concurrent redemption');
 assert.equal(sql.prepare('SELECT session_version FROM free_accounts').get().session_version,2);
 assert.equal(await issueSession(env,before),null,'A password check that raced recovery must not mint a session at the stale version');
 console.log('PASS: concurrent recovery is single-use and stale authentication cannot create sessions.');
}
{
 const {env,sql}=setup();const a=await register(env,'tab_alice'),b=await register(env,'tab_bob');
 for(const action of ['favorite_add','favorite_remove','logout','change_password','delete_account','rotate_recovery']){
  const payload={action,account_id:a.body.user.id,slug:tools[0].slug,password,old_password:password,new_password:newPassword,confirm:true};
  const response=await call(env,payload,{cookie:b.cookie});assert.equal(response.status,409,action+' must reject another displayed identity');assert.equal((await response.json()).error,'session_changed');
  assert.equal((await call(env,{...payload,account_id:null},{cookie:b.cookie})).status,409,action+' must require identity');
 }
 assert.equal((await getAccount(request(null,{cookie:b.cookie}),env)).id,b.body.user.id,'Rejected stale logout must not revoke the current account');
 const rotated=await call(env,{action:'rotate_recovery',password},{cookie:a.cookie});assert.equal(rotated.status,200);const secret=(await rotated.json()).recovery_code;assert.equal(secret.length,43);assert.notEqual(secret,a.body.recovery_code);
 assert.equal((await call(env,{action:'recover',username:'tab_alice',recovery_code:a.body.recovery_code,new_password:newPassword})).status,401);
 assert.equal((await call(env,{action:'login',username:'tab_alice',password})).status,200,'Recovery rotation must preserve the password');
 assert.equal(sql.prepare('SELECT recovery_hash FROM free_accounts WHERE id=?').get(a.body.user.id).recovery_hash,hash(secret));
 assert(!(await(await call(env,null,{cookie:a.cookie})).text()).includes(secret),'Recovery code must not be re-exposed by profile reads');
 assert.equal((await call(env,{action:'recover',username:'tab_alice',recovery_code:secret,new_password:newPassword})).status,200);
 console.log('PASS: all authenticated writes bind account identity; stale-tab logout cannot affect another user; password-confirmed recovery-code rotation revokes the old code without changing the password.');
}
{
 const {env}=setup();const a=await register(env,'quota_logout');
 for(let i=0;i<120;i++)assert(await consumeRate(env,'write-ip','192.0.2.10',120,900));
 assert.equal((await call(env,{action:'favorite_add',slug:tools[0].slug},{cookie:a.cookie})).status,429);
 const wrong=await call(env,{action:'logout',account_id:'stale-account'},{cookie:a.cookie});assert.equal(wrong.status,409);assert.equal(wrong.headers.get('Set-Cookie'),null);assert(await getAccount(request(null,{cookie:a.cookie}),env));
 assert.equal((await call(env,{action:'logout',account_id:a.body.user.id},{cookie:a.cookie,origin:'https://evil.example'})).status,403);
 const logout=await call(env,{action:'logout',account_id:a.body.user.id},{cookie:a.cookie});assert.equal(logout.status,200);assert(logout.headers.get('Set-Cookie').includes('Max-Age=0'));assert.equal(await getAccount(request(null,{cookie:a.cookie}),env),null);
 console.log('PASS: exhausted write quota cannot block valid logout; origin and displayed-account checks still protect the session.');
}
{
 let operations=0;
 const probeRequest=()=>new Request('https://baipiaoji.com/api/account?readiness=1');
 const failureMessages=["Your account has exceeded D1's free tier daily row read limit.","Your account has exceeded D1's free tier daily row write limit.",'D1 quota exhausted','Too many requests for database secret-customer@example.test'];
 for(const message of failureMessages){
  const env={HITS:{prepare(sql){operations++;assert.equal(sql,'SELECT 1 AS ready FROM hits LIMIT 1');return {async first(){throw new Error(message)}}},batch(){throw Error('Readiness must never initialize schema')}}};
  const prior=operations;const anonymous=await call(env,null);assert.equal(anonymous.status,200);assert.equal(operations,prior,'Default anonymous request must perform zero DB operations');
  const response=await onRequest({request:probeRequest(),env});assert.equal(response.status,503);assert.deepEqual(await response.json(),{ok:false,error:'database_limit'});
 }
 for(const message of ['D1 unavailable; database-id=private-value','Some other error with customer@example.test']){
  const response=await onRequest({request:probeRequest(),env:{HITS:{prepare(){return {async first(){throw Error(message)}}}}}});assert.equal(response.status,503);assert.deepEqual(await response.json(),{ok:false,error:'unavailable'});
 }
 const absent=await onRequest({request:probeRequest(),env:{}});assert.equal(absent.status,503);assert.deepEqual(await absent.json(),{ok:false,error:'unavailable'});
 const available=setup();let readinessReads=0;const originalPrepare=available.env.HITS.prepare;available.env.HITS.prepare=query=>{assert.equal(query,'SELECT 1 AS ready FROM hits LIMIT 1');readinessReads++;return originalPrepare(query);};available.env.HITS.batch=()=>{throw Error('No schema work in readiness')};
 const ready=await onRequest({request:probeRequest(),env:available.env});assert.deepEqual(await ready.json(),{ok:true,ready:true,user:null,favorites:[]});assert.equal(readinessReads,1);
 available.sql.exec('DROP TABLE hits');const missingTable=await onRequest({request:probeRequest(),env:available.env});assert.equal(missingTable.status,503);assert.deepEqual(await missingTable.json(),{ok:false,error:'unavailable'});
 const live=setup();const registered=await register(live.env,'readiness_user');
 await call(live.env,{action:'favorite_add',slug:tools[0].slug},{cookie:registered.cookie});
 const signedIn=await onRequest({request:new Request('https://baipiaoji.com/api/account?readiness=1',{headers:{Cookie:registered.cookie}}),env:live.env});
 assert.equal(signedIn.status,200);assert.deepEqual(await signedIn.json(),{ok:true,ready:true,user:registered.body.user,favorites:[tools[0].slug]},'Readiness refresh must preserve the signed-in profile and favorites');
 live.sql.prepare('UPDATE free_account_sessions SET expires=0').run();
 const expired=await onRequest({request:new Request('https://baipiaoji.com/api/account?readiness=1',{headers:{Cookie:registered.cookie}}),env:live.env});assert.deepEqual(await expired.json(),{ok:true,ready:true,user:null,favorites:[]});
 const postFailure=await call({HITS:{prepare(){return {bind(){return this}}},async batch(){throw Error(failureMessages[0])}}},{action:'register',username:'quota_probe',password,consent:true});assert.equal(postFailure.status,503);assert.deepEqual(await postFailure.json(),{ok:false,error:'database_limit'});
 console.log('PASS: anonymous readiness reads the existing hits table once; default anonymous reads use no DB; signed-in readiness preserves profile/favorites; D1 quota errors use fixed codes without private details.');
}
if(process.argv.includes('--workerd')){
 // Optional integration gate: use pinned CI dev dependencies, never the Node KDF as a runtime substitute.
 // FREE_ACCOUNT_RUNTIME_MODULES points to a directory containing esbuild/ and miniflare/.
 const {fileURLToPath,pathToFileURL}=await import('node:url');
 const {resolve,dirname}=await import('node:path');
 const runtime=process.env.FREE_ACCOUNT_RUNTIME_MODULES;
 const esbuild=await import(runtime?pathToFileURL(resolve(runtime,'esbuild/lib/main.js')).href:'esbuild');
 const simulator=await import(runtime?pathToFileURL(resolve(runtime,'miniflare/dist/src/index.js')).href:'miniflare');
 const endpoint=fileURLToPath(new URL('../functions/api/account.js',import.meta.url));
 const bundled=await esbuild.build({stdin:{contents:`import{onRequest}from ${JSON.stringify(endpoint)};export default{fetch(request,env){return onRequest({request,env})}};`,resolveDir:dirname(endpoint)},bundle:true,write:false,format:'esm',platform:'neutral',external:['node:*']});
 const options={name:'account-test',modules:true,script:bundled.outputFiles[0].text,compatibilityDate:'2026-09-01',compatibilityFlags:['nodejs_compat'],d1Databases:['HITS']};
 const mf=new simulator.Miniflare(simulator.convertV4MiniflareOptions?simulator.convertV4MiniflareOptions(options):options);
 try{
  const post=(body,cookie='')=>mf.dispatchFetch('https://baipiaoji.com/api/account',{method:'POST',headers:{Origin:'https://baipiaoji.com','Content-Type':'application/json','CF-Connecting-IP':'192.0.2.4',...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(body)});
  const response=await post({action:'register',username:'workerd_test',password,consent:true,qa:true});assert.equal(response.status,200,await response.clone().text());
  const registered=await response.json();assert.equal(registered.recovery_code.length,43);const firstCookie=cookieOf(response);
  const login=await post({action:'login',username:'workerd_test',password});assert.equal(login.status,200,await login.clone().text());
  const favorite=await post({action:'favorite_add',slug:tools[0].slug,account_id:registered.user.id},firstCookie);assert.equal(favorite.status,200);assert.deepEqual((await favorite.json()).favorites,[tools[0].slug]);
  assert.equal((await post({action:'logout',account_id:'stale-displayed-user'},firstCookie)).status,409);
  const rotation=await post({action:'rotate_recovery',account_id:registered.user.id,password},firstCookie);assert.equal(rotation.status,200);const freshRecovery=(await rotation.json()).recovery_code;
  assert.equal((await post({action:'recover',username:'workerd_test',recovery_code:registered.recovery_code,new_password:newPassword})).status,401);
  const recovered=await post({action:'recover',username:'workerd_test',recovery_code:freshRecovery,new_password:newPassword});assert.equal(recovered.status,200);
  assert.equal((await post({action:'favorite_add',slug:tools[1].slug,account_id:registered.user.id},firstCookie)).status,401,'Recovery must invalidate old workerd sessions');
  assert.equal((await post({action:'recover',username:'workerd_test',recovery_code:registered.recovery_code,new_password:password})).status,401);
  console.log('PASS actual workerd + D1: scrypt N32768/r8/p3 register/login, favorites, identity checks, recovery-code replacement and session invalidation; no KDF strength fallback.');
 }finally{await mf.dispose();}
}
