// Guards the two field sanitisers in tools/analytics-worker/index.js.
//
// Why this test exists: from 2026-08-08 to 2026-09-08 the reader-supplied search query
// went through the STRUCTURAL sanitiser, whose regex deletes spaces and (being ASCII
// \w) every CJK character. site_search rows were written with an empty label, so the
// demand loop recorded THAT someone asked without recording WHAT they asked. Nothing
// failed, nothing errored, and the table looked plausible. A test is the only thing
// that catches that class of bug.
import { __test } from './analytics-worker/index.js';
const { clean, cleanText, LABEL_MAX, pulseAggregate, cachedJson, AI_HOST_SUBSTR } = __test;

let bad = 0;
const eq = (got, want, what) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) {
    bad++;
    console.log('FAIL ' + what);
    console.log('  got  ' + JSON.stringify(got));
    console.log('  want ' + JSON.stringify(want));
  } else console.log('ok   ' + what);
};

// The real 2026-09-05 rows: both of these stored '' before the fix.
eq(cleanText('巴菲特', LABEL_MAX), '巴菲特', 'CJK query survives');
eq(cleanText('AI 就业风险', LABEL_MAX), 'AI 就业风险', 'mixed CJK + ASCII survives');
eq(cleanText('are we close to agi', LABEL_MAX), 'are we close to agi', 'spaces survive');
eq(cleanText('AGI 2027', LABEL_MAX), 'AGI 2027', 'the home_suggest chip label survives');
eq(cleanText('when will agi arrive?', LABEL_MAX), 'when will agi arrive?', 'punctuation survives');

// Hygiene: the ops dashboard prints top labels back out, so markup must not survive.
eq(cleanText('<script>alert(1)</script>', LABEL_MAX), 'script alert(1) /script', 'angle brackets stripped');
eq(cleanText('a"b\'c`d\\e', LABEL_MAX), 'a b c d e', 'quotes and backslash stripped');
eq(cleanText('a b\tc\nd', LABEL_MAX), 'a b c d', 'control characters collapse to spaces');
eq(cleanText('   ', LABEL_MAX), null, 'whitespace-only is null, not an empty row');
eq(cleanText('', LABEL_MAX), null, 'empty is null');
eq(cleanText(undefined, LABEL_MAX), null, 'missing is null');
eq(cleanText('x'.repeat(200), LABEL_MAX).length, LABEL_MAX, 'capped at LABEL_MAX');
eq(LABEL_MAX, 80, 'cap matches the documented 80-char contract');

// The structural sanitiser must stay strict — these are our own identifiers.
eq(clean('site_search', 40), 'site_search', 'event name passes');
eq(clean('from:/zh/invest', 80), 'from:/zh/invest', 'internal-nav label passes');
eq(clean('drop table events', 40), 'droptableevents', 'structural fields still strip spaces');

// /api/pulse 单次 GROUP BY 推导(2026-09-26 D1 读预算)。此前 human_pv / by_host / by_source 来自三条
// 同谓词 SQL;现在一份结果集在 JS 里推。这里钉住与旧 SQL 相同的语义:_total = 全部行求和(含空 ref);
// by_host 只收 15 个子串命中的主机、键是入库原文、保持 n DESC 顺序、LIKE 式不分大小写;
// sum(by_source) == human_pv;空/NULL ref 进 direct。
eq(AI_HOST_SUBSTR.length, 15, 'still the same 15 AI host substrings as the old SQL LIKE list');
const rows = [
  { host: '', n: 100 }, { host: 'www.google.com', n: 20 }, { host: 'chatgpt.com', n: 10 },
  { host: 'agiscorecard.com', n: 5 }, { host: null, n: 4 }, { host: 'ChatGPT.com', n: 3 },
  { host: 'getecoback.com', n: 2 }, { host: 'kimi.moonshot.cn', n: 2 }, { host: 'example.org', n: 1 },
];
const agg = pulseAggregate(rows, 'agiscorecard.com');
eq(agg.human_pv, 147, 'human_pv = sum over every row, empty and NULL ref included (old _total UNION)');
eq(agg.by_host, { 'chatgpt.com': 10, 'ChatGPT.com': 3, 'kimi.moonshot.cn': 2 }, 'by_host: 15-substring match, raw key, n DESC order, case-insensitive like SQL LIKE');
eq(agg.ai_ref, 15, 'ai_ref = sum(by_host)');
eq(agg.by_source, { search: 20, ai: 15, fleet: 2, social: 0, self: 5, direct: 104, other: 1 }, 'by_source buckets');
eq(Object.values(agg.by_source).reduce((a, b) => a + b, 0), agg.human_pv, 'sum(by_source) == human_pv (traffic_sources.py invariant)');
eq(agg.by_search, { 'google.com': 20 }, 'by_search keyed by normalised host');
eq(agg.by_fleet, { 'getecoback.com': 2 }, 'by_fleet');
eq(agg.by_other, { 'example.org': 1 }, 'by_other');
eq(pulseAggregate([], 'agiscorecard.com').human_pv, 0, 'empty table -> 0, not NaN');
eq(pulseAggregate(undefined, 'agiscorecard.com').by_source.direct, 0, 'undefined rows tolerated');

// cachedJson(2026-09-26):错误永不入缓存;成功按 URL + 部署版本做键。
// Node 没有 caches 全局 -> 直接算;下面装一个假的 caches.default 走真正的缓存分支。
{
  const mkReq = (p) => new Request('https://agiscorecard.com' + p);
  const ctx = { waitUntil: (p) => { pending.push(p); } };
  const pending = [];
  let calls = 0;
  const okRes = () => new Response(JSON.stringify({ ok: true, calls: ++calls }), { headers: { 'content-type': 'application/json' } });
  eq(typeof caches, 'undefined', 'Node has no caches global (guard path is what runs under node)');
  const direct = await cachedJson(mkReq('/api/pulse'), {}, ctx, 3600, okRes);
  eq((await direct.json()).calls, 1, 'no caches global -> compute runs, response passes through');

  const store = new Map();
  globalThis.caches = { default: {
    match: async (req) => { const r = store.get(req.url); return r ? r.clone() : undefined; },
    put: async (req, res) => { store.set(req.url, res); },
  } };
  const env = { CF_VERSION_METADATA: { id: 'v1' } };
  const a = await cachedJson(mkReq('/api/pulse'), env, ctx, 3600, okRes);
  await Promise.all(pending.splice(0));
  eq((await a.json()).calls, 2, 'first call computes');
  eq([...store.keys()], ['https://agiscorecard.com/api/pulse?v=v1'], 'key = origin + path + deploy version, no query passthrough');
  const b = await cachedJson(mkReq('/api/pulse?x=1'), env, ctx, 3600, okRes);
  eq((await b.json()).calls, 2, 'second call is a cache hit, compute not re-run');
  eq(b.headers.get('cache-control'), 'public, max-age=3600', 'stored copy carries the ttl');
  eq(b.headers.get('x-fleet-cache'), 'store', 'stored copy is marked');
  const c = await cachedJson(mkReq('/api/pulse'), { CF_VERSION_METADATA: { id: 'v2' } }, ctx, 3600, okRes);
  eq((await c.json()).calls, 3, 'new deploy version -> new key -> recompute');
  await Promise.all(pending.splice(0));
  const p = await cachedJson(mkReq('/api/x'), env, ctx, 60, okRes, ['q']);
  await Promise.all(pending.splice(0));
  eq(store.has('https://agiscorecard.com/api/x?v=v1&q='), true, 'whitelisted param joins the key');
  const err500 = () => new Response(JSON.stringify({ ok: false }), { status: 500, headers: { 'cache-control': 'no-store' } });
  await cachedJson(mkReq('/api/err'), env, ctx, 60, err500);
  await Promise.all(pending.splice(0));
  eq(store.has('https://agiscorecard.com/api/err?v=v1'), false, '500 is never stored');
  const okNoStore = () => new Response('{"ok":false}', { status: 200, headers: { 'cache-control': 'no-store' } });
  await cachedJson(mkReq('/api/degraded'), env, ctx, 60, okNoStore);
  await Promise.all(pending.splice(0));
  eq(store.has('https://agiscorecard.com/api/degraded?v=v1'), false, '200 with no-store (degraded fallback) is never stored');
  delete globalThis.caches;
}

console.log(bad ? '\n' + bad + ' FAILED' : '\nall sanitiser tests pass');
process.exit(bad ? 1 : 0);
