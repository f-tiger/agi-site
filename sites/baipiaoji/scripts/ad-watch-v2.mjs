// Zero-AI background verification. No wallet values or transaction records in logs.
import {watchSecret} from './ad-runner-config.mjs';
if(process.argv.includes('--if-configured')){
 const r=await fetch('https://baipiaoji.com/api/ads?doctor=1',{signal:AbortSignal.timeout(30000)});
 const j=await r.json();
 if(!r.ok||!j.ok||typeof j.web3?.configured!=='boolean')throw Error('Cannot check live Web3 configuration');
 if(!j.web3.configured||!j.web3.enabled){console.log(JSON.stringify({skipped:true,reason:'Web3 not configured or disabled'}));process.exit(0);}
}
const secret=watchSecret(process.env);
let processed=0;
for(let batch=0;batch<7;batch++){
const r=await fetch('https://baipiaoji.com/api/ad-web3-watch',{method:'POST',headers:{Authorization:'Bearer '+secret},signal:AbortSignal.timeout(120000)});
const j=await r.json();
if(!r.ok||!j.ok)throw Error('Web3 verification failed; check Cloudflare wallet/RPC configuration and shared watch secret');
processed+=j.processed;
if(j.processed<3)break;
}
console.log(JSON.stringify({ok:true,processed}));

const doctor=await fetch('https://baipiaoji.com/api/ads?doctor=1',{signal:AbortSignal.timeout(30000)});
const state=await doctor.json();
if(!doctor.ok||!state.selling||!state.rails?.wallet||!state.web3?.watch_healthy)throw Error('Watcher completed but Web3 selling is not healthy');
console.log(JSON.stringify({selling:true,wallet:true,watch_healthy:true}));
