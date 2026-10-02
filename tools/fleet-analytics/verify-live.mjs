import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const sites={agi:['agiscorecard.com','G-FZXLMBB5QB'],eco:['getecoback.com','G-E2V0Q9SJ9V'],bpj:['baipiaoji.com','G-H79D948F4Z'],tds:['thedollscout.com','G-2SEHFY33H8']};
const site=process.argv[2];assert(sites[site],'Usage: node verify-live.mjs agi|eco|bpj|tds');
const [host,id]=sites[site],origin='https://'+host;
async function read(path){
 const url=new URL(path,origin);assert.equal(url.origin,origin);url.searchParams.set('__probe','1');
 // A successful deploy can precede asset propagation at a particular edge.
 // Retry only transport/non-200 responses; a 200 with bad content still fails.
 let failure;
 for(let attempt=0;attempt<4;attempt++){
  try{
   const r=await fetch(url,{headers:{'user-agent':'fleet-analytics-probe/1.0','x-probe':'1'},signal:AbortSignal.timeout(25000)});
   if(r.status===200)return r.text();
   failure=new Error(url.pathname+' returned HTTP '+r.status);
  }catch(error){failure=error;}
  if(attempt<3)await new Promise(resolve=>setTimeout(resolve,8000));
 }
 throw failure;
}
let report=JSON.parse(await read('/analytics-assets/coverage.json'));
assert.equal(report.site,site);assert.equal(report.measurementId,id);assert(report.records.length>20);
const names=['consent.mjs','collector.mjs','consent.css','frame.html','business.mjs'];
const local=names.map(n=>fs.readFileSync(new URL(n,import.meta.url)));
const version=createHash('sha256').update(Buffer.concat(local)).digest('hex').slice(0,12);
// A previous release may still be served briefly. Wait only for the manifest
// version transition, never for invalid page markup or mismatched asset bytes.
for(let attempt=0;report.version!==version&&attempt<3;attempt++){
 await new Promise(resolve=>setTimeout(resolve,8000));
 report=JSON.parse(await read('/analytics-assets/coverage.json'));
 assert.equal(report.site,site);assert.equal(report.measurementId,id);
}
assert.equal(report.version,version,'Production analytics release is stale');
for(let i=0;i<names.length;i++)assert.equal(await read('/analytics-assets/'+names[i]+'?v='+version),local[i].toString(),names[i]);
const routes=[...new Set(report.records.filter(r=>r.mode==='consent').map(r=>r.url))];
let next=0;
await Promise.all(Array.from({length:6},async()=>{while(next<routes.length){
 const route=routes[next++],html=await read(route);
 assert.equal((html.match(/src="\/analytics-assets\/consent\.mjs\?v=/g)||[]).length,1,route);
 assert(html.includes('data-ga4-id="'+id+'"'),route);
 assert(html.includes('data-ga4-host="'+host+'"'),route);
 assert(html.includes('/analytics-assets/consent.mjs?v='+version),route);
}}));
console.log(JSON.stringify({site,version,repairedCanonicalRoutesVerified:routes.length,ga4BackendReceipt:'not-tested',exceptions:report.records.filter(r=>r.mode==='excluded').length}));
