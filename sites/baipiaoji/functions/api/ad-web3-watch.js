import {json,digest} from '../../lib/ad-commerce.js';
import {watchWeb3} from '../../lib/ad-web3.js';
export async function onRequestPost({request,env}){
 const secret=String(env.ADS_WATCH_SECRET||'');if(secret.length<32||!env.HITS)return json({ok:false,code:'not_configured'},503);
 const token=String(request.headers.get('Authorization')||'').replace(/^Bearer /,'');
 if(token.length>512||await digest(token)!==await digest(secret))return json({ok:false,code:'unauthorized'},401);
 try{return json(await watchWeb3(env));}catch(error){const code=/^watch_(schema|chain_probe|log_probe|orders_read|orders_scan|health_write)_unavailable$/.test(error.message)?error.message:'chain_watch_unavailable';const reason=/^(rpc_http_[1-5][0-9]{2}|rpc_invalid_json|rpc_rejected|wrong_chain|token_precision|chain_unavailable|not_configured|runtime_type_error|rpc_timeout|internal_error)$/.test(error.reason)?error.reason:undefined;return json({ok:false,code,reason},503);}
}
