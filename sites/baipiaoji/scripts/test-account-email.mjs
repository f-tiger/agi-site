import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {onRequest} from '../functions/api/account-email.js';
import {ensureAccountEmail,mailAvailable} from '../lib/account-email.js';
import {ACCOUNT_COOKIE,accountById,hash,now,passwordRecord,verifyPassword,issueSession,consumeRate} from '../lib/free-account.js';

// Test-only SQLite, addresses and credentials. fetch is always a mock: these
// checks neither contact a provider nor send emails or incur charges.
const ORIGIN='https://baipiaoji.com',PASSWORD='test only initial password 2026',NEW_PASSWORD='test only replacement password 2026';
const initialHash=await passwordRecord(PASSWORD),tests=[];
const test=(name,run)=>tests.push({name,run});
function deferred(){let resolve;const promise=new Promise(done=>{resolve=done;});return {promise,resolve};}
async function setup(){
 const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON');
 const pending=[],mails=[];let transport=null;
 const HITS={prepare(query){let values=[];const statement={query,bind(...args){values=args;return statement;},execute(){
  const s=sql.prepare(query),columns=s.columns().length,results=columns?s.all(...values):[];if(!columns)s.run(...values);
  return {success:true,results,meta:{changes:Number(sql.prepare('SELECT changes() AS n').get().n)}};
 },async run(){return statement.execute();},async first(){return statement.execute().results[0]||null;},async all(){return statement.execute();}};return statement;},
 async batch(queries){sql.exec('BEGIN');try{const result=queries.map(q=>q.execute());sql.exec('COMMIT');return result;}catch(error){sql.exec('ROLLBACK');throw error;}}};
 const env={HITS,RESEND_API_KEY:'re_test_only_do_not_send',ACCOUNT_MAIL_FROM:'BPJ <accounts@example.test>'};await ensureAccountEmail(env);
 globalThis.fetch=async(url,options)=>{
  assert.equal(url,'https://api.resend.com/emails');assert.equal(options.method,'POST');assert.equal(options.redirect,'error');assert.equal(options.headers.Authorization,'Bearer re_test_only_do_not_send');
  const payload=JSON.parse(options.body),match=payload.text.match(/https:\/\/baipiaoji\.com\/(?:en\/)?account#email-action=(verify|reset)&token=([A-Za-z0-9_-]{43})/);assert(match);
  assert.equal(payload.to.length,1);assert(payload.to[0].endsWith('@example.test'));assert.equal(payload.from,env.ACCOUNT_MAIL_FROM);assert.match(payload.text,/事务邮件/);assert.match(payload.text,/transactional account-security/);assert.match(payload.subject,/\//);
  const mail={...payload,action:match[1],token:match[2],url:match[0],key:options.headers['Idempotency-Key']};assert(!mail.key.includes(mail.token));mails.push(mail);
  return transport?transport(mail):Response.json({id:'mock-message-id'});
 };
 const h={sql,env,mails,setTransport(fn){transport=fn;},async drain(){while(pending.length)await pending.shift();},close(){sql.close();}};
 h.call=async(body,{cookie='',ip='192.0.2.10',origin=ORIGIN,headers={},url=ORIGIN+'/api/account-email',method=body?'POST':'GET',raw,drain=true}={})=>{
  const request=new Request(url,{method,headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':ip,...(cookie?{Cookie:cookie}:{}),...headers},...(method==='POST'?{body:raw??JSON.stringify(body)}:{})});
  const context={request,env,waitUntil(promise){assert.equal(this,context);pending.push(promise);}};
  const response=await onRequest(context);if(drain)await h.drain();const text=await response.text();return {status:response.status,body:JSON.parse(text),headers:response.headers,text};
 };
 h.account=async(id,{email=id+'@example.test',verified=false}={})=>{
  const t=now();sql.prepare('INSERT INTO free_accounts(id,username,password_hash,recovery_hash,created,updated) VALUES(?,?,?,?,?,?)').run(id,id,initialHash,hash('original-recovery-'+id),t,t);
  if(email)sql.prepare('INSERT INTO free_account_identities(account_id,email,display_name,display_key,email_verified,email_verified_at) VALUES(?,?,?,?,?,?)').run(id,email,id,id,verified?1:0,verified?t:null);
  const user=await accountById(env,id),session=await issueSession(env,user);return {...user,cookie:ACCOUNT_COOKIE+'='+session};
 };
 return h;
}
async function requested(h,user,action='verify',extra={}){
 const response=await h.call(action==='verify'?{action:'request_verify',account_id:user.id,...extra}:{action:'request_reset',email:user.email,...extra},{cookie:action==='verify'?user.cookie:''});assert.equal(response.status,202,response.text);return h.mails.at(-1);
}
const reset=(h,mail,options)=>h.call({action:'reset',token:mail.token,new_password:NEW_PASSWORD},options);
const verify=(h,user,mail,options={})=>h.call({action:'verify',account_id:user.id,token:mail.token},{cookie:user.cookie,...options});

test('configuration and GET never claim unconfigured delivery or disclose accounts',async()=>{
 const h=await setup();assert(mailAvailable(h.env));const ready=await h.call();assert.deepEqual(ready.body,{ok:true,available:true});assert.equal(ready.headers.get('Cache-Control'),'no-store');assert.equal(ready.headers.get('Referrer-Policy'),'no-referrer');
 for(const patch of [{RESEND_API_KEY:''},{ACCOUNT_MAIL_FROM:''},{ACCOUNT_MAIL_FROM:'bad\r\nfrom@example.test'},{HITS:null}])assert(!mailAvailable({...h.env,...patch}));
 const noConfig=await onRequest({request:new Request(ORIGIN+'/api/account-email'),env:{}});assert.deepEqual(await noConfig.json(),{ok:true,available:false});delete h.env.RESEND_API_KEY;assert.equal((await h.call({action:'request_reset',email:'a@example.test'})).status,503);assert.equal(h.mails.length,0);h.close();
});

test('same-origin HTTPS, JSON, streaming size, method and trusted IP guards',async()=>{
 const h=await setup(),body={action:'request_reset',email:'a@example.test'};
 for(const options of [{origin:'https://evil.example'},{url:'http://baipiaoji.com/api/account-email',origin:'http://baipiaoji.com'},{headers:{'Sec-Fetch-Site':'cross-site'}}])assert.equal((await h.call(body,options)).status,403);
 for(const options of [{headers:{'Content-Type':'text/plain'}},{raw:'[]'},{raw:'null'},{raw:'{no json'},{raw:JSON.stringify({...body,padding:'x'.repeat(5000)})},{headers:{'Content-Length':'5000'}}])assert.equal((await h.call(body,options)).status,400);
 assert.equal((await h.call(body,{ip:''})).status,503);assert.equal((await h.call(null,{method:'OPTIONS'})).status,405);const withoutBackground=await onRequest({env:h.env,request:new Request(ORIGIN+'/api/account-email',{method:'POST',headers:{Origin:ORIGIN,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.10'},body:JSON.stringify(body)})});assert.equal(withoutBackground.status,503);assert.deepEqual(await withoutBackground.json(),{ok:false,error:'unavailable'});assert.equal(h.mails.length,0);h.close();
});

test('verify request needs the signed-in account and a linked email',async()=>{
 const h=await setup(),a=await h.account('alice'),b=await h.account('bob'),legacy=await h.account('legacy',{email:null});
 assert.equal((await h.call({action:'request_verify',account_id:a.id})).status,401);assert.equal((await h.call({action:'request_verify',account_id:a.id},{cookie:b.cookie})).status,409);assert.equal((await h.call({action:'request_verify'},{cookie:a.cookie})).status,409);assert.equal((await h.call({action:'request_verify',account_id:legacy.id},{cookie:legacy.cookie})).status,409);assert.equal(h.mails.length,0);h.close();
});

test('verification is hashed, expiring, same-account, single-use and language scoped',async()=>{
 const h=await setup(),a=await h.account('alice'),b=await h.account('bob'),mail=await requested(h,a,'verify',{lang:'en',redirect:'https://evil.example/steal'});assert(mail.url.startsWith(ORIGIN+'/en/account#'));assert(!mail.text.includes('evil.example'));
 const row=h.sql.prepare('SELECT * FROM free_account_email_tokens').get();assert.equal(row.token_hash,hash(mail.token));assert.equal(row.state,'ready');assert.equal(row.expires-row.created,86400);assert(!JSON.stringify(row).includes(mail.token));
 assert.equal((await verify(h,b,mail)).status,409);assert.equal(h.sql.prepare('SELECT COUNT(*) n FROM free_account_email_tokens').get().n,1);assert.equal((await h.call({action:'verify',account_id:a.id,token:mail.token})).status,401);
 const result=await verify(h,a,mail);assert.equal(result.status,200,result.text);assert.equal(result.body.user.email_verified,true);assert.equal(result.body.user.email,a.email);assert(!result.text.includes(mail.token));assert(h.sql.prepare('SELECT email_verified_at FROM free_account_identities WHERE account_id=?').get(a.id).email_verified_at>0);
 assert.equal(h.sql.prepare('SELECT COUNT(*) n FROM free_account_email_tokens').get().n,0);assert.equal((await verify(h,a,mail)).status,400);assert.equal((await h.call({action:'request_verify',account_id:a.id},{cookie:a.cookie})).body.email_verified,true);assert.equal(h.mails.length,1);h.close();
});

test('expiry, changed email, changed version and action substitution invalidate tokens',async()=>{
 for(const mutation of ['expiry','email','version','action']){
  const h=await setup(),a=await h.account('alice'),mail=await requested(h,a);if(mutation==='expiry')h.sql.prepare('UPDATE free_account_email_tokens SET expires=0').run();if(mutation==='email')h.sql.prepare('UPDATE free_account_identities SET email=? WHERE account_id=?').run('new@example.test',a.id);if(mutation==='version')h.sql.prepare('UPDATE free_accounts SET session_version=session_version+1').run();
  const result=mutation==='action'?await reset(h,mail):await verify(h,a,mail);assert([400,401].includes(result.status),mutation+': '+result.text);assert.equal(h.sql.prepare('SELECT email_verified FROM free_account_identities').get().email_verified,0);h.close();
 }
});

test('pending provider sends cannot be redeemed before acknowledgement',async()=>{
 const h=await setup(),a=await h.account('alice');h.setTransport(async mail=>{assert.equal(h.sql.prepare('SELECT state FROM free_account_email_tokens').get().state,'pending');assert.equal((await verify(h,a,mail)).status,400);return Response.json({id:'mock-id'});});const mail=await requested(h,a);assert.equal((await verify(h,a,mail)).status,200);h.close();
});

test('failed resend invalidates old and pending tokens; retry uses a fresh token',async()=>{
 const h=await setup(),a=await h.account('alice'),old=await requested(h,a);h.setTransport(()=>Response.json({error:'private provider error'},{status:500}));
 const failure=await h.call({action:'request_verify',account_id:a.id},{cookie:a.cookie});assert.equal(failure.status,503);assert.equal(failure.body.error,'email_delivery_failed');assert(!failure.text.includes('private'));assert.equal(h.sql.prepare('SELECT COUNT(*) n FROM free_account_email_tokens').get().n,0);assert.equal((await verify(h,a,old)).status,400);
 h.setTransport(null);const fresh=await requested(h,a);assert.notEqual(old.token,fresh.token);assert.notEqual(old.key,fresh.key);assert.equal((await verify(h,a,fresh)).status,200);h.close();
});

test('network errors and malformed provider success fail closed without token leakage',async()=>{
 for(const transport of [()=>{throw Error('provider secret detail');},()=>Response.json({ok:true})]){const h=await setup(),a=await h.account('alice');h.setTransport(transport);const result=await h.call({action:'request_verify',account_id:a.id},{cookie:a.cookie});assert.equal(result.status,503);assert(!result.text.includes(h.mails[0].token));assert(!result.text.includes('secret'));assert.equal(h.sql.prepare('SELECT COUNT(*) n FROM free_account_email_tokens').get().n,0);h.close();}
});

test('overlapping sends leave only the latest token usable',async()=>{
 const h=await setup(),a=await h.account('alice'),entered=deferred(),release=deferred();let calls=0;h.setTransport(async()=>{if(++calls===1){entered.resolve();await release.promise;}return Response.json({id:'mock-id'});});
 const earlier=h.call({action:'request_verify',account_id:a.id},{cookie:a.cookie});await entered.promise;const latest=await requested(h,a);release.resolve();assert.equal((await earlier).status,503);assert.equal((await verify(h,a,h.mails[0])).status,400);assert.equal((await verify(h,a,latest)).status,200);h.close();
});

test('anonymous reset response is identical for unknown, unverified and verified email',async()=>{
 const h=await setup();await h.account('unverified');await h.account('verified',{verified:true});const replies=[];for(const email of ['missing@example.test','unverified@example.test','verified@example.test','not-an-email'])replies.push(await h.call({action:'request_reset',email,lang:'en'}));
 assert(replies.every(r=>r.status===202));assert(replies.every(r=>r.text===replies[0].text));assert.deepEqual(replies[0].body,{ok:true,accepted:true});assert.equal(h.mails.length,1);assert.equal(h.mails[0].to[0],'verified@example.test');assert(h.mails[0].url.startsWith(ORIGIN+'/en/account#'));assert.equal(h.sql.prepare('SELECT expires-created ttl FROM free_account_email_tokens').get().ttl,1800);h.close();
});

test('anonymous reset does not wait for provider or reveal delivery failure',async()=>{
 const h=await setup();await h.account('verified',{verified:true});const release=deferred(),entered=deferred();h.setTransport(async()=>{entered.resolve();await release.promise;throw Error('delivery outage');});
 const response=await h.call({action:'request_reset',email:'verified@example.test'},{drain:false});assert.equal(response.status,202);await entered.promise;release.resolve();await h.drain();assert.equal(h.sql.prepare('SELECT COUNT(*) n FROM free_account_email_tokens').get().n,0);const absent=await h.call({action:'request_reset',email:'absent@example.test'});assert.equal(absent.text,response.text);h.close();
});

test('reset rotates password and recovery, increments version, revokes sessions and preserves other data',async()=>{
 const h=await setup(),a=await h.account('alice',{verified:true}),b=await h.account('bob',{verified:true});assert(await issueSession(h.env,a));h.sql.exec("CREATE TABLE subs(email TEXT); INSERT INTO subs VALUES('keep@example.test'); CREATE TABLE wb_orders(id TEXT); INSERT INTO wb_orders VALUES('keep')");h.sql.prepare('INSERT INTO free_account_favorites(account_id,slug,created) VALUES(?,?,?)').run(a.id,'claude',now());
 const mail=await requested(h,a,'reset'),oldRecovery=h.sql.prepare('SELECT recovery_hash FROM free_accounts WHERE id=?').get(a.id).recovery_hash,result=await reset(h,mail);assert.equal(result.status,200,result.text);assert.equal(result.body.sign_in_required,true);assert.equal(result.body.email,a.email);assert.equal(result.body.recovery_code.length,43);assert(!result.text.includes(mail.token));assert(result.headers.get('Set-Cookie').includes('Max-Age=0'));
 const current=h.sql.prepare('SELECT * FROM free_accounts WHERE id=?').get(a.id);assert(await verifyPassword(NEW_PASSWORD,current.password_hash));assert(!await verifyPassword(PASSWORD,current.password_hash));assert.equal(current.session_version,2);assert.notEqual(current.recovery_hash,oldRecovery);assert.equal(current.recovery_hash,hash(result.body.recovery_code));
 assert.equal(h.sql.prepare('SELECT COUNT(*) n FROM free_account_sessions WHERE account_id=?').get(a.id).n,0);assert.equal(h.sql.prepare('SELECT COUNT(*) n FROM free_account_sessions WHERE account_id=?').get(b.id).n,1);for(const table of ['free_account_favorites','subs','wb_orders'])assert.equal(h.sql.prepare('SELECT COUNT(*) n FROM '+table).get().n,1);assert.equal((await reset(h,mail)).status,400);assert.equal(await issueSession(h.env,a),null);h.close();
});

test('concurrent reset redemptions permit exactly one successful password change',async()=>{
 const h=await setup(),a=await h.account('alice',{verified:true}),mail=await requested(h,a,'reset'),responses=await Promise.all([reset(h,mail),reset(h,mail)]);assert.deepEqual(responses.map(r=>r.status).sort(),[200,400]);assert.equal(h.sql.prepare('SELECT session_version FROM free_accounts').get().session_version,2);h.close();
});

test('transaction failure rolls password, token and sessions back for a safe retry',async()=>{
 const h=await setup(),a=await h.account('alice',{verified:true}),mail=await requested(h,a,'reset'),original=h.env.HITS.batch;
 h.env.HITS.batch=async qs=>{if(qs[0].query.startsWith('UPDATE free_accounts'))qs[1].execute=()=>{throw Error('synthetic transaction failure');};return original(qs);};
 const failed=await reset(h,mail);assert.equal(failed.status,503);assert.equal(h.sql.prepare('SELECT session_version FROM free_accounts').get().session_version,1);assert.equal(h.sql.prepare('SELECT state FROM free_account_email_tokens').get().state,'ready');assert.equal(h.sql.prepare('SELECT COUNT(*) n FROM free_account_sessions').get().n,1);h.env.HITS.batch=original;assert.equal((await reset(h,mail)).status,200);h.close();
});

test('a token read cannot defeat a concurrent email change or session revocation',async()=>{
 for(const mode of ['reset-email','verify-logout']){
  const h=await setup(),a=await h.account('alice',{verified:mode==='reset-email'}),mail=await requested(h,a,mode==='reset-email'?'reset':'verify'),original=h.env.HITS.batch;
  h.env.HITS.batch=async qs=>{if(qs[0].query.startsWith(mode==='reset-email'?'UPDATE free_accounts':'UPDATE free_account_identities')){if(mode==='reset-email')h.sql.prepare('UPDATE free_account_identities SET email=?,email_verified=0 WHERE account_id=?').run('changed@example.test',a.id);else h.sql.prepare('DELETE FROM free_account_sessions WHERE account_id=?').run(a.id);}return original(qs);};
  const response=mode==='reset-email'?await reset(h,mail):await verify(h,a,mail);assert.equal(response.status,400);assert.equal(h.sql.prepare('SELECT session_version FROM free_accounts').get().session_version,1);assert.equal(h.sql.prepare('SELECT email_verified FROM free_account_identities').get().email_verified,0);h.close();
 }
});

test('cleanup preserves a session issued at the newly reset version',async()=>{
 const h=await setup(),a=await h.account('alice',{verified:true}),mail=await requested(h,a,'reset'),original=h.env.HITS.batch;
 h.env.HITS.batch=async qs=>{if(qs[0].query.startsWith('UPDATE free_accounts')){const execute=qs[1].execute;qs[1].execute=()=>{h.sql.prepare('INSERT INTO free_account_sessions(token_hash,account_id,version,created,expires) SELECT ?,id,session_version,?,? FROM free_accounts WHERE id=?').run(hash('new-session'),now(),now()+3600,a.id);return execute();};}return original(qs);};
 assert.equal((await reset(h,mail)).status,200);const sessions=h.sql.prepare('SELECT token_hash,version FROM free_account_sessions').all();assert.equal(sessions.length,1);assert.equal(sessions[0].token_hash,hash('new-session'));assert.equal(sessions[0].version,2);h.close();
});

test('verified status must hold at redemption and invalid passwords do not burn tokens',async()=>{
 const h=await setup(),a=await h.account('alice',{verified:true}),mail=await requested(h,a,'reset');assert.equal((await h.call({action:'reset',token:mail.token,new_password:'short'})).status,400);assert.equal(h.sql.prepare('SELECT state FROM free_account_email_tokens').get().state,'ready');h.sql.prepare('UPDATE free_account_identities SET email_verified=0').run();assert.equal((await reset(h,mail)).status,400);assert(await verifyPassword(PASSWORD,h.sql.prepare('SELECT password_hash FROM free_accounts').get().password_hash));h.close();
});

test('IP and per-account send limits resist rotating IPs; anonymous limits stay generic',async()=>{
 const h=await setup(),a=await h.account('alice');for(let i=0;i<3;i++)assert.equal((await h.call({action:'request_verify',account_id:a.id},{cookie:a.cookie,ip:'192.0.2.'+(i+1)})).status,202);assert.equal((await h.call({action:'request_verify',account_id:a.id},{cookie:a.cookie,ip:'192.0.2.99'})).status,429);assert.equal(h.mails.length,3);
 const b=await h.account('bob',{verified:true});for(let i=0;i<5;i++)assert.equal((await h.call({action:'request_reset',email:b.email},{ip:'198.51.100.'+(i+1)})).status,202);assert.equal(h.mails.length,6);for(let i=0;i<20;i++)assert(await consumeRate(h.env,'mail-ip','203.0.113.9',20,900));assert.equal((await h.call({action:'request_reset',email:'absent@example.test'},{ip:'203.0.113.9'})).status,429);h.close();
});

test('account deletion cascades outstanding email tokens',async()=>{
 const h=await setup(),a=await h.account('alice');await requested(h,a);h.sql.prepare('DELETE FROM free_accounts WHERE id=?').run(a.id);assert.equal(h.sql.prepare('SELECT COUNT(*) n FROM free_account_email_tokens').get().n,0);h.close();
});

let failed=0;for(const {name,run} of tests){try{await run();console.log('PASS '+name);}catch(error){failed++;console.error('FAIL '+name+'\n'+error.stack);}}
globalThis.fetch=async()=>{throw Error('External network disabled by account-email tests');};
console.log(`${tests.length-failed}/${tests.length} local SQLite + mocked mail checks passed; no real emails sent.`);if(failed)process.exitCode=1;
