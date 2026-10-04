import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';
import {searchExperiment as plan} from './search-experiment.mjs';
const base='https://baipiaoji.com';
async function get(path) {
  const url=new URL(path,base);url.searchParams.set('__probe','1');
  const r=await fetch(url,{headers:{'User-Agent':'bpj-ci-selftest search-experiment'},signal:AbortSignal.timeout(25000)});
  assert.equal(r.status,200,path+' status');return r;
}
async function verify() {
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
assert.ok(Number.isInteger(s.accounts.total_non_test));
assert.ok(s.accounts.total_non_test>=s.accounts.created);
assert.ok(s.accounts.total_currently_email_verified<=s.accounts.total_non_test);
assert.ok(Number.isInteger(s.events.account_tool_entries));
console.log('PASS lifetime non-test account totals and signup-entry metric shape.');
}

// Pages deployment completion can precede custom-domain propagation. Retry the
// same assertions briefly; a persistent mismatch must still fail the release.
for (let attempt=1;attempt<=5;attempt++) {
  try { await verify(); break; }
  catch (error) {
    if (attempt===5) throw error;
    console.warn(`Live check ${attempt}/5: ${error.message}; retrying in 10s.`);
    await delay(10000);
  }
}
