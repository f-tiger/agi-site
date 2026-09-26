import {ensureAccounts,getAccount,verifyPassword,consumeRate,publicUser} from '../../lib/free-account.js';
import {json,digest,seconds} from '../../lib/ad-commerce.js';
import {ensureMembers,memberByToken,memberSite} from '../../lib/membership.js';
import {memberAction} from './member.js';

export async function ensureAccountMembers(env){
 await ensureAccounts(env);await ensureMembers(env.HITS,'bpj');
 await env.HITS.prepare(`CREATE TABLE IF NOT EXISTS bpj_account_members (
  account_id TEXT PRIMARY KEY REFERENCES free_accounts(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL UNIQUE REFERENCES wb_members(id),
  backup_hash TEXT, created INTEGER NOT NULL
 )`).run();
}
const randomKey=()=>[...crypto.getRandomValues(new Uint8Array(32))].map(n=>n.toString(16).padStart(2,'0')).join('');
const fail=(code,status)=>json({ok:false,code},status);
async function bodyOf(request){
 if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('Content-Type')||''))return null;
 if(Number(request.headers.get('Content-Length'))>100000||!request.body)return null;
 const reader=request.body.getReader(),chunks=[];let size=0;
 for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>100000){await reader.cancel();return null;}chunks.push(value);}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 try{const b=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));return b&&typeof b==='object'&&!Array.isArray(b)?b:null;}catch{return null;}
}
const linked=async(db,id)=>db.prepare('SELECT m.*,l.backup_hash FROM bpj_account_members l JOIN wb_members m ON m.id=l.member_id WHERE l.account_id=?').bind(id).first();
async function reauthenticate(request,env,user,password){
 const ip=request.headers.get('CF-Connecting-IP');
 if(!ip||ip.length>64)return fail('not_ready',503);
 if(!await consumeRate(env,'auth-ip',ip,20,900)||!await consumeRate(env,'sensitive-account',user.id,5,900))return fail('rate_limited',429);
 const row=await env.HITS.prepare('SELECT password_hash FROM free_accounts WHERE id=? AND session_version=?').bind(user.id,user.session_version).first();
 if(!row||!await verifyPassword(password,row.password_hash))return fail('invalid_credentials',401);
 const current=await getAccount(request,env);
 return current?.id===user.id&&current.session_version===user.session_version?null:fail('account_changed',409);
}
async function route(request,env){
 if(!env.HITS)return fail('not_ready',503);
 if(memberSite(env)!=='bpj')return fail('wrong_site',403);
 if(request.method!=='POST')return fail('method_not_allowed',405);
 const url=new URL(request.url);
 if(url.protocol!=='https:'||request.headers.get('Origin')!==url.origin||request.headers.get('Sec-Fetch-Site')==='cross-site')return fail('origin',403);
 // No implicit precedence between a cookie account and a manually entered legacy credential.
 if(request.headers.has('Authorization'))return fail('mixed_authentication',400);
 const b=await bodyOf(request);if(!b)return fail('badjson',400);
 const user=await getAccount(request,env);if(!user)return fail('authentication_required',401);
 if(b.account_id!==undefined&&b.account_id!==user.id)return fail('account_changed',409);
 if(b.action!=='status'&&b.account_id!==user.id)return fail('account_changed',409);
 await ensureAccountMembers(env);
 if(!await consumeRate(env,'account-member',user.id,120,60))return fail('rate_limited',429);
 const db=env.HITS;let m=await linked(db,user.id);
 if(b.action==='status'){
  const response=await memberAction({request,env,b,m}),body=await response.json();
  return json({...body,user:publicUser(user),linked:!!m,key_backed_up:!!m&&m.backup_hash===m.token_hash},response.status);
 }
 if(['link_key','create_key','replace_key'].includes(b.action)){
  const rejected=await reauthenticate(request,env,user,b.password);if(rejected)return rejected;
  if(b.action==='link_key'){
   if(!/^[a-f0-9]{64}$/.test(b.key||'')||b.key_saved!==true)return fail('consent_required',400);
   const legacy=await memberByToken(db,b.key);if(!legacy)return fail('member_not_found',404);
   if(m&&m.id!==legacy.id)return fail('link_conflict',409);
   const owner=await db.prepare('SELECT account_id FROM bpj_account_members WHERE member_id=?').bind(legacy.id).first();
   if(owner&&owner.account_id!==user.id)return fail('link_conflict',409);
   try{
    await db.prepare(`INSERT INTO bpj_account_members(account_id,member_id,backup_hash,created)
     SELECT a.id,m.id,m.token_hash,? FROM free_accounts a,wb_members m
     WHERE a.id=? AND a.session_version=? AND m.id=? AND m.token_hash=?
     ON CONFLICT(account_id) DO UPDATE SET backup_hash=excluded.backup_hash WHERE member_id=excluded.member_id`)
     .bind(seconds(),user.id,user.session_version,legacy.id,legacy.token_hash).run();
   }catch(e){if(/UNIQUE/.test(e.message))return fail('link_conflict',409);throw e;}
   m=await linked(db,user.id);if(m?.id!==legacy.id||m.token_hash!==legacy.token_hash)return fail('account_changed',409);
   return json({ok:true,linked:true,user:publicUser(user)});
  }
  if(b.action==='create_key'&&m)return fail('already_linked',409);
  if(b.action==='replace_key'&&!m)return fail('member_not_found',404);
  const key=randomKey(),hash=await digest(key),id=m?.id||crypto.randomUUID(),created=seconds();
  if(b.action==='create_key'){
   try{await db.batch([
    db.prepare(`INSERT INTO wb_members(id,token_hash,created) SELECT ?,?,? FROM free_accounts WHERE id=? AND session_version=?`).bind(id,hash,created,user.id,user.session_version),
    db.prepare(`INSERT INTO bpj_account_members(account_id,member_id,backup_hash,created) SELECT a.id,m.id,NULL,? FROM free_accounts a,wb_members m WHERE a.id=? AND a.session_version=? AND m.id=?`).bind(created,user.id,user.session_version,id)
   ]);}catch(e){if(/UNIQUE/.test(e.message))return fail('already_linked',409);throw e;}
  }else{
   await db.batch([
    db.prepare(`UPDATE wb_members SET token_hash=? WHERE id=? AND token_hash=? AND EXISTS(SELECT 1 FROM free_accounts WHERE id=? AND session_version=?)`).bind(hash,id,m.token_hash,user.id,user.session_version),
    db.prepare('UPDATE bpj_account_members SET backup_hash=NULL WHERE account_id=? AND member_id=? AND EXISTS(SELECT 1 FROM wb_members WHERE id=? AND token_hash=?)').bind(user.id,id,id,hash)
   ]);
  }
  m=await linked(db,user.id);if(m?.id!==id||m.token_hash!==hash)return fail('account_changed',409);
  // The plaintext is returned once, never stored. A lost response can be recovered by explicit replacement.
  return json({ok:true,key,linked:true,user:publicUser(user),key_backed_up:false});
 }
 if(!m)return fail('member_not_found',404);
 if(b.action==='confirm_backup'){
  if(b.confirmed!==true||!/^[a-f0-9]{64}$/.test(b.key||''))return fail('consent_required',400);
  const hash=await digest(b.key);if(hash!==m.token_hash)return fail('bad_key',400);
  await db.prepare(`UPDATE bpj_account_members SET backup_hash=? WHERE account_id=? AND member_id=? AND EXISTS(SELECT 1 FROM wb_members WHERE id=? AND token_hash=?) AND EXISTS(SELECT 1 FROM free_accounts WHERE id=? AND session_version=?)`).bind(hash,user.id,m.id,m.id,hash,user.id,user.session_version).run();
  m=await linked(db,user.id);if(!m||m.backup_hash!==hash||m.token_hash!==hash)return fail('account_changed',409);
  return json({ok:true,key_backed_up:true});
 }
 if(b.action==='rotate')return fail('reauthentication_required',403);
 if(b.action==='checkout'&&m.backup_hash!==m.token_hash)return fail('key_backup_required',403);
 return memberAction({request,env,b,m});
}
export async function onRequestPost({request,env}){try{return await route(request,env);}catch{return fail('temporarily_unavailable',503);}}
