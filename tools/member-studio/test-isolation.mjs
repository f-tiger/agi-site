import assert from 'node:assert/strict';import {memberRoute} from './server.mjs';import {mockChain,setupSites,fixture,transfer,KEY,TX} from './test-fixtures.mjs';import {sites,products} from '../revenue-studio/catalog.mjs';import {memberByToken} from '../../sites/baipiaoji/lib/membership.js';import {memberSecret} from './ops.mjs';
const reset=mockChain(),all=await setupSites();
const nonce='1'.repeat(32),space='2'.repeat(32);let tests=0;
async function api(site,body,key=KEY,endpoint='member',origin=sites[site].origin){const request=new Request(sites[site].origin+'/api/'+endpoint,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+key,Origin:origin},body:JSON.stringify(body)});const r=await memberRoute(request,all[site].raw,site);return {status:r.status,data:await r.json()};}
try{
 const amounts=[];const orders={};
 for(const site of Object.keys(all)){const publicResponse=await memberRoute(new Request(sites[site].origin+'/api/member'),all[site].raw,site);const cfg=await publicResponse.json();assert.equal(cfg.ready,true);assert.equal(cfg.site,site);const r=await api(site,{action:'checkout',nonce,accept_terms:true,key_saved:true});assert.equal(r.status,200);orders[site]=all[site].db.sql.prepare('SELECT * FROM wb_orders').get();amounts.push(orders[site].amount_units);}
 assert.equal(new Set(Object.values(orders).map(o=>o.id)).size,4);assert.deepEqual(amounts,[9000001,9010001,9020001,9030001]);console.log('PASS separate databases issue disjoint site amounts');tests++;
 fixture.receipt=transfer(orders.eco);assert.equal((await api('eco',{action:'check',id:orders.eco.id,tx:TX})).data.order.state,'paid');
 for(const site of ['bpj','agi','tds']){assert.equal((await api(site,{action:'status'})).data.active,false);const r=await api(site,{action:'check',id:orders[site].id,tx:TX});assert.equal(r.data.order.state,'pending');assert.equal(r.data.order.check,'payment_mismatch');}
 console.log('PASS Eco payment grants only Eco; identical token and tx cannot grant another site');tests++;
 const data={version:1,product:'billlens',values:{kwh:'4321'}};assert.equal((await api('eco',{action:'save',id:space,revision:0,name:'Private Eco record',data})).status,200);
 for(const site of ['bpj','agi','tds'])assert.equal((await api(site,{action:'read',id:space,revision:1})).status,403);
 const wrong=await api('eco',{action:'save',id:'3'.repeat(32),revision:0,name:'Foreign tool',data:{...data,product:'launchdesk'}});assert.equal(wrong.data.code,'wrong_site');assert.equal(wrong.status,400);console.log('PASS cross-site records and tools rejected');tests++;
 const before=(await memberByToken(all.eco.db,KEY)).ends_at;assert.equal((await api('eco',{action:'check',id:orders.eco.id,tx:TX})).data.order.state,'paid');assert.equal((await memberByToken(all.eco.db,KEY)).ends_at,before);console.log('PASS receipt replay cannot extend membership');tests++;
 for(const site of Object.keys(all)){const other=site==='eco'?'agi':'eco';assert.equal((await api(site,{},all[other].secret,'member-watch')).status,401);assert.equal((await api(site,{action:'stats'},all[other].secret,'member-admin')).status,401);assert.equal((await api(site,{action:'status'},KEY,'member',sites[other].origin)).status,403);}
 console.log('PASS site operator credentials and origins are isolated');tests++;
 const env={ADS_WATCH_SECRET:'x'.repeat(64)};assert.equal(new Set(Object.keys(all).map(site=>memberSecret(site,env))).size,4);console.log('PASS derived production watcher keys differ by site');tests++;
 for(const site of Object.keys(all)){const db=all[site].db;const own=products.filter(p=>p.site===site);assert.ok(own.length);assert.throws(()=>db.sql.prepare('UPDATE wb_orders SET amount_units=?').run(orders[site==='eco'?'agi':'eco'].amount_units));}
 console.log('PASS SQL range constraints enforce site payment partitions');tests++;
 const active=await api('eco',{action:'status'});const disabled={...all.eco.raw,MEMBERS_ENABLED:'false'};const c=await (await memberRoute(new Request(sites.eco.origin+'/api/member'),disabled,'eco')).json();assert.equal(c.ready,false);assert.equal(active.data.active,true);console.log('PASS closing sales does not revoke paid access');tests++;
 console.log(tests+' independent membership isolation tests passed; mocked chain, no real funds.');
}finally{reset();for(const v of Object.values(all))v.db.sql.close();}
