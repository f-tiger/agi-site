// Read the deployed instrument and submit only a marked QA event (never counted).
import assert from 'node:assert/strict';
import {CAMPAIGNS,MEASUREMENT_VERSION} from '../lib/growth-campaigns.js';
const origin='https://baipiaoji.com';
const get=async path=>{
  const r=await fetch(origin+path,{headers:{'User-Agent':'bpj-growth-probe'},signal:AbortSignal.timeout(15000)});
  assert.equal(r.status,200,path);return r;
};
const report=await (await get('/api/growth?days=14')).json();
assert.equal(report.ok,true);assert.equal(report.measurement_version,MEASUREMENT_VERSION);
assert.equal(report.window.complete_days,14);assert.equal(report.window.date_basis,'UTC');
assert.equal((Date.parse(report.window.end_exclusive)-Date.parse(report.window.start))/86400000,14);
assert.deepEqual(report.campaigns.map(c=>c.id).sort(),CAMPAIGNS.map(c=>c.id).sort());
for(const campaign of CAMPAIGNS){
  for(const page of campaign.paths){
    const html=await (await get(page+'?__probe=1')).text();
    assert.ok(html.includes('data-bpj-growth="'+campaign.id+'"'),page+' includes measurement');
  }
}
const asset=await (await get('/studio-assets/growth-campaign.mjs')).text();
assert.ok(asset.includes('startGrowthTracker')&&asset.includes('official_click'));
const r=await fetch(origin+'/api/growth',{method:'POST',headers:{Origin:origin,Referer:origin+CAMPAIGNS[0].paths[0]+'?qa=1','User-Agent':'bpj-growth-probe','Content-Type':'application/json'},body:JSON.stringify({qa:true}),signal:AbortSignal.timeout(15000)});
assert.equal(r.status,200);assert.equal((await r.json()).ignored,true);
assert.ok(!JSON.stringify(report.campaigns).includes('"sid"'),'public aggregates contain no identifiers');
console.log('PASS live growth version, scoped HTML and asset, UTC aggregate contract and ignored QA event. No marketing visit was created.');
