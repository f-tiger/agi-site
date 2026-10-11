import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import worker from '../worker.mjs';
import {measurement} from '../measurement.mjs';
import {aggregateWindow} from '../aggregate-read.mjs';
const now=Date.parse('2026-10-11T08:30:00Z');
const schemas={events:'id TEXT,site TEXT,page TEXT,channel TEXT,campaign TEXT,event TEXT,qa INTEGER,created_at TEXT',feedback:'id TEXT,site TEXT,frequency TEXT,usefulness TEXT,interest TEXT,own_completed INTEGER,qa INTEGER,created_at TEXT'};
function database(kind,rows=[]){
 const db=new DatabaseSync(':memory:');
 if(kind){db.exec(`CREATE TABLE web3_studio_${kind} (${schemas[kind]})`);for(const row of rows)db.prepare(`INSERT INTO web3_studio_${kind} VALUES (${row.map(()=>'?').join(',')})`).run(...row);}
 const queries=[];
 return {queries,close:()=>db.close(),DB:{prepare(sql){const q={sql,args:[]};queries.push(q);assert.match(sql,/^SELECT /i,'GET/HEAD prepared a mutation');return {bind(...args){q.args=args;return this;},async all(){return {success:true,results:db.prepare(sql).all(...q.args)};},async run(){throw Error('Aggregate executed run()');}};}}};
}
const event=(id,site,date,qa=0)=>[id,site,'market','direct','none','cost_check',qa,date];
const feedback=(id,site,date,qa=0)=>[id,site,'repeat','helped','free',1,qa,date];
const request=(site,path,method='GET')=>new Request(`https://${site==='hub'?'web3':site}.agiscorecard.com${path}`,{method});
async function read(db,site,path,method='GET'){return worker.fetch(request(site,path,method),{DB:db?.DB});}
test('complete UTC days are distinct from rolling and current partial windows across a year boundary',()=>{
 const w=aggregateWindow(new Date('2027-01-01T01:02:03Z'),35);
 assert.equal(w.daily.start,'2026-12-04T00:00:00.000Z');assert.equal(w.daily.end,'2027-01-01T00:00:00.000Z');assert.equal(w.groups.start,'2026-11-27T01:02:03.000Z');assert.equal(w.today.date,'2027-01-01');assert.equal(w.today.end,w.generatedAt);
});
test('growth only SELECTs, scopes hostname and QA, separates UTC complete days and today, and caches public reads',async t=>{
 t.mock.timers.enable({apis:['Date'],now});
 const db=database('events',[event('old','proof','2026-09-12 23:59:59'),event('boundary','proof','2026-09-13 00:00:00'),event('yesterday','proof','2026-10-10 23:59:59'),event('today','proof','2026-10-11 00:00:00'),event('future','proof','2026-10-12 00:00:00'),event('sibling','evidence','2026-10-10 12:00:00'),event('qa','proof','2026-10-10 12:00:00',1)]);t.after(db.close);
 const r=await read(db,'proof','/api/growth'),v=await r.json();assert.equal(r.status,200);assert.equal(r.headers.get('Cache-Control'),'public, max-age=3600');assert.equal(v.groups.reduce((n,x)=>n+x.events,0),2);assert.deepEqual(v.daily.map(x=>x.date),['2026-09-13','2026-10-10']);assert.deepEqual(v.today.map(x=>x.date),['2026-10-11']);assert.ok([...v.groups,...v.daily,...v.today].every(x=>x.site==='proof'));assert.equal(v.qa,false);assert.equal(v.metrics.events.identity,'not_unique_people');assert.equal(v.outcomes.revenue,null);
 assert.equal(db.queries.length,2);assert.deepEqual(db.queries[1].args,[0,'2026-09-13 00:00:00','2026-10-11 08:30:00','proof']);
 const qa=await read(db,'proof','/api/growth?qa=1');assert.equal(qa.headers.get('Cache-Control'),'no-store');assert.equal((await qa.json()).daily[0].events,1);
 const hub=await(await read(db,'hub','/api/growth')).json();assert.deepEqual([...new Set(hub.daily.map(x=>x.site))].sort(),['evidence','proof']);assert.equal(hub.daily.filter(x=>x.site==='evidence').length,1);assert.ok(!db.queries.at(-1).sql.includes('AND site=?'));
});
test('stats keeps QA as a separate dimension and excludes stale/future feedback without deleting it',async t=>{
 t.mock.timers.enable({apis:['Date'],now});
 const db=database('feedback',[feedback('old','proof','2026-09-05 08:30:00'),feedback('legacy','proof','2026-09-08 00:00:00'),feedback('boundary','proof','2026-09-13 00:00:00'),feedback('yesterday','proof','2026-10-10 23:59:59'),feedback('today','proof','2026-10-11 00:00:00'),feedback('future','proof','2026-10-12 00:00:00'),feedback('sibling','evidence','2026-10-10 12:00:00'),feedback('qa','proof','2026-10-10 12:00:00',1)]);t.after(db.close);
 const r=await read(db,'proof','/api/stats'),v=await r.json();assert.equal(r.status,200);assert.equal(v.window.groups.days,35);assert.equal(v.groups.reduce((n,x)=>n+x.submissions,0),5);assert.deepEqual(v.groups.map(x=>x.qa),[0,1]);assert.equal(v.daily.filter(x=>x.qa===0).length,2);assert.equal(v.daily.filter(x=>x.qa===1).length,1);assert.equal(v.today[0].date,'2026-10-11');assert.ok([...v.groups,...v.daily,...v.today].every(x=>x.site==='proof'));assert.equal(v.metrics.own_completed.verifiedTaskResult,false);assert.equal(r.headers.get('Cache-Control'),'public, max-age=3600');
 const hub=await(await read(db,'hub','/api/stats')).json();assert.deepEqual([...new Set(hub.daily.map(x=>x.site))].sort(),['evidence','proof']);
});
test('GET and HEAD with missing database/table fail explicitly and do not manufacture zero data',async t=>{
 const db=database();t.after(db.close);
 for(const path of ['/api/growth','/api/stats'])for(const [binding,reason] of [[undefined,'database_unavailable'],[db,'table_unavailable']]){
  const get=await read(binding,'proof',path);assert.equal(get.status,503);assert.equal(get.headers.get('Cache-Control'),'no-store');const v=await get.json();assert.equal(v.status,'unavailable');assert.equal(v.reason,reason);for(const key of ['groups','daily','today'])assert.equal(v[key],null);
  const head=await read(binding,'proof',path,'HEAD');assert.equal(head.status,503);assert.equal(await head.text(),'');assert.equal(head.headers.get('Cache-Control'),get.headers.get('Cache-Control'));
 }
});
test('HEAD matches aggregate status and headers, executes only SELECTs, and never returns a body',async t=>{
 for(const [kind,path] of [['events','/api/growth'],['feedback','/api/stats']]){const db=database(kind);t.after(db.close);const get=await read(db,'proof',path),head=await read(db,'proof',path,'HEAD');assert.equal(head.status,get.status);assert.equal(head.headers.get('Cache-Control'),get.headers.get('Cache-Control'));assert.equal(await head.text(),'');assert.equal(db.queries.length,4);}
 const db=database('events');t.after(db.close);assert.equal(await(await measurement(request('proof','/api/growth','HEAD'),{DB:db.DB},'proof')).text(),'');
});
test('query errors are sanitized; unsupported filters and methods cannot execute a query',async()=>{
 const queries=[],env={DB:{prepare(sql){queries.push(sql);return {bind(){return this;},async all(){throw Error('private test input');}};}}};
 for(const path of ['/api/growth','/api/stats']){const r=await worker.fetch(request('proof',path),env);assert.equal(r.status,503);const text=await r.text();assert.ok(!text.includes('private test input'));assert.equal(JSON.parse(text).reason,'query_failed');}
 const count=queries.length;
 for(const path of ['/api/growth?qa=2','/api/growth?qa=1&qa=0','/api/stats?site=evidence'])assert.equal((await worker.fetch(request('proof',path),env)).status,400);
 for(const path of ['/api/growth','/api/stats'])assert.equal((await worker.fetch(request('proof',path,'POST'),env)).status,405);
 assert.equal(queries.length,count);
});
