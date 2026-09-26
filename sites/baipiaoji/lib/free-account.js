import {scrypt,timingSafeEqual,randomBytes,createHash} from 'node:crypto';
import tools from '../data/tools.json' with {type:'json'};
// OWASP scrypt alternative: N=2^15, r=8, p=3 (32 MiB). Never lower for runtime compatibility.
export const PASSWORD_COST={N:32768,r:8,p:3,maxmem:64*1024*1024};
export const ACCOUNT_COOKIE='__Host-bpj_account';
export const SESSION_SECONDS=30*86400;
const VALID_TOOLS=new Set(tools.map(t=>t.slug));
export const validFavorite=slug=>typeof slug==='string'&&VALID_TOOLS.has(slug);
export const now=()=>Math.floor(Date.now()/1000);
export const hash=value=>createHash('sha256').update(String(value)).digest('hex');
export const randomToken=()=>randomBytes(32).toString('base64url');
export const normalizeUsername=value=>typeof value==='string'?value.trim().toLowerCase():'';
export const validUsername=value=>/^[a-z0-9_-]{3,32}$/.test(value);
export const validPassword=value=>typeof value==='string'&&value.length>=12&&value.length<=128;
export async function derivePassword(password,salt){
 return new Promise((resolve,reject)=>scrypt(password,salt,32,PASSWORD_COST,(error,key)=>error?reject(error):resolve(key.toString('hex'))));
}
export async function passwordRecord(password){const salt=randomBytes(16).toString('hex');return `scrypt-v1$${salt}$${await derivePassword(password,salt)}`;}
export async function verifyPassword(password,stored){
 if(!validPassword(password))return false;
 const parts=String(stored||'').split('$');
 // Same expensive derivation for unknown usernames. The fixed salt isn't used for real accounts.
 const good=parts.length===3&&parts[0]==='scrypt-v1'&&/^[a-f0-9]{32}$/.test(parts[1])&&/^[a-f0-9]{64}$/.test(parts[2]);
 const calculated=await derivePassword(password,good?parts[1]:'00000000000000000000000000000000');
 return timingSafeEqual(Buffer.from(calculated,'hex'),Buffer.from(good?parts[2]:'0'.repeat(64),'hex'))&&good;
}
export async function ensureAccounts(env){
 if(!env.HITS)throw Error('database unavailable');
 await env.HITS.batch([
  env.HITS.prepare(`CREATE TABLE IF NOT EXISTS free_accounts (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, recovery_hash TEXT NOT NULL, session_version INTEGER NOT NULL DEFAULT 1, created INTEGER NOT NULL, updated INTEGER NOT NULL, qa INTEGER NOT NULL DEFAULT 0)`),
  env.HITS.prepare(`CREATE TABLE IF NOT EXISTS free_account_sessions (token_hash TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES free_accounts(id) ON DELETE CASCADE, version INTEGER NOT NULL, created INTEGER NOT NULL, expires INTEGER NOT NULL)`),
  env.HITS.prepare(`CREATE INDEX IF NOT EXISTS free_account_sessions_owner ON free_account_sessions(account_id)`),
  env.HITS.prepare(`CREATE TABLE IF NOT EXISTS free_account_favorites (account_id TEXT NOT NULL REFERENCES free_accounts(id) ON DELETE CASCADE, slug TEXT NOT NULL, created INTEGER NOT NULL, PRIMARY KEY(account_id,slug))`),
  env.HITS.prepare(`CREATE TABLE IF NOT EXISTS free_account_rates (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL)`),
  env.HITS.prepare(`DELETE FROM free_account_sessions WHERE expires <= ?`).bind(now()),
  env.HITS.prepare(`DELETE FROM free_account_rates WHERE expires <= ?`).bind(now()),
 ]);
}
export function tokenFrom(request){
 const values=(request.headers.get('Cookie')||'').split(';').map(x=>x.trim()).filter(x=>x.startsWith(ACCOUNT_COOKIE+'='));
 if(values.length!==1)return null;
 const token=values[0].slice(ACCOUNT_COOKIE.length+1);return /^[A-Za-z0-9_-]{43}$/.test(token)?token:null;
}
export async function getAccount(request,env){
 const token=tokenFrom(request);if(!token||!env.HITS)return null;
 await ensureAccounts(env);
 return await env.HITS.prepare(`SELECT a.id,a.username,a.created,a.qa,a.session_version FROM free_accounts a JOIN free_account_sessions s ON s.account_id=a.id AND s.version=a.session_version WHERE s.token_hash=? AND s.expires>?`).bind(hash(token),now()).first()||null;
}
export const publicUser=user=>user?{id:user.id,username:user.username,created:user.created}:null;
export async function favoritesFor(env,id){return (await env.HITS.prepare('SELECT slug FROM free_account_favorites WHERE account_id=? ORDER BY created,slug').bind(id).all()).results.map(x=>x.slug);}
export async function accountView(env,user){return {ok:true,user:publicUser(user),favorites:user?await favoritesFor(env,user.id):[]};}
export function cookie(token){return `${ACCOUNT_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_SECONDS}`;}
export const clearCookie=()=>`${ACCOUNT_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
// One SQL write per bucket: concurrent guesses cannot read the same old allowance.
export async function consumeRate(env,scope,identity,limit,seconds){
 const t=now(),bucket=Math.floor(t/seconds),key=hash(`free-account|${scope}|${bucket}|${identity}`);
 const row=await env.HITS.prepare(`INSERT INTO free_account_rates(key,count,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 WHERE count<? RETURNING count`).bind(key,(bucket+1)*seconds,limit).first();
 return !!row;
}
export async function issueSession(env,user){
 const token=randomToken(),t=now();
 const row=await env.HITS.prepare(`INSERT INTO free_account_sessions(token_hash,account_id,version,created,expires) SELECT ?,id,session_version,?,? FROM free_accounts WHERE id=? AND session_version=? RETURNING token_hash`).bind(hash(token),t,t+SESSION_SECONDS,user.id,user.session_version).first();
 return row?token:null;
}
