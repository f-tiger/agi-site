// Zero-AI background verification. No wallet values or transaction records in logs.
import {watchSecret} from './ad-runner-config.mjs';
if(process.argv.includes('--if-configured')){
 const required=process.env.REQUIRE_WEB3_CONFIGURED==='true';
 let configured=false;
 // Pages deployment completion can precede propagation to the custom domain.
 for(let attempt=0;attempt<(required?7:1);attempt++){
  const r=await fetch('https://baipiaoji.com/api/ads?doctor=1',{signal:AbortSignal.timeout(30000),cache:'no-store'});
  const j=await r.json();
  if(!r.ok||!j.ok||typeof j.web3?.configured!=='boolean')throw Error('Cannot check live Web3 configuration');
  configured=j.web3.configured&&j.web3.enabled;
  if(configured)break;
  if(required&&attempt<6)await new Promise(resolve=>setTimeout(resolve,5000));
 }
 if(!configured){
  if(required)throw Error('Payment secrets were synced but live Web3 configuration did not become ready');
  console.log(JSON.stringify({skipped:true,reason:'Web3 not configured or disabled'}));process.exit(0);
 }
}
const secret=watchSecret(process.env);
let processed=0;
for(let batch=0;batch<7;batch++){
let r,j;
for(let attempt=0;attempt<3;attempt++){
 r=await fetch('https://baipiaoji.com/api/ad-web3-watch',{method:'POST',headers:{Authorization:'Bearer '+secret},signal:AbortSignal.timeout(120000)});
 j=await r.json();
 if(r.ok&&j.ok)break;
 // Deployment propagation and transient upstream failures; never retry auth failures.
 if(![502,503,504].includes(r.status)||attempt===2)break;
 await new Promise(resolve=>setTimeout(resolve,10000));
}
if(!r.ok||!j.ok){
 const code=/^(unauthorized|not_configured|chain_watch_unavailable|watch_(schema|chain_probe|log_probe|orders_read|orders_scan|health_write)_unavailable)$/.test(j.code)?j.code:'unexpected_response';
 const reason=/^(rpc_http_[1-5][0-9]{2}|rpc_invalid_json|rpc_rejected|wrong_chain|token_precision|chain_unavailable|not_configured|runtime_type_error|rpc_timeout|internal_error)$/.test(j.reason)?j.reason:'unspecified';
 throw Error('Web3 verification failed: HTTP '+r.status+' '+code+' '+reason);
}
processed+=j.processed;
if(j.processed<3)break;
}
console.log(JSON.stringify({ok:true,processed}));

const doctor=await fetch('https://baipiaoji.com/api/ads?doctor=1',{signal:AbortSignal.timeout(30000)});
const state=await doctor.json();
if(!doctor.ok||!state.selling||!state.rails?.wallet||!state.web3?.watch_healthy)throw Error('Watcher completed but Web3 selling is not healthy');
console.log(JSON.stringify({selling:true,wallet:true,watch_healthy:true}));
