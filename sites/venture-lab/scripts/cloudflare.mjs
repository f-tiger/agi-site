export const account=process.env.CLOUDFLARE_ACCOUNT_ID;
export async function api(path,{zone=false}={}){
 const token=process.env[zone?'CLOUDFLARE_API_TOKEN_ZONE':'CLOUDFLARE_API_TOKEN'];
 if(!account||!token)throw Error('Required Cloudflare credential is unavailable.');
 const response=await fetch('https://api.cloudflare.com/client/v4/'+path,{headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},signal:AbortSignal.timeout(20000)});
 const data=await response.json();if(response.ok&&data.success)return data.result;
 const codes=(data.errors||[]).map(x=>Number(x.code)).filter(Number.isFinite);
 throw Error(`Cloudflare ${zone?'zone':'account'} read failed: HTTP ${response.status}; codes ${codes.join(',')}`);
}
