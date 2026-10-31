import assert from 'node:assert/strict';
import {externalProducts} from '../../../../tools/revenue-studio/catalog.mjs';
import {memberRoute} from '../../../../tools/member-studio/server.mjs';
import {mockChain,setupSites,fixture,transfer,KEY,TX} from '../../../../tools/member-studio/test-fixtures.mjs';

// Exercise the existing member handler and chain-verification path with an
// isolated SQLite database and synthetic receipts. Never contact a live chain.
const PRODUCT='tianya-validation',origin='https://agiscorecard.com',id='7'.repeat(32);
const otherKey='2'.repeat(64),otherTX='0x'+'c'.repeat(64),unknownKey='3'.repeat(64);
const reset=mockChain(),all=await setupSites(),site=all.agi;
const call=async(body,key=KEY)=>{
 const response=await memberRoute(new Request(origin+'/api/member',{
  method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Authorization:'Bearer '+key},
  body:JSON.stringify(body)
 }),site.raw,'agi');
 return {status:response.status,body:await response.json()};
};
const checkout=nonce=>({action:'checkout',nonce,accept_terms:true,key_saved:true,source:PRODUCT});

try{
 assert.deepEqual(externalProducts.find(product=>product.id===PRODUCT),{
  id:PRODUCT,name:'Tianya validation',site:'agi',
  urls:{en:origin+'/tianya',zh:origin+'/zh/tianya'}
 });
 // This fixture checks the generic storage contract. The tool's own tests own
 // normalization of its inputs; the backend stores only this explicit envelope.
 const data={version:1,product:PRODUCT,values:{notes:'Synthetic validation plan',evidenceIds:['fixture-evidence-1']}};
 const draft={action:'save',id,revision:0,name:'Synthetic Tianya validation',data};
 assert.equal((await call(draft)).status,401);

 const firstOrder=await call(checkout('7'.repeat(32)));
 assert.equal(firstOrder.status,200);
 const unpaidStatus=await call({action:'status'});
 assert.equal(unpaidStatus.body.exists,true);
 assert.equal(unpaidStatus.body.active,false);
 for(const body of [draft,{action:'list'},{action:'read',id,revision:1}]){
  const denied=await call(body);
  assert.equal(denied.status,403);
  assert.equal(denied.body.code,'membership_required');
 }
 const firstRow=site.db.sql.prepare('SELECT * FROM wb_orders WHERE id=?').get(firstOrder.body.order.id);
 assert.equal(site.db.sql.prepare('SELECT product FROM wb_order_sources WHERE order_id=?').get(firstRow.id).product,PRODUCT);
 fixture.receipt=transfer(firstRow);
 assert.equal((await call({action:'check',id:firstRow.id,tx:TX})).body.order.state,'paid');

 const saved=await call(draft);
 assert.equal(saved.status,200);
 assert.equal(saved.body.revision,1);
 assert.deepEqual((await call({action:'read',id,revision:1})).body.data,data);
 const revised={...data,values:{...data.values,notes:'Synthetic revised plan'}};
 const update=await call({...draft,revision:1,data:revised});
 assert.equal(update.status,200);
 assert.equal(update.body.revision,2);
 assert.deepEqual((await call({action:'read',id,revision:2})).body.data,revised);
 const stale=await call({...draft,revision:1});
 assert.equal(stale.status,409);
 assert.equal(stale.body.code,'revision_conflict');
 assert.equal((await call({action:'read',id,revision:2},unknownKey)).status,401);

 // A second paid identity must still be unable to read, edit or delete the
 // first identity's project. A missing or unpaid identity alone cannot prove this.
 const secondOrder=await call(checkout('6'.repeat(32)),otherKey);
 assert.equal(secondOrder.status,200);
 assert.equal((await call(draft,otherKey)).status,403);
 const secondRow=site.db.sql.prepare('SELECT * FROM wb_orders WHERE id=?').get(secondOrder.body.order.id);
 fixture.receipt=transfer(secondRow,otherTX);
 assert.equal((await call({action:'check',id:secondRow.id,tx:otherTX},otherKey)).body.order.state,'paid');
 assert.equal((await call({action:'read',id,revision:2},otherKey)).status,404);
 assert.deepEqual((await call({action:'history',id},otherKey)).body.versions,[]);
 assert.deepEqual((await call({action:'list'},otherKey)).body.spaces,[]);
 assert.equal((await call({...draft,revision:2},otherKey)).status,409);
 assert.equal((await call({action:'delete',id},otherKey)).status,200);
 assert.deepEqual((await call({action:'read',id,revision:2})).body.data,revised);
 const unrelatedOrder=await call({action:'check',id:firstRow.id,tx:TX},otherKey);
 assert.equal(unrelatedOrder.status,404);

 console.log('Tianya membership: unpaid access denied, source attributed, mocked payment unlock, save/read revisions, stale-version conflict and paid-user isolation passed. No real payment.');
}finally{
 reset();fixture.receipt=null;fixture.logs=[];fixture.failed=false;
 for(const entry of Object.values(all))entry.db.sql.close();
}
