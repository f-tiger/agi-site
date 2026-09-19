import {json,ensure,signature,fulfill,seconds} from '../../lib/ad-commerce.js';
import {onRequestPost as legacy} from '../../lib/legacy-ad-webhook.js';
export async function onRequestPost(ctx) {
 const {request,env}=ctx;
 if(!env.HITS||!env.STRIPE_WEBHOOK_SECRET)return json({ok:false,code:'not_configured'},503);
 const raw=await request.text();
 if(!await signature(env.STRIPE_WEBHOOK_SECRET,request.headers.get('Stripe-Signature'),raw).catch(()=>false))return json({ok:false,code:'badsig'},400);
 let ev;try{ev=JSON.parse(raw);}catch{return json({ok:false,code:'badjson'},400);}
 if(!/^evt_/.test(ev.id||'')||!ev.data?.object)return json({ok:false,code:'bad_event'},400);
 const s=ev.data.object, now=seconds();
 try {
  await ensure(env.HITS);
  const p=(sql,...args)=>env.HITS.prepare(sql).bind(...args);
  if(await p('SELECT id FROM bpj_ad_events WHERE id=?',ev.id).first())return json({ok:true,code:'already'});
  if(['charge.refunded','charge.dispute.created'].includes(ev.type)){
   const intent=typeof s.payment_intent==='string'?s.payment_intent:s.payment_intent?.id;
   if(!/^pi_/.test(intent||''))return json({ok:true,code:'ignored'});
   if(ev.type==='charge.refunded'&&!(s.amount_refunded>0))return json({ok:true,code:'ignored'});
   const reason=ev.type==='charge.refunded'?'refunded':'disputed';
   // Retain a tombstone even when this arrives BEFORE the paid event.
   await env.HITS.batch([
    p('INSERT OR REPLACE INTO bpj_ad_reversals(intent,reason,created) VALUES(?,?,?)',intent,reason,now),
    p('UPDATE bpj_ad_checkout SET state=? WHERE intent=?',reason,intent),
    p('INSERT OR IGNORE INTO bpj_ad_events(id,type,created) VALUES(?,?,?)',ev.id,ev.type,now)
   ]);
   return json({ok:true,code:reason});
  }
  if(!s.metadata?.bpj_order){
   // Preserve pre-upgrade Payment Link orders. New orders use server Checkout only.
   return legacy({...ctx,request:new Request(request.url,{method:'POST',headers:request.headers,body:raw})});
  }
  if(['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(ev.type)){
   const result=await fulfill(env.HITS,s,ev.id,ev.type,now);
   return json(result,result.ok?200:409);
  }
  if(['checkout.session.expired','checkout.session.async_payment_failed'].includes(ev.type)){
   const state=ev.type.endsWith('expired')?'expired':'failed';
   await env.HITS.batch([
    p("UPDATE bpj_ad_checkout SET state=? WHERE id=? AND session=? AND state IN ('creating','pending')",state,s.metadata.bpj_order,s.id),
    p('INSERT OR IGNORE INTO bpj_ad_events(id,type,created) VALUES(?,?,?)',ev.id,ev.type,now)
   ]);
   return json({ok:true,code:state});
  }
  return json({ok:true,code:'ignored'});
 }catch{return json({ok:false,code:'retry'},503);}
}
