import {json,digest,seconds} from '../../lib/ad-commerce.js';
import {PLAN,ensureMembers,memberByToken,memberStatus,memberReady,createOrder,checkOrder,orderStatus,saveSpace,rate} from '../../lib/membership.js';
const tokenOf=r=>String(r.headers.get('Authorization')||'').replace(/^Bearer /,'');
export async function onRequestGet({env}){
 try{if(!env.HITS)return json({ok:false,code:'not_ready'},503);await ensureMembers(env.HITS);return json({ok:true,version:1,ready:await memberReady(env),plan:PLAN,chain:'bsc',token:'USDT',auto_renew:false});}catch{return json({ok:false,code:'temporarily_unavailable'},503);}
}
export async function onRequestPost({request,env}){
 if(!env.HITS)return json({ok:false,code:'not_ready'},503);
 const origin=request.headers.get('Origin');if(origin&&origin!==new URL(request.url).origin)return json({ok:false,code:'origin'},403);
 if(!request.headers.get('Content-Type')?.startsWith('application/json'))return json({ok:false,code:'json_required'},415);
 const token=tokenOf(request);if(!/^[a-f0-9]{64}$/.test(token))return json({ok:false,code:'unauthorized'},401);
 if(Number(request.headers.get('Content-Length')||0)>100000)return json({ok:false,code:'too_large'},413);
 let b;try{const raw=await request.text();if(new TextEncoder().encode(raw).length>100000)return json({ok:false,code:'too_large'},413);b=JSON.parse(raw);}catch{return json({ok:false,code:'badjson'},400);}
 if(!b||typeof b!=='object'||Array.isArray(b))return json({ok:false,code:'badjson'},400);
 try{
  const db=env.HITS;await ensureMembers(db);let m=await memberByToken(db,token);
  if(b.action==='status')return json({ok:true,...memberStatus(m)});
  if(b.action==='checkout'){
   if(b.accept_terms!==true||b.key_saved!==true)return json({ok:false,code:'consent_required'},400);
   return json({ok:true,order:await createOrder(env,token,b.nonce,request.headers.get('CF-Connecting-IP')||'unknown')});
  }
  if(!m)return json({ok:false,code:'unauthorized'},401);
  await rate(db,'api:'+m.id,120,60);
  if(b.action==='support'){
   if(typeof b.message!=='string'||!b.message.trim()||b.message.length>1000||/[a-f0-9]{64}/i.test(b.message))return json({ok:false,code:'bad_support'},400);
   await rate(db,'support:'+m.id,3,86400);
   await db.prepare('INSERT INTO wb_support(id,member_id,message,created) VALUES(?,?,?,?)').bind(crypto.randomUUID(),m.id,b.message.trim(),seconds()).run();return json({ok:true});
  }
  if(b.action==='orders')return json({ok:true,orders:(await db.prepare('SELECT * FROM wb_orders WHERE member_id=? ORDER BY created DESC LIMIT 20').bind(m.id).all()).results.map(orderStatus)});
  if(b.action==='check'){
   const row=await db.prepare('SELECT * FROM wb_orders WHERE id=? AND member_id=?').bind(String(b.id||''),m.id).first();if(!row)return json({ok:false,code:'not_found'},404);
   return json({ok:true,order:await checkOrder(env,row,b.tx?String(b.tx).trim().toLowerCase():null)});
  }
  if(b.action==='rotate'){
   if(!/^[a-f0-9]{64}$/.test(b.new_key||'')||b.new_key===token)return json({ok:false,code:'bad_key'},400);
   await db.prepare('UPDATE wb_members SET token_hash=? WHERE id=? AND token_hash=?').bind(await digest(b.new_key),m.id,await digest(token)).run();return json({ok:true});
  }
  // Export and deletion stay available in the grace period, including suspension.
  const readable=m.ends_at>0&&m.ends_at+PLAN.grace_days*86400>seconds();
  if(b.action==='delete'){
   await db.batch([db.prepare('DELETE FROM wb_versions WHERE member_id=? AND space_id=?').bind(m.id,String(b.id||'')),db.prepare('DELETE FROM wb_spaces WHERE member_id=? AND id=?').bind(m.id,String(b.id||''))]);return json({ok:true});
  }
  if(!readable)return json({ok:false,code:'membership_required'},403);
  if(b.action==='list'){
   const spaces=await db.prepare('SELECT id,name,product,revision,updated FROM wb_spaces WHERE member_id=? ORDER BY updated DESC').bind(m.id).all();const usage=await db.prepare('SELECT COALESCE(SUM(bytes),0) bytes FROM wb_versions WHERE member_id=?').bind(m.id).first();return json({ok:true,spaces:spaces.results,usage,member:memberStatus(m)});
  }
  if(b.action==='history')return json({ok:true,versions:(await db.prepare('SELECT revision,bytes,created FROM wb_versions WHERE member_id=? AND space_id=? ORDER BY revision DESC').bind(m.id,String(b.id||'')).all()).results});
  if(b.action==='read'){
   const row=await db.prepare('SELECT body,revision,created FROM wb_versions WHERE member_id=? AND space_id=? AND revision=?').bind(m.id,String(b.id||''),Number.isSafeInteger(b.revision)?b.revision:-1).first();if(!row)return json({ok:false,code:'not_found'},404);return json({ok:true,data:JSON.parse(row.body),revision:row.revision,created:row.created});
  }
  if(b.action==='save')return json(await saveSpace(db,m,b));
  return json({ok:false,code:'bad_action'},400);
 }catch(e){
  const known=['bad_nonce','bad_key','not_ready','suspended','rate_limited','quote_capacity','membership_required','bad_workspace','bad_backup','storage_quota','workspace_quota','revision_conflict','chain_unavailable','network_config_changed','wrong_chain','token_precision'];
  const code=known.includes(e.message)?e.message:/checkout_busy/.test(e.message)?'checkout_busy':'temporarily_unavailable';
  return json({ok:false,code},code==='rate_limited'?429:['membership_required','suspended'].includes(code)?403:['revision_conflict','quote_capacity','storage_quota','workspace_quota','checkout_busy'].includes(code)?409:code.startsWith('bad_')?400:503);
 }
}
