import assert from 'node:assert/strict';
import {test} from 'node:test';
import {database, fixture as chainState, mockChain, setupSites, transfer, TX} from '../../../tools/member-studio/test-fixtures.mjs';
import {onRequest as accountAPI} from '../functions/api/account.js';
import {ensureAccountMembers, onRequestPost as membershipAPI} from '../functions/api/account-member.js';
import {onRequestPost as legacyMembershipAPI} from '../functions/api/member.js';
import {onRequest as tradeAPI} from '../functions/api/trade-workbench.js';
import {ACCOUNT_COOKIE, ensureAccounts, issueSession, now} from '../lib/free-account.js';
import {tradeGroups} from '../lib/trade-workbench/engine.mjs';
import {FREE_DAILY_RUNS, MEMBER_DAILY_RUNS} from '../lib/trade-workbench-access.mjs';

const site = 'https://baipiaoji.com';
const tools = tradeGroups.flatMap(group => group.tools);
const example = tools.find(tool => tool.inputs.some(([, type]) => type === 'number'));
const inputOf = tool => Object.fromEntries(tool.inputs.map(([key,,,, sample]) => [key, sample]));
const sample = () => ({id: example.id, input: inputOf(example)});

async function fixture(t) {
  const db = database();
  t.after(() => db.sql.close());
  const env = {HITS: db, MEMBER_SITE: 'bpj'};
  await ensureAccounts(env);
  return {db, env};
}

async function userOf({db, env}, id, emailVerified = null) {
  const timestamp = now();
  db.sql.prepare(`INSERT INTO free_accounts(id,username,password_hash,recovery_hash,created,updated)
    VALUES(?,?,?,?,?,?)`).run(id, id, 'fixture-password-hash', 'fixture-recovery-hash', timestamp, timestamp);
  if (emailVerified !== null) {
    db.sql.prepare(`INSERT INTO free_account_identities(account_id,email,display_name,display_key,email_verified,email_verified_at)
      VALUES(?,?,?,?,?,?)`).run(id, id + '@example.test', id, id, Number(emailVerified), emailVerified ? timestamp : null);
  }
  return `${ACCOUNT_COOKIE}=${await issueSession(env, {id, session_version: 1})}`;
}

function request(path, {cookie, payload, host = site, method = payload === undefined ? 'GET' : 'POST', headers = {}}) {
  const defaultHeaders = method === 'POST' ? {Origin: site, 'Content-Type': 'application/json'} : {};
  return new Request(host + path, {method, headers: {...defaultHeaders, ...(cookie ? {Cookie: cookie} : {}), ...headers},
    ...(payload === undefined ? {} : {body: JSON.stringify(payload)}),
  });
}

const trade = (env, options = {}) => tradeAPI({env, request: request('/api/trade-workbench', options)});
const account = (env, options) => accountAPI({env, request: request('/api/account', options)});

function runs(db, id) {
  return db.sql.prepare('SELECT utc_day,runs FROM bpj_trade_workbench_daily WHERE account_id=?').get(id);
}

test('guest cannot execute by calling the API directly and cross-host/cross-site requests are rejected', async t => {
  const ctx = await fixture(t);
  const {env, db} = ctx;
  const prepare = t.mock.method(db, 'prepare');
  const response = await trade(env);
  const guest = await response.json();
  assert.equal(prepare.mock.callCount(), 0);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.match(response.headers.get('X-Robots-Tag'), /noindex/);
  assert.deepEqual(guest, {ok: true, access: 'guest', limit: null, remaining: null,
    checkout: {ready: false, price_units: 9000000, days: 30, chain: 'bsc', token: 'USDT'}});
  assert.equal((await trade(env, {payload: sample()})).status, 401);
  const cookie = await userOf(ctx, 'caller', true);
  for (const options of [
    {host: 'https://www.baipiaoji.com'}, {host: 'http://baipiaoji.com'},
    {headers: {Origin: 'https://another.example'}}, {headers: {Origin: ''}},
    {headers: {'Sec-Fetch-Site': 'cross-site'}},
  ]) assert.equal((await trade(env, {cookie, payload: sample(), ...options})).status, 403);
  assert.equal((await trade(env, {cookie, payload: sample(), headers: {Authorization: 'Bearer independent-member-key'}})).status, 400);
  assert.equal((await trade(env, {cookie, method: 'PUT'})).status, 405);
  assert.equal((await trade({...env, MEMBER_SITE: 'eco'}, {cookie, payload: sample()})).status, 503);
  assert.equal(db.sql.prepare("SELECT name FROM sqlite_master WHERE name='bpj_trade_workbench_daily'").get(), undefined);
});

test('email/password registration unlocks free access before verification, and old registered accounts still work', async t => {
  const ctx = await fixture(t);
  const {env, db} = ctx;
  const password = 'synthetic-local-password-2026';
  const headers = {'CF-Connecting-IP': '192.0.2.3'};
  const registration = await account(env, {headers, payload: {action: 'register', username: 'trade_fixture',
    email: 'trade-fixture@example.test', password, consent: true, qa: true}});
  assert.equal(registration.status, 200);
  const {user} = await registration.json();
  assert.equal(user.email_verified, false);
  const cookie = registration.headers.get('Set-Cookie').split(';')[0];
  const status = await (await trade(env, {cookie})).json();
  assert.equal(status.access, 'free');
  assert.equal(status.remaining, FREE_DAILY_RUNS);
  assert(!JSON.stringify(status).includes(user.id) && !JSON.stringify(status).includes(user.email));
  assert.equal((await trade(env, {cookie, payload: sample()})).status, 200);
  assert.equal(runs(db, user.id).runs, 1);

  const legacy = await userOf(ctx, 'old-registered-account');
  assert.equal((await trade(env, {cookie: legacy, payload: sample()})).status, 200);
  assert.equal(runs(db, 'old-registered-account').runs, 1);

  const logout = await account(env, {headers, cookie, payload: {action: 'logout', account_id: user.id}});
  assert.equal(logout.status, 200);
  assert.equal((await trade(env, {cookie, payload: sample()})).status, 401);
  const login = await account(env, {headers, payload: {action: 'login', email: user.email, password}});
  assert.equal(login.status, 200);
  const newCookie = login.headers.get('Set-Cookie').split(';')[0];
  const deleted = await account(env, {headers, cookie: newCookie, payload: {action: 'delete_account', account_id: user.id, password, confirm: true}});
  assert.equal(deleted.status, 200);
  assert.equal((await trade(env, {cookie: newCookie, payload: sample()})).status, 401);
  assert.equal(runs(db, user.id), undefined);
});

test('invalid runs do not consume the allowance, bursts cannot overrun it, and it resets on a UTC day', async t => {
  t.mock.method(Date, 'now', () => Date.parse('2026-11-26T23:59:59Z'));
  const ctx = await fixture(t);
  const {env, db} = ctx;
  const cookie = await userOf(ctx, 'daily-account', true);
  const body = sample();
  for (const bad of [
    {...body, id: 'unknown-tool'}, {...body, input: {}}, {...body, access: 'member'},
    {...body, input: {oversized: 'x'.repeat(4400)}}, {...body, input: [1, 2]},
  ]) assert.equal((await trade(env, {cookie, payload: bad})).status, 400);
  assert.equal((await trade(env, {cookie, payload: {...body, format: 'csv', lang: 'en'}})).status, 403);
  assert.equal((await (await trade(env, {cookie})).json()).remaining, FREE_DAILY_RUNS);

  const burst = await Promise.all(Array.from({length: FREE_DAILY_RUNS + 4}, () => trade(env, {cookie, payload: body})));
  assert.equal(burst.filter(r => r.status === 200).length, FREE_DAILY_RUNS);
  assert.equal(burst.filter(r => r.status === 429).length, 4);
  assert.deepEqual({...runs(db, 'daily-account')}, {utc_day: '2026-11-26', runs: FREE_DAILY_RUNS});
  assert.equal((await (await trade(env, {cookie})).json()).remaining, 0);

  Date.now.mock.mockImplementation(() => Date.parse('2026-11-27T00:00:01Z'));
  assert.equal((await (await trade(env, {cookie})).json()).remaining, FREE_DAILY_RUNS);
  assert.equal((await trade(env, {cookie, payload: body})).status, 200);
  assert.deepEqual({...runs(db, 'daily-account')}, {utc_day: '2026-11-27', runs: 1});
  assert.equal(db.sql.prepare('SELECT COUNT(*) count FROM bpj_trade_workbench_daily').get().count, 1);
});

test('active linked members can export formula-safe CSV while checkout is closed and each export counts once', async t => {
  const ctx = await fixture(t);
  const {env, db} = ctx;
  const cookie = await userOf(ctx, 'paid-account', true);
  const other = await userOf(ctx, 'second-account', true);
  await ensureAccountMembers(env);
  const timestamp = now();
  db.sql.prepare('INSERT INTO wb_members(id,token_hash,created,ends_at) VALUES(?,?,?,?)').run('paid-1', 'fixture-key-hash', timestamp, timestamp + 3600);
  db.sql.prepare('INSERT INTO bpj_account_members(account_id,member_id,created) VALUES(?,?,?)').run('paid-account', 'paid-1', timestamp);

  for (let i = 0; i < 2; i++) {
    const status = await (await trade(env, {cookie})).json();
    assert.equal(status.checkout.ready, false);
    assert.equal(status.access, 'member');
    assert.equal(status.remaining, MEMBER_DAILY_RUNS);
  }

  const localized = [['公式式文本', 'Formula-like text', '\n＝1+1'], ['差值', 'Difference', -123], ['文本', 'Text', ['一,"二"','one,"two"']]];
  t.mock.method(example, 'run', () => localized);
  const exportBody = {...sample(), format: 'csv', lang: 'en'};
  const blocked = await trade(env, {cookie: other, payload: exportBody});
  assert.equal(blocked.status, 403);
  const exported = await trade(env, {cookie, payload: exportBody});
  assert.equal(exported.status, 200);
  const result = await exported.json();
  assert.equal(result.access, 'member');
  assert.equal(result.remaining, MEMBER_DAILY_RUNS - 1);
  assert(result.csv.startsWith('\ufeff"Field","Value"\r\n'));
  assert(result.csv.includes('"Formula-like text","\'\n＝1+1"'));
  assert(result.csv.includes('"Difference",-123\r\n'));
  assert(result.csv.includes('"Text","one,""two"""\r\n'));
  assert.deepEqual(Object.keys(runs(db, 'paid-account')).sort(), ['runs', 'utc_day']);

  db.sql.prepare('UPDATE bpj_trade_workbench_daily SET runs=? WHERE account_id=?').run(MEMBER_DAILY_RUNS - 1, 'paid-account');
  const burst = await Promise.all([trade(env, {cookie, payload: sample()}), trade(env, {cookie, payload: exportBody})]);
  assert.deepEqual(burst.map(response => response.status).sort(), [200, 429]);
  assert.equal(runs(db, 'paid-account').runs, MEMBER_DAILY_RUNS);

  db.sql.prepare('UPDATE wb_members SET suspended=1 WHERE id=?').run('paid-1');
  assert.equal((await trade(env, {cookie, payload: exportBody})).status, 403);
  db.sql.prepare('UPDATE wb_members SET suspended=0,ends_at=? WHERE id=?').run(timestamp - 1, 'paid-1');
  assert.equal((await trade(env, {cookie, payload: exportBody})).status, 403);
  const status = await (await trade(env, {cookie})).json();
  assert.equal(status.access, 'free');
  assert.equal(status.remaining, 0);
});

test('a session revoked during evaluation cannot spend quota or receive a result', async t => {
  const ctx = await fixture(t);
  const {env, db} = ctx;
  const cookie = await userOf(ctx, 'revoked-account', true);
  const evaluate = example.run;
  t.mock.method(example, 'run', input => {
    db.sql.prepare('DELETE FROM free_account_sessions WHERE account_id=?').run('revoked-account');
    return evaluate(input);
  });
  const rejected = await trade(env, {cookie, payload: sample()});
  assert.equal(rejected.status, 401);
  assert.deepEqual(await rejected.json(), {ok: false, code: 'sign_in_required'});
  assert.equal(runs(db, 'revoked-account'), undefined);
});

test('the attributed account checkout unlocks Trade CSV only after a valid BSC receipt', async t => {
  const restoreFetch = mockChain();
  t.after(() => { chainState.receipt = null; restoreFetch(); });
  const sites = await setupSites();
  t.after(() => Object.values(sites).forEach(site => site.db.sql.close()));
  const {db, env} = sites.bpj;
  const headers = {'CF-Connecting-IP': '192.0.2.4'};
  const password = 'synthetic-local-password-portal';
  const registration = await account(env, {headers, payload: {action: 'register', username: 'trade_portal_fixture',
    email: 'trade-portal@example.test', password, consent: true, qa: true}});
  assert.equal(registration.status, 200);
  const {user} = await registration.json();
  const cookie = registration.headers.get('Set-Cookie').split(';')[0];
  const bridge = async (action, fields = {}) => {
    const req = request('/api/account-member', {headers, cookie, payload: {action, account_id: user.id, ...fields}});
    const response = await membershipAPI({request: req, env});
    assert.equal(response.status, 200, action);
    return response.json();
  };

  assert.equal((await (await trade(env, {cookie})).json()).checkout.ready, true);
  const {key} = await bridge('create_key', {password});
  await bridge('confirm_backup', {key, confirmed: true});
  const checkout = {nonce: 'e'.repeat(32), source: 'bpj-trade-toolbox', accept_terms: true, key_saved: true};
  const legacyCheckout = async source => legacyMembershipAPI({env, request: request('/api/member', {
    headers: {...headers, Authorization: 'Bearer ' + '4'.repeat(64)}, payload: {action: 'checkout', ...checkout, source},
  })});
  const rejected = await legacyCheckout(checkout.source);
  assert.equal(rejected.status, 403);
  assert.deepEqual(await rejected.json(), {ok: false, code: 'account_link_required'});
  assert.equal(db.sql.prepare('SELECT COUNT(*) count FROM wb_orders').get().count, 0);
  const {order} = await bridge('checkout', checkout);
  assert.equal(order.state, 'pending');
  assert.equal((await bridge('checkout', checkout)).order.id, order.id);
  assert.equal(db.sql.prepare('SELECT product FROM wb_order_sources WHERE order_id=?').get(order.id).product, checkout.source);

  const exportBody = {...sample(), format: 'csv', lang: 'zh'};
  assert.equal((await trade(env, {cookie, payload: exportBody})).status, 403);
  const orderRow = db.sql.prepare('SELECT * FROM wb_orders WHERE id=?').get(order.id);
  chainState.receipt = transfer(orderRow);
  assert.equal((await bridge('check', {id: order.id, tx: TX})).order.state, 'paid');
  const activated = await (await trade(env, {cookie})).json();
  assert.equal(activated.access, 'member');
  assert.equal(activated.remaining, MEMBER_DAILY_RUNS);
  const csv = await (await trade(env, {cookie, payload: exportBody})).json();
  assert.equal(csv.ok, true);
  assert(csv.csv.includes(example.zh));

  const existingProduct = await legacyCheckout('launchdesk');
  assert.equal(existingProduct.status, 200);
  const separate = (await existingProduct.json()).order;
  assert.equal(separate.state, 'pending');
  assert.notEqual(separate.id, order.id);
});
