import {json,settings,validate,ensure,digest,stripe,seconds} from '../../lib/ad-commerce.js';
export async function onRequestPost({request,env}) {
 const config=settings(env);
 if(!config.ready)return json({ok:false,code:'not_configured'},503);
 const origin=request.headers.get('Origin');
 if(origin&&origin!==new URL(request.url).origin)return json({ok:false,code:'origin'},403);
 if(Number(request.headers.get('Content-Length')||0)>4096)return json({ok:false,code:'too_large'},413);
 const raw=await request.text();if(raw.length>4096)return json({ok:false,code:'too_large'},413);
 let b;try{b=JSON.parse(raw);}catch{return json({ok:false,code:'badjson'},400);}
 if(!b||typeof b!=='object')return json({ok:false,code:'badjson'},400);
 if(b.website)return json({ok:false,code:'refused'},400);
 const input=validate(b);if(input.error)return json({ok:false,code:input.error},400);
 if(b.accept_queue!==true)return json({ok:false,code:'queue_consent'},400);
 // A client-generated capability makes retries recover the SAME Checkout Session.
 // Only its hash is stored. It is never put in a query string or a payment URL.
 const token=String(b.order_token||'');
 if(!/^[a-f0-9]{64}$/.test(token))return json({ok:false,code:'bad_token'},400);
 const hash=await digest(token), id=hash.slice(0,32),now=seconds();
 try {
  await ensure(env.HITS);
  await env.HITS.prepare(`INSERT OR IGNORE INTO bpj_ad_checkout
   (id,token_hash,name,url,pitch,cat,lang,price_cents,currency,days,livemode,created)
   SELECT ?,?,?,?,?,?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM bpj_ad_checkout WHERE url=? AND created>?)<5`).bind(id,hash,input.name,input.url,input.pitch,input.cat,input.lang,config.price,config.currency,config.days,config.mode==='live'?1:0,now,input.url,now-3600).run();
  const row=await env.HITS.prepare('SELECT * FROM bpj_ad_checkout WHERE id=?').bind(id).first();
  if(!row)return json({ok:false,code:'rate_limited'},429);
  if(!['creating','pending'].includes(row.state))return json({ok:false,code:'order_exists',id},409);
  if(row.name!==input.name||row.url!==input.url||row.pitch!==input.pitch||row.cat!==input.cat)return json({ok:false,code:'order_changed',id},409);
  // Stripe idempotency records may be pruned after 24h: don't create another charge on an old retry.
  if(now-row.created>23*3600||(!row.session&&now-row.created>1800))return json({ok:false,code:'order_expired',id},409);
  const base=config.origin+(row.lang==='en'?'/en':'');
  let s;
  if(row.session)s=await stripe(env,'checkout/sessions/'+encodeURIComponent(row.session));
  else s=await stripe(env,'checkout/sessions',{
   mode:'payment',client_reference_id:id,'metadata[bpj_order]':id,'payment_intent_data[metadata][bpj_order]':id,
   'line_items[0][quantity]':'1','line_items[0][price_data][currency]':row.currency,
   'line_items[0][price_data][unit_amount]':String(row.price_cents),
   'line_items[0][price_data][tax_behavior]':'exclusive',
   'line_items[0][price_data][product_data][name]':`BPJ ${row.cat} sponsored slot / ${row.days} days`,
   'automatic_tax[enabled]':env.ADS_AUTOMATIC_TAX==='true'?'true':'false',
   'adaptive_pricing[enabled]':'false',
   'custom_text[submit][message]':'Three sponsored slots per category. Paid orders queue automatically when full. Term starts at scheduled display time. No traffic or sales guarantee. One-time payment; no automatic renewal.',
   success_url:base+'/advertise.html?payment=returned',cancel_url:base+'/advertise.html?payment=cancelled',
   expires_at:String(row.created+3600)
  },'bpj-ad-'+id);
  if(!s.url||!s.url.startsWith('https://checkout.stripe.com/')||Number(s.livemode)!==row.livemode)return json({ok:false,code:'checkout_unavailable',id},502);
  await env.HITS.prepare("UPDATE bpj_ad_checkout SET session=?,state='pending' WHERE id=? AND state='creating'").bind(s.id,id).run();
  return json({ok:true,id,pay_url:s.url});
 }catch{return json({ok:false,code:'temporarily_unavailable',id},503);}
}
