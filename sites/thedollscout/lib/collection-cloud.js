import '../js/collector-core.js';
import {HUB,TOKEN,SESSION_COOKIE,cookieValue,digest} from '../../../tools/fleet-account/config.mjs';
const ORIGIN='https://thedollscout.com';
export const MAX_BYTES=131072,MAX_ITEMS=500,MIN_WRITE_GAP_MS=10000;
export const SCHEMA=`CREATE TABLE IF NOT EXISTS collector_cloud_v1 (owner TEXT PRIMARY KEY, revision INTEGER NOT NULL, payload TEXT, updated INTEGER NOT NULL)`;
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});
const schemaReady=new WeakMap();
async function ensureSchema(db){if(!schemaReady.has(db))schemaReady.set(db,Promise.resolve().then(()=>db.prepare(SCHEMA).run()).catch(e=>{schemaReady.delete(db);throw e;}));await schemaReady.get(db);}
function fail(error,status=400){throw Object.assign(Error(error),{status});}
export function cleanBackup(value){
 if(!value||Object.keys(value).some(k=>!['app','version','items'].includes(k))||!Array.isArray(value.items)||value.items.length>MAX_ITEMS)fail('invalid_collection');
 const fields=new Set(['name','series','status','quantity','seriesId','styleId','checklistMissing']);
 for(const item of value.items)if(!item||Object.keys(item).some(k=>!fields.has(k))||typeof item.quantity!=='number'||typeof item.series!=='string')fail('invalid_collection');
 let payload;try{payload=globalThis.DSCollector.backup(globalThis.DSCollector.restore(JSON.stringify(value)));}catch{fail('invalid_collection');}
 if(new TextEncoder().encode(payload).byteLength>MAX_BYTES)fail('collection_too_large',413);
 return payload;
}
async function readBody(request){
 if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type')||'')||!request.body)fail('invalid_request');
 const cap=MAX_BYTES+4096;if(Number(request.headers.get('content-length'))>cap)fail('collection_too_large',413);
 const reader=request.body.getReader();let total=0,parts=[];
 for(;;){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>cap){await reader.cancel();fail('collection_too_large',413);}parts.push(value);}
 const raw=new Uint8Array(total);let offset=0;for(const p of parts){raw.set(p,offset);offset+=p.length;}
 try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw));}catch{fail('invalid_request');}
}
export async function collectionCloud(request,env,fetcher=fetch,clock=Date.now){
 try{
  const url=new URL(request.url);
  if(url.origin!==ORIGIN||request.headers.get('sec-fetch-site')==='cross-site')fail('origin_rejected',403);
  if(!['GET','POST'].includes(request.method))fail('method_not_allowed',405);
  if(request.method==='POST'&&request.headers.get('origin')!==ORIGIN)fail('origin_rejected',403);
  const token=cookieValue(request,SESSION_COOKIE);if(!TOKEN.test(token))fail('authentication_required',401);
  const reply=await fetcher(HUB+'/api/account-fleet',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({action:'session',host:'thedollscout.com'}),redirect:'manual',signal:AbortSignal.timeout(12000)});
  if(reply.status===401)fail('authentication_required',401);
  if(!reply.ok)fail('account_unavailable',503);
  const identity=await reply.json();if(!identity.ok||typeof identity.user?.id!=='string'||!identity.user.id||identity.user.id.length>200)fail('account_unavailable',503);
  const owner=await digest('tds-collection-v1:'+identity.user.id);
  if(!env.HITS)fail('storage_unavailable',503);
  await ensureSchema(env.HITS);
  const row=await env.HITS.prepare('SELECT revision,payload,updated FROM collector_cloud_v1 WHERE owner=?').bind(owner).first();
  if(request.method==='GET')return json({ok:true,owner,revision:row?.revision||0,count:row?.payload?JSON.parse(row.payload).items.length:0,has_copy:!!row?.payload,updated:row?.updated||null,max_items:MAX_ITEMS,max_bytes:MAX_BYTES});
  const body=await readBody(request);
  if(!body||Object.keys(body).some(k=>!['action','owner','revision','collection'].includes(k))||!['save','restore','delete'].includes(body.action))fail('invalid_request');
  if(body.action!=='save'&&Object.hasOwn(body,'collection'))fail('invalid_request');
  if(body.owner!==owner)fail('account_changed',409);
  if(!Number.isSafeInteger(body.revision)||body.revision<0)fail('invalid_request');
  if(body.revision!==(row?.revision||0))fail('conflict',409);
  if(body.action==='restore'){
   if(!row?.payload)fail('no_copy',404);
   return json({ok:true,owner,revision:row.revision,collection:JSON.parse(row.payload)});
  }
  const updated=clock();
  if(row&&updated-row.updated<MIN_WRITE_GAP_MS)fail('retry_later',429);
  const payload=body.action==='save'?cleanBackup(body.collection):null;
  // A tombstone retains the revision after deletion, preventing stale-tab ABA writes.
  const result=await env.HITS.prepare(`INSERT INTO collector_cloud_v1(owner,revision,payload,updated) VALUES (?,1,?,?) ON CONFLICT(owner) DO UPDATE SET revision=revision+1,payload=excluded.payload,updated=excluded.updated WHERE collector_cloud_v1.revision=? AND collector_cloud_v1.updated<=? RETURNING revision`).bind(owner,payload,updated,body.revision,updated-MIN_WRITE_GAP_MS).first();
  if(!result)fail('conflict',409);
  return json({ok:true,owner,revision:result.revision,count:payload?JSON.parse(payload).items.length:0,has_copy:payload!==null,updated});
 }catch(e){const r=json({ok:false,error:e.status?e.message:'storage_unavailable'},e.status||503);if(e.status===429)r.headers.set('Retry-After','10');return r;}
}
