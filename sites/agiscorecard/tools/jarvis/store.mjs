import {ensure as sharedEnsure,now} from '../create/store.mjs';
const ready=new WeakMap();
export async function ensure(db){
 await sharedEnsure(db);if(!ready.has(db))ready.set(db,db.batch([
  db.prepare(`CREATE TABLE IF NOT EXISTS jarvis_tasks(id TEXT PRIMARY KEY,owner TEXT NOT NULL,member_id TEXT NOT NULL DEFAULT '',nonce TEXT NOT NULL,ip_key TEXT NOT NULL,input TEXT NOT NULL,status TEXT NOT NULL,stage TEXT NOT NULL DEFAULT 'queued',result TEXT NOT NULL DEFAULT '{}',previous TEXT NOT NULL DEFAULT '{}',runs INTEGER NOT NULL DEFAULT 0,created INTEGER NOT NULL,updated INTEGER NOT NULL,next_run INTEGER NOT NULL,until_at INTEGER NOT NULL,expires INTEGER NOT NULL,lease TEXT NOT NULL DEFAULT '',lease_until INTEGER NOT NULL DEFAULT 0,feedback TEXT,UNIQUE(owner,nonce))`),
  db.prepare('CREATE INDEX IF NOT EXISTS jarvis_due ON jarvis_tasks(status,next_run,lease_until)'),
  db.prepare('CREATE INDEX IF NOT EXISTS jarvis_owner ON jarvis_tasks(owner,expires,created)'),
  db.prepare('CREATE INDEX IF NOT EXISTS jarvis_expiry ON jarvis_tasks(expires)')
 ]).then(async()=>{
  const columns=(await db.prepare('PRAGMA table_info(jarvis_tasks)').all()).results;
  if(!columns.some(c=>c.name==='member_id')){try{await db.prepare("ALTER TABLE jarvis_tasks ADD COLUMN member_id TEXT NOT NULL DEFAULT ''").run();}catch(e){if(!(await db.prepare('PRAGMA table_info(jarvis_tasks)').all()).results.some(c=>c.name==='member_id'))throw e;}}
  // Pre-membership work must never run under the private maintenance credential.
  await db.prepare("UPDATE jarvis_tasks SET status='paused',stage='membership_required',next_run=0,lease='',lease_until=0,updated=? WHERE member_id='' AND status IN ('queued','running','watching')").bind(now()).run();
 }).catch(e=>{ready.delete(db);throw e;}));await ready.get(db);
}
export function publicTask(r){return {id:r.id,input:JSON.parse(r.input),status:r.status,stage:r.stage,result:JSON.parse(r.result),previous:JSON.parse(r.previous),runs:r.runs,created:r.created,updated:r.updated,nextRun:r.next_run,until:r.until_at,expires:r.expires,feedback:r.feedback};}
export async function owned(db,owner,id){return db.prepare('SELECT * FROM jarvis_tasks WHERE owner=? AND id=? AND expires>?').bind(owner,id,now()).first();}
export async function cleanup(db){await db.prepare('DELETE FROM jarvis_tasks WHERE id IN (SELECT id FROM jarvis_tasks WHERE expires<=? ORDER BY expires LIMIT 100)').bind(now()).run();}
