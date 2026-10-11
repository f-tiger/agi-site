import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import worker from '../worker.mjs';
const base='https://verify.agiscorecard.com/api/stats';
function setup({missingTable=false}={}){
  const db=new DatabaseSync(':memory:'),queries=[];
  if(!missingTable)db.exec("CREATE TABLE agent_delivery_feedback (id TEXT PRIMARY KEY,created TEXT NOT NULL,frequency TEXT NOT NULL,interest TEXT NOT NULL,own_completed INTEGER NOT NULL,qa INTEGER NOT NULL)");
  const query=(sql,values=[])=>({bind(...args){return query(sql,args);},async all(){queries.push(sql);assert.match(sql,/^SELECT\s/);assert.doesNotMatch(sql,/\b(?:CREATE|DELETE|INSERT|UPDATE|REPLACE|DROP)\b/i);return {results:db.prepare(sql).all(...values)};},async run(){throw Error('Public report must never write');}});
  return {db,queries,env:{DB:{prepare:sql=>query(sql)},EVENT_LIMIT:{limit(){throw Error('No business operation allowed');}}}};
}
test('GET and HEAD preserve QA groups, use UTC dates and perform only aggregate SELECTs',async(t)=>{
  t.mock.timers.enable({apis:['Date'],now:new Date('2026-10-11T09:30:00Z')});
  const {db,env,queries}=setup();
  const add=db.prepare('INSERT INTO agent_delivery_feedback VALUES(?,?,?,?,?,?)');
  add.run('private-row-1','2026-10-09 23:59:59','4plus','discuss',1,0);
  add.run('private-row-2','2026-10-10 00:00:00','4plus','discuss',1,0);
  add.run('private-qa','2026-10-10 12:00:00','zero','no',0,1);
  add.run('first-partial','2026-09-06 10:00:00','zero','free',0,0);
  add.run('too-old','2026-09-06 09:00:00','zero','free',0,0);
  add.run('today','2026-10-11 09:00:00','1-3','free',1,0);
  const response=await worker.fetch(new Request(base),env),data=await response.json();
  assert.equal(response.status,200);assert.match(response.headers.get('Cache-Control'),/max-age=3600/);assert.match(response.headers.get('X-Robots-Tag'),/noindex/);
  assert.equal(data.available,true);assert.equal(data.generated,'2026-10-11T09:30:00.000Z');assert.equal(data.timezone,'UTC');assert.equal(data.window.start,'2026-09-06T09:30:00.000Z');
  assert.equal(data.groups.find(x=>x.frequency==='4plus').submissions,2);
  assert.equal(data.groups.find(x=>x.qa===1).submissions,1);
  assert.equal(data.daily.find(x=>x.date==='2026-10-09').complete,true);
  assert.equal(data.daily.find(x=>x.date==='2026-09-06').complete,false);
  assert.equal(data.daily.find(x=>x.date==='2026-10-11').complete,false);
  assert.equal(data.daily.reduce((n,x)=>n+x.submissions,0),5);assert.doesNotMatch(JSON.stringify(data),/private-row|private-qa|too-old/);
  const head=await worker.fetch(new Request(base,{method:'HEAD'}),env);assert.equal(head.status,200);assert.equal(await head.text(),'');assert.equal(queries.length,2);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM agent_delivery_feedback').get().n,6);
});
test('missing database or table is unavailable, never a zero summary or new table',async()=>{
  for(const env of [{},setup({missingTable:true}).env,{DB:{prepare(){return {bind(){return this;},all:async()=>({success:false,results:[]})};}}}]){const response=await worker.fetch(new Request(base),env);assert.equal(response.status,503);assert.equal(response.headers.get('Cache-Control'),'no-store');const data=await response.json();assert.equal(data.available,false);assert.equal(data.groups,null);assert.equal(data.daily,null);assert.doesNotMatch(JSON.stringify(data),/no such table|CREATE TABLE/);}
});
test('aggregate endpoint rejects mutation methods before preparing a query',async()=>{
  const {env,queries}=setup();const response=await worker.fetch(new Request(base,{method:'POST'}),env);assert.equal(response.status,405);assert.equal(queries.length,0);
});

test('second-resolution feedback before a millisecond cutoff is included',async(t)=>{
  t.mock.timers.enable({apis:['Date'],now:new Date('2026-10-11T09:30:00.500Z')});
  const {db,env}=setup();
  db.prepare('INSERT INTO agent_delivery_feedback VALUES(?,?,?,?,?,?)').run('recent-qa','2026-10-11 09:30:00','zero','no',0,1);
  const data=await (await worker.fetch(new Request(base),env)).json();
  assert.equal(data.groups.find(row=>row.qa===1).submissions,1);
  assert.equal(data.window.end,'2026-10-11T09:30:00.500Z');
});
