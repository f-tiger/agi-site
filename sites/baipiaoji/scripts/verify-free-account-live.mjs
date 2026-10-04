// Production QA: only a unique synthetic account; no payment, email or real-user data.
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {random,digest} from '../../../tools/fleet-account/config.mjs';
const base='https://baipiaoji.com',username='qa_'+randomBytes(10).toString('hex');
const email=username+'@example.invalid';
let password=randomBytes(24).toString('base64url'),cookie='',owner='',created=false,removed=false;
async function request(body,session=cookie){const r=await fetch(base+'/api/account',{method:body?'POST':'GET',headers:{'User-Agent':'bpj-ci-selftest','Origin':base,...(body?{'Content-Type':'application/json'}:{}),...(session?{Cookie:session}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(25000)});const j=await r.json();return {r,j};}
const takeCookie=r=>(r.headers.get('set-cookie')||'').split(';')[0];
try{
 for(const provider of ['account-google','account-email']){
  const r=await fetch(base+'/api/'+provider,{headers:{'User-Agent':'bpj-ci-selftest'},signal:AbortSignal.timeout(25000)}),j=await r.json();
  const expectedGoogleClient=(process.env.GOOGLE_CLIENT_ID||'').trim();
  if(provider==='account-google'&&expectedGoogleClient){
   assert.equal(r.status,200,'Google configuration endpoint must be available');
   assert.equal(j.available,true,'Google sign-in must be configured after deployment');
   assert.equal(j.client_id,expectedGoogleClient,'Production must use the configured Google client');
  }
  console.log(JSON.stringify({provider,status:r.status,available:j.available===true,...(provider==='account-google'&&expectedGoogleClient?{configuredClientMatches:true}:{})}));
 }
 for(const route of ['/account','/en/account']){const r=await fetch(base+route+'?__ci=1',{headers:{'User-Agent':'bpj-ci-selftest'},signal:AbortSignal.timeout(25000)});assert.equal(r.status,200);const h=await r.text();assert(h.includes('account-register')&&h.includes('account-login')&&h.includes('account-recover'));}
 const readiness=await fetch(base+'/api/account?readiness=1',{headers:{'User-Agent':'bpj-ci-selftest'},signal:AbortSignal.timeout(25000)});const ready=await readiness.json();assert.equal(readiness.status,200,'Account readiness: '+(['database_limit','unavailable'].includes(ready.error)?ready.error:'not_ready'));
 const anon=await request(null,'');assert.equal(anon.j.user,null);
 const signup=await request({action:'register',username,email,password,consent:true,qa:true},'');assert.equal(signup.r.status,200,'Live signup: '+(['database_limit','unavailable','rate_limited'].includes(signup.j.error)?signup.j.error:'unexpected_response'));assert(signup.j.user?.id&&signup.j.recovery_code?.length===43);created=true;owner=signup.j.user.id;cookie=takeCookie(signup.r);assert(/HttpOnly/i.test(signup.r.headers.get('set-cookie'))&&/Secure/i.test(signup.r.headers.get('set-cookie')));
 // Exercise real D1 code exchange with the existing disposable QA account.
 const verifier=random(),state=random(),host='agiscorecard.com';
 async function fleet(action,values={},sessionToken){const r=await fetch(base+'/api/account-fleet',{method:'POST',headers:{'User-Agent':'bpj-ci-selftest','Content-Type':'application/json',...(action==='authorize'?{Origin:base,Cookie:cookie}:{}),...(sessionToken?{Authorization:'Bearer '+sessionToken}:{})},body:JSON.stringify({action,host,...values}),signal:AbortSignal.timeout(25000)});return {r,j:await r.json()};}
 const grant=await fleet('authorize',{challenge:await digest(verifier),state,confirmed:true,account_id:owner});assert.equal(grant.r.status,200);
 const code=new URL(grant.j.redirect).searchParams.get('code');
 const exchanged=await fleet('exchange',{code,verifier});assert.equal(exchanged.r.status,200);
 assert.equal((await fleet('exchange',{code,verifier})).r.status,401);
 assert.equal((await fleet('session',{},exchanged.j.token)).j.user.id,owner);
 assert.equal((await fleet('session',{host:'getecoback.com'},exchanged.j.token)).r.status,401);
 assert.equal((await fleet('logout',{},exchanged.j.token)).r.status,200);
 assert.equal((await fleet('session',{},exchanged.j.token)).r.status,401);
 console.log('PASS live fleet hub: synthetic account, single-use PKCE exchange, host isolation and session revocation.');
 const saved=await request({action:'favorite_add',account_id:owner,slug:'claude'});assert.equal(saved.r.status,200);assert(saved.j.favorites.includes('claude'));
 const login=await request({action:'login',email,password},'');assert.equal(login.r.status,200);const otherCookie=takeCookie(login.r);assert((await request(null,otherCookie)).j.favorites.includes('claude'));
 const wrong=await request({action:'favorite_remove',account_id:'stale-account',slug:'claude'});assert.equal(wrong.r.status,409);
 const pack=await fetch(base+'/api/earn',{method:'POST',headers:{'User-Agent':'bpj-ci-selftest','Origin':base,'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify({slug:'ai-design-service',lang:'en'}),signal:AbortSignal.timeout(25000)});assert.equal(pack.status,200);assert((await pack.json()).pack);
 const rotation=await request({action:'rotate_recovery',account_id:owner,password});assert.equal(rotation.r.status,200);const newPassword=randomBytes(24).toString('base64url');const recovered=await request({action:'recover',email,recovery_code:rotation.j.recovery_code,new_password:newPassword},'');assert.equal(recovered.r.status,200);password=newPassword;assert.equal((await request(null,otherCookie)).j.user,null);
 const relogin=await request({action:'login',email,password},'');assert.equal(relogin.r.status,200);cookie=takeCookie(relogin.r);assert.equal(relogin.j.user.id,owner);
 const deleted=await request({action:'delete_account',account_id:owner,password,confirm:true});assert.equal(deleted.r.status,200);removed=true;assert.equal((await request(null)).j.user,null);
 console.log('PASS live free membership: EN/ZH pages, signup, secure session, cross-device list, stale-account refusal, pack access, recovery rotation/revocation and synthetic-account deletion. No payments or messages.');
}finally{
 if(created&&!removed){try{const auth=await request({action:'login',email,password},'');if(auth.r.status===200){cookie=takeCookie(auth.r);const cleanup=await request({action:'delete_account',account_id:owner,password,confirm:true});if(cleanup.r.status!==200)throw Error('cleanup failed');console.log('QA synthetic account cleaned up.');}else throw Error('cleanup login failed');}catch{console.error('QA cleanup could not be confirmed; inspect synthetic qa accounts privately.');process.exitCode=1;}}
}
