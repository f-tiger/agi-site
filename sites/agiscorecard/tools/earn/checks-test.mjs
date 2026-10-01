import {test} from 'node:test';import assert from 'node:assert/strict';import {subtitles,workflow,csv} from '../../earn-assets/checks.mjs';
test('SRT catches overlaps, malformed timing and nonpositive durations without claiming translation quality',()=>{
 const r=subtitles('1\n00:00:01,000 --> 00:00:02,000\nHello\n\n2\n00:00:01,500 --> 00:00:01,500\n\n3\n00:99:00,000 --> 00:00:02,000\nInvalid');assert.equal(r.count,2);for(const code of ['overlap','nonpositive_duration','empty_caption','invalid_timestamp'])assert.ok(r.issues.some(x=>x.code===code),code);assert.equal(subtitles('').issues[0].code,'empty_input');assert.throws(()=>subtitles('x',{cps:0,line:42}));
});
test('CSV retains quoted fields; unique recent completions cannot be inflated by duplicate IDs',()=>{
 assert.deepEqual(csv('a,b\n"a,b","line\ntext"\n'),[['a','b'],['a,b','line\ntext']]);assert.throws(()=>csv('a,b\n"unterminated'));
 const r=workflow('run_id,finished_at,status,output_count\nx,2026-10-01T00:00:00Z,success,0\nx,2026-10-01T00:01:00Z,success,2\ny,2026-10-01T00:02:00,success,1\nz,2026-10-02T00:00:00Z,success,1',{now:'2026-10-01T01:00:00Z',expected:2});assert.equal(r.successes,1);for(const code of ['empty_output','duplicate_run','invalid_timestamp','future_timestamp','missing_expected_runs'])assert.ok(r.issues.some(x=>x.code===code),code);
});
test('missing records, invalid schema and thresholds fail explicitly',()=>{
 assert.throws(()=>workflow('wrong,columns\n1,2',{now:'2026-10-01T00:00:00Z'}));assert.throws(()=>workflow('run_id,finished_at,status,output_count',{now:'invalid'}));assert.throws(()=>workflow('run_id,finished_at,status,output_count',{now:'2026-10-01T00:00:00Z',expected:1.5}));const r=workflow('run_id,finished_at,status,output_count',{now:'2026-10-01T00:00:00Z'});assert.ok(r.issues.some(x=>x.code==='empty_input'));assert.ok(r.issues.some(x=>x.code==='missing_expected_runs'));
});
import {snapshot,decode,encode,compare} from '../../earn-assets/reports.mjs';
test('history backups retain only summaries and reject malformed imports atomically',()=>{
 const r=snapshot({...subtitles('1\n00:00:01,000 --> 00:00:02,000\nPRIVATE CAPTION'),source:'PRIVATE CAPTION'},'a','2026-10-01T00:00:00Z');assert.ok(!encode([r]).includes('PRIVATE'));assert.deepEqual(decode(encode([r])),[r]);assert.throws(()=>decode(encode([r,r])));assert.throws(()=>decode(JSON.stringify({schema:'agi-delivery-history-v1',reports:[r,{...r,id:'b',flags:{unknown:1}}]})));assert.throws(()=>decode('x'.repeat(100001)));assert.throws(()=>decode(JSON.stringify({schema:'agi-delivery-history-v1',reports:Array.from({length:21},(_,i)=>({...r,id:'r'+i}))})));assert.throws(()=>snapshot({...subtitles(''),thresholds:{cps:Infinity,line:42}},'x'));
});
test('comparison blocks scope changes and measures aggregate flags without claiming fixes',()=>{
 const a=snapshot(subtitles('1\n00:00:01,000 --> 00:00:02,000\n'+'a'.repeat(60)),'a'),b=snapshot(subtitles('1\n00:00:01,000 --> 00:00:02,000\nShort'),'b');assert.equal(compare(a,b).rows.find(r=>r.code==='long_line').delta,-1);assert.equal(compare(a,{...b,count:0}).blocked,'coverage');assert.equal(compare(a,{...b,thresholds:{cps:30,line:42}}).blocked,'thresholds');const w=snapshot(workflow('run_id,finished_at,status,output_count\nx,2026-10-01T00:00:00Z,success,1',{now:'2026-10-01T01:00:00Z'}),'w');assert.equal(compare(a,w).blocked,'kind');assert.equal(compare(w,{...w,id:'w2',thresholds:{...w.thresholds,now:'2026-10-01T02:00:00Z'}}).blocked,'thresholds');assert.ok(!encode([w]).includes('run_id'));
});
