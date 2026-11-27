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
  const partial = async () => new Response(JSON.stringify({ ok: true, partial: true, generated: new Date(clock).toISOString() }), { status: 200 });
  const pr = await cached(ctxOf('https://baipiaoji.com/api/reach'), 14, partial);
  await settle();
  ok(cache.store.size === 0 && pr.headers.get('x-bpj-reach-cache') === 'bypass', '缺一块的结果（partial:true）不缓存');
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

// Acquisition aggregates must never reuse the legacy reach payload.
{
  const cache=memCache();
  const reach=createReachCache({getCache:()=>cache,now});
  const growth=createReachCache({getCache:()=>cache,now,cachePath:'/__bpj-cache/growth/v1'});
  await reach(ctxOf('https://baipiaoji.com/api/reach?days=14'),14,()=>okRes({kind:'reach'}));
  await settle();
  let calls=0;
  const read=()=>{calls++;return okRes({kind:'growth'});};
  const first=await growth(ctxOf('https://baipiaoji.com/api/growth?days=14'),14,read);
  await settle();
  const second=await growth(ctxOf('https://baipiaoji.com/api/growth?days=14&noise=1'),14,read);
  ok((await first.json()).kind==='growth' && (await second.json()).kind==='growth' && calls===1,'growth cache isolated from reach and ignores extra query keys');
}

// 端到端：真实 onRequestGet，第二次请求不再读 D1。
{
  const cache = memCache();
  globalThis.caches = { default: cache };
  const { onRequestGet } = await import('../functions/api/reach.js');
  const {WORKBENCH_ORDER_COHORTS_SQL}=await import('../lib/conversion-stages.js');
  const sql = new DatabaseSync(':memory:');
  sql.exec('CREATE TABLE hits (d TEXT, path TEXT, lang TEXT, country TEXT, ref TEXT, ev TEXT)');
  sql.exec("CREATE INDEX hits_events ON hits(d,ev) WHERE ev != ''; CREATE TABLE manju_inquiries (kind TEXT, created TEXT)");
  sql.exec('CREATE TABLE free_accounts (id TEXT PRIMARY KEY,created INTEGER,qa INTEGER); CREATE TABLE free_account_identities (account_id TEXT PRIMARY KEY,email_verified INTEGER)');
  sql.exec('CREATE TABLE wb_orders (id TEXT PRIMARY KEY,state TEXT,created INTEGER,expires INTEGER,paid_at INTEGER); CREATE TABLE wb_order_sources (order_id TEXT PRIMARY KEY,product TEXT NOT NULL)');
  sql.prepare('INSERT INTO hits VALUES (?,?,?,?,?,?)').run(new Date().toISOString().slice(0, 10), '/tools/grok', 'en', 'US', 'www.google.com', '');
  let reads = 0, accountReads = 0, workbenchOrderReads = 0;
  const HITS = { prepare(q) { let a = []; const st = { bind(...v) { a = v; return st; },
    async all() { if (/\bFROM hits\b/.test(q)) reads++; if (/\bFROM free_accounts\b/.test(q)) accountReads++; if(q===WORKBENCH_ORDER_COHORTS_SQL)workbenchOrderReads++; return { results: sql.prepare(q).all(...a) }; },
    async first() { if (/\bFROM free_accounts\b/.test(q)) accountReads++; return sql.prepare(q).get(...a) ?? null; }, async run() { return sql.prepare(q).run(...a); } }; return st; } };
  const call = () => onRequestGet({ request: new Request('https://baipiaoji.com/api/reach?days=7'), env: { HITS }, waitUntil: () => {} });
  const yesterday=new Date(Date.now()-86400000).toISOString().slice(0,10);
  const dayEnd=Date.parse(new Date().toISOString().slice(0,10))/1000;
  const proofkitOrder=(id,state,created,expires,paidAt,product='bpj-testimonial-kit')=>{
    sql.prepare('INSERT INTO wb_orders VALUES(?,?,?,?,?)').run(id,state,created,expires,paidAt);
    sql.prepare('INSERT INTO wb_order_sources VALUES(?,?)').run(id,product);
  };
  proofkitOrder('earlier','paid',dayEnd-7200,dayEnd-3600,dayEnd-7190);
  proofkitOrder('expired','pending',dayEnd-7200,dayEnd-3600,null);
  proofkitOrder('paid-after-boundary','paid',dayEnd-1,dayEnd+3599,dayEnd);
  proofkitOrder('today','pending',dayEnd,dayEnd+3600,null);
  proofkitOrder('older','paid',dayEnd-8*86400,dayEnd-8*86400+3600,dayEnd-8*86400+60);
  proofkitOrder('other','paid',dayEnd-7200,dayEnd-3600,dayEnd-7190,'bpj-video-variants');
  proofkitOrder('trade-receipt','paid',dayEnd-7200,dayEnd-3600,dayEnd-7190,'bpj-trade-toolbox');
  proofkitOrder('trade-receipt-next-day','paid',dayEnd-1,dayEnd+3599,dayEnd,'bpj-trade-toolbox');
  sql.prepare('INSERT INTO hits(d,path,lang,ev) VALUES(?,?,?,?)').run(yesterday,'/go/kimi','zh','go');
  sql.prepare('INSERT INTO hits(d,path,lang,ev) VALUES(?,?,?,?)').run(yesterday,'/studio/proposal-deck/pptx-export/own','zh','calc');
  sql.prepare('INSERT INTO hits(d,path,lang,ev) VALUES(?,?,?,?)').run(yesterday,'/proofkit/paid_offer_view','zh','biz');
  sql.prepare('INSERT INTO hits(d,path,lang,ev) VALUES(?,?,?,?)').run(yesterday,'/trade-workbench/fx-bank-quote-unit/run','zh','biz');
  const waits = [];
  const first = await onRequestGet({ request: new Request('https://baipiaoji.com/api/reach?days=7'), env: { HITS }, waitUntil: (p) => waits.push(p) });
  await Promise.all(waits);
  const afterFirst = reads, accountsAfterFirst = accountReads;
  const second = await call();
  ok(first.status === 200 && afterFirst >= 7, `第一次请求读 D1（${afterFirst} 条 hits 查询）`);
  const manju=(await first.clone().json()).manju_signals;
  ok(manju.measurement_version==='manju-cloud-actions-v4' && manju.actions.cloud_signup===0 && manju.actions.video_view===0 && manju.actions.video_report_revise===0, 'reach 返回固定新口径及已知零，不借用旧缓存');
  ok(second.headers.get('x-bpj-reach-cache') === 'hit' && reads === afterFirst, '第二次请求一条 hits 查询都不发');
  ok(accountsAfterFirst === 2 && accountReads === accountsAfterFirst, '账户总量和UTC日明细一起缓存，命中不重读账户表');
  const j = await second.json();
  ok(j.ok === true && j.window_days === 7 && j.humans_referred === 1 && Array.isArray(j.paths), '缓存里的是完整的 reach 响应');
  ok(j.conversion_stages.ok && j.conversion_stages.accounts.created === 0, '注册空表是已知零，完整分层统计一起命中缓存');
  ok(j.conversion_stages.events.proposal_deck_actions.own.pptx_export===1 && j.conversion_stages.events.other_calc_events===1, 'ProposalDeck also projects existing calc rows');
  assert.deepEqual(j.money.proposal_deck_order_window,j.conversion_stages.window);
  assert.deepEqual(j.money.proposal_deck_orders_by_state,{pending:0,expired:0,paid:0});
  assert.deepEqual(j.money.proofkit_orders_by_state,{paid:2,pending:2},'legacy ProofKit field keeps existing current-state cohort');
  assert.deepEqual(j.money.proofkit_orders_complete_utc.window,j.conversion_stages.window);
  assert.deepEqual(j.money.proofkit_orders_complete_utc.by_state,{paid:1,pending:1,expired:1},'exclusive UTC cutoff applies to order creation and confirmed payment');
  assert.equal(j.conversion_stages.events.proofkit_actions.own.paid_offer_view,1);
  assert.deepEqual(j.money.trade_workbench_orders_complete_utc.window,j.conversion_stages.window);
  assert.deepEqual(j.money.trade_workbench_orders_complete_utc.by_state,{pending:1,expired:0,paid:1});
  assert.deepEqual(j.conversion_stages.events.trade_workbench_actions,{signup:0,guest_run:0,run:1,example:0,membership_open:0,csv:0});
  ok(workbenchOrderReads===1, 'ProposalDeck and trade-workbench cohorts share one order-source read and cache entry');
  ok(JSON.stringify(j.conversion_stages.directory_outbound)===JSON.stringify({by_tool:[{slug:'kimi',clicks:1}],unattributed_clicks:0}), '目录出站明细与原聚合一起缓存，命中不新增 D1 读取');
  ok(j.conversion_stages.account_scope === 'fleet_shared_account_pool' && j.conversion_stages.accounts_daily.length === 7 && j.conversion_stages.accounts_daily.every(row=>row.created===0), '共享账户池UTC日明细仅成功读取才补零');
  ok(j.homepage_signals.ok && j.homepage_signals.clicks===0,'首页空表是已知零且一起命中缓存');
  // 商业触发那条查询失败（额度边缘时实见）→ 响应标 partial，不进缓存，下一次重算。
  cache.store.clear();
  const failing = { prepare(q) { const st = HITS.prepare(q); if (/ev='biz'/.test(q)) { const b = st.bind; st.bind = (...v) => { b(...v); return { all: async () => { throw new Error('D1_ERROR: daily row read limit'); } }; }; } return st; } };
  const w2 = [];
  const p1 = await onRequestGet({ request: new Request('https://baipiaoji.com/api/reach?days=14'), env: { HITS: failing }, waitUntil: (p) => w2.push(p) });
  await Promise.all(w2);
  const pj = await p1.json();
  ok(pj.ok === true && pj.partial === true && pj.commercial_triggers.ok === false, '商业触发读不出来时响应标 partial');
  ok(cache.store.size === 0 && p1.headers.get('x-bpj-reach-cache') === 'bypass', 'partial 响应不进缓存');
  const homeFailure={prepare(q){if(q.includes('SELECT d, lang, path, count(*) n'))throw Error('homepage read unavailable');return HITS.prepare(q);}};
  const homeResponse=await onRequestGet({request:new Request('https://baipiaoji.com/api/reach?days=7'),env:{HITS:homeFailure}});
  const homeJSON=await homeResponse.json();
  ok(homeJSON.partial && homeJSON.homepage_signals.clicks===null,'首页明细缺失标记 partial 而不是零');
  ok(homeResponse.headers.get('x-bpj-reach-cache')==='bypass','缺失首页明细不缓存');
  const dailyFailure={prepare(q){if(q.includes("SELECT date(a.created, 'unixepoch')"))return{bind(){return this;},async all(){throw Error('daily account read unavailable');}};return HITS.prepare(q);}};
  const dailyResponse=await onRequestGet({request:new Request('https://baipiaoji.com/api/reach?days=7'),env:{HITS:dailyFailure}});
  const dailyJSON=await dailyResponse.json();
  ok(dailyJSON.partial && dailyJSON.conversion_stages.accounts.total_non_test===0 && dailyJSON.conversion_stages.accounts_daily===null,'账户日明细失败保留可读取总数，但日明细是未知');
  ok(dailyResponse.headers.get('x-bpj-reach-cache')==='bypass','缺失账户日明细不能缓存或补零');
  const deckOrderFailure={prepare(q){if(q===WORKBENCH_ORDER_COHORTS_SQL)throw Error('First-source order cohorts unavailable');return HITS.prepare(q);}};
  const deckResponse=await onRequestGet({request:new Request('https://baipiaoji.com/api/reach?days=7'),env:{HITS:deckOrderFailure}});
  const deckJSON=await deckResponse.json();
  ok(deckJSON.partial && deckJSON.money.proposal_deck_orders_by_state===null && deckJSON.money.trade_workbench_orders_complete_utc.by_state===null &&
     deckJSON.conversion_stages.events.proposal_deck_actions.own.pptx_export===1 && deckJSON.conversion_stages.events.trade_workbench_actions.run===1,
     'A failed order-source read is unknown for both cohorts; browser actions remain readable');
  ok(deckResponse.headers.get('x-bpj-reach-cache')==='bypass','Incomplete order cohorts are never cached');
  const proofkitFailure={prepare(q){if(q.includes("s.product='bpj-testimonial-kit'"))return{bind(){return this;},async all(){throw Error('ProofKit order read unavailable');}};return HITS.prepare(q);}};
  const proofkitResponse=await onRequestGet({request:new Request('https://baipiaoji.com/api/reach?days=7'),env:{HITS:proofkitFailure}});
  const proofkitJSON=await proofkitResponse.json();
  ok(proofkitJSON.partial && proofkitJSON.money.proofkit_orders_by_state===null && proofkitJSON.money.proofkit_orders_complete_utc.by_state===null,'ProofKit order read failure is unknown');
  ok(proofkitResponse.headers.get('x-bpj-reach-cache')==='bypass','Incomplete ProofKit aggregates are never cached');
  sql.exec('DROP TABLE free_accounts');
  const accountFailure = await call();
  const failedStage = await accountFailure.json();
  ok(failedStage.partial === true && failedStage.conversion_stages.accounts === null, '账户表不可读必须是未知，不能当零注册');
  ok(accountFailure.headers.get('x-bpj-reach-cache') === 'bypass', '缺失账户统计不缓存');
  delete globalThis.caches;
}

console.log(`✅ test-reach-cache: ${n} checks — one computation per days per hour, failures never cached, cache faults fall back, second request reads no D1 rows`);
