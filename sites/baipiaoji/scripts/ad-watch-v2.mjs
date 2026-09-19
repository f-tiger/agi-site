// Zero-AI background verification. No wallet values or transaction records in logs.
const secret=process.env.ADS_WATCH_SECRET||'';
if(secret.length<32)throw Error('ADS_WATCH_SECRET must match Cloudflare and contain at least 32 characters');
let processed=0;
for(let batch=0;batch<7;batch++){
const r=await fetch('https://baipiaoji.com/api/ad-web3-watch',{method:'POST',headers:{Authorization:'Bearer '+secret},signal:AbortSignal.timeout(120000)});
const j=await r.json();
if(!r.ok||!j.ok)throw Error('Web3 verification failed; check Cloudflare wallet/RPC configuration and shared watch secret');
processed+=j.processed;
if(j.processed<3)break;
}
console.log(JSON.stringify({ok:true,processed}));
