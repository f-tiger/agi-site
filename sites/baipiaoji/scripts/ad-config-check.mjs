// Read-only runner check. Never print API bodies, keys, wallet addresses or lengths.
import {createHash} from 'node:crypto';
const env=process.env;
const expected='71dd0b6c589b100159753cfa6e3aeebbab0e0a57efe216e6f7aeb80b66a78e3e';
const wallet=(env.ADS_WALLET||'').trim();
const report={github:{cloudflare_token:!!env.CLOUDFLARE_API_TOKEN,wallet:!!wallet,wallet_matches_owner:!!wallet&&createHash('sha256').update(wallet.toLowerCase()).digest('hex')===expected,watch_secret:!!env.ADS_WATCH_SECRET}};
async function get(path){
 const r=await fetch('https://api.cloudflare.com/client/v4'+path,{headers:{Authorization:'Bearer '+env.CLOUDFLARE_API_TOKEN},signal:AbortSignal.timeout(30000)});
 const j=await r.json();
 if(!r.ok||!j.success)throw Error('Cloudflare read failed (HTTP '+r.status+')');
 return j.result;
}
try{
 if(!env.CLOUDFLARE_API_TOKEN)throw Error('CLOUDFLARE_API_TOKEN missing');
 let account=env.CLOUDFLARE_ACCOUNT_ID;
 if(!account){const accounts=await get('/accounts');if(accounts.length!==1)throw Error('Set CLOUDFLARE_ACCOUNT_ID to identify project account');account=accounts[0].id;}
 const p=await get('/accounts/'+encodeURIComponent(account)+'/pages/projects/aiyangmao');
 const vars=p.deployment_configs?.production?.env_vars||{};
 report.cloudflare={project_access:true,wallet:!!vars.ADS_WALLET,watch_secret:!!vars.ADS_WATCH_SECRET,database:!!p.deployment_configs?.production?.d1_databases?.HITS};
 console.log(JSON.stringify(report));
}catch(e){console.log(JSON.stringify(report));console.error(e.message);process.exitCode=1;}
