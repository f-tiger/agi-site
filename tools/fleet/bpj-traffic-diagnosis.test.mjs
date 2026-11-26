import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,privateDecrypt,createDecipheriv,constants} from 'node:crypto';
import {recentDays,cloudflare,google,run,gaRequest,cfQuery,scrubRows,assertNoSecrets} from './bpj-traffic-diagnosis.mjs';
const keys=generateKeyPairSync('rsa',{modulusLength:2048,publicKeyEncoding:{type:'spki',format:'pem'},privateKeyEncoding:{type:'pkcs8',format:'pem'}});
const sa=JSON.stringify({type:'service_account',client_email:'readonly@fixture.iam.gserviceaccount.com',private_key:keys.privateKey});
const ok=d=>({ok:true,status:200,json:async()=>d});
function openReport(payload){
 const envelope=JSON.parse(payload);
 const key=privateDecrypt({key:keys.privateKey,oaepHash:'sha256',padding:constants.RSA_PKCS1_OAEP_PADDING},Buffer.from(envelope.key,'base64'));
 const cipher=createDecipheriv('aes-256-gcm',key,Buffer.from(envelope.iv,'base64'));
 cipher.setAuthTag(Buffer.from(envelope.tag,'base64'));
 return JSON.parse(Buffer.concat([cipher.update(Buffer.from(envelope.data,'base64')),cipher.final()]));
}
test('Cloudflare reads only BPJ aggregates; forbidden bot scores stay unknown',async()=>{
 const calls=[];
 const fetchFn=async(url,opt)=>{calls.push({url,opt});assert.equal(opt.redirect,'error');
  if(url.includes('/zones?'))return ok({result:[{id:'bpj',name:'baipiaoji.com'},{id:'other',name:'elsewhere.example'}]});
  const b=JSON.parse(opt.body);assert.equal(b.variables.z,'bpj');assert.match(b.query,/clientRequestHTTPHost:"baipiaoji.com"/);assert.doesNotMatch(b.query,/clientIP|clientRequestQuery|ja3Hash|ja4|mutation/);
  if(b.query.includes('botScoreBucketBy10'))return ok({errors:[{message:'field unavailable on plan'}]});
  return ok({data:{viewer:{zones:[{httpRequestsAdaptiveGroups:[{count:7,dimensions:{clientCountryName:'CN',clientRequestPath:'/manju/a?private=no',userAgent:'robot person@example.com'}}]}]}}});
 };
 const out=await cloudflare({CLOUDFLARE_API_TOKEN:'mock-secret-token-123'},{fetchFn,days:['2026-11-12']});
 assert.equal(out.status,'partial');assert.equal(out.reports.length,13);assert.equal(out.reports.filter(x=>x.status==='blocked').length,2);
 assert.doesNotMatch(JSON.stringify(out),/person@example|private=no|mock-secret/);
 assert(calls.every(c=>c.url.startsWith('https://api.cloudflare.com/client/v4/')));
 assert.throws(()=>cfQuery(['clientIP']));assert.throws(()=>cfQuery(['userAgent'],',clientRequestPath_like:"/%"'));
});
test('client followup avoids inaccessible ASN fields and repeats only missing groups',async()=>{
 let queries=0;
 const fetchFn=async(url,opt)=>{
  if(url.includes('/zones?'))return ok({result:[{id:'bpj',name:'baipiaoji.com'}]});
  queries++;const b=JSON.parse(opt.body);assert.match(b.query,/userAgent verifiedBotCategory/);assert.doesNotMatch(b.query,/clientAsn|clientASNDescription|clientRefererHost|botScoreBucket/);
  return ok({data:{viewer:{zones:[{httpRequestsAdaptiveGroups:[]}]}}});
 };
 const out=await cloudflare({CLOUDFLARE_API_TOKEN:'mock-secret-token-123'},{fetchFn,days:['2026-11-12'],clientsOnly:true});
 assert.equal(queries,3);assert.equal(out.status,'received');assert(out.reports.every(x=>x.name.endsWith('_clients')));
});
test('GA4 uses readonly scope and only BPJ property; redacts query/private paths',async()=>{
 const dims=['date','country','sessionSourceMedium','landingPage','pagePath','deviceCategory','browser','browserVersion','operatingSystem','eventName','dateHour','hostName'];
 const mets=['sessions','activeUsers','totalUsers','newUsers','screenPageViews','engagedSessions','userEngagementDuration','eventCount'];
 const calls=[];
 const fetchFn=async(url,opt)=>{calls.push({url,opt});
  if(url==='https://oauth2.googleapis.com/token'){
   const payload=JSON.parse(Buffer.from(opt.body.get('assertion').split('.')[1],'base64url').toString());
   assert.equal(payload.scope,'https://www.googleapis.com/auth/analytics.readonly');assert.equal(payload.aud,url);
   return ok({access_token:'fixture-oauth-token'});
  }
  assert(url.includes('/properties/547077892'));assert.doesNotMatch(url,/collect|customDimensions/);
  if(url.endsWith('/metadata'))return ok({dimensions:dims.map(apiName=>({apiName})),metrics:mets.map(apiName=>({apiName}))});
  if(opt.method!=='POST')return ok({timeZone:'Asia/Shanghai'});
  const b=JSON.parse(opt.body);if(b.dimensions[0].name!=='hostName')assert.match(JSON.stringify(b.dimensionFilter),/baipiaoji.com/);
  return ok({dimensionHeaders:[{name:'pagePath'}],metricHeaders:[{name:'screenPageViews'}],rows:[{dimensionValues:[{value:'/api/account/customer?secret=no'}],metricValues:[{value:'3'}]}],rowCount:1,metadata:{subjectToThresholding:true}});
 };
 const out=await google({GA4_SERVICE_ACCOUNT_JSON:sa},{fetchFn});
 assert.equal(out.status,'received');assert.equal(out.timezone,'Asia/Shanghai');assert.equal(out.reports.length,11);
 assert.equal(out.reports[0].raw.metadata.subjectToThresholding,true);
 assert.doesNotMatch(JSON.stringify(out),/secret=no|customer|fixture-oauth-token|PRIVATE KEY|gserviceaccount/);
 assert(calls.every(x=>/^https:\/\/(oauth2|analyticsadmin|analyticsdata)\.googleapis\.com\//.test(x.url)));
 assert.match(JSON.stringify(gaRequest(['country'],['sessions'],{manju:true})),/BEGINS_WITH/);
});
test('missing access remains unknown, and only encrypted output is written',async()=>{
 let payload;
 const r=await run({WORKERS_REPORT_PUBLIC_KEY:Buffer.from(keys.publicKey).toString('base64')},{write:body=>{payload=body;},fetchFn:()=>assert.fail('no credentials must not request data')});
 assert.equal(r.reportWritten,true);assert.equal(r.cloudflare,'blocked');assert.equal(r.ga4,'blocked');assert.doesNotMatch(payload,/credentials_missing|baipiaoji.com|gserviceaccount/);
 const report=openReport(payload);assert.equal(report.host,'baipiaoji.com');assert.equal(report.cloudflare.reports.length,0);
 assert.throws(()=>assertNoSecrets({bad:'secret-must-not-appear'},['secret-must-not-appear']));
 const rows=scrubRows([{count:1,dimensions:{clientRequestPath:'/auth/callback?code=private'}}]);assert.equal(rows[0].dimensions.clientRequestPath,'/auth/*');
});

test('baseline uses complete UTC days and rejects unbounded history',()=>{
 assert.deepEqual(recentDays(new Date('2026-11-15T23:59:59Z'),2),['2026-11-13','2026-11-14']);
 assert.throws(()=>recentDays(new Date(),15));assert.throws(()=>recentDays(new Date(),NaN));
});

test('MCP mode encrypts four exact POST counts and bot categories for complete days and the current partial day',async()=>{
 const calls=[];
 const fetchFn=async(url,opt)=>{
  assert.equal(new URL(url).origin,'https://api.cloudflare.com');
  if(url.includes('/zones?'))return ok({result:[{id:'bpj',name:'baipiaoji.com'}]});
  const {query,variables}=JSON.parse(opt.body);
  assert.equal(variables.z,'bpj');
  assert.match(query,/requestSource:"eyeball",clientRequestHTTPHost:"baipiaoji\.com"/);
  assert.match(query,/httpRequestsAdaptiveGroups\(limit:100,/);
  assert.doesNotMatch(query,/userAgent|clientIP|clientRequestQuery|ja3Hash|ja4|mutation/);
  const isMcp=query.includes('dimensions{clientRequestPath edgeResponseStatus}');
  calls.push({isMcp,...variables});
  let rows;
  if(isMcp){
   assert.match(query,/clientRequestPath_in:\["\/api\/mcp","\/api\/ai-mcp","\/api\/startup-mcp","\/api\/video-mcp"\],clientRequestHTTPMethodName:"POST"/);
   rows=[
    {count:12,dimensions:{clientRequestPath:'/api/ai-mcp',edgeResponseStatus:200,userAgent:'must-not-leak'}},
    {count:3,dimensions:{clientRequestPath:'/api/ai-mcp',edgeResponseStatus:202}},
    {count:99,dimensions:{clientRequestPath:'/api/mcp',edgeResponseStatus:405}},
    {count:1,dimensions:{clientRequestPath:'/api/video-mcp',edgeResponseStatus:200}},
   ];
  }else{
   assert.match(query,/dimensions\{verifiedBotCategory\}/);
   assert.doesNotMatch(query,/clientRequestPath|clientRequestHTTPMethodName|edgeResponseStatus/);
   rows=[
    {count:50,dimensions:{verifiedBotCategory:''}},
    {count:8,dimensions:{verifiedBotCategory:'Search Engine Crawler'}},
    {count:2,dimensions:{verifiedBotCategory:'AI Search'}},
   ];
  }
  return ok({data:{viewer:{zones:[{httpRequestsAdaptiveGroups:rows}]}}});
 };
 let payload;
 const result=await run({
  BPJ_DIAG_PHASE:'mcp',BPJ_DIAG_DAYS:'2',CLOUDFLARE_API_TOKEN:'mock-secret-token-123',GA4_SERVICE_ACCOUNT_JSON:sa,
  WORKERS_REPORT_PUBLIC_KEY:Buffer.from(keys.publicKey).toString('base64'),
 },{now:new Date('2026-11-26T15:55:20Z'),write:body=>{payload=body;},fetchFn});
 assert.deepEqual(result,{reportWritten:true,cloudflare:'received',ga4:'not_requested'});
 assert.equal(calls.length,6);
 assert.equal(calls.filter(x=>x.isMcp).length,3);
 const report=openReport(payload);
 assert.deepEqual(report.window,{dates:['2026-11-24','2026-11-25'],timezone:'UTC',completeDays:true,
  currentPartial:{date:'2026-11-26',start:'2026-11-26T00:00:00.000Z',end:'2026-11-26T15:55:20.000Z',complete:false}});
 assert.deepEqual(calls.filter(x=>x.isMcp).map(x=>[x.s,x.e]),[
  ['2026-11-24T00:00:00.000Z','2026-11-25T00:00:00.000Z'],
  ['2026-11-25T00:00:00.000Z','2026-11-26T00:00:00.000Z'],
  ['2026-11-26T00:00:00.000Z','2026-11-26T15:55:20.000Z'],
 ]);
 assert.deepEqual(report.cloudflare.reports.filter(x=>x.name==='mcp_post_accepted').map(x=>[x.complete,x.counts.total]),[[true,16],[true,16],[false,16]]);
 assert.deepEqual(report.cloudflare.reports.find(x=>x.name==='mcp_post_accepted').counts.byEndpoint,{
  'mcp':{http200:0,http202:0,total:0},
  'ai-mcp':{http200:12,http202:3,total:15},
  'startup-mcp':{http200:0,http202:0,total:0},
  'video-mcp':{http200:1,http202:0,total:1},
 });
 assert.deepEqual(report.cloudflare.reports.find(x=>x.name==='verified_bot_categories').counts,{
  total:60,verified:10,withoutVerifiedCategory:50,byCategory:{'Search Engine Crawler':8,'AI Search':2},
 });
 assert.doesNotMatch(JSON.stringify(report),/must-not-leak|clientRequestPath|\/api\/|userAgent|readonly@|mock-secret/);
});

test('MCP mode omits zero-length partial days and keeps truncated or malformed aggregates unknown',async()=>{
 const fetchFn=async(url,opt)=>{
  if(url.includes('/zones?'))return ok({result:[{id:'bpj',name:'baipiaoji.com'}]});
  const {query}=JSON.parse(opt.body);
  const rows=query.includes('clientRequestPath_in')
   ?Array.from({length:100},()=>({count:1,dimensions:{clientRequestPath:'/api/mcp',edgeResponseStatus:200}}))
   :[{count:2,dimensions:{verifiedBotCategory:'unexpected/private-path?customer=fixture'}}];
  return ok({data:{viewer:{zones:[{httpRequestsAdaptiveGroups:rows}]}}});
 };
 const result=await cloudflare({CLOUDFLARE_API_TOKEN:'mock-secret-token-123'},{
  now:new Date('2026-11-26T00:00:00Z'),days:['2026-11-25'],mcpOnly:true,fetchFn,
 });
 assert.equal(result.status,'partial');
 assert.equal(result.reports.length,2);
 assert(result.reports.every(row=>row.complete&&row.status==='blocked'&&!Object.hasOwn(row,'counts')));
 assert.deepEqual(Object.fromEntries(result.reports.map(row=>[row.name,row.reason])),{
  mcp_post_accepted:'cf_incomplete_aggregate',
  verified_bot_categories:'cf_invalid_bot_group',
 });
 assert.doesNotMatch(JSON.stringify(result),/customer=fixture/);
});
