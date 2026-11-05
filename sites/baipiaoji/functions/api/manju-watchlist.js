import catalog from '../../data/manju.json' with {type:'json'};
import {getAccount,tokenFrom,hash,now,consumeRate} from '../../lib/free-account.js';

const VALID_IDS=new Set(catalog.items.map(work=>work.id));
const MAX_ITEMS=200,MAX_BYTES=16384;
const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store, private','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
const reply=(status,body)=>new Response(JSON.stringify(body),{status,headers});
const fail=(status,error)=>reply(status,{ok:false,error});
const validIds=value=>Array.isArray(value)&&value.length<=MAX_ITEMS&&new Set(value).size===value.length&&value.every(id=>typeof id==='string'&&VALID_IDS.has(id));
async function readBody(request){
 if(Number(request.headers.get('Content-Length'))>MAX_BYTES)throw Error('too_large');
 const reader=request.body?.getReader();if(!reader)throw Error('invalid_body');
 const chunks=[];let size=0;
 try{for(;;){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_BYTES){await reader.cancel();throw Error('too_large');}chunks.push(value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{throw Error('invalid_body');}
}
const ensure=env=>env.HITS.prepare(`CREATE TABLE IF NOT EXISTS free_account_manju_watchlists (
 account_id TEXT PRIMARY KEY REFERENCES free_accounts(id) ON DELETE CASCADE,
 version INTEGER NOT NULL CHECK(version>0), ids_json TEXT NOT NULL, updated INTEGER NOT NULL
)`).run();
// The session is checked again inside each data statement: logout/password reset
// between getAccount and the write must not authorize a stale request.
const sessionSQL=`SELECT 1 FROM free_account_sessions s JOIN free_accounts a ON a.id=s.account_id
 WHERE s.token_hash=? AND a.id=? AND s.version=a.session_version AND a.session_version=? AND s.expires>?`;
export async function onRequest({request,env}){
 if(!['GET','POST'].includes(request.method))return reply(405,{ok:false,error:'method_not_allowed'});
 const origin=request.headers.get('Origin');
 if(request.headers.get('Sec-Fetch-Site')==='cross-site'||(origin&&origin!=='https://baipiaoji.com')||(request.method==='POST'&&origin!=='https://baipiaoji.com'))return fail(403,'same_origin_required');
 let body;
 if(request.method==='POST'){
  if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('Content-Type')||''))return fail(415,'json_required');
  try{body=await readBody(request);}catch(error){return fail(error.message==='too_large'?413:400,error.message);}
  if(!body||Array.isArray(body)||typeof body!=='object'||!['save','delete'].includes(body.action)||typeof body.account_id!=='string'||body.account_id.length>128||!Number.isSafeInteger(body.version)||body.version<0||body.version>=Number.MAX_SAFE_INTEGER)return fail(400,'invalid_body');
  const allowed=body.action==='save'?['action','account_id','version','ids']:['action','account_id','version'];
  if(Object.keys(body).some(key=>!allowed.includes(key))||(body.action==='save'&&!validIds(body.ids)))return fail(400,'invalid_body');
 }
 try{
  if(!env.HITS)return fail(503,'unavailable');
  const user=await getAccount(request,env);if(!user)return fail(401,'authentication_required');
  if(body&&body.account_id!==user.id)return fail(409,'account_changed');
  if(!await consumeRate(env,'manju-watchlist-'+request.method,user.id,request.method==='GET'?120:60,3600))return fail(429,'rate_limited');
  await ensure(env);
  const sessionArgs=[hash(tokenFrom(request)),user.id,user.session_version,now()];
  if(request.method==='GET'){
   const row=await env.HITS.prepare(`SELECT a.id AS account_id,COALESCE(w.version,0) AS version,COALESCE(w.ids_json,'[]') AS ids_json FROM free_accounts a LEFT JOIN free_account_manju_watchlists w ON w.account_id=a.id WHERE a.id=? AND EXISTS (${sessionSQL})`).bind(user.id,...sessionArgs).first();
   if(!row)return fail(401,'authentication_required');
   const stored=JSON.parse(row.ids_json);
   if(!Array.isArray(stored)||stored.length>MAX_ITEMS||stored.some(id=>typeof id!=='string'))return fail(503,'unavailable');
   // Removed catalogue records are never reintroduced into the local list.
   const ids=stored.filter(id=>VALID_IDS.has(id));
   return reply(200,{ok:true,account_id:user.id,version:row.version,ids,unavailable_count:stored.length-ids.length,max_items:MAX_ITEMS});
  }
  const ids=body.action==='delete'?[]:body.ids;
  // Keep empty tombstones on deletion. Resetting to version zero would let a
  // previously opened tab overwrite a later deletion (ABA).
  const row=await env.HITS.prepare(`INSERT INTO free_account_manju_watchlists(account_id,version,ids_json,updated)
   SELECT ?,1,?,? WHERE EXISTS (${sessionSQL}) AND (?=0 OR EXISTS (SELECT 1 FROM free_account_manju_watchlists WHERE account_id=? AND version=?))
   ON CONFLICT(account_id) DO UPDATE SET version=free_account_manju_watchlists.version+1,ids_json=excluded.ids_json,updated=excluded.updated
   WHERE free_account_manju_watchlists.version=? RETURNING version`).bind(user.id,JSON.stringify(ids),now(),...sessionArgs,body.version,user.id,body.version,body.version).first();
  if(!row)return fail(409,'version_or_session_changed');
  return reply(200,{ok:true,account_id:user.id,version:row.version,ids,max_items:MAX_ITEMS});
 }catch{return fail(503,'unavailable');}
}
