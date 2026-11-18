// Private, short-lived abuse counters; never persist raw IPs, UA strings or queries.
export const RULES=Object.freeze({
 '/api/manju-discover':{limit:30,seconds:60,bytes:2000},
 '/api/vendor':{limit:5,seconds:600,bytes:12000},
 '/api/submit':{limit:5,seconds:600,bytes:16000},
 '/api/claim':{limit:6,seconds:600,bytes:16000},
 '/api/manju-inquiry':{limit:5,seconds:600,bytes:6000}
});
const json=(code,status,retry)=>Response.json({ok:false,code,status:code,...(retry?{retryAfter:retry,retry_after_s:retry}:{})},{status,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex',...(retry?{'Retry-After':String(retry)}:{})}});
const hash=async s=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))),b=>b.toString(16).padStart(2,'0')).join('');
const CREATE="CREATE TABLE IF NOT EXISTS bpj_traffic_rates (key TEXT PRIMARY KEY,n INTEGER NOT NULL,expires INTEGER NOT NULL) WITHOUT ROWID";
async function take(db,key,limit,expires){
 const sql='INSERT INTO bpj_traffic_rates(key,n,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET n=n+1 WHERE n<? RETURNING n';
 try{return !!await db.prepare(sql).bind(key,expires,limit).first();}catch(e){if(!/no such table/.test(String(e)))throw e;await db.prepare(CREATE).run();await db.prepare('CREATE INDEX IF NOT EXISTS bpj_traffic_rates_expiry ON bpj_traffic_rates(expires)').run();return !!await db.prepare(sql).bind(key,expires,limit).first();}
}
export async function boundedBody(request,max){
 if(Number(request.headers.get('content-length'))>max)throw Error('too_large');
 if(!request.body)return new Uint8Array();
 const reader=request.body.getReader(),parts=[];let n=0;
 for(;;){const {done,value}=await reader.read();if(done)break;n+=value.length;if(n>max){await reader.cancel();throw Error('too_large');}parts.push(value);}
 const body=new Uint8Array(n);let offset=0;for(const p of parts){body.set(p,offset);offset+=p.length;}return body;
}
export function trafficClass(request){
 if(request.cf?.botManagement?.verifiedBot===true)return 'verified_bot';
 const ua=request.headers.get('user-agent')||'';
 if(/bot|spider|crawler|headless|playwright|curl|wget|python|node\//i.test(ua))return 'declared_automation';
 const m=ua.match(/Chrome\/(\d+)\.\d+\.(\d+)\./);
 if((m&&+m[1]<=60&&+m[2]>=4000)||(/iPhone|iPad/.test(ua)&&/AppleWebKit\/537\.36/.test(ua)&&/Chrome\//.test(ua)&&!/CriOS\//.test(ua)))return 'ua_anomaly';
 return 'unclassified';
}
export async function recordQuality(db,kind,classification,now=Date.now()){
 const sql='INSERT INTO bpj_traffic_quality(d,kind,class,n) VALUES(?,?,?,1) ON CONFLICT(d,kind,class) DO UPDATE SET n=n+1';
 const args=[new Date(now).toISOString().slice(0,10),kind,classification];
 try{await db.prepare(sql).bind(...args).run();}catch(e){if(!/no such table/.test(String(e)))throw e;await db.prepare('CREATE TABLE IF NOT EXISTS bpj_traffic_quality(d TEXT NOT NULL,kind TEXT NOT NULL,class TEXT NOT NULL,n INTEGER NOT NULL,PRIMARY KEY(d,kind,class)) WITHOUT ROWID').run();await db.prepare(sql).bind(...args).run();}
}
export async function guardTraffic(ctx,{now=Date.now(),cache=globalThis.caches?.default}={}){
 const {request,env}=ctx,u=new URL(request.url);let path=u.pathname;try{for(let i=0;i<2;i++)path=decodeURIComponent(path);}catch{}path=path.replace(/\/+$/,'');const rule=RULES[path];
 if(request.method!=='POST'||!rule)return ctx.next();
 if(request.headers.get('origin')!==u.origin||request.headers.get('sec-fetch-site')==='cross-site')return json('origin',403);
 if(!/^application\/json(?:;|$)/i.test(request.headers.get('content-type')||''))return json('type',415);
 let body;try{body=await boundedBody(request,rule.bytes);}catch{return json('too_large',413);}
 if(env.BPJ_TRAFFIC_LIMITS==='off')return ctx.next(new Request(request,{body}));
 // Only trust the edge-injected address, never X-Forwarded-For or caller tokens.
 const ip=request.headers.get('cf-connecting-ip');if(!ip||!env.HITS)return json('temporarily_unavailable',503,60);
 const bucket=Math.floor(now/(rule.seconds*1000)),expires=(bucket+1)*rule.seconds*1000;
 const key=await hash('bpj-traffic-v1|'+path+'|'+bucket+'|'+ip),cacheKey=new Request(u.origin+'/__traffic_limit/'+key);
 try{
  if(cache&&await cache.match(cacheKey).catch(()=>null))return json('rate_limited',429,Math.max(1,Math.ceil((expires-now)/1000)));
  const allowed=await take(env.HITS,key,rule.limit,expires);
  // A bounded indexed deletion keeps the private security counters short lived.
  const maintenance=env.HITS.prepare('DELETE FROM bpj_traffic_rates WHERE key IN (SELECT key FROM bpj_traffic_rates WHERE expires<? ORDER BY expires LIMIT 50)').bind(now).run().catch(()=>{});
  if(ctx.waitUntil)ctx.waitUntil(maintenance);else await maintenance;
  if(!allowed){
   const retry=Math.max(1,Math.ceil((expires-now)/1000));
   if(cache)await cache.put(cacheKey,new Response('limited',{headers:{'Cache-Control':'max-age='+retry}})).catch(()=>{});
   return json('rate_limited',429,retry);
  }
 }catch{return json('temporarily_unavailable',503,60);}
 return ctx.next(new Request(request,{body}));
}

export function qualityEligible(request,path,lang){
 if(lang==='ci'||path.startsWith('/__')||request.headers.get('dnt')==='1'||request.headers.get('sec-gpc')==='1')return false;
 for(const value of [request.url,request.headers.get('referer')]){if(!value)continue;try{const u=new URL(value);if(['qa','__qa','ci','__ci','__probe'].some(k=>u.searchParams.has(k))||u.pathname.startsWith('/__'))return false;}catch{}}
 return true;
}

export function qualityKind(ev,path){
 if(!ev)return 'page';
 if(ev==='catalog_task' && /^\/catalog-task\/(chatgpt|kimi|qingying)$/.test(path))return 'catalog_task_'+path.split('/')[2];
 if(ev==='manju'){
  const action=path.split('/')[2];
  if(action==='view')return 'manju_view';
  if(['search_submit','official_open','save','share_native','share_copy','cloud_save'].includes(action))return 'manju_'+action;
 }
 if(ev==='go')return 'tool_outbound';
 if(ev==='star')return 'tool_save';
 return 'other_event';
}
