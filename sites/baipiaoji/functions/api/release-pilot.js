import {OFFER,CLOSES,EVENTS,uuid,validApplication,qualified,hash,ensure,smallJSON,payloadHash} from '../../lib/release-pilot.js';
const json=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex','X-Content-Type-Options':'nosniff'}});
export async function onRequest({request,env}){
 const u=new URL(request.url);
 if(request.method==='GET'){try{if(!env.HITS||String(env.ADS_WATCH_SECRET||'').length<32)throw Error();await ensure(env.HITS);const control=await env.HITS.prepare('SELECT paused FROM release_pilot_control WHERE id=1').first();return json({offer:OFFER,closes:CLOSES,accepting:!control.paused&&Date.now()<Date.parse(CLOSES),checkout:false,ready:true});}catch{return json({offer:OFFER,accepting:false,checkout:false,ready:false},503);}}
 if(request.method!=='POST')return json({ok:false,code:'method'},405);
 if(request.headers.get('Origin')!==u.origin)return json({ok:false,code:'origin'},403);
 if(!/^application\/json(?:;|$)/i.test(request.headers.get('Content-Type')||''))return json({ok:false,code:'type'},415);
 let b;try{b=await smallJSON(request);}catch{return json({ok:false,code:'invalid'},400);}
 if(!b||Array.isArray(b)||typeof b!=='object')return json({ok:false,code:'invalid'},400);
 if(!env.HITS)return json({ok:false,code:'unavailable'},503);
 try{
  // Operator reads are authenticated and never returned from public GET. No PII in CI reports.
  if(['stats','list','review','pause'].includes(b.action)){
   const secret=String(env.ADS_WATCH_SECRET||'');const token=(request.headers.get('Authorization')||'').replace(/^Bearer /,'');
   if(secret.length<32)return json({ok:false,code:'unavailable'},503);
   if(token.length>512||await hash(secret)!==await hash(token))return json({ok:false,code:'auth'},401);
   await ensure(env.HITS);
   if(b.action==='pause'){if(typeof b.paused!=='boolean')return json({ok:false},400);await env.HITS.prepare('UPDATE release_pilot_control SET paused=? WHERE id=1').bind(Number(b.paused)).run();return json({ok:true,paused:b.paused});}
   if(b.action==='review'){if(!uuid(b.id)||!['new','reviewed','rejected','invite_ready'].includes(b.status))return json({ok:false},400);await env.HITS.prepare('UPDATE release_pilot_applications SET status=? WHERE id=? AND qa=0').bind(b.status,b.id).run();return json({ok:true});}
   if(b.action==='list'){const rows=await env.HITS.prepare("SELECT id,email,role,task,frequency,timing,stack,budget,hours,source,lang,qualified,status,created FROM release_pilot_applications WHERE qa=0 ORDER BY created DESC LIMIT 50").all();return json({ok:true,applications:rows.results});}
   const events=await env.HITS.prepare('SELECT event,source,lang,qa,COUNT(*) n FROM release_pilot_events GROUP BY event,source,lang,qa').all();
   const applications=await env.HITS.prepare('SELECT qa,qualified,budget,status,COUNT(*) n FROM release_pilot_applications GROUP BY qa,qualified,budget,status').all();
   const cohort=await env.HITS.prepare("SELECT COUNT(*) applications, SUM(CASE WHEN EXISTS(SELECT 1 FROM release_pilot_events e WHERE e.session=a.session AND e.event='price_seen' AND e.qa=0) THEN 1 ELSE 0 END) price_linked, SUM(CASE WHEN status='new' AND created < datetime('now','-2 days') THEN 1 ELSE 0 END) stale_new FROM release_pilot_applications a WHERE qa=0").first();
   return json({ok:true,offer:OFFER,window_days:30,events:events.results,applications:applications.results,cohort,unit:'Pseudonymous sessions and email-deduplicated unverified applications; not verified people, paid orders or revenue',checkout:false});
  }
  if(b.action==='withdraw'||b.action==='confirm'){
   if(!uuid(b.id)||!uuid(b.receipt))return json({ok:false,code:'invalid'},400);
   await ensure(env.HITS);if(b.action==='confirm'){const row=await env.HITS.prepare('SELECT id FROM release_pilot_applications WHERE id=? AND receipt_hash=?').bind(b.id,await hash(b.receipt)).first();return json({ok:true,saved:!!row});}await env.HITS.prepare('DELETE FROM release_pilot_applications WHERE id=? AND receipt_hash=?').bind(b.id,await hash(b.receipt)).run();return json({ok:true,code:'withdrawn'});
  }
  await ensure(env.HITS);const control=await env.HITS.prepare('SELECT paused FROM release_pilot_control WHERE id=1').first();
  if(control.paused||Date.now()>=Date.parse(CLOSES))return json({ok:false,code:'closed'},410);
  if(!uuid(b.session)||!uuid(b.id)||b.offer!==OFFER||!['en','zh'].includes(b.lang)||!['direct','coding','studio'].includes(b.source)||typeof b.qa!=='boolean')return json({ok:false,code:'invalid'},400);
  const qa=b.qa||u.searchParams.has('qa')||/bpj-ci|selftest|playwright|headless/i.test(request.headers.get('User-Agent')||'');
  if(b.action==='event'&&!EVENTS.includes(b.event))return json({ok:false,code:'invalid'},400);
  if(b.action==='apply'&&!validApplication(b))return json({ok:false,code:'invalid'},400);
  if(!['apply','event'].includes(b.action))return json({ok:false,code:'invalid'},400);
  if(b.action==='event'){
   await env.HITS.prepare("INSERT OR IGNORE INTO release_pilot_events(id,session,event,source,lang,qa) SELECT ?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM release_pilot_events WHERE created >= date('now')) < 5000").bind(b.id,b.session,b.event,b.source,b.lang,Number(qa)).run();
   const saved=await env.HITS.prepare('SELECT id FROM release_pilot_events WHERE session=? AND event=?').bind(b.session,b.event).first();return json({ok:!!saved},saved?200:429);
  }
  if(String(env.ADS_WATCH_SECRET||'').length<32)return json({ok:false,code:'unavailable'},503);
  const ip=request.headers.get('CF-Connecting-IP');if(!ip)return json({ok:false,code:'unavailable'},503);
  const rateKey=await hash(env.ADS_WATCH_SECRET+'|'+new Date().toISOString().slice(0,10)+'|'+ip);
  const rh=await hash(b.receipt),ph=await payloadHash(b);
  const prior=await env.HITS.prepare('SELECT receipt_hash,payload_hash FROM release_pilot_applications WHERE id=?').bind(b.id).first();
  if(prior)return prior.receipt_hash===rh&&prior.payload_hash===ph?json({ok:true,code:'saved',checkout:false}):json({ok:false,code:'conflict'},409);
  const duplicate=await env.HITS.prepare('SELECT id FROM release_pilot_applications WHERE (email=? OR session=?) AND qa=?').bind(b.email.trim().toLowerCase(),b.session,Number(qa)).first();
  if(duplicate)return json({ok:false,code:'duplicate'},409);
  await env.HITS.prepare("INSERT OR IGNORE INTO release_pilot_applications(id,receipt_hash,payload_hash,rate_key,session,email,role,task,frequency,timing,stack,budget,hours,source,lang,qa,qualified) SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM release_pilot_applications WHERE created >= date('now') AND qa=?) < ? AND (SELECT COUNT(*) FROM release_pilot_applications WHERE rate_key=? AND qa=?) < ?").bind(b.id,rh,ph,rateKey,b.session,b.email.trim().toLowerCase(),b.role,b.task,b.frequency,b.timing,b.stack,b.budget,b.hours,b.source,b.lang,Number(qa),Number(qualified(b)),Number(qa),qa?10:50,rateKey,Number(qa),qa?10:5).run();
  const saved=await env.HITS.prepare('SELECT id FROM release_pilot_applications WHERE id=? AND receipt_hash=?').bind(b.id,rh).first();
  return json({ok:!!saved,code:saved?'saved':'capacity',offer:OFFER,checkout:false},saved?200:429);
 }catch{return json({ok:false,code:'unavailable'},503);}
}
