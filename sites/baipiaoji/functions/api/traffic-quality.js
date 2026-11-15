// Coarse daily event observations only: no identifiers, paths, UA or country cross-tabs.
export async function onRequestGet({env,request,waitUntil}){
 if(env.BPJ_TRAFFIC_QUALITY==='off')return Response.json({status:'disabled',rows:null},{headers:{'Cache-Control':'no-store'}});
 const url=new URL(request.url),cache=globalThis.caches?.default,key=new Request(url.origin+'/api/traffic-quality');
 if(cache){const old=await cache.match(key).catch(()=>null);if(old)return old;}
 const end=new Date().toISOString().slice(0,10),since=new Date(Date.parse(end)-7*86400000).toISOString().slice(0,10);
 let rows=null,status='unavailable';
 try{const r=await env.HITS.prepare('SELECT d,kind,class,n FROM bpj_traffic_quality WHERE d>=? AND d<? ORDER BY d,kind,class').bind(since,end).all();rows=r.results;status='available';}catch{}
 const response=Response.json({version:'bpj-traffic-quality-v1',status,measurementStarted:'2026-11-15',window:{since,endExclusive:end,timezone:'UTC',completeDays:true},rows,definition:'Validated first-party page/action beacon observations, not all HTTP requests, people or GA4 events. Original hits are retained. verified_bot uses Cloudflare metadata; declared_automation and ua_anomaly are heuristics; unclassified does not mean human. Source/click/save events remain separate in /api/reach. Missing data is unknown; pre-release days have no coverage.'},{headers:{'Cache-Control':'public, max-age=300','X-Robots-Tag':'noindex'}});
 if(cache){const p=cache.put(key,response.clone()).catch(()=>{});if(waitUntil)waitUntil(p);else await p;}return response;
}
