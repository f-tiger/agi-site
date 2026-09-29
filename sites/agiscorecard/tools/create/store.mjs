export const schema=[
`CREATE TABLE IF NOT EXISTS relay_acquisition(day TEXT NOT NULL,actor TEXT NOT NULL,campaign TEXT NOT NULL,source TEXT NOT NULL,evidence TEXT NOT NULL,action TEXT NOT NULL,PRIMARY KEY(day,actor,campaign,source,evidence,action))`,
`CREATE TABLE IF NOT EXISTS relay_stories(id TEXT PRIMARY KEY,story TEXT NOT NULL,parent TEXT,root TEXT NOT NULL,depth INTEGER NOT NULL,owner_hash TEXT NOT NULL,created INTEGER NOT NULL,status TEXT NOT NULL DEFAULT 'unlisted',test INTEGER NOT NULL DEFAULT 0)`,
`CREATE INDEX IF NOT EXISTS relay_created ON relay_stories(created,test,status)`,
`CREATE INDEX IF NOT EXISTS relay_parent ON relay_stories(parent,status)`,
`CREATE TABLE IF NOT EXISTS relay_limits(k TEXT PRIMARY KEY,n INTEGER NOT NULL,expires INTEGER NOT NULL)`,
`CREATE INDEX IF NOT EXISTS relay_limits_expiry ON relay_limits(expires)`,
`CREATE TABLE IF NOT EXISTS relay_events(day TEXT NOT NULL,actor TEXT NOT NULL,story TEXT NOT NULL,action TEXT NOT NULL,PRIMARY KEY(day,actor,story,action))`,
`CREATE TABLE IF NOT EXISTS relay_reports(story TEXT NOT NULL,actor TEXT NOT NULL,reason TEXT NOT NULL,created INTEGER NOT NULL,PRIMARY KEY(story,actor))`,
`CREATE INDEX IF NOT EXISTS relay_reports_created ON relay_reports(created)`];
const ready=new WeakMap();
export const now=()=>Math.floor(Date.now()/1000);
export const hash=async s=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))].map(n=>n.toString(16).padStart(2,'0')).join('');
export async function ensure(db){if(!db)throw Error('unavailable');if(!ready.has(db))ready.set(db,db.batch(schema.map(s=>db.prepare(s))).catch(e=>{ready.delete(db);throw e;}));return ready.get(db);}
// Atomic bounded increment: concurrent calls cannot read the same remaining quota.
export async function limit(db,key,max,seconds=86400){const t=now();const r=await db.prepare(`INSERT INTO relay_limits(k,n,expires) VALUES(?,1,?) ON CONFLICT(k) DO UPDATE SET n=CASE WHEN expires<=? THEN 1 ELSE n+1 END,expires=CASE WHEN expires<=? THEN excluded.expires ELSE expires END WHERE expires<=? OR n<? RETURNING n`).bind(key,t+seconds,t,t,t,max).first();if(!r)throw Error('rate_limited');}
export async function storyRow(db,id){return db.prepare("SELECT id,story,parent,root,depth,created,test FROM relay_stories WHERE id=? AND status='unlisted'").bind(id).first();}
export async function cleanup(db){await db.batch([db.prepare("DELETE FROM relay_acquisition WHERE day<date('now','-90 days')"),db.prepare('DELETE FROM relay_limits WHERE k IN (SELECT k FROM relay_limits WHERE expires<? LIMIT 100)').bind(now()-86400),db.prepare("DELETE FROM relay_events WHERE day<date('now','-90 days')")]);}
