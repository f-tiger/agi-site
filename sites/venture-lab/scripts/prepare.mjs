import {readFile,writeFile} from 'node:fs/promises';import {api,account} from './cloudflare.mjs';
const config=JSON.parse(await readFile('wrangler.jsonc','utf8'));
const domains=await api(`accounts/${account}/workers/domains`);const zones=await api('zones?name=agiscorecard.com',{zone:true});if(zones.length!==1)throw Error('Owner zone not resolved.');
for(const route of config.routes){const match=domains.find(d=>d.hostname===route.pattern);if(match&&match.service!==config.name)throw Error('Hostname already assigned to another service: '+route.pattern);if(!match){const records=await api(`zones/${zones[0].id}/dns_records?name=${route.pattern}`,{zone:true});if(records.length)throw Error('Existing DNS record; stopped: '+route.pattern);}console.log('Hostname collision check passed: '+route.pattern);}
// Bind the existing owner-managed database already used by Learn. Runtime binding
// authorization is enforced by Cloudflare on deploy; no management API proxy.
config.d1_databases=[{binding:'DB',database_name:'after35-events',database_id:'6109b81e-c970-47d7-b7fc-3a2a15f68ed2'}];
await writeFile('wrangler.generated.json',JSON.stringify(config,null,2)+'\n');
console.log('Prepared existing owner DB binding; Worker initializes only venture_events and filinglens_events.');
