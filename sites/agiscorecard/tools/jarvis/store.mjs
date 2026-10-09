import {ensure as sharedEnsure,now} from '../create/store.mjs';
const ready=new WeakMap();
export async function ensure(db){
 await sharedEnsure(db);if(!ready.has(db))ready.set(db,db.batch([
  db.prepare(`CREATE TABLE IF NOT EXISTS jarvis_tasks(id TEXT PRIMARY KEY,owner TEXT NOT NULL,member_id TEXT NOT NULL DEFAULT '',nonce TEXT NOT NULL,ip_key TEXT NOT NULL,input TEXT NOT NULL,status TEXT NOT NULL,stage TEXT NOT NULL DEFAULT 'queued',result TEXT NOT NULL DEFAULT '{}',previous TEXT NOT NULL DEFAULT '{}',runs INTEGER NOT NULL DEFAULT 0,created INTEGER NOT NULL,updated INTEGER NOT NULL,next_run INTEGER NOT NULL,until_at INTEGER NOT NULL,expires INTEGER NOT NULL,lease TEXT NOT NULL DEFAULT '',lease_until INTEGER NOT NULL DEFAULT 0,feedback TEXT,UNIQUE(owner,nonce))`),
  db.prepare('CREATE INDEX IF NOT EXISTS jarvis_due ON jarvis_tasks(status,next_run,lease_until)'),
  db.prepare('CREATE INDEX IF NOT EXISTS jarvis_owner ON jarvis_tasks(owner,expires,created)'),
  db.prepare('CREATE INDEX IF NOT EXISTS jarvis_expiry ON jarvis_tasks(expires)'),
  // Fixed action-state receipts contain no goal, action text, memory or key.
  db.prepare(`CREATE TABLE IF NOT EXISTS jarvis_action_progress(task_id TEXT NOT NULL,run INTEGER NOT NULL,action_index INTEGER NOT NULL,state TEXT NOT NULL,updated INTEGER NOT NULL,PRIMARY KEY(task_id,run,action_index))`),
  db.prepare('CREATE INDEX IF NOT EXISTS jarvis_action_task ON jarvis_action_progress(task_id)'),
  // Minimal usage receipts survive task deletion/expiry; no task text or raw IP.
  db.prepare('CREATE TABLE IF NOT EXISTS jarvis_trials(owner TEXT PRIMARY KEY,task_id TEXT NOT NULL,created INTEGER NOT NULL)'),
  db.prepare('CREATE TABLE IF NOT EXISTS jarvis_trial_ips(k TEXT PRIMARY KEY,expires INTEGER NOT NULL)'),
  db.prepare('CREATE INDEX IF NOT EXISTS jarvis_trial_ip_expiry ON jarvis_trial_ips(expires)')
 ]).then(async()=>{
  const columns=(await db.prepare('PRAGMA table_info(jarvis_tasks)').all()).results;
  if(!columns.some(c=>c.name==='member_id')){try{await db.prepare("ALTER TABLE jarvis_tasks ADD COLUMN member_id TEXT NOT NULL DEFAULT ''").run();}catch(e){if(!(await db.prepare('PRAGMA table_info(jarvis_tasks)').all()).results.some(c=>c.name==='member_id'))throw e;}}
  if(!columns.some(c=>c.name==='trial_ip_key')){try{await db.prepare("ALTER TABLE jarvis_tasks ADD COLUMN trial_ip_key TEXT NOT NULL DEFAULT ''").run();}catch(e){if(!(await db.prepare('PRAGMA table_info(jarvis_tasks)').all()).results.some(c=>c.name==='trial_ip_key'))throw e;}}
  // The admission SELECT and these receipts commit as one SQLite statement.
  // A failed task insert cannot burn a trial; concurrent inserts cannot share it.
  await db.prepare(`CREATE TRIGGER IF NOT EXISTS jarvis_trial_receipt AFTER INSERT ON jarvis_tasks
   WHEN NEW.member_id='' AND NEW.trial_ip_key<>'' BEGIN
    INSERT INTO jarvis_trials(owner,task_id,created) VALUES(NEW.owner,NEW.id,NEW.created);
    INSERT INTO jarvis_trial_ips(k,expires) VALUES(NEW.trial_ip_key,NEW.created+86400)
     ON CONFLICT(k) DO UPDATE SET expires=excluded.expires;
   END`).run();
 }).catch(e=>{ready.delete(db);throw e;}));await ready.get(db);
}
export function publicTask(r){return {id:r.id,input:JSON.parse(r.input),status:r.status,stage:r.stage,result:JSON.parse(r.result),previous:JSON.parse(r.previous),runs:r.runs,created:r.created,updated:r.updated,nextRun:r.next_run,until:r.until_at,expires:r.expires,feedback:r.feedback};}
export async function progressFor(db,owner,rows){
 const ids=rows.map(row=>row.id);if(!ids.length)return new Map();
 const values=(await db.prepare(`SELECT p.task_id,p.run,p.action_index,p.state,p.updated FROM jarvis_action_progress p JOIN jarvis_tasks t ON t.id=p.task_id WHERE t.owner=? AND t.expires>? AND p.task_id IN (${ids.map(()=>'?').join(',')}) ORDER BY p.task_id,p.run,p.action_index`).bind(owner,now(),...ids).all()).results;
 const map=new Map();for(const value of values){if(!map.has(value.task_id))map.set(value.task_id,[]);map.get(value.task_id).push({run:value.run,index:value.action_index,state:value.state,updated:value.updated});}return map;
}
export function withProgress(row,progress){const task=publicTask(row),current=(progress||[]).filter(value=>value.run===row.runs);task.actionProgress=Object.fromEntries(current.map(value=>[String(value.index),{state:value.state,updated:value.updated}]));return task;}
export async function owned(db,owner,id){return db.prepare('SELECT * FROM jarvis_tasks WHERE owner=? AND id=? AND expires>?').bind(owner,id,now()).first();}
export async function trialReceipt(db,owner){
 let row=await db.prepare('SELECT task_id FROM jarvis_trials WHERE owner=?').bind(owner).first();
 if(!row){
  // Count surviving pre-policy history once, before deletion, recovery or execution.
  await db.prepare("INSERT OR IGNORE INTO jarvis_trials(owner,task_id,created) SELECT owner,id,created FROM jarvis_tasks WHERE owner=? AND member_id='' ORDER BY created,id LIMIT 1").bind(owner).run();
  row=await db.prepare('SELECT task_id FROM jarvis_trials WHERE owner=?').bind(owner).first();
 }
 return row;
}
export async function trialRemaining(db,owner,ip){return !await trialReceipt(db,owner)&&!await db.prepare('SELECT k FROM jarvis_trial_ips WHERE k=? AND expires>?').bind(ip,now()).first()?1:0;}
export async function guestRunAllowed(db,task){return task.runs===0&&(await trialReceipt(db,task.owner))?.task_id===task.id;}
export async function cleanup(db){
 // Preserve pre-policy receipts before expiring any remaining guest content.
 const rows=(await db.prepare('SELECT id,owner,member_id FROM jarvis_tasks WHERE expires<=? ORDER BY expires LIMIT 99').bind(now()).all()).results;
 const guests=[...new Set(rows.filter(row=>!row.member_id).map(row=>row.owner))];
 if(guests.length)await db.prepare("INSERT OR IGNORE INTO jarvis_trials(owner,task_id,created) SELECT owner,id,created FROM jarvis_tasks WHERE member_id='' AND owner IN ("+guests.map(()=>'?').join(',')+') ORDER BY created,id').bind(...guests).run();
 if(rows.length){await db.prepare('DELETE FROM jarvis_action_progress WHERE task_id IN ('+rows.map(()=>'?').join(',')+')').bind(...rows.map(row=>row.id)).run();await db.prepare('DELETE FROM jarvis_tasks WHERE id IN ('+rows.map(()=>'?').join(',')+') AND expires<=?').bind(...rows.map(row=>row.id),now()).run();}
 await db.prepare('DELETE FROM jarvis_trial_ips WHERE k IN (SELECT k FROM jarvis_trial_ips WHERE expires<=? LIMIT 100)').bind(now()).run();
}
