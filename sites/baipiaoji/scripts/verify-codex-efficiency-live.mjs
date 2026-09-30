import assert from 'node:assert/strict';
const base='https://baipiaoji.com';
async function get(path){const r=await fetch(base+path+'?__probe=1',{headers:{'User-Agent':'bpj-ci-selfcheck codex-efficiency'},signal:AbortSignal.timeout(25000),redirect:'error'});assert.equal(r.status,200,path);return r;}
for(const prefix of ['', '/en']){const page=await(await get(prefix+'/studio/codex-efficiency')).text();assert.ok(page.includes('19 USDT'));assert.ok(page.includes('ce-connect'));assert.ok(page.includes('codex-efficiency.mjs'));assert.ok(page.includes('bpj-codex-efficiency-v1.0.0'));}
const response=await get('/api/codex-efficiency'),text=await response.text(),config=JSON.parse(text);
assert.equal(config.ok,true);assert.equal(config.plan.product,'codex-efficiency-pro');assert.equal(config.plan.price_usdt,19);assert.equal(config.plan.evaluations,100);assert.equal(config.plan.projects,3);assert.equal(config.plan.auto_renew,false);assert.equal(typeof config.ready,'boolean');assert.ok(!/0x[a-f0-9]{40}|token_hash|ADS_WATCH_SECRET/i.test(text));
console.log('PASS live bilingual product pages and public plan; purchase readiness='+config.ready+'. Read-only checks; no purchase, user creation, transfer or evaluation.');
