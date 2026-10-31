import test from 'node:test';
import assert from 'node:assert/strict';
import {onRequestPost} from '../functions/api/hit.js';
import {LISTING_ACTIONS,parseListingEvent} from '../lib/listing-signals.mjs';
import {stageCounts} from '../lib/conversion-stages.js';
import {businessEvent} from '../../../tools/fleet-analytics/business.mjs';

test('only fixed listing actions are admitted in both languages; no extra data or purchase claims', () => {
  for (const action of LISTING_ACTIONS) for (const mode of ['demo','own']) {
    assert.deepEqual(parseListingEvent(`/listing/${action}/${mode}`),{action,mode});
    for (const route of ['/studio/listing-pack','/en/studio/listing-pack']) {
      const name=`listing_${action}_${mode}`;
      assert.deepEqual(businessEvent('baipiaoji.com',route,{name}),{name,tool_id:'listing-pack',repeat:true});
      assert.equal(businessEvent('baipiaoji.com',route,{name,email:'private@example.test'}),null);
    }
  }
  for (const path of ['/listing/paid/own','/listing/export/own/SKU','/listing/review/customer']) assert.equal(parseListingEvent(path),null);
  assert.equal(businessEvent('baipiaoji.com','/account',{name:'listing_export_own'}),null);
  assert.equal(businessEvent('getecoback.com','/studio/listing-pack',{name:'listing_export_own'}),null);
});
test('first-party signal removes referrer context and rejects automation, QA and wrong origins',async()=>{
  const rows=[];const env={HITS:{prepare(){return{bind(...args){return{run:async()=>rows.push(args)}}}}}};
  const send=(ref,headers={},action='/listing/export/own')=>onRequestPost({env,request:new Request('https://baipiaoji.com/api/hit',{method:'POST',headers:{referer:ref,'user-agent':'Mozilla/5.0',...headers},body:JSON.stringify({e:'listing',l:'en',p:action,r:'https://private.example.test/product'})})});
  await send('https://baipiaoji.com/en/studio/listing-pack');
  assert.equal(rows.length,1);assert.equal(rows[0][4],'');assert.equal(rows[0][1],'/listing/export/own');
  for(const [ref,headers]of[
    ['https://baipiaoji.com/studio/listing-pack?__ci=1',{}],['https://baipiaoji.com/studio/listing-pack?qa=1',{}],['https://baipiaoji.com/studio/listing-pack?__qa=1',{}],
    ['https://baipiaoji.com/account',{}],['https://attacker.test/studio/listing-pack',{}],
    ['https://baipiaoji.com/studio/listing-pack',{dnt:'1'}],['https://baipiaoji.com/studio/listing-pack',{'sec-gpc':'1'}],
    ['https://baipiaoji.com/studio/listing-pack',{'user-agent':'Playwright'}]
  ])await send(ref,headers);
  await send('https://baipiaoji.com/studio/listing-pack',{},'/listing/export/own/customer-private');
  assert.equal(rows.length,1);
});
test('listing reports keep demo, own work and other tools separate',()=>{
  const counts=stageCounts([{ev:'listing',path:'/listing/export/demo',n:4},{ev:'listing',path:'/listing/export/own',n:2},{ev:'listing',path:'/listing/inquiry/own',n:1},{ev:'listing',path:'/listing/paid/own',n:999}]);
  assert.equal(counts.listing_actions.demo.export,4);assert.equal(counts.listing_actions.own.export,2);
  assert.equal(counts.listing_actions.own.inquiry,1);assert.equal(counts.tool_results_own,0);assert.equal(counts.other_calc_events,0);
});
