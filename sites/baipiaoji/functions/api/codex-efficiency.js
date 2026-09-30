import {json} from '../../lib/ad-commerce.js';
import {getAccount,consumeRate} from '../../lib/free-account.js';
import {PLAN,ensureEfficiency,cleanup,ready,startDevice,approveDevice,deviceUser,status,evaluate,checkout,checkOrder,orderView,requestRefund} from '../../lib/codex-efficiency.js';
const fail=(code,status=400)=>json({ok:false,code},status);
const CLIENT_ACTIONS=new Set(['status','evaluate','history']);
const KNOWN=new Set(['consent_required','bad_nonce','bad_summary','too_large','idempotency_conflict','result_expired','evaluation_quota','project_quota','not_ready','rate_limited','device_expired','bad_device','not_found','refund_window','bad_destination','qa_checkout_disabled','wrong_site','checkout_busy']);
async function body(request){
 if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('Content-Type')||''))throw Error('bad_summary');
 if(Number(request.headers.get('Content-Length'))>20000||!request.body)throw Error('too_large');
 const reader=request.body.getReader(),chunks=[];let size=0;
 for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>20000){await reader.cancel();throw Error('too_large');}chunks.push(value);}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
 try{const b=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));if(!b||typeof b!=='object'||Array.isArray(b))throw Error();return b;}catch{throw Error('bad_summary');}
}
export async function onRequestGet({env}){try{if(!env.HITS)return fail('not_ready',503);await ensureEfficiency(env);return json({ok:true,plan:PLAN,ready:await ready(env),trial:true});}catch{return fail('not_ready',503);}}
export async function onRequestPost({request,env}){
 try{
  if(!env.HITS)return fail('not_ready',503);
  const u=new URL(request.url),origin=request.headers.get('Origin'),bearer=request.headers.get('Authorization');
  if(u.protocol!=='https:'||origin&&origin!==u.origin||request.headers.get('Sec-Fetch-Site')==='cross-site')return fail('origin',403);
  if(bearer&&request.headers.has('Cookie'))return fail('mixed_authentication');
  const b=await body(request);await ensureEfficiency(env);
  const ip=request.headers.get('CF-Connecting-IP');if(!ip||ip.length>64)return fail('not_ready',503);
  if(b.action==='device_start'){
   if(bearer)return fail('mixed_authentication');
   return json({ok:true,...await startDevice(env,b.challenge,ip)});
  }
  let user;
  if(bearer){
   user=await deviceUser(env,bearer.replace(/^Bearer /,''));if(!user)return fail('device_not_linked',401);
   if(!CLIENT_ACTIONS.has(b.action))return fail('scope',403);
  }else{
   if(origin!==u.origin)return fail('origin',403);
   user=await getAccount(request,env);if(!user)return fail('authentication_required',401);
   if(b.action!=='status'&&b.account_id!==user.id)return fail('account_changed',409);
  }
  if(!await consumeRate(env,'ce-api',user.id,60,60))return fail('rate_limited',429);
  await cleanup(env);
  if(b.action==='status')return json({ok:true,...await status(env,user),account_id:user.id});
  if(b.action==='device_approve')return json({ok:true,...await approveDevice(env,user,String(b.code||'').replace(/\s/g,'').toUpperCase())});
  if(b.action==='devices')return json({ok:true,devices:(await env.HITS.prepare('SELECT code,created,expires,revoked FROM ce_devices WHERE account_id=? ORDER BY created DESC').bind(user.id).all()).results});
  if(b.action==='device_revoke'){await env.HITS.prepare('UPDATE ce_devices SET revoked=1 WHERE account_id=? AND code=?').bind(user.id,String(b.code||'')).run();return json({ok:true});}
  if(b.action==='evaluate')return json({ok:true,...await evaluate(env,user,b)});
  if(b.action==='history')return json({ok:true,evaluations:(await env.HITS.prepare('SELECT project,result,created FROM ce_evaluations WHERE account_id=? ORDER BY created DESC LIMIT 100').bind(user.id).all()).results.map(r=>({...r,result:JSON.parse(r.result)}))});
  if(b.action==='checkout')return json({ok:true,order:await checkout(env,user,b,ip)});
  if(b.action==='orders')return json({ok:true,orders:(await env.HITS.prepare('SELECT * FROM ce_orders WHERE account_id=? ORDER BY created DESC LIMIT 30').bind(user.id).all()).results.map(orderView),refunds:(await env.HITS.prepare('SELECT r.order_id,r.state,r.tx,r.created FROM ce_refunds r JOIN ce_orders o ON o.id=r.order_id WHERE o.account_id=? ORDER BY r.created DESC LIMIT 30').bind(user.id).all()).results});
  if(b.action==='check'){
   const row=await env.HITS.prepare('SELECT * FROM ce_orders WHERE id=? AND account_id=?').bind(String(b.id||''),user.id).first();if(!row)return fail('not_found',404);
   return json({ok:true,order:await checkOrder(env,row,b.tx?String(b.tx).trim().toLowerCase():null)});
  }
  if(b.action==='refund')return json({ok:true,...await requestRefund(env,user,b)});
  if(b.action==='support'){
   const row=await env.HITS.prepare('SELECT id FROM ce_orders WHERE id=? AND account_id=?').bind(String(b.id||''),user.id).first();if(!row)return fail('not_found',404);
   await env.HITS.prepare('INSERT OR IGNORE INTO ce_support(order_id,account_id,created) VALUES(?,?,?)').bind(row.id,user.id,Math.floor(Date.now()/1000)).run();return json({ok:true,state:'requested'});
  }
  return fail('unknown_action');
 }catch(e){return KNOWN.has(e.message)?fail(e.message,e.message==='not_ready'?503:e.message==='rate_limited'?429:400):fail('temporarily_unavailable',503);}
}
