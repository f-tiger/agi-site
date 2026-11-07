import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,privateDecrypt,createDecipheriv,constants} from 'node:crypto';
import {mkdtemp,readFile,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {credentials,validatePublicKey,encryptReport,run,collect,dayInZone,exitCode} from './report.mjs';

const pair=generateKeyPairSync('rsa',{modulusLength:2048});
const publicPem=pair.publicKey.export({type:'spki',format:'pem'});
const rawKey=JSON.stringify({type:'service_account',client_email:'fixture@test.iam.gserviceaccount.com',private_key:pair.privateKey.export({type:'pkcs8',format:'pem'})});
const fixed=new Date('2026-11-07T00:30:00Z');
function open(envelope) {
 const key=privateDecrypt({key:pair.privateKey,oaepHash:'sha256',padding:constants.RSA_PKCS1_OAEP_PADDING},Buffer.from(envelope.key,'base64'));
 const decipher=createDecipheriv('aes-256-gcm',key,Buffer.from(envelope.iv,'base64'));decipher.setAuthTag(Buffer.from(envelope.tag,'base64'));
 return JSON.parse(Buffer.concat([decipher.update(Buffer.from(envelope.data,'base64')),decipher.final()]).toString());
}
function fakeApi(calls,{failDaily=false,failOAuth=false}={}) {
 return async(url,options)=>{
  calls.push({url,options});
  if(url==='https://oauth2.googleapis.com/token') {
   if(failOAuth)return new Response('private error key must not leak',{status:403});
   const claims=JSON.parse(Buffer.from(options.body.get('assertion').split('.')[1],'base64url'));
   assert.equal(claims.scope,'https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/webmasters.readonly');
   return Response.json({access_token:'fixture-token'});
  }
  assert.equal(options.headers.authorization,'Bearer fixture-token');
  if(url==='https://analyticsadmin.googleapis.com/v1beta/properties/544688614')return Response.json({timeZone:'Europe/Berlin'});
  const body=JSON.parse(options.body);
  if(url==='https://analyticsdata.googleapis.com/v1beta/properties/544688614:runReport') {
   assert.equal(body.dimensionFilter.filter.fieldName,'hostName');
   assert.equal(body.dimensionFilter.filter.stringFilter.value,'getecoback.com');
   if(failDaily&&body.dimensions[0].name==='date')return new Response('secret API detail',{status:403});
   return Response.json({dimensionHeaders:body.dimensions,metricHeaders:body.metrics,rows:[{dimensionValues:[{value:'20261106'}],metricValues:body.metrics.map(()=>({value:'3'}))}],rowCount:1,metadata:{subjectToThresholding:true}});
  }
  assert.equal(url,'https://searchconsole.googleapis.com/webmasters/v3/sites/sc-domain%3Agetecoback.com/searchAnalytics/query');
  assert.equal(body.dataState,'final');assert.equal(body.type,'web');
  assert.equal(body.dimensionFilterGroups[0].filters[0].expression,'^https://getecoback\\.com/');
  return Response.json({rows:[{keys:body.dimensions.map(x=>x==='query'?'private query fixture':'2026-11-03'),clicks:2,impressions:30,ctr:2/30,position:8}]});
 };
}
test('missing or malformed credentials are blocked before any request, not zero traffic',async()=>{
 let calls=0;const fetchFn=async()=>{calls++;throw Error('must not call');};
 assert.deepEqual(await run({}, {fetchFn}),{status:'blocked',reason:'missing_GA4_SERVICE_ACCOUNT_JSON',reportWritten:false});
 assert.equal((await run({GA4_SERVICE_ACCOUNT_JSON:'secret invalid JSON'},{fetchFn})).reason,'invalid_service_account_json');
 assert.equal(calls,0);
});
test('preflight checks credentials without reading Google; report requires recipient public key',async()=>{
 let calls=0;const fetchFn=async()=>{calls++;throw Error('must not call');};
 assert.deepEqual(await run({GA4_SERVICE_ACCOUNT_JSON:rawKey,ECO_REPORT_MODE:'preflight'},{fetchFn}),{status:'credentials_present',liveAccess:'not_checked',reportWritten:false});
 assert.equal((await run({GA4_SERVICE_ACCOUNT_JSON:rawKey},{fetchFn})).status,'credentials_present');
 assert.equal((await run({GA4_SERVICE_ACCOUNT_JSON:rawKey,ECO_REPORT_MODE:'typo'},{fetchFn})).reason,'invalid_report_mode');
 assert.equal((await run({GA4_SERVICE_ACCOUNT_JSON:rawKey,ECO_REPORT_MODE:'report'},{fetchFn})).reason,'missing_or_invalid_report_public_key');
 assert.throws(()=>validatePublicKey(pair.privateKey.export({type:'pkcs8',format:'pem'})),/missing_or_invalid_report_public_key/);
 const weak=generateKeyPairSync('rsa',{modulusLength:1024});
 assert.throws(()=>validatePublicKey(weak.publicKey.export({type:'spki',format:'pem'})),/RSA_2048/);
 assert.equal(calls,0);
});
test('mocked official flow scopes host, keeps property/Pacific dates and only writes encrypted output',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'eco-report-test-'));const file=join(dir,'report.enc.json');const calls=[];
 try {
  const status=await run({GA4_SERVICE_ACCOUNT_JSON:rawKey,ECO_REPORT_MODE:'report',ECO_REPORT_PUBLIC_KEY:publicPem,ECO_REPORT_OUTPUT:file},{fetchFn:fakeApi(calls),now:fixed});
  assert.equal(status.status,'received');assert.equal(status.encrypted,true);
  const text=await readFile(file,'utf8');assert.ok(!text.includes('private query fixture'));assert.ok(!text.includes('fixture-token'));
  assert.deepEqual(await readdir(dir),['report.enc.json']);
  const report=open(JSON.parse(text));
  assert.equal(report.ga4.timezone,'Europe/Berlin');assert.equal(report.ga4.startDate,'2026-10-10');assert.equal(report.ga4.endDate,'2026-11-06');
  assert.equal(report.gsc.timezone,'America/Los_Angeles');assert.equal(report.gsc.startDate,'2026-10-07');assert.equal(report.gsc.endDate,'2026-11-03');
  assert.equal(report.ga4.reports.daily.raw.metadata.subjectToThresholding,true);
  assert.equal(report.ga4.reports.daily.raw.rows.length,1); // Does not fabricate 27 missing daily rows.
  assert.equal(report.gsc.reports.queryPages.request.rowLimit,5000);
  assert.equal(calls.length,12); // OAuth + property + 5 GA4 + 5 GSC; no retries or writes.
  assert.ok(!JSON.stringify(status).includes('private query fixture'));
 } finally {await rm(dir,{recursive:true,force:true});}
});
test('one failed GA4 report stays unknown while readable GSC is retained; API bodies never escape',async()=>{
 const report=await collect(credentials(rawKey),{fetchFn:fakeApi([],{failDaily:true}),now:fixed});
 assert.equal(report.ga4.status,'partial');assert.deepEqual(report.ga4.reports.daily,{status:'blocked',reason:'ga4_daily_http_403'});
 assert.equal(report.gsc.status,'received');assert.ok(!JSON.stringify(report).includes('secret API detail'));
 const denied=await collect(credentials(rawKey),{fetchFn:fakeApi([],{failOAuth:true}),now:fixed});
 assert.equal(denied.ga4.reason,'oauth_http_403');assert.equal(denied.gsc.reason,'oauth_http_403');assert.ok(!JSON.stringify(denied).includes('private error'));
});
test('existing envelope roundtrip authenticates ciphertext and rejects tampering',()=>{
 const report={private:'a report much longer than an RSA payload '.repeat(100)};
 const encrypted=encryptReport(report,validatePublicKey(publicPem));assert.deepEqual(open(encrypted),report);
 const data=Buffer.from(encrypted.data,'base64');data[0]^=1;assert.throws(()=>open({...encrypted,data:data.toString('base64')}));
});
test('date boundary uses each source timezone at DST boundary',()=>{
 assert.equal(dayInZone(new Date('2026-10-25T23:30:00Z'),'Europe/Berlin'),'2026-10-26');
 assert.equal(dayInZone(new Date('2026-10-25T23:30:00Z'),'America/Los_Angeles'),'2026-10-25');
});

test('missing setup is a visible preflight block; actual report failures stay strict',()=>{
 const missing={status:'blocked',reason:'missing_GA4_SERVICE_ACCOUNT_JSON',reportWritten:false};
 assert.equal(exitCode(missing,'preflight'),0);assert.equal(exitCode(missing,'report'),2);
 assert.equal(exitCode({...missing,reason:'invalid_service_account_json'},'preflight'),2);
 assert.equal(exitCode({status:'blocked_or_partial'},'report'),2);
});
