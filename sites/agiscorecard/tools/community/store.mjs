import {SCHEMA as MEMBER_SCHEMA,memberByToken} from '../../../baipiaoji/lib/membership.js';
import {seed} from './content.mjs';
export const now=()=>Math.floor(Date.now()/1000);
export const hash=async value=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(x=>x.toString(16).padStart(2,'0')).join('');
export const sources=['direct','internal','search','reddit','hackernews','x','linkedin','share','other'];
export const sourceOf=s=>sources.includes(s)?s:'other';
export const schema=[
 `CREATE TABLE IF NOT EXISTS discuss_clock(id INTEGER PRIMARY KEY,revision INTEGER NOT NULL)`,
 `INSERT OR IGNORE INTO discuss_clock(id,revision) VALUES(1,0)`,
 MEMBER_SCHEMA.find(s=>s.startsWith('CREATE TABLE IF NOT EXISTS wb_members(')),
 `CREATE TABLE IF NOT EXISTS discuss_profiles(member_id TEXT PRIMARY KEY REFERENCES wb_members(id),handle TEXT UNIQUE NOT NULL,lang TEXT NOT NULL,source TEXT NOT NULL,created INTEGER NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS discuss_posts(id TEXT PRIMARY KEY,parent TEXT,member_id TEXT NOT NULL,lang TEXT NOT NULL,category TEXT NOT NULL,title TEXT NOT NULL,body TEXT NOT NULL,source TEXT NOT NULL DEFAULT '',disclosure TEXT NOT NULL DEFAULT '',status TEXT NOT NULL DEFAULT 'pending',created INTEGER NOT NULL,updated INTEGER NOT NULL,published INTEGER NOT NULL DEFAULT 0,revision INTEGER NOT NULL DEFAULT 0)`,
 `CREATE INDEX IF NOT EXISTS discuss_public ON discuss_posts(status,parent,published)`,
 `CREATE INDEX IF NOT EXISTS discuss_author ON discuss_posts(member_id,created)`,
 `CREATE TABLE IF NOT EXISTS discuss_follows(member_id TEXT NOT NULL,thread TEXT NOT NULL,seen INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(member_id,thread))`,
 `CREATE TABLE IF NOT EXISTS discuss_reports(member_id TEXT NOT NULL,post TEXT NOT NULL,reason TEXT NOT NULL,created INTEGER NOT NULL,resolved INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(member_id,post))`,
 `CREATE TABLE IF NOT EXISTS discuss_audit(id TEXT PRIMARY KEY,post TEXT NOT NULL,decision TEXT NOT NULL,created INTEGER NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS discuss_limits(k TEXT PRIMARY KEY,n INTEGER NOT NULL,expires INTEGER NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS discuss_visits(day TEXT NOT NULL,sid TEXT NOT NULL,lang TEXT NOT NULL,source TEXT NOT NULL,PRIMARY KEY(day,sid))`,
 `CREATE TABLE IF NOT EXISTS discuss_activity(member_id TEXT NOT NULL,day TEXT NOT NULL,PRIMARY KEY(member_id,day))`,
 `CREATE TABLE IF NOT EXISTS discuss_events(day TEXT NOT NULL,name TEXT NOT NULL,lang TEXT NOT NULL,source TEXT NOT NULL,n INTEGER NOT NULL,PRIMARY KEY(day,name,lang,source))`
];
const ready=new WeakMap();
export async function ensure(db){if(!db)throw Error('unavailable');let p=ready.get(db);if(!p){p=db.batch(schema.map(s=>db.prepare(s))).catch(e=>{ready.delete(db);throw e;});ready.set(db,p);}return p;}
export async function limit(db,key,n,ttl=60){const time=now();await db.prepare('INSERT INTO discuss_limits(k,n,expires) VALUES(?,1,?) ON CONFLICT(k) DO UPDATE SET n=CASE WHEN expires<=? THEN 1 ELSE n+1 END,expires=CASE WHEN expires<=? THEN excluded.expires ELSE expires END').bind(key,time+ttl,time,time).run();if((await db.prepare('SELECT n FROM discuss_limits WHERE k=?').bind(key).first()).n>n)throw Error('rate_limited');}
export async function identity(db,request){const key=(request.headers.get('Authorization')||'').replace(/^Bearer /,'');if(!/^[a-f0-9]{64}$/.test(key))throw Error('unauthorized');const m=await memberByToken(db,key);if(!m)throw Error('unauthorized');if(m.suspended)throw Error('suspended');const p=await db.prepare('SELECT * FROM discuss_profiles WHERE member_id=?').bind(m.id).first();return {m,p,key};}
export async function thread(db,id,lang='en'){const s=seed(id,lang);if(s)return s;return db.prepare("SELECT p.*,u.handle FROM discuss_posts p JOIN discuss_profiles u ON u.member_id=p.member_id WHERE p.id=? AND p.parent IS NULL AND p.status='public'").bind(id).first();}
export async function listing(db,lang,category='',offset=0){const rows=await db.prepare("SELECT p.id,p.title,substr(p.body,1,151) body,p.category,p.lang,p.created,p.published,u.handle,(SELECT COUNT(*) FROM discuss_posts r WHERE r.parent=p.id AND r.status='public') replies FROM discuss_posts p JOIN discuss_profiles u ON u.member_id=p.member_id WHERE p.status='public' AND p.parent IS NULL AND p.lang=? AND (?='' OR p.category=?) ORDER BY p.published DESC,p.id DESC LIMIT 21 OFFSET ?").bind(lang,category,category,offset).all();return rows.results||[];}
export async function replies(db,id,offset=0){return (await db.prepare("SELECT p.*,u.handle FROM discuss_posts p JOIN discuss_profiles u ON u.member_id=p.member_id WHERE p.parent=? AND p.status='public' ORDER BY p.published,p.id LIMIT 31 OFFSET ?").bind(id,offset).all()).results||[];}
export async function event(db,name,lang,source){await db.prepare("INSERT INTO discuss_events(day,name,lang,source,n) VALUES(date('now'),?,?,?,1) ON CONFLICT(day,name,lang,source) DO UPDATE SET n=n+1").bind(name,lang,sourceOf(source)).run();}
export async function metrics(db){const one=async sql=>(await db.prepare(sql).first());return {
 window_days:28,visits:await one("SELECT COUNT(*) session_days FROM discuss_visits WHERE day>=date('now','-27 days')"),
 registrations:await one("SELECT COUNT(*) accounts FROM discuss_profiles WHERE created>=unixepoch('now','-28 days')"),
 activated:await one("SELECT COUNT(DISTINCT p.member_id) accounts FROM discuss_profiles p JOIN discuss_posts t ON t.member_id=p.member_id WHERE p.created>=unixepoch('now','-28 days') AND t.created<=p.created+604800 AND t.status='public'"),
 returned:await one("SELECT COUNT(DISTINCT p.member_id) accounts FROM discuss_profiles p JOIN discuss_activity a ON a.member_id=p.member_id WHERE p.created>=unixepoch('now','-28 days') AND a.day>date(p.created,'unixepoch')"),
 pending:await one("SELECT COUNT(*) posts FROM discuss_posts WHERE status='pending'"),
 reports:await one("SELECT COUNT(*) reports FROM discuss_reports WHERE resolved=0"),
 unanswered:await one("SELECT COUNT(*) threads FROM discuss_posts t WHERE t.status='public' AND t.parent IS NULL AND t.published<unixepoch('now','-1 day') AND NOT EXISTS(SELECT 1 FROM discuss_posts r WHERE r.parent=t.id AND r.status='public' AND r.member_id<>t.member_id)"),
 by_source:(await db.prepare("SELECT source,COUNT(*) registrations FROM discuss_profiles WHERE created>=unixepoch('now','-28 days') GROUP BY source").all()).results,
 events:(await db.prepare("SELECT name,source,SUM(n) n FROM discuss_events WHERE day>=date('now','-27 days') GROUP BY name,source").all()).results
};}

export async function cleanup(db){await db.batch([db.prepare('DELETE FROM discuss_limits WHERE expires<?').bind(now()-86400),db.prepare("DELETE FROM discuss_visits WHERE day<date('now','-90 days')"),db.prepare("DELETE FROM discuss_activity WHERE day<date('now','-90 days')")]);}
