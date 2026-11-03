// Configure only a scoped service credential on the two existing Workers.
// Bot credentials and recipient remain in SunWatch; no secret values are read.
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {memberSecret} from '../member-studio/ops.mjs';
const NAME='CAPITAL_RADAR_RELAY_KEY';
export async function configureRelay(env,request=fetch){
 if(!env.CLOUDFLARE_API_TOKEN||!env.CLOUDFLARE_ACCOUNT_ID)throw Error('Existing deployment credentials required');
 const key=createHash('sha256').update(memberSecret('agi',env)+':capital-radar-relay:v1').digest('hex');
 const root='https://api.cloudflare.com/client/v4/accounts/'+encodeURIComponent(env.CLOUDFLARE_ACCOUNT_ID)+'/workers/scripts/';
 async function api(script,method='GET',body){
  let response,data;
  try{
   response=await request(root+script+'/secrets',{method,headers:{Authorization:'Bearer '+env.CLOUDFLARE_API_TOKEN,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(30000)});
   data=await response.json();
  }catch{throw Error('Private relay binding request failed');}
  if(!response.ok||data.success!==true)throw Error('Private relay binding rejected for '+script+' (HTTP '+response.status+')');
  return data.result;
 }
 // Check both existing services before any write. List endpoints return names,
 // never current secret values. Preserve every pre-existing secret binding.
 const before={};
 for(const script of ['agiscorecard','sunwatch']){
  const list=await api(script);if(!Array.isArray(list))throw Error('Invalid binding metadata');
  before[script]=list.map(x=>x.name);
 }
 for(const script of ['agiscorecard','sunwatch']){
  await api(script,'PUT',{name:NAME,text:key,type:'secret_text'});
  const after=await api(script);
  if(!Array.isArray(after)||[...before[script],NAME].some(name=>!after.some(x=>x.name===name)))throw Error('Private relay binding verification failed for '+script);
 }
 return {configured:true,workers:2};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{await configureRelay(process.env);console.log('Capital Radar scoped relay configured on both existing Workers; bot credentials unchanged.');}
 catch(error){console.error(error.message);process.exitCode=1;}
}
