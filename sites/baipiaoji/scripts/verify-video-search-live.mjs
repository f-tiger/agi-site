// Read-only deployment verification; never call hit, discovery, export or checkout APIs.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {EDITION} from '../assets/studio/video-core.mjs';
async function read(route){
 const u=new URL(route,'https://baipiaoji.com');u.searchParams.set('__ci','1');
 const r=await fetch(u,{headers:{'User-Agent':'bpj-ci-selfcheck'},signal:AbortSignal.timeout(25000)});
 assert.equal(r.status,200,route);return r.text();
}
for(const name of ['video-events.mjs','video-business.mjs','video-case-player.mjs','video-app.mjs']){
 const source=fs.readFileSync(new URL('../assets/studio/'+name,import.meta.url),'utf8');
 assert.equal(await read('/studio-assets/'+name+'?v='+EDITION),source,name);
}
const search=fs.readFileSync(new URL('../assets/manju-live-search.js',import.meta.url),'utf8');
const hash=createHash('sha256').update(search).digest('hex').slice(0,10);
// Read the exact versioned script URL emitted by the page; verify its bytes as well.
const html=await read('/manju/'),src=html.match(/src="(\/manju-live-search\.js\?v=[a-f0-9]+)"/)?.[1];
assert(src,'versioned Manju search');assert.equal(await read(src),search);
for(const prefix of ['','/en']){
 for(const route of ['/video/','/studio/video-variants']){
  const page=await read(prefix+route);assert(page.includes('v='+EDITION),prefix+route);
  assert(page.includes('data-ga4-host="baipiaoji.com"'),prefix+route);
 }
}
console.log(JSON.stringify({ok:true,edition:EDITION,searchHash:hash,mode:'read-only',ga4BackendReceipt:'not-tested'}));
