import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {onRequestGet as growth, SHOPPING_PATHS, SHOPPING_QUERY, CACHE_SECONDS, SCHEMA_VERSION, shoppingWindow, shoppingQueryWithPlan, aggregateShopping} from '../../functions/api/shopping-growth.js';
import {SHOPPING_TUPLES, shoppingTupleAllowed} from '../../collector-assets/shopping-contract.mjs';
import {usesDateRangeIndex} from '../../functions/api/collector-growth.js';
import {onRequestPost as beacon} from '../../functions/api/ev.js';
import {shoppingSlugs} from './shopping.mjs';

function database(index = 'real_shopping_date_index') {
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE hits(d TEXT,path TEXT,lang TEXT,country TEXT,ref TEXT,ev TEXT)');
  if (index) db.exec(`CREATE INDEX ${index} ON hits(d)`);
  return db;
}
function contextForDB(db) {
  const calls = [], params = [];
  return {calls, params, request: new Request('https://thedollscout.com/api/shopping-growth', {headers: {'x-probe': 'shopping-test'}}),
    env: {HITS: {prepare(sql) {
      calls.push(sql);
      return {bind(...args) { params.push(args); return {async all() {return {success: true, results: db.prepare(sql).all(...args), meta: {rows_read: 0}};}};}};
    }}}};
}
async function atDate(value, callback) {
  const Original = globalThis.Date;
  globalThis.Date = class extends Original {constructor(...args) {super(...(args.length ? args : [value]));} static now() {return new Original(value).getTime();}};
  try {return await callback();} finally {globalThis.Date = Original;}
}
const firstWindow = shoppingWindow(new Date('2026-11-09T12:00:00Z'));
const validRow = () => ({d: '2026-11-08', path: '/shop/display-cases', country_code: 'US', ev: 'affiliate_click', merchant: 'amazon.com', item: 'unknown', placement: 'unknown', n: 1});

test('Shopping scope matches the deployed home and five guide routes in all three languages', () => {
  assert.deepEqual(SHOPPING_PATHS, ['/', '/de/', '/zh/'].flatMap(prefix => ['', ...shoppingSlugs].map(path => prefix + path)));
  assert.equal(SHOPPING_PATHS.length, 18);
  assert.ok(SHOPPING_PATHS.every(path => !path.includes('__ci')));
});

test('The release day and today are excluded; the first complete day appears only on November 9', () => {
  for (const now of ['2026-11-07T00:00:00Z', '2026-11-08T23:59:59Z']) {
    const window = shoppingWindow(new Date(now));
    assert.equal(window.coveredDays, 0); assert.equal(window.measuredWindow, null);
    assert.equal(window.coverage, 'pending_first_complete_day'); assert.equal(window.full28Days, false);
  }
  assert.equal(firstWindow.coveredDays, 1);
  assert.deepEqual(firstWindow.measuredWindow, {start: '2026-11-08', end_exclusive: '2026-11-09'});
  assert.equal(shoppingWindow(new Date('2026-12-05T12:00:00Z')).coveredDays, 27);
  const full = shoppingWindow(new Date('2026-12-06T00:00:00Z'));
  assert.equal(full.coveredDays, 28); assert.equal(full.full28Days, true);
  assert.deepEqual(full.measuredWindow, full.expected28dWindow);
  assert.deepEqual(shoppingWindow(new Date('2027-01-01T12:00:00Z')).measuredWindow, {start: '2026-12-04', end_exclusive: '2027-01-01'});
});

test('Real indexed SQL groups country/path/day/action and exposes only fixed merchants, excluding QA and unrelated routes', () => {
  const db = database(), insert = db.prepare('INSERT INTO hits(d,path,country,ev,ref) VALUES (?,?,?,?,?)');
  for (const [d, p, c, e, r] of [
    ['2026-11-07', '/shop', 'US', '', 'PRIVATE'],
    ['2026-11-08', '/shop', 'GB', '', 'PRIVATE referral'],
    ['2026-11-08', '/shop', 'gb', '', 'PRIVATE second referral'],
    ['2026-11-08', '/shop/display-cases', 'US', 'affiliate_click', 'amazon.com'],
    ['2026-11-08', '/de/shop/display-cases', 'DE', 'affiliate_click', 'amazon.de'],
    ['2026-11-08', '/zh/', 'CN', 'affiliate_click', 'amazon.com'],
    ['2026-11-08', '/shop', '', 'affiliate_click', 'PRIVATE merchant'],
    ['2026-11-08', '/shop', 'XX', 'affiliate_click', 'PRIVATE other merchant'],
    ['2026-11-08', '/shop', 'T1', 'affiliate_click', 'amazon.de'],
    ['2026-11-08', '/shop', 'ZZ', '', 'PRIVATE'],
    ['2026-11-08', '/shop', 'PRIVATE country', '', 'PRIVATE'],
    ['2026-11-08', '/members', 'US', 'affiliate_click', 'amazon.com'],
    ['2026-11-08', '/__ci/shop', 'US', 'affiliate_click', 'amazon.com'],
    ['2026-11-08', '/shop?__ci=1', 'US', 'affiliate_click', 'amazon.com'],
    ['2026-11-08', '/shop', 'US', 'collection_save', 'PRIVATE'],
    ['2026-11-09', '/shop', 'US', '', 'PRIVATE']
  ]) insert.run(d, p, c, e, r);
  const bounds = ['2026-11-08', '2026-11-09'];
  assert.equal(usesDateRangeIndex(db.prepare('EXPLAIN QUERY PLAN ' + SHOPPING_QUERY).all(...bounds)), true);
  const rows = db.prepare(SHOPPING_QUERY).all(...bounds), report = aggregateShopping(rows, firstWindow);
  assert.doesNotMatch(JSON.stringify(rows), /PRIVATE|__ci|collection_save|members/);
  assert.deepEqual(report.counts, {pageviews: 4, affiliate_clicks: 6, official_clicks: 0, compare_actions: 0});
  assert.equal(report.daily.find(row => row.country === 'GB').n, 2);
  assert.equal(report.daily.find(row => row.country === 'unknown' && row.merchant === 'unknown').n, 2);
  assert.equal(report.daily.find(row => row.country === 'unknown' && row.merchant === 'amazon.de').n, 1);
  assert.ok(report.daily.filter(row => row.event === 'pageview').every(row => row.merchant === null && row.item === null && row.placement === null));
  assert.ok(report.daily.filter(row => row.event === 'affiliate_click').every(row => row.item === 'unknown' && row.placement === 'unknown'));
  assert.ok(report.daily.every(row => row.date === '2026-11-08'));
  db.close();
});

test('SQLite retains existing affiliate totals while grouping known items, placement and separate official/compare actions', () => {
  const db = database(), insert = db.prepare('INSERT INTO hits(d,path,country,ev,ref) VALUES (?,?,?,?,?)');
  for (const path of SHOPPING_PATHS) {
    insert.run('2026-11-08', path, 'US', '', 'PRIVATE referrer');
    insert.run('2026-11-08', path, 'US', 'shopping_compare', '');
    insert.run('2026-11-08', path, 'US', 'affiliate_click', path.startsWith('/de/') ? 'amazon.de' : 'amazon.com');
    for (const tuple of SHOPPING_TUPLES) if (shoppingTupleAllowed({path, ...tuple}))
      insert.run('2026-11-08', path, 'US', tuple.event, tuple.ref);
  }
  const rows = db.prepare(SHOPPING_QUERY).all('2026-11-08', '2026-11-09'), report = aggregateShopping(rows, firstWindow);
  assert.deepEqual(report.counts, {pageviews: 18, affiliate_clicks: 54, official_clicks: 270, compare_actions: 18});
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM hits WHERE ev='affiliate_click'").get().n, report.counts.affiliate_clicks);
  assert.ok(report.daily.filter(row => row.event === 'shopping_compare').every(row => row.merchant === null && row.item === null && row.placement === null));
  for (const placement of ['card', 'compare', 'guide']) assert.equal(report.daily.filter(row => row.item === 'niubee-risers' && row.placement === placement).length, 12);
  assert.equal(report.daily.filter(row => row.item === 'my-bestie').length, 54);
  assert.doesNotMatch(JSON.stringify(report), /PRIVATE|s1\||selected/);
  db.close();
});

test('Malformed stored metadata and wrong market/event tuples make the report unavailable without exposing raw labels', async () => {
  for (const [path, event, ref] of [
    ['/shop', 'affiliate_click', 's1|amazon.com|PRIVATE|card'],
    ['/de/shop', 'affiliate_click', 's1|amazon.com|niubee-risers|card'],
    ['/shop', 'affiliate_click', 's1|ikea.com|blaliden|card'],
    ['/shop', 'shopping_official_click', 's1|amazon.com|niubee-risers|card'],
    ['/shop', 'shopping_official_click', 's1|ikea.com|blaliden|PRIVATE'],
    ['/shop', 'shopping_official_click', 'PRIVATE'],
    ['/shop', 'shopping_compare', 'PRIVATE selected items']
  ]) {
    const db = database(); db.prepare('INSERT INTO hits(d,path,country,ev,ref) VALUES (?,?,?,?,?)').run('2026-11-08', path, 'US', event, ref);
    const rows = db.prepare(SHOPPING_QUERY).all('2026-11-08', '2026-11-09');
    assert.doesNotMatch(JSON.stringify(rows), /PRIVATE/);
    assert.throws(() => aggregateShopping(rows, firstWindow), /Invalid/);
    await atDate('2026-11-09T12:00:00Z', async () => {
      const response = await growth(contextForDB(db)), report = await response.json();
      assert.equal(response.status, 503); assert.equal(report.counts, null); assert.equal(report.error, 'query_failed');
      assert.doesNotMatch(JSON.stringify(report), /PRIVATE/);
    });
    db.close();
  }
});

test('Malformed dates, counts, dimensions and duplicate groups fail instead of becoming zeros or leaking data', () => {
  for (const edit of [
    row => {row.d = '2026-11-07';}, row => {row.d = '2026-11-09';}, row => {row.d = '2026-11-08PRIVATE';},
    row => {row.country_code = 'PRIVATE';}, row => {row.path = '/shop#PRIVATE';}, row => {row.path = '/__ci/shop';},
    row => {row.ev = 'PRIVATE';}, row => {row.merchant = 'PRIVATE';}, row => {row.ev = '';},
    ...[-1, 0, 1.5, null, '1', Number.MAX_SAFE_INTEGER + 1].map(n => row => {row.n = n;})
  ]) {const row = validRow(); edit(row); assert.throws(() => aggregateShopping([row], firstWindow), /Invalid shopping aggregate/);}
  const invalidDateWindow = {coveredDays: 28, measuredWindow: {start: '2027-02-10', end_exclusive: '2027-03-10'}};
  assert.throws(() => aggregateShopping([{...validRow(), d: '2027-02-30'}], invalidDateWindow), /Invalid shopping aggregate/);
  assert.throws(() => aggregateShopping([validRow(), validRow()], firstWindow), /Duplicate/);
  assert.throws(() => aggregateShopping([{...validRow(), n: Number.MAX_SAFE_INTEGER}, {...validRow(), country_code: 'DE'}], firstWindow), /overflow/);
  assert.throws(() => aggregateShopping([], shoppingWindow(new Date('2026-11-07T12:00:00Z'))), /No complete/);
});

test('Endpoint distinguishes pending coverage, measured zero and unavailable data without scanning pending dates', async () => {
  const db = database(), ctx = contextForDB(db);
  await atDate('2026-11-08T23:59:59Z', async () => {
    const response = await growth(ctx), report = await response.json();
    assert.equal(response.status, 200); assert.equal(report.counts, null); assert.deepEqual(report.daily, []);
    assert.equal(report.coverage, 'pending_first_complete_day'); assert.equal(report.query_rows_read, 0);
    assert.ok(ctx.calls.every(sql => /^(EXPLAIN|PRAGMA)/.test(sql)));
    assert.equal(response.headers.get('x-robots-tag'), 'noindex');
  });
  await atDate('2026-11-09T12:00:00Z', async () => {
    const report = await (await growth(ctx)).json();
    assert.deepEqual(report.counts, {pageviews: 0, affiliate_clicks: 0, official_clicks: 0, compare_actions: 0}); assert.equal(report.coveredDays, 1);
    assert.equal(report.schema_version, SCHEMA_VERSION);
    assert.equal(report.unit, 'anonymous_events_not_users'); assert.equal(report.cache_seconds, 300);
    assert.equal(ctx.calls.filter(sql => sql.startsWith('SELECT')).length, 1);
    assert.deepEqual(ctx.params.at(-1), ['2026-11-08', '2026-11-09']);
  });
  const noDB = await growth({env: {}}); assert.equal(noDB.status, 503); assert.equal((await noDB.json()).counts, null);
  const broken = contextForDB(db); broken.env.HITS.prepare = () => {throw Error('D1 daily quota exceeded PRIVATE');};
  const response = await growth(broken), report = await response.json();
  assert.equal(response.status, 503); assert.equal(report.reason, 'daily_limit'); assert.equal(report.counts, null);
  assert.doesNotMatch(JSON.stringify(report), /PRIVATE/); db.close();
});

test('An event-index preference falls back to a verified real date index; the endpoint remains read-only with one bounded data query', async () => {
  const db = database(); db.exec('CREATE INDEX hits_events ON hits(ev)');
  const bounds = ['2026-11-08', '2026-11-09'];
  assert.equal(usesDateRangeIndex(db.prepare('EXPLAIN QUERY PLAN ' + SHOPPING_QUERY).all(...bounds)), false);
  const ctx = contextForDB(db);
  await atDate('2026-11-09T12:00:00Z', async () => assert.equal((await growth(ctx)).status, 200));
  const selects = ctx.calls.filter(sql => sql.startsWith('SELECT'));
  assert.equal(selects.length, 1); assert.match(selects[0], /INDEXED BY "real_shopping_date_index"/);
  assert.match(selects[0], /LIMIT 10001$/); assert.ok(ctx.calls.every(sql => /^(EXPLAIN|PRAGMA|SELECT)/.test(sql)));
  db.close();
});

test('Missing, partial and unusable date indexes stop before any data scan', async () => {
  for (const statement of ['', "CREATE INDEX partial_date ON hits(d) WHERE ev='affiliate_click'", 'CREATE INDEX expression_date ON hits(substr(d,1,4),d)', 'CREATE INDEX event_only ON hits(ev)']) {
    const db = database(''); if (statement) db.exec(statement);
    const ctx = contextForDB(db), response = await growth(ctx), report = await response.json();
    assert.equal(response.status, 503, statement); assert.equal(report.counts, null); assert.equal(report.error, 'missing_date_index');
    assert.ok(ctx.calls.every(sql => /^(EXPLAIN|PRAGMA)/.test(sql))); db.close();
  }
  const read = async sql => ({results: sql.startsWith('PRAGMA index_list') ? [{name: 'date_index', partial: 0}] :
    sql.startsWith('PRAGMA index_info') ? [{seqno: 0, cid: 0, name: 'd'}] : [{detail: 'SCAN hits USING INDEX date_index'}]});
  await assert.rejects(() => shoppingQueryWithPlan(read, ['2026-11-08', '2026-11-09']), /Date index plan rejected/);
  await assert.rejects(() => shoppingQueryWithPlan(async () => ({success: false, results: []}), ['2026-11-08', '2026-11-09']));
});

test('A composite index is safe when its real plan applies both date bounds', async () => {
  const db = database(''); db.exec('CREATE INDEX event_and_date ON hits(ev,d)');
  const ctx = contextForDB(db);
  await atDate('2026-11-09T12:00:00Z', async () => assert.equal((await growth(ctx)).status, 200));
  assert.equal(ctx.calls.filter(sql => sql.startsWith('SELECT')).length, 1);
  assert.equal(ctx.calls.filter(sql => sql.startsWith('PRAGMA')).length, 0);
  db.close();
});

test('The ordinary five-minute aggregate cache ignores arbitrary URL input and never stores failure, overflow or invalid results', async () => {
  const previous = globalThis.caches, stored = new Map();
  globalThis.caches = {default: {async match(key) {return stored.get(key.url)?.clone();}, async put(key, response) {stored.set(key.url, response);}}};
  try {await atDate('2026-11-09T12:00:00Z', async () => {
    const db = database(), ctx = contextForDB(db); ctx.request = new Request('https://thedollscout.com/api/shopping-growth');
    stored.set(ctx.request.url, Response.json({ok: true, schema_version: 1, counts: {pageviews: 99999}}));
    const first = await growth(ctx); assert.equal(first.headers.get('x-tds-aggregate-cache'), 'miss');
    assert.equal(first.headers.get('cache-control'), 'public, max-age=' + CACHE_SECONDS);
    assert.equal((await first.json()).schema_version, 2);
    assert.ok(stored.has('https://thedollscout.com/api/shopping-growth/schema-2'));
    ctx.request = new Request('https://thedollscout.com/api/shopping-growth?start=2000-01-01&path=PRIVATE');
    const second = await growth(ctx); assert.equal(second.headers.get('x-tds-aggregate-cache'), 'hit');
    assert.equal(ctx.calls.filter(sql => sql.startsWith('SELECT')).length, 1);
    assert.doesNotMatch(JSON.stringify(await second.json()), /PRIVATE/); stored.clear();
    for (const value of [{success: false, results: []}, {}, {results: Array(10001).fill({})}, {results: [{...validRow(), n: -1}]}]) {
      const broken = contextForDB(db); broken.request = ctx.request;
      broken.env.HITS.prepare = sql => ({bind: () => ({all: async () => sql.startsWith('EXPLAIN') ? {results: [{detail: 'SEARCH hits USING INDEX d (d>? AND d<?)'}]} : value})});
      const response = await growth(broken), report = await response.json();
      assert.equal(response.status, 503); assert.equal(report.counts, null); assert.equal(stored.size, 0);
    }
    db.close();
  });} finally {if (previous === undefined) delete globalThis.caches; else globalThis.caches = previous;}
});

test('Server collection excludes shopping QA actions and arbitrary payloads before writing', async () => {
  for (const options of [
    {p: '/shop?__ci=1'}, {p: '/__ci/shop'}, {url: 'https://thedollscout.com/api/ev?__qa=1'},
    {headers: {'x-probe': ''}}, {headers: {'user-agent': 'tds-ci-selfcheck/1.0'}},
    {headers: {dnt: '1'}}, {headers: {'sec-gpc': '1'}}, {extra: {customer: 'PRIVATE'}}
  ]) {
    const writes = [], pending = [], HITS = {prepare: () => ({bind: (...args) => ({run: async () => {writes.push(args);}})})};
    const request = new Request(options.url || 'https://thedollscout.com/api/ev', {method: 'POST',
      headers: {origin: 'https://thedollscout.com', 'user-agent': 'Mozilla/5.0', ...options.headers},
      body: JSON.stringify({p: options.p || '/shop', e: 'affiliate_click', r: 'https://amazon.com', ...options.extra})});
    assert.equal((await beacon({request, env: {HITS}, waitUntil: promise => pending.push(promise)})).status, 204);
    await Promise.all(pending); assert.equal(writes.length, 0, JSON.stringify(options));
  }
});
