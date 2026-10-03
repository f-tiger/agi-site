// Read-only live checks. No test votes, plans, orders or model calls are created.
import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {claims} from '../../foresight-assets/catalog.mjs';
const root=new URL('../../',import.meta.url),base='https://agiscorecard.com',hash=b=>createHash('sha256').update(b).digest('hex');
const get=async route=>{const r=await fetch(base+route+(route.includes('?')?'&':'?')+'ci=1',{headers:{'user-agent':'agi-future-guide-verify/1.0'},signal:AbortSignal.timeout(20000)});assert.equal(r.status,200,route);return r;};
for(const prefix of ['','/zh']){
 for(const route of ['/future-guide','/future-guide/method',...claims.map(c=>'/future-guide/'+c.id)]){const s=await (await get(prefix+route)).text();assert.ok(s.includes('agi-future-guide-20261003'),prefix+route);assert.ok(s.includes('href="'+base+prefix+route+'"'),prefix+route+' canonical');assert.ok(s.includes('/analytics-assets/consent.mjs'),prefix+route+' consent');}
 const home=await (await get(prefix?'/cn':'/')).text();assert.ok(home.includes('agi-future-entry-20261003'));assert.ok(home.includes('agi-countdown-20261002'));assert.ok(home.includes('agi-vote-20261002'));
}
for(const f of ['foresight-assets/catalog.mjs','foresight-assets/core.mjs','foresight-assets/app.mjs','foresight-assets/style.css','foresight-assets/share-en.png','foresight-assets/share-zh.png']){const r=await get('/'+f);assert.equal(hash(Buffer.from(await r.arrayBuffer())),hash(fs.readFileSync(new URL(f,root))),f);}
const catalog=await (await get('/member-assets/products.json')).json();assert.ok(catalog.some(p=>p.id==='future-guide'&&p.urls?.en===base+'/future-guide'&&p.urls?.zh===base+'/zh/future-guide'));
const sitemap=await (await get('/sitemap.xml')).text();assert.ok(sitemap.includes('<loc>'+base+'/zh/future-guide</loc>'));
const md=await (await get('/zh/future-guide.md')).text();assert.match(md,/未来导航|下一步/);
console.log('Live future guide: 12 bilingual routes, home entry/countdown/poll, exact assets, member catalog, sitemap and Markdown verified. No write requests or payments.');
