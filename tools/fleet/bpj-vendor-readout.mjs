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
const tokens=new Set([env.CLOUDFLARE_API_TOKEN,env.CLOUDFLARE_API_TOKEN_ZONE,env.CF_API_TOKEN].filter(Boolean));
async function api(token,path,options={}) {
  const headers={authorization:'Bearer '+token,'content-type':'application/json'};
  const r=await fetch('https://api.cloudflare.com/client/v4/'+path,{...options,headers,redirect:'error',signal:AbortSignal.timeout(20000)});
  if(!r.ok) throw Error('Cloudflare HTTP '+r.status);
  const data=await r.json();
  if(!data.success) throw Error('Cloudflare query unavailable');
  return data.result;
}
let read;
for(const token of tokens) {
  try {
    const account=env.CLOUDFLARE_ACCOUNT_ID || (await api(token,'zones?name=baipiaoji.com')).find(z=>z.name==='baipiaoji.com')?.account?.id;
    if(!account) continue;
    const query=async(sql,params=[])=>{
      const [r]=await api(token,'accounts/'+account+'/d1/database/'+database+'/query',{method:'POST',body:JSON.stringify({sql,params})});
      if(!r.success||!Array.isArray(r.results))throw Error('Incomplete D1 result');
      return r.results;
    };
    await query('SELECT 1');
    read=query;
    break;
  }catch{}
}
if(!read)throw Error('No configured token could read the BPJ database');
const generated=new Date();
const since=new Date(generated.getTime()-7*86400000).toISOString().slice(0,10);
const until=generated.toISOString().slice(0,10);
const paths=['/biz/trigger/vendor-view','/biz/trigger/vendor-wait','/biz/trigger/vendor-sponsor','/biz/trigger/ad-view','/biz/trigger/ad-inquiry','/biz/from-submit/click','/biz/submit/sponsor','/biz/submit/expedite'];
const events=await read(`SELECT d,path,count(*) n FROM hits WHERE d BETWEEN ? AND ? AND ev!='' AND ev='biz' AND lang!='ci' AND path IN (${paths.map(()=>'?').join(',')}) GROUP BY d,path ORDER BY d,path`,[since,until,...paths]);
const tables=await read("SELECT count(*) n FROM sqlite_schema WHERE type='table' AND name='vendor_inquiries'");
const provisioned=tables[0]?.n===1;
if(!provisioned && tables[0]?.n!==0)throw Error('Unknown intake table state');
const intake=provisioned?await read(`SELECT created d,CASE WHEN kind IN ('sponsor','feature','expedite') THEN kind ELSE 'other' END intent,count(*) n FROM vendor_inquiries WHERE created BETWEEN ? AND ? GROUP BY created,intent ORDER BY created,intent`,[since,until]):[];
const report={generated:generated.toISOString(),since,until,todayPartial:true,provisioned,events,intake};
writeFileSync('/tmp/bpj-vendors.enc.json',JSON.stringify(seal(report,pem)),{mode:0o600});
