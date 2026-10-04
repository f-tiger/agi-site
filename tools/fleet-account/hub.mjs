import {getAccount,ensureAccounts,consumeRate} from '../../sites/baipiaoji/lib/free-account.js';
import {HOSTS,HUB,TOKEN,VERSION,now,random,digest,json,SESSION_SECONDS} from './config.mjs';
const fail=(code,status=400)=>{throw Object.assign(Error(code),{code,status});};
async function ensure(db){
 await db.batch([
  db.prepare(`CREATE TABLE IF NOT EXISTS fleet_account_codes(token_hash TEXT PRIMARY KEY,account_id TEXT NOT NULL,version INTEGER NOT NULL,host TEXT NOT NULL,challenge TEXT NOT NULL,expires INTEGER NOT NULL)`),
  db.prepare(`CREATE INDEX IF NOT EXISTS fleet_account_codes_expiry ON fleet_account_codes(expires)`),
  db.prepare(`CREATE TABLE IF NOT EXISTS fleet_account_sessions(token_hash TEXT PRIMARY KEY,account_id TEXT NOT NULL,version INTEGER NOT NULL,host TEXT NOT NULL,expires INTEGER NOT NULL)`),
  db.prepare(`CREATE INDEX IF NOT EXISTS fleet_account_sessions_expiry ON fleet_account_sessions(expires)`),
  db.prepare(`CREATE INDEX IF NOT EXISTS fleet_account_sessions_owner ON fleet_account_sessions(account_id)`),
  db.prepare('DELETE FROM fleet_account_codes WHERE expires<=?').bind(now()),
  db.prepare('DELETE FROM fleet_account_sessions WHERE expires<=?').bind(now())
 ]);
}
async function readBody(request){
 if(!/^application\/json(?:;|$)/i.test(request.headers.get('content-type')||''))fail('invalid_request');
 if(!request.body)fail('invalid_request');const reader=request.body.getReader();let text='',size=0;const decoder=new TextDecoder();
 for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>4096){await reader.cancel();fail('invalid_request');}text+=decoder.decode(value,{stream:true});}
 try{const b=JSON.parse(text+decoder.decode());if(!b||typeof b!=='object'||Array.isArray(b))fail('invalid_request');return b;}catch{fail('invalid_request');}
}
export async function hubRoute(request,env){
 try{
  const url=new URL(request.url);
  if(url.origin!==HUB)return json({error:'wrong_origin'},403);
  if(request.method==='GET')return json({ok:true,version:VERSION,available:!!env.HITS,site:HOSTS.get(url.searchParams.get('host'))||null});
  if(request.method!=='POST')return json({error:'method_not_allowed'},405);
  const body=await readBody(request),host=body.host;
  if(!HOSTS.has(host))fail('unknown_site');
  if(!['authorize','exchange','session','logout'].includes(body.action))fail('invalid_request');
  // Authorization is a browser action; exchange/introspection accept server-side
  // bearer proofs only, never a BPJ cookie or a browser Origin.
  if(body.action==='authorize'){
   if(request.headers.get('Origin')!==HUB||request.headers.get('Sec-Fetch-Site')==='cross-site'||request.headers.has('Authorization'))fail('origin_rejected',403);
   if(body.confirmed!==true||!TOKEN.test(body.challenge||'')||!TOKEN.test(body.state||''))fail('invalid_request');
  }else if(request.headers.has('Origin'))fail('origin_rejected',403);
  if(!env.HITS)fail('unavailable',503);
  await ensureAccounts(env);await ensure(env.HITS);const db=env.HITS;
  if(body.action==='authorize'){
   const user=await getAccount(request,env);if(!user)fail('signin_required',401);
   if(body.account_id!==user.id)fail('session_changed',409);
   if(!await consumeRate(env,'fleet-account',user.id,30,900))fail('rate_limited',429);
   const code=random();await db.prepare('INSERT INTO fleet_account_codes(token_hash,account_id,version,host,challenge,expires) VALUES(?,?,?,?,?,?)').bind(await digest(code),user.id,user.session_version,host,body.challenge,now()+90).run();
   const next=new URL('https://'+host+'/auth/callback');next.searchParams.set('code',code);next.searchParams.set('state',body.state);
   return json({ok:true,redirect:next.href});
  }
  if(body.action==='exchange'){
   if(!TOKEN.test(body.code||'')||!TOKEN.test(body.verifier||''))fail('invalid_proof',401);
   // Delete + RETURNING makes a valid code single-use, including concurrent requests.
   const code=await db.prepare(`DELETE FROM fleet_account_codes WHERE token_hash=? AND host=? AND challenge=? AND expires>? AND EXISTS(SELECT 1 FROM free_accounts a WHERE a.id=fleet_account_codes.account_id AND a.session_version=fleet_account_codes.version) RETURNING account_id,version`).bind(await digest(body.code),host,await digest(body.verifier),now()).first();
   if(!code)fail('invalid_proof',401);
   const token=random(),expires=now()+SESSION_SECONDS;
   await db.prepare('INSERT INTO fleet_account_sessions(token_hash,account_id,version,host,expires) VALUES(?,?,?,?,?)').bind(await digest(token),code.account_id,code.version,host,expires).run();
   return json({ok:true,token,expires});
  }
  const token=request.headers.get('Authorization')?.replace(/^Bearer /,'');if(!TOKEN.test(token||''))fail('signin_required',401);
  const tokenHash=await digest(token);
  const row=await db.prepare(`SELECT a.id,COALESCE(i.display_name,a.username) AS username,i.email FROM fleet_account_sessions s JOIN free_accounts a ON a.id=s.account_id AND a.session_version=s.version LEFT JOIN free_account_identities i ON i.account_id=a.id WHERE s.token_hash=? AND s.host=? AND s.expires>?`).bind(tokenHash,host,now()).first();
  if(!row)fail('signin_required',401);
  if(body.action==='logout'){await db.prepare('DELETE FROM fleet_account_sessions WHERE token_hash=? AND host=?').bind(tokenHash,host).run();return json({ok:true});}
  return json({ok:true,user:row});
 }catch(e){return json({ok:false,error:e.code||'unavailable'},e.status||503);}
}
