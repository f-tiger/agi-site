import assert from 'node:assert/strict';
import {memberRoute} from './server.mjs';
import {mockChain,setupSites,fixture,transfer,KEY} from './test-fixtures.mjs';
import {createOrder,memberByToken,memberStatus,saveSpace,watchMembers} from '../../sites/baipiaoji/lib/membership.js';
import {seconds} from '../../sites/baipiaoji/lib/ad-commerce.js';
import {sites,products} from '../revenue-studio/catalog.mjs';
const restore=mockChain(),all=await setupSites();let checks=0;
const run=async(site,key=all[site].secret,method='POST')=>{
 const r=await memberRoute(new Request(sites[site].origin+'/api/member-recovery',{method,headers:{Authorization:'Bearer '+key},...(method==='POST'?{body:JSON.stringify({paid:true,checked_at:9999999999})}:{})}),all[site].raw,site);
 return {status:r.status,data:await r.json()};
};
try{
 for(const site of ['agi','eco','tds']){
  const {db,env}=all[site],now=seconds(),id='expired-'+site;
  db.sql.prepare('INSERT INTO wb_members(id,token_hash,created,ends_at) VALUES(?,?,?,?)').run(id,site,now-90*86400,now-31*86400);
  db.sql.prepare('INSERT INTO wb_spaces VALUES(?,?,?,?,?,?)').run(id,'space','Keep',products.find(p=>p.site===site).id,1,now);
  db.sql.prepare('INSERT INTO wb_versions VALUES(?,?,?,?,?,?)').run(id,'space',1,'{}',2,now);
  db.sql.prepare('INSERT INTO wb_limits VALUES(?,?,?)').run('keep-expired',1,now-2*86400);
  db.sql.exec('UPDATE wb_health SET checked_at=0');
  const trace=[],prepare=db.prepare.bind(db);db.prepare=q=>{trace.push(q);return prepare(q);};
  const denied=await run(site,all[site==='agi'?'eco':'agi'].secret);assert.equal(denied.status,401);assert.equal(trace.length,0);
  const method=await memberRoute(new Request(sites[site].origin+'/api/member-recovery'),all[site].raw,site);assert.equal(method.status,405);assert.equal(trace.length,0);
  const ok=await run(site);assert.equal(ok.status,200);assert.equal(ok.data.ready,true);assert.equal(ok.data.site,site);assert.equal(ok.data.mode,'receipts-only');
  assert.ok(!JSON.stringify(ok).includes(all[site].secret));assert.equal(trace.some(q=>/^\s*DELETE\b/i.test(q)),false);
  for(const table of ['wb_versions','wb_spaces','wb_limits'])assert.equal(db.sql.prepare(`SELECT COUNT(*) n FROM ${table}`).get().n,1);
  assert.equal(db.sql.prepare("SELECT COUNT(*) n FROM sqlite_master WHERE name LIKE 'ce_%' OR name LIKE 'jarvis_%'").get().n,0);
  assert.ok(Math.abs(db.sql.prepare('SELECT checked_at FROM wb_health').get().checked_at-now)<4);
  await watchMembers(env);assert.equal(db.sql.prepare('SELECT COUNT(*) n FROM wb_versions').get().n,0,'scheduled retention remains unchanged');
  db.prepare=prepare;checks++;
 }
 console.log('PASS three isolated receipt routes preserve expired customer records and normal scheduled retention');
 // Exact existing receipt fulfillment, once only; no synthetic chain acceptance.
 const eco=all.eco;fixture.logs=[];fixture.receipt=null;
 const order=await createOrder(eco.env,KEY,'1'.repeat(32),'fixture');const row=eco.db.sql.prepare('SELECT * FROM wb_orders WHERE id=?').get(order.id);
 fixture.receipt=transfer(row);fixture.logs=fixture.receipt.logs;
 assert.equal((await run('eco')).status,200);const m=await memberByToken(eco.db,KEY);assert.equal(memberStatus(m).active,true);
 await run('eco');assert.equal((await memberByToken(eco.db,KEY)).ends_at,m.ends_at);assert.equal(eco.db.sql.prepare('SELECT COUNT(*) n FROM bpj_ad_chain_receipts').get().n,1);checks++;
 console.log('PASS exact chain receipt grants only once');
 fixture.logs=[];fixture.receipt=null;
 // Failure at any mandatory evidence read must keep old health closed.
 const agi=all.agi,prepare=agi.db.prepare.bind(agi.db),rpc=globalThis.fetch;
 for(const kind of ['rpc','invalid_logs','orders','support']){
  agi.db.sql.exec('UPDATE wb_health SET checked_at=0');
  globalThis.fetch=async(u,o)=>{if(kind==='rpc')throw Error('offline');if(kind==='invalid_logs'&&JSON.parse(o.body).method==='eth_getLogs')return Response.json({result:{}});return rpc(u,o);};
  agi.db.prepare=q=>{if((kind==='orders'&&q.startsWith('SELECT * FROM wb_orders'))||(kind==='support'&&q.startsWith('SELECT COUNT(*) n FROM wb_support')))throw Error('D1 private failure');return prepare(q);};
  const r=await run('agi');assert.equal(r.status,503);assert.equal(agi.db.sql.prepare('SELECT checked_at FROM wb_health').get().checked_at,0);assert.equal(JSON.stringify(r).includes('private failure'),false);checks++;
 }
 globalThis.fetch=rpc;agi.db.prepare=prepare;
 console.log('PASS RPC, log scan, order and support failures leave stale health unchanged');
 const off=await memberRoute(new Request(sites.agi.origin+'/api/member-recovery',{method:'POST',headers:{Authorization:'Bearer '+agi.secret}}),{...agi.raw,MEMBERS_ENABLED:'false'},'agi');assert.equal(off.status,503);checks++;
 console.log(`${checks} receipt recovery checks passed; in-memory SQLite and mocked chain only.`);
}finally{restore();for(const s of Object.values(all))s.db.sql.close();}
