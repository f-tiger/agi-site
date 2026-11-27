import assert from 'node:assert/strict';
import test from 'node:test';
import {database} from '../../../tools/member-studio/test-fixtures.mjs';
import {onRequestGet} from '../functions/api/mcp-value-report.js';
import {recordMcpValue} from '../lib/mcp-value-events.mjs';
import {readMcpValueReport} from '../lib/mcp-value-report.mjs';
import {recordAiTradeQuote, TRADE_QUOTE_DAILY_TABLE} from '../lib/ai-trade-quote-observations.mjs';

function fixture() {
  const db = database(), prepare = db.prepare;
  db.prepare = query => {
    const statement = prepare(query), all = statement.all;
    statement.all = async () => ({success:true, ...await all.call(statement)});
    return statement;
  };
  return db;
}

test('confirmed startup receipts are separated from quotes and other sources, with deduplicated member reuse', async () => {
  const now = new Date('2026-11-26T16:00:00Z');
  const db = fixture();
  db.sql.exec(`CREATE TABLE wb_orders(id,member_id,amount_units,state,paid_at,created,expires);
    CREATE TABLE wb_order_sources(order_id,product);`);
  const toSeconds = text => Date.parse(`2026-11-${text}Z`) / 1000;
  const create = db.sql.prepare('INSERT INTO wb_orders VALUES(?,?,?,?,?,?,?)');
  const source = db.sql.prepare('INSERT INTO wb_order_sources VALUES(?,?)');
  function order(id, member, state, paidAt, expiry, product = 'bpj-startup-mcp') {
    create.run(id, member, 9000123, state, paidAt, toSeconds('23T08:00:00'), expiry);
    source.run(id, product);
  }
  order('tagged-receipt', 'private-buyer', 'paid', toSeconds('23T08:10:00'), toSeconds('23T09:00:00'));
  order('other-receipt', 'private-other', 'paid', toSeconds('23T08:10:00'), toSeconds('23T09:00:00'), 'bpj-proposal-deck');
  order('fresh-quote', 'private-pending', 'pending', null, toSeconds('26T17:00:00'));
  order('expired-quote', 'private-expired', 'pending', null, toSeconds('23T09:00:00'));
  for (const [memberId, at] of [
    ['private-buyer','23T09:00:00'], ['private-buyer','23T10:00:00'], ['private-buyer','25T09:00:00'],
    ['private-other','24T09:00:00'], ['private-pending','24T09:00:00'],
  ]) assert(await recordMcpValue(db, {tool:'build_startup_plan',outcome:'usable',memberId,now:toSeconds(at)}));
  assert(await recordMcpValue(db, {tool:'check_commercial_use',outcome:'usable',now:toSeconds('24T09:00:00')}));

  const report = await readMcpValueReport(db,now);
  assert.deepEqual({...report.startup_checkout},{tagged_quotes:3,pending:1,expired:1,confirmed_orders:1,confirmed_members:1,gross_usdt_micro:9000123});
  assert.deepEqual({...report.startup_paid_usage},{confirmed_members_with_results:2,confirmed_members_across_days:1,tagged_members_with_results:1,tagged_members_across_days:1});
  assert.deepEqual({...report.site_membership_confirmed_all_time},{confirmed_orders:2,confirmed_members:2,gross_usdt_micro:18000246});
  assert.equal(report.task_outcomes.find(row=>row.day==='2026-11-23'&&row.tool==='build_startup_plan').n,2);
  assert.doesNotMatch(JSON.stringify(report), /private-|tagged-receipt|other-receipt/);
});

test('the readout is private and treats unavailable tables as uncovered', async () => {
  const db = fixture(), secret = 'report-fixture-secret-should-not-leave-the-handler';
  const request = authorization => new Request('https://baipiaoji.com/api/mcp-value-report', {headers:authorization ? {authorization} : {}});
  const rejectDb = {prepare(){assert.fail('unauthorized should not reach D1');}};
  const denied = await onRequestGet({request:request(),env:{HITS:rejectDb,ADS_WATCH_SECRET:secret}});
  assert.equal(denied.status,401);
  const response = await onRequestGet({request:request('Bearer '+secret),env:{HITS:db,ADS_WATCH_SECRET:secret}});
  assert.equal(response.status,200);
  assert.equal(response.headers.get('cache-control'),'no-store');
  assert.equal(response.headers.get('x-robots-tag'),'noindex');
  const result = await response.json();
  assert.equal(result.checkout_ready,false);
  assert.equal(result.task_outcomes,null);
  assert.equal(result.startup_checkout,null);
  assert.equal(result.startup_paid_usage,null);
  assert.equal(result.trade_quote_calls.observations,null);
  assert.equal(result.trade_quote_mcp_link.accounts,null);
  assert.equal(result.trade_quote_mcp_link.workbench_use,null);
  assert.doesNotMatch(JSON.stringify(result), /report-fixture-secret/);
});

test('trade quote observations have bounded retention and use the protected report UTC window', async t => {
  const db = fixture();
  t.after(() => db.sql.close());
  const asOf = Date.parse('2026-11-27T16:21:00Z'), days = 86400000;
  db.sql.exec(`CREATE TABLE free_accounts(id,qa,created);
    CREATE TABLE free_account_signup_sources(account_id,source);
    CREATE TABLE free_account_identities(account_id,email_verified);
    CREATE TABLE bpj_trade_quote_workbench_use(account_id,first_day,repeat_day);
    INSERT INTO free_accounts VALUES
      ('private-tagged',0,unixepoch('2026-11-21')),
      ('private-today',0,unixepoch('2026-11-27')),
      ('private-ordinary',0,unixepoch('2026-11-21')),
      ('private-qa',1,unixepoch('2026-11-21'));
    INSERT INTO free_account_signup_sources VALUES
      ('private-tagged','bpj_trade_quote_mcp_link'),('private-today','bpj_trade_quote_mcp_link'),
      ('private-ordinary','bpj_trade_quote'),('private-qa','bpj_trade_quote_mcp_link');
    INSERT INTO free_account_identities VALUES ('private-tagged',1),('private-qa',1);
    INSERT INTO bpj_trade_quote_workbench_use VALUES
      ('private-tagged','2026-11-21','2026-11-26'),('private-today','2026-11-27',NULL),
      ('private-ordinary','2026-11-22','2026-11-26'),('private-qa','2026-11-21','2026-11-22');`);
  const request = new Request('https://baipiaoji.com/api/ai-mcp', {headers:{'User-Agent':'PRIVATE-CLIENT'}});
  const record = (time,form,outcome) => recordAiTradeQuote(db,request,{form,outcome},time);
  assert.equal(await record(asOf - 36 * days,'direct','costs_entered'),true);
  assert.equal(await record(asOf - 34 * days,'direct','costs_entered'),true);
  assert.equal(await record(asOf - 8 * days,'direct','invalid'),true);
  assert.equal(await record(asOf - 7 * days,'direct','costs_entered'),true);
  assert.equal(await record(asOf,'wrapper','provisional'),true);
  assert.equal(await record(asOf,'discovery','listed'),true);
  assert.equal(await record(asOf,'discovery','costs_entered'),false);
  assert.equal(db.sql.prepare(`SELECT MIN(day) day FROM ${TRADE_QUOTE_DAILY_TABLE}`).get().day,'2026-10-24');

  const report = await readMcpValueReport(db, new Date(asOf));
  const quote = report.trade_quote_calls;
  assert.equal(quote.tool,'bpj_trade_export_quote');
  assert.equal(quote.endpoint,'/api/ai-mcp');
  assert.equal(quote.retention_days,35);
  assert.deepEqual(quote.window,{since:'2026-11-20',through:'2026-11-27',timezone:'UTC',today_partial:true});
  assert.deepEqual(quote.observations.map(row=>Object.values(row)),[
    ['2026-11-20','direct','costs_entered','unknown',1],
    ['2026-11-27','discovery','listed','unknown',1],
    ['2026-11-27','wrapper','provisional','unknown',1],
  ]);
  assert.equal((await readMcpValueReport(db,new Date(asOf+15*days))).trade_quote_calls.observations.length,0);
  const tagged = report.trade_quote_mcp_link;
  assert.deepEqual(tagged.window,{start:'2026-11-20',end_exclusive:'2026-11-27',timezone:'UTC',complete_days:7});
  assert.deepEqual(tagged.accounts,{total:2,email_verified_total:1,created:1,email_verified:1});
  assert.deepEqual(tagged.workbench_use,{first_use_total:1,repeat_use_total:1,first_use:1,repeat_use:1});
  assert.doesNotMatch(JSON.stringify(report),/PRIVATE-CLIENT|private-tagged|private-today|private-ordinary|private-qa/);
});
