import {schema} from './schema.mjs';
import experiments from './experiments.json' with {type:'json'};
const ready=new WeakMap(),pruned=new WeakMap();
async function initialize(db){if(!ready.has(db))ready.set(db,db.batch(schema.map(sql=>db.prepare(sql))).catch(e=>{ready.delete(db);throw e;}));await ready.get(db);const today=new Date().toISOString().slice(0,10);if(pruned.get(db)!==today){await db.prepare("DELETE FROM venture_events WHERE day < date('now','-34 days')").run();pruned.set(db,today);}}
const routes=new Map(Object.entries(experiments).map(([id,x])=>[x.host,id]));
const events=new Set(['visit','start','complete','export','rfq_export','offer','interest','research_none','research_once','research_repeat','agent_start','agent_complete','agent_export','agent_draft','agent_download','agent_interest','agent_none','agent_once','agent_repeat']);
const sources=new Set(['direct','bpj','learn','eco','agi']);
const modes=new Set(['own','sample','exercise','qa']);
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
async function body(request){const reader=request.body?.getReader();if(!reader)throw Error('body');let size=0,chunks=[];try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>512)throw Error('size');chunks.push(value);}}finally{await reader.cancel();}return JSON.parse(new TextDecoder().decode(Uint8Array.from(chunks.flatMap(x=>[...x]))));}
export default {
 async fetch(request,env){const url=new URL(request.url),site=routes.get(url.hostname);if(!site)return new Response('Not found',{status:404});
 if(url.pathname==='/api/config')return json({site,price:experiments[site].proposed_price,sales_enabled:false,measurement:!!env.DB});
 if(url.pathname==='/api/pulse'){
  if(!['GET','HEAD'].includes(request.method))return json({error:'Method not allowed'},405);
  if(!env.DB)return json({error:'Measurement unavailable'},503);
  try{await initialize(env.DB);const result=await env.DB.prepare("SELECT mode,event,source,COUNT(*) AS visit_events FROM venture_events WHERE site=? AND day >= date('now','-27 days') AND mode != 'qa' GROUP BY mode,event,source ORDER BY mode,event,source").bind(site).all();return json({site,days:28,metric:'opt-in visit events; not users, buyers or revenue',rows:result.results});}catch{return json({error:'Measurement unavailable'},503);}
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
  try{await initialize(env.DB);await env.DB.prepare('INSERT OR IGNORE INTO venture_events(day,site,event,mode,source,session) SELECT ?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM venture_events WHERE day=? AND site=?) < 5000').bind(day,site,d.event,d.mode,d.source,d.session,day,site).run();const present=await env.DB.prepare('SELECT 1 AS recorded FROM venture_events WHERE day=? AND site=? AND event=? AND mode=? AND session=?').bind(day,site,d.event,d.mode,d.session).first();if(!present)return json({error:'Measurement capacity reached'},503);return json({recorded:true});}catch{return json({error:'Measurement temporarily unavailable'},503);}
 }
 if(url.pathname.startsWith('/api/'))return json({error:'Not found'},404);
 if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});
 if(['/index.html','/guide.html','/privacy.html','/guide/','/privacy/','/agent.html','/agent-guide.html','/agent/','/agent-guide/'].includes(url.pathname)){const dest=url.pathname.replace(/index\.html$/,'').replace(/\.html$/,'').replace(/\/$/,'')||'/';return Response.redirect(url.origin+dest+url.search,301);}
 // Map only declared public assets. No cross-host files or build internals are exposed.
 const path=url.pathname==='/'?'/index.html':['/guide','/privacy','/agent','/agent-guide'].includes(url.pathname)?url.pathname+'.html':url.pathname;
 if(!/^\/(?:index\.html|guide\.html|privacy\.html|agent(?:-guide)?\.html|agent\.css|agent-app\.mjs|agent-example\.json|tradecheck\.js|tradecheck-NOTICES\.txt|downloads\/(?:tradecheck-mcp-0\.1\.0\.tar\.gz|SHA256SUMS)|app\.mjs|onboarding\.mjs|fonts\/manrope-latin-wght-normal\.woff2|fonts\/LICENSE|styles\.css|core\.mjs|ui\.mjs|robots\.txt|sitemap\.xml|project\.mjs|sql-worker\.js|vendor\/sql-wasm\.(?:js|wasm)|vendor\/LICENSE)$/.test(path))return new Response('Not found',{status:404});
 const assetURL=new URL(url.origin+'/'+site+path);let response=await env.ASSETS.fetch(new Request(assetURL,{method:request.method}));response=new Response(response.body,response);response.headers.set('Content-Security-Policy',"default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");response.headers.set('X-Content-Type-Options','nosniff');response.headers.set('Referrer-Policy','no-referrer');response.headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=()');return response;
 },
 async scheduled(_event,env){if(!env.DB)return;await initialize(env.DB);await env.DB.prepare("DELETE FROM venture_events WHERE day < date('now','-34 days')").run();}
};
