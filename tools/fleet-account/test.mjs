import assert from 'node:assert/strict';
import {test} from 'node:test';
import {DatabaseSync} from 'node:sqlite';
import {hubRoute} from './hub.mjs';
import {accountRoute,withFleetAccount} from './edge.mjs';
import {HOSTS,HUB,TOKEN,SESSION_COOKIE,FLOW_COOKIE,random,digest,now} from './config.mjs';
import {ensureAccounts,issueSession} from '../../sites/baipiaoji/lib/free-account.js';
function database(){const sql=new DatabaseSync(':memory:');let queue=Promise.resolve();const HITS={prepare(query){let args=[];const q={bind(...values){args=values;return q},run(){return sql.prepare(query).run(...args)},async first(){return sql.prepare(query).get(...args)||null},async all(){return {results:sql.prepare(query).all(...args)}}};return q},batch(qs){const task=queue.then(()=>{sql.exec('BEGIN');try{const out=qs.map(q=>q.run());sql.exec('COMMIT');return out;}catch(e){sql.exec('ROLLBACK');throw e;}});queue=task.catch(()=>{});return task}};return {env:{HITS},sql};}
const host='agiscorecard.com';
const req=(action,body={},headers={})=>new Request(HUB+'/api/account-fleet',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify({action,host,...body})});
async function setup(){const {env,sql}=database();await ensureAccounts(env);sql.prepare('INSERT INTO free_accounts VALUES(?,?,?,?,?,?,?,?)').run('fixture','FixtureUser','invalid-fixture-password','invalid-recovery',1,now(),now(),1);sql.prepare('INSERT INTO free_account_identities VALUES(?,?,?,?,?,?)').run('fixture','fixture@example.test','FixtureUser','fixtureuser',0,null);const token=await issueSession(env,{id:'fixture',session_version:1});return {env,sql,headers:{Origin:HUB,Cookie:'__Host-bpj_account='+token}};}
async function grant(ctx,override={}){const verifier=random(),state=random();const r=await hubRoute(req('authorize',{challenge:await digest(verifier),state,confirmed:true,account_id:'fixture',...override},ctx.headers),ctx.env);return {r,verifier,state};}
test('explicit consent, known host and authenticated same-origin session are required',async()=>{
 const c=await setup();for(const [headers,status]of [[{},403],[{Origin:'https://evil.example'},403],[{Origin:HUB},401],[{...c.headers,'Sec-Fetch-Site':'cross-site'},403]])assert.equal((await hubRoute(req('authorize',{challenge:random(),state:random(),confirmed:true},headers),c.env)).status,status);
 for(const override of [{host:'evil.example'},{host:'agiscorecard.com.evil.example'},{host:'agiscorecard.com:444'},{confirmed:false},{challenge:'plain'},{state:'invalid'}])assert.equal((await grant(c,override)).r.status,400);
 assert.equal((await grant(c,{account_id:'wrong'})).r.status,409);
 assert.equal((await hubRoute(req('exchange',{code:random(),verifier:random()},{Origin:HUB}),c.env)).status,403);
 assert.equal((await hubRoute(new Request(HUB+'/api/account-fleet',{method:'POST',headers:{'Content-Type':'application/json'},body:'x'.repeat(5000)}),c.env)).status,400);
});
test('PKCE, site binding, single use, hashed storage, logout and account revocation',async()=>{
 const c=await setup(),g=await grant(c);assert.equal(g.r.status,200);const link=new URL((await g.r.json()).redirect),code=link.searchParams.get('code');assert.equal(link.origin,'https://'+host);assert.equal(link.searchParams.get('state'),g.state);
 const exchange=(body={})=>hubRoute(req('exchange',{code,verifier:g.verifier,...body}),c.env);
 assert.equal((await exchange({verifier:random()})).status,401);assert.equal((await exchange({host:'getecoback.com'})).status,401);
 const both=await Promise.all([exchange(),exchange()]);assert.deepEqual(both.map(r=>r.status).sort(),[200,401]);const token=(await both.find(r=>r.status===200).json()).token;assert(TOKEN.test(token));
 assert.notEqual(c.sql.prepare('SELECT token_hash FROM fleet_account_sessions').get().token_hash,token);
 const signed=(action='session',otherHost=host)=>hubRoute(req(action,{host:otherHost},{Authorization:'Bearer '+token}),c.env);
 assert.equal((await signed('session','getecoback.com')).status,401);assert.equal((await signed()).status,200);
 const user=(await(await signed()).json()).user;assert.equal(user.username,'FixtureUser');assert.deepEqual(Object.keys(user).sort(),['email','id','username']);
 c.sql.prepare('UPDATE free_accounts SET session_version=2').run();assert.equal((await signed()).status,401);
 c.sql.prepare('UPDATE free_accounts SET session_version=1').run();assert.equal((await signed('logout')).status,200);assert.equal((await signed()).status,401);
 const g2=await grant(c);const code2=new URL((await g2.r.json()).redirect).searchParams.get('code');c.sql.prepare('UPDATE fleet_account_codes SET expires=?').run(now()-1);assert.equal((await hubRoute(req('exchange',{code:code2,verifier:g2.verifier}),c.env)).status,401);
 const g3=await grant(c);const code3=new URL((await g3.r.json()).redirect).searchParams.get('code');c.sql.prepare('DELETE FROM free_accounts').run();assert.equal((await hubRoute(req('exchange',{code:code3,verifier:g3.verifier}),c.env)).status,401);
});
test('every registered site starts a host-only flow without tokens in the redirect',async()=>{
 for(const h of HOSTS.keys()){
  const r=await accountRoute(new Request('https://'+h+'/auth/google'));assert.equal(r.status,303);const target=new URL(r.headers.get('Location'));assert.equal(target.origin,HUB);assert.equal(target.searchParams.get('fleet'),h);assert(TOKEN.test(target.searchParams.get('challenge')));const c=r.headers.get('set-cookie');assert.match(c,/^__Host-fleet_flow=/);for(const flag of ['HttpOnly','Secure','SameSite=Lax','Path=/'])assert(c.includes(flag));assert(!c.includes('Domain='));assert(!target.href.includes(c.split('.')[1]?.split(';')[0]));
 }
});
test('edge callback has browser state binding, real hub exchange, clean redirect and private page',async()=>{
 const c=await setup();const service=async(url,init)=>hubRoute(new Request(url,init),c.env);
 const start=await accountRoute(new Request('https://'+host+'/auth/google')),target=new URL(start.headers.get('location')),flow=start.headers.get('set-cookie').split(';')[0];
 const ar=await hubRoute(req('authorize',{challenge:target.searchParams.get('challenge'),state:target.searchParams.get('state'),confirmed:true,account_id:'fixture'},c.headers),c.env);const callback=(await ar.json()).redirect;
 assert.equal((await accountRoute(new Request(callback),{},service)).status,400);
 assert.equal((await accountRoute(new Request(callback.replace('state=','state=wrong'),{headers:{Cookie:flow}}),{},service)).status,400);
 const response=await accountRoute(new Request(callback,{headers:{Cookie:flow}}),{},service);assert.equal(response.status,303);assert.equal(response.headers.get('Location'),'/auth/account');const session=response.headers.getSetCookie().find(s=>s.startsWith(SESSION_COOKIE+'=')).split(';')[0];
 const page=await accountRoute(new Request('https://'+host+'/auth/account',{headers:{Cookie:session}}),{},service);assert.equal(page.status,200);const html=await page.text();assert(html.includes('FixtureUser'));assert(!html.includes('googletagmanager'));assert.match(page.headers.get('Cache-Control'),/no-store/);assert.match(page.headers.get('X-Robots-Tag'),/noindex/);
 const status=await accountRoute(new Request('https://'+host+'/auth/status',{headers:{Cookie:session}}),{},service);
 assert.deepEqual(await status.json(),{ok:true,user:{username:'FixtureUser'}});assert.match(status.headers.get('Cache-Control'),/no-store/);
 assert.equal((await accountRoute(new Request('https://'+host+'/auth/logout',{method:'POST',headers:{Cookie:session,Origin:'https://evil.example'}}),{},service)).status,403);
 assert.equal((await accountRoute(new Request('https://'+host+'/auth/logout',{method:'POST',headers:{Cookie:session,Origin:'https://'+host}}),{},service)).status,200);
 const anonymous=await accountRoute(new Request('https://'+host+'/auth/account',{headers:{Cookie:session}}),{},service);assert((await anonymous.text()).includes('Continue with Google'));
 assert.deepEqual(await(await accountRoute(new Request('https://'+host+'/auth/status',{headers:{Cookie:session}}),{},service)).json(),{ok:true,user:null});
 const unavailable=await accountRoute(new Request('https://'+host+'/auth/account',{headers:{Cookie:SESSION_COOKIE+'='+random()}}),{},async()=>{throw Error('offline')});assert.equal(unavailable.status,503);
});
test('anonymous header status needs no database; redirects and outages never imply sign-in',async()=>{
 const url='https://'+host+'/auth/status';let calls=0;
 const service=async()=>{calls++;throw Error('must not call');};
 assert.deepEqual(await(await accountRoute(new Request(url),{},service)).json(),{ok:true,user:null});assert.equal(calls,0);
 const request=new Request(url,{headers:{Cookie:SESSION_COOKIE+'='+random()}});
 assert.equal((await accountRoute(request,{},service)).status,503);
 const redirected=await accountRoute(request,{},async(url,options)=>{assert.equal(new Request(url,options).redirect,'manual');return new Response(null,{status:302,headers:{Location:'https://other.example'}});});assert.equal(redirected.status,503);
});
test('wrapper preserves other handlers and ordinary responses',async()=>{
 const scheduled=()=>42;const wrapped=withFleetAccount({scheduled,fetch:async()=>new Response('original')});assert.equal(wrapped.scheduled(),42);assert.equal(await(await wrapped.fetch(new Request('https://'+host+'/api/original'),{},{})).text(),'original');assert.equal(await accountRoute(new Request('https://unknown.example/auth/account')),null);
});

test('AGI native bridge requires real session and preserves free ownership and suspension',async()=>{
 const {agiMemberRequest}=await import('./agi-bridge.mjs');const {memberByToken}=await import('../../sites/baipiaoji/lib/membership.js');
 const c=database(),env={EVENTS:c.env.HITS,MEMBER_WATCH_SECRET:'synthetic-server-secret'};let user='fixture-one',active=true;
 const service=async()=>active?Response.json({ok:true,user:{id:user}}):Response.json({ok:false},{status:401});
 const original=new Request('https://agiscorecard.com/api/jarvis/tasks',{headers:{Authorization:'Fleet',Cookie:SESSION_COOKIE+'='+random()}});
 const first=await agiMemberRequest(original,env,service);assert(first instanceof Request);const capability=first.headers.get('Authorization').slice(7);assert.match(capability,/^[a-f0-9]{64}$/);const m=await memberByToken(env.EVENTS,capability);assert.equal(m.ends_at,0);
 const again=await agiMemberRequest(original,env,service);assert.equal(again.headers.get('Authorization'),first.headers.get('Authorization'));assert.equal(c.sql.prepare('SELECT COUNT(*) n FROM wb_members').get().n,1);
 c.sql.prepare('UPDATE wb_members SET suspended=1').run();await agiMemberRequest(original,env,service);assert.equal((await memberByToken(env.EVENTS,capability)).suspended,1);
 user='fixture-two';const other=await agiMemberRequest(original,env,service);assert.notEqual(other.headers.get('Authorization'),first.headers.get('Authorization'));
 active=false;assert.equal((await agiMemberRequest(original,env,service)).status,401);
 assert.equal((await agiMemberRequest(new Request('https://agiscorecard.com/api/jarvis/tasks',{headers:{Authorization:'Fleet'}}),env,service)).status,401);
 assert.equal((await agiMemberRequest(new Request('https://agiscorecard.com/api/discuss/admin',{method:'POST',headers:{Origin:'https://agiscorecard.com',Authorization:'Fleet'}}),env,service)).status,401);
 assert.equal((await agiMemberRequest(new Request('https://agiscorecard.com/api/discuss',{method:'POST',headers:{Origin:'https://evil.example',Authorization:'Fleet'}}),env,service)).status,403);
});

test('Google-linked identity reaches real Jarvis and community handlers without buying access',async()=>{
 const {agiMemberRequest}=await import('./agi-bridge.mjs'),{jarvisRoute}=await import('../../sites/agiscorecard/tools/jarvis/server.mjs'),{communityRoute}=await import('../../sites/agiscorecard/tools/community/server.mjs');
 const c=database(),env={EVENTS:c.env.HITS,MEMBER_WATCH_SECRET:'fixture-server-secret'};
 const service=async()=>Response.json({ok:true,user:{id:'signed-google-account'}});
 async function call(path,body){const r=new Request('https://agiscorecard.com'+path,{method:body?'POST':'GET',headers:{Origin:'https://agiscorecard.com','CF-Connecting-IP':'192.0.2.44','Content-Type':'application/json',Authorization:'Fleet',Cookie:SESSION_COOKIE+'='+random()},...(body?{body:JSON.stringify(body)}:{})});const adapted=await agiMemberRequest(r,env,service);assert(adapted instanceof Request);return path.startsWith('/api/jarvis')?jarvisRoute(adapted,env):communityRoute(adapted,env);}
 const status=await call('/api/jarvis/tasks');assert.equal(status.status,200);assert.equal((await status.json()).membership.member,true);
 const task=await call('/api/jarvis',{action:'create',goal:'Check one synthetic research source for this offline test.',lang:'en',cadence:'daily',web:false,publicQuery:'',consent:true,memory:[],nonce:'a'.repeat(32)});assert.equal(task.status,202,await task.clone().text());
 const registered=await call('/api/discuss',{action:'register',handle:'GoogleFixtureReader',agree:true,key_saved:true});assert.equal(registered.status,200,await registered.clone().text());
 const profile=await call('/api/discuss',{action:'status'});assert.equal((await profile.json()).profile.handle,'GoogleFixtureReader');
 assert.equal(c.sql.prepare('SELECT COUNT(*) n FROM wb_members').get().n,1);assert.equal(c.sql.prepare('SELECT ends_at FROM wb_members').get().ends_at,0);
});
