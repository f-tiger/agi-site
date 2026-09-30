import {json,digest,seconds} from '../../lib/ad-commerce.js';
import {ensureEfficiency,completeRefund} from '../../lib/codex-efficiency.js';
export async function onRequestPost({request,env}){
 const secret=String(env.ADS_WATCH_SECRET||''),token=String(request.headers.get('Authorization')||'').replace(/^Bearer /,'');
 if(!env.HITS||secret.length<32)return json({ok:false},503);
 if(token.length>512||await digest(secret)!==await digest(token))return json({ok:false},401);
 const raw=await request.text();if(raw.length>2048)return json({ok:false},413);
 try{
  const b=JSON.parse(raw);await ensureEfficiency(env);
  if(b.action==='support')return json({ok:true,requests:(await env.HITS.prepare('SELECT * FROM ce_support WHERE resolved=0 ORDER BY created LIMIT 20').all()).results});
  if(b.action==='resolve_support'&&/^[a-f0-9]{64}$/.test(b.id||'')){await env.HITS.prepare('UPDATE ce_support SET resolved=1 WHERE order_id=?').bind(b.id).run();return json({ok:true});}
  if(b.action==='refunds')return json({ok:true,requests:(await env.HITS.prepare("SELECT r.*,o.amount_units,o.chain FROM ce_refunds r JOIN ce_orders o ON o.id=r.order_id WHERE r.state='requested' ORDER BY r.created LIMIT 20").all()).results});
  if(b.action==='complete_refund'&&/^[a-f0-9]{64}$/.test(b.id||'')&&/^0x[a-f0-9]{64}$/.test(b.tx||''))return json({ok:true,...await completeRefund(env,b.id,b.tx)});
  if(b.action==='stats'){
   const payments=await env.HITS.prepare("SELECT COUNT(*) paid_orders,COUNT(DISTINCT account_id) paid_accounts,COALESCE(SUM(amount_units),0) gross_usdt_micro FROM ce_orders WHERE paid_at IS NOT NULL AND qa=0").first();
   const refunded=await env.HITS.prepare("SELECT COUNT(*) refunded_orders,COALESCE(SUM(amount_units),0) refunded_usdt_micro FROM ce_orders WHERE state='refunded' AND qa=0").first();
   const use=await env.HITS.prepare("SELECT COUNT(*) periods,SUM(used) evaluations FROM ce_periods WHERE kind='paid' AND qa=0").first();
   const active=await env.HITS.prepare("SELECT COUNT(DISTINCT account_id) n FROM ce_periods WHERE kind='paid' AND qa=0 AND revoked=0 AND starts<=? AND ends>?").bind(seconds(),seconds()).first();
   return json({ok:true,...payments,...refunded,paid_usage:use,active_accounts:active.n,net_profit:null,auto_renew:false});
  }
  return json({ok:false,code:'unknown_action'},400);
 }catch{return json({ok:false,code:'not_completed'},400);}
}
