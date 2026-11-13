import test from 'node:test';
import assert from 'node:assert/strict';
import {affiliatePayload, installAffiliateMeasurement, recordShoppingCompare} from '../../collector-assets/affiliate-measurement.mjs';
import {SHOPPING_IDS, SHOPPING_PLACEMENTS, SHOPPING_TUPLES, shoppingLinkPayload, shoppingMeasurement, shoppingMarket, shoppingItemAllowed} from '../../collector-assets/shopping-contract.mjs';
import {onRequestPost} from '../../functions/api/ev.js';

function browser({path = '/shop', query = '?search=PRIVATE#PRIVATE', canonical, host = 'thedollscout.com', navigator = {}, denied = false, storageUnavailable = false, embedded = false} = {}) {
  const listeners = [], sent = [], events = [];
  const window = {dispatchEvent: event => events.push(event)};window.top = window.self = window;if (embedded) window.top = {};
  const runtime = {
    window, location: new URL('https://' + host + path + query),
    CustomEvent: class {constructor(type, options) {this.type = type; this.detail = options.detail;}},
    navigator: {userAgent: 'Mozilla/5.0', ...navigator},
    localStorage: {getItem() {if (storageUnavailable) throw Error('Unavailable');return denied ? 'denied' : null;}},
    document: {querySelector() {return {href: canonical || 'https://thedollscout.com' + path};}, addEventListener(type, listener) {assert.equal(type, 'click');listeners.push(listener);}},
    fetch(url, options) {sent.push({url, body: JSON.parse(options.body)});return Promise.resolve({status: 204});}
  };
  const event = (href = 'https://www.amazon.com/s?k=PRIVATE&tag=ecoback0d-20#PRIVATE', {trusted = true, sponsored = true, official = false, item, placement} = {}) => ({isTrusted: trusted, target: {closest(selector) {
    assert.equal(selector, 'a[rel~="sponsored"],a[data-shopping-official]');
    return sponsored || official ? {href, relList: {contains: name => sponsored && name === 'sponsored'},
      hasAttribute: name => official && name === 'data-shopping-official',
      getAttribute: name => ({'data-shopping-item': item, 'data-shopping-placement': placement})[name] ?? null} : null;
  }}});
  return {runtime, event, sent, events, listeners, deny() {denied = true;}};
}

test('shopping clicks send only canonical route, fixed action and merchant host across all languages', () => {
  for (const lang of ['', 'de/', 'zh/']) for (const slug of ['', 'shop', 'shop/display-cases', 'shop/storage-transport', 'shop/plush-display', 'shop/collector-gifts']) {
    const path = '/' + lang + slug;
    const ui = browser({path});
    const merchant = lang === 'de/' ? 'https://www.amazon.de/s?k=PRIVATE&tag=getecoback-21' : undefined;
    assert.deepEqual(affiliatePayload(ui.event(merchant), ui.runtime), {p: path, e: 'affiliate_click', r: lang === 'de/' ? 'https://amazon.de' : 'https://amazon.com'});
  }
});

test('QA, bots, previews, private routes, frames and privacy exclusions never create merchant counts', () => {
  const cases = [
    ...['ci', '__ci', '__probe', 'qa', '__qa'].map(key => ({query: '?' + key})),
    {query: '?utm_source=verify'}, {host: 'preview.pages.dev'}, {host: 'localhost'}, {embedded: true},
    {navigator: {webdriver: true}}, {navigator: {userAgent: 'HeadlessChrome'}},
    {navigator: {globalPrivacyControl: true}}, {navigator: {doNotTrack: '1'}},
    {denied: true}, {storageUnavailable: true}, {path: '/members'}, {path: '/shop/PRIVATE'},
    {path: '/__ci/shop'}, {canonical: 'https://foreign.example/shop'},
    {canonical: 'https://thedollscout.com/shop?private=value'}, {canonical: 'https://thedollscout.com/'}
  ];
  for (const options of cases) {const ui = browser(options);assert.equal(affiliatePayload(ui.event(), ui.runtime), null, JSON.stringify(options));}
  const ui = browser();
  assert.equal(affiliatePayload(ui.event(undefined, {trusted: false}), ui.runtime), null);
  assert.equal(affiliatePayload(ui.event(undefined, {sponsored: false}), ui.runtime), null);
});

test('only explicit HTTPS affiliate tags on known marketplaces are counted', () => {
  const ui = browser();
  for (const href of [
    'https://amazon.de/s?tag=ecoback0d-20', 'https://amazon.com/s?tag=getecoback-21',
    'https://amazon.com/s', 'https://amazon.com/s?tag=someone-20',
    'https://amazon.com.evil.example/s?tag=ecoback0d-20', 'http://amazon.com/s?tag=ecoback0d-20',
    'https://user@amazon.com/s?tag=ecoback0d-20', 'https://amazon.com:8443/s?tag=ecoback0d-20',
    'https://amazon.com/s?tag=ecoback0d-20&tag=someone-20'
  ]) assert.equal(affiliatePayload(ui.event(href), ui.runtime), null, href);
});

test('one listener records repeated real clicks, stops on withdrawal, and does not dispatch a second GA4 event', async () => {
  const ui = browser();
  ui.runtime.window.dispatchEvent = () => assert.fail('GA4 is owned by fleet analytics');
  installAffiliateMeasurement(ui.runtime);installAffiliateMeasurement(ui.runtime);
  assert.equal(ui.listeners.length, 1);
  ui.listeners[0](ui.event());ui.listeners[0](ui.event());
  assert.equal(ui.sent.length, 2);
  assert.doesNotMatch(JSON.stringify(ui.sent), /PRIVATE|tag=|search/);
  ui.deny();ui.listeners[0](ui.event());assert.equal(ui.sent.length, 2);
  const failing = browser();failing.runtime.fetch = () => Promise.reject(Error('Offline'));
  installAffiliateMeasurement(failing.runtime);assert.doesNotThrow(() => failing.listeners[0](failing.event()));
  await Promise.resolve();
});

test('the existing endpoint accepts the payload and stores only the merchant hostname', async () => {
  const ui = browser({path: '/de/shop/display-cases'}), rows = [], pending = [];
  const payload = affiliatePayload(ui.event('https://amazon.de/s?tag=getecoback-21&k=PRIVATE'), ui.runtime);
  const response = await onRequestPost({
    request: new Request('https://thedollscout.com/api/ev', {method: 'POST', headers: {origin: 'https://thedollscout.com', 'user-agent': 'Mozilla/5.0'}, body: JSON.stringify(payload)}),
    env: {HITS: {prepare() {return {bind(...values) {return {async run() {rows.push(values);}};}};}}},
    waitUntil(promise) {pending.push(promise);}
  });
  await Promise.all(pending);assert.equal(response.status, 204);assert.equal(rows.length, 1);
  assert.deepEqual(rows[0].slice(1), ['/de/shop/display-cases', 'de', '', 'amazon.de', 'affiliate_click']);
});

const official = {sponsored: false, official: true, item: 'blaliden', placement: 'card'};
const blaliden = 'https://www.ikea.com/us/en/p/blaliden-glass-door-cabinet-black-00520519/';
const niubee = 'https://www.amazon.com/dp/B07KN5G9CQ?tag=ecoback0d-20';
test('Item and placement measurement requires a verified product link and the correct local market', () => {
  const ui = browser();
  assert.deepEqual(affiliatePayload(ui.event(blaliden, official), ui.runtime),
    {p: '/shop', e: 'shopping_official_click', r: 'https://ikea.com/us/en/', item: 'blaliden', placement: 'card'});
  for (const placement of SHOPPING_PLACEMENTS) assert.deepEqual(affiliatePayload(ui.event(niubee, {item: 'niubee-risers', placement}), ui.runtime),
    {p: '/shop', e: 'affiliate_click', r: 'https://amazon.com', item: 'niubee-risers', placement});
  const de = browser({path: '/de/shop'});
  assert.equal(affiliatePayload(de.event(niubee, {item: 'niubee-risers', placement: 'card'}), de.runtime), null);
  assert.equal(affiliatePayload(de.event(blaliden, official), de.runtime), null);
  assert.equal(affiliatePayload(ui.event('https://www.ikea.com/de/de/p/blaliden-vitrine-schwarz-00520519/', official), ui.runtime), null);
  for (const path of ['/shop', '/de/shop', '/zh/shop']) {
    const context = browser({path}), event = context.event('https://www.sonnyangelstore.com/en/products/mybestiecase2', {...official, item: 'my-bestie'});
    assert.equal(affiliatePayload(event, context.runtime)?.r, 'https://sonnyangelstore.com');
  }
  for (const [href, attrs] of [
    [blaliden, {...official, item: 'baggebo'}], [blaliden, {...official, placement: 'PRIVATE'}], [blaliden, {...official, item: undefined}],
    [blaliden, {...official, sponsored: true}], [blaliden + '?PRIVATE', official], [blaliden + '#PRIVATE', official],
    [niubee, {item: 'PRIVATE', placement: 'card'}], [niubee, {item: 'niubee-risers'}], [niubee, {placement: 'card'}],
    ['https://amazon.com/dp/B000PRIVATE?tag=ecoback0d-20', {item: 'niubee-risers', placement: 'card'}],
    ['https://amazon.com/s?tag=ecoback0d-20', {item: 'niubee-risers', placement: 'card'}],
    ['https://amazon.de/s?tag=getecoback-21', {}]
  ]) assert.equal(affiliatePayload(ui.event(href, attrs), ui.runtime), null, href + JSON.stringify(attrs));
});

test('The shared contract preserves six shortlist IDs and admits only fixed product/market/placement tuples', () => {
  assert.equal(SHOPPING_IDS.length, 6);
  assert.deepEqual([...new Set(SHOPPING_TUPLES.map(tuple => tuple.item))], [...SHOPPING_IDS, 'rub-4l']);
  for (const item of [...SHOPPING_IDS, 'rub-4l']) assert.deepEqual(SHOPPING_TUPLES.filter(tuple => tuple.item === item).map(tuple => tuple.placement), ['card', 'compare', 'guide']);
  assert.equal(shoppingMarket('/zh/shop'), 'US'); assert.equal(shoppingMarket('/de/shop'), 'DE');
  assert.equal(shoppingMarket('/uk/shop'), null); assert.equal(shoppingItemAllowed('niubee-risers', 'DE'), false);
  assert.ok(SHOPPING_TUPLES.every(tuple => tuple.ref.length <= 60));
  for (const item of ['blaliden', 'baggebo', 'lustigt', 'samla']) for (const market of ['US', 'DE'])
    for (const placement of SHOPPING_PLACEMENTS) assert.ok(shoppingMeasurement({p: market === 'DE' ? '/de/shop' : '/shop',
      e: 'shopping_official_click', r: market === 'DE' ? 'https://ikea.com/de/de/' : 'https://ikea.com/us/en/', item, placement}));
  assert.equal(shoppingLinkPayload({p: '/shop', href: blaliden, official: true, item: 'blaliden', placement: 'card'})?.e, 'shopping_official_click');
});

test('A completed comparison sends one fixed action per trusted click without selected items in either measurement channel', () => {
  const ui = browser(), event = ui.event();
  assert.equal(recordShoppingCompare(ui.event(), ['blaliden', 'baggebo', 'lustigt', 'samla'], ui.runtime), false);
  assert.equal(recordShoppingCompare(event, ['blaliden', 'baggebo'], ui.runtime), true);
  assert.equal(recordShoppingCompare(event, ['blaliden', 'baggebo'], ui.runtime), false);
  assert.deepEqual(ui.sent, [{url: '/api/ev', body: {p: '/shop', e: 'shopping_compare', r: ''}}]);
  assert.equal(ui.events.length, 1);
  assert.deepEqual({type: ui.events[0].type, detail: ui.events[0].detail}, {type: 'fleet:business', detail: {name: 'shopping_compare'}});
  for (const selected of [[], ['blaliden'], ['blaliden', 'blaliden'], ['blaliden', 'PRIVATE'], 'PRIVATE'])
    assert.equal(recordShoppingCompare(ui.event(), selected, ui.runtime), false);
  assert.equal(recordShoppingCompare(ui.event(undefined, {trusted: false}), ['blaliden', 'baggebo'], ui.runtime), false);
  const de = browser({path: '/de/shop'});
  assert.equal(recordShoppingCompare(de.event(), ['blaliden', 'niubee-risers'], de.runtime), false);
  for (const options of [{query: '?__ci'}, {denied: true}, {storageUnavailable: true}, {navigator: {globalPrivacyControl: true}},
    {navigator: {doNotTrack: '1'}}, {navigator: {webdriver: true}}, {navigator: {userAgent: 'HeadlessChrome'}}]) {
    const excluded = browser(options);
    assert.equal(recordShoppingCompare(excluded.event(), ['blaliden', 'baggebo'], excluded.runtime), false);
    assert.equal(affiliatePayload(excluded.event(blaliden, official), excluded.runtime), null);
    assert.equal(excluded.sent.length, 0); assert.equal(excluded.events.length, 0);
  }
});

test('Official source exits send one fixed GA4 bridge event while affiliate exits keep the shared delegated owner', () => {
  const ui = browser(); installAffiliateMeasurement(ui.runtime);
  ui.listeners[0](ui.event(blaliden, official));
  assert.equal(ui.events.length, 1);
  assert.deepEqual({type: ui.events[0].type, detail: ui.events[0].detail}, {type: 'fleet:business', detail: {name: 'shopping_official_click'}});
  ui.listeners[0](ui.event(niubee, {item: 'niubee-risers', placement: 'card'}));
  assert.equal(ui.events.length, 1); assert.equal(ui.sent.length, 2);
  ui.deny(); ui.listeners[0](ui.event(blaliden, official));
  assert.equal(ui.events.length, 1); assert.equal(ui.sent.length, 2);
  assert.doesNotMatch(JSON.stringify(ui.events), /blaliden|niubee|card|placement|amazon|ikea/);
});

async function record(body, options = {}) {
  const rows = [], pending = [];
  const response = await onRequestPost({
    request: new Request(options.url || 'https://thedollscout.com/api/ev', {method: 'POST',
      headers: {origin: 'https://thedollscout.com', 'user-agent': 'Mozilla/5.0', ...options.headers}, body: JSON.stringify(body)}),
    env: {HITS: {prepare() {return {bind(...values) {return {async run() {rows.push(values);}};}};}}},
    waitUntil(promise) {pending.push(promise);}
  });
  await Promise.all(pending); assert.equal(response.status, 204); return rows;
}

test('Server stores one compatible affiliate row, separate official source clicks and fixed comparison actions', async () => {
  const ui = browser(), item = affiliatePayload(ui.event(niubee, {item: 'niubee-risers', placement: 'compare'}), ui.runtime);
  let rows = await record(item); assert.equal(rows.length, 1);
  assert.deepEqual(rows[0].slice(1), ['/shop', 'en', '', 's1|amazon.com|niubee-risers|compare', 'affiliate_click']);
  rows = await record(affiliatePayload(ui.event(blaliden, official), ui.runtime));
  assert.deepEqual(rows[0].slice(1), ['/shop', 'en', '', 's1|ikea.com|blaliden|card', 'shopping_official_click']);
  rows = await record({p: '/shop', e: 'shopping_compare', r: ''});
  assert.deepEqual(rows[0].slice(1), ['/shop', 'en', '', '', 'shopping_compare']);
  rows = await record({p: '/display-calculator', e: 'affiliate_click', r: 'https://amazon.de/s?k=PRIVATE'});
  assert.deepEqual(rows[0].slice(1), ['/display-calculator', 'en', '', 'amazon.de', 'affiliate_click']);
  rows = await record({p: '/shop', e: '', r: 'https://search.example/private?q=PRIVATE'});
  assert.deepEqual(rows[0].slice(1), ['/shop', 'en', '', 'search.example', '']);
});

test('Server rejects forged or incomplete metadata, wrong product/market/event pairs, and QA without downgrading to an unlabelled click', async () => {
  const valid = {p: '/shop', e: 'affiliate_click', r: 'https://amazon.com', item: 'niubee-risers', placement: 'card'};
  for (const edit of [
    body => {body.item = 'PRIVATE';}, body => {body.placement = 'PRIVATE';}, body => {delete body.item;}, body => {delete body.placement;},
    body => {body.item = null;}, body => {body.item = ['niubee-risers'];}, body => {body.placement = {value: 'card'};},
    body => {body.item = 'blaliden';}, body => {body.p = '/de/shop';}, body => {body.p = '/shop?private';},
    body => {body.p = '/members';}, body => {body.r = 'https://amazon.de';}, body => {body.r = 'https://amazon.com/?private';},
    body => {body.r = 's1|amazon.com|niubee-risers|card';}, body => {body.r = 'https://ikea.com/us/en/';},
    body => {body.e = '';}, body => {body.e = 'shopping_compare';}, body => {body.e = 'shopping_official_click';},
    body => {body.country = 'DE';}, body => {body.selected = ['PRIVATE'];}
  ]) {const body = {...valid}; edit(body); assert.equal((await record(body)).length, 0, JSON.stringify(body));}
  for (const body of [
    {p: '/shop', e: 'shopping_official_click', r: 'https://ikea.com'},
    {p: '/shop', e: 'shopping_official_click', r: 'https://ikea.com/de/de/', item: 'blaliden', placement: 'card'},
    {p: '/shop', e: 'shopping_compare', r: 'https://amazon.com'},
    {p: '/shop', e: 'shopping_compare', r: '', item: 'blaliden', placement: 'compare'},
    {p: '/members', e: 'shopping_compare', r: ''}
  ]) assert.equal((await record(body)).length, 0, JSON.stringify(body));
  for (const body of [valid, {p: '/shop', e: 'shopping_compare', r: ''},
    {p: '/shop', e: 'shopping_official_click', r: 'https://ikea.com/us/en/', item: 'blaliden', placement: 'card'}])
    for (const options of [{url: 'https://thedollscout.com/api/ev?__ci=1'}, {headers: {'x-probe': ''}},
      {headers: {'user-agent': 'HeadlessChrome'}}, {headers: {dnt: '1'}}, {headers: {'sec-gpc': '1'}},
      {headers: {origin: 'https://foreign.example'}}]) assert.equal((await record(body, options)).length, 0);
});
