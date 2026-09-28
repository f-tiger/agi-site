// Zero-network test for the D1 read budget of /api/pulse and /api/trends (2026-09-26).
//
// Why: the account-wide D1 free tier (5M rows read per UTC day) ran out on 09-24/25/26. On 09-26 these two
// endpoints were ~46% of all reads: every request recomputed the aggregates (Cloudflare does not cache a
// Worker's own responses, the cache-control header only helps browsers) and every pageviews query read
// the whole table. The fix is a server-side cache (analytics-worker/aggregate-cache.js) plus a partial
// covering index on the human rows (analytics-worker/migrations/0001_pageviews_human_index.sql).
//
// Asserts, on an in-memory SQLite shaped like the live tables:
//   1. every pageviews query the two handlers actually issue uses pageviews_human and never scans the table;
//   2. both handlers return identical numbers with and without the index;
//   3. the cache computes once per endpoint, ignores query-string noise, never stores failures or partial
//      results, and falls back to computing when the cache itself fails;
//   4. the worker routes both paths through the cache.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { pulseResponse, trendsResponse } from './analytics-worker/index.js';
import { aggregateCache, AGG_CACHE_VERSION } from './analytics-worker/aggregate-cache.js';

const here = new URL('.', import.meta.url);
const MIGRATION = fs.readFileSync(new URL('analytics-worker/migrations/0001_pageviews_human_index.sql', here), 'utf8');
const WORKER = fs.readFileSync(new URL('analytics-worker/index.js', here), 'utf8');
let n = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); n++; };

function d1(sql, log) {
  return {
    prepare(q) {
      let args = [];
      const st = {
        bind(...v) { args = v; return st; },
        async all() { log && log.push([q, args]); return { results: sql.prepare(q).all(...args) }; },
        async first() { log && log.push([q, args]); return sql.prepare(q).get(...args) ?? null; },
        async run() { log && log.push([q, args]); return sql.prepare(q).run(...args); },
      };
      return st;
    },
  };
}

const day = (back) => new Date(Date.now() - back * 86400000).toISOString().slice(0, 10);
function fixture({ money = true } = {}) {
  const sql = new DatabaseSync(':memory:');
  // Shape of the live table, read from sqlite_master on 2026-09-27: one counter row per
  // (day, path, ref_host, country, utm_*, ua_class) plus the three secondary indexes it already had.
  // They stay in the fixture so the plan assertion below sees the same choices the live planner has.
  sql.exec(`CREATE TABLE pageviews (day TEXT NOT NULL, path TEXT NOT NULL, ref_host TEXT NOT NULL DEFAULT '',
    country TEXT NOT NULL DEFAULT '', utm_source TEXT NOT NULL DEFAULT '', utm_medium TEXT NOT NULL DEFAULT '',
    utm_campaign TEXT NOT NULL DEFAULT '', ua_class TEXT NOT NULL DEFAULT 'human', hits INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (day, path, ref_host, country, utm_source, utm_medium, utm_campaign, ua_class))`);
  sql.exec('CREATE INDEX idx_pv_day ON pageviews (day)');
  sql.exec('CREATE INDEX idx_pv_path ON pageviews (path, day)');
  sql.exec('CREATE INDEX idx_pv_ref ON pageviews (ref_host, day)');
  sql.exec(`CREATE TABLE events (id INTEGER PRIMARY KEY, day TEXT, name TEXT, location TEXT, label TEXT, path TEXT,
    ref_host TEXT, country TEXT, ua_class TEXT, utm_source TEXT, utm_medium TEXT, utm_campaign TEXT)`);
  if (money) {
    sql.exec(`CREATE TABLE subscribers (id INTEGER PRIMARY KEY, status TEXT)`);
    sql.exec(`INSERT INTO subscribers (status) VALUES ('stored'), ('stored'), ('removed')`);
    sql.exec(`CREATE TABLE wb_orders (id TEXT PRIMARY KEY, state TEXT)`);
    sql.exec(`CREATE TABLE discuss_profiles (id TEXT PRIMARY KEY)`);
  }
  const pv = sql.prepare(`INSERT INTO pageviews (day, path, ref_host, country, ua_class, hits) VALUES (?,?,?,?,?,?)
    ON CONFLICT(day, path, ref_host, country, utm_source, utm_medium, utm_campaign, ua_class) DO UPDATE SET hits = hits + excluded.hits`);
  const ev = sql.prepare('INSERT INTO events (day, name, label, path, ua_class) VALUES (?,?,?,?,?)');
  const paths = ['/', '/how-close-is-agi', '/when-will-agi-arrive', '/advertise', '/audits', '/progress-index', '/zh/', '/de/'];
  const refs = ['', 'www.google.com', 'chatgpt.com', 'perplexity.ai', 'agiscorecard.com', 'getecoback.com', 'news.ycombinator.com', 'example.org'];
  const classes = ['human', 'bot', 'human', 'ai_crawler', 'human', 'scanner'];
  let k = 0;
  for (let back = 0; back < 40; back++) {
    for (let i = 0; i < 30; i++, k++) {
      pv.run(day(back), paths[k % paths.length], refs[(k * 3) % refs.length], ['US', 'DE', 'CN', ''][k % 4], classes[k % classes.length], 1 + (k % 5));
      if (k % 7 === 0) ev.run(day(back), 'site_search', ['agi 2027', 'is agi close', 'agi 2027'][k % 3], '/', 'human');
      if (k % 11 === 0) ev.run(day(back), 'search_no_result', 'agix', '/', 'human');
      if (k % 5 === 0) ev.run(day(back), ['tool_click', 'subscribe_click', 'calc_use'][k % 3], '', '/', k % 2 ? 'human' : null);
    }
  }
  return sql;
}
const strip = async (res) => { const j = await res.json(); delete j.generated; return j; };
const URL0 = new URL('https://agiscorecard.com/api/pulse');

// ── 1 & 2: the index is used and changes nothing ──
const before = fixture();
const pulseA = await strip(await pulseResponse({ EVENTS: d1(before) }, URL0));
const trendsA = await strip(await trendsResponse({ EVENTS: d1(before) }));
ok(pulseA.ok === true && pulseA.human_pv > 0 && pulseA.ai_ref > 0 && pulseA.money && !pulseA.partial, 'fixture produces a complete pulse');
ok(trendsA.ok === true && trendsA.searches.length > 0, 'fixture produces trends');

const after = fixture();
after.exec(MIGRATION);
const log = [];
const pulseB = await strip(await pulseResponse({ EVENTS: d1(after, log) }, URL0));
const trendsB = await strip(await trendsResponse({ EVENTS: d1(after, log) }));
assert.deepEqual(pulseB, pulseA); n++;
assert.deepEqual(trendsB, trendsA); n++;
const pvQueries = log.filter(([q]) => /\bFROM pageviews\b/.test(q));
ok(pvQueries.length >= 5, `captured ${pvQueries.length} pageviews queries`);
// A query that names its paths (pulse's money block: /advertise, /audits, …) may instead seek those paths
// in idx_pv_path, which reads only their rows inside the window. Everything else must use the human index.
for (const [q, args] of pvQueries) {
  const plan = after.prepare('EXPLAIN QUERY PLAN ' + q).all(...args).map((r) => r.detail).join(' | ');
  const human = /SEARCH pageviews USING COVERING INDEX pageviews_human \(day/.test(plan);
  const byPath = /\bpath IN \(/.test(q) && /SEARCH pageviews USING INDEX idx_pv_path \(path=\? AND day>\?\)/.test(plan);
  ok(!/\bSCAN pageviews\b/.test(plan) && !/\bidx_pv_day\b/.test(plan) && (human || byPath),
    `pageviews query must read only the human index (or seek its named paths): ${q.slice(0, 90)}… → ${plan}`);
}

// ── 3: cache behaviour ──
function memCache({ failMatch = false, failPut = false } = {}) {
  const store = new Map();
  return {
    store,
    async match(req) { if (failMatch) throw new Error('down'); const r = store.get(req.url); return r ? r.clone() : undefined; },
    async put(req, res) { if (failPut) throw new Error('down'); store.set(req.url, new Response(await res.text(), res)); },
  };
}
const waits = [];
const ctx = { waitUntil: (p) => waits.push(p) };
const settle = () => Promise.all(waits.splice(0));
{
  const cache = memCache(); let reads = 0;
  const HITS = { prepare(q) { const s = d1(after).prepare(q); const all = s.all; s.all = async () => { reads++; return all(); }; return s; } };
  const call = (url, name, fn) => aggregateCache(new Request(url), ctx, name, 3600, fn, { getCache: () => cache });
  const a = await call('https://agiscorecard.com/api/pulse', 'pulse', () => pulseResponse({ EVENTS: HITS }, URL0));
  await settle(); const r1 = reads;
  const b = await call('https://agiscorecard.com/api/pulse?ci=1&x=2', 'pulse', () => pulseResponse({ EVENTS: HITS }, URL0));
  ok(a.headers.get('x-agi-aggregate-cache') === 'miss' && r1 > 0, 'first pulse computes');
  ok(b.headers.get('x-agi-aggregate-cache') === 'hit' && reads === r1, 'second pulse (with query noise) reads no D1 rows');
  ok(/^public, max-age=\d+$/.test(b.headers.get('cache-control')), 'hit carries the remaining freshness');
  const t = await call('https://agiscorecard.com/api/trends', 'trends', () => trendsResponse({ EVENTS: HITS }));
  await settle();
  ok(t.headers.get('x-agi-aggregate-cache') === 'miss' && reads > r1, 'trends has its own key');
  ok([...cache.store.keys()].every((u) => u.includes(`/__agi-cache/`) && u.endsWith(`/${AGG_CACHE_VERSION}`)), 'keys carry the version');
}
{
  const cache = memCache();
  const noMoney = fixture({ money: false });
  const r = await aggregateCache(new Request('https://agiscorecard.com/api/pulse'), ctx, 'pulse', 3600,
    () => pulseResponse({ EVENTS: d1(noMoney) }, URL0), { getCache: () => cache });
  await settle();
  const j = await r.json();
  ok(j.ok === true && j.partial === true && j.money === null, 'a failed money query marks the pulse partial');
  ok(cache.store.size === 0 && r.headers.get('x-agi-aggregate-cache') === 'bypass', 'a partial pulse is not cached');
  const broken = { prepare() { return { bind() { return this; }, async all() { throw new Error('D1_ERROR: daily row read limit'); } }; } };
  const p500 = await aggregateCache(new Request('https://agiscorecard.com/api/pulse'), ctx, 'pulse', 3600,
    () => pulseResponse({ EVENTS: broken }, URL0), { getCache: () => cache });
  const t200 = await aggregateCache(new Request('https://agiscorecard.com/api/trends'), ctx, 'trends', 1800,
    () => trendsResponse({ EVENTS: broken }), { getCache: () => cache });
  await settle();
  ok(p500.status === 500 && p500.headers.get('cache-control') === 'no-store', 'a failed pulse is not cached and says no-store');
  ok((await t200.json()).ok === false && cache.store.size === 0, 'an ok:false trends (served as 200) is not cached');
}
{
  let calls = 0; const compute = async () => { calls++; return trendsResponse({ EVENTS: d1(after) }); };
  for (const cache of [memCache({ failMatch: true }), memCache({ failPut: true })]) {
    const r = await aggregateCache(new Request('https://agiscorecard.com/api/trends'), ctx, 'trends', 1800, compute, { getCache: () => cache });
    ok(r.status === 200, 'cache faults fall back to computing');
  }
  const r = await aggregateCache(new Request('https://agiscorecard.com/api/trends'), ctx, 'trends', 1800, compute, { getCache: () => { throw new Error('x'); } });
  ok(r.status === 200 && calls === 3, 'no cache object → compute');
  const cache = memCache(); let slow = 0, release;
  const gate = new Promise((res) => { release = res; });
  const all = Promise.all(Array.from({ length: 4 }, () => aggregateCache(new Request('https://agiscorecard.com/api/trends'), ctx, 'trends', 1800,
    async () => { slow++; await gate; return trendsResponse({ EVENTS: d1(after) }); }, { getCache: () => cache })));
  release(); await all; await settle();
  ok(slow === 1, 'concurrent misses compute once');
}

// ── 4: the worker routes both endpoints through the cache ──
ok(/url\.pathname === '\/api\/pulse'[^\n]*\n\s*return aggregateCache\(request, ctx, 'pulse'/.test(WORKER), '/api/pulse goes through aggregateCache');
ok(/url\.pathname === '\/api\/trends'\) \{\n\s*return aggregateCache\(request, ctx, 'trends'/.test(WORKER), '/api/trends goes through aggregateCache');

console.log(`✅ test_analytics_d1: ${n} checks — pulse/trends read only the human covering index, identical numbers with and without it, one computation per endpoint per TTL, failures and partial results never cached`);
