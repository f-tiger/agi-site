import {VERSION,MODEL,MAX_RUNS,inputOf} from '../../jarvis-assets/core.mjs';
import {bodyOf} from '../create/server.mjs';
import {hash,now,limit} from '../create/store.mjs';
import {ensure,owned,publicTask} from './store.mjs';
import {execute,tick} from './engine.mjs';
import {runTool} from './sources.mjs';
export {tick};
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'"};
const json=(data,status=200)=>Response.json(data,{status,headers});
const idOK=s=>/^[a-f0-9]{32}$/.test(s||'');
export async function jarvisRoute(request,env,ctx){
 const u=new URL(request.url);if(!['/api/jarvis','/api/jarvis/tasks','/api/jarvis/run'].includes(u.pathname))return null;
 if(!['agiscorecard.com','www.agiscorecard.com','localhost','127.0.0.1'].includes(u.hostname))return json({ok:false,code:'origin'},403);
 if(request.method==='GET'&&u.pathname==='/api/jarvis')return json({ok:true,version:VERSION,model:MODEL,aiBound:!!env.AI,sharedAttemptsPer24h:12,ipAttemptsPerWindow:3,maxModelCallsPerNewRun:1,maxModelCallsPerRun:2,maxRuns:MAX_RUNS,backgroundIntervalMinutes:120,retentionDays:30,mode:'research_pilot',paid:false});
 if(!['GET','POST'].includes(request.method))return json({ok:false,code:'method'},405);
 if(request.method==='POST'&&(request.headers.get('origin')!==u.origin||request.headers.get('Sec-Fetch-Site')==='cross-site'))return json({ok:false,code:'origin'},403);
 try{
  const token=(request.headers.get('authorization')||'').replace(/^Bearer /,'');if(!/^[a-f0-9]{64}$/.test(token))throw Error('unauthorized');
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
  await ensure(db);const owner=await hash('jarvis-owner:v1:'+token);
  const ip=await hash(env.MEMBER_WATCH_SECRET+':relay:'+new Date().toISOString().slice(0,10)+':'+(request.headers.get('CF-Connecting-IP')||'unknown'));
  await limit(db,'jarvis-request:'+ip,60,60);
  if(request.method==='GET'){
   const rows=(await db.prepare('SELECT * FROM jarvis_tasks WHERE owner=? AND expires>? ORDER BY created DESC LIMIT 20').bind(owner,now()).all()).results;
   return json({ok:true,tasks:rows.map(publicTask)});
  }
  const b=await bodyOf(request);
  if(b.action==='create'){
   const input=inputOf(b);const existing=await db.prepare('SELECT * FROM jarvis_tasks WHERE owner=? AND nonce=? AND expires>?').bind(owner,input.nonce,now()).first();
   if(existing)return json({ok:true,task:publicTask(existing),reused:true});
   await limit(db,'jarvis-create-ip:'+ip,3);await limit(db,'jarvis-create-global',24);
   const id=crypto.randomUUID().replaceAll('-',''),t=now();
   const inserted=await db.prepare(`INSERT OR IGNORE INTO jarvis_tasks(id,owner,nonce,ip_key,input,status,created,updated,next_run,until_at,expires) SELECT ?,?,?,?,?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM jarvis_tasks WHERE owner=? AND expires>? AND status IN ('queued','running','watching'))<3 AND (SELECT COUNT(*) FROM jarvis_tasks WHERE owner=? AND expires>?)<20 RETURNING id`).bind(id,owner,input.nonce,ip,JSON.stringify(input),'queued',t,t,t,t+7*86400,t+30*86400,owner,t,owner,t).first();
   if(!inserted){const prior=await db.prepare('SELECT * FROM jarvis_tasks WHERE owner=? AND nonce=? AND expires>?').bind(owner,input.nonce,t).first();if(prior)return json({ok:true,task:publicTask(prior),reused:true});throw Error('active_limit');}
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
   if(task.status==='running'||task.status==='queued'||task.runs>=MAX_RUNS||task.until_at<=now())throw Error('cannot_resume');
   await limit(db,'jarvis-resume:'+owner,3);
   await db.prepare("UPDATE jarvis_tasks SET status='queued',stage='queued',next_run=?,updated=? WHERE id=? AND owner=?").bind(now(),now(),b.id,owner).run();
   if(ctx?.waitUntil)ctx.waitUntil(execute(db,env,b.id,{interactive:true}).catch(()=>{}));return json({ok:true},202);
  }
  if(b.action==='feedback'){
   if(!['useful','not_useful'].includes(b.value))throw Error('invalid_request');await db.prepare('UPDATE jarvis_tasks SET feedback=? WHERE id=? AND owner=?').bind(b.value,b.id,owner).run();return json({ok:true});
  }throw Error('invalid_request');
 }catch(e){const codes={unauthorized:401,unavailable:503,invalid_request:400,too_large:413,not_found:404,rate_limited:429,active_limit:409,cannot_resume:409};return json({ok:false,code:Object.hasOwn(codes,e.message)?e.message:'unavailable'},codes[e.message]||503);}
}
