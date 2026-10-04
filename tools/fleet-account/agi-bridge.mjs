// Server-only adapter: browser never receives the legacy capability key.
// Keep the existing AGI permissions, quotas, suspensions and ownership checks.
import {HUB,SESSION_COOKIE,cookieValue,TOKEN,json} from './config.mjs';
import {SCHEMA} from '../../sites/baipiaoji/lib/membership.js';
const hex=bytes=>[...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('');
const hash=async s=>hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));
export async function agiMemberRequest(request,env,fetcher=fetch){
 if(request.headers.get('Authorization')!=='Fleet')return request;
 const url=new URL(request.url);
 if(url.origin!=='https://agiscorecard.com'||!/^\/api\/(?:jarvis(?:\/tasks)?|discuss)$/.test(url.pathname))return json({ok:false,error:'unauthorized',code:'unauthorized'},401);
 if(request.method!=='GET'&&(request.headers.get('Origin')!==url.origin||request.headers.get('Sec-Fetch-Site')==='cross-site'))return json({ok:false,code:'unauthorized'},403);
 const token=cookieValue(request,SESSION_COOKIE);if(!TOKEN.test(token))return json({ok:false,code:'unauthorized'},401);
 try{
  if(!env.EVENTS||!env.MEMBER_WATCH_SECRET)throw Error('unavailable');
  const result=await fetcher(HUB+'/api/account-fleet',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({action:'session',host:url.hostname}),redirect:'manual',signal:AbortSignal.timeout(12000)});
  if(result.status===401)return json({ok:false,code:'unauthorized'},401);if(!result.ok)throw Error('unavailable');
  const data=await result.json();if(!data.ok||typeof data.user?.id!=='string'||data.user.id.length>100)throw Error('unavailable');
  const id='fleet_'+await hash('agi:'+data.user.id),signer=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.MEMBER_WATCH_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const capability=hex(await crypto.subtle.sign('HMAC',signer,new TextEncoder().encode('fleet-member:agi:v1:'+data.user.id)));
  const db=env.EVENTS;await db.prepare(SCHEMA.find(s=>s.startsWith('CREATE TABLE IF NOT EXISTS wb_members('))).run();
  // A reserved stable ID is independent of email and display name. No automatic
  // lookup/merge of pre-existing legacy keys or email subscriptions is allowed.
  await db.prepare('INSERT INTO wb_members(id,token_hash,created) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET token_hash=excluded.token_hash').bind(id,await hash(capability),Math.floor(Date.now()/1000)).run();
  const headers=new Headers(request.headers);headers.set('Authorization','Bearer '+capability);
  return new Request(request,{headers});
 }catch{return json({ok:false,code:'unavailable'},503);}
}
