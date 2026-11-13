// One-off, BPJ-only read-only investigation. No site requests, configuration
// writes, IP addresses, query strings or plaintext report artifacts.
import {createSign} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {seal} from './workers_usage.mjs';
import {aggregatePath} from './workers_inspection.mjs';
import {credentials,validatePublicKey} from '../eco-reporting/report.mjs';

export const HOST='baipiaoji.com', PROPERTY='547077892';
const CF='https://api.cloudflare.com/client/v4/';
const DAYS=['2026-11-10','2026-11-11','2026-11-12'];
const POPULAR_PATHS=['hg-7701328280862854168','hg-7697622096326708286','hg-7702378804068502552','hg-7701588705932217406','hg-7696095984266251326'].map(id=>'/manju/'+id);
const POPULAR_FILTER=',clientRequestPath_in:'+JSON.stringify(POPULAR_PATHS)+',clientRequestHTTPMethodName:"GET",edgeResponseStatus:200';
const SCOPE='https://www.googleapis.com/auth/analytics.readonly';
const failure=e=>String(e?.code||e?.message||'request_failed').slice(0,320);
const fail=code=>{throw Object.assign(new Error(code),{code});};
const cleanUA=s=>String(s).replace(/[^\s<>]+@[^\s<>]+/g,'[email]').replace(/[a-f0-9]{24,}/gi,'[id]').slice(0,350);
export function scrubRows(rows){return rows.map(r=>({...r,dimensions:Object.fromEntries(Object.entries(r.dimensions||{}).map(([k,v])=>[k,k==='clientRequestPath'?aggregatePath(v):k==='userAgent'?cleanUA(v):v]))}));}
export function assertNoSecrets(value,secrets){const text=JSON.stringify(value);for(const secret of secrets.filter(s=>typeof s==='string'&&s.length>=16))if(text.includes(secret))fail('secret_in_report');}

async function json(fetchFn,url,options={},label='request'){
 let r;try{r=await fetchFn(url,{...options,redirect:'error',signal:AbortSignal.timeout(15000)});}catch{fail(label+'_network');}
 if(!r.ok)fail(label+'_http_'+r.status);
 try{return await r.json();}catch{fail(label+'_invalid_json');}
}
export function cfQuery(dimensions,extra='',limit=2000){
 const safe=['datetimeHour','clientCountryName','clientAsn','clientASNDescription','userAgent','userAgentBrowser','userAgentOS','clientRequestPath','clientRequestHTTPMethodName','edgeResponseStatus','edgeResponseContentTypeName','clientRefererHost','verifiedBotCategory','botScoreBucketBy10','jsDetectionPassed','securityAction'];
 if(dimensions.some(d=>!safe.includes(d)))fail('unsupported_cf_dimension');
 if(!['',',clientRequestPath_like:"/manju/%"',',clientRequestPath_like:"/manju/%",clientRequestHTTPMethodName:"GET",edgeResponseStatus:200',',clientRequestPath_in:["/analytics-assets/frame","/analytics-assets/frame.html"],clientRequestHTTPMethodName:"GET",edgeResponseStatus:200',POPULAR_FILTER].includes(extra))fail('unsupported_cf_filter');
 return `query($z:string,$s:Time,$e:Time){viewer{zones(filter:{zoneTag:$z}){httpRequestsAdaptiveGroups(limit:${limit},orderBy:[count_DESC],filter:{datetime_geq:$s,datetime_lt:$e,requestSource:"eyeball",clientRequestHTTPHost:"${HOST}"${extra}}){count dimensions{${dimensions.join(' ')}}}}}}`;
}
export async function cloudflare(env,{fetchFn=fetch,days=DAYS,clientsOnly=false}={}){
 const tokens=[...new Set(['CLOUDFLARE_API_TOKEN','CLOUDFLARE_API_TOKEN_ZONE','CF_API_TOKEN'].map(k=>env[k]).filter(Boolean))];
 const out={host:HOST,timezone:'UTC',definition:'Adaptive request aggregates, not users, GA4 events or exact billing. HEAD requests do not execute page JavaScript. Unavailable bot scores do not classify traffic as human.',reports:[]};
 if(!tokens.length)return {...out,status:'blocked',reason:'cloudflare_credentials_missing'};
 async function request(path,body){
  let last;
  for(const token of tokens){try{
   const r=await json(fetchFn,CF+path,{method:body?'POST':'GET',headers:{authorization:'Bearer '+token,...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})},'cf');
   if(r.success===false||r.errors?.length){const messages=(r.errors||[]).map(e=>e.message).join('; ');fail('cf_api_'+messages.slice(0,250));}
   return body?r.data:r.result;
  }catch(e){last=e;}}
  throw last;
 }
 let zone;
 try{const zones=await request('zones?name='+HOST+'&per_page=5');zone=zones?.find(z=>z.name===HOST)?.id;if(!zone)fail('bpj_zone_not_found');}
 catch(e){return {...out,status:'blocked',reason:failure(e)};}
 const manju=',clientRequestPath_like:"/manju/%"';
 const page=manju+',clientRequestHTTPMethodName:"GET",edgeResponseStatus:200';
 const frame=',clientRequestPath_in:["/analytics-assets/frame","/analytics-assets/frame.html"],clientRequestHTTPMethodName:"GET",edgeResponseStatus:200';
 const sections=[
  ['site_country',['clientCountryName','clientRequestHTTPMethodName','edgeResponseContentTypeName','edgeResponseStatus'],''],
  ['manju_status',['clientCountryName','clientRequestHTTPMethodName','edgeResponseStatus'],manju],
  ['manju_clients',['clientCountryName','userAgent','verifiedBotCategory'],page],
  ['manju_paths',['clientRequestPath','clientCountryName'],page],
  ['manju_hours',['datetimeHour','clientCountryName','userAgentBrowser'],page],
  ['manju_referrers',['clientCountryName','clientRefererHost'],page],
  ['frame_clients',['clientCountryName','userAgent','verifiedBotCategory'],frame],
  ['frame_hours',['datetimeHour','clientCountryName','userAgentBrowser'],frame],
  ['manju_verified_bots',['clientCountryName','verifiedBotCategory'],page],
  ['frame_verified_bots',['clientCountryName','verifiedBotCategory'],frame],
  ['manju_bot_score',['clientCountryName','botScoreBucketBy10'],page],
  ['frame_bot_score',['clientCountryName','botScoreBucketBy10'],frame],
  ['popular_manju_clients',['clientCountryName','clientRequestPath','userAgent','verifiedBotCategory'],POPULAR_FILTER],
 ];
 const selected=clientsOnly?sections.filter(([name])=>name.endsWith('_clients')):sections;
 for(const date of days){
  const start=date+'T00:00:00.000Z',end=new Date(Date.parse(start)+86400000).toISOString();
  // Two concurrent bounded aggregates; no retries on a rejected dataset.
  for(let i=0;i<selected.length;i+=2)await Promise.all(selected.slice(i,i+2).map(async([name,dims,extra])=>{
   const item={name,date,start,end,limit:2000};
   try{const d=await request('graphql',{query:cfQuery(dims,extra),variables:{z:zone,s:start,e:end}});const rows=d?.viewer?.zones?.[0]?.httpRequestsAdaptiveGroups;if(!Array.isArray(rows))fail('cf_missing_rows');out.reports.push({...item,status:'received',truncated:rows.length>=2000,rows:scrubRows(rows)});}
   catch(e){out.reports.push({...item,status:'blocked',reason:failure(e)});}
  }));
 }
 out.status=out.reports.every(x=>x.status==='received')?'received':'partial';
 assertNoSecrets(out,tokens);return out;
}

export function gaRequest(dimensions,metrics,{startDate='2026-11-06',endDate='2026-11-12',manju=false,hostname=true}={}){
 const filters=[];
 if(hostname)filters.push({filter:{fieldName:'hostName',stringFilter:{matchType:'EXACT',value:HOST,caseSensitive:false}}});
 if(manju)filters.push({filter:{fieldName:'landingPage',stringFilter:{matchType:'BEGINS_WITH',value:'/manju/'}}});
 return {dateRanges:[{startDate,endDate}],dimensions:dimensions.map(name=>({name})),metrics:metrics.map(name=>({name})),...(filters.length?{dimensionFilter:filters.length===1?filters[0]:{andGroup:{expressions:filters}}}:{}),limit:10000,orderBys:[{metric:{metricName:metrics[0]},desc:true}],returnPropertyQuota:true};
}
export async function google(env,{fetchFn=fetch,now=new Date()}={}){
 const out={property:PROPERTY,host:HOST,scope:SCOPE,definition:'Measured GA4 identities and events, not verified humans. Property timezone differs from Cloudflare UTC. Summing daily users does not produce weekly unique users.',reports:[]};
 let key;try{key=credentials(env.GA4_SERVICE_ACCOUNT_JSON);}catch(e){return {...out,status:'blocked',reason:failure(e)};}
 let token;
 try{
  const b64=v=>Buffer.from(JSON.stringify(v)).toString('base64url'),iat=Math.floor(now.getTime()/1000);
  const unsigned=b64({alg:'RS256',typ:'JWT'})+'.'+b64({iss:key.client_email,scope:SCOPE,aud:'https://oauth2.googleapis.com/token',iat,exp:iat+600});
  const assertion=unsigned+'.'+createSign('RSA-SHA256').update(unsigned).sign(key.private_key,'base64url');
  const auth=await json(fetchFn,'https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion})},'google_oauth');
  token=auth.access_token;if(!token)fail('google_oauth_missing_token');
  const headers={authorization:'Bearer '+token,'content-type':'application/json'};
  const prop=await json(fetchFn,`https://analyticsadmin.googleapis.com/v1beta/properties/${PROPERTY}`,{headers},'ga4_property');
  if(!prop.timeZone)fail('ga4_timezone_missing');out.timezone=prop.timeZone;
  const meta=await json(fetchFn,`https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY}/metadata`,{headers},'ga4_metadata');
  const dimensions=new Set((meta.dimensions||[]).map(x=>x.apiName)),metrics=new Set((meta.metrics||[]).map(x=>x.apiName));
  const core=['sessions','activeUsers','totalUsers','newUsers','screenPageViews','engagedSessions','userEngagementDuration'];
  const sections=[
   ['daily_country',['date','country'],core,{startDate:'2026-10-30'}],
   ['weekly_country',['country'],core,{}],
   ['channels',['country','sessionSourceMedium'],core,{}],
   ['daily_channels',['date','country','sessionSourceMedium'],['sessions','screenPageViews','engagedSessions','userEngagementDuration'],{}],
   ['manju_acquisition',['date','country','sessionSourceMedium'],core,{manju:true}],
   ['manju_landing',['country','landingPage'],core,{manju:true}],
   ['pages',['country','pagePath'],['screenPageViews','activeUsers','userEngagementDuration'],{}],
   ['clients',['country','deviceCategory','browser','browserVersion','operatingSystem'],core,{}],
   ['events',['country','eventName'],['eventCount'],{}],
   ['hours',['dateHour','country'],['sessions','screenPageViews','engagedSessions'],{startDate:'2026-11-10'}],
   ['property_hostnames',['hostName'],core,{hostname:false}],
  ];
  for(const [name,dims,mets,options] of sections){
   if(dims.some(x=>!dimensions.has(x))||mets.some(x=>!metrics.has(x))){out.reports.push({name,status:'blocked',reason:'ga4_metadata_field_unavailable'});continue;}
   const request=gaRequest(dims,mets,options);
   try{
    const raw=await json(fetchFn,`https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY}:runReport`,{method:'POST',headers,body:JSON.stringify(request)},'ga4_'+name);
    if(!Array.isArray(raw.metricHeaders)||(raw.rows!==undefined&&!Array.isArray(raw.rows)))fail('ga4_invalid_report_shape');
    const pathIndexes=(raw.dimensionHeaders||[]).flatMap((x,i)=>['pagePath','landingPage'].includes(x.name)?[i]:[]);
    for(const row of raw.rows||[])for(const i of pathIndexes)if(row.dimensionValues?.[i])row.dimensionValues[i].value=aggregatePath(row.dimensionValues[i].value);
    out.reports.push({name,status:'received',request,raw,truncated:Number(raw.rowCount||0)>(raw.rows||[]).length});
   }catch(e){out.reports.push({name,status:'blocked',reason:failure(e)});}
  }
  out.status=out.reports.every(x=>x.status==='received')?'received':'partial';
 }catch(e){out.status='blocked';out.reason=failure(e);}
 assertNoSecrets(out,[env.GA4_SERVICE_ACCOUNT_JSON,key.private_key,key.client_email,token]);return out;
}

export async function run(env=process.env,dependencies={}){
 const pem=Buffer.from(env.WORKERS_REPORT_PUBLIC_KEY||'','base64').toString();validatePublicKey(pem);
 const phase=env.BPJ_DIAG_PHASE||'full';if(!['full','clients'].includes(phase))fail('unsupported_phase');
 const [cf,ga4]=await Promise.all([cloudflare(env,{...dependencies,clientsOnly:phase==='clients'}),phase==='full'?google(env,dependencies):Promise.resolve({status:'not_requested',reason:'client_followup_reuses_previous_ga4_access_result',reports:[]})]);
 const report={schema:1,phase,generated:new Date().toISOString(),host:HOST,question:'Did automated access cause the GA4 increase on November 11–12?',cloudflare:cf,ga4};
 const envelope=seal(report,pem);
 (dependencies.write||((body)=>writeFileSync('/tmp/bpj-traffic-diagnosis.enc.json',body,{mode:0o600})))(JSON.stringify(envelope));
 return {reportWritten:true,cloudflare:cf.status,ga4:ga4.status};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{await run();console.log('Encrypted BPJ aggregate report prepared. No analytics values or credentials printed.');}
 catch{console.error('BPJ diagnostic failed; no plaintext report written.');process.exitCode=1;}
}
