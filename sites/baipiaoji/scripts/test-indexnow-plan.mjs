import assert from 'node:assert/strict';import {selectUrls,repairPaths} from './indexnow-plan.mjs';
const base='https://baipiaoji.com',urls=repairPaths.map(p=>base+p),manifest={[base+'/tools/google-flow.html']:{d:'2026-09-19'},[base+'/tools/cline.html']:{d:'2026-08-01'}};
assert.deepEqual(selectUrls(urls,manifest,{recent:['2026-09-19']}),[urls[0]]);
assert.deepEqual(selectUrls(urls.map(u=>u+'.html'),manifest,{recent:['2026-09-19']}),[urls[0]]);
assert.deepEqual(selectUrls(urls,manifest,{repair:true}),urls);
assert.throws(()=>selectUrls(urls.slice(1),manifest,{repair:true}),/missing/);
assert.throws(()=>selectUrls(['https://other.example/foo'],{}, {all:true}),/host/);
assert.deepEqual(selectUrls(urls,manifest,{recent:['2026-09-20']}),[]);
console.log('PASS IndexNow migration: legacy manifest keys, canonical URLs, bounded repair, missing page and foreign-host rejection.');
