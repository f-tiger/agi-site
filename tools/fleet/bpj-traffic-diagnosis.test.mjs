import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,privateDecrypt,createDecipheriv,constants} from 'node:crypto';
import {cloudflare,google,run,gaRequest,cfQuery,scrubRows,assertNoSecrets} from './bpj-traffic-diagnosis.mjs';
const keys=generateKeyPairSync('rsa',{modulusLength:2048,publicKeyEncoding:{type:'spki',format:'pem'},privateKeyEncoding:{type:'pkcs8',format:'pem'}});
const sa=JSON.stringify({type:'service_account',client_email:'readonly@fixture.iam.gserviceaccount.com',private_key:keys.privateKey});
const ok=d=>({ok:true,status:200,json:async()=>d});
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
 const e=JSON.parse(payload),k=privateDecrypt({key:keys.privateKey,oaepHash:'sha256',padding:constants.RSA_PKCS1_OAEP_PADDING},Buffer.from(e.key,'base64'));
 const d=createDecipheriv('aes-256-gcm',k,Buffer.from(e.iv,'base64'));d.setAuthTag(Buffer.from(e.tag,'base64'));
 const report=JSON.parse(Buffer.concat([d.update(Buffer.from(e.data,'base64')),d.final()]).toString());assert.equal(report.host,'baipiaoji.com');assert.equal(report.cloudflare.reports.length,0);
 assert.throws(()=>assertNoSecrets({bad:'secret-must-not-appear'},['secret-must-not-appear']));
 const rows=scrubRows([{count:1,dimensions:{clientRequestPath:'/auth/callback?code=private'}}]);assert.equal(rows[0].dimensions.clientRequestPath,'/auth/*');
});
