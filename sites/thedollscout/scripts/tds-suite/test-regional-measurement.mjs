import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {REGIONAL_ACTIONS, REGIONAL_TOOL_PATHS, regionalMeasurement, recordRegionalAction, recordRegionalPageview} from '../../collector-assets/tds-suite/regional-measurement.mjs';
import {onRequestPost} from '../../functions/api/ev.js';
import {regionalWindow, regionalReport, aggregateRegional, onRequestGet} from '../../functions/api/regional-tool-growth.js';
import {businessEvent} from '../../../../tools/fleet-analytics/business.mjs';

function browser(path = '/de/ai-tools/dach-meter-fit') {
  const sent = [], events = [];
  const win = {location: new URL('https://thedollscout.com' + path + '?private=DO_NOT_SEND#DO_NOT_SEND'),
    navigator: {userAgent: 'Mozilla/5.0'}, localStorage: {getItem: () => null},
    document: {querySelector: () => ({href: 'https://thedollscout.com' + path})},
    dispatchEvent: event => events.push(event),
    CustomEvent: class {constructor(type, options) {this.type = type;this.detail = options.detail;}},
    fetch: (url, options) => {sent.push({url, ...options, body: JSON.parse(options.body)});return Promise.resolve({status: 204});}};
  win.top = win.self = win;
  return {win, sent, events};
}

test('six exact regional routes emit only fixed actions and canonical paths through existing channels', () => {
  assert.equal(REGIONAL_TOOL_PATHS.length, 6);
  for (const path of REGIONAL_TOOL_PATHS) for (const name of REGIONAL_ACTIONS) {
    const {win, sent, events} = browser(path);
    assert.equal(recordRegionalAction(name, win), true);
    assert.deepEqual(sent.map(row => ({url: row.url, body: row.body, keepalive: row.keepalive})),
      [{url: '/api/ev', body: {p: path, e: name, r: ''}, keepalive: true}]);
    assert.deepEqual(events.map(event => ({type: event.type, detail: event.detail})), [{type: 'fleet:business', detail: {name}}]);
    assert.doesNotMatch(JSON.stringify({sent, events}), /DO_NOT_SEND|"(?:input|model|price|resultValue|session)"|affiliate_click/);
    assert.deepEqual(businessEvent('thedollscout.com', path, {name}), {name, tool_id: path.split('/').pop(), repeat: true});
  }
});

test('regional pageviews use the anonymous pageview channel with only a canonical path and immediate origin', () => {
  for (const path of REGIONAL_TOOL_PATHS) {
    const {win, sent, events} = browser(path);
    win.document.referrer = 'https://getecoback.com/private-measurement?value=DO_NOT_SEND#DO_NOT_SEND';
    assert.equal(recordRegionalPageview(win), true);
    assert.deepEqual(sent.map(row => ({url: row.url, body: row.body, keepalive: row.keepalive})),
      [{url: '/api/ev', body: {p: path, e: '', r: 'https://getecoback.com'}, keepalive: true}]);
    assert.equal(events.length, 0, 'GA4 already records its own pageview');
    assert.doesNotMatch(JSON.stringify(sent), /DO_NOT_SEND|private-measurement/);
  }
  for (const referrer of ['', 'bad', 'file:///private', 'data:text/plain,private', 'blob:https://private.example/id']) {
    const {win, sent} = browser();win.document.referrer = referrer;
    assert.equal(recordRegionalPageview(win), true);assert.equal(sent[0].body.r, '');
  }
});

test('browser gate excludes QA, privacy opt-outs, automation, previews, frames and wrong canonicals', () => {
  const edits = [
    ...['ci', '__ci', '__probe', 'qa', '__qa'].map(key => win => {win.location.search = '?' + key;}),
    win => {win.location.search = '?utm_source=verify';}, win => {win.location.hostname = 'preview.pages.dev';},
    win => {win.top = {};}, win => {win.navigator.webdriver = true;}, win => {win.navigator.doNotTrack = '1';},
    win => {win.navigator.globalPrivacyControl = true;}, win => {win.navigator.userAgent = 'HeadlessChrome';},
    win => {win.navigator.userAgent = 'OAI-SearchBot';},
    win => {win.localStorage.getItem = () => 'denied';},
    win => {win.localStorage.getItem = key => key === 'fleet_ga4_choice_v1' ? 'denied' : null;}, win => {win.localStorage.getItem = () => {throw Error('Unavailable');};},
    win => {win.document.querySelector = () => ({href: 'https://elsewhere.example/de/ai-tools/dach-meter-fit'});},
    win => {win.document.querySelector = () => ({href: 'https://thedollscout.com/de/ai-tools/dach-meter-fit?private=DO_NOT_SEND'});},
    win => {win.document.querySelector = () => ({href: 'https://thedollscout.com/ai-tools/dach-meter-fit'});},
  ];
  for (const edit of edits) {
    const {win, sent, events} = browser();edit(win);
    assert.equal(recordRegionalAction('tds_regional_result', win), false);
    assert.equal(recordRegionalPageview(win), false);assert.equal(sent.length, 0);assert.equal(events.length, 0);
  }
  for (const path of ['/ai-tools/private', '/ai-tools/categories/dach-meter-fit', '/en/ai-tools/dach-meter-fit', '/uk/indoor-laundry', '/de/ai-tools/dach-meter-fit/']) {
    const {win, sent} = browser(path);assert.equal(recordRegionalAction('tds_regional_handoff', win), false);
    assert.equal(recordRegionalPageview(win), false);assert.equal(sent.length, 0);
    assert.equal(businessEvent('thedollscout.com', path, {name: 'tds_regional_result'}), null);
  }
  const ui = browser();assert.equal(recordRegionalAction('affiliate_click', ui.win), false);
  assert.equal(businessEvent('elsewhere.example', '/ai-tools/dach-meter-fit', {name: 'tds_regional_result'}), null);
  assert.equal(businessEvent('thedollscout.com', '/ai-tools/dach-meter-fit', {name: 'tds_regional_result', value: 'DO_NOT_SEND'}), null);
  assert.equal(businessEvent('thedollscout.com', '/ai-tools/dach-meter-fit?private=DO_NOT_SEND', {name: 'tds_regional_result'}), null);
});

test('measurement fails harmlessly on network errors and rechecks withdrawal for each action', async () => {
  const ui = browser();ui.win.fetch = () => Promise.reject(Error('Offline'));
  assert.equal(recordRegionalAction('tds_regional_result', ui.win), true);
  ui.win.localStorage.getItem = () => 'denied';
  assert.equal(recordRegionalAction('tds_regional_handoff', ui.win), false);
  await Promise.resolve();
});

async function record(body, headers = {}, url = 'https://thedollscout.com/api/ev') {
  const rows = [], pending = [];
  const response = await onRequestPost({request: new Request(url, {method: 'POST',
    headers: {origin: 'https://thedollscout.com', 'user-agent': 'Mozilla/5.0', ...headers}, body: JSON.stringify(body)}),
    env: {HITS: {prepare() {return {bind(...values) {return {run: async () => {rows.push(values);}};}};}}},
    waitUntil: promise => pending.push(promise)});
  await Promise.all(pending);assert.equal(response.status, 204);return rows;
}

test('server admits only route-bound regional labels and drops extra fields or QA without downgrade', async () => {
  for (const path of REGIONAL_TOOL_PATHS) for (const name of REGIONAL_ACTIONS) {
    const body = {p: path, e: name, r: ''};assert.equal(regionalMeasurement(body), true);
    const rows = await record(body);assert.equal(rows.length, 1);
    assert.deepEqual(rows[0].slice(1), [path, path.startsWith('/de/') ? 'de' : path.startsWith('/zh/') ? 'zh' : 'en', '', '', name]);
  }
  const valid = {p: '/ai-tools/dach-meter-fit', e: 'tds_regional_result', r: ''};
  for (const edit of [
    body => {body.p = '/private';}, body => {body.p += '?input=DO_NOT_SEND';}, body => {body.p += '.html';},
    body => {body.r = 'https://amazon.de';}, body => {delete body.r;}, body => {body.item = 'DO_NOT_SEND';},
    body => {body.placement = 'guide';}, body => {body.result = 'DO_NOT_SEND';}, body => {body.e = 'tds_regional_private';},
  ]) {const body = {...valid};edit(body);assert.equal((await record(body)).length, 0);}
  for (const headers of [{'x-probe': 'test'}, {'x-qa': ''}, {dnt: '1'}, {'sec-gpc': '1'},
    {'x-analytics-consent': 'denied'}, {cookie: 'tds_analytics_choice_v1=denied'}, {'user-agent': 'Playwright'},
    {origin: 'https://other.example'}, {'sec-fetch-site': 'cross-site'}, {referer: 'https://thedollscout.com/ai-tools/dach-meter-fit?__qa=1'}])
    assert.equal((await record(valid, headers)).length, 0);
  assert.equal((await record(valid, {}, 'https://thedollscout.com/api/ev?__probe=1')).length, 0);
});

test('regional pageviews preserve only hostname and reject attached values without affecting existing pageviews', async () => {
  const valid = {p: '/de/ai-tools/dach-meter-fit', e: '', r: 'https://www.getecoback.com'};
  assert.deepEqual((await record(valid))[0].slice(1), ['/de/ai-tools/dach-meter-fit', 'de', '', 'www.getecoback.com', '']);
  for (const body of [
    {...valid, r: 'https://getecoback.com/private'}, {...valid, r: 'https://getecoback.com?value=DO_NOT_SEND'},
    {...valid, r: 'https://getecoback.com/#value=DO_NOT_SEND'}, {...valid, r: false}, {p: valid.p, e: ''},
    {...valid, p: valid.p + '?value=DO_NOT_SEND'}, {...valid, item: 'DO_NOT_SEND'},
  ]) assert.equal((await record(body)).length, 0);
  for (const headers of [{dnt: '1'}, {'sec-gpc': '1'}, {'x-probe': 'test'}, {cookie: 'tds_analytics_choice_v1=denied'}])
    assert.equal((await record(valid, headers)).length, 0);
  const existing = {p: '/de/shop/categories/smart-home', e: '', r: 'https://getecoback.com/old-path'};
  assert.equal((await record(existing))[0][4], 'getecoback.com');
});

function database({index = true} = {}) {
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE hits(d TEXT,path TEXT,lang TEXT,country TEXT,ref TEXT,ev TEXT)');
  if (index) db.exec('CREATE INDEX arbitrary_date_leading_index ON hits(d,path,ev)');
  const insert = db.prepare('INSERT INTO hits VALUES (?,?,?,?,?,?)');
  const calls = [];
  return {db, add: (d, path, ev, ref = '') => insert.run(d, path, '', '', ref, ev),
    read: async (sql, params = []) => {calls.push({sql, params});return {success: true, results: db.prepare(sql).all(...params)};}, calls};
}

test('report excludes release and incomplete days; tool and existing guide counts remain separate aggregates', async () => {
  const fixture = database();
  try {
    fixture.add('2026-11-22', '/ai-tools/dach-meter-fit', 'tds_regional_result');
    fixture.add('2026-11-23', '/de/ai-tools/dach-meter-fit', 'tds_regional_result');
    fixture.add('2026-11-23', '/de/ai-tools/dach-meter-fit', 'tds_regional_result');
    fixture.add('2026-11-23', '/de/ai-tools/dach-meter-fit', 'tds_regional_handoff');
    fixture.add('2026-11-23', '/de/ai-tools/dach-meter-fit', '', 'getecoback.com'); // Partial pageview release day.
    fixture.add('2026-11-24', '/de/ai-tools/dach-meter-fit', '', 'getecoback.com');
    fixture.add('2026-11-24', '/de/ai-tools/dach-meter-fit', '', 'www.getecoback.com');
    fixture.add('2026-11-24', '/de/ai-tools/dach-meter-fit', '', 'getecoback.com.example');
    fixture.add('2026-11-24', '/de/ai-tools/dach-meter-fit', '', 'direct');
    fixture.add('2026-11-24', '/zh/ai-tools/uk-laundry-session', '', 'google.com');
    fixture.add('2026-11-24', '/zh/ai-tools/uk-laundry-session', 'tds_regional_result');
    fixture.add('2026-11-24', '/zh/ai-tools/uk-laundry-session', 'tds_regional_handoff');
    fixture.add('2026-11-24', '/de/shop/categories/smart-home', '');
    fixture.add('2026-11-24', '/de/shop/categories/smart-home', 'affiliate_click', 'amazon.de');
    fixture.add('2026-11-24', '/de/shop/categories/smart-home', 'affiliate_click', 'amazon.com');
    fixture.add('2026-11-24', '/uk/indoor-laundry', '');
    fixture.add('2026-11-24', '/uk/indoor-laundry', 'market_shop_click', 'amazon.co.uk');
    fixture.add('2026-11-24', '/uk/indoor-laundry', 'market_source_click', 'www.meaco.com');
    fixture.add('2026-11-24', '/ai-tools/unrelated', 'tds_regional_result');
    fixture.add('2026-11-25', '/ai-tools/uk-laundry-session', 'tds_regional_result');
    fixture.add('2026-11-25', '/ai-tools/uk-laundry-session', '', 'getecoback.com');
    const report = await regionalReport(fixture.read, new Date('2026-11-25T10:00:00Z'));
    assert.deepEqual(report.measuredWindow, {start: '2026-11-23', end_exclusive: '2026-11-25'});
    assert.deepEqual(report.pageviewMeasuredWindow, {start: '2026-11-24', end_exclusive: '2026-11-25'});
    assert.equal(report.coveredDays, 2);
    assert.deepEqual(report.counts, {result_events: 3, guide_handoff_clicks: 2, pageviews: 5, eco_referred_pageviews: 2});
    assert.deepEqual(report.tools.map(tool => tool.counts), [
      {result_events: 2, guide_handoff_clicks: 1, pageviews: 4, eco_referred_pageviews: 2},
      {result_events: 1, guide_handoff_clicks: 1, pageviews: 1, eco_referred_pageviews: 0},
    ]);
    assert.deepEqual(report.tools[0].daily.filter(row => /pageview/.test(row.event)), [
      {date: '2026-11-24', path: '/de/ai-tools/dach-meter-fit', event: 'eco_referred_pageview', n: 2},
      {date: '2026-11-24', path: '/de/ai-tools/dach-meter-fit', event: 'pageview', n: 4},
    ]);
    assert.deepEqual(report.guides.map(guide => guide.counts), [
      {pageviews: 1, amazon_de_affiliate_clicks: 1, amazon_uk_ordinary_shop_clicks: null, official_source_clicks: null},
      {pageviews: 1, amazon_de_affiliate_clicks: null, amazon_uk_ordinary_shop_clicks: 1, official_source_clicks: 1},
    ]);
    assert.match(report.notes, /not a joined funnel/);assert.match(report.notes, /no confirmed affiliate tag/);
    assert.ok(fixture.calls.some(call => call.sql.startsWith('EXPLAIN QUERY PLAN ')));
    assert.doesNotMatch(JSON.stringify(report), /amazon\.com|unrelated|getecoback\.com|google\.com/);
  } finally {fixture.db.close();}
});

test('pending coverage, unavailable data and a successfully queried zero have distinct states', async () => {
  const pending = await regionalReport(async () => assert.fail('No pre-coverage database query'), new Date('2026-11-23T23:59:00Z'));
  assert.equal(pending.coverage, 'pending_first_complete_day');assert.equal(pending.counts, null);assert.equal(pending.pageviewMeasuredWindow, null);
  assert.ok(pending.tools.every(tool => tool.counts === null));assert.ok(pending.guides.every(guide => guide.counts === null));
  const fixture = database();
  try {
    const partial = await regionalReport(fixture.read, new Date('2026-11-24T10:00:00Z'));
    assert.equal(partial.pageviewMeasuredWindow, null);
    assert.deepEqual(partial.counts, {result_events: 0, guide_handoff_clicks: 0, pageviews: null, eco_referred_pageviews: null});
    const zero = await regionalReport(fixture.read, new Date('2026-11-25T10:00:00Z'));
    assert.deepEqual(zero.counts, {result_events: 0, guide_handoff_clicks: 0, pageviews: 0, eco_referred_pageviews: 0});
  }
  finally {fixture.db.close();}
  const unindexed = database({index: false});
  try {await assert.rejects(regionalReport(unindexed.read, new Date('2026-11-24T10:00:00Z')), /date index/);}
  finally {unindexed.db.close();}
  await assert.rejects(regionalReport(async () => ({success: false, results: []}), new Date('2026-11-24T10:00:00Z')));
  const response = await onRequestGet({request: new Request('https://thedollscout.com/api/regional-tool-growth'), env: {}});
  assert.equal(response.status, 503);assert.equal(response.headers.get('x-robots-tag'), 'noindex');
  assert.deepEqual(await response.json(), {ok: false, error: 'no_db', counts: null});
  const window = regionalWindow(new Date('2026-12-30T10:00:00Z'));
  assert.equal(window.coveredDays, 28);
  const row = {d: '2026-12-20', path: '/ai-tools/dach-meter-fit', ev: '', merchant: '', n: 1, eco_n: 1};
  for (const invalid of [{n: 'DO_NOT_SEND'}, {eco_n: null}, {eco_n: 2}, {eco_n: -1}, {ev: 'tds_regional_result'}])
    assert.throws(() => aggregateRegional([{...row, ...invalid}], window), /Invalid aggregate/);
});
