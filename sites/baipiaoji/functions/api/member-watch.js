import {json,digest} from '../../lib/ad-commerce.js';
import {watchMembers} from '../../lib/membership.js';
export async function onRequestPost({request,env}){
 const secret=String(env.ADS_WATCH_SECRET||''),token=String(request.headers.get('Authorization')||'').replace(/^Bearer /,'');
 if(!env.HITS||secret.length<32)return json({ok:false,code:'not_configured'},503);
 if(token.length>512||await digest(secret)!==await digest(token))return json({ok:false,code:'unauthorized'},401);
 try{return json({ok:true,...await watchMembers(env)});}catch(error){return json({ok:false,code:'membership_watch_unavailable',stage:error.stage,reason:error.reason},503);}
}
