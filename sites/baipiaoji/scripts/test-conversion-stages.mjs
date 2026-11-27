import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readConversionStages,readWorkbenchOrderCohorts,directoryOutboundCounts,STAGE_EVENTS_SQL,STAGE_ACCOUNTS_DAILY_SQL} from '../lib/conversion-stages.js';
import {emptyListingCounts} from '../lib/listing-signals.mjs';
import {emptyTableReviewCounts} from '../lib/table-review-signals.mjs';
import {HITS_INDEXES} from '../lib/hits-schema.js';
import {assertCountTree} from './conversion-stage-counts.mjs';
import {onRequestPost} from '../functions/api/hit.js';
import {hitWriteFixture} from './hit-write-fixture.mjs';
import {emptyTradeQuoteCounts} from '../lib/trade-quote-growth.mjs';
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
 ['/studio/proposal-deck/pptx-export/own','calc'],['/studio/proposal-deck/pptx-export/own','calc'],
 ['/studio/proposal-deck/pptx-export/demo','calc'],['/studio/proposal-deck/member-open/own','calc'],
 ['/studio/proposal-deck/cloud-open/own','calc'],['/studio/proposal-deck/cloud-saved/own','calc'],
 ['/studio/proposal-deck/cloud-restore/own','calc'],['/studio/proposal-deck/paid-offer-view/own','calc'],
 ['/studio/proposal-deck/paid-offer-view/demo','calc'],['/studio/proposal-deck/pptx-export/own/extra','calc'],
 ['/studio/proposal-deck/pptx-export/own','calc','ci'],['/studio/proposal-deck/pptx-export/own','calc','en','2026-09-27'],
 ['/proofkit/export_demo','biz'],['/proofkit/export_own','biz'],['/proofkit/paid_offer_view','biz'],['/proofkit/member_open','biz'],
 ['/proofkit/import_own','biz'],['/proofkit/paid_offer_view','biz','ci'],['/proofkit/export_own','biz','en','2026-09-27'],
 ['/proofkit/private-customer-input','biz'],['/proofkit/paid_offer_view_demo','biz'],['/biz/trigger/vendor-view','biz'],
 ...['guest_run','run','example','signup','membership_open','csv'].map(action=>['/trade-workbench/fx-bank-quote-unit/'+action,'biz']),
 ['/trade-workbench/fx-bank-quote-unit/run','biz','ci'],['/trade-workbench/fx-bank-quote-unit/run','biz','de'],
 ['/trade-workbench/fx-bank-quote-unit/run','biz','en','2026-09-27'],
 ['/trade-workbench/fx-bank-quote-unit/run?value=125','biz'],['/trade-workbench/unknown-slug/run','biz'],
 ['/trade-quote/ready_own','biz'],['/trade-quote/needs_info_demo','biz'],['/trade-quote/signup_open','biz','zh'],
 ['/trade-quote/ready_own','biz','ci'],['/trade-quote/ready_own?amount=125','biz'],['/trade-quote/ready_own','biz','de'],
 ['/studio/quote-compare/download/own','calc'],['/studio/pdf-tools/complete/own/extra','calc'],
 ['/account-growth/tool-entry','calc'],['/account-growth/tool-entry/forged','calc'],['/account-growth/tool-entry','calc','ci'],
 ['/coding-access/filter/catalog','coding_access'],['/coding-access/miss/catalog','coding_access'],
 ['/coding-access/open/minimax','coding_access'],['/coding-access/source/regions','coding_access'],
 ['/coding-access/copy/selection','coding_access'],['/coding-access/copy/selection','coding_access'],
 ['/coding-access/copy/catalog','coding_access'],['/coding-access/vendor/catalog','coding_access'],
 ['/coding-access/copy/selection','coding_access','ci'],
 ['/coding-access/copy/selection','coding_access','en','2026-09-27'],
 ['/coding-access/copy/selection','coding_access','en','2026-08-29'],
 ['/coding-access/copy/selection/extra','coding_access'],['/coding-access/open/private','coding_access'],
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
assert.equal(out.trade_quote_accounts,null,'Absent optional source table is unknown');
assert.equal(out.trade_quote_workbench_use,null,'Absent optional use table is unknown');
assert.equal(out.trade_workbench_accounts,null,'Absent optional source table is unknown for the direct cohort');
assert.equal(out.trade_workbench_signup_use,null,'Absent optional use table is unknown for the direct cohort');
assert.deepEqual(out.trade_measurement_status,{signup_sources:'schema_missing',workbench_use:'schema_missing'});
db.exec('CREATE TABLE free_account_signup_sources(account_id TEXT PRIMARY KEY,source TEXT)');
const insertSource=db.prepare('INSERT INTO free_account_signup_sources VALUES (?,?)');
for (const id of ['real','unverified','qa','today']) insertSource.run(id,'bpj_trade_quote');
insertSource.run('old','some_other_product');
const attributed=await readConversionStages(binding,28,Date.parse('2026-09-27T15:01:00Z'));
assert.deepEqual(attributed.trade_quote_accounts,{total:3,email_verified_total:2,created:2,email_verified:1});
assert.equal(attributed.trade_quote_workbench_use,null);
assert.deepEqual(attributed.trade_workbench_accounts,{total:0,email_verified_total:0,created:0,email_verified:0});
assert.equal(attributed.trade_workbench_signup_use,null);
assert.deepEqual(attributed.trade_measurement_status,{signup_sources:'available',workbench_use:'schema_missing'});
db.exec(`CREATE TABLE bpj_trade_quote_workbench_use(account_id TEXT PRIMARY KEY,first_day TEXT,repeat_day TEXT);
  INSERT INTO bpj_trade_quote_workbench_use VALUES ('real','2026-09-24','2026-09-26'),
    ('unverified','2026-09-26','2026-09-27'),('qa','2026-09-25','2026-09-26'),
    ('today','2026-09-27',NULL),('old','2026-08-30','2026-09-10');`);
const quoteOnly = await readConversionStages(binding,28,Date.parse('2026-09-27T15:01:00Z'));
assert.deepEqual(quoteOnly.trade_workbench_signup_use,{first_use_total:0,repeat_use_total:0,first_use:0,repeat_use:0});
const directAccounts = [['direct','2026-09-26',0,1],['direct-old','2026-08-29',0,0],
  ['direct-qa','2026-09-26',1,1],['direct-today','2026-09-27',0,1]];
for (const [id,date,qa,verified] of directAccounts) {
  db.prepare('INSERT INTO free_accounts VALUES(?,?,?)').run(id,sec(date),qa);
  db.prepare('INSERT INTO free_account_identities VALUES(?,?)').run(id,verified);
  insertSource.run(id,'bpj_trade_workbench');
}
assert.throws(()=>insertSource.run('real','bpj_trade_workbench'),/UNIQUE constraint failed/);
db.exec(`INSERT INTO bpj_trade_quote_workbench_use VALUES ('direct','2026-09-26','2026-09-27'),
  ('direct-old','2026-08-29','2026-08-30'),('direct-qa','2026-09-25','2026-09-26'),
  ('direct-today','2026-09-27',NULL);`);
const used = await readConversionStages(binding,28,Date.parse('2026-09-27T15:01:00Z'));
assert.deepEqual(used.trade_quote_accounts,attributed.trade_quote_accounts);
assert.deepEqual(used.trade_quote_workbench_use,{first_use_total:2,repeat_use_total:1,first_use:2,repeat_use:1});
assert.deepEqual(used.trade_workbench_accounts,{total:3,email_verified_total:2,created:1,email_verified:1});
assert.deepEqual(used.trade_workbench_signup_use,{first_use_total:2,repeat_use_total:1,first_use:1,repeat_use:1});
assert.deepEqual(used.trade_measurement_status,{signup_sources:'available',workbench_use:'available'});

// With the tables present, a read error (or unreadable metadata) stays unknown.
// Invalid counters are distinguished from both an absent table and a measured zero.
let schemaReads = 0;
function diagnosisBinding({sourceResult, schemaFailure} = {}) {
  return {prepare(sql) {
    if (sql.includes('FROM sqlite_schema')) {
      schemaReads++;
      if (schemaFailure) return {async first(){throw Error('metadata unavailable');}};
    }
    if (sourceResult && sql.includes('FROM free_account_signup_sources s JOIN free_accounts')) {
      return {bind(){return this;}, async all(){return sourceResult();}};
    }
    return binding.prepare(sql);
  }};
}
const diagnose = options => readConversionStages(diagnosisBinding(options),28,Date.parse('2026-09-27T15:01:00Z'));
await diagnose();
assert.equal(schemaReads,0);
for (const options of [
  {sourceResult(){throw Error('D1 unavailable');}},
  {sourceResult(){return {success:false,results:[]};},schemaFailure:true},
  {sourceResult(){return {results:null};}},
]) {
  const unreadable = await diagnose(options);
  assert.equal(unreadable.trade_quote_accounts,null);
  assert.equal(unreadable.trade_workbench_accounts,null);
  assert.deepEqual(unreadable.trade_measurement_status,{signup_sources:'unavailable',workbench_use:'available'});
}
assert.equal(schemaReads,3);
const invalid = await diagnose({sourceResult:()=>({results:[{source:'bpj_trade_quote',total:-1,email_verified_total:0,created:0,email_verified:0}]})});
assert.equal(invalid.trade_quote_accounts,null);
assert.deepEqual(invalid.trade_workbench_accounts,{total:0,email_verified_total:0,created:0,email_verified:0});
assert.deepEqual(invalid.trade_measurement_status,{signup_sources:'invalid_result',workbench_use:'available'});
assert.equal(schemaReads,3);
for (const [id] of directAccounts) {
  db.prepare('DELETE FROM free_account_identities WHERE account_id=?').run(id);
  db.prepare('DELETE FROM free_accounts WHERE id=?').run(id);
}
assert.deepEqual(out.directory_outbound,{by_tool:[{slug:'fireworks',clicks:1}],unattributed_clicks:0});
// Catalog allowlist prevents publishing arbitrary tracked paths. Page views and
// current affiliate settings cannot turn outbound actions into commissions.
assert.deepEqual(directoryOutboundCounts([
 {ev:'go',path:'/go/kimi',n:2},{ev:'go',path:'/go/fireworks',n:2},{ev:'go',path:'/go/kimi',n:1},
 {ev:'go',path:'/go/private-customer-input',n:3},{ev:'go',path:'/go/kimi?email=private@example.test',n:2},
 {ev:'go',path:'/go/kimi/extra',n:1},{ev:'',path:'/tools/kimi',n:99},
]),{by_tool:[{slug:'kimi',clicks:3},{slug:'fireworks',clicks:2}],unattributed_clicks:6});
assert.match(out.definitions.directory_outbound,/not page views/);
// The live gate must accept the actual aggregator contract, including grouped
// listing actions, while still rejecting malformed scalar and nested leaves.
assertCountTree(out.events, 'events');
assertCountTree(out.accounts, 'accounts');
for (const invalid of [-1, 0.5, NaN, Infinity, '0', null, undefined, false, [], {}]) {
  for (const target of ['scalar', 'nested']) {
    const events = structuredClone(out.events);
    if (target === 'scalar') events.coding_access_selection_copies = invalid;
    else events.listing_actions.own.export = invalid;
    assert.throws(() => assertCountTree(events, 'events'), /events\./);
  }
}
for (const unknown of [null, undefined, [], {}]) {
  assert.throws(() => assertCountTree(unknown, 'events'), /events/);
}
const proposalDeckActions={
 demo:{pptx_export:1,member_open:0,cloud_open:0,cloud_saved:0,cloud_restore:0},
 own:{pptx_export:2,member_open:1,cloud_open:1,cloud_saved:1,cloud_restore:1,paid_offer_view:1},
};
const proofkitActions={demo:{preview:0,backup:0,export:1,image:0,canva:0},own:{preview:0,backup:0,export:1,image:0,canva:0,import:1,member_open:1,paid_offer_view:1}};
assert.deepEqual(out.events,{trade_quote_actions:{...emptyTradeQuoteCounts(),ready_own:1,needs_info_demo:1,signup_open:1},table_review_actions:emptyTableReviewCounts(),listing_actions:emptyListingCounts(),proofkit_actions:proofkitActions,trade_workbench_actions:{signup:1,guest_run:1,run:1,example:1,membership_open:1,csv:1},proposal_deck_actions:proposalDeckActions,tool_results_own:2,tool_results_demo:1,tool_download_actions_own:1,tool_download_actions_demo:1,other_calc_events:14,directory_outbound_clicks:1,homepage_limit_navigation:1,video_exports_own:1,video_exports_demo:1,account_tool_entries:1,coding_access_filters:1,coding_access_empty_results:1,coding_access_provider_opens:1,coding_access_source_opens:1,coding_access_selection_copies:2,coding_access_checklist_copies:1,coding_access_vendor_entries:1});
const beaconRows=[];
async function proofkitBeacon(path, ref='/en/studio/testimonial-kit', headers={}) {
 return onRequestPost({env:{HITS:hitWriteFixture(beaconRows)},request:new Request('https://baipiaoji.com/api/hit',{
  method:'POST',headers:{referer:`https://baipiaoji.com${ref}`,origin:'https://baipiaoji.com','user-agent':'Mozilla/5.0',...headers},
  body:JSON.stringify({e:'biz',p:path,l:'en',r:'https://example.com/raw-customer-source'}),
 })});
}
await proofkitBeacon('/proofkit/paid_offer_view');
await proofkitBeacon('/proofkit/private-customer-input');
await proofkitBeacon('/proofkit/paid_offer_view','/en/studio/testimonial-kit?__qa=1');
await proofkitBeacon('/proofkit/paid_offer_view','/en/studio/testimonial-kit',{dnt:'1'});
await proofkitBeacon('/proofkit/paid_offer_view','/en/studio/testimonial-kit',{'sec-gpc':'1'});
await proofkitBeacon('/proofkit/paid_offer_view','/en/studio/testimonial-kit',{'user-agent':'HeadlessChrome'});
await proofkitBeacon('/proofkit/paid_offer_view','/en/studio/quote-builder');
assert.equal(beaconRows.length,1);
assert.deepEqual(beaconRows[0].slice(1),['/proofkit/paid_offer_view','en','','','biz']);
const tradeRows=[];
const tradeTool='fx-bank-quote-unit';
const tradePath='/trade-workbench/'+tradeTool+'/run';
async function tradeBeacon({p=tradePath,l='en',e='biz',origin='https://baipiaoji.com',ref=origin+'/en/studio/trade-tools/'+tradeTool,addHeaders={},url='https://baipiaoji.com/api/hit',cf={country:'US'}}={}) {
 const request=new Request(url,{method:'POST',headers:{origin,referer:ref,'user-agent':'Mozilla/5.0',...addHeaders},
   body:JSON.stringify({e,p,l,r:'https://private-client.example',inputs:{amount:1771},email:'contact@example.test'})});
 request.cf=cf;
 return onRequestPost({request,env:{HITS:hitWriteFixture(tradeRows),BPJ_FILTER_CONVERSIONS:'off'}});
}
await tradeBeacon();
await tradeBeacon({p:'/trade-workbench/'+tradeTool+'/guest_run'});
await tradeBeacon({l:'zh',ref:'https://baipiaoji.com/studio/trade-tools/'+tradeTool,p:'/trade-workbench/'+tradeTool+'/example'});
const directorySignup='/trade-workbench/directory/signup';
const tradeHub='https://baipiaoji.com/en/studio/trade-tools/';
await tradeBeacon({p:directorySignup,ref:tradeHub});
for (const opt of [
 {e:''},{e:'calc'}, {p:tradePath+'?customer=Alice'}, {p:'/trade-workbench/unknown-slug/run'},
 {p:'/trade-workbench/'+tradeTool+'/preview'}, {l:'zh'}, {l:'ci'}, {l:'de'}, {origin:''},
 {origin:'https://other.example'}, {addHeaders:{'sec-fetch-site':'cross-site'}},
 {ref:'https://baipiaoji.com/en/studio/trade-tools/fx-remittance-net'},
 {p:directorySignup},{p:'/trade-workbench/directory/run',ref:tradeHub},{ref:tradeHub},
 {ref:'https://baipiaoji.com/en/studio/trade-tools/'+tradeTool+'?__qa=1'},
 {url:'https://baipiaoji.com/api/hit?__probe=1'}, {addHeaders:{dnt:'1'}}, {addHeaders:{'sec-gpc':'1'}},
 {addHeaders:{'user-agent':'bpj-ci'}}, {addHeaders:{'user-agent':'HeadlessChrome'}},
 {cf:{country:'US',botManagement:{verifiedBot:true}}},
]) await tradeBeacon(opt);
assert.deepEqual(tradeRows.map(row=>row.slice(1)),[[tradePath,'en','','','biz'],['/trade-workbench/'+tradeTool+'/guest_run','en','','','biz'],['/trade-workbench/'+tradeTool+'/example','zh','','','biz'],[directorySignup,'en','','','biz']]);
const quoteRef='https://baipiaoji.com/en/studio/ai/trade-export-quote';
const quotePath='/trade-quote/ready_own';
tradeRows.length=0;
await tradeBeacon({p:quotePath,ref:quoteRef});
for (const options of [{ref:tradeHub},{p:quotePath+'?price=1'},{ref:quoteRef+'?__qa=1'},
 {addHeaders:{'sec-gpc':'1'}},{addHeaders:{'user-agent':'HeadlessChrome'}},{e:'calc'},{p:'/trade-quote/paid'}]) {
 await tradeBeacon({p:quotePath,ref:quoteRef,...options});
}
assert.deepEqual(tradeRows.map(row=>row.slice(1)),[[quotePath,'en','','','biz']]);
assert.deepEqual(out.accounts,{created:2,new_accounts_currently_email_verified:1,total_non_test:4,total_currently_email_verified:3});
assert.equal(out.account_scope,'fleet_shared_account_pool');
assert.equal(out.accounts_daily.length,28);
assert.deepEqual(out.accounts_daily.at(-1),{date:'2026-09-26',created:2,new_accounts_currently_email_verified:1});
assert.ok(out.accounts_daily.slice(0,-1).every(row=>row.created===0&&row.new_accounts_currently_email_verified===0));
assert.equal(out.accounts_daily[0].date,'2026-08-30');
assert.match(out.definitions.account_scope,/Separate AGI native registrations are not included/);
assert.match(out.definitions.accounts_daily,/not verifications performed on that day/);
// UTC creation-day boundaries are based on timestamps, not a browser locale.
const addAccount=(id,date,verified=0)=>{
 db.prepare('INSERT INTO free_accounts VALUES(?,?,?)').run(id,sec(date),0);
 db.prepare('INSERT INTO free_account_identities VALUES(?,?)').run(id,verified);
};
addAccount('start-inclusive','2026-08-30T00:00:00Z',1);
addAccount('previous-utc-day','2026-09-26T07:59:59+08:00',0);
addAccount('last-second','2026-09-26T23:59:59Z',1);
addAccount('deleted','2026-09-26T12:00:00Z',1);
db.prepare('DELETE FROM free_account_identities WHERE account_id=?').run('deleted');
db.prepare('DELETE FROM free_accounts WHERE id=?').run('deleted');
const boundaries=await readConversionStages(binding,28,Date.parse('2026-09-27T15:01:00Z'));
insert.run('2026-09-27','/go/kimi','en','go');
insert.run('2026-08-29','/go/kimi','en','go');
insert.run('2026-09-26','/go/kimi','ci','go');
assert.deepEqual((await readConversionStages(binding,28,Date.parse('2026-09-27T15:01:00Z'))).directory_outbound,out.directory_outbound);
assert.deepEqual(boundaries.accounts_daily[0],{date:'2026-08-30',created:1,new_accounts_currently_email_verified:1});
assert.deepEqual(boundaries.accounts_daily.at(-2),{date:'2026-09-25',created:1,new_accounts_currently_email_verified:0});
assert.deepEqual(boundaries.accounts_daily.at(-1),{date:'2026-09-26',created:3,new_accounts_currently_email_verified:2});
assert.equal(boundaries.accounts_daily.reduce((sum,row)=>sum+row.created,0),boundaries.accounts.created);
assert.equal(boundaries.accounts_daily.reduce((sum,row)=>sum+row.new_accounts_currently_email_verified,0),boundaries.accounts.new_accounts_currently_email_verified);
// Later verification updates the creation-day cohort, never the verification day.
db.prepare('UPDATE free_account_identities SET email_verified=1 WHERE account_id=?').run('previous-utc-day');
const verifiedLater=await readConversionStages(binding,28,Date.parse('2026-09-27T15:01:00Z'));
assert.equal(verifiedLater.accounts_daily.at(-2).new_accounts_currently_email_verified,1);
for(const id of ['start-inclusive','previous-utc-day','last-second']) {
 db.prepare('DELETE FROM free_account_identities WHERE account_id=?').run(id);
 db.prepare('DELETE FROM free_accounts WHERE id=?').run(id);
}
// A daily-query failure preserves readable totals but cannot turn unknown into zero.
const dailyFailure={prepare(sql){if(sql===STAGE_ACCOUNTS_DAILY_SQL)return{bind(){return this;},async all(){throw Error('unavailable');}};return binding.prepare(sql);}};
const partial=await readConversionStages(dailyFailure,28,Date.parse('2026-09-27T15:01:00Z'));
assert.equal(partial.ok,false);assert.deepEqual(partial.accounts,out.accounts);assert.equal(partial.accounts_daily,null);assert.deepEqual(partial.missing,['accounts_daily']);
// Existing legacy accounts without an identity still count; QA never counts.
db.prepare('INSERT INTO free_accounts VALUES(?,?,?)').run('legacy',sec('2026-01-01'),0);
const legacy=await readConversionStages(binding,28,Date.parse('2026-09-27T15:01:00Z'));
assert.equal(legacy.accounts.total_non_test,5);assert.equal(legacy.accounts.created,2);assert.equal(legacy.accounts.total_currently_email_verified,3);
const queryPlan=db.prepare('EXPLAIN QUERY PLAN '+STAGE_EVENTS_SQL).all('2026-08-30','2026-09-27');
assert.ok(queryPlan.some(r=>r.detail.includes('hits_events')),JSON.stringify(queryPlan));
// Order attribution and browser actions are separate. Test exact UTC boundaries,
// a payment recorded during the next partial day, and another product's order.
const readOrders=()=>readWorkbenchOrderCohorts(binding,'2026-08-30','2026-09-27');
assert.equal(await readOrders(),null);
db.exec(`CREATE TABLE wb_orders (id TEXT PRIMARY KEY,state TEXT,created INTEGER,expires INTEGER,paid_at INTEGER);
 CREATE TABLE wb_order_sources (order_id TEXT PRIMARY KEY, product TEXT NOT NULL);`);
assert.deepEqual(await readOrders(),{proposalDeck:{pending:0,expired:0,paid:0},tradeWorkbench:{pending:0,expired:0,paid:0}});
const addOrder=(id,created,expires,paidAt=null,product='bpj-proposal-deck')=>{
 db.prepare('INSERT INTO wb_orders VALUES(?,?,?,?,?)').run(id,paidAt?'paid':'pending',sec(created),sec(expires),paidAt?sec(paidAt):null);
 db.prepare('INSERT INTO wb_order_sources VALUES(?,?)').run(id,product);
};
addOrder('start','2026-08-30','2026-08-30T01:00:00Z','2026-08-30T00:30:00Z');
addOrder('expired','2026-09-26T21:00:00Z','2026-09-26T22:00:00Z');
addOrder('late','2026-09-26T23:59:59Z','2026-09-27T00:59:59Z','2026-09-27');
addOrder('before','2026-08-29T23:59:59Z','2026-08-30T00:59:59Z');
addOrder('today','2026-09-27','2026-09-27T01:00:00Z');
addOrder('other','2026-09-25','2026-09-25T01:00:00Z','2026-09-25T00:30:00Z','bpj-testimonial-kit');
addOrder('trade','2026-09-26T21:00:00Z','2026-09-26T23:59:00Z','2026-09-26T23:58:00Z','bpj-trade-toolbox');
addOrder('trade-next-day','2026-09-27','2026-09-27T01:00:00Z','2026-09-27T00:30:00Z','bpj-trade-toolbox');
assert.deepEqual(await readOrders(),{proposalDeck:{pending:1,expired:1,paid:1},tradeWorkbench:{pending:0,expired:0,paid:1}});
db.exec('DELETE FROM hits; DELETE FROM free_accounts; DELETE FROM free_account_identities;');
const empty=await readConversionStages(binding,28);
assert.deepEqual(empty.trade_measurement_status,{signup_sources:'available',workbench_use:'available'});
assert.deepEqual(empty.trade_quote_workbench_use,{first_use_total:0,repeat_use_total:0,first_use:0,repeat_use:0});
assert.deepEqual(empty.directory_outbound,{by_tool:[],unattributed_clicks:0});
assert.equal(empty.accounts.total_non_test,0);assert.equal(empty.accounts.total_currently_email_verified,0);assert.equal(empty.accounts.created,0);assert.equal(empty.events.tool_results_own,0);assert.equal(empty.events.coding_access_selection_copies,0);
assert.equal(empty.accounts_daily.length,28);assert.ok(empty.accounts_daily.every(row=>row.created===0&&row.new_accounts_currently_email_verified===0));
db.exec('DROP TABLE free_account_identities');
const missing=await readConversionStages(binding,28);
assert.deepEqual(missing.trade_measurement_status,{signup_sources:'schema_missing',workbench_use:'available'});
assert.equal(missing.ok,false);assert.equal(missing.accounts,null);assert.equal(missing.accounts_daily,null);assert.deepEqual(missing.missing,['accounts','accounts_daily']);
db.exec('DROP TABLE hits');
const failed=await readConversionStages(binding,28);
assert.equal(failed.directory_outbound,null);
assert.equal(failed.events,null);assert.equal(failed.accounts,null);
console.log('PASS: actual SQLite aggregation, UTC creation-day cohorts, current verification vs verification events, QA/deletion separation, indexed reads, zero vs unknown');
