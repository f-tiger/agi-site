import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {affiliateMeta} from '../src/affiliate-meta.mjs';
import {AFFILIATE_SQL, affiliateMetrics} from '../src/affiliate-metrics.mjs';
import worker from '../src/worker.js';

const product = 'https://www.amazon.de/dp/B07NC5CP6F?tag=getecoback-21';
async function record(body) {
  const rows = [];
  const env = {EVENTS: {prepare(sql) {
    assert.match(sql, /^INSERT INTO ev/);
    return {bind(...values) {return {run: async () => {rows.push(values);}};}};
  }}};
  const request = new Request('https://getecoback.com/api/ev', {
    method: 'POST', headers: {'content-type': 'text/plain', 'user-agent': 'Mozilla/5.0'},
    body: JSON.stringify(body),
  });
  const response = await worker.fetch(request, env, {waitUntil() {}});
  return {status: response.status, body: await response.json(), rows};
}

test('long merged affiliate metadata survives the real handler as complete JSON', async () => {
  const meta = {link_url: 'https://www.amazon.de/' + 'product-title-'.repeat(50) +
    '/dp/B07NC5CP6F/ref=private-path?tag=getecoback-21&email=private@example.test#token',
    page_path: '/guide/luftentfeuchter-25-qm.html?email=private@example.test#token',
    source: 'toppick', merchant: 'amazon', page: '/guide/luftentfeuchter-25-qm.html',
    email: 'private@example.test', private_input: {token: 'secret'}};
  assert.throws(() => JSON.parse(JSON.stringify(meta).slice(0, 200)), SyntaxError);
  const result = await record({n: 'affiliate_click', p: '/guide/luftentfeuchter-25-qm.html',
    r: 'https://www.bing.com/search?q=private', m: meta});
  assert.equal(result.status, 200); assert.equal(result.body.ok, true);
  assert.equal(result.rows.length, 1);
  const [, name, page, ref, stored] = result.rows[0];
  assert.equal(name, 'affiliate_click'); assert.equal(page, '/guide/luftentfeuchter-25-qm.html');
  assert.equal(ref, 'www.bing.com');
  assert.deepEqual(JSON.parse(stored), {source: 'toppick', merchant: 'amazon',
    page: '/guide/luftentfeuchter-25-qm.html', page_path: '/guide/luftentfeuchter-25-qm.html', link_url: product});
  assert.doesNotMatch(stored, /private|secret|email|token/);
});

test('quotes, backslashes and Unicode stay valid with per-field UTF-8 bounds', () => {
  const small = '"\\ Kühler 🧊';
  assert.equal(JSON.parse(affiliateMeta({source: small})).source, small);
  for (const value of ['"\\'.repeat(1000), '🧊'.repeat(1000), '漢'.repeat(1000), '\ud800'.repeat(1000)]) {
    const stored = affiliateMeta({source: value, merchant: value, page: '/' + 'a'.repeat(190),
      page_path: '/' + 'b'.repeat(190), link_url: 'https://example.test/' + 'a'.repeat(175)});
    const parsed = JSON.parse(stored);
    assert.ok(Buffer.byteLength(stored) < 768);
    assert.ok(Buffer.byteLength(JSON.stringify(parsed.source)) <= 48);
    assert.ok(Buffer.byteLength(JSON.stringify(parsed.merchant)) <= 32);
  }
});

test('unexpected shapes and unknown fields never become metadata', async () => {
  for (const m of [null, [], ['source'], true, 3, 'string', {source: {}, merchant: [], link_url: 1},
    {email: 'private@example.test', args: 'secret'}, JSON.parse('{"__proto__":{"source":"hidden"}}')]) {
    assert.equal(affiliateMeta(m), '{}');
    const result = await record({n: 'affiliate_click', p: '/guide/example.html', m});
    assert.equal(result.body.ok, true); assert.equal(result.rows[0][4], '{}');
  }
  for (const body of [null, [], 'string', 1]) {
    const result = await record(body);
    assert.equal(result.status, 400); assert.deepEqual(result.rows, []);
  }
});

test('URLs retain only existing valid marketplace tags and public destinations', () => {
  for (const [input, expected] of [
    ['https://www.amazon.de/s?k=private+search&tag=getecoback-21&session=secret#secret', 'https://www.amazon.de/s?tag=getecoback-21'],
    ['https://amazon.de/s/private-medical-query?tag=getecoback-21', 'https://amazon.de/s?tag=getecoback-21'],
    ['https://amazon.de/s/ref=private/private@example.test?tag=getecoback-21', 'https://amazon.de/s?tag=getecoback-21'],
    ['https://amazon.de/primegratistesten/ref=private?tag=getecoback-21', 'https://amazon.de/primegratistesten?tag=getecoback-21'],
    ['https://www.amazon.com/gp/product/B000000000/ref=secret?tag=ecoback0d-20&email=secret', 'https://www.amazon.com/gp/product/B000000000?tag=ecoback0d-20'],
    ['https://amazon.de/s?tag=secret&k=secret', 'https://amazon.de/s'],
    ['https://amazon.de/s?tag=ecoback0d-20', 'https://amazon.de/s'],
    ['https://amazon.de.evil.test/s?tag=getecoback-21', 'https://amazon.de.evil.test/s'],
    ['https://example.test/offer?email=secret#secret', 'https://example.test/offer'],
    ['https://amazon.de/primegratistesten?tag=getecoback-21', 'https://amazon.de/primegratistesten?tag=getecoback-21'],
  ]) assert.equal(JSON.parse(affiliateMeta({link_url: input})).link_url, expected);
  for (const link_url of ['javascript:secret', 'data:text/plain,secret', 'not a URL',
    '//amazon.de/dp/B07NC5CP6F', 'https://user:secret@amazon.de/s', 'https://example.test/' + 'x'.repeat(250)]) {
    assert.deepEqual(JSON.parse(affiliateMeta({link_url, source: 'body'})), {source: 'body'});
  }
  for (const page of ['//outside.test/a', '/\\outside.test/a', 'https://outside.test/a', '/' + 'a'.repeat(200)]) {
    assert.equal(affiliateMeta({page, page_path: page}), '{}');
  }
});

test('query-free search URLs remain searches and CI probes remain excluded in real SQLite', async () => {
  const metas = [affiliateMeta({source: 'us-market', link_url: 'https://amazon.com/s?k=private'}),
    affiliateMeta({source: 'toppick', link_url: product})];
  const script = `import sqlite3,json,sys
db=sqlite3.connect(':memory:');db.row_factory=sqlite3.Row
db.execute('CREATE TABLE ev(day,name,page,ua_class,meta)')
for m in json.loads(sys.argv[1]):
 for page in ['/guide/example.html','/__ci_healthcheck']:
  db.execute("INSERT INTO ev VALUES(date('now','-1 day'),'affiliate_click',?,'human',?)",(page,m))
print(json.dumps([dict(r) for r in db.execute(sys.stdin.read())]))`;
  const result = spawnSync('python3', ['-c', script, JSON.stringify(metas)], {input: AFFILIATE_SQL, encoding: 'utf8'});
  assert.equal(result.status, 0, result.stderr);
  const rows = JSON.parse(result.stdout);
  const m = await affiliateMetrics({prepare() {return {all: async () => ({results: rows})};}});
  assert.equal(m.affiliate_click_28d, 2);
  assert.equal(m.affiliate_click_us_market_28d, 1);
  assert.deepEqual(m.affiliate_diagnostics.destinations_28d, {product: 1, search: 1, prime_trial: 0, other_or_unknown: 0});
  assert.equal(m.affiliate_diagnostics.amazon_ordered_items, null);
});

test('other event schemas are unchanged', async () => {
  const result = await record({n: 'b2b_intent', p: '/guide/example.html', m: {source: 'existing'}});
  assert.equal(result.rows[0][4], '{"source":"existing"}');
});
