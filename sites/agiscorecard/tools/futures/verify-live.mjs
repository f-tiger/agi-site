// Read-only production checks. No signup, business POST, order or model request.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const base='https://agiscorecard.com',root=new URL('../../',import.meta.url);
const hash=b=>createHash('sha256').update(b).digest('hex');
async function get(route){
 const response=await fetch(base+route+(route.includes('?')?'&':'?')+'__qa=1',{
  redirect:'manual',headers:{'user-agent':'FleetAnalyticsProbe/1.0 (AI futures read-only release check)'},signal:AbortSignal.timeout(20000)
 });
 assert.equal(response.status,200,route);return response;
}
for(const prefix of ['','/zh']){
 const route=prefix+'/ai-futures',html=await (await get(route)).text();
 assert.ok(html.includes('href="'+base+route+'"'),route+' canonical');
 assert.ok(html.includes('/analytics-assets/consent.mjs'),route+' GA4');
 assert.ok(html.includes('/futures-assets/app.mjs'),route+' application');
 assert.ok(html.includes('WebApplication'),route+' application schema');
 const tools=await (await get(prefix+'/ai-tools')).text();
 assert.ok(tools.includes('href="'+route+'"'),route+' directory entry');
 const guide=await (await get(prefix+'/future-guide')).text();
 assert.ok(guide.includes('href="'+route+'"'),route+' related research entry');
 const md=await (await get(route+'.md')).text();
 assert.match(md,/RSI/);assert.match(md,/SI/);
}
for(const file of ['engine.mjs','neural.mjs','core.mjs','app.mjs','style.css','evidence.json','snapshot.json','share-en.png','share-zh.png']){
 const route='futures-assets/'+file,live=Buffer.from(await (await get('/'+route)).arrayBuffer());
 assert.equal(hash(live),hash(fs.readFileSync(new URL(route,root))),route+' release bytes');
}
const catalog=await (await get('/member-assets/products.json')).json();
assert.ok(catalog.some(p=>p.id==='ai-futures'&&p.urls?.en===base+'/ai-futures'&&p.urls?.zh===base+'/zh/ai-futures'),'independent member product');
const sitemap=await (await get('/sitemap.xml')).text();
for(const route of ['/ai-futures','/zh/ai-futures'])assert.ok(sitemap.includes('<loc>'+base+route+'</loc>'),'sitemap '+route);
const snapshot=await (await get('/futures-assets/snapshot.json')).json();
assert.ok(snapshot.checkedAt&&Array.isArray(snapshot.items)&&Array.isArray(snapshot.sources),'dated source snapshot');
const forecast=await (await get('/futures-assets/forecast.json')).json();
assert.equal(forecast.kind,'conditional_simulation');assert.equal(forecast.snapshotId,snapshot.checkedAt);
assert.equal(forecast.result.n,1024);assert.ok(Number.isFinite(forecast.result.rsi)&&forecast.result.si<=forecast.result.rsi);
console.log('AI futures: bilingual public pages, related entries, exact model assets, member product, sitemap and Markdown verified. No write requests or payments.');
console.log('Source snapshot:',snapshot.checkedAt,';',snapshot.items.length,'items;',snapshot.sources.filter(s=>!s.ok).length,'unavailable sources (cached evidence may remain).');
const response=await fetch(base+'/api/member?__qa=1',{redirect:'manual',headers:{'user-agent':'FleetAnalyticsProbe/1.0 (membership availability only)'},signal:AbortSignal.timeout(20000)});
assert.ok([200,503].includes(response.status),'member availability status');
const membership=await response.json();
console.log('Membership availability:',JSON.stringify({httpStatus:response.status,site:membership.site||null,ready:membership.ready===true,code:membership.code||null}),'This is not a paid transaction or delivery test.');
