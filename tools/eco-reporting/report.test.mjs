import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,privateDecrypt,createDecipheriv,constants} from 'node:crypto';
import {mkdir,mkdtemp,readFile,readdir,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {pathToFileURL} from 'node:url';
import {AFFILIATE_PATHS_SQL, affiliateReportPages, completeAffiliateWeek} from './affiliate-paths.mjs';
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

const auditNow = new Date('2026-11-26T16:00:00Z');
const auditPages = ['/guide/portable.html', '/guide/humidity.html'];

test('affiliate window is seven complete UTC dates and rejects invalid and out-of-range requests', () => {
  assert.deepEqual(completeAffiliateWeek('2026-11-26', auditNow), {start:'2026-11-19', end_exclusive:'2026-11-26'});
  for (const date of ['2026-11-31', '2026-11-27', '2026-10-07', '2026-11-26Z', '2026-11-26 OR 1=1', undefined]) {
    assert.equal(completeAffiliateWeek(date, auditNow), null);
  }
});

test('affiliate report only names checked-in German guide and selected root canonicals', async t => {
  const dir = await mkdtemp(join(tmpdir(),'eco-public-affiliate-pages-'));
  t.after(() => rm(dir,{recursive:true,force:true}));
  await mkdir(join(dir,'guide'));
  const page = (url, attrs = '') => `<html><head><link href="${url}" rel="canonical">${attrs}</head></html>`;
  await Promise.all([
    writeFile(join(dir,'index.html'), page('https://getecoback.com/')),
    writeFile(join(dir,'guide/humidity.html'), page('https://getecoback.com/guide/humidity.html')),
    writeFile(join(dir,'guide/alias.html'), page('https://getecoback.com/guide/humidity.html')),
    writeFile(join(dir,'guide/hidden.html'), page('https://getecoback.com/guide/hidden.html', '<meta content="noindex,follow" name="robots">')),
    writeFile(join(dir,'guide/external.html'), page('https://other.invalid/guide/external.html')),
  ]);
  assert.deepEqual(await affiliateReportPages(pathToFileURL(dir + '/')), ['/guide/humidity.html','/']);
});

test('private affiliate mode runs the fixed SQL once and emits only encrypted aggregates', async t => {
  const db = new DatabaseSync(':memory:');
  t.after(() => db.close());
  db.exec('CREATE TABLE ev (day TEXT, name TEXT, page TEXT, ua_class TEXT, meta TEXT)');
  const insert = db.prepare('INSERT INTO ev VALUES (?, ?, ?, ?, ?)');
  const [cool, humidity] = auditPages;
  const saved = url => JSON.stringify({link_url:url, ref:'private-ref-fixture'});
  const search = saved('https://www.amazon.de/s?tag=getecoback-21');
  const product = saved('https://amazon.de/gp/product/B000000000?tag=getecoback-21');
  const unapproved = saved('https://www.amazon.de/s?k=private-search-fixture');
  for (const args of [
    ['2026-11-19','affiliate_click',cool,'human',search],
    ['2026-11-25','affiliate_click',cool,null,search],
    ['2026-11-19','affiliate_click',cool,'human',product],
    ['2026-11-19','affiliate_click',humidity,'human',unapproved],
    ['2026-11-21','affiliate_click','/private-page-fixture','human',saved('https://amazon.com/dp/B111111111?tag=ecoback0d-20')],
    ['2026-11-21','affiliate_click',humidity,'human','invalid-json'],
    ['2026-11-21','affiliate_click',humidity,'human',saved('https://amazon.de.other.invalid/s?tag=getecoback-21')],
    ['2026-11-21','affiliate_click',humidity,'human',saved('http://amazon.de/s?tag=getecoback-21')],
    ['2026-11-21','visit',cool,'human',search],
    ['2026-11-21','affiliate_click','/__ci-check','human',search],
    ['2026-11-21','affiliate_click',cool,'bot',search],
    ['2026-11-21','affiliate_click',cool,'other',search],
    ['2026-11-18','affiliate_click',cool,'human',search],
    ['2026-11-26','affiliate_click',cool,'human',search],
  ]) insert.run(...args);

  const dir = await mkdtemp(join(tmpdir(),'eco-affiliate-encrypted-'));
  t.after(() => rm(dir,{recursive:true,force:true}));
  const file = join(dir,'report.enc.json');
  const env = {ECO_REPORT_MODE:'affiliate-paths', ECO_REPORT_PUBLIC_KEY:publicPem, ECO_REPORT_OUTPUT:file,
    ECO_AFFILIATE_END_EXCLUSIVE:'2026-11-26', CLOUDFLARE_ACCOUNT_ID:'a'.repeat(32), CLOUDFLARE_API_TOKEN:'fixture-secret'};
  const requests = [];
  const result = await run(env, {now:auditNow, pagesFor:async()=>auditPages, fetchFn:async (url, options) => {
    requests.push({url, options});
    const query = JSON.parse(options.body);
    const rows = db.prepare(query.sql).all({'?1':query.params[0], '?2':query.params[1], '?3':query.params[2]});
    return Response.json({success:true, result:[{success:true,results:rows}]});
  }});
  assert.deepEqual(result,{status:'received',reportWritten:true,encrypted:true});
  assert.equal(requests.length,1);
  const [{url, options}] = requests;
  assert.equal(url,`https://api.cloudflare.com/client/v4/accounts/${'a'.repeat(32)}/d1/database/75e45e05-44b5-4c56-9a3b-dd504b5c53f1/query`);
  assert.equal(options.method,'POST');
  assert.equal(options.redirect,'error');
  assert.deepEqual(JSON.parse(options.body), {sql:AFFILIATE_PATHS_SQL, params:[JSON.stringify(auditPages),'2026-11-19','2026-11-26']});
  const ciphertext = await readFile(file,'utf8');
  const report = open(JSON.parse(ciphertext));
  assert.equal(report.total_events,8);
  assert.deepEqual(report.rows,[
    {page:humidity,market:'amazon_de',destination:'search',approved_tag:false,events:1},
    {page:humidity,market:'other',destination:'other',approved_tag:false,events:3},
    {page:cool,market:'amazon_de',destination:'product',approved_tag:true,events:1},
    {page:cool,market:'amazon_de',destination:'search',approved_tag:true,events:2},
    {page:'other',market:'amazon_com',destination:'product',approved_tag:true,events:1},
  ]);
  for (const value of ['B000000000','B111111111','private-page-fixture','private-search-fixture','private-ref-fixture','fixture-secret']) {
    assert.ok(!JSON.stringify(report).includes(value));
    assert.ok(!ciphertext.includes(value));
  }
});

test('affiliate access failure and malformed aggregates remain unknown and write no artifact', async t => {
  const dir = await mkdtemp(join(tmpdir(),'eco-affiliate-blocked-'));
  t.after(() => rm(dir,{recursive:true,force:true}));
  const env = {ECO_REPORT_MODE:'affiliate-paths', ECO_REPORT_PUBLIC_KEY:publicPem, ECO_REPORT_OUTPUT:join(dir,'report.enc.json'),
    ECO_AFFILIATE_END_EXCLUSIVE:'2026-11-26', CLOUDFLARE_ACCOUNT_ID:'b'.repeat(32), CLOUDFLARE_API_TOKEN:'fixture-secret'};
  const options = {now:auditNow, pagesFor:async()=>auditPages};
  const denied = await run(env,{...options,fetchFn:async()=>new Response('private provider detail',{status:403})});
  assert.deepEqual(denied,{status:'blocked',reason:'d1_affiliate_http_403',reportWritten:false});
  const malformed = await run(env,{...options,fetchFn:async()=>Response.json({success:true,result:[{success:true,results:[{
    page:'/private',market:'amazon_de',destination:'search',approved_tag:1,events:1,
  }]}]})});
  assert.deepEqual(malformed,{status:'blocked',reason:'d1_affiliate_invalid_aggregate',reportWritten:false});
  const missing = await run({...env,CLOUDFLARE_API_TOKEN:''},{...options,fetchFn:async()=>assert.fail('unexpected request')});
  assert.equal(missing.reason,'missing_or_invalid_d1_access');
  assert.deepEqual(await readdir(dir),[]);
});
