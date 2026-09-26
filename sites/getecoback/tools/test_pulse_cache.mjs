import test from 'node:test';
import assert from 'node:assert/strict';
import {createPulseCache} from '../src/pulse-cache.mjs';
function fixture() {
  let time = Date.parse('2026-09-26T01:00:00Z'), calls = 0;
  const stored = new Map();
  const cache = {match: async key => stored.get(key.url)?.clone(), put: async (key, value) => {stored.set(key.url, value.clone());}};
  const handler = createPulseCache({getCache: () => cache, now: () => time});
  const compute = async () => {calls++;return Response.json({ok:true,generated:new Date(time).toISOString(),money:{affiliate_click_28d:2}}, {headers:{'cache-control':'public, max-age=3600'}});};
  return {handler, compute, stored, cache, calls:()=>calls, advance:ms=>{time+=ms;}};
}
const request=(path='/api/pulse',options={})=>new Request('https://getecoback.com'+path,options);
test('repeated and query-variant reads reuse one aggregate; timestamp and age stay honest', async()=>{
  const f=fixture(), first=await f.handler(request(),f.compute), original=await first.json();
  f.advance(60000);
  const second=await f.handler(request('/api/pulse?random=2'),f.compute);
  assert.equal(f.calls(),1);assert.equal(second.headers.get('x-eco-pulse-cache'),'hit');
  assert.equal(second.headers.get('cache-control'),'public, max-age=3540');assert.deepEqual(await second.json(),original);
  f.advance(3600000);await f.handler(request(),f.compute);assert.equal(f.calls(),2);
});
test('concurrent requests compute once',async()=>{
  const f=fixture();let release;const gate=new Promise(resolve=>{release=resolve;});
  const compute=async()=>{await gate;return f.compute();};
  const results=Array.from({length:10},()=>f.handler(request(),compute));release();
  const responses=await Promise.all(results);assert.equal(f.calls(),1);
  for(const response of responses)assert.equal((await response.json()).ok,true);
});
test('private endpoints, writes, credentials and alternate hosts are never cached',async()=>{
  const f=fixture();
  const inputs=[request('/api/member'),request('/api/member-watch',{method:'POST'}),request('/api/ev',{method:'POST',body:'{}'}),request('/api/geo'),request('/api/pulse',{method:'HEAD'}),request('/api/pulse',{headers:{authorization:'Bearer test'}}),request('/api/pulse',{headers:{cookie:'session=test'}}),new Request('https://www.getecoback.com/api/pulse')];
  for(const req of inputs){await f.handler(req,f.compute);await f.handler(req,f.compute);}
  assert.equal(f.calls(),inputs.length*2);assert.equal(f.stored.size,0);
});
test('errors, incomplete aggregates, private responses and invalid JSON are not stored',async()=>{
  const f=fixture();
  const responses=[Response.json({ok:false},{status:500}),Response.json({ok:false}),Response.json({ok:true,generated:'2026-09-26T01:00:00Z',money:null}),new Response('not JSON'),Response.json({ok:true,generated:'2026-09-26T01:00:00Z',money:{}},{headers:{'set-cookie':'session=test'}}),Response.json({ok:true,generated:'2026-09-26T01:00:00Z',money:{}},{headers:{'cache-control':'private'}})];
  for(const response of responses){const got=await f.handler(request(),()=>response.clone());assert.equal(got.status,response.status);}
  assert.equal(f.stored.size,0);
});
test('cache outages fall through and failed computation can recover',async()=>{
  const f=fixture();f.cache.match=async()=>{throw Error('unavailable');};f.cache.put=async()=>{throw Error('unavailable');};
  assert.equal((await f.handler(request(),f.compute)).status,200);
  await assert.rejects(f.handler(request(),async()=>{throw Error('database unavailable');}));
  assert.equal((await f.handler(request(),f.compute)).status,200);
});
