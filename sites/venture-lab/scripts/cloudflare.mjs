export const account=process.env.CLOUDFLARE_ACCOUNT_ID;
let d1Credential;
export async function api(path,{method='GET',payload,zone=false}={}){
 const isD1=path.startsWith(`accounts/${account}/d1/`);
 const names=isD1?(d1Credential?[d1Credential]:['CLOUDFLARE_API_TOKEN_ZONE','CLOUDFLARE_API_TOKEN','CF_API_TOKEN']):zone?['CLOUDFLARE_API_TOKEN_ZONE']:['CLOUDFLARE_API_TOKEN'];
 const seen=new Set();let last;
 for(const name of names){const token=process.env[name];if(!account||!token||seen.has(token))continue;seen.add(token);
  const response=await fetch('https://api.cloudflare.com/client/v4/'+path,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(payload?{body:JSON.stringify(payload)}:{}),signal:AbortSignal.timeout(20000)});
  const data=await response.json();if(response.ok&&data.success){if(isD1&&!d1Credential){d1Credential=name;console.log('D1 credential selected: '+name);}return data.result;}
  const codes=(data.errors||[]).map(x=>Number(x.code)).filter(Number.isFinite);
  last=Object.assign(new Error(`Cloudflare ${isD1?'D1':zone?'zone':'account'} operation failed: HTTP ${response.status}; codes ${codes.join(',')}`),{status:response.status,codes});
  // Existing owner credentials only. Alternatives apply only to read authorization failures.
  if(!isD1||method!=='GET'||![401,403].includes(response.status))throw last;
 }
 throw last||new Error('Required Cloudflare credential is unavailable.');
}
export async function database(){
 const list=await api(`accounts/${account}/d1/database?per_page=100`);
 const dedicated=list.filter(x=>x.name==='agi-venture-lab');if(dedicated.length>1)throw Error('Ambiguous experiment database.');
 if(dedicated[0])return dedicated[0];
 // Learn already uses this owner database. Only the new venture_events table is used here.
 if(list.length>=10){const shared=list.filter(x=>x.name==='after35-events');if(shared.length===1){console.log('Reusing after35-events with isolated venture_events table; no quota upgrade.');return shared[0];}}
 return null;
}
