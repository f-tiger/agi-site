import {VERSION,MODEL,MAX_RUNS,inputOf} from '../../jarvis-assets/core.mjs';
import {bodyOf} from './security.mjs';
import {hash,now,limit} from '../create/store.mjs';
import {ensure,owned,publicTask,trialReceipt,trialRemaining,guestRunAllowed} from './store.mjs';
import {execute,tick} from './engine.mjs';
import {runTool} from './sources.mjs';
import {resolveAccess} from './membership.mjs';
export {tick};
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'"};
const json=(data,status=200)=>Response.json(data,{status,headers});
const idOK=s=>typeof s==='string'&&/^[a-f0-9]{32}$/.test(s);
export async function jarvisRoute(request,env,ctx){
 const u=new URL(request.url);if(!['/api/jarvis','/api/jarvis/tasks','/api/jarvis/run'].includes(u.pathname))return null;
 if(!['agiscorecard.com','www.agiscorecard.com','localhost','127.0.0.1'].includes(u.hostname))return json({ok:false,code:'origin'},403);
 if(request.method==='GET'&&u.pathname==='/api/jarvis')return json({ok:true,version:VERSION,model:MODEL,aiBound:!!env.AI,sharedAttemptsPer24h:12,ipAttemptsPerWindow:3,maxModelCallsPerNewRun:1,maxModelCallsPerRun:2,maxRuns:MAX_RUNS,backgroundIntervalMinutes:120,retentionDays:30,mode:'research_pilot',paid:false,membershipRequired:false,registrationRequiredAfterTrial:true,guestTasks:1,guestIpTrialWindowHours:24,membershipSite:'agi'});
 if(!['GET','POST'].includes(request.method))return json({ok:false,code:'method'},405);
 if(request.method==='POST'&&(request.headers.get('origin')!==u.origin||request.headers.get('Sec-Fetch-Site')==='cross-site'))return json({ok:false,code:'origin'},403);
 try{
  const token=/^Bearer ([a-f0-9]{64})$/i.exec(request.headers.get('authorization')||'')?.[1];if(!token||token!==token.toLowerCase())throw Error('unauthorized');
  const db=env.EVENTS;if(!db||!env.MEMBER_WATCH_SECRET)throw Error('unavailable');
  if(u.pathname==='/api/jarvis/run'){
   const expected=await hash(env.MEMBER_WATCH_SECRET+':jarvis-runner:v1');if(await hash(token)!==await hash(expected))throw Error('unauthorized');
   if(request.method==='GET')return json({ok:true,version:VERSION,runner:'bounded_private_queue',maxTasksPerRequest:1});
   await ensure(db);await limit(db,'jarvis-runner',4,60);
   if(request.headers.get('content-type')?.includes('application/json')){
    const b=await bodyOf(request);if(b.action!=='verify_sources')throw Error('invalid_request');
    const checks=[];
    for(const tool of ['github_search','hackernews_search']){try{const rows=await runTool({tool},{web:true,publicQuery:'AI agents'},env.JARVIS_FETCH||fetch);checks.push({tool,ok:rows.length>0,count:rows.length});}catch(e){checks.push({tool,ok:false,code:/^source_[a-z_\d]+$/.test(e.message)?e.message:'source_unavailable'});}}
    return json({ok:true,version:VERSION,checks,modelCalls:0});
   }
   return json(await tick(env,{maxTasks:1}));
  }
  await ensure(db);
  const ip=await hash(env.MEMBER_WATCH_SECRET+':relay:'+new Date().toISOString().slice(0,10)+':'+(request.headers.get('CF-Connecting-IP')||'unknown'));
  await limit(db,'jarvis-request:'+ip,60,60);
  const member=await resolveAccess(env,token),owner=member.owner;
  const trialIP=await hash(env.MEMBER_WATCH_SECRET+':jarvis-trial-ip:v1:'+(request.headers.get('CF-Connecting-IP')||'unknown'));
  if(!member.id)await trialReceipt(db,owner);
  // A valid member may recover this browser's old private records, never start
  // them implicitly. The old capability is separate from the membership key.
  const legacy=request.headers.get('x-jarvis-legacy-key');
  if(member.id&&typeof legacy==='string'&&/^[a-f0-9]{64}$/.test(legacy)){
   const guestOwner=await hash('jarvis-owner:v1:'+legacy);await trialReceipt(db,guestOwner);
   await db.prepare("UPDATE OR IGNORE jarvis_tasks SET owner=?,member_id=?,status=CASE WHEN status IN ('queued','running','watching') THEN 'paused' ELSE status END,stage=CASE WHEN status IN ('queued','running','watching') THEN 'registration_required' ELSE stage END,next_run=0,lease='',lease_until=0,updated=? WHERE owner=? AND member_id='' AND expires>?").bind(owner,member.id,now(),guestOwner,now()).run();
  }
  if(request.method==='GET'){
   const rows=(await db.prepare('SELECT * FROM jarvis_tasks WHERE owner=? AND expires>? ORDER BY created DESC LIMIT 20').bind(owner,now()).all()).results;
   return json({ok:true,tasks:rows.map(publicTask),membership:{endsAt:member.endsAt,scope:owner,member:!!member.id,trialRemaining:member.id?null:await trialRemaining(db,owner,trialIP)}});
  }
  const b=await bodyOf(request);
  if((await resolveAccess(env,token)).owner!==owner)throw Error('unauthorized');
  if(b.action==='create'){
   const input=inputOf(b);const existing=await db.prepare('SELECT * FROM jarvis_tasks WHERE owner=? AND nonce=? AND expires>?').bind(owner,input.nonce,now()).first();
   if(existing)return json({ok:true,task:publicTask(existing),reused:true});
   if(!member.id&&(input.cadence!=='once'||!await trialRemaining(db,owner,trialIP))){
    const raced=await db.prepare('SELECT * FROM jarvis_tasks WHERE owner=? AND nonce=? AND expires>?').bind(owner,input.nonce,now()).first();
    if(raced)return json({ok:true,task:publicTask(raced),reused:true});
    throw Error('registration_required');
   }
   await limit(db,'jarvis-create-ip:'+ip,3);await limit(db,'jarvis-create-global',24);
   const id=crypto.randomUUID().replaceAll('-',''),t=now();
   const inserted=await db.prepare(`INSERT OR IGNORE INTO jarvis_tasks(id,owner,member_id,nonce,ip_key,trial_ip_key,input,status,created,updated,next_run,until_at,expires) SELECT ?,?,?,?,?,?,?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM jarvis_tasks WHERE owner=? AND expires>? AND status IN ('queued','running','watching'))<3 AND (SELECT COUNT(*) FROM jarvis_tasks WHERE owner=? AND expires>?)<20 AND (?<>'' OR (NOT EXISTS(SELECT 1 FROM jarvis_trials WHERE owner=?) AND NOT EXISTS(SELECT 1 FROM jarvis_trial_ips WHERE k=? AND expires>?))) RETURNING id`).bind(id,owner,member.id,input.nonce,ip,member.id?'':trialIP,JSON.stringify(input),'queued',t,t,t,t+7*86400,t+30*86400,owner,t,owner,t,member.id,owner,trialIP,t).first();
   if(!inserted){const prior=await db.prepare('SELECT * FROM jarvis_tasks WHERE owner=? AND nonce=? AND expires>?').bind(owner,input.nonce,t).first();if(prior)return json({ok:true,task:publicTask(prior),reused:true});if(!member.id&&!await trialRemaining(db,owner,trialIP))throw Error('registration_required');throw Error('active_limit');}
   const task=publicTask(await owned(db,owner,id));
   // Durable state is committed before the response; the scheduled handler picks up queued work.
   if(ctx?.waitUntil)ctx.waitUntil(execute(db,env,id,{interactive:true}).catch(()=>{}));
   return json({ok:true,task},202);
  }
  if(!idOK(b.id))throw Error('invalid_request');const task=await owned(db,owner,b.id);if(!task)throw Error('not_found');
  if(b.action==='delete'){await db.prepare('DELETE FROM jarvis_tasks WHERE id=? AND owner=?').bind(b.id,owner).run();return json({ok:true});}
  if(b.action==='pause'){
   await db.prepare("UPDATE jarvis_tasks SET status='paused',stage='paused',next_run=0,lease='',lease_until=0,updated=? WHERE id=? AND owner=?").bind(now(),b.id,owner).run();return json({ok:true});
  }
  if(b.action==='resume'){
   if(!member.id&&!await guestRunAllowed(db,task))throw Error('registration_required');
   if(!['paused','limited','completed'].includes(task.status)||task.runs>=MAX_RUNS||task.until_at<=now())throw Error('cannot_resume');
   await limit(db,'jarvis-resume:'+owner,3);
   const t=now();
   const saved=JSON.parse(task.result);
   // v6 checkpoints marked continuation only on an intentional yield. Preserve
   // their saved work too when an occurrence has not reached a terminal stage.
   if(saved.plan&&!saved.continuation&&/^jarvis-20261003-[1-6]$/.test(saved.version||'')&&!['complete','source_pack'].includes(task.stage)&&!saved.report&&!saved.reason){
    saved.continuation=true;
    if(saved.modelCalls>0)saved.synthesisStarted=true;
   }
   // Authorization, state transition and active-count admission are one SQL write.
   const resumed=await db.prepare(`UPDATE jarvis_tasks SET status='queued',stage='queued',result=?,next_run=?,updated=?,lease='',lease_until=0 WHERE id=? AND owner=? AND result=? AND status IN ('paused','limited','completed') AND runs<? AND until_at>? AND expires>? AND (SELECT COUNT(*) FROM jarvis_tasks WHERE owner=? AND expires>? AND status IN ('queued','running','watching'))<3 RETURNING id`).bind(JSON.stringify(saved),t,t,b.id,owner,task.result,MAX_RUNS,t,t,owner,t).first();
   if(!resumed){const count=await db.prepare("SELECT COUNT(*) n FROM jarvis_tasks WHERE owner=? AND expires>? AND status IN ('queued','running','watching')").bind(owner,t).first();throw Error(count.n>=3?'active_limit':'cannot_resume');}
   if(ctx?.waitUntil)ctx.waitUntil(execute(db,env,b.id,{interactive:true}).catch(()=>{}));return json({ok:true},202);
  }
  if(b.action==='feedback'){
   if(!['useful','not_useful','not_useful_sources','not_useful_answer','not_useful_action','not_useful_other'].includes(b.value))throw Error('invalid_request');await db.prepare('UPDATE jarvis_tasks SET feedback=? WHERE id=? AND owner=?').bind(b.value,b.id,owner).run();return json({ok:true});
  }throw Error('invalid_request');
 }catch(e){const codes={unauthorized:401,access_blocked:403,registration_required:403,unavailable:503,invalid_request:400,too_large:413,request_timeout:408,not_found:404,rate_limited:429,active_limit:409,cannot_resume:409};return json({ok:false,code:Object.hasOwn(codes,e.message)?e.message:'unavailable'},codes[e.message]||503);}
}
