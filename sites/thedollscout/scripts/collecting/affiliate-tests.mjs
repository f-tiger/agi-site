import test from 'node:test';
import assert from 'node:assert/strict';
import {affiliatePayload, installAffiliateMeasurement} from '../../collector-assets/affiliate-measurement.mjs';
import {onRequestPost} from '../../functions/api/ev.js';

function browser({path = '/shop', query = '?search=PRIVATE#PRIVATE', canonical, host = 'thedollscout.com', navigator = {}, denied = false, storageUnavailable = false, embedded = false} = {}) {
  const listeners = [], sent = [];
  const window = {};window.top = window.self = window;if (embedded) window.top = {};
  const runtime = {
    window, location: new URL('https://' + host + path + query),
    navigator: {userAgent: 'Mozilla/5.0', ...navigator},
    localStorage: {getItem() {if (storageUnavailable) throw Error('Unavailable');return denied ? 'denied' : null;}},
    document: {querySelector() {return {href: canonical || 'https://thedollscout.com' + path};}, addEventListener(type, listener) {assert.equal(type, 'click');listeners.push(listener);}},
    fetch(url, options) {sent.push({url, body: JSON.parse(options.body)});return Promise.resolve({status: 204});}
  };
  const event = (href = 'https://www.amazon.com/s?k=PRIVATE&tag=ecoback0d-20#PRIVATE', {trusted = true, sponsored = true} = {}) => ({isTrusted: trusted, target: {closest(selector) {assert.equal(selector, 'a[rel~="sponsored"]');return sponsored ? {href} : null;}}});
  return {runtime, event, sent, listeners, deny() {denied = true;}};
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
