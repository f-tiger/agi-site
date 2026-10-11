import {withFleetAccount} from '../../tools/fleet-account/edge.mjs';
import {isAnalyticsPath,analyticsResponse} from '../../tools/fleet-analytics/edge.mjs';
import {withAggregateCache} from '../../tools/fleet-reporting/cache.mjs';
import {secConcept} from './sec-api.mjs';
import discovery from '../../tools/discovery/content.json' with {type:'json'};
import {schema} from './schema.mjs';
import experiments from './experiments.json' with {type:'json'};
const ready=new WeakMap(),pruned=new WeakMap();
async function initialize(db){if(!ready.has(db))ready.set(db,db.batch(schema.map(sql=>db.prepare(sql))).catch(e=>{ready.delete(db);throw e;}));await ready.get(db);const today=new Date().toISOString().slice(0,10);if(pruned.get(db)!==today){for(const table of ["venture_events","filinglens_events"])await db.prepare(`DELETE FROM ${table} WHERE day < date('now','-34 days')`).run();pruned.set(db,today);}}
const routes=new Map(Object.entries(experiments).map(([id,x])=>[x.host,id]));
const events=new Set(['visit','start','complete','export','rfq_export','offer','interest','research_none','research_once','research_repeat','agent_start','agent_complete','agent_export','agent_draft','agent_download','agent_interest','agent_none','agent_once','agent_repeat']);
const sources=new Set(['direct','bpj','learn','eco','agi','search','ai','community','social','example']);
const modes=new Set(['own','sample','exercise','qa']);
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const pulseResponse=(request,data,status=200)=>new Response(request.method==='HEAD'?null:JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':status===200?'public, max-age=3600':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex'}});
const dayOffset=(day,offset)=>new Date(Date.parse(day+'T00:00:00Z')+offset*86400000).toISOString().slice(0,10);
function aggregateRows(rows){const grouped=new Map();for(const {mode,event,source,visit_events} of rows){const key=JSON.stringify([mode,event,source]);const row=grouped.get(key)||{mode,event,source,visit_events:0};row.visit_events+=visit_events;grouped.set(key,row);}return [...grouped.values()].sort((a,b)=>a.mode.localeCompare(b.mode)||a.event.localeCompare(b.event)||a.source.localeCompare(b.source));}
async function readPulse(db,site,table){
 const generated=new Date().toISOString(),today=generated.slice(0,10),start=dayOffset(today,-28),legacyStart=dayOffset(today,-27);
 // Public report reads never initialize, prune or otherwise mutate measurement data.
 const result=await db.prepare(`SELECT day,mode,event,source,COUNT(*) AS visit_events FROM ${table} WHERE site=? AND day >= ? AND day <= ? AND mode IN ('own','sample','exercise') GROUP BY day,mode,event,source ORDER BY day,mode,event,source`).bind(site,start,today).all();
 if(result.success===false||!Array.isArray(result.results))throw Error('Measurement unavailable');
 const daily=result.results.filter(row=>row.day<today),partial=result.results.filter(row=>row.day===today);
 return {site,generated,timezone:'UTC',days:28,metric:'anonymous opt-in events; not people, customers, orders or revenue',window:{start,end:today,days:28,complete:true,end_exclusive:true},daily,complete_rows:aggregateRows(daily),today:{date:today,partial:true,through:generated,rows:aggregateRows(partial)},legacy_window:{start:legacyStart,end:generated,days:28,complete:false,includes_today:true,description:'rows covers 27 complete UTC days and the current partial UTC day'},rows:aggregateRows(result.results.filter(row=>row.day>=legacyStart))};
}
async function body(request){const reader=request.body?.getReader();if(!reader)throw Error('body');let size=0,chunks=[];try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>512)throw Error('size');chunks.push(value);}}finally{await reader.cancel();}return JSON.parse(new TextDecoder().decode(Uint8Array.from(chunks.flatMap(x=>[...x]))));}
const fleetWrappedWorker = {
 async fetch(request,env){const url=new URL(request.url),site=routes.get(url.hostname);if(!site)return new Response('Not found',{status:404});if(isAnalyticsPath(url.pathname))return analyticsResponse(request,env,site);const table=site==='filinglens'?'filinglens_events':'venture_events';
 if(url.pathname==='/api/sec-concept')return site==='filinglens'?secConcept(request,env):json({error:'Not found'},404);
 if(url.pathname==='/api/config')return json({site,price:experiments[site].proposed_price,sales_enabled:false,measurement:!!env.DB});
 if(url.pathname==='/api/pulse'){
  if(!['GET','HEAD'].includes(request.method))return pulseResponse(request,{error:'Method not allowed'},405);
  return withAggregateCache(request,async readRequest=>{
   if(!env.DB)return pulseResponse(readRequest,{site,error:'Measurement unavailable'},503);
   try{return pulseResponse(readRequest,await readPulse(env.DB,site,table));}catch{return pulseResponse(readRequest,{site,error:'Measurement unavailable'},503);}
  });
 }
 if(url.pathname==='/api/event'){
  if(request.method!=='POST')return json({error:'Method not allowed'},405);
  if(request.headers.get('Origin')!==url.origin||!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'Same-origin JSON required'},403);
  let d;try{d=await body(request);}catch{return json({error:'Invalid event body'},400);}
  if(!d||typeof d!=='object'||Array.isArray(d))return json({error:'Invalid event'},400);
  if(d.consent!==true||!events.has(d.event)||!modes.has(d.mode)||!sources.has(d.source)||!/^[0-9a-f-]{36}$/.test(d.session||'')||Object.keys(d).some(k=>!['consent','event','mode','source','session'].includes(k)))return json({error:'Invalid event'},400);
  if(!env.DB||!env.EVENT_LIMIT)return json({error:'Measurement unavailable'},503);
  const rate=await env.EVENT_LIMIT.limit({key:site+':'+d.session});if(!rate.success)return json({error:'Please try later'},429);
  const day=new Date().toISOString().slice(0,10);
  try{await initialize(env.DB);await env.DB.prepare(`INSERT OR IGNORE INTO ${table}(day,site,event,mode,source,session) SELECT ?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM ${table} WHERE day=? AND site=?) < 5000`).bind(day,site,d.event,d.mode,d.source,d.session,day,site).run();const present=await env.DB.prepare(`SELECT 1 AS recorded FROM ${table} WHERE day=? AND site=? AND event=? AND mode=? AND session=?`).bind(day,site,d.event,d.mode,d.session).first();if(!present)return json({error:'Measurement capacity reached'},503);return json({recorded:true});}catch{return json({error:'Measurement temporarily unavailable'},503);}
 }
 if(url.pathname.startsWith('/api/'))return json({error:'Not found'},404);
 if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});
 const guideSlugs=discovery.pages.filter(p=>p.site===site).map(p=>'/'+p.slug);
 const requestedGuide=url.pathname.replace(/\.html$/,'').replace(/\/$/,'');
 if(guideSlugs.includes(requestedGuide)&&requestedGuide!==url.pathname)return Response.redirect(url.origin+requestedGuide+url.search,301);
 if(['/index.html','/guide.html','/privacy.html','/guide/','/privacy/','/agent.html','/agent-guide.html','/agent/','/agent-guide/'].includes(url.pathname)){const dest=url.pathname.replace(/index\.html$/,'').replace(/\.html$/,'').replace(/\/$/,'')||'/';return Response.redirect(url.origin+dest+url.search,301);}
 // Map only declared public assets. No cross-host files or build internals are exposed.
 const path=url.pathname==='/'?'/index.html':['/guide','/privacy','/agent','/agent-guide',...guideSlugs].includes(url.pathname)?url.pathname+'.html':url.pathname;
 const guideAsset=guideSlugs.includes(url.pathname);
 const publicFile=/^\/(?:discovery\.(?:css|mjs)|acquisition\.mjs|social\.png|llms\.txt|feed\.xml|[a-f0-9]{32}\.txt)$/.test(path)||discovery.pages.some(p=>p.site===site&&path==='/examples/'+p.download);
 if(!guideAsset&&!publicFile&&!/^\/(?:index\.html|guide\.html|privacy\.html|agent(?:-guide)?\.html|agent\.css|agent-app\.mjs|tables-app\.mjs|filing-engine\.mjs|filinglens-NOTICES\.txt|filing\.css|agent-example\.json|tradecheck\.js|tradecheck-NOTICES\.txt|downloads\/(?:tradecheck-mcp-0\.2\.0\.tar\.gz|filinglens-mcp-0\.1\.0\.tar\.gz|SHA256SUMS)|app\.mjs|onboarding\.mjs|fonts\/manrope-latin-wght-normal\.woff2|fonts\/LICENSE|styles\.css|core\.mjs|ui\.mjs|robots\.txt|sitemap\.xml|project\.mjs|sql-worker\.js|vendor\/sql-wasm\.(?:js|wasm)|vendor\/LICENSE)$/.test(path))return new Response('Not found',{status:404});
 const assetURL=new URL(url.origin+'/'+site+path);let response=await env.ASSETS.fetch(new Request(assetURL,{method:request.method}));response=new Response(response.body,response);response.headers.set('Content-Security-Policy',"default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self'; frame-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");response.headers.set('X-Content-Type-Options','nosniff');response.headers.set('Referrer-Policy','no-referrer');if(path.startsWith('/examples/')){response.headers.set('X-Robots-Tag','noindex');response.headers.set('Content-Disposition','attachment');}
 response.headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=()');return response;
 },
 async scheduled(_event,env){if(!env.DB)return;await initialize(env.DB);for(const table of ["venture_events","filinglens_events"])await env.DB.prepare(`DELETE FROM ${table} WHERE day < date('now','-34 days')`).run();}
};

export default withFleetAccount(fleetWrappedWorker);
