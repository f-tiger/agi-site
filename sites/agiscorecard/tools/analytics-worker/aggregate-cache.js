// /api/pulse 与 /api/trends 的服务端缓存（2026-09-26，与 bpj lib/reach-cache.js 同一套做法）。
//
// 为什么需要：两个接口原来只设 `cache-control` 头，但 Cloudflare 不缓存 Worker 自己返回的响应，
// 那个头只对浏览器有用——每个请求都在 D1 里把 pageviews 读一遍。09-26 这两个接口占了全账号 D1 读取的
// 约 46%（/api/trends 一天 53 次调用、每次约 4.5 万行；/api/pulse 每次约 9 万行），D1 免费额度（全账号
// 每天读 500 万行）因此在 10 点就用完，之后全舰队的统计与事件写入被拒到 UTC 零点。
//
// 规矩（tools/test_analytics_d1.mjs 逐条断言）：
//   · 键只含接口名与版本号，查询参数一律不进键——随手加个参数不能把缓存打穿；
//   · 响应形状一改就把 AGG_CACHE_VERSION 加一；
//   · 同一 isolate 里同时到的未命中只算一次；
//   · 只缓存 ok:true、不带 partial:true、带 generated 的 200；失败与部分失败不缓存；缓存本身出错照常现算；
//   · 命中时返回剩余的新鲜时间。
export const AGG_CACHE_VERSION = 'v1';

const pending = new Map();

export function aggregateCacheKey(requestUrl, name) {
  const k = new URL(requestUrl);
  k.pathname = `/__agi-cache/${name}/${AGG_CACHE_VERSION}`;
  k.search = ''; k.hash = '';
  return new Request(k.toString(), { method: 'GET' });
}

async function freshFor(res, ttl, now) {
  if (res.status !== 200 || res.headers.has('set-cookie')) return 0;
  try {
    const body = await res.clone().json();
    const age = (now() - Date.parse(body.generated)) / 1000;
    return body.ok === true && body.partial !== true && Number.isFinite(age) && age >= 0 && age < ttl
      ? Math.max(1, Math.floor(ttl - age)) : 0;
  } catch { return 0; }
}

function mark(res, state, seconds) {
  const out = new Response(res.body, res);
  out.headers.set('x-agi-aggregate-cache', state);
  out.headers.set('cache-control', seconds ? `public, max-age=${seconds}` : 'no-store');
  return out;
}

export async function aggregateCache(request, ctx, name, ttl, compute,
  { getCache = () => globalThis.caches?.default, now = Date.now } = {}) {
  if (!request || request.method !== 'GET') return compute();
  let cache;
  try { cache = getCache(); } catch { cache = null; }
  if (!cache) return compute();
  const key = aggregateCacheKey(request.url, name);
  try {
    const hit = await cache.match(key);
    if (hit) { const left = await freshFor(hit, ttl, now); if (left) return mark(hit, 'hit', left); }
  } catch { /* 缓存坏了就现算 */ }
  if (pending.has(key.url)) return (await pending.get(key.url)).clone();
  const work = (async () => {
    const res = await compute();
    const left = await freshFor(res, ttl, now);
    if (!left) return mark(res, 'bypass', 0);
    const out = mark(res, 'miss', left);
    const save = Promise.resolve().then(() => cache.put(key, out.clone())).catch(() => {});
    if (ctx && typeof ctx.waitUntil === 'function') ctx.waitUntil(save); else await save;
    return out;
  })();
  pending.set(key.url, work);
  try { return (await work).clone(); } finally { pending.delete(key.url); }
}
