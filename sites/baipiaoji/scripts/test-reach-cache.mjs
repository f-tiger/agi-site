#!/usr/bin/env node
// /api/reach 服务端缓存的零网络测试（2026-09-26）。背景见 lib/reach-cache.js。
// 最后一段走真实的 onRequestGet + 内存 SQLite：第二次请求必须一条 hits 查询都不发——这才是省下 D1 额度的那件事。
// 运行：node scripts/test-reach-cache.mjs
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { createReachCache, REACH_CACHE_VERSION, REACH_TTL } from '../lib/reach-cache.js';

let n = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); n++; };

function memCache({ failMatch = false, failPut = false } = {}) {
  const store = new Map();
  return {
    store,
    async match(req) { if (failMatch) throw new Error('match down'); const r = store.get(req.url); return r ? r.clone() : undefined; },
    async put(req, res) { if (failPut) throw new Error('put down'); store.set(req.url, new Response(await res.text(), res)); },
  };
}
let clock = Date.parse('2026-09-27T01:00:00Z');
const now = () => clock;
const body = (extra = {}) => JSON.stringify({ ok: true, generated: new Date(clock).toISOString(), window_days: 7, ...extra });
const okRes = (extra) => new Response(body(extra), { status: 200, headers: { 'content-type': 'application/json' } });
// waitUntil 里挂的是缓存写入；测试在下一次请求前等它落地，与线上「写入最终完成」一致。
const pendingWrites = [];
const ctxOf = (url) => ({ request: new Request(url), waitUntil: (p) => pendingWrites.push(p) });
const settle = () => Promise.all(pendingWrites.splice(0));

{
  const cache = memCache(), cached = createReachCache({ getCache: () => cache, now });
  let calls = 0; const compute = async () => { calls++; return okRes({ calls }); };
  const a = await cached(ctxOf('https://baipiaoji.com/api/reach?days=7'), 7, compute);
  ok(a.headers.get('x-bpj-reach-cache') === 'miss' && calls === 1, '第一次未命中并计算');
  await settle();
  clock += 600e3;
  const b = await cached(ctxOf('https://baipiaoji.com/api/reach?days=7&utm=x&_=1'), 7, compute);
  ok(b.headers.get('x-bpj-reach-cache') === 'hit' && calls === 1, '附加查询参数不打穿缓存');
  ok((await b.json()).calls === 1, '命中返回的是第一次算出的结果');
  ok(b.headers.get('cache-control') === `public, max-age=${REACH_TTL - 600}`, '命中返回剩余的新鲜时间，而不是重新算一小时');
  await cached(ctxOf('https://baipiaoji.com/api/reach?days=28'), 28, compute);
  await settle();
  ok(calls === 2, '不同 days 各算各的');
  ok([...cache.store.keys()].every((k) => k.includes(`/__bpj-cache/reach/${REACH_CACHE_VERSION}/`)), '缓存键带版本号');
  clock += REACH_TTL * 1000;
  const c = await cached(ctxOf('https://baipiaoji.com/api/reach?days=7'), 7, compute);
  ok(c.headers.get('x-bpj-reach-cache') === 'miss' && calls === 3, '过期后重新计算');
}
{
  const cache = memCache(), cached = createReachCache({ getCache: () => cache, now });
  let calls = 0;
  const fail = async () => { calls++; return new Response(JSON.stringify({ ok: false, code: 'query_failed' }), { status: 500 }); };
  const a = await cached(ctxOf('https://baipiaoji.com/api/reach'), 28, fail);
  await settle();
  const b = await cached(ctxOf('https://baipiaoji.com/api/reach'), 28, fail);
  await settle();
  ok(a.status === 500 && b.status === 500 && calls === 2 && cache.store.size === 0, '失败结果不缓存');
  ok(a.headers.get('cache-control') === 'no-store', '失败结果告诉下游也别缓存');
  const okFalse = async () => new Response(JSON.stringify({ ok: false, generated: new Date(clock).toISOString() }), { status: 200 });
  await cached(ctxOf('https://baipiaoji.com/api/reach'), 7, okFalse);
  await settle();
  ok(cache.store.size === 0, 'ok:false 即使是 200 也不缓存');
}
{
  const cache = memCache(), cached = createReachCache({ getCache: () => cache, now });
  let calls = 0, release;
  const gate = new Promise((r) => { release = r; });
  const slow = async () => { calls++; await gate; return okRes(); };
  const all = Promise.all(Array.from({ length: 5 }, () => cached(ctxOf('https://baipiaoji.com/api/reach?days=7'), 7, slow)));
  release();
  const res = await all;
  ok(calls === 1 && res.every((r) => r.status === 200), '同时到的 5 个未命中只算一次');
  ok((await Promise.all(res.map((r) => r.json()))).every((j) => j.ok === true), '5 个请求都拿到完整结果');
}
{
  let calls = 0; const compute = async () => { calls++; return okRes(); };
  for (const cache of [memCache({ failMatch: true }), memCache({ failPut: true })]) {
    const cached = createReachCache({ getCache: () => cache, now });
    const r = await cached(ctxOf('https://baipiaoji.com/api/reach'), 28, compute);
    ok(r.status === 200, '缓存读写出错时照常现算');
  }
  const none = createReachCache({ getCache: () => undefined, now });
  ok((await none(ctxOf('https://baipiaoji.com/api/reach'), 28, compute)).status === 200, '没有 Cache API 时照常现算');
  const throws = createReachCache({ getCache: () => { throw new Error('no caches'); }, now });
  ok((await throws(ctxOf('https://baipiaoji.com/api/reach'), 28, compute)).status === 200, '取缓存对象抛错时照常现算');
  const cache = memCache(), cached = createReachCache({ getCache: () => cache, now });
  await cached({ request: new Request('https://baipiaoji.com/api/reach', { method: 'POST' }) }, 28, compute);
  ok(cache.store.size === 0, '非 GET 不进缓存');
}

// 端到端：真实 onRequestGet，第二次请求不再读 D1。
{
  const cache = memCache();
  globalThis.caches = { default: cache };
  const { onRequestGet } = await import('../functions/api/reach.js');
  const sql = new DatabaseSync(':memory:');
  sql.exec('CREATE TABLE hits (d TEXT, path TEXT, lang TEXT, country TEXT, ref TEXT, ev TEXT)');
  sql.prepare('INSERT INTO hits VALUES (?,?,?,?,?,?)').run(new Date().toISOString().slice(0, 10), '/tools/grok', 'en', 'US', 'www.google.com', '');
  let reads = 0;
  const HITS = { prepare(q) { let a = []; const st = { bind(...v) { a = v; return st; },
    async all() { if (/\bFROM hits\b/.test(q)) reads++; return { results: sql.prepare(q).all(...a) }; },
    async first() { return sql.prepare(q).get(...a) ?? null; }, async run() { return sql.prepare(q).run(...a); } }; return st; } };
  const call = () => onRequestGet({ request: new Request('https://baipiaoji.com/api/reach?days=7'), env: { HITS }, waitUntil: () => {} });
  const waits = [];
  const first = await onRequestGet({ request: new Request('https://baipiaoji.com/api/reach?days=7'), env: { HITS }, waitUntil: (p) => waits.push(p) });
  await Promise.all(waits);
  const afterFirst = reads;
  const second = await call();
  ok(first.status === 200 && afterFirst >= 7, `第一次请求读 D1（${afterFirst} 条 hits 查询）`);
  ok(second.headers.get('x-bpj-reach-cache') === 'hit' && reads === afterFirst, '第二次请求一条 hits 查询都不发');
  const j = await second.json();
  ok(j.ok === true && j.window_days === 7 && j.humans_referred === 1 && Array.isArray(j.paths), '缓存里的是完整的 reach 响应');
  delete globalThis.caches;
}

console.log(`✅ test-reach-cache: ${n} checks — one computation per days per hour, failures never cached, cache faults fall back, second request reads no D1 rows`);
