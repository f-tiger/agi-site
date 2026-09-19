import {json,validate,digest} from '../../lib/ad-commerce.js';
import {ensureWeb3,createWeb3Order,web3Order,web3Status,scanOrder,verifyTransfer,deliverWeb3} from '../../lib/ad-web3.js';
export async function onRequestPost({request,env}){
 if(!env.HITS)return json({ok:false,code:'not_configured'},503);
 const origin=request.headers.get('Origin');if(origin&&origin!==new URL(request.url).origin)return json({ok:false,code:'origin'},403);
 if(Number(request.headers.get('Content-Length')||0)>4096)return json({ok:false,code:'too_large'},413);
 const raw=await request.text();if(raw.length>4096)return json({ok:false,code:'too_large'},413);
 let b;try{b=JSON.parse(raw);}catch{return json({ok:false,code:'badjson'},400);}
 if(!b||typeof b!=='object')return json({ok:false,code:'badjson'},400);
 const token=String(request.headers.get('Authorization')||'').replace(/^Bearer /,'');
 if(!/^[a-f0-9]{64}$/.test(token))return json({ok:false,code:'unauthorized'},401);
 try{
  await ensureWeb3(env.HITS);
  if(b.action==='create'){
   const input=validate(b);if(input.error)return json({ok:false,code:input.error},400);
   if(b.website)return json({ok:false,code:'refused'},400);
   if(b.accept_queue!==true)return json({ok:false,code:'queue_consent'},400);
   return json(await createWeb3Order(env,input,token,request.headers.get('CF-Connecting-IP')||'unknown'));
  }
  const hash=await digest(token),row=await web3Order(env.HITS,hash.slice(0,32));
  if(!row||row.token_hash!==hash)return json({ok:false,code:'unknown'},404);
  if(b.action==='status')return json(web3Status(row));
  if(b.action!=='check')return json({ok:false,code:'bad_action'},400);
  if(row.state!=='pending')return json(web3Status(row));
  if(b.tx){
   const now=Math.floor(Date.now()/1000);
   const lease=await env.HITS.prepare('UPDATE bpj_ad_web3 SET checked_at=? WHERE order_id=? AND checked_at<=?').bind(now,row.id,now-15).run();
   if(!lease.meta?.changes)return json({ok:false,code:'rate_limited'},429);
   const proof=await verifyTransfer(env,row,String(b.tx).trim().toLowerCase());
   if(proof.code==='verified')return json(await deliverWeb3(env,row,proof));
   return json({...web3Status(row),check:proof.code});
  }
  return json(await scanOrder(env,row));
 }catch(e){
  const allowed=['not_configured','order_changed','order_exists','rate_limited','quote_capacity','wrong_chain','network_config_changed','chain_unavailable','scan_capacity'];
  const code=allowed.includes(e.message)?e.message:'temporarily_unavailable';
  return json({ok:false,code},code==='rate_limited'?429:['order_changed','order_exists','quote_capacity'].includes(code)?409:503);
 }
}
