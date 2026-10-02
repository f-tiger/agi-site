import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,copyFileSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const originalFetch = globalThis.fetch;
const originalDate = process.env.VERIFY_DATE;
const root=mkdtempSync(join(tmpdir(),'bpj-link-health-'));
try {
 mkdirSync(join(root,'scripts'));mkdirSync(join(root,'data'));
 copyFileSync(new URL('./verify.mjs',import.meta.url),join(root,'scripts/verify.mjs'));
 const samples=[200,204,403,404,429,500,0].map(status=>({slug:String(status),url:'https://example.test/'+status,last_verified:'2026-09-01'}));
 writeFileSync(join(root,'data/tools.json'),JSON.stringify(samples));
 globalThis.fetch=async url=>{const status=Number(new URL(url).pathname.slice(1));if(!status)throw new Error('network unavailable');return new Response(null,{status});};
 process.env.VERIFY_DATE='2026-10-02';
 await import(pathToFileURL(join(root,'scripts/verify.mjs')).href);
 const updated=JSON.parse(readFileSync(join(root,'data/tools.json')));
 const health=JSON.parse(readFileSync(join(root,'data/health.json')));
 assert.equal(health.results.length,samples.length);
 for(const t of updated) {
  const ok=['200','204'].includes(t.slug);
  assert.equal(t.last_verified,ok?'2026-10-02':'2026-09-01');
  assert.equal(health.results.find(r=>r.slug===t.slug).ok,ok);
 }
 console.log('PASS: 2xx updates availability dates; blocked, missing, throttled, server and network failures do not');
} finally {globalThis.fetch=originalFetch; if(originalDate===undefined)delete process.env.VERIFY_DATE;else process.env.VERIFY_DATE=originalDate;rmSync(root,{recursive:true,force:true});}
