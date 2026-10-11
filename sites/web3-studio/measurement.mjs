import {channels,campaigns,events,pageNames} from './public/attribution.mjs';
import {aggregateWindow,aggregateResponse,unavailableAggregate,aggregateErrorReason,selectRows,splitDaily,sqlTime} from './aggregate-read.mjs';
const json=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex'}});
export function eventShape(v){return v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join(',')==='campaign,channel,consent,event,id,page,qa'&&typeof v.id==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v.id)&&v.consent===true&&typeof v.qa==='boolean'&&channels.includes(v.channel)&&campaigns.includes(v.campaign)&&events.includes(v.event)&&pageNames.includes(v.page);}
export async function measurementSetup(db){
 await db.prepare('CREATE TABLE IF NOT EXISTS web3_studio_events (id TEXT PRIMARY KEY,site TEXT NOT NULL,page TEXT NOT NULL,channel TEXT NOT NULL,campaign TEXT NOT NULL,event TEXT NOT NULL,qa INTEGER NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)').run();
 await db.prepare('CREATE INDEX IF NOT EXISTS web3_studio_events_window ON web3_studio_events (created_at,site,qa)').run();
 await db.prepare("DELETE FROM web3_studio_events WHERE created_at < datetime('now','-35 days')").run();
}
export async function measurement(request,env,site){
 const u=new URL(request.url);
 if(u.pathname==='/api/growth'){
  if(request.method!=='GET'&&request.method!=='HEAD')return aggregateResponse(request,{error:'GET required'},405);
  if([...u.searchParams.keys()].some(k=>k!=='qa')||u.searchParams.getAll('qa').length>1||u.searchParams.has('qa')&&!['0','1'].includes(u.searchParams.get('qa')))return aggregateResponse(request,{error:'Invalid filter'},400);
  const window=aggregateWindow(),qa=u.searchParams.get('qa')==='1'?1:0;
  if(!env.DB)return unavailableAggregate(request,window,'database_unavailable');
  try{
   const scope=site==='hub'?'':' AND site=?',scopeArgs=site==='hub'?[]:[site];
   const groups=await selectRows(env.DB,"SELECT site,page,channel,campaign,event,COUNT(*) AS events FROM web3_studio_events WHERE qa=? AND created_at>=? AND created_at<?"+scope+' GROUP BY site,page,channel,campaign,event',[qa,sqlTime(window.groups.start),sqlTime(window.groups.end),...scopeArgs]);
   const rows=await selectRows(env.DB,"SELECT date(created_at) AS date,site,event,COUNT(*) AS events FROM web3_studio_events WHERE qa=? AND created_at>=? AND created_at<?"+scope+' GROUP BY date(created_at),site,event ORDER BY date,site,event',[qa,sqlTime(window.daily.start),sqlTime(window.today.end),...scopeArgs]);
   return aggregateResponse(request,{status:'ok',generatedAt:window.generatedAt,asOf:window.generatedAt,timezone:'UTC',window,windowDays:28,qa:!!qa,scope:{site,allSites:site==='hub'},measurement:'Opt-in event counts, deduplicated by event ID. Not unique people or a cross-domain session funnel. Incoming attribution is unverified; stripped referrers appear direct. Default examples, probes and MCP requests do not generate events.',metrics:{events:{unit:'events',identity:'not_unique_people'},dailyRows:'Sparse UTC date/site/event groups; today is partial. QA is selected separately by ?qa=1.'},groups,...splitDaily(rows,window),outcomes:{indexedPages:null,verifiedBacklinks:null,aiCitations:null,payingCustomers:null,revenue:null}},200,{qa:!!qa});
  }catch(error){return unavailableAggregate(request,window,aggregateErrorReason(error));}
 }
 if(!env.DB)return json({error:'Measurement unavailable'},503);
 if(request.method!=='POST')return json({error:'POST required'},405);
 if(request.headers.get('Origin')!==u.origin)return json({error:'Origin rejected'},403);
 if(!/^application\/json(?:;|$)/i.test(request.headers.get('Content-Type')||''))return json({error:'JSON required'},415);
 if(!env.MEASURE_LIMIT)return json({error:'Measurement unavailable'},503);
 if(!(await env.MEASURE_LIMIT.limit({key:'measure:'+(request.headers.get('CF-Connecting-IP')||'unknown')})).success)return json({error:'Rate limited'},429);
 let value;try{
  const reader=request.body?.getReader();if(!reader)throw Error();let size=0,s='';const decoder=new TextDecoder('utf-8',{fatal:true});
  while(true){const x=await reader.read();if(x.done)break;size+=x.value.length;if(size>1024){await reader.cancel();throw Error();}s+=decoder.decode(x.value,{stream:true});}s+=decoder.decode();value=JSON.parse(s);
 }catch{return json({error:'Invalid body'},400);}
 if(!eventShape(value))return json({error:'Invalid event'},400);
 if(/bot|crawler|spider|headless|healthcheck|smoke|probe|curl|python|node/i.test(request.headers.get('User-Agent')||'')&&!value.qa)return json({accepted:false,reason:'Automated request excluded'});
 await measurementSetup(env.DB);
 await env.DB.prepare('INSERT OR IGNORE INTO web3_studio_events (id,site,page,channel,campaign,event,qa) VALUES (?,?,?,?,?,?,?)').bind(value.id,site,value.page,value.channel,value.campaign,value.event,value.qa?1:0).run();return json({accepted:true});
}
