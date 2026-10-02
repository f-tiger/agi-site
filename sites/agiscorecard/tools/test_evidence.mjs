import test from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';
import worker,{validFocusEvent} from './analytics-worker/index.js';
import {report,ORDER_SQL,EVENT_SQL,evidenceFunnelRoute} from './evidence-funnel.mjs';
const db=new DatabaseSync(':memory:');
db.exec(`CREATE TABLE events(day,name,location,label,ua_class);CREATE INDEX idx_events_name ON events(name);CREATE TABLE subscribers(day,status,path,utm_source);CREATE TABLE wb_orders(id,created,paid_at,state,amount_units,tx,chain);CREATE TABLE wb_order_sources(order_id,product);CREATE TABLE bpj_ad_chain_receipts(order_id,tx,chain);`);
const wrap={prepare(sql){const stmt=db.prepare(sql);return {bind(...args){return {all:async()=>({results:stmt.all(...args)})};}};}};
test('server receipt and payment time decide paid totals, not browser clicks or order creation',async()=>{
 db.exec(`INSERT INTO wb_orders VALUES('good',unixepoch('2026-09-01'),unixepoch('2026-10-03'),'paid',9010001,'tx-good','bsc'),('forged',unixepoch('2026-10-02'),unixepoch('2026-10-03'),'paid',9010002,'tx-fake','bsc'),('pending',unixepoch('2026-10-03'),NULL,'pending',9010003,NULL,'bsc'),('old',unixepoch('2026-09-01'),unixepoch('2026-09-02'),'paid',9010004,'tx-old','bsc');INSERT INTO bpj_ad_chain_receipts VALUES('member:good','tx-good','bsc'),('member:old','tx-old','bsc');INSERT INTO wb_order_sources VALUES('good','work-mentor');`);
 const rows=db.prepare(ORDER_SQL).all('2026-10-03','2026-10-17');assert.equal(rows.length,1);assert.equal(rows[0].n,1);assert.equal(rows[0].gross_usdt_micro,9010001);
 const j=await report(wrap,new Date('2026-10-17T12:00:00Z'));assert.equal(j.ok,true);assert.equal(j.baseline_complete,true);assert.equal(j.window.start,'2026-10-03');assert.equal(j.paid_orders[0].product,'work-mentor');
});
test('private aggregate endpoint rejects unauthenticated reads before touching the database',async()=>{
 let reads=0;const env={MEMBER_WATCH_SECRET:'test-only',EVENTS:{prepare(){reads++;throw Error();}}};
 assert.equal((await evidenceFunnelRoute(new Request('https://agiscorecard.com/api/evidence-funnel'),env)).status,404);
 assert.equal((await evidenceFunnelRoute(new Request('https://agiscorecard.com/api/evidence-funnel',{method:'POST'}),env)).status,403);assert.equal(reads,0);
 const j=await report(env.EVENTS);assert.equal(j.ok,false);assert.equal(j.paid_orders,null);
});
test('evidence event vocabulary cannot accept copied content, scores or emails',async()=>{
 assert.equal(validFocusEvent('evidence_action','evidence_open_zh','citation_copy'),true);
 for(const label of ['reader@example.com','score62.5','custom'])assert.equal(validFocusEvent('evidence_action','evidence_open_zh',label),false);
 assert.equal(validFocusEvent('share_arrival','reader_share_en','evidence_link'),true);
 const writes=[],pending=[];const env={EVENTS:{prepare(){return {bind(...args){return {run:async()=>writes.push(args)};}};}}};
 for(const [label,query] of [['share_copy',''],['private@email.test',''],['share_copy','?ci=1']])await worker.fetch(new Request('https://agiscorecard.com/api/e',{method:'POST',headers:{'user-agent':'Mozilla/5.0'},body:JSON.stringify({n:'evidence_action',l:'evidence_open_zh',b:label,p:'/zh/did-open-source-ai-fade',u:query})}),env,{waitUntil(p){pending.push(p);}});
 await Promise.all(pending);assert.equal(writes.length,1);
});

test('event report uses the name index, excludes bots/today and redacts subscription labels',async()=>{
 db.exec("INSERT INTO events VALUES('2026-10-03','sub_ok','user-controlled','private@example.test','human'),('2026-10-03','task_complete','grade_game_en','assessment','human'),('2026-10-03','task_complete','grade_game_en','assessment','bot'),('2026-10-17','task_complete','grade_game_en','assessment','human')");
 const rows=db.prepare(EVENT_SQL).all('2026-10-03','2026-10-17');assert.equal(rows.length,2);assert.equal(rows.find(x=>x.event==='sub_ok').label,'');assert.equal(rows.find(x=>x.event==='task_complete').n,1);assert.match(db.prepare('EXPLAIN QUERY PLAN '+EVENT_SQL).all('2026-10-03','2026-10-17').map(x=>x.detail).join(' '),/USING INDEX idx_events_name/);
});
