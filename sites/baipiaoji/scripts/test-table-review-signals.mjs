import test from 'node:test';
import assert from 'node:assert/strict';
import {onRequestPost} from '../functions/api/hit.js';
import {TABLE_REVIEW_ACTIONS,parseTableReviewEvent} from '../lib/table-review-signals.mjs';
import {stageCounts} from '../lib/conversion-stages.js';
import {businessEvent} from '../../../tools/fleet-analytics/business.mjs';

test('only fixed listing actions are admitted in both languages; no extra data or purchase claims', () => {
  for (const action of TABLE_REVIEW_ACTIONS) for (const mode of ['demo','own']) {
    assert.deepEqual(parseTableReviewEvent(`/table-review/${action}/${mode}`),{action,mode});
    for (const route of ['/studio/table-review','/en/studio/table-review']) {
      const name=`table_review_${action}_${mode}`;
      assert.deepEqual(businessEvent('baipiaoji.com',route,{name}),{name,tool_id:'table-review',repeat:true});
      assert.equal(businessEvent('baipiaoji.com',route,{name,email:'private@example.test'}),null);
    }
  }
  for (const path of ['/table-review/paid/own','/table-review/export/own/SKU','/table-review/review/customer']) assert.equal(parseTableReviewEvent(path),null);
  assert.equal(businessEvent('baipiaoji.com','/account',{name:'table_review_export_own'}),null);
  assert.equal(businessEvent('getecoback.com','/studio/table-review',{name:'table_review_export_own'}),null);
});
test('first-party signal removes referrer context and rejects automation, QA and wrong origins',async()=>{
  const rows=[];const env={HITS:{prepare(){return{bind(...args){return{run:async()=>rows.push(args)}}}}}};
  const send=(ref,headers={},action='/table-review/export/own')=>onRequestPost({env,request:new Request('https://baipiaoji.com/api/hit',{method:'POST',headers:{referer:ref,'user-agent':'Mozilla/5.0',...headers},body:JSON.stringify({e:'table_review',l:'en',p:action,r:'https://private.example.test/product'})})});
  await send('https://baipiaoji.com/en/studio/table-review');
  assert.equal(rows.length,1);assert.equal(rows[0][4],'');assert.equal(rows[0][1],'/table-review/export/own');
  for(const [ref,headers]of[
    ['https://baipiaoji.com/studio/table-review?__ci=1',{}],['https://baipiaoji.com/studio/table-review?qa=1',{}],['https://baipiaoji.com/studio/table-review?__qa=1',{}],
    ['https://baipiaoji.com/account',{}],['https://attacker.test/studio/table-review',{}],
    ['https://baipiaoji.com/studio/table-review',{dnt:'1'}],['https://baipiaoji.com/studio/table-review',{'sec-gpc':'1'}],
    ['https://baipiaoji.com/studio/table-review',{'user-agent':'Playwright'}]
  ])await send(ref,headers);
  await send('https://baipiaoji.com/studio/table-review',{},'/table-review/export/own/customer-private');
  assert.equal(rows.length,1);
});
test('listing reports keep demo, own work and other tools separate',()=>{
  const counts=stageCounts([{ev:'table_review',path:'/table-review/export/demo',n:4},{ev:'table_review',path:'/table-review/export/own',n:2},{ev:'table_review',path:'/table-review/report/own',n:1},{ev:'table_review',path:'/table-review/paid/own',n:999}]);
  assert.equal(counts.table_review_actions.demo.export,4);assert.equal(counts.table_review_actions.own.export,2);
  assert.equal(counts.table_review_actions.own.report,1);assert.equal(counts.tool_results_own,0);assert.equal(counts.other_calc_events,0);
});
