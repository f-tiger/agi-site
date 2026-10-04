import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readConversionStages,STAGE_EVENTS_SQL} from '../lib/conversion-stages.js';
import {HITS_INDEXES} from '../lib/hits-schema.js';
const db=new DatabaseSync(':memory:');
db.exec(`CREATE TABLE hits(d TEXT,path TEXT,lang TEXT,ev TEXT,ref TEXT); ${HITS_INDEXES.join(';')};
 CREATE TABLE free_accounts(id TEXT PRIMARY KEY,created INTEGER,qa INTEGER);
 CREATE TABLE free_account_identities(account_id TEXT PRIMARY KEY,email_verified INTEGER);`);
const binding={prepare(sql){let args=[];return{bind(...x){args=x;return this;},async all(){return{results:db.prepare(sql).all(...args)};},async first(){return db.prepare(sql).get(...args)??null;}};}};
const insert=db.prepare('INSERT INTO hits(d,path,lang,ev) VALUES(?,?,?,?)');
for(const [path,ev,lang='en',date='2026-09-26'] of [
 ['/studio/pdf-tools/complete/own','calc'],['/studio/pdf-tools/complete/demo','calc'],
 ['/studio/product-images/download/own','calc'],['/studio/quote-compare/calculate/own','calc'],
 ['/studio/quote-compare/export-report/demo','calc'],['/studio/video-variants/export-batch/own','calc'],
 ['/studio/video-variants/export-video/demo','calc'],['/studio/video-variants/cloud-open/own','calc'],
 ['/studio/quote-compare/download/own','calc'],['/studio/pdf-tools/complete/own/extra','calc'],
 ['/account-growth/tool-entry','calc'],['/account-growth/tool-entry/forged','calc'],['/account-growth/tool-entry','calc','ci'],
 ['/go/fireworks','go'],['/home/limit-check/en/c/api','home'],['/home/other/en/c/api','home'],
 ['/__ci/calc','calc'],['/studio/pdf-tools/complete/own','calc','ci'],
 ['/studio/pdf-tools/complete/own','calc','en','2026-09-27'],
 ['/studio/pdf-tools/complete/own','calc','en','2026-08-29'],
 ['/studio/pdf-tools/complete/own','bot'],['/studio/pdf-tools/complete/own',''],
])insert.run(date,path,lang,ev);
const sec = s=>Date.parse(s)/1000;
for(const [id,date,qa,verified] of [['real','2026-09-26',0,1],['unverified','2026-09-26',0,0],['qa','2026-09-26',1,1],['today','2026-09-27',0,1],['old','2026-08-29',0,1]]){
 db.prepare('INSERT INTO free_accounts VALUES(?,?,?)').run(id,sec(date),qa);
 db.prepare('INSERT INTO free_account_identities VALUES(?,?)').run(id,verified);
}
const out=await readConversionStages(binding,28,Date.parse('2026-09-27T15:01:00Z'));
assert.deepEqual(out.window,{start:'2026-08-30',end_exclusive:'2026-09-27',complete_days:28,date_basis:'UTC'});
assert.equal(out.ok,true);
assert.deepEqual(out.events,{tool_results_own:2,tool_results_demo:1,tool_download_actions_own:1,tool_download_actions_demo:1,other_calc_events:4,directory_outbound_clicks:1,homepage_limit_navigation:1,video_exports_own:1,video_exports_demo:1,account_tool_entries:1});
assert.deepEqual(out.accounts,{created:2,new_accounts_currently_email_verified:1,total_non_test:4,total_currently_email_verified:3});
// Existing legacy accounts without an identity still count; QA never counts.
db.prepare('INSERT INTO free_accounts VALUES(?,?,?)').run('legacy',sec('2026-01-01'),0);
const legacy=await readConversionStages(binding,28,Date.parse('2026-09-27T15:01:00Z'));
assert.equal(legacy.accounts.total_non_test,5);assert.equal(legacy.accounts.created,2);assert.equal(legacy.accounts.total_currently_email_verified,3);
const queryPlan=db.prepare('EXPLAIN QUERY PLAN '+STAGE_EVENTS_SQL).all('2026-08-30','2026-09-27');
assert.ok(queryPlan.some(r=>r.detail.includes('hits_events')),JSON.stringify(queryPlan));
db.exec('DELETE FROM hits; DELETE FROM free_accounts; DELETE FROM free_account_identities;');
const empty=await readConversionStages(binding,28);
assert.equal(empty.accounts.total_non_test,0);assert.equal(empty.accounts.total_currently_email_verified,0);assert.equal(empty.accounts.created,0);assert.equal(empty.events.tool_results_own,0);
db.exec('DROP TABLE free_account_identities');
const missing=await readConversionStages(binding,28);
assert.equal(missing.ok,false);assert.equal(missing.accounts,null);assert.deepEqual(missing.missing,['accounts']);
db.exec('DROP TABLE hits');
const failed=await readConversionStages(binding,28);
assert.equal(failed.events,null);assert.equal(failed.accounts,null);
console.log('PASS: actual SQLite aggregation, complete-day bounds, QA/demo separation, indexed reads, zero vs unknown');
