import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const target=new URL('./ad-watch-v2.mjs',import.meta.url).href;
function run(flags,scenario='ready'){
 const code=`
 const scenario=${JSON.stringify(scenario)};
 globalThis.fetch=async(url,options={})=>{
  console.log('REQUEST '+(options.method||'GET')+' '+url);
  if(url.endsWith('/api/ad-web3-watch'))return Response.json({ok:true,processed:0});
  if(url.endsWith('/api/bpj-member-recovery'))return scenario==='old'?Response.json({ok:false},{status:404}):Response.json({ok:true,mode:'receipts-only',ready:scenario!=='not_ready',processed:0,support_open:0});
  if(url.endsWith('/api/member-watch'))return Response.json({ok:true,processed:0,support_open:0});
  if(url.includes('/api/member?'))return Response.json({ok:true,site:'bpj',ready:scenario!=='public_stale'});
  return Response.json({ok:true,web3:{configured:true,enabled:true,watch_healthy:true},selling:true,rails:{wallet:true}});
 };
 process.argv.push(...${JSON.stringify(flags)});await import(${JSON.stringify(target)});
 `;
 return spawnSync(process.execPath,['--input-type=module','-e',code],{encoding:'utf8',env:{...process.env,ADS_WATCH_SECRET:'fixture-watch-secret-32-characters-long'}});
}
const safe=run(['--member-receipts-only']);assert.equal(safe.status,0,safe.stderr);assert.match(safe.stdout,/POST https:\/\/baipiaoji.com\/api\/bpj-member-recovery/);assert.doesNotMatch(safe.stdout,/\/api\/member-watch/);assert.match(safe.stdout,/"membership_ready":true/);
for(const state of ['old','not_ready','public_stale']){const r=run(['--member-receipts-only'],state);assert.notEqual(r.status,0);assert.doesNotMatch(r.stdout,/\/api\/member-watch|"membership_ready":true/);}
const normal=run(['--members']);assert.equal(normal.status,0,normal.stderr);assert.match(normal.stdout,/\/api\/member-watch/);assert.doesNotMatch(normal.stdout,/\/api\/bpj-member-recovery/);
const ads=run([]);assert.equal(ads.status,0,ads.stderr);assert.doesNotMatch(ads.stdout,/member-watch|bpj-member-recovery/);
const conflict=run(['--members','--member-receipts-only']);assert.notEqual(conflict.status,0);assert.doesNotMatch(conflict.stdout,/REQUEST/);
console.log('PASS safe runner, no old-endpoint fallback, public readiness, unchanged scheduled/ads-only modes and conflicting flags');
