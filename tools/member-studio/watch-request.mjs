// Operator-runner diagnostics only. Never log response bodies, SQL or credentials.
const stages=/^(configuration|schema|chain_probe|log_probe|orders_read|orders_scan|cleanup|health_write|support_read|readiness)$/;
const reasons=/^(rpc_http_[1-5][0-9]{2}|rpc_invalid_json|rpc_rejected|wrong_chain|token_precision|chain_unavailable|not_configured|not_ready|database_schema|database_limit|database_error|runtime_type_error|rpc_timeout|internal_error)$/;
export class WatchRequestError extends Error {
 constructor(status,stage,reason){
  const http=Number.isInteger(status)&&status>=100&&status<=599?status:0;
  const safeStage=typeof stage==='string'&&stages.test(stage)?stage:'unknown',safeReason=typeof reason==='string'&&reasons.test(reason)?reason:'unspecified';
  super(`Request failed (HTTP ${http}; ${safeStage}; ${safeReason})`);
  this.status=http;this.stage=safeStage;this.reason=safeReason;
 }
}
export function watchFailureSummary(error){
 return error instanceof WatchRequestError?new WatchRequestError(error.status,error.stage,error.reason).message:'Request did not complete; no safe server diagnosis available';
}
function retryable(error){
 // These stages precede order processing, retention and health writes. Never
 // repeat an uncertain write, auth/configuration failure or a database failure.
 return [502,503,504].includes(error.status)&&['chain_probe','log_probe'].includes(error.stage)&&/^(rpc_http_(429|500|502|503|504)|rpc_timeout|chain_unavailable)$/.test(error.reason);
}
export async function requestWatchJSON(url,options={}, {retryProbes=false,request=fetch,wait=ms=>new Promise(resolve=>setTimeout(resolve,ms))}={}){
 const deadline=Date.now()+120000;
 for(let attempt=0;attempt<3;attempt++){
  let response;
  try{response=await request(url,{...options,redirect:'manual',signal:AbortSignal.timeout(Math.max(1,deadline-Date.now()))});}
  catch{throw new WatchRequestError(0,'unknown','unspecified');}
  let data;try{data=await response.json();}catch{throw new WatchRequestError(response.status,'unknown','unspecified');}
  if(response.ok&&data&&typeof data==='object'&&!Array.isArray(data)&&data.ok===true)return data;
  const error=new WatchRequestError(response.status,data?.stage,data?.reason);
  if(!retryProbes||!retryable(error)||attempt===2)throw error;
  const delay=5000*(attempt+1);
  if(deadline-Date.now()<=delay)throw error;
  await wait(delay);
 }
}
