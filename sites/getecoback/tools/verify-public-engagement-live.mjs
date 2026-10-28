import assert from 'node:assert/strict';
import fs from 'node:fs';
import {engagementVersion} from './install-public-engagement.mjs';
const expected=fs.readFileSync(new URL('../site/assets/public-engagement.mjs',import.meta.url),'utf8');
async function read(route){
  const url=new URL(route,'https://getecoback.com');url.searchParams.set('__ci','1');
  const r=await fetch(url,{headers:{'User-Agent':'eco-ci-selfcheck'},signal:AbortSignal.timeout(25000)});
  assert.equal(r.status,200,route);return r.text();
}
assert.equal(await read('/eco-engagement.mjs?v='+engagementVersion),expected);
for(const route of ['/guide/klimaanlage-wohnmobil.html','/en/guide/portable-ac-tilt-and-turn-windows.html','/','/en/','/stromtarif-werkstatt.html']) {
  const html=await read(route);assert.equal((html.match(/src="\/eco-engagement\.mjs\?v=/g)||[]).length,1,route);
  assert(html.includes('/eco-engagement.mjs?v='+engagementVersion),route);
}
for(const route of ['/members.html','/en/members.html','/it/members.html'])assert(!(await read(route)).includes('/eco-engagement.mjs'),route);
console.log(JSON.stringify({ok:true,version:engagementVersion,privatePagesExcluded:true,ga4BackendReceipt:'not-tested'}));
