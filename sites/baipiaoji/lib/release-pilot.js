export const OFFER='release-check-299-v1';
export const CLOSES='2026-10-10T15:59:59Z';
export const ENUMS={role:['owner','developer','other'],task:['launch','plans','auth','other'],frequency:['zero','one','two-plus'],timing:['14days','30days','later'],stack:['stripe-external','other','unknown'],budget:['299','discuss','no'],hours:['under1','1to3','over3','unknown']};
export const EVENTS=['view','price_seen','checklist_export','apply_open'];
export const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
export function validApplication(b){return Object.entries(ENUMS).every(([k,v])=>v.includes(b[k]))&&typeof b.email==='string'&&b.email.length<=254&&/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(b.email)&&b.consent===true&&uuid(b.receipt);}
export function qualified(b){return b.role==='owner'&&b.stack==='stripe-external'&&b.frequency==='two-plus'&&['14days','30days'].includes(b.timing)&&b.task!=='other'&&b.budget==='299';}
export async function hash(v){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v)))].map(x=>x.toString(16).padStart(2,'0')).join('');}
export async function ensure(db){
 await db.batch([
 db.prepare(`CREATE TABLE IF NOT EXISTS release_pilot_events (id TEXT PRIMARY KEY, session TEXT NOT NULL, event TEXT NOT NULL, source TEXT NOT NULL, lang TEXT NOT NULL, qa INTEGER NOT NULL, created TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE(session,event))`),
 db.prepare(`CREATE TABLE IF NOT EXISTS release_pilot_applications (id TEXT PRIMARY KEY, receipt_hash TEXT NOT NULL, payload_hash TEXT NOT NULL, rate_key TEXT NOT NULL, session TEXT NOT NULL, email TEXT NOT NULL, role TEXT NOT NULL, task TEXT NOT NULL, frequency TEXT NOT NULL, timing TEXT NOT NULL, stack TEXT NOT NULL, budget TEXT NOT NULL, hours TEXT NOT NULL, source TEXT NOT NULL, lang TEXT NOT NULL, qa INTEGER NOT NULL, qualified INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'new', created TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE(email,qa))`),
 db.prepare(`CREATE TABLE IF NOT EXISTS release_pilot_control (id INTEGER PRIMARY KEY, paused INTEGER NOT NULL DEFAULT 0)`),
 db.prepare('INSERT OR IGNORE INTO release_pilot_control(id,paused) VALUES (1,0)'),
 db.prepare('CREATE INDEX IF NOT EXISTS release_pilot_events_created ON release_pilot_events(created)'),
 db.prepare('CREATE INDEX IF NOT EXISTS release_pilot_applications_created ON release_pilot_applications(created)')]);
 await db.batch([db.prepare("DELETE FROM release_pilot_events WHERE created < datetime('now','-30 days')"),db.prepare("DELETE FROM release_pilot_applications WHERE created < datetime('now','-30 days')")]);
}
export async function smallJSON(request){const reader=request.body?.getReader();if(!reader)throw Error('empty');let n=0,parts=[];try{while(true){const {done,value}=await reader.read();if(done)break;n+=value.length;if(n>4096){await reader.cancel();throw Error('size');}parts.push(value);}}finally{reader.releaseLock();}const out=new Uint8Array(n);let at=0;for(const p of parts){out.set(p,at);at+=p.length;}return JSON.parse(new TextDecoder().decode(out));}

export async function payloadHash(b){return hash(JSON.stringify(['email','role','task','frequency','timing','stack','budget','hours','consent','source','lang','session','qa'].map(k=>[k,k==='email'?b.email.trim().toLowerCase():b[k]])));}
