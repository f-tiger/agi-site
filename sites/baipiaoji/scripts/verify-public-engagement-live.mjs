import assert from 'node:assert/strict';
import fs from 'node:fs';
import {engagementVersion} from './install-public-engagement.mjs';
const expected=fs.readFileSync(new URL('../assets/public-engagement.mjs',import.meta.url),'utf8');
async function read(route){
  const url=new URL(route,'https://baipiaoji.com');url.searchParams.set('__ci','1');
  const r=await fetch(url,{headers:{'User-Agent':'bpj-ci-selfcheck'},signal:AbortSignal.timeout(25000)});
  assert.equal(r.status,200,route);return r.text();
}
assert.equal(await read('/bpj-engagement.mjs?v='+engagementVersion),expected);
for(const route of ['/tools/kimi','/en/tools/grok','/','/en/','/workbench']) {
  const html=await read(route);assert.equal((html.match(/src="\/bpj-engagement\.mjs\?v=/g)||[]).length,1,route);
  assert(html.includes('/bpj-engagement.mjs?v='+engagementVersion),route);
}
for(const route of ['/account?save=kimi','/en/account?save=grok','/members'])assert(!(await read(route)).includes('/bpj-engagement.mjs'),route);
console.log(JSON.stringify({ok:true,version:engagementVersion,privatePagesExcluded:true,ga4BackendReceipt:'not-tested'}));
