import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import worker from '../src/worker.mjs';
const url='https://localebatch.agiscorecard.com/api/pulse';
function setup({missingTable=false}={}){
  const db=new DatabaseSync(':memory:'),queries=[];
  if(!missingTable)db.exec(readFileSync(new URL('../migrations/0001.sql',import.meta.url),'utf8'));
  const wrapped=(sql,values=[])=>({bind(...args){return wrapped(sql,args);},async first(){queries.push(sql);assert.match(sql,/^SELECT\s/);return db.prepare(sql).get(...values)||null;},async all(){queries.push(sql);assert.match(sql,/^SELECT\s/);return {results:db.prepare(sql).all(...values)};},async run(){throw Error('Report must not mutate');}});
  return {db,queries,env:{DB:{prepare:sql=>wrapped(sql),batch(){throw Error('Report must not write');}},WORK:{send(){throw Error('Report must not queue');}},SALES_ENABLED:'false'}};
}
function job(db,id,created,state='awaiting_payment',paid=null){db.prepare('INSERT INTO jobs(id,token_hash,input,state,created_at,expires_at,payment_intent,amount_paid,paid_at) VALUES(?,?,?,?,?,?,?,?,?)').run(id,'private-token-hash','private buyer CSV',state,Date.parse(created),Date.parse(created)+30*86400000,paid?'private-payment-'+id:null,paid?1900:null,paid?Date.parse(paid):null);}
test('public pulse reads only coarse aggregates without private rows or upstream calls',async(t)=>{
  t.mock.timers.enable({apis:['Date'],now:new Date('2026-10-11T09:30:00Z')});
  const previous=globalThis.fetch;globalThis.fetch=()=>{throw Error('No payment, model or account request allowed');};
  try{
    const {db,env,queries}=setup();
    job(db,'private-id-a','2026-10-09T23:59:59Z','completed','2026-10-10T00:00:01Z');
    job(db,'private-id-b','2026-10-10T00:00:00Z','completed');
    job(db,'private-id-c','2026-10-11T09:00:00Z','awaiting_payment');
    job(db,'private-id-refund','2026-09-01T00:00:00Z','refunded','2026-09-01T01:00:00Z');
    job(db,'private-unknown-state','2026-10-10T20:00:00Z','internal-state-with-private-label');
    db.prepare("INSERT INTO items(job_id,idx,status,output) VALUES(?,?,?,?)").run('private-id-a',0,'accepted','private translated output');
    db.prepare("INSERT INTO items(job_id,idx,status,output) VALUES(?,?,?,?)").run('private-id-a',1,'accepted','');
    db.prepare("INSERT INTO items(job_id,idx,status,output) VALUES(?,?,?,?)").run('private-id-b',0,'blocked',null);
    const response=await worker.fetch(new Request(url),env),data=await response.json();
    assert.equal(response.status,200);assert.match(response.headers.get('X-Robots-Tag'),/noindex/);assert.match(response.headers.get('Cache-Control'),/max-age=3600/);
    assert.equal(data.available,true);assert.equal(data.generated,'2026-10-11T09:30:00.000Z');assert.equal(data.timezone,'UTC');assert.equal(data.window.start,'2026-09-13T00:00:00.000Z');
    assert.equal(data.inventory.retained_jobs,5);assert.equal(data.inventory.job_states.completed,2);assert.equal(data.inventory.job_states.other,1);assert.equal(data.inventory.accepted_results,1);assert.equal(data.inventory.jobs_with_accepted_results,1);assert.equal(data.inventory.recorded_paid_jobs,2);
    assert.deepEqual(data.daily.find(x=>x.date==='2026-10-10'),{date:'2026-10-10',complete:true,jobs_created:2,recorded_paid_jobs:1});
    assert.equal(data.daily.find(x=>x.date==='2026-10-11').complete,false);assert.equal(data.daily.find(x=>x.date==='2026-10-11').jobs_created,1);
    assert.equal(data.revenue,null);assert.equal(data.coverage.nonTestVerified,false);assert.equal(data.coverage.currency,'not_stored');
    assert.doesNotMatch(JSON.stringify(data),/private-|buyer CSV|translated output|internal-state/);
    const head=await worker.fetch(new Request(url,{method:'HEAD'}),env);assert.equal(head.status,200);assert.equal(await head.text(),'');assert.equal(queries.length,8);assert.ok(queries.every(sql=>! /\b(?:CREATE|DELETE|INSERT|UPDATE|REPLACE|DROP)\b/i.test(sql)));assert.equal(db.prepare('SELECT COUNT(*) AS n FROM jobs').get().n,5);
  }finally{globalThis.fetch=previous;}
});
test('missing D1 or tables returns unavailable null metrics without exposing SQL',async()=>{
  for(const env of [{},setup({missingTable:true}).env,{DB:{prepare(){return {bind(){return this;},first:async()=>({}),all:async()=>({success:false,results:[]})};}}}]){const response=await worker.fetch(new Request(url),env),data=await response.json();assert.equal(response.status,503);assert.equal(response.headers.get('Cache-Control'),'no-store');assert.equal(data.available,false);assert.equal(data.inventory,null);assert.equal(data.daily,null);assert.equal(data.revenue,null);assert.doesNotMatch(JSON.stringify(data),/no such table|SELECT COUNT/);}
});
test('successful empty database is distinct from an unavailable backend',async()=>{
  const {env}=setup();const response=await worker.fetch(new Request(url),env),data=await response.json();assert.equal(response.status,200);assert.equal(data.inventory.retained_jobs,0);assert.equal(data.inventory.accepted_results,0);assert.equal(data.daily.length,29);assert.ok(data.daily.every(row=>row.jobs_created===0&&row.recorded_paid_jobs===0));assert.equal(data.revenue,null);
});
test('POST is rejected without calling database, payment or queue code',async()=>{
  const {env,queries}=setup();const response=await worker.fetch(new Request(url,{method:'POST'}),env);assert.equal(response.status,405);assert.equal(queries.length,0);
});
