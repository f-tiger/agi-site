import assert from 'node:assert/strict';
import {test} from 'node:test';
import {handleTradeOpportunities} from '../functions/api/trade-opportunities.js';

const endpoint = 'https://baipiaoji.com/api/trade-opportunities';
const now = Date.parse('2026-11-22T16:00:00Z');
const notice = (fields = {}) => ({
  'publication-number': '808493-2026',
  'notice-type': 'cn-standard',
  'notice-title': {fra: 'Fourniture de mobilier', eng: 'Furniture supply'},
  'buyer-name': {pol: ['City procurement office']},
  'buyer-country': ['POL'],
  'deadline-receipt-tender-date-lot': ['2026-11-20+01:00', '2026-11-30+01:00'],
  ...fields,
});
const upstream = notices => Response.json({notices});
const run = (query, dependencies = {}, method = 'GET') => handleTradeOpportunities({
  request: new Request(endpoint + query, {method}),
}, {cache: null, now, ...dependencies});

test('query must be a single short product phrase', async () => {
  const failFetch = async () => assert.fail('Invalid input should never make a network call');
  for (const q of ['', '?q=', '?q=A', '?q=' + 'a'.repeat(65), '?q=desk&q=chair',
    '?q=desk%22%20OR%201%3D1', '?q=net%5Cwork', '?q=%3Cscript%3E', '?q=a%0Db']) {
    const response = await run(q, {fetcher: failFetch});
    assert.equal(response.status, 400, q);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.deepEqual(await response.json(), {error: 'invalid_query'});
  }
  const response = await run('?q=work%20desks', {fetcher: failFetch}, 'POST');
  assert.equal(response.status, 405);
  assert.equal(response.headers.get('Allow'), 'GET');
});

test('queries the fixed TED route and returns only a public notice summary', async () => {
  const response = await run('?q=%20Children%E2%80%99s%20%20Furniture%20&url=https://example.com', {
    fetcher: async (url, options) => {
      assert.equal(url, 'https://api.ted.europa.eu/v3/notices/search');
      assert.equal(options.method, 'POST');
      assert.equal(options.redirect, 'error');
      assert(options.signal instanceof AbortSignal);
      const body = JSON.parse(options.body);
      assert.equal(body.query, 'FT ~ "children’s furniture" AND deadline-receipt-tender-date-lot >= 20261123 AND notice-type = cn-standard SORT BY publication-date DESC');
      assert.equal(body.limit, 8);
      assert.equal(body.scope, 'ACTIVE');
      assert.equal(body.onlyLatestVersions, true);
      assert(!body.fields.some(field => field.includes('contact')));
      return upstream([notice({
        links: {htmlDirect: 'https://example.com/untrusted'},
        'buyer-contact-email': 'private@example.org',
        'payload': {other: 'internal'},
      })]);
    },
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    source: 'ted',
    opportunities: [{
      id: '808493-2026', title: 'Furniture supply', buyer: 'City procurement office',
      country: 'PL', deadline: '2026-11-30', url: 'https://ted.europa.eu/en/notice/808493-2026/html',
    }],
  });
});

test('excludes expired, unverified-date, duplicate and non-solicitation notices', async () => {
  const examples = [
    notice({'publication-number': '10-2026', 'deadline-receipt-tender-date-lot': ['2026-11-22+01:00']}),
    notice({'publication-number': '20-2026', 'deadline-receipt-tender-date-lot': ['2026-11-23+14:00']}),
    notice({'publication-number': '30-2026', 'deadline-receipt-tender-date-lot': ['2026-11-24BAD', '2026-02-30Z']}),
    notice({'publication-number': '40-2026', 'notice-type': 'can-standard'}),
    notice({'publication-number': '41-2026', 'buyer-name': {eng: ['private@example.org']}}),
    notice({'publication-number': 'javascript:alert(1)'}),
    notice(),
    notice({'buyer-country': ['POL', 'DEU']}),
    ...Array.from({length: 10}, (_, index) => notice({
      'publication-number': `${100 + index}-2026`,
      'buyer-country': index === 0 ? ['POL', 'DEU'] : index === 1 ? ['USA'] : [['POL']],
    })),
  ];
  const {opportunities} = await (await run('?q=furniture', {fetcher: async () => upstream(examples)})).json();
  assert.deepEqual(opportunities.map(result => result.id), [
    '808493-2026', '100-2026', '101-2026', '102-2026', '103-2026', '104-2026', '105-2026', '106-2026',
  ]);
  assert(opportunities.slice(1).every(result => result.country === null));
});

test('caches successful responses under the normalized product phrase', async () => {
  const entries = new Map();
  const cache = {
    async match(request) { return entries.get(request.url)?.clone(); },
    async put(request, response) { entries.set(request.url, response); },
  };
  let calls = 0;
  const fetcher = async () => { calls++; return upstream([]); };
  const first = await run('?q=%20FURNITURE%20&ignored=secret', {cache, fetcher});
  const second = await run('?q=furniture', {cache, fetcher});
  assert.deepEqual(await first.json(), {source: 'ted', opportunities: []});
  assert.deepEqual(await second.json(), {source: 'ted', opportunities: []});
  assert.equal(first.headers.get('Cache-Control'), 'public, max-age=180, s-maxage=180');
  assert.equal(calls, 1);
  assert.deepEqual([...entries.keys()], [endpoint + '?q=furniture']);
});

test('malformed, throttled and timed-out sources fail explicitly without cache writes', async () => {
  const cache = {
    async match() { throw Error('local cache offline'); },
    async put() { assert.fail('Upstream errors should not be cached'); },
  };
  for (const [fetcher, code] of [
    [async () => Response.json({notices: 'invalid'}), 502],
    [async () => new Response('rate limit', {status: 429}), 503],
    [async () => Response.json({timedOut: true, notices: []}), 503],
    [async () => { throw new DOMException('timed out', 'TimeoutError'); }, 503],
    [async () => { throw Error('transport error'); }, 502],
  ]) {
    const response = await run('?q=furniture', {cache, fetcher});
    assert.equal(response.status, code);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.deepEqual(await response.json(), {error: 'temporarily_unavailable'});
  }
});
