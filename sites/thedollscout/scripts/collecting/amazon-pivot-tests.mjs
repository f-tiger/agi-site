import test from 'node:test';
import assert from 'node:assert/strict';
import {buildShopping, shoppingHomeHTML, shoppingHomeText} from './shopping.mjs';
import {locales, origin, route} from './content.mjs';
import {SHOPPING_IDS, SHOPPING_PATHS, SHOPPING_EXACT_ITEMS, shoppingLinkPayload, shoppingMeasurement, decodeShoppingRef} from '../../collector-assets/shopping-contract.mjs';
import {affiliatePayload, installAffiliateMeasurement} from '../../collector-assets/affiliate-measurement.mjs';
import {onRequestPost} from '../../functions/api/ev.js';
import {aggregateShopping, shoppingWindow} from '../../functions/api/shopping-growth.js';
import {readShortlist, validateSelection} from '../../collector-assets/shopping-shortlist.mjs';

const esc = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const decode = value => value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
// These are generated, quoted attributes; no network or browser parser is needed.
function attributes(source) {
  const attrs = {};
  for (const match of source.matchAll(/([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) attrs[match[1]] = decode(match[2] ?? match[3] ?? match[4] ?? '');
  return attrs;
}
function anchors(html) {
  return [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map(match => ({attrs: attributes(match[1]), text: decode(match[2].replace(/<[^>]*>/g, ' ')).trim()}));
}
function mainRegion(html) {
  const match = /<section\b[^>]*\bdata-amazon-shopping(?=[\s=>])[^>]*>/.exec(html);
  assert.ok(match, 'Every canonical shopping page needs its Amazon task section');
  const start = match.index + match[0].length, sections = /<\/?section\b[^>]*>/g;
  sections.lastIndex = start;
  let depth = 1, section;
  while ((section = sections.exec(html))) {
    depth += section[0].startsWith('</') ? -1 : 1;
    if (!depth) return html.slice(start, section.index);
  }
  assert.fail('Amazon section must close, including nested model reference sections');
}
function pages() {
  const rendered = new Map();
  buildShopping({emit: (lang, slug, title, intro, html, text) => rendered.set(route(lang, slug), {lang, slug, html, text}), route, esc, locales, origin});
  for (const lang of Object.keys(locales)) rendered.set(route(lang), {lang, slug: '', html: shoppingHomeHTML({lang, route, esc}), text: shoppingHomeText(lang, route, origin)});
  return rendered;
}
const rendered = pages();

function linkPayload(path, link) {
  const a = link.attrs;
  return shoppingLinkPayload({p: path, href: a.href, item: a['data-shopping-item'], placement: a['data-shopping-placement'],
    affiliate: (a.rel || '').split(/\s+/).includes('sponsored'), official: Object.hasOwn(a, 'data-shopping-official')});
}
async function submit(payload, {headers = {}, url = origin + '/api/ev'} = {}) {
  const rows = [], pending = [];
  const response = await onRequestPost({request: new Request(url, {method: 'POST',
    headers: {origin, 'user-agent': 'Mozilla/5.0', 'cf-ipcountry': 'GB', ...headers}, body: JSON.stringify(payload)}),
    env: {HITS: {prepare(sql) {
      assert.match(sql, /^INSERT INTO hits \(d, path, lang, country, ref, ev\) VALUES/);
      return {bind: (...values) => ({run: async () => {rows.push(values);}})};
    }}}, waitUntil: promise => pending.push(promise)});
  await Promise.all(pending); assert.equal(response.status, 204); return rows;
}

test('All 18 rendered canonical entry points distinguish type searches from verified US ASINs and reach the existing event writer once', async () => {
  assert.deepEqual([...rendered.keys()].sort(), [...SHOPPING_PATHS].sort());
  const observedExact = new Set();
  for (const [path, page] of rendered) {
    const region = mainRegion(page.html), german = page.lang === 'de';
    const tasks = [...region.matchAll(/data-amazon-task="([^"]+)"/g)].map(match => match[1]);
    const expectedTasks = page.slug.includes('/') ? [page.slug.split('/')[1]] : ['display-cases', 'storage-transport', 'plush-display', 'collector-gifts'];
    assert.deepEqual([...new Set(tasks)].sort(), expectedTasks.sort(), path);
    const destinations = anchors(region).filter(link => (link.attrs.rel || '').split(/\s+/).includes('sponsored'));
    assert.ok(destinations.length >= expectedTasks.length, path + ': usable task search exits');
    let searches = 0;
    for (const link of destinations) {
      const url = new URL(link.attrs.href), item = link.attrs['data-shopping-item'];
      assert.equal(url.protocol, 'https:'); assert.equal(url.hostname, german ? 'www.amazon.de' : 'www.amazon.com', path);
      assert.deepEqual(url.searchParams.getAll('tag'), [german ? 'getecoback-21' : 'ecoback0d-20']);
      assert.equal(url.username + url.password + url.port, '');
      for (const rel of ['sponsored', 'nofollow', 'noopener']) assert.ok(link.attrs.rel.split(/\s+/).includes(rel));
      if (item) {
        assert.equal(german, false, 'No unverified German exact product exit');
        assert.ok(['niubee-risers', 'rub-4l'].includes(item)); observedExact.add(item);
        assert.equal(url.pathname, '/dp/' + SHOPPING_EXACT_ITEMS[item].asin);
        assert.ok(['card', 'guide'].includes(link.attrs['data-shopping-placement']));
        assert.equal(Object.hasOwn(link.attrs, 'data-shopping-official'), false);
      } else {
        searches++;
        assert.equal(url.pathname, '/s'); assert.ok(url.searchParams.get('k'));
        assert.equal(Object.hasOwn(link.attrs, 'data-shopping-placement'), false, 'A type search cannot inherit exact product metadata');
        assert.ok(Object.hasOwn(link.attrs, 'data-shopping-merchant'));
        assert.match(link.text, /search|suchen|suche|搜索|搜尋/i, 'Search CTA must identify its destination type');
      }
      const payload = linkPayload(path, link); assert.ok(payload, path + ' ' + link.attrs.href);
      assert.equal(payload.e, 'affiliate_click');
      assert.equal(payload.r, german ? 'https://amazon.de' : 'https://amazon.com');
      const rows = await submit(payload); assert.equal(rows.length, 1);
      assert.equal(rows[0][1], path); assert.equal(rows[0][2], page.lang);
      assert.equal(rows[0][3], 'GB', 'Request country remains independent from language and shopping destination');
      assert.equal(rows[0][5], 'affiliate_click');
      assert.equal(rows[0][4], item ? `s1|amazon.com|${item}|${link.attrs['data-shopping-placement']}` : german ? 'amazon.de' : 'amazon.com');
      assert.doesNotMatch(JSON.stringify(rows), /[?&](?:k|tag)=|\/dp\/|B000KN4DQ4|B07KN5G9CQ/);
    }
    assert.ok(searches >= expectedTasks.length, path + ': every task has a type-search route');
    assert.doesNotMatch(page.text.join('\n'), /https?:\/\/(?:www\.)?amazon\.|[?&]tag=/, 'Machine mirrors omit affiliate URLs');
  }
  assert.deepEqual([...observedExact].sort(), ['niubee-risers', 'rub-4l']);
});

test('The new exact storage item is US-only, cannot impersonate a search or another ASIN, and never sends query values', async () => {
  const valid = {p: '/shop/storage-transport', href: 'https://www.amazon.com/dp/B000KN4DQ4?tag=ecoback0d-20&private=PRIVATE', item: 'rub-4l', placement: 'guide', affiliate: true};
  const payload = shoppingLinkPayload(valid);
  assert.deepEqual(payload, {p: valid.p, e: 'affiliate_click', r: 'https://amazon.com', item: 'rub-4l', placement: 'guide'});
  assert.doesNotMatch(JSON.stringify(await submit(payload)), /PRIVATE/);
  for (const edit of [
    value => {value.p = '/de/shop/storage-transport';}, value => {value.item = ['rub-4l'];}, value => {value.item = 'samla';},
    value => {value.href = 'https://amazon.com/s?k=Really+Useful+Box&tag=ecoback0d-20';},
    value => {value.href = 'https://amazon.com/dp/B07KN5G9CQ?tag=ecoback0d-20';},
    value => {value.href = 'https://amazon.de/dp/B000KN4DQ4?tag=getecoback-21';},
    value => {value.href = 'https://amazon.com/dp/B000KN4DQ4?tag=ecoback0d-20&tag=OTHER';},
    value => {value.href = 'https://amazon.com.evil.example/dp/B000KN4DQ4?tag=ecoback0d-20';},
    value => {value.href = 'https://amazon.com:8443/dp/B000KN4DQ4?tag=ecoback0d-20';},
    value => {delete value.placement;}, value => {value.official = true;}
  ]) {const value = {...valid}; edit(value); assert.equal(shoppingLinkPayload(value), null);}
  assert.equal(shoppingMeasurement({...payload, p: '/de/shop/storage-transport'}), null);
  assert.equal(shoppingMeasurement({...payload, item: ['rub-4l']}), null);
  assert.equal(shoppingMeasurement({...payload, r: 'https://amazon.com/?private=PRIVATE'}), null);
});

function browser(path, link, options = {}) {
  const listeners = [], sent = [], events = [], window = {};
  window.top = window.self = window; window.dispatchEvent = event => events.push(event);
  if (options.embedded) window.top = {};
  const a = link.attrs;
  const anchor = {href: a.href, getAttribute: name => a[name] ?? null, hasAttribute: name => Object.hasOwn(a, name),
    relList: {contains: name => (a.rel || '').split(/\s+/).includes(name)}};
  const runtime = {window, location: new URL(origin + path + (options.query || '')),
    navigator: {userAgent: 'Mozilla/5.0', ...options.navigator},
    localStorage: {getItem: () => {if (options.storageFailure) throw Error('Unavailable'); return options.denied ? 'denied' : null;}},
    document: {querySelector: () => ({href: origin + path}), addEventListener: (name, listener) => {assert.equal(name, 'click'); listeners.push(listener);}},
    fetch: async (url, init) => {assert.equal(url, '/api/ev'); sent.push(JSON.parse(init.body)); return {status: 204};}};
  return {runtime, listeners, sent, events, event: () => ({isTrusted: options.trusted !== false, target: {closest: () => anchor}})};
}

test('Generated search and exact anchors retain trusted-click/privacy gates and a single affiliate owner', async () => {
  const links = anchors(mainRegion(rendered.get('/shop').html));
  const samples = [links.find(link => Object.hasOwn(link.attrs, 'data-shopping-merchant') && !link.attrs['data-shopping-item']),
    links.find(link => link.attrs['data-shopping-item'] === 'rub-4l')];
  assert.ok(samples.every(Boolean));
  for (const link of samples) {
    const ui = browser('/shop', link);
    installAffiliateMeasurement(ui.runtime); installAffiliateMeasurement(ui.runtime);
    assert.equal(ui.listeners.length, 1);
    ui.listeners[0](ui.event()); assert.equal(ui.sent.length, 1);
    assert.deepEqual(ui.sent[0], linkPayload('/shop', link));
    ui.listeners[0](ui.event()); assert.equal(ui.sent.length, 2, 'A second actual click is a separate action');
    assert.deepEqual(ui.events, [], 'Affiliate GA4 belongs only to the shared delegated listener');
    for (const options of [{query: '?__ci=1'}, {query: '?__qa=1'}, {denied: true}, {storageFailure: true}, {embedded: true}, {trusted: false},
      {navigator: {doNotTrack: '1'}}, {navigator: {globalPrivacyControl: true}}, {navigator: {webdriver: true}}, {navigator: {userAgent: 'HeadlessChrome'}}]) {
      const excluded = browser('/shop', link, options);
      assert.equal(affiliatePayload(excluded.event(), excluded.runtime), null);
      installAffiliateMeasurement(excluded.runtime); excluded.listeners[0](excluded.event());
      assert.deepEqual(excluded.sent, []); assert.deepEqual(excluded.events, []);
    }
    const payload = linkPayload('/shop', link);
    for (const options of [{url: origin + '/api/ev?__ci=1'}, {headers: {'x-probe': ''}}, {headers: {dnt: '1'}},
      {headers: {'sec-gpc': '1'}}, {headers: {'user-agent': 'HeadlessChrome'}}, {headers: {origin: 'https://elsewhere.example'}}])
      assert.deepEqual(await submit(payload, options), []);
  }
});

test('Old encoded tuples and saved six-item shortlists survive the new storefront without historical aggregate failures', () => {
  const oldIDs = ['blaliden', 'baggebo', 'lustigt', 'samla', 'my-bestie', 'niubee-risers'];
  assert.deepEqual(SHOPPING_IDS, oldIDs);
  const rows = [];
  for (const item of oldIDs) for (const placement of ['card', 'compare', 'guide']) for (const path of ['/shop', '/de/shop', '/zh/shop']) {
    if (item === 'niubee-risers' && path === '/de/shop') continue;
    const merchant = item === 'niubee-risers' ? 'amazon.com' : item === 'my-bestie' ? 'sonnyangelstore.com' : 'ikea.com';
    const ev = item === 'niubee-risers' ? 'affiliate_click' : 'shopping_official_click';
    const ref = `s1|${merchant}|${item}|${placement}`;
    assert.deepEqual(decodeShoppingRef(ev, path, ref), {merchant, item, placement});
    rows.push({d: '2026-11-08', path, country_code: 'GB', ev, shopping_ref: ref, n: 1});
  }
  assert.deepEqual(aggregateShopping(rows, shoppingWindow(new Date('2026-11-13T12:00:00Z'))).counts,
    {pageviews: 0, affiliate_clicks: 6, official_clicks: 45, compare_actions: 0});
  assert.deepEqual(decodeShoppingRef('affiliate_click', '/shop', 'amazon.com'), {merchant: 'amazon.com', item: 'unknown', placement: 'unknown'});
  const ids = ['blaliden', 'samla', 'niubee-risers'];
  assert.deepEqual(readShortlist({getItem: () => JSON.stringify({version: 1, ids})}, 'US'), {state: 'saved', ids});
  assert.throws(() => validateSelection(['rub-4l']), /Invalid shortlist/, 'The new exact card does not silently change saved-shortlist scope');
});
