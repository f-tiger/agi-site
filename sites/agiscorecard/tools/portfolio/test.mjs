import test from 'node:test';import assert from 'node:assert/strict';
import {PRODUCT,defaults,normalize,stress,dca,leverage} from '../../portfolio-assets/core.mjs';
import {mockChain,setupSites,fixture,transfer,KEY,TX} from '../../../../tools/member-studio/test-fixtures.mjs';
import {memberRoute} from '../../../../tools/member-studio/server.mjs';
test('stress models all sleeves and impossible recovery after total loss',()=>{const r=stress(10000,20,-50,-10);assert.equal(r.loss,-1800);assert.ok(Math.abs(r.recovery-21.9512195)<1e-6);assert.equal(stress(100,100,-100,0).recovery,null);assert.throws(()=>stress(100,101,-50,0));assert.throws(()=>stress('',20,-50,-10));});
test('contributions at month-end; zero and negative returns',()=>{assert.equal(dca(1000,100,0,1).balance,2200);assert.ok(Math.abs(dca(1000,0,10,1).balance-1100)<1e-8);assert.ok(dca(1000,100,-5,1).balance<2200);assert.throws(()=>dca(1000,100,-100,1));assert.throws(()=>dca(1000,100,5,1.2));});
test('daily 3x round trip loses despite flat index',()=>{const r=leverage('10,-9.09090909090909');assert.ok(Math.abs(r.index)<1e-10);assert.ok(Math.abs(r.levered+5.4545454545)<1e-8);assert.throws(()=>leverage('10,'));assert.throws(()=>leverage('-40'));});
test('portable records reject invalid numbers, impossible dates and wrong product',()=>{const r={version:1,product:PRODUCT,values:{...defaults}};assert.deepEqual(normalize(r),r);assert.throws(()=>normalize({...r,product:'x'}));assert.throws(()=>normalize({...r,values:{...defaults,review:'2026-02-30'}}));assert.throws(()=>normalize({...r,values:{...defaults,path:'NaN'}}));});
test('actual member handler enforces entitlement, version conflicts and saved record roundtrip',async()=>{const reset=mockChain(),sites=await setupSites(),origin='https://agiscorecard.com';try{const api=async b=>{const r=await memberRoute(new Request(origin+'/api/member',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Authorization:'Bearer '+KEY},body:JSON.stringify(b)}),sites.agi.raw,'agi');return {status:r.status,data:await r.json()};};const data={version:1,product:PRODUCT,values:{...defaults,thesis:'Test only'}},save={action:'save',id:'a'.repeat(32),revision:0,name:'Portfolio QA',data};assert.equal((await api(save)).status,401);assert.equal((await api({action:'checkout',nonce:'b'.repeat(32),source:PRODUCT,accept_terms:true,key_saved:true})).status,200);const order=sites.agi.db.sql.prepare('SELECT * FROM wb_orders').get();assert.equal(sites.agi.db.sql.prepare('SELECT product FROM wb_order_sources WHERE order_id=?').get(order.id).product,PRODUCT);fixture.receipt=transfer(order);assert.equal((await api({action:'check',id:order.id,tx:TX})).data.order.state,'paid');assert.equal((await api(save)).status,200);assert.deepEqual((await api({action:'read',id:save.id,revision:1})).data.data,data);assert.equal((await api({...save,revision:1})).status,200);assert.equal((await api(save)).status,409);}finally{reset();for(const v of Object.values(sites))v.db.sql.close();}});

import {businessEvent} from '../../../../tools/fleet-analytics/business.mjs';
test('fixed public analytics events accept no private fields',()=>{assert.equal(businessEvent('agiscorecard.com','/zh/portfolio-tracker',{name:'portfolio_cloud_intent'}).tool_id,PRODUCT);assert.equal(businessEvent('agiscorecard.com','/portfolio-tracker',{name:'portfolio_stress',capital:10000}),null);assert.equal(businessEvent('agiscorecard.com','/invest',{name:'portfolio_stress'}),null);});

import {validateSnapshot} from '../../portfolio-assets/core.mjs';
import {marketSymbols,widgetURL} from '../../portfolio-assets/market.mjs';
import fs from 'node:fs';
const registered=JSON.parse(fs.readFileSync(new URL('../../portfolio-assets/snapshot.json',import.meta.url))),manifest=JSON.parse(fs.readFileSync(new URL('../../portfolio-assets/manifest.json',import.meta.url)));
test('dynamic widgets cover the fixed basket and use isolated provider URLs without private inputs',()=>{
 assert.deepEqual(marketSymbols.map(x=>x.ticker),[...manifest.stocks,...manifest.benchmarks].map(x=>x.ticker));
 for(const x of marketSymbols){const u=new URL(widgetURL('symbol-overview',x.ticker,true)),config=JSON.parse(decodeURIComponent(u.hash.slice(1)));assert.equal(u.origin,'https://www.tradingview-widget.com');assert.deepEqual(config.symbols,[[x.ticker,x.symbol+'|1D']]);assert.equal(config.locale,'zh_CN');assert.equal(config['page-uri'],'agiscorecard.com/zh/portfolio-tracker');assert.equal(config.hideMarketStatus,false);}
 assert.throws(()=>widgetURL('symbol-overview','NVDA?private=1'));assert.throws(()=>widgetURL('unknown','NVDA'));
});
test('a refresh rejects corrupt and rollback records before replacing the last complete observation',()=>{
 assert.equal(validateSnapshot(registered),registered);const keys=marketSymbols.map(x=>x.ticker).concat('basket');
 const complete={...registered,status:'tracking',dates:['2026-10-05','2026-10-06'],as_of:'2026-10-06',series:Object.fromEntries(keys.map(k=>[k,[100,110]])),metrics:Object.fromEntries(keys.map(k=>[k,{return_pct:10,max_drawdown_pct:0,excess_spy_pp:0}]))};
 assert.equal(validateSnapshot(complete,registered),complete);assert.throws(()=>validateSnapshot(registered,complete));assert.throws(()=>validateSnapshot({...complete,manifest_sha256:'different'},complete));
 const bad=structuredClone(complete);delete bad.metrics.SPCX;assert.throws(()=>validateSnapshot(bad,complete));assert.equal(complete.metrics.SPCX.return_pct,10);
});
