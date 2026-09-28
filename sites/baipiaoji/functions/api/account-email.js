import {getAccount,accountById,accountView,hash,now,normalizeEmail,validEmail,validPassword,passwordRecord,randomToken,consumeRate,tokenFrom,clearCookie} from '../../lib/free-account.js';
import {mailAvailable,ensureAccountEmail,sendAccountEmail,emailToken} from '../../lib/account-email.js';

const ACTIONS=new Set(['request_verify','verify','request_reset','reset']);
const TOKEN=/^[A-Za-z0-9_-]{43}$/;
const json=(body,status=200,sessionCookie)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',...(sessionCookie?{'Set-Cookie':sessionCookie}:{})}});
const error=(code,status)=>json({ok:false,error:code},status);
const accepted=()=>json({ok:true,accepted:true},202);
async function bodyOf(request){
 if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('Content-Type')||''))return null;
 if(Number(request.headers.get('Content-Length'))>4096||!request.body)return null;
 const reader=request.body.getReader(),chunks=[];let size=0;
 for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>4096){await reader.cancel();return null;}chunks.push(value);}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 try{const body=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));return body&&typeof body==='object'&&!Array.isArray(body)?body:null;}catch{return null;}
}

async function deliverReset(env,email,lang){
 const user=await env.HITS.prepare(`SELECT a.id,a.session_version,i.email FROM free_accounts a
  JOIN free_account_identities i ON i.account_id=a.id WHERE i.email=? AND i.email_verified=1`).bind(email).first();
 if(!user)return;
 if(!await consumeRate(env,'mail-reset-account',user.id,3,3600))return;
 await sendAccountEmail(env,user,'reset',lang);
}

async function route(context){
 const {request,env}=context;
 if(request.method==='GET')return json({ok:true,available:mailAvailable(env)});
 if(request.method!=='POST')return error('method_not_allowed',405);
 const url=new URL(request.url);
 if(url.protocol!=='https:'||request.headers.get('Origin')!==url.origin||request.headers.get('Sec-Fetch-Site')==='cross-site')return error('origin_rejected',403);
 const body=await bodyOf(request);if(!body||!ACTIONS.has(body.action))return error('invalid_request',400);
 const ip=request.headers.get('CF-Connecting-IP');if(!ip||ip.length>64)return error('unavailable',503);
 if(!env.HITS)return error('unavailable',503);
 if(body.action.startsWith('request_')&&!mailAvailable(env))return error('email_unavailable',503);
 // Never fall back to synchronous anonymous delivery: its timing would reveal
 // eligible addresses. Cloudflare Pages supplies waitUntil in production.
 if(body.action==='request_reset'&&typeof context.waitUntil!=='function')return error('unavailable',503);
 await ensureAccountEmail(env);
 if(!await consumeRate(env,'mail-ip',ip,20,900))return error('rate_limited',429);
 const lang=body.lang==='en'?'en':'zh';
 if(body.action==='request_reset'){
  const email=normalizeEmail(body.email);
  if(!validEmail(email))return accepted();
  // Every submitted address consumes the same bucket, whether or not it exists.
  // Account-specific limits and provider failures never change this response.
  if(!await consumeRate(env,'mail-reset-email',email,3,3600))return accepted();
  if(!await consumeRate(env,'mail-send-ip',ip,6,900))return error('rate_limited',429);
  const delivery=deliverReset(env,email,lang).catch(()=>{});
  // Cloudflare keeps background delivery alive without a provider-dependent
  // response delay that would expose whether the address is verified/present.
  context.waitUntil(delivery);
  return accepted();
 }
 if(body.action==='request_verify'||body.action==='verify'){
  const user=await getAccount(request,env);
  if(!user)return error('authentication_required',401);
  if(typeof body.account_id!=='string'||body.account_id!==user.id)return error('session_changed',409);
  if(!user.email)return error('email_required',409);
  if(body.action==='request_verify'){
   if(user.email_verified)return json({ok:true,email_verified:true});
   if(!await consumeRate(env,'mail-verify-account',user.id,3,3600)||!await consumeRate(env,'mail-send-ip',ip,6,900))return error('rate_limited',429);
   return await sendAccountEmail(env,user,'verify',lang)?accepted():error('email_delivery_failed',503);
  }
  if(typeof body.token!=='string'||!TOKEN.test(body.token))return error('invalid_token',400);
  if(!await consumeRate(env,'mail-verify-token',hash(body.token),8,900))return error('rate_limited',429);
  const token=await emailToken(env,body.token,'verify');
  if(!token)return error('invalid_token',400);
  if(token.account_id!==user.id||token.email!==user.email)return error('session_changed',409);
  const t=now();
  const results=await env.HITS.batch([
   env.HITS.prepare(`UPDATE free_account_identities SET email_verified=1,email_verified_at=?
    WHERE account_id=? AND email=? AND email_verified=0 AND EXISTS(
     SELECT 1 FROM free_account_email_tokens t JOIN free_accounts a ON a.id=t.account_id AND a.session_version=t.version
     JOIN free_account_sessions s ON s.account_id=a.id AND s.version=a.session_version
     WHERE t.token_hash=? AND t.account_id=free_account_identities.account_id AND t.email=free_account_identities.email
      AND t.action='verify' AND t.state='ready' AND t.expires>? AND s.token_hash=? AND s.expires>?) RETURNING account_id`)
    .bind(t,user.id,user.email,token.token_hash,t,hash(tokenFrom(request)),t),
   env.HITS.prepare('DELETE FROM free_account_email_tokens WHERE token_hash=?').bind(token.token_hash),
  ]);
  if(!results[0]?.results?.length)return error('invalid_token',400);
  return json({...await accountView(env,await accountById(env,user.id)),email_verified:true});
 }
 if(typeof body.token!=='string'||!TOKEN.test(body.token))return error('invalid_token',400);
 if(!validPassword(body.new_password))return error('password_length',400);
 if(!await consumeRate(env,'mail-reset-token',hash(body.token),8,900))return error('rate_limited',429);
 const token=await emailToken(env,body.token,'reset');
 if(!token)return error('invalid_token',400);
 if(!await consumeRate(env,'mail-reset-redeem-account',token.account_id,5,900))return error('rate_limited',429);
 const replacement=await passwordRecord(body.new_password),recovery=randomToken(),t=now();
 // Password/version CAS and token eligibility are one write in a D1 transaction.
 // Cleanup only removes old versions, so a concurrent new login is not revoked.
 const results=await env.HITS.batch([
  env.HITS.prepare(`UPDATE free_accounts SET password_hash=?,recovery_hash=?,session_version=session_version+1,updated=?
   WHERE id=? AND session_version=? AND EXISTS(
    SELECT 1 FROM free_account_email_tokens t JOIN free_account_identities i ON i.account_id=t.account_id AND i.email=t.email AND i.email_verified=1
    WHERE t.token_hash=? AND t.account_id=free_accounts.id AND t.version=free_accounts.session_version
     AND t.action='reset' AND t.state='ready' AND t.expires>?) RETURNING id`)
   .bind(replacement,hash(recovery),t,token.account_id,token.version,token.token_hash,t),
  env.HITS.prepare(`DELETE FROM free_account_sessions WHERE account_id=? AND version<=?
   AND EXISTS(SELECT 1 FROM free_accounts WHERE id=? AND session_version>?)`).bind(token.account_id,token.version,token.account_id,token.version),
  env.HITS.prepare(`DELETE FROM free_account_email_tokens WHERE account_id=? AND version<=?
   AND EXISTS(SELECT 1 FROM free_accounts WHERE id=? AND session_version>?)`).bind(token.account_id,token.version,token.account_id,token.version),
 ]);
 if(!results[0]?.results?.length)return error('invalid_token',400);
 return json({ok:true,user:null,favorites:[],sign_in_required:true,email:token.email,recovery_code:recovery},200,clearCookie());
}

export async function onRequest(context){try{return await route(context);}catch{return error('unavailable',503);}}
