import test from 'node:test';
import assert from 'node:assert/strict';
import {validateDraft,cardText,readDraft} from '../../collector-assets/wish-card-ui.mjs';
import {wishCopy} from './wish-card.mjs';
import {businessEvent} from '../../../../tools/fleet-analytics/business.mjs';
const draft={item:'SMISKI Museum / Dali',region:'Germany',mode:'buy',budget:'20.50',currency:'EUR',condition:'Opened, with box',offer:'',expiry:'2099-01-01'};
test('invalid requests do not become share cards',()=>{
 for(const patch of [{item:''},{budget:'NaN'},{budget:'-1'},{budget:'1e3'},{budget:'1.234'},{currency:'XYZ'},{expiry:'2026-02-30'},{expiry:'2000-01-01'},{mode:'swap',offer:''},{mode:'either',offer:''},{item:'x'.repeat(121)}])assert.throws(()=>validateDraft({...draft,...patch},'2026-10-30'));
 assert.equal(validateDraft({...draft,budget:'0'}).budget,'0');
 assert.equal(validateDraft({...draft,mode:'swap',offer:'Only my spare Carrot'}).mode,'swap');
});
test('cards do not imply matching or completed transactions; restored expiry remains expired',()=>{
 const text=cardText(validateDraft(draft),wishCopy.en,'https://thedollscout.com/collecting/wish-card','2026-10-30');assert.match(text,/20.50 EUR/);assert.match(text,/Reply to the original post/);assert.match(text,/no seller or transaction is verified/);
 const old=readDraft(JSON.stringify({schema:1,draft:{...draft,expiry:'2020-01-01'},status:'closed',created:'2020-01-01'}));assert.equal(old.status,'closed');assert.equal(old.draft.expiry,'2020-01-01');assert.throws(()=>readDraft('{bad'));
});
test('wish events are fixed actions at the wish route; private fields are not propagated',()=>{
 for(const name of ['collector_wish_generate','collector_wish_export','collector_wish_response_reported','collector_wish_fulfilled_reported']){
  assert.deepEqual(businessEvent('thedollscout.com','/collecting/wish-card',{name}),{name,tool_id:'wish-card'});
  assert.equal(businessEvent('thedollscout.com','/collecting/wish-card',{name,item:'private'}),null);
  assert.equal(businessEvent('thedollscout.com','/series',{name}),null);
 }
});
import {onRequestPost as beacon} from '../../functions/api/ev.js';
import {aggregateCollector,collectorWindow} from '../../functions/api/collector-growth.js';
test('D1 stores only eligible route-bound events, never form contents; reports self-reports separately',async()=>{
 const rows=[];const HITS={prepare(){return{bind(...args){return{run:async()=>{rows.push(args);}};}};}};
 for(const prefix of ['','/de','/zh'])for(const event of ['collector_wish_generate','collector_wish_export','collector_wish_response_reported','collector_wish_fulfilled_reported']){
  const run=async(body,headers={})=>{const pending=[];await beacon({request:new Request('https://thedollscout.com/api/ev',{method:'POST',headers:{'user-agent':'Mozilla/5.0',origin:'https://thedollscout.com',...headers},body:JSON.stringify(body)}),env:{HITS},waitUntil:p=>pending.push(p)});await Promise.all(pending);};
  const body={p:prefix+'/collecting/wish-card',e:event,r:''};const before=rows.length;await run(body);assert.equal(rows.length,before+1);
  for(const bad of [{...body,item:'private'}, {...body,p:'/series'}, {...body,p:body.p+'?secret=private'}])await run(bad);
  await run(body,{'x-probe':'test'});await run(body,{dnt:'1'});assert.equal(rows.length,before+1);
 }
 assert.doesNotMatch(JSON.stringify(rows),/private/);
 assert.equal(aggregateCollector([{d:'2026-10-31',ev:'collector_wish_fulfilled_reported',path:'/collecting/wish-card',n:1}]).browser[0].event,'collector_wish_fulfilled_reported');
 assert.equal(collectorWindow().event_releases.collector_wish_generate,'2026-10-30');
});
