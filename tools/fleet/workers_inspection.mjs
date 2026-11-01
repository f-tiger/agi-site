// Bounded control-plane reads. Only allowlisted configuration fields and aggregate
// request paths enter the encrypted report; never serialize bindings or tokens.
export function publicProject(p) {
  return {id:p.id,name:p.name,subdomain:p.subdomain,domains:p.domains,
    production_branch:p.production_branch,
    deployment:p.canonical_deployment ? {id:p.canonical_deployment.id,
      created_on:p.canonical_deployment.created_on,
      commit:p.canonical_deployment.deployment_trigger?.metadata?.commit_hash} : null};
}
export function publicSettings(s) {
  return {compatibility_date:s.compatibility_date,assets:s.assets,
    limits:s.limits,observability:s.observability};
}
export function aggregatePath(path) {
  if (typeof path !== 'string') return null;
  const p=path.split('?')[0];
  if (/^\/(?:api\/)?(?:account|auth|member|owner|admin|checkout|receipt|delivery|document)(?:\/|$)/i.test(p))
    return p.split('/').slice(0,p.startsWith('/api/')?3:2).join('/')+'/*';
  return p.replace(/[^/]*@[^/]*/g,'[redacted]').replace(/\b[a-f0-9]{24,}\b/gi,'[id]').replace(/\b[0-9a-f]{8}-[0-9a-f-]{27,}\b/gi,'[id]').slice(0,240);
}
export async function inspectWorkers({account,candidates,windows,fetcher=fetch}) {
  const out={generated:new Date().toISOString(),definition:'Read-only control-plane configuration and adaptive aggregates. Not billing settlement or people. Request paths exclude query strings and redact private routes.'};
  async function request(path,query) {
    let last;
    for (const {token} of candidates) {
      try {
        const response=await fetcher('https://api.cloudflare.com/client/v4/'+path,{method:query?'POST':'GET',headers:{authorization:'Bearer '+token,...(query?{'content-type':'application/json'}:{})},...(query?{body:JSON.stringify(query)}:{}),signal:AbortSignal.timeout(20000)});
        const d=await response.json();
        if (!response.ok || d.success===false || d.errors?.length) throw Error('HTTP '+response.status+': '+(d.errors||[]).map(e=>e.message).join('; ').slice(0,400));
        return query?d.data:d.result;
      } catch(e) {last=e;}
    }
    throw last || Error('No credential available');
  }
  async function capture(key,fn) {try {out[key]=await fn();}catch(e){out[key]={error:String(e.message).slice(0,500)};}}
  await capture('projects',async()=>{const p=await request(`accounts/${account}/pages/projects?per_page=100`);return Array.isArray(p)?p.map(publicProject):{error:'No projects array'};});
  await capture('scripts',async()=>{const p=await request(`accounts/${account}/workers/scripts`);return Array.isArray(p)?p.map(x=>({id:x.id,created_on:x.created_on,modified_on:x.modified_on})):[];});
  const names=['agiscorecard','ecoback','agi-web3-studio','agi-venture-lab','buysomething','gridlings','goldrush','gamesledger','after35','learn','fanzha','firstjob','codeword','powerbill','agi-localebatch-pilot','agi-agent-delivery-lab'];
  out.settings=[];
  for(const name of names){try{out.settings.push({name,...publicSettings(await request(`accounts/${account}/workers/scripts/${name}/settings`))});}catch(e){out.settings.push({name,error:String(e.message).slice(0,400)});}}
  await capture('schema',async()=>request('graphql',{query:'{ workers:__type(name:"AccountWorkersInvocationsAdaptiveDimensions"){fields{name}} assets:__type(name:"AccountWorkersAssetsRequestsAdaptiveGroupsDimensions"){fields{name}} http:__type(name:"ZoneHttpRequestsAdaptiveGroupsDimensions"){fields{name}} }'}));
  out.hourly=[];
  for(const dataset of ['workersInvocationsAdaptive','pagesFunctionsInvocationsAdaptiveGroups']){
    for(const w of windows.slice(-2)){
      try {
        const query=`query($a:string,$s:string,$e:string){viewer{accounts(filter:{accountTag:$a}){${dataset}(limit:10000,filter:{datetime_geq:$s,datetime_lt:$e}){sum{requests errors} dimensions{scriptName datetimeHour status}}}}}`;
        const d=await request('graphql',{query,variables:{a:account,s:w.start,e:w.end}}),rows=d?.viewer?.accounts?.[0]?.[dataset];
        out.hourly.push({dataset,...w,rows:rows??null,truncated:rows?.length===10000});
      }catch(e){out.hourly.push({dataset,...w,error:String(e.message)});}
    }
  }
  await capture('zoneTraffic',async()=>{
    const zones=await request('zones?per_page=50');
    const dimensions=(out.schema?.http?.fields||[]).map(x=>x.name);
    const selected=['clientRequestHTTPHost','clientRequestPath','clientRequestHTTPMethodName','edgeResponseStatus','requestSource'].filter(x=>dimensions.includes(x));
    if(!selected.includes('clientRequestPath')) return {error:'Request-path dimension unavailable'};
    const result=[],w=windows.at(-2);
    for(const zone of zones.filter(z=>['agiscorecard.com','baipiaoji.com','getecoback.com','thedollscout.com'].includes(z.name))){
      try{
        // A 100-row sample hides long-tail public documents and HEAD requests.
        // Keep this bounded and encrypted, and disclose any remaining truncation.
        const limit=1000;
        const query=`query($z:string,$s:Time,$e:Time){viewer{zones(filter:{zoneTag:$z}){httpRequestsAdaptiveGroups(limit:${limit},orderBy:[count_DESC],filter:{datetime_geq:$s,datetime_lt:$e,requestSource:"eyeball"}){count dimensions{${selected.join(' ')}}}}}}`;
        const d=await request('graphql',{query,variables:{z:zone.id,s:w.start,e:w.end}}),rows=d?.viewer?.zones?.[0]?.httpRequestsAdaptiveGroups;
        result.push({zone:zone.name,...w,request_source:'eyeball',row_limit:limit,top_rows_only:rows?.length===limit,truncated:rows?.length===limit,rows:rows?.map(r=>({count:r.count,dimensions:{...r.dimensions,clientRequestPath:aggregatePath(r.dimensions?.clientRequestPath)}}))??null});
      }catch(e){result.push({zone:zone.name,error:String(e.message)});}
    }
    out.zoneSummary=[];out.mcpClients=[];out.errorHours=[];
    for(const zone of zones.filter(z=>['agiscorecard.com','baipiaoji.com','getecoback.com','thedollscout.com'].includes(z.name))){
      for(const [key,dims,extra,limit] of [
        ['zoneSummary',['clientRequestHTTPHost','clientRequestHTTPMethodName','edgeResponseContentTypeName','edgeResponseStatus'],'',1000],
        ['mcpClients',['clientRequestHTTPHost','clientRequestPath','userAgent','edgeResponseStatus'],',clientRequestPath_in:["/mcp","/mcp/","/mcp/v1","/mcp.html","/api/mcp","/api/ai-mcp","/api/startup-mcp","/api/video-mcp"]',200],
        ['errorHours',['clientRequestHTTPHost','datetimeHour','edgeResponseStatus'],',edgeResponseStatus_geq:500',1000]
      ]){
        try{
          const query=`query($z:string,$s:Time,$e:Time){viewer{zones(filter:{zoneTag:$z}){httpRequestsAdaptiveGroups(limit:${limit},orderBy:[count_DESC],filter:{datetime_geq:$s,datetime_lt:$e,requestSource:"eyeball"${extra}}){count dimensions{${dims.join(' ')}}}}}}`;
          const d=await request('graphql',{query,variables:{z:zone.id,s:w.start,e:w.end}}),rows=d?.viewer?.zones?.[0]?.httpRequestsAdaptiveGroups;
          out[key].push({zone:zone.name,...w,request_source:'eyeball',truncated:rows?.length===limit,rows:rows??null});
        }catch(e){out[key].push({zone:zone.name,error:String(e.message)});}
      }
    }
    return result;
  });
  return out;
}
