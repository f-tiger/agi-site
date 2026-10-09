import assert from 'node:assert/strict';
import {memberRoute} from '../../../../tools/member-studio/server.mjs';
import {mockChain,setupSites,fixture,transfer,KEY,TX} from '../../../../tools/member-studio/test-fixtures.mjs';
import {blank,normalize,emptyNote,PRODUCT} from '../../foresight-assets/core.mjs';
import {COMMERCIAL_CLAIM,COMMERCIAL_VERSION} from '../../foresight-assets/commercial.mjs';
const reset=mockChain(),all=await setupSites(),site=all.agi,origin='https://agiscorecard.com',id='8'.repeat(32);
const call=async(body,key=KEY)=>{const r=await memberRoute(new Request(origin+'/api/member',{method:'POST',headers:{origin,'content-type':'application/json',authorization:'Bearer '+key},body:JSON.stringify(body)}),site.raw,'agi');return {status:r.status,j:await r.json()};};
try{
 const values=blank();values.saved=['software-judgment'];values.notes['software-judgment']={...emptyNote(),action:'Fictional test plan'};
 values.saved.push(COMMERCIAL_CLAIM);values.notes[COMMERCIAL_CLAIM]={...emptyNote(),action:'Fictional bounded check',review:'2026-10-12',commercial:{version:COMMERCIAL_VERSION,fit:{recurring:true,records:true,owner:true}}};
 const data=normalize({version:1,product:PRODUCT,values}),draft={action:'save',id,revision:0,name:'Fictional future-guide test',data};
 assert.equal((await call(draft)).status,401);
 assert.equal((await call({action:'checkout',nonce:'8'.repeat(32),accept_terms:true,key_saved:true,source:PRODUCT})).status,200);
 assert.equal((await call(draft)).status,403);const row=site.db.sql.prepare('SELECT * FROM wb_orders').get();assert.equal(site.db.sql.prepare('SELECT product FROM wb_order_sources').get().product,PRODUCT);
 fixture.receipt=transfer(row);assert.equal((await call({action:'check',id:row.id,tx:TX})).j.order.state,'paid');assert.equal((await call(draft)).status,200);
 const read=await call({action:'read',id,revision:1});assert.deepEqual(normalize(read.j.data),data);
 assert.equal((await call(draft)).status,409);assert.equal((await call({action:'read',id,revision:1},'a'.repeat(64))).status,401);
 console.log('Future guide: unpaid save denied, source attributed, mock payment unlock, save/read, stale revision and other-user denial passed. No real payment.');
}finally{reset();for(const s of Object.values(all))s.db.sql.close();}
