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
