import test from 'node:test';
import assert from 'node:assert/strict';
import {withAggregateCache} from './cache.mjs';

test('GET then HEAD share one SELECT result and HEAD has no body', async () => {
  const saved = globalThis.caches;
  const entries = new Map();
  globalThis.caches = {default: {match: async key => entries.get(key.url)?.clone(), put: async (key, value) => entries.set(key.url, value)}};
  try {
    let reads = 0;
    const handler = async req => {assert.equal(req.method, 'GET'); reads++; return Response.json({count: 7}, {headers: {'Cache-Control': 'public, max-age=3600'}});};
    const first = await withAggregateCache(new Request('https://example.test/api/pulse'), handler);
    assert.equal(first.headers.get('X-Fleet-Aggregate-Cache'), 'miss');
    assert.deepEqual(await first.json(), {count: 7});
    const head = await withAggregateCache(new Request('https://example.test/api/pulse', {method: 'HEAD'}), handler);
    assert.equal(await head.text(), '');
    assert.equal(head.headers.get('X-Fleet-Aggregate-Cache'), 'hit');
    assert.equal(reads, 1);
  } finally {globalThis.caches = saved;}
});

test('QA, failed reads and private responses never enter shared cache', async () => {
  const saved = globalThis.caches; let writes = 0;
  globalThis.caches = {default: {match: async () => undefined, put: async () => writes++}};
  try {
    for (const [path, status, policy] of [['/api/growth?qa=1', 200, 'public'], ['/api/pulse', 503, 'public'], ['/api/stats', 200, 'private']]) {
      const result = await withAggregateCache(new Request('https://example.test'+path), async () => Response.json({available: false}, {status, headers: {'Cache-Control': policy}}));
      assert.equal(result.headers.get('Cache-Control'), 'no-store');
    }
    assert.equal(writes, 0);
  } finally {globalThis.caches = saved;}
});

test('expired stored responses trigger a fresh read without a cache-busting URL', async () => {
  const saved = globalThis.caches;
  const {AGGREGATE_VERSION} = await import('./cache.mjs'); let reads = 0;
  const stale = Response.json({old: true}, {headers: {'X-Fleet-Aggregate-Version': AGGREGATE_VERSION, 'X-Fleet-Aggregate-Cached-At': new Date(Date.now()-3601000).toISOString()}});
  globalThis.caches = {default: {match: async () => stale.clone(), put: async key => assert.equal(key.url, 'https://example.test/api/pulse')}};
  try {
    const result = await withAggregateCache(new Request('https://example.test/api/pulse'), async () => {reads++; return Response.json({new: true});});
    assert.equal(reads, 1); assert.deepEqual(await result.json(), {new: true});
  } finally {globalThis.caches = saved;}
});
