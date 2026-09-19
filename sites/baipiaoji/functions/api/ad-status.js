import {json,digest,publicStatus} from '../../lib/ad-commerce.js';
export async function onRequestPost({request,env}) {
 if(!env.HITS)return json({ok:false,code:'unavailable'},503);
 const token=(request.headers.get('Authorization')||'').replace(/^Bearer /,'');
 if(!/^[a-f0-9]{64}$/.test(token))return json({ok:false,code:'unauthorized'},401);
 try{
  const hash=await digest(token);
  const row=await env.HITS.prepare('SELECT * FROM bpj_ad_checkout WHERE token_hash=? AND id=?').bind(hash,hash.slice(0,32)).first();
  return row?json(publicStatus(row)):json({ok:false,code:'unknown'},404);
 }catch{return json({ok:false,code:'temporarily_unavailable'},503);}
}
