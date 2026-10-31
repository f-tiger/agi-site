import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';

const origin='https://getecoback.com',route='/en/filter-finder.html';
const catalog=JSON.parse(fs.readFileSync(fileURLToPath(new URL('../data/filter-finder.json',import.meta.url)),'utf8'));
async function get(path) {
  const response=await fetch(origin+path,{headers:{'User-Agent':'getecoback-ci'},signal:AbortSignal.timeout(25000)});
  assert.equal(response.status,200,path);
  return response.text();
}
const html=await get(route+'?__probe=1');
assert(html.includes(`rel="canonical" href="${origin+route}"`));
assert(html.includes('data-ga4-id="G-E2V0Q9SJ9V"'));
assert(html.includes('fleet-account'),'Shared free account entry missing');
const embedded=html.match(/<script id="filter-finder-data" type="application\/json">(.*?)<\/script>/s);
assert(embedded,'Missing filter source data');
const data=JSON.parse(embedded[1]);
assert.equal(data.market,'US');
assert.deepEqual(data.items.map(item=>[item.id,item.models]),catalog.items.map(item=>[item.id,item.models]));
assert(!/<a\b[^>]*href="https:\/\/(?:www\.)?amazon\./i.test(html),'Purchase searches must follow exact selection');
const asset=html.match(/src="(\/assets\/filter-finder\.mjs\?v=[a-f0-9]+)"/);
assert(asset,'Missing versioned interactive finder');
const script=await get(asset[1]);
assert(script.includes('legacy:tool_complete'));
const core=await get('/assets/filter-finder-core.mjs'+asset[1].slice(asset[1].indexOf('?')));
assert(core.includes('ecoback0d-20')&&core.includes('sourceState'));
for(const path of ['/sitemap.xml','/search-index.json','/llms.txt','/llms-full.txt','/tools.html','/en/','/guide/luftreiniger-ratgeber.html']) {
  assert((await get(path)).includes(route),`Missing finder discovery: ${path}`);
}
const markdown=await get('/en/filter-finder.md');
assert(markdown.includes('LV-PUR131S'));
assert(!markdown.includes('ecoback0d-20'));
console.log('Live filter finder: source catalog, versioned assets, GA4/account and search/AI discovery verified; no customer or purchase events submitted.');
