// Non-destructive release readiness only; not a fresh chain or payment check.
import {pathToFileURL} from 'node:url';
const origin='https://agiscorecard.com';
const expected={ok:true,ready:true,site:'agi',chain:'bsc',token:'USDT',auto_renew:false};
const plan={id:'agi-workbench-30',site:'agi',price_units:9000000,quote_base:9010000,days:30,workspaces:50,versions:10,max_bytes:65536,total_bytes:5242880,grace_days:30};
export function validateMemberStatus(data){
 for(const [key,value]of Object.entries(expected))if(data?.[key]!==value)throw Error('Membership status mismatch: '+key);
 for(const [key,value]of Object.entries(plan))if(data?.plan?.[key]!==value)throw Error('Membership plan mismatch: '+key);
 return {site:'agi',ready:true,check:'non-destructive-release-readiness',freshChainProbe:false,watchKeyAuthentication:false,ordersProcessed:false};
}
export async function checkMemberReleaseHealth(request=fetch){
 const response=await request(origin+'/api/member',{method:'GET',credentials:'omit',cache:'no-store',redirect:'manual',signal:AbortSignal.timeout(20000)});
 if(response.status!==200)throw Error('Membership status HTTP '+response.status);
 let data;try{data=await response.json();}catch{throw Error('Membership status is not JSON');}
 return validateMemberStatus(data);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(await checkMemberReleaseHealth()));
