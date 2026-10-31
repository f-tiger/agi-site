// Capital Radar is an AGI registered-account surface. Neither a paid workspace
// key nor a client-supplied identity can replace a live host-bound fleet session.
import {HUB,SESSION_COOKIE,TOKEN,cookieValue,accountEntryURL} from '../../../../tools/fleet-account/config.mjs';
import {boundedText} from '../jarvis/security.mjs';

const ORIGIN='https://agiscorecard.com';
const PUBLISHERS=new Set(['techcrunch.com','news.crunchbase.com','venturebeat.com']);
const MAX_BYTES=1500000;
const TABLE='CREATE TABLE IF NOT EXISTS capital_radar_snapshot(id INTEGER PRIMARY KEY CHECK(id=1), generated_at TEXT NOT NULL, payload TEXT NOT NULL)';
const headers={
 'Cache-Control':'private, no-store','CDN-Cache-Control':'no-store','Cloudflare-CDN-Cache-Control':'no-store',
 'X-Robots-Tag':'noindex, nofollow, noarchive','Vary':'Cookie','Referrer-Policy':'no-referrer',
 'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY',
 'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; font-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'"
};
const json=(body,status=200,extra={})=>new Response(JSON.stringify(body),{status,headers:{...headers,'Content-Type':'application/json; charset=utf-8',...extra}});
const hash=async value=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(x=>x.toString(16).padStart(2,'0')).join('');
const own=(x,k)=>Object.hasOwn(x,k);
const object=x=>x&&typeof x==='object'&&!Array.isArray(x);
const iso=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}T/.test(x)&&Number.isFinite(Date.parse(x));
const text=(x,max)=>typeof x==='string'&&x.length<=max;
const pick=(obj,keys)=>Object.fromEntries(keys.filter(k=>object(obj)&&own(obj,k)).map(k=>[k,obj[k]]));

function publisherURL(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&PUBLISHERS.has(u.hostname);}catch{return false;}}
export function validateSnapshot(s){
 if(!object(s)||s.schemaVersion!==1||!iso(s.generatedAt)||Date.parse(s.generatedAt)>Date.now()+300000)throw Error('invalid_snapshot');
 if(!Array.isArray(s.items)||s.items.length>1000||!Array.isArray(s.sources)||s.sources.length>20||!Array.isArray(s.history)||s.history.length>3660||!object(s.forecast)||!object(s.model)||!object(s.notifications))throw Error('invalid_snapshot');
 const ids=new Set();
 for(const item of s.items){
  if(!object(item)||!text(item.id,160)||!item.id||ids.has(item.id)||!text(item.title,1000)||!text(item.summary??'',3000)||!publisherURL(item.url)||!text(item.source,100)||!iso(item.publishedAt)||!iso(item.discoveredAt)||!['funding','startup'].includes(item.kind)||!['agents','models','robotics','infrastructure','applications'].includes(item.sector)||!['sf-bay-area','unconfirmed'].includes(item.geography)||item.evidence!=='rss-rule-match')throw Error('invalid_snapshot');
  ids.add(item.id);
 }
 for(const source of s.sources)if(!object(source)||!text(source.id,100)||!text(source.name,160)||!publisherURL(source.url)||typeof source.ok!=='boolean'||!iso(source.fetchedAt)||!Number.isInteger(source.matched)||source.matched<0||!text(source.error??'',500))throw Error('invalid_snapshot');
 const dates=new Set();
 for(const row of s.history){if(!object(row)||!/^\d{4}-\d{2}-\d{2}$/.test(row.date)||!Number.isInteger(row.count)||row.count<0||typeof row.complete!=='boolean'||dates.has(row.date))throw Error('invalid_snapshot');dates.add(row.date);}
 if(!['insufficient_history','insufficient_variation','ready'].includes(s.forecast.status)||!['waiting_for_history','baseline_retained','candidate_promoted'].includes(s.model.status)||typeof s.notifications.configured!=='boolean')throw Error('invalid_snapshot');
 if(s.forecast.status==='ready'){
  if(!Array.isArray(s.forecast.points)||s.forecast.points.length!==7||s.forecast.observedDays<56||!Number.isInteger(s.model.validationPoints)||s.model.validationPoints<1)throw Error('invalid_snapshot');
  for(const p of s.forecast.points)if(!object(p)||!/^\d{4}-\d{2}-\d{2}$/.test(p.date)||![p.estimate,p.low,p.high].every(x=>typeof x==='number'&&Number.isFinite(x)&&x>=0)||p.low>p.estimate||p.high<p.estimate)throw Error('invalid_snapshot');
 }
 return s;
}

export function memberSnapshot(s){
 if(!s)return null;
 // Explicit fields keep runner checkpoints, notification outbox, and future
 // internal training material out of registered-user responses.
 return {
  schemaVersion:s.schemaVersion,generatedAt:s.generatedAt,
  items:s.items.map(i=>pick(i,['id','title','url','source','publishedAt','discoveredAt','kind','sector','geography','evidence','summary'])),
  sources:s.sources.map(i=>pick(i,['id','name','url','ok','fetchedAt','matched','error'])),
  history:s.history.map(i=>pick(i,['date','count','complete'])),
  forecast:pick(s.forecast,['status','minimumDays','observedDays','target','horizonDays','points','method','intervalNote']),
  model:pick(s.model,['status','version','trainingEnd','baselineMAE','candidateMAE','validationPoints','promotionThreshold']),
  notifications:pick(s.notifications,['configured','lastSentAt','lastDigestDate','deliveryStatus'])
 };
}

async function session(request,fetcher){
 const token=cookieValue(request,SESSION_COOKIE);if(!TOKEN.test(token))return false;
 const r=await fetcher(HUB+'/api/account-fleet',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({action:'session',host:'agiscorecard.com'}),redirect:'manual',signal:AbortSignal.timeout(12000)});
 if(r.status===401)return false;if(!r.ok)throw Error('unavailable');
 const body=await r.json();if(!body.ok||!text(body.user?.id,100)||!body.user.id)throw Error('unavailable');return true;
}
async function read(db){await db.prepare(TABLE).run();const row=await db.prepare('SELECT payload FROM capital_radar_snapshot WHERE id=1').first();return row?JSON.parse(row.payload):null;}

export async function capitalRadarRoute(request,env,fetcher=fetch){
 const url=new URL(request.url);let path=url.pathname;
 // Match all spellings before handing anything to ASSETS, whose own URL
 // normalization must never turn an unguarded alias into the private file.
 for(let i=0;i<4;i++){try{const decoded=decodeURIComponent(path);if(decoded===path)break;path=decoded;}catch{break;}}
 path=path.replaceAll('\\','/').replace(/\/+/g,'/');
 try{path=new URL(path,ORIGIN).pathname;}catch{return null;}
 const page=/^\/capital-radar(?:\.html|\/(?:account(?:\.html)?\/?)?)?$/i.test(path);
 const api=path==='/api/capital-radar';
 const runner=path==='/api/capital-radar/runner';
 const reserved=/^\/capital-radar(?:[./]|$)/i.test(path)||/^\/api\/capital-radar(?:[./]|$)/i.test(path);
 if(!page&&!api&&!runner&&!reserved)return null;
 // Never serve member data from workers.dev, alternate hosts, or asset aliases.
 if(url.origin!==ORIGIN)return json({ok:false,error:'not_found'},404);
 if(!page&&!api&&!runner)return json({ok:false,error:'not_found'},404);
 const allowed=runner?['GET','PUT']:['GET','HEAD'];
 if(!allowed.includes(request.method))return json({ok:false,error:'method_not_allowed'},405,{Allow:allowed.join(', ')});
 try{
  if(runner){
   const bearer=/^Bearer ([a-f0-9]{64})$/.exec(request.headers.get('Authorization')||'')?.[1];
   if(!bearer)return json({ok:false,error:'unauthorized'},401);
   if(!env.MEMBER_WATCH_SECRET||!env.EVENTS)throw Error('unavailable');
   const expected=await hash(env.MEMBER_WATCH_SECRET+':capital-radar-runner:v1');
   if(await hash(bearer)!==await hash(expected))return json({ok:false,error:'unauthorized'},401);
   if(request.method==='GET')return json({ok:true,snapshot:await read(env.EVENTS)});
   if(!/^application\/json(?:;|$)/i.test(request.headers.get('Content-Type')||''))return json({ok:false,error:'invalid_request'},400);
   const raw=await boundedText(request.body,{maxBytes:MAX_BYTES,timeoutMs:10000,tooLarge:'too_large',timeout:'request_timeout',invalid:'invalid_request'});
   let body;try{body=JSON.parse(raw);}catch{return json({ok:false,error:'invalid_request'},400);}
   const snapshot=validateSnapshot(body?.snapshot),payload=JSON.stringify(snapshot);
   // A numeric instant makes stale-write protection independent of ISO offset
   // spelling. Equality permits recording the delivery receipt after a run.
   const instant=new Date(snapshot.generatedAt).toISOString();
   await env.EVENTS.prepare(TABLE).run();
   const result=await env.EVENTS.prepare('INSERT INTO capital_radar_snapshot(id,generated_at,payload) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET generated_at=excluded.generated_at,payload=excluded.payload WHERE excluded.generated_at>=capital_radar_snapshot.generated_at').bind(instant,payload).run();
   if(!result.meta?.changes)return json({ok:false,error:'stale_snapshot'},409);
   return json({ok:true,generatedAt:snapshot.generatedAt});
  }
  if(!await session(request,fetcher)){
   if(page)return new Response(null,{status:303,headers:{...headers,Location:accountEntryURL('/capital-radar','zh')}});
   return json({ok:false,error:'registration_required',signIn:accountEntryURL('/capital-radar','zh')},401);
  }
  if(page){
   // account.html is an explicit private-page analytics exemption. Its content
   // contains no snapshot, and this route also gates the file's direct aliases.
   const asset=await env.ASSETS.fetch(new Request(ORIGIN+'/capital-radar/account',{method:'GET'}));
   const secured=new Headers(asset.headers);for(const [k,v]of Object.entries(headers))secured.set(k,v);for(const k of ['etag','last-modified','content-length'])secured.delete(k);
   return new Response(request.method==='HEAD'?null:asset.body,{status:asset.status,headers:secured});
  }
  if(!env.EVENTS)throw Error('unavailable');
  const response=json({ok:true,snapshot:memberSnapshot(await read(env.EVENTS))});
  return request.method==='HEAD'?new Response(null,{status:response.status,headers:response.headers}):response;
 }catch(e){
  const status={invalid_snapshot:400,invalid_request:400,too_large:413,request_timeout:408}[e.message]||503;
  return json({ok:false,error:status===503?'unavailable':e.message},status);
 }
}
