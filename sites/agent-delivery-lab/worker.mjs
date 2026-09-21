import { release } from './release.generated.mjs';
const security={'Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; font-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Permissions-Policy':'camera=(), microphone=(), geolocation=()','Strict-Transport-Security':'max-age=31536000'};
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{...security,'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex'}});}
export function validFeedback(v){return v && typeof v==='object' && !Array.isArray(v) && Object.keys(v).sort().join(',')==='frequency,id,interest,ownCompleted,qa' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v.id) && ['zero','1-3','4plus'].includes(v.frequency) && ['no','free','discuss'].includes(v.interest) && typeof v.ownCompleted==='boolean' && typeof v.qa==='boolean';}
async function table(db){await db.prepare('CREATE TABLE IF NOT EXISTS agent_delivery_feedback (id TEXT PRIMARY KEY, created TEXT NOT NULL DEFAULT (datetime(\'now\')), frequency TEXT NOT NULL, interest TEXT NOT NULL, own_completed INTEGER NOT NULL, qa INTEGER NOT NULL)').run();await db.prepare("DELETE FROM agent_delivery_feedback WHERE created < datetime('now','-35 days')").run();}
async function smallBody(request){const reader=request.body?.getReader();if(!reader)throw Error('body');let n=0,chunks=[];try{for(;;){const {done,value}=await reader.read();if(done)break;n+=value.length;if(n>1024){await reader.cancel();throw Error('size');}chunks.push(value);}}finally{reader.releaseLock();}const out=new Uint8Array(n);let offset=0;for(const x of chunks){out.set(x,offset);offset+=x.length;}return JSON.parse(new TextDecoder().decode(out));}
export default {async fetch(request,env){
  const url=new URL(request.url);
  if(url.pathname==='/api/health' && ['GET','HEAD'].includes(request.method))return json({ok:true,...release});
  if(url.pathname==='/api/feedback'){
    if(request.method!=='POST')return json({error:'Method not allowed'},405);
    if(request.headers.get('Origin')!==url.origin)return json({error:'Same-origin request required'},403);
    if(!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'JSON required'},415);
    if(Number(request.headers.get('Content-Length'))>1024)return json({error:'Payload too large'},413);
    if(!env.EVENT_LIMIT || !env.DB)return json({error:'Feedback temporarily unavailable'},503);
    try {
      const allowed=await env.EVENT_LIMIT.limit({key:request.headers.get('CF-Connecting-IP')||'unknown'});
      if(!allowed.success)return json({error:'Please try again later'},429);
      let data;try{data=await smallBody(request);}catch{return json({error:'Invalid or oversized JSON'},400);}
      if(!validFeedback(data))return json({error:'Only documented anonymous choices are accepted'},400);
      await table(env.DB);
      await env.DB.prepare('INSERT OR IGNORE INTO agent_delivery_feedback (id,frequency,interest,own_completed,qa) VALUES (?,?,?,?,?)').bind(data.id,data.frequency,data.interest,Number(data.ownCompleted),Number(data.qa)).run();
      return json({saved:true});
    } catch{return json({error:'Feedback temporarily unavailable'},503);}
  }
  if(url.pathname==='/api/stats'){
    if(request.method!=='GET')return json({error:'Method not allowed'},405);
    if(!env.DB)return json({error:'Feedback temporarily unavailable'},503);
    try{await table(env.DB);const data=await env.DB.prepare("SELECT frequency,interest,own_completed,qa,COUNT(*) AS submissions FROM agent_delivery_feedback WHERE created >= datetime('now','-35 days') GROUP BY frequency,interest,own_completed,qa").all();return json({windowDays:35,unit:'Anonymous submissions, not verified people or purchases. QA is separately flagged.',groups:data.results||[]});}catch{return json({error:'Feedback temporarily unavailable'},503);}
  }
  if(url.pathname.startsWith('/api/'))return json({error:'Not found'},404);
  if(!['GET','HEAD'].includes(request.method))return json({error:'Method not allowed'},405);
  // html_handling is intentionally none so documented .html URLs remain stable.
  // Map only the root explicitly; arbitrary missing routes must remain real 404s.
  const assetURL=new URL(request.url);if(assetURL.pathname==='/')assetURL.pathname='/index.html';
  const response=await env.ASSETS.fetch(new Request(assetURL,request));const out=new Response(response.body,response);
  for(const [k,v] of Object.entries(security))out.headers.set(k,v);
  out.headers.set('Cache-Control','public, max-age=0, must-revalidate');
  if(url.searchParams.has('qa'))out.headers.set('X-Robots-Tag','noindex');
  return out;
}};
