// Read-only release probe: public pages and files, no scripts, merchants or events.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {MARKET_PATHS,MARKET_HOSTS} from '../../collector-assets/market-contract.mjs';
const args=process.argv.slice(2),live=args.includes('--live'),root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),out=args.includes('--out')?path.resolve(args[args.indexOf('--out')+1]):root;
async function read(p){if(!live)return fs.readFileSync(path.join(out,p.replace(/^\//,'')+(p.endsWith('/')?'index.html':path.extname(p)?'':'.html')),'utf8');const r=await fetch('https://thedollscout.com'+p,{headers:{'x-probe':'uk-nl-release','user-agent':'FleetContentDeliveryProbe/1.0'},redirect:'manual',signal:AbortSignal.timeout(20000)});assert.equal(r.status,200,p);return r.text();}
const manifest=JSON.parse(await read('/collector-assets/market-manifest.json'));assert.equal(manifest.records.length,8);
const sitemap=await read('/sitemap.xml'),llms=await read('/llms.txt');
for(const r of manifest.records){
 const p=new URL(r.url).pathname,h=await read(p);assert.equal(MARKET_PATHS[p],r.market);assert(h.includes(`<html lang="${r.lang}">`));assert(h.includes(`rel="canonical" href="${r.url}"`));assert.equal((h.match(/<h1>/g)||[]).length,1);assert(!h.includes('noindex'));
 for(const a of r.alternatives)assert(h.includes(`hreflang="${a.lang}" href="${a.url}"`));
 assert.equal(sitemap.split('<loc>'+r.url+'</loc>').length-1,1);assert(llms.includes(r.url));assert((await read(new URL(r.textUrl).pathname)).includes(r.url));
 const schema=JSON.parse(h.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);assert(schema['@graph'].some(x=>x['@type']==='ItemList'));assert(!schema['@graph'].some(x=>['Product','Offer','Review','FAQPage'].includes(x['@type'])));
 for(const a of h.matchAll(/href="(https:\/\/www\.amazon[^\"]+)"/g)){const u=new URL(a[1]);assert.equal(u.hostname,'www.'+MARKET_HOSTS[r.market]);assert(!u.searchParams.has('tag'));assert.equal(u.pathname,'/s');}
 assert(h.includes('market-guides.mjs?v=20261115.uknl1'));
}
for(const p of ['/','/en/','/zh/','/shop','/de/shop','/zh/shop']){const h=await read(p);assert(h.includes('href="/uk/"'));assert(h.includes('href="/nl/"'));if(p==='/')assert(h.includes('<html lang="de">'));}
console.log(JSON.stringify({market_pages:8,existing_entry_pages:6,mode:live?'production':'build',business_events:0,merchant_visits:0,result:'pass'}));
