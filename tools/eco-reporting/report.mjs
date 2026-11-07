// ECO-only official reports. Read scopes; no raw metrics or API bodies in logs.
import {createSign, createPublicKey} from 'node:crypto';
import {mkdir, writeFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {seal} from '../fleet/workers_usage.mjs';

export const PROPERTY = '544688614';
export const HOST = 'getecoback.com';
export const SITE = 'sc-domain:getecoback.com';
const SCOPES = 'https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/webmasters.readonly';
class ReadError extends Error { constructor(code) { super(code); this.code = code; } }
const failure = error => error instanceof ReadError ? error.code : 'request_failed';
const shift = (day, n) => new Date(Date.parse(day + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);
export function dayInZone(now, zone) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {timeZone:zone, year:'numeric', month:'2-digit', day:'2-digit'}).formatToParts(now).map(p => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
export function credentials(raw) {
  if (!raw) throw new ReadError('missing_GA4_SERVICE_ACCOUNT_JSON');
  let key;
  try { key = JSON.parse(raw); } catch { throw new ReadError('invalid_service_account_json'); }
  if (key.type !== 'service_account' || !/^[^\s@]+@[^\s@]+\.gserviceaccount\.com$/.test(key.client_email || '') || !key.private_key?.includes('PRIVATE KEY')) throw new ReadError('invalid_service_account_fields');
  try { createSign('RSA-SHA256').update('preflight').sign(key.private_key); } catch { throw new ReadError('invalid_service_account_private_key'); }
  return key;
}
export function validatePublicKey(pem) {
  if (typeof pem!=='string' || !/^-----BEGIN (?:RSA )?PUBLIC KEY-----/.test(pem.trim()) || pem.includes('PRIVATE KEY')) throw new ReadError('missing_or_invalid_report_public_key');
  let key;
  try { key = createPublicKey(pem); } catch { throw new ReadError('missing_or_invalid_report_public_key'); }
  if (key.asymmetricKeyType !== 'rsa' || key.asymmetricKeyDetails.modulusLength < 2048) throw new ReadError('report_public_key_requires_RSA_2048_or_more');
  return key;
}
export const encryptReport = seal;
async function jsonRequest(fetchFn, url, options, code) {
  let response;
  try { response = await fetchFn(url, {...options, signal:AbortSignal.timeout(20000), redirect:'error'}); }
  catch { throw new ReadError(code + '_network'); }
  if (!response.ok) throw new ReadError(code + '_http_' + response.status);
  try { return await response.json(); } catch { throw new ReadError(code + '_invalid_json'); }
}
async function tokenFor(key, fetchFn, now) {
  const b64 = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const iat = Math.floor(now.getTime() / 1000);
  const unsigned = b64({alg:'RS256',typ:'JWT'}) + '.' + b64({iss:key.client_email, scope:SCOPES, aud:'https://oauth2.googleapis.com/token', iat, exp:iat+600});
  const assertion = unsigned + '.' + createSign('RSA-SHA256').update(unsigned).sign(key.private_key, 'base64url');
  const data = await jsonRequest(fetchFn, 'https://oauth2.googleapis.com/token', {method:'POST', body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion})}, 'oauth');
  if (!data.access_token) throw new ReadError('oauth_missing_token');
  return data.access_token;
}
export async function collect(key, {fetchFn=fetch, now=new Date()}={}) {
  const report = {schema:1, generatedAt:now.toISOString(), host:HOST, ga4Property:PROPERTY, gscSite:SITE, measurement:'GA4 users are measured identities, not a census of people; D1 events are not substituted.', ga4:{status:'blocked'}, gsc:{status:'blocked'}};
  let token;
  try { token = await tokenFor(key, fetchFn, now); }
  catch (error) { const reason=failure(error); report.ga4.reason=reason;report.gsc.reason=reason;return report; }
  const headers = {authorization:'Bearer '+token, 'content-type':'application/json'};
  try {
    const property = await jsonRequest(fetchFn, `https://analyticsadmin.googleapis.com/v1beta/properties/${PROPERTY}`, {headers}, 'ga4_property');
    if (!property.timeZone) throw new ReadError('ga4_missing_property_timezone');
    const endDate=shift(dayInZone(now, property.timeZone),-1), startDate=shift(endDate,-27);
    report.ga4={status:'reading', timezone:property.timeZone, startDate, endDate, dateBoundary:'inclusive; last 28 complete property-timezone dates', reports:{}};
    const sections = {
      daily:{dimensions:['date'],metrics:['totalUsers','activeUsers','sessions','screenPageViews','engagedSessions'],limit:100},
      channels:{dimensions:['sessionSourceMedium'],metrics:['sessions','totalUsers','activeUsers'],limit:1000},
      countries:{dimensions:['country'],metrics:['sessions','totalUsers'],limit:1000},
      landingPages:{dimensions:['landingPage'],metrics:['sessions','totalUsers','engagedSessions'],limit:1000},
      events:{dimensions:['eventName'],metrics:['eventCount'],limit:1000}
    };
    for (const [name, section] of Object.entries(sections)) {
      const request={dateRanges:[{startDate,endDate}], dimensions:section.dimensions.map(name=>({name})), metrics:section.metrics.map(name=>({name})), dimensionFilter:{filter:{fieldName:'hostName',stringFilter:{matchType:'EXACT',value:HOST,caseSensitive:false}}}, limit:section.limit, ...(name==='daily'?{orderBys:[{dimension:{dimensionName:'date'}}]}:{orderBys:[{metric:{metricName:section.metrics[0]},desc:true}]})};
      try {
        const raw=await jsonRequest(fetchFn, `https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY}:runReport`, {method:'POST',headers,body:JSON.stringify(request)}, 'ga4_'+name);
        if (!Array.isArray(raw.metricHeaders) || (raw.rows!==undefined&&!Array.isArray(raw.rows))) throw new ReadError('ga4_'+name+'_invalid_shape');
        report.ga4.reports[name]={status:'received', request, raw, truncated:Number(raw.rowCount||0)>(raw.rows||[]).length, note:'Raw metadata retains sampling/thresholding/data-loss indicators. Missing daily rows are not filled with invented people.'};
      } catch(error) { report.ga4.reports[name]={status:'blocked',reason:failure(error)}; }
    }
    report.ga4.status=Object.values(report.ga4.reports).every(x=>x.status==='received')?'received':'partial';
  } catch(error) { report.ga4={status:'blocked',reason:failure(error)}; }
  const endDate=shift(dayInZone(now,'America/Los_Angeles'),-3),startDate=shift(endDate,-27);
  report.gsc={status:'reading',timezone:'America/Los_Angeles',startDate,endDate,dateBoundary:'inclusive; ends three Pacific dates back; final data requested',reports:{}};
  for (const [name, dimensions] of Object.entries({daily:['date'],pages:['page'],queries:['query'],queryPages:['query','page'],countries:['country']})) {
    const request={startDate,endDate,dimensions,type:'web',dataState:'final',dimensionFilterGroups:[{filters:[{dimension:'page',operator:'includingRegex',expression:'^https://getecoback\\.com/'}]}],rowLimit:name==='daily'?100:5000,startRow:0};
    try {
      const raw=await jsonRequest(fetchFn, `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE)}/searchAnalytics/query`, {method:'POST',headers,body:JSON.stringify(request)}, 'gsc_'+name);
      if (raw.rows!==undefined&&!Array.isArray(raw.rows)) throw new ReadError('gsc_'+name+'_invalid_shape');
      report.gsc.reports[name]={status:'received',request,raw,atRowLimit:(raw.rows||[]).length>=request.rowLimit,note:'Top rows only; anonymized queries and Google internal limits mean this is not complete query coverage. Empty rows are not proof of no traffic.'};
    } catch(error) { report.gsc.reports[name]={status:'blocked',reason:failure(error)}; }
  }
  report.gsc.status=Object.values(report.gsc.reports).every(x=>x.status==='received')?'received':'partial';
  return report;
}
export async function run(env=process.env, dependencies={}) {
  const mode=env.ECO_REPORT_MODE || 'preflight';
  if (!['preflight','report'].includes(mode)) return {status:'blocked',reason:'invalid_report_mode',reportWritten:false};
  let key;
  try { key=credentials(env.GA4_SERVICE_ACCOUNT_JSON); }
  catch(error) { return {status:'blocked',reason:failure(error),reportWritten:false}; }
  if (mode==='preflight') return {status:'credentials_present',liveAccess:'not_checked',reportWritten:false};
  let publicKey;
  try { publicKey=validatePublicKey(env.ECO_REPORT_PUBLIC_KEY); }
  catch(error) { return {status:'blocked',reason:failure(error),reportWritten:false}; }
  if (!env.ECO_REPORT_OUTPUT) return {status:'blocked',reason:'missing_encrypted_output_path',reportWritten:false};
  const report=await collect(key,dependencies), envelope=encryptReport(report,publicKey);
  await mkdir(dirname(env.ECO_REPORT_OUTPUT),{recursive:true,mode:0o700});
  await writeFile(env.ECO_REPORT_OUTPUT,JSON.stringify(envelope),{mode:0o600});
  return {status:report.ga4.status==='received'&&report.gsc.status==='received'?'received':'blocked_or_partial',ga4:report.ga4.status,gsc:report.gsc.status,reportWritten:true,encrypted:true};
}
if (process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  let result;
  try { result=await run(); } catch { result={status:'blocked',reason:'report_output_failed',reportWritten:false}; }
  // Status only: never log report bodies, keys, tokens, query terms or metrics.
  console.log(JSON.stringify(result));
  if (process.env.GITHUB_STEP_SUMMARY) await writeFile(process.env.GITHUB_STEP_SUMMARY,'ECO official read-only report: '+result.status+'. '+(result.reason||'Raw metrics are not printed.')+'\n');
  if (process.env.GITHUB_OUTPUT) await writeFile(process.env.GITHUB_OUTPUT,'report_written='+result.reportWritten+'\n');
  if (result.status==='blocked'||result.status==='blocked_or_partial') process.exitCode=2;
}
