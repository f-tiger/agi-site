import {json,digest} from '../../sites/baipiaoji/lib/ad-commerce.js';
import {recoverSiteMemberReceipts} from './receipts.mjs';
// A distinct route is deliberate: an older deployment must fail closed, rather
// than ignore a new body flag and execute its normal retention-cleanup watcher.
export async function recoverReceipts({request,env}){
 const secret=String(env.ADS_WATCH_SECRET||''),token=String(request.headers.get('Authorization')||'').replace(/^Bearer /,'');
 if(!env.HITS||secret.length<32)return json({ok:false,code:'not_configured'},503);
 if(token.length>512||await digest(secret)!==await digest(token))return json({ok:false,code:'unauthorized'},401);
 try{return json(await recoverSiteMemberReceipts(env));}
 catch(error){return json({ok:false,code:'membership_recovery_unavailable',stage:error.stage,reason:error.reason},503);}
}
