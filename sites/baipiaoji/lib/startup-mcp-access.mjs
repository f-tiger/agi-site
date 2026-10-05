import {digest,seconds} from './ad-commerce.js';

export const STARTUP_LIMITS=Object.freeze({daily:100,perMinute:10,keys:3});
export const STARTUP_SCHEMA=[
 `CREATE TABLE IF NOT EXISTS bpj_startup_keys(id TEXT PRIMARY KEY,member_id TEXT NOT NULL REFERENCES wb_members(id),token_hash TEXT UNIQUE NOT NULL,owner_hash TEXT NOT NULL,label TEXT NOT NULL,created INTEGER NOT NULL,revoked INTEGER NOT NULL DEFAULT 0)`,
 `CREATE INDEX IF NOT EXISTS bpj_startup_key_owner ON bpj_startup_keys(member_id,revoked,owner_hash)`,
 `CREATE TABLE IF NOT EXISTS bpj_startup_usage(member_id TEXT PRIMARY KEY REFERENCES wb_members(id),day INTEGER NOT NULL,n INTEGER NOT NULL DEFAULT 0 CHECK(n>=0),minute INTEGER NOT NULL,minute_n INTEGER NOT NULL DEFAULT 0 CHECK(minute_n>=0))`
];
export async function ensureStartup(db){await db.batch(STARTUP_SCHEMA.map(s=>db.prepare(s)));}
const active=(m,now)=>m&&!m.suspended&&m.ends_at>now;
const random=()=>[...crypto.getRandomValues(new Uint8Array(32))].map(x=>x.toString(16).padStart(2,'0')).join('');
export async function startupKeyAction(db,member,body,now=seconds()){
 await ensureStartup(db);
 // Re-read entitlement and owner hash after the caller resolves its identity.
 const m=await db.prepare('SELECT * FROM wb_members WHERE id=? AND token_hash=?').bind(member.id,member.token_hash).first();
 if(!m)throw Error('unauthorized');
 if(body.action==='startup_mcp_create'){
  if(!active(m,now))throw Error('membership_required');
  if(typeof body.label!=='string'||!body.label.trim()||body.label.length>40)throw Error('bad_label');
  const token='bpj_solo_'+random(),hash=await digest(token),id=crypto.randomUUID();
  const row=await db.prepare(`INSERT INTO bpj_startup_keys(id,member_id,token_hash,owner_hash,label,created)
   SELECT ?,id,?,token_hash,?,? FROM wb_members WHERE id=? AND token_hash=? AND suspended=0 AND ends_at>?
   AND (SELECT COUNT(*) FROM bpj_startup_keys WHERE member_id=? AND revoked=0 AND owner_hash=?)<? RETURNING id`)
   .bind(id,hash,body.label.trim(),now,m.id,m.token_hash,now,m.id,m.token_hash,STARTUP_LIMITS.keys).first();
  if(!row)throw Error('key_limit_or_account_changed');
  return {ok:true,id,key:token,scope:'startup-research:read',shownOnce:true};
 }
 if(body.action==='startup_mcp_revoke'){
  if(typeof body.id!=='string'||body.id.length>60)throw Error('bad_key_id');
  await db.prepare('UPDATE bpj_startup_keys SET revoked=? WHERE id=? AND member_id=?').bind(now,body.id,m.id).run();
 }
 if(!['startup_mcp_status','startup_mcp_revoke'].includes(body.action))throw Error('bad_action');
 const keys=await db.prepare('SELECT id,label,created,revoked,owner_hash FROM bpj_startup_keys WHERE member_id=? AND revoked=0 AND owner_hash=? ORDER BY created DESC LIMIT 3').bind(m.id,m.token_hash).all();
 const usage=await db.prepare('SELECT day,n FROM bpj_startup_usage WHERE member_id=?').bind(m.id).first(),day=Math.floor(now/86400),used=usage?.day===day?usage.n:0;
 return {ok:true,active:!!active(m,now),endsAt:m.ends_at,limits:STARTUP_LIMITS,usage:{used,remaining:Math.max(0,STARTUP_LIMITS.daily-used),resetsAt:(day+1)*86400},keys:keys.results.map(({owner_hash,...k})=>k)};
}
export async function startupPrincipal(db,token,now=seconds()){
 if(!/^bpj_solo_[a-f0-9]{64}$/.test(token||''))return null;
 const row=await db.prepare(`SELECT m.id,m.ends_at,m.suspended,k.id AS key_id FROM bpj_startup_keys k JOIN wb_members m ON m.id=k.member_id
 WHERE k.token_hash=? AND k.revoked=0 AND k.owner_hash=m.token_hash`).bind(await digest(token)).first();
 if(!row)return null;
 return {...row,active:!!active(row,now)};
}
export async function reserveStartupCall(db,principal,now=seconds()){
 const day=Math.floor(now/86400),minute=Math.floor(now/60);
 // One conditional UPSERT is the concurrency boundary. All member keys share it.
 const row=await db.prepare(`INSERT INTO bpj_startup_usage(member_id,day,n,minute,minute_n)
 SELECT m.id,?,1,?,1 FROM wb_members m JOIN bpj_startup_keys k ON k.member_id=m.id
 WHERE m.id=? AND k.id=? AND k.revoked=0 AND k.owner_hash=m.token_hash AND m.suspended=0 AND m.ends_at>?
 ON CONFLICT(member_id) DO UPDATE SET day=excluded.day,n=CASE WHEN day=excluded.day THEN n+1 ELSE 1 END,
 minute=excluded.minute,minute_n=CASE WHEN minute=excluded.minute THEN minute_n+1 ELSE 1 END
 WHERE (day!=excluded.day OR n<?) AND (minute!=excluded.minute OR minute_n<?) RETURNING day,n,minute`)
 .bind(day,minute,principal.id,principal.key_id,now,STARTUP_LIMITS.daily,STARTUP_LIMITS.perMinute).first();
 if(!row)throw Error('quota_or_access_changed');
 return {...row,member_id:principal.id,remaining:STARTUP_LIMITS.daily-row.n,resetsAt:(day+1)*86400};
}
export async function refundStartupCall(db,reservation){
 await db.prepare(`UPDATE bpj_startup_usage SET n=MAX(n-1,0),minute_n=CASE WHEN minute=? THEN MAX(minute_n-1,0) ELSE minute_n END WHERE member_id=? AND day=?`)
 .bind(reservation.minute,reservation.member_id,reservation.day).run();
}
