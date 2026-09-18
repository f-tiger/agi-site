import {readFile,writeFile} from 'node:fs/promises';import {api,account,database} from './cloudflare.mjs';
const config=JSON.parse(await readFile('wrangler.jsonc','utf8'));
const domains=await api(`accounts/${account}/workers/domains`);const zones=await api('zones?name=agiscorecard.com',{zone:true});if(zones.length!==1)throw Error('Owner zone not resolved.');
for(const route of config.routes){const match=domains.find(d=>d.hostname===route.pattern);if(match&&match.service!==config.name)throw Error('Hostname already assigned to another service: '+route.pattern);if(!match){const records=await api(`zones/${zones[0].id}/dns_records?name=${route.pattern}`,{zone:true});if(records.length)throw Error('Existing DNS record; stopped: '+route.pattern);}console.log('Hostname collision check passed: '+route.pattern);}
let db=await database();if(!db)db=await api(`accounts/${account}/d1/database`,{method:'POST',payload:{name:'agi-venture-lab'}});if(!db.uuid)throw Error('Database ID unavailable.');
// One dedicated database; the schema is additive and does not touch existing sites.
const schema=await readFile('migrations/0001.sql','utf8');const result=await api(`accounts/${account}/d1/database/${db.uuid}/query`,{method:'POST',payload:{sql:schema}});if(result.some(r=>r.success===false))throw Error('Database initialization failed.');
config.d1_databases=[{binding:'DB',database_name:'agi-venture-lab',database_id:db.uuid}];await writeFile('wrangler.generated.json',JSON.stringify(config,null,2)+'\n');console.log('Dedicated measurement database ready; no payment or model secret configured.');
