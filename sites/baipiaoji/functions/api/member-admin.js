import {json,digest} from '../../lib/ad-commerce.js';
import {ensureMembers} from '../../lib/membership.js';
// Operator-only suspension; this never transfers/refunds money or creates paid rights.
export async function onRequestPost({request,env}){
 const secret=String(env.ADS_WATCH_SECRET||''),token=String(request.headers.get('Authorization')||'').replace(/^Bearer /,'');
 if(!env.HITS||secret.length<32)return json({ok:false},503);
 if(token.length>512||await digest(secret)!==await digest(token))return json({ok:false},401);
 const raw=await request.text();if(raw.length>2048)return json({ok:false},413);
 let b;try{b=JSON.parse(raw);}catch{return json({ok:false},400);}
 if(b?.action==='stats'){
  await ensureMembers(env.HITS);
  const payments=await env.HITS.prepare("SELECT COUNT(*) paid_orders,COUNT(DISTINCT member_id) paid_members,COALESCE(SUM(amount_units),0) gross_usdt_micro FROM wb_orders WHERE state='paid'").first();
  const active=await env.HITS.prepare('SELECT COUNT(*) n FROM wb_members WHERE suspended=0 AND ends_at>?').bind(Math.floor(Date.now()/1000)).first();
  return json({ok:true,...payments,active_members:active.n,unexpired_pending:(await env.HITS.prepare("SELECT COUNT(*) n FROM wb_orders WHERE state='pending' AND expires>?").bind(Math.floor(Date.now()/1000)).first()).n,net_revenue:null,recurring_billing:false});
 }
 if(b?.action==='support'){
  await ensureMembers(env.HITS);return json({ok:true,requests:(await env.HITS.prepare('SELECT id,member_id,message,created FROM wb_support WHERE resolved=0 ORDER BY created LIMIT 20').all()).results});
 }
 if(b?.action==='resolve'&&typeof b.id==='string'){
  await ensureMembers(env.HITS);await env.HITS.prepare('UPDATE wb_support SET resolved=1 WHERE id=?').bind(b.id).run();return json({ok:true});
 }
 if(!b||!['suspend','resume'].includes(b.action)||!/^[a-f0-9]{64}$/.test(b.order||''))return json({ok:false},400);
 try{await ensureMembers(env.HITS);const r=await env.HITS.prepare('UPDATE wb_members SET suspended=? WHERE id=(SELECT member_id FROM wb_orders WHERE id=?)').bind(b.action==='suspend'?1:0,b.order).run();return json({ok:true,changed:r.meta?.changes||0});}catch{return json({ok:false},503);}
}
