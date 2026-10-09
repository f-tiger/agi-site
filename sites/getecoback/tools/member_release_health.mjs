// Non-destructive push-release readiness, not a payment/receipt verification.
// Existing GET may CREATE IF NOT EXISTS; it does not process orders or purge data.
import {pathToFileURL} from 'node:url';
const origin='https://getecoback.com';
const expected={ok:true,ready:true,site:'eco',chain:'bsc',token:'USDT',auto_renew:false};
const plan={id:'eco-workbench-30',price_units:9000000,quote_base:9020000,days:30,workspaces:50,versions:10,max_bytes:65536,total_bytes:5242880,grace_days:30};
export function validateMemberStatus(data){
 for(const [key,value]of Object.entries(expected))if(data?.[key]!==value)throw Error('Membership status mismatch: '+key);
 for(const [key,value]of Object.entries(plan))if(data?.plan?.[key]!==value)throw Error('Membership plan mismatch: '+key);
 // ready already requires the existing <4-hour watcher health in memberReady().
 // This check never refreshes it or substitutes its own timestamp.
 return {site:'eco',ready:true,check:'non-destructive-release-readiness',freshChainProbe:false,watchKeyAuthentication:false,ordersProcessed:false};
}
export async function checkMemberReleaseHealth(request=fetch){
 const r=await request(origin+'/api/member',{method:'GET',credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(20000)});
 if(r.status!==200)throw Error('Membership status HTTP '+r.status);
 let data;try{data=await r.json();}catch{throw Error('Membership status is not JSON');}
 return validateMemberStatus(data);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(await checkMemberReleaseHealth()));
