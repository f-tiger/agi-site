import assert from 'node:assert/strict';
const origin='https://baipiaoji.com';
const get=async path=>{const r=await fetch(origin+path,{headers:{'User-Agent':'bpj-ci-home-verify'},signal:AbortSignal.timeout(30000)});assert.equal(r.status,200,path);return r;};
const reach=await (await get('/api/reach?days=28')).json(),home=reach.homepage_signals;
assert(home?.ok,'homepage detail available');assert.equal(home.window.date_basis,'UTC');
assert.equal(home.daily.reduce((n,r)=>n+r.clicks,0),home.clicks);
assert.equal(home.entries.reduce((n,r)=>n+r.n,0),home.clicks);
assert.equal(home.daily_entries.reduce((n,r)=>n+r.n,0),home.clicks);
assert.equal(home.daily.at(-1).complete,false);
assert(home.entries.every(r=>!('path' in r)&&!('country' in r)&&!('ref' in r)));
for(const prefix of ['','/en']){const html=await(await get(prefix+'/?__ci=1')).text();assert(html.includes('data-home-block="hero"'));assert(html.includes("sec.classList.contains('bpj-site-header')"));assert(html.includes('!navigator.webdriver'));}
console.log('PASS live homepage labels, daily/bilingual aggregate sums and privacy shape; read-only check, no production click events.');
