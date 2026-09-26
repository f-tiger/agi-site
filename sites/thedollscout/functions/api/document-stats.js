// Events are actions, not unique people or verified organic traffic. The open
// endpoint can be spoofed; search acquisition must be corroborated with GSC.
const START = '2026-09-25';
const WINDOW = `d >= date('now','-27 days') AND d >= '${START}'`;
// REAL is evaluated in SQL as a per-group flag so the six former aggregates come out of ONE scan
// (2026-09-26, D1 read budget): doc_* rows are real when not CI/sample and not on a /__ci path;
// doc_ci/doc_sample rows feed `excluded` regardless of path; bot rows are pre-filtered to the
// document paths that `crawler_fetches` reports. Sums in JS reproduce each former query exactly.
const REAL = `ev NOT IN ('doc_ci','doc_sample') AND path NOT LIKE '/__ci%'`;
const CRAWLER_PATHS = `(path IN ('/','/de/','/zh/') OR path LIKE '%/pdf-%' OR path LIKE '%/compare-pdf-text%' OR path LIKE '%/learn/pdf-%' OR path LIKE '%/learn/scanned-pdf%')`;
const SCAN = `SELECT d, ev, path, ref, (${REAL}) AS is_real, COUNT(*) AS n FROM hits WHERE ${WINDOW} AND (ev LIKE 'doc_%' OR (ev = 'bot' AND ${CRAWLER_PATHS})) GROUP BY d, ev, path, ref`;
// Success: 15 min in the Cache API (cachedJson); anything not ok stays no-store.
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'content-type':'application/json; charset=utf-8', 'cache-control': status < 400 && value && value.ok === true ? 'public, max-age=900' : 'no-store' } });

// D1 读预算(2026-09-25 事故:免费档每日 500 万行读取被打满,全舰队 D1 读失败到午夜)。
// 聚合端点从 Cache API 出,按 URL + 部署版本做键,TTL 秒;错误响应永不入缓存。
// 此前的 `cache-control: public, max-age=3600` 只对浏览器有效——Cloudflare 不会仅凭它缓存 Worker 响应,
// 每次轮询都重跑全部扫描。
// params 里的项可以是查询参数名(原样取 URL 值),也可以是 [名, 已归一化的值]。
// 带 x-probe 头的第一方探针跳过缓存读取(仍写回):部署自检(verify.mjs --live)要读到自己刚写的 doc_ci 行。
async function cachedJson(request, env, ctx, ttl, compute, params = []) {
  const cache = typeof caches !== 'undefined' && request ? caches.default : null;
  if (!cache) return compute();
  const u = new URL(request.url);
  const version = (env.CF_VERSION_METADATA && env.CF_VERSION_METADATA.id) || env.CF_PAGES_COMMIT_SHA || 'dev';
  const qs = params.map((p) => (Array.isArray(p) ? p[0] + '=' + encodeURIComponent(p[1]) : p + '=' + encodeURIComponent(u.searchParams.get(p) || ''))).join('&');
  const key = new Request(u.origin + u.pathname + '?v=' + encodeURIComponent(version) + (qs ? '&' + qs : ''), { method: 'GET' });
  const probe = !!request.headers.get('x-probe');
  const hit = probe ? null : await cache.match(key);
  if (hit) return hit;
  const res = await compute();
  if (res.ok && res.headers.get('cache-control') !== 'no-store') {
    const stored = new Response(res.clone().body, res);
    stored.headers.set('cache-control', 'public, max-age=' + ttl);
    stored.headers.set('x-fleet-cache', 'store');
    if (ctx && ctx.waitUntil) ctx.waitUntil(cache.put(key, stored)); else await cache.put(key, stored);
  }
  return res;
}

const desc = (rows) => rows.sort((a, b) => b.n - a.n);
const tally = (map, key, n) => map.set(key, (map.get(key) || 0) + n);

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!env.HITS) return json({ ok:false, error:'no_db' }, 503);
  return cachedJson(request, env, context, 900, () => compute(env));
}

async function compute(env) {
  try {
    const rows = (await env.HITS.prepare(SCAN).all()).results || [];
    const events = new Map(), daily = new Map(), pages = new Map(), referrers = new Map(), excluded = new Map(), crawler = new Map();
    for (const r of rows) {
      const n = Number(r.n);
      if (r.ev === 'bot') { tally(crawler, r.path, n); continue; }
      if (r.ev === 'doc_ci' || r.ev === 'doc_sample') tally(excluded, r.ev, n);
      if (r.is_real !== 1) continue;
      tally(events, r.ev, n);
      tally(daily, JSON.stringify([r.d, r.ev]), n);
      if (r.ev === 'doc_view') { tally(pages, r.path, n); tally(referrers, r.ref, n); }
    }
    const pageRows = desc([...pages].map(([path, n]) => ({ path, n })));
    return json({ ok:true, since:START, days:28, generated:new Date().toISOString(),
      unit:'Anonymous action counts, deduplicated per event per page load in the browser. Not unique users; not verified buyers. Bots, CI and samples are excluded from task completion. Open endpoint counts can be spoofed.',
      events:Object.fromEntries(events),
      daily:[...daily].map(([k, n]) => { const [d, ev] = JSON.parse(k); return { d, ev, n }; }).sort((a, b) => (a.d < b.d ? 1 : a.d > b.d ? -1 : 0)),
      pages:pageRows,
      referrers:desc([...referrers].map(([ref, n]) => ({ ref, n }))).slice(0, 100),
      tool_views:pageRows.filter(r => /^\/(?:(de|zh)\/)?(?:pdf-accessibility-checker|pdf-batch-audit|pdf-to-text|compare-pdf-text)?$/.test(r.path)).reduce((n,r) => n + Number(r.n),0),
      excluded:Object.fromEntries(excluded), crawler_fetches:desc([...crawler].map(([path, n]) => ({ path, n }))),
    });
  } catch { return json({ ok:false, error:'query_failed' }, 500); }
}
