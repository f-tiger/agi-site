// GET-only production checks: no synthetic signup, telemetry or notification.
import assert from 'node:assert/strict';
const origin='https://agiscorecard.com';
const get=path=>fetch(origin+path,{redirect:'manual',headers:{'User-Agent':'FleetAnalyticsProbe/1.0 (capital radar release verification)'},signal:AbortSignal.timeout(30000)});
const landing=await get('/capital-radar-about?__qa=1');
assert.equal(landing.status,200,'Public methodology must be available');
const html=await landing.text();
assert.match(html,/capital-radar/);assert.match(html,/https:\/\/agiscorecard.com\/capital-radar-about/);
for(const path of ['/capital-radar','/capital-radar.html','/capital-radar/','/capital-radar/account','/capital-radar/account.html','/capital%2dradar']){
 const r=await get(path);assert.equal(r.status,303,path+' must require registration');
 assert.equal(r.headers.get('location'),'/auth/account?next=%2Fcapital-radar&lang=zh');assert.match(r.headers.get('cache-control')||'',/no-store/);
 assert.match(r.headers.get('x-robots-tag')||'',/noindex/);
 assert.equal(await r.text(),'');
}
for(const path of ['/api/capital-radar','/api/capital-radar/runner']){
 const r=await get(path);assert.equal(r.status,401,path+' anonymous API');
 assert.match(r.headers.get('cache-control')||'',/no-store/);
 const body=await r.json();assert.equal(body.ok,false);assert.equal(body.snapshot,undefined);
}
for(const path of ['/capital-radar-assets/app.mjs','/capital-radar-assets/style.css'])assert.equal((await get(path)).status,200,path);
for(const path of ['/','/cn']){
 const r=await get(path+'?__qa=1');assert.equal(r.status,200);assert.match(await r.text(),/href="\/capital-radar/);
}
const sitemap=await get('/sitemap.xml?__qa=1'),xml=await sitemap.text();
assert.match(xml,/<loc>https:\/\/agiscorecard.com\/capital-radar-about<\/loc>/);
assert.doesNotMatch(xml,/<loc>https:\/\/agiscorecard.com\/capital-radar(?:<|\/|\.html)/);
console.log('PASS: public entry, both homepage links, private aliases, anonymous API rejection and sitemap isolation. Real user sign-in and Telegram delivery require separate receipts.');
