import assert from 'node:assert/strict';
const origin='https://getecoback.com',route='/ersatzfilter.html';
async function get(path){const r=await fetch(origin+path,{headers:{'User-Agent':'getecoback-ci'},signal:AbortSignal.timeout(25000)});assert.equal(r.status,200,path);return r.text();}
const html=await get(route+'?__probe=1');
assert(html.includes(`rel="canonical" href="${origin+route}"`));
assert(html.includes('data-ga4-id="G-E2V0Q9SJ9V"')&&html.includes('/auth/account'));
const data=JSON.parse(html.match(/<script id="filter-care-data" type="application\/json">(.*?)<\/script>/s)[1]);
assert.equal(data.market,'DE');assert.deepEqual(data.items.map(i=>i.id),['levoit-core-300s','beurer-lr401']);
assert(!/<a\b[^>]*href="https:\/\/(?:www\.)?amazon\./i.test(html));
const asset=html.match(/src="(\/assets\/filter-care\.mjs\?v=[a-f0-9]+)"/)[1];
assert((await get(asset)).includes('eco_filter_care_save'));
assert((await get('/assets/filter-care-core.mjs'+asset.slice(asset.indexOf('?')))).includes('getecoback-21'));
for(const path of ['/produkte.html','/guide/luftreiniger-ratgeber.html','/tools.html','/sitemap.xml','/search-index.json','/mcp-guides.json','/llms.txt','/llms-full.txt'])assert((await get(path)).includes(route),path);
const md=await get('/ersatzfilter.md');assert(md.includes('69309')&&!md.includes('getecoback-21'));
console.log('Live German filter care: canonical, source catalog, assets, GA4/account, catalog entry and search/AI discovery verified; GET only.');
