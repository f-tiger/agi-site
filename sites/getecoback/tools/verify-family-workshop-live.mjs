import assert from 'node:assert/strict';
const origin='https://getecoback.com';
async function get(path){const r=await fetch(origin+path,{headers:{'User-Agent':'getecoback-ci'},signal:AbortSignal.timeout(30000)});assert.equal(r.status,200,path);return r.text();}
for(const [route,other,lang]of [['/familienwerkstatt.html','/en/home-workshop.html','de'],['/en/home-workshop.html','/familienwerkstatt.html','en']]){
 const html=await get(route+'?__probe=1');assert(html.includes(`href="${origin+route}"`));assert(html.includes(`href="${origin+other}"`));assert(html.includes(`lang="${lang}"`));assert(html.includes('data-ga4-id="G-E2V0Q9SJ9V"'));assert(html.includes('family-workshop-config'));for(const mode of ['pool','garden','repair'])assert(html.includes(`data-workshop="${mode}"`));
 const asset=html.match(/src="(\/assets\/family-workshop\.mjs\?v=[a-f0-9]+)"/);assert(asset,route);const js=await get(asset[1]);assert(js.includes('dividerSTL'));assert(js.includes('eco_workshop_'));const rules=await get('/assets/family-workshop-rules.mjs'+asset[1].slice(asset[1].indexOf('?')));assert(rules.includes('solid ecoback_drawer_divider'));const business=await get('/analytics-assets/business.mjs');assert(business.includes('eco_workshop_'));
 console.log('Verified workshop HTML, sources, published scripts and GA4 route:',route);
}
const sitemap=await get('/sitemap.xml');for(const p of ['/familienwerkstatt.html','/en/home-workshop.html'])assert(sitemap.includes(origin+p));
for(const p of ['/','/en/','/tools.html'])assert((await get(p+'?__probe=1')).includes('family-workshop-entry'),p);
console.log('Workshop live discovery and sitemap verified; no customer events submitted.');
