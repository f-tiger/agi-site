import {json,digest} from '../../lib/ad-commerce.js';
import {watchWeb3} from '../../lib/ad-web3.js';
export async function onRequestPost({request,env}){
 const secret=String(env.ADS_WATCH_SECRET||'');if(secret.length<32||!env.HITS)return json({ok:false,code:'not_configured'},503);
 const token=String(request.headers.get('Authorization')||'').replace(/^Bearer /,'');
 if(token.length>512||await digest(token)!==await digest(secret))return json({ok:false,code:'unauthorized'},401);
 try{return json(await watchWeb3(env));}catch{return json({ok:false,code:'chain_watch_unavailable'},503);}
}
