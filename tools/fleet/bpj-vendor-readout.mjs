// Daily aggregate counts only. Today's UTC bucket is partial.
import {readFileSync,writeFileSync} from 'node:fs';
import {seal} from './workers_usage.mjs';
import {validatePublicKey} from '../eco-reporting/report.mjs';

const env=process.env;
const pem=Buffer.from(env.WORKERS_REPORT_PUBLIC_KEY,'base64').toString();
validatePublicKey(pem);
const config=readFileSync(new URL('../../sites/baipiaoji/wrangler.toml',import.meta.url),'utf8');
const database=config.match(/binding\s*=\s*"HITS"\s+database_name\s*=\s*"[^"]+"\s+database_id\s*=\s*"([a-f0-9-]+)"/)?.[1];
if(!database) throw Error('BPJ database binding unavailable');
const headers={authorization:'Bearer '+env.CLOUDFLARE_API_TOKEN,'content-type':'application/json'};
async function api(path,options={}) {
  const r=await fetch('https://api.cloudflare.com/client/v4/'+path,{...options,headers,redirect:'error',signal:AbortSignal.timeout(20000)});
  if(!r.ok) throw Error('Cloudflare HTTP '+r.status);
  const data=await r.json();
  if(!data.success) throw Error('Cloudflare query unavailable');
  return data.result;
}
const acct=env.CLOUDFLARE_ACCOUNT_ID || (await api('zones?name=baipiaoji.com')).find(z=>z.name==='baipiaoji.com')?.account?.id;
if(!acct)throw Error('BPJ account unavailable');
async function query(sql,params=[]) {
  const [r]=await api('accounts/'+acct+'/d1/database/'+database+'/query',{method:'POST',body:JSON.stringify({sql,params})});
  if(!r.success||!Array.isArray(r.results)) throw Error('Incomplete D1 result');
  return r.results;
}
const generated=new Date();
const since=new Date(generated.getTime()-7*86400000).toISOString().slice(0,10);
const until=generated.toISOString().slice(0,10);
const paths=['/biz/trigger/vendor-view','/biz/trigger/vendor-wait','/biz/trigger/vendor-sponsor','/biz/trigger/ad-view','/biz/trigger/ad-inquiry','/biz/from-submit/click','/biz/submit/sponsor','/biz/submit/expedite'];
const events=await query(`SELECT d,path,count(*) n FROM hits WHERE d BETWEEN ? AND ? AND ev!='' AND ev='biz' AND lang!='ci' AND path IN (${paths.map(()=>'?').join(',')}) GROUP BY d,path ORDER BY d,path`,[since,until,...paths]);
const tables=await query("SELECT count(*) n FROM sqlite_schema WHERE type='table' AND name='vendor_inquiries'");
const provisioned=tables[0]?.n===1;
if(!provisioned && tables[0]?.n!==0)throw Error('Unknown intake table state');
const intake=provisioned?await query(`SELECT created d,CASE WHEN kind IN ('sponsor','feature','expedite') THEN kind ELSE 'other' END intent,count(*) n FROM vendor_inquiries WHERE created BETWEEN ? AND ? GROUP BY created,intent ORDER BY created,intent`,[since,until]):[];
const report={generated:generated.toISOString(),since,until,todayPartial:true,provisioned,events,intake};
writeFileSync('/tmp/bpj-vendors.enc.json',JSON.stringify(seal(report,pem)),{mode:0o600});
