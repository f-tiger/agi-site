import {readFile,writeFile} from 'node:fs/promises';
const account=process.env.CLOUDFLARE_ACCOUNT_ID;
async function api(path,zone=false){const token=process.env[zone?'CLOUDFLARE_API_TOKEN_ZONE':'CLOUDFLARE_API_TOKEN'];if(!account||!token)throw Error('Required Cloudflare credential unavailable.');const response=await fetch('https://api.cloudflare.com/client/v4/'+path,{headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},signal:AbortSignal.timeout(20000)});const data=await response.json();if(response.ok&&data.success)return data.result;throw Error('Cloudflare read failed: HTTP '+response.status+'; codes '+(data.errors||[]).map(x=>Number(x.code)).filter(Number.isFinite).join(','));}
const config=JSON.parse(await readFile('wrangler.jsonc','utf8'));
const domains=await api(`accounts/${account}/workers/domains`),zones=await api('zones?name=agiscorecard.com',true);
if(zones.length!==1)throw Error('Owner zone not resolved.');
for(const route of config.routes){const match=domains.find(d=>d.hostname===route.pattern);if(match&&match.service!==config.name)throw Error('Hostname already belongs to another worker.');if(!match){const records=await api(`zones/${zones[0].id}/dns_records?name=${route.pattern}`,true);if(records.length)throw Error('Existing DNS record: stopped to preserve its owner.');}console.log('Hostname collision check passed: '+route.pattern);}
// Existing owner-managed fleet database; this worker only accesses its isolated table.
config.d1_databases=[{binding:'DB',database_name:'after35-events',database_id:'6109b81e-c970-47d7-b7fc-3a2a15f68ed2'}];
await writeFile('wrangler.generated.json',JSON.stringify(config,null,2)+'\n');
