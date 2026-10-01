// Read-only production verification. No order, account, transfer or demand event.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {DECK_VERSION,PRODUCT} from '../assets/studio/deck-core.mjs';
const origin='https://baipiaoji.com';
async function get(path){const u=new URL(path,origin);u.searchParams.set('__ci','1');const r=await fetch(u,{headers:{'User-Agent':'bpj-ci-selftest-proposal-deck'},redirect:'error',signal:AbortSignal.timeout(25000)});assert.equal(r.status,200,path);return r.text();}
for(const prefix of ['','/en']){
 const page=await get(prefix+'/studio/proposal-deck');for(const text of ['id="deck-workspace"','id="dk-export"','id="dk-cloud"',`deck-app.mjs?v=${DECK_VERSION}`,`rel="canonical" href="${origin}${prefix}/studio/proposal-deck"`])assert(page.includes(text),text);
 for(const path of [prefix+'/',prefix+'/studio/',prefix+'/search-index.json',prefix+'/site-journeys.json'])assert((await get(path)).includes('/studio/proposal-deck'),path);
 assert((await get(prefix+'/studio/proposal-deck/guide')).includes('PPT Master'));
}
for(const file of ['deck-core.mjs','deck-app.mjs','deck-export.mjs','deck-view.mjs','deck.css','vendor/pptxgenjs-4.0.1.js','vendor/pptxgenjs-LICENSE.txt']){const live=await get('/studio-assets/'+file),local=readFileSync(new URL('../assets/studio/'+file,import.meta.url),'utf8');const hash=x=>createHash('sha256').update(x).digest('hex');assert.equal(hash(live),hash(local),file+' must match this release');}
assert(JSON.parse(await get('/member-assets/products.json')).some(p=>p.id===PRODUCT));
const member=JSON.parse(await get('/api/member'));assert.equal(member.ok,true);assert.equal(member.plan.price_units,9000000);assert.equal(member.plan.workspaces,50);assert.equal(member.plan.versions,10);
console.log(JSON.stringify({product:PRODUCT,edition:DECK_VERSION,status:'live_verified',languages:['zh','en'],cloud_checkout_ready:member.ready===true,price_base_usdt:9,synthetic_demand_events:0,orders_created:0,revenue_verified:false}));
