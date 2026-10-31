import assert from 'node:assert/strict';
import {memberRoute} from '../../../../tools/member-studio/server.mjs';
import {mockChain,setupSites,fixture,transfer,KEY,TX} from '../../../../tools/member-studio/test-fixtures.mjs';

const PRODUCT='ai-futures';
const reset=mockChain(),all=await setupSites(),site=all.agi,origin='https://agiscorecard.com';
const id='7'.repeat(32),guideId='8'.repeat(32);
const call=async(body,key=KEY)=>{
 const r=await memberRoute(new Request(origin+'/api/member',{method:'POST',headers:{origin,'content-type':'application/json',authorization:'Bearer '+key},body:JSON.stringify(body)}),site.raw,'agi');
 return {status:r.status,j:await r.json()};
};
try{
 const data={version:1,product:PRODUCT,values:{modelVersion:'1.0.0',params:{compute:55,research:50,energy:50,governance:50,horizon:2035,seed:20261006},snapshotId:'test',notes:''}};
 const draft={action:'save',id,revision:0,name:'Fictional AI futures scenario',data};
 assert.equal((await call(draft)).status,401,'unknown identities cannot save');
 assert.equal((await call({action:'checkout',nonce:'7'.repeat(32),accept_terms:true,key_saved:true,source:PRODUCT})).status,200);
 const unpaid=await call(draft);
 assert.equal(unpaid.status,403,'checkout intent grants no paid storage');
 assert.equal(unpaid.j.code,'membership_required');
 const row=site.db.sql.prepare('SELECT * FROM wb_orders').get();
 assert.equal(site.db.sql.prepare('SELECT product FROM wb_order_sources WHERE order_id=?').get(row.id).product,PRODUCT,'the order retains its actual product source');
 fixture.receipt=transfer(row);
 assert.equal((await call({action:'check',id:row.id,tx:TX})).j.order.state,'paid');
 assert.equal((await call(draft)).status,200);
 const read=await call({action:'read',id,revision:1});
 assert.equal(read.status,200);
 assert.deepEqual(read.j.data,data,'the scenario, model version and snapshot identity round-trip unchanged');
 assert.equal((await call(draft)).status,409,'a stale revision cannot overwrite a scenario');
 assert.equal((await call({action:'read',id,revision:1},'a'.repeat(64))).status,401,'an unrelated identity cannot read a scenario');

 const guide={version:1,product:'future-guide',values:{goal:'understand',saved:[],notes:{}}};
 assert.equal((await call({action:'save',id:guideId,revision:0,name:'Fictional existing Future Guide',data:guide})).status,200);
 const intoGuide=await call({...draft,id:guideId,revision:1});
 assert.equal(intoGuide.status,409,'a simulation cannot replace an existing Future Guide workspace');
 assert.equal(intoGuide.j.code,'revision_conflict');
 assert.deepEqual((await call({action:'read',id:guideId,revision:1})).j.data,guide);
 assert.equal((await call({...draft,revision:1,data:guide})).status,409,'a Future Guide cannot replace a simulation workspace');
 assert.deepEqual((await call({action:'read',id,revision:1})).j.data,data);

 const updated={...data,values:{...data.values,notes:'Fictional revised scenario note'}};
 assert.equal((await call({...draft,revision:1,data:updated})).status,200);
 assert.deepEqual((await call({action:'read',id,revision:2})).j.data,updated);
 assert.deepEqual((await call({action:'read',id,revision:1})).j.data,data,'saving a new revision preserves the original scenario');
 assert.equal((await call({...draft,id:'9'.repeat(32),data:{...data,product:'bpj-video-variants'}})).j.code,'wrong_site','a product from another site is not accepted');

 const otherKey='a'.repeat(64),otherTx='0x'+'e'.repeat(64);
 const otherCheckout=await call({action:'checkout',nonce:'a'.repeat(32),accept_terms:true,key_saved:true,source:PRODUCT},otherKey);
 assert.equal(otherCheckout.status,200);
 const otherOrder=site.db.sql.prepare('SELECT * FROM wb_orders WHERE id<>?').get(row.id);
 fixture.receipt=transfer(otherOrder,otherTx);
 assert.equal((await call({action:'check',id:otherOrder.id,tx:otherTx},otherKey)).j.order.state,'paid');
 assert.equal((await call({action:'read',id,revision:2},otherKey)).status,404,'even another paid member cannot read this workspace');
 assert.equal((await call({...draft,revision:2},otherKey)).status,409,'another paid member cannot claim this workspace revision');
 assert.equal((await call(draft,otherKey)).status,200,'the same workspace ID can exist independently for another member');
 assert.deepEqual((await call({action:'read',id,revision:1},otherKey)).j.data,data);
 assert.deepEqual((await call({action:'read',id,revision:2})).j.data,updated,'other-member writes leave the owner record unchanged');
 console.log('AI futures: unpaid save denial, product attribution, mock payment, record/history preservation, stale revision and identity rejection, and Future Guide/product isolation passed. No real payment.');
}finally{reset();for(const s of Object.values(all))s.db.sql.close();}
