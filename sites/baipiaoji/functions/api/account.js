import {ACCOUNT_COOKIE,ensureAccounts,getAccount,accountView,normalizeUsername,validUsername,validPassword,validFavorite,passwordRecord,verifyPassword,randomToken,hash,now,cookie,clearCookie,tokenFrom,consumeRate,issueSession} from '../../lib/free-account.js';
const ACTIONS=new Set(['register','login','recover','logout','change_password','delete_account','favorite_add','favorite_remove','rotate_recovery']);
const json=(body,status=200,sessionCookie)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(sessionCookie?{'Set-Cookie':sessionCookie}:{})}});
const error=(code,status)=>json({ok:false,error:code},status);
async function bodyOf(request){
 if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('Content-Type')||''))return null;
 if(Number(request.headers.get('Content-Length'))>4096)return null;
 if(!request.body)return null;
 const reader=request.body.getReader();let size=0;const chunks=[];
 for(;;){const{done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>4096){await reader.cancel();return null;}chunks.push(value);}
 const bytes=new Uint8Array(size);let n=0;for(const chunk of chunks){bytes.set(chunk,n);n+=chunk.length;}
 try{const result=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));return result&&typeof result==='object'&&!Array.isArray(result)?result:null;}catch{return null;}
}
async function route(request,env){
 if(request.method==='GET'&&new URL(request.url).searchParams.get('readiness')==='1'){
  if(!env.HITS)return error('unavailable',503);
  if(tokenFrom(request)){const user=await getAccount(request,env);return json({...await accountView(env,user),ready:true});}
  // Read one row from the existing analytics table: constant SELECT 1 bypasses
  // D1 row-read accounting and can falsely report ready during a daily quota outage.
  // No row contents are exposed; no schema creation or cleanup occurs here.
  await env.HITS.prepare('SELECT 1 AS ready FROM hits LIMIT 1').first();
  return json({ok:true,ready:true,user:null,favorites:[]});
 }
 if(request.method==='GET'&&!tokenFrom(request))return json({ok:true,user:null,favorites:[]});
 if(!env.HITS)return error('unavailable',503);
 if(request.method==='GET'){const user=await getAccount(request,env);return json(await accountView(env,user));}
 if(request.method!=='POST')return error('method_not_allowed',405);
 const url=new URL(request.url);
 if(url.protocol!=='https:'||request.headers.get('Origin')!==url.origin||request.headers.get('Sec-Fetch-Site')==='cross-site')return error('origin_rejected',403);
 const body=await bodyOf(request);if(!body||!ACTIONS.has(body.action))return error('invalid_request',400);
 const ip=request.headers.get('CF-Connecting-IP');if(!ip||ip.length>64)return error('unavailable',503);
 await ensureAccounts(env);
 const action=body.action,username=normalizeUsername(body.username);
 // Shared IP ceiling protects the expensive KDF; account bucket prevents rotating-IP guesses.
 const auth=['register','login','recover','change_password','delete_account','rotate_recovery'].includes(action);
 // Signing out must remain available after writes exhaust their quota. Origin and
 // displayed-account checks still run before revoking the exact session below.
 if(action!=='logout'&&!await consumeRate(env,auth?'auth-ip':'write-ip',ip,auth?20:120,900))return error('rate_limited',429);
 if(['register','login','recover'].includes(action)){
  if(!validUsername(username))return error('invalid_username',400);
  if(!await consumeRate(env,action==='register'?'registration-name':'credentials-name',username,action==='register'?3:8,900))return error('rate_limited',429);
 }
 if(action==='register'){
  if(!validPassword(body.password))return error('password_length',400);
  if(body.consent!==true)return error('consent_required',400);
  // Don't replace an authenticated account accidentally during a repeated registration click.
  if(tokenFrom(request)&&await getAccount(request,env))return error('already_signed_in',409);
  if(await env.HITS.prepare('SELECT id FROM free_accounts WHERE username=?').bind(username).first())return error('username_unavailable',409);
  const password=await passwordRecord(body.password),recovery=randomToken(),id=crypto.randomUUID(),t=now();
  const qa=body.qa===true||/bpj-ci-selftest|playwright/i.test(request.headers.get('User-Agent')||'')?1:0;
  const row=await env.HITS.prepare(`INSERT INTO free_accounts(id,username,password_hash,recovery_hash,created,updated,qa) VALUES(?,?,?,?,?,?,?) ON CONFLICT(username) DO NOTHING RETURNING id,username,created,session_version`).bind(id,username,password,hash(recovery),t,t,qa).first();
  if(!row)return error('username_unavailable',409);
  const token=await issueSession(env,row);if(!token)return error('session_changed',409);
  return json({...await accountView(env,row),recovery_code:recovery},200,cookie(token));
 }
 if(action==='login'){
  if(!validPassword(body.password))return error('invalid_credentials',401);
  const row=await env.HITS.prepare('SELECT id,username,created,password_hash,session_version FROM free_accounts WHERE username=?').bind(username).first();
  if(!await verifyPassword(body.password,row?.password_hash))return error('invalid_credentials',401);
  const token=await issueSession(env,row);if(!token)return error('invalid_credentials',401);
  return json(await accountView(env,row),200,cookie(token));
 }
 if(action==='recover'){
  if(typeof body.recovery_code!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(body.recovery_code)||!validPassword(body.new_password))return error('invalid_recovery',400);
  const row=await env.HITS.prepare('SELECT id,recovery_hash FROM free_accounts WHERE username=? AND recovery_hash=?').bind(username,hash(body.recovery_code)).first();
  if(!row)return error('invalid_recovery',401);
  const replacement=await passwordRecord(body.new_password),recovery=randomToken();
  const changed=await env.HITS.prepare(`UPDATE free_accounts SET password_hash=?,recovery_hash=?,session_version=session_version+1,updated=? WHERE id=? AND recovery_hash=? RETURNING id`).bind(replacement,hash(recovery),now(),row.id,row.recovery_hash).first();
  if(!changed)return error('invalid_recovery',401);
  await env.HITS.prepare('DELETE FROM free_account_sessions WHERE account_id=?').bind(row.id).run();
  return json({ok:true,user:null,favorites:[],recovery_code:recovery,sign_in_required:true},200,clearCookie());
 }
 const user=await getAccount(request,env);
 if(!user)return error('authentication_required',401);
 // Bind a displayed identity to its write: another tab may have changed the shared cookie.
 if(typeof body.account_id!=='string'||body.account_id!==user.id)return error('session_changed',409);
 if(action==='logout'){
  const token=tokenFrom(request);if(token)await env.HITS.prepare('DELETE FROM free_account_sessions WHERE token_hash=?').bind(hash(token)).run();
  return json({ok:true,user:null,favorites:[]},200,clearCookie());
 }
 if(!await consumeRate(env,'account-write',user.id,120,900))return error('rate_limited',429);
 if(action==='favorite_add'||action==='favorite_remove'){
  if(!validFavorite(body.slug))return error('invalid_tool',400);
  if(action==='favorite_add'){
   // Membership check and limit share the insertion statement, preventing 40-item races.
   await env.HITS.prepare(`INSERT INTO free_account_favorites(account_id,slug,created) SELECT id,?,? FROM free_accounts WHERE id=? AND session_version=? AND (SELECT COUNT(*) FROM free_account_favorites WHERE account_id=?)<40 ON CONFLICT(account_id,slug) DO NOTHING`).bind(body.slug,now(),user.id,user.session_version,user.id).run();
   if(!await env.HITS.prepare('SELECT slug FROM free_account_favorites WHERE account_id=? AND slug=?').bind(user.id,body.slug).first())return error('favorite_limit_or_session_changed',409);
  }else await env.HITS.prepare(`DELETE FROM free_account_favorites WHERE account_id=? AND slug=? AND EXISTS(SELECT 1 FROM free_accounts WHERE id=? AND session_version=?)`).bind(user.id,body.slug,user.id,user.session_version).run();
  return json(await accountView(env,user));
 }
 const sensitivePassword=action==='change_password'?body.old_password:body.password;
 if(action==='delete_account'&&body.confirm!==true)return error('confirmation_required',400);
 if(!validPassword(sensitivePassword))return error('invalid_credentials',401);
 if(!await consumeRate(env,'sensitive-account',user.id,5,900))return error('rate_limited',429);
 const record=await env.HITS.prepare('SELECT password_hash,recovery_hash FROM free_accounts WHERE id=? AND session_version=?').bind(user.id,user.session_version).first();
 if(!record||!await verifyPassword(sensitivePassword,record.password_hash))return error('invalid_credentials',401);
 if(action==='rotate_recovery'){
  const recovery=randomToken();
  const changed=await env.HITS.prepare('UPDATE free_accounts SET recovery_hash=?,updated=? WHERE id=? AND password_hash=? AND session_version=? AND recovery_hash=? RETURNING id').bind(hash(recovery),now(),user.id,record.password_hash,user.session_version,record.recovery_hash).first();
  if(!changed)return error('session_changed',409);
  return json({...await accountView(env,user),recovery_code:recovery});
 }
 if(action==='change_password'){
  if(!validPassword(body.new_password))return error('password_length',400);
  const replacement=await passwordRecord(body.new_password);
  const changed=await env.HITS.prepare(`UPDATE free_accounts SET password_hash=?,session_version=session_version+1,updated=? WHERE id=? AND password_hash=? AND session_version=? RETURNING id`).bind(replacement,now(),user.id,record.password_hash,user.session_version).first();
  if(!changed)return error('session_changed',409);
  await env.HITS.prepare('DELETE FROM free_account_sessions WHERE account_id=?').bind(user.id).run();
  return json({ok:true,user:null,favorites:[],sign_in_required:true},200,clearCookie());
 }
 if(action==='delete_account'){
  // No paid membership, subscriber, purchase or advertising tables are touched.
  const hasBridge=await env.HITS.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='bpj_account_members'").first();
  const backupGuard=hasBridge?" AND NOT EXISTS(SELECT 1 FROM bpj_account_members b JOIN wb_members m ON m.id=b.member_id WHERE b.account_id=free_accounts.id AND (b.backup_hash IS NULL OR b.backup_hash<>m.token_hash))":'';
  if(hasBridge&&await env.HITS.prepare('SELECT b.account_id FROM bpj_account_members b JOIN wb_members m ON m.id=b.member_id WHERE b.account_id=? AND (b.backup_hash IS NULL OR b.backup_hash<>m.token_hash)').bind(user.id).first())return error('member_key_backup_required',409);
  const deleted=await env.HITS.prepare('DELETE FROM free_accounts WHERE id=? AND password_hash=? AND session_version=?'+backupGuard+' RETURNING id').bind(user.id,record.password_hash,user.session_version).first();
  if(!deleted)return error('session_changed',409);
  await env.HITS.batch([env.HITS.prepare('DELETE FROM free_account_sessions WHERE account_id=?').bind(user.id),env.HITS.prepare('DELETE FROM free_account_favorites WHERE account_id=?').bind(user.id),...(hasBridge?[env.HITS.prepare('DELETE FROM bpj_account_members WHERE account_id=?').bind(user.id)]:[])]);
  return json({ok:true,user:null,favorites:[]},200,clearCookie());
 }
 return error('invalid_request',400);
}
function unavailableCode(cause){
 const message=typeof cause?.message==='string'?cause.message:typeof cause==='string'?cause:'';
 return /quota|limit exceeded|exceeded.*limit|too many.*(requests|rows)|daily(?:[^\n]{0,120})row(?:[^\n]{0,120})(read|write)(?:[^\n]{0,40})limit/i.test(message)?'database_limit':'unavailable';
}
export async function onRequest({request,env}){try{return await route(request,env);}catch(cause){return error(unavailableCode(cause),503);}}
