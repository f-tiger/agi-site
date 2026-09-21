import {createHash,createHmac} from 'node:crypto';
export const OWNER_WALLET_HASH='71dd0b6c589b100159753cfa6e3aeebbab0e0a57efe216e6f7aeb80b66a78e3e';
export function walletMatchesOwner(wallet){
 return /^0x[0-9a-fA-F]{40}$/.test(wallet)&&createHash('sha256').update(wallet.toLowerCase()).digest('hex')===OWNER_WALLET_HASH;
}
export function watchSecret(env){
 const explicit=env.ADS_WATCH_SECRET||'';
 if(explicit){if(explicit.length<32)throw Error('ADS_WATCH_SECRET must contain at least 32 characters');return explicit;}
 if(!env.CLOUDFLARE_API_TOKEN)throw Error('Missing existing Cloudflare API token');
 // Dedicated subkey: never send the Cloudflare credential to the public site.
 return createHmac('sha256',env.CLOUDFLARE_API_TOKEN).update('f-tiger/agi-site:bpj-web3-watch:v1').digest('hex');
}
export async function configure(env,request=fetch){
 const wallet=(env.ADS_WALLET||'').trim();
 if(!wallet)return {configured:false,missing:'GitHub ADS_WALLET secret'};
 // Prevent accidental replacement with another recipient; address stays out of git/logs.
 if(!walletMatchesOwner(wallet))throw Error('ADS_WALLET does not match the owner-approved BSC recipient');
 if(!env.CLOUDFLARE_API_TOKEN)throw Error('Missing existing Cloudflare API token');
 const secret=watchSecret(env);
 async function api(path,method='GET',body){
  const r=await request('https://api.cloudflare.com/client/v4'+path,{method,headers:{Authorization:'Bearer '+env.CLOUDFLARE_API_TOKEN,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(30000)});
  let j;try{j=await r.json();}catch{throw Error('Cloudflare returned a non-JSON response');}
  // Responses may contain secrets. Never surface their body or error messages.
  if(!r.ok||!j.success)throw Error('Cloudflare '+method+' failed (HTTP '+r.status+'); check Pages permissions');
  return j.result;
 }
 let account=env.CLOUDFLARE_ACCOUNT_ID;
 if(!account){const accounts=await api('/accounts');if(accounts.length!==1)throw Error('Set CLOUDFLARE_ACCOUNT_ID');account=accounts[0].id;}
 const path='/accounts/'+encodeURIComponent(account)+'/pages/projects/aiyangmao';
 const before=await api(path);
 if(!before.deployment_configs?.production?.d1_databases?.HITS)throw Error('Production HITS database binding missing');
 // Pages PATCH merges environment keys; omitted variables/bindings are preserved.
 await api(path,'PATCH',{deployment_configs:{production:{env_vars:{ADS_WALLET:{type:'secret_text',value:wallet},ADS_WATCH_SECRET:{type:'secret_text',value:secret}}}}});
 const after=await api(path);
 const vars=after.deployment_configs?.production?.env_vars||{};
 if(!vars.ADS_WALLET||!vars.ADS_WATCH_SECRET||!after.deployment_configs?.production?.d1_databases?.HITS)throw Error('Cloudflare configuration verification failed');
 for(const name of Object.keys(before.deployment_configs.production.env_vars||{})){if(!(name in vars))throw Error('Existing environment variable was not preserved');}
 if(JSON.stringify(before.deployment_configs.production.d1_databases)!==JSON.stringify(after.deployment_configs.production.d1_databases))throw Error('Database bindings changed unexpectedly');
 return {configured:true,redeploy_required:true};
}
