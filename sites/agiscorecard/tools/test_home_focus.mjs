import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import worker, {FOCUS_SQL, validFocusEvent, pulseResponse} from './analytics-worker/index.js';

test('assessment collector accepts fixed actions, drops arbitrary scores, QA and privacy opt-outs', async()=>{
  const writes=[], waits=[];
  const env={EVENTS:{prepare(sql){return {bind(...args){return {run:async()=>writes.push({sql,args})};}};}}};
  const ctx={waitUntil(p){waits.push(p);}};
  async function send(body,headers={}){
    const r=await worker.fetch(new Request('https://agiscorecard.com/api/e',{method:'POST',headers:{'content-type':'application/json','user-agent':'Mozilla/5.0',...headers},body:JSON.stringify({p:'/',...body})}),env,ctx);
    await Promise.all(waits.splice(0));assert.equal(r.status,204);
  }
  for(const n of ['task_start','task_complete','result_copy'])await send({n,l:'grade_game_en',b:'assessment'});
  await send({n:'focus_entry',l:'home_focus_zh',b:'route_evidence'});
  assert.equal(writes.length,4);
  for(const b of ['score:62.5','knowledge-work:failed','reader@example.org'])await send({n:'task_complete',l:'grade_game_en',b});
  await send({n:'task_complete',l:'arbitrary',b:'assessment'});
  for(const u of ['?ci=1','?__qa=1','?__probe=1','?utm_source=verify'])await send({n:'task_complete',l:'grade_game_en',b:'assessment',u});
  for(const headers of [{dnt:'1'},{'sec-gpc':'1'}])await send({n:'task_complete',l:'grade_game_en',b:'assessment'},headers);
  assert.equal(writes.length,4);
  assert.ok(validFocusEvent('focus_entry','evidence_context_en','context_data'));
});

test('focus aggregate uses the existing name index and excludes bots, old dates and unrelated events',()=>{
  const db=new DatabaseSync(':memory:');
  db.exec('CREATE TABLE events(day,name,location,label,ua_class); CREATE INDEX idx_events_name ON events(name)');
  const add=(offset,name='task_complete',ua='human',loc='grade_game_en')=>db.prepare("INSERT INTO events VALUES(date('now',?),?,?,?,?)").run(offset,name,loc,'assessment',ua);
  add('0 days');add('0 days');add('-35 days');add('0 days','task_complete','bot');add('0 days','task_complete',null);add('0 days','task_complete','human','unrelated');add('0 days','calc_use');
  const rows=db.prepare(FOCUS_SQL).all();assert.equal(rows.length,1);assert.equal(rows[0].n,2);
  assert.match(db.prepare('EXPLAIN QUERY PLAN '+FOCUS_SQL).all().map(r=>r.detail).join(' '),/SEARCH events USING INDEX idx_events_name/);
  db.close();
});

test('a failed focus query stays unknown and marks pulse partial so it is not cached',async()=>{
  const env={EVENTS:{prepare(sql){return {all:async()=>{if(sql===FOCUS_SQL)throw Error('fixture failure');return {results:[]};}};}}};
  const body=await (await pulseResponse(env,new URL('https://agiscorecard.com/api/pulse'))).json();
  assert.equal(body.focus,null);assert.equal(body.partial,true);
});
