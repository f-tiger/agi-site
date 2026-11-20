// Read only. Print plan, endpoint status and rule counts; omit expressions and identifiers.
const auths=[...new Set([process.env.CF_ZONE,process.env.CF_PRIMARY,process.env.CF_OTHER].filter(Boolean))];
for(const token of auths){
 const read=async path=>{
  const res=await fetch('https://api.cloudflare.com/client/v4/'+path,{headers:{authorization:'Bearer '+token},redirect:'error',signal:AbortSignal.timeout(15000)});
  const data=await res.json();
  return {status:res.status,result:data.result,errors:(data.errors||[]).map(e=>Number(e.code))};
 };
 const zones=await read('zones?name=baipiaoji.com');
 const z=zones.result?.find(v=>v.name==='baipiaoji.com');
 if(!z){console.log('Zone lookup HTTP',zones.status);continue;}
 console.log('Plan:',z.plan?.name||'unavailable');
 for(const endpoint of ['rulesets/phases/http_request_cache_settings/entrypoint','rulesets/phases/http_ratelimit/entrypoint','rulesets','pagerules']){
  const r=await read('zones/'+z.id+'/'+endpoint);
  console.log(endpoint,JSON.stringify({status:r.status,errors:r.errors,count:(Array.isArray(r.result)?r.result:r.result?.rules)?.length}));
 }
}
