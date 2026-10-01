import test from 'node:test';import assert from 'node:assert/strict';
import worker from '../../sites/agiscorecard/tools/analytics-worker/index.js';
test('internal analytics frame produces no extra D1 pageview or legacy script injection',async()=>{
 let writes=0;
 const env={ASSETS:{fetch:async()=>new Response('<html><body>frame</body></html>',{headers:{'content-type':'text/html'}})},EVENTS:{prepare:()=>{writes++;throw Error('unexpected D1 write');}}};
 const r=await worker.fetch(new Request('https://agiscorecard.com/analytics-assets/frame.html?v=test'),env,{waitUntil(){}});
 assert.equal(await r.text(),'<html><body>frame</body></html>');assert.equal(writes,0);
});
