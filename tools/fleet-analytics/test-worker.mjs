import test from 'node:test';import assert from 'node:assert/strict';
import worker from '../../sites/agiscorecard/tools/analytics-worker/index.js';
test('internal analytics frame produces no extra D1 pageview or legacy script injection',async()=>{
 let writes=0;
 const env={ASSETS:{fetch:async()=>new Response('<html><body>frame</body></html>',{headers:{'content-type':'text/html'}})},EVENTS:{prepare:()=>{writes++;throw Error('unexpected D1 write');}}};
 const r=await worker.fetch(new Request('https://agiscorecard.com/analytics-assets/frame.html?v=test'),env,{waitUntil(){}});
 assert.equal(await r.text(),'<html><body>frame</body></html>');assert.equal(writes,0);
});

for (const site of ['goldrush','gridlings','buysomething','gamesledger','after35','learn','fanzha','firstjob','codeword','powerbill','getecoback/src','localebatch/src']) {
 test(site+': analytics frame bypasses first-party writes and unrelated HTML injection',async()=>{
  const {default:worker}=await import('../../sites/'+site+'/worker.'+(site==='localebatch/src'?'mjs':'js'));
  let writes=0;
  const db={prepare(){writes++;throw Error('Unexpected analytics-asset write');}};
  const env={ASSETS:{fetch:async()=>new Response('<html><body>empty</body></html>',{headers:{'content-type':'text/html'}})},EVENTS:db,EV:db,DB:db};
  const response=await worker.fetch(new Request('https://agiscorecard.com/analytics-assets/frame.html'),env,{waitUntil(){}});
  assert.equal(await response.text(),'<html><body>empty</body></html>');assert.equal(writes,0);
  assert.match(response.headers.get('cache-control'),/no-transform/);
 });
}

for(const site of ['baipiaoji','thedollscout'])test(site+': Pages clean frame alias receives isolation headers without crawler writes',async()=>{
 const {onRequest}=await import('../../sites/'+site+'/functions/_middleware.js');
 for(const path of ['frame','frame.html']){
  const response=await onRequest({request:new Request('https://'+site+'.com/analytics-assets/'+path),next:async()=>new Response('frame'),env:{},waitUntil(){throw Error('Unexpected analytics asset count');}});
  assert.equal(await response.text(),'frame');assert.match(response.headers.get('cache-control'),/no-transform/);assert.match(response.headers.get('content-security-policy'),/frame-ancestors 'self'/);
 }
});
