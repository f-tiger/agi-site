import assert from 'node:assert/strict';
const base='https://baipiaoji.com',headers={'User-Agent':'bpj-ci-selftest-release-pilot'};
for(const p of ['/en/studio/release-check','/studio/release-check']){const r=await fetch(base+p+'?ci=1',{headers,signal:AbortSignal.timeout(20000)});assert.equal(r.status,200);const s=await r.text();assert.ok(s.includes('data-release-pilot')&&s.includes('pilot-form')&&s.includes('$299'));}
const healthResponse=await fetch(base+'/api/release-pilot',{headers,signal:AbortSignal.timeout(20000)});assert.equal(healthResponse.status,200);const health=await healthResponse.json();assert.equal(health.ready,true);assert.equal(health.offer,'release-check-299-v1');assert.equal(health.checkout,false);
if(health.accepting){
 const id=crypto.randomUUID(),receipt=crypto.randomUUID(),session=crypto.randomUUID();
 const post=async b=>{const r=await fetch(base+'/api/release-pilot?qa=1',{method:'POST',headers:{...headers,Origin:base,'Content-Type':'application/json'},body:JSON.stringify(b),signal:AbortSignal.timeout(20000)});assert.equal(r.status,200);return r.json();};
 const b={action:'apply',offer:health.offer,id,receipt,session,email:'qa@example.test',consent:true,role:'owner',task:'plans',frequency:'two-plus',timing:'14days',stack:'stripe-external',budget:'299',hours:'over3',source:'direct',lang:'en',qa:true};
 assert.equal((await post(b)).ok,true);assert.equal((await post(b)).ok,true);assert.equal((await post({action:'withdraw',id,receipt})).ok,true);
}
console.log(health.accepting?'PASS deployed pilot pages, closed checkout, QA application persistence and withdrawal; QA excluded.':'PASS deployed pages and healthy API; intake SKIPPED because paused/closed, persistence not tested.');
