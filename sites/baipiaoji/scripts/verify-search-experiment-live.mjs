import assert from 'node:assert/strict';
import {searchExperiment as plan} from './search-experiment.mjs';
const base='https://baipiaoji.com';
async function get(path) {
  const url=new URL(path,base);url.searchParams.set('__probe','1');
  const r=await fetch(url,{headers:{'User-Agent':'bpj-ci-selftest search-experiment'},signal:AbortSignal.timeout(25000)});
  assert.equal(r.status,200,path+' status');return r;
}
const home=await (await get('/en/')).text();
assert.ok(home.includes('data-home-block="limit-check"'),'English limit navigation is deployed');
for(const p of plan.pages) {
  const html=await (await get(p.path)).text();
  assert.equal(html.match(/<title>(.*?)<\/title>/s)?.[1],p.baseline.metadata.title,p.path+' title');
  const expected=p.cohort==='treatment'&&plan.status==='running'?p.description:p.baseline.metadata.description;
  assert.equal(html.match(/<meta name="description" content="([^"]*)"/)?.[1],expected,p.path+' assigned description');
  assert.ok(html.includes(`rel="canonical" href="${base}${p.path}"`));
}
const data=await (await get('/api/reach')).json();
assert.equal(data.ok,true);const s=data.conversion_stages;
assert.equal(s?.ok,true,'All conversion stages must be readable');
assert.equal(s.window.date_basis,'UTC');
assert.equal((Date.parse(s.window.end_exclusive)-Date.parse(s.window.start))/86400000,s.window.complete_days);
assert.ok(s.window.end_exclusive<=new Date().toISOString().slice(0,10));
for(const n of [...Object.values(s.events),...Object.values(s.accounts)])assert.ok(Number.isInteger(n)&&n>=0);
assert.ok(s.accounts.new_accounts_currently_email_verified<=s.accounts.created);
console.log('PASS live: English homepage, two snippets, two controls, canonical URLs and complete-day conversion stages.');
console.log(JSON.stringify(s));
