import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {
  SHOPPING_PATHS, SHOPPING_EXACT_ITEMS,
  shoppingMarket, shoppingLinkPayload, shoppingMeasurement,
  shoppingTupleAllowed, readShoppingTupleAllowed, decodeShoppingRef
} from '../../collector-assets/shopping-contract.mjs';
import {SHOPPING_QUERY, shoppingWindow, aggregateShopping} from '../../functions/api/shopping-growth.js';
import {langOf, onRequestPost} from '../../functions/api/ev.js';
import {collectorEventAllowed} from '../../lib/collector-measurement.js';
import {WINTER_HUMIDITY_PATH, WINTER_HUMIDITY_ANCHOR, WINTER_HUMIDITY_EVENT, winterHumidityArrival} from '../../collector-assets/winter-humidity-referral.mjs';

async function record(body, headers = {}) {
  const rows = [], pending = [];
  const response = await onRequestPost({
    request: new Request('https://thedollscout.com/api/ev', {
      method: 'POST', headers: {origin: 'https://thedollscout.com', 'user-agent': 'Mozilla/5.0', ...headers},
      body: JSON.stringify(body)
    }),
    env: {HITS: {prepare() {return {bind(...values) {return {async run() {rows.push(values);}};}};}}},
    waitUntil(promise) {pending.push(promise);}
  });
  await Promise.all(pending);
  assert.equal(response.status, 204);
  return rows;
}

test('German root and explicit English home use separate current markets without rewriting the historic eighteen-path scope', () => {
  assert.equal(shoppingMarket('/'), 'DE');
  assert.equal(shoppingMarket('/en/'), 'US');
  assert.equal(shoppingMarket('/de/shop'), 'DE');
  assert.equal(shoppingMarket('/shop'), 'US');
  assert.equal(shoppingMarket('/zh/'), 'US');
  assert.deepEqual(SHOPPING_PATHS, ['/', '/de/', '/zh/'].flatMap(prefix =>
    ['', 'shop', 'shop/display-cases', 'shop/storage-transport', 'shop/plush-display', 'shop/collector-gifts'].map(slug => prefix + slug)));
  assert.equal(SHOPPING_PATHS.length, 18);
  assert.ok(!SHOPPING_PATHS.includes('/en/'));
  for (const path of ['/en/private', '/en/shop', '/?private=value', '/members', '/uk/'])
    assert.equal(shoppingMarket(path), null, path);
});

test('current German root exits are DE merchant searches while the two verified US identities stay on US routes', () => {
  const payload = shoppingLinkPayload({p: '/', affiliate: true,
    href: 'https://www.amazon.de/s?k=PRIVATE+MODEL&tag=getecoback-21#PRIVATE'});
  assert.deepEqual(payload, {p: '/', e: 'affiliate_click', r: 'https://amazon.de'});
  assert.doesNotMatch(JSON.stringify(payload), /PRIVATE|tag=|item|placement/);
  assert.equal(shoppingLinkPayload({p: '/', affiliate: true,
    href: 'https://www.amazon.com/s?k=PRIVATE&tag=ecoback0d-20'}), null);
  assert.equal(shoppingLinkPayload({p: '/en/', affiliate: true,
    href: 'https://www.amazon.de/s?k=PRIVATE&tag=getecoback-21'}), null);
  for (const [item, exact] of Object.entries(SHOPPING_EXACT_ITEMS)) {
    const tuple = {event: 'affiliate_click', merchant: 'amazon.com', item, placement: 'card'};
    const href = `https://amazon.com/dp/${exact.asin}?tag=ecoback0d-20`;
    assert.equal(shoppingTupleAllowed({path: '/', ...tuple}), false, item);
    assert.equal(shoppingLinkPayload({p: '/', href, item, placement: 'card', affiliate: true}), null);
    assert.equal(shoppingMeasurement({p: '/', e: tuple.event, r: 'https://amazon.com', item, placement: 'card'}), null);
    assert.equal(shoppingTupleAllowed({path: '/en/', ...tuple}), true, item);
    assert.deepEqual(shoppingLinkPayload({p: '/en/', href, item, placement: 'card', affiliate: true}),
      {p: '/en/', e: 'affiliate_click', r: 'https://amazon.com', item, placement: 'card'});
  }
});

test('stored root-US item labels remain readable independently of stricter live root admission', () => {
  for (const item of Object.keys(SHOPPING_EXACT_ITEMS)) {
    const tuple = {path: '/', event: 'affiliate_click', merchant: 'amazon.com', item, placement: 'guide'};
    assert.equal(shoppingTupleAllowed(tuple), false);
    assert.equal(readShoppingTupleAllowed(tuple), true);
    assert.deepEqual(decodeShoppingRef(tuple.event, '/', `s1|amazon.com|${item}|guide`),
      {merchant: 'amazon.com', item, placement: 'guide'});
    assert.equal(readShoppingTupleAllowed({...tuple, path: '/de/shop'}), false);
    assert.equal(decodeShoppingRef(tuple.event, '/de/shop', `s1|amazon.com|${item}|guide`), null);
  }
  assert.equal(readShoppingTupleAllowed({path: '/', event: 'affiliate_click', merchant: 'amazon.com', item: 'PRIVATE', placement: 'card'}), false);
  assert.equal(decodeShoppingRef('affiliate_click', '/', 's1|amazon.com|PRIVATE|card'), null);
});

test('real aggregate SQL retains old root US tuples and new German root events without backfilling the English-home route', () => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec('CREATE TABLE hits(d TEXT,path TEXT,lang TEXT,country TEXT,ref TEXT,ev TEXT); CREATE INDEX test_date ON hits(d)');
    const insert = db.prepare('INSERT INTO hits(d,path,lang,country,ref,ev) VALUES (?,?,?,?,?,?)');
    insert.run('2026-11-08', '/', 'en', 'US', 's1|amazon.com|niubee-risers|card', 'affiliate_click');
    insert.run('2026-11-14', '/', 'en', 'US', 's1|amazon.com|rub-4l|guide', 'affiliate_click');
    insert.run('2026-11-15', '/', 'de', 'DE', 'amazon.de', 'affiliate_click');
    insert.run('2026-11-15', '/', 'de', 'DE', '', '');
    insert.run('2026-11-14', '/de/', 'de', 'DE', 's1|ikea.com|blaliden|card', 'shopping_official_click');
    insert.run('2026-11-15', '/en/', 'en', 'US', 's1|amazon.com|niubee-risers|card', 'affiliate_click');
    const window = shoppingWindow(new Date('2026-11-16T00:00:00Z'));
    const rows = db.prepare(SHOPPING_QUERY).all(window.measuredWindow.start, window.measuredWindow.end_exclusive);
    const report = aggregateShopping(rows, window);
    assert.deepEqual(report.counts, {pageviews: 1, affiliate_clicks: 3, official_clicks: 1, compare_actions: 0});
    assert.equal(report.daily.find(row => row.item === 'niubee-risers').date, '2026-11-08');
    assert.equal(report.daily.find(row => row.item === 'rub-4l').date, '2026-11-14');
    assert.ok(report.daily.some(row => row.date === '2026-11-15' && row.path === '/' && row.merchant === 'amazon.de'));
    assert.ok(report.daily.every(row => row.path !== '/en/'));
    assert.deepEqual(db.prepare('SELECT lang FROM hits WHERE path=? ORDER BY d,ev').all('/').map(row => row.lang), ['en', 'en', 'de', 'de']);
    assert.throws(() => aggregateShopping([{d: '2026-11-15', path: '/en/', country_code: 'US', ev: 'affiliate_click',
      merchant: 'amazon.com', item: 'niubee-risers', placement: 'card', n: 1}], window), /Invalid shopping aggregate/);
  } finally {db.close();}
});

test('new endpoint writes derive German root language and English-home language without accepting fabricated root-US metadata', async () => {
  assert.equal(langOf('/'), 'de');
  assert.equal(langOf('/en/'), 'en');
  assert.equal(langOf('/de/shop'), 'de');
  assert.equal(langOf('/shop'), 'en');
  const de = await record({p: '/', e: 'affiliate_click', r: 'https://amazon.de'});
  assert.deepEqual(de[0].slice(1), ['/', 'de', '', 'amazon.de', 'affiliate_click']);
  const en = await record({p: '/en/', e: 'affiliate_click', r: 'https://amazon.com', item: 'niubee-risers', placement: 'card'});
  assert.deepEqual(en[0].slice(1), ['/en/', 'en', '', 's1|amazon.com|niubee-risers|card', 'affiliate_click']);
  assert.deepEqual(await record({p: '/', e: 'affiliate_click', r: 'https://amazon.com', item: 'niubee-risers', placement: 'card'}), []);
  assert.deepEqual(await record({p: '/', e: 'affiliate_click', r: 'https://amazon.de', item: 'rub-4l', placement: 'card'}), []);
});

test('English-home cloud events retain fixed capability admission and QA/privacy exclusions', async () => {
  for (const e of ['collection_cloud_save', 'collection_cloud_restore', 'collection_cloud_delete']) {
    assert.equal(collectorEventAllowed(e, '/en/'), true);
    assert.equal(collectorEventAllowed(e, '/en/private'), false);
    const rows = await record({p: '/en/', e, r: ''});
    assert.equal(rows.length, 1);
    assert.equal(rows[0][2], 'en');
    for (const headers of [{'x-probe': '1'}, {dnt: '1'}, {'sec-gpc': '1'}, {'x-analytics-consent': 'denied'},
      {cookie: 'tds_analytics_choice_v1=denied'}])
      assert.deepEqual(await record({p: '/en/', e, r: ''}, headers), []);
    assert.deepEqual(await record({p: '/en/?__qa=1', e, r: ''}), []);
  }
});

test('humidity arrivals require the exact region, anchor and EcoBack origin and keep the same privacy gates', async () => {
  const payload = winterHumidityArrival(WINTER_HUMIDITY_PATH, WINTER_HUMIDITY_ANCHOR, 'https://www.getecoback.com');
  assert.deepEqual(payload, {p: WINTER_HUMIDITY_PATH, e: WINTER_HUMIDITY_EVENT, r: 'https://getecoback.com'});
  assert.deepEqual((await record(payload)).map(row => row.slice(1)), [[WINTER_HUMIDITY_PATH, 'de', '', 'getecoback.com', WINTER_HUMIDITY_EVENT]]);
  for (const ref of ['', 'https://getecoback.com.evil.test', 'https://getecoback.com/private'])
    assert.equal(winterHumidityArrival(WINTER_HUMIDITY_PATH, WINTER_HUMIDITY_ANCHOR, ref), null);
  assert.equal(winterHumidityArrival(WINTER_HUMIDITY_PATH, '#strommessung', payload.r), null);
  assert.equal(winterHumidityArrival('/shop/categories/smart-home', WINTER_HUMIDITY_ANCHOR, payload.r), null);
  for (const other of [{p: payload.p + '?x=1'}, {r: payload.r + '/private'}, {item: 'CUSTOM'}, {r: ''}])
    assert.deepEqual(await record({...payload, ...other}), []);
  for (const header of [{'x-probe': '1'}, {'sec-gpc': '1'}, {dnt: '1'}, {cookie: 'tds_analytics_choice_v1=denied'}])
    assert.deepEqual(await record(payload, header), []);
});
